// SF Symbols-inspired SVG icons

export const ScissorsIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="5.5" cy="6.5" r="2.5" stroke={color} strokeWidth="1.5"/>
    <circle cx="5.5" cy="17.5" r="2.5" stroke={color} strokeWidth="1.5"/>
    <path d="M8 8.5L20 4" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M8 15.5L20 20" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M14 12H20" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

export const FilmIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth="1.5"/>
    <path d="M7 4V20M17 4V20" stroke={color} strokeWidth="1.5"/>
    <path d="M2 8H7M17 8H22M2 12H7M17 12H22M2 16H7M17 16H22" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

export const WaveformIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M2 12H4M20 12H22" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M5 8V16" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M8 5V19" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M11 7V17" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M14 9V15" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M17 4V20" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M20 7V17" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

export const PlayIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M6 4.75L19.25 12L6 19.25V4.75Z" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const PauseIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <rect x="5" y="4" width="4.5" height="16" rx="1.5"/>
    <rect x="14.5" y="4" width="4.5" height="16" rx="1.5"/>
  </svg>
)

export const FolderOpenIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M3 7C3 5.9 3.9 5 5 5H9.5L11.5 7H19C20.1 7 21 7.9 21 9V17C21 18.1 20.1 19 19 19H5C3.9 19 3 18.1 3 17V7Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M3 11H21" stroke={color} strokeWidth="1.5"/>
  </svg>
)

export const ShareIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 3V15" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M8 7L12 3L16 7" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M4 13V19C4 20.1 4.9 21 6 21H18C19.1 21 20 20.1 20 19V13" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

export const SunIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="4.5" stroke={color} strokeWidth="1.5"/>
    <path d="M12 2V4M12 20V22M2 12H4M20 12H22M4.93 4.93L6.34 6.34M17.66 17.66L19.07 19.07M4.93 19.07L6.34 17.66M17.66 6.34L19.07 4.93" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

export const MoonIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const ChevronLeftIcon = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M15 18L9 12L15 6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const PlusIcon = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 5V19M5 12H19" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

export const CheckCircleIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5"/>
    <path d="M8 12L10.5 14.5L16 9" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const XCircleIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5"/>
    <path d="M15 9L9 15M9 9L15 15" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

export const SparklesIcon = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 2L13.8 8.2L20 10L13.8 11.8L12 18L10.2 11.8L4 10L10.2 8.2L12 2Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M19 16L19.8 18.2L22 19L19.8 19.8L19 22L18.2 19.8L16 19L18.2 18.2L19 16Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M5 3L5.6 4.8L7.4 5.4L5.6 6L5 7.8L4.4 6L2.6 5.4L4.4 4.8L5 3Z" stroke={color} strokeWidth="1.3" strokeLinejoin="round"/>
  </svg>
)

export const CutIcon = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="5" cy="7" r="2" stroke={color} strokeWidth="1.5"/>
    <circle cx="5" cy="17" r="2" stroke={color} strokeWidth="1.5"/>
    <path d="M7 8.5L22 4" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M7 15.5L22 20" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

export const MergeIcon = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 5V19" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M8 15L12 19L16 15" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 5H18" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

export const SearchIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="11" cy="11" r="7.5" stroke={color} strokeWidth="1.5"/>
    <path d="M21 21L16.8 16.8" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

export const RepeatIcon = ({ size = 12, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 2L21 6L17 10" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 11V9a4 4 0 0 1 4-4h14" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M7 22L3 18L7 14" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 13v2a4 4 0 0 1-4 4H3" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

export const BellIcon = ({ size = 12, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

export const MuteIcon = ({ size = 12, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 5L6 9H2v6h4l5 4V5z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="23" y1="9" x2="17" y2="15" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="17" y1="9" x2="23" y2="15" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

export const VideoClipIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M757.76 936.618667H255.317333a170.666667 170.666667 0 0 1-170.666666-170.666667V263.509333a170.666667 170.666667 0 0 1 170.666666-170.666666H757.76a170.666667 170.666667 0 0 1 170.666667 170.666666v502.442667a170.666667 170.666667 0 0 1-170.666667 170.666667zM255.317333 161.109333a102.4 102.4 0 0 0-102.4 102.4v502.442667a102.4 102.4 0 0 0 102.4 102.4H757.76a102.4 102.4 0 0 0 102.4-102.4V263.509333a102.4 102.4 0 0 0-102.4-102.4z" fill={color}/>
    <path d="M457.728 695.296a102.4 102.4 0 0 1-51.2-13.994667 102.4 102.4 0 0 1-51.2-88.746666V436.906667a102.4 102.4 0 0 1 153.6-88.746667l134.826667 77.824a102.4 102.4 0 0 1 0 177.493333L508.928 682.666667a102.4 102.4 0 0 1-51.2 12.629333z m0-292.522667a34.133333 34.133333 0 0 0-17.066667 4.437334 34.133333 34.133333 0 0 0-17.066666 29.696v155.648a34.133333 34.133333 0 0 0 51.2 29.696L609.621333 546.133333a34.133333 34.133333 0 0 0 17.066667-29.696 34.133333 34.133333 0 0 0-17.066667-29.354666l-134.826666-78.165334a34.133333 34.133333 0 0 0-17.066667-6.144z" fill={color}/>
  </svg>
)

export const InfoIcon = ({ size = 14, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5"/>
    <path d="M12 8V8.5" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 11V16" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)
