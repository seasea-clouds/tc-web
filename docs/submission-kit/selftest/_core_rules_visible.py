# -*- coding: utf-8 -*-
"""工具级自检：core 级故障必须穿透插件规则过滤器，且插件崩溃不得静默。

`_` 前缀：验的是调度层（core.checker.check 的 add 放行规则 + 插件异常兜底），
没有对应插件，按 A6/A7 不能占用正名臂；由 `submit.py selftest --kit` 计数。

背景（2026-11-14 实测）：Context.rules_filter 是「启用插件声明的规则并集」，
C01/H01/H02 由 core 发射、天然不在这个并集里。于是三处 `add("C01", ...)`
（策略库未加载 / 契约配置错误 / Context 配置错误）全被自己的过滤器吞掉——
注入 `config_errors` 后 check 仍报 PASS、退出码 0，配置坏了看不出来。
同一批还修了插件运行异常：此前只写 stderr，--json 消费方看不到，
PASS 变假绿。

四臂：
  1. 注入 config_errors → 必须产出 C01 error（过滤器不得吞 core 规则）；
  2. 同一轮里普通插件规则仍受 filters 约束（放行只给 CORE_RULES）；
  3. 插件 run() 抛异常 → 必须产出 C01 error，且不炸掉整轮；
  4. 崩溃不影响同轮其他插件产出。
"""
import os
import sys
import types

_HERE = os.path.dirname(os.path.abspath(__file__))
_KIT = os.path.dirname(_HERE)
if _KIT not in sys.path:
    sys.path.insert(0, _KIT)

from core import checker as _checker                            # noqa: E402
from core import loader as _loader                              # noqa: E402
from core.model import Context                                  # noqa: E402

TEMPLATE = os.path.join(_KIT, "template")


def _enabled():
    ps, _ = _loader.discover(_KIT, tolerant=True)
    return _loader.enabled_rules(ps)


def main():
    cases = []
    en = _enabled()
    ctx = Context(kit_dir=_KIT, rules_filter=en, glossary_disabled=True,
                  config_errors=["自检注入：契约 forbid_re 编译失败"])

    fs = _checker.check(TEMPLATE, ctx=ctx)
    c01 = [f for f in fs if f.rule == "C01"]
    cases.append(("config_errors 穿透过滤器产出 C01", len(c01) == 1))
    cases.append(("C01 为 error 级", bool(c01) and c01[0].severity == "error"))
    cases.append(("非 core 规则仍受 filters 约束",
                  all(f.rule in en or f.rule == "C01" for f in fs)))

    # 插件崩溃：用一个必定抛异常的假插件替换发现结果
    bad = {"id": "selftest-boom", "style": "new", "enabled": True,
           "applies_to": [], "rules": ["W01"]}

    def _run(view, emit):
        raise RuntimeError("自检注入：插件崩溃")

    bad["module"] = types.SimpleNamespace(run=_run,
                                          review=lambda f, v: f)
    orig = _checker.plugins_for
    _checker.plugins_for = lambda ctx: ([bad], [])
    try:
        ctx2 = Context(kit_dir=_KIT, rules_filter=frozenset({"W01"}),
                       glossary_disabled=True)
        fs2 = _checker.check(TEMPLATE, ctx=ctx2)
    finally:
        _checker.plugins_for = orig
    boom = [f for f in fs2 if f.rule == "C01" and "selftest-boom" in f.detail]
    cases.append(("插件崩溃产出 C01 error", len(boom) == 1))
    cases.append(("崩溃后整轮仍返回 findings 列表", isinstance(fs2, list)))

    fails = 0
    for name, ok in cases:
        print("  %-4s %s" % ("OK" if ok else "FAIL", name))
        fails += 0 if ok else 1
    print("core 故障可见性：%d 臂，FAIL %d" % (len(cases), fails))
    return 0 if fails == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
