<template>
  <div>
    <div
      v-if="node.name !== 'root'"
      class="flex items-center gap-2 px-3 py-2 hover:bg-sidebar-accent rounded-md cursor-pointer transition-colors"
      :style="{ paddingLeft: `${level * 12 + 12}px` }"
      @click="handleClick"
    >
      <div v-if="hasChildren || hasOperations" class="text-sidebar-foreground/70">
        <ChevronDown v-if="isExpanded" class="h-4 w-4" />
        <ChevronRight v-else class="h-4 w-4" />
      </div>
      <div v-else class="w-4" />
      <span class="text-sm font-medium text-sidebar-foreground">
        {{ node.name }}
      </span>
      <span v-if="hasOperations" class="ml-auto text-xs text-muted-foreground">
        {{ node.operations.length }}
      </span>
    </div>

    <div v-if="isExpanded && node.name !== 'root'" class="animate-in slide-in-from-top-2 duration-200">
      <!-- Render operations with v-memo for maximum performance -->
      <div
        v-for="op in operationsWithPrivacy"
        v-memo="[op.method, op.path, op.isSelected, op.isPrivate]"
        :key="`${op.method}-${op.path}`"
        :class="[
          'relative flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors group',
          op.itemClass
        ]"
        :style="{ paddingLeft: paddingStyle }"
        @click="handleSelectOperation(op.method, op.path)"
      >
        <Tooltip
          :content="op.tooltipContent"
          :delay="500"
          :html="true"
          class="flex items-center gap-2 w-full min-w-0"
        >
          <span
            :class="[
              'text-[9px] uppercase font-bold px-1 py-0.5 rounded text-white shrink-0 w-[38px] text-center tracking-tight',
              op.colorClass
            ]"
          >
            {{ op.method }}
          </span>
          
          <!-- Endpoint Name/Path with start truncation -->
          <span
            class="text-sm text-sidebar-foreground flex-1 min-w-0"
            :class="{ 'direction-rtl text-left': !op.operation.summary }"
            style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
          >
            <span v-if="!op.operation.summary" dir="rtl" class="block truncate text-left w-full">
               &lrm;{{ op.path }}
            </span>
            <span v-else class="truncate block">
              {{ op.displayName }}
            </span>
          </span>
          
          <div
            class="w-1.5 h-1.5 rounded-full shrink-0"
            :class="op.privacyClass"
          ></div>
        </Tooltip>
      </div>

      <!-- Render child nodes -->
      <div
        v-for="child in nodeChildren"
        :key="child.fullPath"
      >
        <SidebarNode
          :node="child"
          :level="level + 1"
          :expanded-nodes="expandedNodes"
          :selected-operation="selectedOperation"
          @toggle-node="handleToggleNode"
          @select-operation="handleSelectOperation"
          @select-group="handleSelectGroup"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { ChevronRight, ChevronDown } from 'lucide-vue-next'
import type { TagNode } from '@/types/openapi'
import { getMethodColorClass, checkOperationPrivacy } from '@/utils/operation-cache'
import { useSpecStore } from '@/stores/spec'
import Tooltip from './ui/Tooltip.vue'

interface Props {
  node: TagNode
  level: number
  expandedNodes: Set<string>
  selectedOperation: { method: string; path: string } | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'toggleNode', fullPath: string): void
  (e: 'selectOperation', method: string, path: string): void
  (e: 'selectGroup', node: TagNode): void
}>()

const specStore = useSpecStore()
// Use storeToRefs to avoid unnecessary reactivity
const { specs } = storeToRefs(specStore)

// Memoize these simple computed values
// CRITICAL: Vue has issues tracking Set mutations directly
// We serialize the Set to ensure reactivity works correctly
const expandedNodesSerialized = computed(() => {
  return Array.from(props.expandedNodes).sort().join('|')
})

const isExpanded = computed(() => {
  // Access serialized version to ensure reactivity
  expandedNodesSerialized.value
  return props.expandedNodes.has(props.node.fullPath)
})
const hasChildren = computed(() => props.node.children.size > 0)
const hasOperations = computed(() => props.node.operations.length > 0)

// Cache nodeChildren array - only recreate when children Map changes
const nodeChildren = computed(() => {
  // Use Array.from with cached reference
  const children = props.node.children
  return Array.from(children.values())
})

// Pre-compute operations with all needed data to avoid any function calls in template
// Optimized: only recalculates when operations, selectedOperation, or specs actually change
const operationsWithPrivacy = computed(() => {
  const selected = props.selectedOperation
  const selectedMethod = selected?.method
  const selectedPath = selected?.path
  const specsValue = specs.value
  
  return props.node.operations.map(op => {
    const isSelected = selectedMethod === op.method && selectedPath === op.path
    const isPrivate = checkOperationPrivacy({ method: op.method, path: op.path }, specsValue)
    
    // Determine display name (Summary or Path)
    const displayName = op.operation.summary || op.path
    
    // Tooltip content - Richer Design
    const methodColorClass = getMethodColorClass(op.method)
      
    const tooltipContent = `
      <div class="flex flex-col gap-3 min-w-[280px]">
        <div class="flex items-center gap-2.5 pb-2 border-b border-border/10">
          <span class="text-[10px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider text-white ${methodColorClass}">${op.method}</span>
          <span class="font-semibold text-sm tracking-tight text-white">${op.operation.summary || 'Endpoint'}</span>
        </div>
        
        <div class="font-mono text-[11px] bg-black/40 px-3 py-2 rounded border border-white/5 break-all text-muted-foreground select-all">
          ${op.path}
        </div>
        
        ${op.operation.description ? `
          <div class="text-xs text-muted-foreground/80 leading-relaxed font-normal">
            ${op.operation.description}
          </div>
        ` : ''}
        
        ${isPrivate ? `
          <div class="flex items-center gap-1.5 pt-1 mt-1 border-t border-border/10 text-[10px] items-center text-red-400/90 font-medium">
             <div class="w-1.5 h-1.5 rounded-full bg-red-500 box-shadow-red"></div>
             Authenticated Route
          </div>
        ` : ''}
      </div>
    `
    
    return {
      ...op,
      isPrivate,
      isSelected,
      displayName,
      tooltipContent,
      colorClass: getMethodColorClass(op.method),
      // Pre-compute class strings to avoid template calculations
      itemClass: isSelected
        ? 'bg-primary/10 text-primary'
        : 'hover:bg-sidebar-accent',
      privacyClass: isPrivate ? 'bg-red-500' : 'bg-green-500'
    }
  })
})

// Pre-compute padding style to avoid template calculations
const paddingStyle = computed(() => `${(props.level + 1) * 12 + 12}px`)

const handleClick = () => {
  if (hasChildren.value || hasOperations.value) {
    emit('toggleNode', props.node.fullPath)
    emit('selectGroup', props.node)
  }
}

// Pre-defined handlers to avoid creating new functions on each render
const handleToggleNode = (fullPath: string) => {
  emit('toggleNode', fullPath)
}

const handleSelectOperation = (method: string, path: string) => {
  emit('selectOperation', method, path)
}

const handleSelectGroup = (node: TagNode) => {
  emit('selectGroup', node)
}
</script>

