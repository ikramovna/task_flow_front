<script setup lang="ts">
import type { TaskFlowNotification } from '~/composables/useTaskFlowApi'

const props = defineProps<{ notification: TaskFlowNotification }>()
defineEmits<{ select: [notification: TaskFlowNotification] }>()

const meta = computed(() => ({
  task_assigned: { color: 'bg-task-blueSoft text-task-blue', path: 'M9 5H5v16h14V5h-4M9 3h6v4H9V3Zm7 9h5m-2.5-2.5v5' },
  deadline_reminder: { color: 'bg-task-warningSoft text-task-warning', path: 'M12 7v5l3 2M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Z' },
  task_overdue: { color: 'bg-task-dangerSoft text-task-danger', path: 'M12 8v5m0 4h.01M5 20h14L12 3 5 20Z' },
  task_completed: { color: 'bg-task-successSoft text-task-success', path: 'm7 12 3 3 7-7M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Z' },
  new_message: { color: 'bg-[#F0E9FF] text-[#6F55D9]', path: 'M4 5h16v11H8l-4 4V5Z' }
}[props.notification.notification_type] || { color: 'bg-slate-100 text-task-muted', path: 'M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Z' }))

const actorName = computed(() => props.notification.actor_detail?.full_name || props.notification.actor_detail?.email || 'TaskFlow')
const initials = computed(() => actorName.value.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase())
const relativeTime = computed(() => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(props.notification.created_at).getTime()) / 1000))
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  if (seconds < 60) return formatter.format(-seconds, 'second')
  if (seconds < 3600) return formatter.format(-Math.floor(seconds / 60), 'minute')
  if (seconds < 86400) return formatter.format(-Math.floor(seconds / 3600), 'hour')
  return formatter.format(-Math.floor(seconds / 86400), 'day')
})
</script>

<template>
  <button type="button" :class="['group flex w-full gap-3 px-4 py-3 text-left transition hover:bg-slate-50', !notification.is_read ? 'bg-task-blueSoft/60' : 'bg-white']" @click="$emit('select', notification)">
    <span :class="['mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[11px]', meta.color]"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path :d="meta.path" /></svg></span>
    <span class="min-w-0 flex-1"><span class="flex items-start justify-between gap-2"><b class="truncate text-sm text-task-ink">{{ notification.title }}</b><i v-if="!notification.is_read" class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-task-blue" /></span><span class="mt-1 line-clamp-2 block text-xs leading-5 text-task-muted">{{ notification.body }}</span><span class="mt-2 flex items-center gap-2 text-[11px] text-task-muted"><span class="grid h-5 w-5 place-items-center overflow-hidden rounded-full bg-slate-200 text-[8px] font-bold"><img v-if="notification.actor_detail?.avatar" :src="notification.actor_detail.avatar" :alt="actorName" class="h-full w-full object-cover" /><span v-else>{{ initials }}</span></span>{{ actorName }} · {{ relativeTime }}</span></span>
  </button>
</template>
