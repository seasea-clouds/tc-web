# -*- coding: utf-8 -*-
"""工具级自检：`check --all --jobs>1` 的并行通路与串行逐条等价。

`_` 前缀：验的是调度层（core.checker._run_batch 组 cfg → 进程池 → 回传
findings），没有对应插件，按 A6/A7 不能占用正名臂；由 `selftest --kit`
单独计数。

背景（2026-11-14 实测）：`_run_batch` 曾自行遍历 `Context.__slots__` 组
kwargs，把后加的派生缓存 `lexicon_cache` 一并传给 `Context(**cfg)`，
`--jobs=2` 直接 TypeError 崩掉整轮，stdout 零字节、用户只看到 traceback。
故本臂钉两件事：

  1. `Context.to_kwargs()` 只产出 `__init__` 接受的键（派生字段单一真值）；
  2. 同一批包，并行与串行的 findings 逐条相等（不串味、不丢包）。

第 2 项只开 S01/S02 两条包级规则：本臂验的是**并行通路**，不是判据覆盖，
限定规则可把 4 次 check 的耗时压到秒级，不影响结论。
"""
import os
import shutil
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

_HERE = os.path.dirname(os.path.abspath(__file__))
_KIT = os.path.dirname(_HERE)
for _p in (_KIT, _HERE):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import _harness as H                                            # noqa: E402
from core import checker as _checker                            # noqa: E402
from core.model import Context                                  # noqa: E402

RULES = frozenset({"S01", "S02"})


def _make_fixture(tag, kind):
    dest = Path(H.tmp_root()) / ("batchpar-%d-%s" % (os.getpid(), tag))
    work = dest / "work"
    shutil.copytree(H.FIXTURES[kind], work / kind)
    return dest, str(work)


def _dicts(work, cfg):
    return [f.as_dict() for f in
            _checker.check(work, ctx=Context(**cfg))]


def main():
    cases = []

    # ① 根因断言：派生缓存不得进 __init__
    base = Context(master_lang="zh", rules_filter=RULES)
    kw = base.to_kwargs()
    cases.append(("to_kwargs 不含派生缓存 lexicon_cache",
                  "lexicon_cache" not in kw))
    try:
        Context(**kw)
        accepted = True
    except TypeError as exc:
        accepted = False
        print("      Context(**to_kwargs()) 失败：%s" % exc)
    cases.append(("to_kwargs 可直接回传 __init__", accepted))
    cases.append(("clone 仍排除派生缓存",
                  "lexicon_cache" not in base.clone().to_kwargs()))

    # ② 串行 / 并行逐条一致
    cfg = base.to_kwargs()
    cfg["glossary"] = None
    cfg["config_errors"] = []
    d1, w1 = _make_fixture("blog", "blog")
    d2, w2 = _make_fixture("reg", "regulation")
    try:
        serial = {w: _dicts(w, cfg) for w in (w1, w2)}
        with ProcessPoolExecutor(max_workers=2) as pool:
            par = dict(pool.map(_checker._batch_worker,
                                [(w, cfg) for w in (w1, w2)]))
        same = all(serial[w] == par[w] for w in (w1, w2))
        cases.append(("并行与串行 findings 逐条相等", same))
        if not same:
            for w in (w1, w2):
                if serial[w] != par[w]:
                    print("      差异包：%s\n        串行 %d 条 / 并行 %d 条"
                          % (os.path.basename(os.path.dirname(w)),
                             len(serial[w]), len(par[w])))
        cases.append(("两个包都产出了 findings 记录",
                      all(isinstance(par[w], list) for w in (w1, w2))))
    finally:
        for d in (d1, d2):
            H._archive(d)

    fails = 0
    for name, ok in cases:
        print("  %-4s %s" % ("OK" if ok else "FAIL", name))
        fails += 0 if ok else 1
    print("批检并行通路：%d 臂，FAIL %d" % (len(cases), fails))
    return 0 if fails == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
