# 视频粗剪助手 (Video Rough Cut Assistant)

A local web application for automatic video rough editing. Uses AI speech recognition to transcribe video, automatically detects NG takes and duplicate content, and exports a clean cut without re-encoding.

## Features

- **AI Transcription** - Uses `faster-whisper` (medium model) optimized for Chinese
- **Automatic NG Detection** - Detects keyword markers ("重来", "NG", "cut", etc.) and similar repeated segments
- **Interactive Editor** - Review and toggle which segments to keep or delete
- **Waveform Player** - Visual audio waveform with deleted segments highlighted in red
- **Lossless Export** - Uses `ffmpeg -c copy` for fast export without quality loss
- **Local Only** - No file uploads, everything stays on your machine

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

### Backend

```bash
cd video-rough-cut/backend

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python main.py
# Server runs at http://localhost:8000
```

On first run, faster-whisper will download the `medium` model (~1.5GB). Subsequent runs use the cached model.

### Frontend

```bash
cd video-rough-cut/frontend

# Install dependencies
npm install

# Start dev server
npm run dev
# Opens at http://localhost:5173
```

## Usage

1. Open http://localhost:5173 in your browser
2. Enter the absolute path to your video file (e.g., `/Users/you/Videos/recording.mp4`)
3. Click **开始分析** — the backend extracts audio and transcribes it (takes a few minutes)
4. Review the transcript segments:
   - **Green border** = selected (will be kept)
   - **Red border** = deselected (will be deleted)
   - **🔁 重复** badge = similar/duplicate content auto-detected
   - **⚠️ 标记** badge = contains NG（不好的镜头）keywords
5. Toggle individual segments or use the toolbar buttons (全选/全不选/智能选择)
6. Set the output path in the Export panel (defaults to `original_粗剪.mp4`)
7. Click **导出粗剪** — ffmpeg assembles the final video

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/process` | Start processing a video file |
| GET | `/api/task/{task_id}` | Poll task status and result |
| POST | `/api/export` | Start exporting with selected segments |
| GET | `/api/task/{task_id}/output` | Poll export task status |
| GET | `/api/audio?path=...` | Stream local audio file for waveform |
| GET | `/api/health` | Health check |

## Performance Notes

- Audio extraction converts video to 16kHz mono WAV (~200MB for a 1hr video vs potentially 10GB video)
- Transcription speed: approximately 1x-4x realtime on CPU depending on hardware
- Export is near-instant for short videos since it uses stream copy (no re-encoding)
- For GPU acceleration, change `device="cpu"` to `device="cuda"` in `transcriber.py`

## Project Structure

```
video-rough-cut/
├── backend/
│   ├── main.py          # FastAPI app, task management, API endpoints
│   ├── transcriber.py   # Audio extraction + faster-whisper transcription
│   ├── detector.py      # NG/duplicate detection logic
│   ├── exporter.py      # ffmpeg-based video export
│   └── requirements.txt
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx         # React entry point
│       ├── App.jsx          # Main app with stage management
│       ├── api.js           # Axios API client + polling
│       └── components/
│           ├── FileSelector.jsx      # File path input screen
│           ├── TranscriptEditor.jsx  # Segment list with toggle
│           ├── WaveformPlayer.jsx    # WaveSurfer.js waveform
│           └── ExportPanel.jsx       # Export configuration & progress
└── README.md
```
