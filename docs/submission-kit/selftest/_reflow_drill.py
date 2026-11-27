# -*- coding: utf-8 -*-
"""自检：§7-A7 纯回流演练 —— 只加术语 / 只加插件，新 finding 出现且旧结果零回归。

方案 §7-A7 原文：「纯回流演练：只加插件 + 只加术语，新 finding 出现且旧结果
零回归」。此前只有流程纪律（改判据 → plugin sync → oracle 门人工跑），没有机检。
本臂补上这台机器。

为什么单独成臂而不是塞进 `_harness.py`：它验的不是某条判据，而是**调度层**——
「新加的东西会不会把别人的 finding 吞掉」。这类实现踩过这个坑：`_review`
按 (rule, slug, detail) 跨插件回填，改 detail 即静默丢弃 finding。这条臂守住
「任何新增都不能让既有结论消失或变形」。

四个断言
--------
① 基线：官方尺在 live 库上跑出的 findings 记下来。
② 只加术语：spec 里加一条契约（锚 = 官方尺第 1 段原文，require 一个不可能存在
   的词形）→ 必须新增 S08 finding，且基线 findings **一条不少**。
③ 只加插件：注册一个探针插件（发 1 条 warning）→ 必须新增该 warning，基线一条
   不少，且既有 finding 的 severity/detail **一字不改**。
④ 还原：撤掉注入后必须回到基线条数（防「注入是假的」）。
"""
import sys
import types
from pathlib import Path

_KIT = Path(__file__).resolve().parents[1]
if str(_KIT) not in sys.path:
    sys.path.insert(0, str(_KIT))

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                        # noqa: E402

from core import checker                                    # noqa: E402
from core import db as _db                                  # noqa: E402
from core.model import Context                              # noqa: E402

DB = _KIT / "data" / "glossary.db"

# 官方尺第 1 段原文（真实存在于 template/blog/*/content/zh/*.mdx）
ANCHOR = "在订舱之前，先确认四件事，它们决定食品能否顺利清关。"
TOKEN = "zzz-reflow-drill-token"


def _sig(findings):
    """finding 的可比签名。detail 也进签名——只改措辞也算结论变形。"""
    return sorted((f.rule, f.severity, f.slug, f.detail) for f in findings)


def _run(work, spec=None, extra_plugins=None):
    """跑一轮 check；extra_plugins 非空时临时往调度层注入探针插件。

    真实世界里「加插件」必然连规则一起登记（Finding 构造器拦未注册 ID），
    所以这里也临时把 Z01 并进 KNOWN_RULES——只在本进程内、跑完立刻还原。
    """
    import core.model as _model

    ctx = Context(kit_dir=str(_KIT), db_path=str(DB), glossary=spec)
    if not extra_plugins:
        return checker.check(str(work), ctx=ctx)

    real = checker.plugins_for
    real_known = _model.KNOWN_RULES

    def patched(c):
        live, skipped = real(c)
        return list(live) + list(extra_plugins), skipped

    checker.plugins_for = patched
    _model.KNOWN_RULES = frozenset(set(real_known) | {"Z01"})
    try:
        return checker.check(str(work), ctx=ctx)
    finally:
        checker.plugins_for = real
        _model.KNOWN_RULES = real_known


def _probe_plugin():
    """探针插件：不判内容，只发一条固定 warning，用于验证「加插件不伤别人」。"""
    mod = types.ModuleType("plugins.zzz-reflow-drill")
    mod.RULE = "Z01"
    mod.RULES = ["Z01"]
    mod.PHASE = 99
    mod.CATEGORY = "text"
    mod.APPLIES_TO = ["blog", "regulation"]
    mod.NEEDS = ["parsed"]
    mod.SEVERITY = "warning"
    mod.ENABLED = True
    mod.COVERAGE = {"langs": "all", "zones": ["body"]}
    mod.RATIONALE = {"Z01": "x" * 90}

    def run(view, emit):
        for art in view.articles:
            emit("Z01", "warning", art.slug, "回流演练探针（不是判据）")

    def review(finding, view):
        return finding

    mod.run = run
    mod.review = review
    return {"id": "zzz-reflow-drill", "style": "new", "enabled": True,
            "rules": ["Z01"], "applies_to": ["blog", "regulation"],
            "phase": 99, "module": mod}


def _seed_defects(work):
    """先在官方尺副本上种 3 个已知缺陷，让「零回归」有东西可回归。

    官方尺本身几乎干净（1 条 warning），只拿它当基线等于用 1 条记录证明
    「没吞 finding」。种缺陷只动副本（`_copy_fixture` 落的 tmp 目录）。
    """
    # B03：正文出现 --- 分隔线
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p).rstrip("\n") + "\n\n---\n\nSuite du texte.\n")
    # P40：摘要去掉句末标点
    H.patch_fm(p, "excerpt", "Quatre contrôles décident du passage en douane")
    # B07：列表项之间空行
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\n- premier point\n\n- deuxième point\n")


def main():
    fails = 0
    dest, work = H._copy_fixture("blog")
    try:
        # ---------- ① 基线 ----------
        _seed_defects(work)
        base = _run(work)
        base_sig = _sig(base)
        ok1 = len(base) >= 3
        print("  %-4s %-26s %d 条 finding（种入 3 类缺陷）"
              % ("OK" if ok1 else "FAIL", "① 基线（官方尺副本）", len(base)))
        if not ok1:
            fails += 1
            print("         基线只有 %d 条，零回归断言没有意义" % len(base))

        # ---------- ② 只加术语 ----------
        spec = _db.policy_spec(_db.load_policy(str(DB), readonly=True))
        spec.setdefault("terms", []).append({
            "id": "zz-reflow-drill", "zh": ANCHOR, "note": "回流演练注入",
            "require": {"fr": [TOKEN]},
        })
        with_term = _run(work, spec=spec)
        new_term = [f for f in with_term if f.rule == "S08"]
        kept = set(base_sig) <= set(_sig(with_term))
        ok2 = bool(new_term) and kept
        print("  %-4s %-26s 新增 S08 %d 条；基线 %d 条全在=%s"
              % ("OK" if ok2 else "FAIL", "② 只加术语", len(new_term),
                 len(base), kept))
        if not ok2:
            fails += 1
            miss = set(base_sig) - set(_sig(with_term))
            if miss:
                print("         基线缺失 %d 条：%s"
                      % (len(miss), list(miss)[:2]))

        # ---------- ③ 只加插件 ----------
        probe = _probe_plugin()
        with_plugin = _run(work, extra_plugins=[probe])
        sig_plugin = _sig(with_plugin)
        new_probe = [f for f in with_plugin if f.rule == "Z01"]
        kept3 = set(base_sig) <= set(sig_plugin)
        # 既有 finding 必须逐字不变（不含探针自己那条）
        base_part = sorted(x for x in sig_plugin if x[0] != "Z01")
        same3 = base_part == base_sig
        ok3 = len(new_probe) == 1 and kept3 and same3
        print("  %-4s %-26s 新增 Z01 %d 条；基线全在=%s；既有逐字不变=%s"
              % ("OK" if ok3 else "FAIL", "③ 只加插件", len(new_probe),
                 kept3, same3))
        if not ok3:
            fails += 1

        # ---------- ④ 还原 ----------
        back = _run(work)
        ok4 = _sig(back) == base_sig
        print("  %-4s %-26s %d 条（基线 %d 条）"
              % ("OK" if ok4 else "FAIL", "④ 撤注入回基线", len(back),
                 len(base)))
        if not ok4:
            fails += 1
            diff = set(_sig(back)) ^ set(base_sig)
            print("         差异 %d 条：%s" % (len(diff), list(diff)[:2]))
    finally:
        H._archive(dest)

    total = 4
    print("回流演练：%d 个断言，FAIL %d" % (total, fails))
    return 0 if not fails else 1


if __name__ == "__main__":
    raise SystemExit(main())
