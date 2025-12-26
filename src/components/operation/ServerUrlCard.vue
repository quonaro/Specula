<template>
  <Card class="p-6 space-y-4">
    <div class="flex items-center gap-2">
      <Server class="w-5 h-5 text-primary" />
      <h3 class="text-lg font-semibold text-foreground">Server URL</h3>
    </div>
    <div class="space-y-2 border border-border rounded-md p-3 bg-muted/30">
      <div v-for="(server, idx) in availableServers" :key="idx" class="flex items-center gap-2">
        <input type="radio" :id="`server-${idx}`" :value="server.url" :checked="selectedServer === server.url"
          @change="handleServerSelect(server.url)" class="h-4 w-4 text-primary focus:ring-primary" />
        <label :for="`server-${idx}`" class="flex-1 text-sm cursor-pointer">
          <div class="font-medium text-foreground">{{ server.url }}</div>
          <div v-if="server.label.includes('(')" class="text-xs text-muted-foreground">
            {{ server.label.match(/\(([^)]+)\)/)?.[1] || '' }}
          </div>
        </label>
      </div>
      <div class="flex items-center gap-2">
        <input type="radio" id="server-current-host" value="current-host"
          :checked="selectedServer === 'current-host'" @change="handleServerSelect('current-host')"
          class="h-4 w-4 text-primary focus:ring-primary" />
        <label for="server-current-host" class="flex-1 text-sm cursor-pointer font-medium text-foreground">
          Current Host ({{ getCurrentHostUrl() }})
        </label>
      </div>
      <div class="flex items-center gap-2">
        <input type="radio" id="server-custom" value="custom" :checked="selectedServer === 'custom'"
          @change="handleServerSelect('custom')" class="h-4 w-4 text-primary focus:ring-primary" />
        <label for="server-custom" class="flex-1 text-sm cursor-pointer font-medium text-foreground">
          Custom URL...
        </label>
      </div>
    </div>
    <Input :model-value="getCurrentServerUrl()" @update:model-value="handleServerUrlUpdate"
      :disabled="selectedServer !== 'custom' && selectedServer !== 'current-host' && availableServers.length > 0"
      placeholder="https://api.example.com" />
  </Card>
</template>

<script setup lang="ts">
import { ref, computed, inject, watch } from 'vue'
import { Server } from 'lucide-vue-next'
import type { Operation, OpenAPISpec } from '@/types/openapi'
import Card from '../ui/Card.vue'
import Input from '../ui/Input.vue'

interface Props {
  operation: Operation
  spec: OpenAPISpec
  sourceUrl?: string
}

const props = defineProps<Props>()

// Inject operation view context
const operationView = inject<{
  getServerUrl: () => string
  updateServerUrl: (url: string) => void
  updateCustomServerUrl: (url: string) => void
  getSelectedServer: () => string
} | null>('operationView', null)

// Server URL management
const customServerUrl = ref('')

// Extract base URL from sourceUrl if it's a URL
const extractBaseUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url)
    return `${urlObj.protocol}//${urlObj.host}`
  } catch {
    return null
  }
}

// Build list of available servers
const availableServers = computed(() => {
  const servers: Array<{ url: string; label: string }> = []

  // Add operation-specific servers
  if (props.operation.servers && props.operation.servers.length > 0) {
    props.operation.servers.forEach((server) => {
      servers.push({
        url: server.url,
        label: server.description
          ? `${server.url} (${server.description})`
          : server.url
      })
    })
  }

  // Add spec-level servers
  if (props.spec.servers && props.spec.servers.length > 0) {
    props.spec.servers.forEach((server) => {
      // Avoid duplicates
      if (!servers.some(s => s.url === server.url)) {
        servers.push({
          url: server.url,
          label: server.description
            ? `${server.url} (${server.description})`
            : server.url
        })
      }
    })
  }

  // Add sourceUrl base URL if available
  if (props.sourceUrl) {
    const baseUrl = extractBaseUrl(props.sourceUrl)
    if (baseUrl && !servers.some(s => s.url === baseUrl)) {
      servers.push({
        url: baseUrl,
        label: `${baseUrl} (from spec URL)`
      })
    }
  }

  return servers
})

// Initialize selected server
const getInitialServer = (): string => {
  // Priority: operation servers > spec servers > sourceUrl > current-host
  if (props.operation.servers && props.operation.servers.length > 0) {
    return props.operation.servers[0].url
  }
  if (props.spec.servers && props.spec.servers.length > 0) {
    return props.spec.servers[0].url
  }
  if (props.sourceUrl) {
    const baseUrl = extractBaseUrl(props.sourceUrl)
    if (baseUrl) {
      return baseUrl
    }
  }
  // Default to current-host if no servers in OpenAPI
  return 'current-host'
}

const selectedServer = ref(getInitialServer())

// Sync with parent if available
if (operationView) {
  watch(() => operationView.getSelectedServer(), (newValue) => {
    if (newValue && newValue !== selectedServer.value) {
      selectedServer.value = newValue
    }
  }, { immediate: true })
}

// Handle server selection from dropdown
const handleServerSelect = (value: string) => {
  selectedServer.value = value
  if (operationView) {
    operationView.updateServerUrl(value)
  }
  if (value === 'custom') {
    customServerUrl.value = ''
  }
}

// Handle server URL input update
const handleServerUrlUpdate = (value: string) => {
  if (selectedServer.value === 'custom') {
    customServerUrl.value = value
    if (operationView) {
      operationView.updateCustomServerUrl(value)
    }
  } else if (selectedServer.value === 'current-host') {
    // If editing current-host URL and it doesn't match, switch to custom
    const currentHost = getCurrentHostUrl()
    if (value !== currentHost && value.trim() !== '') {
      selectedServer.value = 'custom'
      customServerUrl.value = value
      if (operationView) {
        operationView.updateCustomServerUrl(value)
      }
    }
  } else {
    // Check if the entered URL matches any available server
    const matchingServer = availableServers.value.find(s => s.url === value)
    if (matchingServer) {
      // If it matches a server, select that server
      selectedServer.value = matchingServer.url
      if (operationView) {
        operationView.updateServerUrl(matchingServer.url)
      }
    } else if (value === getCurrentHostUrl()) {
      // If it matches current host, select current-host
      selectedServer.value = 'current-host'
      if (operationView) {
        operationView.updateServerUrl('current-host')
      }
    } else if (value.trim() !== '') {
      // If it doesn't match and is not empty, select custom
      selectedServer.value = 'custom'
      customServerUrl.value = value
      if (operationView) {
        operationView.updateCustomServerUrl(value)
      }
    }
  }
}

// Get current host URL
const getCurrentHostUrl = (): string => {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.host}`
  }
  return ''
}

// Get server URL - use injected if available, otherwise compute locally
const getCurrentServerUrl = (): string => {
  if (operationView) {
    return operationView.getServerUrl()
  }
  if (selectedServer.value === 'custom') {
    return customServerUrl.value
  }
  if (selectedServer.value === 'current-host') {
    return getCurrentHostUrl()
  }
  return selectedServer.value
}
</script>

