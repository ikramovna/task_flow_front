<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'sidebar' | 'header' | 'unlock' | 'icon' }>(), { variant: 'sidebar' })

const detailsOpen = ref(false)
const darkDialog = ref(false)
const closeButton = ref<HTMLButtonElement | null>(null)

const open = async () => {
  darkDialog.value = document.documentElement.classList.contains('tf-dark') || Boolean(document.querySelector('main.tf-dark'))
  detailsOpen.value = true
  await nextTick()
  closeButton.value?.focus()
}
const close = () => { detailsOpen.value = false }
const onKeydown = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
watch(detailsOpen, isOpen => {
  if (isOpen) document.addEventListener('keydown', onKeydown)
  else document.removeEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <button type="button" :class="['tf-pro-trigger', `tf-pro-trigger--${variant}`]" :aria-label="variant === 'icon' ? 'Upgrade Pro' : undefined" :title="variant === 'icon' ? 'Upgrade Pro' : undefined" @click="open">
    <svg v-if="variant === 'unlock'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m3 7 4.5 4L12 4l4.5 7L21 7l-2 12H5L3 7Z" /><path d="M6 16h12" /></svg>
    <span v-if="variant !== 'icon'">{{ variant === 'unlock' ? 'Unlock Pro' : 'Upgrade Pro' }}</span>
  </button>

  <Teleport to="body">
    <div v-if="detailsOpen" :class="['tf-pro-overlay', darkDialog ? 'is-dark' : '']" @click.self="close">
      <section class="tf-pro-dialog" role="dialog" aria-modal="true" aria-labelledby="tf-pro-dialog-title" aria-describedby="tf-pro-dialog-intro">
        <button ref="closeButton" type="button" class="tf-pro-close" aria-label="Close upgrade details" @click="close">×</button>
        <div class="tf-pro-dialog-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m3 7 4.5 4L12 4l4.5 7L21 7l-2 12H5L3 7Z" /><path d="M6 16h12" /></svg></div>
        <span class="tf-pro-dialog-eyebrow">TASKFLOW PRO</span>
        <h2 id="tf-pro-dialog-title">More done, less typing.</h2>
        <p id="tf-pro-dialog-intro" class="tf-pro-intro">Let Tiko handle the busywork so you can focus on the work that matters.</p>
        <ul class="tf-pro-benefits">
          <li><span class="tf-pro-benefit-icon" aria-hidden="true">✦</span><span><strong>Create tasks automatically</strong><small>Tell Tiko what needs doing by text or voice. It can create the task with a title, assignee, and deadline.</small></span></li>
          <li><span class="tf-pro-benefit-icon" aria-hidden="true">↗</span><span><strong>Save time on updates</strong><small>Ask Tiko to edit a task in plain language instead of opening and changing each field yourself.</small></span></li>
          <li><span class="tf-pro-benefit-icon" aria-hidden="true">✓</span><span><strong>Stay connected in Telegram</strong><small>Connect your account and manage task requests through the bot, including voice messages.</small></span></li>
        </ul>
        <p class="tf-pro-payment-note">Pro access and Payme checkout are being prepared. Payments and activation are not available yet.</p>
        <button type="button" class="tf-pro-dialog-button" @click="close">Got it</button>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.tf-pro-trigger { display: inline-flex; align-items: center; justify-content: center; gap: 11px; min-height: 44px; border: 1px solid #a7c6ed; border-radius: 11px; background: linear-gradient(135deg, #eaf3ff, #dbeaff); padding: 0 16px; color: #1557a7; font-size: 13px; font-weight: 800; white-space: nowrap; box-shadow: inset 0 1px #fff, 0 8px 18px -14px #2064b8; transition: transform .15s ease, border-color .15s ease, box-shadow .15s ease; }
.tf-pro-trigger:hover { transform: translateY(-1px); border-color: #60a5fa; box-shadow: 0 10px 20px -13px #2064b8; }
.tf-pro-trigger:focus-visible, .tf-pro-close:focus-visible, .tf-pro-dialog-button:focus-visible { outline: 3px solid #60a5fa; outline-offset: 2px; }
.tf-pro-trigger svg { width: 20px; height: 20px; flex: none; color: #e4a400; }
.tf-pro-trigger--sidebar { width: calc(100% - 16px); margin: auto 8px 12px; background: linear-gradient(125deg, #dceeff, #b9d8ff); }
.tf-pro-trigger--header { margin-left: auto; }
.tf-pro-trigger--icon { width: 42px; min-height: 42px; margin: 12px auto; padding: 0; }
.tf-pro-trigger--unlock { border-color: #a7c8f5; background: linear-gradient(135deg, #e9f3ff, #fff); box-shadow: 0 14px 34px -19px #061a3b; }
.tf-pro-trigger--unlock svg { color: #2369bf; }
:global(.tf-dark) .tf-pro-trigger { border-color: #45698c; background: linear-gradient(145deg, #1d3e62, #244768); color: #f4f8ff; box-shadow: inset 0 1px rgb(255 255 255 / .1), 0 8px 20px -15px #000; }
:global(.tf-dark) .tf-pro-trigger:hover { border-color: #75b8ff; }
:global(.tf-dark) .tf-pro-trigger svg { color: #ffd967; }
.tf-pro-overlay { position: fixed; z-index: 200; inset: 0; display: grid; place-items: center; overflow-y: auto; padding: 18px; background: rgb(8 17 36 / .65); backdrop-filter: blur(5px); }
.tf-pro-dialog { position: relative; width: min(100%, 520px); max-height: calc(100dvh - 36px); overflow-y: auto; border: 1px solid #d7e4f6; border-radius: 21px; background: #fff; padding: 28px; color: #172033; box-shadow: 0 30px 80px -24px #071a3a; }
.tf-pro-close { position: absolute; top: 14px; right: 17px; display: grid; width: 32px; height: 32px; place-items: center; border-radius: 8px; color: #667085; font-size: 26px; line-height: 1; }
.tf-pro-dialog-icon { display: grid; width: 48px; height: 48px; place-items: center; border-radius: 14px; background: #e9f2ff; color: #1768d7; }
.tf-pro-dialog-icon svg { width: 27px; height: 27px; }
.tf-pro-dialog-eyebrow { display: block; margin-top: 17px; color: #266cda; font-size: 11px; font-weight: 800; letter-spacing: .12em; }
.tf-pro-dialog h2 { margin-top: 5px; font-size: 27px; font-weight: 850; line-height: 1.2; }
.tf-pro-dialog .tf-pro-intro { margin-top: 9px; color: #58677d; font-size: 14px; line-height: 1.55; }
.tf-pro-benefits { display: grid; gap: 10px; margin: 20px 0 0; padding: 0; list-style: none; }
.tf-pro-benefits li { display: flex; gap: 12px; border: 1px solid #dce8fa; border-radius: 13px; background: #f5f9ff; padding: 13px; }
.tf-pro-benefit-icon { display: grid; width: 29px; height: 29px; flex: none; place-items: center; border-radius: 9px; background: #e2efff; color: #1d67c7; font-weight: 800; }
.tf-pro-benefits strong, .tf-pro-benefits small { display: block; }
.tf-pro-benefits strong { color: #163968; font-size: 13px; }
.tf-pro-benefits small { margin-top: 3px; color: #58677d; font-size: 12px; line-height: 1.45; }
.tf-pro-payment-note { margin-top: 19px; color: #5d6b7c; font-size: 12px; line-height: 1.55; }
.tf-pro-dialog-button { width: 100%; min-height: 44px; margin-top: 19px; border-radius: 11px; background: #1768d7; color: white; font-size: 14px; font-weight: 700; }
.tf-pro-overlay.is-dark .tf-pro-dialog { border-color: #355071; background: linear-gradient(155deg, #10263f, #0c1d32); color: #f1f7ff; }
.tf-pro-overlay.is-dark .tf-pro-dialog .tf-pro-intro, .tf-pro-overlay.is-dark .tf-pro-benefits small, .tf-pro-overlay.is-dark .tf-pro-payment-note { color: #b7c9dd; }
.tf-pro-overlay.is-dark .tf-pro-dialog-eyebrow { color: #9ec9ff; }
.tf-pro-overlay.is-dark .tf-pro-benefits li { border-color: #314e71; background: #183450; }
.tf-pro-overlay.is-dark .tf-pro-benefits strong { color: #eef7ff; }
.tf-pro-overlay.is-dark .tf-pro-benefit-icon, .tf-pro-overlay.is-dark .tf-pro-dialog-icon { background: #244c76; color: #b8d9ff; }
.tf-pro-overlay.is-dark .tf-pro-close { color: #b7c9dd; }
@media (max-width: 640px) { .tf-pro-trigger--header { margin-left: 0; } .tf-pro-dialog { padding: 22px; } }
</style>
