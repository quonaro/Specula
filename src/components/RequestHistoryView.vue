<template>
  <div class="space-y-2">
    <!-- Filters - Collapsible -->
    <div>
      <button 
        @click="filtersExpanded = !filtersExpanded"
        class="w-full flex items-center justify-between py-1.5 text-xs font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
      >
        <span>Filters</span>
        <ChevronDown
          :class="['h-3.5 w-3.5 transition-transform duration-200', filtersExpanded ? 'rotate-180' : '']" 
        />
      </button>

      <div v-show="filtersExpanded" class="mt-2 space-y-2 animate-in slide-in-from-top-2 duration-200">
          <!-- Method Filter -->
          <div>
            <label class="text-xs text-sidebar-foreground/70 mb-1.5 block">Method</label>
            <div class="flex flex-wrap gap-1.5">
              <button 
                v-for="method in availableMethods" 
                :key="method" 
                :class="[
                  'px-2.5 py-1 text-xs font-bold rounded transition-all text-white',
                  selectedMethods.has(method)
                    ? getMethodColorClass(method)
                    : `${getMethodColorClass(method)} opacity-50 hover:opacity-75`
                ]" 
                @click="toggleMethod(method)"
              >
                {{ method }}
              </button>
            </div>
          </div>

          <!-- Status Filter -->
          <div>
            <label class="text-xs text-sidebar-foreground/70 mb-1.5 block">Status</label>
            <select 
              v-model="statusFilter"
              class="w-full h-8 rounded-md border border-sidebar-border bg-sidebar px-2 text-xs text-sidebar-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All statuses</option>
              <option value="success">Success (2xx)</option>
              <option value="error">Errors (4xx, 5xx)</option>
              <option value="200">200 OK</option>
              <option value="201">201 Created</option>
              <option value="400">400 Bad Request</option>
              <option value="401">401 Unauthorized</option>
              <option value="404">404 Not Found</option>
              <option value="500">500 Server Error</option>
            </select>
          </div>

          <!-- Spec Filter -->
          <div v-if="availableSpecs.length > 1">
            <label class="text-xs text-sidebar-foreground/70 mb-1.5 block">Specification</label>
            <select 
              v-model="specFilter"
              class="w-full h-8 rounded-md border border-sidebar-border bg-sidebar px-2 text-xs text-sidebar-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All specifications</option>
              <option v-for="spec in availableSpecs" :key="spec" :value="spec">
                {{ spec }}
              </option>
            </select>
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
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronDown, Trash2 } from 'lucide-vue-next'
import ScrollArea from './ui/ScrollArea.vue'
import { useRequestHistoryStore, type RequestHistoryItem } from '@/stores/requestHistory'
import { useSpecStore } from '@/stores/spec'
import { getMethodColorClass } from '@/utils/operation-cache'

interface Props {
  selectedItem?: RequestHistoryItem | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'select', item: RequestHistoryItem): void
}>()

const historyStore = useRequestHistoryStore()
const specStore = useSpecStore()

const filtersExpanded = ref(false)
const selectedMethods = ref<Set<string>>(new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']))
const statusFilter = ref<string>('all')
const specFilter = ref<string>('all')

const availableMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']

const availableSpecs = computed(() => {
  const specs = new Set<string>()
  historyStore.history.forEach(item => {
    if (item.specTitle) {
      specs.add(item.specTitle)
    }
  })
  return Array.from(specs)
})

const stats = computed(() => historyStore.getStatistics().value)

const filteredHistory = computed(() => {
  const filters: {
    method?: string
    status?: number
    error?: boolean
    specTitle?: string
  } = {}

  // Method filter
  if (selectedMethods.value.size < availableMethods.length) {
    // If not all methods selected, we'll filter in the computed
  }

  // Status filter
  if (statusFilter.value === 'success') {
    // Filter in computed
  } else if (statusFilter.value === 'error') {
    filters.error = true
  } else if (statusFilter.value !== 'all' && !isNaN(Number(statusFilter.value))) {
    filters.status = Number(statusFilter.value)
  }

  // Spec filter
  if (specFilter.value !== 'all') {
    filters.specTitle = specFilter.value
  }


  let filtered = historyStore.getFilteredHistory(filters).value

  // Apply method filter manually (since getFilteredHistory doesn't support multiple methods)
  if (selectedMethods.value.size < availableMethods.length) {
    filtered = filtered.filter(item => 
      selectedMethods.value.has(item.method.toUpperCase())
    )
  }

  // Apply success filter
  if (statusFilter.value === 'success') {
    filtered = filtered.filter(item => 
      !item.error && item.status && item.status >= 200 && item.status < 300
    )
  }

  return filtered
})

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
  statusFilter.value = 'all'
  specFilter.value = 'all'
}

const formatTime = (timestamp: number): string => {
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

const handleSelectItem = (item: RequestHistoryItem) => {
  emit('select', item)
}

const handleDeleteItem = (id: string) => {
  historyStore.removeRequest(id)
}

const handleClearAll = () => {
  if (confirm('Are you sure you want to clear all request history?')) {
    historyStore.clearHistory()
  }
}

// Expose filtered history and stats for parent component
defineExpose({
  filteredHistory,
  stats
})
</script>

