<script setup lang="ts">
const themeCookie = useCookie<string | null>('taskflow-theme')
const serverDarkTheme = computed(() => themeCookie.value === 'Dark')

useHead({
  htmlAttrs: {
    class: computed(() => serverDarkTheme.value ? 'tf-dark' : ''),
    style: computed(() => `color-scheme:${serverDarkTheme.value ? 'dark' : 'light'}`)
  },
  script: [
    {
      key: 'taskflow-theme-init',
      tagPosition: 'head',
      innerHTML: `(function(){try{var theme=localStorage.getItem('taskflow-theme');var dark=theme==='Dark'||(theme==='System'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('tf-dark',!!dark);document.documentElement.style.colorScheme=dark?'dark':'light';}catch(e){document.documentElement.classList.remove('tf-dark');document.documentElement.style.colorScheme='light';}})()`
    }
  ]
})
</script>

<template>
  <NuxtPage />
</template>
