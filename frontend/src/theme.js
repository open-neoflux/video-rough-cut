// Apple HIG color system — exact iOS/macOS values

export const darkTheme = {
  id: 'dark',
  // Backgrounds
  bg: '#000000',
  surface: '#1c1c1e',
  surface2: '#2c2c2e',
  surface3: '#3a3a3c',
  surfaceHover: 'rgba(255,255,255,0.05)',
  surfaceGlass: 'rgba(28,28,30,0.8)',
  // Borders
  border: 'rgba(84,84,88,0.65)',
  border2: 'rgba(84,84,88,0.35)',
  // Text
  text: '#ffffff',
  textSub: 'rgba(235,235,245,0.90)',
  textDim: 'rgba(235,235,245,0.72)',
  textFaint: 'rgba(235,235,245,0.52)',
  textMuted: 'rgba(235,235,245,0.28)',   // 专用于已删除片段文字
  // Accent (iOS Blue dark)
  accent: '#0A84FF',
  accentHover: '#409CFF',
  accentSoft: 'rgba(10,132,255,0.15)',
  accentBorder: 'rgba(10,132,255,0.35)',
  accentLight: '#409CFF',
  // Semantic
  green: '#30D158',
  greenSoft: 'rgba(48,209,88,0.14)',
  greenBorder: 'rgba(48,209,88,0.3)',
  red: '#FF453A',
  redSoft: 'rgba(255,69,58,0.12)',
  redBorder: 'rgba(255,69,58,0.28)',
  orange: '#FF9F0A',
  orangeSoft: 'rgba(255,159,10,0.14)',
  orangeBorder: 'rgba(255,159,10,0.32)',
}

export const lightTheme = {
  id: 'light',
  // Backgrounds
  bg: '#f2f2f7',
  surface: '#ffffff',
  surface2: '#f2f2f7',
  surface3: '#e5e5ea',
  surfaceHover: 'rgba(60,60,67,0.04)',
  surfaceGlass: 'rgba(242,242,247,0.85)',
  // Borders
  border: 'rgba(60,60,67,0.18)',
  border2: 'rgba(60,60,67,0.1)',
  // Text
  text: '#000000',
  textSub: 'rgba(60,60,67,0.86)',
  textDim: 'rgba(60,60,67,0.70)',
  textFaint: 'rgba(60,60,67,0.48)',
  textMuted: 'rgba(60,60,67,0.28)',      // 专用于已删除片段文字
  // Accent (iOS Blue light)
  accent: '#007AFF',
  accentHover: '#0071E3',
  accentSoft: 'rgba(0,122,255,0.08)',
  accentBorder: 'rgba(0,122,255,0.2)',
  accentLight: '#0071E3',
  // Semantic
  green: '#34C759',
  greenSoft: 'rgba(52,199,89,0.1)',
  greenBorder: 'rgba(52,199,89,0.25)',
  red: '#FF3B30',
  redSoft: 'rgba(255,59,48,0.07)',
  redBorder: 'rgba(255,59,48,0.2)',
  orange: '#FF9500',
  orangeSoft: 'rgba(255,149,0,0.09)',
  orangeBorder: 'rgba(255,149,0,0.25)',
}
