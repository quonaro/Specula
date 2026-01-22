<template>
  <div 
    ref="containerRef"
    class="relative inline-block" 
    @mouseenter="showTooltip" 
    @mouseleave="hideTooltip"
  >
    <slot />
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 scale-95 translate-y-1"
        enter-to-class="opacity-100 scale-100 translate-y-0"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 scale-100 translate-y-0"
        leave-to-class="opacity-0 scale-95 translate-y-1"
      >
        <div
          v-if="isVisible && content"
          ref="tooltipRef"
          class="fixed z-50 rounded-md border border-code-border bg-code-bg shadow-xl max-w-2xl pointer-events-none"
          :style="tooltipStyle"
        >
          <div
            v-if="html"
            v-html="content"
            class="tooltip-content w-full px-4 py-3 text-xs text-foreground bg-transparent border-0 overflow-auto"
            style="max-height: 600px; height: auto;"
          ></div>
          <textarea
            v-else
            :value="content"
            readonly
            class="tooltip-content w-full min-h-[150px] max-h-[600px] px-4 py-3 text-xs font-mono text-foreground bg-transparent border-0 resize-none overflow-auto focus:outline-none"
            style="scrollbar-width: thin; scrollbar-color: hsl(var(--muted-foreground) / 0.3) transparent; height: auto;"
          ></textarea>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

interface Props {
  content?: string
  delay?: number
  position?: 'top' | 'bottom' | 'left' | 'right'
  html?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  content: '',
  delay: 200,
  position: 'top',
  html: false
})

const isVisible = ref(false)
const tooltipRef = ref<HTMLElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const tooltipStyle = ref<{ top?: string; left?: string }>({})
let showTimeout: ReturnType<typeof setTimeout> | null = null
let hideTimeout: ReturnType<typeof setTimeout> | null = null

const showTooltip = () => {
  if (hideTimeout) {
    clearTimeout(hideTimeout)
    hideTimeout = null
  }
  
  showTimeout = setTimeout(() => {
    isVisible.value = true
    nextTick(() => {
      updatePosition()
    })
  }, props.delay)
}

const hideTooltip = () => {
  if (showTimeout) {
    clearTimeout(showTimeout)
    showTimeout = null
  }
  
  hideTimeout = setTimeout(() => {
    isVisible.value = false
  }, 100)
}

const updatePosition = () => {
  if (!tooltipRef.value || !containerRef.value) return

  const triggerRect = containerRef.value.getBoundingClientRect()
  const contentEl = tooltipRef.value.querySelector('.tooltip-content') as HTMLElement
  
  if (contentEl) {
    if (!props.html && contentEl.tagName === 'TEXTAREA') {
        // Reset height to auto to get correct scrollHeight
        contentEl.style.height = 'auto'
        // Calculate content height with padding
        const minHeight = 150
        const maxHeight = 600
        
        // Get scrollHeight which includes content + padding
        const scrollHeight = contentEl.scrollHeight
        
        // Set height based on content, but limit to max-height
        const contentHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight))
        contentEl.style.height = `${contentHeight}px`
    }
    // For HTML div, height is automatic, just max-height applies via CSS/style
  }

  // Wait for height to be applied before calculating position
  requestAnimationFrame(() => {
    if (!tooltipRef.value || !containerRef.value) return
    
    const tooltipRect = tooltipRef.value.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let top = 0
    let left = 0

    switch (props.position) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - 8
        left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
        break
      case 'bottom':
        top = triggerRect.bottom + 8
        left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
        break
      case 'left':
        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
        left = triggerRect.left - tooltipRect.width - 8
        break
      case 'right':
        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
        left = triggerRect.right + 8
        break
    }

    // Keep tooltip within viewport
    if (left < 8) left = 8
    if (left + tooltipRect.width > viewportWidth - 8) {
      left = viewportWidth - tooltipRect.width - 8
    }
    if (top < 8) top = 8
    if (top + tooltipRect.height > viewportHeight - 8) {
      top = viewportHeight - tooltipRect.height - 8
    }

    tooltipStyle.value = {
      top: `${top}px`,
      left: `${left}px`
    }
  })
}

onMounted(() => {
  window.addEventListener('scroll', updatePosition, true)
  window.addEventListener('resize', updatePosition)
})

onUnmounted(() => {
  if (showTimeout) clearTimeout(showTimeout)
  if (hideTimeout) clearTimeout(hideTimeout)
  window.removeEventListener('scroll', updatePosition, true)
  window.removeEventListener('resize', updatePosition)
})
</script>

