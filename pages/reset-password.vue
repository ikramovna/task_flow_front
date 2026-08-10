<script setup lang="ts">
const route = useRoute()
const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const isSubmitting = ref(false)
const isComplete = ref(false)
const isExpiredLink = ref(false)
const errorMessage = ref('')
const api = useTaskFlowApi()

const uid = computed(() => typeof route.query.uid === 'string' ? route.query.uid : '')
const token = computed(() => typeof route.query.token === 'string' ? route.query.token : '')
const hasValidLink = computed(() => Boolean(uid.value && token.value))

useHead({ title: 'Reset Password - TaskFlow Dashboard' })

const submitReset = async () => {
  errorMessage.value = ''
  isExpiredLink.value = false

  if (!hasValidLink.value) {
    errorMessage.value = 'This password reset link is invalid or incomplete.'
    return
  }
  if (password.value.length < 8) {
    errorMessage.value = 'Password must be at least 8 characters.'
    return
  }
  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match.'
    return
  }

  isSubmitting.value = true
  try {
    await api.confirmPasswordReset(uid.value, token.value, password.value, confirmPassword.value)
    isComplete.value = true
    password.value = ''
    confirmPassword.value = ''
    window.setTimeout(() => navigateTo('/login'), 1800)
  } catch (error) {
    isExpiredLink.value = true
    errorMessage.value = taskFlowApiErrorMessage(error, 'This password reset link is invalid or has expired.')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-task-page px-4 py-8 text-task-ink sm:px-6">
    <section class="w-full max-w-[520px]">
      <div v-if="isComplete" class="rounded-ui border border-task-line bg-white p-6 text-center shadow-card sm:p-8">
        <img src="/taskflow-logo.png?v=2" alt="TaskFlow" class="mx-auto mb-6 h-auto w-[230px]" />
        <div class="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <svg viewBox="0 0 24 24" class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16.5 9" /></svg>
        </div>
        <h1 class="text-3xl font-bold">Password updated successfully</h1>
        <p class="mt-3 text-task-muted">Your password has been reset. Redirecting you to sign in...</p>
        <NuxtLink class="tf-primary mt-7 inline-flex h-12 w-full items-center justify-center text-base" to="/login">Continue to sign in</NuxtLink>
      </div>

      <form v-else class="rounded-ui border border-task-line bg-white p-6 shadow-card sm:p-8" @submit.prevent="submitReset">
        <NuxtLink to="/login" class="mx-auto mb-6 block w-fit" aria-label="TaskFlow sign in">
          <img src="/taskflow-logo.png?v=2" alt="TaskFlow" class="h-auto w-[230px]" />
        </NuxtLink>
        <div class="mb-8 text-center">
          <div class="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-task-blueSoft text-task-blue">
            <svg viewBox="0 0 24 24" class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 11V8a5 5 0 0 1 10 0v3m-9 0h8a2 2 0 0 1 2 2v7H6v-7a2 2 0 0 1 2-2Z" /></svg>
          </div>
          <h1 class="text-3xl font-bold">Create a new password</h1>
          <p class="mt-2 text-task-muted">Choose a strong password you have not used before.</p>
        </div>

        <div v-if="!hasValidLink || errorMessage" class="mb-4 rounded-ui border border-task-dangerSoft bg-task-dangerSoft px-4 py-3 text-sm font-semibold text-task-danger">
          <p>{{ errorMessage || 'This password reset link is invalid or incomplete.' }}</p>
          <NuxtLink v-if="!hasValidLink || isExpiredLink" class="mt-2 inline-block font-bold underline" to="/forgot-password">Request a new reset link</NuxtLink>
        </div>

        <label class="mb-4 block">
          <span class="mb-2 block text-sm font-semibold">New Password</span>
          <span class="relative block">
            <input v-model="password" class="tf-input h-12 w-full pr-11" placeholder="Minimum 8 characters" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" :disabled="isSubmitting || !hasValidLink" />
            <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-task-muted transition hover:text-task-blue" :aria-label="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword">
              <span aria-hidden="true">{{ showPassword ? 'Hide' : 'Show' }}</span>
            </button>
          </span>
        </label>

        <label class="block">
          <span class="mb-2 block text-sm font-semibold">Confirm New Password</span>
          <span class="relative block">
            <input v-model="confirmPassword" class="tf-input h-12 w-full pr-11" placeholder="Repeat your new password" :type="showConfirmPassword ? 'text' : 'password'" autocomplete="new-password" :disabled="isSubmitting || !hasValidLink" />
            <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-task-muted transition hover:text-task-blue" :aria-label="showConfirmPassword ? 'Hide password' : 'Show password'" @click="showConfirmPassword = !showConfirmPassword">
              <span aria-hidden="true">{{ showConfirmPassword ? 'Hide' : 'Show' }}</span>
            </button>
          </span>
        </label>

        <button class="tf-primary mt-6 h-12 w-full text-base" type="submit" :disabled="isSubmitting || !hasValidLink">
          <span v-if="isSubmitting" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          {{ isSubmitting ? 'Updating...' : 'Update password' }}
        </button>

        <p class="mt-6 text-center text-sm text-task-muted">
          Remembered your password?
          <NuxtLink class="font-semibold text-task-blue" to="/login">Sign in</NuxtLink>
        </p>
      </form>
    </section>
  </main>
</template>
