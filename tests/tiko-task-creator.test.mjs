import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'

const source = readFileSync(new URL('../components/TikoTaskCreator.vue', import.meta.url), 'utf8')
  .split('<script setup lang="ts">')[1].split('</script>')[0].replace(/^import type .*$/gm, '')
const script = stripTypeScriptTypes(source) + '\n;({text,audio,result,error,sending,submit,startRecording,stopRecording,acceptAudio,uploadAudio})'
function setup(respond, mediaDevices) {
  const calls = []
  let refreshed = 0
  let nextId = 0
  const context = {
    defineProps: () => ({ active: true }), defineEmits: () => () => {},
    ref: value => ({ value }), shallowRef: value => ({ value }),
    computed: getter => ({ get value() { return getter() } }), watch: () => {}, onBeforeUnmount: () => {},
    useTaskFlowApi: () => ({ createAiTask: async (...args) => { calls.push(args); return respond(...args) }, getTask: async id => ({ id, title: 'Fix website', main_assignee_detail: { full_name: 'Muslima' } }) }),
    useTaskFlowStore: () => ({ loadBackendData: async () => { refreshed++ }, apiError: { value: '' } }),
    crypto: { randomUUID: () => `uuid-${++nextId}` }, URL, Blob, navigator: { mediaDevices },
    MediaRecorder: class { static isTypeSupported() { return true } },
  }
  return { ...runInNewContext(script, context), calls, refreshed: () => refreshed }
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
