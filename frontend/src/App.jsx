import React, { useState, useCallback, useRef, useEffect } from 'react'
import axios from 'axios'
import TranscriptEditor from './components/TranscriptEditor.jsx'
import WaveformPlayer from './components/WaveformPlayer.jsx'
import ExportPanel from './components/ExportPanel.jsx'
import { processVideo, pollTask } from './api.js'
import { ThemeContext } from './ThemeContext.js'
import { darkTheme, lightTheme } from './theme.js'
import {
  ScissorsIcon, ChevronLeftIcon, SunIcon, MoonIcon,
  RepeatIcon, BellIcon, FolderOpenIcon,
  FilmIcon, SearchIcon, CheckCircleIcon, XCircleIcon,
} from './components/Icons.jsx'

// Inject keyframe animations
if (!document.getElementById('app-animations')) {
  const style = document.createElement('style')
  style.id = 'app-animations'
  style.textContent = `
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes progressPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
  `
  document.head.appendChild(style)
}

const LS_KEY = 'roughcut_state'

// ─── Typewriter ───────────────────────────────────────────────────────────────

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ currentStep, hasError, theme: t }) {
  const steps = ['导入视频', '分析视频', '导出/编辑']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {steps.map((label, i) => {
        const stepNum = i + 1
        const isDone = stepNum < currentStep && !hasError
        const isActive = stepNum === currentStep
        const isError = hasError && stepNum === 2
        const circleColor = isError ? t.red : isActive ? t.accent : isDone ? t.green : t.border
        const textColor = isActive ? t.text : isDone ? t.green : t.textFaint
        const circleBg = isError ? t.redSoft : isActive ? t.accentSoft : isDone ? t.greenSoft : 'transparent'
        return (
          <React.Fragment key={label}>
            {i > 0 && (
              <div style={{
                width: '52px', height: '1px',
                background: isDone ? t.green : t.border2,
                transition: 'background 0.3s',
                margin: '0 4px',
                marginBottom: '20px',
              }}/>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1.5px solid ${circleColor}`,
                background: circleBg,
                transition: 'all 0.3s',
              }}>
                {isDone ? (
                  <CheckCircleIcon size={16} color={t.green}/>
                ) : isError ? (
                  <XCircleIcon size={16} color={t.red}/>
                ) : (
                  <span style={{ fontSize: '13px', fontWeight: '700', color: circleColor }}>{stepNum}</span>
                )}
              </div>
              <span style={{
                fontSize: '12px', fontWeight: isActive ? '600' : '500',
                color: textColor, whiteSpace: 'nowrap',
                transition: 'color 0.3s',
              }}>
                {label}
              </span>
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}

export default function App() {
  const [stage, setStage] = useState('idle')
  const [filePath, setFilePath] = useState('')
  const [fileError, setFileError] = useState('')
  const [fileBrowsing, setFileBrowsing] = useState(false)
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
  const t = theme

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
            if (data.result) {
              setTranscriptData(data.result)
              setStage('editing')
            } else {
              setErrorMsg('处理完成但未返回结果')
              setStage('error')
            }
          },
          (errMsg) => { setErrorMsg(errMsg); setStage('error') }
        )
      }
    } catch (_) {}
  }, [])

  // Persist state
  useEffect(() => {
    try {
      const stageToSave = stage === 'ready' ? 'ready' : stage
      localStorage.setItem(LS_KEY, JSON.stringify({ stage: stageToSave, filePath, taskId, transcriptData }))
    } catch (_) {}
  }, [stage, filePath, taskId, transcriptData])

  // ─── File browsing ────────────────────────────────────────────────────────
  const handleBrowse = useCallback(async () => {
    setFileBrowsing(true)
    setFileError('')
    try {
      const res = await axios.get('/api/browse', { timeout: 130000 })
      if (res.data.path) {
        setFilePath(res.data.path)
        setFileError('')
      }
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        setFileError('文件选择超时，请重试')
      } else {
        const detail = err?.response?.data?.detail || ''
        // Ignore user-cancelled errors (AppleScript -128)
        if (!detail.includes('-128') && !detail.includes('用户已取消')) {
          setFileError(detail || '文件选择失败，请重试')
        }
      }
    } finally {
      setFileBrowsing(false)
    }
  }, [])

  // ─── Processing ────────────────────────────────────────────────────────────
  const handleProcess = useCallback(async (path) => {
    const trimmed = (path || filePath).trim()
    if (!trimmed) { setFileError('请输入视频文件路径'); return }
    setFileError('')
    setFilePath(trimmed)
    setStage('processing')
    setProgress(0)
    setStep('提交任务...')
    setErrorMsg('')
    setTaskId(null)
    try {
      const { task_id } = await processVideo(trimmed)
      setTaskId(task_id)
      cancelPollRef.current = pollTask(
        task_id,
        (pct, stepName) => { setProgress(pct); setStep(stepName) },
        (data) => {
          if (data.result) {
            setTranscriptData(data.result)
            setStage('editing')
          } else {
            setErrorMsg('处理完成但未返回结果')
            setStage('error')
          }
        },
        (errMsg) => { setErrorMsg(errMsg); setStage('error') }
      )
    } catch (err) {
      setErrorMsg(err?.response?.data?.detail || err.message || '请求失败')
      setStage('error')
    }
  }, [filePath])

  // ─── Navigation ────────────────────────────────────────────────────────────
  const handleSegmentSeek = useCallback((start) => { setSeekTime(start) }, [])

  const handleBack = useCallback(() => {
    if (cancelPollRef.current) { cancelPollRef.current(); cancelPollRef.current = null }
    localStorage.removeItem(LS_KEY)
    setStage('idle'); setFilePath(''); setTaskId(null)
    setProgress(0); setStep(''); setTranscriptData(null); setErrorMsg('')
  }, [])

  // ─── Segment operations ────────────────────────────────────────────────────
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

  // ─── Shared UI elements ────────────────────────────────────────────────────

  const ThemeToggle = () => (
    <button
      onClick={() => setIsDark(d => !d)}
      title={isDark ? '切换到浅色模式' : '切换到深色模式'}
      style={{
        width: '32px', height: '32px', borderRadius: '8px',
        background: isDark ? 'rgba(84,84,88,0.4)' : 'rgba(60,60,67,0.08)',
        border: `1px solid ${t.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: t.textSub, transition: 'all 0.2s', flexShrink: 0,
      }}
    >
      {isDark ? <SunIcon size={15} color={t.textSub}/> : <MoonIcon size={15} color={t.textSub}/>}
    </button>
  )

  // ─── Onboarding top bar (shared for idle/processing/error) ─────────────────

  const onboardingTopBar = (
    <div style={{
      height: '52px',
      display: 'flex', alignItems: 'center',
      padding: '0 20px',
      background: t.surface,
      borderBottom: `1px solid ${t.border2}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '7px',
          background: `linear-gradient(145deg, ${t.accent}, ${isDark ? '#5E5CE6' : '#5856D6'})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ScissorsIcon size={14} color="#fff"/>
        </div>
        <span style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '-0.3px', color: t.text }}>
          视频粗剪助手
        </span>
      </div>
      <div style={{ flex: 1 }}/>
      <ThemeToggle/>
    </div>
  )

  // ─── Render ────────────────────────────────────────────────────────────────

  const appStyle = { minHeight: '100vh', background: t.bg, color: t.text }

  // ── IDLE ──────────────────────────────────────────────────────────────────
  if (stage === 'idle') {
    const isValid = filePath.trim().length > 0

    const cardBg = isDark ? 'rgba(28,28,30,0.92)' : 'rgba(255,255,255,0.96)'

    return (
      <ThemeContext.Provider value={theme}>
        <div style={appStyle}>
          {onboardingTopBar}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center',
            minHeight: 'calc(100vh - 52px)',
            padding: '32px 24px',
          }}>
            {/* Stepper above card */}
            <div style={{ marginBottom: '24px' }}>
              <StepIndicator currentStep={1} hasError={false} theme={t}/>
            </div>
            <div style={{
              width: '100%', maxWidth: '520px',
              background: cardBg,
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              borderRadius: '20px',
              border: `1px solid ${t.border}`,
              boxShadow: isDark
                ? '0 32px 80px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.06)'
                : '0 32px 80px rgba(0,0,0,0.1), 0 0 0 0.5px rgba(0,0,0,0.05)',
              overflow: 'hidden',
              animation: 'fadeInUp 0.35s ease',
            }}>
              {/* Card header */}
              <div style={{
                padding: '36px 40px 28px',
                textAlign: 'center',
                borderBottom: `1px solid ${t.border2}`,
              }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '16px',
                  background: `linear-gradient(145deg, ${t.accent}, ${isDark ? '#5E5CE6' : '#5856D6'})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: `0 8px 24px ${t.accentSoft}`,
                }}>
                  <ScissorsIcon size={28} color="#fff"/>
                </div>
                <h2 style={{
                  fontSize: '22px', fontWeight: '700', letterSpacing: '-0.4px',
                  color: t.text, marginBottom: '6px',
                }}>
                  导入视频
                </h2>
                <p style={{ fontSize: '14px', color: t.textSub, lineHeight: '1.5' }}>
                  选择本地视频文件，开始{' '}
                  <span style={{
                    fontWeight: '600',
                    background: 'linear-gradient(90deg, rgba(0,122,255,0.12), rgba(139,92,246,0.12))',
                    color: isDark ? '#A78BFA' : '#6D4AFF',
                    padding: '2px 7px', borderRadius: '5px',
                    fontSize: '13px',
                  }}>
                    AI 分析
                  </span>
                </p>
              </div>

              {/* Card body */}
              <div style={{ padding: '24px 40px 32px' }}>
                {/* Browse button */}
                <button
                  onClick={handleBrowse}
                  disabled={fileBrowsing}
                  style={{
                    width: '100%', padding: '12px 18px',
                    background: fileBrowsing ? t.surface2 : t.accent,
                    color: fileBrowsing ? t.textDim : '#fff',
                    border: 'none', borderRadius: '12px',
                    fontSize: '15px', fontWeight: '600',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'all 0.2s',
                    opacity: fileBrowsing ? 0.7 : 1,
                    cursor: fileBrowsing ? 'not-allowed' : 'pointer',
                    boxShadow: fileBrowsing ? 'none' : `0 4px 14px ${t.accentSoft}`,
                  }}
                >
                  <FolderOpenIcon size={18} color={fileBrowsing ? t.textDim : '#fff'}/>
                  {fileBrowsing ? '打开文件选择器...' : '选择视频文件'}
                </button>

                {/* Selected file display */}
                {filePath && (
                  <div style={{
                    marginTop: '12px',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 14px',
                    background: t.surface2,
                    border: `1px solid ${t.border}`,
                    borderRadius: '10px',
                    animation: 'fadeIn 0.2s ease',
                  }}>
                    <FilmIcon size={16} color={t.accent}/>
                    <span style={{
                      fontSize: '12px', color: t.text, fontFamily: 'monospace',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      flex: 1,
                    }}>
                      {filePath}
                    </span>
                  </div>
                )}

                {/* Error */}
                {fileError && (
                  <div style={{
                    marginTop: '10px', padding: '10px 14px',
                    background: t.redSoft, border: `1px solid ${t.redBorder}`,
                    borderRadius: '8px', fontSize: '13px', color: t.red,
                  }}>
                    {fileError}
                  </div>
                )}

                {/* Start button */}
                <button
                  onClick={() => handleProcess()}
                  disabled={!isValid}
                  style={{
                    width: '100%', marginTop: '14px', padding: '14px',
                    background: isValid ? t.accent : t.surface2,
                    color: isValid ? '#fff' : t.textDim,
                    border: 'none', borderRadius: '12px',
                    fontSize: '15px', fontWeight: '600',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'all 0.2s',
                    cursor: isValid ? 'pointer' : 'not-allowed',
                    boxShadow: isValid ? `0 4px 14px ${t.accentSoft}` : 'none',
                  }}
                >
                  <SearchIcon size={17} color={isValid ? '#fff' : t.textDim}/>
                  开始分析
                </button>

                {/* Tips */}
                <div style={{
                  marginTop: '18px', padding: '12px 14px',
                  background: isDark ? 'rgba(10,132,255,0.07)' : t.accentSoft,
                  border: `1px solid ${t.accentBorder}`,
                  borderRadius: '10px',
                }}>
                  <div style={{
                    fontSize: '11px', fontWeight: '600', textTransform: 'uppercase',
                    letterSpacing: '0.6px', color: t.accentLight, marginBottom: '6px',
                  }}>
                    使用提示
                  </div>
                  {[
                    'AI 自动识别废片镜头和重复内容',
                    '处理时间取决于视频时长（每小时约 5–15 分钟）',
                    '导出使用无损复制，不降低画质',
                    '请确保系统已安装 ffmpeg',
                  ].map((tip, i) => (
                    <div key={i} style={{
                      fontSize: '12px', color: t.textSub,
                      padding: '2px 0', paddingLeft: '10px', position: 'relative',
                    }}>
                      <span style={{ position: 'absolute', left: 0, color: t.accentLight, fontSize: '10px' }}>›</span>
                      {tip}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
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
        <div style={appStyle}>
          {onboardingTopBar}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: 'calc(100vh - 52px)', padding: '24px',
          }}>
            {/* Stepper above card */}
            <div style={{ marginBottom: '24px' }}>
              <StepIndicator currentStep={2} hasError={false} theme={t}/>
            </div>
            <div style={{
              background: isDark ? 'rgba(28,28,30,0.92)' : 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              borderRadius: '20px', padding: '48px 40px',
              width: '100%', maxWidth: '420px', textAlign: 'center',
              border: `1px solid ${t.border}`,
              boxShadow: isDark ? '0 32px 80px rgba(0,0,0,0.6)' : '0 32px 80px rgba(0,0,0,0.1)',
              animation: 'fadeInUp 0.3s ease',
            }}>
              {/* Ring progress */}
              <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 24px' }}>
                <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="40" cy="40" r="28" fill="none" stroke={t.border} strokeWidth="4"/>
                  <circle cx="40" cy="40" r="28" fill="none"
                    stroke={t.accent} strokeWidth="4"
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
                  <ScissorsIcon size={22} color={t.accent}/>
                </div>
              </div>

              <div style={{
                fontSize: '20px', fontWeight: '700', letterSpacing: '-0.3px',
                color: t.text, marginBottom: '8px',
              }}>
                正在分析视频
              </div>
              <div style={{
                fontSize: '14px', color: t.textSub, marginBottom: '8px', minHeight: '20px',
                animation: 'progressPulse 2s ease infinite',
              }}>
                {step || '初始化...'}
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: t.accent, fontFamily: 'monospace', marginBottom: '20px' }}>
                {Math.round(progress)}%
              </div>
              <div style={{
                fontSize: '11px', color: t.textFaint,
                fontFamily: 'monospace', marginBottom: '24px',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {filePath}
              </div>
              <button
                onClick={handleBack}
                style={{
                  padding: '9px 20px',
                  background: 'transparent',
                  color: t.textDim,
                  border: `1px solid ${t.border}`,
                  borderRadius: '8px', fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      </ThemeContext.Provider>
    )
  }

  // ── ERROR ─────────────────────────────────────────────────────────────────
  if (stage === 'error') {
    return (
      <ThemeContext.Provider value={theme}>
        <div style={appStyle}>
          {onboardingTopBar}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: 'calc(100vh - 52px)', padding: '24px', gap: '24px',
          }}>
            <StepIndicator currentStep={2} hasError={true} theme={t}/>
            <div style={{
              background: isDark ? 'rgba(28,28,30,0.92)' : 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
              borderRadius: '20px', padding: '40px',
              maxWidth: '480px', width: '100%', textAlign: 'center',
              border: `1px solid ${t.redBorder}`,
              boxShadow: isDark ? '0 32px 80px rgba(0,0,0,0.6)' : '0 32px 80px rgba(0,0,0,0.1)',
              animation: 'fadeInUp 0.3s ease',
            }}>
              <div style={{ marginBottom: '16px' }}>
                <XCircleIcon size={44} color={t.red}/>
              </div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: t.red, marginBottom: '12px' }}>
                处理失败
              </div>
              <div style={{ fontSize: '14px', color: t.textSub, marginBottom: '24px', wordBreak: 'break-all' }}>
                {errorMsg}
              </div>
              <button
                onClick={handleBack}
                style={{
                  padding: '12px 28px',
                  background: t.accent, color: '#fff',
                  border: 'none', borderRadius: '10px',
                  fontSize: '15px', fontWeight: '600',
                  boxShadow: `0 4px 14px ${t.accentSoft}`,
                  cursor: 'pointer',
                }}
              >
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
        <div style={{ height: '100vh', overflow: 'hidden', background: t.bg, color: t.text }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 360px',
            gridTemplateRows: '52px 1fr',
            height: '100vh',
          }}>
            {/* ── Top bar ── */}
            <div style={{
              gridColumn: '1 / -1',
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '0 16px',
              background: t.surface,
              borderBottom: `1px solid ${t.border2}`,
            }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '7px',
                background: `linear-gradient(145deg, ${t.accent}, ${isDark ? '#5E5CE6' : '#5856D6'})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <ScissorsIcon size={14} color="#fff"/>
              </div>
              <span style={{
                fontSize: '15px', fontWeight: '700', letterSpacing: '-0.3px',
                color: t.text, flexShrink: 0,
              }}>
                视频粗剪助手
              </span>
              <span style={{
                fontSize: '12px', color: t.textFaint, fontFamily: 'monospace',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                maxWidth: '400px',
              }}>
                {filePath}
              </span>
              <div style={{ flex: 1 }}/>

              <button
                onClick={handleBack}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '6px 12px',
                  background: t.accent,
                  border: 'none',
                  borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                  color: '#fff', transition: 'all 0.18s',
                  boxShadow: `0 4px 14px ${t.accentSoft}`,
                  cursor: 'pointer',
                }}
                title="返回文件选择"
              >
                <ChevronLeftIcon size={15} color="#fff"/>
                重新选择
              </button>

              <ThemeToggle/>
            </div>

            {/* ── Left panel ── */}
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '12px 12px 10px', flexShrink: 0 }}>
                <WaveformPlayer
                  audioPath={audioPath}
                  segments={segments}
                  seekTime={seekTime}
                  onTimeUpdate={setWaveCurrentTime}
                />
              </div>
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
                background: t.surface,
                border: `1px solid ${t.border}`,
                boxShadow: t.id === 'dark' ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
              }}>
                <div style={{
                  fontSize: '14px', fontWeight: '700', letterSpacing: '-0.1px',
                  color: t.text, marginBottom: '10px',
                }}>
                  操作说明
                </div>
                {[
                  { icon: <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.green, display: 'inline-block' }}/>, text: '绿色边框 = 保留片段' },
                  { icon: <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.red, display: 'inline-block' }}/>, text: '红色边框 = 删除片段' },
                  { icon: <RepeatIcon size={13} color={t.orange}/>, text: '重复 = 相似内容检测' },
                  { icon: <BellIcon size={13} color={t.red}/>, text: '标记 = 含废片的关键词' },
                ].map(({ icon, text }) => (
                  <div key={text} style={{
                    display: 'flex', alignItems: 'center', gap: '7px',
                    padding: '3px 0', fontSize: '12px', color: t.textSub,
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>
                    {text}
                  </div>
                ))}
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${t.border2}` }}>
                  <div style={{ fontSize: '12px', color: t.textDim }}>
                    悬停卡片 → 显示拆分 / 合并按钮
                  </div>
                  <div style={{ fontSize: '12px', color: t.textDim, marginTop: '3px' }}>
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
      <div style={appStyle}/>
    </ThemeContext.Provider>
  )
}
