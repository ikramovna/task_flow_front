<script setup lang="ts">
const api = useTaskFlowApi()
const connected = ref<boolean | null>(null)
const loading = ref(false)
const changing = ref(false)
const error = ref('')
const connectUrl = ref('')
let disposed = false

const refresh = async () => {
  if (loading.value || changing.value || disposed) return
  loading.value = true
  error.value = ''
  try {
    const response = await api.getTelegramConnection()
    if (typeof response.is_connected !== 'boolean') throw new Error('Invalid connection status')
    if (disposed) return
    connected.value = response.is_connected
    if (response.is_connected) connectUrl.value = ''
  } catch {
    if (!disposed) error.value = 'Could not check your Telegram connection. Please try again.'
  } finally {
    loading.value = false
  }
}
const connect = async () => {
  if (changing.value || loading.value) return
  const popup = window.open('about:blank', '_blank')
  if (popup) popup.opener = null
  changing.value = true
  error.value = ''
  try {
    const response = await api.connectTelegram()
    const url = new URL(response.connect_url)
    if (url.protocol !== 'https:' || !['t.me', 'telegram.me'].includes(url.hostname) || url.username || url.password) {
      throw new Error('Invalid Telegram link')
    }
    if (disposed) { popup?.close(); return }
    connectUrl.value = url.href
    if (popup && !popup.closed) popup.location.href = url.href
  } catch {
    popup?.close()
    error.value = 'Could not open Telegram. Please try again.'
  } finally {
    changing.value = false
  }
}
const disconnect = async () => {
  if (changing.value || loading.value) return
  changing.value = true
  error.value = ''
  try {
    await api.disconnectTelegram()
    connected.value = false
    connectUrl.value = ''
  } catch {
    error.value = 'Could not disconnect Telegram. Please try again.'
  } finally {
    changing.value = false
  }
}
const onReturn = () => { if (document.visibilityState === 'visible') void refresh() }
onMounted(() => {
  void refresh()
  window.addEventListener('focus', onReturn)
  document.addEventListener('visibilitychange', onReturn)
})
onBeforeUnmount(() => {
  disposed = true
  window.removeEventListener('focus', onReturn)
  document.removeEventListener('visibilitychange', onReturn)
})
</script>

<template>
  <section class="tf-panel tf-telegram-panel tf-telegram-pro-locked relative overflow-hidden p-5 sm:p-6" aria-label="Telegram Pro feature">
    <div class="tf-telegram-locked-content" inert aria-hidden="true">
      <div class="flex flex-wrap items-center gap-3">
        <span class="tf-settings-icon grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-task-blueSoft text-task-blue"><svg viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor" aria-hidden="true"><path d="m21.5 3.2-3.2 16.1c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.3L5.7 13 1 11.5c-1-.3-1-1 .2-1.5L19.9 2.8c.9-.3 1.7.2 1.6.4Z" /></svg></span>
        <h2 id="telegram-heading" class="text-lg font-bold">Telegram</h2>
        <span :class="['tf-telegram-status rounded-full px-3 py-1 text-xs font-semibold', connected === true ? 'is-connected' : connected === false ? 'is-disconnected' : 'is-unknown']">{{ connected === true ? 'Connected' : connected === false ? 'Not connected' : 'Status unavailable' }}</span>
      </div>
      <p class="mt-3 text-sm text-task-muted">Connect Telegram to TaskFlow and work with Tiko from your messages.</p>
      <div class="mt-4 flex flex-col gap-2 sm:flex-row">
        <button type="button" class="tf-telegram-connect min-h-11 flex-1 rounded-xl border px-4 text-sm font-semibold" disabled>{{ connected ? 'Disconnect Telegram' : 'Connect Telegram' }}</button>
        <button type="button" class="min-h-11 rounded-xl px-3 text-sm font-semibold text-task-blue" disabled>Check status</button>
      </div>
    </div>
    <div class="tf-telegram-lock-overlay">
      <span class="tf-telegram-lock-symbol" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg></span>
      <p class="tf-telegram-lock-title">Telegram with Tiko is a Pro feature</p>
      <ProUpgradeCard variant="unlock" />
    </div>
  </section>
</template>

<style scoped>
.tf-telegram-locked-content { filter: blur(3px); opacity: .45; pointer-events: none; user-select: none; }
.tf-telegram-lock-overlay { position: absolute; inset: 0; z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 9px; background: linear-gradient(125deg, rgb(244 249 255 / .52), rgb(235 244 255 / .7)); text-align: center; }
.tf-telegram-lock-symbol { color: #2369bf; }
.tf-telegram-lock-symbol svg { width: 27px; height: 27px; }
.tf-telegram-lock-title { max-width: 260px; color: #173b68; font-size: 13px; font-weight: 800; }
:global(.tf-dark) .tf-telegram-lock-overlay { background: linear-gradient(125deg, rgb(13 29 49 / .52), rgb(15 31 52 / .7)); }
:global(.tf-dark) .tf-telegram-lock-symbol { color: #c3ddff; }
:global(.tf-dark) .tf-telegram-lock-title { color: #eaf4ff; }
</style>
