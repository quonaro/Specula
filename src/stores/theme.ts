import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<'light' | 'dark'>('light')

  // Initialize theme from localStorage or system preference
  const initTheme = () => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light')
    
    theme.value = initialTheme
    document.documentElement.classList.toggle('dark', initialTheme === 'dark')
  }

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme.value === 'light' ? 'dark' : 'light'
    theme.value = newTheme
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  // Watch theme changes and save to localStorage
  watch(theme, (newTheme) => {
    localStorage.setItem('theme', newTheme)
  }, { immediate: true })

  return {
    theme,
    initTheme,
    toggleTheme,
  }
})

