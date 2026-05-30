#!/bin/bash
# 本地测试环境 — SinoTrade Compliance 用户站
# 用法：
#   ./scripts/local-test.sh dev   → 启动开发服务器（热更新）
#   ./scripts/local-test.sh build → 构建 + 预览（和线上一致）
#   ./scripts/local-test.sh check → 只构建，不启动

cd "$(dirname "$0")/.."

case "${1:-dev}" in
  dev)
    echo "🔧 启动 Next.js 开发服务器..."
    echo "   http://localhost:3000/compli-service/report/preview"
    echo ""
    npx next dev -p 3000
    ;;

  build|preview)
    echo "📦 构建静态站点..."
    npx next build

    if [ $? -ne 0 ]; then
      echo "❌ 构建失败"
      exit 1
    fi

    PORT="${2:-3000}"
    echo "✅ 构建完成"
    echo "🌐 启动本地服务器 http://localhost:$PORT"
    echo ""
    echo "可用页面："
    for m in preview preview_ccc preview_nmpa preview_label preview_crossborder preview_trademark; do
      echo "  http://localhost:$PORT/report/$m"
    done
    for m in gacc ccc nmpa label crossborder trademark; do
      echo "  http://localhost:$PORT/check/$m"
    done
    echo ""

    cd out && python3 -m http.server "$PORT" --bind 0.0.0.0
    ;;

  check)
    echo "📦 构建检查..."
    npx next build
    ;;

  *)
    echo "用法: $0 {dev|build|check}"
    echo "  dev     → Next.js 开发服务器（热更新）"
    echo "  build   → 静态构建 + 本地预览"
    echo "  check   → 只构建检查（不启动服务器）"
    exit 1
    ;;
esac
