<script setup lang="ts">
defineProps<{ compact?: boolean; inline?: boolean }>()
const detailsOpen = ref(false)
const darkDialog = ref(false)
const open = () => {
  darkDialog.value = document.documentElement.classList.contains('tf-dark') || Boolean(document.querySelector('main.tf-dark'))
  detailsOpen.value = true
}
const close = () => { detailsOpen.value = false }
const onKeydown = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
watch(detailsOpen, open => {
  if (open) document.addEventListener('keydown', onKeydown)
  else document.removeEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <section :class="['tf-pro-card', compact ? 'tf-pro-card--compact' : '', inline ? 'tf-pro-card--inline' : '']" aria-label="TaskFlow Pro upgrade">
    <div class="tf-pro-glow" aria-hidden="true" />
    <div class="tf-pro-content">
      <span class="tf-pro-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m3 7 4.5 4L12 4l4.5 7L21 7l-2 12H5L3 7Z" /><path d="M6 16h12" /></svg></span>
      <div class="tf-pro-copy">
        <span class="tf-pro-eyebrow">✦ TASKFLOW PRO · COMING SOON</span>
        <h2>{{ compact ? 'Do more. Type less.' : inline ? 'Your next productivity boost' : 'Turn ideas into action, faster.' }}</h2>
        <p>{{ inline ? 'Tiko AI and Telegram, together in one smarter workflow.' : 'Let Tiko handle task work and stay in sync through Telegram.' }}</p>
      </div>
      <button type="button" class="tf-pro-button" @click="open">Upgrade to Pro <span aria-hidden="true">→</span></button>
    </div>
  </section>
  <Teleport to="body">
    <div v-if="detailsOpen" :class="['tf-pro-overlay', darkDialog ? 'is-dark' : '']" role="presentation" @click.self="close">
      <section class="tf-pro-dialog" role="dialog" aria-modal="true" aria-labelledby="tf-pro-dialog-title">
        <button type="button" class="tf-pro-close" aria-label="Close" @click="close">×</button>
        <span class="tf-pro-dialog-icon" aria-hidden="true">✦</span>
        <span class="tf-pro-dialog-eyebrow">THE NEXT STEP FOR TASKFLOW</span>
        <h2 id="tf-pro-dialog-title">Your best work starts with Pro</h2>
        <p>Create and manage tasks with Tiko AI, then stay connected through Telegram. Both are planned for TaskFlow Pro.</p>
        <div class="tf-pro-feature-list"><span>✦ &nbsp; Tiko AI task actions</span><span>✦ &nbsp; Telegram connection</span></div>
        <p class="tf-pro-payment-note">Secure Payme checkout is being prepared. No payment is available yet.</p>
        <button type="button" class="tf-pro-dialog-button" @click="close">Got it</button>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.tf-pro-card { position: relative; overflow: hidden; border: 1px solid #6b78bc; border-radius: 18px; background: linear-gradient(112deg, #112658 2%, #174b9d 58%, #394fc9 100%); color: white; box-shadow: 0 18px 36px -21px rgb(32 76 177 / .8), inset 0 1px rgb(255 255 255 / .18); }
.tf-pro-glow { position: absolute; width: 320px; height: 320px; right: -70px; top: -160px; border-radius: 50%; background: radial-gradient(circle, rgb(167 196 255 / .55), transparent 65%); pointer-events: none; }
.tf-pro-card::after { content: ''; position: absolute; width: 180px; height: 180px; right: 16%; bottom: -155px; border-radius: 50%; background: rgb(117 87 238 / .38); filter: blur(32px); pointer-events: none; }
.tf-pro-content { position: relative; display: flex; align-items: center; gap: 17px; padding: 20px 22px; }
.tf-pro-icon { display: grid; width: 52px; height: 52px; flex: none; place-items: center; border: 1px solid rgb(255 255 255 / .28); border-radius: 15px; background: rgb(255 255 255 / .12); color: #ffe59c; }
.tf-pro-icon svg { width: 27px; height: 27px; }
.tf-pro-copy { min-width: 0; flex: 1; }
.tf-pro-eyebrow { color: #ffe6a0; font-size: 10px; font-weight: 800; letter-spacing: .1em; }
.tf-pro-copy h2 { margin-top: 3px; font-size: 19px; font-weight: 800; line-height: 1.25; }
.tf-pro-copy p { margin-top: 4px; color: #d2e4ff; font-size: 12px; line-height: 1.45; }
.tf-pro-button { display: inline-flex; min-height: 42px; flex: none; align-items: center; justify-content: center; gap: 8px; border: 1px solid rgb(255 255 255 / .5); border-radius: 11px; background: #fff; padding: 0 16px; color: #1753a6; font-size: 12px; font-weight: 800; transition: transform .15s ease, box-shadow .15s ease; }
.tf-pro-button:hover { transform: translateY(-1px); box-shadow: 0 8px 20px -12px #000; }
.tf-pro-card--compact { margin: auto 4px 12px; border-radius: 14px; }
.tf-pro-card--compact .tf-pro-content { display: grid; grid-template-columns: 32px minmax(0, 1fr); gap: 9px; padding: 13px 12px; }
.tf-pro-card--compact .tf-pro-icon { width: 32px; height: 32px; border-radius: 10px; }
.tf-pro-card--compact .tf-pro-icon svg { width: 20px; height: 20px; }
.tf-pro-card--compact .tf-pro-eyebrow { font-size: 8px; letter-spacing: .06em; }
.tf-pro-card--compact h2 { font-size: 14px; }
.tf-pro-card--compact p { display: none; }
.tf-pro-card--compact .tf-pro-button { grid-column: 1 / -1; min-height: 36px; font-size: 11px; }
.tf-pro-card--inline { margin-top: 14px; border-radius: 13px; }
.tf-pro-card--inline .tf-pro-content { gap: 12px; padding: 13px 15px; }
.tf-pro-card--inline .tf-pro-icon { width: 40px; height: 40px; border-radius: 12px; }
.tf-pro-card--inline .tf-pro-icon svg { width: 22px; height: 22px; }
.tf-pro-card--inline h2 { font-size: 15px; }
.tf-pro-card--inline p { font-size: 11px; }
.tf-pro-card--inline .tf-pro-button { min-height: 38px; padding-inline: 12px; }
.tf-pro-overlay { position: fixed; z-index: 200; inset: 0; display: grid; place-items: center; padding: 16px; background: rgb(8 17 36 / .6); backdrop-filter: blur(4px); }
.tf-pro-dialog { position: relative; width: min(100%, 460px); border: 1px solid #d7e4f6; border-radius: 20px; background: #fff; padding: 30px; color: #172033; box-shadow: 0 30px 80px -24px #071a3a; }
.tf-pro-close { position: absolute; top: 12px; right: 16px; font-size: 26px; line-height: 1; color: #667085; }
.tf-pro-dialog-icon { display: grid; width: 48px; height: 48px; place-items: center; border-radius: 15px; background: #e9f2ff; color: #1768d7; font-size: 26px; }
.tf-pro-dialog-eyebrow { display: block; margin-top: 20px; color: #266cda; font-size: 10px; font-weight: 800; letter-spacing: .12em; }
.tf-pro-dialog h2 { margin-top: 5px; font-size: 24px; font-weight: 800; line-height: 1.2; }
.tf-pro-dialog p { margin-top: 10px; color: #58677d; font-size: 14px; line-height: 1.6; }
.tf-pro-feature-list { display: grid; gap: 8px; margin-top: 18px; }
.tf-pro-feature-list span { border: 1px solid #dce8fa; border-radius: 10px; background: #f5f9ff; padding: 9px 12px; color: #20529a; font-size: 13px; font-weight: 700; }
.tf-pro-dialog .tf-pro-payment-note { margin-top: 18px; font-size: 12px; }
.tf-pro-dialog-button { width: 100%; min-height: 44px; margin-top: 23px; border-radius: 11px; background: #1768d7; color: white; font-size: 14px; font-weight: 700; }
.tf-pro-overlay.is-dark .tf-pro-dialog { border-color: #355071; background: linear-gradient(155deg, #10263f, #0c1d32); color: #f1f7ff; }
.tf-pro-overlay.is-dark .tf-pro-dialog p { color: #b7c9dd; }
.tf-pro-overlay.is-dark .tf-pro-dialog-eyebrow { color: #9ec9ff; }
.tf-pro-overlay.is-dark .tf-pro-feature-list span { border-color: #314e71; background: #183450; color: #d4e8ff; }
.tf-pro-overlay.is-dark .tf-pro-dialog-icon { background: #183e6d; color: #b8d9ff; }
.tf-pro-overlay.is-dark .tf-pro-close { color: #b7c9dd; }
@media (max-width: 700px) { .tf-pro-content { flex-wrap: wrap; } .tf-pro-button { width: 100%; } }
@media (prefers-reduced-motion: no-preference) { .tf-pro-card:not(.tf-pro-card--compact) .tf-pro-glow { animation: tf-pro-pulse 5s ease-in-out infinite; } }
@keyframes tf-pro-pulse { 50% { transform: scale(1.14); opacity: .78; } }
</style>
