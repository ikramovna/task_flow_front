<script setup lang="ts">
const props = withDefaults(defineProps<{ modelValue: string; options: string[]; buttonClass?: string; menuClass?: string; ariaLabel?: string }>(), {
  buttonClass: 'tf-dropdown-button', menuClass: '', ariaLabel: 'Select option'
})
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const open = ref(false)
const root = ref<HTMLElement | null>(null)
const select = (option: string) => { emit('update:modelValue', option); open.value = false }
const closeOutside = (event: MouseEvent) => { if (!root.value?.contains(event.target as Node)) open.value = false }
onMounted(() => document.addEventListener('click', closeOutside))
onBeforeUnmount(() => document.removeEventListener('click', closeOutside))
</script>

<template>
  <div ref="root" class="tf-dropdown">
    <button type="button" :class="buttonClass" :aria-label="ariaLabel" :aria-expanded="open" @click.stop="open = !open">
      <span class="min-w-0 flex-1 truncate text-left">{{ modelValue }}</span>
      <svg viewBox="0 0 20 20" :class="['h-4 w-4 shrink-0 transition-transform', open ? 'rotate-180' : '']" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg>
    </button>
    <div v-if="open" :class="['tf-dropdown-menu', menuClass]">
      <button v-for="option in options" :key="option" type="button" class="tf-dropdown-option" @click="select(option)"><span>{{ option }}</span><span v-if="modelValue === option" class="text-task-blue">✓</span></button>
    </div>
  </div>
</template>
