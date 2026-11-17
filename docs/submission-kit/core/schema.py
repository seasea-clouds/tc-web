# -*- coding: utf-8 -*-
"""术语库 schema：唯一权威的存储定义、前向迁移与结构校验。

数据模型（三表 + 两族附表，单一真值，无原文投影）
------------------------------------------------
`terms`    一条契约一行：`id`（`<section>:<契约id>`）、`section`、
           `options_json`（词形以外的全部配置）、`note`、`revision`、`ord`。
           契约的「正文」不再另存 JSON 副本——载荷由 `core.db.payload_of()`
           从本表 + anchors + forms 重建，重建结果就是判据读到的 spec。
`anchors`  中文锚点，一条契约一个（`UNIQUE(term_id, zh_anchor)`）。
           **锚点唯一来源**，terms 不再冗余 `zh` 列。
`forms`    词形：`(term_id, assertion, lang, value, match_mode, scalar, ord)`，
           `UNIQUE(term_id, assertion, lang, value, match_mode)` 让重复词形
           **入库即拦**。
`lexicons` 受控词表（语向级闭类事实与放行集），与契约分开存。
`locales` / `plugin_meta` / `meta` 为运行期投影与版本元数据。

历史包袱（`payload_json` 原文投影、`orig_id`、`license_json`、
`count_mode`、`case_sensitive`、`zh` 冗余列）已在 schema 4 删除；
`migrate()` 只做前向升级，不再支持 v2 的 `contracts` 表。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
from __future__ import annotations

import json

SCHEMA_VERSION = 6

# 与 db.MATCH_MODES 同值；此处独立定义避免 db → schema 循环导入
_MATCH_MODES = ("literal", "word", "substring", "regex")
_FORM_ASSERTIONS = ("require", "require_all", "forbid", "verbatim")

# lexicons 的词表域与作用域（schema 级枚举，db 与 CLI 共用同一份）
# 2026-11-15：`latin-taxon` 替代「按篇放行」——拉丁学名是词类事实，不是
# 某篇特例；scope 只保留 global，按篇放行已撤除（见 plugins/_lang.py 头注）。
LEXICON_IDS = ("country", "neighbor", "latin-required", "latin-ascii",
               "latin-allow", "latin-taxon", "term-localization",
               "term-zh", "concept-family", "forbidden-currency",
               # 2026-11-15：判据载荷（词形/正则/模板）从 core.consts 迁出。
               #   term-variant  语向 → 错形/正形/说明（P64 同篇异形并存）
               #   phrase-block  用途 → 语向 → 词形/正则/模板（R05/ST08/P49/P59/承诺）
               "term-variant", "phrase-block")
LEXICON_SCOPES = ("global",)

DDL = """
PRAGMA foreign_keys = ON;
CREATE TABLE meta(
  policy_version   INTEGER PRIMARY KEY,
  schema_version   INTEGER NOT NULL,
  build_id         TEXT NOT NULL DEFAULT '',
  applied_cs       TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE locales(
  lang    TEXT PRIMARY KEY,
  dir     TEXT,
  name    TEXT,
  script  TEXT,
  native  TEXT
);
CREATE TABLE terms(
  id           TEXT PRIMARY KEY,
  section      TEXT NOT NULL,
  options_json TEXT NOT NULL DEFAULT '{}',
  note         TEXT,
  revision     INTEGER NOT NULL DEFAULT 1,
  ord          INTEGER NOT NULL
);
CREATE TABLE anchors(
  id        INTEGER PRIMARY KEY,
  term_id   TEXT NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  zh_anchor TEXT NOT NULL,
  ord       INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE forms(
  id           INTEGER PRIMARY KEY,
  term_id      TEXT NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  assertion    TEXT NOT NULL,
  lang         TEXT NOT NULL,
  value        TEXT NOT NULL,
  match_mode   TEXT NOT NULL DEFAULT 'literal',
  scalar       INTEGER NOT NULL DEFAULT 0,
  ord          INTEGER NOT NULL
);
CREATE TABLE lexicons(
  id        TEXT NOT NULL,
  scope     TEXT NOT NULL DEFAULT 'global',
  key       TEXT NOT NULL DEFAULT '',
  value     TEXT NOT NULL,
  target    TEXT NOT NULL DEFAULT '',
  meta_json TEXT NOT NULL DEFAULT '{}',
  ord       INTEGER NOT NULL,
  PRIMARY KEY (id, scope, key, value)
);
CREATE TABLE plugin_meta(
  plugin_id     TEXT PRIMARY KEY,
  version       TEXT NOT NULL,
  phase         INTEGER NOT NULL,
  applies_to    TEXT NOT NULL,
  rules_json    TEXT NOT NULL,
  rationale_sha TEXT NOT NULL,
  source_sha    TEXT NOT NULL,
  enabled       INTEGER NOT NULL DEFAULT 1
);
-- 存量欠账台账（schema v5）。判据只由「语向 + 词类 + 结构」决定，任何
-- 判据源码里都不许出现篇目 slug；某篇因交付在前、判据在后而暂时不合规，
-- 记在这里：rule=哪条判据，slug=哪篇，detail=具体对象（空=整篇），
-- status=open 欠账 / closed 已清。改稿清账后置 closed，不再删行。
CREATE TABLE baseline(
  rule    TEXT NOT NULL,
  slug    TEXT NOT NULL,
  detail  TEXT NOT NULL DEFAULT '',
  reason  TEXT NOT NULL DEFAULT '',
  status  TEXT NOT NULL DEFAULT 'open',
  ord     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (rule, slug, detail)
);
CREATE INDEX ix_terms_section ON terms(section, ord);
CREATE INDEX ix_anchors_zh    ON anchors(zh_anchor);
-- 只按语向建索引：单语向约 250 行，词形过滤走该语向内的顺序扫（实测 ~1ms），
-- 比 (lang,value) 复合索引省 ~0.3MB。
CREATE INDEX ix_forms_lang    ON forms(lang);
CREATE UNIQUE INDEX ux_forms
  ON forms(term_id, assertion, lang, value, match_mode);
CREATE UNIQUE INDEX ux_anchors ON anchors(term_id, zh_anchor);
CREATE INDEX ix_lexicons_id ON lexicons(id, scope, ord);
"""

# v4 删除的列：所有配置在迁移时抽进 options_json，锚点留在 anchors
_DROP_COLUMNS = ("payload_json", "orig_id", "license_json",
                 "case_sensitive", "count_mode", "scope", "zh")
_BASE_KEYS = {"id", "zh", "note"}
_FORM_KEYS = {"require", "require_all", "forbid", "forbid_re", "verbatim",
              "terms"}


def _columns(conn, table):
    return {r[1] for r in conn.execute("PRAGMA table_info(%s)" % table)}


def _tables(conn):
    return {r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'")}


BASELINE_DDL = """
CREATE TABLE IF NOT EXISTS baseline(
  rule    TEXT NOT NULL,
  slug    TEXT NOT NULL,
  detail  TEXT NOT NULL DEFAULT '',
  reason  TEXT NOT NULL DEFAULT '',
  status  TEXT NOT NULL DEFAULT 'open',
  ord     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (rule, slug, detail)
);
"""


def is_current(conn):
    return (_columns(conn, "terms") == {"id", "section", "options_json", "note",
                                        "revision", "ord"}
            and _columns(conn, "anchors") == {"id", "term_id", "zh_anchor",
                                              "ord"}
            and "lexicons" in _tables(conn)
            and "baseline" in _tables(conn))


def _js(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))


def migrate(conn, report=None):
    """把当前库升到 schema 4（幂等）。调用方负责事务边界。

    v3 → v4：把 `payload_json` 里词形以外的配置抽进 `options_json`，然后删掉
    冗余列（原文投影、orig_id、license、count/case_sensitive、scope、zh）。
    词形与锚点原样保留，不重写、不丢行。
    """
    rep = report if report is not None else {}
    cols = _columns(conn, "terms")
    acols = _columns(conn, "anchors")
    if "block_scope" in acols:
        conn.execute("ALTER TABLE anchors DROP COLUMN block_scope")
        rep["block_scope_dropped"] = True
    if "payload_json" not in cols:
        if "contracts" in _tables(conn):
            raise RuntimeError(
                "库里是 v2 的 contracts 表：该格式已停止支持，请换用随包分发的 "
                "data/glossary.db（schema %d）" % SCHEMA_VERSION)
        conn.executescript(BASELINE_DDL)
        conn.execute("UPDATE meta SET schema_version=?", (SCHEMA_VERSION,))
        rep["state"] = "current"
        return rep

    moved = 0
    for row in conn.execute(
            "SELECT id, payload_json FROM terms").fetchall():
        try:
            payload = json.loads(row[1] or "{}")
        except ValueError:
            payload = {}
        opts = {k: v for k, v in payload.items()
                if k not in _BASE_KEYS and k not in _FORM_KEYS}
        conn.execute("UPDATE terms SET options_json=? WHERE id=?",
                     (_js(opts), row[0]))
        moved += 1

    for col in _DROP_COLUMNS:
        if col in cols:
            conn.execute("ALTER TABLE terms DROP COLUMN %s" % col)
    conn.execute("UPDATE meta SET schema_version=?", (SCHEMA_VERSION,))
    rep.update({"state": "migrated", "from": 3, "terms": moved,
                "options_rewritten": moved,
                "columns_dropped": [c for c in _DROP_COLUMNS
                                    if c in cols]})
    return rep


# ------------------------------------------------------------------ 校验

def verify(conn):
    """结构校验：单一真值下不存在「双源漂移」，只查形态与引用完整性。

    返回 {"errors": [...], "warnings": [...], "stats": {}}；doctor 每次跑。
    """
    errors, warnings = [], []
    stats = {"terms": 0, "anchors": 0, "forms": 0, "langs": 0, "lexicons": 0,
             "baseline": 0}

    if "contracts" in _tables(conn):
        errors.append("E5 库里仍有 v2 contracts 表：该格式已停止支持")
        return {"errors": errors, "warnings": warnings, "stats": stats}
    if not is_current(conn):
        errors.append("E5 terms 表结构不是 schema %d（列：%s）"
                      % (SCHEMA_VERSION, ", ".join(sorted(
                          _columns(conn, "terms")))))
        return {"errors": errors, "warnings": warnings, "stats": stats}

    meta = conn.execute("SELECT schema_version FROM meta").fetchone()
    if not meta or meta[0] != SCHEMA_VERSION:
        errors.append("E5 meta.schema_version=%s != %s"
                      % ((meta[0] if meta else None), SCHEMA_VERSION))

    langs = {r[0] for r in conn.execute("SELECT lang FROM locales")}
    anchors = {}
    for tid, anchor in conn.execute(
            "SELECT term_id, zh_anchor FROM anchors ORDER BY term_id, ord"):
        anchors.setdefault(tid, []).append(anchor)
    forms = {}
    for f in conn.execute(
            "SELECT term_id, assertion, lang, value, match_mode FROM forms "
            "ORDER BY term_id, ord"):
        forms.setdefault(f[0], []).append(tuple(f[1:]))

    rows = conn.execute(
        "SELECT id, section, options_json, note, revision, ord FROM terms "
        "ORDER BY section, ord").fetchall()
    stats["terms"] = len(rows)
    stats["anchors"] = conn.execute("SELECT count(*) FROM anchors").fetchone()[0]
    stats["forms"] = conn.execute("SELECT count(*) FROM forms").fetchone()[0]
    stats["langs"] = conn.execute(
        "SELECT count(DISTINCT lang) FROM forms").fetchone()[0]
    stats["lexicons"] = conn.execute("SELECT count(*) FROM lexicons").fetchone()[0]

    for tid, section, opts_json, _note, _rev, _ord in rows:
        if ":" not in tid or tid.split(":", 1)[0] != section:
            errors.append("E5 契约 id 与 section 不一致：%s / %s"
                          % (tid, section))
        try:
            opts = json.loads(opts_json or "{}")
        except ValueError:
            errors.append("E5 options_json 非 JSON：%s" % tid)
            continue
        if not isinstance(opts, dict):
            errors.append("E5 options_json 非对象：%s" % tid)
            continue
        scope = opts.get("scope", "block")
        if not isinstance(scope, str) or not scope.strip() or len(scope) > 32:
            errors.append("E5 scope 非法：%s -> %r" % (tid, str(scope)[:40]))
        got_a = anchors.get(tid, [])
        for a in got_a:
            if not a.strip():
                errors.append("E5 空锚点：%s" % tid)
        got_f = forms.get(tid, [])
        if not got_a and not got_f and section != "writing":
            errors.append("E5 空契约（无锚点、无词形）：%s" % tid)
        for assertion, lang, value, mode in got_f:
            if assertion not in _FORM_ASSERTIONS:
                errors.append("E5 非法断言 %r：%s" % (assertion, tid))
            if mode not in _MATCH_MODES:
                errors.append("E5 非法 match_mode %r：%s" % (mode, tid))
            if lang != "*" and lang not in langs:
                errors.append("E5 未注册语向 %r：%s" % (lang, tid))
            if not str(value):
                errors.append("E5 空词形：%s" % tid)

    orphan_f = conn.execute(
        "SELECT count(*) FROM forms f LEFT JOIN terms t ON f.term_id=t.id "
        "WHERE t.id IS NULL").fetchone()[0]
    orphan_a = conn.execute(
        "SELECT count(*) FROM anchors a LEFT JOIN terms t ON a.term_id=t.id "
        "WHERE t.id IS NULL").fetchone()[0]
    if orphan_f or orphan_a:
        errors.append("E5 孤儿行：forms=%d anchors=%d" % (orphan_f, orphan_a))

    try:
        got = {r[0] for r in conn.execute("SELECT DISTINCT id FROM lexicons")}
        missing = [i for i in LEXICON_IDS if i not in got]
        if missing:
            errors.append("E5 受控词表缺类：%s" % ", ".join(missing))
        empty = conn.execute(
            "SELECT count(*) FROM lexicons WHERE value=''").fetchone()[0]
        if empty:
            errors.append("E5 受控词表空词形行：%d" % empty)
    except Exception as exc:                       # pragma: no cover
        errors.append("E5 词表校验失败：%s" % exc)

    # 存量欠账台账：判据代码里不再出现 slug，欠账只在这里可见。
    try:
        bad = [r[0] for r in conn.execute(
            "SELECT DISTINCT status FROM baseline")
            if r[0] not in ("open", "closed")]
        if bad:
            errors.append("E5 存量台账 status 非法：%s" % ", ".join(bad))
        n_empty = conn.execute(
            "SELECT COUNT(*) FROM baseline WHERE rule='' OR slug=''").fetchone()[0]
        if n_empty:
            errors.append("E5 存量台账有空 rule/slug 行：%d" % n_empty)
        stats["baseline"] = conn.execute(
            "SELECT COUNT(*) FROM baseline").fetchone()[0]
    except sqlite3.OperationalError:
        errors.append("E5 缺 baseline 表：运行 submit.py glossary migrate")

    # term-zh（中文概念 → 各语标准译法）必须是完整矩阵：每个概念都要覆盖
    # 全部语向，否则译法统一到一半比不统一更糟（同一概念有的语有标准、
    # 有的没有，判据/人工都会误以为全覆盖）。
    try:
        # 译向是「中文概念 → 其余语向」，母版 zh 不计入（它就是 key 本身）。
        total_langs = conn.execute(
            "SELECT COUNT(*) FROM locales WHERE lang != 'zh'").fetchone()[0]
        short = [(r[0], r[1]) for r in conn.execute(
            "SELECT key, COUNT(DISTINCT value) n FROM lexicons "
            "WHERE id='term-zh' GROUP BY key HAVING n < ?", (total_langs,))]
        for k, n in short:
            warnings.append("W4 term-zh 概念 %r 只覆盖 %d/%d 语向"
                            % (k, n, total_langs))
        stats["term_zh"] = conn.execute(
            "SELECT COUNT(*) FROM lexicons WHERE id='term-zh'").fetchone()[0]
    except sqlite3.OperationalError:
        pass

    cross = conn.execute(
        "SELECT assertion, lang, value, count(DISTINCT term_id) n FROM forms "
        "GROUP BY 1,2,3 HAVING n > 1 ORDER BY n DESC LIMIT 20").fetchall()
    for assertion, lang, value, n in cross:
        warnings.append("W3 同形跨术语（%d 个术语共用 %s/%s/%r），"
                        "确认是设计而非重复登记"
                        % (n, assertion, lang, value[:30]))
    return {"errors": errors, "warnings": warnings, "stats": stats}
