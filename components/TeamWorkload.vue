<script setup lang="ts">
import AppSelect from '~/components/ui/AppSelect.vue'

type RecordValue = Record<string, unknown>
type WorkTask = { id: string; title: string; due: string; status: string; priority: string; assignedBy: string }
type WorkMember = { id: string; name: string; role: string; avatar: string; departmentId: string; departmentName: string; tasks: WorkTask[]; hasTaskDetails: boolean; inProgress: number | null; completed: number | null; efficiency: number | null }

const api = useTaskFlowApi()
const members = ref<WorkMember[]>([])
const loading = ref(true)
const error = ref('')
const department = ref('')
const period = ref('all')
const expandedMembers = ref<string[]>([])
const toggleMember = (id: string) => {
  expandedMembers.value = expandedMembers.value.includes(id) ? expandedMembers.value.filter(value => value !== id) : [...expandedMembers.value, id]
}
const shownTasks = (member: WorkMember) => expandedMembers.value.includes(member.id) ? member.tasks : member.tasks.slice(0, 3)
watch([department, period], () => { expandedMembers.value = [] })
const periodOptions = [{ value: 'all', label: 'All dates' }, { value: 'week', label: 'This week' }, { value: 'month', label: 'This month' }]
const record = (value: unknown): RecordValue => value && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {}
const string = (value: unknown) => typeof value === 'string' || typeof value === 'number' ? String(value) : ''
const count = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null
const personName = (value: unknown) => {
  const person = record(value)
  return string(person.full_name || person.name) || [person.first_name, person.last_name].filter(Boolean).join(' ') || string(person.email) || string(value)
}
const label = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())
const initials = (name: string) => name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()

function normalize(response: unknown): WorkMember[] {
  const root = record(response)
  const data = root.data ?? response
  const container = record(data)
  const rows = Array.isArray(data) ? data : container.members ?? container.results ?? container.items ?? (container.id != null && ('email' in container || 'full_name' in container) ? [container] : undefined)
  if (!Array.isArray(rows)) throw new Error('The workload response could not be read. Please contact support.')
  return rows.map((value, index) => {
    const row = record(value)
    const member = record(row.member || row.user || row)
    const user = record(member.user || member)
    const dept = row.department ?? member.department
    const details = row.tasks ?? (Array.isArray(row.active_tasks) ? row.active_tasks : undefined) ?? (Array.isArray(row.in_progress_tasks) ? row.in_progress_tasks : undefined)
    if (details !== undefined && !Array.isArray(details)) throw new Error('Task details could not be read.')
    const tasks = Array.isArray(details) ? details : []
    return {
      id: string(member.id ?? row.id) || String(index),
      name: personName(user) || personName(member) || 'Unnamed member',
      role: string(member.job_title || user.job_title || row.job_title || member.role || row.role),
      avatar: string(user.avatar || member.avatar || row.avatar),
      departmentId: string(record(dept).id || dept || row.department_id),
      departmentName: string(record(dept).name || row.department_name || member.department_name) || string(dept) || 'Department',
      hasTaskDetails: Array.isArray(details),
      inProgress: count(row.in_progress_tasks),
      completed: count(row.completed_tasks),
      efficiency: count(row.efficiency),
      tasks: tasks.map((value, taskIndex) => {
        const task = record(value)
        return {
          id: string(task.id) || `member-${index}-task-${taskIndex}`,
          title: string(task.title || task.name) || 'Untitled task',
          due: string(task.due_date),
          status: string(task.status).toLowerCase(),
          priority: string(task.priority).toLowerCase(),
          assignedBy: personName(task.assigned_by_detail || task.created_by_detail || task.assigned_by || task.created_by) || '-'
        }
      }).filter(task => !['completed', 'archived', 'cancelled'].includes(task.status))
    }
  })
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    members.value = normalize(await api.getMembersWorkload())
    expandedMembers.value = []
    period.value = 'all'
  } catch (cause) {
    members.value = []
    error.value = cause instanceof Error ? cause.message : 'Unable to load team workload.'
  } finally {
    loading.value = false
  }
}

const departments = computed(() => Array.from(new Map(members.value.filter(member => member.departmentId).map(member => [member.departmentId, { id: member.departmentId, name: member.departmentName }])).values()))
const departmentOptions = computed(() => [{ value: '', label: 'All departments' }, ...departments.value.map(item => ({ value: item.id, label: item.name }))])
const hasTaskDetails = computed(() => members.value.length > 0 && members.value.every(member => member.hasTaskDetails))
const today = () => { const date = new Date(); date.setHours(0, 0, 0, 0); return date }
const dueDate = (value: string) => {
  if (!value) return null
  const date = new Date(value.slice(0, 10) + 'T00:00:00')
  return Number.isNaN(date.getTime()) ? null : date
}
const visibleMembers = computed(() => {
  const start = today()
  const end = today()
  if (period.value === 'week') {
    start.setDate(start.getDate() - (start.getDay() + 6) % 7)
    end.setTime(start.getTime())
    end.setDate(end.getDate() + 7)
  } else if (period.value === 'month') {
    start.setDate(1)
    end.setMonth(end.getMonth() + 1, 1)
  }
  return members.value.filter(member => !department.value || member.departmentId === department.value).map(member => ({
    ...member,
    tasks: member.tasks.filter(task => {
      if (!hasTaskDetails.value || period.value === 'all') return true
      const due = dueDate(task.due)
      return due && due >= start && due < end
    })
  })).filter(member => member.hasTaskDetails ? member.tasks.length > 0 : (member.inProgress ?? 0) > 0)
})
const allTasks = computed(() => Array.from(new Map(visibleMembers.value.flatMap(member => member.tasks.map(task => [task.id, task] as const))).values()))
const overdue = (task: WorkTask) => { const due = dueDate(task.due); return due !== null && due < today() }
const stats = computed(() => [
  { label: 'Team Members', count: visibleMembers.value.length, color: 'text-task-blue' },
  { label: hasTaskDetails.value ? 'In Progress' : 'In Progress Assignments', count: hasTaskDetails.value ? allTasks.value.filter(task => task.status === 'in_progress').length : visibleMembers.value.every(member => member.inProgress !== null) ? visibleMembers.value.reduce((total, member) => total + (member.inProgress ?? 0), 0) : '-', color: 'text-task-blue' },
  { label: 'Overdue', count: hasTaskDetails.value ? allTasks.value.filter(overdue).length : '-', color: 'text-task-danger' }
])
const deadline = (task: WorkTask) => {
  const due = dueDate(task.due)
  if (!due) return 'No due date'
  const days = Math.round((Date.UTC(due.getFullYear(), due.getMonth(), due.getDate()) - Date.UTC(today().getFullYear(), today().getMonth(), today().getDate())) / 86400000)
  return days < 0 ? `${-days} ${days === -1 ? 'day' : 'days'} overdue` : days === 0 ? 'Due today' : `${days} ${days === 1 ? 'day' : 'days'} left`
}
const deadlineClass = (task: WorkTask) => overdue(task) ? 'bg-task-dangerSoft text-task-danger' : deadline(task) === 'Due today' ? 'bg-task-warningSoft text-task-warning' : 'bg-task-blueSoft text-task-blue'
const priorityClass = (priority: string) => ['high', 'urgent'].includes(priority) ? 'bg-task-dangerSoft text-task-danger' : priority === 'medium' ? 'bg-task-warningSoft text-task-warning' : 'bg-task-blueSoft text-task-blue'
function download() {
  const rows = hasTaskDetails.value
    ? [['Member', 'Role', 'Task', 'Due date', 'Status', 'Priority', 'Assigned by'], ...visibleMembers.value.flatMap(member => member.tasks.map(task => [member.name, member.role, task.title, task.due, label(task.status), label(task.priority), task.assignedBy]))]
    : [['Member', 'Role', 'Department', 'In progress', 'Completed', 'Efficiency'], ...visibleMembers.value.map(member => [member.name, member.role, member.departmentName, string(member.inProgress), string(member.completed), string(member.efficiency)])]
  const csv = rows.map(row => row.map(value => `"${(/^[=+@\-\t\r]/.test(value) ? "'" + value : value).replace(/"/g, '""')}"`).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'department-workload.csv'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
onMounted(load)
</script>

<template>
  <section aria-label="Department workload" class="space-y-5 border-t border-task-line py-5" :aria-busy="loading">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-lg font-bold text-task-ink">Department Workload</h2>
      <div class="flex items-center gap-2">
        <button type="button" class="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-task-line text-task-muted transition hover:border-task-blue hover:text-task-blue disabled:opacity-50" title="Refresh workload" aria-label="Refresh workload" :disabled="loading" @click="load"><svg viewBox="0 0 24 24" :class="['h-5 w-5', loading ? 'animate-spin' : '']" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.36-6.36L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.36 6.36L3 16M8 16H3v5" /></svg></button>
        <button type="button" class="inline-flex h-10 items-center gap-2 rounded-lg border border-task-blue px-3 text-xs font-bold text-task-blue disabled:opacity-50" :disabled="loading || !!error || !visibleMembers.length" @click="download"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v12m-4-4 4 4 4-4M5 16v5h14v-5" /></svg>Download CSV</button>
      </div>
    </header>
    <div class="flex flex-wrap items-end gap-4">
      <div class="w-full min-w-0 text-xs font-semibold text-task-muted sm:w-72"><span>Department</span><AppSelect v-model="department" class="mt-2" :options="departmentOptions" :disabled="loading" aria-label="Department" menu-class="max-h-64 overflow-y-auto" /></div>
      <div v-if="hasTaskDetails" class="w-full min-w-0 text-xs font-semibold text-task-muted sm:w-48"><span>Due date</span><AppSelect v-model="period" class="mt-2" :options="periodOptions" aria-label="Due date" /></div>
      <dl class="flex flex-wrap gap-5 py-1"><div v-for="stat in stats" :key="stat.label"><dd :class="['text-lg font-bold', stat.color]">{{ loading || error ? '-' : stat.count }}</dd><dt class="text-xs text-task-muted">{{ stat.label }}</dt></div></dl>
    </div>
    <p v-if="loading" role="status" class="py-12 text-center text-sm text-task-muted">Loading team workload...</p>
    <div v-else-if="error" role="alert" class="py-10 text-center"><p class="text-sm text-task-danger">{{ error }}</p><button type="button" class="mt-3 text-sm font-bold text-task-blue" @click="load">Try again</button></div>
    <p v-else-if="!visibleMembers.length" class="py-12 text-center text-sm text-task-muted">No active tasks in this period.</p>
    <div v-else class="grid items-start gap-4 xl:grid-cols-2">
      <article v-for="member in visibleMembers" :key="member.id" class="tf-workload-card flex h-[320px] min-w-0 flex-col rounded-lg border border-task-line bg-white p-4">
        <header class="mb-3 flex h-12 shrink-0 items-center gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-task-blueSoft text-xs font-bold text-task-blue"><img v-if="member.avatar" :src="member.avatar" alt="" class="h-full w-full object-cover" /><span v-else>{{ initials(member.name) }}</span></span>
          <div class="min-w-0 flex-1"><h3 class="break-words text-sm font-bold text-task-ink">{{ member.name }}</h3><p class="mt-0.5 break-words text-xs capitalize text-task-muted">{{ label(member.role) }}</p></div>
          <span class="shrink-0 rounded-md bg-task-blueSoft px-2 py-1 text-[10px] font-bold text-task-blue">{{ member.hasTaskDetails ? `${member.tasks.length} active tasks` : `${member.inProgress ?? '-'} in progress` }}</span>
        </header>
        <div v-if="member.tasks.length" :id="`workload-tasks-${member.id}`" class="tf-workload-tasks min-h-0 flex-1 overflow-auto" tabindex="0" :aria-label="`${member.name} tasks`">
          <table class="w-full min-w-[540px] text-left text-xs">
            <thead class="text-[9px] uppercase text-task-muted"><tr><th class="pb-2 pr-3 font-semibold">Task</th><th class="pb-2 pr-3 font-semibold">Due date</th><th class="pb-2 pr-3 font-semibold">Deadline</th><th class="pb-2 pr-3 font-semibold">Priority</th><th class="pb-2 font-semibold">Assigned by</th></tr></thead>
            <tbody class="divide-y divide-task-line"><tr v-for="task in shownTasks(member)" :key="task.id" class="h-[52px]"><td class="max-w-48 py-2 pr-3 text-task-ink"><span class="block truncate" :title="task.title">{{ task.title }}</span><span class="mt-1 block text-[10px] text-task-muted">{{ label(task.status) }}</span></td><td class="whitespace-nowrap py-2 pr-3 text-task-muted">{{ dueDate(task.due)?.toLocaleDateString('en-GB') || '-' }}</td><td class="py-2 pr-3"><span :class="['inline-block whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-semibold', deadlineClass(task)]">{{ deadline(task) }}</span></td><td class="py-2 pr-3"><span :class="['rounded-full px-2 py-1 text-[10px] font-semibold', priorityClass(task.priority)]">{{ label(task.priority) || '-' }}</span></td><td class="max-w-32 truncate py-2 text-task-muted" :title="task.assignedBy">{{ task.assignedBy }}</td></tr></tbody>
          </table>
        </div>
        <dl v-else-if="!member.hasTaskDetails" class="grid grid-cols-3 gap-3 border-t border-task-line pt-4"><div><dt class="text-xs text-task-muted">In Progress</dt><dd class="mt-1 font-bold text-task-blue">{{ member.inProgress ?? '-' }}</dd></div><div><dt class="text-xs text-task-muted">Completed</dt><dd class="mt-1 font-bold text-task-success">{{ member.completed ?? '-' }}</dd></div><div><dt class="text-xs text-task-muted">Efficiency</dt><dd class="mt-1 font-bold text-task-ink">{{ member.efficiency ?? '-' }}</dd></div></dl>
        <p v-else class="py-5 text-center text-xs text-task-muted">No active tasks in this period.</p>
        <footer class="mt-auto flex h-10 shrink-0 items-end justify-end pt-2"><button v-if="member.tasks.length > 3" type="button" class="inline-flex items-center gap-1.5 text-xs font-bold text-task-blue hover:underline" :aria-expanded="expandedMembers.includes(member.id)" :aria-controls="`workload-tasks-${member.id}`" @click="toggleMember(member.id)">{{ expandedMembers.includes(member.id) ? 'Show less' : `View all (${member.tasks.length})` }}<svg viewBox="0 0 24 24" :class="['h-4 w-4 transition-transform', expandedMembers.includes(member.id) ? 'rotate-180' : '']" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></button></footer>
      </article>
    </div>
  </section>
</template>
