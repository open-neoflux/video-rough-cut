import React, { useState, useEffect, useMemo } from 'react'
import { exportVideo, pollTask } from '../api.js'
import { useTheme } from '../ThemeContext.js'
import { ShareIcon, CheckCircleIcon, XCircleIcon } from './Icons.jsx'

function formatDuration(seconds) {
  const unitStyle = { fontSize: '11px', fontWeight: '500', marginLeft: '1px', opacity: 0.65 }
  if (!seconds || isNaN(seconds)) return <><span>0</span><span style={unitStyle}>秒</span></>
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  if (m === 0) return <><span>{s}</span><span style={unitStyle}>秒</span></>
  return <>
    <span>{m}</span><span style={unitStyle}>分</span>
    <span style={{ marginLeft: '3px' }}>{s}</span><span style={unitStyle}>秒</span>
  </>
}

function buildDefaultOutputPath(filePath) {
  if (!filePath) return ''
  const dotIdx = filePath.lastIndexOf('.')
  const slashIdx = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
  if (dotIdx > slashIdx) return filePath.slice(0, dotIdx) + '_粗剪' + filePath.slice(dotIdx)
  return filePath + '_粗剪.mp4'
}

export default function ExportPanel({ filePath, segments, onExportDone }) {
  const t = useTheme()
  const [outputPath, setOutputPath] = useState('')
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState('')
  const [exportStatus, setExportStatus] = useState('idle')
  const [exportError, setExportError] = useState('')
  const [finalOutputPath, setFinalOutputPath] = useState('')
  const cancelPollRef = React.useRef(null)

  useEffect(() => {
    setOutputPath(buildDefaultOutputPath(filePath))
    setExportStatus('idle')
    setExportError('')
  }, [filePath])

  const stats = useMemo(() => {
    if (!segments) return { kept: 0, deleted: 0, keptDuration: 0 }
    const kept = segments.filter(s => s.selected)
    const deleted = segments.filter(s => !s.selected)
    const keptDuration = kept.reduce((sum, s) => sum + (s.end - s.start), 0)
    return { kept: kept.length, deleted: deleted.length, keptDuration }
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
      cancelPollRef.current = pollTask(
        task_id,
        (pct, stepName) => { setProgress(pct); setStep(stepName) },
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
    if (cancelPollRef.current) { cancelPollRef.current(); cancelPollRef.current = null }
    setExporting(false)
    setExportStatus('idle')
    setExportError('')
    setProgress(0)
    setStep('')
    setOutputPath(buildDefaultOutputPath(filePath))
  }

  const statItems = [
    { value: stats.kept, label: '保留片段', color: t.green },
    { value: stats.deleted, label: '删除片段', color: t.red },
    { value: formatDuration(stats.keptDuration), label: '预计时长', color: t.accent },
  ]

  return (
    <div style={{
      borderRadius: '14px', background: t.surface,
      border: `1px solid ${t.border}`,
      boxShadow: t.id === 'dark' ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
      overflow: 'hidden',
    }}>
      {/* Title */}
      <div style={{
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: '7px',
      }}>
        <ShareIcon size={15} color={t.text}/>
        <span style={{
          fontSize: '14px', fontWeight: '700', letterSpacing: '-0.1px', color: t.text,
        }}>
          导出粗剪
        </span>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
          {statItems.map(({ value, label, color }) => (
            <div key={label} style={{
              borderRadius: '10px', padding: '12px 8px', textAlign: 'center',
              background: t.id === 'dark' ? t.surface2 : t.surface2,
              border: `1px solid ${t.border2}`,
            }}>
              <div style={{ fontSize: '22px', fontWeight: '700', color, marginBottom: '4px', lineHeight: 1.1 }}>
                {value}
              </div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: t.textSub, letterSpacing: '0.1px' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: t.border2 }}/>

        {/* Output path */}
        <div>
          <label style={{
            display: 'block', fontSize: '12px', fontWeight: '500',
            color: t.textSub, marginBottom: '7px',
          }}>
            输出文件路径
          </label>
          <input
            type="text"
            value={outputPath}
            onChange={e => setOutputPath(e.target.value)}
            disabled={exporting}
            placeholder="例如：/Users/username/Videos/output_粗剪.mp4"
            spellCheck={false}
            style={{
              width: '100%', padding: '10px 12px',
              background: t.id === 'dark' ? t.surface2 : t.surface2,
              border: `1px solid ${t.border}`,
              borderRadius: '8px', fontSize: '12px',
              color: t.text, fontFamily: 'monospace',
              opacity: exporting ? 0.5 : 1,
              transition: 'border-color 0.2s',
            }}
          />
        </div>

        {/* Export button */}
        {exportStatus !== 'done' && (
          <button
            onClick={handleExport}
            disabled={!canExport}
            style={{
              width: '100%', padding: '13px',
              background: canExport ? t.accent : t.surface2,
              color: canExport ? '#fff' : t.textDim,
              border: 'none', borderRadius: '10px',
              fontSize: '15px', fontWeight: '600',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.2s',
              cursor: canExport ? 'pointer' : 'not-allowed',
              boxShadow: canExport ? `0 4px 14px ${t.accentSoft}` : 'none',
            }}
          >
            {exporting ? (
              <>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
                导出中...
              </>
            ) : (
              <>
                <ShareIcon size={16} color={canExport ? '#fff' : t.textDim}/>
                导出粗剪
              </>
            )}
          </button>
        )}

        {/* Progress */}
        {exporting && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: t.textSub }}>{step}</span>
              <span style={{
                fontSize: '12px', fontWeight: '600', fontFamily: 'monospace', color: t.accent,
              }}>{Math.round(progress)}%</span>
            </div>
            <div style={{
              height: '4px', borderRadius: '2px',
              background: t.border, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: '2px',
                background: `linear-gradient(90deg, ${t.accent}, ${t.accentLight})`,
                width: `${progress}%`, transition: 'width 0.3s ease',
              }}/>
            </div>
          </div>
        )}

        {/* Success */}
        {exportStatus === 'done' && (
          <div style={{
            borderRadius: '10px', padding: '14px',
            background: t.greenSoft, border: `1px solid ${t.greenBorder}`,
            display: 'flex', flexDirection: 'column', gap: '8px',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              fontSize: '14px', fontWeight: '600', color: t.green,
            }}>
              <CheckCircleIcon size={16} color={t.green}/>
              导出成功
            </div>
            <div style={{
              fontSize: '11px', fontFamily: 'monospace',
              color: t.textSub, wordBreak: 'break-all',
            }}>
              {finalOutputPath}
            </div>
            <button
              onClick={handleReset}
              style={{
                padding: '7px 12px', borderRadius: '7px', fontSize: '12px',
                fontWeight: '500', background: t.surface,
                border: `1px solid ${t.border}`, color: t.textSub,
                alignSelf: 'flex-start', marginTop: '2px',
              }}
            >
              重新导出
            </button>
          </div>
        )}

        {/* Error */}
        {exportStatus === 'error' && (
          <div style={{
            borderRadius: '10px', padding: '14px',
            background: t.redSoft, border: `1px solid ${t.redBorder}`,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              fontSize: '14px', fontWeight: '600', color: t.red, marginBottom: '6px',
            }}>
              <XCircleIcon size={16} color={t.red}/>
              导出失败
            </div>
            <div style={{ fontSize: '12px', color: t.textSub, marginBottom: '10px' }}>
              {exportError}
            </div>
            <button
              onClick={handleReset}
              style={{
                padding: '7px 12px', borderRadius: '7px', fontSize: '12px',
                fontWeight: '500', background: t.surface,
                border: `1px solid ${t.border}`, color: t.textSub,
              }}
            >
              重试
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
