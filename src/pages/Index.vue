<template>
  <div v-if="specStore.specs.length === 0 || !tagTree" class="h-screen flex items-center justify-center">
    <div class="text-center space-y-4">
      <p class="text-lg text-muted-foreground">No specification loaded</p>
      <Button @click="router.push('/selection')">
        Go to Selection
      </Button>
    </div>
  </div>
  
  <div v-else class="flex h-screen w-full bg-background">
    <Sidebar
      :root="tagTree"
      :selected-operation="selectedOperation"
      @operation-select="handleOperationSelect"
      @group-select="handleGroupSelect"
    />
    
    <div class="flex-1 flex flex-col h-screen">
      <header class="border-b border-border bg-card">
        <div class="h-14 flex items-center justify-between px-6">
          <div class="flex items-center gap-3">
            <div>
              <h1 class="text-lg font-semibold text-foreground">
                {{ specStore.specs.length === 1 
                  ? (specStore.specs[0].spec?.info?.title || 'OpenAPI Specification')
                  : `${specStore.specs.length} Specifications` }}
              </h1>
              <p class="text-xs text-muted-foreground">
                {{ specStore.specs.length === 1
                  ? `v${specStore.specs[0].spec?.info?.version || '1.0.0'} | OpenAPI ${specStore.specs[0].spec?.openapi}`
                  : 'Multiple specifications loaded' }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              @click="handleBackToSelection"
            >
              <ArrowLeft class="h-4 w-4 mr-2" />
              Back to Selection
            </Button>
            <Button variant="outline" size="sm" @click="handleDownload">
              <Download class="h-4 w-4 mr-2" />
              Download
            </Button>
            <ThemeToggle />
          </div>
        </div>
        
        <!-- Global info banner -->
        <div
          v-if="specStore.specs.length === 1 && specStore.specs[0].spec && (specStore.specs[0].spec.info.description || (specStore.specs[0].spec.servers && specStore.specs[0].spec.servers.length > 0) || specStore.specs[0].spec.externalDocs)"
          class="px-6 py-3 bg-muted/30 border-t border-border text-sm space-y-2"
        >
          <p v-if="specStore.specs[0].spec.info.description" class="text-muted-foreground">
            {{ specStore.specs[0].spec.info.description }}
          </p>
          <div v-if="specStore.specs[0].spec.servers && specStore.specs[0].spec.servers.length > 0" class="flex items-center gap-2 flex-wrap">
            <span class="font-medium">Servers:</span>
            <code
              v-for="(server, idx) in specStore.specs[0].spec.servers"
              :key="idx"
              class="px-2 py-0.5 bg-code-bg rounded text-xs"
            >
              {{ server.url }}
            </code>
          </div>
          <a
            v-if="specStore.specs[0].spec.externalDocs"
            :href="specStore.specs[0].spec.externalDocs.url"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary hover:underline inline-flex items-center gap-1"
          >
            📖 {{ specStore.specs[0].spec.externalDocs.description || 'External Documentation' }}
          </a>
        </div>
      </header>

      <main class="flex-1 overflow-hidden">
        <GroupEndpointsView
          v-if="selectedGroup"
          :group-node="selectedGroup"
          :selected-operation="selectedOperation"
          @select-operation="handleOperationSelect"
        />
        <OperationView
          v-else-if="operationDetails"
          :method="operationDetails.method"
          :path="operationDetails.path"
          :operation="operationDetails.operation"
          :spec="operationDetails.spec"
        />
        <div v-else class="flex items-center justify-center h-full">
          <div class="text-center space-y-2">
            <img src="/logo.png" alt="Logo" class="mx-auto h-16 w-16 logo-image-opacity" />
            <p class="text-lg font-medium text-foreground">
              Select an operation
            </p>
            <p class="text-sm text-muted-foreground">
              Choose an endpoint from the sidebar to view details
            </p>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Download, ArrowLeft } from 'lucide-vue-next'
import Sidebar from '@/components/Sidebar.vue'
import OperationView from '@/components/OperationView.vue'
import GroupEndpointsView from '@/components/GroupEndpointsView.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import Button from '@/components/ui/Button.vue'
import { useToast } from '@/composables/useToast'
import { useSpecStore } from '@/stores/spec'
import { useSpecCacheStore, isHash } from '@/stores/specCache'
import { useSpecHistoryStore } from '@/stores/specHistory'
import type { OpenAPISpec, TagNode, Operation } from '@/types/openapi'
import { parseOpenAPISpec, parseMultipleSpecs, findNodeByPath, findNodeBySlug, toSlug, endpointPathToSlug, slugToEndpointPath } from '@/utils/openapi-parser'

const route = useRoute()
const router = useRouter()
const { toast } = useToast()
const specStore = useSpecStore()
const specCacheStore = useSpecCacheStore()
const specHistoryStore = useSpecHistoryStore()
const tagTree = ref<TagNode | null>(null)
const selectedOperation = ref<{ method: string; path: string } | null>(null)
const selectedGroup = ref<TagNode | null>(null)

// Restore state from route
const restoreStateFromRoute = () => {
  if (!tagTree.value) return
  
  const path = route.path
  
  if (path.startsWith('/group/')) {
    const groupSlug = route.params.groupPath as string
    const node = findNodeBySlug(tagTree.value, groupSlug)
    if (node) {
      selectedGroup.value = node
      selectedOperation.value = null
    } else {
      // Group not found, redirect to home
      router.replace('/')
    }
  } else if (path.startsWith('/endpoint/')) {
    const method = (route.params.method as string).toUpperCase()
    const endpointSlug = route.params.path as string
    
    // Convert slug back to endpoint path
    const endpointPath = slugToEndpointPath(endpointSlug)
    
    // Verify endpoint exists in any spec
    let foundPath: string | null = null
    let foundSpec: OpenAPISpec | null = null
    
    for (const specWithSource of specStore.specs) {
      if (specWithSource.spec.paths[endpointPath]) {
        const pathItem = specWithSource.spec.paths[endpointPath]
        const operation = pathItem[method.toLowerCase() as keyof typeof pathItem]
        if (operation) {
          foundPath = endpointPath
          foundSpec = specWithSource.spec
          break
        }
      }
    }
    
    if (foundPath && foundSpec) {
      selectedOperation.value = { method, path: foundPath }
      selectedGroup.value = null
    } else {
      // Try to find by matching slug pattern
      // Search through all paths in all specs to find matching endpoint
      for (const specWithSource of specStore.specs) {
        for (const [path, pathItem] of Object.entries(specWithSource.spec.paths)) {
          const pathSlug = endpointPathToSlug(path)
          if (pathSlug === endpointSlug) {
            const op = pathItem[method.toLowerCase() as keyof typeof pathItem]
            if (op) {
              foundPath = path
              foundSpec = specWithSource.spec
              break
            }
          }
        }
        if (foundPath) break
      }
      
      if (foundPath && foundSpec) {
        selectedOperation.value = { method, path: foundPath }
        selectedGroup.value = null
      } else {
        // Endpoint not found, redirect to home
        router.replace('/')
      }
    }
  } else if (path === '/') {
    selectedOperation.value = null
    selectedGroup.value = null
  }
}

// Update URL when specs change (but not when loading from URL to avoid loop)
let isLoadingFromUrl = false

// Update URL with current specs
const updateUrlWithSpecs = (specs: typeof specStore.specs) => {
  const query: Record<string, string | string[]> = { ...route.query }
  
  // Build spec parameters array
  const specParams: string[] = []
  for (const specWithSource of specs) {
    if (specWithSource.sourceUrl) {
      // Use sourceUrl if available
      specParams.push(specWithSource.sourceUrl)
    } else {
      // Try to find hash in cache
      const cachedSpecs = Array.from(specCacheStore.cache.values())
      const cached = cachedSpecs.find(c => 
        JSON.stringify(c.spec) === JSON.stringify(specWithSource.spec)
      )
      if (cached) {
        specParams.push(cached.hash)
      }
    }
  }
  
  if (specParams.length > 0) {
    query.spec = specParams.length === 1 ? specParams[0] : specParams
  } else {
    delete query.spec
  }
  
  // Update URL without triggering navigation
  router.replace({ path: route.path, query })
}

// Load specs from URL parameter
const loadSpecsFromUrl = async () => {
  // Get all spec parameters (can be array from ?spec=...&spec=... or single value)
  const specParams = route.query.spec
  if (!specParams) {
    // If no spec parameter, check if we have specs in store
    if (specStore.specs.length === 0 && route.path !== '/selection') {
      router.push('/selection')
    }
    return
  }

  isLoadingFromUrl = true

  // Handle both single value and array of values
  let specValues: string[] = []
  if (Array.isArray(specParams)) {
    specValues = specParams.map(val => decodeURIComponent(val as string).trim())
  } else {
    // Also handle comma-separated values
    specValues = specParams.split(',').map(val => decodeURIComponent(val.trim()))
  }

  if (specValues.length === 0) return

  try {
    const loadedSpecs = []
    for (const value of specValues) {
      try {
        let spec: OpenAPISpec
        let sourceUrl: string | undefined
        let title: string

        // Check if value is a hash (16 hex characters) or a URL
        if (isHash(value)) {
          // Load from cache
          const cachedSpec = specCacheStore.getByHash(value)
          if (!cachedSpec) {
            toast({
              title: 'Cache miss',
              description: `Specification with hash ${value} not found in cache`,
              variant: 'destructive',
            })
            continue
          }
          spec = cachedSpec
          const cached = specCacheStore.getCachedSpec(value)
          title = cached?.title || spec.info?.title || 'Untitled Specification'
        } else {
          // Load from URL
          const response = await fetch(value)
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          spec = await response.json()
          sourceUrl = value
          title = spec.info?.title || 'Untitled Specification'
        }

        loadedSpecs.push({
          spec,
          sourceUrl,
          title,
        })
      } catch (error: any) {
        toast({
          title: 'Failed to load spec',
          description: `Could not load specification from ${value}: ${error.message}`,
          variant: 'destructive',
        })
      }
    }

    if (loadedSpecs.length > 0) {
      specStore.setSpecs(loadedSpecs)
      toast({
        title: 'Loaded',
        description: `Loaded ${loadedSpecs.length} specification(s)`,
      })
    }
  } catch (error: any) {
    toast({
      title: 'Error',
      description: error.message || 'Failed to load specifications',
      variant: 'destructive',
    })
  } finally {
    isLoadingFromUrl = false
  }
}

watch(() => specStore.specs, (newSpecs) => {
  if (newSpecs.length > 0) {
    if (newSpecs.length === 1) {
      // Single spec - use regular parsing
      tagTree.value = parseOpenAPISpec(newSpecs[0].spec)
    } else {
      // Multiple specs - use multi-spec parsing
      tagTree.value = parseMultipleSpecs(newSpecs)
    }
    
    // Add to history when specs are successfully loaded and displayed
    // This ensures only viewed specs are in history
    if (tagTree.value) {
      newSpecs.forEach(specWithSource => {
        specHistoryStore.addToHistory(specWithSource.spec)
      })
    }
    
    // Update URL with spec parameters if not loading from URL
    if (!isLoadingFromUrl) {
      updateUrlWithSpecs(newSpecs)
    }
    
    // Restore state from URL after tree is built
    restoreStateFromRoute()
  } else {
    tagTree.value = null
    // Redirect to selection if no spec
    if (route.path !== '/selection') {
      router.push('/selection')
    }
  }
}, { immediate: true })

// Watch for spec parameter in URL
watch(() => route.query.spec, () => {
  loadSpecsFromUrl()
}, { immediate: true })

// Watch route changes to update state
watch(() => route.path, () => {
  restoreStateFromRoute()
})

const handleDownload = () => {
  if (specStore.specs.length === 0) return

  // If single spec, download it. If multiple, download as array
  const data = specStore.specs.length === 1 
    ? specStore.specs[0].spec 
    : specStore.specs.map(s => s.spec)
  
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = specStore.specs.length === 1
    ? `${specStore.specs[0].spec.info?.title || 'openapi'}.json`
    : 'openapi-specs.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  toast({
    title: 'Downloaded',
    description: 'OpenAPI specification downloaded successfully',
  })
}

const handleOperationSelect = (method: string, path: string) => {
  // Update URL with slug - state will be restored from route
  const slug = endpointPathToSlug(path)
  const methodLower = method.toLowerCase()
  router.push(`/endpoint/${methodLower}/${slug}`)
}

const handleGroupSelect = (node: TagNode) => {
  // Update URL with slug - state will be restored from route
  const slug = toSlug(node.fullPath)
  router.push(`/group/${slug}`)
}

const handleBackToSelection = () => {
  selectedOperation.value = null
  selectedGroup.value = null
  router.push('/selection')
}

const operationDetails = computed(() => {
  if (specStore.specs.length === 0 || !selectedOperation.value) return null

  // Find the spec that contains this operation
  for (const specWithSource of specStore.specs) {
    const pathItem = specWithSource.spec.paths[selectedOperation.value.path]
    if (pathItem) {
      const operation = pathItem[selectedOperation.value.method.toLowerCase() as keyof typeof pathItem] as Operation | undefined
      if (operation) {
        return {
          method: selectedOperation.value.method,
          path: selectedOperation.value.path,
          operation,
          spec: specWithSource.spec,
        }
      }
    }
  }

  return null
})
</script>

