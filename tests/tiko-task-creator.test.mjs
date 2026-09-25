import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'

const source = readFileSync(new URL('../components/TikoTaskCreator.vue', import.meta.url), 'utf8')
  .split('<script setup lang="ts">')[1].split('</script>')[0].replace(/^import .*$/gm, '')
const script = stripTypeScriptTypes(source) + '\n;({text,audio,result,error,sending,confirmation,deleteRetry,submit,startRecording,stopRecording,acceptAudio,uploadAudio,cancelDelete,confirmDelete,retryDelete})'
function setup(respond, mediaDevices) {
  const calls = []
  let refreshed = 0
  let nextId = 0
  const state = { value: { tasks: [['Old task', '', '', '', '', '', '123']], dashboardRecentTasks: [{ id: '123' }], dashboardDeadlines: [{ id: '123' }] } }
  const context = {
    defineProps: () => ({ active: true }), defineEmits: () => () => {},
    ref: value => ({ value }), shallowRef: value => ({ value }),
    computed: getter => ({ get value() { return getter() } }), watch: () => {}, onBeforeUnmount: () => {},
    useTaskFlowApi: () => ({ createAiTask: async (...args) => { calls.push(args); return respond(...args) }, getTask: async id => ({ id, title: 'Fix website', main_assignee_detail: { full_name: 'Muslima' } }) }),
    useTaskFlowStore: () => ({ state, loadBackendData: async () => { refreshed++ }, apiError: { value: '' } }),
    crypto: { randomUUID: () => `uuid-${++nextId}` }, URL, Blob, navigator: { mediaDevices },
    MediaRecorder: class { static isTypeSupported() { return true } },
  }
  return { ...runInNewContext(script, context), calls, state, refreshed: () => refreshed }
}

test('network retries retain ID; changed input gets a new ID', async () => {
  const ui = setup(() => { throw new Error('network') })
  ui.text.value = 'Fix website'
  await ui.submit()
  await ui.submit()
  assert.equal(ui.calls[0][0], ui.calls[1][0])
  ui.text.value = 'Fix website tomorrow'
  await ui.submit()
  assert.notEqual(ui.calls[1][0], ui.calls[2][0])
  assert.ok(ui.error.value)
  assert.equal(ui.sending.value, false)
})

test('clarification starts a new request, creation refreshes tasks', async () => {
  let attempt = 0
  const ui = setup(() => ++attempt === 1
    ? { status: 'needs_clarification', message: 'Which employee?' }
    : { status: 'created', task: { id: '123', title: 'Fix website' } })
  ui.text.value = 'Fix website'
  await ui.submit()
  assert.equal(ui.result.value.message, 'Which employee?')
  await ui.submit()
  assert.notEqual(ui.calls[0][0], ui.calls[1][0])
  assert.equal(ui.refreshed(), 1)
  assert.equal(ui.result.value.task.main_assignee_detail.full_name, 'Muslima')
  assert.equal(ui.text.value, '')
})

test('audio excludes text and retains blob and ID on retry', async () => {
  const ui = setup(() => { throw new Error('network') })
  const blob = new Blob(['voice'], { type: 'audio/webm' })
  ui.text.value = 'unsent draft'
  ui.audio.value = blob
  await ui.submit()
  await ui.submit()
  assert.equal(ui.calls[0][1].audio, blob)
  assert.equal('text' in ui.calls[0][1], false)
  assert.equal(ui.calls[0][0], ui.calls[1][0])
})

test('pending submission cannot be sent twice', async () => {
  let resolve
  const ui = setup(() => new Promise(done => { resolve = done }))
  ui.text.value = 'Fix website'
  const first = ui.submit()
  await ui.submit()
  assert.equal(ui.calls.length, 1)
  resolve({ status: 'needs_clarification', message: 'Who?' })
  await first
})

test('closing while permission is pending releases the acquired microphone', async () => {
  let resolve
  let stopped = 0
  const ui = setup(() => {}, { getUserMedia: () => new Promise(done => { resolve = done }) })
  const start = ui.startRecording()
  ui.stopRecording()
  resolve({ getTracks: () => [{ stop: () => stopped++ }] })
  await start
  assert.equal(stopped, 1)
})

test('20 MB audio is accepted; larger or empty audio is rejected', () => {
  const ui = setup(() => {})
  const max = new Blob([new Uint8Array(20 * 1024 * 1024)], { type: 'audio/webm' })
  assert.equal(ui.acceptAudio(max), true)
  assert.equal(ui.acceptAudio(new Blob([max, 'x'])), false)
  assert.match(ui.error.value, /20 MB/)
  assert.equal(ui.acceptAudio(new Blob([])), false)
  assert.equal(ui.audio.value, max)
})

test('oversized audio cannot be submitted even when assigned directly', async () => {
  const ui = setup(() => {})
  ui.audio.value = new Blob([new Uint8Array(20 * 1024 * 1024 + 1)])
  await ui.submit()
  assert.equal(ui.calls.length, 0)
})

test('microphone denial still allows an audio upload', async () => {
  const ui = setup(() => ({ status: 'needs_clarification', message: 'Who?' }), {
    getUserMedia: async () => { throw Object.assign(new Error('denied'), { name: 'NotAllowedError' }) },
  })
  await ui.startRecording()
  assert.match(ui.error.value, /upload an audio file/)
  const file = new File(['audio'], 'request.mp3', { type: 'audio/mpeg' })
  ui.uploadAudio({ target: { files: [file], value: 'request.mp3' } })
  await ui.submit()
  assert.equal(ui.calls[0][1].audio, file)
})

test('an edit refreshes task details and list', async () => {
  const ui = setup(() => ({ status: 'updated', message: 'Priority updated.', task: { id: '123', title: 'Fix website' } }))
  ui.text.value = 'Edit my last created task: set priority to high'
  await ui.submit()
  assert.equal(ui.result.value.status, 'updated')
  assert.equal(ui.result.value.task.main_assignee_detail.full_name, 'Muslima')
  assert.equal(ui.refreshed(), 1)
})

test('cancelling delete confirmation makes no second API call', async () => {
  const ui = setup(() => ({ status: 'needs_confirmation', message: 'Confirm deletion.', confirmation_code: 'abc123', task: { id: '123', title: 'Old task' } }))
  ui.text.value = 'Delete my last created task'
  await ui.submit()
  assert.equal(ui.confirmation.value.task.title, 'Old task')
  ui.cancelDelete()
  assert.equal(ui.confirmation.value, null)
  assert.equal(ui.calls.length, 1)
})

test('confirmed delete uses a fresh ID and removes the task', async () => {
  const ui = setup((id, payload) => payload.text?.startsWith('CONFIRM DELETE ')
    ? { status: 'deleted', message: 'Task deleted.', task: { id: '123', title: 'Old task' } }
    : { status: 'needs_confirmation', message: 'Confirm deletion.', confirmation_code: 'abc123', task: { id: '123', title: 'Old task' } })
  ui.text.value = 'Delete my last created task'
  await ui.submit()
  await ui.confirmDelete()
  assert.notEqual(ui.calls[0][0], ui.calls[1][0])
  assert.equal(ui.calls[1][1].text, 'CONFIRM DELETE abc123')
  assert.equal(ui.confirmation.value, null)
  assert.equal(ui.state.value.tasks.length, 0)
  assert.equal(ui.state.value.dashboardRecentTasks.length, 0)
  assert.equal(ui.state.value.dashboardDeadlines.length, 0)
  assert.equal(ui.refreshed(), 1)
})

test('failed confirmation retries with the same ID and code', async () => {
  let confirmations = 0
  const ui = setup((id, payload) => {
    if (!payload.text?.startsWith('CONFIRM DELETE ')) return { status: 'needs_confirmation', message: 'Confirm deletion.', confirmation_code: 'abc123', task: { id: '123', title: 'Old task' } }
    if (++confirmations === 1) throw new Error('network')
    return { status: 'deleted', message: 'Task deleted.', task: { id: '123', title: 'Old task' } }
  })
  ui.text.value = 'Delete my last created task'
  await ui.submit()
  await ui.confirmDelete()
  assert.ok(ui.deleteRetry.value)
  await ui.submit()
  assert.equal(ui.calls.length, 2)
  await ui.retryDelete()
  assert.equal(ui.calls[1][0], ui.calls[2][0])
  assert.equal(ui.deleteRetry.value, null)
})
