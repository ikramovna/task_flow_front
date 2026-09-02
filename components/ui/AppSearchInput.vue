<script setup lang="ts">
withDefaults(defineProps<{ modelValue: string; placeholder?: string; loading?: boolean; ariaLabel?: string; inputClass?: string }>(), {
  placeholder: 'Search...', loading: false, ariaLabel: 'Clear search', inputClass: 'h-10 w-full'
})
const emit = defineEmits<{ 'update:modelValue': [value: string]; clear: [] }>()
const clear = () => { emit('update:modelValue', ''); emit('clear') }
</script>

<template>
  <label class="relative block">
    <svg viewBox="0 0 24 24" class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-task-muted" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m21 21-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" /></svg>
    <input :value="modelValue" :class="['tf-input pl-10 pr-10', inputClass]" :placeholder="placeholder" type="search" @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)" />
    <button v-if="modelValue && !loading" type="button" class="tf-search-clear" :aria-label="ariaLabel" @click="clear">×</button>
    <span v-if="loading" class="tf-search-spinner" />
  </label>
</template>
