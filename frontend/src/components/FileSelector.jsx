import React, { useState } from 'react'
import axios from 'axios'
import { useTheme } from '../ThemeContext.js'

// Static (non-color) styles
const staticStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '24px',
  },
  card: {
    borderRadius: '16px',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '560px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  icon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '16px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '8px',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '14px',
  },
  dropZone: {
    borderRadius: '12px',
    padding: '40px 24px',
    textAlign: 'center',
    marginBottom: '24px',
    transition: 'border-color 0.2s, background 0.2s',
    cursor: 'default',
  },
  dropIcon: {
    fontSize: '36px',
    marginBottom: '12px',
    display: 'block',
    opacity: 0.7,
  },
  dropText: {
    fontSize: '15px',
    marginBottom: '8px',
  },
  formatsText: {
    fontSize: '12px',
  },
  browseBtn: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'background 0.2s',
    marginBottom: '0',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '20px 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
  },
  dividerText: {
    fontSize: '12px',
    whiteSpace: 'nowrap',
  },
  inputLabel: {
    display: 'block',
    fontSize: '13px',
    marginBottom: '8px',
    fontWeight: '500',
  },
  input: {
    width: '100%',
    borderRadius: '8px',
    padding: '12px 14px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  button: {
    width: '100%',
    marginTop: '16px',
    padding: '14px',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    letterSpacing: '0.5px',
    transition: 'background 0.2s, transform 0.1s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  error: {
    marginTop: '12px',
    padding: '12px 14px',
    borderRadius: '8px',
    fontSize: '13px',
  },
  tips: {
    marginTop: '24px',
    padding: '16px',
    borderRadius: '8px',
  },
  tipsTitle: {
    fontSize: '12px',
    fontWeight: '600',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  tipsList: {
    listStyle: 'none',
    padding: 0,
  },
  tipsItem: {
    fontSize: '12px',
    padding: '3px 0',
    paddingLeft: '12px',
    position: 'relative',
  },
}

export default function FileSelector({ onProcess }) {
  const t = useTheme()
  const [filePath, setFilePath] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
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
    if (!trimmed) {
      setError('请输入视频文件路径')
      return
    }
    setError('')
    onProcess(trimmed)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleProcess()
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.path) {
        setFilePath(file.path)
        setError('')
      } else {
        setError('请直接输入文件路径（此为本地应用，不支持浏览器文件拖拽上传）')
      }
    }
  }

  const isValid = filePath.trim().length > 0

  // Theme-derived styles
  const cardStyle = {
    ...staticStyles.card,
    background: t.surface,
    border: `1px solid ${t.border}`,
  }

  const titleStyle = {
    ...staticStyles.title,
    color: t.id === 'dark' ? '#fff' : t.text,
  }

  const subtitleStyle = {
    ...staticStyles.subtitle,
    color: t.textDim,
  }

  const browseBtnStyle = {
    ...staticStyles.browseBtn,
    background: t.accentSoft,
    color: t.accentLight,
    border: `1px solid ${t.accentBorder}`,
    ...(browsing ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
  }

  const dividerLineStyle = {
    ...staticStyles.dividerLine,
    background: t.border,
  }

  const dividerTextStyle = {
    ...staticStyles.dividerText,
    color: t.textFaint,
  }

  const inputLabelStyle = {
    ...staticStyles.inputLabel,
    color: t.textSub,
  }

  const inputStyle = {
    ...staticStyles.input,
    background: t.surface2,
    border: `1px solid ${inputFocused ? t.accent : error ? t.red : (t.id === 'dark' ? '#374151' : t.border2)}`,
    color: t.text,
  }

  const buttonStyle = {
    ...staticStyles.button,
    background: isValid ? t.accent : (t.id === 'dark' ? '#374151' : t.border2),
    cursor: isValid ? 'pointer' : 'not-allowed',
    color: isValid ? '#fff' : t.textDim,
  }

  const errorStyle = {
    ...staticStyles.error,
    background: t.redSoft,
    border: `1px solid ${t.redBorder}`,
    color: t.id === 'dark' ? '#f87171' : t.red,
  }

  const tipsStyle = {
    ...staticStyles.tips,
    background: t.accentSoft,
    border: `1px solid ${t.accentBorder}`,
  }

  const tipsTitleStyle = {
    ...staticStyles.tipsTitle,
    color: t.accentLight,
  }

  const tipsItemStyle = {
    ...staticStyles.tipsItem,
    color: t.textDim,
  }

  return (
    <div style={staticStyles.container}>
      <div style={cardStyle}>
        <div style={staticStyles.header}>
          <span style={staticStyles.icon}>✂️</span>
          <h1 style={titleStyle}>视频粗剪助手</h1>
          <p style={subtitleStyle}>AI 自动识别并去除 NG 镜头，快速完成粗剪</p>
        </div>

        {/* Browse button */}
        <button
          style={browseBtnStyle}
          onClick={handleBrowse}
          disabled={browsing}
        >
          <span>📂</span>
          <span>{browsing ? '打开文件选择器...' : '选择视频文件'}</span>
        </button>

        <div style={staticStyles.divider}>
          <div style={dividerLineStyle} />
          <span style={dividerTextStyle}>或手动输入路径</span>
          <div style={dividerLineStyle} />
        </div>

        {/* File path input */}
        <label style={inputLabelStyle} htmlFor="file-path-input">
          视频文件路径
        </label>
        <input
          id="file-path-input"
          type="text"
          style={inputStyle}
          value={filePath}
          onChange={(e) => {
            setFilePath(e.target.value)
            if (error) setError('')
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          placeholder="/Users/username/Videos/my_video.mp4"
          spellCheck={false}
        />

        {error && <div style={errorStyle}>{error}</div>}

        {/* Process button */}
        <button
          style={buttonStyle}
          onClick={handleProcess}
          disabled={!isValid}
        >
          <span>🔍</span>
          <span>开始分析</span>
        </button>

        {/* Tips */}
        <div style={tipsStyle}>
          <div style={tipsTitleStyle}>使用提示</div>
          <ul style={staticStyles.tipsList}>
            <li style={tipsItemStyle}>· AI 会自动识别 NG 镜头和重复内容</li>
            <li style={tipsItemStyle}>· 处理时间取决于视频时长（每小时约 5-15 分钟）</li>
            <li style={tipsItemStyle}>· 导出使用无损复制，不会降低画质</li>
            <li style={tipsItemStyle}>· 请确保系统已安装 ffmpeg</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
