<script setup lang="ts">
const themeCookie = useCookie<string | null>('taskflow-theme')
const isDarkLoadingTheme = ref(themeCookie.value === 'Dark')

const detectLoadingTheme = () => {
  if (!import.meta.client) return
  const savedTheme = localStorage.getItem('taskflow-theme')
  if (savedTheme) themeCookie.value = savedTheme
  isDarkLoadingTheme.value = savedTheme === 'Dark' || (
    savedTheme === 'System' && window.matchMedia('(prefers-color-scheme: dark)').matches
  ) || (!savedTheme && document.documentElement.classList.contains('tf-dark'))
}

detectLoadingTheme()
onMounted(detectLoadingTheme)
</script>

<template>
  <div :class="['tf-loading-screen', isDarkLoadingTheme ? 'is-dark' : 'is-light']" role="status" aria-live="polite" aria-label="Loading TaskFlow">
    <div class="tf-loading-ambient" />
    <div class="tf-loading-pulse">
      <span class="tf-loading-ring tf-loading-ring--outer" />
      <span class="tf-loading-ring tf-loading-ring--middle" />
      <span class="tf-loading-core">
        <svg viewBox="0 0 64 64" class="h-12 w-12" aria-hidden="true">
          <path d="m32 7 22 13-22 13L10 20 32 7Z" fill="#77d6ff" />
          <path d="m10 20 22 13v25L10 45V20Z" fill="#3478f6" />
          <path d="m54 20-22 13v25l22-13V20Z" fill="#7047f5" />
          <path d="m32 7 11 6.5L21 27l-11-7L32 7Z" fill="#a6e8ff" opacity=".72" />
        </svg>
      </span>
    </div>
    <p class="tf-loading-title">Loading<span class="tf-loading-dots" aria-hidden="true">...</span></p>
    <p class="tf-loading-subtitle">Preparing your workspace</p>
  </div>
</template>

<style scoped>
.tf-loading-screen {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #f5f8fd;
  color: #17243a;
  transition: background-color 220ms ease, color 220ms ease;
}

.tf-loading-ambient {
  position: absolute;
  width: 420px;
  height: 420px;
  border-radius: 999px;
  background: radial-gradient(circle, rgb(37 99 235 / .16), rgb(96 165 250 / .08) 42%, transparent 70%);
  animation: ambient 2.4s ease-in-out infinite;
}

.tf-loading-pulse {
  position: relative;
  display: grid;
  width: 190px;
  height: 190px;
  place-items: center;
}

.tf-loading-ring {
  position: absolute;
  border-radius: 999px;
  border: 1px solid rgb(37 99 235 / .2);
  box-shadow: inset 0 0 30px rgb(37 99 235 / .05), 0 0 30px rgb(37 99 235 / .06);
}

.tf-loading-ring--outer {
  inset: 0;
  animation: ring 2.2s ease-out infinite;
}

.tf-loading-ring--middle {
  inset: 22px;
  border-color: rgb(59 130 246 / .45);
  background: radial-gradient(circle, rgb(30 64 175 / .2), transparent 68%);
  animation: ring 2.2s .45s ease-out infinite;
}

.tf-loading-core {
  position: relative;
  z-index: 2;
  display: grid;
  width: 86px;
  height: 86px;
  place-items: center;
  border: 1px solid rgb(96 165 250 / .55);
  border-radius: 999px;
  background: linear-gradient(145deg, #1f6fff, #2433dc);
  box-shadow: 0 0 34px rgb(37 99 235 / .52), inset 0 1px 0 rgb(255 255 255 / .25);
  animation: core 1.8s ease-in-out infinite;
}

.tf-loading-title {
  position: relative;
  margin-top: 8px;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: .01em;
}

.tf-loading-subtitle {
  position: relative;
  margin-top: 7px;
  color: #667892;
  font-size: 12px;
}

.tf-loading-dots {
  display: inline-block;
  width: 18px;
  overflow: hidden;
  vertical-align: bottom;
  animation: dots 1.25s steps(4, end) infinite;
}

:global(.tf-dark) .tf-loading-screen,
.tf-loading-screen.is-dark {
  background: #091323;
  color: #d8e8ff;
}

:global(.tf-dark) .tf-loading-ambient,
.tf-loading-screen.is-dark .tf-loading-ambient {
  background: radial-gradient(circle, rgb(37 99 235 / .18), rgb(30 64 175 / .06) 42%, transparent 70%);
}

:global(.tf-dark) .tf-loading-ring,
.tf-loading-screen.is-dark .tf-loading-ring {
  border-color: rgb(59 130 246 / .25);
  box-shadow: inset 0 0 30px rgb(37 99 235 / .04), 0 0 30px rgb(37 99 235 / .05);
}

:global(.tf-dark) .tf-loading-ring--middle,
.tf-loading-screen.is-dark .tf-loading-ring--middle {
  border-color: rgb(59 130 246 / .45);
}

:global(.tf-dark) .tf-loading-subtitle,
.tf-loading-screen.is-dark .tf-loading-subtitle {
  color: #71839d;
}

@keyframes ring {
  0% { transform: scale(.72); opacity: 0; }
  35% { opacity: 1; }
  100% { transform: scale(1.08); opacity: 0; }
}

@keyframes core {
  0%, 100% { transform: scale(1); box-shadow: 0 0 28px rgb(37 99 235 / .42), inset 0 1px 0 rgb(255 255 255 / .25); }
  50% { transform: scale(1.06); box-shadow: 0 0 48px rgb(37 99 235 / .68), inset 0 1px 0 rgb(255 255 255 / .32); }
}

@keyframes ambient {
  0%, 100% { transform: scale(.9); opacity: .65; }
  50% { transform: scale(1.08); opacity: 1; }
}

@keyframes dots {
  0% { width: 0; }
  100% { width: 18px; }
}

@media (prefers-reduced-motion: reduce) {
  .tf-loading-ambient,
  .tf-loading-ring,
  .tf-loading-core,
  .tf-loading-dots { animation: none; }
}
</style>
