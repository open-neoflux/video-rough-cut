import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

const style = document.createElement('style')
style.textContent = `
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html { -webkit-text-size-adjust: 100%; }

  body {
    background-color: #f2f2f7;
    color: #000;
    font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB',
      'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(120,120,128,0.28); border-radius: 10px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(120,120,128,0.45); }

  button {
    cursor: pointer;
    font-family: inherit;
    -webkit-font-smoothing: antialiased;
    outline: none;
  }
  button:focus-visible {
    outline: 2px solid #0A84FF;
    outline-offset: 2px;
  }

  input, textarea {
    font-family: inherit;
    -webkit-font-smoothing: antialiased;
    outline: none;
  }
  input:focus-visible {
    outline: none;
  }

  ::selection {
    background: rgba(10,132,255,0.3);
  }
`
document.head.appendChild(style)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
