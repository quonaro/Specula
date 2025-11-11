<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useBackend } from '@/composables/useBackend'

const { checkBackend } = useBackend()

onMounted(() => {
  // Check backend availability on app start (only if not disabled)
  const withoutBackend = import.meta.env.VITE_WITHOUT_BACKEND === 'true'
  if (!withoutBackend) {
    checkBackend().catch(() => {
      // Silently fail - backend is optional
    })
  }
})
</script>

