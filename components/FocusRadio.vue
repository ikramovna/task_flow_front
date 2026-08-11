<script setup lang="ts">
const stations = [
  { name: 'Lo-Fi Focus', description: 'Warm chords and soft focused beats', color: '#3b82f6', tempo: 72, wave: 'triangle' as OscillatorType, notes: [261.63, 329.63, 392, 493.88, 392, 329.63] },
  { name: 'Deep Focus', description: 'Slow minimal concentration tones', color: '#8b5cf6', tempo: 54, wave: 'sine' as OscillatorType, notes: [174.61, 220, 261.63, 220, 196, 146.83] },
  { name: 'Coffee Jazz', description: 'Soft jazzy workspace harmony', color: '#f59e0b', tempo: 82, wave: 'triangle' as OscillatorType, notes: [293.66, 349.23, 440, 523.25, 466.16, 349.23] },
  { name: 'Ambient', description: 'Floating calm background sound', color: '#14b8a6', tempo: 46, wave: 'sine' as OscillatorType, notes: [130.81, 196, 246.94, 196, 164.81, 220] },
  { name: 'Space Focus', description: 'Dreamy instrumental electronic tones', color: '#ec4899', tempo: 64, wave: 'sine' as OscillatorType, notes: [220, 277.18, 329.63, 415.3, 329.63, 277.18] }
]

const trigger = ref<HTMLElement | null>(null)
const root = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const selectedIndex = ref(0)
const isPlaying = ref(false)
const isLoading = ref(false)
const volume = ref(42)
const errorMessage = ref('')
const panelStyle = ref<Record<string, string>>({})
const selectedStation = computed(() => stations[selectedIndex.value]!)
let audioContext: AudioContext | null = null
let masterGain: GainNode | null = null
let scheduler: ReturnType<typeof setInterval> | null = null
let nextNoteTime = 0
let noteStep = 0

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
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    window.dispatchEvent(new CustomEvent('taskflow:overlay-open', { detail: 'focus-radio' }))
    await nextTick()
    updatePanelPosition()
  }
}

const closeOnOtherOverlay = (event: Event) => {
  if ((event as CustomEvent<string>).detail !== 'focus-radio') isOpen.value = false
}

const closeOnOutsideClick = (event: PointerEvent) => {
  const target = event.target as Node
  if (isOpen.value && !root.value?.contains(target) && !panel.value?.contains(target)) isOpen.value = false
}

onMounted(() => {
  const savedIndex = Number(localStorage.getItem('taskflow-radio-station'))
  const savedVolume = Number(localStorage.getItem('taskflow-radio-volume'))
  if (Number.isInteger(savedIndex) && savedIndex >= 0 && savedIndex < stations.length) selectedIndex.value = savedIndex
  if (Number.isFinite(savedVolume) && savedVolume >= 0 && savedVolume <= 100) volume.value = savedVolume
  window.addEventListener('resize', updatePanelPosition)
  window.addEventListener('scroll', updatePanelPosition, true)
  window.addEventListener('taskflow:overlay-open', closeOnOtherOverlay)
  document.addEventListener('pointerdown', closeOnOutsideClick)
})

onBeforeUnmount(() => {
  if (scheduler) clearInterval(scheduler)
  void audioContext?.close()
  window.removeEventListener('resize', updatePanelPosition)
  window.removeEventListener('scroll', updatePanelPosition, true)
  window.removeEventListener('taskflow:overlay-open', closeOnOtherOverlay)
  document.removeEventListener('pointerdown', closeOnOutsideClick)
})

const scheduleTone = (frequency: number, time: number, duration: number, volumeScale = 1) => {
  if (!audioContext || !masterGain) return
  const oscillator = audioContext.createOscillator()
  const toneGain = audioContext.createGain()
  const filter = audioContext.createBiquadFilter()
  oscillator.type = selectedStation.value.wave
  oscillator.frequency.setValueAtTime(frequency, time)
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(selectedIndex.value === 2 ? 1500 : 1050, time)
  toneGain.gain.setValueAtTime(0.0001, time)
  toneGain.gain.exponentialRampToValueAtTime(0.12 * volumeScale, time + 0.08)
  toneGain.gain.exponentialRampToValueAtTime(0.0001, time + duration)
  oscillator.connect(filter).connect(toneGain).connect(masterGain)
  oscillator.start(time)
  oscillator.stop(time + duration + 0.05)
}

const fillSchedule = () => {
  if (!audioContext || audioContext.state !== 'running') return
  const station = selectedStation.value
  const beat = 60 / station.tempo
  while (nextNoteTime < audioContext.currentTime + 0.25) {
    const frequency = station.notes[noteStep % station.notes.length]!
    scheduleTone(frequency, nextNoteTime, beat * (selectedIndex.value === 3 ? 2.8 : 1.65))
    if (noteStep % 4 === 0) scheduleTone(frequency / 2, nextNoteTime, beat * 2.2, 0.55)
    nextNoteTime += beat
    noteStep += 1
  }
}

const startPlayback = async () => {
  errorMessage.value = ''
  isLoading.value = true
  try {
    if (!audioContext) {
      audioContext = new AudioContext()
      masterGain = audioContext.createGain()
      masterGain.gain.value = volume.value / 100
      masterGain.connect(audioContext.destination)
    }
    await audioContext.resume()
    nextNoteTime = audioContext.currentTime + 0.05
    if (scheduler) clearInterval(scheduler)
    scheduler = setInterval(fillSchedule, 80)
    fillSchedule()
    isPlaying.value = true
  } catch {
    errorMessage.value = 'Audio could not start. Please allow sound in your browser.'
  } finally {
    isLoading.value = false
  }
}

const togglePlayback = async () => {
  if (isPlaying.value) {
    if (scheduler) clearInterval(scheduler)
    scheduler = null
    await audioContext?.suspend()
    isPlaying.value = false
  } else await startPlayback()
}

const selectStation = async (index: number) => {
  if (index === selectedIndex.value) {
    togglePlayback()
    return
  }
  selectedIndex.value = index
  localStorage.setItem('taskflow-radio-station', String(index))
  errorMessage.value = ''
  noteStep = 0
  if (isPlaying.value && audioContext) {
    nextNoteTime = audioContext.currentTime + 0.05
    fillSchedule()
  } else await startPlayback()
}

const changeStation = (direction: number) => {
  const nextIndex = (selectedIndex.value + direction + stations.length) % stations.length
  void selectStation(nextIndex)
}

const updateVolume = () => {
  if (masterGain && audioContext) masterGain.gain.setTargetAtTime(volume.value / 100, audioContext.currentTime, 0.04)
  localStorage.setItem('taskflow-radio-volume', String(volume.value))
}
</script>

<template>
  <div ref="root" class="focus-radio">
    <button ref="trigger" type="button" :class="['focus-radio__trigger', isPlaying ? 'is-playing' : '']" :aria-expanded="isOpen" aria-label="Open Focus Radio" @click="togglePanel">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v6H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 1-2Zm16 0h-3v6h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-1-2Z" /></svg>
      <span class="focus-radio__trigger-copy"><b>{{ selectedStation.name }}</b><small>{{ isLoading ? 'Connecting…' : isPlaying ? 'Playing' : 'Focus Radio' }}</small></span>
      <span v-if="isPlaying" class="focus-radio__mini-bars" aria-hidden="true"><i /><i /><i /></span>
    </button>

    <Teleport to="body">
    <Transition name="radio-popover">
      <section v-if="isOpen" ref="panel" class="focus-radio__panel" :style="panelStyle" aria-label="Focus Radio player">
        <header><div><h2>Focus Radio</h2><p>Music for your work session</p></div><button type="button" aria-label="Close Focus Radio" @click="isOpen = false">×</button></header>

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
          <div class="focus-radio__transport">
            <button type="button" aria-label="Previous station" @click="changeStation(-1)"><svg viewBox="0 0 24 24"><path d="M6 6v12m12-11-8 5 8 5V7Z" /></svg></button>
            <button type="button" class="focus-radio__main-play" :aria-label="isPlaying ? 'Pause radio' : 'Play radio'" @click="togglePlayback"><span v-if="isLoading" class="focus-radio__spinner" /><svg v-else-if="isPlaying" viewBox="0 0 24 24"><path d="M9 7v10M15 7v10" /></svg><svg v-else viewBox="0 0 24 24"><path d="m9 7 8 5-8 5V7Z" /></svg></button>
            <button type="button" aria-label="Next station" @click="changeStation(1)"><svg viewBox="0 0 24 24"><path d="M18 6v12M6 7l8 5-8 5V7Z" /></svg></button>
          </div>
          <label class="focus-radio__volume"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10v4h3l4 4V6l-4 4H5Zm11-1a5 5 0 0 1 0 6m2-9a9 9 0 0 1 0 12" /></svg><input v-model.number="volume" type="range" min="0" max="100" aria-label="Radio volume" @input="updateVolume" /></label>
          <span class="block mt-2 text-center text-[8px] text-slate-400">Generative audio · no internet required</span>
        </footer>
      </section>
    </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.focus-radio{position:relative}.focus-radio__trigger{display:flex;height:42px;max-width:180px;align-items:center;gap:8px;border:1px solid rgb(148 163 184/.28);border-radius:12px;background:rgb(255 255 255/.76);padding:0 10px;color:#425269;box-shadow:0 5px 16px rgb(15 23 42/.07);backdrop-filter:blur(12px);transition:.2s}.focus-radio__trigger:hover,.focus-radio__trigger.is-playing{border-color:rgb(37 103 173/.45);background:#fff;color:#2567ad}.focus-radio__trigger>svg{width:18px;flex:none;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.focus-radio__trigger-copy{display:grid;min-width:0;text-align:left;line-height:1.05}.focus-radio__trigger-copy b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px}.focus-radio__trigger-copy small{margin-top:3px;color:#8190a4;font-size:8px}.focus-radio__mini-bars,.focus-radio__bars{display:flex;height:18px;align-items:flex-end;gap:2px}.focus-radio__mini-bars i,.focus-radio__bars i{width:2px;border-radius:9px;background:#3b82f6;animation:radio-bars .8s ease-in-out infinite alternate}.focus-radio__mini-bars i:nth-child(1),.focus-radio__bars i:nth-child(1){height:35%}.focus-radio__mini-bars i:nth-child(2),.focus-radio__bars i:nth-child(2){height:90%;animation-delay:.2s}.focus-radio__mini-bars i:nth-child(3),.focus-radio__bars i:nth-child(3){height:55%;animation-delay:.4s}.focus-radio__bars i:nth-child(4){height:75%;animation-delay:.1s}.focus-radio__panel{position:absolute;z-index:90;top:calc(100% + 10px);right:0;width:min(340px,calc(100vw - 32px));overflow:hidden;border:1px solid #dbe4ef;border-radius:17px;background:rgb(255 255 255/.97);color:#0b1b32;box-shadow:0 24px 65px rgb(15 23 42/.22);backdrop-filter:blur(18px)}.focus-radio__panel header{display:flex;align-items:flex-start;justify-content:space-between;padding:18px 18px 12px}.focus-radio__panel h2{font-size:16px;font-weight:800}.focus-radio__panel header p{margin-top:3px;color:#8190a4;font-size:10px}.focus-radio__panel header button{display:grid;width:28px;height:28px;place-items:center;border-radius:8px;color:#8190a4;font-size:21px}.focus-radio__panel header button:hover{background:#eff6ff;color:#2567ad}.focus-radio__stations{padding:0 10px 10px}.focus-radio__station{display:flex;width:100%;align-items:center;gap:11px;border:1px solid transparent;border-radius:12px;padding:9px;text-align:left;transition:.18s}.focus-radio__station:hover{background:#f8fafc}.focus-radio__station.is-active{border-color:#d7e8ff;background:#eff6ff}.focus-radio__play-icon{display:grid;width:30px;height:30px;flex:none;place-items:center;border-radius:50%;background:color-mix(in srgb,var(--station-color) 12%,white);color:var(--station-color)}.focus-radio__play-icon svg{width:16px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}.focus-radio__station-copy{display:grid;min-width:0;flex:1}.focus-radio__station-copy b{font-size:12px}.focus-radio__station-copy small{margin-top:2px;overflow:hidden;color:#8190a4;font-size:9px;text-overflow:ellipsis;white-space:nowrap}.focus-radio__bars{width:24px;color:#3b82f6}.focus-radio__error{margin:0 18px 10px;border-radius:9px;background:#fff1f2;padding:8px 10px;color:#e11d48;font-size:10px}.focus-radio__panel footer{border-top:1px solid #e7edf4;padding:13px 18px 12px}.focus-radio__transport{display:flex;align-items:center;justify-content:center;gap:23px}.focus-radio__transport button{display:grid;width:32px;height:32px;place-items:center;color:#64748b}.focus-radio__transport svg,.focus-radio__volume svg{width:17px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}.focus-radio__transport .focus-radio__main-play{width:48px;height:48px;border-radius:50%;background:linear-gradient(145deg,#3b82f6,#2567ad);color:#fff;box-shadow:0 9px 22px rgb(37 103 173/.32)}.focus-radio__main-play svg{width:21px}.focus-radio__spinner{width:18px;height:18px;border:2px solid rgb(255 255 255/.35);border-top-color:#fff;border-radius:50%;animation:radio-spin .7s linear infinite}.focus-radio__volume{display:flex;align-items:center;gap:10px;margin-top:12px;color:#64748b}.focus-radio__volume input{width:100%;height:4px;accent-color:#3b82f6}.focus-radio__panel footer>a{display:block;margin-top:9px;text-align:center;color:#94a3b8;font-size:8px}.radio-popover-enter-active,.radio-popover-leave-active{transition:.18s}.radio-popover-enter-from,.radio-popover-leave-to{opacity:0;transform:translateY(-7px) scale(.98)}:global(.tf-dark) .focus-radio__trigger{border-color:#2a415f;background:rgb(7 24 45/.78);color:#e7f1ff}:global(.tf-dark) .focus-radio__trigger:hover,:global(.tf-dark) .focus-radio__trigger.is-playing{background:#102b4c;color:#7dd3fc}:global(.tf-dark) .focus-radio__panel{border-color:#253b58;background:rgb(8 24 45/.98);color:#f8fbff}:global(.tf-dark) .focus-radio__station:hover{background:#102640}:global(.tf-dark) .focus-radio__station.is-active{border-color:#275a92;background:#102d50}:global(.tf-dark) .focus-radio__play-icon{background:rgb(59 130 246/.14)}:global(.tf-dark) .focus-radio__panel footer{border-color:#243a56}:global(.tf-dark) .focus-radio__error{background:rgb(225 29 72/.12)}@keyframes radio-bars{to{height:100%}}@keyframes radio-spin{to{transform:rotate(360deg)}}@media(max-width:640px){.focus-radio__trigger{width:42px;padding:0;justify-content:center}.focus-radio__trigger-copy,.focus-radio__mini-bars{display:none}}
.focus-radio__trigger{display:flex!important;width:auto!important;height:42px!important;padding:0 10px!important;border-radius:12px!important}
.focus-radio__panel{position:fixed;z-index:9999;right:auto;overflow-x:hidden;overflow-y:auto}
@media(max-width:640px){.focus-radio__trigger{width:42px!important;padding:0!important}}
</style>
