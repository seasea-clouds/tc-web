# -*- coding: utf-8 -*-
"""工具级自检：P77 日期月份豁免的「只减月份」边界（v468 REG91 回流）。

`_` 前缀：这条防线挂在 `plugins/text-reg-interpret-layer.py`，正名臂
`selftest/text-reg-interpret-layer.py` 已验证压缩形状在官方尺上报红；
本臂补的是**豁免不能放宽**：月份可以写成月名词形，年 / 日 / 非日期数字
一个都不能跟着掉。

覆盖 REG91（GACC 公告 255）实测：中文首段「2025 年 12 月 25 日」，40 多个
语向按本语习惯写「25 December 2025」，P77 把月份 12 当硬锚，一篇报 44 条
warning，全是同一形状假阳；P62 早已定「月份是词形，不判」。

五向断言：
  ① 年月日 + 月名词形：只缺月份 → 不报；
  ② 同块年份被压掉 → 仍报（年仍是硬锚）；
  ③ 同块日期整条被压掉 → 年月日三个锚全报；
  ④ 非日期数字（「共 12 项」）丢成数词 → 仍报（豁免只认日期写法）；
  ⑤ ISO 写法 `2025-12-25` 同样只豁免月份。
"""
import importlib.util
import os


_HERE = os.path.dirname(os.path.abspath(__file__))
_KIT = os.path.dirname(_HERE)


def _load_plugin():
    path = os.path.join(_KIT, "plugins", "text-reg-interpret-layer.py")
    spec = importlib.util.spec_from_file_location("_p77_probe", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


ZH_CN = "本公告自 2025 年 12 月 25 日起施行，电子版与纸质版并行。"
ZH_ISO = "本公告自 2025-12-25 起施行，电子版与纸质版并行。"
ZH_OTHER = "本清单共 12 项措施，企业应按项核对。"


def main():
    p77 = _load_plugin()
    miss = p77._missing_anchors
    cases = []

    def chk(name, ok):
        cases.append((name, bool(ok)))

    # ① 月份写成月名词形：只丢 12，年与日都在
    chk("月名词形日期不报（只缺月份）",
        miss(ZH_CN, "This announcement takes effect on 25 December 2025, "
                    "with paper and electronic versions in parallel.") == [])

    # ② 年份被压掉：年仍是硬锚
    chk("年份丢失仍报",
        "2025" in miss(ZH_CN, "This announcement takes effect on 25 December, "
                              "with paper and electronic versions in parallel."))

    # ③ 日期整条被压掉：年与日仍报（月份按豁免规则不参与）
    got = miss(ZH_CN, "This announcement takes effect on publication.")
    chk("日期整条丢失：年与日两个硬锚都在",
        {"2025", "25"} <= set(got))

    # ④ 非日期数字不享受豁免
    chk("非日期数字 12 丢成数词仍报",
        miss(ZH_OTHER, "The list covers twelve measures; companies should "
                       "check each one.") == ["12"])

    # ⑤ ISO 写法：同样只豁免月份
    chk("ISO 日期只豁免月份",
        miss(ZH_ISO, "This announcement takes effect on 25 December 2025.") == [])
    chk("ISO 日期年份丢失仍报",
        "2025" in miss(ZH_ISO, "This announcement takes effect on 25 December."))

    fails = 0
    for name, ok in cases:
        print("  %-4s %s" % ("OK" if ok else "FAIL", name))
        if not ok:
            fails += 1
    print("P77 日期月份豁免边界：%d 个用例，FAIL %d" % (len(cases), fails))
    return 0 if not fails else 1


if __name__ == "__main__":
    raise SystemExit(main())
