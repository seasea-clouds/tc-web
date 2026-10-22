#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
submitter_check.py — 博客投稿包自检与打包工具 (v1.14)

用法:
    python3 submitter_check.py <package.zip | 目录>
    python3 submitter_check.py <package.zip> --json
    python3 submitter_check.py <package.zip> --quiet
    python3 submitter_check.py <package.zip> --no-parity   # 跳过跨语言一致性（P/L06）
    python3 submitter_check.py <package.zip> --master=zh   # 指定跨语言比对基准（默认中文优先）
    python3 submitter_check.py <draft.md> --body [--until=<标记>]   # 单篇草稿只跑 ST 写作纪律
    python3 submitter_check.py <目录> --pack[=输出.zip]    # 检查通过后由本脚本打包（0 error 才出 zip）

退出码: 0 = 通过(无 error)；1 = 存在 error（需返工）

只依赖 Python 3.8+ 标准库，不需要安装任何包。
规则编号与 SPEC.md 对应；ST 系列 = 写作声音纪律（v1.1）；
P 系列 = 48 语言 QA 回填的跨语言一致性与文本健壮性检查（v1.2）；
--pack = 检查通过后由本脚本完成 zip 打包，剔除垃圾文件（v1.3）；
L07/L08 与 P14–P17 = 第二轮全量复检回填（标题/参考未翻译、隐形字符、
标点前空格、标记配对、重复句，v1.4）；
P18–P20 = 第三轮复检回填（配图顺序、事实编号、关键代码跨语言一致性，v1.5）；
P21/P22 = 第四轮复检回填（分节列表项数、正文块顺序跨语言一致性，v1.6）；
W02 = 段落长度阈值按文字系统分档（拉丁 400 / 中日韩 340 / 泰文等 300 字符）；
基准语言 = 中文优先（--master=<lang> 可指定），P23 = 逐块一一对应，
P24-P29 = 表格几何 / 列表标记 / 行内强调 / 链接目标 / frontmatter 结构 /
链接语言前缀的跨语言一致性；P30 = 非拉丁语言正文夹用英文原词；P31 = 术语本地化映射表检查；P32 = 金额只允许「元」与「美元」（v1.11）；
P33 = 金额不得用货币符号或 ISO 代码，只能写「元」「美元」的文字写法（v1.12）；
数字词表（中文「十四」↔ 英文 fourteen，v1.7 起内嵌）；
P31 增加 Mode 1210 术语（监管方式代码必须用本土说法，v1.13）；
P08 放行「编号/俗称 + 连字符 + 本地格后缀」（S1-ից、ל-US、blue hat-ის），
P10 加重叠副词白名单（tr ayrı ayrı 等词典化副词，站方改法用语，v1.14）。
"""

import io
import json
import os
import re

NUMBER_WORDS = {
    "en": {3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight",
           9: "nine", 10: "ten", 11: "eleven", 12: "twelve", 13: "thirteen",
           14: "fourteen", 15: "fifteen", 16: "sixteen", 17: "seventeen",
           18: "eighteen", 19: "nineteen", 20: "twenty", 30: "thirty",
           40: "forty", 50: "fifty", 60: "sixty", 70: "seventy",
           80: "eighty", 90: "ninety", 100: "hundred"},
    "de": {3: "drei", 4: "vier", 5: "fünf", 6: "sechs", 7: "sieben",
           8: "acht", 9: "neun", 10: "zehn", 11: "elf", 12: "zwölf",
           13: "dreizehn", 14: "vierzehn", 15: "fünfzehn", 16: "sechzehn",
           17: "siebzehn", 18: "achtzehn", 19: "neunzehn", 20: "zwanzig",
           30: "dreißig", 40: "vierzig", 50: "fünfzig", 60: "sechzig",
           70: "siebzig", 80: "achtzig", 90: "neunzig", 100: "hundert"},
    "es": {3: "tres", 4: "cuatro", 5: "cinco", 6: "seis", 7: "siete",
           8: "ocho", 9: "nueve", 10: "diez", 11: "once", 12: "doce",
           13: "trece", 14: "catorce", 15: "quince", 16: "dieciséis",
           17: "diecisiete", 18: "dieciocho", 19: "diecinueve",
           20: "veinte", 30: "treinta", 40: "cuarenta", 50: "cincuenta",
           60: "sesenta", 70: "setenta", 80: "ochenta", 90: "noventa",
           100: "cien"},
    "fr": {3: "trois", 4: "quatre", 5: "cinq", 6: "six", 7: "sept",
           8: "huit", 9: "neuf", 10: "dix", 11: "onze", 12: "douze",
           13: "treize", 14: "quatorze", 15: "quinze", 16: "seize",
           17: "dix-sept", 18: "dix-huit", 19: "dix-neuf", 20: "vingt",
           30: "trente", 40: "quarante", 50: "cinquante", 60: "soixante",
           70: "soixante-dix", 80: "quatre-vingts", 90: "quatre-vingt-dix",
           100: "cent"},
    "it": {3: "tre", 4: "quattro", 5: "cinque", 6: "sei", 7: "sette",
           8: "otto", 9: "nove", 10: "dieci", 11: "undici", 12: "dodici",
           13: "tredici", 14: "quattordici", 15: "quindici", 16: "sedici",
           17: "diciassette", 18: "diciotto", 19: "diciannove", 20: "venti",
           30: "trenta", 40: "quaranta", 50: "cinquanta", 60: "sessanta",
           70: "settanta", 80: "ottanta", 90: "novanta", 100: "cento"},
    "nl": {3: "drie", 4: "vier", 5: "vijf", 6: "zes", 7: "zeven",
           8: "acht", 9: "negen", 10: "tien", 11: "elf", 12: "twaalf",
           13: "dertien", 14: "veertien", 15: "vijftien", 16: "zestien",
           17: "zeventien", 18: "achttien", 19: "negentien", 20: "twintig",
           30: "dertig", 40: "veertig", 50: "vijftig", 60: "zestig",
           70: "zeventig", 80: "tachtig", 90: "negentig", 100: "honderd"},
    "pt": {3: "três", 4: "quatro", 5: "cinco", 6: "seis", 7: "sete",
           8: "oito", 9: "nove", 10: "dez", 11: "onze", 12: "doze",
           13: "treze", 14: "catorze", 15: "quinze", 16: "dezasseis",
           17: "dezassete", 18: "dezoito", 19: "dezanove", 20: "vinte",
           30: "trinta", 40: "quarenta", 50: "cinquenta", 60: "sessenta",
           70: "setenta", 80: "oitenta", 90: "noventa", 100: "cem"},
    "ru": {3: "три", 4: "четыре", 5: "пять", 6: "шесть", 7: "семь",
           8: "восемь", 9: "девять", 10: "десять", 11: "одиннадцать",
           12: "двенадцать", 13: "тринадцать", 14: "четырнадцать",
           15: "пятнадцать", 16: "шестнадцать", 17: "семнадцать",
           18: "восемнадцать", 19: "девятнадцать", 20: "двадцать",
           30: "тридцать", 40: "сорок", 50: "пятьдесят", 60: "шестьдесят",
           70: "семьдесят", 80: "восемьдесят", 90: "девяносто",
           100: "сто"},
    "tr": {3: "üç", 4: "dört", 5: "beş", 6: "altı", 7: "yedi", 8: "sekiz",
           9: "dokuz", 10: "on", 11: "on bir", 12: "on iki", 13: "on üç",
           14: "on dört", 15: "on beş", 16: "on altı", 17: "on yedi",
           18: "on sekiz", 19: "on dokuz", 20: "yirmi", 30: "otuz",
           40: "kırk", 50: "elli", 60: "altmış", 70: "yetmiş", 80: "seksen",
           90: "doksan", 100: "yüz"},
    "ar": {3: "ثلاثة", 4: "أربعة", 5: "خمسة", 6: "ستة", 7: "سبعة",
           8: "ثمانية", 9: "تسعة", 10: "عشرة", 11: "أحد عشر",
           12: "اثنا عشر", 13: "ثلاثة عشر", 14: "أربعة عشر",
           15: "خمسة عشر", 16: "ستة عشر", 17: "سبعة عشر",
           18: "ثمانية عشر", 19: "تسعة عشر", 20: "عشرون", 30: "ثلاثون",
           40: "أربعون", 50: "خمسون", 60: "ستون", 70: "سبعون",
           80: "ثمانون", 90: "تسعون", 100: "مائة"},
    "fa": {3: "سه", 4: "چهار", 5: "پنج", 6: "شش", 7: "هفت", 8: "هشت",
           9: "نه", 10: "ده", 11: "یازده", 12: "دوازده", 13: "سیزده",
           14: "چهارده", 15: "پانزده", 16: "شانزده", 17: "هفده",
           18: "هجده", 19: "نوزده", 20: "بیست", 30: "سی", 40: "چهل",
           50: "پنجاه", 60: "شصت", 70: "هفتاد", 80: "هشتاد",
           90: "نود", 100: "صد"},
    "ko": {3: "세", 4: "네", 5: "다섯", 6: "여섯", 7: "일곱", 8: "여덟",
           9: "아홉", 10: "열", 11: "열하나", 12: "열둘", 13: "열셋",
           14: "열넷", 15: "열다섯", 16: "열여섯", 17: "열일곱",
           18: "열여덟", 19: "열아홉", 20: "스물", 30: "서른",
           40: "마흔", 50: "쉰", 60: "예순", 70: "일흔", 80: "여든",
           90: "아흔", 100: "백"},
    "ja": {3: "三", 4: "四", 5: "五", 6: "六", 7: "七", 8: "八", 9: "九",
           10: "十", 11: "十一", 12: "十二", 13: "十三", 14: "十四",
           15: "十五", 16: "十六", 17: "十七", 18: "十八", 19: "十九",
           20: "二十", 30: "三十", 40: "四十", 50: "五十", 60: "六十",
           70: "七十", 80: "八十", 90: "九十", 100: "百"},
    "zh": {3: "三", 4: "四", 5: "五", 6: "六", 7: "七", 8: "八", 9: "九",
           10: "十", 11: "十一", 12: "十二", 13: "十三", 14: "十四",
           15: "十五", 16: "十六", 17: "十七", 18: "十八", 19: "十九",
           20: "二十", 30: "三十", 40: "四十", 50: "五十", 60: "六十",
           70: "七十", 80: "八十", 90: "九十", 100: "百"},
    "hi": {3: "तीन", 4: "चार", 5: "पाँच", 6: "छह", 7: "सात", 8: "आठ",
           9: "नौ", 10: "दस", 11: "ग्यारह", 12: "बारह", 13: "तेरह",
           14: "चौदह", 15: "पंद्रह", 16: "सोलह", 17: "सत्रह",
           18: "अठारह", 19: "उन्नीस", 20: "बीस", 30: "तीस",
           40: "चालीस", 50: "पचास", 60: "साठ", 70: "सत्तर", 80: "अस्सी",
           90: "नब्बे", 100: "सौ"},
    "bn": {3: "তিন", 4: "চার", 5: "পাঁচ", 6: "ছয়", 7: "সাত", 8: "আট",
           9: "নয়", 10: "দশ", 11: "এগারো", 12: "বারো", 13: "তেরো",
           14: "চৌদ্দ", 15: "পনেরো", 16: "ষোলো", 17: "সতেরো",
           18: "আঠারো", 19: "উনিশ", 20: "বিশ", 30: "ত্রিশ",
           40: "চল্লিশ", 50: "পঞ্চাশ", 60: "ষাট", 70: "সত্তর",
           80: "আশি", 90: "নব্বই", 100: "একশ"},
    "ne": {3: "तीन", 4: "चार", 5: "पाँच", 6: "छ", 7: "सात", 8: "आठ",
           9: "नौ", 10: "दस", 11: "ग्यारह", 12: "बाह्र", 13: "तेह्र",
           14: "चौध", 15: "पन्ध्र", 16: "सोध्र", 17: "सत्रह",
           18: "अठारह", 19: "उन्नीस", 20: "बीस", 30: "तीस",
           40: "चालीस", 50: "पचास", 60: "साठ", 70: "सत्तर", 80: "अस्सी",
           90: "नब्बे", 100: "सय"},
    "ur": {3: "تین", 4: "چار", 5: "پانچ", 6: "چھ", 7: "سات", 8: "آٹ",
           9: "نو", 10: "دس", 11: "گیارہ", 12: "بارہ", 13: "تیرہ",
           14: "چودہ", 15: "پندرہ", 16: "سولہ", 17: "سترہ",
           18: "اٹھارہ", 19: "انیس", 20: "بیس", 30: "تیس",
           40: "چالیس", 50: "پچاس", 60: "ساٹھ", 70: "ستر",
           80: "اسی", 90: "نوے", 100: "سو"},
    "si": {3: "තුන", 4: "හතර", 5: "පහ", 6: "හය", 7: "හත", 8: "අට",
           9: "නව", 10: "දහ", 11: "එක් දහ", 12: "දෙක දහ",
           13: "තුන දහ", 14: "හතර දහ", 15: "පහ දහ",
           16: "හය දහ", 17: "හත දහ", 18: "අට දහ",
           19: "නව දහ", 20: "විස", 30: "තිස", 40: "සත",
           50: "පනහ", 60: "සන", 70: "සත දහ", 80: "අංක",
           90: "අනව", 100: "සිය"},
    "th": {3: "สาม", 4: "สี่", 5: "ห้า", 6: "หก", 7: "เจ็ด", 8: "แปด",
           9: "เก้า", 10: "สิบ", 11: "สิบเอ็ด", 12: "สิบสอง",
           13: "สิบสาม", 14: "สิบสี่", 15: "สิบห้า", 16: "สิบหก",
           17: "สิบเจ็ด", 18: "สิบแปด", 19: "สิบเก้า", 20: "ยี่สิบ",
           30: "สามสิบ", 40: "สี่สิบ", 50: "ห้าสิบ", 60: "หกสิบ",
           70: "เจ็ดสิบ", 80: "แปดสิบ", 90: "เก้าสิบ", 100: "ร้อย"},
    "ka": {3: "სამი", 4: "ოთხ", 5: "ხუთი", 6: "ექვსი", 7: "შვიდი",
           8: "რვა", 9: "ცხრა", 10: "ათი", 11: "ეთრუმტყემეტი",
           12: "თორმეტი", 13: "ცამეტი", 14: "თოთხმეტი",
           15: "თხუთმეტი", 16: "თექვმეტი", 17: "მეთვრმეტი",
           18: "მეცამეტი", 19: "მეცხრემეტი", 20: "ოცი",
           30: "სამცდომეტი", 40: "ოცდა", 50: "ორცდა",
           60: "სამოც", 70: "სამოცდა", 80: "ოთხოც",
           90: "ოთხოცდა", 100: "ასი"},
    "hy": {3: "երեք", 4: "չորս", 5: "հինգ", 6: "վեց", 7: "յոթ",
           8: "ութ", 9: "ինը", 10: "տասն", 11: "տասն մեկ",
           12: "տասն երկու", 13: "տասն երեք", 14: "տասնչորս",
           15: "տասն հինգ", 16: "տասն վեց", 17: "տասն յոթ",
           18: "տասն ութ", 19: "տասն ինը", 20: "քսան",
           30: "երեսուն", 40: "չորսուն", 50: "հինգասուն",
           60: "վաթսուն", 70: "յոթասուն", 80: "ութասուն",
           90: "ինսուն", 100: "հարյուր"},
    "af": {3: "drie", 4: "vier", 5: "vyf", 6: "ses", 7: "sewe", 8: "agt",
           9: "nege", 10: "tien", 11: "elf", 12: "twaalf", 13: "dertien",
           14: "veertien", 15: "vyftien", 16: "sestien", 17: "sewentien",
           18: "agttien", 19: "negentien", 20: "twintig", 30: "dertig",
           40: "veertig", 50: "vyftig", 60: "sestig", 70: "sewentig",
           80: "tagtig", 90: "negentig", 100: "honderd"},
    "sq": {3: "tre", 4: "katër", 5: "pesë", 6: "gjashtë", 7: "shtatë",
           8: "tetë", 9: "nëntë", 10: "dhjetë", 11: "njëmbëdhjetë",
           12: "dymbëdhjetë", 13: "trembëdhjetë", 14: "katërmbëdhjetë",
           15: "pesëmbëdhjetë", 16: "gjashtëmbëdhjetë",
           17: "shtatëmbëdhjetë", 18: "tetëmbëdhjetë",
           19: "nëntëmbëdhjetë", 20: "njëzet", 30: "tridhjetë",
           40: "katër dhjetë", 50: "pesëdhjetë", 60: "gjashtëdhjetë",
           70: "shtatëdhjetë", 80: "tetëdhjetë", 90: "nëntëdhjetë",
           100: "qind"},
    "az": {3: "üç", 4: "dörd", 5: "beş", 6: "altı", 7: "yeddi", 8: "səkkiz",
           9: "doqquz", 10: "on", 11: "on bir", 12: "on iki",
           13: "on üç", 14: "on dörd", 15: "on beş", 16: "on altı",
           17: "on yeddi", 18: "on səkkiz", 19: "on doqquz", 20: "iyirmi",
           30: "otuz", 40: "qırx", 50: "əlli", 60: "altmış", 70: "yetmiş",
           80: "səksən", 90: "doxsan", 100: "yüz"},
    "be": {3: "тры", 4: "чатыры", 5: "пяць", 6: "шэсць", 7: "сем",
           8: "восем", 9: "дзевяць", 10: "дзесяць", 11: "адзіннадцаць",
           12: "дванаццаць", 13: "трынаццаць", 14: "чатырнаццаць",
           15: "пятнаццаць", 16: "шаснаццаць", 17: "сямнаццаць",
           18: "васімнаццаць", 19: "дзевятнаццаць", 20: "дваццаць",
           30: "трыццаць", 40: "сарак", 50: "пяцідзесяць",
           60: "шэсцдесят", 70: "сямдесят", 80: "восемдзесят",
           90: "дзевяноста", 100: "сто"},
    "bg": {3: "три", 4: "четири", 5: "пет", 6: "шест", 7: "седем",
           8: "осем", 9: "девет", 10: "десет", 11: "единадесет",
           12: "дванадесет", 13: "тринадесет", 14: "четиринадесет",
           15: "петнадесет", 16: "шестнадесет", 17: "септемнадесет",
           18: "осемнадесет", 19: "деветнадесет", 20: "двадесет",
           30: "тридесет", 40: "четиридесет", 50: "петдесет",
           60: "шестдесет", 70: "седемдесет", 80: "осемдесет",
           90: "деветдесет", 100: "сто"},
    "cs": {3: "tři", 4: "čtyři", 5: "pět", 6: "šest", 7: "sedm",
           8: "osm", 9: "devět", 10: "deset", 11: "jedenáct",
           12: "dvanáct", 13: "třináct", 14: "čtrnáct", 15: "patnáct",
           16: "šestnáct", 17: "sedmnáct", 18: "osmnáct",
           19: "devatenáct", 20: "dvacet", 30: "třicet", 40: "čtyřicet",
           50: "padesát", 60: "šedesát", 70: "sedmdesát",
           80: "osmdesát", 90: "devadesát", 100: "sto"},
    "da": {3: "tre", 4: "fire", 5: "fem", 6: "seks", 7: "syv", 8: "otte",
           9: "ni", 10: "ti", 11: "elleve", 12: "tolv", 13: "tretten",
           14: "fjorten", 15: "femten", 16: "seksten", 17: "sytten",
           18: "atten", 19: "nitten", 20: "tyve", 30: "tredive",
           40: "fyrre", 50: "halvtreds", 60: "tres", 70: "halvfjerds",
           80: "firs", 90: "halvfems", 100: "hundrede"},
    "el": {3: "τρία", 4: "τέσσερα", 5: "πέντε", 6: "έξι", 7: "επτά",
           8: "οκτώ", 9: "εννέα", 10: "δέκα", 11: "έντεκα",
           12: "δώδεκα", 13: "δεκατρία", 14: "δεκατέσσερα",
           15: "δεκαπέντε", 16: "δεκαέξι", 17: "δεκαεπτά",
           18: "δεκαοκτώ", 19: "δεκαεννέα", 20: "είκοσι",
           30: "τριάντα", 40: "σαράντα", 50: "πενήντα", 60: "εξήντα",
           70: "εβδομήντα", 80: "ογδόντα", 90: "ενενήντα", 100: "εκατό"},
    "hr": {3: "tri", 4: "četiri", 5: "pet", 6: "šest", 7: "sedam",
           8: "osam", 9: "devet", 10: "deset", 11: "jedanaest",
           12: "dvanaest", 13: "trinaest", 14: "četrnaest",
           15: "petnaest", 16: "šesnaest", 17: "sedamnaest",
           18: "osamnaest", 19: "devetnaest", 20: "dvadeset",
           30: "trideset", 40: "četrdeset", 50: "pedeset", 60: "šezdeset",
           70: "sedamdeset", 80: "osamdeset", 90: "devedeset",
           100: "sto"},
    "hu": {3: "három", 4: "négy", 5: "öt", 6: "hat", 7: "hét", 8: "nyolc",
           9: "kilenc", 10: "tíz", 11: "tizenegy", 12: "tizenkettő",
           13: "tizenhárom", 14: "tizennégy", 15: "tizenöt",
           16: "tizenhat", 17: "tizenhét", 18: "tizennyolc",
           19: "tizenkilenc", 20: "húsz", 30: "harminc", 40: "negyven",
           50: "ötven", 60: "hatvan", 70: "hetven", 80: "nyolcvan",
           90: "kilencven", 100: "száz"},
    "fi": {3: "kolme", 4: "neljä", 5: "viisi", 6: "kuusi", 7: "seitsemän",
           8: "kahdeksan", 9: "yhdeksän", 10: "kymmenen",
           11: "yksitoista", 12: "kaksitoista", 13: "kolmetoista",
           14: "neljätoista", 15: "viisitoista", 16: "kuusitoista",
           17: "seitsemäntoista", 18: "kahdeksantoista",
           19: "yhdeksäntoista", 20: "kaksikymmentä", 30: "kolmekymmentä",
           40: "neljäkymmentä", 50: "viisikymmentä",
           60: "kuusikymmentä", 70: "seitsemänkymmentä",
           80: "kahdeksankymmentä", 90: "yhdeksänkymmentä",
           100: "sata"},
    "id": {3: "tiga", 4: "empat", 5: "lima", 6: "enam", 7: "tujuh",
           8: "delapan", 9: "sembilan", 10: "sepuluh", 11: "sebelas",
           12: "dua belas", 13: "tiga belas", 14: "empat belas",
           15: "lima belas", 16: "enam belas", 17: "tujuh belas",
           18: "delapan belas", 19: "sembilan belas", 20: "dua puluh",
           30: "tiga puluh", 40: "empat puluh", 50: "lima puluh",
           60: "enam puluh", 70: "tujuh puluh", 80: "delapan puluh",
           90: "sembilan puluh", 100: "seratus"},
    "ms": {3: "tiga", 4: "empat", 5: "lima", 6: "enam", 7: "tujuh",
           8: "lapan", 9: "sembilan", 10: "sepuluh", 11: "sebelas",
           12: "dua belas", 13: "tiga belas", 14: "empat belas",
           15: "lima belas", 16: "enam belas", 17: "tujuh belas",
           18: "lapan belas", 19: "sembilan belas", 20: "dua puluh",
           30: "tiga puluh", 40: "empat puluh", 50: "lima puluh",
           60: "enam puluh", 70: "tujuh puluh", 80: "lapan puluh",
           90: "sembilan puluh", 100: "seratus"},
    "nl2": {},
    "no": {3: "tre", 4: "fire", 5: "fem", 6: "seks", 7: "sju", 8: "åtte",
           9: "ni", 10: "ti", 11: "elleve", 12: "tolv", 13: "tretten",
           14: "fjorten", 15: "femten", 16: "seksten", 17: "sytten",
           18: "atten", 19: "nitten", 20: "tjue", 30: "tretti",
           40: "førti", 50: "femti", 60: "seksti", 70: "sytti",
           80: "åtti", 90: "nitti", 100: "hundre"},
    "pl": {3: "trzy", 4: "cztery", 5: "pięć", 6: "sześć", 7: "siedem",
           8: "osiem", 9: "dziewięć", 10: "dziesięć", 11: "jedenaście",
           12: "dwanaście", 13: "trzynaście", 14: "czternaście",
           15: "piętnaście", 16: "szesnaście", 17: "siedemnaście",
           18: "osiemnaście", 19: "dziewiętnaście", 20: "dwadzieścia",
           30: "trzydzieści", 40: "czterdzieści", 50: "pięćdziesiąt",
           60: "sześćdziesiąt", 70: "siedemdziesiąt",
           80: "osiemdziesiąt", 90: "dziewięćdziesiąt", 100: "sto"},
    "sk": {3: "tri", 4: "štyri", 5: "päť", 6: "šesť", 7: "sedem",
           8: "osem", 9: "deväť", 10: "desať", 11: "jedenásť",
           12: "dvanásť", 13: "trinásť", 14: "štrnásť", 15: "pätnásť",
           16: "šestnásť", 17: "sedemnásť", 18: "osemnásť",
           19: "devätnásť", 20: "dvadsať", 30: "tridsať",
           40: "štyridsať", 50: "päťdesiat", 60: "šesťdesiat",
           70: "sedemdesiat", 80: "osemdesiat", 90: "deväťdesiat",
           100: "sto"},
    "sl": {3: "tri", 4: "štiri", 5: "pet", 6: "šest", 7: "sedem",
           8: "osem", 9: "devet", 10: "deset", 11: "enajst",
           12: "dvanajst", 13: "trinajst", 14: "štirinajst",
           15: "petnajst", 16: "šestnajst", 17: "sedemnajst",
           18: "osemnajst", 19: "devetnajst", 20: "dvajset",
           30: "trideset", 40: "štirideset", 50: "petdeset",
           60: "šestdeset", 70: "sedemdeset", 80: "osemdeset",
           90: "devetdeset", 100: "sto"},
    "sr": {3: "три", 4: "четири", 5: "пет", 6: "шест", 7: "седам",
           8: "осам", 9: "девет", 10: "десет", 11: "једанаест",
           12: "дванаест", 13: "тринаест", 14: "четрнаест",
           15: "петнаест", 16: "шеснаест", 17: "седамнаест",
           18: "осамнаест", 19: "деветнаест", 20: "двадесет",
           30: "тридесет", 40: "четрдесет", 50: "педесет",
           60: "шестдесет", 70: "седамдесет", 80: "осамдесет",
           90: "деветдесет", 100: "сто"},
    "sv": {3: "tre", 4: "fyra", 5: "fem", 6: "sex", 7: "sju", 8: "åtta",
           9: "nio", 10: "tio", 11: "elva", 12: "tolv", 13: "tretton",
           14: "fjorton", 15: "femton", 16: "sexton", 17: "sjutton",
           18: "arton", 19: "nitton", 20: "tjugo", 30: "trettio",
           40: "fyrtio", 50: "femtio", 60: "sextio", 70: "sjuttio",
           80: "åttio", 90: "nittio", 100: "hundra"},
    "sw": {3: "tatu", 4: "nne", 5: "tano", 6: "siti", 7: "saba",
           8: "nane", 9: "tisa", 10: "kumi", 11: "kumi na moja",
           12: "kumi na mbili", 13: "kumi na tatu", 14: "kumi na nne",
           15: "kumi na tano", 16: "kumi na siti", 17: "kumi na saba",
           18: "kumi na nane", 19: "kumi na tisa", 20: "ishini",
           30: "thirty", 40: "forty", 50: "fifty", 60: "sixty",
           70: "seventy", 80: "eighty", 90: "ninety", 100: "mia"},
    "ta": {3: "மூன்று", 4: "நான்கு", 5: "ஐந்து", 6: "ஆறு", 7: "ஏழு",
           8: "எட்டு", 9: "ஒன்பது", 10: "பத்து", 11: "பதினொன்று",
           12: "பன்னிரண்டு", 13: "பதினாமூன்று", 14: "பதினான்கு",
           15: "பதினைந்து", 16: "பதினாறு", 17: "பதினேழு",
           18: "பதினெட்டு", 19: "பதினொன்பது", 20: "இருபது",
           30: "முப்பது", 40: "நாற்பது", 50: "ஐம்பது", 60: "அறுபது",
           70: "எழுபது", 80: "எண்பது", 90: "தொண்பது", 100: "நூறு"},
    "uk": {3: "три", 4: "чотири", 5: "п'ять", 6: "шість", 7: "сім",
           8: "вісім", 9: "дев'ять", 10: "десять", 11: "одинадцять",
           12: "дванадцять", 13: "тринадцять", 14: "чотирнадцять",
           15: "п'ятнадцять", 16: "шістнадцять", 17: "сімнадцять",
           18: "вісімнадцять", 19: "дев'ятнадцять", 20: "двадцять",
           30: "тридцять", 40: "сорок", 50: "п'ятдесят",
           60: "шістдесят", 70: "сімдесят", 80: "вісімдесят",
           90: "дев'яносто", 100: "сто"},
    "vi": {3: "ba", 4: "bốn", 5: "năm", 6: "sáu", 7: "bảy", 8: "tám",
           9: "chín", 10: "mười", 11: "mười một", 12: "mười hai",
           13: "mười ba", 14: "mười bốn", 15: "mười lăm",
           16: "mười sáu", 17: "mười bảy", 18: "mười tám",
           19: "mười chín", 20: "hai mươi", 30: "ba mươi",
           40: "bốn mươi", 50: "năm mươi", 60: "sáu mươi",
           70: "bảy mươi", 80: "tám mươi", 90: "chín mươi",
           100: "một trăm"},
}
import sys
import unicodedata
import zipfile
from datetime import datetime, timedelta, timezone

# ---------------------------------------------------------------- 常量

LOCALES = ["en", "zh", "es", "fr", "de", "ja", "pt", "ru", "ar", "ko",
           "it", "nl", "tr", "vi", "id", "th", "hi", "pl", "sv", "el",
           "cs", "ro", "hu", "fi", "da", "no", "uk", "bg", "hr", "sr",
           "sk", "sl", "ms", "ka", "he", "sw", "bn", "ca", "fa", "ur",
           "ta", "af", "sq", "az", "hy", "be", "ne", "si"]

CATEGORIES = ["Brand Protection", "Compliance Guide", "Cosmetics", "E-commerce",
              "Food & Beverage", "Label Compliance", "Product Certification"]

FRONTMATTER_KEYS = ["title", "slug", "date", "category", "excerpt", "references"]

AUTHOR = "David Zhang"

MAX_TITLE = 85
MAX_EXCERPT = 185
MAX_MDX_BYTES = 100 * 1024
MAX_IMAGE_BYTES = 400 * 1024
MAX_PACKAGE_BYTES = 60 * 1024 * 1024
COVER_SIZE = (1200, 630)
MIN_IMAGE_WIDTH = 1200
MIN_EN_WORDS = 400
# W02 超长段落：按文字系统给出不同口径。
# 拉丁/西里尔/希腊等语言一个字符≈半个词，400 字符约等于 70 词；
# 中日韩等语言一个字符≈一个词，同样篇幅的段落阅读负担更重，
# 因此对这类语言收紧阈值，避免同一内容在不同语言上判定不一致。
MAX_PARAGRAPH_CHARS = 400
MAX_PARAGRAPH_CHARS_CJK = 340
MAX_PARAGRAPH_CHARS_DENSE = 300
MAX_IMAGES_WARN = 6
SIMILARITY_LIMIT = 0.95

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
IMAGE_EXTS = {".webp", ".jpg", ".jpeg", ".png", ".gif", ".avif", ".svg"}
ALLOWED_SUFFIX = {".mdx", ".webp", ".json"}

SCRIPT_TESTS = {
    "ar": r"[\u0600-\u06FF]", "fa": r"[\u0600-\u06FF]", "ur": r"[\u0600-\u06FF]",
    "he": r"[\u0590-\u05FF]",
    "hi": r"[\u0900-\u097F]", "ne": r"[\u0900-\u097F]",
    "bn": r"[\u0980-\u09FF]",
    "ta": r"[\u0B80-\u0BFF]",
    "th": r"[\u0E00-\u0E7F]",
    "ka": r"[\u10A0-\u10FF]",
    "hy": r"[\u0530-\u058F]",
    "el": r"[\u0370-\u03FF]",
    "ru": r"[\u0400-\u04FF]", "uk": r"[\u0400-\u04FF]", "be": r"[\u0400-\u04FF]",
    "bg": r"[\u0400-\u04FF]", "sr": r"[\u0400-\u04FF]",
    "ja": r"[\u3040-\u30FF]",
    "ko": r"[\uAC00-\uD7AF]",
    "si": r"[\u0D80-\u0DFF]",
    "zh": r"[\u4E00-\u9FFF]",
}
CJK_LANGS = {"zh", "ja", "ko"}
# 同样「单字成词」的语言：字符数比词数更接近阅读负担，
# 超长段落判定使用更紧的阈值（见 MAX_PARAGRAPH_CHARS_CJK）。
DENSE_SCRIPT_LANGS = CJK_LANGS | {"th", "my", "km", "lo"}

# 使用非拉丁文字系统的语言。这类语言正文里出现拉丁字母词，基本就是
# 英文原词残留（本族词不会写成拉丁字母）；拉丁字母语言不适用此判断。
NON_LATIN_SCRIPT_LANGS = {
    "ar", "fa", "ur", "he",           # 阿拉伯/波斯/乌尔都/希伯来
    "ru", "uk", "be", "bg", "sr",     # 西里尔
    "el",                              # 希腊
    "hi", "ne", "bn", "ta", "si",      # 天城文/孟加拉/泰米尔/僧伽罗
    "th", "my", "km", "lo",            # 泰/缅/高棉/老挝
    "ka", "hy",                        # 格鲁吉亚/亚美尼亚
    "zh", "ja", "ko",                  # 中日韩
}

# 合理保留的拉丁词：编号、代码、专有拼音、通用缩写，不算英文残留
LATIN_ALLOWLIST = {
    "s0", "s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9",
    "s10", "s11", "s12", "s13",
    "cai", "guan", "shui", "hs", "sku", "b2c", "erp", "api", "id",
    "mode", "w", "kg", "ml", "usd",
    # 中国保健食品注册俗称「蓝帽子」，各语言通用 blue hat 这一形象写法，
    # 直译（如俄语 синяя шляпа）反而不可读，不算英文残留
    "blue", "hat", "sku", "sku-",
}

_LATIN_WORD_RE = re.compile(r"\b[A-Za-z][A-Za-z\-']{2,}\b")


# 英文术语 -> 各语言的本土写法。
# 登记的是本次实际修复过的对应关系：中文母版写「保税 / 元 / 美元」，
# 各语言就该用自己的术语，而不是照抄 bonded / yuan / dollars。
# 拉丁字母语言靠字符集查不出英文借词，只能靠这张表。
TERM_LOCALIZATION = {
    "Mode 1210": {
        "af": "toesigkode 1210",        "az": "nəzarət kodu 1210",        "be": "код 1210",        "bg": "код 1210",
        "bn": "কোড 1210",        "ca": "codi 1210",        "cs": "kód 1210",        "da": "kode 1210",
        "de": "Modus 1210",        "el": "κωδικός 1210",        "es": "Modo 1210",        "fa": "کد 1210",
        "fi": "koodi 1210",        "he": "קוד 1210",        "hi": "कोड 1210",        "hr": "kod 1210",
        "hu": "vámcsatorna 1210",        "hy": "կոդ 1210",        "id": "kode 1210",        "it": "modalità 1210",
        "ja": "モード1210",        "ka": "კოდი 1210",        "ko": "모드 1210",        "ms": "kod 1210",
        "ne": "कोड 1210",        "nl": "douanemode 1210",        "no": "kode 1210",        "pl": "kod 1210",
        "pt": "Modo 1210",        "ro": "codul 1210",        "ru": "режим 1210",        "si": "කේතය 1210",
        "sk": "kód 1210",        "sl": "koda 1210",        "sq": "kodi 1210",        "sr": "код 1210",
        "sv": "kod 1210",        "sw": "kodi 1210",        "ta": "குறியீடு 1210",        "th": "รหัส 1210",
        "tr": "Mod 1210",        "uk": "код 1210",        "ur": "کوڈ 1210",        "vi": "mã 1210",
        "zh": "监管方式 1210",
    },
    "bonded": {
        "af": "doeane", "az": "gömrük", "be": "мытны", "bg": "митнически",
        "ca": "duaner", "cs": "celní", "da": "told", "de": "Zoll",
        "el": "τελωνειακ", "es": "depósito franco", "fa": "گمرکی",
        "fi": "tulli", "fr": "douanier", "he": "מכס", "hi": "सीमाशुल्क",
        "hr": "carinski", "hu": "vám", "hy": "մաքսային", "id": "berikat",
        "it": "doganale", "ja": "保税", "ka": "საბაჟო", "ko": "보세",
        "ms": "berikat", "nl": "douane", "no": "toll", "pl": "celny",
        "pt": "alfandegário", "ro": "vamal", "ru": "таможенн", "sk": "coln",
        "sl": "carinski", "sq": "doganor", "sr": "царински", "sv": "tull",
        "sw": "forodha", "th": "ทัณฑ์บน", "tr": "gümrük", "uk": "митний",
        "ur": "کسٹم", "vi": "ngoại quan", "zh": "保税",
    },
    "yuan": {
        "be": "юан", "bg": "юан", "el": "γιουάν", "he": "יואן", "hi": "युआन",
        "hy": "յուան", "ka": "იუან", "ru": "юан", "sr": "јуан",
        "th": "หยวน", "uk": "юан", "ur": "یوآن", "zh": "元",
        "bn": "ইউয়ান", "si": "යුවාන්", "ta": "யுவான்", "ne": "युआन",
    },
    "dollars": {
        "be": "даляр", "bg": "долар", "el": "δολάρι", "he": "דולר", "hi": "डॉलर",
        "hy": "դոլար", "ka": "დოლარ", "ru": "доллар", "sr": "долар",
        "th": "ดอลลาร์", "uk": "долар", "ur": "ڈالر", "zh": "美元",
        "bn": "ডলার", "si": "ඩොලර්", "ta": "டாலர்", "ne": "डलर",
    },
}

_TERM_RE_CACHE = {}


def term_localization_hits(lang, body):
    """English terms still used where this language has its own word.

    Image references are stripped first: a slug like
    bonded-ecommerce-export-china-guide must not be flagged.
    Returns [(english_term, local_form), ...].
    """
    t = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", body)
    out = []
    for eng, per_lang in TERM_LOCALIZATION.items():
        local = per_lang.get(lang)
        if not local:
            continue
        pat = _TERM_RE_CACHE.get(eng)
        if pat is None:
            pat = _TERM_RE_CACHE[eng] = re.compile(
                r"(?<![A-Za-z])%s(?![A-Za-z])" % re.escape(eng), re.I)
        if pat.search(t):
            out.append((eng, local))
    return out


# 正文允许出现的两种货币：元（人民币）与美元，各语言的本土写法
ALLOWED_CURRENCY = (
    "yuan", "юан", "γιουάν", "יואן", "युआन", "յուան", "იუან",
    "یوآن", "หยวน", "யுவான்", "ইউয়ান", "යුවාන්", "元",
    "dollar", "dolar", "долар", "даляр", "δολάρι", "דולר", "डॉलर",
    "դոլար", "დოლარ", "ڈالر", "ดอลลาร์", "டாலர்", "ডলার", "ඩොලර්", "美元",
)

# 其他国家/地区的货币，各语言常见写法。出现即判错。
# 货币符号：分「允许货币的符号」与「其他国家货币的符号」两类。
# 规范只允许「元」与「美元」，且必须用本土文字拼写（中文写「5000 元」
# 「50 美元」），不得用符号，也不得用 ISO 三字母代码。
#
# ¥ 既是人民币符号也是日元符号，$ 是美元符号——它们不算外币，但仍然是
# 符号写法，同样要求改成文字，因此分开提示，便于作者判断怎么改。
ALLOWED_MONEY_SIGNS = ("$", "\u00a5")           # 美元 / 人民币
FOREIGN_MONEY_SIGNS = (
    "\u20ac", "\u00a3", "\u20bd", "\u20a9", "\u20b9", "\u0e3f", "\u20ba",
    "\u20ab", "\u20b4", "\u20a6", "\u20aa", "\u20b1", "\u00a2",
    "\u20a3", "\u20a4", "\u20a8", "\u20ae", "\u20af", "\u20b0", "\u20b2",
    "\u20b8", "\u20b5",
    "z\u0142", "K\u010d", "kr", "Fr.", "CHF", "R$", "Rp",
    "\u043b\u0432", "Ft", "lei", "TL", "\u20ef", "z\u0142.", "K\u010d.",
)
CURRENCY_ISO_CODES = (
    "USD", "EUR", "GBP", "JPY", "CNY", "RMB", "KRW", "RUB", "INR", "CHF",
    "THB", "VND", "TRY", "UAH", "PLN", "CZK", "SEK", "NOK", "DKK", "AUD",
    "CAD", "SGD", "MYR", "IDR", "BRL", "MXN", "ZAR", "AED", "ILS", "HKD",
    "TWD", "NZD", "PHP", "NGN", "PKR", "BDT",
)

# 数字形态：以数字开头，后接数字 / 千分位 / 小数点，可含窄空格与不换行空格。
_MONEY_NUM = r"\d[\d.,'\u00a0\u202f]*"

FORBIDDEN_CURRENCY = {
    "EUR(欧元)": ("euro", "евро", "ευρώ", "אירו", "यूरो", "ევრო", "یورو", "ยูโร", "欧元"),
    "JPY(日元)": ("yen", "иен", "γιεν", "ין", "円", "日元"),
    "GBP(英镑)": ("pound", "фунт", "λίρα", "ליש", "पाउंड", "გირვანქა", "پاؤنڈ", "英镑"),
    "RUB(卢布)": ("ruble", "rouble", "рубл", "ρούβλι", "רובל", "रूबल", "რუბლი", "卢布"),
    "KRW(韩元)": ("won", "вон", "γουόν", "וון", "원", "韩元"),
    "INR(卢比)": ("rupee", "рупи", "ρουπία", "रुपये", "რუპია", "卢比"),
    "CHF(法郎)": ("franc", "франк", "φράγκο", "פרנק", "फ्रैंक", "法郎"),
}

_DIGIT_NEAR_RE = re.compile(r"\d")

# 金额词/符号的边界：中日韩写金额时数字紧贴货币词（5000円 / 5000元 / 360유루），
# 而 \w 含数字，用 (?<![\w]) 会把这类写法整块漏掉。因此：
#   前界 = 前面不能是字母（数字、空格、标点都允许）
#   后界 = 后面不能是 ASCII 字母或数字（汉字、空格、标点都允许）
_MONEY_PRE = r"(?<![^\W\d_])"
# 后界：后面不能是字母；但 CJK 接续要放行——日语写「5000\u5186\u63a7\u9664」、
# 中文写「5000 \u5143\uff08\u7ea6 700 \u7f8e\u5143\uff09」，货币词后紧跟汉字是常态。
# 只排除 ASCII 字母数字又太松：捷克语 kr\u00e1t\uff08\u500d\uff09含 kr，后接 \u00e1 就会被误判成克朗。
_CJK_CONT = (
    "[\u4e00-\u9fff\u3400-\u4dbf"      # 汉字
    "\u3040-\u30ff"                          # 假名
    "\uac00-\ud7af"                          # 谚文
    "\u0e00-\u0e7f"                          # 泰文（无空格分词）
    "]"
)
_MONEY_POST = r"(?!(?:[^\W\d_])(?<!" + _CJK_CONT + r"))"


def _digit_adjacent(body, start, end, span=3):
    """True when a digit sits right next to the [start:end) slice.

    A wide window is what produced false positives: Korean
    "\uad6d\ubb34\uc6d0\ub839 443\ud638" (State Council decree No. 443) puts a number
    near the won-shaped \uc6d0 that is really "won/\uc6d0" as in "source/council".
    Requiring the digit to touch the word keeps those out while still catching
    5000\u5186, 360 yuan and 5000 \uc6d0.
    """
    return bool(_DIGIT_NEAR_RE.search(body[max(0, start - span):start]) or
                _DIGIT_NEAR_RE.search(body[end:end + span]))


def foreign_currency_hits(body):
    """Other countries' currencies used for money amounts.

    Returns [(label, matched_word), ...]. A match only counts when the word
    sits near a digit, which keeps homographs out — Belarusian
    "перавады вон" (outward transfers) must not read as Korean won.
    """
    out = []
    for label, words in FORBIDDEN_CURRENCY.items():
        for w in words:
            for m in re.finditer(_MONEY_PRE + re.escape(w) + _MONEY_POST, body, re.I):
                if _digit_adjacent(body, m.start(), m.end()):
                    out.append((label, m.group(0)))
                    break
    return out


def currency_symbol_hits(body):
    """Money written with a currency sign or an ISO code instead of words.

    Returns [(kind, matched_text), ...] where kind is one of
    '外币符号' / '符号写法' / 'ISO代码'.

    Image paths, URLs and inline code are stripped first. A sign only counts
    when it sits next to a number: this is what keeps Polish "z\u0142o\u017cy"
    (to file a request) from reading as the zloty sign, and a stray '$' in
    prose out of the report entirely.
    """
    t = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", body)
    t = re.sub(r"https?://\S+", "", t)
    t = re.sub(r"`[^`]*`", "", t)

    seps = r"[\s\u00a0]?"
    out = []

    def scan(sign, kind):
        esc = re.escape(sign)
        if re.search(r"[\w]", sign, re.U):
            # 字母型符号（z\u0142 / kr / CHF / Fr.）需要词边界，否则会命中单词内部
            pre = _MONEY_PRE + esc + seps + _MONEY_NUM
            suf = _MONEY_NUM + seps + esc + _MONEY_POST
        else:
            pre = esc + seps + _MONEY_NUM
            suf = _MONEY_NUM + seps + esc
        for pat in (pre, suf):
            for m in re.finditer(pat, t):
                out.append((kind, m.group(0).strip()))

    for sign in FOREIGN_MONEY_SIGNS:
        scan(sign, "\u5916\u5e01\u7b26\u53f7")           # 外币符号
    for sign in ALLOWED_MONEY_SIGNS:
        scan(sign, "\u7b26\u53f7\u5199\u6cd5")           # 符号写法
    for code in CURRENCY_ISO_CODES:
        pats = (_MONEY_PRE + code + seps + _MONEY_NUM,
                _MONEY_NUM + seps + code + _MONEY_POST)
        for pat in pats:
            for m in re.finditer(pat, t):
                out.append(("ISO\u4ee3\u7801", m.group(0).strip()))

    # 去重（同一处可能被前缀型与后缀型同时命中）
    seen = set()
    uniq = []
    for k, v in out:
        if v not in seen:
            seen.add(v)
            uniq.append((k, v))
    return uniq


def latin_residue(body):
    """Latin-alphabet words left in a non-Latin-script body.

    Image references, URLs and inline code are stripped first: a slug like
    bonded-ecommerce-export-china-guide legitimately contains English.
    Returns a {word: count} dict for words seen at least twice.
    """
    t = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", body)
    t = re.sub(r"https?://\S+", "", t)
    t = re.sub(r"`[^`]*`", "", t)
    freq = {}
    for w in _LATIN_WORD_RE.findall(t):
        w = w.lower()
        if w in LATIN_ALLOWLIST:
            continue
        freq[w] = freq.get(w, 0) + 1
    return dict((w, n) for w, n in freq.items() if n >= 2)


_NO_PARITY = False  # --no-parity：跳过 P02/P03/P04/P11/P18–P33/L06 跨语言一致性（精简包/样例用）
_MASTER_LANG = None  # --master=<lang>：显式指定基准语言（默认中文优先，其次英文）

# 红线（SPEC 第 5 节）
PRICE_RES = [
    r"[$€£¥]\s?\d",
    r"\b\d[\d.,]*\s?(?:USD|EUR|GBP|CNY|RMB|dollars?|euros?)\b",
    r"\b(?:USD|EUR|GBP|CNY|RMB)\s?\d",
]
DELIVERY_RES = [
    r"(?is)\b(?:delivery|lead\s*time|turnaround|shipping\s*time)\b[^.]{0,60}?\b\d+\s*[-–to]*\s*\d*\s*(?:days?|weeks?)\b",
]
NEGATIVE_RES = [
    r"(?is)\b(?:cannot|can\s*not|can't|not\s+possible|impossible)\s+(?:to\s+)?(?:be\s+)?(?:export|exported|import|imported|sell|sold|enter)\b",
    r"无法出口", r"不能出口", r"无法进口", r"无法进入中国",
    r"لا\s*يمكن\s*تصدير", r"нельзя\s+экспортир", r"não\s+pode\s+ser\s+exportad",
    r"kann\s+nicht\s+exportiert", r"ne\s+peut\s+pas\s+être\s+export", r"non\s+può\s+essere\s+esportat",
    r"nie\s+można\s+eksportowa", r"nem\s+lehet\s+exportálni", r"nie\s+je\s+možné\s+exportova",
    r"non\s+se\s+puede\s+exportar", r"non\s+si\s+può\s+esportare",
]
PROMISE_RES = [
    r"(?is)\bwe\s+(?:arrange|organi[sz]e|handle)\s+(?:the\s+)?(?:shipping|shipment|sample\s+shipping|delivery|logistics)",
    r"(?is)\bguarantee(?:d|s)?\b",
    r"(?is)\b100\s*%\s*(?:success|approval|pass)\b",
    r"(?is)\bnear[- ]100\s*%",
    r"(?is)\bwithin\s*24\s*hours\b",
]
LEGACY_DECREE_RE = None  # 用数字归一化后匹配

# ---------------------------------------------------------------- P 系列常量（v1.2，QA 回填）

# 数字分隔符：千分位（, . 阿拉伯千分位 ٬ 窄/普通空格 撇号）与小数点（. , 阿拉伯小数点 ٫）
NUM_SEP = r"[.,\u066C\u066B\u00A0\u202F' ]"
# 混文字系统检测覆盖的脚本（不含 Hangul/假名/汉字——ko/ja 黏着助词属正常书写）
_MIX_SCRIPT_KEYS = ("ARABIC", "HEBREW", "CYRILLIC", "GREEK", "DEVANAGARI",
                    "BENGALI", "TAMIL", "SINHALA", "GEORGIAN", "ARMENIAN", "THAI")
# 本族数字语言（韩文数字/阿拉伯-印度数字等），normalize_digits 已统一映射
ELLIPSIS_RE = re.compile(r"\.\.\.|…")
DBLPUNCT_RE = re.compile(r"(?<!\.)\.\.(?!\.)|,,|\?\?|!!|、、|。。|，，|،،|؛؛")
DBLSPACE_RE = re.compile(r"(?m)\S(  +)\S")
TRIPLE_NL_RE = re.compile(r"\n{3,}")
REPEAT_WORD_RE = re.compile(r"(?i)\b(\w{2,})[ \t]+\1\b")

# 重叠副词白名单（P10）：精确词组，逐条登记
REDUPLICATION_OK = {
    "tr": {"ayrı ayrı", "tek tek"},
    "ur": {"باری باری"},
    "id": {"satu satu"},
    "ms": {"satu satu"},
}
CTA_COLON_RE = re.compile(r"[:：]\s*\[[^\]]+\]\([^)]*/packages/")

# v1.4：隐形/零宽字符（P14）。ZWNJ 在波斯/乌尔都/阿拉伯语是正字法，ZWJ 在僧伽罗/
# 天城文/孟加拉/泰米尔等用于合字，按语言白名单放行；其余一律视为编辑器残留
INVISIBLE_ALWAYS = {
    "\u00ad": "SOFT-HYPHEN", "\u200b": "ZWSP", "\ufeff": "BOM",
    "\u2060": "WORD-JOINER", "\ufffd": "REPLACEMENT-CHAR",
    "\u200e": "LRM", "\u200f": "RLM", "\u202a": "LRE", "\u202b": "RLE",
    "\u202c": "PDF", "\u202d": "LRO", "\u202e": "RLO",
}
ZWNJ_OK_LANGS = {"fa", "ur", "ar", "ps"}
ZWJ_OK_LANGS = {"si", "hi", "bn", "ta", "ne", "ka", "th"}
SPACE_PUNCT_RE = re.compile(r"(?<![0-9])[ \t]+[,.]")
DUP_SENT_SPLIT_RE = re.compile(r"(?<=[.!?。！？])\s+")
# v1.5：跨语言事实一致性（P19 的提取口径与阈值）
DOC_NUMBER_MIN = 10
DOC_NUMBER_YEAR_MIN = 1900
DOC_NUMBER_YEAR_MAX = 2100
IMG_REF_RE = r"/images/blog/%s/([\w.\-]+\.webp)"
# markdown 图片/链接占位符（NUL 字符：非 \w 非 \S 语义干扰最小）
_MD_PH = "\x00\x00"


def _token_scripts(tok):
    """返回 token 内出现的文字系统集合（LATIN + 受监控脚本）。"""
    names = set()
    for ch in tok:
        if not ch.isalpha():
            continue
        try:
            n = unicodedata.name(ch)
        except ValueError:
            continue
        if "LATIN" in n:
            names.add("LATIN")
            continue
        for key in _MIX_SCRIPT_KEYS:
            if key in n:
                names.add(key)
                break
    return names


_CODE_PART_RE = re.compile(r"^(?:[A-Za-z]?\d{1,4}|[A-Z]{2,3})$")


def _code_hyphen_ok(tok):
    """True for number/code hyphenated with a local suffix: S1-ից, S1-მდე, ל-US.

    One side being a bare identifier (S1, 1210, US) means the hyphen carries a
    grammatical case suffix or a preposition, not a mixed-script accident.
    The Hebrew maqaf (U+05BE) counts as a hyphen too.
    """
    if "-" not in tok and "\u05be" not in tok.lower():
        return False
    for part in re.split(r"[-\u05be\u2013]", tok):
        part = part.strip("()\[\]{}.,;:!?\u00ab\u00bb\u201c\u201d")
        if part and _CODE_PART_RE.match(part):
            return True
        # 俗称 + 本地格后缀（blue hat-ի / blue hat-ის）：拉丁侧命中
        # P30 的允许词表同样放行——那是登记过的保留用语
        if part and part.lower() in LATIN_ALLOWLIST:
            return True
    return False


def extract_fact_numbers(body):
    """从基准语言正文提取关键数字：≥1000 的独立整数 + 带小数点的数。
    排除紧邻字母/数字编码的（W2020-29、S0-S13、fig-01 中的 01 等）。"""
    out = []
    for m in re.finditer(r"(?<![\w])\d+(?:\.\d+)?(?![\w])", body):
        s = m.group(0)
        if "." in s:
            if len(s.split(".", 1)[1]) > 0:
                out.append(s)
        elif s.isdigit() and int(s) >= 1000:
            out.append(s)
    return sorted(set(out))


def _num_pattern(s):
    """生成跨书写习惯的数字匹配 pattern：允许千分位/小数点分隔符变体。"""
    if "." in s:
        ip, fp = s.split(".", 1)
        return re.escape(ip) + NUM_SEP + re.escape(fp)
    groups = []
    t = s
    while len(t) > 3:
        groups.insert(0, t[-3:])
        t = t[:-3]
    groups.insert(0, t)
    return re.escape(groups[0]) + "".join(
        "(?:%s)?%s" % (NUM_SEP, re.escape(g)) for g in groups[1:])


def find_number(normalized_body, s):
    return re.search(_num_pattern(s), normalized_body) is not None

# 写作声音纪律（方案 3.1 / 3.1a 固化，2026-10-21；ST 系列 = 自有红线，超出 SPEC 基线）
AI_PHRASES_EN = [
    "delve", "leverage", "seamless", "seamlessly", "robust", "game-changer",
    "unlock", "landscape", "in today's", "ever-evolving", "ever-changing",
    "it is important to note", "in conclusion", "not just", "half right",
    "the other half", "dive into", "in the realm of",
]
AI_PHRASES_ZH = [
    "赋能", "抓手", "闭环", "底层逻辑", "值得注意的是", "需要注意的是",
    "综上所述", "总而言之", "众所周知", "毋庸置疑", "不得不说",
    "对了一半", "另一半", "答案是", "一分为二",
]
REVERSAL_RES = [
    r"看似[^。？！\n]{0,30}实则",
    r"不是[^。？！\n]{0,24}而是",
    r"表面[^。？！\n]{0,16}(?:本质|实际上)",
    r"\bnot\s+just\b[^.\n]{0,60}?\bbut\b",
]
PARA_OPEN_RES = [
    (r"(?m)^\s*(?:Moreover|Furthermore|Additionally|In addition)\b", "段首连接词（EN）"),
    (r"(?m)^\s*(?:而且|此外|另外)[，,]", "段首连接词（zh）"),
]

CTA_TEXT = {"en": "Contact us", "zh": "联系我们"}
NO_LATIN_FALLBACK = {"ja", "ko"}  # R11 中文字符检查的例外


# ---------------------------------------------------------------- 数据载入

class Finding:
    __slots__ = ("rule", "severity", "slug", "detail")

    def __init__(self, rule, severity, slug, detail):
        self.rule = rule
        self.severity = severity
        self.slug = slug
        self.detail = detail

    def as_dict(self):
        return {"rule": self.rule, "severity": self.severity,
                "article": self.slug, "detail": self.detail}


def load_package(path):
    """返回 {相对路径: bytes}。支持 zip 或目录。"""
    files = {}
    if os.path.isdir(path):
        for root, _dirs, names in os.walk(path):
            for n in names:
                full = os.path.join(root, n)
                rel = os.path.relpath(full, path).replace(os.sep, "/")
                with open(full, "rb") as fh:
                    files[rel] = fh.read()
        return files, None

    if not os.path.isfile(path):
        raise SystemExit("找不到文件或目录: %s" % path)
    total = 0
    with zipfile.ZipFile(path) as zf:
        for info in zf.infolist():
            if info.is_dir():
                continue
            name = info.filename.replace("\\", "/")
            if name.startswith("/") or ".." in name.split("/"):
                raise SystemExit("压缩包内含非法路径: %s" % name)
            data = zf.read(info)
            total += len(data)
            files[name] = data
    return files, total


# ---------------------------------------------------------------- 工具函数

def text(data):
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return data.decode("utf-8", "replace")


def normalize_digits(s):
    out = []
    for ch in s:
        if ch.isdigit():
            try:
                d = unicodedata.digit(ch)
            except (TypeError, ValueError):
                out.append(ch)
                continue
            out.append(str(d))
        else:
            out.append(ch)
    return "".join(out)


# 汉字数字 → 阿拉伯数字。中文基准用「十四个工作包」这类写法，
# 其他语言用 "fourteen work packages"；做此项归一，两边才可比对。
_CN_DIGITS = {
    "〇": 0, "零": 0, "一": 1, "二": 2, "两": 2, "三": 3, "四": 4,
    "五": 5, "六": 6, "七": 7, "八": 8, "九": 9,
}
_CN_UNITS = {"十": 10, "百": 100, "千": 1000}
_CN_NUM_RE = re.compile(r"[〇零一二三四五六七八九十百千两]+")


def cn_number_to_int(text):
    """把一段汉字数字转成整数；无法解析时返回 None。

    支持「十四」「二十」「三十」「两百五十」「一千二百」等常见写法。
    """
    if not text:
        return None
    total = 0
    section = 0
    current = 0
    seen = False
    for ch in text:
        if ch in _CN_DIGITS:
            current = _CN_DIGITS[ch]
            seen = True
        elif ch in _CN_UNITS:
            unit = _CN_UNITS[ch]
            seen = True
            if current == 0:
                current = 1          # 「十四」= 10 + 4
            if unit >= 100:
                section += current * unit
                current = 0
            else:
                section += current * unit
                current = 0
        else:
            return None
    if not seen:
        return None
    total = section + current
    return total if total > 0 else None


def normalize_cn_numbers(s):
    """把正文里的汉字数字串替换成等值的阿拉伯数字（保留原文其余部分）。"""
    def repl(m):
        v = cn_number_to_int(m.group(0))
        return str(v) if v is not None else m.group(0)
    return _CN_NUM_RE.sub(repl, s)


def parse_frontmatter(src):
    """返回 (meta: dict, body: str, error: str|None)"""
    if not src.startswith("---"):
        return {}, src, "文件不以 frontmatter 开头"
    m = re.match(r"^---[ \t]*\r?\n(.*?)\r?\n---[ \t]*\r?\n?", src, re.S)
    if not m:
        return {}, src, "frontmatter 未正确闭合"
    raw, body = m.group(1), src[m.end():]
    meta = {}
    refs = []
    cur_ref = None
    in_refs = False
    for line in raw.splitlines():
        if not line.strip():
            continue
        if re.match(r"^references\s*:\s*$", line):
            in_refs = True
            meta["references"] = refs
            continue
        if in_refs:
            mm = re.match(r"^\s*-\s*(.*)$", line)
            if mm:
                cur_ref = {}
                refs.append(cur_ref)
                rest = mm.group(1).strip()
                km = re.match(r"^([A-Za-z_]+)\s*:\s*(.*)$", rest)
                if km:
                    cur_ref[km.group(1)] = unquote(km.group(2))
                continue
            km = re.match(r"^\s+([A-Za-z_]+)\s*:\s*(.*)$", line)
            if km and cur_ref is not None:
                cur_ref[km.group(1)] = unquote(km.group(2))
            continue
        km = re.match(r"^([A-Za-z_]+)\s*:\s*(.*)$", line)
        if km:
            meta[km.group(1)] = unquote(km.group(2))
    return meta, body, None


def unquote(v):
    v = v.strip()
    if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
        return v[1:-1]
    return v


def webp_size(data):
    """解析 webp 宽高；失败返回 None。"""
    if len(data) < 30 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        return None
    fourcc = data[12:16]
    try:
        if fourcc == b"VP8 ":
            w = int.from_bytes(data[26:28], "little") & 0x3FFF
            h = int.from_bytes(data[28:30], "little") & 0x3FFF
            return w, h
        if fourcc == b"VP8L":
            bits = int.from_bytes(data[21:25], "little")
            w = (bits & 0x3FFF) + 1
            h = ((bits >> 14) & 0x3FFF) + 1
            return w, h
        if fourcc == b"VP8X":
            w = int.from_bytes(data[24:27], "little") + 1
            h = int.from_bytes(data[27:30], "little") + 1
            return w, h
    except Exception:
        return None
    return None


def image_size(name, data):
    low = name.lower()
    if low.endswith(".webp"):
        return webp_size(data)
    if low.endswith(".png") and data[:8] == b"\x89PNG\r\n\x1a\n":
        return (int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big"))
    if low.endswith((".jpg", ".jpeg")) and data[:2] == b"\xff\xd8":
        i = 2
        while i < len(data) - 9:
            if data[i] != 0xFF:
                i += 1
                continue
            marker = data[i + 1]
            if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                h = int.from_bytes(data[i + 5:i + 7], "big")
                w = int.from_bytes(data[i + 7:i + 9], "big")
                return w, h
            seg = int.from_bytes(data[i + 2:i + 4], "big")
            i += 2 + seg
        return None
    return None


def ngrams(s, n=4):
    s = re.sub(r"\s+", " ", s.lower())
    s = re.sub(r"[^\w\u0400-\u04FF\u0600-\u06FF\u0900-\u0DFF\u3040-\u30FF\u4E00-\u9FFF ]", "", s)
    return {s[i:i + n] for i in range(max(0, len(s) - n + 1))}


def jaccard(a, b):
    if not a or not b:
        return 0.0
    return len(a & b) / float(len(a | b))


# ---------------------------------------------------------------- 正文结构签名（P21/P22）

# 列表符号：- / * / + 为无序，数字加 . 或 ) 为有序
_UL_MARKERS = ("-", "*", "+")
_OL_RE = re.compile(r"^\s*(\d+)([.)])\s+")
_UL_RE = re.compile(r"^(\s*)([-*+])\s+")

def _blocks(body):
    """Split a body into blank-line separated blocks, trimmed and non-empty."""
    return [b.strip() for b in body.split("\n\n") if b.strip()]


def _block_kind(b):
    """Classify one block: H2 / H3 / H4 / IMG / TABLE / LIST / QUOTE / CODE / PARA.

    TABLE = a markdown pipe table (a header row plus a separator row).
    LIST  = any markdown list marker: '-', '*', '+' or an ordered '1.' / '1)'.
    QUOTE = a block quote ('>').
    CODE  = a fenced code block (```).
    """
    if b.startswith("#### "):
        return "H4"
    if b.startswith("### "):
        return "H3"
    if b.startswith("## "):
        return "H2"
    if b.startswith("!"):
        return "IMG"
    if b.startswith("|"):
        return "TABLE"
    if b.startswith(">"):
        return "QUOTE"
    if b.startswith("```"):
        return "CODE"
    if _UL_RE.match(b) or _OL_RE.match(b):
        return "LIST"
    return "PARA"


def _list_items(b):
    """Number of list items in a list block.

    Counts every markdown list marker, not just '- ', so a list written
    with '*' or '1.' is measured on the same footing.
    """
    return sum(1 for ln in b.split("\n")
               if _UL_RE.match(ln) or _OL_RE.match(ln))


def _table_rows(b):
    """Number of rows in a markdown table (header + separator + body)."""
    rows = [ln for ln in b.split("\n") if ln.strip().startswith("|")]
    # drop the separator row (|---|---|)
    body_rows = [r for r in rows
                 if not re.match(r"^\|[\s:\-|]+\|$", r.strip())]
    return len(body_rows)


def section_list_counts(body):
    """Map each H2 section (in order) to the number of list items it carries.

    Sections are keyed by '1', '2', ... in document order. The leading
    material before the first H2 is keyed as '0'.
    """
    counts = {}
    idx = 0
    cur = "0"
    for b in _blocks(body):
        k = _block_kind(b)
        if k == "H2":
            idx += 1
            cur = str(idx)
            counts.setdefault(cur, 0)
            continue
        if k == "LIST":
            counts[cur] = counts.get(cur, 0) + _list_items(b)
    return counts


def block_signature(body):
    """Ordered tuple of block kinds, list blocks collapsed to 'LIST'.

    Two languages that carry the same material in the same order produce the
    same signature, regardless of how many items each list holds.
    """
    return tuple(_block_kind(b) for b in _blocks(body))


# ---------------------------------------------------------------- 结构维度提取（v1.8）



def _list_marker_kinds(b):
    """Ordered list of marker kinds for a list block.

    Each entry is one of '-', '*', '+', 'OL.' (ordered with dot) or
    'OL)' (ordered with parenthesis). Comparing this across languages
    catches a translator who switched bullets to dashes or to numbers.
    """
    kinds = []
    for ln in b.split("\n"):
        m = _OL_RE.match(ln)
        if m:
            kinds.append("OL" + m.group(2))
            continue
        m = _UL_RE.match(ln)
        if m:
            kinds.append(m.group(2))
    return tuple(kinds)


def _list_item_emphasis(b):
    """Per-item emphasis counts for a list block.

    Returns a tuple with one (bold, italic, code) triple per list item,
    in document order. Comparing this across languages catches emphasis
    that was moved from one item to another: the block total stays the
    same, but the visual emphasis lands on the wrong item.
    """
    out = []
    for ln in b.split("\n"):
        if _UL_RE.match(ln) or _OL_RE.match(ln):
            out.append(_emphasis_counts(ln))
    return tuple(out)


def _list_indent_levels(b):
    """Ordered tuple of indent levels (in spaces) for a list block."""
    out = []
    for ln in b.split("\n"):
        m = _UL_RE.match(ln) or _OL_RE.match(ln)
        if m:
            out.append(len(m.group(1)))
    return tuple(out)


def _table_cols(b):
    """Column count of a markdown table, taken from its header row.

    Returns 0 when the table has no parsable header.
    """
    for ln in b.split("\n"):
        s = ln.strip()
        if not s.startswith("|"):
            continue
        if re.match(r"^\|[\s:\-|]+\|$", s):
            continue
        body = s[1:] if s.startswith("|") else s
        body = body[:-1] if body.endswith("|") else body
        return len(body.split("|"))
    return 0


def _table_row_col_counts(b):
    """Column count of every row of a table, in order.

    A well-formed table has the same count in every row; this catches a
    translator who dropped a cell in one row only.
    """
    out = []
    for ln in b.split("\n"):
        s = ln.strip()
        if not s.startswith("|"):
            continue
        body = s[1:] if s.startswith("|") else s
        body = body[:-1] if body.endswith("|") else body
        out.append(len(body.split("|")))
    return tuple(out)


def _emphasis_counts(t):
    """Counts of inline emphasis markers in a text fragment.

    Returns (bold, italic, code). Bold is counted first and its markers
    removed, so that ***text*** does not inflate the italic count.
    """
    t = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", t)
    bold = len(re.findall(r"\*\*(?=\S)(?:[^*]|\*(?!\*))+\*\*", t))
    t2 = re.sub(r"\*\*(?=\S)(?:[^*]|\*(?!\*))+\*\*", "", t)
    code = len(re.findall(r"`[^`\n]+`", t2))
    t3 = re.sub(r"`[^`\n]+`", "", t2)
    italic = len(re.findall(r"(?<![*\w])\*[^*\n]+\*(?!\*)", t3))
    italic += len(re.findall(r"(?<![_\w])_[^_\n]+_(?![_\w])", t3))
    return bold, italic, code


def _inline_links(t):
    """Ordered list of link targets in a text fragment (images excluded)."""
    t = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", t)
    return tuple(re.findall(r"(?<!!)\[[^\]]*\]\(([^)]*)\)", t))


def _link_shape(t):
    """Link targets reduced to a language-neutral shape.

    A CTA link is written as /<lang>/packages/ in every language, so the
    locale prefix has to be stripped before targets can be compared.
    """
    out = []
    for tgt in _inline_links(t):
        out.append(re.sub(r"^/[a-z]{2}(?=/|$)", "/<lang>", tgt))
    return tuple(out)


def block_outline(body):
    """One-to-one outline of a body: one entry per block.

    Each entry is (kind, detail) where detail carries everything that must
    match across languages for that block:

        H2/H3/H4 -> (level, bold, italic, code)
        LIST     -> (items, markers, indents, bold, italic, code)
        TABLE    -> (rows, cols, row_cols, bold, italic, code)
        IMG      -> (file name, alt present, link shape)
        PARA     -> (bold, italic, code, link shape)

    Two languages whose outline is identical carry exactly the same material
    in exactly the same order, with the same block sizes, the same list
    markers, the same table geometry and the same inline emphasis.
    """
    out = []
    for b in _blocks(body):
        k = _block_kind(b)
        if k in ("H2", "H3", "H4"):
            bold, ital, code = _emphasis_counts(b)
            out.append((k, (int(k[1]), bold, ital, code)))
        elif k == "LIST":
            bold, ital, code = _emphasis_counts(b)
            out.append((k, (_list_items(b), _list_marker_kinds(b),
                            _list_indent_levels(b), bold, ital, code,
                            _list_item_emphasis(b))))
        elif k == "TABLE":
            bold, ital, code = _emphasis_counts(b)
            out.append((k, (_table_rows(b), _table_cols(b),
                            _table_row_col_counts(b), bold, ital, code)))
        elif k == "QUOTE":
            bold, ital, code = _emphasis_counts(b)
            out.append((k, (b.count("\n") + 1, bold, ital, code)))
        elif k == "CODE":
            out.append((k, (b.count("\n") + 1, )))
        elif k == "IMG":
            m = re.search(r"/([^/\s]+\.webp)", b)
            alt = re.search(r"!\[([^\]]*)\]", b)
            out.append((k, (m.group(1) if m else "",
                            1 if (alt and alt.group(1).strip()) else 0,
                            _link_shape(b))))
        else:
            bold, ital, code = _emphasis_counts(b)
            out.append((k, (bold, ital, code, _link_shape(b),
                            b.count("\n"))))
    return tuple(out)


def outline_diff(base, cur):
    """Describe how two outlines differ, block by block.

    Returns a list of human-readable differences, one per block position.
    """
    diffs = []
    n = max(len(base), len(cur))
    for i in range(n):
        b = base[i] if i < len(base) else None
        c = cur[i] if i < len(cur) else None
        if b == c:
            continue
        if b is None:
            diffs.append("第%d块 本语言多出 %s/%s" % (i + 1, c[0], c[1]))
        elif c is None:
            diffs.append("第%d块 本语言缺少 %s/%s" % (i + 1, b[0], b[1]))
        elif b[0] != c[0]:
            diffs.append("第%d块 类型不同：基准 %s，本语言 %s" % (i + 1, b[0], c[0]))
        elif isinstance(b[1], tuple) and isinstance(c[1], tuple):
            labels = _DETAIL_LABELS.get(b[0], [])
            for j, (x, y) in enumerate(zip(b[1], c[1])):
                if x == y:
                    continue
                lab = labels[j] if j < len(labels) else "维度%d" % j
                diffs.append("第%d块 %s 的%s不同：基准 %s，本语言 %s"
                             % (i + 1, b[0], lab, _fmt_val(x), _fmt_val(y)))
            if len(b[1]) != len(c[1]):
                diffs.append("第%d块 %s 的维度数不同：基准 %d，本语言 %d"
                             % (i + 1, b[0], len(b[1]), len(c[1])))
        else:
            diffs.append("第%d块 %s 规模不同：基准 %s，本语言 %s"
                         % (i + 1, b[0], b[1], c[1]))
    return diffs


# 每个块类型的 detail 元组，各维度的中文标签
_DETAIL_LABELS = {
    "H2": ("标题层级", "加粗数", "斜体数", "行内代码数"),
    "H3": ("标题层级", "加粗数", "斜体数", "行内代码数"),
    "H4": ("标题层级", "加粗数", "斜体数", "行内代码数"),
    "LIST": ("条目数", "列表符号", "缩进层级", "加粗数", "斜体数", "行内代码数",
             "逐项加粗分布"),
    "TABLE": ("行数", "列数", "各行列数", "加粗数", "斜体数", "行内代码数"),
    "QUOTE": ("引用行数", "加粗数", "斜体数", "行内代码数"),
    "CODE": ("代码行数",),
    "IMG": ("文件名", "alt 是否存在", "链接目标"),
    "PARA": ("加粗数", "斜体数", "行内代码数", "链接目标", "段内换行数"),
}


def _blocks_by_kind(outline):
    """Group an outline's blocks by kind, keeping document order within a kind.

    Returns {kind: [(index, detail), ...]}. Pairing blocks by kind and by
    order-within-kind makes a comparison robust against blocks being added
    or removed elsewhere in the document: one extra table elsewhere must not
    shift the column comparison of every later table.
    """
    buckets = {}
    for i, (k, d) in enumerate(outline):
        buckets.setdefault(k, []).append((i, d))
    return buckets


def _link_dim(detail, kind):
    """Extract the link-target dimension from a block detail tuple."""
    if not isinstance(detail, tuple):
        return ()
    if kind == "IMG":
        return detail[2] if len(detail) > 2 else ()
    if kind == "PARA":
        return detail[3] if len(detail) > 3 else ()
    return ()


def _fmt_val(v):
    """Render a detail value compactly for an error message."""
    if isinstance(v, tuple):
        return "/".join(str(x) for x in v)
    return str(v)


# ---------------------------------------------------------------- 写作纪律（ST 系列）

def _line_of(src, pos):
    return src.count("\n", 0, pos) + 1


def check_style(tag, src, add):
    """ST01–ST07：去 AI 味与格式纪律。方案 3.1（禁用词/破折号）与 3.1a（序号段落列表化）的可执行版。"""
    lines = src.split("\n")
    # ST01 em dash 清零
    for i, ln in enumerate(lines, 1):
        if "—" in ln:
            add("ST01", "error", tag,
                "第 %d 行出现 em dash（——或—）：正文禁用，改冒号、拆句或括号" % i)
            break
    # ST02 en dash 只能夹在数字/编号之间（2–4、S0–S13、p01–p06）
    for i, ln in enumerate(lines, 1):
        if re.search(r"(?:^|\s)–|–(?:\s|$)", ln):
            add("ST02", "error", tag,
                "第 %d 行 en dash 未用于区间（只允许 数字/编号–数字/编号）" % i)
            break
    # ST03 / ST04 AI 高频词
    for w in AI_PHRASES_EN:
        m = re.search(r"(?i)\b" + re.escape(w).replace(r"\ ", r"\s+") + r"\b", src)
        if m:
            add("ST03", "error", tag,
                "第 %d 行 AI 高频词（EN）: %r" % (_line_of(src, m.start()), m.group(0)))
    for w in AI_PHRASES_ZH:
        m = re.search(re.escape(w), src)
        if m:
            add("ST04", "error", tag,
                "第 %d 行 AI 高频词（zh）: %r" % (_line_of(src, m.start()), w))
    # ST05 反转钩子 / 设问自答
    for pat in REVERSAL_RES:
        m = re.search(pat, src, re.I)
        if m:
            add("ST05", "error", tag,
                "第 %d 行反转钩子句式: %r" % (_line_of(src, m.start()), m.group(0)[:40]))
    # ST06 段首 AI 连接词（warning：单次可保留，堆叠即改写）
    for pat, label in PARA_OPEN_RES:
        m = re.search(pat, src)
        if m:
            add("ST06", "warning", tag,
                "第 %d 行%s: %r" % (_line_of(src, m.start()), label, m.group(0).strip()))
    # ST07 段内序号连排 → 提示按方案 3.1a 评估拆为列表（warning）
    for p_i, para in enumerate(src.split("\n\n"), 1):
        if para.strip().startswith(("-", "*", "#")):
            continue
        hits = len(re.findall(r"[①②③④⑤⑥⑦⑧⑨⑩]", para))
        hits += len(re.findall(r"第[一二三四五六七八九十]+(?:[件步条项个])?[，,、]", para))
        hits += len(re.findall(r"(?i)\b(?:first|second|third|fourth|fifth),", para))
        if hits >= 3:
            add("ST07", "warning", tag,
                "第 %d 段内含 %d 个序号标记，按方案 3.1a 评估拆为列表" % (p_i, hits))
            break


# ---------------------------------------------------------------- 主检查

def check(path):
    findings = []

    def add(rule, severity, slug, detail):
        findings.append(Finding(rule, severity, slug, detail))

    files, total_bytes = load_package(path)

    if total_bytes is not None and total_bytes > MAX_PACKAGE_BYTES:
        add("S06", "error", "-", "压缩包总大小 %.1f MB > 60 MB" % (total_bytes / 1048576.0))

    # --- 顶层结构：articles/<slug>/...
    names = list(files.keys())
    articles = {}
    for n in names:
        if n.startswith("__MACOSX/") or n.endswith("/.DS_Store") or n == ".DS_Store":
            add("S05", "error", "-", "压缩包内含系统垃圾文件: %s" % n)
            continue
        if any(part.startswith(".") for part in n.split("/")):
            add("S05", "error", "-", "压缩包内含隐藏文件: %s" % n)
            continue
        parts = n.split("/")
        if parts[0] != "articles":
            add("S01", "error", "-", "顶层必须是 articles/ 目录，发现: %s" % n)
            continue
        if len(parts) < 2:
            continue
        articles.setdefault(parts[1], []).append("/".join(parts[2:]))

    if not articles:
        add("S01", "error", "-", "压缩包内没有 articles/<slug>/ 结构")
        return findings

    slugs = set()
    for slug in sorted(articles):
        prefix = "articles/%s/" % slug
        art = {k: v for k, v in files.items() if k.startswith(prefix)}
        check_article(slug, art, add)
        if slug in slugs:
            add("M03", "error", slug, "slug 重复")
        slugs.add(slug)

    return findings


def check_article(slug, art, add):
    rel = lambda k: k.split("/", 2)[2] if k.count("/") >= 2 else k

    # --- 文件白名单 & 命名
    mdx_files = {}
    image_files = {}
    for full, data in art.items():
        tail = rel(full)
        suffix = os.path.splitext(tail)[1].lower()
        if suffix not in ALLOWED_SUFFIX:
            add("S05", "error", slug, "不允许的文件类型: %s" % tail)
            continue
        if suffix == ".mdx":
            m = re.match(r"^content/([a-z]{2}(?:-[A-Za-z]{2,4})?)/(.+)\.mdx$", tail)
            if not m:
                add("S04", "error", slug, "mdx 路径应为 content/<lang>/<slug>.mdx，发现: %s" % tail)
                continue
            lang, fname = m.group(1), m.group(2)
            if fname != slug:
                add("S04", "error", slug, "文件名必须等于 slug（%s），发现 %s.mdx" % (slug, fname))
            if lang not in LOCALES:
                add("S03", "error", slug, "未知语言目录: %s" % lang)
            if len(data) > MAX_MDX_BYTES:
                add("S06", "error", slug, "%s/%s.mdx 超过 100KB" % (lang, slug))
            mdx_files[lang] = text(data)
        elif suffix == ".webp":
            m = re.match(r"^images/([^/]+)/([^/]+\.webp)$", tail)
            if not m:
                add("S04", "error", slug, "图片路径应为 images/<slug>/<name>.webp，发现: %s" % tail)
                continue
            if m.group(1) != slug:
                add("S04", "error", slug, "图片目录必须等于 slug，发现: %s" % tail)
            image_files[m.group(2)] = data
        elif suffix in IMAGE_EXTS:
            add("I01", "error", slug, "图片必须为 webp，发现: %s" % tail)

    # --- submission.json
    sub_key = "articles/%s/submission.json" % slug
    meta = {}
    if sub_key not in art:
        add("M01", "error", slug, "缺少 submission.json")
    else:
        try:
            meta = json.loads(text(art[sub_key]))
        except Exception as exc:
            add("M01", "error", slug, "submission.json 不是合法 JSON: %s" % exc)
            meta = {}
    if meta:
        for req in ["slug", "title", "date", "category", "author", "excerpt", "locales", "images", "imageRights"]:
            if req not in meta:
                add("M02", "error", slug, "submission.json 缺少字段 %s" % req)
        if meta.get("slug") not in (None, slug):
            add("M03", "error", slug, "submission.json 的 slug 与目录名不一致")
        date = str(meta.get("date", ""))
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", date):
            add("M04", "error", slug, "date 应为 YYYY-MM-DD")
        else:
            try:
                d = datetime.strptime(date, "%Y-%m-%d").date()
                tz8 = timezone(timedelta(hours=8))
                if d > datetime.now(tz8).date():
                    add("M04", "error", slug, "date 不得晚于今天（UTC+8）")
            except ValueError:
                add("M04", "error", slug, "date 不是合法日期")
        if meta.get("category") not in CATEGORIES:
            add("M05", "error", slug, "category 必须是: %s" % " / ".join(CATEGORIES))
        if meta.get("author") != AUTHOR:
            add("M06", "error", slug, "author 必须固定为 %s（当前: %r）" % (AUTHOR, meta.get("author")))
        locs = meta.get("locales")
        if isinstance(locs, list) and sorted(locs) != sorted(LOCALES):
            missing = sorted(set(LOCALES) - set(locs))
            extra = sorted(set(locs) - set(LOCALES))
            add("M07", "error", slug, "locales 必须正好 48 个；缺: %s；多: %s" %
                (missing or "无", extra or "无"))
        imgs = meta.get("images")
        if isinstance(imgs, list) and sorted(imgs) != sorted(image_files.keys()):
            add("M08", "error", slug, "images 清单与实际文件不一致（清单: %s / 实际: %s）" %
                (sorted(imgs), sorted(image_files.keys())))
        if not str(meta.get("imageRights", "")).strip():
            add("M02", "error", slug, "imageRights 不能为空（需确认可商用）")

    # --- 语言齐备
    for lang in LOCALES:
        if lang not in mdx_files:
            add("S02", "error", slug, "缺少语言: %s" % lang)

    # --- 每篇 frontmatter / 正文
    parsed = {}
    for lang, src in sorted(mdx_files.items()):
        fm, body, err = parse_frontmatter(src)
        parsed[lang] = (fm, body)
        tag = "%s/%s" % (lang, slug)
        if err:
            add("F01", "error", tag, err)
            continue
        missing = [k for k in FRONTMATTER_KEYS if k not in fm]
        if missing:
            add("F02", "error", tag, "frontmatter 缺字段: %s" % ", ".join(missing))
        extra = [k for k in fm if k not in FRONTMATTER_KEYS]
        if extra:
            add("F02", "error", tag, "frontmatter 多出字段: %s（只允许 %s）" %
                (", ".join(extra), ", ".join(FRONTMATTER_KEYS)))

        title = fm.get("title", "")
        if len(title) > MAX_TITLE:
            add("F03", "error", tag, "title 超长（%d > %d）" % (len(title), MAX_TITLE))
        if re.search(r"[:：\-—–]", title):
            add("F03", "error", tag, "title 不得含冒号或连字符/破折号")
        if not title.strip():
            add("F03", "error", tag, "title 不能为空")
        if fm.get("slug") != slug:
            add("F04", "error", tag, "frontmatter slug 必须等于 %s" % slug)
        if meta.get("date") and fm.get("date") != meta.get("date"):
            add("F05", "error", tag, "frontmatter date 与 submission.json 不一致")
        if meta.get("category") and fm.get("category") != meta.get("category"):
            add("F06", "error", tag, "frontmatter category 与 submission.json 不一致")
        if fm.get("category") and fm.get("category") not in CATEGORIES:
            add("F06", "error", tag, "category 不在白名单")
        excerpt = fm.get("excerpt", "")
        if len(excerpt) > MAX_EXCERPT:
            add("F07", "error", tag, "excerpt 超长（%d > %d）" % (len(excerpt), MAX_EXCERPT))
        if excerpt and excerpt.strip() == title.strip():
            add("F07", "error", tag, "excerpt 不能与 title 相同")
        # ST03/ST04/ST05 亦适用于 title 与 excerpt
        te = title + "\n" + excerpt
        for w in AI_PHRASES_EN:
            if re.search(r"(?i)\b" + re.escape(w).replace(r"\ ", r"\s+") + r"\b", te):
                add("ST03", "error", tag, "title/excerpt 出现 AI 高频词（EN）: %r" % w)
        for w in AI_PHRASES_ZH:
            if w in te:
                add("ST04", "error", tag, "title/excerpt 出现 AI 高频词（zh）: %r" % w)
        for pat in REVERSAL_RES:
            if re.search(pat, te, re.I):
                add("ST05", "error", tag, "title/excerpt 出现反转钩子句式")
        refs = fm.get("references")
        if refs is None:
            refs = []
        if len(refs) > 6:
            add("F08", "error", tag, "references 最多 6 条")
        for r in refs:
            if not r.get("title"):
                add("F08", "error", tag, "references 条目缺 title: %r" % r)
            if not re.match(r"^https://", str(r.get("url", ""))):
                add("F08", "error", tag, "references url 必须 https:// 开头: %r" % r.get("url"))

        check_body(tag, lang, body, image_files, slug, add)

    # --- 本地化真实性
    en_fm, en_body = parsed.get("en", ({}, ""))
    en_title = en_fm.get("title", "")
    en_excerpt = en_fm.get("excerpt", "")
    en_ng = ngrams(en_body)
    en_heads = {h.strip() for h in re.findall(r"(?m)^## (.+)$", en_body) if h.strip()}
    en_ref_titles = [str(r.get("title", "")).strip() for r in (en_fm.get("references") or [])]
    for lang, (fm, body) in parsed.items():
        if lang == "en":
            continue
        tag = "%s/%s" % (lang, slug)
        if en_title and fm.get("title", "").strip() == en_title.strip():
            add("L01", "error", tag, "title 与英文完全相同（疑似未翻译）")
        if en_excerpt and fm.get("excerpt", "").strip() == en_excerpt.strip():
            add("L02", "error", tag, "excerpt 与英文完全相同（疑似未翻译）")
        pat = SCRIPT_TESTS.get(lang)
        blob = fm.get("title", "") + " " + fm.get("excerpt", "") + " " + body
        if pat and not re.search(pat, blob):
            add("L03", "error", tag, "正文未使用该语言的文字系统（疑似英文回退）")
        if lang not in CJK_LANGS and re.search(r"[\u4E00-\u9FFF]", blob):
            add("L04", "error", tag, "非中日韩语种出现中文字符（疑似中文回退）")
        # L07 小节标题与英文完全相同（全角标题一般应翻译；术语标题可人工确认）
        same_heads = [h for h in re.findall(r"(?m)^## (.+)$", body)
                      if h.strip() and h.strip() in en_heads]
        if same_heads:
            add("L07", "warning", tag,
                "小节标题与英文完全相同（疑似未翻译）: %s" % same_heads[:2])
        # L08 参考文献标题与英文完全相同（SPEC 第 3 节：非英文须翻译）
        for idx, ref in enumerate(fm.get("references") or []):
            if idx < len(en_ref_titles) and en_ref_titles[idx] \
                    and str(ref.get("title", "")).strip() == en_ref_titles[idx]:
                add("L08", "error", tag,
                    "references 第 %d 条标题与英文相同（须翻译）" % (idx + 1))
                break
        score = jaccard(ngrams(body), en_ng)
        if score > SIMILARITY_LIMIT:
            add("L05", "error", tag, "正文与英文相似度过高（%.2f），疑似未翻译" % score)
        for para in [p for p in body.split("\n\n") if p.strip()]:
            if para.strip().startswith("-"):
                continue
            if lang in CJK_LANGS:
                limit = MAX_PARAGRAPH_CHARS_CJK
            elif lang in DENSE_SCRIPT_LANGS:
                limit = MAX_PARAGRAPH_CHARS_DENSE
            else:
                limit = MAX_PARAGRAPH_CHARS
            if len(para) > limit:
                add("W02", "warning", tag,
                    "存在超长段落（%d 字符，上限 %d）" % (len(para), limit))
                break

    en_words = len(re.findall(r"\w+", en_body, re.UNICODE))
    if parsed.get("en") and en_words < MIN_EN_WORDS:
        add("W01", "warning", "%s/%s" % ("en", slug),
            "英文正文偏短（%d 词，建议 ≥%d）" % (en_words, MIN_EN_WORDS))

    # ---------------------------------------------------------------- P 系列跨语言一致性（v1.2）
    if len(parsed) >= 2 and not _NO_PARITY:
        # 基准语言：中文优先（中文稿是撰稿母版，段落结构以它为准），
        # 无中文时退回英文。--master=<lang> 可显式指定。
        master_lang = (_MASTER_LANG or
                       ("zh" if "zh" in parsed else
                        "en" if "en" in parsed else sorted(parsed)[0]))
        m_body = parsed[master_lang][1]
        img_re = IMG_REF_RE % re.escape(slug)

        # P02 小节数一致
        sec = {lg: len(re.findall(r"(?m)^## ", b)) for lg, (_fm, b) in parsed.items()}
        off = {lg: n for lg, n in sorted(sec.items()) if n != sec[master_lang]}
        if off:
            add("P02", "error", slug,
                "小节数与基准 %s（%d 节）不一致: %s" % (master_lang, sec[master_lang], off))

        # P03 图片集合一致
        figs = {lg: frozenset(re.findall(img_re, b)) for lg, (_fm, b) in parsed.items()}
        base = figs[master_lang]
        for lg in sorted(figs):
            if figs[lg] != base:
                add("P03", "error", slug,
                    "%s 图片集与 %s 不一致（缺 %s，多 %s）" %
                    (lg, master_lang, sorted(base - figs[lg]), sorted(figs[lg] - base)))

        # P01 同一图片在同一语言内被引用多次
        for lg in sorted(parsed):
            names = re.findall(img_re, parsed[lg][1])
            dups = sorted({n for n in names if names.count(n) > 1})
            if dups:
                add("P01", "error", "%s/%s" % (lg, slug), "同一图片被引用多次: %s" % dups)

        # P04 关键数字跨语言齐全（本族数字/千分位/小数逗号归一）
        facts = extract_fact_numbers(m_body)
        for lg in sorted(parsed):
            nb = normalize_digits(parsed[lg][1])
            missing = [s for s in facts if not find_number(nb, s)]
            if missing:
                add("P04", "error", "%s/%s" % (lg, slug),
                    "关键数字缺失（对照 %s）: %s" % (master_lang, missing))

        # P18 配图引用顺序与基准一致（内容重排会导致读者看到的讲解次序不同）
        fig_seq = {lg: tuple(re.findall(img_re, b)) for lg, (_fm, b) in parsed.items()}
        base_seq = fig_seq[master_lang]
        for lg in sorted(fig_seq):
            if fig_seq[lg] != base_seq:
                add("P18", "warning", "%s/%s" % (lg, slug),
                    "配图引用顺序与 %s 不一致（%d 张图）" % (master_lang, len(base_seq)))

        # P19 基准语言的关键事实编号（≥10 的非年份整数：文号/税率/限额/窗口）
        # 在各语言齐全；数字书写变体（本族数字、千分位、空格分组）均归一后比对
        fact_ints = sorted({m.group(1) for m in
                            re.finditer(r"(?<![\w.])(\d+)(?![\w.])", m_body)
                            if int(m.group(1)) >= DOC_NUMBER_MIN
                            and not DOC_NUMBER_YEAR_MIN <= int(m.group(1)) <= DOC_NUMBER_YEAR_MAX},
                           key=int)
        for lg in sorted(parsed):
            if lg == master_lang:
                continue
            nb = normalize_digits(parsed[lg][1])
            # 中文等语言用汉字数字书写计数（如「十四个工作包」），
            # 归一为阿拉伯数字后才与基准可比对
            nb_cn = normalize_cn_numbers(nb)
            variants = {nb, nb_cn,
                        nb.replace(",", ""),
                        nb.replace(" ", "").replace("\u00a0", ""),
                        nb_cn.replace(",", ""),
                        nb_cn.replace(" ", "").replace("\u00a0", ""),
                        nb.replace(",", "").replace(" ", "").replace("\u00a0", ""),
                        nb_cn.replace(",", "").replace(" ", "").replace("\u00a0", "")}
            # 该语言可能用数字词书写计数（中文母版「14 个」vs 英文 "fourteen"），
            # 一并纳入可接受形态
            words = NUMBER_WORDS.get(lg, {})
            missing = [v for v in fact_ints
                       if not any(re.search(r"(?<!\d)%s(?!\d)" % re.escape(v), t) for t in variants)
                       and not (words.get(int(v))
                                and any(re.search(r"(?<!\w)%s(?!\w)" % re.escape(words[int(v)]), t)
                                        for t in variants))]
            if missing:
                add("P19", "warning", "%s/%s" % (lg, slug),
                    "关键编号缺失（对照 %s）: %s" % (master_lang, missing))

        # P20 关键代码齐全：从基准语言提取裁定号（X####-##）与 HS 编码（####.####），
        # 各语言不得丢失（P04 排除字母相邻编码，此条兜底）
        key_codes = sorted(set(re.findall(r"\b[A-Z]\d{4}-\d{2}\b|\b\d{4}\.\d{4}\b", m_body)))
        for lg in sorted(parsed):
            if lg == master_lang or not key_codes:
                continue
            miss_codes = [c for c in key_codes if c not in parsed[lg][1]]
            if miss_codes:
                add("P20", "warning", "%s/%s" % (lg, slug), "关键代码缺失: %s" % miss_codes)

        # P21 分节列表项数一致：同一小节内，各语言的列表条目数必须对齐。
        # 抓到过的问题：部分语言把「九个板块」「四项检查」等列表压成散文段落，
        # 读者看到的信息层级与其他语言不同，篇幅也随之缩水。
        for lg in sorted(parsed):
            if lg == master_lang:
                continue
            base_map = section_list_counts(m_body)
            cur_map = section_list_counts(parsed[lg][1])
            if set(base_map) != set(cur_map):
                add("P21", "error", "%s/%s" % (lg, slug),
                    "小节结构与 %s 不一致（章节集合不同）" % master_lang)
                continue
            off = [(sec, base_map[sec], cur_map[sec]) for sec in base_map
                   if base_map[sec] != cur_map[sec]]
            if off:
                add("P21", "error", "%s/%s" % (lg, slug),
                    "分节列表项数与 %s 不一致: %s" %
                    (master_lang, ", ".join("第%s节 %d≠%d" % o for o in off[:6])))

        # P22 正文块顺序一致：段落 / 列表 / 图片 / 表格 的排布次序必须与基准一致。
        # 抓到过的问题：同一份内容在部分语言里图片出现在列表之前，讲解顺序与
        # 其他语言相反；本条把「列表在前、图片在后」的固定节奏固定下来。
        # 图片比对的是文件名而非仅类型：fig-01 与 fig-02 互换位置同样是错位。
        base_sig = block_signature(m_body)
        base_fig_seq = tuple(re.findall(img_re, m_body))
        for lg in sorted(parsed):
            if lg == master_lang:
                continue
            cur_sig = block_signature(parsed[lg][1])
            cur_fig_seq = tuple(re.findall(img_re, parsed[lg][1]))
            if cur_sig == base_sig and cur_fig_seq == base_fig_seq:
                continue
            if cur_fig_seq != base_fig_seq and cur_sig == base_sig:
                add("P22", "error", "%s/%s" % (lg, slug),
                    "配图位置与 %s 不一致（%s vs %s）" %
                    (master_lang, list(base_fig_seq), list(cur_fig_seq)))
                continue
            diff = next((i for i, (a, b) in enumerate(zip(base_sig, cur_sig)) if a != b),
                        min(len(base_sig), len(cur_sig)))
            add("P22", "error", "%s/%s" % (lg, slug),
                "正文块顺序与 %s 不一致（第%d块起：%s vs %s）" %
                (master_lang, diff + 1,
                 base_sig[diff] if diff < len(base_sig) else "-",
                 cur_sig[diff] if diff < len(cur_sig) else "-"))

        # P23 逐块一一对应：以基准语言为准，每个块的位置、类型与规模都必须
        # 与基准完全相同——标题层级、段落、列表（条目数）、图片（文件名）、
        # 表格（行数）逐块对齐。这条是「一比一结构」的最终判据：
        # P21 看分节汇总、P22 看类型序列，P23 落到每一块的具体规模。
        base_outline = block_outline(m_body)
        for lg in sorted(parsed):
            if lg == master_lang:
                continue
            cur_outline = block_outline(parsed[lg][1])
            if cur_outline == base_outline:
                continue
            diffs = outline_diff(base_outline, cur_outline)
            add("P23", "error", "%s/%s" % (lg, slug),
                "逐块结构与 %s 不一致（%d 处）: %s" %
                (master_lang, len(diffs), "; ".join(diffs[:8])))

        # P24 表格几何一致：表格的列数、每行列数必须与基准完全相同。
        # 抓到过的问题：某个语言少写一列，或某一行漏了一个单元格，表格渲染后
        # 出现错位。
        base_buckets = _blocks_by_kind(base_outline)
        for lg in sorted(parsed):
            if lg == master_lang:
                continue
            cur_outline = block_outline(parsed[lg][1])
            cur_buckets = _blocks_by_kind(cur_outline)
            for bi, d in base_buckets.get("TABLE", []):
                pair = cur_buckets.get("TABLE", [])
                # 按表格出现顺序配对：基准第 n 张表 对 本语言第 n 张表
                n = base_buckets["TABLE"].index((bi, d))
                if n >= len(pair):
                    continue
                _ci, cd = pair[n]
                if cd[1] != d[1]:
                    add("P24", "error", "%s/%s" % (lg, slug),
                        "第%d张表 列数与 %s 不一致：基准 %s，本语言 %s"
                        % (n + 1, master_lang, d[1], cd[1]))
                if cd[2] != d[2]:
                    add("P24", "error", "%s/%s" % (lg, slug),
                        "第%d张表 各行列数与 %s 不一致：基准 %s，本语言 %s"
                        % (n + 1, master_lang,
                           "/".join(str(x) for x in d[2]),
                           "/".join(str(x) for x in cd[2])))

        # P25 列表标记一致：列表符号（- / * / + / 1. / 1)）、有序分隔符与
        # 缩进层级必须与基准相同。抓到过的问题：同一份内容在部分语言里用
        # 星号或数字列表，另一个语言用短横线，渲染出不同的层级感。
        for lg in sorted(parsed):
            if lg == master_lang:
                continue
            cur_outline = block_outline(parsed[lg][1])
            cur_buckets = _blocks_by_kind(cur_outline)
            base_lists = base_buckets.get("LIST", [])
            for n, (bi, d) in enumerate(base_lists):
                pair = cur_buckets.get("LIST", [])
                if n >= len(pair):
                    continue
                _ci, cd = pair[n]
                if cd[1] != d[1]:
                    add("P25", "error", "%s/%s" % (lg, slug),
                        "第%d个列表 列表符号与 %s 不一致：基准 %s，本语言 %s"
                        % (n + 1, master_lang,
                           "/".join(d[1]) or "-", "/".join(cd[1]) or "-"))
                if cd[2] != d[2]:
                    add("P25", "error", "%s/%s" % (lg, slug),
                        "第%d个列表 缩进层级与 %s 不一致：基准 %s，本语言 %s"
                        % (n + 1, master_lang,
                           "/".join(str(x) for x in d[2]),
                           "/".join(str(x) for x in cd[2])))

        # P26 行内强调一致：每个块的加粗 / 斜体 / 行内代码数量必须与基准相同。
        # 抓到过的问题：中文母版把关键结论加粗，某个语言把加粗漏掉了，
        # 读者看到的视觉层级与其他语言不同。
        # 各块类型里「加粗/斜体/行内代码」所在下标不同（H2 在 1、LIST/TABLE 在 3、
        # PARA 在 0），必须按标签表动态定位，否则标题类块会被整块漏检。
        for lg in sorted(parsed):
            if lg == master_lang:
                continue
            cur_outline = block_outline(parsed[lg][1])
            cur_buckets = _blocks_by_kind(cur_outline)
            for k, base_kind_blocks in base_buckets.items():
                if k == "IMG":
                    continue
                labels = _DETAIL_LABELS.get(k, [])
                cur_kind_blocks = cur_buckets.get(k, [])
                for n, (bi, d) in enumerate(base_kind_blocks):
                    if n >= len(cur_kind_blocks):
                        continue
                    _ci, cd = cur_kind_blocks[n]
                    for lab in ("加粗数", "斜体数", "行内代码数"):
                        if lab not in labels:
                            continue
                        j = labels.index(lab)
                        if j >= len(d) or j >= len(cd):
                            continue
                        if d[j] != cd[j]:
                            add("P26", "error", "%s/%s" % (lg, slug),
                                "第%d个%s块 的%s与 %s 不一致：基准 %s，本语言 %s"
                                % (n + 1, k, lab, master_lang, d[j], cd[j]))
                    # 列表：加粗必须落在同一条目上。整块总数相同并不够——
                    # 加粗从第 2 项挪到第 5 项，总数不变，视觉重点却错了。
                    if k == "LIST" and "逐项加粗分布" in labels:
                        j = labels.index("逐项加粗分布")
                        if j < len(d) and j < len(cd) and d[j] != cd[j]:
                            add("P26", "error", "%s/%s" % (lg, slug),
                                "第%d个列表 的逐项加粗分布与 %s 不一致"
                                % (n + 1, master_lang))

        # P27 行内链接目标一致：去掉语言前缀后的链接路径必须与基准相同。
        # 抓到过问题：CTA 链接指向了错误的语言路径，导致点进去是另一种语言。
        for lg in sorted(parsed):
            if lg == master_lang:
                continue
            cur_outline = block_outline(parsed[lg][1])
            cur_buckets = _blocks_by_kind(cur_outline)
            for k, base_kind_blocks in base_buckets.items():
                cur_kind_blocks = cur_buckets.get(k, [])
                for n, (bi, d) in enumerate(base_kind_blocks):
                    if n >= len(cur_kind_blocks):
                        continue
                    _ci, cd = cur_kind_blocks[n]
                    base_links = _link_dim(d, k)
                    cur_links = _link_dim(cd, k)
                    if base_links != cur_links:
                        add("P27", "error", "%s/%s" % (lg, slug),
                            "第%d个%s块 链接目标与 %s 不一致：基准 %s，本语言 %s"
                            % (n + 1, k, master_lang,
                               "/".join(base_links) or "-",
                               "/".join(cur_links) or "-"))

        # P29 链接语言前缀校验：正文里的站内链接必须指向本文自己的语言，
        # 不得指向另一种语言。抓到过的问题：西班牙语版本的 CTA 链接写成
        # /zh/packages/，读者点击后被带到中文页面。
        for lg in sorted(parsed):
            _fm_lg, body_lg = parsed[lg]
            for tgt in _inline_links(body_lg):
                m = re.match(r"^/([a-z]{2})(/|$)", tgt)
                if not m:
                    continue
                if m.group(1) != lg:
                    add("P29", "error", "%s/%s" % (lg, slug),
                        "链接指向了其他语言: %s（本文语言为 %s）" % (tgt, lg))

        # P28 frontmatter 结构一致：references 条目数、references 的 URL 集合、
        # date 与 category 必须与基准完全相同。抓到过的问题：某个语言漏了一条
        # 参考法规，或把日期写成了另一天，站点归档与引用关系会错位。
        base_fm = parsed[master_lang][0]
        base_refs = base_fm.get("references") or []
        base_ref_urls = tuple(str(r.get("url", "")).strip() for r in base_refs)
        base_date = str(base_fm.get("date", "")).strip()
        base_cat = str(base_fm.get("category", "")).strip()
        for lg in sorted(parsed):
            if lg == master_lang:
                continue
            cur_fm = parsed[lg][0]
            cur_refs = cur_fm.get("references") or []
            cur_ref_urls = tuple(str(r.get("url", "")).strip() for r in cur_refs)
            if len(cur_refs) != len(base_refs):
                add("P28", "error", "%s/%s" % (lg, slug),
                    "references 条目数与 %s 不一致：基准 %d，本语言 %d"
                    % (master_lang, len(base_refs), len(cur_refs)))
            elif cur_ref_urls != base_ref_urls:
                add("P28", "error", "%s/%s" % (lg, slug),
                    "references URL 集合与 %s 不一致" % master_lang)
            if str(cur_fm.get("date", "")).strip() != base_date:
                add("P28", "error", "%s/%s" % (lg, slug),
                    "frontmatter date 与 %s 不一致：基准 %s，本语言 %s"
                    % (master_lang, base_date, cur_fm.get("date")))
            if str(cur_fm.get("category", "")).strip() != base_cat:
                add("P28", "error", "%s/%s" % (lg, slug),
                    "frontmatter category 与 %s 不一致：基准 %s，本语言 %s"
                    % (master_lang, base_cat, cur_fm.get("category")))

        # P31 术语本地化：中文母版用本土概念（保税/元/美元），各语言就必须
        # 用自己的术语，不能照抄英文。P30 靠字符集只能查非拉丁语言，
        # 这条用术语映射表补上拉丁字母语言（荷/丹/瑞典/捷克…）。
        for lg in sorted(parsed):
            _fm31, body31 = parsed[lg]
            for eng, local in term_localization_hits(lg, body31):
                add("P31", "warning", "%s/%s" % (lg, slug),
                    "术语未本地化: 出现英文 %r，本语言应写作 %r" % (eng, local))

        # P32 金额货币合规：正文金额只允许「元」与「美元」两种货币，不得混入
        # 其他国家的货币。外币词需邻近数字才算命中，避免同形词误报
        # （白俄罗斯语 «перавады вон» 是「汇出」，不是韩元）。
        for lg in sorted(parsed):
            _fm32, body32 = parsed[lg]
            for label, word in foreign_currency_hits(body32):
                add("P32", "error", "%s/%s" % (lg, slug),
                    "金额使用了非指定货币 %s（%r）；只允许「元」与「美元」" % (label, word))

        # P33 金额符号 / ISO 代码：金额只能用「元」「美元」的本土文字拼写，
        # 不得用货币符号（$ \u00a5 \u20ac \u20a9 z\u0142…）或 ISO 三字母代码（USD / CNY…）。
        # P32 只查外币**词**，查不到「数字前面带符号」这种写法，本条补齐。
        for lg in sorted(parsed):
            _fm33, body33 = parsed[lg]
            for kind, hit in currency_symbol_hits(body33):
                if kind == "\u7b26\u53f7\u5199\u6cd5":
                    add("P33", "error", "%s/%s" % (lg, slug),
                        "\u91d1\u989d\u7528\u4e86\u7b26\u53f7\u5199\u6cd5 %r\uff1b\u91d1\u989d\u5e94\u5199\u4f5c\u672c\u571f\u6587\u5b57\uff08\u300c\u5143\u300d\u300c\u7f8e\u5143\u300d\uff0c\u4f8b\uff1a5000 \u5143 / 50 \u7f8e\u5143\uff09" % hit)
                else:
                    add("P33", "error", "%s/%s" % (lg, slug),
                        "\u91d1\u989d\u4f7f\u7528\u4e86%s %r\uff1b\u53ea\u5141\u8bb8\u300c\u5143\u300d\u4e0e\u300c\u7f8e\u5143\u300d\u4e24\u79cd\u8d27\u5e01\uff0c\u4e14\u9700\u7528\u6587\u5b57\u5199\u6cd5" % (kind, hit))

        # P30 英文原词残留：非拉丁文字系统的语言正文里不应夹用普通英文词。
        # 抓到过的问题：中文母版写「保税」，ja/ko/es/ar 等也各自本地化了，
        # 但 30 多个语言正文里保留了 bonded（bonded 台账 / bonded 仓 /
        # bonded 电商），同一术语有的翻译、有的照抄英文。
        for lg in sorted(parsed):
            if lg not in NON_LATIN_SCRIPT_LANGS:
                continue
            _fm30, body30 = parsed[lg]
            res = latin_residue(body30)
            if res:
                top = sorted(res.items(), key=lambda x: -x[1])[:5]
                add("P30", "warning", "%s/%s" % (lg, slug),
                    "正文夹用英文原词（疑似未本地化）: %s" %
                    ", ".join("%s(%d)" % (w, n) for w, n in top))

        # P11 alt 文本跨语言完全相同（疑似未翻译）
        alt_map = {}
        for lg, (_fm, b) in parsed.items():
            for a in re.findall(r"!\[([^\]]+)\]\(", b):
                a = a.strip()
                if len(a) > 12:
                    alt_map.setdefault(a, []).append(lg)
        for a, lgs in sorted(alt_map.items()):
            if len(lgs) > 1:
                add("P11", "warning", slug, "alt 未翻译（%s 相同）: %s" % (",".join(lgs), a[:40]))

        # L06 title/excerpt 跨语言完全相同（L01/L02 只比英文，此处覆盖其余语言互抄）
        seen = {}
        for lg, (fm, _b) in parsed.items():
            key = (fm.get("title", "").strip(), fm.get("excerpt", "").strip())
            if key[0]:
                seen.setdefault(key, []).append(lg)
        for key, lgs in sorted(seen.items()):
            if len(lgs) > 1:
                add("L06", "error", slug,
                    "title/excerpt 完全相同（疑似未翻译）: %s" % ",".join(lgs))

    # --- 图片
    if "cover.webp" not in image_files:
        add("I02", "error", slug, "缺少 cover.webp")
    for name, data in sorted(image_files.items()):
        if len(data) > MAX_IMAGE_BYTES:
            add("I04", "error", slug, "%s 超过 400KB（%.0fKB）" % (name, len(data) / 1024.0))
        size = image_size(name, data)
        if not size:
            add("I01", "error", slug, "%s 无法解析尺寸（文件可能损坏）" % name)
            continue
        w, h = size
        if name == "cover.webp" and (w, h) != COVER_SIZE:
            add("I02", "error", slug, "cover.webp 必须精确 1200×630，实际 %d×%d" % (w, h))
        if name != "cover.webp" and w < MIN_IMAGE_WIDTH:
            add("I03", "error", slug, "%s 宽度 %d < 1200" % (name, w))
    if len(image_files) > MAX_IMAGES_WARN:
        add("W03", "warning", slug, "图片数量 %d，建议 ≤%d" % (len(image_files), MAX_IMAGES_WARN))


# ---------------------------------------------------------------- P 系列：单文件文本健壮性（v1.2）

def check_text_health(tag, lang, body, add):
    """P05–P13：残句/标点/混文字系统/重复词/CTA 文风等单文件检查。
    lang=None 时（--body 草稿模式）跳过依赖语言上下文的规则。"""
    lines = body.split("\n")
    # 剥离 markdown 图片/链接结构，避免 alt 文字与路径粘连成假 token（RTL 语言尤甚）
    bare = re.sub(r"!\[[^\]]*\]\([^)]*\)", _MD_PH, body)
    bare = re.sub(r"\[[^\]]*\]\([^)]*\)", _MD_PH, bare)
    bare_lines = bare.split("\n")
    # P05 省略号（正式文章罕见，多为残句/机翻事故）
    m = ELLIPSIS_RE.search(bare)
    if m:
        add("P05", "warning", tag,
            "第 %d 行出现省略号（%r），疑似残句，请通读该句" % (_line_of(body, m.start()), m.group(0)))
    # P06 重复标点
    m = DBLPUNCT_RE.search(bare)
    if m:
        add("P06", "warning", tag,
            "第 %d 行出现重复标点 %r" % (_line_of(body, m.start()), m.group(0)))
    # P07 行内连续多空格
    m = DBLSPACE_RE.search(bare)
    if m:
        add("P07", "warning", tag, "第 %d 行出现连续空格" % _line_of(body, m.start()))
    # P08 混文字系统 token（如阿拉伯词中夹拉丁字母，多为漏改事故；
    # 排除 URL/路径；ko/ja 的助词黏着不涉及此处覆盖的脚本）
    for i, ln in enumerate(bare_lines, 1):
        hit = None
        for tok in re.findall(r"\S+", ln):
            if "://" in tok or tok.startswith(("http", "/images")):
                continue
            if _code_hyphen_ok(tok):
                continue  # v1.14：编号/代码-连字符-本地后缀（S1-ից、ל-US）是正当构词
            sc = _token_scripts(tok)
            others = sc - {"LATIN"}
            if ("LATIN" in sc and others) or len(others) >= 2:
                hit = tok
                break
        if hit:
            add("P08", "warning", tag, "第 %d 行混文字系统词: %r" % (i, hit))
            break
    # P09 韩语正文出现汉字（现代韩语正文应为谚文；如「무역准入」混入）
    if lang == "ko":
        m = re.search(r"[\u4E00-\u9FFF]", body)
        if m:
            add("P09", "warning", tag,
                "第 %d 行韩语正文出现汉字（应改写为谚文）" % _line_of(body, m.start()))
    # P10 相邻重复单词（the the / и и / los los）。
    # v1.14 白名单：部分语言的重叠副词（reduplication）是固定搭配——
    # tr "ayrı ayrı"（分别）、ur "باری باری"（轮流）等，站方回执的改法
    # 本身就使用这类形式，逐词组放行，不做整类豁免。
    redup = REDUPLICATION_OK.get(lang, ())
    m = None
    for cand in REPEAT_WORD_RE.finditer(bare):
        if cand.group(0).lower() not in redup:
            m = cand
            break
    if m:
        add("P10", "warning", tag,
            "第 %d 行出现重复单词: %r" % (_line_of(body, m.start()), m.group(0)))
    # P12 CTA 冒号引出（应为自然融入式，链接内嵌句中；检查原始行含链接结构）
    for i, ln in enumerate(lines, 1):
        if CTA_COLON_RE.search(ln):
            add("P12", "warning", tag,
                "第 %d 行 CTA 用冒号引出链接（应为自然融入句式）" % i)
            break
    # P13 三连空行
    m = TRIPLE_NL_RE.search(body)
    if m:
        add("P13", "warning", tag, "存在三连及以上空行（%d 处）" % len(TRIPLE_NL_RE.findall(body)))
    # P14 隐形/零宽字符（软连字符、零宽空格、BOM、双向控制符、替换字符）
    for i, ln in enumerate(lines, 1):
        bad = [name for ch, name in INVISIBLE_ALWAYS.items() if ch in ln]
        if "\u200c" in ln and lang not in ZWNJ_OK_LANGS:
            bad.append("ZWNJ")
        if "\u200d" in ln and lang not in ZWJ_OK_LANGS:
            bad.append("ZWJ")
        if bad:
            add("P14", "warning", tag,
                "第 %d 行含隐形字符 %s（多为编辑器/复制残留，应删除）" % (i, sorted(set(bad))))
            break
    # P15 标点前多余空格（不含法语分号/问号等合法前置空格的标点）
    m = SPACE_PUNCT_RE.search(bare)
    if m:
        add("P15", "warning", tag,
            "第 %d 行标点前有空格: %r" % (_line_of(body, m.start()), m.group(0)))
    # P16 强调符/圆括号不配对（多为漏改或截断）
    if body.count("**") % 2:
        add("P16", "warning", tag, "** 强调符数量为奇数（不配对）")
    if body.count("(") != body.count(")"):
        add("P16", "warning", tag,
            "圆括号不配对（( %d 个 / ) %d 个）" % (body.count("("), body.count(")")))
    # P17 连续重复句（整句重复多为拼接事故）
    sents = [s.strip() for s in DUP_SENT_SPLIT_RE.split(bare) if len(s.strip()) > 40]
    for a, b in zip(sents, sents[1:]):
        if a == b:
            add("P17", "warning", tag, "出现连续重复句: %r" % a[:60])
            break


def check_body(tag, lang, body, image_files, slug, add):
    lines = body.split("\n")

    # B01 一级标题
    for i, ln in enumerate(lines, 1):
        if re.match(r"^#\s", ln):
            add("B01", "error", tag, "第 %d 行使用了一级标题 #，请用 ##" % i)
    # B02 标题空格 / 层级
    for i, ln in enumerate(lines, 1):
        if re.match(r"^#{2,6}[^#\s]", ln):
            add("B02", "error", tag, "第 %d 行标题缺少空格: %s" % (i, ln[:40]))
        if re.match(r"^####+\s", ln):
            add("B02", "error", tag, "第 %d 行标题层级超过 ###" % i)
    # B03 分隔线
    for i, ln in enumerate(lines, 1):
        if re.match(r"^\s*---+\s*$", ln):
            add("B03", "error", tag, "第 %d 行出现 --- 分隔线（正文禁止）" % i)
    # B04 正文 References
    if re.search(r"(?im)^#{2,3}\s*references\b", body):
        add("B04", "error", tag, "正文出现 References 章节（请移到 frontmatter）")
    # B05 JSX / HTML
    if re.search(r"</?[A-Za-z][A-Za-z0-9]*(\s[^>]*)?>", body):
        add("B05", "error", tag, "正文含 HTML/JSX 标签")
    if re.search(r"\{[^}\n]{0,60}\}", body):
        add("B05", "error", tag, "正文含 JSX 表达式 {...}")
    # B06 框线字符
    if re.search(r"[\u2500-\u257F]", body):
        add("B06", "error", tag, "正文含框线字符流程图")
    # B07 列表项间空行
    for i in range(len(lines) - 2):
        if re.match(r"^\s*[-*]\s", lines[i]) and lines[i + 1].strip() == "" \
                and i + 2 < len(lines) and re.match(r"^\s*[-*]\s", lines[i + 2]):
            add("B07", "error", tag, "第 %d 行列表项之间有空行（会渲染成多个列表）" % (i + 1))
            break
    # B08 多项内联
    for i, ln in enumerate(lines, 1):
        if len(re.findall(r"(?:^|\s)[-*]\s+\S", ln)) > 1:
            add("B08", "error", tag, "第 %d 行有多个列表项写在同一行" % i)
            break
    # B10 破折号混用
    if "—" in body and "–" in body:
        add("B10", "error", tag, "同一文件混用 — 与 –（请统一）")
    # B11 emoji 列表混排
    for i, ln in enumerate(lines, 1):
        if len(re.findall(r"[\U0001F300-\U0001FAFF\u2600-\u27BF]", ln)) >= 2:
            add("B11", "error", tag, "第 %d 行 emoji 列表混排" % i)
            break

    # B09 CTA
    tail = [ln for ln in lines[-10:] if ln.strip()]
    link = None
    for ln in tail:
        m = re.search(r"(?<!!)\[([^\]]+)\]\(([^)\s]+)\)", ln)
        if m:
            link = (m.group(1), m.group(2))
            break
    if not link:
        add("B09", "error", tag, "结尾缺少 CTA 链接 [Contact us](/<lang>/packages/)")
    else:
        txt, url = link
        expected_path = "/%s/packages/" % lang
        if url.rstrip("/") != expected_path.rstrip("/"):
            add("B09", "error", tag, "CTA 链接必须是 %s，当前 %s" % (expected_path, url))
        if lang in CTA_TEXT:
            if txt.strip() != CTA_TEXT[lang]:
                add("B09", "error", tag, "CTA 文字应为 %r，当前 %r" % (CTA_TEXT[lang], txt))
        else:
            if re.match(r"(?i)^contact\s*us", txt.strip()):
                add("B09", "error", tag, "CTA 文字未翻译（仍为英文 Contact us）")

    # 图片引用
    referenced = set()
    for i, ln in enumerate(lines, 1):
        for m in re.finditer(r"!\[([^\]]*)\]\(([^)\s]+)", ln):
            alt, url = m.group(1), m.group(2)
            if re.match(r"^https?://", url):
                add("I07", "error", tag, "第 %d 行图片使用了外链: %s" % (i, url))
                continue
            mm = re.match(r"^/images/blog/%s/([^/]+\.webp)$" % re.escape(slug), url)
            if not mm:
                add("I05", "error", tag, "第 %d 行图片路径应为 /images/blog/%s/<name>.webp" % (i, slug))
                continue
            referenced.add(mm.group(1))
            if not alt.strip():
                add("I08", "error", tag, "第 %d 行图片缺少 alt 文字" % i)
            elif alt.strip().lower() in {"image", "img", "图", "图片", "photo", "picture"}:
                add("I08", "error", tag, "第 %d 行 alt 过于笼统: %r" % (i, alt))
    for name in image_files:
        if name == "cover.webp":
            continue  # 封面用于列表卡片与社交分享，不要求正文出现
        if name not in referenced:
            add("I06", "error", tag, "图片 %s 未被正文引用" % name)

    # 红线
    norm = normalize_digits(body)
    if re.search(r"(?<!\d)(248|249)(?!\d)", norm):
        add("R01", "error", tag, "正文出现 248/249（现行法条一律写 280 号令）")
    if re.search(r"\b(MOA|CFDA)\b", body):
        add("R02", "error", tag, "正文出现旧机构名 MOA/CFDA（应为 MARA/SAMR）")
    for pat in PRICE_RES:
        if re.search(pat, body, re.I):
            add("R03", "error", tag, "正文出现价格/金额（不写报价）")
            break
    for pat in DELIVERY_RES:
        if re.search(pat, body):
            add("R04", "error", tag, "正文出现交付周期承诺")
            break
    for pat in NEGATIVE_RES:
        if re.search(pat, body, re.I):
            add("R05", "error", tag, "正文出现绝对否定表述（改写为建设性说法）")
            break
    for pat in PROMISE_RES:
        if re.search(pat, body):
            add("R06", "error", tag, "正文出现过度承诺（寄样安排/保证/时限）")
            break

    # ST 写作纪律（方案 3.1 / 3.1a）
    check_style(tag, body, add)

    # P 系列单文件文本健壮性（v1.2）
    check_text_health(tag, lang, body, add)


# ---------------------------------------------------------------- 打包（v1.3）

# 打包时剔除的垃圾文件（与 S05 检查口径一致，保证打出的包不会被自己判 S05）
JUNK_NAMES = {".DS_Store", "Thumbs.db", "desktop.ini"}
JUNK_PARTS = {"__MACOSX", "__pycache__", ".git", ".svn"}


def _is_junk(relpath):
    parts = relpath.replace("\\", "/").split("/")
    for p in parts:
        if p.startswith(".") and p not in (".", ".."):
            return True          # 隐藏文件/目录（含 .DS_Store）
        if p in JUNK_PARTS or p in JUNK_NAMES:
            return True
    return relpath.endswith((".pyc", ".pyo", "~"))


def pack_package(path, zip_path):
    """把投稿包目录打为 zip（先决条件：调用方已完成 check 且 0 error）。

    - 只接受目录输入；zip 输入请先解包修改后重打
    - 剔除系统垃圾/隐藏文件/pyc（与 S05 口径一致）
    - 路径排序写入，保证同内容产出字节稳定的包
    返回 (文件数, zip 字节数)。
    """
    if not os.path.isdir(path):
        raise ValueError("打包仅支持目录输入: %s" % path)
    if os.path.abspath(zip_path).startswith(os.path.abspath(path) + os.sep):
        raise ValueError("输出 zip 不能位于包目录内部")
    entries = []
    for root, dirs, names in os.walk(path):
        dirs[:] = sorted(d for d in dirs if not _is_junk(os.path.relpath(
            os.path.join(root, d), path)))
        for n in sorted(names):
            full = os.path.join(root, n)
            rel = os.path.relpath(full, path).replace(os.sep, "/")
            if not _is_junk(rel):
                entries.append((rel, full))
    if not entries:
        raise ValueError("包目录为空: %s" % path)
    if os.path.exists(zip_path):
        os.remove(zip_path)
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for rel, full in entries:
            zf.write(full, rel)
    return len(entries), os.path.getsize(zip_path)


# ---------------------------------------------------------------- CLI

def main(argv):
    args = [a for a in argv[1:] if not a.startswith("--")]
    flags = {a for a in argv[1:] if a.startswith("--")}
    if not args:
        print(__doc__.strip())
        return 2
    path = args[0]

    global _NO_PARITY, _MASTER_LANG
    if "--no-parity" in flags:
        _NO_PARITY = True
    for a in argv[1:]:
        m = re.match(r"--master=([A-Za-z]{2})$", a)
        if m:
            _MASTER_LANG = m.group(1).lower()

    # --body 模式：对单篇 markdown 草稿只跑 ST 写作纪律（ST01–ST07）
    # 用法: python3 submitter_check.py <draft.md> --body [--until=<标记>]
    if "--body" in flags:
        with open(path, "rb") as fh:
            src = text(fh.read())
        until = None
        for a in argv[1:]:
            m = re.match(r"--until=(.+)", a)
            if m:
                until = m.group(1)
        if until and until in src:
            src = src.split(until, 1)[0]
        findings = []
        add = lambda rule, sev, slug, detail: findings.append(
            Finding(rule, sev, os.path.basename(path), detail))
        check_style(os.path.basename(path), src, add)
        # 草稿适用的正文格式规则：B03 分隔线 / B07 列表项间空行 / B08 多项内联
        lines = src.split("\n")
        for i, ln in enumerate(lines, 1):
            if re.match(r"^\s*---+\s*$", ln):
                add("B03", "error", "", "第 %d 行出现 --- 分隔线（正文禁止）" % i)
                break
        for i in range(len(lines) - 2):
            if re.match(r"^\s*[-*]\s", lines[i]) and lines[i + 1].strip() == "" \
                    and i + 2 < len(lines) and re.match(r"^\s*[-*]\s", lines[i + 2]):
                add("B07", "error", "", "第 %d 行列表项之间有空行（会渲染成多个列表）" % (i + 1))
                break
        for i, ln in enumerate(lines, 1):
            if len(re.findall(r"(?:^|\s)[-*]\s+\S", ln)) > 1:
                add("B08", "error", "", "第 %d 行有多个列表项写在同一行" % i)
                break
        # P 系列单文件检查（v1.2）：P01 重复图引用 + P05–P08/P10/P12/P13
        img_refs = re.findall(r"!\[[^\]]*\]\(([^)\s]+\.webp)", src)
        dups = sorted({n for n in img_refs if img_refs.count(n) > 1})
        if dups:
            add("P01", "error", "", "同一图片被引用多次: %s" % dups)
        check_text_health(os.path.basename(path), None, src, add)
        errors = [f for f in findings if f.severity == "error"]
        warnings = [f for f in findings if f.severity == "warning"]
        if "--json" in flags:
            print(json.dumps({"file": path, "result": "PASS" if not errors else "FAIL",
                              "errors": len(errors), "warnings": len(warnings),
                              "findings": [f.as_dict() for f in findings]},
                             ensure_ascii=False, indent=2))
        else:
            print("=" * 60)
            print("写作纪律自检（ST 系列）  %s" % path)
            print("=" * 60)
            for f in findings:
                sev = "ERROR" if f.severity == "error" else "WARN "
                print("  [%s] %-5s %s" % (sev, f.rule, f.detail))
            print("-" * 60)
            if errors:
                print("结果：FAIL（%d error, %d warning）" % (len(errors), len(warnings)))
            else:
                print("结果：PASS（0 error, %d warning）" % len(warnings))
        return 0 if not errors else 1

    findings = check(path)
    errors = [f for f in findings if f.severity == "error"]
    warnings = [f for f in findings if f.severity == "warning"]

    # --pack：检查通过后由本脚本完成打包（0 error 才出 zip；出错拒绝打包）
    packed = None
    pack_requested = any(a == "--pack" or a.startswith("--pack=") for a in argv[1:])
    if pack_requested and not errors:
        target = next((a[len("--pack="):] for a in argv[1:] if a.startswith("--pack=")), None)
        if target is None:
            abspath = os.path.abspath(path).rstrip("\\/")
            target = os.path.join(os.path.dirname(abspath),
                                  os.path.basename(abspath) + ".zip")
        if os.path.isfile(path):
            print("--pack 仅支持目录输入（zip 请先解包修改后重打）")
            return 2
        try:
            n_files, n_bytes = pack_package(path, target)
        except (ValueError, OSError) as exc:
            print("打包失败: %s" % exc)
            return 2
        packed = {"zip": target, "files": n_files, "bytes": n_bytes}

    if "--json" in flags:
        print(json.dumps({
            "package": os.path.basename(path.rstrip("/\\")),
            "result": "PASS" if not errors else "FAIL",
            "errors": len(errors),
            "warnings": len(warnings),
            "findings": [f.as_dict() for f in findings],
            "packed": packed,
        }, ensure_ascii=False, indent=2))
        return 0 if not errors else 1

    quiet = "--quiet" in flags
    if not quiet:
        articles = sorted({f.slug.split("/")[-1] for f in findings if f.slug not in ("-", "")})
        langs = sum(1 for _ in {})  # placeholder for readability
        print("=" * 60)
        print("博客投稿包自检  %s" % os.path.basename(path.rstrip("/")))
        print("=" * 60)
        if articles:
            print("文章: %s" % ", ".join(articles))
        for f in findings:
            sev = "ERROR" if f.severity == "error" else "WARN "
            print("  [%s] %-3s %-26s %s" % (sev, f.rule, f.slug, f.detail))
        print("-" * 60)

    if errors:
        print("结果：FAIL（%d error, %d warning）→ 请按 SPEC.md 修正后重新提交"
              % (len(errors), len(warnings)))
        if pack_requested:
            print("→ 存在 error，拒绝打包（先清零再 --pack）")
        return 1
    print("结果：PASS（0 error, %d warning）→ 可提交" % len(warnings))
    if packed:
        print("打包完成: %s（%d 文件, %.1f KB）"
              % (packed["zip"], packed["files"], packed["bytes"] / 1024.0))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
