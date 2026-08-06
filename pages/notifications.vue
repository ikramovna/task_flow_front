<script setup lang="ts">
import type { TaskFlowNotification } from '~/composables/useTaskFlowApi'

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
  if (item.task) await navigateTo(`/tasks/${item.task}`)
  else if (item.message) await navigateTo(`/#messages?message=${encodeURIComponent(item.message)}`)
}
const allRead = async () => { try { await markAllRead(); await fetchPage() } catch { /* rolled back */ } }
onMounted(() => { void refreshUnreadCount(); void fetchPage() })
</script>

<template>
  <main class="min-h-screen bg-task-page p-4 text-task-ink sm:p-8">
    <section class="mx-auto max-w-4xl">
      <header class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div class="flex items-center gap-3"><NuxtLink to="/" class="tf-icon-button" aria-label="Ortga">←</NuxtLink><div><h1 class="text-2xl font-bold">Notificationlar</h1><p class="mt-1 text-sm text-task-muted">Barcha yangilik va eslatmalar bir joyda.</p></div></div><button v-if="state.unreadCount" type="button" class="tf-primary h-10 px-4" @click="allRead">Barchasini o‘qilgan qilish</button></header>
      <div class="tf-panel overflow-hidden p-0">
        <div class="flex gap-1 border-b border-task-line p-3" role="tablist"><button v-for="item in [{ key: 'all', label: 'Barchasi' }, { key: 'unread', label: 'O‘qilmagan' }]" :key="item.key" type="button" role="tab" :aria-selected="tab === item.key" :class="['rounded-xl px-4 py-2 text-sm font-bold transition', tab === item.key ? 'bg-task-blueSoft text-task-blue' : 'text-task-muted hover:bg-slate-50']" @click="tab = item.key as typeof tab">{{ item.label }}</button></div>
        <div v-if="state.loading" class="space-y-3 p-5"><div v-for="i in 5" :key="i" class="h-24 animate-pulse rounded-xl bg-slate-100" /></div>
        <div v-else-if="state.error" class="grid min-h-72 place-items-center p-8 text-center"><div><p class="font-bold text-task-danger">Notificationlarni yuklab bo‘lmadi</p><p class="mt-2 text-sm text-task-muted">{{ state.error }}</p><button type="button" class="tf-primary mt-4 h-10 px-5" @click="fetchPage">Qayta urinish</button></div></div>
        <div v-else-if="!state.notifications.length" class="grid min-h-72 place-items-center p-8 text-center"><div><span class="mx-auto grid h-14 w-14 place-items-center rounded-full bg-task-blueSoft text-2xl">✓</span><p class="mt-4 font-bold">{{ tab === 'unread' ? 'Barcha notificationlarni o‘qib bo‘lgansiz' : 'Hozircha notificationlar yo‘q' }}</p></div></div>
        <div v-else class="divide-y divide-task-line"><NotificationItem v-for="item in state.notifications" :key="item.id" :notification="item" @select="select" /></div>
        <footer v-if="!state.loading && pageCount > 1" class="flex items-center justify-between border-t border-task-line px-4 py-3 text-xs text-task-muted"><span>{{ state.totalCount }} ta notification</span><div class="flex items-center gap-2"><button type="button" class="tf-icon-button" :disabled="page === 1" @click="page--">‹</button><span>{{ page }} / {{ pageCount }}</span><button type="button" class="tf-icon-button" :disabled="page === pageCount" @click="page++">›</button></div></footer>
      </div>
    </section>
  </main>
</template>
