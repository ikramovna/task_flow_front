<script setup lang="ts">
const initialThemeCookie = useCookie<string | null>('taskflow-theme')

const siteDescription = 'Plan tasks, align your team and move every project forward with TaskFlow.'

useSeoMeta({
  title: 'TaskFlow — Work in flow',
  description: siteDescription,
  ogType: 'website',
  ogSiteName: 'TaskFlow',
  ogTitle: 'TaskFlow — Work in flow',
  ogDescription: siteDescription,
  ogUrl: 'https://taskflow.websteredu.uz/',
  twitterCard: 'summary',
  twitterTitle: 'TaskFlow — Work in flow',
  twitterDescription: siteDescription
})

useHead({
  link: [{ rel: 'canonical', href: 'https://taskflow.websteredu.uz/' }]
})

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
