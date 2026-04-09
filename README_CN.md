[English](README.md) | [中文](README_CN.md)

# 视频粗剪助手

一款本地化的视频粗剪工具。使用 AI 语音识别自动转录视频内容，智能检测废片镜头（NG）和重复片段，一键导出干净的视频剪辑。

## 功能特点

- **AI 语音转录** - 使用 `faster-whisper`（medium 模型）进行高精度转录，针对中文优化
- **智能废片检测** - 自动识别关键词标记（"重来"、"NG"、"cut" 等）和相似重复内容
- **静音段处理** - 自动检测超过 3 秒的静音片段并标记为可删除
- **交互式编辑器** - 可逐段查看并切换保留/删除状态
- **音频波形可视化** - 使用 WaveSurfer.js 显示波形，删除片段以红色高亮标注，播放时自动跳过
- **流畅导出** - 使用 ffmpeg 进行帧级精确切割，无卡顿拼接
- **完全本地化** - 文件不上传，所有处理都在本地完成，保护隐私

## 系统要求

- Python 3.9+
- Node.js 18+
- ffmpeg（需添加到系统 PATH）

### 安装 ffmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt install ffmpeg
```

**Windows:**
从 https://ffmpeg.org/download.html 下载并添加到 PATH。

## 安装与运行

### 一键启动（推荐）

```bash
./start.sh
```

### 手动启动

**后端：**
```bash
cd backend

# 创建虚拟环境（推荐）
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 启动服务
python main.py
# 服务运行在 http://localhost:8000
```

首次运行时，faster-whisper 会下载 `medium` 模型（约 1.5GB），后续运行使用缓存模型。

**前端：**
```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
# 打开 http://localhost:5173
```

## 使用方法

1. 在浏览器打开 http://localhost:5173
2. 点击「选择视频文件」或直接输入视频文件的绝对路径
3. 点击「开始分析」—— 后端提取音频并进行转录（时长取决于视频长度）
4. 查看转录片段列表：
   - **绿色边框** = 已选中（将保留）
   - **红色边框** = 未选中（将删除）
   - **🔁 重复** 标签 = 自动检测到的相似/重复内容
   - **⚠️ 标记** 标签 = 包含废片关键词
   - **🔇 静音** 标签 = 长静音片段
5. 可单独切换片段状态，或使用工具栏按钮（全选/全不选/智能选择）
6. 在导出面板设置输出路径（默认为 `原文件名_粗剪.mp4`）
7. 点击「导出粗剪」—— ffmpeg 组装最终视频

## 检测策略

### 关键词检测
识别以下关键词，标记包含该关键词的片段及其前一个片段为废片：
- 重来、重录、cut、CUT、ng、NG
- 等一下、不对、从头、再来、重新
- 停一下、等等、算了、不行

### 相似重复检测
使用 `difflib.SequenceMatcher` 进行文本相似度分析：
- 滑动窗口检测：在相邻 4 个片段内检测相似内容
- NG 锚点序列匹配：当检测到废片关键词后，对比关键词前后各 20 个片段，找出重复内容

### 静音检测
使用 ffmpeg `silencedetect` 滤镜：
- 低于 -35dB 且持续超过 3 秒的片段视为静音
- 自动插入静音片段标记，默认设为删除

## 导出说明

导出使用 ffmpeg `filter_complex` 进行单次处理：
- 视频编码：`libx264` + `crf 18`（高质量，视觉上几乎无损）
- 音频编码：`aac` + `192kbps`
- 帧级精确切割，无 GOP 边界问题
- 删除片段之间的静音空白会被保留（避免人为切断自然停顿）

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/process` | 开始处理视频文件 |
| GET | `/api/task/{task_id}` | 获取任务状态和结果 |
| POST | `/api/export` | 开始导出已选片段 |
| GET | `/api/task/{task_id}/output` | 获取导出任务状态 |
| GET | `/api/audio?path=...` | 流式传输本地音频文件 |
| GET | `/api/browse` | 打开系统文件选择器 |
| GET | `/api/health` | 健康检查 |

## 性能说明

- 音频提取：将视频转换为 16kHz 单声道 WAV（1 小时视频约 200MB）
- 转录速度：CPU 上约 1x-4x 实时速度，取决于硬件
- 导出速度：取决于保留片段数量和视频长度
- GPU 加速：修改 `transcriber.py` 中 `device="cpu"` 为 `device="cuda"`

## 项目结构

```
video-rough-cut/
├── start.sh              # 一键启动脚本
├── CLAUDE.md             # 项目说明（供 AI 辅助开发）
├── backend/
│   ├── main.py           # FastAPI 主程序、任务管理、API 接口
│   ├── transcriber.py    # 音频提取 + faster-whisper 转录
│   ├── detector.py       # NG/重复/静音检测逻辑
│   ├── exporter.py       # ffmpeg 视频导出
│   ├── logger.py         # 日志模块
│   └── requirements.txt
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx              # React 入口
│       ├── App.jsx               # 主应用（阶段管理）
│       ├── api.js                # Axios API 客户端
│       ├── theme.js              # 主题配置
│       ├── ThemeContext.js       # 主题上下文
│       └── components/
│           ├── Icons.jsx              # SVG 图标组件
│           ├── TranscriptEditor.jsx   # 片段列表编辑器
│           ├── WaveformPlayer.jsx     # 波形播放器
│           └── ExportPanel.jsx        # 导出面板
└── README.md
```

## 技术栈

**后端：**
- FastAPI + uvicorn（异步 Web 框架）
- faster-whisper（OpenAI Whisper 的优化实现）
- ffmpeg（音频提取、静音检测、视频导出）

**前端：**
- React 18（UI 框架）
- WaveSurfer.js v7（音频波形可视化）
- Axios（HTTP 客户端）
- Vite（构建工具）

## 注意事项

- 处理长视频时请耐心等待，转录时间约为视频时长的 1-4 倍
- 导出的视频会进行重新编码（高质量），非无损复制
- 建议在处理前备份原始视频文件
- 任务结果会在 3 小时后自动清理

## 许可证

MIT License