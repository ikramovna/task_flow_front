<script setup lang="ts">
const email = ref('')
const password = ref('')
const rememberMe = ref(true)
const showPassword = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const api = useTaskFlowApi()
const taskFlowStore = useTaskFlowStore()
const notifications = useNotifications()
const isDarkTheme = ref(false)
let themeMediaQuery: MediaQueryList | null = null

useHead({
  title: 'Login - TaskFlow Dashboard'
})

onMounted(() => {
  const savedTheme = localStorage.getItem('taskflow-theme')
  themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  isDarkTheme.value = savedTheme === 'Dark' || (savedTheme === 'System' && themeMediaQuery.matches)
  document.documentElement.classList.toggle('tf-dark', isDarkTheme.value)
  document.documentElement.style.colorScheme = isDarkTheme.value ? 'dark' : 'light'
})

onBeforeUnmount(() => {
  themeMediaQuery = null
})

const iconPath = (name: string) => {
  const paths: Record<string, string> = {
    check: 'm7 12 3 3 7-7',
    mail: 'M4 6h16v12H4V6Zm0 0 8 7 8-7',
    lock: 'M7 11V8a5 5 0 0 1 10 0v3m-9 0h8a2 2 0 0 1 2 2v7H6v-7a2 2 0 0 1 2-2Z',
    eye: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    eyeOff: 'm3 3 18 18M10.6 10.6A3 3 0 0 0 13.4 13.4M9.9 5.2A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a18.4 18.4 0 0 1-2.3 3.2M6.4 6.4C3.5 8.1 2 12 2 12a18.7 18.7 0 0 0 6.2 6.2A10.8 10.8 0 0 0 12 19c1.4 0 2.7-.3 3.8-.8'
  }
  return paths[name] ?? paths.check
}

const submitLogin = async () => {
  errorMessage.value = ''

  if (!email.value.trim()) {
    errorMessage.value = 'Email address is required.'
    return
  }

  if (!password.value.trim()) {
    errorMessage.value = 'Password is required.'
    return
  }

  isSubmitting.value = true

  try {
    await api.login(email.value, password.value, rememberMe.value)
    taskFlowStore.reset()
    notifications.reset()
    await navigateTo('/')
  } catch (error) {
    console.error('TaskFlow login failed.', error)
    errorMessage.value = taskFlowApiErrorMessage(error, 'Email or password is incorrect.')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main :class="['grid min-h-screen place-items-center bg-task-page px-4 py-8 text-task-ink sm:px-6', isDarkTheme ? 'tf-dark' : '']">
    <section class="w-full max-w-[520px]">
      <form class="rounded-ui border border-task-line bg-white p-6 shadow-card sm:p-8" @submit.prevent="submitLogin">
        <div class="mb-8 text-center">
          <h1 class="text-3xl font-bold">Welcome back</h1>
          <p class="mt-2 text-task-muted">Sign in to continue to your dashboard.</p>
        </div>

          <div v-if="errorMessage" class="mb-4 rounded-ui border border-task-dangerSoft bg-task-dangerSoft px-4 py-3 text-sm font-semibold text-task-danger">
            {{ errorMessage }}
          </div>

          <label class="mb-4 block">
            <span class="mb-2 block text-sm font-semibold">Email Address</span>
            <span class="relative block">
              <svg viewBox="0 0 24 24" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-task-muted" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('mail')" /></svg>
              <input v-model="email" class="tf-input h-12 w-full pl-10" placeholder="Enter email address" type="email" autocomplete="email" />
            </span>
          </label>

          <label class="block">
            <span class="mb-2 block text-sm font-semibold">Password</span>
            <span class="relative block">
              <svg viewBox="0 0 24 24" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-task-muted" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('lock')" /></svg>
              <input v-model="password" class="tf-input h-12 w-full pl-10 pr-11" placeholder="Enter password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" />
              <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-task-muted transition hover:text-task-blue" @click="showPassword = !showPassword">
                <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath(showPassword ? 'eyeOff' : 'eye')" /></svg>
              </button>
            </span>
          </label>

          <div class="my-5 flex items-center justify-between gap-3 text-sm">
            <label class="flex items-center gap-2 text-task-muted">
              <input v-model="rememberMe" class="h-4 w-4 rounded border-task-line text-task-blue focus:ring-task-blueSoft" type="checkbox" />
              Remember me
            </label>
          </div>

          <button class="tf-primary h-12 w-full text-base" type="submit" :disabled="isSubmitting">
            <span v-if="isSubmitting" class="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            {{ isSubmitting ? 'Signing in...' : 'Sign In' }}
          </button>
      </form>
    </section>
  </main>
</template>
