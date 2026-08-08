<script setup lang="ts">
const route = useRoute()
const taskId = String(route.params.id || '')

await navigateTo({
  path: '/',
  query: taskId ? { task: taskId } : undefined,
  hash: '#tasks'
}, { replace: true })
</script>

<template>
  <div class="grid min-h-screen place-items-center text-sm text-task-muted">
    Opening task…
  </div>
</template>
