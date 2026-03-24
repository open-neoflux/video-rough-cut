#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Check ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ ffmpeg 未安装，请先运行: brew install ffmpeg"
    exit 1
fi
echo "✅ ffmpeg OK"

# Start backend in background
echo "🚀 启动后端服务..."
cd "$PROJECT_DIR/backend"
/Users/songqh/miniconda3/bin/python3 main.py &
BACKEND_PID=$!
echo "   后端 PID: $BACKEND_PID"

# Wait for backend to be ready
sleep 2

# Start frontend
echo "🌐 启动前端..."
cd "$PROJECT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✂️  视频粗剪助手已启动！"
echo "   打开浏览器访问: http://localhost:5173"
echo ""
echo "   按 Ctrl+C 停止所有服务"

# Cleanup on exit
trap "echo '正在停止...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

wait
