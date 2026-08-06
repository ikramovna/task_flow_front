<script setup lang="ts">
import type { TaskFlowNotification } from '~/composables/useTaskFlowApi'

const emit = defineEmits<{ navigate: [target: { kind: 'task' | 'message'; id: string }] }>()
const { state, load, refreshUnreadCount, markRead, markAllRead } = useNotifications()
const open = ref(false)
let poller: ReturnType<typeof setInterval> | undefined
const badge = computed(() => state.value.unreadCount > 99 ? '99+' : String(state.value.unreadCount))

const toggle = async () => {
  open.value = !open.value
  if (open.value) {
    try { await load({ pageSize: 10 }) } catch { /* error is rendered */ }
  }
}
const select = async (notification: TaskFlowNotification) => {
  try { await markRead(notification) } catch { return }
  open.value = false
  if (notification.task) emit('navigate', { kind: 'task', id: notification.task })
  else if (notification.message) emit('navigate', { kind: 'message', id: notification.message })
}
const allRead = async () => { try { await markAllRead() } catch { /* rolled back */ } }
const retry = async () => { try { await load({ pageSize: 10 }) } catch { /* rendered */ } }

onMounted(() => { void refreshUnreadCount(); poller = setInterval(refreshUnreadCount, 45_000) })
onBeforeUnmount(() => { if (poller) clearInterval(poller) })
</script>

<template>
  <div class="relative">
    <button type="button" class="tf-icon-button relative" aria-label="Notificationlar" :aria-expanded="open" @click="toggle">
      <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8.3 12a2.5 2.5 0 0 0 4.6 0" /></svg>
      <span v-if="state.unreadCount" class="absolute -right-2 -top-2 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-task-danger px-1 text-[9px] font-bold leading-none text-white">{{ badge }}</span>
    </button>
    <div v-if="open" class="tf-notification-dropdown absolute right-0 top-12 z-50 w-[min(92vw,390px)] overflow-hidden rounded-[16px] border border-task-line bg-white shadow-2xl">
      <header class="flex items-center justify-between border-b border-task-line px-4 py-3"><div><h2 class="font-bold">Notificationlar</h2><p class="mt-0.5 text-[11px] text-task-muted">{{ state.unreadCount }} ta o‘qilmagan</p></div><button v-if="state.unreadCount" type="button" class="text-xs font-bold text-task-blue" @click="allRead">Barchasini o‘qilgan qilish</button></header>
      <div class="max-h-[430px] overflow-y-auto">
        <div v-if="state.loading && !state.notifications.length" class="space-y-3 p-4"><div v-for="i in 3" :key="i" class="h-20 animate-pulse rounded-xl bg-slate-100" /></div>
        <div v-else-if="state.error" class="p-8 text-center"><p class="text-sm text-task-danger">{{ state.error }}</p><button type="button" class="mt-3 text-sm font-bold text-task-blue" @click="retry">Qayta urinish</button></div>
        <p v-else-if="!state.notifications.length" class="px-5 py-12 text-center text-sm text-task-muted">Hozircha notificationlar yo‘q</p>
        <div v-else class="divide-y divide-task-line"><NotificationItem v-for="item in state.notifications" :key="item.id" :notification="item" @select="select" /></div>
      </div>
      <NuxtLink to="/notifications" class="block border-t border-task-line px-4 py-3 text-center text-xs font-bold text-task-blue" @click="open = false">Barcha notificationlarni ko‘rish</NuxtLink>
    </div>
  </div>
</template>
