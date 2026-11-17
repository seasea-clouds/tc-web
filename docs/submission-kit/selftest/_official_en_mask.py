# -*- coding: utf-8 -*-
"""工具级自检：官方英文逐字串掩码词表的登记闭环（v331 回流）。

`_` 前缀：`OFFICIAL_EN_LITERALS` 是 core/consts 的数据表，没有独立插件文件，
按 A6/A7 不能占用正名臂；由 `submit.py selftest --kit` 单独计数。

覆盖 REG37（103 号老挝辣椒）实测缺陷：证书附加声明整句未登记进词表时，
`_OFFICIAL_EN_RE` 掩码不覆盖该串，P42 在 hy 语向把串末 ASCII 句点判成
亚美尼亚文句末句点（error），P30 在 9 个非拉丁语向报假阳 warning。
官方串受 S08 verbatim 保护，不能改稿了事，只能按缺陷族整串登记。

后续按缺陷族扩臂：REG70（22 号乌拉圭碧根果，串内分句点）、
REG75（84 号柬埔寨龙眼干，句首 The consignment + requirement 单数，
与 REG39 柬埔寨菠萝蜜同国不同商品）、REG77（82 号巴基斯坦干坚果，
串内双句 + 与 REG27 西班牙开心果/REG70 碧根果同族不同商品）。
每篇新声明整串都要有「登记 + 完整匹配 + 与形近串分别立目 +
hy 掩码生效 + 负向报红」五道断言。

双向断言：① 登记后掩码生效、hy 不报红；② 形近但未登记的串会报红
（负向对照，证明防线确实依赖这条登记，而非别的豁免偶然放过）。
只读常量与共享匹配函数，不建官方尺副本、不改线上契约。
"""
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_KIT = os.path.dirname(_HERE)
sys.path.insert(0, _KIT)

from core.consts.claims import OFFICIAL_EN_LITERALS, _OFFICIAL_EN_RE  # noqa: E402
from plugins._lang import _p42_hy_ascii_periods                        # noqa: E402

REG37_DECL = (
    "This consignment complies with the requirements specified in the "
    "Protocol of Phytosanitary Requirements for Export of chilies from "
    "Lao PDR to China, and is free from quarantine pests of concern to China."
)

# REG70（22 号乌拉圭碧根果）实测：B32 证书附加声明整句未登记时，hy 的 P42
# 把串内分句点「…by Uruguay and China. The consignment…」判成亚美尼亚文句末
# ASCII 句点（cv422 单篇 check 1 error）。官方串逐字受 S08 verbatim 保护，
# 不得改稿，只能按缺陷族整串登记。与 REG27 的 The batch of pistachios /
# dried figs 两串同族但商品名不同，必须另立条目（v2.13 教训）。
REG70_DECL = (
    "The batch of pecan nuts certified by this phytosanitary certificate "
    "complies with the provisions of the Protocol on Inspection, Quarantine "
    "and Sanitary Requirements for Pecan Nuts to Be Exported from Uruguay to "
    "China signed on February 3th, 2026, by Uruguay and China. The consignment "
    "is free from Trogoderma granarium Everts, Pestalotiopsis clavispora, "
    "Phytophthora cactorum and other quarantine pests of concern to the "
    "Chinese side."
)

# REG75（84 号柬埔寨龙眼干）：与 REG39（110 号柬埔寨鲜食菠萝蜜）同国，
# 但商品名 Dried Longan≠Fresh Jackfruits、议定书名 Inspection/Quarantine/
# Sanitary Requirements≠Phytosanitary Requirements、句首 The≠This、
# requirement 单数≠requirements 复数。按 v2.13 教训另立整串条目。
REG75_DECL = (
    "The consignment complies with the requirement specified in the "
    "Protocol of Inspection, Quarantine and Sanitary Requirements for "
    "Dried Longan Exported from Cambodia to China, and is free from "
    "quarantine pests of concern to China."
)

# REG77（82 号巴基斯坦干坚果）：与 REG27（55 号西班牙开心果/无花果干）
# The batch of pistachios / dried figs 双串、REG70（22 号乌拉圭碧根果）
# 同属 Protocol on Inspection, Quarantine and Sanitary Requirements 族，
# 但商品名 Dried Fruits and Nuts、国别 Pakistan、签署日 May 25th, 2026
# in Beijing、结尾 by the Chinese Party. 四项全不同。串内含两个句子，
# 按 v2.13 教训另立整串条目，不并入跨句掩码。
REG77_DECL = (
    "The dried fruits and nuts certified by this phytosanitary certificate "
    "comply with the provisions of the Protocol on Inspection, Quarantine "
    "and Sanitary Requirements for Dried Fruits and Nuts to Be Exported "
    "from Pakistan to China signed on May 25th, 2026 in Beijing by Pakistan "
    "and China. The dried fruits and nuts are free from quarantine pests "
    "of concern by the Chinese Party."
)

# REG78（1 号法国苜蓿草）两条证书声明 + 包装标识。植物检疫证书声明句首虽为
# This consignment，但议定书名是 Protocol on the sanitary and phytosanitary
# requirements for the export of alfalfa from France to China（小写起头、
# requirements 词序），结尾 free of any pest of concern for China（of/for），
# 与库内全部声明串不同形。卫生证书声明句首 Does not contain、串内 China's
# 用 ASCII 撇号（官方 .doc 原始 UTF-16LE 实证）。包装标识是 export 无 -ed 的
# 短串，与五种既有 People's Republic of China 前缀形均不同。
# 未登记时 hy 语向 P42 把串末 ASCII 句点判成亚美尼亚文句末句点，非拉丁语向
# 撞 P30 假阳；官方串受 S08 verbatim 保护，只能按缺陷族整串登记。
REG78_DECL_PHYTO = (
    "This consignment complies with the Protocol on the sanitary and "
    "phytosanitary requirements for the export of alfalfa from France to "
    "China, and is free of any pest of concern for China."
)

REG78_DECL_SAN = (
    "Does not contain any hazardous substances that pose a risk to public "
    "or animal health and complies with China's safety and hygiene "
    "standards, does not contain GMOs that are not authorized by China."
)

REG78_LABEL = "Alfalfa from France export to the People's Republic of China"

# REG80（80 号非洲腰果）：与 REG18 非洲**可可豆**串仅商品名 Cocoa Beans→Nuts
# 一处之差，其余逐字相同。这是掩码表里最容易被误合并的一对——按 v2.13 教训
# 必须另立整串条目：掩码逐串剥离，若靠通配放行，尚未登记的新商品名会一并
# 免检，等于拆掉 P30/P42 的防线。未登记时 hy 语向 P42 把串末 ASCII 句点判成
# 亚美尼亚文句末句点，非拉丁语向撞 P30 假阳。
REG80_DECL = (
    "This consignment complies with Phytosanitary Requirements for Export "
    "of Nuts from Africa to China, and is free from quarantine pests of "
    "concern to China."
)

REG18_DECL_COCOA = (
    "This consignment complies with Phytosanitary Requirements for Export "
    "of Cocoa Beans from Africa to China, and is free from quarantine pests "
    "of concern to China."
)


def _hy_with(decl):
    """SPEC 规定的非拉丁语向形态：官方串放在引号内且引号内侧各留一空格。"""
    return ("Լրացուցիչ հայտարարություն « %s » "
            "(այս խմբաքանակը համապատասխանում է պահանջներին)։" % decl)


def main():
    cases = []

    def chk(name, ok):
        cases.append((name, bool(ok)))

    # ① 整串登记（不是形近串合并、不是按篇白名单）
    chk("REG37 声明整句在 OFFICIAL_EN_LITERALS", REG37_DECL in OFFICIAL_EN_LITERALS)
    chk("_OFFICIAL_EN_RE 能整串匹配", bool(_OFFICIAL_EN_RE.fullmatch(REG37_DECL)))

    # ② 登记后：hy 的 ASCII 句点被官方串掩码吃掉，不报红
    hits = _p42_hy_ascii_periods(_hy_with(REG37_DECL))
    chk("hy 官方串句点被掩码（0 命中）", not hits)

    # ③ 负向对照：只换掉商品名/国别组合（变成未登记的形近串），句点应报红
    fake = REG37_DECL.replace("chilies from Lao PDR", "widgets from Nowhere")
    chk("负向串确实未登记", fake not in OFFICIAL_EN_LITERALS)
    fake_hits = _p42_hy_ascii_periods(_hy_with(fake))
    chk("未登记形近串的句点报红（>=1 命中）", bool(fake_hits))

    # ④ 形近串不得被合并：REG39（柬埔寨菠萝蜜）与本篇是不同整句
    chk("REG39 整句另立条目",
        any("Fresh Jackfruits from Cambodia" in s for s in OFFICIAL_EN_LITERALS))

    # ⑤ REG70（22 号乌拉圭碧根果）：整串登记 + 掩码生效（分句点不判红）
    chk("REG70 声明整句在 OFFICIAL_EN_LITERALS", REG70_DECL in OFFICIAL_EN_LITERALS)
    chk("REG70 整串可被 _OFFICIAL_EN_RE 完整匹配",
        bool(_OFFICIAL_EN_RE.fullmatch(REG70_DECL)))
    chk("REG70 与 REG27 同族声明分别整串登记（未合并）",
        sum("The batch of" in s and "certified by" in s
            for s in OFFICIAL_EN_LITERALS) >= 3)
    chk("REG70 hy 官方串内分句点被掩码（0 命中）",
        not _p42_hy_ascii_periods(_hy_with(REG70_DECL)))
    # ⑥ 负向对照：换商品名/国别成未登记形近串，分句点仍须报红
    fake70 = REG70_DECL.replace("Pecan Nuts to Be Exported from Uruguay",
                                "Cashew Nuts to Be Exported from Nowhere")
    chk("REG70 负向串确实未登记", fake70 not in OFFICIAL_EN_LITERALS)
    chk("REG70 未登记形近串的分句点仍报红",
        bool(_p42_hy_ascii_periods(_hy_with(fake70))))

    # ⑦ REG75（84 号柬埔寨龙眼干）：整串登记 + 掩码生效 + 与 REG39 分别立目
    chk("REG75 声明整句在 OFFICIAL_EN_LITERALS", REG75_DECL in OFFICIAL_EN_LITERALS)
    chk("REG75 整串可被 _OFFICIAL_EN_RE 完整匹配",
        bool(_OFFICIAL_EN_RE.fullmatch(REG75_DECL)))
    chk("REG75 与 REG39 同国不同商品，两条整串分别登记（未合并）",
        any("Dried Longan Exported from Cambodia" in s
            for s in OFFICIAL_EN_LITERALS)
        and any("Fresh Jackfruits from Cambodia" in s
                for s in OFFICIAL_EN_LITERALS))
    chk("REG75 hy 官方串末 ASCII 句点被掩码（0 命中）",
        not _p42_hy_ascii_periods(_hy_with(REG75_DECL)))
    # ⑧ 负向对照：换商品名/国别成未登记形近串，句点仍须报红
    fake75 = REG75_DECL.replace("Dried Longan Exported from Cambodia",
                                "Dried Mango Exported from Nowhere")
    chk("REG75 负向串确实未登记", fake75 not in OFFICIAL_EN_LITERALS)
    chk("REG75 未登记形近串的句点仍报红",
        bool(_p42_hy_ascii_periods(_hy_with(fake75))))

    # ⑨ REG77（82 号巴基斯坦干坚果）：双句整串登记 + 掩码生效 + 与 REG27/REG70 分别立目
    chk("REG77 声明整句在 OFFICIAL_EN_LITERALS", REG77_DECL in OFFICIAL_EN_LITERALS)
    chk("REG77 整串可被 _OFFICIAL_EN_RE 完整匹配",
        bool(_OFFICIAL_EN_RE.fullmatch(REG77_DECL)))
    chk("REG77 串内确有两个句子（分句点存在）", REG77_DECL.count(".") == 2)
    chk("REG77 与 REG27 / REG70 同族不同商品，三条整串分别登记（未合并）",
        any("Dried Fruits and Nuts to Be Exported from Pakistan" in s
            for s in OFFICIAL_EN_LITERALS)
        and any("The batch of pistachios certified" in s
                for s in OFFICIAL_EN_LITERALS)
        and any("The batch of pecan nuts certified" in s
                for s in OFFICIAL_EN_LITERALS))
    chk("REG77 hy 官方串内分句点与串末句点均被掩码（0 命中）",
        not _p42_hy_ascii_periods(_hy_with(REG77_DECL)))
    # ⑩ 负向对照：换商品名/国别成未登记形近串，句点仍须报红
    fake77 = REG77_DECL.replace("Dried Fruits and Nuts to Be Exported from Pakistan",
                                "Dried Nuts to Be Exported from Nowhere")
    chk("REG77 负向串确实未登记", fake77 not in OFFICIAL_EN_LITERALS)
    chk("REG77 未登记形近串的句点仍报红",
        bool(_p42_hy_ascii_periods(_hy_with(fake77))))

    # ⑪ REG78（1 号法国苜蓿草）：两条证书声明 + 包装标识三条整串分别登记。
    # 植物检疫证书声明虽句首 This consignment，但议定书名与结尾 of/for 均不同
    # 形；卫生证书声明句首 Does not contain、串内 China's 为 ASCII 撇号；
    # 包装标识是 export 无 -ed 的短串。三条各须整串登记、掩码生效、负向报红。
    chk("REG78 植物检疫证书声明整句在 OFFICIAL_EN_LITERALS",
        REG78_DECL_PHYTO in OFFICIAL_EN_LITERALS)
    chk("REG78 植物检疫证书声明整串可被 _OFFICIAL_EN_RE 完整匹配",
        bool(_OFFICIAL_EN_RE.fullmatch(REG78_DECL_PHYTO)))
    chk("REG78 卫生证书声明整句在 OFFICIAL_EN_LITERALS",
        REG78_DECL_SAN in OFFICIAL_EN_LITERALS)
    chk("REG78 卫生证书声明整串可被 _OFFICIAL_EN_RE 完整匹配",
        bool(_OFFICIAL_EN_RE.fullmatch(REG78_DECL_SAN)))
    chk("REG78 卫生证书声明串内是 ASCII 撇号（非 U+2019）",
        "China's" in REG78_DECL_SAN
        and "China\u2019s" not in REG78_DECL_SAN)
    chk("REG78 包装标识整串在 OFFICIAL_EN_LITERALS",
        REG78_LABEL in OFFICIAL_EN_LITERALS)
    chk("REG78 包装标识整串可被 _OFFICIAL_EN_RE 完整匹配",
        bool(_OFFICIAL_EN_RE.fullmatch(REG78_LABEL)))
    chk("REG78 三条整串分别登记（未合并成跨句掩码）",
        REG78_DECL_PHYTO != REG78_DECL_SAN
        and REG78_DECL_PHYTO != REG78_LABEL
        and REG78_DECL_SAN != REG78_LABEL)
    chk("REG78 植物检疫证书声明 hy 句点被掩码（0 命中）",
        not _p42_hy_ascii_periods(_hy_with(REG78_DECL_PHYTO)))
    chk("REG78 卫生证书声明 hy 句点被掩码（0 命中）",
        not _p42_hy_ascii_periods(_hy_with(REG78_DECL_SAN)))
    # ⑫ 负向对照：换商品名/国别或 GMOs 成未登记形近串，句点仍须报红
    fake78a = REG78_DECL_PHYTO.replace("alfalfa from France",
                                       "alfalfa pellets from Nowhere")
    chk("REG78 植物检疫声明负向串确实未登记",
        fake78a not in OFFICIAL_EN_LITERALS)
    chk("REG78 植物检疫声明未登记形近串的句点仍报红",
        bool(_p42_hy_ascii_periods(_hy_with(fake78a))))
    fake78b = REG78_DECL_SAN.replace("GMOs", "feed additives")
    chk("REG78 卫生证书声明负向串确实未登记",
        fake78b not in OFFICIAL_EN_LITERALS)
    chk("REG78 卫生证书声明未登记形近串的句点仍报红",
        bool(_p42_hy_ascii_periods(_hy_with(fake78b))))
    # 标识串形近负向：export→exported 即未登记（证明逐字登记而非模糊族）
    # ⑫ REG80（80 号非洲腰果）：与 REG18 可可豆串仅一词之差，必须分别立目
    chk("REG80 声明整句在 OFFICIAL_EN_LITERALS", REG80_DECL in OFFICIAL_EN_LITERALS)
    chk("REG80 整串可被 _OFFICIAL_EN_RE 完整匹配",
        bool(_OFFICIAL_EN_RE.fullmatch(REG80_DECL)))
    chk("REG80 与 REG18 可可豆串分别登记（未合并、未通配）",
        REG80_DECL != REG18_DECL_COCOA
        and REG80_DECL in OFFICIAL_EN_LITERALS
        and REG18_DECL_COCOA in OFFICIAL_EN_LITERALS
        and REG80_DECL.replace("Nuts", "Cocoa Beans") == REG18_DECL_COCOA)
    chk("REG80 hy 官方串末 ASCII 句点被掩码（0 命中）",
        not _p42_hy_ascii_periods(_hy_with(REG80_DECL)))
    # 负向对照：换商品名成未登记形近串，句点仍须报红
    fake80 = REG80_DECL.replace("of Nuts from Africa", "of Sesame from Africa")
    chk("REG80 负向串确实未登记", fake80 not in OFFICIAL_EN_LITERALS)
    chk("REG80 未登记形近串的句点仍报红",
        bool(_p42_hy_ascii_periods(_hy_with(fake80))))

    fake78c = REG78_LABEL.replace("export", "exported")
    chk("REG78 标识 export→exported 形近串确实未登记",
        fake78c not in OFFICIAL_EN_LITERALS)

    fails = 0
    for name, ok in cases:
        print("  %-4s %s" % ("OK" if ok else "FAIL", name))
        if not ok:
            fails += 1
    print("官方英文串掩码：%d 个用例，FAIL %d" % (len(cases), fails))
    return 0 if not fails else 1


if __name__ == "__main__":
    raise SystemExit(main())
