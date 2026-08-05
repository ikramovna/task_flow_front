<script setup lang="ts">
useHead({
  script: [
    {
      key: 'taskflow-theme-init',
      tagPosition: 'head',
      innerHTML: `(function(){try{var p=window.location.pathname;var authPage=p==='/login'||p==='/logout'||p.indexOf('/login/')===0||p.indexOf('/logout/')===0;var theme=localStorage.getItem('taskflow-theme');var dark=!authPage&&(theme==='Dark'||(theme==='System'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches));document.documentElement.classList.toggle('tf-dark',!!dark);document.documentElement.style.colorScheme=dark?'dark':'light';}catch(e){document.documentElement.classList.remove('tf-dark');document.documentElement.style.colorScheme='light';}})()`
    }
  ]
})
</script>

<template>
  <NuxtPage />
</template>
