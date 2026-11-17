# -*- coding: utf-8 -*-
"""工具级自检臂：v2.28 ar 公告发布机关属格歧义疑点探针（R11）。

对应 `submission-kit/tools/audit_prep.py` 的 `_ar_issuer_obj_hit` /
`_issuer_genitive_probe`。只读疑点，不 emit error，故本臂验证三件事：

1. 注入报红：REG77 / REG81 两次实证的「主动允许动词＋公告号＋لـ＋机关名」
   形状必须命中（含变音符、阿拉伯-印度数字、动词族、机关名族）。
2. 还原转绿：改成标准属格后必须 0 命中。
3. 防误伤存量：已交付 REG75 的被动介词形、非 ar 语向、合法机关介词结构
   不得报疑点——否则探针会在全库审校里制造噪声，逼出假红。

零 IO、零临时文件；直接 `python -u submission-kit/selftest/_audit_issuer_probe.py`。
"""
import sys
from pathlib import Path

KIT = Path(__file__).resolve().parents[1]
for p in (str(KIT), str(KIT / "tools")):
    if p not in sys.path:
        sys.path.insert(0, p)

from audit_prep import _ar_issuer_obj_hit, _issuer_genitive_probe  # noqa: E402

CASES = []


def chk(name, cond):
    CASES.append((name, bool(cond)))


# ---- 1 注入报红（两次实证原句 + 词形族覆盖） ----
REG81_BAD = (
    "يجوز الاستيراد اعتبارًا من اليوم. يُجيز الإعلان رقم 80 "
    "للإدارة العامة للجمارك استيراد الكاجو من الدول الأفريقية."
)
REG77_BAD = (
    "يجيز الإعلان رقم 82 للإدارة العامة للجمارك استيراد "
    "الفواكه المجففة والمكسرات الباكستانية."
)
chk("REG81 原句（يُجيز 带变音符）命中", _ar_issuer_obj_hit(REG81_BAD))
chk("REG77 同族原句（يجيز 无变音符）命中", _ar_issuer_obj_hit(REG77_BAD))
chk("阿拉伯-印度数字 رقم ٨٠ 命中",
    _ar_issuer_obj_hit("يجيز الإعلان رقم ٨٠ للإدارة العامة للجمارك استيراد الكاجو"))
chk("允许动词族 يسمح 命中",
    _ar_issuer_obj_hit("يسمح الإعلان رقم 80 للإدارة العامة للجمارك استيراد الكاجو"))
chk("允许动词族 أجاز 命中",
    _ar_issuer_obj_hit("أجاز الإعلان رقم 80 للإدارة العامة للجمارك استيراد الكاجو"))
chk("机关名族 للهيئة 命中",
    _ar_issuer_obj_hit("يجيز الإعلان رقم 80 للهيئة العامة استيراد الكاجو"))
chk("公告名族 القرار 命中",
    _ar_issuer_obj_hit("يجيز القرار رقم 80 للإدارة العامة استيراد الكاجو"))

# ---- 2 还原转绿（标准属格 = 发布机关作定语） ----
REG81_FIXED = (
    "يجوز الاستيراد اعتبارًا من اليوم. يجيز إعلان الإدارة العامة "
    "للجمارك رقم 80 استيراد الكاجو من الدول الأفريقية."
)
REG77_DELIVERED = (
    "اعتباراً من اليوم يسمح بالاستيراد. يجيز إعلان الإدارة العامة "
    "للجمارك رقم 82 استيراد الفواكه المجففة والمكسرات الباكستانية."
)
chk("REG81 修复后标准属格 0 命中", not _ar_issuer_obj_hit(REG81_FIXED))
chk("REG77 已交付标准属格 0 命中", not _ar_issuer_obj_hit(REG77_DELIVERED))

# ---- 3 防误伤存量 / 语向门 ----
REG75_DELIVERED = (
    "يسمح بالاستيراد اعتبارا من اليوم. بموجب الإعلان رقم 84 "
    "للإدارة العامة للجمارك يسمح باستيراد اللونجان المجفف الكمبودي."
)
chk("REG75 已交付被动介词形 0 命中", not _ar_issuer_obj_hit(REG75_DELIVERED))
chk("合法机关介词结构（动词不在前）0 命中",
    not _ar_issuer_obj_hit("تخطر الإدارة العامة للجمارك الجهات المعنية للإدارة العامة"))
chk("非阿拉伯语文本 0 命中",
    not _ar_issuer_obj_hit("Announcement No. 80 permits imports of cashew nuts"))
chk("探针按语向门：语向集合不含 ar 时不触发",
    _issuer_genitive_probe(Path("/nonexistent"), ["en", "de"], "x") == [])
chk("探针按文件门：ar 语向但缺文件时不触发",
    _issuer_genitive_probe(Path("/nonexistent"), ["ar"], "x") == [])

fails = 0
for name, ok in CASES:
    print("  %-4s %s" % ("OK" if ok else "FAIL", name))
    if not ok:
        fails += 1
print("ar 属格歧义疑点探针：%d 个用例，FAIL %d" % (len(CASES), fails))
raise SystemExit(1 if fails else 0)
