# -*- coding: utf-8 -*-
"""自检：P74 —— 术语库首选形的两种有证据偏差

与其它臂的差别：P74 的输入不是文件缺陷，而是**策略库词表**（term-zh）与
正文的比对。文件里注入不出「禁用形」——它得先在词表里登记。所以本臂分两段：

A. 纯函数段（`audit`）：用构造词表直接验证四种行为——命中首选形不报、
   命中变体不报、两形并存报混用、命中禁用形报 error、全不出现不报。
   这一段就是「注入缺陷 → 报红」的等价物，且不依赖线上库。
B. 真实管线段：用 `checker.check` 跑官方尺（template/blog），断言 P74 零
   命中——保证新判据不会把标准尺判红（模型库里没有任何登记，属负向控制）。
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
sys.path.insert(0, KIT)
sys.path.insert(0, HERE)

from core import checker, loader                                 # noqa: E402
from core.consts import P56_LANG_SCRIPTS, TERM_BOUNDARY           # noqa: E402
from core import db as core_db                                    # noqa: E402
from plugins._lexicon import shape_term_zh                        # noqa: E402
from core.model import Context                                    # noqa: E402
import importlib.util                                             # noqa: E402

_spec = importlib.util.spec_from_file_location(
    "p74", os.path.join(KIT, "plugins", "text-term-consistency.py"))
P74 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(P74)


def table(preferred="General Administration of Customs",
          variants=(), forbidden=(), kind="org", lang="en"):
    return {"海关总署": {"kind": kind, "note": "",
                        "langs": {lang: {"preferred": preferred,
                                         "variants": tuple(variants),
                                         "forbidden": tuple(forbidden)}}}}


def check(desc, tbl, text, want_bad, want_mixed):
    bad, mixed = P74.audit(tbl, [("body", text)])
    ok = (len(bad) == want_bad and len(mixed) == want_mixed)
    print("  %-4s %-46s bad=%d mixed=%d"
          % ("OK" if ok else "FAIL", desc, len(bad), len(mixed)))
    return ok


def _argv_tmp():
    for i, a in enumerate(sys.argv):
        if a == "--tmp" and i + 1 < len(sys.argv):
            return sys.argv[i + 1]
        if a.startswith("--tmp="):
            return a.split("=", 1)[1]
    return None


def write_roundtrip(tmp):
    """写入口往返：登记禁用形 → 整形 → 判据真的能看见。

    这一段比「纯函数段」更重要：P74 的禁用形分支长期**没有写入口**，实测全库
    0 条登记——判据实现了、数据从没落地，机检对 47 语显示「干净」。没有这条
    往返断言，下次谁删掉 `term_meta_update` 也一样全绿。
    """
    src = os.path.join(KIT, "data", "glossary.db")
    copy = os.path.join(tmp, "p74", "glossary_copy.db")
    os.makedirs(os.path.dirname(copy), exist_ok=True)
    import shutil
    shutil.copyfile(src, copy)

    concept, lang, pref = "中华人民共和国海关总署", "ja", "中華人民共和国海関総署"
    core_db.term_meta_update(copy, concept, lang, add_forbidden=["税関監督"],
                             add_variant=["中国海関総署"])
    import sqlite3
    conn = sqlite3.connect(copy)
    try:
        rows = [{"key": k, "target": t, "value": v, "meta_json": m}
                for k, t, v, m in conn.execute(
                    "SELECT key, target, value, meta_json FROM lexicons "
                    "WHERE id='term-zh' AND key=? AND value=?", (concept, lang))]
    finally:
        conn.close()
    table_ = shape_term_zh(rows)
    bad, mixed = P74.audit(table_, [("body", "税関監督方式コードは…")])
    ok1 = len(bad) == 1
    # 变体：首选形 + 变体并见 → 混用 1 条（同一篇里两形都出现）
    _bad, mixed2 = P74.audit(table_,
                             [("body", "中国海関総署と中華人民共和国海関総署")])
    ok2 = len(mixed2) == 1
    for desc, good in (("写入口往返：禁用形登记后判据能看见", ok1),
                       ("写入口往返：变体登记后混用能判", ok2)):
        print("  %-4s %-46s" % ("OK" if good else "FAIL", desc))
    return ok1 and ok2


def boundary_coverage(table, lang_scripts):
    """纯函数：无词间距/汉字文字的语向必须有边界策略。

    漏一个的后果不是报错——是那个语向的术语判据**永远命不中**，
    而机检对它显示「干净」。所以按文字系统反查，不靠人记。
    """
    problems = []
    for lg, scripts in sorted(lang_scripts.items()):
        need = ("spaceless" if scripts == {"THAI"} else
                "particle" if "HANGUL" in scripts else
                "script" if "HAN" in scripts else None)
        if need is None:
            continue
        got = table.get(lg)
        if got != need:
            problems.append("%s 是 %s 文字，边界策略应为 %r，实际 %r"
                            % (lg, "/".join(sorted(scripts)), need, got))
    return problems


def main():
    ok = True
    ok &= check("命中首选形：不报", table(), "the General Administration of Customs said", 0, 0)
    ok &= check("命中变体：不报",
                table(variants=["Customs General Administration"]),
                "the Customs General Administration said", 0, 0)
    ok &= check("首选+变体并存：报混用 1 条",
                table(variants=["Customs General Administration"]),
                "General Administration of Customs … Customs General Administration", 0, 1)
    ok &= check("命中禁用形：报 error 1 条",
                table(forbidden=["Customs Department"]),
                "according to the Customs Department", 1, 0)
    ok &= check("一个都没出现：不报（缺失不判）", table(), "no entity here at all", 0, 0)
    ok &= check("禁用形在 refs 区也算",
                table(forbidden=["Customs Department"]), "", 0, 0)

    # 大小写与词边界：不得因为嵌在别的词里而误报
    ok &= check("子串不算命中（Customs Departmental）",
                table(forbidden=["Customs Department"]),
                "the Customs Departmental office", 0, 0)

    # 边界按文字系统走（v443）：汉字词允许假名紧贴，同汉字连写不算命中
    ok &= check("ja 假名紧贴仍命中（通関の申告をする）",
                table("通関申告", forbidden=["申告"], lang="ja"),
                "通関の申告をする", 1, 0)
    ok &= check("ja 禁用形在汉字复合里也算命中（取召回）",
                table("通関申告", forbidden=["税関監督"], lang="ja"),
                "税関監督方式コード", 1, 0)
    ok &= check("ja 禁用形取召回：汉字复合里也命中（申告書）",
                table("通関申告", forbidden=["申告"], lang="ja"),
                "申告書を提出する", 1, 0)
    ok &= check("ja 变体计数取精度：汉字复合不算命中（申告書）",
                table("申告", variants=["届出"], lang="ja"),
                "申告書を提出する", 0, 0)
    ok &= check("th 无词间距走子串",
                table("ผู้นำเข้า", forbidden=["ผู้นำเข้า"], lang="th"),
                "ผู้นำเข้าดำเนินการต่อ", 1, 0)
    ok &= check("ko 禁用形贴助词也能抓到（관세청은）",
                table("관세청", forbidden=["관세서"], lang="ko"),
                "관세서는 발표했다", 1, 0)
    ok &= check("ko 词形贴助词算命中（混用）",
                table("관세청", variants=["관세서"], lang="ko"),
                "관세청은 … 관세서가", 0, 1)
    # 嵌套抑制：长形包含短形时，短形的命中可能全来自长形，不构成混用
    ok &= check("嵌套形不算混用（aduana ⊂ aduanas）",
                table("aduana", variants=["aduanas"], lang="es"),
                "la aduana y las aduanas", 0, 0)

    tmp = _argv_tmp()
    if tmp:
        ok &= write_roundtrip(os.path.abspath(tmp))
    else:
        print("  FAIL 需要 --tmp <目录>：写入口往返要造临时库副本")
        ok = False

    # 边界策略覆盖：按文字系统反查，漏登记等于该语向判据永远零命中
    cover = boundary_coverage(TERM_BOUNDARY, P56_LANG_SCRIPTS)
    good = not cover
    print("  %-4s %-46s missing=%d"
          % ("OK" if good else "FAIL", "边界策略覆盖全部无间距/汉字语向",
             len(cover)))
    for c in cover:
        print("       ", c)
    ok &= good
    shrunk = dict(TERM_BOUNDARY)
    shrunk.pop("th", None)
    good = bool(boundary_coverage(shrunk, P56_LANG_SCRIPTS))
    print("  %-4s %-46s %s" % ("OK" if good else "FAIL",
                               "负向：删掉 th 策略必须报", ""))
    ok &= good

    # 真实管线：官方尺必须零命中
    plugins, _ = loader.discover(KIT, tolerant=True)
    ctx = Context(kit_dir=KIT, rules_filter={"P74"},
                  glossary_disabled=True, lexicons={})
    art_dir = os.path.join(KIT, "template", "blog")
    findings = [f for f in checker.check(art_dir, ctx=ctx) if f.rule == "P74"]
    good = not findings
    print("  %-4s %-46s findings=%d"
          % ("OK" if good else "FAIL", "官方尺（template/blog）零命中", len(findings)))
    ok &= good

    print("%s：%s" % (os.path.basename(sys.argv[0]),
                     "OK" if ok else "FAIL"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
