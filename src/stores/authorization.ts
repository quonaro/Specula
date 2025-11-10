import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { OpenAPISpec } from '@/types/openapi'

interface AuthorizationCredentials {
  [scheme: string]: string
}

interface SpecAuthorization {
  specId: string // hash or sourceUrl
  credentials: AuthorizationCredentials
  isLocked: boolean
}

const STORAGE_KEY = 'specula-authorizations'

export const useAuthorizationStore = defineStore('authorization', () => {
  const authorizations = ref<Map<string, SpecAuthorization>>(new Map())

  // Load authorizations from localStorage
  const loadAuthorizations = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as SpecAuthorization[]
        const authMap = new Map<string, SpecAuthorization>()
        parsed.forEach(item => {
          authMap.set(item.specId, item)
        })
        authorizations.value = authMap
      }
    } catch (error) {
      console.error('Failed to load authorizations:', error)
      authorizations.value = new Map()
    }
  }

  // Save authorizations to localStorage
  const saveAuthorizations = () => {
    try {
      const items = Array.from(authorizations.value.values())
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch (error) {
      console.error('Failed to save authorizations:', error)
    }
  }

  // Get spec ID from spec (use sourceUrl or generate hash)
  const getSpecId = (spec: OpenAPISpec, sourceUrl?: string): string => {
    if (sourceUrl) {
      return sourceUrl
    }
    // Generate a simple hash from spec content
    const specStr = JSON.stringify(spec)
    let hash = 0
    for (let i = 0; i < specStr.length; i++) {
      const char = specStr.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return `hash-${Math.abs(hash).toString(16)}`
  }

  // Get authorization for spec
  const getAuthorization = (spec: OpenAPISpec, sourceUrl?: string): SpecAuthorization | null => {
    const specId = getSpecId(spec, sourceUrl)
    return authorizations.value.get(specId) || null
  }

  // Set authorization credentials for a scheme
  const setCredential = (spec: OpenAPISpec, sourceUrl: string | undefined, scheme: string, credential: string) => {
    const specId = getSpecId(spec, sourceUrl)
    const existing = authorizations.value.get(specId)
    
    const auth: SpecAuthorization = {
      specId,
      credentials: {
        ...(existing?.credentials || {}),
        [scheme]: credential,
      },
      isLocked: existing?.isLocked ?? false,
    }
    
    authorizations.value.set(specId, auth)
    saveAuthorizations()
  }

  // Get credential for a scheme
  const getCredential = (spec: OpenAPISpec, sourceUrl: string | undefined, scheme: string): string => {
    const auth = getAuthorization(spec, sourceUrl)
    return auth?.credentials[scheme] || ''
  }

  // Toggle lock state
  const toggleLock = (spec: OpenAPISpec, sourceUrl: string | undefined) => {
    const specId = getSpecId(spec, sourceUrl)
    const existing = authorizations.value.get(specId)
    
    const auth: SpecAuthorization = {
      specId,
      credentials: existing?.credentials || {},
      isLocked: !(existing?.isLocked ?? false),
    }
    
    authorizations.value.set(specId, auth)
    saveAuthorizations()
  }

  // Get lock state
  const isLocked = (spec: OpenAPISpec, sourceUrl: string | undefined): boolean => {
    const auth = getAuthorization(spec, sourceUrl)
    return auth?.isLocked ?? false
  }

  // Get all credentials for spec
  const getCredentials = (spec: OpenAPISpec, sourceUrl: string | undefined): AuthorizationCredentials => {
    const auth = getAuthorization(spec, sourceUrl)
    return auth?.credentials || {}
  }

  // Initialize on store creation
  loadAuthorizations()

  return {
    authorizations,
    getCredential,
    setCredential,
    getCredentials,
    toggleLock,
    isLocked,
    loadAuthorizations,
    saveAuthorizations,
  }
})

