<template>
  <Card class="p-6 space-y-4">
    <div class="flex items-center gap-2">
      <Key class="w-5 h-5 text-primary" />
      <h3 class="text-lg font-semibold text-foreground">Authorization</h3>
    </div>
    <div class="space-y-2">
      <div v-for="(sec, idx) in operationSecurity" :key="idx" class="space-y-2">
        <div v-for="[scheme, scopes] in Object.entries(sec)" :key="scheme" class="space-y-2">
          <div class="flex items-center gap-2">
            <Badge variant="outline">{{ scheme }}</Badge>
            <span v-if="scopes.length > 0" class="text-sm text-muted-foreground">
              Scopes: {{ scopes.join(', ') }}
            </span>
          </div>
          <Input :model-value="localAuthorizationCredentials[scheme] || ''"
            @update:model-value="(val: string) => updateLocalAuthorizationCredential(scheme, val)"
            :placeholder="`Enter ${scheme} credentials`" type="password" class="w-full" />
        </div>
      </div>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, inject } from 'vue'
import { Key } from 'lucide-vue-next'
import type { Operation, OpenAPISpec, PathItem } from '@/types/openapi'
import { getOperationSecurity } from '@/utils/openapi-parser'
import { useAuthorizationStore } from '@/stores/authorization'
import Badge from '../ui/Badge.vue'
import Card from '../ui/Card.vue'
import Input from '../ui/Input.vue'

interface Props {
  operation: Operation
  spec: OpenAPISpec
  sourceUrl?: string
}

const props = defineProps<Props>()

// Get pathItem for security check
const pathItem = computed(() => {
  return props.spec.paths[Object.keys(props.spec.paths)[0]] as PathItem | undefined
})

// Get effective security requirements for this operation
const operationSecurity = computed(() => {
  return getOperationSecurity(props.operation, pathItem.value, props.spec)
})

// Authorization management
const authorizationStore = useAuthorizationStore()

// Local authorization credentials (not saved globally)
const localAuthorizationCredentials = ref<Record<string, string>>({})

// Initialize local credentials from global store
const initializeLocalCredentials = () => {
  const globalCredentials = authorizationStore.getCredentials(props.spec, props.sourceUrl)
  localAuthorizationCredentials.value = { ...globalCredentials }
}

// Inject operation view context
const operationView = inject<{
  getAuthorizationCredentials: () => Record<string, string>
  updateAuthorizationCredential: (scheme: string, credential: string) => void
} | null>('operationView', null)

// Update local authorization credential
const updateLocalAuthorizationCredential = (scheme: string, credential: string) => {
  localAuthorizationCredentials.value = {
    ...localAuthorizationCredentials.value,
    [scheme]: credential,
  }
  if (operationView) {
    operationView.updateAuthorizationCredential(scheme, credential)
  }
}

// Watch for spec changes and reinitialize
watch(() => [props.spec, props.sourceUrl], () => {
  initializeLocalCredentials()
}, { immediate: true })

// Initialize on mount
onMounted(() => {
  initializeLocalCredentials()
})

// Sync with parent if available
if (operationView) {
  watch(() => operationView.getAuthorizationCredentials(), (newCreds) => {
    if (newCreds && JSON.stringify(newCreds) !== JSON.stringify(localAuthorizationCredentials.value)) {
      localAuthorizationCredentials.value = { ...newCreds }
    }
  }, { immediate: true, deep: true })
}
</script>

