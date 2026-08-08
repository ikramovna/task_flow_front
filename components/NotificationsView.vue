<script setup lang="ts">
import type { TaskFlowNotification } from '~/composables/useTaskFlowApi'

const emit = defineEmits<{ navigate: [target: { kind: 'task' | 'message'; id: string }] }>()
const { state, load, refreshUnreadCount, markRead, markAllRead } = useNotifications()
const tab = ref<'all' | 'unread'>('all')
const page = ref(1)
const pageSize = 10
const pageCount = computed(() => Math.max(1, Math.ceil(state.value.totalCount / pageSize)))
const fetchPage = async () => { try { await load({ unread: tab.value === 'unread' ? true : undefined, page: page.value, pageSize }) } catch { /* rendered */ } }
watch(tab, () => { page.value = 1; void fetchPage() })
watch(page, fetchPage)
const select = async (item: TaskFlowNotification) => {
  try { await markRead(item) } catch { return }
  const taskId = notificationRelationId(item.task)
  const messageId = notificationRelationId(item.message)
  if (taskId) emit('navigate', { kind: 'task', id: taskId })
  else if (messageId) emit('navigate', { kind: 'message', id: messageId })
}
const allRead = async () => { try { await markAllRead(); await fetchPage() } catch { /* rolled back */ } }
onMounted(() => { void refreshUnreadCount(); void fetchPage() })
</script>

<template>
  <section class="tf-panel mx-auto w-full max-w-5xl overflow-hidden p-0">
    <div class="flex items-center justify-between gap-4 border-b border-task-line p-4">
      <div class="flex gap-1" role="tablist"><button v-for="item in [{ key: 'all', label: 'All' }, { key: 'unread', label: 'Unread' }]" :key="item.key" type="button" role="tab" :aria-selected="tab === item.key" :class="['rounded-xl px-4 py-2 text-sm font-bold transition', tab === item.key ? 'bg-task-blueSoft text-task-blue' : 'text-task-muted hover:bg-slate-50']" @click="tab = item.key as typeof tab">{{ item.label }}</button></div>
      <button v-if="state.unreadCount" type="button" class="tf-primary h-10 px-4" @click="allRead">Mark all as read</button>
    </div>
    <div v-if="state.loading" class="space-y-3 p-5"><div v-for="i in 5" :key="i" class="h-24 animate-pulse rounded-xl bg-slate-100" /></div>
    <div v-else-if="state.error" class="grid min-h-72 place-items-center p-8 text-center"><div><p class="font-bold text-task-danger">Could not load notifications</p><p class="mt-2 text-sm text-task-muted">{{ state.error }}</p><button type="button" class="tf-primary mt-4 h-10 px-5" @click="fetchPage">Try again</button></div></div>
    <div v-else-if="!state.notifications.length" class="grid min-h-72 place-items-center p-8 text-center"><div><span class="mx-auto grid h-14 w-14 place-items-center rounded-full bg-task-blueSoft text-2xl">✓</span><p class="mt-4 font-bold">{{ tab === 'unread' ? 'You have read all notifications' : 'No notifications yet' }}</p><p class="mt-2 text-sm text-task-muted">Updates about tasks, deadlines, and messages will appear here.</p></div></div>
    <div v-else class="divide-y divide-task-line"><NotificationItem v-for="item in state.notifications" :key="item.id" :notification="item" @select="select" /></div>
    <footer v-if="!state.loading && pageCount > 1" class="flex items-center justify-between border-t border-task-line px-4 py-3 text-xs text-task-muted"><span>{{ state.totalCount }} notifications</span><div class="flex items-center gap-2"><button type="button" class="tf-icon-button" :disabled="page === 1" @click="page--">‹</button><span>{{ page }} / {{ pageCount }}</span><button type="button" class="tf-icon-button" :disabled="page === pageCount" @click="page++">›</button></div></footer>
  </section>
</template>
