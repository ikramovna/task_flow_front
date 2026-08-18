<script setup lang="ts">
const props = withDefaults(defineProps<{ dark?: boolean; muslimaMusic?: boolean }>(), { dark: false, muslimaMusic: false })

const defaultStations = [
  { name: 'Lo-Fi Focus', description: 'YouTube · focus beats', color: '#3b82f6', videoId: 'sjkrrmBnpGE' },
  { name: 'Deep Focus', description: 'YouTube · deep concentration', color: '#8b5cf6', videoId: 'EOAPMhaCtuw' },
  { name: 'Coffee Jazz', description: 'YouTube · coffee shop jazz', color: '#f59e0b', videoId: 'X4VbdwhkE10' },
  { name: 'Ambient', description: 'YouTube · ambient soundscape', color: '#14b8a6', videoId: '_bLX5WfDQfM' },
  { name: 'Space Focus', description: 'YouTube · space ambience', color: '#ec4899', videoId: 'V_HmhifhbNo' }
]
const muslimaStations = [
  { name: 'Zulayho Eshqobilova — Gule Gule', description: 'YouTube · Muslima private music', color: '#06b6d4', videoId: 'f_69P1yb9e8' },
  { name: 'Lamis Kan — Mesaytara', description: 'YouTube · Muslima private music', color: '#8b5cf6', videoId: '9A4_GnALZd4' },
  { name: 'Sherine — El Watar El Hassas', description: 'YouTube · Muslima private music', color: '#ec4899', videoId: 'KZYqugtbcG0' },
  { name: "Ahmed Saad — Keda La'a", description: 'YouTube · Muslima private music', color: '#f97316', videoId: 'Y0mrvICGgBc' },
  { name: 'Haifa Wahbe — Fakerne', description: 'YouTube · Muslima private music', color: '#22c55e', videoId: 'Ey_gCiBM7kU' },
  { name: "Ahmed Batshan — Ma'aya Toul El Leil", description: 'YouTube · Muslima private music', color: '#eab308', videoId: 'rITshSYF97Y' }
]
const stations = computed(() => props.muslimaMusic ? [...defaultStations, ...muslimaStations] : defaultStations)

const trigger = ref<HTMLElement | null>(null)
const root = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const youtubePlayer = ref<HTMLIFrameElement | null>(null)
const isOpen = ref(false)
const selectedIndex = ref(0)
const isPlaying = ref(false)
const isLoading = ref(false)
const volume = ref(42)
const lastAudibleVolume = ref(42)
const elapsedSeconds = ref(0)
const durationSeconds = ref(0)
const errorMessage = ref('')
const panelStyle = ref<Record<string, string>>({})
const selectedStation = computed(() => stations.value[selectedIndex.value] || stations.value[0]!)
const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
const formattedElapsed = computed(() => formatTime(elapsedSeconds.value))
const formattedDuration = computed(() => formatTime(Math.ceil(durationSeconds.value)))
const sessionProgress = computed(() => durationSeconds.value > 0 ? Math.min(100, (elapsedSeconds.value / durationSeconds.value) * 100) : 0)
const youtubeEmbedUrl = computed(() => {
  const id = selectedStation.value.videoId
  return `https://www.youtube.com/embed/${id}?enablejsapi=1&playsinline=1&rel=0&loop=1&playlist=${id}`
})
let elapsedTimer: ReturnType<typeof setInterval> | null = null

const sendYouTubeCommand = (func: string, args: Array<string | number> = []) => {
  youtubePlayer.value?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*')
}
const startYouTubeListening = () => {
  youtubePlayer.value?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 'taskflow-focus-radio' }), '*')
}
const startElapsedTimer = () => {
  if (elapsedTimer) clearInterval(elapsedTimer)
  elapsedTimer = setInterval(() => {
    sendYouTubeCommand('getCurrentTime')
    sendYouTubeCommand('getDuration')
  }, 500)
}
const stopElapsedTimer = () => {
  if (elapsedTimer) clearInterval(elapsedTimer)
  elapsedTimer = null
}

const stopPlayback = () => {
  sendYouTubeCommand('pauseVideo')
  isPlaying.value = false
  isLoading.value = false
  stopElapsedTimer()
}

const closePanel = () => {
  isOpen.value = false
}

const updatePanelPosition = () => {
  if (!trigger.value || !import.meta.client) return
  const rect = trigger.value.getBoundingClientRect()
  const width = Math.min(340, window.innerWidth - 32)
  let top = rect.bottom + 10
  let availableHeight = window.innerHeight - top - 16
  if (availableHeight < 390) {
    top = 16
    availableHeight = window.innerHeight - 32
  }
  panelStyle.value = {
    top: `${top}px`,
    left: `${Math.max(16, Math.min(rect.right - width, window.innerWidth - width - 16))}px`,
    width: `${width}px`,
    maxHeight: `${availableHeight}px`
  }
}

const togglePanel = async () => {
  if (isOpen.value) {
    closePanel()
    return
  }
  isOpen.value = true
  if (isOpen.value) {
    window.dispatchEvent(new CustomEvent('taskflow:overlay-open', { detail: 'focus-radio' }))
    await nextTick()
    updatePanelPosition()
  }
}

const closeOnOtherOverlay = (event: Event) => {
  if ((event as CustomEvent<string>).detail !== 'focus-radio') closePanel()
}

const closeOnOutsideClick = (event: PointerEvent) => {
  const target = event.target as Node
  if (isOpen.value && !root.value?.contains(target) && !panel.value?.contains(target)) closePanel()
}

const handleYouTubeMessage = (event: MessageEvent) => {
  if (!/^(?:https?:\/\/)?(?:www\.)?youtube(?:-nocookie)?\.com$/i.test(event.origin)) return
  let payload: any
  try {
    payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
  } catch {
    return
  }
  const info = payload?.info
  if (!info || typeof info !== 'object') return
  if (Number.isFinite(Number(info.currentTime))) elapsedSeconds.value = Math.max(0, Math.floor(Number(info.currentTime)))
  if (Number.isFinite(Number(info.duration)) && Number(info.duration) > 0) durationSeconds.value = Number(info.duration)
}

onMounted(() => {
  const savedIndex = Number(localStorage.getItem('taskflow-radio-station'))
  const savedVolume = Number(localStorage.getItem('taskflow-radio-volume'))
  if (Number.isInteger(savedIndex) && savedIndex >= 0 && savedIndex < stations.value.length) selectedIndex.value = savedIndex
  if (Number.isFinite(savedVolume) && savedVolume >= 0 && savedVolume <= 100) {
    volume.value = savedVolume
    if (savedVolume > 0) lastAudibleVolume.value = savedVolume
  }
  window.addEventListener('resize', updatePanelPosition)
  window.addEventListener('scroll', updatePanelPosition, true)
  window.addEventListener('taskflow:overlay-open', closeOnOtherOverlay)
  window.addEventListener('message', handleYouTubeMessage)
  document.addEventListener('pointerdown', closeOnOutsideClick)
})

onBeforeUnmount(() => {
  stopElapsedTimer()
  window.removeEventListener('resize', updatePanelPosition)
  window.removeEventListener('scroll', updatePanelPosition, true)
  window.removeEventListener('taskflow:overlay-open', closeOnOtherOverlay)
  window.removeEventListener('message', handleYouTubeMessage)
  document.removeEventListener('pointerdown', closeOnOutsideClick)
})

const startPlayback = async () => {
  errorMessage.value = ''
  isLoading.value = true
  try {
    startYouTubeListening()
    sendYouTubeCommand('setVolume', [volume.value])
    sendYouTubeCommand('playVideo')
    isPlaying.value = true
    startElapsedTimer()
  } catch {
    errorMessage.value = 'Audio could not start. Please allow sound in your browser.'
  } finally {
    isLoading.value = false
  }
}

const togglePlayback = async () => {
  if (isPlaying.value) {
    stopPlayback()
  } else await startPlayback()
}

const selectStation = async (index: number) => {
  if (index === selectedIndex.value) {
    togglePlayback()
    return
  }
  const wasPlaying = isPlaying.value
  selectedIndex.value = index
  elapsedSeconds.value = 0
  durationSeconds.value = 0
  localStorage.setItem('taskflow-radio-station', String(index))
  errorMessage.value = ''
  if (wasPlaying) {
    isLoading.value = true
    await nextTick()
  }
}

const handleYouTubeLoad = () => {
  startYouTubeListening()
  sendYouTubeCommand('setVolume', [volume.value])
  sendYouTubeCommand('getCurrentTime')
  sendYouTubeCommand('getDuration')
  if (isPlaying.value) sendYouTubeCommand('playVideo')
  isLoading.value = false
}

const changeStation = (direction: number) => {
  const nextIndex = (selectedIndex.value + direction + stations.value.length) % stations.value.length
  void selectStation(nextIndex)
}

watch(() => props.muslimaMusic, () => {
  if (selectedIndex.value >= stations.value.length) {
    stopPlayback()
    selectedIndex.value = 0
    elapsedSeconds.value = 0
  }
})

const updateVolume = () => {
  if (volume.value > 0) lastAudibleVolume.value = volume.value
  sendYouTubeCommand('setVolume', [volume.value])
  localStorage.setItem('taskflow-radio-volume', String(volume.value))
}

const toggleMute = () => {
  if (volume.value > 0) {
    lastAudibleVolume.value = volume.value
    volume.value = 0
  } else volume.value = lastAudibleVolume.value || 42
  updateVolume()
}
</script>

<template>
  <div ref="root" :class="['focus-radio', props.dark ? 'is-dark-mode' : '']">
    <iframe ref="youtubePlayer" :key="selectedStation.videoId" :src="youtubeEmbedUrl" class="focus-radio__youtube-player" title="Focus Radio audio player" allow="autoplay; encrypted-media" tabindex="-1" aria-hidden="true" @load="handleYouTubeLoad" />
    <button ref="trigger" type="button" :class="['focus-radio__trigger', isPlaying ? 'is-playing' : '']" :aria-expanded="isOpen" aria-label="Open Focus Radio" @click="togglePanel">
      <span class="focus-radio__trigger-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v6H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 1-2Zm16 0h-3v6h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-1-2Z" /></svg><i v-if="isPlaying" /></span>
      <span class="focus-radio__trigger-copy"><b>{{ selectedStation.name }}</b><small>{{ isLoading ? 'Connecting…' : isPlaying ? formattedElapsed : 'Focus Radio' }}</small></span>
      <span v-if="isPlaying" class="focus-radio__mini-bars" aria-hidden="true"><i /><i /><i /></span>
    </button>

    <Teleport to="body">
    <Transition name="radio-popover">
      <section v-if="isOpen" ref="panel" :class="['focus-radio__panel', props.dark ? 'is-dark-mode' : '']" :style="panelStyle" aria-label="Focus Radio player">
        <header><div><h2>Focus Radio</h2><p>Music for your work session</p></div><button type="button" aria-label="Close Focus Radio" @click="closePanel">×</button></header>

        <div class="focus-radio__stations">
          <button v-for="(station, index) in stations" :key="station.name" type="button" :class="['focus-radio__station', selectedIndex === index ? 'is-active' : '']" @click="selectStation(index)">
            <span class="focus-radio__play-icon" :style="{ '--station-color': station.color }">
              <svg v-if="selectedIndex === index && isPlaying" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7v10M15 7v10" /></svg>
              <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="m9 7 8 5-8 5V7Z" /></svg>
            </span>
            <span class="focus-radio__station-copy"><b>{{ station.name }}</b><small>{{ station.description }}</small></span>
            <span v-if="selectedIndex === index && isPlaying" class="focus-radio__bars" aria-hidden="true"><i /><i /><i /><i /></span>
          </button>
        </div>

        <p v-if="errorMessage" class="focus-radio__error">{{ errorMessage }}</p>
        <footer>
          <div class="focus-radio__session-time"><span>{{ formattedElapsed }} <i>/</i> {{ formattedDuration }}</span><small>{{ isPlaying ? 'Continuous focus radio' : elapsedSeconds ? 'Radio paused' : 'Ready to focus' }}</small></div>
          <div class="focus-radio__session-progress" aria-hidden="true"><i :style="{ width: `${sessionProgress}%` }" /></div>
          <div class="focus-radio__transport">
            <button type="button" aria-label="Previous station" @click="changeStation(-1)"><svg viewBox="0 0 24 24"><path d="M6 6v12m12-11-8 5 8 5V7Z" /></svg></button>
            <button type="button" class="focus-radio__main-play" :aria-label="isPlaying ? 'Pause radio' : 'Play radio'" @click="togglePlayback"><span v-if="isLoading" class="focus-radio__spinner" /><svg v-else-if="isPlaying" viewBox="0 0 24 24"><path d="M9 7v10M15 7v10" /></svg><svg v-else viewBox="0 0 24 24"><path d="m9 7 8 5-8 5V7Z" /></svg></button>
            <button type="button" aria-label="Next station" @click="changeStation(1)"><svg viewBox="0 0 24 24"><path d="M18 6v12M6 7l8 5-8 5V7Z" /></svg></button>
          </div>
          <div class="focus-radio__volume">
            <button type="button" :aria-label="volume === 0 ? 'Unmute radio' : 'Mute radio'" :title="volume === 0 ? 'Unmute' : 'Mute'" @click="toggleMute">
              <svg v-if="volume === 0" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10v4h3l4 4V6l-4 4H5Zm11 1 5 5m0-5-5 5" /></svg>
              <svg v-else-if="volume < 45" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10v4h3l4 4V6l-4 4H5Zm4.5 2h.01" /></svg>
              <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10v4h3l4 4V6l-4 4H5Zm11-1a5 5 0 0 1 0 6m2-9a9 9 0 0 1 0 12" /></svg>
            </button>
            <input v-model.number="volume" type="range" min="0" max="100" aria-label="Radio volume" @input="updateVolume" />
            <span>{{ volume }}%</span>
          </div>
          <span class="block mt-2 text-center text-[8px] text-slate-400">Powered by YouTube · keeps playing while you work</span>
        </footer>
      </section>
    </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.focus-radio__youtube-player{position:fixed;left:-10000px;top:0;width:200px;height:200px;border:0;opacity:.001;pointer-events:none}
.focus-radio{position:relative}.focus-radio__trigger{display:flex;height:42px;max-width:180px;align-items:center;gap:8px;border:1px solid rgb(148 163 184/.28);border-radius:12px;background:rgb(255 255 255/.76);padding:0 10px;color:#425269;box-shadow:0 5px 16px rgb(15 23 42/.07);backdrop-filter:blur(12px);transition:.2s}.focus-radio__trigger:hover,.focus-radio__trigger.is-playing{border-color:rgb(37 103 173/.45);background:#fff;color:#2567ad}.focus-radio__trigger>svg{width:18px;flex:none;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.focus-radio__trigger-copy{display:grid;min-width:0;text-align:left;line-height:1.05}.focus-radio__trigger-copy b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px}.focus-radio__trigger-copy small{margin-top:3px;color:#8190a4;font-size:8px}.focus-radio__mini-bars,.focus-radio__bars{display:flex;height:18px;align-items:flex-end;gap:2px}.focus-radio__mini-bars i,.focus-radio__bars i{width:2px;border-radius:9px;background:#3b82f6;animation:radio-bars .8s ease-in-out infinite alternate}.focus-radio__mini-bars i:nth-child(1),.focus-radio__bars i:nth-child(1){height:35%}.focus-radio__mini-bars i:nth-child(2),.focus-radio__bars i:nth-child(2){height:90%;animation-delay:.2s}.focus-radio__mini-bars i:nth-child(3),.focus-radio__bars i:nth-child(3){height:55%;animation-delay:.4s}.focus-radio__bars i:nth-child(4){height:75%;animation-delay:.1s}.focus-radio__panel{position:absolute;z-index:90;top:calc(100% + 10px);right:0;width:min(340px,calc(100vw - 32px));overflow:hidden;border:1px solid #dbe4ef;border-radius:17px;background:rgb(255 255 255/.97);color:#0b1b32;box-shadow:0 24px 65px rgb(15 23 42/.22);backdrop-filter:blur(18px)}.focus-radio__panel header{display:flex;align-items:flex-start;justify-content:space-between;padding:18px 18px 12px}.focus-radio__panel h2{font-size:16px;font-weight:800}.focus-radio__panel header p{margin-top:3px;color:#8190a4;font-size:10px}.focus-radio__panel header button{display:grid;width:28px;height:28px;place-items:center;border-radius:8px;color:#8190a4;font-size:21px}.focus-radio__panel header button:hover{background:#eff6ff;color:#2567ad}.focus-radio__stations{padding:0 10px 10px}.focus-radio__station{display:flex;width:100%;align-items:center;gap:11px;border:1px solid transparent;border-radius:12px;padding:9px;text-align:left;transition:.18s}.focus-radio__station:hover{background:#f8fafc}.focus-radio__station.is-active{border-color:#d7e8ff;background:#eff6ff}.focus-radio__play-icon{display:grid;width:30px;height:30px;flex:none;place-items:center;border-radius:50%;background:color-mix(in srgb,var(--station-color) 12%,white);color:var(--station-color)}.focus-radio__play-icon svg{width:16px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}.focus-radio__station-copy{display:grid;min-width:0;flex:1}.focus-radio__station-copy b{font-size:12px}.focus-radio__station-copy small{margin-top:2px;overflow:hidden;color:#8190a4;font-size:9px;text-overflow:ellipsis;white-space:nowrap}.focus-radio__bars{width:24px;color:#3b82f6}.focus-radio__error{margin:0 18px 10px;border-radius:9px;background:#fff1f2;padding:8px 10px;color:#e11d48;font-size:10px}.focus-radio__panel footer{border-top:1px solid #e7edf4;padding:13px 18px 12px}.focus-radio__transport{display:flex;align-items:center;justify-content:center;gap:23px}.focus-radio__transport button{display:grid;width:32px;height:32px;place-items:center;color:#64748b}.focus-radio__transport svg,.focus-radio__volume svg{width:17px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}.focus-radio__transport .focus-radio__main-play{width:48px;height:48px;border-radius:50%;background:linear-gradient(145deg,#3b82f6,#2567ad);color:#fff;box-shadow:0 9px 22px rgb(37 103 173/.32)}.focus-radio__main-play svg{width:21px}.focus-radio__spinner{width:18px;height:18px;border:2px solid rgb(255 255 255/.35);border-top-color:#fff;border-radius:50%;animation:radio-spin .7s linear infinite}.focus-radio__volume{display:flex;align-items:center;gap:10px;margin-top:12px;color:#64748b}.focus-radio__volume input{width:100%;height:4px;accent-color:#3b82f6}.focus-radio__panel footer>a{display:block;margin-top:9px;text-align:center;color:#94a3b8;font-size:8px}.radio-popover-enter-active,.radio-popover-leave-active{transition:.18s}.radio-popover-enter-from,.radio-popover-leave-to{opacity:0;transform:translateY(-7px) scale(.98)}:global(.tf-dark) .focus-radio__trigger{border-color:#2a415f;background:rgb(7 24 45/.78);color:#e7f1ff}:global(.tf-dark) .focus-radio__trigger:hover,:global(.tf-dark) .focus-radio__trigger.is-playing{background:#102b4c;color:#7dd3fc}:global(.tf-dark) .focus-radio__panel{border-color:#253b58;background:rgb(8 24 45/.98);color:#f8fbff}:global(.tf-dark) .focus-radio__station:hover{background:#102640}:global(.tf-dark) .focus-radio__station.is-active{border-color:#275a92;background:#102d50}:global(.tf-dark) .focus-radio__play-icon{background:rgb(59 130 246/.14)}:global(.tf-dark) .focus-radio__panel footer{border-color:#243a56}:global(.tf-dark) .focus-radio__error{background:rgb(225 29 72/.12)}@keyframes radio-bars{to{height:100%}}@keyframes radio-spin{to{transform:rotate(360deg)}}@media(max-width:640px){.focus-radio__trigger{width:42px;padding:0;justify-content:center}.focus-radio__trigger-copy,.focus-radio__mini-bars{display:none}}
.focus-radio__trigger{display:flex!important;width:auto!important;height:42px!important;padding:0 10px!important;border-radius:12px!important}
.focus-radio__panel{position:fixed;z-index:9999;right:auto;overflow-x:hidden;overflow-y:auto}
@media(max-width:640px){.focus-radio__trigger{width:42px!important;padding:0!important}}
.focus-radio__trigger{min-width:146px!important;height:44px!important;gap:9px!important;border-color:rgba(148,163,184,.3)!important;border-radius:13px!important;background:linear-gradient(135deg,rgba(255,255,255,.94),rgba(244,248,253,.82))!important;padding:0 9px 0 7px!important;color:#334155!important;box-shadow:0 8px 22px -12px rgba(15,23,42,.45),inset 0 1px 0 rgba(255,255,255,.95)!important;backdrop-filter:blur(16px) saturate(145%)}
.focus-radio__trigger:hover,.focus-radio__trigger.is-playing{border-color:rgba(37,103,173,.38)!important;background:linear-gradient(135deg,#fff,#eef6ff)!important;color:#1d5fa8!important;box-shadow:0 10px 25px -12px rgba(37,103,173,.55),inset 0 1px 0 #fff!important}
.focus-radio__trigger-icon{position:relative;display:grid;width:31px;height:31px;flex:none;place-items:center;border:1px solid rgba(59,130,246,.17);border-radius:10px;background:linear-gradient(145deg,#eaf4ff,#dbeafe);color:#2567ad;box-shadow:inset 0 1px 0 #fff}
.focus-radio__trigger-icon svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.focus-radio__trigger-icon i{position:absolute;right:-2px;top:-2px;width:7px;height:7px;border:2px solid #fff;border-radius:50%;background:#22c55e;box-shadow:0 0 0 2px rgba(34,197,94,.14)}
.focus-radio__trigger-copy{line-height:1.1}.focus-radio__trigger-copy b{font-size:11px;letter-spacing:-.01em}.focus-radio__trigger-copy small{margin-top:3px;font-size:8px;font-weight:600}.focus-radio__mini-bars{margin-left:auto}
:global(.tf-dark) .focus-radio__trigger{border-color:rgba(96,165,250,.22)!important;background:linear-gradient(135deg,rgba(15,36,64,.93),rgba(7,24,45,.86))!important;color:#eaf3ff!important;box-shadow:0 10px 28px -13px rgba(0,0,0,.9),inset 0 1px 0 rgba(255,255,255,.08)!important}
:global(.tf-dark) .focus-radio__trigger:hover,:global(.tf-dark) .focus-radio__trigger.is-playing{border-color:rgba(56,189,248,.48)!important;background:linear-gradient(135deg,#153759,#0c2949)!important;color:#7dd3fc!important;box-shadow:0 12px 30px -13px rgba(14,165,233,.65),inset 0 1px 0 rgba(255,255,255,.1)!important}
:global(.tf-dark) .focus-radio__trigger-icon{border-color:rgba(125,211,252,.2);background:linear-gradient(145deg,rgba(37,99,235,.25),rgba(14,165,233,.12));color:#7dd3fc;box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}
:global(.tf-dark) .focus-radio__trigger-icon i{border-color:#0c2949}
.focus-radio__session-time{display:flex;align-items:baseline;justify-content:center;gap:7px;margin-bottom:7px}.focus-radio__session-time span{font-variant-numeric:tabular-nums;color:#2567ad;font-size:15px;font-weight:800;letter-spacing:.04em}.focus-radio__session-time span i{color:#94a3b8;font-style:normal;font-weight:500}.focus-radio__session-time small{color:#94a3b8;font-size:8px;font-weight:600}.focus-radio__session-progress{height:3px;margin:0 8px 9px;overflow:hidden;border-radius:999px;background:#e2e8f0}.focus-radio__session-progress i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#60a5fa,#2567ad);transition:width .4s linear}:global(.tf-dark) .focus-radio__session-time span{color:#7dd3fc}:global(.tf-dark) .focus-radio__session-progress{background:#203653}
@media(max-width:640px){.focus-radio__trigger{min-width:44px!important;width:44px!important;padding:0!important}.focus-radio__trigger-icon{width:32px;height:32px}.focus-radio__trigger-copy,.focus-radio__mini-bars{display:none}}
:global(.is-dark) .focus-radio__trigger{border-color:rgba(96,165,250,.22)!important;background:linear-gradient(135deg,rgba(15,36,64,.93),rgba(7,24,45,.86))!important;color:#eaf3ff!important;box-shadow:0 10px 28px -13px rgba(0,0,0,.9),inset 0 1px 0 rgba(255,255,255,.08)!important}
:global(.is-dark) .focus-radio__trigger:hover,:global(.is-dark) .focus-radio__trigger.is-playing{border-color:rgba(56,189,248,.48)!important;background:linear-gradient(135deg,#153759,#0c2949)!important;color:#7dd3fc!important}
:global(.is-dark) .focus-radio__trigger-icon{border-color:rgba(125,211,252,.2);background:linear-gradient(145deg,rgba(37,99,235,.25),rgba(14,165,233,.12));color:#7dd3fc;box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}
:global(.is-dark) .focus-radio__trigger-icon i{border-color:#0c2949}
.focus-radio.is-dark-mode .focus-radio__trigger{border-color:rgba(96,165,250,.22)!important;background:linear-gradient(135deg,rgba(15,36,64,.96),rgba(7,24,45,.92))!important;color:#eaf3ff!important;box-shadow:0 10px 28px -13px rgba(0,0,0,.9),inset 0 1px 0 rgba(255,255,255,.08)!important}
.focus-radio.is-dark-mode .focus-radio__trigger:hover,.focus-radio.is-dark-mode .focus-radio__trigger.is-playing{border-color:rgba(56,189,248,.48)!important;background:linear-gradient(135deg,#153759,#0c2949)!important;color:#7dd3fc!important}
.focus-radio.is-dark-mode .focus-radio__trigger-icon{border-color:rgba(125,211,252,.2);background:linear-gradient(145deg,rgba(37,99,235,.25),rgba(14,165,233,.12));color:#7dd3fc;box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}
.focus-radio.is-dark-mode .focus-radio__trigger-copy small{color:#9fb1c8}
.focus-radio.is-dark-mode .focus-radio__trigger-icon i{border-color:#0c2949}
.focus-radio__panel.is-dark-mode{border-color:#2b405d;background:rgba(10,24,43,.985);color:#f8fafc;box-shadow:0 28px 75px rgba(0,0,0,.55)}
.focus-radio__panel.is-dark-mode header{background:#0c1b30;border-color:#253b58}
.focus-radio__panel.is-dark-mode header p,.focus-radio__panel.is-dark-mode .focus-radio__station-copy small{color:#91a4bc}
.focus-radio__panel.is-dark-mode header button:hover{background:#17304f;color:#7dd3fc}
.focus-radio__panel.is-dark-mode .focus-radio__station:hover{background:#102640}
.focus-radio__panel.is-dark-mode .focus-radio__station.is-active{border-color:#275a92;background:#102d50}
.focus-radio__panel.is-dark-mode .focus-radio__play-icon{background:rgba(59,130,246,.14)}
.focus-radio__panel.is-dark-mode footer{border-color:#243a56;background:#0a182b}
.focus-radio__panel.is-dark-mode .focus-radio__session-time span{color:#7dd3fc}
.focus-radio__panel.is-dark-mode .focus-radio__transport button{color:#a9b9cc}
.focus-radio__panel.is-dark-mode .focus-radio__volume{color:#a9b9cc}
.focus-radio__volume button{display:grid;width:27px;height:27px;flex:none;place-items:center;border-radius:8px;transition:.18s}.focus-radio__volume button:hover{background:#eff6ff;color:#2567ad}.focus-radio__volume span{width:28px;flex:none;text-align:right;font-size:8px;font-weight:700;font-variant-numeric:tabular-nums}.focus-radio__panel.is-dark-mode .focus-radio__volume button:hover{background:#17304f;color:#7dd3fc}.focus-radio__panel.is-dark-mode .focus-radio__session-progress{background:#203653}
</style>
