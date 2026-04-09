# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

A local web application for automatic video rough editing. It uses `faster-whisper` to transcribe video audio, detects NG takes and duplicate segments, and exports a clean cut via `ffmpeg -c copy` (no re-encoding).

## Commands

### Start Everything (Recommended)
```bash
./start.sh
```

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python main.py          # Runs on http://localhost:8000, with --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev             # Runs on http://localhost:5173
npm run build           # Outputs to frontend/dist/
```

### Dependencies
- `ffmpeg` must be in PATH (`brew install ffmpeg` on macOS)
- Python 3.9+, Node.js 18+
- On first run, `faster-whisper` downloads the `medium` Whisper model (~1.5GB)

## Architecture

### Backend (`backend/`)

FastAPI app with async background tasks and an in-memory task store (dict). All heavy work runs in a thread pool via `loop.run_in_executor`.

**Processing pipeline** (`POST /api/process`):
1. `transcriber.py` — extracts 16kHz mono WAV via ffmpeg, then transcribes with `faster-whisper` (medium model, CPU by default)
2. `detector.py` — runs three detection strategies in sequence:
   - **Keyword**: matches NG_KEYWORDS list against transcript text; also marks the preceding segment
   - **Similarity**: `difflib.SequenceMatcher` ratio > 0.6 within a sliding window of 4 segments; marks the earlier segment as duplicate
   - **Silence**: uses `ffmpeg silencedetect` filter on the extracted WAV; inserts synthetic segments for silences >3s
3. Result stored in `tasks[task_id]`; frontend polls `GET /api/task/{task_id}`

**Export pipeline** (`POST /api/export`):
- `exporter.py` receives the list of segments with `selected` flags, builds an ffmpeg concat list of only the selected segments, runs `ffmpeg -c copy`

**Other endpoints**:
- `GET /api/audio?path=...` — streams local WAV file for waveform display
- `GET /api/browse` — opens native OS file picker (osascript on macOS, tkinter on Windows, zenity on Linux)

To enable GPU transcription: change `device="cpu"` to `device="cuda"` in `transcriber.py`.

### Frontend (`frontend/src/`)

React 18 SPA (no router). State lives in `App.jsx` and persists to `localStorage` under the key `roughcut_state`.

**App stages** (controlled by `stage` state in `App.jsx`):
1. `file` → `FileSelector.jsx` — path input + native file picker button
2. `processing` → inline progress UI in `App.jsx` — polls backend every 2s via `pollTask()` in `api.js`
3. `editor` → `TranscriptEditor.jsx` + `WaveformPlayer.jsx` + `ExportPanel.jsx`

**Key components**:
- `TranscriptEditor.jsx` — segment list with per-segment toggle; toolbar for 全选/全不选/智能选择
- `WaveformPlayer.jsx` — WaveSurfer.js v7 waveform; deleted segments highlighted red; syncs with segment selection
- `ExportPanel.jsx` — output path config, calls `POST /api/export`, polls export task

**Theming**: `ThemeContext.js` + `theme.js` provide dark/light theme objects. All inline styles reference theme tokens from context (`t.accent`, `t.text`, etc.) — no CSS files.

**API layer**: `api.js` wraps axios with `BASE_URL = ''` (proxied by Vite to `http://localhost:8000`).
