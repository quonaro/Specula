<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useBackend } from '@/composables/useBackend'

const { checkBackend } = useBackend()

onMounted(() => {
  // Check backend availability on app start (only if not disabled and not in standalone mode)
  const withoutBackend = import.meta.env.VITE_WITHOUT_BACKEND === 'true'
  const isStandalone = typeof window !== 'undefined' && (window as any).__SPECULA_STANDALONE__ === true
  if (!withoutBackend && !isStandalone) {
    checkBackend().catch(() => {
      // Silently fail - backend is optional
    })
  }
})
</script>

