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
  // Open synchronously so browsers do not block the tab after the API call.
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
  <section class="tf-panel tf-telegram-panel p-5 sm:p-6" aria-labelledby="telegram-heading">
    <div class="flex flex-wrap items-center gap-3">
      <span class="tf-settings-icon grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-task-blueSoft text-task-blue"><svg viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor" aria-hidden="true"><path d="m21.5 3.2-3.2 16.1c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.3L5.7 13 1 11.5c-1-.3-1-1 .2-1.5L19.9 2.8c.9-.3 1.7.2 1.6.4Z" /></svg></span>
      <h2 id="telegram-heading" class="text-lg font-bold">Telegram</h2>
      <span role="status" :class="['tf-telegram-status rounded-full px-3 py-1 text-xs font-semibold', connected === true ? 'is-connected' : connected === false ? 'is-disconnected' : 'is-unknown']">{{ loading ? 'Checking…' : connected === true ? 'Connected' : connected === false ? 'Not connected' : 'Status unavailable' }}</span>
    </div>
    <p class="mt-3 text-sm text-task-muted">Connect Telegram to TaskFlow. Tiko works without a connection.</p>
    <div v-if="error" role="alert" class="tf-telegram-alert mt-4 flex items-center gap-3 rounded-xl px-4 py-3 text-sm">
      <svg viewBox="0 0 24 24" class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 7v6m0 4h.01" /></svg>
      <span class="flex-1">{{ error }}</span>
      <button type="button" class="font-semibold" :disabled="loading || changing" @click="refresh">Retry</button>
    </div>
    <div v-if="connectUrl" class="mt-3 space-y-2 text-sm">
      <p>Press Start in Telegram, then return here to check your connection.</p>
      <a :href="connectUrl" target="_blank" rel="noopener noreferrer" class="font-semibold text-task-blue">Open Telegram →</a>
    </div>
    <div class="mt-4 flex flex-col gap-2 sm:flex-row">
      <button v-if="connected !== true" type="button" class="tf-telegram-connect min-h-11 flex-1 rounded-xl border px-4 text-sm font-semibold disabled:opacity-50" :disabled="loading || changing || connected === null" @click="connect">{{ changing ? 'Connecting…' : 'Connect Telegram' }}</button>
      <button v-else type="button" class="tf-telegram-connect min-h-11 flex-1 rounded-xl border px-4 text-sm font-semibold disabled:opacity-50" :disabled="loading || changing" @click="disconnect">{{ changing ? 'Disconnecting…' : 'Disconnect Telegram' }}</button>
      <button v-if="!error" type="button" class="min-h-11 rounded-xl px-3 text-sm font-semibold text-task-blue disabled:opacity-50" :disabled="loading || changing" @click="refresh">Check status</button>
    </div>
  </section>
</template>
