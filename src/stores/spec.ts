import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { OpenAPISpec } from '@/types/openapi'

export interface SpecWithSource {
  spec: OpenAPISpec
  sourceUrl?: string
  title: string
}

export const useSpecStore = defineStore('spec', () => {
  const specs = ref<SpecWithSource[]>([])

  const spec = computed(() => {
    // For backward compatibility, return first spec if only one exists
    return specs.value.length === 1 ? specs.value[0].spec : null
  })

  const setSpec = (newSpec: OpenAPISpec, sourceUrl?: string) => {
    const title = newSpec.info?.title || 'Untitled Specification'
    specs.value = [{ spec: newSpec, sourceUrl, title }]
  }

  const setSpecs = (newSpecs: SpecWithSource[]) => {
    specs.value = newSpecs
  }

  const addSpec = (newSpec: OpenAPISpec, sourceUrl?: string) => {
    const title = newSpec.info?.title || 'Untitled Specification'
    specs.value.push({ spec: newSpec, sourceUrl, title })
  }

  const clearSpecs = () => {
    specs.value = []
  }

  return {
    spec,
    specs,
    setSpec,
    setSpecs,
    addSpec,
    clearSpecs,
  }
})

