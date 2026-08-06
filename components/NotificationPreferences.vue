<script setup lang="ts">
import type { NotificationPreferences } from '~/composables/useTaskFlowApi'

const api = useTaskFlowApi()
const preferences = reactive<NotificationPreferences>({ task_assigned: true, deadline_reminder: true, task_overdue: true, task_updates: true, team_messages: true })
const loading = ref(true)
const saving = ref<keyof NotificationPreferences | null>(null)
const error = ref('')
const fields: Array<{ key: keyof NotificationPreferences; label: string; hint: string }> = [
  { key: 'task_assigned', label: 'Vazifa biriktirilganda', hint: 'Sizga yangi vazifa biriktirilsa xabar oling.' },
  { key: 'deadline_reminder', label: 'Muddat eslatmasi', hint: 'Vazifa muddati yaqinlashganda eslatma oling.' },
  { key: 'task_overdue', label: 'Kechikkan vazifalar', hint: 'Vazifa muddati o‘tib ketganda xabar oling.' },
  { key: 'task_updates', label: 'Vazifa yangilanishlari', hint: 'Vazifa holati o‘zgarganda xabar oling.' },
  { key: 'team_messages', label: 'Jamoa xabarlari', hint: 'Yangi chat xabarlari haqida bildirishnoma oling.' }
]

const load = async () => {
  loading.value = true; error.value = ''
  try { Object.assign(preferences, await api.getNotificationPreferences()) }
  catch (e) { error.value = taskFlowApiErrorMessage(e, 'Sozlamalarni yuklab bo‘lmadi') }
  finally { loading.value = false }
}
const update = async (key: keyof NotificationPreferences) => {
  const previous = !preferences[key]
  saving.value = key; error.value = ''
  try { Object.assign(preferences, await api.patchNotificationPreferences({ [key]: preferences[key] })) }
  catch (e) { preferences[key] = previous; error.value = taskFlowApiErrorMessage(e, 'Sozlamani saqlab bo‘lmadi') }
  finally { saving.value = null }
}
onMounted(load)
</script>

<template>
  <section class="tf-panel p-5 sm:p-7">
    <div class="flex items-start gap-3"><span class="grid h-10 w-10 place-items-center rounded-xl bg-task-blueSoft text-task-blue"><svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8.3 12a2.5 2.5 0 0 0 4.6 0" /></svg></span><div><h2 class="text-xl font-bold">Notification sozlamalari</h2><p class="mt-1 text-sm text-task-muted">Qaysi hodisalar haqida xabar olishni tanlang.</p></div></div>
    <div v-if="loading" class="mt-5 space-y-3"><div v-for="i in 5" :key="i" class="h-14 animate-pulse rounded-xl bg-slate-100" /></div>
    <div v-else class="mt-5 divide-y divide-task-line"><label v-for="field in fields" :key="field.key" class="flex cursor-pointer items-center justify-between gap-4 py-3"><span><b class="block text-sm">{{ field.label }}</b><span class="mt-1 block text-xs text-task-muted">{{ field.hint }}</span></span><input v-model="preferences[field.key]" type="checkbox" class="h-5 w-5 shrink-0 accent-task-blue" :disabled="saving === field.key" @change="update(field.key)" /></label></div>
    <div v-if="error" class="mt-4 flex items-center justify-between rounded-xl bg-task-dangerSoft px-4 py-3 text-xs text-task-danger"><span>{{ error }}</span><button type="button" class="font-bold" @click="load">Qayta urinish</button></div>
  </section>
</template>
