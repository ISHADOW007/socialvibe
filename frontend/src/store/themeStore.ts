import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  initializeTheme: () => void
}

// Get system theme preference
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// Resolve theme based on current setting
const resolveTheme = (theme: Theme): 'light' | 'dark' => {
  if (theme === 'system') {
    return getSystemTheme()
  }
  return theme
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark', // Default to dark theme for SocialVibe
      resolvedTheme: 'dark',

      setTheme: (theme: Theme) => {
        const resolved = resolveTheme(theme)
        
        set({ theme, resolvedTheme: resolved })
        
        // Apply theme to document
        if (resolved === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      },

      toggleTheme: () => {
        const { theme } = get()
        let newTheme: Theme
        
        if (theme === 'light') {
          newTheme = 'dark'
        } else if (theme === 'dark') {
          newTheme = 'light'
        } else {
          // If system theme, toggle to opposite of current resolved theme
          const { resolvedTheme } = get()
          newTheme = resolvedTheme === 'light' ? 'dark' : 'light'
        }
        
        // Use setTheme to apply the new theme
        get().setTheme(newTheme)
      },

      initializeTheme: () => {
        const { theme } = get()
        const resolved = resolveTheme(theme)
        
        set({ resolvedTheme: resolved })
        
        // Apply theme to document
        if (resolved === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
        
        // Listen for system theme changes
        if (typeof window !== 'undefined' && theme === 'system') {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
          
          const handleChange = (e: MediaQueryListEvent) => {
            const newResolved = e.matches ? 'dark' : 'light'
            set({ resolvedTheme: newResolved })
            
            if (newResolved === 'dark') {
              document.documentElement.classList.add('dark')
            } else {
              document.documentElement.classList.remove('dark')
            }
          }
          
          mediaQuery.addEventListener('change', handleChange)
          
          // Cleanup function
          return () => mediaQuery.removeEventListener('change', handleChange)
        }
      },
    }),
    {
      name: 'socialvibe-theme',
      partialize: (state) => ({
        theme: state.theme,
      }),
    }
  )
)