<script setup lang="ts">
import type { AiTaskResponse } from '~/composables/useTaskFlowApi'
import AppConfirmModal from '~/components/ui/AppConfirmModal.vue'

const props = defineProps<{ active: boolean }>()
const emit = defineEmits<{ busy: [value: boolean] }>()
const api = useTaskFlowApi()
const store = useTaskFlowStore()
const text = ref('')
const audio = shallowRef<Blob | null>(null)
const audioUrl = ref('')
const audioInput = ref<HTMLInputElement | null>(null)
const maxAudioBytes = 20 * 1024 * 1024
const acceptAudio = (blob: Blob) => {
  if (!blob.size || blob.size > maxAudioBytes) {
    error.value = blob.size ? 'Audio must be 20 MB or smaller.' : 'The audio file is empty. Please choose another file.'
    return false
  }
  clearAudio()
  audio.value = blob
  audioUrl.value = URL.createObjectURL(blob)
  error.value = ''
  result.value = null
  return true
}
const uploadAudio = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || busy.value) return
  if (!file.type.startsWith('audio/') && !/\.(webm|mp3|mp4|m4a|wav|ogg|oga|aac|flac)$/i.test(file.name)) {
    error.value = 'Please choose an audio file.'
    return
  }
  acceptAudio(file)
}
const recording = ref(false)
const starting = ref(false)
const stopping = ref(false)
const sending = ref(false)
const error = ref('')
const result = ref<AiTaskResponse | null>(null)
const confirmation = ref<Extract<AiTaskResponse, { status: 'needs_confirmation' }> | null>(null)
const deleteRetry = ref<{ id: string; text: string } | null>(null)
let pending: { id: string; text: string; audio: Blob | null } | null = null
let recorder: MediaRecorder | null = null
let stream: MediaStream | null = null
let disposed = false
let captureVersion = 0
const busy = computed(() => starting.value || stopping.value || recording.value || sending.value)
watch(busy, value => emit('busy', value), { flush: 'sync' })
const task = computed(() => result.value?.status === 'created' || result.value?.status === 'updated' ? result.value.task : null)
const assignee = computed(() => {
  const person = task.value?.main_assignee_detail
  return person?.full_name || [person?.first_name, person?.last_name].filter(Boolean).join(' ') || person?.email
    || task.value?.assignee_details?.map(user => user.full_name || [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email).filter(Boolean).join(', ')
    || task.value?.assignee_name || 'Unassigned'
})
const deadline = computed(() => {
  const value = task.value?.due_date
  if (!value) return 'Not set'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB')
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
    error.value = 'Microphone recording is unavailable. Open the site over HTTPS or enter your request as text.'
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
    let recordedBytes = 0
    capture.ondataavailable = event => {
      if (failed || !event.data.size) return
      recordedBytes += event.data.size
      if (recordedBytes > maxAudioBytes) {
        failed = true
        error.value = 'Recording exceeded 20 MB. Please record a shorter message.'
        stopRecording()
        return
      }
      chunks.push(event.data)
    }
    capture.onerror = () => {
      failed = true
      error.value = 'Could not record audio. Try again or enter your request as text.'
      stopRecording()
    }
    capture.onstop = () => {
      stopping.value = false
      recording.value = false
      releaseStream()
      if (disposed || failed) return
      const blob = new Blob(chunks, { type: capture.mimeType || chunks[0]?.type || 'audio/webm' })
      if (!blob.size) { error.value = 'No audio was recorded. Please try again.'; return }
      acceptAudio(blob)
    }
    capture.start(1000)
    clearAudio()
    result.value = null
    recording.value = true
  } catch (cause: any) {
    releaseStream()
    error.value = cause?.name === 'NotAllowedError'
      ? 'Microphone access was denied. You can type your request or upload an audio file instead.'
      : 'Could not start the microphone. You can type your request or upload an audio file instead.'
  } finally {
    if (version === captureVersion) starting.value = false
  }
}
watch(() => props.active, active => {
  if (!active) {
    stopRecording()
    confirmation.value = null
  }
})
onBeforeUnmount(() => {
  disposed = true
  stopRecording()
  clearAudio()
})
const sendRequest = async (request: { id: string; text: string; audio: Blob | null }, confirmingDelete = false) => {
  sending.value = true
  error.value = ''
  result.value = null
  try {
    const response = await api.createAiTask(request.id, request.audio ? { audio: request.audio } : { text: request.text })
    if (!['created', 'updated', 'needs_confirmation', 'deleted', 'needs_clarification'].includes(response.status)) throw new Error('Unexpected response received.')
    if (response.status !== 'needs_clarification' && !response.task?.id) throw new Error('Incomplete task details received.')
    if (response.status === 'needs_confirmation' && (!response.confirmation_code || !response.task.title)) throw new Error('Incomplete delete confirmation received.')
    result.value = response
    pending = null
    deleteRetry.value = null
    clearAudio()
    if (response.status === 'needs_confirmation') {
      confirmation.value = response
    } else if (response.status === 'deleted') {
      confirmation.value = null
      text.value = ''
      store.state.value.tasks = store.state.value.tasks.filter(row => String(row[6]) !== String(response.task.id))
      store.state.value.dashboardRecentTasks = store.state.value.dashboardRecentTasks.filter(item => String(item.id) !== String(response.task.id))
      store.state.value.dashboardDeadlines = store.state.value.dashboardDeadlines.filter(item => String(item.id) !== String(response.task.id))
      await store.loadBackendData()
      if (store.apiError.value) error.value = 'The task was deleted, but the task list could not be refreshed. Please refresh the page.'
    } else if (response.status === 'created' || response.status === 'updated') {
      text.value = ''
      const [details] = await Promise.allSettled([api.getTask(String(response.task.id)), store.loadBackendData()])
      if (details.status === 'fulfilled') result.value = { ...response, task: { ...response.task, ...details.value } }
      if (store.apiError.value) error.value = 'The task was saved, but the task list could not be refreshed. Please refresh the page.'
    }
  } catch (cause: any) {
    const status = cause?.statusCode || cause?.status || cause?.response?.status
    if (confirmingDelete && status === 400) deleteRetry.value = null
    error.value = status === 413 ? 'The audio file is too large. Please send a shorter recording.'
      : status === 429 ? 'Too many requests. Please try again shortly.'
        : status === 400 && confirmingDelete ? 'The confirmation has expired or is invalid. Please request deletion again.'
        : status === 400 ? 'Your request could not be accepted. Check the task details or record your audio again.'
        : status === 401 ? 'Your session has expired. Please sign in again.'
        : status === 403 ? 'You do not have permission to create tasks.'
        : status === 415 ? 'This audio format is not supported. Please send your request as text.'
        : 'Could not complete your request. Check your internet connection and try again.'
  } finally {
    sending.value = false
  }
}
const submit = async () => {
  if (busy.value || confirmation.value || deleteRetry.value || (!audio.value && !text.value.trim())) return
  if (audio.value && audio.value.size > maxAudioBytes) {
    error.value = 'Audio must be 20 MB or smaller.'
    return
  }
  const draft = audio.value ? '' : text.value.trim()
  if (!pending || pending.text !== draft || pending.audio !== audio.value) {
    pending = { id: crypto.randomUUID(), text: draft, audio: audio.value }
  }
  await sendRequest(pending)
}
const cancelDelete = () => {
  if (sending.value) return
  confirmation.value = null
  result.value = null
}
const confirmDelete = async () => {
  if (!confirmation.value || busy.value) return
  const code = confirmation.value.confirmation_code
  confirmation.value = null
  deleteRetry.value = { id: crypto.randomUUID(), text: `CONFIRM DELETE ${code}` }
  await retryDelete()
}
const retryDelete = async () => {
  if (!deleteRetry.value || busy.value) return
  await sendRequest({ ...deleteRetry.value, audio: null }, true)
}
</script>

<template>
  <form class="mt-4 space-y-3" @submit.prevent="submit">
    <p class="text-xs leading-5 text-task-muted">Create, edit, or delete a task by typing or recording a request.</p>
    <label for="tiko-task-text" class="block text-xs font-semibold">Task request</label>
    <textarea id="tiko-task-text" v-model="text" class="tf-input min-h-32 w-full resize-y rounded-[13px] p-3 text-sm" placeholder="Edit my last created task: set priority to high" :disabled="busy || !!audio || !!confirmation || !!deleteRetry" />
    <button type="button" class="flex min-h-10 items-center gap-2 rounded-ui border border-task-line px-3 text-sm disabled:opacity-50" :disabled="sending || starting || stopping || !!deleteRetry" :aria-pressed="recording" @click="recording ? stopRecording() : startRecording()">
      <svg viewBox="0 0 24 24" class="h-5 w-5" :class="recording ? 'text-red-500 animate-pulse' : 'text-task-blue'" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" /></svg>
      {{ starting ? 'Waiting for microphone…' : stopping ? 'Preparing recording…' : recording ? 'Stop recording' : 'Record voice' }}
    </button>
    <button type="button" class="min-h-10 rounded-ui border border-task-line px-3 text-sm disabled:opacity-50" :disabled="busy || !!deleteRetry" @click="audioInput?.click()">Upload audio</button>
    <input ref="audioInput" type="file" accept="audio/*,.webm,.mp4,.m4a" class="hidden" aria-label="Upload audio" :disabled="busy || !!deleteRetry" @change="uploadAudio" />
    <p class="text-xs text-task-muted">Audio files up to 20 MB. Telegram is not required to create tasks.</p>
    <p v-if="recording" role="status" class="text-xs text-red-500">Recording…</p>
    <div v-if="audioUrl" class="space-y-2">
      <audio :src="audioUrl" controls class="w-full" />
      <p class="text-xs text-task-muted">Only the recording will be sent. Remove it to send text instead.</p>
      <button type="button" class="text-xs text-task-blue" :disabled="busy" @click="clearAudio">Remove recording</button>
    </div>
    <p v-if="error" role="alert" class="text-sm text-red-500">{{ error }}</p>
    <div v-if="result?.status === 'needs_clarification'" role="status" class="rounded-ui border border-task-line p-3 text-sm">
      <p>{{ result.message }}</p>
      <p class="mt-2 text-xs text-task-muted">Please send the complete, corrected request again.</p>
    </div>
    <div v-if="result?.status === 'deleted'" role="status" class="rounded-ui border border-task-line p-3 text-sm">
      <p class="font-bold">{{ result.message || `Task deleted: ${result.task.title}` }}</p>
    </div>
    <div v-if="task" role="status" class="space-y-2 rounded-ui border border-task-line p-3 text-sm">
      <p v-if="result?.message" class="whitespace-pre-line">{{ result.message }}</p>
      <p class="font-bold">Task {{ result?.status === 'updated' ? 'updated' : 'created' }}: {{ task.title }}</p>
      <p>Assignee: {{ assignee }}</p>
      <p>Deadline: {{ deadline }}</p>
      <NuxtLink :to="`/tasks/${encodeURIComponent(String(task.id))}`" class="inline-block font-semibold text-task-blue">Open task →</NuxtLink>
    </div>
    <div v-if="deleteRetry" class="flex flex-wrap gap-2">
      <button type="button" class="tf-primary min-h-11 flex-1 rounded-xl px-4 text-sm disabled:opacity-50" :disabled="busy" @click="retryDelete">{{ sending ? 'Analyzing…' : 'Retry confirmed deletion' }}</button>
      <button type="button" class="min-h-11 rounded-xl border border-task-line px-4 text-sm disabled:opacity-50" :disabled="busy" @click="deleteRetry = null; store.loadBackendData()">Dismiss</button>
    </div>
    <button v-else type="submit" class="tf-primary min-h-12 w-full rounded-[12px] text-sm disabled:opacity-50" :disabled="busy || !!confirmation || (!text.trim() && !audio)">
      {{ sending ? 'Analyzing…' : 'Send request' }}
    </button>
    <p v-if="sending" role="status" class="sr-only">Analyzing…</p>
  </form>
  <AppConfirmModal v-if="confirmation" title="Delete task?" :message="`Delete “${confirmation.task.title}”? This action cannot be undone.`" confirm-label="Delete task" cancel-label="Cancel" @confirm="confirmDelete" @cancel="cancelDelete" />
</template>
