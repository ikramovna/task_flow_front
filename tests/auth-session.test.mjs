import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'

const apiSource = readFileSync(new URL('../composables/useTaskFlowApi.ts', import.meta.url), 'utf8')
const middlewareSource = readFileSync(new URL('../middleware/auth.global.ts', import.meta.url), 'utf8')
const compile = (source, server = false) => stripTypeScriptTypes(source
  .replaceAll('import.meta.client', String(!server))
  .replaceAll('import.meta.server', String(server))
  .replaceAll('import.meta.prerender', 'false'))
  .replace(/export const /g, 'const ')

const unauthorized = () => Object.assign(new Error('Unauthorized'), { statusCode: 401 })
const deferred = () => {
  let resolve, reject
  const promise = new Promise((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}
const tick = () => new Promise(resolve => setImmediate(resolve))

function setup(respond, { stored, cookies = {}, blockedStorage = false, server = false } = {}) {
  const cookieJar = new Map(Object.entries(cookies))
  const pendingCookies = new Map()
  const storage = new Map(stored === undefined ? [] : [['taskflow-auth', stored]])
  const state = new Map()
  const calls = []
  const redirects = []
  const nuxtApp = { isHydrating: true, payload: { serverRendered: true } }
  const browserStorage = {
    getItem: key => { if (blockedStorage) throw new Error('Storage blocked'); return storage.get(key) ?? null },
    setItem: (key, value) => { if (blockedStorage) throw new Error('Storage blocked'); storage.set(key, value) },
    removeItem: key => { if (blockedStorage) throw new Error('Storage blocked'); storage.delete(key) },
  }
  const context = {
    Headers, URL, FormData, Blob, console,
    localStorage: browserStorage, sessionStorage: browserStorage,
    useCookie: key => {
      let value = cookieJar.get(key)
      return { get value() { return value }, set value(next) { value = next; pendingCookies.set(key, next) } }
    },
    useState: (key, initial) => {
      if (!state.has(key)) state.set(key, { value: initial() })
      return state.get(key)
    },
    useNuxtApp: () => nuxtApp,
    useRuntimeConfig: () => ({ public: { apiBase: '/api/v1' } }),
    nextTick: async () => {
      for (const [key, value] of pendingCookies) cookieJar.set(key, value)
      pendingCookies.clear()
    },
    navigateTo: (path, options) => { redirects.push({ path, options }); return path },
    $fetch: async (url, options) => {
      calls.push({ url, token: options.headers?.get('Authorization') })
      return await respond(url, options)
    },
    defineNuxtRouteMiddleware: handler => handler,
  }
  const { useTaskFlowApi, taskFlowHasSession } = runInNewContext(
    compile(apiSource, server) + '\n;({ useTaskFlowApi, taskFlowHasSession })', context)
  const middleware = runInNewContext(
    compile(middlewareSource, server).replace('export default ', ''), { ...context, taskFlowHasSession })
  return { api: useTaskFlowApi(), newApi: useTaskFlowApi, taskFlowHasSession, middleware, storage, cookieJar, calls, redirects }
}
const initialCookies = { 'taskflow-access': 'expired-access', 'taskflow-refresh': 'valid-refresh' }

test('login remains accessible with stored tokens on the server and during hydration', () => {
  for (const server of [true, false]) {
    const ui = setup(() => {}, { cookies: initialCookies, stored: JSON.stringify({ access: 'old', refresh: 'old' }), server })
    for (const path of ['/login', '/logout', '/forgot-password', '/reset-password']) ui.middleware({ path })
    assert.equal(ui.redirects.length, 0)
  }
})

test('protected routes require a complete token pair, with client storage fallback', () => {
  const partial = setup(() => {}, { cookies: { 'taskflow-access': 'old' }, server: true })
  partial.middleware({ path: '/' })
  assert.equal(partial.redirects[0].path, '/login')
  const local = setup(() => {}, { stored: JSON.stringify({ access: 'access', refresh: 'refresh' }) })
  local.middleware({ path: '/' })
  assert.equal(local.redirects.length, 0)
  for (const stored of ['null', '{broken', '{"access":"","refresh":"refresh"}']) {
    const invalid = setup(() => {}, { stored })
    assert.equal(invalid.taskFlowHasSession(), false)
  }
})

test('sign-in replaces corrupt storage and flushes cookies before navigation', async () => {
  const ui = setup(() => ({ access: 'new-access', refresh: 'new-refresh' }), { stored: '{broken' })
  await ui.api.login('user@example.test', 'password', true)
  assert.equal(ui.cookieJar.get('taskflow-access'), 'new-access')
  assert.equal(JSON.parse(ui.storage.get('taskflow-auth')).refresh, 'new-refresh')
  ui.middleware({ path: '/' })
  assert.equal(ui.redirects.length, 0)
})

test('blocked browser storage does not prevent cookie-based sign-in', async () => {
  const ui = setup(() => ({ access: 'access', refresh: 'refresh' }), { blockedStorage: true })
  await ui.api.login('user@example.test', 'password', true)
  assert.equal(ui.taskFlowHasSession(), true)
  ui.api.logout()
  await tick()
})

test('a malformed login response cannot create a session', async () => {
  const ui = setup(() => ({ access: 'access' }))
  await assert.rejects(ui.api.login('user@example.test', 'password', true), /invalid sign-in response/)
  assert.equal(ui.taskFlowHasSession(), false)
})

test('an expired access token refreshes and retries without leaving the page', async () => {
  const ui = setup((url, options) => {
    if (url.endsWith('/auth/token/refresh/')) {
      assert.equal(options.body.refresh, 'valid-refresh')
      return { access: 'fresh-access' }
    }
    if (options.headers.get('Authorization') === 'Bearer expired-access') throw unauthorized()
    return { id: 12 }
  }, { cookies: initialCookies })
  assert.equal((await ui.api.getMe()).id, 12)
  assert.equal(ui.calls.length, 3)
  assert.equal(ui.cookieJar.get('taskflow-access'), 'fresh-access')
  assert.equal(ui.redirects.length, 0)
})

test('parallel unauthorized requests share one refresh across API instances', async () => {
  const refresh = deferred()
  const ui = setup((url, options) => {
    if (url.endsWith('/auth/token/refresh/')) return refresh.promise
    if (options.headers.get('Authorization') === 'Bearer expired-access') throw unauthorized()
    return { is_connected: false }
  }, { cookies: initialCookies })
  const results = Promise.all([ui.api.getMe(), ui.newApi().getTelegramConnection()])
  await tick()
  assert.equal(ui.calls.filter(call => call.url.endsWith('/auth/token/refresh/')).length, 1)
  refresh.resolve({ access: 'fresh-access' })
  await results
  assert.equal(ui.redirects.length, 0)
})

test('rejected refresh clears the session and redirects once for parallel requests', async () => {
  const refresh = deferred()
  const ui = setup(url => url.endsWith('/auth/token/refresh/') ? refresh.promise : Promise.reject(unauthorized()),
    { cookies: initialCookies, stored: JSON.stringify({ access: 'expired-access', refresh: 'valid-refresh' }) })
  const results = Promise.allSettled([ui.api.getMe(), ui.newApi().getTelegramConnection()])
  await tick()
  refresh.reject(unauthorized())
  await results
  assert.equal(ui.taskFlowHasSession(), false)
  assert.equal(ui.redirects.length, 1)
  assert.equal(ui.redirects[0].path, '/login')
  ui.middleware({ path: '/login' })
  assert.equal(ui.redirects.length, 1)
})

test('a refresh network failure does not discard a recoverable session', async () => {
  const ui = setup(url => {
    if (url.endsWith('/auth/token/refresh/')) throw new Error('Network offline')
    throw unauthorized()
  }, { cookies: initialCookies })
  await assert.rejects(ui.api.getMe(), /Network offline/)
  assert.equal(ui.taskFlowHasSession(), true)
  assert.equal(ui.redirects.length, 0)
})

test('an old request failure cannot log out a newly signed-in user', async () => {
  const oldRequest = deferred()
  const ui = setup(url => url.endsWith('/auth/token/')
    ? { access: 'new-access', refresh: 'new-refresh' } : oldRequest.promise, { cookies: initialCookies })
  const oldResult = ui.api.getTelegramConnection()
  const rejected = assert.rejects(oldResult, /Unauthorized/)
  await ui.newApi().login('user@example.test', 'password', true)
  oldRequest.reject(unauthorized())
  await rejected
  assert.equal(ui.cookieJar.get('taskflow-access'), 'new-access')
  assert.equal(ui.redirects.length, 0)
})
