<script setup lang="ts">
withDefaults(defineProps<{ title: string; description?: string; compact?: boolean }>(), { description: '', compact: false })
</script>

<template>
  <div :class="compact ? 'py-8' : 'py-12'" class="text-center text-task-muted">
    <slot name="icon" />
    <p class="font-bold text-task-ink">{{ title }}</p>
    <p v-if="description" class="mt-1 text-sm text-task-muted">{{ description }}</p>
    <slot />
  </div>
</template>
