import React, { useState, useEffect, useMemo } from 'react'
import { exportVideo, pollTask } from '../api.js'
import { useTheme } from '../ThemeContext.js'

/**
 * Format seconds to JSX with number + small unit labels
 */
function formatDuration(seconds) {
  const unitStyle = { fontSize: '11px', fontWeight: '500', marginLeft: '1px', opacity: 0.7 }
  if (!seconds || isNaN(seconds)) return <><span>0</span><span style={unitStyle}>秒</span></>
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  if (m === 0) return <><span>{s}</span><span style={unitStyle}>秒</span></>
  return <><span>{m}</span><span style={unitStyle}>分</span><span style={{ marginLeft: '3px' }}>{s}</span><span style={unitStyle}>秒</span></>
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

// Static (non-color) styles
const staticStyles = {
  container: {
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  title: {
    fontSize: '13px',
    fontWeight: '600',
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
    borderRadius: '8px',
    padding: '12px',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '22px',
    fontWeight: '700',
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '12px',
  },
  divider: {
    height: '1px',
  },
  outputLabel: {
    fontSize: '13px',
    marginBottom: '8px',
    display: 'block',
    fontWeight: '500',
  },
  outputInput: {
    width: '100%',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'monospace',
  },
  exportBtn: {
    width: '100%',
    padding: '14px',
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
  },
  progressPct: {
    fontSize: '13px',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  progressBar: {
    height: '6px',
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
    borderRadius: '8px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  successTitle: {
    fontSize: '15px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  successPath: {
    fontSize: '12px',
    fontFamily: 'monospace',
    wordBreak: 'break-all',
  },
  errorBox: {
    borderRadius: '8px',
    padding: '14px',
    fontSize: '13px',
  },
  reExportBtn: {
    padding: '8px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    marginTop: '8px',
  },
}

export default function ExportPanel({ filePath, segments, onExportDone }) {
  const t = useTheme()
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

  // Theme-derived styles
  const containerStyle = {
    ...staticStyles.container,
    background: t.surface,
    border: `1px solid ${t.border}`,
  }

  const titleStyle = {
    ...staticStyles.title,
    color: t.textSub,
  }

  const statCardStyle = {
    ...staticStyles.statCard,
    background: t.surface2,
    border: `1px solid ${t.border}`,
  }

  const statLabelStyle = {
    ...staticStyles.statLabel,
    color: t.textSub,
  }

  const dividerStyle = {
    ...staticStyles.divider,
    background: t.border,
  }

  const outputLabelStyle = {
    ...staticStyles.outputLabel,
    color: t.textSub,
  }

  const outputInputStyle = {
    ...staticStyles.outputInput,
    background: t.surface2,
    border: `1px solid ${exporting ? t.border : (t.id === 'dark' ? '#374151' : t.border2)}`,
    color: t.text,
  }

  const exportBtnStyle = canExport
    ? { ...staticStyles.exportBtn, background: t.accent }
    : { ...staticStyles.exportBtn, background: t.id === 'dark' ? '#374151' : t.border2, cursor: 'not-allowed', color: t.textDim }

  const progressStepStyle = {
    ...staticStyles.progressStep,
    color: t.textSub,
  }

  const progressPctStyle = {
    ...staticStyles.progressPct,
    color: t.accentLight,
  }

  const progressBarStyle = {
    ...staticStyles.progressBar,
    background: t.border,
  }

  const successBoxStyle = {
    ...staticStyles.successBox,
    background: t.greenSoft,
    border: `1px solid ${t.greenBorder}`,
  }

  const successTitleStyle = {
    ...staticStyles.successTitle,
    color: t.id === 'dark' ? '#4ade80' : t.green,
  }

  const successPathStyle = {
    ...staticStyles.successPath,
    color: t.textDim,
  }

  const errorBoxStyle = {
    ...staticStyles.errorBox,
    background: t.redSoft,
    border: `1px solid ${t.redBorder}`,
    color: t.id === 'dark' ? '#f87171' : t.red,
  }

  const reExportBtnStyle = {
    ...staticStyles.reExportBtn,
    background: t.border,
    color: t.text,
    border: `1px solid ${t.id === 'dark' ? '#374151' : t.border2}`,
  }

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>📤 导出粗剪</div>

      {/* Stats */}
      <div style={staticStyles.statsGrid}>
        <div style={statCardStyle}>
          <div style={{ ...staticStyles.statValue, color: t.id === 'dark' ? '#4ade80' : t.green }}>{stats.kept}</div>
          <div style={statLabelStyle}>保留片段</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ ...staticStyles.statValue, color: t.id === 'dark' ? '#f87171' : t.red }}>{stats.deleted}</div>
          <div style={statLabelStyle}>删除片段</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ ...staticStyles.statValue, color: t.accentLight }}>
            {formatDuration(stats.keptDuration)}
          </div>
          <div style={statLabelStyle}>预计时长</div>
        </div>
      </div>

      <div style={dividerStyle} />

      {/* Output path */}
      <div>
        <label style={outputLabelStyle} htmlFor="output-path">
          输出文件路径
        </label>
        <input
          id="output-path"
          type="text"
          style={outputInputStyle}
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
          style={exportBtnStyle}
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
        <div style={staticStyles.progressWrapper}>
          <div style={staticStyles.progressHeader}>
            <span style={progressStepStyle}>{step}</span>
            <span style={progressPctStyle}>{Math.round(progress)}%</span>
          </div>
          <div style={progressBarStyle}>
            <div
              style={{
                ...staticStyles.progressFill,
                width: `${progress}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Success */}
      {exportStatus === 'done' && (
        <div style={successBoxStyle}>
          <div style={successTitleStyle}>
            <span>✅</span>
            <span>导出成功！</span>
          </div>
          <div style={successPathStyle}>{finalOutputPath}</div>
          <button style={reExportBtnStyle} onClick={handleReset}>
            重新导出
          </button>
        </div>
      )}

      {/* Error */}
      {exportStatus === 'error' && (
        <div style={errorBoxStyle}>
          <div style={{ fontWeight: '600', marginBottom: '6px' }}>❌ 导出失败</div>
          <div>{exportError}</div>
          <button style={reExportBtnStyle} onClick={handleReset}>
            重试
          </button>
        </div>
      )}
    </div>
  )
}
