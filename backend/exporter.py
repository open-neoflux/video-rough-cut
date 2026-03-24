import subprocess
import tempfile
import os
from typing import List, Dict, Any, Callable
from logger import get_logger

log = get_logger("exporter")


def export_video(
    video_path: str,
    segments: List[Dict[str, Any]],
    output_path: str,
    progress_callback: Callable[[float, str], None]
) -> None:
    """
    Export video with only the selected segments concatenated together.
    Uses ffmpeg concat demuxer with -c copy (no re-encoding) for speed.

    Args:
        video_path: Path to the original source video.
        segments: List of segment dicts; only those with selected=True are kept.
        output_path: Path for the output video file.
        progress_callback: Called with (percent, step_name).
    """
    progress_callback(2.0, "准备导出...")

    # Filter and sort selected segments
    selected = [s for s in segments if s.get("selected", False)]
    selected.sort(key=lambda s: s["start"])

    log.info("导出开始: %d 段已选，输出 → %s", len(selected), output_path)
    if not selected:
        raise ValueError("没有选中任何片段，无法导出。")

    progress_callback(5.0, "生成片段列表...")

    # Create temp directory for intermediate files
    tmp_dir = tempfile.mkdtemp(prefix="roughcut_export_")
    concat_list_path = os.path.join(tmp_dir, "concat.txt")
    segment_files = []

    try:
        total_segments = len(selected)

        # Step 1: Extract each selected segment to a separate temp file
        for idx, seg in enumerate(selected):
            seg_path = os.path.join(tmp_dir, f"seg_{idx:04d}.mp4")
            segment_files.append(seg_path)

            start = seg["start"]
            end = seg["end"]
            duration = end - start

            # Two-pass seek: coarse input seek (fast) + fine output seek (accurate)
            pre_roll = 4.0
            safe_start = max(0.0, start - pre_roll)
            fine_offset = start - safe_start

            cmd = [
                "ffmpeg",
                "-y",
                "-ss", str(safe_start),   # fast coarse seek via input seek
                "-i", video_path,
                "-ss", str(fine_offset),  # accurate fine seek via output seek
                "-t", str(duration),
                "-c", "copy",             # no re-encoding
                "-avoid_negative_ts", "make_zero",
                seg_path
            ]

            result = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=300
            )
            if result.returncode != 0:
                err = result.stderr.decode("utf-8", errors="replace")
                log.error("ffmpeg 片段提取失败 (segment %d):\n%s", idx, err)
                raise RuntimeError(f"ffmpeg segment extraction failed (segment {idx}): {err}")

            pct = 5.0 + (idx + 1) / total_segments * 70.0
            progress_callback(pct, f"导出中... 片段 {idx + 1}/{total_segments}")

        # Step 2: Build concat list file
        progress_callback(78.0, "合并片段...")
        with open(concat_list_path, "w", encoding="utf-8") as f:
            for seg_path in segment_files:
                # Escape single quotes in path for ffmpeg concat format
                escaped = seg_path.replace("'", "'\\''")
                f.write(f"file '{escaped}'\n")

        # Step 3: Concatenate all segments
        # Ensure output directory exists
        out_dir = os.path.dirname(output_path)
        if out_dir and not os.path.exists(out_dir):
            os.makedirs(out_dir, exist_ok=True)

        cmd_concat = [
            "ffmpeg",
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", concat_list_path,
            "-c", "copy",
            output_path
        ]

        result = subprocess.run(
            cmd_concat,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=600
        )
        if result.returncode != 0:
            err = result.stderr.decode("utf-8", errors="replace")
            log.error("ffmpeg concat 失败:\n%s", err)
            raise RuntimeError(f"ffmpeg concat failed: {err}")

        log.info("导出成功: %s", output_path)
        progress_callback(98.0, "导出完成，清理临时文件...")

    finally:
        # Clean up temp segment files and concat list
        for seg_path in segment_files:
            try:
                if os.path.exists(seg_path):
                    os.remove(seg_path)
            except OSError:
                pass
        try:
            if os.path.exists(concat_list_path):
                os.remove(concat_list_path)
        except OSError:
            pass
        try:
            if os.path.exists(tmp_dir):
                os.rmdir(tmp_dir)
        except OSError:
            pass

    progress_callback(100.0, "导出成功！")
