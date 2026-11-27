# -*- coding: utf-8 -*-
"""自检：P60 —— 引号/括号配对与方向"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _harness as H                                     # noqa: E402


def mutate_de_ascii_close(work):
    # „ 开 + ASCII " 闭：闭引号跨族（应为 “）
    p = H.lang_file(work, "de")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + '\n\nDer Antrag heißt „Registrierung" im Formular.\n')


def mutate_fr_guillemet_mismatch(work):
    # « 开而无 » 闭：全文开/闭计数不等
    p = H.lang_file(work, "fr", kind="regulation")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\n«Bonjour au revoir.\n")


def mutate_fr_wrong_close(work):
    # « 开而闭引号写成 ”（错族）
    p = H.lang_file(work, "fr", kind="regulation")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\n«Bonjour ” au revoir.\n")


def mutate_ar_bracket_unbalanced(work):
    # RTL 语向括号缺配：( 无 )
    p = H.lang_file(work, "ar", kind="regulation")
    H.write_body(p, H.body_of(p).rstrip("\n")
                 + "\n\n(طلب التسجيل لدى السلطة المختصة.\n")


if __name__ == "__main__":
    raise SystemExit(H.main([
        ("P60", mutate_de_ascii_close, "de „ 用 ASCII 直引号闭"),
        ("P60", mutate_fr_guillemet_mismatch,
         "fr « 无 » 闭，开闭锁计数不等", "regulation"),
        ("P60", mutate_fr_wrong_close,
         "fr « 误用 ” 闭引号", "regulation"),
        ("P60", mutate_ar_bracket_unbalanced,
         "ar RTL 正文括号未配平", "regulation"),
    ]))
