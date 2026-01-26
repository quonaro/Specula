<template>
  <textarea
    ref="textarea"
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
import { watch } from 'vue'
import { useTextareaAutosize } from '@vueuse/core'
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

const { textarea, input } = useTextareaAutosize({
  input: props.modelValue,
  styleProp: 'minHeight' 
})

// Sync modelValue changes to input ref from useTextareaAutosize
watch(() => props.modelValue, (newVal) => {
  input.value = newVal
})

const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
}

// Expose the textarea element for parent components
defineExpose({
  textarea
})
</script>

