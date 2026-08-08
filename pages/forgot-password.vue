<script setup lang="ts">
const email = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const api = useTaskFlowApi()

useHead({ title: 'Forgot Password - TaskFlow Dashboard' })

const submitRequest = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  if (!email.value.trim()) {
    errorMessage.value = 'Email address is required.'
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    errorMessage.value = 'Enter a valid email address.'
    return
  }

  isSubmitting.value = true
  try {
    const response = await api.requestPasswordReset(email.value.trim())
    successMessage.value = response.detail || 'If an account exists for this email, a password reset link has been sent.'
  } catch (error) {
    errorMessage.value = taskFlowApiErrorMessage(error, 'Could not send the password reset email.')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-task-page px-4 py-8 text-task-ink sm:px-6">
    <section class="w-full max-w-[520px]">
      <form class="rounded-ui border border-task-line bg-white p-6 shadow-card sm:p-8" @submit.prevent="submitRequest">
        <NuxtLink class="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-task-blue transition hover:opacity-75" to="/login">
          <span aria-hidden="true">←</span> Back to sign in
        </NuxtLink>

        <div class="mb-8 text-center">
          <div class="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-task-blueSoft text-task-blue">
            <svg viewBox="0 0 24 24" class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 11V8a5 5 0 0 1 10 0v3m-9 0h8a2 2 0 0 1 2 2v7H6v-7a2 2 0 0 1 2-2Z" /></svg>
          </div>
          <h1 class="text-3xl font-bold">Forgot your password?</h1>
          <p class="mt-2 text-task-muted">Enter your email and we will send you a secure reset link.</p>
        </div>

        <div v-if="errorMessage" class="mb-4 rounded-ui border border-task-dangerSoft bg-task-dangerSoft px-4 py-3 text-sm font-semibold text-task-danger">
          {{ errorMessage }}
        </div>
        <div v-if="successMessage" class="mb-4 rounded-ui border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {{ successMessage }}
        </div>

        <label class="block">
          <span class="mb-2 block text-sm font-semibold">Email Address</span>
          <span class="relative block">
            <svg viewBox="0 0 24 24" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-task-muted" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6h16v12H4V6Zm0 0 8 7 8-7" /></svg>
            <input v-model="email" class="tf-input h-12 w-full pl-10" placeholder="Enter email address" type="email" autocomplete="email" :disabled="isSubmitting" />
          </span>
        </label>

        <button class="tf-primary mt-6 h-12 w-full text-base" type="submit" :disabled="isSubmitting">
          <span v-if="isSubmitting" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          {{ isSubmitting ? 'Sending...' : 'Send reset link' }}
        </button>
      </form>
    </section>
  </main>
</template>
