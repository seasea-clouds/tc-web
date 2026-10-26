#!/usr/bin/env bash
# 媒体网关切换 · site 项目环境变量改名（T0 时执行，一次）
#
# 把 Pages 项目的 REDDIT_GATEWAY_SECRET 改成 MEDIA_GATEWAY_SECRET（同值），删旧名。
# 分两步走，每步之后都校验其余变量没被动过 —— secret_text 的值读不出来，
# 一旦被覆盖成空值，站点 /media/* 转发会全部 404，而且当场看不出原因。
#
# 用法：
#   set -a && . ./.env && set +a
#   bash docs/media-gateway/02-rename-pages-env.sh                       # 预演（只读）
#   bash docs/media-gateway/02-rename-pages-env.sh --apply               # 第①步：只加新变量
#   ... 等站点部署完成、/media/* 通了 ...
#   bash docs/media-gateway/02-rename-pages-env.sh --apply --delete-old  # 第②步：删旧变量
#
# ★ 顺序不能反：先删旧变量会让**当前线上**的旧 middleware 注入空口令 → 采集立刻全 404。
#   必须等新 middleware 上线（读 MEDIA_GATEWAY_SECRET）之后再删旧名。

set -euo pipefail

ACC="f4c6ce66c3dd07c11547fd610c4bb891"
PROJ="tc-web-site"
API="https://api.cloudflare.com/client/v4/accounts/$ACC/pages/projects/$PROJ"
OLD="REDDIT_GATEWAY_SECRET"
NEW="MEDIA_GATEWAY_SECRET"
APPLY=0
DELETE_OLD=0
for a in "$@"; do
  [ "$a" = "--apply" ] && APPLY=1
  [ "$a" = "--delete-old" ] && DELETE_OLD=1
done

: "${CLOUDFLARE_API_TOKEN:?需要 CLOUDFLARE_API_TOKEN（在 .env 里）}"
: "${REDDIT_GATEWAY_SECRET:?需要 REDDIT_GATEWAY_SECRET 的值（在 .env 里，作为新变量同值写入）}"

dump() {
  local tag="$1"
  local out="/tmp/pages-env-$tag.json"
  curl -sS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$API" -o "$out"
  /root/.venv/bin/python - "$tag" "$out" <<'PYEOF'
import json, sys
tag, path = sys.argv[1], sys.argv[2]
d = json.load(open(path))
if not d.get("success"):
    print("API 失败:", d.get("errors")); raise SystemExit(2)
prod = d["result"]["deployment_configs"]["production"]["env_vars"] or {}
names = sorted(prod)
print(f"[{tag}] production 变量 {len(names)} 个: {', '.join(names)}")
PYEOF
}

echo "── ① 备份当前状态 ──────────────────────────"
dump before

echo
echo "── ② 新增 $NEW（值同 $OLD）──────────────"
if [ "$APPLY" = "1" ]; then
  /root/.venv/bin/python - <<PY
import json, os, urllib.request
acc, proj = "$ACC", "$PROJ"
url = f"https://api.cloudflare.com/client/v4/accounts/{acc}/pages/projects/{proj}"
body = {"deployment_configs": {"production": {"env_vars": {
    "$NEW": {"type": "secret_text", "value": os.environ["REDDIT_GATEWAY_SECRET"]}
}}}}
req = urllib.request.Request(url, data=json.dumps(body).encode(), method="PATCH", headers={
    "Authorization": f"Bearer {os.environ['CLOUDFLARE_API_TOKEN']}",
    "Content-Type": "application/json",
    "User-Agent": "tcweb-cutover/1.0",
})
with urllib.request.urlopen(req, timeout=60) as r:
    d = json.loads(r.read())
print("PATCH ok" if d.get("success") else f"PATCH 失败: {d.get('errors')}")
PY
  dump after-add
  /root/.venv/bin/python - <<'PY'
import json
a = json.load(open("/tmp/pages-env-before.json"))["result"]["deployment_configs"]["production"]["env_vars"]
b = json.load(open("/tmp/pages-env-after-add.json"))["result"]["deployment_configs"]["production"]["env_vars"]
missing = [k for k in a if k not in b]
if missing:
    print(f"!! 变量丢失: {missing} —— 立刻停止，用 /tmp/pages-env-before.json 对照恢复")
    raise SystemExit(3)
print(f"校验通过：原有 {len(a)} 个全在，现共 {len(b)} 个，MEDIA_GATEWAY_SECRET 已就位")
PY
else
  echo "（预演，未改动）"
fi

echo
echo "── ③ 删除旧名 $OLD ────────────────────────"
if [ "$APPLY" = "1" ] && [ "$DELETE_OLD" = "1" ]; then
  echo "（--delete-old 已指定，确认新 middleware 已上线）"
  /root/.venv/bin/python - <<PY
import json, os, urllib.request
acc, proj = "$ACC", "$PROJ"
url = f"https://api.cloudflare.com/client/v4/accounts/{acc}/pages/projects/{proj}"
body = {"deployment_configs": {"production": {"env_vars": {"$OLD": None}}}}
req = urllib.request.Request(url, data=json.dumps(body).encode(), method="PATCH", headers={
    "Authorization": f"Bearer {os.environ['CLOUDFLARE_API_TOKEN']}",
    "Content-Type": "application/json",
    "User-Agent": "tcweb-cutover/1.0",
})
with urllib.request.urlopen(req, timeout=60) as r:
    d = json.loads(r.read())
print("PATCH ok" if d.get("success") else f"PATCH 失败: {d.get('errors')}")
PY
  dump after-delete
  /root/.venv/bin/python - <<'PY'
import json
b = json.load(open("/tmp/pages-env-after-delete.json"))["result"]["deployment_configs"]["production"]["env_vars"]
assert "MEDIA_GATEWAY_SECRET" in b, "新变量不在！停下"
assert "REDDIT_GATEWAY_SECRET" not in b, "旧变量还在"
for k in ("UPSTREAM_BLOG", "UPSTREAM_PORTAL", "NODE_VERSION", "NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY"):
    assert k in b, f"{k} 被误删！"
print(f"校验通过：{len(b)} 个变量，旧名已删、其余完好")
print("注意：改完要重新部署一次（或用 Redeploy）新变量才会进入运行环境")
PY
else
  echo "（跳过：需等站点部署完成后再执行 --apply --delete-old）"
fi

echo
echo "完成。下一步：推站点代码（middleware 已改 /media/*）→ 部署 → 验收 G1–G12。"
