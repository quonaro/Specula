<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useBackend } from '@/composables/useBackend'

const { checkBackend } = useBackend()

onMounted(() => {
  // Check backend availability on app start (only if not in standalone mode)
  const isStandalone = typeof window !== 'undefined' && (window as any).__SPECULA_STANDALONE__ === true
  if (!isStandalone) {
    checkBackend().catch(() => {
      // Silently fail - backend is optional
    })
  }
})
</script>

