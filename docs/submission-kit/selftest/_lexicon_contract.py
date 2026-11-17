# -*- coding: utf-8 -*-
"""自检：词表数据在库、插件里只有访问层（A9，工具级臂，`selftest --kit` 才跑）。

为什么必须有这条臂：受控词表换过三次位置（core/ → plugins/_lexicon_*.py →
data/glossary.db），每次都没有机检兜底。这条臂把终态钉死：
  · 词形数据只在 `data/glossary.db` 的 `lexicons` 表（七类齐全、非空）；
  · `plugins/` 里只允许一个访问层 `_lexicon.py`，不得夹带判据；
  · `core/` 不得反向依赖 `plugins/`。

六个断言（负向四条全部在 --tmp 下造最小工具包，不碰真实目录）：
  ① 真实策略库：七类词表齐全且行数 > 0；
  ② 真实工具包：访问层唯一、被 import、core 零 plugins 依赖；
  ③ 负向：core/ 里写 `from plugins import ...` 必须报 A9；
  ④ 负向：又长出一个 `plugins/_lexicon_data.py` 数据模块必须报 A9；
  ⑤ 负向：访问层里写 `RULE = ...` 必须报 A9；
  ⑥ 负向：访问层无人 import 必须报 A9。
"""
import os
import shutil
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_KIT = os.path.dirname(_HERE)
sys.path.insert(0, _KIT)

from core import arch_health                                       # noqa: E402
from core import db as _db                                        # noqa: E402

LEXICON_IDS = ("country", "neighbor", "latin-required", "latin-ascii",
               "latin-allow", "term-localization", "forbidden-currency")


def _argv_tmp():
    for i, a in enumerate(sys.argv):
        if a == "--tmp" and i + 1 < len(sys.argv):
            return sys.argv[i + 1]
        if a.startswith("--tmp="):
            return a.split("=", 1)[1]
    return None


def _build(root, files):
    for rel, text in files.items():
        p = os.path.join(root, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(text)
    return root


def _a9(res):
    return [e for e in res["errors"] if "A9" in e]


def main():
    tmp = _argv_tmp()
    if not tmp:
        print("需要 --tmp <目录>：本臂要造临时工具包，不允许落到工具包内")
        return 2
    base = os.path.join(os.path.abspath(tmp), "lexicon-contract")
    shutil.rmtree(base, ignore_errors=True)   # 每次重建，避免上一轮夹具串味
    fails = 0

    # ① 策略库五类词表
    try:
        pv = _db.current_policy(None, _KIT)
        got = {k: len(v) for k, v in (pv.lexicons or {}).items()}
    except Exception as exc:                       # pragma: no cover
        got = {}
        print("     策略库读取失败:", exc)
    missing = [i for i in LEXICON_IDS if not got.get(i)]
    ok1 = not missing
    print("  %-4s %-30s %s"
          % ("OK" if ok1 else "FAIL", "① 策略库七类词表齐全",
             " ".join("%s=%d" % (k, got.get(k, 0)) for k in LEXICON_IDS)))
    fails += 0 if ok1 else 1

    # ② 访问层唯一 + 被引用 + core 零依赖
    real = arch_health.audit(_KIT)
    st = real["stats"]
    ok2 = (st.get("lexicons") == 1 and st.get("lexicon_consumers", 0) >= 1
           and st.get("core_plugins_imports") == 0 and not _a9(real))
    print("  %-4s %-30s 访问层 %s / 消费方 %s / core→plugins %s"
          % ("OK" if ok2 else "FAIL", "② 访问层唯一可用",
             st.get("lexicons"), st.get("lexicon_consumers"),
             st.get("core_plugins_imports")))
    fails += 0 if ok2 else 1

    # ③ core/ 里 import plugins
    k3 = _build(os.path.join(base, "revdep"), {
        "core/__init__.py": "",
        "core/bad.py": "from plugins import _lexicon\n",
    })
    r3 = _a9(arch_health.audit(k3))
    ok3 = any("core/bad.py" in e for e in r3)
    print("  %-4s %-30s %s"
          % ("OK" if ok3 else "FAIL", "③ 负向：core 依赖 plugins",
             r3[0][:56] if r3 else "未报红"))
    fails += 0 if ok3 else 1

    # ④ 又长出数据模块
    k4 = _build(os.path.join(base, "extra"), {
        "core/__init__.py": "",
        "plugins/__init__.py": "",
        "plugins/_lexicon.py": "ROWS = ()\n",
        "plugins/_lexicon_data.py": "WORDS = {'a': 1}\n",
        "plugins/user.py": "from plugins._lexicon import ROWS\n",
    })
    r4 = _a9(arch_health.audit(k4))
    ok4 = any("只允许一个词表访问层" in e for e in r4)
    print("  %-4s %-30s %s"
          % ("OK" if ok4 else "FAIL", "④ 负向：长出词表数据模块",
             r4[0][:56] if r4 else "未报红"))
    fails += 0 if ok4 else 1

    # ⑤ 访问层夹带判据
    k5 = _build(os.path.join(base, "dirty"), {
        "core/__init__.py": "",
        "plugins/__init__.py": "",
        "plugins/_lexicon.py": 'RULE = "X1"\n\n\ndef run(view, emit):\n'
                               '    emit(RULE, "error", "x", "y")\n',
        "plugins/user.py": "from plugins._lexicon import RULE\n",
    })
    r5 = _a9(arch_health.audit(k5))
    ok5 = any("是词表访问层却含" in e for e in r5)
    print("  %-4s %-30s %s"
          % ("OK" if ok5 else "FAIL", "⑤ 负向：访问层夹带判据",
             r5[0][:56] if r5 else "未报红"))
    fails += 0 if ok5 else 1

    # ⑥ 访问层无人 import
    k6 = _build(os.path.join(base, "dead"), {
        "core/__init__.py": "",
        "plugins/__init__.py": "",
        "plugins/_lexicon.py": "ROWS = ()\n",
    })
    r6 = _a9(arch_health.audit(k6))
    ok6 = any("没有任何消费方" in e for e in r6)
    print("  %-4s %-30s %s"
          % ("OK" if ok6 else "FAIL", "⑥ 负向：访问层死代码",
             r6[0][:56] if r6 else "未报红"))
    fails += 0 if ok6 else 1

    print("词表数据层：6 个断言，FAIL %d" % fails)
    return 0 if fails == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
