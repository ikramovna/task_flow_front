<script setup lang="ts">
withDefaults(defineProps<{ label?: string; title?: string; disabled?: boolean; size?: 'sm' | 'md' }>(), {
  label: 'Close modal', title: 'Close', disabled: false, size: 'md'
})
</script>

<template>
  <button type="button" :class="['tf-modal-close', `is-${size}`]" :disabled="disabled" :aria-label="label" :title="title">
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
  </button>
</template>
