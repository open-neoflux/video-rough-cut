import asyncio
import os
import time
import uuid
import mimetypes
import subprocess
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional, List

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from transcriber import extract_audio, transcribe
from detector import detect_duplicates
from exporter import export_video
from logger import get_logger

log = get_logger("main")


# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

# In-memory task store: task_id -> task dict
tasks: Dict[str, Dict[str, Any]] = {}

# Tasks (and their audio temp files) are cleaned up after this many seconds.
TASK_TTL_SECONDS = 3 * 3600  # 3 hours


def _delete_task_audio(task: Dict[str, Any]) -> None:
    """Delete the extracted WAV temp file for a task, if present."""
    audio_path = (task.get("result") or {}).get("audio_path")
    if audio_path and os.path.exists(audio_path):
        try:
            os.remove(audio_path)
            log.info("已删除临时音频: %s", audio_path)
        except OSError as e:
            log.warning("删除临时音频失败: %s", e)


async def _cleanup_loop() -> None:
    """Background loop: evict tasks and their audio files after TASK_TTL_SECONDS."""
    while True:
        await asyncio.sleep(1800)  # check every 30 minutes
        now = time.monotonic()
        expired = [
            tid for tid, t in list(tasks.items())
            if now - t.get("created_at", now) > TASK_TTL_SECONDS
        ]
        for tid in expired:
            _delete_task_audio(tasks[tid])
            del tasks[tid]
        if expired:
            log.info("已清理 %d 个过期任务", len(expired))


@asynccontextmanager
async def lifespan(app: FastAPI):
    result = subprocess.run(["ffmpeg", "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        log.warning("ffmpeg 未找到，请先安装: brew install ffmpeg")
    else:
        version_line = result.stdout.decode("utf-8", errors="replace").split("\n")[0]
        log.info("ffmpeg 就绪: %s", version_line)
    log.info("视频粗剪助手后端启动")

    cleanup_task = asyncio.create_task(_cleanup_loop())
    try:
        yield
    finally:
        cleanup_task.cancel()
        # Best-effort: delete all remaining audio temp files on shutdown
        for task in list(tasks.values()):
            _delete_task_audio(task)
        log.info("视频粗剪助手后端关闭")


app = FastAPI(title="视频粗剪助手 API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class ProcessRequest(BaseModel):
    file_path: str


class Segment(BaseModel):
    id: int
    start: float
    end: float
    text: str
    is_duplicate: bool = False
    duplicate_of: Optional[int] = None
    is_keyword_marked: bool = False
    is_silence: bool = False
    selected: bool = True


class ExportRequest(BaseModel):
    file_path: str
    segments: List[Segment]
    output_path: str


# ---------------------------------------------------------------------------
# Background task helpers
# ---------------------------------------------------------------------------

def make_task(task_type: str = "process") -> Dict[str, Any]:
    return {
        "status": "pending",
        "progress": 0.0,
        "step": "等待中...",
        "result": None,
        "error": None,
        "type": task_type,
        "output_path": None,
        "created_at": time.monotonic(),
    }


async def run_process_task(task_id: str, file_path: str):
    """Background task: extract audio → transcribe → detect duplicates."""
    task = tasks[task_id]
    task["status"] = "processing"
    audio_path = None
    log.info("[%s] 开始处理任务，文件: %s", task_id[:8], file_path)

    def progress_cb(pct: float, step: str):
        task["progress"] = pct
        task["step"] = step
        log.debug("[%s] %.1f%% - %s", task_id[:8], pct, step)

    try:
        # Step 1: Extract audio
        progress_cb(1.0, "提取音频中...")
        loop = asyncio.get_running_loop()
        audio_path = await loop.run_in_executor(None, extract_audio, file_path)
        log.info("[%s] 音频提取完成: %s", task_id[:8], audio_path)
        progress_cb(10.0, "音频提取完成，开始转录...")

        # Step 2: Transcribe
        def do_transcribe():
            return transcribe(audio_path, progress_cb)

        raw_segments = await loop.run_in_executor(None, do_transcribe)
        log.info("[%s] 转录完成，共 %d 段", task_id[:8], len(raw_segments))
        progress_cb(92.0, "转录完成，分析片段...")

        # Step 3: Detect duplicates / NG takes / silence
        def do_detect():
            return detect_duplicates(raw_segments, audio_path=audio_path)

        segments = await loop.run_in_executor(None, do_detect)
        bad = sum(1 for s in segments if s["is_duplicate"] or s["is_keyword_marked"])
        log.info("[%s] 检测完成，共 %d 段，其中疑似坏镜 %d 段", task_id[:8], len(segments), bad)

        duration = segments[-1]["end"] if segments else 0.0
        progress_cb(100.0, "分析完成！")
        task["result"] = {
            "segments": segments,
            "duration": duration,
            "audio_path": audio_path,
        }
        task["status"] = "done"
        log.info("[%s] 任务完成，视频时长 %.1fs", task_id[:8], duration)

    except Exception as e:
        log.exception("[%s] 处理任务异常: %s", task_id[:8], e)
        task["status"] = "error"
        task["error"] = str(e)
        task["step"] = f"错误: {e}"
        if audio_path and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
            except OSError:
                pass


async def run_export_task(task_id: str, file_path: str, segments: List[Dict], output_path: str):
    """Background task: export video with selected segments."""
    task = tasks[task_id]
    task["status"] = "processing"
    kept = sum(1 for s in segments if s.get("selected"))
    log.info("[%s] 开始导出，保留 %d 段，输出: %s", task_id[:8], kept, output_path)

    def progress_cb(pct: float, step: str):
        task["progress"] = pct
        task["step"] = step
        log.debug("[%s] 导出 %.1f%% - %s", task_id[:8], pct, step)

    try:
        loop = asyncio.get_running_loop()

        def do_export():
            export_video(file_path, segments, output_path, progress_cb)

        await loop.run_in_executor(None, do_export)
        task["status"] = "done"
        task["output_path"] = output_path
        log.info("[%s] 导出完成: %s", task_id[:8], output_path)

    except Exception as e:
        log.exception("[%s] 导出任务异常: %s", task_id[:8], e)
        task["status"] = "error"
        task["error"] = str(e)
        task["step"] = f"导出错误: {e}"


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@app.post("/api/process")
async def process_video(req: ProcessRequest, background_tasks: BackgroundTasks):
    """Start processing a video file. Returns task_id immediately."""
    if not os.path.isfile(req.file_path):
        log.warning("文件不存在: %s", req.file_path)
        raise HTTPException(status_code=400, detail=f"文件不存在: {req.file_path}")

    ext = os.path.splitext(req.file_path)[1].lower()
    allowed = {".mp4", ".mov", ".mkv", ".avi", ".m4v", ".wmv", ".flv", ".webm"}
    if ext not in allowed:
        log.warning("不支持的文件格式: %s", ext)
        raise HTTPException(status_code=400, detail=f"不支持的文件格式: {ext}")

    task_id = str(uuid.uuid4())
    tasks[task_id] = make_task("process")
    log.info("创建处理任务 [%s]: %s", task_id[:8], req.file_path)

    background_tasks.add_task(run_process_task, task_id, req.file_path)
    return {"task_id": task_id}


@app.get("/api/task/{task_id}")
async def get_task_status(task_id: str):
    """Get task status and result."""
    task = tasks.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail=f"任务不存在: {task_id}")

    response: Dict[str, Any] = {
        "status": task["status"],
        "progress": task["progress"],
        "step": task["step"],
    }

    if task["status"] == "done":
        if task["type"] == "process":
            response["result"] = task["result"]
        elif task["type"] == "export":
            response["output_path"] = task.get("output_path")

    if task["status"] == "error":
        response["error"] = task.get("error")

    return response


@app.post("/api/export")
async def export_video_endpoint(req: ExportRequest, background_tasks: BackgroundTasks):
    """Start exporting the edited video. Returns task_id immediately."""
    if not os.path.isfile(req.file_path):
        log.warning("导出源文件不存在: %s", req.file_path)
        raise HTTPException(status_code=400, detail=f"源文件不存在: {req.file_path}")

    selected_count = sum(1 for s in req.segments if s.selected)
    if selected_count == 0:
        log.warning("导出请求没有选中任何片段")
        raise HTTPException(status_code=400, detail="没有选中任何片段")

    task_id = str(uuid.uuid4())
    tasks[task_id] = make_task("export")
    log.info("创建导出任务 [%s]: %d 段 → %s", task_id[:8], selected_count, req.output_path)

    segments_dicts = [s.model_dump() for s in req.segments]
    background_tasks.add_task(
        run_export_task, task_id, req.file_path, segments_dicts, req.output_path
    )
    return {"task_id": task_id}


@app.get("/api/task/{task_id}/output")
async def get_export_output(task_id: str):
    """Get export task status (alias for get_task_status for export tasks)."""
    task = tasks.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail=f"任务不存在: {task_id}")

    return {
        "status": task["status"],
        "progress": task["progress"],
        "step": task["step"],
        "output_path": task.get("output_path"),
        "error": task.get("error"),
    }


@app.get("/api/audio")
async def stream_audio(path: str):
    """
    Stream a local audio file.
    Query param: path=<absolute path to audio file>
    Used by the frontend waveform player.
    """
    if not path:
        raise HTTPException(status_code=400, detail="path parameter is required")

    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail=f"音频文件不存在: {path}")

    # Security: only serve files that look like temp audio files (WAV)
    # In a local-only app this is fine, but let's do a basic check
    ext = os.path.splitext(path)[1].lower()
    if ext not in {".wav", ".mp3", ".m4a", ".aac", ".ogg", ".flac"}:
        raise HTTPException(status_code=400, detail="不支持的音频格式")

    mime_type, _ = mimetypes.guess_type(path)
    if not mime_type:
        mime_type = "audio/wav"

    file_size = os.path.getsize(path)

    def iterfile():
        with open(path, "rb") as f:
            chunk_size = 64 * 1024  # 64KB chunks
            while True:
                chunk = f.read(chunk_size)
                if not chunk:
                    break
                yield chunk

    return StreamingResponse(
        iterfile(),
        media_type=mime_type,
        headers={
            "Content-Length": str(file_size),
            "Accept-Ranges": "bytes",
            "Cache-Control": "no-cache",
        }
    )


@app.get("/api/browse")
async def browse_file():
    """Open a native OS file dialog and return the selected file path."""
    import sys
    import platform

    def open_dialog_sync():
        system = platform.system()

        if system == "Darwin":
            # macOS: use osascript (AppleScript) — most reliable approach
            script = (
                'tell application "System Events"\n'
                '  activate\n'
                'end tell\n'
                'set f to choose file with prompt "选择视频文件" '
                'of type {"mp4", "mov", "mkv", "avi", "m4v", "wmv", "flv", "webm"}\n'
                'POSIX path of f'
            )
            result = subprocess.run(
                ["osascript", "-e", script],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=120,
            )
            if result.returncode == 0:
                return result.stdout.decode("utf-8").strip()
            # User cancelled (exit code 1 with "User canceled" message)
            stderr = result.stderr.decode("utf-8")
            if "User canceled" in stderr or "cancel" in stderr.lower():
                return None
            raise RuntimeError(stderr.strip())

        elif system == "Windows":
            import tkinter as tk
            from tkinter import filedialog
            root = tk.Tk()
            root.withdraw()
            root.attributes("-topmost", True)
            path = filedialog.askopenfilename(
                title="选择视频文件",
                filetypes=[("视频文件", "*.mp4 *.mov *.mkv *.avi *.m4v *.wmv"), ("所有文件", "*.*")],
            )
            root.destroy()
            return path or None

        else:
            # Linux: try zenity
            result = subprocess.run(
                ["zenity", "--file-selection", "--title=选择视频文件",
                 "--file-filter=视频文件 | *.mp4 *.mov *.mkv *.avi *.m4v *.wmv *.flv *.webm"],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120,
            )
            if result.returncode == 0:
                return result.stdout.decode("utf-8").strip()
            return None

    try:
        loop = asyncio.get_running_loop()
        path = await loop.run_in_executor(None, open_dialog_sync)
        return {"path": path}
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="文件选择超时")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件选择器错误: {e}")


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "message": "视频粗剪助手运行中"}


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
