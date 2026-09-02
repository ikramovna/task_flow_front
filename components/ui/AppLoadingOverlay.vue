<script setup lang="ts">
withDefaults(defineProps<{ label?: string }>(), { label: 'Loading...' })
</script>

<template><div class="tf-search-overlay"><span class="tf-search-loader" /> {{ label }}</div></template>
