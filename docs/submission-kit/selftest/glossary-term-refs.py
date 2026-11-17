# -*- coding: utf-8 -*-
"""自检：S12 —— 参考文献标题术语契约（题录缺 require 词形）

夹具自带隔离题录契约（zh 锚在母版参考文献标题里定位第几条），不读共享库。
v2.19 起契约支持篇级限定（slug，字符串或列表）：G1 回流（refs:o5-486-issuer
扩 slug 列表 + bg forbid_re）实证三条臂需要覆盖——
  * slug 列表第二元素能激活契约（首元素不匹配时列表不失效）；
  * 锚不在 zh 题录 → 契约整体静默（共享表跨文章安全的另一半；「slug 不匹配
    即静默」由条目目录即 slug 的产品事实保证，art.slug 取目录名，frontmatter
    改 slug 治不了目录名，故不设臂）；
  * forbid_re 在题录层独立生效（与 require["*"] 并集口径解耦，不触发 E3）。
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

GL = {
    "version": "selftest",
    "refs": [{
        "id": "selftest-refs",
        # 锚必须只命中母版第 1 条：官方尺第 2 条题名同样含「进口食品境外生产
        # 企业注册管理规定」，用它做锚会同时锁第 2 条，而第 2 条本来没有文号
        "zh": "海关总署令第 248 号",
        "shared": False,
        "require": {"fr": ["Décret n° 248"]},
    }],
}

TEMPLATE_SLUG = "sample-china-entry-checklist"


def mutate(work):
    # 第一条题录把文号写成泛称：机构归属与法律位阶同时消失
    p = H.lang_file(work, "fr")
    s = Path(p).read_text(encoding="utf-8")
    if "Décret n° 248" not in s:
        raise RuntimeError("注入点不存在：fr 题录没有 Décret n° 248")
    Path(p).write_text(s.replace("Décret n° 248", "Règlement intérieur", 1),
                       encoding="utf-8", newline="\n")


def mutate_zh_anchor_drop(work):
    # zh 第 1 条题录不再含锚短语：契约对整篇静默（共享表跨文章安全）
    p = H.lang_file(work, "zh")
    s = Path(p).read_text(encoding="utf-8")
    if "海关总署令第 248 号" not in s:
        raise RuntimeError("注入点不存在：zh 题录没有锚 海关总署令第 248 号")
    Path(p).write_text(s.replace("海关总署令第 248 号", "另一份进出口文件", 1),
                       encoding="utf-8", newline="\n")


if __name__ == "__main__":
    raise SystemExit(H.main([
        # 原有臂：单语 require 缺词形 → 红
        ("S12", mutate, "fr 题录第一条去掉文号", "blog", "red", GL),
        # v2.19 slug 列表：第二元素激活契约（缺词形仍红）
        ("S12", mutate, "slug 列表第二元素激活 require",
         "blog", "red",
         {"version": "selftest",
          "refs": [{"id": "selftest-refs-multi",
                    "zh": "海关总署令第 248 号",
                    "shared": False,
                    "slug": ["zzz-no-such-slug", TEMPLATE_SLUG],
                    "require": {"fr": ["Décret n° 248"]}}]}),
        # 锚不在 zh 题录 → 契约静默（基线因缺词形红，摘锚转绿）
        ("S12", mutate_zh_anchor_drop, "zh 题录摘锚后契约静默",
         "blog", "green",
         {"version": "selftest",
          "refs": [{"id": "selftest-refs-silent",
                    "zh": "海关总署令第 248 号",
                    "shared": False,
                    "slug": [TEMPLATE_SLUG, "zzz-no-such-slug"],
                    "require": {"fr": ["Décret n° 999"]}}]}),
        # forbid_re：题录命中禁用写法 → 红（与 require["*"] 并集口径解耦，不触发 E3）
        ("S12", mutate, "fr 题录命中 forbid_re 禁用写法",
         "blog", "red",
         {"version": "selftest",
          "refs": [{"id": "selftest-refs-forbid-re",
                    "zh": "海关总署令第 248 号",
                    "shared": False,
                    "slug": TEMPLATE_SLUG,
                    "forbid_re": {"fr": ["Règlement intérieur"]}}]}),
    ]))
