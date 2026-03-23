import React, { useState, useEffect, useMemo } from 'react'
import { exportVideo, pollTask } from '../api.js'

/**
 * Format seconds to M分S秒 string
 */
function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0秒'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  if (m === 0) return `${s}秒`
  return `${m}分${s}秒`
}

/**
 * Given a video file path, build a default output path by appending _粗剪 before the extension.
 */
function buildDefaultOutputPath(filePath) {
  if (!filePath) return ''
  const dotIdx = filePath.lastIndexOf('.')
  const slashIdx = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
  if (dotIdx > slashIdx) {
    return filePath.slice(0, dotIdx) + '_粗剪' + filePath.slice(dotIdx)
  }
  return filePath + '_粗剪.mp4'
}

const styles = {
  container: {
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  title: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
  },
  statCard: {
    background: '#111',
    borderRadius: '8px',
    padding: '12px',
    textAlign: 'center',
    border: '1px solid #2a2a2a',
  },
  statValue: {
    fontSize: '22px',
    fontWeight: '700',
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#6b7280',
  },
  divider: {
    height: '1px',
    background: '#2a2a2a',
  },
  outputLabel: {
    fontSize: '13px',
    color: '#9ca3af',
    marginBottom: '8px',
    display: 'block',
    fontWeight: '500',
  },
  outputInput: {
    width: '100%',
    background: '#111',
    border: '1px solid #374151',
    borderRadius: '8px',
    padding: '10px 12px',
    color: '#e5e7eb',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'monospace',
  },
  exportBtn: {
    width: '100%',
    padding: '14px',
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'background 0.15s',
  },
  exportBtnDisabled: {
    background: '#374151',
    cursor: 'not-allowed',
    color: '#6b7280',
  },
  progressWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressStep: {
    fontSize: '13px',
    color: '#9ca3af',
  },
  progressPct: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#818cf8',
    fontFamily: 'monospace',
  },
  progressBar: {
    height: '6px',
    background: '#2a2a2a',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
    background: 'linear-gradient(90deg, #6366f1, #818cf8)',
    transition: 'width 0.3s ease',
  },
  successBox: {
    background: 'rgba(34, 197, 94, 0.08)',
    border: '1px solid rgba(34, 197, 94, 0.25)',
    borderRadius: '8px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  successTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#4ade80',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  successPath: {
    fontSize: '12px',
    color: '#6b7280',
    fontFamily: 'monospace',
    wordBreak: 'break-all',
  },
  errorBox: {
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: '8px',
    padding: '14px',
    color: '#f87171',
    fontSize: '13px',
  },
  reExportBtn: {
    padding: '8px 14px',
    background: '#2a2a2a',
    color: '#d1d5db',
    border: '1px solid #374151',
    borderRadius: '6px',
    fontSize: '13px',
    marginTop: '8px',
  },
}

export default function ExportPanel({ filePath, segments, onExportDone }) {
  const [outputPath, setOutputPath] = useState('')
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState('')
  const [exportTaskId, setExportTaskId] = useState(null)
  const [exportStatus, setExportStatus] = useState('idle') // idle | exporting | done | error
  const [exportError, setExportError] = useState('')
  const [finalOutputPath, setFinalOutputPath] = useState('')
  const cancelPollRef = React.useRef(null)

  // Set default output path when filePath changes
  useEffect(() => {
    setOutputPath(buildDefaultOutputPath(filePath))
    setExportStatus('idle')
    setExportError('')
  }, [filePath])

  // Stats
  const stats = useMemo(() => {
    if (!segments) return { kept: 0, deleted: 0, keptDuration: 0, totalDuration: 0 }
    const kept = segments.filter((s) => s.selected)
    const deleted = segments.filter((s) => !s.selected)
    const keptDuration = kept.reduce((sum, s) => sum + (s.end - s.start), 0)
    const totalDuration = segments.reduce((sum, s) => sum + (s.end - s.start), 0)
    return {
      kept: kept.length,
      deleted: deleted.length,
      keptDuration,
      totalDuration,
    }
  }, [segments])

  const canExport = stats.kept > 0 && !exporting && outputPath.trim()

  const handleExport = async () => {
    if (!canExport) return
    setExporting(true)
    setExportStatus('exporting')
    setProgress(0)
    setStep('准备导出...')
    setExportError('')

    try {
      const { task_id } = await exportVideo(filePath, segments, outputPath.trim())
      setExportTaskId(task_id)

      cancelPollRef.current = pollTask(
        task_id,
        (pct, stepName) => {
          setProgress(pct)
          setStep(stepName)
        },
        (data) => {
          setExporting(false)
          setExportStatus('done')
          setFinalOutputPath(data.output_path || outputPath.trim())
          setProgress(100)
          setStep('导出完成！')
          if (onExportDone) onExportDone(data.output_path || outputPath.trim())
        },
        (errMsg) => {
          setExporting(false)
          setExportStatus('error')
          setExportError(errMsg)
        }
      )
    } catch (err) {
      setExporting(false)
      setExportStatus('error')
      setExportError(err?.response?.data?.detail || err.message || '导出请求失败')
    }
  }

  const handleReset = () => {
    if (cancelPollRef.current) {
      cancelPollRef.current()
      cancelPollRef.current = null
    }
    setExporting(false)
    setExportStatus('idle')
    setExportError('')
    setProgress(0)
    setStep('')
    setOutputPath(buildDefaultOutputPath(filePath))
  }

  return (
    <div style={styles.container}>
      <div style={styles.title}>📤 导出粗剪</div>

      {/* Stats */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: '#4ade80' }}>{stats.kept}</div>
          <div style={styles.statLabel}>保留片段</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: '#f87171' }}>{stats.deleted}</div>
          <div style={styles.statLabel}>删除片段</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, color: '#818cf8' }}>
            {formatDuration(stats.keptDuration)}
          </div>
          <div style={styles.statLabel}>预计时长</div>
        </div>
      </div>

      <div style={styles.divider} />

      {/* Output path */}
      <div>
        <label style={styles.outputLabel} htmlFor="output-path">
          输出文件路径
        </label>
        <input
          id="output-path"
          type="text"
          style={{
            ...styles.outputInput,
            borderColor: exporting ? '#374151' : undefined,
          }}
          value={outputPath}
          onChange={(e) => setOutputPath(e.target.value)}
          disabled={exporting}
          placeholder="/Users/username/Videos/output_粗剪.mp4"
          spellCheck={false}
        />
      </div>

      {/* Export button */}
      {exportStatus !== 'done' && (
        <button
          style={{
            ...styles.exportBtn,
            ...(canExport ? {} : styles.exportBtnDisabled),
          }}
          onClick={handleExport}
          disabled={!canExport}
        >
          {exporting ? (
            <>
              <span>⏳</span>
              <span>导出中...</span>
            </>
          ) : (
            <>
              <span>🎬</span>
              <span>导出粗剪</span>
            </>
          )}
        </button>
      )}

      {/* Progress */}
      {exporting && (
        <div style={styles.progressWrapper}>
          <div style={styles.progressHeader}>
            <span style={styles.progressStep}>{step}</span>
            <span style={styles.progressPct}>{Math.round(progress)}%</span>
          </div>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${progress}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Success */}
      {exportStatus === 'done' && (
        <div style={styles.successBox}>
          <div style={styles.successTitle}>
            <span>✅</span>
            <span>导出成功！</span>
          </div>
          <div style={styles.successPath}>{finalOutputPath}</div>
          <button style={styles.reExportBtn} onClick={handleReset}>
            重新导出
          </button>
        </div>
      )}

      {/* Error */}
      {exportStatus === 'error' && (
        <div style={styles.errorBox}>
          <div style={{ fontWeight: '600', marginBottom: '6px' }}>❌ 导出失败</div>
          <div>{exportError}</div>
          <button style={styles.reExportBtn} onClick={handleReset}>
            重试
          </button>
        </div>
      )}
    </div>
  )
}
