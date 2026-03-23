import React, { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Format seconds to MM:SS string
 */
function formatTime(sec) {
  if (typeof sec !== 'number' || isNaN(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

const styles = {
  container: {
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
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
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  waveformWrapper: {
    position: 'relative',
    background: '#111',
    borderRadius: '8px',
    overflow: 'hidden',
    minHeight: '80px',
  },
  waveformContainer: {
    width: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  playBtn: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s',
    flexShrink: 0,
  },
  timeDisplay: {
    fontFamily: 'monospace',
    fontSize: '14px',
    color: '#9ca3af',
    letterSpacing: '0.5px',
  },
  timeAccent: {
    color: '#e5e7eb',
    fontWeight: '600',
  },
  legend: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#6b7280',
  },
  legendDot: {
    width: '12px',
    height: '12px',
    borderRadius: '3px',
    flexShrink: 0,
  },
  loadingMsg: {
    color: '#6b7280',
    fontSize: '13px',
    padding: '24px',
    textAlign: 'center',
  },
  errorMsg: {
    color: '#f87171',
    fontSize: '13px',
    padding: '16px',
    textAlign: 'center',
  },
}

export default function WaveformPlayer({ audioPath, segments, onTimeUpdate }) {
  const waveformRef = useRef(null)
  const wavesurferRef = useRef(null)
  const overlayRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Build audio URL from path
  const audioUrl = audioPath
    ? `/api/audio?path=${encodeURIComponent(audioPath)}`
    : null

  // Draw deleted-segment overlays on the waveform canvas
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
      if (seg.selected) return // only draw deleted ones
      const x = (seg.start / duration) * width
      const w = Math.max(2, ((seg.end - seg.start) / duration) * width)
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)'
      ctx.fillRect(x, 0, w, height)
      // Top border line
      ctx.fillStyle = 'rgba(239, 68, 68, 0.6)'
      ctx.fillRect(x, 0, w, 2)
    })
  }, [segments, duration])

  // Initialize WaveSurfer
  useEffect(() => {
    if (!audioUrl || !waveformRef.current) return

    let ws = null
    let destroyed = false

    async function init() {
      try {
        const { default: WaveSurfer } = await import('wavesurfer.js')

        if (destroyed) return

        ws = WaveSurfer.create({
          container: waveformRef.current,
          waveColor: '#374151',
          progressColor: '#6366f1',
          cursorColor: '#818cf8',
          cursorWidth: 2,
          height: 80,
          normalize: true,
          interact: true,
          fillParent: true,
          minPxPerSec: 1,
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
          setError('音频加载失败，请检查路径或 ffmpeg 是否正常工作')
          setLoading(false)
        })

        await ws.load(audioUrl)
        wavesurferRef.current = ws
      } catch (err) {
        if (!destroyed) {
          console.error('WaveSurfer init error:', err)
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
      if (ws) {
        try {
          ws.destroy()
        } catch (e) {
          // ignore
        }
      }
      wavesurferRef.current = null
    }
  }, [audioUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  // Redraw overlays when segments or duration change
  useEffect(() => {
    drawOverlays()
  }, [drawOverlays])

  // Handle window resize for overlays
  useEffect(() => {
    const handleResize = () => drawOverlays()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [drawOverlays])

  const togglePlayPause = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause()
    }
  }

  if (!audioPath) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingMsg}>音频路径未设置</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>🎵 音频波形</div>
        <div style={styles.legend}>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendDot, background: '#6366f1' }} />
            <span>保留片段</span>
          </div>
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendDot, background: 'rgba(239,68,68,0.4)' }} />
            <span>删除片段</span>
          </div>
        </div>
      </div>

      {/* Waveform with overlay */}
      <div
        style={styles.waveformWrapper}
        ref={(el) => {
          // Use the inner div for wavesurfer container
        }}
      >
        <div ref={waveformRef} style={styles.waveformContainer} />
        <canvas
          ref={overlayRef}
          style={{
            ...styles.overlay,
            left: 0,
            right: 0,
            width: '100%',
            height: '100%',
          }}
        />
        {loading && !error && (
          <div
            style={{
              ...styles.loadingMsg,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            正在加载波形...
          </div>
        )}
        {error && (
          <div
            style={{
              ...styles.errorMsg,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <button
          style={{
            ...styles.playBtn,
            background: loading ? '#374151' : '#6366f1',
          }}
          onClick={togglePlayPause}
          disabled={loading || !!error}
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <div style={styles.timeDisplay}>
          <span style={styles.timeAccent}>{formatTime(currentTime)}</span>
          {' / '}
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  )
}
