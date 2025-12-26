<template>
  <Dialog :model-value="modelValue" @update:model-value="updateModelValue" title="Column Layout Settings">
    <div class="space-y-6">
      <!-- Number of Columns -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-foreground">Number of Columns</label>
        <div class="flex gap-2">
          <Button
            v-for="num in [1, 2, 3, 4]"
            :key="num"
            :variant="columnsCount === num ? 'default' : 'outline'"
            size="sm"
            @click="updateColumnsCount(num)"
          >
            {{ num }}
          </Button>
        </div>
      </div>

      <!-- Column Widths (when more than 1 column) -->
      <div v-if="columnsCount > 1" class="space-y-2">
        <label class="text-sm font-medium text-foreground">Column Widths (%)</label>
        <div class="space-y-2">
          <div v-for="(width, idx) in columnWidths" :key="idx" class="flex items-center gap-2">
            <label class="text-xs text-muted-foreground w-16">Column {{ idx + 1 }}:</label>
            <Input
              :model-value="width.toFixed(1)"
              @update:model-value="(val) => updateColumnWidth(idx, parseFloat(val) || 0)"
              type="number"
              min="10"
              max="100"
              step="0.1"
              class="flex-1"
            />
            <span class="text-xs text-muted-foreground">%</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          @click="equalizeColumnWidths"
          class="w-full"
        >
          Equalize All Columns
        </Button>
      </div>

      <!-- Reset to Default -->
      <div class="pt-4 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          @click="resetToDefault"
          class="w-full"
        >
          Reset to Default Layout
        </Button>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="outline" @click="updateModelValue(false)">Close</Button>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Dialog from '../ui/Dialog.vue'
import Button from '../ui/Button.vue'
import Input from '../ui/Input.vue'

interface Props {
  modelValue: boolean
  columnsCount: number
  columnWidths: number[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:columnsCount': [count: number]
  'update:columnWidths': [widths: number[]]
  'reset': []
}>()

const updateModelValue = (value: boolean) => {
  emit('update:modelValue', value)
}

const updateColumnsCount = (count: number) => {
  emit('update:columnsCount', count)
  // Auto-adjust widths when changing column count
  const newWidths = Array(count).fill(100 / count)
  emit('update:columnWidths', newWidths)
}

const updateColumnWidth = (index: number, width: number) => {
  if (width < 10 || width > 100) return
  
  const newWidths = [...props.columnWidths]
  const oldWidth = newWidths[index]
  const delta = width - oldWidth
  
  // Distribute delta to other columns proportionally
  const otherColumns = newWidths.filter((_, i) => i !== index)
  const totalOtherWidth = otherColumns.reduce((sum, w) => sum + w, 0)
  
  if (totalOtherWidth > 0 && otherColumns.length > 0) {
    otherColumns.forEach((w, i) => {
      const originalIndex = newWidths.findIndex((_, idx) => idx !== index && idx > i)
      if (originalIndex !== -1) {
        const proportion = w / totalOtherWidth
        newWidths[originalIndex] = Math.max(10, newWidths[originalIndex] - (delta * proportion))
      }
    })
  }
  
  newWidths[index] = width
  
  // Normalize to ensure total is 100%
  const total = newWidths.reduce((sum, w) => sum + w, 0)
  if (total !== 100) {
    const factor = 100 / total
    newWidths.forEach((w, i) => {
      newWidths[i] = w * factor
    })
  }
  
  emit('update:columnWidths', newWidths)
}

const equalizeColumnWidths = () => {
  const equalWidth = 100 / props.columnsCount
  const newWidths = Array(props.columnsCount).fill(equalWidth)
  emit('update:columnWidths', newWidths)
}

const resetToDefault = () => {
  emit('reset')
}
</script>

