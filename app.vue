<script setup lang="ts">
const initialThemeCookie = useCookie<string | null>('taskflow-theme')

if (import.meta.server) {
  useHead({
    htmlAttrs: {
      class: initialThemeCookie.value === 'Dark' ? 'tf-dark' : undefined,
      style: `color-scheme:${initialThemeCookie.value === 'Dark' ? 'dark' : 'light'}`
    }
  })
}
</script>

<template>
  <NuxtPage />
</template>
