<script setup lang="ts">
const props = withDefaults(defineProps<{ page: number; pageCount: number; total?: number; pageSize?: number; noun?: string; compact?: boolean }>(), {
  total: 0, pageSize: 10, noun: 'items', compact: false
})
const emit = defineEmits<{ page: [page: number] }>()
const go = (page: number) => emit('page', Math.min(Math.max(page, 1), props.pageCount))
const start = computed(() => props.total ? (props.page - 1) * props.pageSize + 1 : 0)
const end = computed(() => Math.min(props.page * props.pageSize, props.total))
</script>

<template>
  <div class="flex flex-col items-center justify-between gap-3 text-xs text-task-muted sm:flex-row">
    <span v-if="total">Showing {{ start }}–{{ end }} of {{ total }} {{ noun }}</span>
    <div class="flex items-center gap-2">
      <button type="button" class="tf-icon-button disabled:cursor-not-allowed disabled:opacity-40" :disabled="page <= 1" :aria-label="`Previous ${noun} page`" @click="go(page - 1)">‹</button>
      <template v-if="compact"><span class="px-1">{{ page }} / {{ pageCount }}</span></template>
      <template v-else><button v-for="item in pageCount" :key="item" type="button" :class="[page === item ? 'tf-primary' : 'tf-icon-button', 'h-9 w-9 p-0']" :aria-current="page === item ? 'page' : undefined" @click="go(item)">{{ item }}</button></template>
      <button type="button" class="tf-icon-button disabled:cursor-not-allowed disabled:opacity-40" :disabled="page >= pageCount" :aria-label="`Next ${noun} page`" @click="go(page + 1)">›</button>
    </div>
  </div>
</template>
