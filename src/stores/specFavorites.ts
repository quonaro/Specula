import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { OpenAPISpec } from '@/types/openapi'

interface FavoriteSpec {
  hash: string
  spec: OpenAPISpec
  title: string
  timestamp: number
}

const STORAGE_KEY = 'specFavorites'

// Generate a 16-character hash (hexadecimal)
function generateHash(): string {
  // Use crypto if available, otherwise fallback to Math.random
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(8)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').substring(0, 16)
  } else {
    // Fallback for environments without crypto - generate 16 hex chars
    let hash = ''
    for (let i = 0; i < 16; i++) {
      hash += Math.floor(Math.random() * 16).toString(16)
    }
    return hash
  }
}

export const useSpecFavoritesStore = defineStore('specFavorites', () => {
  const favorites = ref<Map<string, FavoriteSpec>>(new Map())

  // Load favorites from localStorage
  const loadFavorites = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as FavoriteSpec[]
        const favoritesMap = new Map<string, FavoriteSpec>()
        parsed.forEach(item => {
          favoritesMap.set(item.hash, item)
        })
        favorites.value = favoritesMap
      }
    } catch (error) {
      console.error('Failed to load spec favorites:', error)
      favorites.value = new Map()
    }
  }

  // Save favorites to localStorage
  const saveFavorites = () => {
    try {
      const items = Array.from(favorites.value.values())
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch (error) {
      console.error('Failed to save spec favorites:', error)
    }
  }

  // Add spec to favorites and return hash
  const addToFavorites = (spec: OpenAPISpec, hash?: string): string => {
    const specHash = hash || generateHash()
    const title = spec.info?.title || 'Untitled Specification'
    
    const favoriteSpec: FavoriteSpec = {
      hash: specHash,
      spec,
      title,
      timestamp: Date.now(),
    }

    favorites.value.set(specHash, favoriteSpec)
    saveFavorites()

    return specHash
  }

  // Get spec by hash
  const getByHash = (hash: string): OpenAPISpec | null => {
    const favorite = favorites.value.get(hash)
    return favorite ? favorite.spec : null
  }

  // Get favorite spec with metadata
  const getFavoriteSpec = (hash: string): FavoriteSpec | null => {
    return favorites.value.get(hash) || null
  }

  // Remove from favorites
  const removeFromFavorites = (hash: string) => {
    favorites.value.delete(hash)
    saveFavorites()
  }

  // Check if hash is in favorites
  const isFavorite = (hash: string): boolean => {
    return favorites.value.has(hash)
  }

  // Clear all favorites
  const clearFavorites = () => {
    favorites.value.clear()
    saveFavorites()
  }

  // Initialize on store creation
  loadFavorites()

  return {
    favorites,
    addToFavorites,
    getByHash,
    getFavoriteSpec,
    removeFromFavorites,
    isFavorite,
    clearFavorites,
    loadFavorites,
  }
})

