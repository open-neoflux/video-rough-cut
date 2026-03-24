import React, { useState } from 'react'
import axios from 'axios'
import { useTheme } from '../ThemeContext.js'
import { ScissorsIcon, FolderOpenIcon, SearchIcon, FilmIcon } from './Icons.jsx'

export default function FileSelector({ onProcess }) {
  const t = useTheme()
  const [filePath, setFilePath] = useState('')
  const [error, setError] = useState('')
  const [inputFocused, setInputFocused] = useState(false)
  const [browsing, setBrowsing] = useState(false)

  const handleBrowse = async () => {
    setBrowsing(true)
    setError('')
    try {
      const res = await axios.get('/api/browse', { timeout: 130000 })
      if (res.data.path) {
        setFilePath(res.data.path)
        setError('')
      }
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        setError('文件选择超时，请重试')
      } else {
        setError(err?.response?.data?.detail || '文件选择失败，请手动输入路径')
      }
    } finally {
      setBrowsing(false)
    }
  }

  const handleProcess = () => {
    const trimmed = filePath.trim()
    if (!trimmed) { setError('请输入视频文件路径'); return }
    setError('')
    onProcess(trimmed)
  }

  const isValid = filePath.trim().length > 0

  const bg = t.id === 'dark'
    ? 'radial-gradient(ellipse at 30% 20%, rgba(10,132,255,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(48,209,88,0.06) 0%, transparent 60%), #000'
    : 'radial-gradient(ellipse at 30% 20%, rgba(0,122,255,0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(52,199,89,0.05) 0%, transparent 60%), #f2f2f7'

  const cardBg = t.id === 'dark'
    ? 'rgba(28,28,30,0.92)'
    : 'rgba(255,255,255,0.92)'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', padding: '24px',
      background: bg,
    }}>
      <div style={{
        width: '100%', maxWidth: '520px',
        background: cardBg,
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        borderRadius: '20px',
        border: `1px solid ${t.border}`,
        boxShadow: t.id === 'dark'
          ? '0 32px 80px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.06)'
          : '0 32px 80px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          padding: '48px 40px 36px',
          textAlign: 'center',
          borderBottom: `1px solid ${t.border2}`,
        }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '18px',
            background: `linear-gradient(145deg, ${t.accent}, ${t.id === 'dark' ? '#5E5CE6' : '#5856D6'})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: `0 8px 24px ${t.accentSoft}`,
          }}>
            <ScissorsIcon size={32} color="#fff"/>
          </div>
          <h1 style={{
            fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px',
            color: t.text, marginBottom: '8px',
          }}>
            视频粗剪助手
          </h1>
          <p style={{ fontSize: '15px', color: t.textSub, lineHeight: '1.5' }}>
            AI 自动识别废片，快速完成粗剪
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '28px 40px 36px' }}>

          {/* Browse button */}
          <button
            onClick={handleBrowse}
            disabled={browsing}
            style={{
              width: '100%', padding: '13px 18px',
              background: browsing ? t.surface2 : t.accent,
              color: browsing ? t.textDim : '#fff',
              border: 'none', borderRadius: '12px',
              fontSize: '15px', fontWeight: '600',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.2s',
              opacity: browsing ? 0.7 : 1,
            }}
          >
            <FolderOpenIcon size={18} color={browsing ? t.textDim : '#fff'}/>
            {browsing ? '打开文件选择器...' : '选择视频文件'}
          </button>

          {/* Divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0',
          }}>
            <div style={{ flex: 1, height: '1px', background: t.border2 }}/>
            <span style={{ fontSize: '12px', color: t.textDim, whiteSpace: 'nowrap' }}>
              或手动输入路径
            </span>
            <div style={{ flex: 1, height: '1px', background: t.border2 }}/>
          </div>

          {/* Path input */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{
              position: 'absolute', left: '12px',
              display: 'flex', alignItems: 'center', pointerEvents: 'none',
            }}>
              <FilmIcon size={16} color={t.textDim}/>
            </span>
            <input
              type="text"
              value={filePath}
              onChange={e => { setFilePath(e.target.value); if (error) setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleProcess()}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="例如：/Users/username/Videos/video.mp4"
              spellCheck={false}
              style={{
                width: '100%', paddingLeft: '38px', paddingRight: '14px',
                padding: '0 14px 0 38px',
                height: '44px',
                background: t.id === 'dark' ? t.surface2 : t.surface2,
                border: `1px solid ${inputFocused ? t.accent : error ? t.red : t.border}`,
                borderRadius: '10px', fontSize: '13px',
                color: t.text, fontFamily: 'monospace',
                transition: 'border-color 0.2s',
                boxShadow: inputFocused ? `0 0 0 3px ${t.accentSoft}` : 'none',
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              marginTop: '10px', padding: '10px 14px',
              background: t.redSoft, border: `1px solid ${t.redBorder}`,
              borderRadius: '8px', fontSize: '13px',
              color: t.red, display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              {error}
            </div>
          )}

          {/* Process button */}
          <button
            onClick={handleProcess}
            disabled={!isValid}
            style={{
              width: '100%', marginTop: '16px', padding: '14px',
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
            marginTop: '20px', padding: '14px 16px',
            background: t.id === 'dark' ? 'rgba(10,132,255,0.07)' : t.accentSoft,
            border: `1px solid ${t.accentBorder}`,
            borderRadius: '10px',
          }}>
            <div style={{
              fontSize: '11px', fontWeight: '600', textTransform: 'uppercase',
              letterSpacing: '0.6px', color: t.accentLight, marginBottom: '8px',
            }}>
              使用提示
            </div>
            {[
              'AI 自动识别废片镜头和重复内容',
              '处理时间取决于视频时长（每小时的视频需约 5–15 分钟）',
              '导出使用无损复制，不降低画质',
              '请确保系统已安装 ffmpeg',
            ].map((tip, i) => (
              <div key={i} style={{
                fontSize: '12px', color: t.textSub,
                padding: '2px 0', paddingLeft: '10px', position: 'relative',
              }}>
                <span style={{
                  position: 'absolute', left: 0, color: t.accentLight, fontSize: '10px',
                }}>›</span>
                {tip}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
