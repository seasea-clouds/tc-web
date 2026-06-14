#!/usr/bin/env bash
# t6_launcher.sh — 在后台启动 t6_daemon.py 并立即退出
# 由 cron 每 5 分钟触发，PID 锁防止并行

cd /root/projects/trade/web/apps/portal/scripts || exit 1
. /root/projects/.venv/bin/activate

# 后台运行 daemon，输出追加到日志
python3 t6_daemon.py >> /tmp/t6-cron.log 2>&1 &
