<script setup lang="ts">
defineProps<{ compact?: boolean }>()
const detailsOpen = ref(false)
const close = () => { detailsOpen.value = false }
const onKeydown = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
watch(detailsOpen, open => {
  if (open) document.addEventListener('keydown', onKeydown)
  else document.removeEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <section :class="['tf-pro-card', compact ? 'tf-pro-card--compact' : '']" aria-label="TaskFlow Pro upgrade">
    <div class="tf-pro-glow" aria-hidden="true" />
    <div class="tf-pro-content">
      <span class="tf-pro-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m3 7 4.5 4L12 4l4.5 7L21 7l-2 12H5L3 7Z" /><path d="M6 16h12" /></svg></span>
      <div class="tf-pro-copy">
        <span class="tf-pro-eyebrow">TASKFLOW PRO</span>
        <h2>More power for your work</h2>
        <p>Telegram connection and Tiko AI are planned for Pro.</p>
      </div>
      <button type="button" class="tf-pro-button" @click="detailsOpen = true">Upgrade to Pro <span aria-hidden="true">→</span></button>
    </div>
  </section>
  <Teleport to="body">
    <div v-if="detailsOpen" class="tf-pro-overlay" role="presentation" @click.self="close">
      <section class="tf-pro-dialog" role="dialog" aria-modal="true" aria-labelledby="tf-pro-dialog-title">
        <button type="button" class="tf-pro-close" aria-label="Close" @click="close">×</button>
        <span class="tf-pro-dialog-icon" aria-hidden="true">✦</span>
        <h2 id="tf-pro-dialog-title">Upgrade to TaskFlow Pro</h2>
        <p>Telegram connection and Tiko AI will be included in Pro. Secure Payme checkout is being prepared. Payments are not available yet.</p>
        <button type="button" class="tf-pro-dialog-button" @click="close">Got it</button>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.tf-pro-card { position: relative; overflow: hidden; border: 1px solid #354b87; border-radius: 18px; background: linear-gradient(110deg, #102554, #174695 72%, #1a66cc); color: white; box-shadow: 0 16px 34px -23px rgb(18 68 152 / .8); }
.tf-pro-glow { position: absolute; width: 280px; height: 280px; right: -75px; top: -150px; border-radius: 50%; background: radial-gradient(circle, rgb(133 192 255 / .38), transparent 68%); pointer-events: none; }
.tf-pro-content { position: relative; display: flex; align-items: center; gap: 17px; padding: 20px 22px; }
.tf-pro-icon { display: grid; width: 52px; height: 52px; flex: none; place-items: center; border: 1px solid rgb(255 255 255 / .28); border-radius: 15px; background: rgb(255 255 255 / .12); color: #ffe59c; }
.tf-pro-icon svg { width: 27px; height: 27px; }
.tf-pro-copy { min-width: 0; flex: 1; }
.tf-pro-eyebrow { color: #a9d3ff; font-size: 10px; font-weight: 800; letter-spacing: .13em; }
.tf-pro-copy h2 { margin-top: 2px; font-size: 18px; font-weight: 800; line-height: 1.25; }
.tf-pro-copy p { margin-top: 4px; color: #d2e4ff; font-size: 12px; line-height: 1.45; }
.tf-pro-button { display: inline-flex; min-height: 42px; flex: none; align-items: center; justify-content: center; gap: 8px; border: 1px solid rgb(255 255 255 / .35); border-radius: 11px; background: #fff; padding: 0 16px; color: #1753a6; font-size: 12px; font-weight: 800; transition: transform .15s ease, box-shadow .15s ease; }
.tf-pro-button:hover { transform: translateY(-1px); box-shadow: 0 8px 20px -12px #000; }
.tf-pro-card--compact { margin: auto 4px 12px; border-radius: 14px; }
.tf-pro-card--compact .tf-pro-content { display: grid; grid-template-columns: 32px minmax(0, 1fr); gap: 9px; padding: 12px; }
.tf-pro-card--compact .tf-pro-icon { width: 32px; height: 32px; border-radius: 10px; }
.tf-pro-card--compact .tf-pro-icon svg { width: 20px; height: 20px; }
.tf-pro-card--compact .tf-pro-eyebrow { font-size: 9px; }
.tf-pro-card--compact h2 { font-size: 13px; }
.tf-pro-card--compact p { display: none; }
.tf-pro-card--compact .tf-pro-button { grid-column: 1 / -1; min-height: 34px; font-size: 11px; }
.tf-pro-overlay { position: fixed; z-index: 200; inset: 0; display: grid; place-items: center; padding: 16px; background: rgb(8 17 36 / .6); backdrop-filter: blur(4px); }
.tf-pro-dialog { position: relative; width: min(100%, 430px); border: 1px solid #d7e4f6; border-radius: 20px; background: #fff; padding: 30px; color: #172033; box-shadow: 0 30px 80px -24px #071a3a; }
.tf-pro-close { position: absolute; top: 12px; right: 16px; font-size: 26px; line-height: 1; color: #667085; }
.tf-pro-dialog-icon { display: grid; width: 48px; height: 48px; place-items: center; border-radius: 15px; background: #e9f2ff; color: #1768d7; font-size: 26px; }
.tf-pro-dialog h2 { margin-top: 16px; font-size: 22px; font-weight: 800; }
.tf-pro-dialog p { margin-top: 10px; color: #58677d; font-size: 14px; line-height: 1.6; }
.tf-pro-dialog-button { width: 100%; min-height: 44px; margin-top: 23px; border-radius: 11px; background: #1768d7; color: white; font-size: 14px; font-weight: 700; }
:global(.tf-dark) .tf-pro-dialog { border-color: #355071; background: #10243b; color: #f1f7ff; }
:global(.tf-dark) .tf-pro-dialog p { color: #acbfd7; }
@media (max-width: 700px) { .tf-pro-content { flex-wrap: wrap; } .tf-pro-button { width: 100%; } }
</style>
