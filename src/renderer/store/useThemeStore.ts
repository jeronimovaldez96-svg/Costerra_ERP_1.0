import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'dark' | 'light'

interface ThemeState {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark', // Default to dark mode for the premium feel
      toggleTheme: () =>
        set((state) => {
          const newTheme = state.theme === 'dark' ? 'light' : 'dark'
          applyThemeClass(newTheme)
          return { theme: newTheme }
        }),
      setTheme: (theme) => {
        applyThemeClass(theme)
        set({ theme })
      }
    }),
    {
      name: 'costerra-theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyThemeClass(state.theme)
        }
      }
    }
  )
)

function applyThemeClass(theme: Theme) {
  if (typeof window !== 'undefined') {
    const root = window.document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }
}
