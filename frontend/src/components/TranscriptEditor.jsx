import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { useTheme } from '../ThemeContext.js'
import { SparklesIcon, CutIcon, MergeIcon, PlusIcon, InfoIcon, VideoClipIcon, RepeatIcon, BellIcon, MuteIcon } from './Icons.jsx'

function formatTime(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds)) return '00:00.0'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`
}

// ─── SegmentCard ──────────────────────────────────────────────────────────────

function SegmentCard({ seg, isLast, isActive, onSeek, onToggle, onEdit, onSplit, onMerge }) {
  const t = useTheme()
  const [hovered, setHovered] = useState(false)
  const [editingTime, setEditingTime] = useState(false)
  const [draftStart, setDraftStart] = useState('')
  const [draftEnd, setDraftEnd] = useState('')

  const isSelected = seg.selected

  // Card style
  const cardStyle = useMemo(() => {
    const base = {
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      padding: '10px 12px', borderRadius: '10px',
      cursor: 'pointer', position: 'relative', userSelect: 'none',
      border: '1px solid',
      borderLeft: '3px solid',
      transition: 'background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, transform 0.15s ease',
      transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
    }
    if (isActive) {
      return {
        ...base,
        background: t.id === 'dark' ? 'rgba(10,132,255,0.1)' : 'rgba(0,122,255,0.07)',
        borderColor: t.accentBorder,
        borderLeftColor: t.accent,
        boxShadow: `0 2px 12px ${t.accentSoft}`,
      }
    }
    if (isSelected) {
      return {
        ...base,
        background: t.id === 'dark' ? t.surface : t.surface,
        borderColor: t.border,
        borderLeftColor: t.green,
        boxShadow: hovered ? (t.id === 'dark' ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.08)') : 'none',
      }
    }
    return {
      ...base,
      background: t.id === 'dark' ? 'rgba(255,69,58,0.07)' : 'rgba(255,59,48,0.04)',
      borderColor: t.redBorder,
      borderLeftColor: t.red,
      opacity: 0.75,
    }
  }, [isSelected, isActive, hovered, t])

  const timeStyle = useMemo(() => {
    const base = {
      fontSize: '11px', fontFamily: 'monospace',
      padding: '2px 7px', borderRadius: '5px', flexShrink: 0,
      transition: 'all 0.15s',
    }
    if (isActive) {
      return { ...base, color: t.accent, background: t.accentSoft, border: `1px solid ${t.accentBorder}` }
    }
    if (hovered && !editingTime) {
      return { ...base, color: t.textSub, background: t.surface2, border: `1px dashed ${t.border}`, cursor: 'pointer' }
    }
    return { ...base, color: t.textDim, background: t.id === 'dark' ? 'rgba(44,44,46,0.8)' : t.surface2 }
  }, [isActive, hovered, editingTime, t])

  const timeInputStyle = {
    width: '62px', padding: '2px 5px',
    background: t.surface, color: t.text,
    border: `1px solid ${t.accent}`, borderRadius: '5px',
    fontSize: '11px', fontFamily: 'monospace',
    boxShadow: `0 0 0 2px ${t.accentSoft}`,
  }

  // Toggle button: shows action you CAN take
  const keepBtnStyle = isSelected
    ? {
        padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600',
        cursor: 'pointer', lineHeight: '1', flexShrink: 0,
        background: 'rgba(255,69,58,0.1)', color: t.red,
        border: `1px solid rgba(255,69,58,0.25)`,
        transition: 'all 0.15s',
      }
    : {
        padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600',
        cursor: 'pointer', lineHeight: '1', flexShrink: 0,
        background: 'rgba(48,209,88,0.12)', color: t.green,
        border: `1px solid rgba(48,209,88,0.25)`,
        transition: 'all 0.15s',
      }

  const iconBtnStyle = {
    padding: '4px 7px',
    background: t.id === 'dark' ? 'rgba(58,58,60,0.9)' : t.surface,
    color: t.textSub,
    border: `1px solid ${t.border}`,
    borderRadius: '7px', fontSize: '12px',
    cursor: 'pointer', lineHeight: '1', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
  }

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

  const badgeDuplicate = {
    fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: '600', flexShrink: 0,
    background: t.orangeSoft, color: t.orange, border: `1px solid ${t.orangeBorder}`,
  }
  const badgeKeyword = {
    fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: '600', flexShrink: 0,
    background: t.redSoft, color: t.red, border: `1px solid ${t.redBorder}`,
  }
  const badgeSilence = {
    fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: '600', flexShrink: 0,
    background: t.id === 'dark' ? 'rgba(58,58,60,0.8)' : t.surface2,
    color: t.textDim, border: `1px solid ${t.border}`,
  }

  return (
    <div
      style={cardStyle}
      onClick={handleCardClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="点击跳转到该片段"
      data-seg-id={seg.id}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Time row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px', flexWrap: 'wrap' }}>
          {editingTime ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} data-noclick="1" onClick={e => e.stopPropagation()}>
              <input type="number" step="0.1" min="0" style={timeInputStyle}
                value={draftStart} onChange={e => setDraftStart(e.target.value)}
                onKeyDown={handleTimeKeyDown} onBlur={commitTimeEdit} autoFocus title="开始时间（秒）"/>
              <span style={{ fontSize: '10px', color: t.textFaint, fontFamily: 'monospace' }}>→</span>
              <input type="number" step="0.1" min="0" style={timeInputStyle}
                value={draftEnd} onChange={e => setDraftEnd(e.target.value)}
                onKeyDown={handleTimeKeyDown} onBlur={commitTimeEdit} title="结束时间（秒）"/>
              <span style={{ fontSize: '10px', color: t.textFaint, fontFamily: 'monospace' }}>s</span>
            </div>
          ) : (
            <span style={timeStyle} onClick={startTimeEdit} data-noclick="1" title="点击编辑时间">
              {isActive && <span style={{ marginRight: '3px' }}>▶</span>}
              {formatTime(seg.start)} – {formatTime(seg.end)}
            </span>
          )}
          {seg.is_duplicate && (
            <span style={{ ...badgeDuplicate, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <RepeatIcon size={11} color={t.orange}/>
              重复{seg.duplicate_of != null ? ` →#${seg.duplicate_of}` : ''}
            </span>
          )}
          {seg.is_keyword_marked && (
            <span style={{ ...badgeKeyword, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <BellIcon size={11} color={t.red}/>
              标记
            </span>
          )}
          {seg.is_silence && (
            <span style={{ ...badgeSilence, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <MuteIcon size={11} color={t.textDim}/>
              静音
            </span>
          )}
        </div>

        {/* Text */}
        <div style={{
          fontSize: '13px', lineHeight: '1.55',
          color: isSelected ? t.text : t.textDim,
          wordBreak: 'break-all',
        }}>
          {seg.text || <em style={{ opacity: 0.4, fontSize: '12px' }}>(无文字)</em>}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px', flexShrink: 0 }}>
        <span style={{ fontSize: '12px', fontWeight: '600', color: t.textDim, fontFamily: 'monospace', lineHeight: 1 }}>
          #{seg.id}
        </span>

        <button
          style={keepBtnStyle}
          data-noclick="1"
          onClick={e => { e.stopPropagation(); onToggle(seg.id) }}
          title={isSelected ? '标记为删除' : '标记为保留'}
        >
          {isSelected ? '删除' : '保留'}
        </button>

        {/* Split/merge — smooth expand */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: '3px',
            maxHeight: hovered && !editingTime ? '36px' : '0px',
            overflow: 'hidden',
            opacity: hovered && !editingTime ? 1 : 0,
            pointerEvents: hovered && !editingTime ? 'auto' : 'none',
            transition: 'max-height 0.2s ease, opacity 0.18s ease',
          }}
          data-noclick="1"
          onClick={e => e.stopPropagation()}
        >
          <button style={iconBtnStyle} onClick={e => { e.stopPropagation(); onSplit(seg.id) }} title="从中间拆分">
            <CutIcon size={12} color={t.textSub}/>
          </button>
          {!isLast && (
            <button style={iconBtnStyle} onClick={e => { e.stopPropagation(); onMerge(seg.id) }} title="与下一段合并">
              <MergeIcon size={12} color={t.textSub}/>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── TranscriptEditor ─────────────────────────────────────────────────────────

export default function TranscriptEditor({
  segments, currentTime,
  onSegmentSeek, onSegmentToggle, onAutoSelect,
  onSegmentEdit, onSegmentSplit, onSegmentMerge, onSegmentAdd,
}) {
  const t = useTheme()
  const listRef = useRef(null)

  const activeSegId = useMemo(() => {
    if (!segments || currentTime == null) return null
    const active = segments.find(s => currentTime >= s.start && currentTime < s.end)
    return active ? active.id : null
  }, [segments, currentTime])

  useEffect(() => {
    if (activeSegId == null || !listRef.current) return
    const el = listRef.current.querySelector(`[data-seg-id="${activeSegId}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [activeSegId])

  const containerStyle = {
    display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden',
    borderRadius: '14px',
    background: t.surface,
    border: `1px solid ${t.border}`,
    boxShadow: t.id === 'dark' ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
  }

  if (!segments || segments.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={{
          padding: '12px 16px',
          fontSize: '14px', fontWeight: '700', letterSpacing: '-0.1px', color: t.text,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <VideoClipIcon size={18} color={t.text}/>转录片段
          </span>
        </div>
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '60px 20px', color: t.textFaint,
        }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
          <div style={{ fontSize: '14px' }}>暂无转录片段</div>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      {/* Title bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: '14px', fontWeight: '700', letterSpacing: '-0.1px', color: t.text,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <VideoClipIcon size={18} color={t.text}/>转录片段
          </span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <InfoIcon size={12} color={t.textDim}/>
            <span style={{ fontSize: '11px', color: t.textDim, whiteSpace: 'nowrap' }}>
              点击卡片同步播放位置
            </span>
          </div>
          <button
            onClick={onAutoSelect}
            title="根据 AI 检测结果自动选择"
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 10px', borderRadius: '7px', fontSize: '12px', fontWeight: '500',
              background: t.accentSoft, color: t.accentLight,
              border: `1px solid ${t.accentBorder}`,
              transition: 'all 0.15s',
            }}
          >
            <SparklesIcon size={13} color={t.accentLight}/>
            智能选择
          </button>
        </div>
      </div>

      {/* List */}
      <div
        ref={listRef}
        style={{
          flex: 1, overflowY: 'auto', padding: '10px',
          display: 'flex', flexDirection: 'column', gap: '5px',
        }}
      >
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

      </div>
    </div>
  )
}
