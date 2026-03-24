import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { useTheme } from '../ThemeContext.js'

function formatTime(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds)) return '00:00.0'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`
}

// Static (non-color) styles
const staticStyles = {
  container: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', borderRadius: '12px' },
  titleBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    flexShrink: 0,
  },
  titleText: {
    fontSize: '13px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  statsBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    flexShrink: 0,
  },
  smartBtn: {
    padding: '5px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
  },
  hintText: {
    fontSize: '12px',
    fontStyle: 'italic',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  card: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    borderLeft: '3px solid transparent',
    position: 'relative',
    userSelect: 'none',
    transition: 'background 0.18s ease, border-color 0.18s ease, opacity 0.18s ease, transform 0.15s ease, box-shadow 0.18s ease',
  },
  content: { flex: 1, minWidth: 0 },
  timeRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' },
  badge: { fontSize: '11px', padding: '2px 7px', borderRadius: '4px', fontWeight: '600', flexShrink: 0 },
  text: { fontSize: '14px', lineHeight: '1.5', wordBreak: 'break-all' },
  actions: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 },
  actionBtns: { display: 'flex', alignItems: 'center', gap: '3px' },
  keepBtn: { padding: '3px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', lineHeight: '1', flexShrink: 0 },
  timeEditRow: { display: 'flex', alignItems: 'center', gap: '4px' },
  addSegBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    padding: '10px',
    borderRadius: '8px',
    fontSize: '13px', fontWeight: '500', cursor: 'pointer', marginTop: '2px',
  },
}

// ─── SegmentCard ──────────────────────────────────────────────────────────────

function SegmentCard({ seg, isLast, isActive, onSeek, onToggle, onEdit, onSplit, onMerge }) {
  const t = useTheme()
  const [hovered, setHovered] = useState(false)
  const [editingTime, setEditingTime] = useState(false)
  const [draftStart, setDraftStart] = useState('')
  const [draftEnd, setDraftEnd] = useState('')

  const isSelected = seg.selected

  // Card background / border based on state and theme
  const cardStyle = useMemo(() => {
    const base = {
      ...staticStyles.card,
      border: '1px solid',
    }
    if (isActive) {
      if (isSelected) {
        return {
          ...base,
          background: t.id === 'dark' ? '#1e1a3a' : '#ede9fe',
          borderColor: `rgba(${t.id === 'dark' ? '129,140,248' : '99,102,241'},0.3)`,
          borderLeftColor: t.accentLight,
        }
      } else {
        return {
          ...base,
          background: t.id === 'dark' ? '#1a1a2e' : '#f5f3ff',
          borderColor: `rgba(${t.id === 'dark' ? '79,70,229' : '99,102,241'},0.2)`,
          borderLeftColor: t.accent,
        }
      }
    }
    if (isSelected) {
      return {
        ...base,
        background: t.surface,
        borderColor: t.border,
        borderLeftColor: t.green,
      }
    }
    return {
      ...base,
      background: t.redSoft,
      borderColor: t.redBorder,
      borderLeftColor: t.red,
      opacity: 0.7,
    }
  }, [isSelected, isActive, t])

  const timeStyle = useMemo(() => {
    const base = {
      fontSize: '11px', fontFamily: 'monospace',
      background: t.surface2, padding: '2px 6px', borderRadius: '4px', flexShrink: 0,
    }
    if (isActive) {
      return {
        ...base,
        color: t.accentLight,
        background: t.id === 'dark' ? '#1e1a3a' : '#ede9fe',
        border: `1px solid rgba(${t.id === 'dark' ? '129,140,248' : '99,102,241'},0.3)`,
      }
    }
    if (hovered && !editingTime) {
      return {
        ...base,
        color: t.textFaint,
        border: `1px dashed ${t.id === 'dark' ? '#374151' : t.border2}`,
        cursor: 'pointer',
      }
    }
    return { ...base, color: t.textDim }
  }, [isActive, hovered, editingTime, t])

  const timeInputStyle = {
    width: '62px', padding: '2px 5px', background: t.surface, color: t.text,
    border: `1px solid ${t.accent}`, borderRadius: '4px', fontSize: '11px',
    fontFamily: 'monospace', outline: 'none',
  }

  const timeEditLabelStyle = { fontSize: '11px', color: t.textFaint, fontFamily: 'monospace' }

  const segIdStyle = { fontSize: '10px', color: t.id === 'dark' ? '#374151' : t.textFaint, fontFamily: 'monospace' }

  const iconBtnStyle = {
    padding: '3px 6px', background: t.id === 'dark' ? 'rgba(42,42,42,0.9)' : t.surfaceHover, color: t.textSub,
    border: `1px solid ${t.id === 'dark' ? '#374151' : t.border2}`, borderRadius: '5px', fontSize: '12px',
    cursor: 'pointer', lineHeight: '1', flexShrink: 0,
  }

  // Fix 2: button shows action you CAN take (opposite of current state)
  // isSelected=true (currently kept) → show "删除" (action: delete it) with red style
  // isSelected=false (currently deleted) → show "保留" (action: keep it) with green style
  const keepBtnStyle = isSelected
    ? { ...staticStyles.keepBtn, background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }
    : { ...staticStyles.keepBtn, background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }

  const badgeDuplicate = { background: t.orangeSoft, color: t.id === 'dark' ? '#fb923c' : t.orange, border: `1px solid ${t.orangeBorder}` }
  const badgeKeyword = { background: t.redSoft, color: t.id === 'dark' ? '#f87171' : t.red, border: `1px solid ${t.redBorder}` }
  const badgeSilence = { background: t.id === 'dark' ? 'rgba(107,114,128,0.15)' : 'rgba(107,114,128,0.08)', color: t.textSub, border: `1px solid ${t.id === 'dark' ? 'rgba(107,114,128,0.3)' : t.border}` }

  // 点击卡片 → 跳转播放位置
  const handleCardClick = useCallback((e) => {
    if (e.target.closest('[data-noclick]')) return
    onSeek(seg.start)
  }, [seg.start, onSeek])

  const startTimeEdit = useCallback((e) => {
    e.stopPropagation()
    setDraftStart(String(Number(seg.start.toFixed(2))))
    setDraftEnd(String(Number(seg.end.toFixed(2))))
    setEditingTime(true)
  }, [seg.start, seg.end])

  const commitTimeEdit = useCallback(() => {
    const start = parseFloat(draftStart)
    const end = parseFloat(draftEnd)
    if (!isNaN(start) && !isNaN(end) && end > start) onEdit(seg.id, { start, end })
    setEditingTime(false)
  }, [draftStart, draftEnd, seg.id, onEdit])

  const handleTimeKeyDown = useCallback((e) => {
    if (e.key === 'Enter') { e.preventDefault(); commitTimeEdit() }
    else if (e.key === 'Escape') setEditingTime(false)
  }, [commitTimeEdit])

  return (
    <div
      style={cardStyle}
      onClick={handleCardClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="点击跳转到该片段"
      data-seg-id={seg.id}
    >
      {/* 内容区 */}
      <div style={staticStyles.content}>
        <div style={staticStyles.timeRow}>
          {editingTime ? (
            <div style={staticStyles.timeEditRow} data-noclick="1" onClick={e => e.stopPropagation()}>
              <input type="number" step="0.1" min="0" style={timeInputStyle}
                value={draftStart} onChange={e => setDraftStart(e.target.value)}
                onKeyDown={handleTimeKeyDown} onBlur={commitTimeEdit} autoFocus title="开始时间（秒）" />
              <span style={timeEditLabelStyle}>→</span>
              <input type="number" step="0.1" min="0" style={timeInputStyle}
                value={draftEnd} onChange={e => setDraftEnd(e.target.value)}
                onKeyDown={handleTimeKeyDown} onBlur={commitTimeEdit} title="结束时间（秒）" />
              <span style={{ ...timeEditLabelStyle, fontSize: '10px' }}>s</span>
            </div>
          ) : (
            <span style={timeStyle} onClick={startTimeEdit} data-noclick="1" title="点击编辑时间">
              {isActive && '▶ '}[{formatTime(seg.start)} - {formatTime(seg.end)}]
            </span>
          )}

          {seg.is_duplicate && (
            <span style={{ ...staticStyles.badge, ...badgeDuplicate }}>
              🔁 重复{seg.duplicate_of != null ? ` →#${seg.duplicate_of}` : ''}
            </span>
          )}
          {seg.is_keyword_marked && <span style={{ ...staticStyles.badge, ...badgeKeyword }}>⚠️ 标记</span>}
          {seg.is_silence && <span style={{ ...staticStyles.badge, ...badgeSilence }}>🔇 静音</span>}
        </div>

        <div style={{ ...staticStyles.text, color: isSelected ? t.text : t.textDim }}>
          {seg.text || <em style={{ opacity: 0.5 }}>(无文字)</em>}
        </div>
      </div>

      {/* 右侧操作区 */}
      <div style={staticStyles.actions}>
        <div style={segIdStyle}>#{seg.id}</div>

        {/* 保留/删除按钮 — 始终可见, 显示可执行的操作 */}
        <button
          style={keepBtnStyle}
          data-noclick="1"
          onClick={e => { e.stopPropagation(); onToggle(seg.id) }}
          title={isSelected ? '标记为删除' : '标记为保留'}
        >
          {isSelected ? '删除' : '保留'}
        </button>

        {/* 拆分 / 合并 — 悬停时平滑展开 */}
        <div
          style={{
            ...staticStyles.actionBtns,
            maxHeight: hovered && !editingTime ? '40px' : '0px',
            overflow: 'hidden',
            opacity: hovered && !editingTime ? 1 : 0,
            pointerEvents: hovered && !editingTime ? 'auto' : 'none',
            transition: 'max-height 0.2s ease, opacity 0.18s ease',
          }}
          data-noclick="1"
          onClick={e => e.stopPropagation()}
        >
          <button style={iconBtnStyle} onClick={e => { e.stopPropagation(); onSplit(seg.id) }} title="从中间拆分">✂️</button>
          {!isLast && (
            <button style={iconBtnStyle} onClick={e => { e.stopPropagation(); onMerge(seg.id) }} title="与下一段合并">⬇️</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── TranscriptEditor ─────────────────────────────────────────────────────────

export default function TranscriptEditor({
  segments,
  currentTime,
  onSegmentSeek,
  onSegmentToggle,
  onAutoSelect,
  onSegmentEdit,
  onSegmentSplit,
  onSegmentMerge,
  onSegmentAdd,
}) {
  const t = useTheme()
  const listRef = useRef(null)

  const activeSegId = useMemo(() => {
    if (!segments || currentTime == null) return null
    const active = segments.find(s => currentTime >= s.start && currentTime < s.end)
    return active ? active.id : null
  }, [segments, currentTime])

  // 自动滚动到当前播放段
  useEffect(() => {
    if (activeSegId == null || !listRef.current) return
    const el = listRef.current.querySelector(`[data-seg-id="${activeSegId}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeSegId])

  const containerStyle = {
    ...staticStyles.container,
    background: t.surface,
    border: `1px solid ${t.border}`,
  }

  const titleBarStyle = {
    ...staticStyles.titleBar,
    borderBottom: `1px solid ${t.border}`,
  }

  const titleTextStyle = {
    ...staticStyles.titleText,
    color: t.textSub,
  }

  const statsBarStyle = {
    ...staticStyles.statsBar,
    borderBottom: `1px solid ${t.border}`,
  }

  const smartBtnStyle = {
    ...staticStyles.smartBtn,
    background: t.accentSoft,
    color: t.accentLight,
    border: `1px solid ${t.accentBorder}`,
  }

  const hintTextStyle = {
    ...staticStyles.hintText,
    color: t.textDim,
  }

  const addSegBtnStyle = {
    ...staticStyles.addSegBtn,
    background: t.id === 'dark' ? 'rgba(99,102,241,0.07)' : t.accentSoft,
    border: `1px dashed ${t.accentBorder}`,
    color: t.accent,
  }

  const emptyStyle = { textAlign: 'center', padding: '60px 20px', color: t.textFaint }

  if (!segments || segments.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={titleBarStyle}><span style={titleTextStyle}>📝 转录片段</span></div>
        <div style={emptyStyle}><div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div><div>暂无转录片段</div></div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      {/* 标题行 */}
      <div style={titleBarStyle}>
        <span style={titleTextStyle}>📝 转录片段</span>
        <button style={smartBtnStyle} onClick={onAutoSelect} title="根据 AI 检测结果自动选择">
          ✨ 智能选择
        </button>
      </div>

      {/* 提示文字 */}
      <div style={statsBarStyle}>
        <span style={hintTextStyle}>💡 点击文字卡片可同步音频播放位置</span>
      </div>

      {/* 片段列表 */}
      <div style={staticStyles.list} ref={listRef}>
        {segments.map((seg, idx) => (
          <SegmentCard
            key={seg.id}
            seg={seg}
            isLast={idx === segments.length - 1}
            isActive={seg.id === activeSegId}
            onSeek={onSegmentSeek}
            onToggle={onSegmentToggle}
            onEdit={onSegmentEdit}
            onSplit={onSegmentSplit}
            onMerge={onSegmentMerge}
          />
        ))}
        <button style={addSegBtnStyle} onClick={onSegmentAdd}>＋ 添加片段</button>
      </div>
    </div>
  )
}
