<template>
  <label :class="['flex items-center gap-2 cursor-pointer', labelClassName]">
    <div class="relative inline-flex items-center">
      <input
        type="checkbox"
        :checked="modelValue"
        @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
        :class="cn(
          'peer h-4 w-4 shrink-0 rounded-sm border border-input ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          'appearance-none transition-colors',
          modelValue ? 'bg-primary border-primary' : 'bg-background',
          className
        )"
        :disabled="disabled"
        v-bind="$attrs"
      />
      <svg
        v-if="modelValue"
        class="absolute left-0 top-0 h-4 w-4 pointer-events-none text-primary-foreground"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="3"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <span v-if="$slots.default" :class="textClassName">
      <slot />
    </span>
  </label>
</template>

<script setup lang="ts">
import { cn } from '@/lib/utils'

interface Props {
  modelValue?: boolean
  disabled?: boolean
  className?: string
  labelClassName?: string
  textClassName?: string
}

withDefaults(defineProps<Props>(), {
  modelValue: false,
  disabled: false,
  className: '',
  labelClassName: '',
  textClassName: 'text-sm text-foreground',
})

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

