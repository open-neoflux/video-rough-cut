import React, { useState, useCallback, useRef, useEffect } from 'react'
import FileSelector from './components/FileSelector.jsx'
import TranscriptEditor from './components/TranscriptEditor.jsx'
import WaveformPlayer from './components/WaveformPlayer.jsx'
import ExportPanel from './components/ExportPanel.jsx'
import { processVideo, pollTask } from './api.js'

// ─── Styles ──────────────────────────────────────────────────────────────────

const S = {
  app: {
    minHeight: '100vh',
    background: '#0f0f0f',
    color: '#e5e7eb',
  },

  // ── Processing / loading overlay ──────────────────────────────────────────
  processingScreen: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '24px',
    gap: '24px',
  },
  processingCard: {
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '16px',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '480px',
    textAlign: 'center',
  },
  processingIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    display: 'block',
    animation: 'spin 1.5s linear infinite',
  },
  processingTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#fff',
    marginBottom: '8px',
  },
  processingStep: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '24px',
    minHeight: '20px',
  },
  progressBar: {
    height: '8px',
    background: '#2a2a2a',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '12px',
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
    background: 'linear-gradient(90deg, #4f46e5, #818cf8)',
    transition: 'width 0.4s ease',
  },
  progressPct: {
    fontSize: '13px',
    fontFamily: 'monospace',
    color: '#818cf8',
  },

  // ── Editing layout ────────────────────────────────────────────────────────
  editingLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr 380px',
    gridTemplateRows: 'auto 1fr',
    height: '100vh',
    overflow: 'hidden',
  },
  // Top bar spanning full width
  topBar: {
    gridColumn: '1 / -1',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 20px',
    background: '#111',
    borderBottom: '1px solid #1f1f1f',
    flexShrink: 0,
  },
  topBarLogo: {
    fontSize: '20px',
    marginRight: '4px',
  },
  topBarTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#fff',
    marginRight: '8px',
  },
  topBarFile: {
    fontSize: '12px',
    color: '#4b5563',
    fontFamily: 'monospace',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '400px',
  },
  topBarSpacer: {
    flex: 1,
  },
  backBtn: {
    padding: '6px 12px',
    background: '#2a2a2a',
    color: '#9ca3af',
    border: '1px solid #374151',
    borderRadius: '6px',
    fontSize: '13px',
  },

  // Left panel: waveform + transcript
  leftPanel: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRight: '1px solid #1f1f1f',
  },
  waveformSection: {
    padding: '16px',
    flexShrink: 0,
    borderBottom: '1px solid #1f1f1f',
  },
  transcriptSection: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '12px 16px 8px',
    flexShrink: 0,
  },

  // Right panel: export
  rightPanel: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: '16px',
    gap: '16px',
  },

  // ── Error screen ─────────────────────────────────────────────────────────
  errorScreen: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '24px',
    gap: '16px',
    textAlign: 'center',
  },
  errorCard: {
    background: '#1a1a1a',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '16px',
    padding: '40px',
    maxWidth: '480px',
    width: '100%',
  },
  errorTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#f87171',
    marginBottom: '12px',
  },
  errorMsg: {
    fontSize: '14px',
    color: '#9ca3af',
    marginBottom: '24px',
    wordBreak: 'break-all',
  },
  retryBtn: {
    padding: '10px 24px',
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
  },
}

// Inject keyframe animation
if (!document.getElementById('app-animations')) {
  const style = document.createElement('style')
  style.id = 'app-animations'
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `
  document.head.appendChild(style)
}

const LS_KEY = 'roughcut_state'

// ─── App Component ────────────────────────────────────────────────────────────

export default function App() {
  const [stage, setStage] = useState('idle') // idle | processing | editing | error
  const [filePath, setFilePath] = useState('')
  const [taskId, setTaskId] = useState(null)
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState('')
  const [transcriptData, setTranscriptData] = useState(null) // { segments, duration, audio_path }
  const [errorMsg, setErrorMsg] = useState('')
  const [waveCurrentTime, setWaveCurrentTime] = useState(0)
  const cancelPollRef = useRef(null)

  // ── Restore state from localStorage on mount ──────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const saved = JSON.parse(raw)
      if (!saved || !saved.stage) return

      if (saved.stage === 'editing' && saved.filePath && saved.transcriptData) {
        setFilePath(saved.filePath)
        setTranscriptData(saved.transcriptData)
        setStage('editing')
      } else if (saved.stage === 'processing' && saved.filePath && saved.taskId) {
        setFilePath(saved.filePath)
        setTaskId(saved.taskId)
        setStage('processing')
        setStep('恢复轮询...')
        setProgress(0)

        cancelPollRef.current = pollTask(
          saved.taskId,
          (pct, stepName) => {
            setProgress(pct)
            setStep(stepName)
          },
          (data) => {
            if (data.result) {
              setTranscriptData(data.result)
              setStage('editing')
            } else {
              setErrorMsg('处理完成但未返回结果')
              setStage('error')
            }
          },
          (errMsg) => {
            setErrorMsg(errMsg)
            setStage('error')
          }
        )
      }
    } catch (_) {
      // ignore malformed localStorage
    }
  }, [])

  // ── Persist state to localStorage whenever relevant state changes ─────────
  useEffect(() => {
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({ stage, filePath, taskId, transcriptData })
      )
    } catch (_) {
      // ignore quota errors
    }
  }, [stage, filePath, taskId, transcriptData])

  // ── Process video ─────────────────────────────────────────────────────────
  const handleProcess = useCallback(async (path) => {
    setFilePath(path)
    setStage('processing')
    setProgress(0)
    setStep('提交任务...')
    setErrorMsg('')
    setTaskId(null)

    try {
      const { task_id } = await processVideo(path)
      setTaskId(task_id)

      cancelPollRef.current = pollTask(
        task_id,
        (pct, stepName) => {
          setProgress(pct)
          setStep(stepName)
        },
        (data) => {
          if (data.result) {
            setTranscriptData(data.result)
            setStage('editing')
          } else {
            setErrorMsg('处理完成但未返回结果')
            setStage('error')
          }
        },
        (errMsg) => {
          setErrorMsg(errMsg)
          setStage('error')
        }
      )
    } catch (err) {
      const msg = err?.response?.data?.detail || err.message || '请求失败'
      setErrorMsg(msg)
      setStage('error')
    }
  }, [])

  // ── Segment operations ────────────────────────────────────────────────────

  const handleSegmentToggle = useCallback((id) => {
    setTranscriptData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        segments: prev.segments.map((s) =>
          s.id === id ? { ...s, selected: !s.selected } : s
        ),
      }
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    setTranscriptData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        segments: prev.segments.map((s) => ({ ...s, selected: true })),
      }
    })
  }, [])

  const handleSelectNone = useCallback(() => {
    setTranscriptData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        segments: prev.segments.map((s) => ({ ...s, selected: false })),
      }
    })
  }, [])

  // Auto select: keep segments that are not duplicate AND not keyword-marked
  const handleAutoSelect = useCallback(() => {
    setTranscriptData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        segments: prev.segments.map((s) => ({
          ...s,
          selected: !s.is_duplicate && !s.is_keyword_marked,
        })),
      }
    })
  }, [])

  // ── Manual cut control handlers ───────────────────────────────────────────

  const handleSegmentEdit = useCallback((id, changes) => {
    setTranscriptData(prev => ({
      ...prev,
      segments: prev.segments.map(s => s.id === id ? { ...s, ...changes } : s)
    }))
  }, [])

  const handleSegmentSplit = useCallback((id) => {
    setTranscriptData(prev => {
      const idx = prev.segments.findIndex(s => s.id === id)
      if (idx === -1) return prev
      const seg = prev.segments[idx]
      const mid = (seg.start + seg.end) / 2
      const maxId = Math.max(...prev.segments.map(s => s.id)) + 1
      const a = { ...seg, end: mid }
      const b = { ...seg, id: maxId, start: mid, text: seg.text + ' (续)' }
      const newSegs = [...prev.segments]
      newSegs.splice(idx, 1, a, b)
      return { ...prev, segments: newSegs }
    })
  }, [])

  const handleSegmentMerge = useCallback((id) => {
    setTranscriptData(prev => {
      const idx = prev.segments.findIndex(s => s.id === id)
      if (idx === -1 || idx >= prev.segments.length - 1) return prev
      const a = prev.segments[idx]
      const b = prev.segments[idx + 1]
      const merged = { ...a, end: b.end, text: a.text + ' ' + b.text }
      const newSegs = [...prev.segments]
      newSegs.splice(idx, 2, merged)
      return { ...prev, segments: newSegs }
    })
  }, [])

  const handleSegmentAdd = useCallback(() => {
    setTranscriptData(prev => {
      const segs = prev.segments
      const last = segs[segs.length - 1]
      const maxId = Math.max(...segs.map(s => s.id)) + 1
      const newSeg = {
        id: maxId,
        start: last ? last.end : 0,
        end: last ? last.end + 5 : 5,
        text: '(自定义片段)',
        is_duplicate: false,
        duplicate_of: null,
        is_keyword_marked: false,
        selected: true,
      }
      return { ...prev, segments: [...segs, newSeg] }
    })
  }, [])

  // ── Go back to file selection ─────────────────────────────────────────────
  const handleBack = useCallback(() => {
    if (cancelPollRef.current) {
      cancelPollRef.current()
      cancelPollRef.current = null
    }
    localStorage.removeItem(LS_KEY)
    setStage('idle')
    setFilePath('')
    setTaskId(null)
    setProgress(0)
    setStep('')
    setTranscriptData(null)
    setErrorMsg('')
  }, [])

  // ── Export done ───────────────────────────────────────────────────────────
  const handleExportDone = useCallback((_outputPath) => {
    // Nothing special needed; ExportPanel handles its own success display
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  // ── IDLE: file selection ──────────────────────────────────────────────────
  if (stage === 'idle') {
    return (
      <div style={S.app}>
        <FileSelector onProcess={handleProcess} />
      </div>
    )
  }

  // ── PROCESSING ────────────────────────────────────────────────────────────
  if (stage === 'processing') {
    return (
      <div style={S.app}>
        <div style={S.processingScreen}>
          <div style={S.processingCard}>
            <span
              style={{
                ...S.processingIcon,
                display: 'inline-block',
                animation: 'spin 1.5s linear infinite',
              }}
            >
              ⚙️
            </span>
            <div style={S.processingTitle}>正在分析视频...</div>
            <div style={S.processingStep}>{step || '初始化...'}</div>
            <div style={S.progressBar}>
              <div
                style={{
                  ...S.progressFill,
                  width: `${Math.max(2, progress)}%`,
                }}
              />
            </div>
            <div style={S.progressPct}>{Math.round(progress)}%</div>
          </div>
          <div
            style={{
              fontSize: '12px',
              color: '#374151',
              maxWidth: '400px',
              textAlign: 'center',
              fontFamily: 'monospace',
            }}
          >
            {filePath}
          </div>
          <button
            style={{
              padding: '8px 16px',
              background: 'transparent',
              color: '#6b7280',
              border: '1px solid #374151',
              borderRadius: '6px',
              fontSize: '13px',
            }}
            onClick={handleBack}
          >
            取消
          </button>
        </div>
      </div>
    )
  }

  // ── ERROR ─────────────────────────────────────────────────────────────────
  if (stage === 'error') {
    return (
      <div style={S.app}>
        <div style={S.errorScreen}>
          <div style={S.errorCard}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>❌</div>
            <div style={S.errorTitle}>处理失败</div>
            <div style={S.errorMsg}>{errorMsg}</div>
            <button style={S.retryBtn} onClick={handleBack}>
              重新选择文件
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── EDITING ───────────────────────────────────────────────────────────────
  if (stage === 'editing' && transcriptData) {
    const { segments, audio_path: audioPath } = transcriptData

    return (
      <div style={{ ...S.app, overflow: 'hidden' }}>
        <div style={S.editingLayout}>
          {/* Top bar */}
          <div style={S.topBar}>
            <span style={S.topBarLogo}>✂️</span>
            <span style={S.topBarTitle}>视频粗剪助手</span>
            <span style={S.topBarFile}>{filePath}</span>
            <div style={S.topBarSpacer} />
            <button style={S.backBtn} onClick={handleBack} title="返回文件选择">
              ← 重新选择
            </button>
          </div>

          {/* Left panel */}
          <div style={S.leftPanel}>
            {/* Waveform player */}
            <div style={S.waveformSection}>
              <WaveformPlayer
                audioPath={audioPath}
                segments={segments}
                onTimeUpdate={setWaveCurrentTime}
              />
            </div>

            {/* Transcript editor */}
            <div style={S.transcriptSection}>
              <div style={S.sectionTitle}>📝 转录片段</div>
              <TranscriptEditor
                segments={segments}
                onSegmentToggle={handleSegmentToggle}
                onSelectAll={handleSelectAll}
                onSelectNone={handleSelectNone}
                onAutoSelect={handleAutoSelect}
                onSegmentEdit={handleSegmentEdit}
                onSegmentSplit={handleSegmentSplit}
                onSegmentMerge={handleSegmentMerge}
                onSegmentAdd={handleSegmentAdd}
              />
            </div>
          </div>

          {/* Right panel */}
          <div style={S.rightPanel}>
            <ExportPanel
              filePath={filePath}
              segments={segments}
              onExportDone={handleExportDone}
            />

            {/* Quick help */}
            <div
              style={{
                background: '#111',
                border: '1px solid #1f1f1f',
                borderRadius: '10px',
                padding: '14px',
                fontSize: '12px',
                color: '#4b5563',
                lineHeight: '1.8',
              }}
            >
              <div
                style={{
                  fontWeight: '600',
                  color: '#6b7280',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontSize: '11px',
                }}
              >
                操作说明
              </div>
              <div>✅ 绿色边框 = 保留</div>
              <div>❌ 红色边框 = 删除</div>
              <div>🔁 重复 = 相似内容</div>
              <div>⚠️ 标记 = 含 NG 关键词</div>
              <div style={{ marginTop: '6px' }}>点击片段卡片切换保留/删除</div>
              <div>或使用顶部按钮批量操作</div>
              <div style={{ marginTop: '6px', borderTop: '1px solid #1f1f1f', paddingTop: '6px' }}>
                ✂️ 拆分 / 合并下一段 / 编辑时间
              </div>
              <div>悬停片段卡片显示编辑控件</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Fallback
  return (
    <div style={S.app}>
      <FileSelector onProcess={handleProcess} />
    </div>
  )
}
