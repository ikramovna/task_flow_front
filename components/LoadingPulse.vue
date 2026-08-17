<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  subtitle?: string
  image?: string
  overlay?: boolean
}>(), {
  title: 'Loading TaskFlow',
  subtitle: 'Preparing your workspace…',
  image: '/taskflow-logo-mark.webp',
  overlay: false,
})
</script>

<template>
  <div :class="['tf-loading-screen', overlay ? 'is-overlay' : '']" role="status" aria-live="polite" :aria-label="title">
    <div class="tf-loading-backdrop" />
    <div class="tf-tiko-loader-card">
      <span class="tf-tiko-loader-glow" />
      <img :src="image" width="1280" height="1280" alt="" class="tf-tiko-loader-image" aria-hidden="true" />
      <p class="tf-loading-title">{{ title }}</p>
      <p class="tf-loading-subtitle">{{ subtitle }}</p>
      <div class="tf-tiko-progress" aria-hidden="true"><span /></div>
    </div>
  </div>
</template>

<style>
.tf-loading-screen {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: #f5f8fd;
  color: #17243a;
}

.tf-loading-screen.is-overlay { z-index: 200; background: rgb(7 20 38 / .34); }
.tf-loading-screen.is-overlay .tf-loading-backdrop {
  position: absolute;
  inset: 0;
  background: rgb(6 18 35 / .46);
  backdrop-filter: blur(8px) saturate(.75);
  animation: tiko-backdrop-in .2s ease-out both;
}

.tf-tiko-loader-card {
  position: relative;
  isolation: isolate;
  display: flex;
  width: min(330px, calc(100vw - 32px));
  min-height: 320px;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  overflow: hidden;
  border: 1px solid rgb(49 116 190 / .32);
  border-radius: 28px;
  background: linear-gradient(155deg, rgb(255 255 255 / .98), rgb(237 245 255 / .97));
  padding: 18px 24px 24px;
  box-shadow: 0 30px 80px -32px rgb(4 25 62 / .6), inset 0 1px 0 rgb(255 255 255 / .95);
  animation: tiko-card-in .34s cubic-bezier(.2,.8,.2,1) both;
}

.tf-tiko-loader-glow {
  position: absolute;
  z-index: -1;
  top: -85px;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle, rgb(25 142 255 / .28), transparent 68%);
  animation: tiko-glow 2.2s ease-in-out infinite;
}

.tf-tiko-loader-image {
  width: 220px;
  height: 220px;
  margin-bottom: -3px;
  object-fit: contain;
  filter: drop-shadow(0 16px 18px rgb(17 76 161 / .22));
  transform-origin: 50% 85%;
  animation: tiko-float 2.1s ease-in-out infinite;
}

.tf-loading-title { margin: 0; font-size: 17px; font-weight: 850; letter-spacing: -.02em; }
.tf-loading-subtitle { min-height: 18px; margin: 5px 0 0; color: #687b94; font-size: 11px; font-weight: 600; text-align: center; }
.tf-tiko-progress { width: 100%; height: 5px; margin-top: 17px; overflow: hidden; border-radius: 999px; background: rgb(104 139 181 / .18); }
.tf-tiko-progress span { display: block; width: 46%; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #1677ed, #20d9ee); box-shadow: 0 0 12px #20bde9; animation: tiko-progress 1.25s ease-in-out infinite; }

html.tf-dark .tf-loading-screen,
.tf-dark .tf-loading-screen { background: #071426; color: #edf6ff; }
html.tf-dark .tf-loading-screen.is-overlay,
.tf-dark .tf-loading-screen.is-overlay { background: rgb(3 10 21 / .25); }
html.tf-dark .tf-tiko-loader-card,
.tf-dark .tf-tiko-loader-card { border-color: #23496f; background: linear-gradient(155deg, #0d2139, #09182a); box-shadow: 0 34px 90px -28px #000, inset 0 1px 0 rgb(255 255 255 / .04); }
html.tf-dark .tf-loading-subtitle,
.tf-dark .tf-loading-subtitle { color: #8398b2; }

@keyframes tiko-card-in { from { opacity: 0; transform: translateY(12px) scale(.96); } to { opacity: 1; transform: none; } }
@keyframes tiko-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes tiko-float { 0%,100% { transform: translateY(2px) rotate(-1deg); } 50% { transform: translateY(-8px) rotate(1deg); } }
@keyframes tiko-glow { 0%,100% { opacity: .65; transform: scale(.92); } 50% { opacity: 1; transform: scale(1.08); } }
@keyframes tiko-progress { 0% { transform: translateX(-110%); } 55%,100% { transform: translateX(220%); } }

@media (prefers-reduced-motion: reduce) {
  .tf-tiko-loader-card, .tf-loading-backdrop, .tf-tiko-loader-image, .tf-tiko-loader-glow, .tf-tiko-progress span { animation: none; }
  .tf-tiko-progress span { width: 70%; }
}
</style>
