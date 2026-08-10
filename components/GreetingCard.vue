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
    <div class="greeting-card__light-art" aria-hidden="true">
      <span class="greeting-card__orb greeting-card__orb--one" />
      <span class="greeting-card__orb greeting-card__orb--two" />
      <div class="greeting-card__mini-board">
        <div class="greeting-card__mini-top"><span /><span /><span /></div>
        <div class="greeting-card__mini-row"><i>✓</i><span><b /><small /></span><em>Done</em></div>
        <div class="greeting-card__mini-row"><i>•</i><span><b /><small /></span><em>Today</em></div>
        <div class="greeting-card__mini-row"><i>→</i><span><b /><small /></span><em>Next</em></div>
      </div>
    </div>
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

/* Image-free light theme artwork: crisp at every resolution. */
.is-morning{--tf-art-a:14 165 233;--tf-art-b:250 204 21}
.is-afternoon{--tf-art-a:37 99 235;--tf-art-b:16 185 129}
.is-evening{--tf-art-a:99 102 241;--tf-art-b:168 85 247}
.is-light{
  border-color:#cfe0f6;
  background:
    radial-gradient(circle at 78% 12%,rgb(var(--tf-art-a)/.18),transparent 27%),
    radial-gradient(circle at 94% 88%,rgb(var(--tf-art-b)/.14),transparent 30%),
    linear-gradient(120deg,#f8fbff 0%,#eef6ff 52%,#e7f1ff 100%);
  box-shadow:0 12px 34px rgb(30 64 175/.12);
}
.is-light .greeting-card__veil{display:none}
.greeting-card__light-art{position:absolute;z-index:-1;inset:0;overflow:hidden;border-radius:inherit}
.greeting-card__light-art::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgb(37 99 235/.045) 1px,transparent 1px),linear-gradient(90deg,rgb(37 99 235/.045) 1px,transparent 1px);background-size:30px 30px;mask-image:linear-gradient(90deg,transparent 38%,#000 70%)}
.greeting-card__orb{position:absolute;border-radius:999px;filter:blur(1px)}
.greeting-card__orb--one{top:-70px;right:24%;width:190px;height:190px;background:linear-gradient(145deg,rgb(14 165 233/.18),rgb(37 99 235/.04))}
.greeting-card__orb--two{right:-55px;bottom:-90px;width:240px;height:240px;background:linear-gradient(145deg,rgb(99 102 241/.16),rgb(59 130 246/.04))}
.greeting-card__mini-board{position:absolute;top:50%;right:7%;width:270px;padding:14px;border:1px solid rgb(255 255 255/.9);border-radius:20px;background:rgb(255 255 255/.72);box-shadow:0 22px 50px rgb(30 64 175/.16),inset 0 1px 0 #fff;backdrop-filter:blur(16px);transform:translateY(-50%) rotate(-2deg)}
.greeting-card__mini-top{display:flex;gap:5px;margin-bottom:12px}.greeting-card__mini-top span{width:6px;height:6px;border-radius:50%;background:#bfdbfe}.greeting-card__mini-top span:first-child{background:#38bdf8}.greeting-card__mini-row{display:flex;align-items:center;gap:9px;margin-top:7px;padding:8px;border:1px solid #e5edf8;border-radius:11px;background:rgb(255 255 255/.84)}
.greeting-card__mini-row i{display:grid;width:24px;height:24px;flex:none;place-items:center;border-radius:8px;background:#e0f2fe;color:#0284c7;font-size:12px;font-style:normal;font-weight:800}.greeting-card__mini-row:nth-child(3) i{background:#dbeafe;color:#2563eb}.greeting-card__mini-row:nth-child(4) i{background:#ede9fe;color:#7c3aed}.greeting-card__mini-row>span{display:grid;flex:1;gap:5px}.greeting-card__mini-row b,.greeting-card__mini-row small{display:block;height:5px;border-radius:99px;background:#cbdcf2}.greeting-card__mini-row b{width:72%}.greeting-card__mini-row small{width:46%;background:#e2e8f0}.greeting-card__mini-row em{border-radius:99px;background:#ecfdf5;padding:4px 7px;color:#059669;font-size:8px;font-style:normal;font-weight:800}.greeting-card__mini-row:nth-child(3) em{background:#eff6ff;color:#2563eb}.greeting-card__mini-row:nth-child(4) em{background:#f5f3ff;color:#7c3aed}
.is-dark{background:radial-gradient(circle at 76% 8%,rgb(var(--tf-art-a)/.25),transparent 26%),radial-gradient(circle at 96% 90%,rgb(var(--tf-art-b)/.2),transparent 31%),linear-gradient(120deg,#071426 0%,#0a1d36 52%,#10284a 100%)}
.is-dark .greeting-card__veil{display:none}
.is-dark .greeting-card__light-art::before{background-image:linear-gradient(rgb(147 197 253/.07) 1px,transparent 1px),linear-gradient(90deg,rgb(147 197 253/.07) 1px,transparent 1px)}
.is-dark .greeting-card__orb--one{background:linear-gradient(145deg,rgb(var(--tf-art-a)/.24),rgb(var(--tf-art-a)/.03))}.is-dark .greeting-card__orb--two{background:linear-gradient(145deg,rgb(var(--tf-art-b)/.2),rgb(var(--tf-art-b)/.03))}
.is-dark .greeting-card__mini-board{border-color:rgb(148 163 184/.18);background:rgb(8 27 51/.7);box-shadow:0 24px 55px rgb(0 0 0/.3),inset 0 1px 0 rgb(255 255 255/.08)}
.is-dark .greeting-card__mini-top span{background:#334e70}.is-dark .greeting-card__mini-top span:first-child{background:#38bdf8}.is-dark .greeting-card__mini-row{border-color:rgb(148 163 184/.13);background:rgb(15 38 68/.82)}
.is-dark .greeting-card__mini-row b{background:#527197}.is-dark .greeting-card__mini-row small{background:#2a4567}.is-dark .greeting-card__mini-row i{background:rgb(14 165 233/.16);color:#7dd3fc}.is-dark .greeting-card__mini-row:nth-child(3) i{background:rgb(59 130 246/.17);color:#93c5fd}.is-dark .greeting-card__mini-row:nth-child(4) i{background:rgb(139 92 246/.18);color:#c4b5fd}
.is-dark .greeting-card__mini-row em{background:rgb(16 185 129/.13);color:#6ee7b7}.is-dark .greeting-card__mini-row:nth-child(3) em{background:rgb(59 130 246/.14);color:#93c5fd}.is-dark .greeting-card__mini-row:nth-child(4) em{background:rgb(139 92 246/.14);color:#c4b5fd}
@media(max-width:900px){.greeting-card__mini-board{right:4%;width:230px;opacity:.72}}
@media(max-width:760px){.greeting-card__mini-board{right:-76px;width:210px;opacity:.34}.greeting-card__light-art::before{mask-image:linear-gradient(90deg,transparent 15%,#000 85%)}}
</style>
