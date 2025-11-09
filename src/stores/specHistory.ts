import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { OpenAPISpec } from '@/types/openapi'

interface SpecHistoryItem {
  id: string
  title: string
  version: string
  openapi: string
  spec: OpenAPISpec
  timestamp: number
}

const MAX_HISTORY_ITEMS = 50
const STORAGE_KEY = 'specHistory'

export const useSpecHistoryStore = defineStore('specHistory', () => {
  const history = ref<SpecHistoryItem[]>([])

  // Load history from localStorage
  const loadHistory = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Keep only the spec data, not the full object (to save space)
        history.value = parsed.map((item: SpecHistoryItem) => ({
          ...item,
          spec: item.spec, // Will be restored from storage
        }))
      }
    } catch (error) {
      console.error('Failed to load spec history:', error)
      history.value = []
    }
  }

  // Save history to localStorage
  const saveHistory = () => {
    try {
      // Only save the last MAX_HISTORY_ITEMS
      const itemsToSave = history.value.slice(0, MAX_HISTORY_ITEMS)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(itemsToSave))
    } catch (error) {
      console.error('Failed to save spec history:', error)
    }
  }

  // Add spec to history
  const addToHistory = (spec: OpenAPISpec) => {
    const title = spec.info?.title || 'Untitled Specification'
    const version = spec.info?.version || '1.0.0'
    const openapi = spec.openapi || '3.0.0'
    
    const newItem: SpecHistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      title,
      version,
      openapi,
      spec,
      timestamp: Date.now(),
    }

    // Remove if already exists (by title and version)
    history.value = history.value.filter(
      item => !(item.title === title && item.version === version)
    )

    // Add to beginning
    history.value.unshift(newItem)

    // Keep only MAX_HISTORY_ITEMS
    if (history.value.length > MAX_HISTORY_ITEMS) {
      history.value = history.value.slice(0, MAX_HISTORY_ITEMS)
    }

    saveHistory()
  }

  // Remove item from history
  const removeFromHistory = (id: string) => {
    history.value = history.value.filter(item => item.id !== id)
    saveHistory()
  }

  // Clear all history
  const clearHistory = () => {
    history.value = []
    saveHistory()
  }

  // Get spec by id
  const getSpecById = (id: string): OpenAPISpec | null => {
    const item = history.value.find(item => item.id === id)
    return item ? item.spec : null
  }

  // Initialize on store creation
  loadHistory()

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
    getSpecById,
    loadHistory,
  }
})

