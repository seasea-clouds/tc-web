# -*- coding: utf-8 -*-
"""Ed25519 签名（RFC 8032）——纯标准库实现，零第三方依赖。

**为什么自己实现**：完整性封签要在**别人的机器**上验签，而目标机只保证
Python 3.9+；`cryptography`/`pynacl` 不一定装得上。RSA/ECDSA 的纯 Python
实现更长且更易错，Ed25519 的参考实现足够短、且有 RFC 8032 官方测试向量，
正确性可用 `selftest/_integrity.py` 的三个向量钉死。

**用途边界**：
- 只用于「机制层文件清单」的签名与验签（每次 `integrity` 跑一次），不用于
  传输加密、不用于口令派生；消息长度是清单 JSON（几十 KB），性能足够。
- 私钥（32 字节 seed）由发布方保管，**不进包、不进 git**（`.keys/` 已忽略）；
  公钥随包分发，指纹另记在 `data/trust_anchor.txt` 与 README——这是唯一
  需要包外核对的信任根（见 README「治理」节）。

接口：`generate_seed()` / `public_key(seed)` / `sign(seed, msg)` /
`verify(pubkey, msg, sig)`；全部返回 bytes，非法输入抛 ValueError。
"""
# 治理声明：本文件属机制层，不承载策略数据；改动须走 README「治理」节的 L3 流程
#（先登记理由 → 行为级等价断言 → selftest --kit 全量），提交说明带 [arch]
#（commit-msg 钩子强制）。策略变更请改 plugins/ 判据或经 submit.py glossary 改库。
import hashlib
import os

# 曲线常数（RFC 8032 §5.1）
P = 2 ** 255 - 19
L = 2 ** 252 + 27742317777372353535851937790883648493
_D = -121665 * pow(121666, P - 2, P) % P
_SQRT_M1 = pow(2, (P - 1) // 4, P)


def _sha512(data):
    return hashlib.sha512(data).digest()


def _sha512_mod_l(data):
    return int.from_bytes(_sha512(data), "little") % L


def _inv(x):
    return pow(x, P - 2, P)


def _recover_x(y):
    """由 y 恢复 x（取偶的那个），不校验是否为二次剩余——由曲线方程兜底。"""
    xx = (y * y - 1) * _inv(_D * y * y + 1) % P
    x = pow(xx, (P + 3) // 8, P)
    if (x * x - xx) % P != 0:
        x = x * _SQRT_M1 % P
    if x & 1:
        x = P - x
    return x


def _base_point():
    by = 4 * _inv(5) % P
    bx = _recover_x(by)
    return (bx, by, 1, bx * by % P)          # 扩展坐标 (X, Y, Z, T)


_B = _base_point()
_IDENTITY = (0, 1, 1, 0)


def _add(p1, p2):
    """扩展坐标点加（RFC 8032 §5.1.4，add-2008-hwcd-3 变体）。"""
    x1, y1, z1, t1 = p1
    x2, y2, z2, t2 = p2
    a = (y1 - x1) * (y2 - x2) % P
    b = (y1 + x1) * (y2 + x2) % P
    c = t1 * 2 * _D * t2 % P
    d = z1 * 2 * z2 % P
    e, f, g, h = b - a, d - c, d + c, b + a
    return (e * f % P, g * h % P, f * g % P, e * h % P)


def _neg(pt):
    x, y, z, t = pt
    return (-x % P, y, z, -t % P)


def _mul(pt, k):
    """标量乘（迭代 double-and-add，避免递归深度与重复展开）。"""
    out = _IDENTITY
    addend = pt
    while k > 0:
        if k & 1:
            out = _add(out, addend)
        addend = _add(addend, addend)
        k >>= 1
    return out


def _encode_int(k):
    return int(k).to_bytes(32, "little")


def _encode_point(pt):
    x, y, z, _t = pt
    zi = _inv(z)
    x = x * zi % P
    y = y * zi % P
    bits = [(y >> i) & 1 for i in range(255)] + [x & 1]
    return bytes(sum(bits[i * 8 + j] << j for j in range(8)) for i in range(32))


def _decode_point(raw):
    if len(raw) != 32:
        raise ValueError("点编码必须是 32 字节")
    y = int.from_bytes(raw, "little") & ((1 << 255) - 1)
    if y >= P:
        raise ValueError("点编码非法：y ≥ p")
    x = _recover_x(y)
    if (x & 1) != (raw[31] >> 7):
        x = P - x
    if (-x * x + y * y - 1 - _D * x * x % P * (y * y) % P) % P != 0:
        raise ValueError("点不在曲线上")
    return (x, y, 1, x * y % P)


def _expand(seed):
    if len(seed) != 32:
        raise ValueError("私钥必须是 32 字节 seed")
    h = _sha512(seed)
    scalar = 2 ** 254 + sum(2 ** i * ((h[i // 8] >> (i % 8)) & 1)
                            for i in range(3, 254))
    return scalar, h[32:64]


def generate_seed():
    """生成 32 字节私钥 seed（os.urandom，调用方负责保管）。"""
    return os.urandom(32)


def public_key(seed):
    scalar, _prefix = _expand(seed)
    return _encode_point(_mul(_B, scalar))


def sign(seed, msg):
    scalar, prefix = _expand(seed)
    pub = _encode_point(_mul(_B, scalar))
    r = _sha512_mod_l(prefix + msg)
    r_enc = _encode_point(_mul(_B, r))
    s = (r + _sha512_mod_l(r_enc + pub + msg) * scalar) % L
    return r_enc + _encode_int(s)


def verify(pubkey, msg, sig):
    """→ True/False；任何畸形输入一律 False（不抛异常，便于清单校验）。"""
    try:
        if len(pubkey) != 32 or len(sig) != 64:
            return False
        r_enc = sig[:32]
        s = int.from_bytes(sig[32:], "little")
        if s >= L:
            return False
        a_pt = _decode_point(pubkey)
        r_pt = _decode_point(r_enc)
        k = _sha512_mod_l(r_enc + pubkey + msg)
        left = _mul(_B, s)
        right = _add(r_pt, _mul(a_pt, k))
        return _encode_point(left) == _encode_point(right)
    except (ValueError, ZeroDivisionError):
        return False
