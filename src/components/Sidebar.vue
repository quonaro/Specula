<template>
  <div class="w-80 border-r border-sidebar-border bg-sidebar h-screen flex flex-col">
    <div class="p-4 border-b border-sidebar-border">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <img :src="logoUrl" alt="Logo" class="h-8 logo-image" />
          <span class="text-lg font-semibold text-sidebar-foreground">Specula</span>
        </div>
        <a
          href="https://github.com/quonaro/Specula"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center justify-center p-1.5 rounded-md text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          title="GitHub Repository"
        >
          <Github class="h-4 w-4" />
        </a>
      </div>

      <!-- View Toggle Buttons -->
      <div class="flex gap-1 mb-3 p-1 bg-sidebar-accent/30 rounded-md">
        <button
          :class="[
            'flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors',
            viewMode === 'endpoints'
              ? 'bg-sidebar-accent text-sidebar-foreground shadow-sm'
              : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
          ]"
          @click="viewMode = 'endpoints'"
        >
          Endpoints
        </button>
        <button
          :class="[
            'flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors',
            viewMode === 'history'
              ? 'bg-sidebar-accent text-sidebar-foreground shadow-sm'
              : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
          ]"
          @click="viewMode = 'history'"
        >
          History
        </button>
      </div>

      <!-- Endpoints View -->
      <div v-if="viewMode === 'endpoints'" class="space-y-2">
        <!-- Filters - Collapsible -->
        <div>
          <button @click="filtersExpanded = !filtersExpanded"
            class="w-full flex items-center justify-between py-1.5 text-xs font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors">
            <span>Filters</span>
            <ChevronDown
              :class="['h-3.5 w-3.5 transition-transform duration-200', filtersExpanded ? 'rotate-180' : '']" />
          </button>

          <div v-show="filtersExpanded" class="mt-2 space-y-2 animate-in slide-in-from-top-2 duration-200">
            <!-- Security Filter -->
            <div>
              <label class="text-xs text-sidebar-foreground/70 mb-1.5 block">Security</label>
              <select v-model="securityFilter"
                class="w-full h-8 rounded-md border border-sidebar-border bg-sidebar px-2 text-xs text-sidebar-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="all">All security</option>
                <option value="private">Protected only</option>
                <option value="public">Public only</option>
              </select>
            </div>

            <!-- Method Filter -->
            <div>
              <label class="text-xs text-sidebar-foreground/70 mb-1.5 block">Method</label>
              <div class="flex flex-wrap gap-1.5">
                <button v-for="method in availableMethods" :key="method" :class="[
                  'px-2.5 py-1 text-xs font-bold rounded transition-all text-white',
                  selectedMethods.has(method)
                    ? getMethodColorClass(method)
                    : `${getMethodColorClass(method)} opacity-50 hover:opacity-75`
                ]" @click="toggleMethod(method)">
                  {{ method }}
                </button>
              </div>
            </div>

            <!-- Clear Filters Button -->
            <button
              @click="clearFilters"
              class="w-full px-3 py-1.5 text-xs rounded-md border border-sidebar-border bg-sidebar hover:bg-sidebar-accent text-sidebar-foreground transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      <!-- History View -->
      <RequestHistoryView
        v-else
        ref="historyViewRef"
        :selected-item="selectedHistoryItem"
        @select="handleHistorySelect"
      />
    </div>

    <!-- Content Area for History -->
    <ScrollArea v-if="viewMode === 'history'" class="flex-1">
      <div class="p-2 space-y-1">
        <div v-if="filteredHistory.length === 0" class="p-4 text-center text-sm text-muted-foreground">
          <p v-if="historyStore.history.length === 0">No requests yet</p>
          <p v-else>No requests match the filters</p>
        </div>
        <div
          v-for="item in filteredHistory"
          :key="item.id"
          :class="[
            'group flex items-start gap-2 p-2 rounded-md cursor-pointer transition-colors',
            selectedHistoryItem?.id === item.id
              ? 'bg-sidebar-accent'
              : 'hover:bg-sidebar-accent/50'
          ]"
          @click="handleHistorySelect(item)"
        >
          <div class="flex flex-col gap-1 shrink-0">
            <span
              :class="[
                'text-xs font-bold px-2 py-0.5 rounded text-white w-14 text-center',
                getMethodColorClass(item.method)
              ]"
            >
              {{ item.method }}
            </span>
            <Tooltip
              v-if="item.status || item.error"
              :content="getResponseTooltip(item)"
              position="right"
              :delay="300"
            >
              <span
                :class="[
                  'text-xs font-bold px-2 py-0.5 rounded text-white w-14 text-center cursor-help',
                  item.error ? 'bg-red-600' : getStatusColorClass(item.status || 0)
                ]"
              >
                {{ item.status || 'ERR' }}
              </span>
            </Tooltip>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-sidebar-foreground truncate" :title="item.path">
              {{ item.path }}
            </div>
            <div class="flex items-center gap-2 mt-0.5">
              <span v-if="item.duration" class="text-xs text-sidebar-foreground/60">
                {{ item.duration }}ms
              </span>
              <div class="flex flex-col gap-0.5">
                <span class="text-xs text-sidebar-foreground/60">
                  {{ formatHistoryTime(item.timestamp) }}
                </span>
                <span class="text-xs text-sidebar-foreground/40">
                  {{ formatExactTime(item.timestamp) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>

    <!-- Content Area -->
    <ScrollArea v-if="viewMode === 'endpoints'" class="flex-1">
      <div class="p-2">
        <div v-if="root.name === 'root'">
          <div v-for="child in filteredRootChildren" :key="child.fullPath">
            <SidebarNode :node="child" :level="0" :expanded-nodes="expandedNodes"
              :selected-operation="selectedOperation" @toggle-node="toggleNode" @select-operation="onOperationSelect"
              @select-group="onGroupSelect" />
          </div>
          <div
            v-if="(securityFilter !== 'all' || selectedMethods.size < availableMethods.length) && filteredRootChildren.length === 0"
            class="p-4 text-center text-sm text-muted-foreground">
            No results found
          </div>
        </div>
      </div>
    </ScrollArea>

    <!-- Statistics - at the bottom of Sidebar -->
    <div v-if="viewMode === 'history' && historyStats && historyStats.total > 0" class="border-t border-sidebar-border p-4">
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div>
          <div class="text-sidebar-foreground/70">Total</div>
          <div class="text-sidebar-foreground font-medium">{{ historyStats.total }}</div>
        </div>
        <div>
          <div class="text-sidebar-foreground/70">Success</div>
          <div class="text-green-500 font-medium">{{ historyStats.successful }}</div>
        </div>
        <div>
          <div class="text-sidebar-foreground/70">Errors</div>
          <div class="text-red-500 font-medium">{{ historyStats.errors }}</div>
        </div>
        <div>
          <div class="text-sidebar-foreground/70">Avg Time</div>
          <div class="text-sidebar-foreground font-medium">{{ historyStats.avgDuration }}ms</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ChevronDown, Github } from 'lucide-vue-next'
import type { TagNode } from '@/types/openapi'
import ScrollArea from './ui/ScrollArea.vue'
import SidebarNode from './SidebarNode.vue'
import RequestHistoryView from './RequestHistoryView.vue'
import Tooltip from './ui/Tooltip.vue'
import { filterTagNodeTree } from '@/utils/search'
import { filterTagNodeBySecurityAndMethods } from '@/utils/filter'
import { useSpecStore } from '@/stores/spec'
import { storeToRefs } from 'pinia'
import { getMethodColorClass, getStatusColorClass } from '@/utils/operation-cache'
import { getLogoUrl } from '@/utils/logo'
import type { RequestHistoryItem } from '@/stores/requestHistory'
import { useRequestHistoryStore } from '@/stores/requestHistory'

interface Props {
  root: TagNode
  selectedOperation: { method: string; path: string } | null
}

const props = defineProps<Props>()

const logoUrl = computed(() => getLogoUrl())

const emit = defineEmits<{
  (e: 'operationSelect', method: string, path: string): void
  (e: 'groupSelect', node: TagNode): void
  (e: 'historySelect', item: RequestHistoryItem): void
}>()

const viewMode = ref<'endpoints' | 'history'>('endpoints')
const expandedNodes = ref<Set<string>>(new Set())
const filtersExpanded = ref(false)
const securityFilter = ref<'all' | 'private' | 'public'>('all')
const selectedMethods = ref<Set<string>>(new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']))
const selectedHistoryItem = ref<RequestHistoryItem | null>(null)
const historyViewRef = ref<InstanceType<typeof RequestHistoryView> | null>(null)

const specStore = useSpecStore()
const { specs } = storeToRefs(specStore)
const historyStore = useRequestHistoryStore()

const availableMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']

const toggleMethod = (method: string) => {
  const newSet = new Set(selectedMethods.value)
  if (newSet.has(method)) {
    newSet.delete(method)
  } else {
    newSet.add(method)
  }
  selectedMethods.value = newSet
}

const clearFilters = () => {
  selectedMethods.value = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
  securityFilter.value = 'all'
}

// Memoize rootChildren - only recalculate when root.children changes
const rootChildren = computed(() => {
  const children = props.root.children
  return Array.from(children.values())
})

// Filter root children based on security and methods
const filteredRootChildren = computed(() => {
  let filtered: TagNode[] = rootChildren.value

  // Apply security and method filters
  if (securityFilter.value !== 'all' || selectedMethods.value.size < availableMethods.length) {
    const finalFiltered: TagNode[] = []
    for (const child of filtered) {
      const filteredChild = filterTagNodeBySecurityAndMethods(
        child,
        securityFilter.value,
        selectedMethods.value,
        specs.value
      )
      if (filteredChild && (
        filteredChild.operations.length > 0 ||
        filteredChild.children.size > 0
      )) {
        finalFiltered.push(filteredChild)
      }
    }
    filtered = finalFiltered
  }

  return filtered
})

onMounted(() => {
  const saved = localStorage.getItem('expandedNodes')
  if (saved) {
    expandedNodes.value = new Set(JSON.parse(saved))
  }
})

// Watch Set changes with debounced save to avoid excessive localStorage writes
// Track both size and a serialized version to catch content changes
let saveTimeout: ReturnType<typeof setTimeout> | null = null
const saveToLocalStorage = () => {
  localStorage.setItem('expandedNodes', JSON.stringify(Array.from(expandedNodes.value)))
}

watch(() => {
  // Create a serialized version to track content changes, not just size
  return Array.from(expandedNodes.value).sort().join(',')
}, () => {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(saveToLocalStorage, 300) // Debounce: save 300ms after last change
}, { flush: 'post' })

const toggleNode = (fullPath: string) => {
  // Create a completely new Set to ensure Vue reactivity detects the change
  // This is critical - Vue needs a new reference to detect Set changes
  const current = expandedNodes.value
  const newExpanded = new Set<string>()

  // Copy all existing items
  current.forEach(item => newExpanded.add(item))

  // Toggle the specific item
  if (newExpanded.has(fullPath)) {
    newExpanded.delete(fullPath)
  } else {
    newExpanded.add(fullPath)
  }

  // Assign new Set - Vue will detect the reference change
  expandedNodes.value = newExpanded
}

const onOperationSelect = (method: string, path: string) => {
  emit('operationSelect', method, path)
}

const onGroupSelect = (node: TagNode) => {
  emit('groupSelect', node)
}

const handleHistorySelect = (item: RequestHistoryItem) => {
  selectedHistoryItem.value = item
  emit('historySelect', item)
}

const filteredHistory = computed(() => {
  // Get filtered history from RequestHistoryView if available
  if (historyViewRef.value?.filteredHistory) {
    return historyViewRef.value.filteredHistory.value
  }
  // Fallback: return all history sorted by timestamp
  return [...historyStore.history].sort((a, b) => b.timestamp - a.timestamp)
})

const historyStats = computed(() => {
  // Get stats from RequestHistoryView if available
  if (historyViewRef.value?.stats) {
    return historyViewRef.value.stats.value
  }
  // Fallback: get stats from store
  return historyStore.getStatistics().value
})

const formatHistoryTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return `${seconds}s ago`
}

const formatExactTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

const getResponseTooltip = (item: RequestHistoryItem): string => {
  if (item.error && item.errorMessage) {
    return `Error: ${item.errorMessage}`
  }
  
  if (item.responseData) {
    try {
      let formatted = ''
      if (typeof item.responseData === 'string') {
        // Try to parse as JSON for better formatting
        try {
          const parsed = JSON.parse(item.responseData)
          formatted = JSON.stringify(parsed, null, 2)
        } catch {
          formatted = item.responseData
        }
      } else if (typeof item.responseData === 'object') {
        formatted = JSON.stringify(item.responseData, null, 2)
      } else {
        formatted = String(item.responseData)
      }
      return formatted
    } catch (error) {
      return '[Unable to format response]'
    }
  }
  
  return 'No response data'
}
</script>
