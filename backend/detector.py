import re
import difflib
import subprocess
from typing import List, Dict, Any, Optional
from logger import get_logger

log = get_logger("detector")


# Keywords that indicate a bad take / need to redo
NG_KEYWORDS = [
    "重来", "重录", "cut", "CUT", "ng", "NG", "等一下", "不对",
    "从头", "再来", "重新", "停一下", "等等", "算了", "不行"
]

SILENCE_MIN_DURATION = 3.0   # 超过此秒数的静音才处理
SILENCE_PADDING = 1.0        # 静音段两端各保留的秒数
SILENCE_NOISE_DB = -35       # 低于此分贝视为静音


def detect_silence_from_audio(audio_path: str) -> List[tuple]:
    """
    使用 ffmpeg silencedetect 滤镜直接检测音频中的静音段。
    返回 [(silence_start, silence_end), ...] 列表，单位秒。
    """
    cmd = [
        "ffmpeg", "-i", audio_path,
        "-af", f"silencedetect=noise={SILENCE_NOISE_DB}dB:d={SILENCE_MIN_DURATION}",
        "-f", "null", "-"
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
    output = result.stderr.decode("utf-8", errors="replace")

    starts = [float(x) for x in re.findall(r"silence_start:\s*([\d.]+)", output)]
    ends   = [float(x) for x in re.findall(r"silence_end:\s*([\d.]+)",   output)]

    silences = list(zip(starts, ends[:len(starts)]))
    log.info("silencedetect 找到 %d 段静音（>%.1fs）", len(silences), SILENCE_MIN_DURATION)
    for s, e in silences:
        log.debug("  静音: %.2fs → %.2fs（%.1fs）", s, e, e - s)
    return silences


def detect_duplicates(segments: List[Dict[str, Any]], audio_path: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Analyze segments and mark duplicates / NG takes / silence.

    Strategy 1: Keyword detection
    Strategy 2: Similarity detection
    Strategy 3: Silence detection via ffmpeg silencedetect (requires audio_path)
    """

    n = len(segments)
    for i, seg in enumerate(segments):
        seg["id"] = i
        seg["is_duplicate"] = False
        seg["duplicate_of"] = None
        seg["is_keyword_marked"] = False
        seg["is_silence"] = False
        seg["selected"] = True

    # --- Strategy 1: Keyword detection ---
    for i, seg in enumerate(segments):
        text_lower = seg.get("text", "").lower()
        for kw in NG_KEYWORDS:
            if kw.lower() in text_lower:
                seg["is_keyword_marked"] = True
                if i > 0:
                    segments[i - 1]["is_keyword_marked"] = True
                break

    # --- Strategy 2: Similarity detection ---
    for i in range(n):
        if segments[i]["is_duplicate"]:
            continue
        text_i = segments[i].get("text", "")
        if not text_i:
            continue
        for j in range(i + 1, min(i + 4, n)):
            text_j = segments[j].get("text", "")
            if not text_j:
                continue
            if difflib.SequenceMatcher(None, text_i, text_j).ratio() > 0.6:
                segments[i]["is_duplicate"] = True
                segments[i]["duplicate_of"] = j
                break

    # --- Strategy 3: Silence detection via ffmpeg ---
    silence_inserts = []
    if audio_path:
        try:
            silences = detect_silence_from_audio(audio_path)
            for silence_start_raw, silence_end_raw in silences:
                duration = silence_end_raw - silence_start_raw
                s_start = round(silence_start_raw + SILENCE_PADDING, 3)
                s_end   = round(silence_end_raw   - SILENCE_PADDING, 3)
                if s_end - s_start < 1.0:
                    continue  # 裁剩不足1秒，跳过

                # 找插入位置：在所有 start < silence_end_raw 的 segment 之后
                insert_after = -1
                for i, seg in enumerate(segments):
                    if seg["start"] < silence_end_raw:
                        insert_after = i

                silence_seg = {
                    "id": -1,
                    "start": s_start,
                    "end": s_end,
                    "text": f"(静音 {duration:.1f}s，删除中间 {s_end - s_start:.1f}s)",
                    "is_duplicate": False,
                    "duplicate_of": None,
                    "is_keyword_marked": False,
                    "is_silence": True,
                    "selected": False,
                }
                silence_inserts.append((insert_after + 1, silence_seg))
        except Exception as e:
            log.warning("静音检测失败，跳过: %s", e)
    else:
        log.warning("未提供 audio_path，跳过静音检测")

    # 按插入位置倒序插入，避免影响前面的 index
    for insert_idx, silence_seg in sorted(silence_inserts, key=lambda x: x[0], reverse=True):
        segments.insert(insert_idx, silence_seg)

    # Renumber
    for i, seg in enumerate(segments):
        seg["id"] = i

    # Set selected
    for seg in segments:
        if seg.get("is_silence") or seg["is_duplicate"] or seg["is_keyword_marked"]:
            seg["selected"] = False
        else:
            seg["selected"] = True

    kw_count      = sum(1 for s in segments if s["is_keyword_marked"])
    dup_count     = sum(1 for s in segments if s["is_duplicate"])
    silence_count = sum(1 for s in segments if s.get("is_silence"))
    log.info(
        "检测完成: 总 %d 段，关键词标记 %d 段，相似重复 %d 段，静音 %d 段",
        len(segments), kw_count, dup_count, silence_count
    )
    return segments
