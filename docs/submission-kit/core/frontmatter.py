# -*- coding: utf-8 -*-
"""core/frontmatter.py — frontmatter 解析。

frontmatter/YAML 校验、行尾与日期校验。纯解析，不含判据。

PyYAML 为**必装**依赖（见 core/deps.py）：缺失时本模块直接返回错误串，
不做降级解析——降级会让格式坏的稿子在本地全绿。

M4（2026-11-12）后 core 只提供事实：本模块不得 import 任何判据实现，
也不得反向依赖 core.checker（装载顺序上它在更下层）。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。

import re

try:
    import yaml as _pyyaml
except ImportError:
    _pyyaml = None


def _fm_scalar(v):
    """PyYAML safe_load 会把裸日期解析成 datetime.date、裸数字解析成 int。
    下游字段校验一律按字符串处理，这里统一归一（A09/I02）。"""
    if v is None:
        return ""
    if isinstance(v, str):
        return v
    if isinstance(v, bool):
        return "true" if v else "false"
    if hasattr(v, "isoformat"):
        return v.isoformat()
    if isinstance(v, (int, float)):
        return str(v)
    return str(v)


def parse_frontmatter(src):
    """返回 (meta, body, error)。字段来源与语法校验统一（A09/I02）。

    装了 PyYAML 时以 safe_load 的结果为唯一字段来源（不再解析后丢弃）；
    没有 PyYAML 时走等价的手写子集：顶层键可在 references 之后出现，
    引号与行尾注释按 YAML 语义处理。两种环境下同一样例结论一致。
    """
    if not src.startswith("---"):
        return {}, src, "文件不以 frontmatter 开头"
    m = re.match(r"^---[ \t]*\r?\n(.*?)\r?\n---[ \t]*\r?\n?", src, re.S)
    if not m:
        return {}, src, "frontmatter 未正确闭合"
    raw, body = m.group(1), src[m.end():]
    if _pyyaml is not None:
        try:
            data = _pyyaml.safe_load(raw)
        except Exception as exc:
            head = str(exc).strip().splitlines()
            return {}, body, "frontmatter YAML 解析失败: %s" % (
                head[0][:140] if head else "未知错误")
        if data is None:
            data = {}
        if not isinstance(data, dict):
            return {}, body, "frontmatter 顶层必须是键值映射"
        meta = {}
        for k, v in data.items():
            if isinstance(v, (list, dict)):
                continue
            meta[str(k)] = _fm_scalar(v)
        if "references" in data:
            refs = []
            rv = data.get("references") or []
            if not isinstance(rv, list):
                return {}, body, "references 必须是列表"
            for r in rv:
                if isinstance(r, dict):
                    refs.append({str(k): _fm_scalar(v) for k, v in r.items()})
                else:
                    refs.append({"title": _fm_scalar(r)})
            meta["references"] = refs
        return meta, body, None
    # ---- 无 PyYAML：必装依赖缺失 → 硬报错，不做降级解析。
    # 历史教训（v1.18）：降级解析会把「PyYAML 都解析不了的稿子」放行，
    # 本地全绿、站方 gray-matter 报错；而且解析结果与装了 PyYAML 的环境
    # 不完全同构（裸 ': '、引号转义各有偏差）。缺依赖一律显性报错。
    return {}, body, ("PyYAML 未安装（必装依赖）：执行 \"%s\" -m pip install "
                      "pyyaml 后重跑" % __import__("sys").executable)


def extract_fm_raw(src):
    """提取 frontmatter 原始 YAML 文本（--- 之间的内容）；无则返回 None。"""
    m = re.match(r"^---[ \t]*\r?\n(.*?)\r?\n---[ \t]*\r?\n?", src, re.S)
    return m.group(1) if m else None


def yaml_check(raw):
    """F09（v1.15）：frontmatter 必须能被 YAML 解析。
    有 PyYAML → safe_load 权威校验；没有 → 内置增强校验（覆盖会让
    gray-matter / js-yaml 抛异常的常见致命语法）。返回错误串或 None。"""
    if _pyyaml is not None:
        try:
            _pyyaml.safe_load(raw)
            return None
        except Exception as e:
            msg = str(e).strip().splitlines()
            head = msg[0][:120] if msg else "YAML 解析失败"
            # v1.18：附内置子集校验定位到的具体病因（裸 ': ' / 未闭合引号 / tab）。
            # PyYAML 的原始消息（"mapping values are not allowed here"）不带
            # 可操作信息；裸值含 ': ' 是最高频根因（excerpt 规范化引入枚举式
            # " Vier lae: ..." 时曾一次性击中 42 个语言）。
            hint = _yaml_subset_check(raw)
            if hint:
                return "PyYAML: %s；%s" % (head, hint)
            return "PyYAML: " + head
    return ("PyYAML 未安装（必装依赖）：执行 \"%s\" -m pip install pyyaml "
            "后重跑；缺依赖时不得用降级校验判定 frontmatter 合法性"
            % __import__("sys").executable)


def line_ending_issues(data):
    """S07（v1.18）：文本文件行尾 / 编码卫生。返回问题列表（空 = 干净）。

    CRLF 会让 _blocks() 按 "\\n\\n" 的分块失效——整篇正文粘成一个块，
    P21/P22/P23/P27 对比基准时全线误报（F1 实测一次行尾污染产出 168 个
    假 error，根因与内容完全无关）；UTF-8 BOM 会让 frontmatter 的起始
    判定（src.startswith("---")）偏移，诱发 F01 假错。
    流水线应在打包前把 mdx / json 规范化为 LF；本规则在检查层兜底。
    """
    issues = []
    if data.startswith(b"\xef\xbb\xbf"):
        issues.append("带头 UTF-8 BOM")
    crlf = data.count(b"\r\n")
    cr = data.count(b"\r") - crlf
    if crlf:
        issues.append("CRLF 行尾 %d 处" % crlf)
    if cr:
        issues.append("单独 CR 行尾 %d 处" % cr)
    return issues


def _yaml_subset_check(raw):
    """无 PyYAML 时的内置校验：tab 缩进 / 文档分隔符 / 键值结构 /
    未闭合引号与流式容器 / 裸 ': '。A06：空值不能再被当成「引号未闭合」。"""
    for i, line in enumerate(raw.splitlines(), 1):
        indent = line[:len(line) - len(line.lstrip())]
        if "\t" in indent:
            return "第 %d 行: YAML 不允许 tab 缩进" % i
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        if s in ("---", "..."):
            return "第 %d 行: frontmatter 内出现文档分隔符 %s" % (i, s)
        if s.startswith("- ") or s == "-":
            payload = s[1:].strip()
            km = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)\s*:(\s|$)(.*)$", payload)
            val = km.group(3) if km else payload
        else:
            km = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)\s*:(\s|$)(.*)$", s)
            if not km:
                return "第 %d 行: 无法解析为 YAML 键值行: %s" % (i, s[:60])
            val = km.group(3)
        q = val.strip()
        if q.startswith("[") and not q.endswith("]"):
            return "第 %d 行: 流式序列未闭合: %s" % (i, s[:60])
        if q.startswith("{") and not q.endswith("}"):
            return "第 %d 行: 流式映射未闭合: %s" % (i, s[:60])
        if q and q[0] in ('"', "'"):
            if len(q) < 2 or q[-1] != q[0]:
                return "第 %d 行: 引号未闭合: %s" % (i, s[:60])
        elif re.search(r":\s", q):
            return "第 %d 行: 值内含未加引号的 ': '，YAML 无法解析（请给值加引号）: %s" % (i, s[:60])
    return None
