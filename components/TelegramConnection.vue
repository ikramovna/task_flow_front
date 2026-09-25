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
    if (typeof response.connected !== 'boolean') throw new Error('Invalid connection status')
    if (disposed) return
    connected.value = response.connected
    if (response.connected) connectUrl.value = ''
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
  <section class="tf-panel p-5 sm:p-7" aria-labelledby="telegram-heading">
    <h2 id="telegram-heading" class="text-xl font-bold">Telegram</h2>
    <p class="mt-2 text-sm text-task-muted">Connect your Telegram account to TaskFlow. You can use Tiko without connecting Telegram.</p>
    <p role="status" class="mt-3 text-sm font-semibold">{{ loading ? 'Checking connection…' : connected === true ? 'Connected' : connected === false ? 'Not connected' : 'Connection status unavailable' }}</p>
    <p v-if="error" role="alert" class="mt-2 text-sm text-task-danger">{{ error }}</p>
    <div v-if="connectUrl" class="mt-3 space-y-2 text-sm">
      <p>Press Start in Telegram, then return here to check your connection.</p>
      <a :href="connectUrl" target="_blank" rel="noopener noreferrer" class="font-semibold text-task-blue">Open Telegram →</a>
    </div>
    <div class="mt-4 flex flex-wrap gap-3">
      <button v-if="connected !== true" type="button" class="tf-primary min-h-10 px-4 disabled:opacity-50" :disabled="loading || changing || connected === null" @click="connect">{{ changing ? 'Connecting…' : 'Connect Telegram' }}</button>
      <button v-else type="button" class="min-h-10 rounded-ui border border-task-line px-4 text-sm font-semibold disabled:opacity-50" :disabled="loading || changing" @click="disconnect">{{ changing ? 'Disconnecting…' : 'Disconnect Telegram' }}</button>
      <button type="button" class="min-h-10 px-3 text-sm font-semibold text-task-blue disabled:opacity-50" :disabled="loading || changing" @click="refresh">Check status</button>
    </div>
  </section>
</template>
