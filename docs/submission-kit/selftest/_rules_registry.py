# -*- coding: utf-8 -*-
"""自检：规则注册表（工具级臂，`selftest --kit` 才跑）。

钉死六件事：

  ① 插件静态校验的正/反例：文件名、分类、必填常量、`RULES == [RULE]`、
     `RATIONALE` 长度、`COVERAGE` 结构、`run`/`review`；
  ② 自检臂校验：同名、非空、有可执行入口（`main` 或 `_harness`）；
  ③ `build_from_disk → save → load` 往返一致，`audit` 零差异；
  ④ 未登记 / 指纹不符 / 磁盘缺失 / 孤儿规则四类差异都能被 `audit` 点名；
  ⑤ 保存是原子替换（同目录不留 `.tmp`）；
  ⑥ 命令级顺序守卫（读 submit.py 源码）：`rules import` 的 `--tmp` 必须在
     第一处写盘之前解析（否则缺参数会造成「插件已落盘、注册表已改、无回滚」
     的半导入），`rules delete` 的 `--tmp` 必须在确认与归档之前，`rules adopt`
     必须先读注册表并在有未登记插件时拒绝（防「手写插件 → adopt 洗白」）。

为什么要有这条臂：注册表是插件白名单的依据。它自己若没有「能被改坏」的
负例，就等于「用一份没验过的清单去验别人」——解析器一旦放宽（例如允许
`RULES = [RULE, "T02"]`），入口的成对导入会静默放行写坏的草稿。
"""
import argparse
import io
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
if KIT not in sys.path:
    sys.path.insert(0, KIT)

from core import rule_registry as RR      # noqa: E402

fails = []
total = [0]


def check(name, ok, detail=""):
    total[0] += 1
    print("%-4s %-52s %s" % ("PASS" if ok else "FAIL", name, detail))
    if not ok:
        fails.append(name)


def write(root, rel, text=""):
    p = os.path.join(root, rel.replace("/", os.sep))
    os.makedirs(os.path.dirname(p), exist_ok=True)
    io.open(p, "w", encoding="utf-8", newline="\n").write(text)


GOOD = '''# -*- coding: utf-8 -*-
"""T01：探针规则（自检专用，不入真包）。"""
RULE = "T01"
RULES = [RULE]
PHASE = 2
CATEGORY = "text"
APPLIES_TO = ["blog", "regulation"]
NEEDS = []
SEVERITY = "error"
ENABLED = True
RATIONALE = {RULE: "%s"}
COVERAGE = {"langs": "all", "zones": ["body"]}


def run(view, emit):
    return None


def review(finding, view):
    return None
''' % ("实测出处：" + "x" * 100)

ARM = '''# -*- coding: utf-8 -*-
"""T01 自检臂（探针）。"""


def main():
    print("PASS 探针")
    print("FAIL 0 / 断言 1")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
'''


def _bad(src, filename, expect):
    try:
        RR.parse_plugin(src, filename)
    except RR.RegistryError as exc:
        return expect in str(exc), str(exc)
    return False, "未拒绝"


def main(argv=None):
    ap = argparse.ArgumentParser(description="规则注册表自检")
    ap.add_argument("--tmp", metavar="DIR", required=True,
                    help="临时根目录（本臂要造隔离插件树）")
    args = ap.parse_args(argv)
    tmp = os.path.abspath(args.tmp)
    os.makedirs(tmp, exist_ok=True)

    # ① 正例
    rec = RR.parse_plugin(GOOD, "text-t01.py")
    check("正例：规则号/严重级/说明解析正确",
          rec["rule"] == "T01" and rec["severity"] == "error"
          and rec["desc"].startswith("探针规则"),
          str(rec["desc"][:40]))
    check("正例：分类取自文件名前缀", rec["category"] == "text")

    # ① 反例：每条都必须给出可读原因
    ok, why = _bad(GOOD, "T01.py", "文件名")
    check("反例：文件名非法被拒", ok, why)
    ok, why = _bad(GOOD, "zzz-t01.py", "分类前缀")
    check("反例：未知分类被拒", ok, why)
    ok, why = _bad(GOOD.replace('COVERAGE = {"langs": "all", "zones": ["body"]}',
                                ""), "text-t01.py", "COVERAGE")
    check("反例：缺 COVERAGE 被拒", ok, why)
    ok, why = _bad(GOOD.replace('RULES = [RULE]', 'RULES = [RULE, "T02"]'),
                   "text-t01.py", "RULES")
    check("反例：RULES 多值被拒（一规则一插件）", ok, why)
    ok, why = _bad(GOOD.replace('CATEGORY = "text"', 'CATEGORY = "numbers"'),
                   "text-t01.py", "CATEGORY")
    check("反例：CATEGORY 与文件名不一致被拒", ok, why)
    ok, why = _bad(GOOD.replace('"实测出处：' + "x" * 100 + '"', '"太短"'),
                   "text-t01.py", "过短")
    check("反例：RATIONALE 过短被拒", ok, why)
    ok, why = _bad(GOOD.replace("def run(view, emit):", "def run_x(view, emit):"),
                   "text-t01.py", "run")
    check("反例：缺 run() 被拒", ok, why)
    ok, why = _bad(GOOD.replace('"zones": ["body"]', '"zones": ["bogus"]'),
                   "text-t01.py", "未知层级")
    check("反例：未知 COVERAGE 层级被拒", ok, why)
    ok, why = _bad(GOOD.replace('SEVERITY = "error"', 'SEVERITY = os.environ["X"]'),
                   "text-t01.py", "字面量")
    check("反例：常量写成表达式被拒（不执行草稿）", ok, why)

    # ② 自检臂
    try:
        RR.validate_selftest(ARM, "text-t01.py", "text-t01.py")
        ok = True
        why = ""
    except RR.RegistryError as exc:
        ok, why = False, str(exc)
    check("自检臂正例通过", ok, why)
    for src, name, expects, label in (
            (ARM, "text-t02.py", "同名", "不同名被拒"),
            ("", "text-t01.py", "空文件", "空文件被拒"),
            (ARM.replace("def main():", "def other():"), "text-t01.py",
             "main", "缺可执行入口被拒")):
        try:
            RR.validate_selftest(src, name, "text-t01.py")
            ok, why = False, "未拒绝"
        except RR.RegistryError as exc:
            ok, why = expects in str(exc), str(exc)
        check("自检臂反例：%s" % label, ok, why)

    # ③ 往返
    work = os.path.join(tmp, "reg-arm")
    if os.path.isdir(work):
        shutil.rmtree(work)
    write(work, "plugins/text-t01.py", GOOD)
    write(work, "plugins/__init__.py", "")
    write(work, "selftest/text-t01.py", ARM)
    data = RR.build_from_disk(work)
    check("build_from_disk：登记 1 插件 / 1 规则 / 1 自检臂",
          len(data["plugins"]) == 1 and len(data["rules"]) == 1
          and len(data["selftest"]) == 1, str(
              {k: len(v) for k, v in data.items() if isinstance(v, dict)}))
    check("build_from_disk：__init__.py 进 shared",
          "__init__.py" in data["shared"])
    p = RR.save(work, data)
    check("save 原子写（不留 .tmp）", not os.path.exists(p + ".tmp"))
    loaded = RR.load(work)
    check("load 往返一致：规则号与指纹",
          loaded["rules"]["T01"]["severity"] == "error"
          and loaded["plugins"]["text-t01.py"]["sha256"]
          == data["plugins"]["text-t01.py"]["sha256"])
    d0 = RR.audit(work, loaded)
    check("audit：基线零差异",
          all(not v for k, v in d0.items() if isinstance(v, list)), str(d0))

    # ④ 四类差异
    write(work, "plugins/text-t01.py", GOOD + "\n# tampered\n")
    d = RR.audit(work, loaded)
    check("audit：指纹不符点名", d["hash_mismatch"] == ["text-t01.py"],
          str(d["hash_mismatch"]))
    write(work, "plugins/text-t01.py", GOOD)

    write(work, "plugins/text-t99.py", GOOD.replace('"T01"', '"T99"'))
    d = RR.audit(work, loaded)
    check("audit：未登记插件点名", d["unregistered"] == ["text-t99.py"],
          str(d["unregistered"]))
    os.remove(os.path.join(work, "plugins", "text-t99.py"))

    os.remove(os.path.join(work, "plugins", "text-t01.py"))
    d = RR.audit(work, loaded)
    check("audit：磁盘缺失点名", d["missing"] == ["text-t01.py"],
          str(d["missing"]))
    write(work, "plugins/text-t01.py", GOOD)

    orphan = RR.load(work)
    orphan["rules"]["T77"] = {"severity": "error", "desc": "孤儿"}
    d = RR.audit(work, orphan)
    check("audit：无插件指向的规则点名", d["orphan_rule"] == ["T77"],
          str(d["orphan_rule"]))
    check("owner_of 能定位规则归属",
          RR.owner_of(loaded, "T01") == "text-t01.py"
          and RR.owner_of(loaded, "T77") is None)

    # ⑥ 命令级顺序守卫：这类缺陷用数据层断言抓不到（曾经漏过一次半导入）。
    src = io.open(os.path.join(KIT, "submit.py"), encoding="utf-8").read()

    def _fn_body(name):
        start = src.index("def %s(" % name)
        end = src.find("\ndef ", start + 10)
        return src[start:end if end > 0 else len(src)]

    imp = _fn_body("_rules_import")
    pos_tmp = imp.find("require_tmp(")
    pos_write = imp.find("_atomic_write(dst_p")
    check("import：--tmp 在第一处写盘之前解析（防半导入）",
          0 <= pos_tmp < pos_write,
          "require_tmp@%d write@%d" % (pos_tmp, pos_write))

    dele = _fn_body("_rules_delete")
    pos_tmp = dele.find("require_tmp(")
    pos_yes = dele.find('getattr(args, "yes"')
    pos_arch = dele.find("archive_delete(")
    check("delete：--tmp 在确认与归档之前解析",
          0 <= pos_tmp < pos_yes and 0 <= pos_tmp < pos_arch,
          "--tmp@%d yes@%d archive@%d" % (pos_tmp, pos_yes, pos_arch))

    ad = _fn_body("_rules_adopt")
    pos_load = ad.find("try_load(")
    pos_build = ad.find("build_from_disk(")
    check("adopt：先读注册表，未登记时拒绝走 import（防洗白）",
          0 <= pos_load < pos_build and "unregistered" in ad
          and "rules import" in ad,
          "load@%d build@%d" % (pos_load, pos_build))

    print("\nFAIL %d / 断言 %d" % (len(fails), total[0]))
    return 0 if not fails else 1


if __name__ == "__main__":
    sys.exit(main())
