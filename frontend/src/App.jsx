import React, { useState, useCallback, useRef, useEffect } from 'react'
import FileSelector from './components/FileSelector.jsx'
import TranscriptEditor from './components/TranscriptEditor.jsx'
import WaveformPlayer from './components/WaveformPlayer.jsx'
import ExportPanel from './components/ExportPanel.jsx'
import { processVideo, pollTask } from './api.js'
import { ThemeContext } from './ThemeContext.js'
import { darkTheme, lightTheme } from './theme.js'

// ─── Static (non-color) Styles ────────────────────────────────────────────────

const S_static = {
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
    marginBottom: '8px',
  },
  processingStep: {
    fontSize: '14px',
    marginBottom: '24px',
    minHeight: '20px',
  },
  progressBar: {
    height: '8px',
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
  },
  editingLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr 380px',
    gridTemplateRows: 'auto 1fr',
    height: '100vh',
    overflow: 'hidden',
  },
  topBar: {
    gridColumn: '1 / -1',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 20px',
    flexShrink: 0,
  },
  topBarLogo: {
    fontSize: '20px',
    marginRight: '4px',
  },
  topBarTitle: {
    fontSize: '16px',
    fontWeight: '700',
    marginRight: '8px',
  },
  topBarFile: {
    fontSize: '12px',
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
    borderRadius: '6px',
    fontSize: '13px',
  },
  leftPanel: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  waveformSection: {
    padding: '16px',
    flexShrink: 0,
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
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '12px 16px 8px',
    flexShrink: 0,
  },
  rightPanel: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: '16px',
    gap: '16px',
  },
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
    borderRadius: '16px',
    padding: '40px',
    maxWidth: '480px',
    width: '100%',
  },
  errorTitle: {
    fontSize: '18px',
    fontWeight: '700',
    marginBottom: '12px',
  },
  errorMsg: {
    fontSize: '14px',
    marginBottom: '24px',
    wordBreak: 'break-all',
  },
  retryBtn: {
    padding: '10px 24px',
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
  const [seekTime, setSeekTime] = useState(null)
  const [isDark, setIsDark] = useState(true)
  const cancelPollRef = useRef(null)

  const theme = isDark ? darkTheme : lightTheme

  // Update body background + scrollbar when theme changes
  useEffect(() => {
    document.body.style.background = theme.bg
    document.body.style.color = theme.text
    let el = document.getElementById('scrollbar-styles')
    if (!el) {
      el = document.createElement('style')
      el.id = 'scrollbar-styles'
      document.head.appendChild(el)
    }
    if (isDark) {
      el.textContent = `::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#374151;border-radius:3px}::-webkit-scrollbar-thumb:hover{background:#4b5563}`
    } else {
      el.textContent = `::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:3px}::-webkit-scrollbar-thumb:hover{background:#9ca3af}`
    }
  }, [theme, isDark])

  const handleSegmentSeek = useCallback((start) => {
    setSeekTime(start)
  }, [])

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

  // Auto select: keep segments that are not duplicate, not keyword-marked, and not silence
  const handleAutoSelect = useCallback(() => {
    setTranscriptData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        segments: prev.segments.map((s) => ({
          ...s,
          selected: !s.is_duplicate && !s.is_keyword_marked && !s.is_silence,
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
        is_silence: false,
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
  // Theme-dependent styles (computed from current theme)
  // ─────────────────────────────────────────────────────────────────────────

  const S = {
    app: {
      minHeight: '100vh',
      background: theme.bg,
      color: theme.text,
    },
    processingCard: {
      ...S_static.processingCard,
      background: theme.surface,
      border: `1px solid ${theme.border}`,
    },
    processingTitle: {
      ...S_static.processingTitle,
      color: theme.id === 'dark' ? '#fff' : theme.text,
    },
    processingStep: {
      ...S_static.processingStep,
      color: theme.textDim,
    },
    progressBar: {
      ...S_static.progressBar,
      background: theme.border,
    },
    progressPct: {
      ...S_static.progressPct,
      color: theme.accentLight,
    },
    topBar: {
      ...S_static.topBar,
      background: theme.surface2,
      borderBottom: `1px solid ${theme.border2}`,
    },
    topBarTitle: {
      ...S_static.topBarTitle,
      color: theme.id === 'dark' ? '#fff' : theme.text,
    },
    topBarFile: {
      ...S_static.topBarFile,
      color: theme.textFaint,
    },
    backBtn: {
      ...S_static.backBtn,
      background: theme.border,
      color: theme.textSub,
      border: `1px solid ${theme.id === 'dark' ? '#374151' : theme.border2}`,
    },
    leftPanel: {
      ...S_static.leftPanel,
      borderRight: `1px solid ${theme.border2}`,
    },
    waveformSection: {
      ...S_static.waveformSection,
      borderBottom: `1px solid ${theme.border2}`,
    },
    sectionTitle: {
      ...S_static.sectionTitle,
      color: theme.textDim,
    },
    errorCard: {
      ...S_static.errorCard,
      background: theme.surface,
      border: `1px solid ${theme.redBorder}`,
    },
    errorTitle: {
      ...S_static.errorTitle,
      color: theme.id === 'dark' ? '#f87171' : theme.red,
    },
    errorMsg: {
      ...S_static.errorMsg,
      color: theme.textSub,
    },
    retryBtn: {
      ...S_static.retryBtn,
      background: theme.accent,
    },
    quickHelp: {
      background: theme.surface2,
      border: `1px solid ${theme.border2}`,
      borderRadius: '10px',
      padding: '14px',
      fontSize: '12px',
      color: theme.textFaint,
      lineHeight: '1.8',
    },
    quickHelpTitle: {
      fontWeight: '600',
      color: theme.textDim,
      marginBottom: '8px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      fontSize: '11px',
    },
    quickHelpDivider: {
      marginTop: '6px',
      borderTop: `1px solid ${theme.border2}`,
      paddingTop: '6px',
    },
    themeToggleBtn: {
      padding: '6px 10px',
      background: theme.surface,
      border: `1px solid ${theme.border}`,
      borderRadius: '6px',
      color: theme.textSub,
      fontSize: '14px',
    },
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  // ── IDLE: file selection ──────────────────────────────────────────────────
  if (stage === 'idle') {
    return (
      <ThemeContext.Provider value={theme}>
        <div style={S.app}>
          <FileSelector onProcess={handleProcess} />
        </div>
      </ThemeContext.Provider>
    )
  }

  // ── PROCESSING ────────────────────────────────────────────────────────────
  if (stage === 'processing') {
    return (
      <ThemeContext.Provider value={theme}>
        <div style={S.app}>
          <div style={S_static.processingScreen}>
            <div style={S.processingCard}>
              <span
                style={{
                  ...S_static.processingIcon,
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
                    ...S_static.progressFill,
                    width: `${Math.max(2, progress)}%`,
                  }}
                />
              </div>
              <div style={S.progressPct}>{Math.round(progress)}%</div>
            </div>
            <div
              style={{
                fontSize: '12px',
                color: theme.id === 'dark' ? '#374151' : theme.textDim,
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
                color: theme.textDim,
                border: `1px solid ${theme.id === 'dark' ? '#374151' : theme.border2}`,
                borderRadius: '6px',
                fontSize: '13px',
              }}
              onClick={handleBack}
            >
              取消
            </button>
          </div>
        </div>
      </ThemeContext.Provider>
    )
  }

  // ── ERROR ─────────────────────────────────────────────────────────────────
  if (stage === 'error') {
    return (
      <ThemeContext.Provider value={theme}>
        <div style={S.app}>
          <div style={S_static.errorScreen}>
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
      </ThemeContext.Provider>
    )
  }

  // ── EDITING ───────────────────────────────────────────────────────────────
  if (stage === 'editing' && transcriptData) {
    const { segments, audio_path: audioPath } = transcriptData

    return (
      <ThemeContext.Provider value={theme}>
        <div style={{ ...S.app, overflow: 'hidden' }}>
          <div style={S_static.editingLayout}>
            {/* Top bar */}
            <div style={S.topBar}>
              <span style={S_static.topBarLogo}>✂️</span>
              <span style={S.topBarTitle}>视频粗剪助手</span>
              <span style={S.topBarFile}>{filePath}</span>
              <div style={S_static.topBarSpacer} />
              <button style={S.backBtn} onClick={handleBack} title="返回文件选择">
                ← 重新选择
              </button>
              <button
                onClick={() => setIsDark(d => !d)}
                style={S.themeToggleBtn}
                title={isDark ? '切换到浅色模式' : '切换到深色模式'}
              >
                {isDark ? '☀️' : '🌙'}
              </button>
            </div>

            {/* Left panel */}
            <div style={S.leftPanel}>
              {/* Waveform player */}
              <div style={S.waveformSection}>
                <WaveformPlayer
                  audioPath={audioPath}
                  segments={segments}
                  seekTime={seekTime}
                  onTimeUpdate={setWaveCurrentTime}
                />
              </div>

              {/* Transcript editor */}
              <div style={{ ...S_static.transcriptSection, padding: '0 16px 16px' }}>
                <TranscriptEditor
                  segments={segments}
                  currentTime={waveCurrentTime}
                  onSegmentSeek={handleSegmentSeek}
                  onSegmentToggle={handleSegmentToggle}
                  onAutoSelect={handleAutoSelect}
                  onSegmentEdit={handleSegmentEdit}
                  onSegmentSplit={handleSegmentSplit}
                  onSegmentMerge={handleSegmentMerge}
                  onSegmentAdd={handleSegmentAdd}
                />
              </div>
            </div>

            {/* Right panel */}
            <div style={S_static.rightPanel}>
              <ExportPanel
                filePath={filePath}
                segments={segments}
                onExportDone={handleExportDone}
              />

              {/* Quick help */}
              <div style={S.quickHelp}>
                <div style={S.quickHelpTitle}>
                  操作说明
                </div>
                <div>✅ 绿色边框 = 保留</div>
                <div>❌ 红色边框 = 删除</div>
                <div>🔁 重复 = 相似内容</div>
                <div>⚠️ 标记 = 含 NG 关键词</div>
                <div style={{ marginTop: '6px' }}>点击片段卡片切换保留/删除</div>
                <div>或使用顶部按钮批量操作</div>
                <div style={S.quickHelpDivider}>
                  ✂️ 拆分 / 合并下一段 / 编辑时间
                </div>
                <div>悬停片段卡片显示编辑控件</div>
              </div>
            </div>
          </div>
        </div>
      </ThemeContext.Provider>
    )
  }

  // Fallback
  return (
    <ThemeContext.Provider value={theme}>
      <div style={S.app}>
        <FileSelector onProcess={handleProcess} />
      </div>
    </ThemeContext.Provider>
  )
}
