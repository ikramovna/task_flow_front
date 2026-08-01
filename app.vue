<script setup lang="ts">
useHead({
  script: [
    {
      key: 'taskflow-theme-init',
      tagPosition: 'head',
      innerHTML: `(function(){try{var theme=localStorage.getItem('taskflow-theme');var dark=theme==='Dark'||(theme==='System'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('tf-dark',!!dark);document.documentElement.style.colorScheme=dark?'dark':'light';}catch(e){}})()`
    }
  ]
})
</script>

<template>
  <NuxtPage />
</template>
