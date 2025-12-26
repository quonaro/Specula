<template>
  <div class="p-8 pb-4 space-y-3 flex-shrink-0">
    <div class="flex items-center gap-3">
      <Badge variant="none" :class="`${getMethodColorClass(method)} text-white font-bold px-3 py-1`">
        {{ method }}
      </Badge>
      <code class="text-lg font-mono text-foreground" :title="path">{{ path }}</code>
      <div class="w-3 h-3 rounded-full shrink-0" :class="isPrivate ? 'bg-red-500' : 'bg-green-500'"></div>
    </div>
    <h2 v-if="operation.summary" class="text-2xl font-bold text-foreground">
      {{ operation.summary }}
    </h2>
    <p v-if="operation.description" class="text-muted-foreground">
      {{ operation.description }}
    </p>
    <div class="flex gap-2 flex-wrap">
      <Badge v-if="operation.deprecated" variant="destructive">Deprecated</Badge>
      <Badge v-if="operation.operationId" variant="outline">ID: {{ operation.operationId }}</Badge>
    </div>
    <a v-if="operation.externalDocs" :href="operation.externalDocs.url" target="_blank" rel="noopener noreferrer"
      class="text-sm text-primary hover:underline inline-flex items-center gap-1">
      📖 {{ operation.externalDocs.description || 'External Documentation' }}
    </a>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Operation, OpenAPISpec, PathItem } from '@/types/openapi'
import { isOperationPrivate } from '@/utils/openapi-parser'
import { getMethodColorClass } from '@/utils/operation-cache'
import Badge from '../ui/Badge.vue'

interface Props {
  method: string
  path: string
  operation: Operation
  spec: OpenAPISpec
}

const props = defineProps<Props>()

// Get pathItem for security check
const pathItem = computed(() => {
  return props.spec.paths[props.path] as PathItem | undefined
})

// Check if operation is private
const isPrivate = computed(() => {
  return isOperationPrivate(props.operation, pathItem.value, props.spec)
})
</script>

