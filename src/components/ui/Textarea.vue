<template>
  <textarea
    ref="textareaRef"
    :value="modelValue"
    :class="cn(
      'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
      autoResize ? 'resize-none overflow-hidden' : '',
      className
    )"
    @input="handleInput"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  modelValue?: string
  className?: string
  autoResize?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  className: '',
  autoResize: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)

const adjustHeight = () => {
  if (!props.autoResize || !textareaRef.value) return
  
  const textarea = textareaRef.value
  textarea.style.height = 'auto'
  textarea.style.height = `${textarea.scrollHeight}px`
}

const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
  if (props.autoResize) {
    adjustHeight()
  }
}

watch(() => props.modelValue, async () => {
  if (props.autoResize) {
    await nextTick()
    adjustHeight()
  }
})

onMounted(() => {
  if (props.autoResize) {
    adjustHeight()
    window.addEventListener('resize', adjustHeight)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', adjustHeight)
})

// Expose the textarea element for parent components
defineExpose({
  textarea: textareaRef,
  adjustHeight
})
</script>

