<script setup lang="ts">
const props = withDefaults(defineProps<{ modelValue: string; options: Array<string | { value: string; label: string }>; buttonClass?: string; menuClass?: string; ariaLabel?: string; disabled?: boolean }>(), {
  buttonClass: 'tf-dropdown-button', menuClass: '', ariaLabel: 'Select option'
})
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const open = ref(false)
const root = ref<HTMLElement | null>(null)
const optionValue = (option: string | { value: string; label: string }) => typeof option === 'string' ? option : option.value
const optionLabel = (option: string | { value: string; label: string }) => typeof option === 'string' ? option : option.label
const selectedLabel = computed(() => {
  const option = props.options.find(option => optionValue(option) === props.modelValue)
  return option === undefined ? props.modelValue : optionLabel(option)
})
const select = (option: string) => { emit('update:modelValue', option); open.value = false }
const closeOutside = (event: MouseEvent) => { if (!root.value?.contains(event.target as Node)) open.value = false }
onMounted(() => document.addEventListener('click', closeOutside))
onBeforeUnmount(() => document.removeEventListener('click', closeOutside))
</script>

<template>
  <div ref="root" class="tf-dropdown" @keydown.esc="open = false">
    <button type="button" :class="buttonClass" :disabled="disabled" :aria-label="ariaLabel" :aria-expanded="open" @click.stop="open = !open">
      <span class="min-w-0 flex-1 truncate text-left">{{ selectedLabel }}</span>
      <svg viewBox="0 0 20 20" :class="['h-4 w-4 shrink-0 transition-transform', open ? 'rotate-180' : '']" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg>
    </button>
    <div v-if="open" :class="['tf-dropdown-menu', menuClass]">
      <button v-for="option in options" :key="optionValue(option)" type="button" class="tf-dropdown-option" @click="select(optionValue(option))"><span>{{ optionLabel(option) }}</span><span v-if="modelValue === optionValue(option)" class="text-task-blue">✓</span></button>
    </div>
  </div>
</template>
