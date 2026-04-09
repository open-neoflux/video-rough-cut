import subprocess
import os
import re
from typing import List, Dict, Any, Callable
from logger import get_logger

log = get_logger("exporter")


def _fmt_time(seconds: float) -> str:
    m = int(seconds // 60)
    s = seconds % 60
    return f"{m}:{s:05.2f}"


def export_video(
    video_path: str,
    segments: List[Dict[str, Any]],
    output_path: str,
    progress_callback: Callable[[float, str], None],
) -> None:
    """
    Export video with only the selected segments concatenated together.

    Uses a single ffmpeg pass with filter_complex (trim + setpts + concat).
    This produces a seamless output stream with no GOP boundary issues,
    no timestamp discontinuities, and no intermediate temp files.

    Args:
        video_path: Path to the original source video.
        segments: List of segment dicts; only those with selected=True are kept.
        output_path: Path for the output video file.
        progress_callback: Called with (percent, step_name).
    """
    progress_callback(2.0, "准备导出...")

    # Sort ALL segments (selected + unselected) by start time so we can walk
    # through them in order and detect contiguous selected blocks.
    all_segs = sorted(segments, key=lambda s: s["start"])
    selected_count = sum(1 for s in all_segs if s.get("selected", False))

    if selected_count == 0:
        raise ValueError("没有选中任何片段，无法导出。")

    # Build deleted blocks (groups of consecutive unselected segments).
    # Cut points are placed at the boundaries of these blocks, NOT at the
    # boundaries of selected segments.  This preserves the natural silence gaps
    # that Whisper's VAD leaves between segments — those gaps would otherwise
    # be silently cut along with the deleted content.
    #
    # Example:
    #   [sel 2-5s] [gap 5-5.5s] [del 5.5-8s] [gap 8-8.8s] [sel 8.8-12s]
    #   Old (selected boundaries): keep [2-5s] + [8.8-12s]  ← gaps lost
    #   New (deleted boundaries):  keep [0-5.5s] + [8-12s]  ← gaps preserved
    #
    # Consecutive deleted segments form one block; the silence between them
    # (which belongs to the deleted section) is removed together with them.
    deleted_blocks: list = []
    blk_start = blk_end = None
    for seg in all_segs:
        if not seg.get("selected", False):
            if blk_start is None:
                blk_start = seg["start"]
            blk_end = seg["end"]
        else:
            if blk_start is not None:
                deleted_blocks.append((blk_start, blk_end))
                blk_start = blk_end = None
    if blk_start is not None:
        deleted_blocks.append((blk_start, blk_end))

    video_end = all_segs[-1]["end"] if all_segs else 0.0
    if not deleted_blocks:
        ranges = [(0.0, video_end)]
    else:
        ranges = []
        prev = 0.0
        for db_start, db_end in deleted_blocks:
            if db_start > prev + 0.01:
                ranges.append((prev, db_start))
            prev = db_end
        if video_end > prev + 0.01:
            ranges.append((prev, video_end))

    log.info(
        "导出开始: %d 段已选，%d 个删除块 → %d 个保留区间，输出 → %s",
        selected_count, len(deleted_blocks), len(ranges), output_path,
    )

    progress_callback(5.0, "构建滤镜图...")

    filter_parts = []
    concat_inputs = []
    for idx, (s, e) in enumerate(ranges):
        fs = f"{s:.6f}"
        fe = f"{e:.6f}"
        filter_parts.append(
            f"[0:v]trim=start={fs}:end={fe},setpts=PTS-STARTPTS[v{idx}];"
            f"[0:a]atrim=start={fs}:end={fe},asetpts=PTS-STARTPTS[a{idx}]"
        )
        concat_inputs.append(f"[v{idx}][a{idx}]")

    n = len(ranges)
    filter_complex = (
        ";".join(filter_parts)
        + f";{''.join(concat_inputs)}concat=n={n}:v=1:a=1[vout][aout]"
    )

    out_dir = os.path.dirname(output_path)
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    total_dur = sum(e - s for s, e in ranges)

    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-filter_complex", filter_complex,
        "-map", "[vout]",
        "-map", "[aout]",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        output_path,
    ]

    log.info("执行导出命令 (%d 个区间，总时长 %.1fs)", n, total_dur)
    progress_callback(8.0, "开始编码...")

    try:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            errors="replace",
        )

        stderr_lines = []
        for line in process.stdout:
            line_s = line.rstrip()
            stderr_lines.append(line_s)
            log.debug("ffmpeg: %s", line_s)
            m = re.search(r"time=(\d+):(\d+):([\d.]+)", line)
            if m and total_dur > 0:
                encoded = (
                    int(m.group(1)) * 3600
                    + int(m.group(2)) * 60
                    + float(m.group(3))
                )
                pct = 8.0 + min(encoded / total_dur, 1.0) * 88.0
                progress_callback(
                    pct,
                    f"编码中... {_fmt_time(encoded)} / {_fmt_time(total_dur)}",
                )

        process.wait(timeout=3600)

    except subprocess.TimeoutExpired:
        process.kill()
        raise RuntimeError("导出超时（>60 分钟）")

    if process.returncode != 0:
        tail = "\n".join(stderr_lines[-30:])
        log.error("ffmpeg 导出失败 (code=%d):\n%s", process.returncode, tail)
        raise RuntimeError(
            f"ffmpeg export failed (code={process.returncode}):\n{tail}"
        )

    log.info("导出成功: %s", output_path)
    progress_callback(100.0, "导出成功！")
