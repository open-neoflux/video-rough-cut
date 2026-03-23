import subprocess
import tempfile
import os
from typing import Callable, List, Dict, Any


def extract_audio(video_path: str) -> str:
    """
    Extract audio from video file to a temporary WAV file.
    Output is 16kHz mono WAV, much smaller than the original video.
    Returns path to the extracted audio file.
    """
    # Create a temp file with .wav extension
    tmp_fd, tmp_path = tempfile.mkstemp(suffix=".wav", prefix="roughcut_audio_")
    os.close(tmp_fd)

    cmd = [
        "ffmpeg",
        "-y",              # overwrite output
        "-i", video_path,
        "-vn",             # no video
        "-acodec", "pcm_s16le",  # PCM 16-bit little endian
        "-ar", "16000",    # 16kHz sample rate
        "-ac", "1",        # mono
        tmp_path
    ]

    try:
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=600  # 10 minute timeout for large files
        )
        if result.returncode != 0:
            error_msg = result.stderr.decode("utf-8", errors="replace")
            raise RuntimeError(f"ffmpeg audio extraction failed: {error_msg}")
    except subprocess.TimeoutExpired:
        raise RuntimeError("Audio extraction timed out (>10 minutes)")
    except FileNotFoundError:
        raise RuntimeError("ffmpeg not found. Please install ffmpeg and ensure it is in PATH.")

    return tmp_path


def transcribe(
    audio_path: str,
    progress_callback: Callable[[float, str], None]
) -> List[Dict[str, Any]]:
    """
    Transcribe audio using faster-whisper.
    Returns list of segment dicts with start, end, text.
    Calls progress_callback(percent: float, step_name: str) periodically.
    """
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        raise RuntimeError("faster-whisper is not installed. Run: pip install faster-whisper")

    progress_callback(5.0, "加载语音识别模型...")

    # Use medium model for good Chinese accuracy
    # device="cpu" with int8 for broad compatibility; use "cuda" if GPU available
    try:
        model = WhisperModel("medium", device="cpu", compute_type="int8")
    except Exception as e:
        raise RuntimeError(f"Failed to load Whisper model: {e}")

    progress_callback(15.0, "开始转录...")

    segments_result, info = model.transcribe(
        audio_path,
        language="zh",
        beam_size=5,
        vad_filter=True,          # filter out non-speech
        vad_parameters=dict(min_silence_duration_ms=500),
    )

    # Collect all segments (generator)
    segments = []
    duration = info.duration if info.duration else 1.0

    for seg in segments_result:
        segments.append({
            "start": seg.start,
            "end": seg.end,
            "text": seg.text.strip(),
        })
        # Update progress based on how far through the audio we are
        pct = 15.0 + (seg.end / duration) * 75.0
        pct = min(pct, 90.0)
        progress_callback(pct, f"转录中... {seg.end:.1f}s / {duration:.1f}s")

    progress_callback(95.0, "转录完成，正在整理...")
    return segments
