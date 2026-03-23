import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Global styles injected via JS to avoid needing a CSS file
const style = document.createElement('style')
style.textContent = `
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    background-color: #0f0f0f;
    color: #e5e7eb;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
      'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
    font-size: 14px;
    line-height: 1.5;
    min-height: 100vh;
  }

  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: #1a1a1a;
  }
  ::-webkit-scrollbar-thumb {
    background: #3f3f3f;
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #5f5f5f;
  }

  button {
    cursor: pointer;
    font-family: inherit;
  }

  input {
    font-family: inherit;
  }
`
document.head.appendChild(style)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
