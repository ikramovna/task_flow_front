<script setup lang="ts">
useHead({
  title: 'Logout - TaskFlow Dashboard'
})

const isDarkTheme = ref(false)

onMounted(() => {
  const savedTheme = localStorage.getItem('taskflow-theme')
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  isDarkTheme.value = savedTheme === 'Dark' || (savedTheme === 'System' && systemDark)
  document.documentElement.classList.toggle('tf-dark', isDarkTheme.value)
  document.documentElement.style.colorScheme = isDarkTheme.value ? 'dark' : 'light'
  useTaskFlowApi().logout()
  useTaskFlowStore().reset()
  useNotifications().reset()
  setTimeout(() => {
    navigateTo('/login')
  }, 700)
})
</script>

<template>
  <main :class="['grid min-h-screen place-items-center bg-task-page px-4 text-task-ink', isDarkTheme ? 'tf-dark' : '']">
    <section class="w-full max-w-sm rounded-ui border border-task-line bg-white p-8 text-center shadow-card">
      <img src="/taskflow-logo.png?v=3" alt="TaskFlow" class="mx-auto mb-5 h-auto w-[220px]" />
      <div class="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full bg-task-blue text-white">
        <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M10 17l5-5-5-5m5 5H3m6-9h10v18H9" /></svg>
      </div>
      <h1 class="text-2xl font-bold">Signing out</h1>
      <p class="mt-2 text-task-muted">You are being redirected to the login page.</p>
      <div class="mx-auto mt-6 h-5 w-5 rounded-full border-2 border-task-blueSoft border-t-task-blue animate-spin" />
    </section>
  </main>
</template>
