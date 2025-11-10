<template>
  <Dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    title="Authorization Settings"
    :close-on-backdrop="true"
  >
    <div class="space-y-6">
      <p class="text-sm text-muted-foreground">
        Configure global authorization credentials for this specification. These settings will be used for all operations that require authentication.
      </p>

      <div v-if="securitySchemes && Object.keys(securitySchemes).length > 0" class="space-y-4">
        <div
          v-for="[schemeName, scheme] in Object.entries(securitySchemes)"
          :key="schemeName"
          class="space-y-2"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Key class="w-4 h-4 text-primary" />
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-medium text-foreground">{{ schemeName }}</span>
                  <Badge variant="outline" class="text-xs">
                    {{ getSchemeType(scheme) }}
                  </Badge>
                </div>
                <p v-if="getSchemeDescription(scheme)" class="text-xs text-muted-foreground mt-1">
                  {{ getSchemeDescription(scheme) }}
                </p>
              </div>
            </div>
          </div>
          
          <Input
            :model-value="getCredential(schemeName)"
            @update:model-value="(val: string) => setCredential(schemeName, val)"
            :placeholder="getPlaceholder(scheme)"
            :type="getInputType(scheme)"
            class="w-full"
          />
          
          <div v-if="getSchemeDetails(scheme)" class="text-xs text-muted-foreground pl-6">
            {{ getSchemeDetails(scheme) }}
          </div>
        </div>
      </div>

      <div v-else class="text-center py-8 text-sm text-muted-foreground">
        No security schemes defined in this specification.
      </div>

      <div class="flex items-center justify-between pt-4 border-t border-border">
        <div class="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            @click="toggleLock"
          >
            <Lock v-if="isLocked" class="w-4 h-4 mr-2" />
            <Unlock v-else class="w-4 h-4 mr-2" />
            {{ isLocked ? 'Unlock' : 'Lock' }}
          </Button>
        </div>
        <div class="flex gap-2">
          <Button variant="outline" @click="$emit('update:modelValue', false)">
            Close
          </Button>
        </div>
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Key, Lock, Unlock } from 'lucide-vue-next'
import Dialog from './ui/Dialog.vue'
import Button from './ui/Button.vue'
import Input from './ui/Input.vue'
import Badge from './ui/Badge.vue'
import { useAuthorizationStore } from '@/stores/authorization'
import type { OpenAPISpec } from '@/types/openapi'

interface Props {
  modelValue: boolean
  spec: OpenAPISpec
  sourceUrl?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const authorizationStore = useAuthorizationStore()

// Get security schemes from spec
const securitySchemes = computed(() => {
  return props.spec.components?.securitySchemes || {}
})

// Get credential for a scheme
const getCredential = (schemeName: string): string => {
  return authorizationStore.getCredential(props.spec, props.sourceUrl, schemeName)
}

// Set credential for a scheme
const setCredential = (schemeName: string, credential: string) => {
  authorizationStore.setCredential(props.spec, props.sourceUrl, schemeName, credential)
}

// Toggle lock
const toggleLock = () => {
  authorizationStore.toggleLock(props.spec, props.sourceUrl)
}

// Check if locked
const isLocked = computed(() => {
  return authorizationStore.isLocked(props.spec, props.sourceUrl)
})

// Get scheme type
const getSchemeType = (scheme: any): string => {
  if (scheme.type === 'http') {
    return scheme.scheme ? `HTTP ${scheme.scheme.toUpperCase()}` : 'HTTP'
  }
  if (scheme.type === 'apiKey') {
    return 'API Key'
  }
  if (scheme.type === 'oauth2') {
    return 'OAuth2'
  }
  if (scheme.type === 'openIdConnect') {
    return 'OpenID Connect'
  }
  return scheme.type || 'Unknown'
}

// Get scheme description
const getSchemeDescription = (scheme: any): string => {
  return scheme.description || ''
}

// Get scheme details
const getSchemeDetails = (scheme: any): string => {
  if (scheme.type === 'apiKey') {
    const inLocation = scheme.in || 'header'
    const name = scheme.name || 'key'
    return `Location: ${inLocation}, Name: ${name}`
  }
  if (scheme.type === 'http') {
    if (scheme.scheme === 'bearer') {
      return 'Format: Bearer <token>'
    }
    if (scheme.scheme === 'basic') {
      return 'Format: Basic <base64(username:password)>'
    }
  }
  return ''
}

// Get placeholder
const getPlaceholder = (scheme: any): string => {
  if (scheme.type === 'http' && scheme.scheme === 'bearer') {
    return 'Enter Bearer token'
  }
  if (scheme.type === 'http' && scheme.scheme === 'basic') {
    return 'Enter Basic auth credentials (base64 encoded)'
  }
  if (scheme.type === 'apiKey') {
    return `Enter ${scheme.name || 'API key'}`
  }
  return 'Enter credentials'
}

// Get input type
const getInputType = (scheme: any): string => {
  // Always use password for security
  return 'password'
}
</script>

