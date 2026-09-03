<script setup lang="ts">
import ModalCloseButton from '~/components/ui/ModalCloseButton.vue'

withDefaults(defineProps<{
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
}>(), {
  confirmLabel: 'Delete',
  cancelLabel: 'Cancel'
})

const emit = defineEmits<{ confirm: []; cancel: [] }>()
const cancelButton = ref<HTMLButtonElement | null>(null)
const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') emit('cancel')
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  nextTick(() => cancelButton.value?.focus())
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="tf-confirm-overlay" role="presentation" @click.self="emit('cancel')">
    <section class="tf-confirm-panel" role="alertdialog" aria-modal="true" :aria-label="title">
      <header>
        <div class="tf-confirm-icon"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/></svg></div>
        <div class="min-w-0 flex-1"><h2>{{ title }}</h2><p>{{ message }}</p></div>
        <ModalCloseButton size="sm" label="Close confirmation" @click="emit('cancel')" />
      </header>
      <footer>
        <button ref="cancelButton" type="button" class="tf-confirm-cancel" @click="emit('cancel')">{{ cancelLabel }}</button>
        <button type="button" class="tf-confirm-delete" @click="emit('confirm')">{{ confirmLabel }}</button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.tf-confirm-overlay { position: fixed; inset: 0; z-index: 110; display: grid; place-items: center; padding: 16px; background: rgb(15 23 42 / .5); backdrop-filter: blur(3px); }
.tf-confirm-panel { width: min(100%, 500px); overflow: hidden; border: 1px solid #dce5ef; border-radius: 20px; background: #fff; color: #172033; box-shadow: 0 30px 80px -24px rgb(15 23 42 / .55); }
header { display: flex; align-items: flex-start; gap: 14px; padding: 22px; }
.tf-confirm-icon { display: grid; width: 46px; height: 46px; flex: none; place-items: center; border-radius: 14px; background: #fff0f2; color: #e5484d; }
.tf-confirm-icon svg { width: 23px; height: 23px; }
h2 { font-size: 20px; font-weight: 750; line-height: 1.3; }
p { margin-top: 7px; color: #718096; font-size: 14px; line-height: 1.6; }
footer { display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #e3eaf2; padding: 14px 22px; }
footer button { min-height: 42px; border-radius: 999px; padding: 0 22px; font-size: 14px; font-weight: 700; transition: 160ms ease; }
.tf-confirm-cancel { border: 1px solid #d4deea; background: #fff; color: #334155; }
.tf-confirm-cancel:hover { border-color: #6ea8e5; color: #2874d6; }
.tf-confirm-delete { background: #dc3545; color: #fff; box-shadow: 0 10px 24px -14px rgb(220 53 69 / .8); }
.tf-confirm-delete:hover { background: #c92d3c; transform: translateY(-1px); }
:global(.tf-dark) .tf-confirm-panel { border-color: #28405d; background: #0d2036; color: #edf4ff; }
:global(.tf-dark) p { color: #95a9c0; }
:global(.tf-dark) footer { border-color: #263d58; }
:global(.tf-dark) .tf-confirm-cancel { border-color: #314a67; background: #132a45; color: #dce8f5; }
:global(.tf-dark) .tf-confirm-icon { background: #34202a; color: #ff7b83; }
@media (max-width: 520px) { header { padding: 18px; } footer { padding: 13px 18px; } footer button { flex: 1; padding-inline: 14px; } }
</style>
