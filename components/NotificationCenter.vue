<script setup lang="ts">
import type { TaskFlowNotification } from '~/composables/useTaskFlowApi'

const props = defineProps<{ activePage?: string }>()
const emit = defineEmits<{
  navigate: [target: { kind: 'task' | 'message'; id: string }]
  viewAll: []
}>()
const { state, load, refreshUnreadCount, markRead, markAllRead } = useNotifications()
const open = ref(false)
const root = ref<HTMLElement | null>(null)
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
  const taskId = notificationRelationId(notification.task)
  const messageId = notificationRelationId(notification.message)
  if (taskId) emit('navigate', { kind: 'task', id: taskId })
  else if (messageId) emit('navigate', { kind: 'message', id: messageId })
}
const allRead = async () => { try { await markAllRead() } catch { /* rolled back */ } }
const retry = async () => { try { await load({ pageSize: 10 }) } catch { /* rendered */ } }
const viewAll = () => {
  open.value = false
  emit('viewAll')
}

const closeOnOutsideClick = (event: PointerEvent) => {
  if (open.value && root.value && !root.value.contains(event.target as Node)) open.value = false
}

const closeOnEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape') open.value = false
}

watch(() => props.activePage, () => { open.value = false })

onMounted(() => {
  void refreshUnreadCount()
  poller = setInterval(refreshUnreadCount, 45_000)
  document.addEventListener('pointerdown', closeOnOutsideClick)
  document.addEventListener('keydown', closeOnEscape)
})
onBeforeUnmount(() => {
  if (poller) clearInterval(poller)
  document.removeEventListener('pointerdown', closeOnOutsideClick)
  document.removeEventListener('keydown', closeOnEscape)
})
</script>

<template>
  <div ref="root" class="relative z-[60]">
    <button type="button" class="tf-icon-button relative" aria-label="Notifications" :aria-expanded="open" @click="toggle">
      <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8.3 12a2.5 2.5 0 0 0 4.6 0" /></svg>
      <span v-if="state.unreadCount" class="absolute -right-2 -top-2 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-task-danger px-1 text-[9px] font-bold leading-none text-white">{{ badge }}</span>
    </button>
    <div v-if="open" class="tf-notification-dropdown absolute right-0 top-12 z-[70] w-[min(390px,calc(100vw-32px))] overflow-hidden rounded-[18px] border shadow-2xl">
      <header class="tf-notification-header flex min-h-[68px] items-center justify-between gap-4 border-b px-4 py-3.5"><div class="min-w-0"><h2 class="font-bold">Notifications</h2><p class="mt-0.5 text-[11px] text-task-muted">{{ state.unreadCount }} unread</p></div><button v-if="state.unreadCount" type="button" class="h-auto w-auto shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-bold text-task-blue transition hover:bg-task-blueSoft" @click="allRead">Mark all as read</button></header>
      <div class="max-h-[430px] overflow-y-auto">
        <div v-if="state.loading && !state.notifications.length" class="space-y-3 p-4"><div v-for="i in 3" :key="i" class="h-20 animate-pulse rounded-xl bg-slate-100" /></div>
        <div v-else-if="state.error" class="p-8 text-center"><p class="text-sm text-task-danger">{{ state.error }}</p><button type="button" class="mt-3 text-sm font-bold text-task-blue" @click="retry">Try again</button></div>
        <p v-else-if="!state.notifications.length" class="px-5 py-12 text-center text-sm text-task-muted">No notifications yet</p>
        <div v-else class="divide-y divide-task-line"><NotificationItem v-for="item in state.notifications" :key="item.id" :notification="item" @select="select" /></div>
      </div>
      <button type="button" class="tf-notification-footer block h-auto w-full whitespace-nowrap border-t px-4 py-3.5 text-center text-xs font-bold text-task-blue transition" @click="viewAll">View all notifications</button>
    </div>
  </div>
</template>
