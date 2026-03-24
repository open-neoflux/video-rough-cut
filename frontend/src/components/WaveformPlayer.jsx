import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useTheme } from '../ThemeContext.js'
import { WaveformIcon, PlayIcon, PauseIcon } from './Icons.jsx'

function formatTime(sec) {
  if (typeof sec !== 'number' || isNaN(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
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
      ctx.fillStyle = t.id === 'dark' ? 'rgba(255,69,58,0.18)' : 'rgba(255,59,48,0.12)'
      ctx.fillRect(x, 0, w, height)
      ctx.fillStyle = t.id === 'dark' ? 'rgba(255,69,58,0.55)' : 'rgba(255,59,48,0.5)'
      ctx.fillRect(x, 0, w, 2)
    })
  }, [segments, duration, t])

  useEffect(() => {
    if (!audioUrl || !waveformRef.current) return
    let ws = null
    let destroyed = false

    async function init() {
      try {
        const { default: WaveSurfer } = await import('wavesurfer.js')
        if (destroyed) return
        const waveColor = t.id === 'dark' ? 'rgba(84,84,88,0.8)' : 'rgba(199,199,204,0.9)'
        ws = WaveSurfer.create({
          container: waveformRef.current,
          waveColor,
          progressColor: t.accent,
          cursorColor: t.accent,
          cursorWidth: 2,
          height: 72,
          normalize: true,
          interact: true,
          fillParent: true,
          barWidth: 2,
          barGap: 1,
          barRadius: 2,
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
        ws.on('error', () => {
          if (destroyed) return
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

  useEffect(() => {
    if (!wavesurferRef.current) return
    try {
      const waveColor = t.id === 'dark' ? 'rgba(84,84,88,0.8)' : 'rgba(199,199,204,0.9)'
      wavesurferRef.current.setOptions({ waveColor, progressColor: t.accent })
    } catch (e) {}
  }, [t])

  useEffect(() => {
    if (seekTime == null || !wavesurferRef.current || !duration) return
    const pos = Math.max(0, Math.min(seekTime / duration, 1))
    wavesurferRef.current.seekTo(pos)
  }, [seekTime, duration])

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

  const progress = duration > 0 ? currentTime / duration : 0

  if (!audioPath) {
    return (
      <div style={{
        borderRadius: '14px', padding: '20px', background: t.surface,
        border: `1px solid ${t.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: t.textDim, fontSize: '13px', minHeight: '100px',
      }}>
        音频路径未设置
      </div>
    )
  }

  return (
    <div style={{
      borderRadius: '14px', padding: '16px', background: t.surface,
      border: `1px solid ${t.border}`,
      boxShadow: t.id === 'dark' ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
      display: 'flex', flexDirection: 'column', gap: '12px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '14px', fontWeight: '700', letterSpacing: '-0.1px',
          color: t.text,
        }}>
          <WaveformIcon size={15} color={t.text}/>
          音频波形
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {[
            { color: t.accent, label: '保留' },
            { color: t.red, label: '删除（自动跳过）' },
          ].map(({ color, label }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              fontSize: '11px', color: t.textDim,
            }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: color, opacity: 0.7 }}/>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Waveform */}
      <div style={{
        position: 'relative', borderRadius: '10px', overflow: 'hidden',
        background: t.id === 'dark' ? t.surface2 : '#f9f9fb',
        minHeight: '72px',
      }}>
        <div ref={waveformRef} style={{ width: '100%' }} />
        <canvas ref={overlayRef} style={{
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '100%', pointerEvents: 'none',
        }} />
        {loading && !error && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', color: t.textDim,
          }}>
            正在加载波形...
          </div>
        )}
        {error && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', color: t.red,
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Play button */}
        <button
          onClick={togglePlayPause}
          disabled={loading || !!error}
          title={isPlaying ? '暂停' : '播放'}
          style={{
            width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
            background: (loading || !!error) ? t.surface2 : t.accent,
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.18s',
            boxShadow: (!loading && !error) ? `0 4px 12px ${t.accentSoft}` : 'none',
          }}
        >
          {isPlaying
            ? <PauseIcon size={16} color={loading || error ? t.textDim : '#fff'}/>
            : <PlayIcon size={16} color={loading || error ? t.textDim : '#fff'}/>
          }
        </button>

        {/* Time + progress */}
        <div style={{ flex: 1 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            marginBottom: '5px',
          }}>
            <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: '600', color: t.text }}>
              {formatTime(currentTime)}
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: '12px', color: t.textDim }}>
              {formatTime(duration)}
            </span>
          </div>
          {/* Progress bar */}
          <div style={{
            height: '3px', borderRadius: '2px',
            background: t.border,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: '2px',
              background: t.accent,
              width: `${progress * 100}%`,
              transition: 'width 0.1s linear',
            }}/>
          </div>
        </div>
      </div>
    </div>
  )
}
