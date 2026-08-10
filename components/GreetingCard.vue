<script setup lang="ts">
import { GREETING_SUBTITLE } from '~/constants/greetings'
import type { GreetingCardConfig, GreetingCardProps } from '~/types/greeting'

const props = withDefaults(defineProps<GreetingCardProps & { config: GreetingCardConfig }>(), {
  subtitle: GREETING_SUBTITLE,
  notificationCount: 0,
  showActions: true,
  interactive: true
})

const emit = defineEmits<{ notification: []; theme: [] }>()
const displayCount = computed(() => props.notificationCount > 99 ? '99+' : String(props.notificationCount))
</script>

<template>
  <article :class="['greeting-card', `is-${config.theme}`, `is-${config.period}`]" :aria-label="`${config.greeting}, ${name}`">
    <img class="greeting-card__background" :src="config.background" alt="" width="1600" height="420" loading="eager" decoding="async" fetchpriority="high">
    <div class="greeting-card__veil" aria-hidden="true" />
    <div class="greeting-card__content">
      <h1>{{ config.greeting }}, {{ name }}! <span aria-hidden="true">{{ config.icon }}</span></h1>
      <p class="greeting-card__subtitle">{{ subtitle }}</p>
      <blockquote><p>“{{ config.quote }}”</p><cite>– {{ config.author }}</cite></blockquote>
    </div>
    <div v-if="showActions" class="greeting-card__actions">
      <slot name="actions">
        <button type="button" aria-label="Open notifications" @click="emit('notification')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 20h4" /></svg>
          <span v-if="notificationCount" class="greeting-card__badge">{{ displayCount }}</span>
        </button>
        <button type="button" :aria-label="`Switch from ${config.theme} theme`" @click="emit('theme')"><span aria-hidden="true">{{ config.theme === 'dark' ? '☀️' : '🌙' }}</span></button>
      </slot>
    </div>
  </article>
</template>

<style scoped>
.greeting-card{z-index:30}
.greeting-card{position:relative;isolation:isolate;height:clamp(220px,15vw,270px);overflow:visible;border:1px solid #d9e1eb;border-radius:12px;background:#fff;color:#0b1b32;box-shadow:0 8px 24px rgb(15 23 42/.12);container-type:inline-size}.greeting-card__background{position:absolute;z-index:-2;inset:0;width:100%;height:100%;border-radius:inherit;object-fit:cover;object-position:center}.greeting-card__veil{position:absolute;z-index:-1;inset:0;border-radius:inherit;background:linear-gradient(90deg,#fff 0%,rgb(255 255 255/.98) 35%,rgb(255 255 255/.72) 51%,transparent 72%)}.greeting-card__content{display:flex;height:100%;width:54%;flex-direction:column;justify-content:center;padding:28px clamp(24px,4vw,64px)}h1{font-size:clamp(24px,2.2vw,34px);font-weight:800;line-height:1.1;letter-spacing:-.035em}.greeting-card__subtitle{margin-top:10px;color:#52647b;font-size:clamp(12px,1vw,15px)}blockquote{margin-top:24px;border-left:2px solid #1689ee;padding-left:16px;max-width:220px;font-size:12px;line-height:1.55}cite{display:block;margin-top:6px;color:#087ae3;font-style:normal;font-weight:600}.greeting-card__actions{position:absolute;z-index:4;top:16px;right:16px;display:flex;gap:8px}.greeting-card__actions>:deep(button){position:relative;display:grid;width:40px;height:40px;place-items:center;border:1px solid rgb(148 163 184/.35);border-radius:11px;background:rgb(255 255 255/.75);color:#425269;box-shadow:0 5px 16px rgb(15 23 42/.08);backdrop-filter:blur(10px);transition:transform .18s ease,background .18s ease}.greeting-card__actions>:deep(button:hover){transform:translateY(-2px);background:#fff}.greeting-card__actions>:deep(button svg){width:18px;fill:none;stroke:currentColor;stroke-width:1.7}.greeting-card__badge{position:absolute;top:-7px;right:-6px;display:grid;min-width:18px;height:18px;place-items:center;border:2px solid #fff;border-radius:99px;background:#f43f5e;color:#fff;font-size:9px;font-weight:800}.is-dark{border-color:#253750;background:#07182d;color:#f8fbff;box-shadow:0 10px 30px rgb(0 0 0/.3)}.is-dark .greeting-card__veil{background:linear-gradient(90deg,#07182d 0%,rgb(7 24 45/.98) 38%,rgb(7 24 45/.74) 55%,transparent 78%)}.is-dark .greeting-card__subtitle{color:#c0cbda}.is-dark .greeting-card__actions>:deep(button){border-color:#38506f;background:rgb(7 24 45/.7);color:#e8f1ff}.is-dark .greeting-card__actions>:deep(button:hover){background:#102b4c}@media(max-width:760px){.greeting-card{height:230px}.greeting-card__content{width:82%;padding:24px 20px}.greeting-card__veil,.is-dark .greeting-card__veil{background:linear-gradient(90deg,var(--mobile-bg,#fff) 0%,rgb(255 255 255/.9) 65%,transparent)}.is-dark{--mobile-bg:#07182d}.is-dark .greeting-card__veil{background:linear-gradient(90deg,#07182d 0%,rgb(7 24 45/.92) 67%,transparent)}blockquote{margin-top:20px}.greeting-card__actions{top:12px;right:12px}}@media(prefers-reduced-motion:reduce){.greeting-card__actions>:deep(button){transition:none}}
.greeting-card__background{inset:0;width:100%;height:100%;object-position:center 28%;transform:none}.is-afternoon .greeting-card__background{object-position:center 22%}.is-evening .greeting-card__background{object-position:center 24%}.greeting-card__veil{opacity:.22}.is-dark .greeting-card__veil{opacity:.16}

/* Keep the hero at a predictable size without distorting its image. */
.greeting-card{
  width:100%;
  height:218px;
  min-height:218px;
  max-height:218px;
  overflow:hidden;
}
.greeting-card__background{
  width:100%;
  height:100%;
  object-fit:cover;
}
.greeting-card__content{
  color:#0b1b32;
}
.greeting-card__content h1{
  color:#0b1b32;
}
.greeting-card__subtitle{
  color:#52647b;
}
.greeting-card__content blockquote{
  border-left-color:#1689ee;
  color:#0b1b32;
}
.greeting-card__content cite{
  color:#087ae3;
}
.is-dark .greeting-card__content,
.is-dark .greeting-card__content h1{
  color:#fff;
}
.is-dark .greeting-card__subtitle{
  color:rgba(255,255,255,.78);
}
.is-dark .greeting-card__content blockquote{
  border-left-color:#38bdf8;
  color:#f8fafc;
}
.is-dark .greeting-card__content cite{
  color:#38bdf8;
}
@media(max-width:760px){
  .greeting-card{
    height:218px;
    min-height:218px;
    max-height:218px;
  }
}
</style>
