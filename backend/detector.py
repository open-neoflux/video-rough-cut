import difflib
from typing import List, Dict, Any
from logger import get_logger

log = get_logger("detector")


# Keywords that indicate a bad take / need to redo
NG_KEYWORDS = [
    "重来", "重录", "cut", "CUT", "ng", "NG", "等一下", "不对",
    "从头", "再来", "重新", "停一下", "等等", "算了", "不行"
]


def detect_duplicates(segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Analyze segments and mark duplicates / NG takes.

    Strategy 1: Keyword detection
        If a segment's text contains NG keywords → mark it as keyword_marked.
        Also mark the segment BEFORE it (the bad take that triggered the redo).

    Strategy 2: Similarity detection
        Compare each segment with the next 3 segments.
        If similarity ratio > 0.6 → mark the earlier one as duplicate of the later one.

    Strategy 3: Very short segments (< 1.5s) that are not the last segment → flag as potential bad take.

    Default selected=False for flagged segments, selected=True for clean ones.
    """

    n = len(segments)
    # Initialize all detection fields
    for i, seg in enumerate(segments):
        seg["id"] = i
        seg["is_duplicate"] = False
        seg["duplicate_of"] = None
        seg["is_keyword_marked"] = False
        seg["selected"] = True  # default keep

    # --- Strategy 1: Keyword detection ---
    for i, seg in enumerate(segments):
        text = seg.get("text", "")
        text_lower = text.lower()
        for kw in NG_KEYWORDS:
            if kw.lower() in text_lower:
                seg["is_keyword_marked"] = True
                # Mark the segment BEFORE this one as well (the bad take)
                if i > 0:
                    segments[i - 1]["is_keyword_marked"] = True
                break

    # --- Strategy 2: Similarity detection ---
    for i in range(n):
        if segments[i]["is_duplicate"]:
            continue  # already flagged
        text_i = segments[i].get("text", "")
        if not text_i:
            continue
        # Compare with next 3 segments
        for j in range(i + 1, min(i + 4, n)):
            text_j = segments[j].get("text", "")
            if not text_j:
                continue
            ratio = difflib.SequenceMatcher(None, text_i, text_j).ratio()
            if ratio > 0.6:
                # Mark the earlier segment (i) as duplicate of the later one (j)
                segments[i]["is_duplicate"] = True
                segments[i]["duplicate_of"] = j
                break  # no need to check more for segment i

    # --- Strategy 3: Very short segments ---
    for i in range(n - 1):  # not the last segment
        seg = segments[i]
        duration = seg.get("end", 0) - seg.get("start", 0)
        if duration < 1.5:
            # Only flag if not already flagged and text is very short (likely a false start)
            text = seg.get("text", "").strip()
            if len(text) <= 5:  # very few characters
                seg["is_duplicate"] = True  # reuse flag for "bad take"

    # --- Set selected based on flags ---
    for seg in segments:
        if seg["is_duplicate"] or seg["is_keyword_marked"]:
            seg["selected"] = False
        else:
            seg["selected"] = True

    kw_count = sum(1 for s in segments if s["is_keyword_marked"])
    dup_count = sum(1 for s in segments if s["is_duplicate"])
    log.info("检测完成: 总 %d 段，关键词标记 %d 段，相似重复 %d 段", n, kw_count, dup_count)
    return segments
