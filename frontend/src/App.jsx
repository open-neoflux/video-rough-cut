import React, { useState, useCallback, useRef, useEffect } from 'react'
import FileSelector from './components/FileSelector.jsx'
import TranscriptEditor from './components/TranscriptEditor.jsx'
import WaveformPlayer from './components/WaveformPlayer.jsx'
import ExportPanel from './components/ExportPanel.jsx'
import { processVideo, pollTask } from './api.js'
import { ThemeContext } from './ThemeContext.js'
import { darkTheme, lightTheme } from './theme.js'
import { ScissorsIcon, ChevronLeftIcon, SunIcon, MoonIcon, RepeatIcon, BellIcon } from './components/Icons.jsx'

// Inject keyframe animations
if (!document.getElementById('app-animations')) {
  const style = document.createElement('style')
  style.id = 'app-animations'
  style.textContent = `
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes progressPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
  `
  document.head.appendChild(style)
}

const LS_KEY = 'roughcut_state'

export default function App() {
  const [stage, setStage] = useState('idle')
  const [filePath, setFilePath] = useState('')
  const [taskId, setTaskId] = useState(null)
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState('')
  const [transcriptData, setTranscriptData] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [waveCurrentTime, setWaveCurrentTime] = useState(0)
  const [seekTime, setSeekTime] = useState(null)
  const [isDark, setIsDark] = useState(false)
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
      el.textContent = `::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(120,120,128,0.28);border-radius:10px}::-webkit-scrollbar-thumb:hover{background:rgba(120,120,128,0.45)}`
    } else {
      el.textContent = `::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(120,120,128,0.22);border-radius:10px}::-webkit-scrollbar-thumb:hover{background:rgba(120,120,128,0.38)}`
    }
  }, [theme, isDark])

  const handleSegmentSeek = useCallback((start) => { setSeekTime(start) }, [])

  // Restore state from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return
      const saved = JSON.parse(raw)
      if (!saved?.stage) return
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
          (pct, stepName) => { setProgress(pct); setStep(stepName) },
          (data) => {
            if (data.result) { setTranscriptData(data.result); setStage('editing') }
            else { setErrorMsg('处理完成但未返回结果'); setStage('error') }
          },
          (errMsg) => { setErrorMsg(errMsg); setStage('error') }
        )
      }
    } catch (_) {}
  }, [])

  // Persist state
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ stage, filePath, taskId, transcriptData }))
    } catch (_) {}
  }, [stage, filePath, taskId, transcriptData])

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
        (pct, stepName) => { setProgress(pct); setStep(stepName) },
        (data) => {
          if (data.result) { setTranscriptData(data.result); setStage('editing') }
          else { setErrorMsg('处理完成但未返回结果'); setStage('error') }
        },
        (errMsg) => { setErrorMsg(errMsg); setStage('error') }
      )
    } catch (err) {
      setErrorMsg(err?.response?.data?.detail || err.message || '请求失败')
      setStage('error')
    }
  }, [])

  const handleSegmentToggle = useCallback((id) => {
    setTranscriptData(prev => prev ? {
      ...prev,
      segments: prev.segments.map(s => s.id === id ? { ...s, selected: !s.selected } : s),
    } : prev)
  }, [])

  const handleAutoSelect = useCallback(() => {
    setTranscriptData(prev => prev ? {
      ...prev,
      segments: prev.segments.map(s => ({
        ...s, selected: !s.is_duplicate && !s.is_keyword_marked && !s.is_silence,
      })),
    } : prev)
  }, [])

  const handleSegmentEdit = useCallback((id, changes) => {
    setTranscriptData(prev => ({
      ...prev,
      segments: prev.segments.map(s => s.id === id ? { ...s, ...changes } : s),
    }))
  }, [])

  const handleSegmentSplit = useCallback((id) => {
    setTranscriptData(prev => {
      const idx = prev.segments.findIndex(s => s.id === id)
      if (idx === -1) return prev
      const seg = prev.segments[idx]
      const mid = (seg.start + seg.end) / 2
      const maxId = Math.max(...prev.segments.map(s => s.id)) + 1
      const newSegs = [...prev.segments]
      newSegs.splice(idx, 1, { ...seg, end: mid }, { ...seg, id: maxId, start: mid, text: seg.text + ' (续)' })
      return { ...prev, segments: newSegs }
    })
  }, [])

  const handleSegmentMerge = useCallback((id) => {
    setTranscriptData(prev => {
      const idx = prev.segments.findIndex(s => s.id === id)
      if (idx === -1 || idx >= prev.segments.length - 1) return prev
      const a = prev.segments[idx], b = prev.segments[idx + 1]
      const newSegs = [...prev.segments]
      newSegs.splice(idx, 2, { ...a, end: b.end, text: a.text + ' ' + b.text })
      return { ...prev, segments: newSegs }
    })
  }, [])

  const handleSegmentAdd = useCallback(() => {
    setTranscriptData(prev => {
      const segs = prev.segments
      const last = segs[segs.length - 1]
      const maxId = Math.max(...segs.map(s => s.id)) + 1
      return {
        ...prev,
        segments: [...segs, {
          id: maxId,
          start: last ? last.end : 0, end: last ? last.end + 5 : 5,
          text: '(自定义片段)',
          is_duplicate: false, duplicate_of: null,
          is_keyword_marked: false, is_silence: false, selected: true,
        }],
      }
    })
  }, [])

  const handleBack = useCallback(() => {
    if (cancelPollRef.current) { cancelPollRef.current(); cancelPollRef.current = null }
    localStorage.removeItem(LS_KEY)
    setStage('idle'); setFilePath(''); setTaskId(null)
    setProgress(0); setStep(''); setTranscriptData(null); setErrorMsg('')
  }, [])

  // ─── Render ────────────────────────────────────────────────────────────────

  const appStyle = { minHeight: '100vh', background: theme.bg, color: theme.text }

  // Theme toggle button
  const ThemeToggle = () => (
    <button
      onClick={() => setIsDark(d => !d)}
      title={isDark ? '切换到浅色模式' : '切换到深色模式'}
      style={{
        width: '32px', height: '32px', borderRadius: '8px',
        background: isDark ? 'rgba(84,84,88,0.4)' : 'rgba(60,60,67,0.08)',
        border: `1px solid ${theme.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: theme.textSub, transition: 'all 0.2s',
      }}
    >
      {isDark ? <SunIcon size={15} color={theme.textSub}/> : <MoonIcon size={15} color={theme.textSub}/>}
    </button>
  )

  // ── IDLE ──────────────────────────────────────────────────────────────────
  if (stage === 'idle') {
    return (
      <ThemeContext.Provider value={theme}>
        <div style={appStyle}>
          <FileSelector onProcess={handleProcess}/>
        </div>
      </ThemeContext.Provider>
    )
  }

  // ── PROCESSING ────────────────────────────────────────────────────────────
  if (stage === 'processing') {
    const ringProgress = Math.max(2, progress)
    const circumference = 2 * Math.PI * 28
    const dashOffset = circumference * (1 - ringProgress / 100)

    return (
      <ThemeContext.Provider value={theme}>
        <div style={{ ...appStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{
            background: theme.id === 'dark' ? 'rgba(28,28,30,0.92)' : 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            borderRadius: '20px', padding: '48px 40px',
            width: '100%', maxWidth: '420px', textAlign: 'center',
            border: `1px solid ${theme.border}`,
            boxShadow: theme.id === 'dark' ? '0 32px 80px rgba(0,0,0,0.6)' : '0 32px 80px rgba(0,0,0,0.1)',
            animation: 'fadeIn 0.3s ease',
          }}>
            {/* Ring progress */}
            <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 24px' }}>
              <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="40" cy="40" r="28" fill="none" stroke={theme.border} strokeWidth="4"/>
                <circle cx="40" cy="40" r="28" fill="none"
                  stroke={theme.accent} strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                />
              </svg>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <ScissorsIcon size={22} color={theme.accent}/>
              </div>
            </div>

            <div style={{
              fontSize: '20px', fontWeight: '700', letterSpacing: '-0.3px',
              color: theme.text, marginBottom: '8px',
            }}>
              正在分析视频
            </div>
            <div style={{
              fontSize: '14px', color: theme.textSub, marginBottom: '8px', minHeight: '20px',
              animation: 'progressPulse 2s ease infinite',
            }}>
              {step || '初始化...'}
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: theme.accent, fontFamily: 'monospace', marginBottom: '20px' }}>
              {Math.round(progress)}%
            </div>
            <div style={{
              fontSize: '11px', color: theme.textFaint,
              fontFamily: 'monospace', marginBottom: '20px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {filePath}
            </div>
            <button
              onClick={handleBack}
              style={{
                padding: '9px 20px',
                background: 'transparent',
                color: theme.textDim,
                border: `1px solid ${theme.border}`,
                borderRadius: '8px', fontSize: '13px',
              }}
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
        <div style={{ ...appStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{
            background: theme.id === 'dark' ? 'rgba(28,28,30,0.92)' : 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
            borderRadius: '20px', padding: '40px',
            maxWidth: '480px', width: '100%', textAlign: 'center',
            border: `1px solid ${theme.redBorder}`,
            boxShadow: theme.id === 'dark' ? '0 32px 80px rgba(0,0,0,0.6)' : '0 32px 80px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: '44px', marginBottom: '16px' }}>⚠️</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: theme.red, marginBottom: '12px' }}>
              处理失败
            </div>
            <div style={{ fontSize: '14px', color: theme.textSub, marginBottom: '24px', wordBreak: 'break-all' }}>
              {errorMsg}
            </div>
            <button
              onClick={handleBack}
              style={{
                padding: '12px 28px',
                background: theme.accent, color: '#fff',
                border: 'none', borderRadius: '10px',
                fontSize: '15px', fontWeight: '600',
                boxShadow: `0 4px 14px ${theme.accentSoft}`,
              }}
            >
              重新选择文件
            </button>
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
        <div style={{ height: '100vh', overflow: 'hidden', background: theme.bg, color: theme.text }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 360px',
            gridTemplateRows: '52px 1fr',
            height: '100vh',
          }}>
            {/* ── Top bar (frosted glass) ── */}
            <div style={{
              gridColumn: '1 / -1',
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '0 16px',
              background: theme.surface,
              borderBottom: `1px solid ${theme.border2}`,
            }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '7px',
                background: `linear-gradient(145deg, ${theme.accent}, ${theme.id === 'dark' ? '#5E5CE6' : '#5856D6'})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <ScissorsIcon size={14} color="#fff"/>
              </div>
              <span style={{
                fontSize: '15px', fontWeight: '700', letterSpacing: '-0.3px',
                color: theme.text, flexShrink: 0,
              }}>
                视频粗剪助手
              </span>
              <span style={{
                fontSize: '12px', color: theme.textFaint, fontFamily: 'monospace',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                maxWidth: '400px',
              }}>
                {filePath}
              </span>
              <div style={{ flex: 1 }}/>

              {/* Back button */}
              <button
                onClick={handleBack}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '6px 12px',
                  background: theme.accent,
                  border: 'none',
                  borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                  color: '#fff', transition: 'all 0.18s',
                  boxShadow: `0 4px 14px ${theme.accentSoft}`,
                }}
                title="返回文件选择"
              >
                <ChevronLeftIcon size={15} color="#fff"/>
                重新选择
              </button>

              {/* Theme toggle */}
              <ThemeToggle/>
            </div>

            {/* ── Left panel ── */}
            <div style={{
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
              {/* Waveform */}
              <div style={{ padding: '12px 12px 10px', flexShrink: 0 }}>
                <WaveformPlayer
                  audioPath={audioPath}
                  segments={segments}
                  seekTime={seekTime}
                  onTimeUpdate={setWaveCurrentTime}
                />
              </div>

              {/* Transcript */}
              <div style={{ flex: 1, overflow: 'hidden', padding: '10px 12px 12px' }}>
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

            {/* ── Right panel ── */}
            <div style={{
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden', padding: '12px',
              gap: '12px',
            }}>
              <ExportPanel
                filePath={filePath}
                segments={segments}
                onExportDone={() => {}}
              />

              {/* Quick help */}
              <div style={{
                borderRadius: '14px', padding: '14px 16px',
                background: theme.surface,
                border: `1px solid ${theme.border}`,
                boxShadow: theme.id === 'dark' ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
              }}>
                <div style={{
                  fontSize: '14px', fontWeight: '700', letterSpacing: '-0.1px',
                  color: theme.text, marginBottom: '10px',
                }}>
                  操作说明
                </div>
                {[
                  { icon: <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: theme.green, display: 'inline-block' }}/>, text: '绿色边框 = 保留片段' },
                  { icon: <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: theme.red, display: 'inline-block' }}/>, text: '红色边框 = 删除片段' },
                  { icon: <RepeatIcon size={13} color={theme.orange}/>, text: '重复 = 相似内容检测' },
                  { icon: <BellIcon size={13} color={theme.red}/>, text: '标记 = 含废片的关键词' },
                ].map(({ icon, text }) => (
                  <div key={text} style={{
                    display: 'flex', alignItems: 'center', gap: '7px',
                    padding: '3px 0', fontSize: '12px', color: theme.textSub,
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>
                    {text}
                  </div>
                ))}
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${theme.border2}` }}>
                  <div style={{ fontSize: '12px', color: theme.textDim }}>
                    悬停卡片 → 显示拆分 / 合并按钮
                  </div>
                  <div style={{ fontSize: '12px', color: theme.textDim, marginTop: '3px' }}>
                    点击时间码 → 编辑起止时间
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ThemeContext.Provider>
    )
  }

  return (
    <ThemeContext.Provider value={theme}>
      <div style={appStyle}><FileSelector onProcess={handleProcess}/></div>
    </ThemeContext.Provider>
  )
}
