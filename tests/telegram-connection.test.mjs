import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'

const source = readFileSync(new URL('../components/TelegramConnection.vue', import.meta.url), 'utf8')
  .split('<script setup lang="ts">')[1].split('</script>')[0]
const script = stripTypeScriptTypes(source) + '\n;({connected,connectUrl,error,loading,changing,refresh,connect,disconnect,onReturn})'
function setup(url = 'https://t.me/taskflow_bot?start=example') {
  let serverConnected = false
  const ui = runInNewContext(script, {
    ref: value => ({ value }), onMounted: () => {}, onBeforeUnmount: () => {}, URL,
    document: { visibilityState: 'visible' }, window: { open: () => null },
    useTaskFlowApi: () => ({
      getTelegramConnection: async () => ({
        is_connected: serverConnected,
        telegram_username: serverConnected ? 'taskflow_user' : '',
        notifications_enabled: true,
        connected_at: serverConnected ? '2026-09-25T00:00:00Z' : null,
      }),
      connectTelegram: async () => ({ connect_url: url }),
      disconnectTelegram: async () => { serverConnected = false },
    }),
  })
  return { ...ui, completeConnection: () => { serverConnected = true } }
}
test('blocked popup retains a usable link; return refreshes status; disconnect clears it', async () => {
  const ui = setup()
  await ui.refresh()
  assert.equal(ui.connected.value, false)
  assert.equal(ui.error.value, '')
  assert.equal(ui.loading.value || ui.changing.value || ui.connected.value === null, false)
  await ui.connect()
  assert.match(ui.connectUrl.value, /^https:\/\/t.me\//)
  ui.completeConnection()
  ui.onReturn()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(ui.connected.value, true)
  assert.equal(ui.connectUrl.value, '')
  await ui.disconnect()
  assert.equal(ui.connected.value, false)
})
test('unexpected connection URL is never exposed as a link', async () => {
  const ui = setup('javascript:alert(1)')
  await ui.connect()
  assert.equal(ui.connectUrl.value, '')
  assert.match(ui.error.value, /Could not open Telegram/)
})
