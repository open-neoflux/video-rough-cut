import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useTheme } from '../ThemeContext.js'

function formatTime(sec) {
  if (typeof sec !== 'number' || isNaN(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

// Static (non-color) styles
const staticStyles = {
  container: {
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: '13px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  waveformWrapper: {
    position: 'relative',
    borderRadius: '8px',
    overflow: 'hidden',
    minHeight: '80px',
  },
  waveformContainer: { width: '100%' },
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  controls: { display: 'flex', alignItems: 'center', gap: '12px' },
  playBtn: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    color: '#fff',
    border: 'none',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  timeDisplay: { fontFamily: 'monospace', fontSize: '14px' },
  legend: { display: 'flex', gap: '16px', flexWrap: 'wrap' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' },
  legendDot: { width: '12px', height: '12px', borderRadius: '3px', flexShrink: 0 },
  loadingMsg: { fontSize: '13px', padding: '24px', textAlign: 'center' },
  errorMsg: { fontSize: '13px', padding: '16px', textAlign: 'center' },
}

export default function WaveformPlayer({ audioPath, segments, seekTime, onTimeUpdate }) {
  const t = useTheme()
  const waveformRef = useRef(null)
  const wavesurferRef = useRef(null)
  const overlayRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const audioUrl = audioPath ? `/api/audio?path=${encodeURIComponent(audioPath)}` : null

  // 绘制删除段红色遮罩
  const drawOverlays = useCallback(() => {
    if (!overlayRef.current || !duration || !segments) return
    const container = waveformRef.current
    if (!container) return
    const width = container.offsetWidth
    const height = container.offsetHeight
    const canvas = overlayRef.current
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, width, height)
    segments.forEach((seg) => {
      if (seg.selected) return
      const x = (seg.start / duration) * width
      const w = Math.max(2, ((seg.end - seg.start) / duration) * width)
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)'
      ctx.fillRect(x, 0, w, height)
      ctx.fillStyle = 'rgba(239, 68, 68, 0.6)'
      ctx.fillRect(x, 0, w, 2)
    })
  }, [segments, duration])

  // 初始化 WaveSurfer
  useEffect(() => {
    if (!audioUrl || !waveformRef.current) return
    let ws = null
    let destroyed = false

    async function init() {
      try {
        const { default: WaveSurfer } = await import('wavesurfer.js')
        if (destroyed) return

        const waveColor = t.id === 'dark' ? '#374151' : '#d1d5db'
        const progressColor = t.accent

        ws = WaveSurfer.create({
          container: waveformRef.current,
          waveColor,
          progressColor,
          cursorColor: t.accentLight,
          cursorWidth: 2,
          height: 80,
          normalize: true,
          interact: true,
          fillParent: true,
        })

        ws.on('ready', () => {
          if (destroyed) return
          setDuration(ws.getDuration())
          setLoading(false)
          setError('')
        })

        ws.on('timeupdate', (time) => {
          if (destroyed) return
          setCurrentTime(time)
          if (onTimeUpdate) onTimeUpdate(time)
        })

        ws.on('play', () => !destroyed && setIsPlaying(true))
        ws.on('pause', () => !destroyed && setIsPlaying(false))
        ws.on('finish', () => !destroyed && setIsPlaying(false))
        ws.on('error', (err) => {
          if (destroyed) return
          console.error('WaveSurfer error:', err)
          setError('音频加载失败')
          setLoading(false)
        })

        await ws.load(audioUrl)
        wavesurferRef.current = ws
      } catch (err) {
        if (!destroyed) {
          setError(`波形加载失败: ${err.message}`)
          setLoading(false)
        }
      }
    }

    setLoading(true)
    setError('')
    init()

    return () => {
      destroyed = true
      if (ws) { try { ws.destroy() } catch (e) {} }
      wavesurferRef.current = null
    }
  }, [audioUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update waveform colors when theme changes (if wavesurfer is ready)
  useEffect(() => {
    if (!wavesurferRef.current) return
    try {
      const waveColor = t.id === 'dark' ? '#374151' : '#d1d5db'
      wavesurferRef.current.setOptions({ waveColor, progressColor: t.accent })
    } catch (e) {
      // ignore if not supported
    }
  }, [t])

  // 外部传入 seekTime 时跳转
  useEffect(() => {
    if (seekTime == null || !wavesurferRef.current || !duration) return
    const pos = Math.max(0, Math.min(seekTime / duration, 1))
    wavesurferRef.current.seekTo(pos)
  }, [seekTime, duration])

  // 播放时跳过标红（已删除）的片段
  useEffect(() => {
    if (!isPlaying || !wavesurferRef.current || !segments || !duration) return
    const deleted = segments.filter(s => !s.selected)
    const hit = deleted.find(s => currentTime >= s.start && currentTime < s.end)
    if (hit) {
      const pos = Math.min(hit.end / duration, 1)
      wavesurferRef.current.seekTo(pos)
    }
  }, [currentTime, isPlaying, segments, duration])

  useEffect(() => { drawOverlays() }, [drawOverlays])
  useEffect(() => {
    const onResize = () => drawOverlays()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [drawOverlays])

  const togglePlayPause = () => { if (wavesurferRef.current) wavesurferRef.current.playPause() }

  const containerStyle = {
    ...staticStyles.container,
    background: t.surface,
    border: `1px solid ${t.border}`,
  }

  const titleStyle = {
    ...staticStyles.title,
    color: t.textSub,
  }

  const waveformWrapperStyle = {
    ...staticStyles.waveformWrapper,
    background: t.surface2,
  }

  const playBtnStyle = {
    ...staticStyles.playBtn,
    background: loading ? (t.id === 'dark' ? '#374151' : t.border2) : t.accent,
  }

  const timeDisplayStyle = {
    ...staticStyles.timeDisplay,
    color: t.textSub,
  }

  const timeAccentStyle = {
    color: t.text,
    fontWeight: '600',
  }

  const legendItemStyle = {
    ...staticStyles.legendItem,
    color: t.textDim,
  }

  const loadingMsgStyle = {
    ...staticStyles.loadingMsg,
    color: t.textDim,
  }

  const errorMsgStyle = {
    ...staticStyles.errorMsg,
    color: t.id === 'dark' ? '#f87171' : t.red,
  }

  if (!audioPath) {
    return <div style={containerStyle}><div style={loadingMsgStyle}>音频路径未设置</div></div>
  }

  return (
    <div style={containerStyle}>
      <div style={staticStyles.header}>
        <div style={titleStyle}>🎵 音频波形</div>
        <div style={staticStyles.legend}>
          <div style={legendItemStyle}>
            <div style={{ ...staticStyles.legendDot, background: t.accent }} /><span>保留</span>
          </div>
          <div style={legendItemStyle}>
            <div style={{ ...staticStyles.legendDot, background: 'rgba(239,68,68,0.4)' }} /><span>删除（自动跳过）</span>
          </div>
        </div>
      </div>

      <div style={waveformWrapperStyle}>
        <div ref={waveformRef} style={staticStyles.waveformContainer} />
        <canvas ref={overlayRef} style={{ ...staticStyles.overlay, left: 0, right: 0, width: '100%', height: '100%' }} />
        {loading && !error && (
          <div style={{ ...loadingMsgStyle, position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            正在加载波形...
          </div>
        )}
        {error && (
          <div style={{ ...errorMsgStyle, position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {error}
          </div>
        )}
      </div>

      <div style={staticStyles.controls}>
        <button
          style={playBtnStyle}
          onClick={togglePlayPause}
          disabled={loading || !!error}
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <div style={timeDisplayStyle}>
          <span style={timeAccentStyle}>{formatTime(currentTime)}</span>
          {' / '}
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  )
}
