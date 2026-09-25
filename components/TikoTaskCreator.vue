<script setup lang="ts">
import type { AiTaskResponse } from '~/composables/useTaskFlowApi'

const props = defineProps<{ active: boolean }>()
const emit = defineEmits<{ busy: [value: boolean] }>()
const api = useTaskFlowApi()
const store = useTaskFlowStore()
const text = ref('')
const audio = shallowRef<Blob | null>(null)
const audioUrl = ref('')
const recording = ref(false)
const starting = ref(false)
const stopping = ref(false)
const sending = ref(false)
const error = ref('')
const result = ref<AiTaskResponse | null>(null)
let pending: { id: string; text: string; audio: Blob | null } | null = null
let recorder: MediaRecorder | null = null
let stream: MediaStream | null = null
let disposed = false
let captureVersion = 0
const busy = computed(() => starting.value || stopping.value || recording.value || sending.value)
watch(busy, value => emit('busy', value), { flush: 'sync' })
const task = computed(() => result.value?.status === 'created' ? result.value.task : null)
const assignee = computed(() => {
  const person = task.value?.main_assignee_detail
  return person?.full_name || [person?.first_name, person?.last_name].filter(Boolean).join(' ') || person?.email
    || task.value?.assignee_details?.map(user => user.full_name || [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email).filter(Boolean).join(', ')
    || task.value?.assignee_name || 'Belgilanmagan'
})
const deadline = computed(() => {
  const value = task.value?.due_date
  if (!value) return 'Belgilanmagan'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('uz-UZ')
})
const clearAudio = () => {
  if (audioUrl.value) URL.revokeObjectURL(audioUrl.value)
  audioUrl.value = ''
  audio.value = null
}
const releaseStream = () => {
  stream?.getTracks().forEach(track => track.stop())
  stream = null
}
const stopRecording = () => {
  captureVersion++
  starting.value = false
  if (recorder && recorder.state !== 'inactive') {
    stopping.value = true
    recorder.stop()
  }
  recording.value = false
  releaseStream()
}
const startRecording = async () => {
  if (busy.value) return
  error.value = ''
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    error.value = 'Bu brauzerda mikrofon mavjud emas. HTTPS orqali oching yoki matn kiriting.'
    return
  }
  const version = ++captureVersion
  starting.value = true
  try {
    const media = await navigator.mediaDevices.getUserMedia({ audio: true })
    if (disposed || !props.active || version !== captureVersion) {
      media.getTracks().forEach(track => track.stop())
      return
    }
    stream = media
    const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(type => MediaRecorder.isTypeSupported(type))
    const capture = new MediaRecorder(media, mimeType ? { mimeType } : undefined)
    recorder = capture
    const chunks: Blob[] = []
    let failed = false
    capture.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
    capture.onerror = () => {
      failed = true
      error.value = 'Ovozni yozib bo‘lmadi. Qayta urinib ko‘ring yoki matn kiriting.'
      stopRecording()
    }
    capture.onstop = () => {
      stopping.value = false
      recording.value = false
      releaseStream()
      if (disposed || failed) return
      const blob = new Blob(chunks, { type: capture.mimeType || chunks[0]?.type || 'audio/webm' })
      if (!blob.size) { error.value = 'Ovoz yozilmadi. Qayta urinib ko‘ring.'; return }
      clearAudio()
      audio.value = blob
      audioUrl.value = URL.createObjectURL(blob)
    }
    capture.start()
    clearAudio()
    result.value = null
    recording.value = true
  } catch (cause: any) {
    releaseStream()
    error.value = cause?.name === 'NotAllowedError'
      ? 'Mikrofonga ruxsat berilmadi. Brauzer sozlamalarida ruxsat bering yoki matn kiriting.'
      : 'Mikrofonni ishga tushirib bo‘lmadi. Qurilmani tekshiring yoki matn kiriting.'
  } finally {
    if (version === captureVersion) starting.value = false
  }
}
watch(() => props.active, active => { if (!active) stopRecording() })
onBeforeUnmount(() => {
  disposed = true
  stopRecording()
  clearAudio()
})
const submit = async () => {
  if (busy.value || (!audio.value && !text.value.trim())) return
  sending.value = true
  error.value = ''
  result.value = null
  try {
    const draft = audio.value ? '' : text.value.trim()
    if (!pending || pending.text !== draft || pending.audio !== audio.value) {
      pending = { id: crypto.randomUUID(), text: draft, audio: audio.value }
    }
    const response = await api.createAiTask(pending.id, pending.audio ? { audio: pending.audio } : { text: pending.text })
    if (response.status !== 'created' && response.status !== 'needs_clarification') throw new Error('Kutilmagan javob olindi.')
    if (response.status === 'created' && !response.task?.id) throw new Error('Task ma’lumotlari to‘liq kelmadi.')
    result.value = response
    pending = null
    clearAudio()
    if (response.status === 'created') {
      text.value = ''
      const [details] = await Promise.allSettled([api.getTask(String(response.task.id)), store.loadBackendData()])
      if (details.status === 'fulfilled') result.value = { ...response, task: { ...response.task, ...details.value } }
      if (store.apiError.value) error.value = 'Task yaratildi, lekin ro‘yxatni yangilab bo‘lmadi. Sahifani yangilang.'
    }
  } catch (cause: any) {
    const status = cause?.statusCode || cause?.status || cause?.response?.status
    const detail = cause?.data?.message || cause?.data?.detail
    error.value = status === 413 ? 'Ovoz fayli juda katta. Qisqaroq yozuv yuboring.'
      : status === 429 ? 'So‘rovlar ko‘payib ketdi. Birozdan keyin qayta urinib ko‘ring.'
        : status === 400 && typeof detail === 'string' ? detail
        : status === 401 ? 'Sessiya tugadi. Qayta tizimga kiring.'
        : status === 403 ? 'Task yaratish uchun ruxsat yetarli emas.'
        : status === 415 ? 'Bu ovoz formati qabul qilinmadi. Matn orqali yuboring.'
        : 'So‘rovni bajarib bo‘lmadi. Internet aloqasini tekshiring va qayta urinib ko‘ring.'
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <form class="mt-4 space-y-3" @submit.prevent="submit">
    <p class="text-xs leading-5 text-task-muted">Task, mas’ul xodim va deadline haqida yozing yoki ovoz yozib yuboring.</p>
    <label for="tiko-task-text" class="block text-xs font-semibold">Task so‘rovi</label>
    <textarea id="tiko-task-text" v-model="text" class="tf-input min-h-32 w-full resize-y rounded-[13px] p-3 text-sm" placeholder="Muslima Zokirjonovaga websiteni fix qilish, deadline 23 may" :disabled="busy || !!audio" />
    <button type="button" class="flex min-h-10 items-center gap-2 rounded-ui border border-task-line px-3 text-sm disabled:opacity-50" :disabled="sending || starting || stopping" :aria-pressed="recording" @click="recording ? stopRecording() : startRecording()">
      <svg viewBox="0 0 24 24" class="h-5 w-5" :class="recording ? 'text-red-500 animate-pulse' : 'text-task-blue'" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" /></svg>
      {{ starting ? 'Mikrofon kutilmoqda…' : stopping ? 'Yozuv tayyorlanmoqda…' : recording ? 'Yozishni to‘xtatish' : 'Ovoz yozish' }}
    </button>
    <p v-if="recording" role="status" class="text-xs text-red-500">Ovoz yozilmoqda…</p>
    <div v-if="audioUrl" class="space-y-2">
      <audio :src="audioUrl" controls class="w-full" />
      <p class="text-xs text-task-muted">Faqat ovoz yuboriladi. Matn yuborish uchun yozuvni o‘chiring.</p>
      <button type="button" class="text-xs text-task-blue" :disabled="busy" @click="clearAudio">Yozuvni o‘chirish</button>
    </div>
    <p v-if="error" role="alert" class="text-sm text-red-500">{{ error }}</p>
    <div v-if="result?.status === 'needs_clarification'" role="status" class="rounded-ui border border-task-line p-3 text-sm">
      <p>{{ result.message }}</p>
      <p class="mt-2 text-xs text-task-muted">To‘liq tuzatilgan so‘rovni qayta yuboring.</p>
    </div>
    <div v-if="task" role="status" class="space-y-2 rounded-ui border border-task-line p-3 text-sm">
      <p class="font-bold">Task yaratildi: {{ task.title }}</p>
      <p>Mas’ul: {{ assignee }}</p>
      <p>Deadline: {{ deadline }}</p>
      <NuxtLink :to="`/tasks/${encodeURIComponent(String(task.id))}`" class="inline-block font-semibold text-task-blue">Taskni ochish →</NuxtLink>
    </div>
    <button type="submit" class="tf-primary min-h-12 w-full rounded-[12px] text-sm disabled:opacity-50" :disabled="busy || (!text.trim() && !audio)">
      {{ sending ? 'Tahlil qilinmoqda…' : 'Task yaratish' }}
    </button>
    <p v-if="sending" role="status" class="sr-only">Tahlil qilinmoqda…</p>
  </form>
</template>
