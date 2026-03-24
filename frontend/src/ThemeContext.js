import { createContext, useContext } from 'react'
import { darkTheme } from './theme.js'

export const ThemeContext = createContext(darkTheme)
export const useTheme = () => useContext(ThemeContext)
