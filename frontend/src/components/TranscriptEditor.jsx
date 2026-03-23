import React, { useMemo, useState, useCallback } from 'react'

/**
 * Format seconds to MM:SS.d string
 */
function formatTime(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds)) return '00:00.0'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    background: '#1a1a1a',
    borderBottom: '1px solid #2a2a2a',
    flexShrink: 0,
    flexWrap: 'wrap',
  },
  toolbarBtn: {
    padding: '6px 12px',
    background: '#2a2a2a',
    color: '#d1d5db',
    border: '1px solid #374151',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'background 0.15s, color 0.15s',
    whiteSpace: 'nowrap',
  },
  toolbarBtnAccent: {
    background: 'rgba(99, 102, 241, 0.15)',
    color: '#818cf8',
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  stats: {
    marginLeft: 'auto',
    fontSize: '13px',
    color: '#9ca3af',
    whiteSpace: 'nowrap',
    padding: '6px 0',
  },
  statsAccent: {
    color: '#6366f1',
    fontWeight: '600',
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
    border: '1px solid #2a2a2a',
    cursor: 'pointer',
    transition: 'background 0.15s, border-color 0.15s, opacity 0.15s',
    borderLeft: '3px solid transparent',
    position: 'relative',
    userSelect: 'none',
  },
  cardSelected: {
    background: '#1e1e1e',
    borderColor: '#2a2a2a',
    borderLeftColor: '#22c55e',
  },
  cardDeselected: {
    background: 'rgba(239, 68, 68, 0.06)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderLeftColor: '#ef4444',
    opacity: 0.7,
  },
  checkbox: {
    width: '16px',
    height: '16px',
    flexShrink: 0,
    marginTop: '2px',
    accentColor: '#6366f1',
    cursor: 'pointer',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  timeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
    flexWrap: 'wrap',
  },
  time: {
    fontSize: '11px',
    fontFamily: 'monospace',
    color: '#6b7280',
    background: '#111',
    padding: '2px 6px',
    borderRadius: '4px',
    flexShrink: 0,
    cursor: 'pointer',
  },
  timeClickHint: {
    fontSize: '11px',
    fontFamily: 'monospace',
    color: '#4b5563',
    background: '#111',
    padding: '2px 6px',
    borderRadius: '4px',
    flexShrink: 0,
    cursor: 'pointer',
    border: '1px dashed #374151',
  },
  badge: {
    fontSize: '11px',
    padding: '2px 7px',
    borderRadius: '4px',
    fontWeight: '600',
    flexShrink: 0,
  },
  badgeDuplicate: {
    background: 'rgba(249, 115, 22, 0.15)',
    color: '#fb923c',
    border: '1px solid rgba(249, 115, 22, 0.3)',
  },
  badgeKeyword: {
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#f87171',
    border: '1px solid rgba(239, 68, 68, 0.3)',
  },
  text: {
    fontSize: '14px',
    color: '#d1d5db',
    lineHeight: '1.5',
    wordBreak: 'break-all',
  },
  textDeselected: {
    color: '#6b7280',
  },
  segId: {
    fontSize: '10px',
    color: '#374151',
    marginLeft: 'auto',
    flexShrink: 0,
    paddingLeft: '8px',
    marginTop: '2px',
    fontFamily: 'monospace',
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#4b5563',
  },
  // Edit controls shown on hover
  editControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexShrink: 0,
    marginTop: '1px',
  },
  iconBtn: {
    padding: '3px 6px',
    background: 'rgba(42, 42, 42, 0.9)',
    color: '#9ca3af',
    border: '1px solid #374151',
    borderRadius: '5px',
    fontSize: '12px',
    cursor: 'pointer',
    lineHeight: '1',
    transition: 'background 0.15s, color 0.15s',
    flexShrink: 0,
  },
  // Time edit inputs
  timeEditRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexWrap: 'nowrap',
  },
  timeInput: {
    width: '64px',
    padding: '2px 5px',
    background: '#1a1a1a',
    color: '#d1d5db',
    border: '1px solid #4f46e5',
    borderRadius: '4px',
    fontSize: '11px',
    fontFamily: 'monospace',
    outline: 'none',
  },
  timeEditLabel: {
    fontSize: '11px',
    color: '#4b5563',
    fontFamily: 'monospace',
  },
  // Add segment button at bottom
  addSegBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '10px',
    background: 'rgba(99, 102, 241, 0.07)',
    border: '1px dashed rgba(99, 102, 241, 0.3)',
    borderRadius: '8px',
    color: '#6366f1',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.15s',
    marginTop: '2px',
  },
}

// ─── SegmentCard ──────────────────────────────────────────────────────────────

function SegmentCard({
  seg,
  isLast,
  onToggle,
  onEdit,
  onSplit,
  onMerge,
}) {
  const [hovered, setHovered] = useState(false)
  const [editingTime, setEditingTime] = useState(false)
  const [draftStart, setDraftStart] = useState('')
  const [draftEnd, setDraftEnd] = useState('')

  const isSelected = seg.selected

  const handleCardClick = useCallback((e) => {
    // Don't toggle when clicking inside controls or time-edit area
    if (e.target.closest('[data-noclick]')) return
    onToggle(seg.id)
  }, [seg.id, onToggle])

  const startTimeEdit = useCallback((e) => {
    e.stopPropagation()
    setDraftStart(String(Number(seg.start.toFixed(2))))
    setDraftEnd(String(Number(seg.end.toFixed(2))))
    setEditingTime(true)
  }, [seg.start, seg.end])

  const commitTimeEdit = useCallback(() => {
    const start = parseFloat(draftStart)
    const end = parseFloat(draftEnd)
    if (!isNaN(start) && !isNaN(end) && end > start) {
      onEdit(seg.id, { start, end })
    }
    setEditingTime(false)
  }, [draftStart, draftEnd, seg.id, onEdit])

  const handleTimeKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitTimeEdit()
    } else if (e.key === 'Escape') {
      setEditingTime(false)
    }
  }, [commitTimeEdit])

  const handleSplit = useCallback((e) => {
    e.stopPropagation()
    onSplit(seg.id)
  }, [seg.id, onSplit])

  const handleMerge = useCallback((e) => {
    e.stopPropagation()
    onMerge(seg.id)
  }, [seg.id, onMerge])

  return (
    <div
      style={{
        ...styles.card,
        ...(isSelected ? styles.cardSelected : styles.cardDeselected),
      }}
      onClick={handleCardClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={isSelected ? '点击取消保留（标记为删除）' : '点击保留（取消删除）'}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        style={styles.checkbox}
        checked={isSelected}
        onChange={() => onToggle(seg.id)}
        onClick={(e) => e.stopPropagation()}
        data-noclick="1"
        title={isSelected ? '已选中（保留）' : '未选中（删除）'}
      />

      {/* Content */}
      <div style={styles.content}>
        <div style={styles.timeRow}>
          {/* Time display / edit */}
          {editingTime ? (
            <div style={styles.timeEditRow} data-noclick="1" onClick={(e) => e.stopPropagation()}>
              <input
                type="number"
                step="0.1"
                min="0"
                style={styles.timeInput}
                value={draftStart}
                onChange={(e) => setDraftStart(e.target.value)}
                onKeyDown={handleTimeKeyDown}
                onBlur={commitTimeEdit}
                autoFocus
                title="开始时间（秒）"
              />
              <span style={styles.timeEditLabel}>→</span>
              <input
                type="number"
                step="0.1"
                min="0"
                style={styles.timeInput}
                value={draftEnd}
                onChange={(e) => setDraftEnd(e.target.value)}
                onKeyDown={handleTimeKeyDown}
                onBlur={commitTimeEdit}
                title="结束时间（秒）"
              />
              <span style={{ ...styles.timeEditLabel, fontSize: '10px' }}>s</span>
            </div>
          ) : (
            <span
              style={hovered ? { ...styles.time, ...styles.timeClickHint } : styles.time}
              onClick={startTimeEdit}
              data-noclick="1"
              title="点击编辑时间"
            >
              [{formatTime(seg.start)} - {formatTime(seg.end)}]
            </span>
          )}

          {seg.is_duplicate && (
            <span style={{ ...styles.badge, ...styles.badgeDuplicate }}>
              🔁 重复
              {seg.duplicate_of != null ? ` →#${seg.duplicate_of}` : ''}
            </span>
          )}

          {seg.is_keyword_marked && (
            <span style={{ ...styles.badge, ...styles.badgeKeyword }}>
              ⚠️ 标记
            </span>
          )}
        </div>

        <div
          style={{
            ...styles.text,
            ...(isSelected ? {} : styles.textDeselected),
          }}
        >
          {seg.text || <em style={{ opacity: 0.5 }}>(无文字)</em>}
        </div>
      </div>

      {/* Right side: seg id + edit controls */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
        <div style={styles.segId}>#{seg.id}</div>

        {/* Edit controls - visible on hover */}
        {hovered && !editingTime && (
          <div style={styles.editControls} data-noclick="1" onClick={(e) => e.stopPropagation()}>
            <button
              style={styles.iconBtn}
              onClick={handleSplit}
              title="从中间拆分片段"
            >
              ✂️
            </button>
            {!isLast && (
              <button
                style={styles.iconBtn}
                onClick={handleMerge}
                title="与下一段合并"
              >
                ⬇️
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── TranscriptEditor ─────────────────────────────────────────────────────────

export default function TranscriptEditor({
  segments,
  onSegmentToggle,
  onSelectAll,
  onSelectNone,
  onAutoSelect,
  onSegmentEdit,
  onSegmentSplit,
  onSegmentMerge,
  onSegmentAdd,
}) {
  const { selectedCount, totalCount } = useMemo(() => {
    const total = segments ? segments.length : 0
    const selected = segments ? segments.filter((s) => s.selected).length : 0
    return { selectedCount: selected, totalCount: total }
  }, [segments])

  if (!segments || segments.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.empty}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
          <div>暂无转录片段</div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        <button
          style={styles.toolbarBtn}
          onClick={onSelectAll}
          title="选中所有片段（保留全部）"
        >
          全选
        </button>
        <button
          style={styles.toolbarBtn}
          onClick={onSelectNone}
          title="取消选中所有片段（全部删除）"
        >
          全不选
        </button>
        <button
          style={{ ...styles.toolbarBtn, ...styles.toolbarBtnAccent }}
          onClick={onAutoSelect}
          title="根据 AI 检测结果自动选择好的片段"
        >
          ✨ 智能选择
        </button>

        <div style={styles.stats}>
          已选{' '}
          <span style={styles.statsAccent}>{selectedCount}</span>
          {' '}段 / 共{' '}
          <span style={{ color: '#9ca3af', fontWeight: '600' }}>{totalCount}</span>
          {' '}段
        </div>
      </div>

      {/* Segment list */}
      <div style={styles.list}>
        {segments.map((seg, idx) => (
          <SegmentCard
            key={seg.id}
            seg={seg}
            isLast={idx === segments.length - 1}
            onToggle={onSegmentToggle}
            onEdit={onSegmentEdit}
            onSplit={onSegmentSplit}
            onMerge={onSegmentMerge}
          />
        ))}

        {/* Add custom segment button */}
        <button
          style={styles.addSegBtn}
          onClick={onSegmentAdd}
          title="在末尾添加自定义片段"
        >
          ＋ 添加片段
        </button>
      </div>
    </div>
  )
}
