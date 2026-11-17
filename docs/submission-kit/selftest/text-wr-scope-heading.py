# -*- coding: utf-8 -*-
"""自检：WR01 —— 禁写范围声明小节

夹具自带一条 heading 契约（langs="*"），不读共享库：writing 段是篇级编排约定，
线上 6 条契约按已交付篇目登记，自检不该借用也不该改动它们。
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402

GL = {
    "version": "selftest",
    "writing": [{
        "id": "selftest-wr-scope",
        "rule": "WR01",
        "scope": "heading",
        "langs": "*",
        "level": "error",
        "patterns": {"*": ["ne couvre pas"]},
    }],
}


def mutate(work):
    # 加一个小节，标题自我声明「不覆盖什么」——母版里这种小节一律不许存在
    p = H.lang_file(work, "fr")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\n## Ce que ce guide ne couvre pas\n\nLes cas particuliers.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([("WR01", mutate, "fr 加范围声明小节", "blog", "red", GL)]))
