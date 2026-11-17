# -*- coding: utf-8 -*-
"""plugins/_glossary.py — 术语契约判据工具（块级/摘要/标题/题录/禁用词）。

文件名以 `_` 开头：loader 不装载，A6 不计入插件名单。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
import re
import unicodedata

from core.textutil import blocks as _blocks

from core.consts import _BAN_SPACELESS


def _glossary_check(spec, parsed, master_lang, slug, add):
    """S08（v1.19）：块级术语契约。

    数据来自调用方传入的 glossary（--glossary=<file>），格式：
        {"terms": [{"id": "...", "zh": "<母版锚点短语>",
                    "require": {"ko": ["감독"], "*": ["..."]},
                    "require_all": {"hy": ["5 000", "26 000"]},
                    "forbid":  {"ko": ["진입 요건"]},
                    "forbid_re": {"ko": ["\\b감독\\b"]},
                    "forbid_licensed_by": {"th": "公告"}}]}
    可选 "require_all"（v2.05，与 S09 摘要侧 v1.74 同键名）：{语种: [词形]}，
    该语言列表里**每一个**词形都必须出现在锚块中（all-of），逐形报缺；
    require 是 any-of（命中任一即可），一块承载多层事实时 any-of 会漏判
    少写的那一层，A7 b27「单次限值 5000＋年度限值 26000」实证。
    可选 "forbid_licensed_by"（v1.48）：{语种: 母版来源词}。同一块里母版
    自己出现该来源词时，译文的禁用形按来源词出现数封顶放行（公告→ประกาศ）；
    超出才判红，红面同时写授权数与实测数。
    【v1.74】可选 "forbid_re"：{语种: [正则]}，按 Unicode 词边界匹配原块
    （不 casefold），用于「禁止某一词族、但不能误伤更长的词」——例如禁
    seaport 的 port，不能用子串 forbid（port 会命中 importe / импорт），
    正则 \\bport\\b 只命中整词。
    以 zh 锚点在母版中的**块序号**定位，取各语言同一块序号的正文再判短语：
    术语表因此不依赖行号，也不受翻译后句子切分差异影响（P23 已保证逐块同构）。

    存在的理由：译反方向（监管↔准入、固体饮料↔即饮、不会丢↔会丢）时，
    语法、结构、字数、AI 腔全部正常，P 族与 ST 族一条都拦不住——只有把
    母版语义固化成「该块必须出现的词 / 不得出现的词」才能机检。
    """
    terms = spec.get("terms") if isinstance(spec, dict) else spec
    if not isinstance(terms, list):
        add("S08", "error", slug, "术语契约结构应为 {\"terms\": [...]} 或数组")
        return
    if master_lang not in parsed:
        return
    base_blocks = _blocks(parsed[master_lang][1])
    loc_blocks = dict((lg, _blocks(parsed[lg][1])) for lg in parsed)

    for t in terms:
        if not isinstance(t, dict) or not str(t.get("zh", "")).strip():
            continue
        # v2.23：契约射程可按 slug 限定。REG24（109 号缅甸鲜食香蕉）与
        # REG10（234 号秘鲁鲜食香蕉）的包装要求整块逐字同型，块内任何一句
        # 都同时命中两篇母版，按「本篇独有整句锚」的旧口径无法登记只能用
        # 宽锚的契约，宽锚又会让已交付存量无端受检。可选 only_slug
        # （字符串或列表，按子串匹配当前 slug，与 _latin_allow 同口径）
        # 只在本篇执行；不写该字段的存量契约行为逐字不变。
        only = t.get("only_slug")
        if only:
            allowed = [only] if isinstance(only, str) else list(only or [])
            if not any(str(a) and str(a) in str(slug) for a in allowed):
                continue
        tid = str(t.get("id") or t["zh"])[:40]
        anchor = str(t["zh"]).strip()
        # v1.21：scope="all" 时，母版中**每一处**含锚点的块都要校验。
        # 默认（block）只校验首次出现的那一块——适合「某一句译反了」；
        # 而「同一概念在后文换了词」（申报→广告、合规流→追踪、验收→移交）
        # 只在首次出现处正确，必须逐块覆盖才能抓到。
        scope = str(t.get("scope") or "block").strip().lower()
        if scope == "all":
            idxs = [i for i, b in enumerate(base_blocks) if anchor in b]
        else:
            first = next((i for i, b in enumerate(base_blocks) if anchor in b), None)
            idxs = [] if first is None else [first]
        if not idxs:
            if t.get("_shared"):
                continue  # 共享库条款：该文章不涉及此概念，跳过而非报错
            add("S08", "error", slug,
                "术语 %s 的 zh 锚点在母版中找不到：%s" % (tid, anchor[:50]))
            continue
        req = t.get("require") or {}
        req_all = t.get("require_all") or {}   # v2.05（与 S09 v1.74 同键名）
        forb = t.get("forbid") or {}
        forb_re = t.get("forbid_re") or {}
        targets = set(k for k in list(req) + list(req_all) + list(forb) + list(forb_re)
                      if k != "*")
        if "*" in req or "*" in req_all or "*" in forb or "*" in forb_re:
            targets |= set(lg for lg in parsed if lg != master_lang)
        # 其他问题 3：默认 master=zh 时 S08 跳过母版，require.zh 形同虚设。
        # 显式登记的目标改由「母版不变量」在中文锚块上单独执行。
        if master_lang in req:
            mv = req[master_lang]
            mforms = [mv] if isinstance(mv, str) else list(mv or [])
            for i in idxs:
                if i < len(base_blocks) and not any(
                        _req_hit(p, base_blocks[i], t, master_lang) for p in mforms):
                    add("S08", "error", "%s/%s" % (master_lang, slug),
                        "母版不变量 %s 未满足：第 %d 块应含「%s」"
                        % (tid, i + 1, " / ".join(mforms[:2])))
                    break
        for lg in sorted(targets):
            if lg == master_lang or lg not in loc_blocks:
                continue
            need = _gloss_pats(req, lg)
            need_all = _gloss_pats(req_all, lg)
            banned = _gloss_pats(forb, lg)
            banned_re = _gloss_pats(forb_re, lg)
            fsub = _ban_fsub(t)
            # v1.59-local-1（M3 实证）：scope="all" 的缺词形聚合为一条并附锚块
            # 全景——sw 清关契约 zh 锚 5 块只落 1 块，8 条散块报错需人工拼出
            # 「母版共几块、缺哪几块」；聚合后报错即给修稿清单。判据不变
            #（缺失判定逐块同前），只改呈现；scope="block" 与 forbid/count
            # 的逐块行为不变。
            # I17：块数不足时契约整体无法执行，旧版两条路径都静默跳过
            if len(loc_blocks[lg]) < len(base_blocks):
                add("S14", "error", "%s/%s" % (lg, slug),
                    "术语 %s 无法执行：译文 %d 块 < 母版 %d 块（缺 %d 块），"
                    "请补齐逐块结构后重跑" % (tid, len(loc_blocks[lg]),
                                            len(base_blocks),
                                            len(base_blocks) - len(loc_blocks[lg])))
            # A04/I19：法定原文整串逐字保留（按锚块任一命中，避免多锚块误报）
            verb = str(t.get("verbatim") or "").strip()
            if verb:
                cand = [loc_blocks[lg][i] for i in idxs
                        if i < len(loc_blocks[lg])]
                if cand and not any(_verbatim_hit(verb, b) for b in cand):
                    add("S08", "error", "%s/%s" % (lg, slug),
                        "法定原文串未逐字保留（契约 %s）：应含「%s」"
                        % (tid, verb[:110]))
            if scope == "all" and need:
                missing = [i for i in idxs
                           if i >= len(loc_blocks[lg])
                           or not any(_req_hit(p, loc_blocks[lg][i], t, lg)
                                      for p in need)]
                if missing:
                    h2flag = ("〔缺失块含小节标题——H2 标题块同样受术语契约约束，"
                              "标题措辞也要含规定词形〕"
                              if any(base_blocks[i].lstrip().startswith("##")
                                     for i in missing) else "")
                    add("S08", "error", "%s/%s" % (lg, slug),
                        "术语 %s 缺失：锚语「%s」在母版共 %d 块（第%s块），"
                        "%s 语应含「%s」，缺失 %d 块（第%s块）%s"
                        % (tid, anchor[:40], len(idxs),
                           ", ".join(str(i + 1) for i in idxs),
                           lg, " / ".join(need[:3]),
                           len(missing),
                           ", ".join(str(i + 1) for i in missing),
                           h2flag))
            for idx in idxs:
                if idx >= len(loc_blocks[lg]):
                    continue
                raw = loc_blocks[lg][idx]
                blk = raw.casefold()
                where = ("（第%d块，母版锚点：%s）" % (idx + 1, anchor[:40])
                         if scope == "all" else "（母版锚点：%s）" % anchor[:40])
                # v1.59：锚点落在小节标题上时点明「标题也受契约」——REG1 实证
                #（zh「申报环节的刚性要求」为 H2），报错看不出标题为何也要改。
                if base_blocks[idx].lstrip().startswith("##"):
                    where += "〔母版锚点块是小节标题——H2 标题块同样受术语契约约束，标题措辞也要含规定词形〕"
                if need and scope != "all" \
                        and not any(_req_hit(p, raw, t, lg) for p in need):
                    add("S08", "error", "%s/%s" % (lg, slug),
                        "术语 %s 缺失：该块应含「%s」%s"
                        % (tid, " / ".join(need[:3]), where))
                # v2.05：require_all（A7 47 语人工审核回填）。与 require 的
                # any-of 相反——同一语言的列表里**每个词形都要**在该块出现，
                # 逐形报缺。存在的理由：A7 b27 一块同时承载「单次限值」与
                # 「年度限值」两个数，any-of 时译文只写 5 000（把 26 000 写成
                # 裸形或漏掉）也算过；P57 只判「用了的分隔符合不合法」，不判
                # 「该族是否必须分节」，于是 hy 的 «5000/26000» 裸形在两尺上
                # 全绿（本轮人工对读才抓出，见 tmp/a7/review_r1.md 4.2）。
                # all-of 把「一块里的多层事实」逐层锁死，S09 摘要侧 v1.74
                # 已是同一口径，本条把该能力补到块级。
                if need_all:
                    miss_all = [p for p in need_all
                                if not _req_hit(p, raw, t, lg)]
                    if miss_all:
                        add("S08", "error", "%s/%s" % (lg, slug),
                            "术语 %s 逐形缺失（require_all）：该块应同时含「%s」，"
                            "缺「%s」%s"
                            % (tid, " / ".join(need_all[:4]),
                               " / ".join(miss_all[:4]), where))
                hit = _ban_any(lg, banned, raw, fsub)
                # v1.48：禁用形按母版另一来源词授权。同一块里母版**自己**有
                # 「公告」时，泰语 ประกาศ 是公告的合法译形，不是把「申报」写成
                # 「宣布」；授权上限＝母版同块该来源词出现数（n=0 时与旧行为
                # 完全一致，F2 形误用照旧判红）。红面写清 n 与实测次数。
                # v1.94：lic 允许写成列表（多个来源词任一授权，次数取和），
                # 并支持 "re:" 前缀的正则来源词（文号形「令第 236 号」这类
                # 需要形状判定的授权）。
                lic = (t.get("forbid_licensed_by") or {}).get(lg)
                extra = ""
                if hit and lic:
                    lics = [lic] if isinstance(lic, str) else list(lic or [])
                    n = 0
                    for one in lics:
                        src = str(one)
                        if src.startswith("re:"):
                            try:
                                n += len(re.findall(src[3:], base_blocks[idx]))
                            except re.error:
                                add("C01", "error", slug,
                                    "术语契约配置错误：%s 的 forbid_licensed_by 正则无效：%r"
                                    % (tid, src))
                        elif src:
                            n += base_blocks[idx].count(src)
                    got = sum(_ban_count(lg, p, raw, fsub) for p in hit)
                    if got > n:
                        if n:  # n=0 时红面与旧行为逐字一致，只多授权配置不影响
                            extra = ("（母版同块「%s」%d 次，实测 %d 次，超出授权）"
                                     % ("／".join(str(x) for x in lics), n, got))
                    else:
                        hit = []
                if hit:
                    add("S08", "error", "%s/%s" % (lg, slug),
                        "术语 %s 出现反向表述「%s」%s%s"
                        % (tid, " / ".join(hit[:3]), where, extra))
                # v1.74：正则禁用词族。与原块（不 casefold）按 re.I 匹配，
                # 供 \b 词边界使用；与上面的子串 forb 独立计数、不参与
                # forbid_licensed_by 授权。
                hit_re = []
                for pat in banned_re:
                    try:
                        if re.search(pat, raw, re.IGNORECASE):
                            hit_re.append(pat)
                    except re.error:
                        add("C01", "error", slug,
                            "术语契约配置错误：%s 的 forbid_re 正则无效：%r"
                            % (tid, pat))
                if hit_re:
                    add("S08", "error", "%s/%s" % (lg, slug),
                        "术语 %s 出现禁用词形（正则）「%s」%s"
                        % (tid, " / ".join(hit_re[:3]), where))
                # v1.25：出现次数下限（条款级 "count": true 开启）。
                # 母版锚点在该块出现 zn 次，各语 require 词形（多词形取
                # 命中区间并集）至少命中 zn 次。抓「同一概念首两处译对、
                # 第三处退成代词/弱词」——F1 实证：ko「HS 코드」在 b17
                # 前两处正确、第三处退成「번호」（编号），th/vi 同型。
                if t.get("count") and need:
                    zn = base_blocks[idx].count(anchor)
                    m = _term_hits(blk, [p.casefold() for p in need])
                    if m < zn:
                        add("S08", "error", "%s/%s" % (lg, slug),
                            "术语 %s 出现次数不足：母版 %d 次、译文 %d 次%s"
                            % (tid, zn, m, where))


def _glossary_excerpt_check(spec, parsed, master_lang, slug, add):
    """S09（v1.20）：摘要术语契约。

    glossary 里可选的 "excerpt" 数组，每项：
        {"id": "...", "note": "<人读的说明，可选>",
         "zh": "<可选：母版摘要锚短语，v1.45>",
         "require": {"*": ["..."], "de": ["..."]},
         "require_all": {"de": ["...", "..."]},
         "forbid":  {"de": ["..."]}}
    对 frontmatter.excerpt 判「必须出现 / 不得出现」，`*` 为所有语言的兜底。
    【v1.74】"require_all" 与 "require" 不同：同一语言的列表里**每一短语**
    都必须出现（any-of → all-of），用于摘要同时承载多层事实时逐层锁定。

    【v1.45】条款可带可选 "zh" 锚：锚短语出现在**该篇自己的** zh 摘要里才
    激活（与 S08 的 zh 块锚同一模式，内容驱动、不认 slug）——「该篇摘要
    承载哪几层」逐篇不同，摘要没承诺这一层的文章不应被别篇的契约套住。
    缺省（无 zh）= 全文章生效（forbid-only 条款这样用最稳）。

    存在的理由：摘要是读者第一眼看到的内容，此前只受长度约束（F07）。
    母版摘要按「四层框架」逐层罗列时，译文漏掉其中一层（F1 实证：15 语漏掉
    「政策依据」层，瑞典语漏掉后只剩三项），正文完全正确、长度也合规，
    P 族、F 族、L 族一条都不报错——只能把「每层该怎么写」落到术语表。
    """
    items = spec.get("excerpt") if isinstance(spec, dict) else None
    if not isinstance(items, list) or not items:
        return
    zh_fm = parsed.get(master_lang, (None, None))[0] or {}
    zh_excerpt = str(zh_fm.get("excerpt") or "")
    for it in items:
        if not isinstance(it, dict):
            continue
        zha = str(it.get("zh") or "").strip()
        if zha and zha not in zh_excerpt:
            continue
        tid = str(it.get("id") or "").strip() or "<unnamed>"
        req = it.get("require") or {}
        req_all = it.get("require_all") or {}
        forb = it.get("forbid") or {}
        targets = set(k for k in list(req) + list(req_all) + list(forb)
                      if k != "*")
        if "*" in req or "*" in req_all or "*" in forb:
            targets |= set(lg for lg in parsed if lg != master_lang)
        for lg in sorted(targets):
            if lg == master_lang or lg not in parsed:
                continue
            fm = parsed[lg][0] or {}
            excerpt = str(fm.get("excerpt") or "").strip()
            if not excerpt:
                add("S09", "error", "%s/%s" % (lg, slug),
                    "摘要为空，无法满足术语 %s" % tid)
                continue
            hay = excerpt
            need = _gloss_pats(req, lg)
            need_all = _gloss_pats(req_all, lg)
            banned = _gloss_pats(forb, lg)
            fsub = _ban_fsub(it)
            if need and not any(_req_hit(p, hay, it, lg) for p in need):
                add("S09", "error", "%s/%s" % (lg, slug),
                    "摘要缺少术语 %s：应含「%s」" % (tid, " / ".join(need[:3])))
            miss_all = [p for p in need_all if not _req_hit(p, hay, it, lg)]
            if miss_all:
                add("S09", "error", "%s/%s" % (lg, slug),
                    "摘要缺少术语 %s：应同时含 %d 项，缺「%s」"
                    % (tid, len(need_all), " / ".join(miss_all[:3])))
            hit = _ban_any(lg, banned, hay, fsub)
            if hit:
                add("S09", "error", "%s/%s" % (lg, slug),
                    "摘要出现反向表述「%s」（术语 %s）" % (" / ".join(hit[:3]), tid))


def _glossary_title_check(spec, parsed, master_lang, slug, add):
    """S11（v1.37）：标题术语契约。

    glossary 里可选的 "title" 数组，每项：
        {"id": "...", "note": "<人读的说明，可选>",
         "zh": "<可选：母版标题锚短语，v1.45>",
         "require": {"*": ["..."], "de": ["..."]},
         "require_all": {"de": ["...", "..."]},
         "forbid":  {"de": ["..."]}}
    对 frontmatter.title 判「必须出现 / 不得出现」，`*` 为所有语言的兜底。
    【v1.74】"require_all"：同一语言的列表里每一短语都必须出现（all-of）。

    【v1.45】条款可带可选 "zh" 锚：锚短语出现在**该篇自己的** zh 标题里才
    激活（与 S08 的 zh 块锚同一模式，内容驱动、不认 slug）——「该篇标题
    承载哪几层」逐篇不同，标题没承诺这一层的文章不应被别篇的契约套住。
    缺省（无 zh）= 全文章生效（forbid-only 条款这样用最稳）。

    存在的理由：F2 47 语人工审校实证——标题此前只受长度约束（F03 ≤85），
    于是「后半句整层丢失」在 45 语里一路绿灯（母版第二分句「把保税项目拆成
    可验收的交付物」只有 ja/ko 换了别的第二分句，其余全部只剩主句），
    而「三步进场」的宾语被 8 语写成「中国海关仓/海关市场」也没有任何一条
    规则会出声。标题是列表页与检索结果里读者唯一必读的一行，漏一层＝整层
    承诺对外消失。把「母版标题承载哪几层」固化成逐语 require/forbid，
    是本轮唯一能机检这类偏移的位置（长度、结构、语言纯度都不沾边）。
    """
    items = spec.get("title") if isinstance(spec, dict) else None
    if not isinstance(items, list) or not items:
        return
    zh_fm = parsed.get(master_lang, (None, None))[0] or {}
    zh_title = str(zh_fm.get("title") or "")
    for it in items:
        if not isinstance(it, dict):
            continue
        zha = str(it.get("zh") or "").strip()
        if zha and zha not in zh_title:
            continue
        tid = str(it.get("id") or "").strip() or "<unnamed>"
        req = it.get("require") or {}
        req_all = it.get("require_all") or {}
        forb = it.get("forbid") or {}
        targets = set(k for k in list(req) + list(req_all) + list(forb)
                      if k != "*")
        if "*" in req or "*" in req_all or "*" in forb:
            targets |= set(lg for lg in parsed if lg != master_lang)
        for lg in sorted(targets):
            if lg == master_lang or lg not in parsed:
                continue
            fm = parsed[lg][0] or {}
            title = str(fm.get("title") or "").strip()
            if not title:
                add("S11", "error", "%s/%s" % (lg, slug),
                    "标题为空，无法满足术语 %s" % tid)
                continue
            hay = title
            need = _gloss_pats(req, lg)
            need_all = _gloss_pats(req_all, lg)
            banned = _gloss_pats(forb, lg)
            fsub = _ban_fsub(it)
            if need and not any(_req_hit(p, hay, it, lg) for p in need):
                add("S11", "error", "%s/%s" % (lg, slug),
                    "标题缺少术语 %s：应含「%s」" % (tid, " / ".join(need[:3])))
            miss_all = [p for p in need_all if not _req_hit(p, hay, it, lg)]
            if miss_all:
                add("S11", "error", "%s/%s" % (lg, slug),
                    "标题缺少术语 %s：应同时含 %d 项，缺「%s」"
                    % (tid, len(need_all), " / ".join(miss_all[:3])))
            hit = _ban_any(lg, banned, hay, fsub)
            if hit:
                add("S11", "error", "%s/%s" % (lg, slug),
                    "标题出现反向表述「%s」（术语 %s）" % (" / ".join(hit[:3]), tid))


def _glossary_refs_check(spec, parsed, master_lang, slug, add):
    """S12（v1.75）：参考文献标题术语契约。

    glossary 里可选的 "refs" 数组，每项：
        {"id": "...", "zh": "<母版某条参考文献标题里的锚短语>",
         "slug": "<可选：只在指定篇激活>",
         "require": {"da": ["kinesisk", "GACC"]}, "require_all": {...},
         "forbid": {"fi": ["Tullihallitus"]}, "forbid_re": {"he": ["..."]}}
    锚在该篇 zh 参考文献标题里找不到 → 跳过（共享表跨文章安全）；找到则对
    **同序号**那条译文参考标题判「必须出现 / 不得出现」。`*` 为兜底语种。

    【v2.19】可选 "slug"：同一批文号在不同文章里可能用「描述式标题」或
    「文号简称」两种编排（O5 实测：zh 第一条写「商财发〔2018〕486 号」的
    有 12 篇，其余同文号文章只写「商务部等六部门公告 2018 年第 486 号」，
    译文标题也就没有简称）。锚点相同但编排约定不同，只能按篇限定，
    否则一条契约会误伤 11 篇历史稿；条目的词形仍进共享表，供后续同编排
    文章复用。

    存在的理由：A1 二轮人工通读实证——正文四处「海关总署」都已按契约写成
    「中国海关总署」的说法，同一篇的**第一条参考文献标题**却仍用本国机构名
    （fi Tullihallituksen / da Toldstyrelsen / no Tolletatens / hu Vámhivatal），
    读者在来源行看到的是一个本国机关，归属即错。S08 只扫正文块、S11 只扫
    标题、P43 只扫全篇词形，元数据的这一行此前无人守。O5 再证第二形状：
    19 语文号简称整段缺失、10 语第三条把「财关税」换成描述语，正文与摘要
    全对、机检 0 finding——来源行的机构归属同样需要逐语词形锁。
    """
    items = spec.get("refs") if isinstance(spec, dict) else None
    if not isinstance(items, list) or not items:
        return
    zh_refs = (parsed.get(master_lang, (None, None))[0] or {}).get("references") or []
    zh_titles = [str(r.get("title") or "") for r in zh_refs if isinstance(r, dict)]
    for it in items:
        if not isinstance(it, dict):
            continue
        if not _refs_slug_match(it.get("slug"), slug, parsed):
            continue
        anchor = str(it.get("zh") or "").strip()
        idxs = [i for i, s in enumerate(zh_titles) if anchor and anchor in s]
        if not idxs:
            continue
        tid = str(it.get("id") or anchor)[:40]
        req = it.get("require") or {}
        req_all = it.get("require_all") or {}
        forb = it.get("forbid") or {}
        forb_re = it.get("forbid_re") or {}
        targets = set(k for k in list(req) + list(req_all) + list(forb)
                      + list(forb_re) if k != "*")
        if "*" in req or "*" in req_all or "*" in forb or "*" in forb_re:
            targets |= set(lg for lg in parsed if lg != master_lang)
        for lg in sorted(targets):
            if lg == master_lang or lg not in parsed:
                continue
            refs = (parsed[lg][0] or {}).get("references") or []
            titles = [str(r.get("title") or "") for r in refs
                      if isinstance(r, dict)]
            need = _gloss_pats(req, lg)
            need_all = _gloss_pats(req_all, lg)
            banned = _gloss_pats(forb, lg)
            banned_re = _gloss_pats(forb_re, lg)
            fsub = _ban_fsub(it)
            # A13：逐条判定；旧版把多个锚定题名 join 成一个 hay，
            # 「A 条满足 B 条的要求」也能过。
            for i in idxs:
                if i >= len(titles):
                    add("S12", "error", "%s/%s" % (lg, slug),
                        "参考文献第 %d 条缺失，无法满足契约 %s" % (i + 1, tid))
                    continue
                hay = titles[i]
                if need and not any(_req_hit(p, hay, it, lg) for p in need):
                    add("S12", "error", "%s/%s" % (lg, slug),
                        "参考文献第 %d 条标题缺少术语 %s：应含「%s」"
                        % (i + 1, tid, " / ".join(need[:3])))
                miss_all = [p for p in need_all if not _req_hit(p, hay, it, lg)]
                if miss_all:
                    add("S12", "error", "%s/%s" % (lg, slug),
                        "参考文献第 %d 条标题缺少术语 %s：应同时含「%s」"
                        % (i + 1, tid, " / ".join(miss_all[:3])))
                hit = _ban_any(lg, banned, hay, fsub)
                if hit:
                    add("S12", "error", "%s/%s" % (lg, slug),
                        "参考文献第 %d 条标题出现反向表述「%s」（契约 %s）"
                        % (i + 1, " / ".join(hit[:3]), tid))
                for pat in banned_re:
                    try:
                        m = re.search(pat, hay, re.I)
                    except re.error:
                        add("C01", "error", "%s/%s" % (lg, slug),
                            "术语契约配置错误：%s 的 forbid_re 不可用：%s"
                            % (tid, pat))
                        continue
                    if m:
                        add("S12", "error", "%s/%s" % (lg, slug),
                            "参考文献第 %d 条标题命中禁用写法「%s」（契约 %s）"
                            % (i + 1, m.group(0)[:30], tid))


def _glossary_banned_check(spec, parsed, slug, add):
    """P43（v1.42）：文章级禁用译法。

    glossary 里可选的 "banned" 数组，每项：
        {"id": "...", "lang": "vi", "terms": ["vào sân", "词干*"],
         "match": "substring"（可选，整条退回 v1.93 以前的全子串口径）,
         "note": "<人读的说明，可选>"}
    对该语正文、title、excerpt、references 标题做**全篇**匹配（不分块），
    命中即 error。v1.94 起匹配按 _ban_spec 分档：单字默认整词、短语与带
    `*` 的词干走子串、zh／ja／th 走子串——理由见「禁用形匹配」段的 hy
    «ՉՈՒՆ»⊂«չունի» 自碰事故。
    存在的理由：r5 审读实证 vi 把「进场」写成 vào sân（进场
    院子的字面义）、ta 把「诊断」写成 நோயறிதல்（疾病诊断）、si 写成
    රෝග විනිශ්චය（疾病判别）——三处都是词形合法、语法通顺、其余判据全绿，
    只有「这个概念在本篇只能用哪个词」能拦。v1.44 起共享表也加载 banned
    （单轨制）。【v1.45】域摘除：禁用译法全文章生效、不再按篇钉住——同一
    误译词族（osoba 主体、комерції 电商、 connosco 欧葡）在别的文章出现
    同样要出声（域摘实测：P0 一篇就撞上 21 条 F2/F3 审出的禁用形，全是真
    误译）。r5 复核又补六条 S1 主体误译形（hr/sl/sr/uk 写成自然人、
    ru 写成 структура、sw 写成 chombo），由 U5 真实数据面逐条反证。
    """
    items = spec.get("banned") if isinstance(spec, dict) else None
    if not isinstance(items, list) or not items:
        return
    for it in items:
        if not isinstance(it, dict):
            continue
        lg = str(it.get("lang") or "").strip()
        if lg not in parsed:
            continue
        tid = str(it.get("id") or "").strip() or "<unnamed>"
        terms = it.get("terms")
        if isinstance(terms, str):
            terms = [terms]
        if not isinstance(terms, list):
            continue
        fm, body = parsed[lg]
        fsub = str(it.get("match") or "").strip().lower() == "substring"
        fields = [("title", str(fm.get("title") or "")),
                  ("excerpt", str(fm.get("excerpt") or "")),
                  ("references",
                   " \n".join(str(r.get("title") or "")
                              for r in (fm.get("references") or [])
                              if isinstance(r, dict))),
                  ("正文", body)]
        # A12：登记 zh 锚的条款是「这个词不该用来翻译某个中文概念」，
        # 不是拼写错误。中文母版没写这个概念时本篇不适用；写了则只在
        # 对应块序号上判，避免误伤该词在别处的合法本义。
        anchor = str(it.get("zh") or "").strip()
        if anchor and "zh" in parsed:
            zbody = parsed["zh"][1]
            idxs = [i for i, b in enumerate(_blocks(zbody)) if anchor in b]
            if not idxs:
                continue
            lb = _blocks(body)
            fields = [("正文锚块", "\n".join(lb[i] for i in idxs
                                             if i < len(lb)))]
        for term in terms:
            word = str(term).strip()
            if not word:
                continue
            hits = []
            for fname, fld in fields:
                for pos, end in _ban_hits(lg, word, fld, fsub):
                    a = max(0, pos - 24)
                    b = min(len(fld), end + 24)
                    hits.append("%s: …%s…" % (fname,
                                              fld[a:b].replace("\n", " ")))
            if hits:
                add("P43", "error", "%s/%s" % (lg, slug),
                    "禁用译法「%s」（%s）：%d 处；%s"
                    % (word, tid, len(hits), hits[0]))


def _req_hit(needle, hay, spec=None, lg=None):
    """I05：正向契约的大小写策略。

    默认沿用不敏感口径；条款显式 case_sensitive:true，或「≥8 字母的全大写
    拉丁法定串」（CHIA SEED FROM BOLIVIA 一类）自动切到敏感，避免错大小写
    或小写混写蒙混过关。短缩写（GACC/ISPM）保持旧口径以兼容既有译法。
    """
    spec = spec or {}
    cs = bool(spec.get("case_sensitive"))
    if not cs:
        letters = [c for c in needle if c.isalpha()]
        if (len(letters) >= 8 and all(c.isupper() for c in letters)
                and all(ord(c) < 128 for c in needle if c.isalpha())):
            cs = True
    # A11：条款可显式声明某一语言用「完整词」档（require_match），
    # 避免 roof 被 proof 这类词内子串满足；默认仍是词干子串口径。
    rm = spec.get("require_match") or {}
    mode = rm.get(lg) if isinstance(rm, dict) else rm
    if lg and mode == "word":
        h = hay if cs else hay.casefold()
        n = needle if cs else needle.casefold()
        for m in re.finditer(re.escape(n), h):
            a, b = m.span()
            if ((a == 0 or not _is_wordish(h[a - 1]))
                    and (b >= len(h) or not _is_wordish(h[b]))):
                return True
        return False
    return (needle in hay) if cs else (needle.casefold() in hay.casefold())


def _verbatim_hit(literal, block):
    """A04/I19：法定原文整串逐字保留；只规范化空白与卷曲引号差异。"""
    def norm(s):
        s = (s.replace("\u201c", '"').replace("\u201d", '"')
              .replace("\u00ab", '"').replace("\u00bb", '"')
              .replace("\u2018", "'").replace("\u2019", "'"))
        return re.sub(r"\s+", " ", s).strip()
    return bool(literal) and norm(literal) in norm(block)


def _is_wordish(ch):
    """A11：Python \\w 不含组合附标（Mn/Mc），会把词内片段误判成整词。"""
    if not ch:
        return False
    cat = unicodedata.category(ch)
    return ch.isalnum() or cat.startswith("M") or cat == "Pc" or ch == "_"


def _gloss_pats(d, lg):
    """S08/S09 共用：取某个语言适用的短语（`*` 兜底 + 该语言专属）。"""
    out = []
    for key in ("*", lg):
        v = d.get(key)
        if isinstance(v, str):
            v = [v]
        for x in (v or []):
            s = str(x).strip()
            if s:
                out.append(s)
    return out


def _ban_spec(term, force_sub=False):
    """禁用形 → (mode, needle)。needle 带尾 `*`＝词干子串；含空格＝短语子串；
    其余单字＝整词。返回的 needle 已去掉标记。
    force_sub=True（条款级 "match": "substring"）时整条退回全子串口径。"""
    t = str(term).strip()
    if t.endswith("*"):
        return "sub", t[:-1].strip()
    if force_sub:
        return "sub", t
    if " " in t or u"\u00A0" in t or u"\u2009" in t:
        return "sub", t
    return "word", t


def _ban_hits(lg, term, text, force_sub=False):
    """按该语文字系统取禁用形的全部命中，返回 [(起, 止)]（对 text 做 casefold）。"""
    mode, needle = _ban_spec(term, force_sub)
    if not needle or not text:
        return []
    low = text.casefold()
    nd = needle.casefold()
    out = []
    start = 0
    nlen = len(nd)
    while True:
        p = low.find(nd, start)
        if p < 0:
            return out
        start = p + 1
        e = p + nlen
        if mode == "sub" or lg in _BAN_SPACELESS:
            out.append((p, e))
            continue
        left_ok = p == 0 or not _is_wordish(low[p - 1])
        right_ok = e >= len(low) or not _is_wordish(low[e])
        if left_ok and right_ok:
            out.append((p, e))


def _ban_fsub(spec):
    """条款级退档开关："forbid_match": "substring" ⇒ 本条全部禁用形按子串判。
    给「就是要连词内形一起拦」的条款留口子（v1.94）。"""
    return str(spec.get("forbid_match") or "").strip().lower() == "substring"


def _ban_any(lg, terms, text, force_sub=False):
    """terms 里在该 text 命中的禁用形（保序、去重），供 S08／S09／S11／S12 用。"""
    return [t for t in terms if _ban_hits(lg, t, text, force_sub)]


def _ban_count(lg, term, text, force_sub=False):
    return len(_ban_hits(lg, term, text, force_sub))


def _term_hits(blk, pats):
    """S08 count：require 词形在块内的去重命中位置数。

    I03：旧算法把重叠区间「合并成一个连续区间」并只计 1，导致
    `abcabcabc` 的 5 个不同起点被算成 1，误报 count:true 缺词。
    这里按**起点**去重：同一位置被多个词形命中只算一次，不同起点各算一次
    （既不放过嵌套词形，也不把词干重叠误当多次出现）。
    """
    spans = []
    for p in pats:
        if not p:
            continue
        start = 0
        while True:
            j = blk.find(p, start)
            if j < 0:
                break
            spans.append(j)
            start = j + 1
    return len(set(spans))


def _refs_slug_match(scope, slug, parsed=None):
    """S12（v2.19）：可选 `"slug"` 篇级限定。

    取值可为字符串或列表。单篇 check 传 frontmatter slug（无认领前缀），
    准入预扫传 `<root>/<认领目录>`（如 O5-...），两者都要认；frontmatter
    的 slug 逐语相同，优先用它，目录名再按 `-<slug>` 尾巴兜底。缺省不限篇。
    """
    if not scope:
        return True
    wanted = [scope] if isinstance(scope, str) else [str(x) for x in scope]
    cands = set()
    cur = str(slug or "")
    if cur:
        cands.add(cur)
        cands.add(cur.rsplit("/", 1)[-1])
    for _lg, pair in (parsed or {}).items():
        fm = pair[0] if isinstance(pair, (tuple, list)) and pair else None
        if isinstance(fm, dict):
            s = str(fm.get("slug") or "").strip()
            if s:
                cands.add(s)
    for c in cands:
        for w in wanted:
            if c == w or c.endswith("/" + w) or c.endswith("-" + w):
                return True
    return False


# ------------------------------------------------------------------ 收集器
#
# 六个契约插件（S08/S09/S11/S12/S14/P43）共用同一份判定结果。判据本身是
# 「一份 spec × 一篇全文」的纯函数，按插件各跑一遍等于把 937 条契约 × 48 语
# 扫六次；这里按 PackageView 记忆化一次，各插件只按自己的 RULE 过滤。
#
# 口径与 check_article 逐字一致（否则等价性门会红）：
#   * spec 为空/未加载 → 不产出（C01 由包层报，见 checker）；
#   * 锚语言 = zh 优先，缺 zh 退 master_lang（与 article.py 现值同式）；
#   * 五条判据的调用顺序同旧实现，同一规则的输出顺序因此不变。


def glossary_findings(view):
    """返回 [(rule, severity, loc, detail)]；一次 check 内只算一遍。"""
    cache = getattr(view, "cache", None)
    if cache is not None and "glossary.findings" in cache:
        return cache["glossary.findings"]

    out = []
    ctx = getattr(view, "ctx", None)
    spec = getattr(ctx, "glossary", None) if ctx is not None else None
    if spec:
        def _add(rule, sev, loc, detail):
            out.append((rule, sev, loc, detail))

        explicit = getattr(ctx, "master_lang", None)
        for art in view.articles:
            parsed = art.parsed
            master = (explicit or
                      ("zh" if "zh" in parsed else
                       "en" if "en" in parsed else
                       (sorted(parsed)[0] if parsed else "zh")))
            anchor = "zh" if "zh" in parsed else master
            slug = art.slug
            _glossary_check(spec, parsed, anchor, slug, _add)
            _glossary_excerpt_check(spec, parsed, anchor, slug, _add)
            _glossary_title_check(spec, parsed, anchor, slug, _add)
            _glossary_refs_check(spec, parsed, anchor, slug, _add)
            _glossary_banned_check(spec, parsed, slug, _add)

    if cache is not None:
        cache["glossary.findings"] = out
    return out
