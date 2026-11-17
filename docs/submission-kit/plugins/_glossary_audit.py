# -*- coding: utf-8 -*-
"""plugins/_glossary_audit.py — 术语准入预检（只读工具，不是判据）。

原 plugins/p96_glossary_audit.py，M4 删 p00–p97 时一起下了线，但
`submit.py glossary audit` 还指着它（会 `_die("C01 未找到 p96 准入插件")`）。
M6 恢复为共享模块：loader 跳过下划线前缀，不进规则表、不参与 check。

ACCEPT 主结论 = 运行时五类术语检查（require / require_all / count / forbid /
元数据禁令）「加表前后增量 error」；射程三分类、禁用形预扫、自碰普查只作辅助。

依赖口径：判据函数在 `plugins/_glossary.py`（与 S08/S09/S11/S12/P43 同一份实现），
术语库装配在 `core/glossary_loader.py`，解析与切块在 core 事实层。这样预检看到
的结论与真正 check 时必然一致——不能另写一套近似判定。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
import io
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
KIT_DIR = os.path.dirname(HERE)
# 工作区根 = 工具包目录的上一级；投稿目录是它的兄弟 submission/。
# 旧值上溯两级，在扁平布局下会落到工作区根的父目录而扫不到任何稿件。
POSTS = os.path.dirname(KIT_DIR)

from core.frontmatter import parse_frontmatter                  # noqa: E402
from core.glossary_loader import _normalize_glossary            # noqa: E402
from core.textutil import blocks as _blocks                     # noqa: E402
from plugins import _glossary as _G                             # noqa: E402

DEFAULT_GLOSSARY = None      # 数据权威 = 策略库 PolicyView
TOK_RX = re.compile(r"[^\W\d_]+(?:['\u02BC\u05F3\u05F4\-][^\W\d_]+)*",
                    re.UNICODE)
LOG_BUFFER = []


def log(msg):
    """日志先缓存：--json 时 stdout 只输出纯 JSON，日志写 stderr（其他问题 4）。"""
    LOG_BUFFER.append(msg)
    if not JSON_MODE:
        sys.stdout.write(msg + "\n")


JSON_MODE = False


def runtime_findings(glossary, articles):
    """A05：准入主结论复用**运行时**五类术语检查。

    预扫只看禁用形，5784 个正向 require / require_all / count 与标题禁令
    过去完全不在 ACCEPT 的背书范围内。这里直接调用 内核 的
    五类检查器，对每篇语面取 finding 集合，由 main() 比较加表前后的增量。
    """
    g = _normalize_glossary(glossary)
    out = {}
    for name, parsed in articles:
        fs = []

        def add(rule, sev, sl, detail):
            if sev == "error":
                fs.append((rule, sl, detail))

        anchor = "zh" if "zh" in parsed else (
            sorted(parsed)[0] if parsed else "zh")
        _G._glossary_check(g, parsed, anchor, name, add)
        _G._glossary_excerpt_check(g, parsed, anchor, name, add)
        _G._glossary_title_check(g, parsed, anchor, name, add)
        _G._glossary_refs_check(g, parsed, anchor, name, add)
        _G._glossary_banned_check(g, parsed, name, add)
        out[name] = sorted(fs)
    return out


def load_pair(path):
    raw = io.open(path, encoding="utf-8", newline="").read()
    fm, body, err = parse_frontmatter(raw)
    return None if err else (fm, body)


def find_articles(roots, face="translations"):
    """返回 [(名字, {lg: (fm, body)})]；只收真有译文的篇。

    face="translations" 读工作树现值（blogs/<篇>/translations/<lg>.md）；
    face="work" 读成品包面（blogs/<篇>/work/**/content/<lg>/*.mdx），
    与提交字节一致——验收结论以 work 面为准，预扫以 translations 面为准。
    """
    out = []
    for root in roots:
        # main() 已把相对 roots 解析成绝对路径；这里只给相对路径兜底。
        base = root if os.path.isabs(root) else os.path.join(POSTS, root)
        if not os.path.isdir(base):
            continue
        for slug in sorted(os.listdir(base)):
            d = os.path.join(base, slug)
            if not os.path.isdir(d):
                continue
            parsed = {}
            tdir = os.path.join(d, "translations")
            cdir = None
            for dirpath, _dn, _fns in os.walk(os.path.join(d, "work")):
                if os.path.basename(dirpath) == "content":
                    cdir = dirpath
                    break
            src = tdir if (face == "translations" and os.path.isdir(tdir)) else cdir
            if src:
                if src == tdir:
                    for fn in sorted(os.listdir(src)):
                        if fn.endswith(".md"):
                            pf = load_pair(os.path.join(src, fn))
                            if pf:
                                parsed[fn[:-3]] = pf
                else:
                    for lg in sorted(os.listdir(src)):
                        lp = os.path.join(src, lg)
                        if not os.path.isdir(lp):
                            continue
                        fns = [f for f in os.listdir(lp)
                               if f.endswith((".md", ".mdx"))]
                        if fns:
                            pf = load_pair(os.path.join(lp, fns[0]))
                            if pf:
                                parsed[lg] = pf
            for fn in sorted(os.listdir(d)):
                if fn.endswith(u"中文草稿.md") or fn.endswith(u"中文母版.md"):
                    pf = load_pair(os.path.join(d, fn))
                    if pf:
                        parsed.setdefault("zh", pf)
                    break
            if "zh" not in parsed and cdir:
                # 法规线没有「中文草稿」，母版就在包面 content/zh/ 里；
                # 取不到母版 ⇒ 尺子整篇跳过（master_lang not in parsed），
                # 预扫也必须跳过，否则会把「无射程」误算成「全篇生效」。
                lp = os.path.join(cdir, "zh")
                if os.path.isdir(lp):
                    fns = [f for f in os.listdir(lp)
                           if f.endswith((".md", ".mdx"))]
                    if fns:
                        pf = load_pair(os.path.join(lp, fns[0]))
                        if pf:
                            parsed["zh"] = pf
            if len(parsed) > 1:
                out.append(("%s/%s" % (root, slug), parsed))
    return out


def fields_of(fm, body):
    return [("title", str(fm.get("title") or "")),
            ("excerpt", str(fm.get("excerpt") or "")),
            ("references", " \n".join(str(r.get("title") or "")
                                      for r in (fm.get("references") or [])
                                      if isinstance(r, dict))),
            ("正文", body or "")]


def all_terms(glossary, shared=None):
    """把四段（terms/banned/excerpt/title/refs）摊平成同一种待扫条目。

    每条带齐尺子用来定位射程的三样东西：anchor（zh 锚点）、scope、lic
    （forbid_licensed_by），外加 _shared（共享表条款：锚点不在该篇母版时
    尺子整条跳过，预扫也不许把它算成红——内核 在装载 kit 表时
    就给每条打 _shared=True，见 4629–4651 行）。
    待入条款文件里显式写 "shared": false 的，按篇钉条款口径扫（锚点缺席＝报错）。
    """
    out = []
    for t in (glossary.get("terms") or []):
        sh = bool(t.get("_shared")) if "shared" not in t else bool(t.get("shared"))
        if shared is True and "shared" not in t and "_shared" not in t:
            sh = True
        for seg, d in (("forbid", t.get("forbid") or {}),
                       ("forbid_re", t.get("forbid_re") or {})):
            for lg, v in d.items():
                for x in ([v] if isinstance(v, str) else (v or [])):
                    out.append({"src": "S08", "id": t.get("id"), "lang": lg,
                                "kind": seg, "term": str(x),
                                "anchor": t.get("zh"),
                                "scope": str(t.get("scope") or "block"),
                                "lic": (t.get("forbid_licensed_by") or {}).get(lg),
                                "shared": sh,
                                "fsub": _G._ban_fsub(t)})
    for seg, key in (("P43", "banned"), ("S09", "excerpt"),
                     ("S11", "title"), ("S12", "refs")):
        for it in (glossary.get(key) or []):
            forb = it.get("forbid") or {}
            fsub = str(it.get("match") or "").strip().lower() == "substring"
            # A05：元数据禁令用 forbid:{sw:[...]}，按顶层 lang 再取 forb[lang]
            # 会展开成 0 项（sw-title-noun-class 实测）。这里按实际语言键展开。
            langs = {str(it.get("lang") or "").strip()} if seg == "P43" \
                else set(forb.keys())
            if seg == "P43" and not it.get("lang"):
                continue
            for lg in sorted(x for x in langs if x and x != "*"):
                vals = forb.get(lg, []) if seg != "P43" else None
                terms = it.get("terms") if seg == "P43" else (vals or [])
                for x in ([terms] if isinstance(terms, str) else (terms or [])):
                    s = str(x).strip()
                    if s:
                        out.append({"src": seg, "id": it.get("id"), "lang": lg,
                                    "kind": "forbid", "term": s,
                                    "anchor": it.get("zh"), "scope": "all",
                                    "lic": None, "shared": True, "fsub": fsub})
    return out


def corpus_tokens(parsed):
    toks = {}
    for lg, (fm, body) in parsed.items():
        s = set()
        for _f, fld in fields_of(fm or {}, body):
            for m in TOK_RX.finditer(fld):
                s.add(m.group(0).casefold())
        toks[lg] = s
    return toks


def _re_count(pat, text):
    """forbid_re 的命中数（尺子用 re.search 只判有无，这里要数处数所以 findall；
    正则坏掉时返回 -1，由调用方写进 where 里出声，不静默当 0）。"""
    try:
        return len(re.findall(pat, text or "", re.IGNORECASE))
    except re.error:
        return -1


def _lic_count(lic, master_block):
    """母版同块里的授权次数：字符串按出现数、列表取和、"re:" 走正则。
    与 内核._glossary_check 里 v1.94 的实现同口径。"""
    if not lic:
        return 0
    lics = [lic] if isinstance(lic, str) else list(lic or [])
    n = 0
    for one in lics:
        src = str(one)
        if src.startswith("re:"):
            try:
                n += len(re.findall(src[3:], master_block))
            except re.error:
                pass
        elif src:
            n += master_block.count(src)
    return n


def audit_hits(entries, articles):
    """按尺子自己的口径数命中，逐段同构：

      S08＝母版锚点定位块（scope=block 取首块／all 取每一块），只在该块内判
           forbid／forbid_re，forbid_licensed_by 按母版同块来源词次数封顶；
           锚点在该篇母版里找不到 ⇒ 共享条款整条跳过（尺子同规则）。
      S09／S11／S12＝条款级 "zh" 锚要在**该篇自己的**摘要／标题／题录里出现才激活。
      P43＝无锚点，全篇生效（title／excerpt／references／正文四字段）。

    n_in＝真会让该篇变红的处数；n_out＝尺子不看、但把全篇一起数时会出现的处数
    （＝历轮「条款过宽」争论的来源，量出来才知道要不要动判据）。
    """
    hits = []
    missing_master = set()
    for e in entries:
        lg = e["lang"]
        n_in = n_out = 0
        where = []
        for name, parsed in articles:
            pf = parsed.get(lg)
            zh = parsed.get("zh")
            if not pf:
                continue
            fm, body = pf
            anchored = bool(e["anchor"])
            if anchored and not zh and e["src"] != "P43":
                missing_master.add(name)
                continue
            if e["src"] in ("S09", "S11", "S12"):
                # 激活面＝母版同字段；判定面＝该语同字段
                zfm = (zh or ({}, ""))[0] or {}
                if e["src"] == "S09":
                    hay_z = str(zfm.get("excerpt") or "")
                    hay = str((fm or {}).get("excerpt") or "")
                elif e["src"] == "S11":
                    hay_z = str(zfm.get("title") or "")
                    hay = str((fm or {}).get("title") or "")
                else:
                    def _rt(f):
                        return " \n".join(str(r.get("title") or "")
                                          for r in ((f or {}).get("references") or [])
                                          if isinstance(r, dict))
                    hay_z, hay = _rt(zfm), _rt(fm)
                if anchored and str(e["anchor"]) not in hay_z:
                    continue
                if e["kind"] == "forbid_re":
                    got = _re_count(e["term"], hay)
                else:
                    got = len(_G._ban_hits(lg, e["term"], hay, e["fsub"]))
                n_in += got
                if got:
                    where.append("%s×%d（%s 字段激活）"
                                 % (name.split("/")[-1][:24], got, e["src"]))
                continue
            if e["kind"] == "forbid_re":
                rx_n = _re_count
            else:
                rx_n = None
            if not anchored:      # P43：四字段全篇
                tot = sum(len(_G._ban_hits(lg, e["term"], fld, e["fsub"]))
                          for _f, fld in fields_of(fm or {}, body))
                n_in += tot
                if tot:
                    where.append("%s×%d（无锚点，全篇生效）"
                                 % (name.split("/")[-1][:24], tot))
                continue
            zb = _blocks(zh[1])
            tb = _blocks(body)
            idxs = [i for i, b in enumerate(zb) if str(e["anchor"]) in b]
            if e["scope"] != "all":
                idxs = idxs[:1]
            if not idxs:
                if e["shared"]:
                    continue      # 该篇母版不含此概念 ⇒ 尺子整条跳过
                idxs = []
            authorized = 0
            if rx_n:              # forbid_re：不参与授权（同尺子）
                inb = sum(rx_n(e["term"], tb[i]) for i in idxs if i < len(tb))
                tot = rx_n(e["term"], body or "")
            else:
                inb = 0
                authorized = 0
                for i in idxs:
                    if i >= len(tb):
                        continue
                    got = len(_G._ban_hits(lg, e["term"], tb[i], e["fsub"]))
                    lic_n = _lic_count(e.get("lic"), zb[i])
                    authorized += min(got, lic_n)
                    inb += max(0, got - lic_n)
                tot = sum(len(_G._ban_hits(lg, e["term"], fld, e["fsub"]))
                          for _f, fld in fields_of(fm or {}, body))
            n_in += inb
            n_out += max(0, tot - inb - authorized)
            if tot:
                where.append("%s 共%d（锚内授权%d／锚内超额%d／真正锚外%d，锚块%s个）"
                             % (name.split("/")[-1][:24], tot, authorized, inb,
                                max(0, tot - inb - authorized), len(idxs)))
        if n_in or n_out:
            hits.append(dict(e, n_in=n_in, n_out=n_out, where=where,
                             no_master=sorted(missing_master)))
    return hits


def self_collisions(entries, articles):
    """整词档救回来的形状：禁用串被本语真词包在词内（hy «ՉՈՒՆ»⊂«չունի»）。"""
    toks = {name: corpus_tokens(parsed) for name, parsed in articles}
    out = []
    for e in entries:
        lg = e["lang"]
        if e["kind"] != "forbid" or lg in _G._BAN_SPACELESS:
            continue
        mode, nd = _G._ban_spec(e["term"], e["fsub"])
        if not nd or " " in nd.casefold():
            continue
        bad = []
        for name, per_lang in toks.items():
            for tk in per_lang.get(lg, ()):
                if nd.casefold() in tk and nd.casefold() != tk:
                    bad.append("%s:%s" % (name.split("/")[-1][:6], tk))
                    if len(bad) >= 3:
                        break
            if len(bad) >= 3:
                break
        if bad:
            out.append(dict(e, coll=bad,
                            guard=(mode == "word")))
    return out


def _default_roots(repo_root):
    """投稿目录默认口径：扁平布局 submission/{blogs,regulations} 优先。

    旧布局（工作区根直接放 blogs/、regulations/）作回退；两者都不存在时
    仍返回扁平布局，由调用方打印「未发现稿件」并拒绝 ACCEPT，不静默给绿。
    """
    base = repo_root or POSTS
    for pair in (("submission/blogs", "submission/regulations"),
                 ("blogs", "regulations")):
        if os.path.isdir(os.path.join(base, pair[0].replace("/", os.sep))):
            return list(pair)
    return ["submission/blogs", "submission/regulations"]


def main(argv, repo_root=None, pv=None):
    global JSON_MODE
    roots = None
    face = "translations"
    glossary_path = DEFAULT_GLOSSARY
    only_term = None
    new_file = None
    as_json = False
    for a in argv:
        if a.startswith("--roots="):
            roots = a.split("=", 1)[1].split(",")
        elif a.startswith("--db="):
            glossary_path = a.split("=", 1)[1]
        elif a.startswith("--term="):
            only_term = a.split("=", 1)[1]
        elif a.startswith("--new="):
            new_file = a.split("=", 1)[1]
        elif a.startswith("--face="):
            face = a.split("=", 1)[1]
        elif a == "--json":
            as_json = True
    JSON_MODE = as_json
    try:
        from core import db as _db
        if pv is not None:
            policy = pv
        elif glossary_path:
            policy = _db.current_policy(glossary_path)
        else:
            policy = _db.current_policy(kit_dir=KIT_DIR)
        glossary = _db.policy_spec(policy)
    except Exception as exc:
        log("!! 策略库读取失败：%s" % exc)
        return 2
    base_glossary = json.loads(json.dumps(glossary, ensure_ascii=False))
    if new_file:
        add = json.load(io.open(new_file, encoding="utf-8"))
        for k in ("terms", "banned", "excerpt", "title", "refs"):
            glossary.setdefault(k, [])
            glossary[k] = list(glossary[k]) + list(add.get(k) or [])
        log("面｜预扫对象＝现行表＋%s（待入条款）" % new_file)
    else:
        log("面｜预扫对象＝策略库 v%s" % policy.policy_version)
    # 显式 --roots 优先；未给时按布局探测，避免解包目录/旧布局下扫 0 篇。
    if roots is None:
        roots = _default_roots(repo_root)
    abs_roots = [r if os.path.isabs(r) else os.path.join(
        repo_root or POSTS, *r.split("/")) for r in roots]
    articles = find_articles(abs_roots, face)
    nlang = sum(len(p) for _n, p in articles)
    if not articles:
        log("!! 未发现任何稿件（roots=%s, face=%s）：请检查 --root / --roots / "
            "--face；无稿件的审计结论不可用。" % (",".join(roots), face))
    no_master = [n for n, p in articles if "zh" not in p]
    log("面｜篇目 %d 个、语面 %d 份（roots=%s, face=%s）；缺中文母版 %d 篇%s"
        % (len(articles), nlang, ",".join(roots), face, len(no_master),
           "：" + ", ".join(x.split("/")[-1][:34] for x in no_master[:6])
           if no_master else ""))

    entries = all_terms(glossary)
    if only_term:
        entries = [e for e in entries if str(e["id"]) == only_term]
    log("表｜待扫禁用形 %d 条（S08 forbid／forbid_re／P43 banned／S09／S11／S12）"
        % len(entries))

    hits = audit_hits(entries, articles)
    collide = self_collisions(entries, articles)
    ban_reject = [h for h in hits if h["n_in"]]

    # A05：准入主结论 = 运行时五类术语检查的**增量 error**
    before = runtime_findings(base_glossary, articles)
    after = runtime_findings(glossary, articles)
    new_errors = []
    for name, fs in after.items():
        old = set(before.get(name, []))
        for f in fs:
            if f not in old:
                new_errors.append((name, f))
    # 指定条款但运行时/预扫都展开 0 项 ⇒ 明确拒绝
    zero_expansion = bool(only_term and not entries and not new_errors)

    log("\n① 准入主结论：运行时五类术语检查（require / require_all / count / "
        "forbid / 元数据禁令）加表前后的新增 error")
    if not new_errors:
        log("   0 条增量 error")
    for name, f in new_errors[:25]:
        log("   ✗ %s %s %s：%s" % (name.split("/")[-1][:24], f[0], f[1],
                                   f[2][:100]))
    log("\n② 辅助：禁用形预扫（锚块内超授权命中）%d 条" % len(ban_reject))
    for h in ban_reject[:12]:
        log("   ✗ %s %s/%s「%s」射程内 %d 处：%s"
            % (h["src"], h["lang"], h["id"], h["term"], h["n_in"],
               "; ".join(h["where"][:2])[:110]))
    only_out = [h for h in hits if not h["n_in"] and h["n_out"]]
    log("\n③ 射程体检：只在锚块外命中（尺子不看）%d 条" % len(only_out))
    for h in only_out[:25]:
        log("   · %s %s/%s「%s」真正锚外 %d 处：%s"
            % (h["src"], h["lang"], h["id"], h["term"], h["n_out"],
               "; ".join(h["where"][:2])[:110]))
    if not only_out:
        log("   0 条")
    log("\n④ 自碰普查：禁用串落在本语真词内部（整词档救回来的形状）")
    guarded = [c for c in collide if c["guard"]]
    unguarded = [c for c in collide if not c["guard"]]
    log("   受整词档保护 %d 条；仍走子串档且会自碰 %d 条" %
        (len(guarded), len(unguarded)))
    for c in unguarded:
        log("   ! %s/%s「%s」子串档自碰：%s"
            % (c["lang"], c["id"], c["term"], ", ".join(c["coll"][:3])))

    no_articles = not articles
    reject = bool(new_errors or ban_reject or zero_expansion or no_articles)
    if zero_expansion:
        log("   !! 指定条款 %s 展开 0 条检查项，拒绝 ACCEPT" % only_term)
    if no_articles:
        log("   !! 0 篇稿件，拒绝 ACCEPT")
    conclusion = "REJECT" if reject else "ACCEPT"
    log("\n结论 = %s（准入主结论＝运行时五类术语检查增量；"
        "预扫统计仅作辅助）" % conclusion)

    if as_json:
        payload = {"result": conclusion,
                   "articles": len(articles), "lang_faces": nlang,
                   "roots": abs_roots, "face": face,
                   "runtime_new_errors": [
                       {"article": a, "rule": f[0], "slug": f[1],
                        "detail": f[2]} for a, f in new_errors],
                   "ban_reject": ban_reject,
                   "scope_only_outside": only_out,
                   "self_collision_guarded": len(guarded),
                   "self_collision_unguarded": unguarded,
                   "zero_expansion": zero_expansion,
                   "log": LOG_BUFFER}
        for line in LOG_BUFFER:
            sys.stderr.write(line + "\n")
        sys.stdout.write(json.dumps(payload, ensure_ascii=False, indent=1))
    return 1 if reject else 0


