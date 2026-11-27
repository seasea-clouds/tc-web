# -*- coding: utf-8 -*-
"""检查器策略库（SQLite）。

唯一数据权威。工具包随包分发 data/glossary.db，任何术语/契约的增删改查
都必须经 submit.py 的 glossary 子命令走这里；core.checker 只读 PolicyView。

存储模型（schema 4）
  * terms 只存 id / section / options_json / note / revision / ord；
    锚点在 anchors、词形在 forms、语向级词表在 lexicons。
  * 契约载荷由 payload_of() 从三表**重建**，不另存 JSON 副本——库里不存在
    「原文投影」与「结构化列」两份可能互相漂移的数据。
  * 单次调用由 load_policy() 一次性载入不可变 PolicyView，避免逐块 SQL N+1。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
from __future__ import annotations

import hashlib
import json
import os
import re
import sqlite3
from collections import namedtuple

from core import schema as _schema

SCHEMA_VERSION = _schema.SCHEMA_VERSION
INITIAL_POLICY_VERSION = 3           # 策略版本不得低于此值
# writing（2026-11-10 README 全量回流）：跨篇通用的「写作纪律」契约段。
# 与 banned 的区别：banned 是「某语某个词译错了」，必须绑具体语向；writing 是
# 「任何篇都不该出现的写法」，按契约声明的 langs 射程生效。词表唯一来源落在
# 这里（DB 契约），判据只读不硬编码，后续补充词形只需 glossary add。
SECTIONS = ("body", "banned", "writing", "excerpt", "title", "refs")
MATCH_MODES = ("literal", "word", "substring", "regex")
_BASE_KEYS = {"id", "zh", "note"}
_FORM_KEYS = {"require", "require_all", "forbid", "forbid_re", "verbatim",
              "terms"}

# 原 JSON 段名 -> section
SEG2SEC = {"terms": "body", "banned": "banned", "writing": "writing",
           "excerpt": "excerpt", "title": "title", "refs": "refs"}
SEC2SEG = {v: k for k, v in SEG2SEC.items()}


class PolicyError(Exception):
    """库/插件/准入故障 → C01，退出码 2。"""


class ConflictError(PolicyError):
    """并发冲突或 changeset 冲突 → 退出码 3。"""


def connect(db_path, readonly=False):
    """WAL + busy_timeout；只读模式用 URI 打开，绝不隐式建库。

    损坏/非 SQLite 文件统一转 PolicyError，避免未捕获异常把 --json 契约打碎。

    2026-11-14：补一道空路径防御。`sqlite3.connect(None)` 会返回**匿名内存库**
    并静默成功，后续任何 PRAGMA 都不报错——配置丢了 db_path 时，判据会在
    空库上零命中，check 反而判绿。宁可在这里明确报错。
    """
    if not db_path:
        raise PolicyError("策略库路径为空：拒绝隐式建库（检查 --db 或 DB_PATH 配置）")
    try:
        if readonly:
            if not os.path.isfile(db_path):
                raise PolicyError("策略库不存在：%s" % db_path)
            uri = ("file:%s?mode=ro" %
                   db_path.replace("?", "%3f").replace("#", "%23"))
            conn = sqlite3.connect(uri, uri=True, timeout=15)
        else:
            conn = sqlite3.connect(db_path, timeout=15)
            conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=15000")
        conn.execute("PRAGMA foreign_keys=ON")
        conn.execute("PRAGMA synchronous=FULL")
        conn.row_factory = sqlite3.Row
        return conn
    except sqlite3.Error as exc:
        raise PolicyError("策略库连接失败（%s）：%s" % (db_path, exc))


def _js(obj):
    """保持键序、保持 Unicode 原字符（正则不得变成转义串）。"""
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))



def _derive(section, payload):
    """把一条契约拆成 (options, forms)。

    options 收纳「词形以外、锚点以外」的全部配置——scope / count /
    case_sensitive / only_slug / slug / match / lang / rule / langs / level /
    patterns / legacy / min / max / forbid_licensed_by / require_match /
    forbid_match——保持原键名与原类型。forms 是词形的结构化行。
    两者加上 anchors 就是契约的全部信息，不再另存 JSON 副本。
    """
    form_rows = []
    n = 0

    def add_form(assertion, lang, val, mode="literal", scalar=0):
        nonlocal n
        form_rows.append((assertion, str(lang), str(val), mode, scalar, n))
        n += 1

    options = {k: v for k, v in payload.items()
               if k not in _BASE_KEYS and k not in _FORM_KEYS}

    for key, assertion, mode in (
            ("require", "require", "literal"),
            ("require_all", "require_all", "literal"),
            ("forbid", "forbid", "literal"),
            ("forbid_re", "forbid", "regex")):
        d = payload.get(key)
        if not isinstance(d, dict):
            continue
        for lg, vals in d.items():
            if isinstance(vals, str):
                add_form(assertion, lg, vals, mode, 1)
            else:
                for v in (vals or []):
                    add_form(assertion, lg, v, mode, 0)

    if isinstance(payload.get("verbatim"), str):
        add_form("verbatim", "*", payload["verbatim"], "literal", 1)

    if section == "banned":
        terms = payload.get("terms")
        lg = payload.get("lang") or "*"
        if isinstance(terms, str):
            add_form("forbid", lg, terms, "literal", 1)
        else:
            for v in (terms or []):
                add_form("forbid", lg, v, "literal", 0)

    # match_mode 提升：require_match / forbid_match 指定的语言改用对应档位
    for key, target in (("require_match", ("require", "require_all")),
                        ("forbid_match", ("forbid",))):
        spec = payload.get(key)
        if not isinstance(spec, dict):
            continue
        for lg, mode in spec.items():
            if mode not in MATCH_MODES:
                continue
            form_rows = [
                (a, l, v, mode if l == lg and a in target else m, s, o)
                for (a, l, v, m, s, o) in form_rows]
    return options, form_rows


def payload_of(term_id, section, options_json, note, anchors, forms):
    """由 terms 行 + anchors + forms **重建**契约载荷（判据 spec 的唯一来源）。

    与 _derive 互为逆运算；`forbid: {}` 这类空容器在结构里本就不产生行，
    重建后自然消失（语义等价：`t.get("forbid") or {}`）。
    """
    payload = {"id": term_id.split(":", 1)[1]}
    if anchors:
        payload["zh"] = anchors[0]
    if note is not None:
        payload["note"] = note
    payload.update(json.loads(options_json or "{}"))

    grouped = {}
    for assertion, lang, value, mode, scalar in forms:
        if assertion == "verbatim":
            payload["verbatim"] = value
            continue
        if assertion == "require":
            key = "require"
        elif assertion == "require_all":
            key = "require_all"
        elif assertion == "forbid":
            if mode == "regex":
                key = "forbid_re"
            elif section == "banned":
                key = "terms"
            else:
                key = "forbid"
        else:
            key = assertion
        bucket = grouped.setdefault(key, {})
        cur = bucket.get(lang)
        if scalar:
            bucket[lang] = value
        elif isinstance(cur, list):
            cur.append(value)
        elif cur is None:
            bucket[lang] = [value]
        else:
            bucket[lang] = [cur, value]

    for key, per_lang in grouped.items():
        if key == "terms" and len(per_lang) == 1:
            payload[key] = next(iter(per_lang.values()))
        else:
            payload[key] = per_lang
    return payload


PolicyView = namedtuple(
    "PolicyView",
    "policy_version schema_version build_id applied_cs spec contracts forms "
    "locales lexicons db_path")
# 说明：PolicyView 是 tuple 子类，字段在载入后不再修改；spec 由调用方 deepcopy
# 后交给 engine 归一化，engine 不持有 DB 连接。


def load_policy(db_path, readonly=True):
    """一次成批载入全部策略，构造不可变 PolicyView。"""
    conn = connect(db_path, readonly=readonly)
    try:
        conn.execute("BEGIN")
        m = conn.execute("SELECT * FROM meta").fetchone()
        if m is None:
            raise PolicyError("meta 表为空，策略库不可用")
        if m["schema_version"] != SCHEMA_VERSION:
            raise PolicyError("schema_version %s != %s，请用 submit.py doctor 检查"
                              % (m["schema_version"], SCHEMA_VERSION))
        terms = conn.execute(
            "SELECT id, section, options_json, note, revision "
            "FROM terms ORDER BY "
            "CASE section WHEN 'body' THEN 0 WHEN 'banned' THEN 1 "
            "WHEN 'writing' THEN 2 WHEN 'excerpt' THEN 3 WHEN 'title' THEN 4 "
            "ELSE 5 END, ord").fetchall()
        anchors = {}
        for r in conn.execute(
                "SELECT term_id, zh_anchor FROM anchors ORDER BY term_id, ord"):
            anchors.setdefault(r["term_id"], []).append(r["zh_anchor"])
        forms = [dict(r) for r in conn.execute(
            "SELECT term_id,assertion,lang,value,match_mode,scalar,ord "
            "FROM forms ORDER BY term_id, ord").fetchall()]
        forms_by_term = {}
        for f in forms:
            forms_by_term.setdefault(f["term_id"], []).append(
                (f["assertion"], f["lang"], f["value"], f["match_mode"],
                 f["scalar"]))
        locales = {r["lang"]: dict(r) for r in conn.execute(
            "SELECT lang FROM locales").fetchall()}
        try:
            lx_rows = [dict(r) for r in conn.execute(
                "SELECT id,scope,key,value,target,meta_json,ord FROM lexicons "
                "ORDER BY id, ord, key, value").fetchall()]
        except sqlite3.OperationalError:
            raise PolicyError(
                "策略库缺 lexicons 表：运行 submit.py glossary migrate 后重试")
        lexicons = {}
        for r in lx_rows:
            lexicons.setdefault(r["id"], []).append(r)

        spec = {"version": str(m["policy_version"]),
                "terms": [], "banned": [], "writing": [], "excerpt": [],
                "title": [], "refs": []}
        contracts = []
        for t in terms:
            got_a = anchors.get(t["id"], [])
            payload = payload_of(t["id"], t["section"], t["options_json"],
                                 t["note"], got_a,
                                 forms_by_term.get(t["id"], []))
            opts = json.loads(t["options_json"] or "{}")
            contracts.append({
                "id": t["id"], "orig_id": t["id"].split(":", 1)[1],
                "section": t["section"],
                "zh": got_a[0] if got_a else None,
                "zh_anchor": got_a[0] if got_a else None,
                "scope": str(opts.get("scope") or "block"),
                "count": 1 if opts.get("count") else 0,
                "note": t["note"], "revision": t["revision"],
                "payload": payload})
            spec[SEC2SEG[t["section"]]].append(payload)
        conn.commit()
        return PolicyView(
            policy_version=m["policy_version"],
            schema_version=m["schema_version"], build_id=m["build_id"],
            applied_cs=json.loads(m["applied_cs"] or "[]"),
            spec=spec, contracts=contracts, forms=forms, locales=locales,
            lexicons=lexicons, db_path=os.path.abspath(db_path))
    finally:
        conn.close()


def policy_spec(pv):
    """返回可供 glossary_loader._normalize_glossary 消费的 spec 深拷贝。"""
    return json.loads(_js(pv.spec))


from functools import lru_cache                     # noqa: E402


@lru_cache(maxsize=8)
def _cached_policy(db_path, mtime_ns, size):
    """同进程多包只读一次；文件 mtime/size 变化即失效（下一次调用生效）。"""
    return load_policy(db_path)


def current_policy(db_path=None, kit_dir=None):
    """按 (mtime_ns, size) 缓存的 PolicyView 取用入口。"""
    if db_path is None:
        db_path = os.path.join(kit_dir or os.getcwd(), "data", "glossary.db")
    st = os.stat(db_path)
    return _cached_policy(os.path.abspath(db_path), st.st_mtime_ns, st.st_size)


# ---------------------------------------------------------------- 写入

def _bump(conn):
    conn.execute("UPDATE meta SET policy_version = policy_version + 1")


LEXICON_IDS = _schema.LEXICON_IDS
LEXICON_SCOPES = _schema.LEXICON_SCOPES


def lexicon_write(db_path, action, lid, scope="global", key="", value="",
                  target="", meta=None, db_label=None):
    """受控词表写入（`lexicons` 表）：add / delete / clear。

    与契约写入分离：词表行不是术语契约，没有锚点、没有 revision，
    改一行就 bump 一次 policy_version，便于 `glossary diff` 追溯。
    返回 {"id","scope","key","written","removed","policy_version"}。
    """
    if lid not in LEXICON_IDS:
        raise PolicyError("词表 id 非法：%r（合法值 %s）"
                          % (lid, ", ".join(LEXICON_IDS)))
    if scope not in LEXICON_SCOPES:
        raise PolicyError("词表 scope 非法：%r（合法值 %s）"
                          % (scope, ", ".join(LEXICON_SCOPES)))
    if action in ("add", "delete") and not value:
        raise PolicyError("%s 需要词形（--value）" % action)
    if action not in ("add", "delete", "clear"):
        raise PolicyError("词表 action 非法：%r" % action)
    meta = meta or {}
    conn = connect(db_path)
    try:
        conn.execute("BEGIN IMMEDIATE")
        written = removed = 0
        if action == "add":
            row = conn.execute(
                "SELECT COALESCE(MAX(ord),0)+1 FROM lexicons WHERE id=?",
                (lid,)).fetchone()[0]
            conn.execute(
                "INSERT OR REPLACE INTO lexicons"
                "(id,scope,key,value,target,meta_json,ord) VALUES(?,?,?,?,?,?,?)",
                (lid, scope, key, value, target,
                 json.dumps(meta, ensure_ascii=False, sort_keys=True), row))
            written = 1
        elif action == "delete":
            cur = conn.execute(
                "DELETE FROM lexicons WHERE id=? AND scope=? AND key=? "
                "AND value=? AND (?='' OR target=?)",
                (lid, scope, key, value, target, target))
            removed = cur.rowcount
        else:
            cur = conn.execute(
                "DELETE FROM lexicons WHERE id=? AND scope=? AND key=?",
                (lid, scope, key))
            removed = cur.rowcount
        _bump(conn)
        pv = conn.execute("SELECT policy_version FROM meta").fetchone()[0]
        conn.commit()
        return {"id": lid, "scope": scope, "key": key, "written": written,
                "removed": removed, "policy_version": pv}
    finally:
        conn.close()


def term_meta_update(db_path, concept, lang, add_variant=(), add_forbidden=(),
                     drop_variant=(), drop_forbidden=()):
    """`term-zh` 行的 variants/forbidden 增删（read-modify-write）。

    为什么不直接 `lexicon_write(..., meta=…)`：那会把整行 meta 换成调用方给的
    字典，`kind`/`note` 一漏就丢——而 `kind` 决定 P74「同篇混用」的射程，丢了
    等于规则悄悄变宽。这里只允许改这两张清单，其余键原样带回。

    为什么必须有这个写入口：P74 的两个分支（禁用形 / 同篇混用）读的就是这两张
    清单，而 2026-11-16 实测全库 **0 条**——规则实现了、数据从没落地，机检对
    47 语显示「干净」，实际上是判据空转。没有写入口，README 里「错形须在语料
    真实出现过、正形同语向 ≥3 次」这套登记门槛根本无法执行。
    """
    conn = connect(db_path)
    try:
        row = conn.execute(
            "SELECT target, meta_json FROM lexicons WHERE id='term-zh' "
            "AND scope='global' AND key=? AND value=?", (concept, lang)).fetchone()
    finally:
        conn.close()
    if row is None:
        raise PolicyError(
            "term-zh 没有「%s」的 %s 行：先登记首选形（glossary lexicon --id "
            "term-zh --key %s --value %s --target <首选形>），再挂变体/禁用形"
            % (concept, lang, concept, lang))
    preferred = row["target"]
    try:
        meta = json.loads(row["meta_json"] or "{}")
    except ValueError:
        meta = {}

    def _merge(cur, add, drop):
        out = [x for x in (cur or ()) if x and x not in drop]
        for x in add:
            if x and x not in out:
                out.append(x)
        return out

    variants = _merge(meta.get("variants"), add_variant, drop_variant)
    forbidden = _merge(meta.get("forbidden"), add_forbidden, drop_forbidden)
    if variants:
        meta["variants"] = variants
    else:
        meta.pop("variants", None)
    if forbidden:
        meta["forbidden"] = forbidden
    else:
        meta.pop("forbidden", None)
    res = lexicon_write(db_path, "add", "term-zh", key=concept, value=lang,
                        target=preferred, meta=meta)
    return {"concept": concept, "lang": lang, "preferred": preferred,
            "variants": variants, "forbidden": forbidden,
            "policy_version": res["policy_version"]}


def lexicon_replace_bulk(db_path, lid, rows, only_keys=None, db_label=None):
    """整表（或按 key 子集）重建一个 lexicon 词表——词族灌库唯一写通道。

    rows: [(key, value, target_str, meta_dict), ...]，scope 恒 'global'，
    ord 依 rows 顺序接在该 id 现有最大 ord 之后。only_keys 非 None 时只重建
    这些 key 的行、其余 key 原样保留——坐实工具按 --concepts 子集重灌时，
    绝不能把没做过的概念静默清空（2026-11 v437 教训）。

    为什么必须收进本模块：tools/family_* 曾各自裸写 DELETE+INSERT+commit，
    一不走 BEGIN IMMEDIATE（并行会话互踩）、二不统一 bump、三绕开写入口
    守卫（见 selftest/_db_write_surface.py：除 core/db.py 与 core/schema.py
    外，任何文件出现裸 SQL 写关键词即 FAIL）。计算逻辑留在 tools/，落库
    只许走这里。
    """
    if lid not in LEXICON_IDS:
        raise PolicyError("词表 id 非法：%r（合法值 %s）"
                          % (lid, ", ".join(LEXICON_IDS)))
    rows = list(rows or [])
    conn = connect(db_path)
    try:
        conn.execute("BEGIN IMMEDIATE")
        if only_keys:
            keys = tuple(sorted(set(only_keys)))
            conn.execute("DELETE FROM lexicons WHERE id=? AND key IN (%s)"
                         % ",".join("?" * len(keys)), (lid,) + keys)
        else:
            conn.execute("DELETE FROM lexicons WHERE id=?", (lid,))
        for key, value, target, meta in rows:
            conn.execute(
                "INSERT OR REPLACE INTO lexicons"
                "(id,scope,key,value,target,meta_json,ord) VALUES(?,?,?,?,?,?,"
                "(SELECT COALESCE(MAX(ord),0)+1 FROM lexicons WHERE id=?))",
                (lid, "global", key, value, target,
                 json.dumps(meta or {}, ensure_ascii=False, sort_keys=True),
                 lid))
        _bump(conn)
        pv = conn.execute("SELECT policy_version FROM meta").fetchone()[0]
        conn.commit()
        return {"id": lid, "rows": len(rows), "policy_version": pv}
    finally:
        conn.close()


def lexicon_patch_meta(db_path, lid, patches, db_label=None):
    """逐格改 lexicon 行的 target/meta——准入类写入（pair_open 型）唯一通道。

    patches: [(key, value, target_str_or_None, meta_dict), ...]。target 为
    None 时保持原词形只换 meta；库中无该格时跳过（不静默造行，造行走
    lexicon_replace_bulk / lexicon_write）。整批一个事务、只 bump 一次——
    逐格 bump 会把 policy_version 推高几十次，审计线没法读。
    """
    if lid not in LEXICON_IDS:
        raise PolicyError("词表 id 非法：%r（合法值 %s）"
                          % (lid, ", ".join(LEXICON_IDS)))
    conn = connect(db_path)
    try:
        conn.execute("BEGIN IMMEDIATE")
        n = skipped = 0
        for key, value, target, meta in patches or ():
            row = conn.execute(
                "SELECT target FROM lexicons WHERE id=? AND key=? AND value=?",
                (lid, key, value)).fetchone()
            if row is None:
                skipped += 1
                continue
            conn.execute(
                "UPDATE lexicons SET target=?, meta_json=? "
                "WHERE id=? AND key=? AND value=?",
                (target if target is not None else row[0],
                 json.dumps(meta or {}, ensure_ascii=False, sort_keys=True),
                 lid, key, value))
            n += 1
        _bump(conn)
        pv = conn.execute("SELECT policy_version FROM meta").fetchone()[0]
        conn.commit()
        return {"id": lid, "written": n, "skipped": skipped,
                "policy_version": pv}
    finally:
        conn.close()


def _write_contract(conn, section, payload, base_revision=None, delete=False):
    """写 terms + anchors + forms（一个事务内完成）。

    唯一约束落在 forms(term_id, assertion, lang, value, match_mode)：同一术语
    同一断言同一语向不允许登记两遍同一个词形，重复登记直接抛 IntegrityError，
    由 glossary_write 回滚并转成 PolicyError——入库即拦。
    """
    cid = "%s:%s" % (section, payload.get("id"))
    cur = conn.execute("SELECT id,options_json,note,revision FROM terms "
                       "WHERE id=?", (cid,)).fetchone()
    if delete:
        if cur is None:
            return None                       # 幂等：双方都 delete
        if base_revision is not None and cur["revision"] != base_revision:
            raise ConflictError("delete 冲突：%s 当前 revision=%s，base=%s"
                                % (cid, cur["revision"], base_revision))
        conn.execute("DELETE FROM terms WHERE id=?", (cid,))
        _bump(conn)
        return {"op": "delete", "contract_id": cid}

    options, form_rows = _derive(section, payload)
    anchor = (payload.get("zh") or "").strip()
    if cur is None:
        if base_revision not in (None, 0):
            raise ConflictError("add 冲突：%s 已不存在但 base_revision=%s"
                                % (cid, base_revision))
        k = conn.execute(
            "SELECT COALESCE(MAX(ord),-1)+1 FROM terms WHERE section=?",
            (section,)).fetchone()[0]
        conn.execute(
            "INSERT INTO terms(id,section,options_json,note,revision,ord) "
            "VALUES (?,?,?,?,?,?)",
            (cid, section, _js(options), payload.get("note"), 1, k))
        new_rev = 1
    else:
        if base_revision is not None and cur["revision"] != base_revision:
            raise ConflictError("update 冲突：%s 当前 revision=%s，base=%s"
                                % (cid, cur["revision"], base_revision))
        old_anchor = [r[0] for r in conn.execute(
            "SELECT zh_anchor FROM anchors WHERE term_id=? ORDER BY ord",
            (cid,))]
        old_forms = [tuple(r) for r in conn.execute(
            "SELECT assertion,lang,value,match_mode,scalar FROM forms "
            "WHERE term_id=? ORDER BY ord", (cid,))]
        if (json.loads(cur["options_json"] or "{}") == options
                and (cur["note"] or None) == (payload.get("note") or None)
                and old_anchor == ([anchor] if anchor else [])
                and old_forms == [f[:5] for f in form_rows]):
            return None                       # 幂等：内容未变
        new_rev = cur["revision"] + 1
        conn.execute(
            "UPDATE terms SET options_json=?,note=?,revision=? WHERE id=?",
            (_js(options), payload.get("note"), new_rev, cid))
        conn.execute("DELETE FROM anchors WHERE term_id=?", (cid,))
        conn.execute("DELETE FROM forms WHERE term_id=?", (cid,))
    if anchor:
        conn.execute(
            "INSERT INTO anchors(term_id,zh_anchor,ord) VALUES (?,?,0)",
            (cid, anchor))
    for assertion, lg, val, mode, scalar, fo in form_rows:
        conn.execute(
            "INSERT INTO forms(term_id,assertion,lang,value,match_mode,"
            "scalar,ord) VALUES (?,?,?,?,?,?,?)",
            (cid, assertion, lg, val, mode, scalar, fo))
    _bump(conn)
    return {"op": "upsert", "contract_id": cid, "revision": new_rev}


def glossary_write(db_path, action, section, payload=None, cid=None,
                   base_revision=None):
    """统一的写事务：BEGIN IMMEDIATE + revision 乐观锁。"""
    conn = connect(db_path)
    try:
        conn.execute("BEGIN IMMEDIATE")
        if action == "delete":
            p = {"id": cid.split(":", 1)[-1]}
            res = _write_contract(conn, section, p, base_revision, delete=True)
        else:
            res = _write_contract(conn, section, payload, base_revision)
        conn.commit()
        return res
    except sqlite3.IntegrityError as exc:
        conn.rollback()
        raise PolicyError(
            "写入被库级约束拒绝（forms 唯一索引）：%s\n"
            "同一术语同一断言同一语向不允许登记两遍同一个词形——"
            "先去重再 add/update。" % exc)
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ---------------------------------------------------------------- changeset

def _cs_id(obj):
    return hashlib.sha256(
        json.dumps(obj, ensure_ascii=False, sort_keys=True,
                   separators=(",", ":")).encode("utf-8")).hexdigest()


def build_changeset(db_path, since_revision=1, against=None, db_label=None):
    """生成策略变更集。against 给定时做双库 diff，否则按 revision 水位导出。"""
    pv = load_policy(db_path)
    ops = []
    base_ver = int(since_revision)
    if against:
        other = load_policy(against)
        base_ver = other.policy_version
        cur = {c["id"]: c for c in pv.contracts}
        old = {c["id"]: c for c in other.contracts}
        for cid in sorted(set(cur) | set(old)):
            if cid not in old:
                c = cur[cid]
                ops.append({"op": "upsert", "contract_id": cid,
                            "section": c["section"], "base_revision": 0,
                            "payload": c["payload"]})
            elif cid not in cur:
                ops.append({"op": "delete", "contract_id": cid,
                            "section": old[cid]["section"],
                            "base_revision": old[cid]["revision"]})
            elif cur[cid]["payload"] != old[cid]["payload"]:
                c = cur[cid]
                ops.append({"op": "upsert", "contract_id": cid,
                            "section": c["section"],
                            "base_revision": old[cid]["revision"],
                            "payload": c["payload"]})
    else:
        for c in pv.contracts:
            if c["revision"] > since_revision:
                ops.append({"op": "upsert", "contract_id": c["id"],
                            "section": c["section"],
                            "base_revision": c["revision"] - 1,
                            "payload": c["payload"]})
    body = {"base_policy_version": base_ver,
            "target_policy_version": pv.policy_version,
            "created_by_build": db_label or "submit-v%d" % pv.policy_version,
            "ops": ops}
    body["cs_id"] = _cs_id(body)
    return body


def import_changeset(db_path, cs, dry_run=False, force=False):
    """整单事务；任一冲突回滚。返回 (applied, skipped, conflicts)。"""
    ops = cs.get("ops") or []
    cs_id = cs.get("cs_id") or _cs_id({k: v for k, v in cs.items()
                                       if k != "cs_id"})
    conn = connect(db_path)
    try:
        conn.execute("BEGIN IMMEDIATE")
        m = conn.execute("SELECT * FROM meta").fetchone()
        if cs_id in json.loads(m["applied_cs"] or "[]"):
            conn.rollback()
            return 0, len(ops), []
        if not force and cs.get("base_policy_version") is not None \
                and cs["base_policy_version"] > m["policy_version"]:
            conn.rollback()
            raise PolicyError("changeset 基线版本 %s 高于当前 %s，请先 rebase"
                              % (cs["base_policy_version"], m["policy_version"]))
        conflicts = []
        # 先全量判定，再决定提交，保证整单原子
        for op in ops:
            cid = op["contract_id"]
            cur = conn.execute("SELECT revision,options_json FROM terms "
                               "WHERE id=?", (cid,)).fetchone()
            base = op.get("base_revision")
            if op["op"] == "delete":
                if cur is None:
                    continue
                if base is not None and cur["revision"] != base and not force:
                    conflicts.append({"contract_id": cid,
                                      "reason": "一方 delete 一方 update",
                                      "base": base, "current": cur["revision"]})
            else:
                if cur is not None and base is not None \
                        and cur["revision"] != base and not force:
                    conflicts.append({"contract_id": cid,
                                      "reason": "同条被双方修改",
                                      "base": base, "current": cur["revision"],
                                      "theirs": _js(op["payload"])[:200],
                                      "ours": (cur["options_json"] or "")[:200]})
        if conflicts:
            conn.rollback()
            return 0, 0, conflicts
        if dry_run:
            conn.rollback()
            return len(ops), 0, []
        start_version = m["policy_version"]
        applied = 0
        for op in ops:
            r = _write_contract(
                conn, op["section"], op.get("payload") or
                {"id": op["contract_id"].split(":", 1)[-1]},
                base_revision=op.get("base_revision") if not force else None,
                delete=(op["op"] == "delete"))
            if r:
                applied += 1
        applied_cs = json.loads(m["applied_cs"] or "[]")
        if cs_id not in applied_cs:
            applied_cs.append(cs_id)
        # 整单只递增一次策略版本，而不是每条 op 一次
        conn.execute("UPDATE meta SET policy_version=?, applied_cs=?",
                     (start_version + 1, _js(applied_cs)))
        conn.commit()
        return applied, len(ops) - applied, []
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ---------------------------------------------------------------- doctor

def doctor(db_path, kit_dir, plugins=None):
    """返回问题列表；空列表表示健康。"""
    problems = []
    conn = connect(db_path, readonly=True)
    try:
        r = conn.execute("PRAGMA integrity_check").fetchone()
        if not r or r[0] != "ok":
            problems.append("integrity_check: %s" % (r[0] if r else "no row"))
        m = conn.execute("SELECT * FROM meta").fetchone()
        if not m:
            problems.append("meta 为空")
        else:
            if m["schema_version"] != SCHEMA_VERSION:
                problems.append("schema_version %s != %s"
                                % (m["schema_version"], SCHEMA_VERSION))
            if m["policy_version"] < INITIAL_POLICY_VERSION:
                problems.append("policy_version 倒退：%s" % m["policy_version"])
        langs = {x[0] for x in conn.execute("SELECT lang FROM locales")}
        bad_lang = [x[0] for x in conn.execute(
            "SELECT DISTINCT lang FROM forms WHERE lang!='*'")
            if x[0] not in langs]
        if bad_lang:
            problems.append("forms 含未注册语言：%s" % ", ".join(bad_lang[:8]))
        for row in conn.execute("SELECT term_id,value FROM forms "
                                "WHERE match_mode='regex'"):
            try:
                re.compile(row[1])
            except re.error as exc:
                problems.append("坏正则 %s: %s" % (row[0], exc))
        orphan = conn.execute(
            "SELECT COUNT(*) FROM forms f LEFT JOIN terms t "
            "ON f.term_id=t.id WHERE t.id IS NULL").fetchone()[0]
        if orphan:
            problems.append("孤儿 forms 行：%d" % orphan)
        # 受控词表：五类缺一即「判据静默失效」（P30/P38/P66/P68/P71 会零命中）
        try:
            got_lx = {r[0] for r in conn.execute(
                "SELECT DISTINCT id FROM lexicons")}
            missing = [i for i in LEXICON_IDS if i not in got_lx]
            if missing:
                problems.append("受控词表缺类：%s（跑 glossary lexicon list 核对）"
                                % ", ".join(missing))
            empty = conn.execute(
                "SELECT COUNT(*) FROM lexicons WHERE value=''").fetchone()[0]
            if empty:
                problems.append("受控词表有空词形行：%d" % empty)
            bad_scope = [r[0] for r in conn.execute(
                "SELECT DISTINCT scope FROM lexicons")
                if r[0] not in LEXICON_SCOPES]
            if bad_scope:
                problems.append("受控词表 scope 非法：%s" % ", ".join(bad_scope))
        except sqlite3.OperationalError:
            problems.append("策略库缺 lexicons 表："
                            "跑 submit.py glossary migrate")
        # 结构校验统一走 core/schema.verify（单一真值后只剩形态与引用完整性），
        # 这里只做转述，不另写一套判定——两套口径会各自演化，给出不同答案。
        _sch = _schema.verify(conn)
        for e in _sch["errors"]:
            problems.append(e)
        # banned 段 lang 静默失效体检：P43 运行时按 `lg in parsed` 逐语匹配，
        # 契约 lang 缺省／写成 "*"／写成未注册码时整条禁令不激活。
        ban_bad = []
        for cid, oj in conn.execute(
                "SELECT id,options_json FROM terms WHERE section='banned'"):
            try:
                lg = str(json.loads(oj or "{}").get("lang") or "").strip()
            except (TypeError, ValueError):
                lg = ""
            if lg not in langs:
                ban_bad.append("%s(lang=%r)" % (cid, lg))
        if ban_bad:
            problems.append("banned 契约 lang 非法/缺省（禁令静默失效）%d 条：%s"
                           % (len(ban_bad), ", ".join(ban_bad[:8])))
    finally:
        conn.close()
    # README「发现的问题必须回流」：判据只在 plugins/，受控词表在
    # plugins/_lexicon_*.py，篇级术语策略只在契约库。判据实现、词表、
    # 一次性修复脚本落进 tests/ 会绕过插件登记与 RATIONALE，也不受电池
    # 夹具约束；只报问题、不删文件。
    if kit_dir:
        tdir = os.path.join(kit_dir, "tests")
        if os.path.isdir(tdir):
            shells = ("__init__.py", "scratch_attic.py")
            stray = [n for n in sorted(os.listdir(tdir))
                     if n.endswith(".py") and n not in shells
                     and not n.startswith("negative_test_")]
            if stray:
                problems.append("tests/ 出现非电池/非审计准备器脚本：%s"
                               % ", ".join(stray[:8]))
    if plugins is not None:
        # 插件投影的真源是 `data/rules_registry.json`（a 判据文件逐文件 sha256），
        # 不再维护库内缓存。
        from core import rule_registry
        reg, err = rule_registry.try_load(kit_dir)
        if reg is None:
            problems.append("规则注册表不可读：%s" % err)
        else:
            diff = rule_registry.audit(kit_dir, reg)
            for key, label in (("unregistered", "未登记插件"),
                               ("missing", "注册表有但磁盘缺"),
                               ("hash_mismatch", "插件指纹不符"),
                               ("selftest_hash_mismatch", "自检臂指纹不符")):
                for x in diff.get(key) or []:
                    problems.append("%s：%s" % (label, x))
    return problems


# ---------------------------------------------------------------- 分发快照

def vacuum_into(src, dst):
    """生成无 WAL、紧凑、可哈希的单文件快照；绝不把 -wal/-shm 带进 zip。

    dst 是调用方指定的输出路径：覆盖旧 dst 属于写操作的一部分（v213
    电池等直调场景无 --tmp 上下文），不走「删除即归档」。
    """
    if os.path.exists(dst):
        os.remove(dst)
    conn = connect(src, readonly=True)
    try:
        conn.execute("VACUUM INTO ?", (dst,))
    finally:
        conn.close()
    with open(dst, "rb") as fh:
        digest = hashlib.sha256(fh.read()).hexdigest()
    c2 = sqlite3.connect(dst)
    try:
        c2.execute("UPDATE meta SET build_id=?", (digest,))
        c2.commit()
        ok = c2.execute("PRAGMA integrity_check").fetchone()[0]
    finally:
        c2.close()
    if ok != "ok":
        raise PolicyError("分发快照完整性校验失败：%s" % ok)
    return digest


def diff_markdown(db_path, against=None, since_revision=1):
    """DB 是二进制，git diff 不可读；这里生成可读视图（生成物，不维护）。"""
    cs = build_changeset(db_path, since_revision=since_revision,
                         against=against)
    out = ["# 策略变更 since %s" % cs["base_policy_version"], ""]
    for op in cs["ops"]:
        out.append("- `%s` %s (base rev %s)" %
                   (op["contract_id"], op["op"], op.get("base_revision")))
        if op["op"] == "upsert":
            out.append("  ```json")
            out.append("  " + _js(op["payload"])[:600])
            out.append("  ```")
    return "\n".join(out) + "\n"
