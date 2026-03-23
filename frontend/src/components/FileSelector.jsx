import React, { useState } from 'react'
import axios from 'axios'

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '24px',
  },
  card: {
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
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
    color: '#fff',
    marginBottom: '8px',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
  },
  dropZone: {
    border: '2px dashed #374151',
    borderRadius: '12px',
    padding: '40px 24px',
    textAlign: 'center',
    marginBottom: '24px',
    transition: 'border-color 0.2s, background 0.2s',
    cursor: 'default',
  },
  dropZoneActive: {
    borderColor: '#6366f1',
    background: 'rgba(99, 102, 241, 0.05)',
  },
  dropIcon: {
    fontSize: '36px',
    marginBottom: '12px',
    display: 'block',
    opacity: 0.7,
  },
  dropText: {
    fontSize: '15px',
    color: '#9ca3af',
    marginBottom: '8px',
  },
  formatsText: {
    fontSize: '12px',
    color: '#4b5563',
  },
  browseBtn: {
    width: '100%',
    padding: '12px',
    background: 'rgba(99,102,241,0.1)',
    color: '#818cf8',
    border: '1px solid rgba(99,102,241,0.3)',
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
    background: '#2a2a2a',
  },
  dividerText: {
    color: '#4b5563',
    fontSize: '12px',
    whiteSpace: 'nowrap',
  },
  inputLabel: {
    display: 'block',
    fontSize: '13px',
    color: '#9ca3af',
    marginBottom: '8px',
    fontWeight: '500',
  },
  input: {
    width: '100%',
    background: '#111',
    border: '1px solid #374151',
    borderRadius: '8px',
    padding: '12px 14px',
    color: '#e5e7eb',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  button: {
    width: '100%',
    marginTop: '16px',
    padding: '14px',
    background: '#6366f1',
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
  buttonDisabled: {
    background: '#374151',
    cursor: 'not-allowed',
  },
  error: {
    marginTop: '12px',
    padding: '12px 14px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    color: '#f87171',
    fontSize: '13px',
  },
  tips: {
    marginTop: '24px',
    padding: '16px',
    background: 'rgba(99, 102, 241, 0.05)',
    border: '1px solid rgba(99, 102, 241, 0.15)',
    borderRadius: '8px',
  },
  tipsTitle: {
    fontSize: '12px',
    color: '#818cf8',
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
    color: '#6b7280',
    padding: '3px 0',
    paddingLeft: '12px',
    position: 'relative',
  },
}

export default function FileSelector({ onProcess }) {
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
      // In Electron or local contexts this may work
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

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <span style={styles.icon}>✂️</span>
          <h1 style={styles.title}>视频粗剪助手</h1>
          <p style={styles.subtitle}>AI 自动识别并去除 NG 镜头，快速完成粗剪</p>
        </div>

        {/* Browse button */}
        <button
          style={{
            ...styles.browseBtn,
            ...(browsing ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
          }}
          onClick={handleBrowse}
          disabled={browsing}
        >
          <span>📂</span>
          <span>{browsing ? '打开文件选择器...' : '选择视频文件'}</span>
        </button>

        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>或手动输入路径</span>
          <div style={styles.dividerLine} />
        </div>

        {/* File path input */}
        <label style={styles.inputLabel} htmlFor="file-path-input">
          视频文件路径
        </label>
        <input
          id="file-path-input"
          type="text"
          style={{
            ...styles.input,
            borderColor: inputFocused ? '#6366f1' : error ? '#ef4444' : '#374151',
          }}
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

        {error && <div style={styles.error}>{error}</div>}

        {/* Process button */}
        <button
          style={{
            ...styles.button,
            ...(isValid ? {} : styles.buttonDisabled),
          }}
          onClick={handleProcess}
          disabled={!isValid}
        >
          <span>🔍</span>
          <span>开始分析</span>
        </button>

        {/* Tips */}
        <div style={styles.tips}>
          <div style={styles.tipsTitle}>使用提示</div>
          <ul style={styles.tipsList}>
            <li style={styles.tipsItem}>· AI 会自动识别 NG 镜头和重复内容</li>
            <li style={styles.tipsItem}>· 处理时间取决于视频时长（每小时约 5-15 分钟）</li>
            <li style={styles.tipsItem}>· 导出使用无损复制，不会降低画质</li>
            <li style={styles.tipsItem}>· 请确保系统已安装 ffmpeg</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
