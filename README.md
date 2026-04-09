[English](README.md) | [中文](README_CN.md)

# Video Rough Cut Assistant

A local web application for automatic video rough editing. Uses AI speech recognition to transcribe video, intelligently detects NG takes and duplicate content, and exports a clean cut with frame-level precision.

## Features

- **AI Transcription** - Uses `faster-whisper` (medium model) with Chinese optimization
- **Smart NG Detection** - Automatically identifies keyword markers ("重来", "NG", "cut", etc.) and similar repeated segments
- **Silence Handling** - Detects silence segments longer than 3 seconds and marks them for deletion
- **Interactive Editor** - Review and toggle which segments to keep or delete
- **Waveform Visualization** - WaveSurfer.js displays audio waveform with deleted segments highlighted in red, auto-skips during playback
- **Smooth Export** - ffmpeg frame-level precise cutting, no stuttering at splice points
- **Fully Local** - No file uploads, everything stays on your machine

## Requirements

- Python 3.9+
- Node.js 18+
- ffmpeg (must be in PATH)

### Install ffmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt install ffmpeg
```

**Windows:**
Download from https://ffmpeg.org/download.html and add to PATH.

## Setup & Running

### Quick Start (Recommended)

```bash
./start.sh
```

### Manual Start

**Backend:**
```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start server
python main.py
# Runs at http://localhost:8000
```

On first run, faster-whisper downloads the `medium` model (~1.5GB). Subsequent runs use the cached model.

**Frontend:**
```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
# Opens at http://localhost:5173
```

## Usage

1. Open http://localhost:5173 in your browser
2. Click "选择视频文件" or enter the absolute path to your video file
3. Click "开始分析" — backend extracts audio and transcribes (duration depends on video length)
4. Review transcript segments:
   - **Green border** = selected (will be kept)
   - **Red border** = deselected (will be deleted)
   - **🔁 重复** badge = similar/duplicate content auto-detected
   - **⚠️ 标记** badge = contains NG keywords
   - **🔇 静音** badge = long silence segment
5. Toggle individual segments or use toolbar buttons (全选/全不选/智能选择)
6. Set output path in Export panel (defaults to `original_粗剪.mp4`)
7. Click "导出粗剪" — ffmpeg assembles the final video

## Detection Strategies

### Keyword Detection
Identifies the following keywords and marks the segment containing it plus the preceding segment as NG:
- 重来, 重录, cut, CUT, ng, NG
- 等一下, 不对, 从头, 再来, 重新
- 停一下, 等等, 算了, 不行

### Similarity Detection
Uses `difflib.SequenceMatcher` for text similarity analysis:
- Sliding window detection: checks for similar content within adjacent 4 segments
- NG anchor sequence matching: after detecting an NG keyword, compares up to 20 segments before and after to find repeated content

### Silence Detection
Uses ffmpeg `silencedetect` filter:
- Segments below -35dB and longer than 3 seconds are considered silence
- Automatically inserts silence segment markers, default set to delete

## Export Notes

Export uses ffmpeg `filter_complex` for single-pass processing:
- Video encoding: `libx264` + `crf 18` (high quality, visually near-lossless)
- Audio encoding: `aac` + `192kbps`
- Frame-level precise cutting, no GOP boundary issues
- Silence gaps between deleted segments are preserved (maintains natural pauses)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/process` | Start processing a video file |
| GET | `/api/task/{task_id}` | Get task status and result |
| POST | `/api/export` | Start exporting with selected segments |
| GET | `/api/task/{task_id}/output` | Get export task status |
| GET | `/api/audio?path=...` | Stream local audio file |
| GET | `/api/browse` | Open system file picker |
| GET | `/api/health` | Health check |

## Performance

- Audio extraction: converts video to 16kHz mono WAV (~200MB for 1hr video)
- Transcription speed: ~1x-4x realtime on CPU depending on hardware
- Export speed: depends on number of segments and video length
- GPU acceleration: change `device="cpu"` to `device="cuda"` in `transcriber.py`

## Project Structure

```
video-rough-cut/
├── start.sh              # Quick start script
├── CLAUDE.md             # Project notes (for AI-assisted development)
├── backend/
│   ├── main.py           # FastAPI app, task management, API endpoints
│   ├── transcriber.py    # Audio extraction + faster-whisper transcription
│   ├── detector.py       # NG/duplicate/silence detection logic
│   ├── exporter.py       # ffmpeg video export
│   ├── logger.py         # Logging module
│   └── requirements.txt
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx              # React entry point
│       ├── App.jsx               # Main app (stage management)
│       ├── api.js                # Axios API client
│       ├── theme.js              # Theme configuration
│       ├── ThemeContext.js       # Theme context
│       └── components/
│           ├── Icons.jsx              # SVG icon components
│           ├── TranscriptEditor.jsx   # Segment list editor
│           ├── WaveformPlayer.jsx     # Waveform player
│           └── ExportPanel.jsx        # Export panel
├── README.md              # English documentation
└── README_CN.md           # Chinese documentation
```

## Tech Stack

**Backend:**
- FastAPI + uvicorn (async web framework)
- faster-whisper (optimized OpenAI Whisper implementation)
- ffmpeg (audio extraction, silence detection, video export)

**Frontend:**
- React 18 (UI framework)
- WaveSurfer.js v7 (audio waveform visualization)
- Axios (HTTP client)
- Vite (build tool)

## Notes

- Please be patient with long videos; transcription takes 1-4x the video duration
- Exported video is re-encoded (high quality), not lossless copy
- Recommended to backup original video before processing
- Task results are automatically cleaned up after 3 hours

## License

MIT License