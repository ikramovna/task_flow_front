<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string
  label: string
  placeholder?: string
  align?: 'left' | 'right'
}>(), {
  placeholder: 'DD.MM.YYYY',
  align: 'left'
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const root = ref<HTMLElement | null>(null)
const popover = ref<HTMLElement | null>(null)
const open = ref(false)
const cursor = ref(new Date())
const popoverStyle = ref<Record<string, string>>({})
const weekdays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

const parsedValue = computed(() => {
  const match = props.modelValue.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!match) return null
  const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]))
  return Number.isNaN(date.getTime()) ? null : date
})

const calendar = computed(() => {
  const year = cursor.value.getFullYear()
  const month = cursor.value.getMonth()
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - firstWeekday + 1
    return { key: `${year}-${month}-${index}`, day: day >= 1 && day <= daysInMonth ? day : 0, month, year }
  })
  return {
    label: new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(cursor.value),
    cells
  }
})

const positionCalendar = () => {
  if (!root.value) return
  const rect = root.value.getBoundingClientRect()
  const width = Math.min(280, window.innerWidth - 24)
  const estimatedHeight = 314
  const spaceBelow = window.innerHeight - rect.bottom
  const top = spaceBelow >= estimatedHeight + 10
    ? rect.bottom + 8
    : Math.max(12, rect.top - estimatedHeight - 8)
  const preferredLeft = props.align === 'right' ? rect.right - width : rect.left
  const left = Math.max(12, Math.min(window.innerWidth - width - 12, preferredLeft))
  popoverStyle.value = { position: 'fixed', top: `${top}px`, left: `${left}px`, width: `${width}px`, zIndex: '160' }
}

const revealCalendar = async () => {
  await nextTick()
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  positionCalendar()
}

const openCalendar = async () => {
  if (parsedValue.value) cursor.value = new Date(parsedValue.value)
  open.value = true
  await revealCalendar()
}

const moveMonth = (offset: number) => {
  cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + offset, 1)
}

const selectDate = (day: number, month: number, year: number) => {
  if (!day) return
  emit('update:modelValue', `${String(day).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}.${year}`)
  open.value = false
}

const updateInput = (event: Event) => {
  const digits = (event.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 8)
  const value = digits.length <= 2
    ? digits
    : digits.length <= 4
      ? `${digits.slice(0, 2)}.${digits.slice(2)}`
      : `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`
  emit('update:modelValue', value)
}

const isToday = (day: number, month: number, year: number) => {
  const today = new Date()
  return Boolean(day) && day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
}

const isSelected = (day: number, month: number, year: number) => Boolean(
  day && parsedValue.value && day === parsedValue.value.getDate() && month === parsedValue.value.getMonth() && year === parsedValue.value.getFullYear()
)

const closeOnOutside = (event: PointerEvent) => {
  const target = event.target as Node
  if (open.value && !root.value?.contains(target) && !popover.value?.contains(target)) open.value = false
}

const closeOnEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('pointerdown', closeOnOutside)
  document.addEventListener('keydown', closeOnEscape)
  window.addEventListener('resize', positionCalendar)
  window.addEventListener('scroll', positionCalendar, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', closeOnOutside)
  document.removeEventListener('keydown', closeOnEscape)
  window.removeEventListener('resize', positionCalendar)
  window.removeEventListener('scroll', positionCalendar, true)
})
</script>

<template>
  <label class="block text-sm font-semibold">
    {{ label }}
    <div ref="root" class="tf-date-picker relative mt-2">
      <input :value="modelValue" class="tf-input h-12 w-full pr-12" :placeholder="placeholder" inputmode="numeric" maxlength="10" @input="updateInput" @focus="openCalendar" />
      <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-task-muted transition hover:text-task-blue" :aria-label="`Open ${label.toLowerCase()} calendar`" :aria-expanded="open" @click="open ? (open = false) : openCalendar()">
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 2v4M16 2v4M3 10h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /></svg>
      </button>
      <Teleport to="body">
      <div v-if="open" ref="popover" class="tf-date-popover" :style="popoverStyle">
        <div class="mb-3 flex items-center justify-between"><b class="text-sm">{{ calendar.label }}</b><div class="flex gap-1"><button type="button" class="tf-icon-button h-8 w-8" aria-label="Previous month" @click.stop="moveMonth(-1)">‹</button><button type="button" class="tf-icon-button h-8 w-8" aria-label="Next month" @click.stop="moveMonth(1)">›</button></div></div>
        <div class="mb-2 grid grid-cols-7 text-center text-[10px] font-semibold text-task-muted"><span v-for="day in weekdays" :key="day">{{ day }}</span></div>
        <div class="grid grid-cols-7 gap-1"><button v-for="cell in calendar.cells" :key="cell.key" type="button" :disabled="!cell.day" :class="['h-8 rounded-[8px] text-sm transition', cell.day ? 'hover:bg-task-blueSoft hover:text-task-blue' : 'pointer-events-none', isSelected(cell.day, cell.month, cell.year) ? 'bg-task-blue font-bold text-white' : isToday(cell.day, cell.month, cell.year) ? 'bg-task-danger font-bold text-white' : '']" @click="selectDate(cell.day, cell.month, cell.year)">{{ cell.day || '' }}</button></div>
      </div>
      </Teleport>
    </div>
  </label>
</template>
