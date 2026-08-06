<script setup lang="ts">
import type { Ref } from 'vue'

type PageKey = 'dashboard' | 'tasks' | 'projects' | 'analytics' | 'calendar' | 'team' | 'reports' | 'messages' | 'notifications' | 'settings' | 'help'
type ModalKey = 'task' | 'project' | 'event' | 'event-detail' | 'report' | 'member' | 'team-filter' | null
type ProjectCardMember = {
  id?: string | number
  email?: string
  full_name?: string
  first_name?: string
  last_name?: string
  avatar?: string
  phone?: string
  job_title?: string
}

const pageStorageKey = 'taskflow-active-page'
const validPageKeys: PageKey[] = ['dashboard', 'tasks', 'projects', 'analytics', 'calendar', 'team', 'reports', 'messages', 'notifications', 'settings', 'help']
const pageCookie = useCookie<PageKey | null>('taskflow-active-page', { sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 })
const cookiePage = validPageKeys.includes(pageCookie.value as PageKey) ? pageCookie.value as PageKey : 'dashboard'
const activePage = ref<PageKey>(cookiePage)

if (import.meta.client) {
  const hashPage = window.location.hash.replace(/^#/, '').split('?')[0]
  const storedPage = localStorage.getItem(pageStorageKey) || ''
  const initialPage = validPageKeys.includes(hashPage as PageKey)
    ? hashPage as PageKey
    : validPageKeys.includes(storedPage as PageKey)
      ? storedPage as PageKey
      : cookiePage
  activePage.value = initialPage
}
const settingsTab = ref<'profile' | 'security'>('profile')
const modal = ref<ModalKey>(null)
const openDropdown = ref<string | null>(null)
const dropdownValues = reactive<Record<string, string>>({
  priority: 'All Priorities',
  department: 'All',
  experience: 'Mid-Level',
  skills: 'All Skills',
  status: 'All Statuses',
  role: 'All Roles',
  theme: 'Light',
  language: 'English (US)',
  timezone: 'Pacific Time (PT) - UTC - 8',
  currency: 'USD - US Dollar ($)',
  dateFormat: 'DD.MM.YYYY'
})
const dropdownOptions: Record<string, string[]> = {
  priority: ['All Priorities', 'Medium', 'High', 'Low'],
  department: ['All', 'Design', 'Development', 'Product', 'QA'],
  experience: ['Junior', 'Mid-Level', 'Senior', 'Lead'],
  skills: ['All Skills', 'UI/UX', 'Frontend', 'Backend', 'Testing'],
  status: ['All Statuses', 'Active', 'Inactive'],
  role: ['All Roles', 'owner', 'admin', 'manager', 'member'],
  theme: ['Light', 'Dark', 'System'],
  language: ['English (US)', 'Uzbek (UZ)', 'Russian (RU)'],
  timezone: ['Pacific Time (PT) - UTC - 8', 'Tashkent (UZT) - UTC + 5', 'Eastern Time (ET) - UTC - 5'],
  currency: ['USD - US Dollar ($)', 'UZS - Uzbek Som', 'EUR - Euro (€)'],
  dateFormat: ['DD.MM.YYYY']
}
const taskFlowStore = useTaskFlowStore()
const taskFlowApi = useTaskFlowApi()
const runtimeConfig = useRuntimeConfig()

await taskFlowStore.loadBackendData()

const { state, pages, stats, projectStats, analyticsStats, monthlyProgress, tasksByCategory, tasks, projects, team, workload, reports, events, messages, heatmap, currentDepartmentId, currentRole, currentUserActive, apiError, dashboardTodayEvents, dashboardUpcomingEvents, dashboardDeadlines, dashboardDepartments, dashboardRecentTasks, dashboardGeneratedAt } = taskFlowStore
const normalizedRole = computed(() => currentRole.value.trim().toLowerCase())
const canManageDepartment = computed(() => ['owner', 'admin', 'manager'].includes(normalizedRole.value))
const canAddTask = computed(() => currentUserActive.value && ['owner', 'admin', 'manager'].includes(normalizedRole.value))
const canCreateEvent = computed(() => canAddTask.value)
const effectiveDepartmentId = computed(() => {
  if (currentDepartmentId.value) return currentDepartmentId.value
  const ownMembership = team.value.find((member) => String(member[2] || '').trim().toLowerCase() === savedProfile.email.trim().toLowerCase())
  return String(ownMembership?.[11] || '')
})
const departmentTeam = computed(() => team.value.filter((member) => !effectiveDepartmentId.value || String(member[11] || '') === effectiveDepartmentId.value))
const taskSearchInput = ref('')
const taskSearch = ref('')
const taskScope = ref<'all' | 'mine' | 'archived'>(currentRole.value.toLowerCase() === 'member' ? 'mine' : 'all')
const taskScopeLoading = ref(false)
const projectSearchInput = ref('')
const projectSearch = ref('')
const teamSearchInput = ref('')
const teamSearch = ref('')
const reportSearchInput = ref('')
const reportSearch = ref('')
const messageSearchInput = ref('')
const messageSearch = ref('')
const helpSearchInput = ref('')
const helpSearch = ref('')
const feedbackDraft = ref('')
const feedbackScreenshotInput = ref<HTMLInputElement | null>(null)
const feedbackScreenshotName = ref('')
const feedbackScreenshotPreview = ref('')
const profileAvatarInput = ref<HTMLInputElement | null>(null)
const profileAvatarPreview = ref('')
const profileAvatarFile = ref<File | null>(null)
const supportWidgetOpen = ref(false)
const membersRawResponse = ref<unknown>(null)
const memberSummary = ref<{ total_members?: number; average_efficiency?: number; active_tasks?: number } | null>(null)
const activeMessage = ref('')
const chatDraft = ref('')
const toast = ref('')
const toastType = ref<'info' | 'success' | 'error'>('info')
const actionMenu = ref<string | null>(null)
const hoveredMonthlyMonth = ref<string | null>(null)
const hoveredEfficiencyMonth = ref<string | null>(null)
const mobileSidebarOpen = ref(false)
const sidebarCollapsed = ref(false)
const taskPage = ref(1)
const taskViewMode = ref<'list' | 'kanban'>('kanban')
const taskBoardSection = ref<'board' | 'backlog'>('board')
const draggedTaskId = ref('')
const updatingTaskId = ref('')
const editingTaskId = ref('')
const taskModalMode = ref<'create' | 'edit' | 'view'>('create')
const taskSaving = ref(false)
const projectPage = ref(1)
const reportPage = ref(1)
const teamPage = ref(1)
const pageSize = 10
const projectPriorityFilter = ref('All Priorities')
const workloadFilter = ref(70)
const today = new Date()
const calendarYear = ref(today.getFullYear())
const currentMonthIndex = today.getMonth()
const currentYear = today.getFullYear()
const currentDay = today.getDate()
const calendarMonthIndex = ref(currentMonthIndex)
const selectedCalendarDay = ref<number | null>(null)
const supportRequests = ref<string[]>([])
const searchLoading = reactive<Record<string, boolean>>({
  task: false,
  project: false,
  team: false,
  report: false,
  message: false,
  help: false
})
const notificationToggles = reactive<Record<string, boolean>>({
  'Email Notifications': true,
  'Task Updates': true,
  'Team Messages': true,
  'Weekly Reports': false,
  'Task Assigned to You': true,
  'Task Deadline Reminder': false,
  'Task Overdue Alert': true
})
const unreadNotificationCount = ref(0)
const security2fa = ref(true)
const savedProfile = reactive({
  firstName: '',
  lastName: '',
  avatar: '',
  email: '',
  phone: '',
  role: ''
})
const profileForm = reactive({
  firstName: '',
  lastName: '',
  avatar: '',
  email: '',
  phone: '',
  role: ''
})
const passwordForm = reactive({
  current: '',
  next: '',
  confirm: ''
})
const passwordVisible = reactive<Record<'current' | 'next' | 'confirm', boolean>>({
  current: false,
  next: false,
  confirm: false
})
const passwordFields: Array<{ key: 'current' | 'next' | 'confirm'; placeholder: string }> = [
  { key: 'current', placeholder: 'Enter Current password' },
  { key: 'next', placeholder: 'Enter new password' },
  { key: 'confirm', placeholder: 'Confirm new password' }
]
const appliedAppearance = reactive<Record<string, string>>({
  theme: 'Light',
  language: 'English (US)',
  timezone: 'Pacific Time (PT) - UTC - 8',
  currency: 'USD - US Dollar ($)',
  dateFormat: 'DD.MM.YYYY'
})
const systemPrefersDark = ref(false)
let themeMediaQuery: MediaQueryList | null = null
let previousBodyOverflow = ''
const themeStorageKey = 'taskflow-theme'

const updateSystemTheme = (event: MediaQueryListEvent) => {
  systemPrefersDark.value = event.matches
}

const isThemeOption = (value: string | null): value is 'Light' | 'Dark' | 'System' => value === 'Light' || value === 'Dark' || value === 'System'

const persistTheme = (theme: string) => {
  if (!import.meta.client || !isThemeOption(theme)) return
  localStorage.setItem(themeStorageKey, theme)
}
type CalendarEvent = {
  id: string
  backendId: string
  year: number
  month: number
  day: number
  meridiem: string
  title: string
  time: string
  color: string
  eventType: string
  meetingUrl: string
  description: string
  attendees: number
  attendeeNames: string[]
}

const form = reactive({
  title: '',
  assignee: '',
  priority: 'Low',
  startDate: '',
  dueDate: '',
  projectManager: '',
  category: '',
  eventType: '',
  eventTime: '',
  eventEndTime: '',
  eventColor: 'bg-task-blue',
  meetingLink: '',
  description: ''
})
const eventTypeOptions = ['Meeting', 'Review', 'Workshop']
const taskStatusOptions = ['Backlog', 'Not Started', 'In Progress', 'On Hold', 'Completed']
const taskFormStatus = ref('Not Started')
const taskAssigneeIds = ref<string[]>([])
const taskAssigneeLabels = ref<string[]>([])
const taskAssigneeSearch = ref('')
const taskAssigneeOptions = ref<Array<Array<string | number>>>([])
const taskAssigneesLoading = ref(false)
const filteredTaskAssignees = computed(() => {
  const query = taskAssigneeSearch.value.trim().toLowerCase()
  return taskAssigneeOptions.value.filter((member) => {
    if (!teamMemberId(member)) return false
    return !query || `${teamMemberName(member)} ${teamMemberEmail(member)}`.toLowerCase().includes(query)
  })
})
const highlightedMemberName = (name: string) => {
  const query = taskAssigneeSearch.value.trim()
  const index = name.toLowerCase().indexOf(query.toLowerCase())
  if (!query || index < 0) return { before: name, match: '', after: '' }
  return {
    before: name.slice(0, index),
    match: name.slice(index, index + query.length),
    after: name.slice(index + query.length)
  }
}
const highlightedSearchText = (name: string, search: string) => {
  const query = search.trim()
  const index = name.toLowerCase().indexOf(query.toLowerCase())
  if (!query || index < 0) return { before: name, match: '', after: '' }
  return { before: name.slice(0, index), match: name.slice(index, index + query.length), after: name.slice(index + query.length) }
}
const memberFirstName = ref('')
const memberLastName = ref('')
const memberEmail = ref('')
const memberRole = ref('member')
const memberRoleOptions = ['member', 'manager', 'admin']
const editingProjectId = ref('')
const editingProjectDepartment = ref('')
const editingProjectMembers = ref<string[]>([])
const editingProjectStartDate = ref<string | null>(null)
const projectMemberLabels = ref<string[]>([])
const projectMemberOptions = ref<Array<Array<string | number>>>([])
const projectMemberPickerOpen = ref(false)
const projectMemberSearch = ref('')
const projectMembersLoading = ref(false)
const projectManagerSearch = ref('')
const filteredProjectManagers = computed(() => {
  const query = projectManagerSearch.value.trim().toLowerCase()
  return departmentTeam.value.filter((member) => !query || `${teamMemberName(member)} ${teamMemberEmail(member)}`.toLowerCase().includes(query))
})
const eventAttendeeIds = ref<string[]>([])
const eventAttendeeLabels = ref<string[]>([])
const eventAttendeePickerOpen = ref(false)
const eventAttendeeSearch = ref('')
const eventAttendeeOptions = ref<Array<Array<string | number>>>([])
const eventAttendeesLoading = ref(false)
const eventColorById = reactive<Record<string, string>>({})
const selectedCalendarEvent = ref<CalendarEvent | null>(null)
const reportType = ref('Productivity')
const reportStatus = ref('All Statuses')
const reportTypeOptions = ['Productivity', 'Team Performance', 'Project Status', 'Time Tracking']
const openProjectDatePicker = ref<'startDate' | 'dueDate' | null>(null)
const datePickerView = reactive({
  year: currentYear,
  month: currentMonthIndex
})

const bindSearch = (key: keyof typeof searchLoading, input: Ref<string>, query: Ref<string>) => {
  let timer: ReturnType<typeof setTimeout> | null = null

  watch(input, (value) => {
    searchLoading[key] = true
    if (timer) clearTimeout(timer)

    timer = setTimeout(() => {
      query.value = value
      searchLoading[key] = false
    }, 300)
  })
}

bindSearch('task', taskSearchInput, taskSearch)
bindSearch('project', projectSearchInput, projectSearch)
bindSearch('team', teamSearchInput, teamSearch)
bindSearch('report', reportSearchInput, reportSearch)
bindSearch('message', messageSearchInput, messageSearch)
bindSearch('help', helpSearchInput, helpSearch)

const clearSearch = (key: keyof typeof searchLoading) => {
  if (key === 'task') {
    taskSearchInput.value = ''
    taskSearch.value = ''
  }
  if (key === 'project') {
    projectSearchInput.value = ''
    projectSearch.value = ''
  }
  if (key === 'team') {
    teamSearchInput.value = ''
    teamSearch.value = ''
  }
  if (key === 'report') {
    reportSearchInput.value = ''
    reportSearch.value = ''
  }
  if (key === 'message') {
    messageSearchInput.value = ''
    messageSearch.value = ''
  }
  if (key === 'help') {
    helpSearchInput.value = ''
    helpSearch.value = ''
  }
  searchLoading[key] = false
}

const includesQuery = (row: Array<string | number> | string, query: string) => {
  if (!query.trim()) return true
  return String(Array.isArray(row) ? row.join(' ') : row).toLowerCase().includes(query.toLowerCase())
}

const filteredTasks = computed(() =>
  tasks.value.filter((task) => includesQuery(task, taskSearch.value) && (dropdownValues.priority === 'All Priorities' || String(task[2]) === dropdownValues.priority))
)
const kanbanColumns = computed(() => [
  { key: 'not_started', label: 'To Do', description: 'Ready to start', color: '#8B96A7', softColor: '#F3F5F7', tasks: filteredTasks.value.filter((task) => String(task[3]).toLowerCase() === 'not started') },
  { key: 'in_progress', label: 'In Progress', description: 'Being worked on', color: '#3B82F6', softColor: '#EEF5FF', tasks: filteredTasks.value.filter((task) => String(task[3]).toLowerCase() === 'in progress') },
  { key: 'on_hold', label: 'On Hold', description: 'Temporarily paused', color: '#F59E0B', softColor: '#FFFBEB', tasks: filteredTasks.value.filter((task) => String(task[3]).toLowerCase() === 'on hold') },
  { key: 'completed', label: 'Completed', description: 'Finished', color: '#18A875', softColor: '#ECF9F4', tasks: filteredTasks.value.filter((task) => String(task[3]).toLowerCase() === 'completed') }
])
const backlogTasks = computed(() => filteredTasks.value.filter((task) => String(task[3]).toLowerCase() === 'backlog'))
const filteredProjects = computed(() => projects.value.filter((project) => includesQuery(project, projectSearch.value) && (projectPriorityFilter.value === 'All Priorities' || String(project[2]) === projectPriorityFilter.value)))
const filteredTeam = computed(() => team.value.filter((member) => Number(member[4] || 0) <= workloadFilter.value))
const filteredReports = computed(() => reports.value.filter((report) => includesQuery(report, reportSearch.value)))
const reportStats = computed(() => [
  { value: reports.value.length, label: 'Total Reports', icon: 'file' },
  { value: reports.value.filter((report) => String(report[4]).toLowerCase() === 'ready').length, label: 'Ready Reports', icon: 'check' },
  { value: new Set(reports.value.map((report) => String(report[1])).filter(Boolean)).size, label: 'Report Types', icon: 'analytics' }
])
const filteredMessages = computed(() => messages.value.filter((name) => includesQuery(name, messageSearch.value)))
const filteredFaqs = computed<string[]>(() => [])
const pageCount = (length: number) => Math.max(1, Math.ceil(length / pageSize))
const paginate = <T>(items: T[], page: number) => items.slice((page - 1) * pageSize, page * pageSize)
const paginatedTasks = computed(() => paginate(filteredTasks.value, taskPage.value))
const paginatedProjects = computed(() => paginate(filteredProjects.value, projectPage.value))
const paginatedTeam = computed(() => paginate(filteredTeam.value, teamPage.value))
const paginatedReports = computed(() => paginate(filteredReports.value, reportPage.value))
const taskPageCount = computed(() => pageCount(filteredTasks.value.length))
const projectPageCount = computed(() => pageCount(filteredProjects.value.length))
const teamPageCount = computed(() => pageCount(filteredTeam.value.length))
const reportPageCount = computed(() => pageCount(filteredReports.value.length))
watch([taskSearch, () => dropdownValues.priority], () => { taskPage.value = 1 })
watch([projectSearch, projectPriorityFilter], () => { projectPage.value = 1 })
watch([teamSearch, workloadFilter], () => { teamPage.value = 1 })
watch(reportSearch, () => { reportPage.value = 1 })
const taskStatusCounts = computed(() => {
  const total = tasks.value.length
  const countByStatus = (status: string) => tasks.value.filter((task) => String(task[3]).toLowerCase() === status).length
  const percent = (count: number) => total ? `${Math.round((count / total) * 100)}%` : '0%'
  const inProgress = countByStatus('in progress')
  const completed = countByStatus('completed')
  const overdue = tasks.value.filter((task) => String(task[3]).toLowerCase() === 'overdue').length

  return [
    ['In Progress', percent(inProgress), 'bg-task-blue', 'bg-task-blueSoft'],
    ['Completed', percent(completed), 'bg-task-success', 'bg-task-successSoft'],
    ['Overdue', percent(overdue), 'bg-task-warning', 'bg-task-warningSoft']
  ]
})
const priorityCounts = computed(() => {
  const high = tasks.value.filter((task) => String(task[2]).toLowerCase() === 'high').length
  const medium = tasks.value.filter((task) => String(task[2]).toLowerCase() === 'medium').length
  const low = tasks.value.filter((task) => String(task[2]).toLowerCase() === 'low').length
  const total = high + medium + low
  const highEnd = total ? (high / total) * 100 : 0
  const mediumEnd = total ? highEnd + (medium / total) * 100 : 0

  return { high, medium, low, total, highEnd, mediumEnd }
})
const priorityChartStyle = computed(() => {
  if (!priorityCounts.value.total) return { background: '#EEF3F8' }
  return {
    background: `conic-gradient(#2567AD 0 ${priorityCounts.value.highEnd}%, #8DB1D7 ${priorityCounts.value.highEnd}% ${priorityCounts.value.mediumEnd}%, #DCE8F4 ${priorityCounts.value.mediumEnd}% 100%)`
  }
})
const activePrioritySegment = ref<string | null>(null)
const priorityCircleLength = 439.82
const prioritySegments = computed(() => {
  const total = priorityCounts.value.total
  let offset = 0
  return [
    { key: 'high', label: 'High', count: priorityCounts.value.high, color: '#2567AD' },
    { key: 'medium', label: 'Medium', count: priorityCounts.value.medium, color: '#4B96C1' },
    { key: 'low', label: 'Low', count: priorityCounts.value.low, color: '#DCE8F4' }
  ].map((segment) => {
    const percent = total ? (segment.count / total) * 100 : 0
    const result = { ...segment, percent, offset }
    offset += percent
    return result
  })
})
const activePriorityData = computed(() => prioritySegments.value.find((segment) => segment.key === activePrioritySegment.value) ?? null)
const teamStats = computed(() => {
  if (memberSummary.value) {
    return [
      [String(memberSummary.value.total_members ?? 0), 'Total Members', 'bg-[#EAF2FC]'],
      [`${memberSummary.value.average_efficiency ?? 0}%`, 'Avg Efficiency', 'bg-task-lavender'],
      [String(memberSummary.value.active_tasks ?? 0), 'Active Tasks', 'bg-task-mint']
    ]
  }

  const total = team.value.length
  const avgEfficiency = total ? Math.round(team.value.reduce((sum, member) => sum + Number(member[4] || 0), 0) / total) : 0
  const activeTasks = team.value.reduce((sum, member) => sum + Number(member[6] || 0), 0)

  return [
    [String(total), 'Total Members', 'bg-[#EAF2FC]'],
    [`${avgEfficiency}%`, 'Avg Efficiency', 'bg-task-lavender'],
    [String(activeTasks), 'Active Tasks', 'bg-task-mint']
  ]
})
const quickInsights = computed(() => {
  if (!tasks.value.length && !projects.value.length && !team.value.length) return []

  return [
    `Completed tasks: ${tasks.value.filter((task) => String(task[3]).toLowerCase() === 'completed').length}`,
    `Overdue tasks: ${tasks.value.filter((task) => String(task[3]).toLowerCase() === 'overdue').length}`,
    `Active projects: ${projects.value.length}`,
    `Team members: ${team.value.length}`
  ]
})
const menuPages = computed(() => pages.value.filter((page) => page.group === 'menu'))
const generalPages = computed(() => pages.value.filter((page) => page.group === 'general'))
const comingSoonPages = new Set<PageKey>(['projects', 'analytics', 'reports'])
const isComingSoonPage = (key: PageKey) => comingSoonPages.has(key)
const profileName = computed(() => `${savedProfile.firstName} ${savedProfile.lastName}`.trim())
const profileInitials = computed(() => profileName.value ? initials(profileName.value) : '')
const dashboardTitle = computed(() => profileName.value ? `Welcome back, ${savedProfile.firstName || profileName.value}!` : 'Dashboard')
const dashboardGreeting = computed(() => {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  return `${greeting}, ${savedProfile.firstName || profileName.value || 'there'}! 👋`
})
const dashboardDepartmentTotal = computed(() => dashboardDepartments.value.reduce((total, department) => total + Number(department.task_count || 0), 0))
const hasSavedProfileInfo = computed(() => Boolean(profileName.value || savedProfile.role || savedProfile.email))
const profileFormInitials = computed(() => {
  const name = `${profileForm.firstName} ${profileForm.lastName}`.trim()
  return name ? initials(name) : ''
})
const accountJoinedDate = computed(() => {
  const membership = team.value.find((member) => String(member[2] || '').trim().toLowerCase() === savedProfile.email.trim().toLowerCase())
  const rawDate = String(membership?.[13] || '')
  if (!rawDate) return 'Not available'
  const date = new Date(rawDate)
  return Number.isNaN(date.getTime()) ? rawDate : formatProjectDateInput(date)
})
const accountLastLogin = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`
const accountLastLoginTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(today)
const isDarkTheme = computed(() => dropdownValues.theme === 'Dark' || (dropdownValues.theme === 'System' && systemPrefersDark.value))
const syncRootThemeClass = () => {
  if (!import.meta.client) return
  document.documentElement.classList.toggle('tf-dark', isDarkTheme.value)
  document.documentElement.style.colorScheme = isDarkTheme.value ? 'dark' : 'light'
}
const activeThemeLabel = computed(() => (dropdownValues.theme === 'System' ? `System (${systemPrefersDark.value ? 'Dark' : 'Light'})` : dropdownValues.theme))
const appearanceSummary = computed(() =>
  `${appliedAppearance.language} · ${appliedAppearance.timezone} · ${appliedAppearance.currency} · ${appliedAppearance.dateFormat}`
)
const appearancePreview = computed(() =>
  `${activeThemeLabel.value} · ${dropdownValues.language} · ${dropdownValues.timezone} · ${dropdownValues.currency} · ${dropdownValues.dateFormat}`
)
const notificationsEnabled = computed(() => (
  notificationToggles['Email Notifications'] ||
  notificationToggles['Task Updates'] ||
  notificationToggles['Team Messages'] ||
  notificationToggles['Task Assigned to You'] ||
  notificationToggles['Task Deadline Reminder'] ||
  notificationToggles['Task Overdue Alert']
))
const showNotificationBadge = computed(() => notificationsEnabled.value && unreadNotificationCount.value > 0)
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const calendarMonth = computed(() => `${monthNames[calendarMonthIndex.value]} ${calendarYear.value}`)
const daysInCalendarMonth = computed(() => new Date(calendarYear.value, calendarMonthIndex.value + 1, 0).getDate())
const calendarLeadingBlanks = computed(() => (new Date(calendarYear.value, calendarMonthIndex.value, 1).getDay() + 6) % 7)
const calendarCells = computed(() => [
  ...Array.from({ length: calendarLeadingBlanks.value }, (_, index) => ({ key: `blank-${calendarMonthIndex.value}-${index}`, day: null as number | null })),
  ...Array.from({ length: daysInCalendarMonth.value }, (_, index) => ({ key: `day-${calendarMonthIndex.value}-${index + 1}`, day: index + 1 }))
])
const eventColorClass = (eventType: string) => {
  const normalized = eventType.toLowerCase()
  if (normalized.includes('review')) return 'bg-[#4B32B8]'
  if (normalized.includes('demo')) return 'bg-[#45A832]'
  if (normalized.includes('deadline')) return 'bg-task-danger'
  return 'bg-task-blue'
}
const eventTimeText = (startsAt: Date, endsAt: Date | null) => {
  const formatter = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  return endsAt ? `${formatter.format(startsAt)} - ${formatter.format(endsAt)}` : formatter.format(startsAt)
}
const calendarEvents = computed<CalendarEvent[]>(() =>
  events.value
    .map((event, index) => {
      const startsAt = new Date(String(event[3] || ''))
      if (Number.isNaN(startsAt.getTime())) return null
      const endsAt = event[4] ? new Date(String(event[4])) : null
      const eventType = String(event[2] || 'Meeting')
      let attendeeDetails: ProjectCardMember[] = []
      try {
        const parsed = JSON.parse(String(event[8] || '[]'))
        if (Array.isArray(parsed)) attendeeDetails = parsed
      } catch {
        attendeeDetails = []
      }

      return {
        id: String(event[0] || `event-${index}`),
        backendId: String(event[0] || ''),
        year: startsAt.getFullYear(),
        month: startsAt.getMonth(),
        day: startsAt.getDate(),
        meridiem: startsAt.getHours() >= 12 ? 'PM' : 'AM',
        title: String(event[1] || 'Untitled Event'),
        time: eventTimeText(startsAt, endsAt && !Number.isNaN(endsAt.getTime()) ? endsAt : null),
        color: eventColorById[String(event[0] || '')] || eventColorClass(eventType),
        eventType,
        meetingUrl: String(event[6] || ''),
        description: String(event[7] || ''),
        attendees: attendeeDetails.length || event.slice(9).filter(Boolean).length,
        attendeeNames: attendeeDetails.map((member) => member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email || 'Member')
      }
    })
    .filter((event): event is CalendarEvent => Boolean(event))
)
const currentMonthEvents = computed(() => calendarEvents.value.filter((event) => event.year === calendarYear.value && event.month === calendarMonthIndex.value))
const selectedDayEvents = computed(() => {
  if (!selectedCalendarDay.value) return currentMonthEvents.value
  return currentMonthEvents.value.filter((event) => event.day === selectedCalendarDay.value)
})
const eventDays = computed(() => new Set(currentMonthEvents.value.map((event) => event.day)))
const isTodayCell = (day: number | null) => day === currentDay && calendarMonthIndex.value === currentMonthIndex && calendarYear.value === currentYear
const fallbackTrendMonths = Array.from({ length: 6 }, (_, index) => {
  const date = new Date(currentYear, currentMonthIndex - 5 + index, 1)
  return [date.toLocaleDateString('en-US', { month: 'short' }), 0, 0] as Array<string | number>
})
const monthlyTrendSource = computed(() => monthlyProgress.value.length ? monthlyProgress.value.slice(-6) : fallbackTrendMonths)
const monthlyProgressData = computed(() => {
  return monthlyTrendSource.value.map((item, index, items) => {
    const completed = Number(item[1] || 0)
    const previous = Number(items[index - 1]?.[1] || 0)
    const diff = completed - previous
    const growth = index === 0 || previous === 0 ? '0%' : `${diff >= 0 ? '+' : ''}${Math.round((diff / previous) * 100)}%`

    return {
      month: String(item[0] || `Month ${index + 1}`),
      completed,
      created: Number(item[2] || 0),
      from: 'analytics endpoint',
      growth
    }
  })
})
const efficiencyTrendData = computed(() =>
  monthlyTrendSource.value
    .map((item, index, items) => {
      const completed = Number(item[1] || 0)
      const created = Number(item[2] || 0)
      const value = created > 0 ? Math.min(Math.round((completed / created) * 100), 100) : 0
      const previousCompleted = Number(items[index - 1]?.[1] || 0)
      const previousCreated = Number(items[index - 1]?.[2] || 0)
      const previous = previousCreated > 0 ? Math.min(Math.round((previousCompleted / previousCreated) * 100), 100) : 0
      const diff = value - previous
      return {
        month: String(item[0] || `Month ${index + 1}`),
        value,
        from: 'monthly analytics',
        growth: index === 0 || previous === 0 ? '0%' : `${diff >= 0 ? '+' : ''}${Math.round((diff / previous) * 100)}%`
      }
    })
)
const chartWidth = 560
const chartTop = 42
const chartBottom = 214
const chartInnerHeight = chartBottom - chartTop
const chartMaxValue = 120
const yAxisTicks = [120, 90, 60, 30, 0]

type ChartPoint = {
  x: number
  y: number
  item: Record<string, string | number>
}

const chartY = (value: number) => chartBottom - (Math.min(Math.max(value, 0), chartMaxValue) / chartMaxValue) * chartInnerHeight
const chartX = (index: number, length: number) => (length <= 1 ? chartWidth / 2 : (index / (length - 1)) * chartWidth)
const buildLinePoints = (items: Array<Record<string, string | number>>, key: string) =>
  items.map((item, index) => ({
    x: chartX(index, items.length),
    y: chartY(Number(item[key] ?? 0)),
    item
  }))
const buildSmoothPath = (points: ChartPoint[]) => {
  if (!points.length) return ''
  if (points.length === 1) return `M${points[0].x} ${points[0].y}`

  return points.reduce((path, point, index) => {
    if (index === 0) return `M${point.x} ${point.y}`

    const previous = points[index - 1]
    const controlOffset = (point.x - previous.x) / 2
    return `${path} C${previous.x + controlOffset} ${previous.y} ${point.x - controlOffset} ${point.y} ${point.x} ${point.y}`
  }, '')
}
const monthlyCompletedPoints = computed(() => buildLinePoints(monthlyProgressData.value, 'completed'))
const monthlyCreatedPoints = computed(() => buildLinePoints(monthlyProgressData.value, 'created'))
const monthlyCompletedPath = computed(() => buildSmoothPath(monthlyCompletedPoints.value))
const monthlyCreatedPath = computed(() => buildSmoothPath(monthlyCreatedPoints.value))
const efficiencyPoints = computed(() => buildLinePoints(efficiencyTrendData.value, 'value'))
const efficiencyPath = computed(() => buildSmoothPath(efficiencyPoints.value))
const efficiencyAreaPath = computed(() => {
  if (!efficiencyPoints.value.length || !efficiencyPath.value) return ''
  const first = efficiencyPoints.value[0]
  const last = efficiencyPoints.value[efficiencyPoints.value.length - 1]
  return `${efficiencyPath.value} L${last.x} ${chartBottom} L${first.x} ${chartBottom} Z`
})
const monthlyAreaPath = computed(() => {
  if (!monthlyCompletedPoints.value.length || !monthlyCompletedPath.value) return ''
  const first = monthlyCompletedPoints.value[0]
  const last = monthlyCompletedPoints.value[monthlyCompletedPoints.value.length - 1]
  return `${monthlyCompletedPath.value} L${last.x} ${chartBottom} L${first.x} ${chartBottom} Z`
})
const selectedMonthlyPoint = computed(() => {
  if (!hoveredMonthlyMonth.value) return null
  return monthlyCompletedPoints.value.find((point) => point.item.month === hoveredMonthlyMonth.value) ?? null
})
const selectedCreatedPoint = computed(() => monthlyCreatedPoints.value.find((point) => point.item.month === selectedMonthlyPoint.value?.item.month))
const selectedMonthlyTooltipStyle = computed(() => {
  const point = selectedMonthlyPoint.value
  if (!point) return { left: '40%', top: '88px' }

  return {
    left: `${Math.min(Math.max((point.x / chartWidth) * 100 + 3, 8), 72)}%`,
    top: `${Math.min(Math.max(point.y + 28, 56), 138)}px`
  }
})
const highlightedEfficiency = computed(() => {
  if (!hoveredEfficiencyMonth.value) return null
  return efficiencyTrendData.value.find((item) => item.month === hoveredEfficiencyMonth.value) ?? null
})
const efficiencyBarHeight = (value: number) => `${(Math.min(Math.max(value, 0), chartMaxValue) / chartMaxValue) * chartInnerHeight}px`
const chartColumnsStyle = (length: number) => ({ gridTemplateColumns: `repeat(${Math.max(length, 1)}, minmax(0, 1fr))` })
const categoryTrendData = computed(() => {
  const maxValue = Math.max(...tasksByCategory.value.map((item) => Number(item[1] || 0)), 100)

  return tasksByCategory.value.map((item) => ({
    name: String(item[0] || 'Uncategorized'),
    value: Math.round((Number(item[1] || 0) / maxValue) * 100),
    from: 'analytics endpoint',
    growth: `${Number(item[2] || item[1] || 0)} tasks`
  }))
})
const productivityTrendData = computed(() =>
  heatmap.value.map((value, index) => ({
    day: ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'][index % 7],
    value: Math.round((Number(value || 0) / 5) * 100),
    from: 'backend activity',
    growth: `${value} activity`
  }))
)

const eventsForDay = (day: number) => currentMonthEvents.value.filter((event) => event.day === day)

const eventFullDate = (event: CalendarEvent) => `${String(event.day).padStart(2, '0')}.${String(event.month + 1).padStart(2, '0')}.${event.year}`
const openEventDetails = (event: CalendarEvent) => {
  selectedCalendarEvent.value = event
  modal.value = 'event-detail'
}

const pageCopy: Record<PageKey, { title: string; subtitle: string; eyebrow?: string }> = {
  dashboard: { title: 'Dashboard', subtitle: "Here's what's happening with your team today", eyebrow: 'Dashboard' },
  tasks: { title: 'Tasks', subtitle: 'Manage and track all team tasks', eyebrow: 'Tasks' },
  projects: { title: 'Projects', subtitle: 'Manage and monitor all active projects', eyebrow: 'Projects' },
  analytics: { title: 'Analytics & Reports', subtitle: "Detailed insights into your team's performance", eyebrow: 'Analytics' },
  calendar: { title: 'Calendar', subtitle: 'Schedule and manage team events', eyebrow: 'Calendar' },
  team: { title: 'Staff List', subtitle: 'Manage your staff and track their performance', eyebrow: 'Staff List' },
  reports: { title: 'Reports', subtitle: 'Generate and download various team reports', eyebrow: 'Reports' },
  messages: { title: 'Messages', subtitle: 'Communicate with your team members', eyebrow: 'Messages' },
  notifications: { title: 'Notifications', subtitle: 'View all task updates, reminders, and messages', eyebrow: 'Notifications' },
  settings: { title: 'Settings', subtitle: 'Manage your account and application preferences', eyebrow: settingsTab.value === 'profile' ? 'Profile' : 'Settings' },
  help: { title: 'Settings', subtitle: 'Manage your account and application preferences', eyebrow: 'Help & Support' }
}
const pageIconName = computed(() => ({
  dashboard: 'grid',
  tasks: 'check',
  projects: 'folder',
  analytics: 'chart',
  calendar: 'calendar',
  team: 'users',
  reports: 'file',
  messages: 'message',
  notifications: 'bell',
  settings: 'settings',
  help: 'help'
}[activePage.value] || 'grid'))

const pageAccentClass = computed(() => ({
  dashboard: 'from-[#E8F2FF] to-[#D8E9FC] text-[#2567AD]',
  tasks: 'from-[#EAF8F2] to-[#D9F2E7] text-[#169B70]',
  projects: 'from-[#F0EDFF] to-[#E5DFFF] text-[#7659D8]',
  analytics: 'from-[#FFF4E3] to-[#FFEAC8] text-[#DB8A17]',
  calendar: 'from-[#EAF4FF] to-[#D9EAFC] text-[#3B82F6]',
  team: 'from-[#FDECF1] to-[#F9DDE6] text-[#D94F78]',
  reports: 'from-[#EAF7F7] to-[#D7EEEE] text-[#238A8D]',
  messages: 'from-[#EEF0FF] to-[#E0E4FF] text-[#5969D8]',
  notifications: 'from-[#E8F2FF] to-[#D8E9FC] text-[#2567AD]',
  settings: 'from-[#E8F2FF] to-[#D8E9FC] text-[#2567AD]',
  help: 'from-[#FFF2E8] to-[#FFE5D1] text-[#D9772B]'
}[activePage.value] || 'from-[#E8F2FF] to-[#D8E9FC] text-[#2567AD]'))
const dashboardStatStyles = [
  { card: 'from-[#F5F9FF] to-[#EAF2FF] border-[#E2ECFA]', icon: 'text-[#347FE0] ring-[#D8E7FB]', line: 'text-[#5B96EA]' },
  { card: 'from-[#FBF8FF] to-[#F3ECFF] border-[#EEE4FC]', icon: 'text-[#8757DF] ring-[#E9DDFC]', line: 'text-[#9C6AEA]' },
  { card: 'from-[#F5FCFA] to-[#EAF8F3] border-[#DDF2EA]', icon: 'text-[#16A778] ring-[#D2EEE4]', line: 'text-[#48C49D]' },
  { card: 'from-[#FFF8FA] to-[#FDEEF2] border-[#F9E1E8]', icon: 'text-[#F04466] ring-[#F7D8E1]', line: 'text-[#F47C97]' }
]
const dashboardSummaryStyles = [
  'border-blue-100 bg-blue-50 text-blue-600',
  'border-emerald-100 bg-emerald-50 text-emerald-600',
  'border-amber-100 bg-amber-50 text-amber-600',
  'border-violet-100 bg-violet-50 text-violet-600',
  'border-slate-200 bg-slate-100 text-slate-600',
  'border-orange-100 bg-orange-50 text-orange-600',
  'border-rose-100 bg-rose-50 text-rose-600'
]
const dashboardDateTime = (value: unknown, kind: 'date' | 'time' = 'date') => {
  const date = new Date(String(value || ''))
  if (Number.isNaN(date.getTime())) return '—'
  return kind === 'time'
    ? new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(date)
    : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

const loadTaskScope = async (scope: 'all' | 'mine' | 'archived') => {
  if (scope === 'all' && currentRole.value.toLowerCase() === 'member') scope = 'mine'
  if (scope === 'archived' && !canManageDepartment.value) scope = 'mine'
  if (taskScopeLoading.value) return
  taskScope.value = scope
  taskScopeLoading.value = true
  actionMenu.value = null
  try {
    const response = await taskFlowApi.listTasks({
      page_size: 100,
      my_tasks: scope === 'mine' ? 'true' : undefined,
      archived: scope === 'archived' ? 'true' : undefined
    })
    state.value.tasks = taskFlowApi.listItems(response).map(taskFlowApi.mapTask)
    taskPage.value = 1
  } catch (error) {
    notifyError(taskFlowApiErrorMessage(error, 'Could not load tasks'))
  } finally {
    taskScopeLoading.value = false
  }
}

const archiveTask = async (task: Array<string | number>) => {
  if (!canManageDepartment.value || String(task[3]).toLowerCase() !== 'completed') return
  const id = String(task[6] || '')
  if (!id) return notifyError('Task is not synchronized with the backend')
  try {
    await taskFlowApi.archiveTask(id)
    state.value.tasks = state.value.tasks.filter((item) => String(item[6] || '') !== id)
    notify('Task archived successfully', 'success')
  } catch (error) {
    notifyError(taskFlowApiErrorMessage(error, 'Could not archive task'))
  }
}

const unarchiveTask = async (task: Array<string | number>) => {
  if (!canManageDepartment.value) return
  const id = String(task[6] || '')
  if (!id) return notifyError('Task is not synchronized with the backend')
  try {
    await taskFlowApi.unarchiveTask(id)
    state.value.tasks = state.value.tasks.filter((item) => String(item[6] || '') !== id)
    notify('Task restored successfully', 'success')
  } catch (error) {
    notifyError(taskFlowApiErrorMessage(error, 'Could not restore task'))
  }
}

const archiveOpenedTask = async () => {
  const task = state.value.tasks.find((item) => String(item[6] || '') === editingTaskId.value)
  if (!task) return
  await archiveTask(task)
  modal.value = null
}

watch(currentRole, (role) => {
  if (role.toLowerCase() === 'member' && taskScope.value !== 'mine') void loadTaskScope('mine')
}, { immediate: true })
const dashboardStatus = (value: unknown) => String(value || '').split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')

const setPage = (key: PageKey) => {
  if (isComingSoonPage(key)) {
    notify('Coming soon')
    mobileSidebarOpen.value = false
    return
  }
  activePage.value = key
  pageCookie.value = key
  if (import.meta.client) {
    localStorage.setItem(pageStorageKey, key)
    const nextHash = `#${key}`
    if (window.location.hash !== nextHash) {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${nextHash}`)
    }
  }
  if (key === 'settings' && settingsTab.value === 'profile') settingsTab.value = 'profile'
  if (key === 'tasks') void loadTaskScope(taskScope.value)
  if (key === 'team') loadMembersFromBackend()
  actionMenu.value = null
  mobileSidebarOpen.value = false
}

const restoreActivePage = () => {
  if (!import.meta.client) return
  const hashPage = window.location.hash.replace(/^#/, '').split('?')[0]
  const storedPage = localStorage.getItem(pageStorageKey) || ''
  const restoredPage = (validPageKeys.includes(hashPage as PageKey) ? hashPage : storedPage) as PageKey
  if (validPageKeys.includes(restoredPage) && !isComingSoonPage(restoredPage)) setPage(restoredPage)
}

const focusTaskSearch = () => {
  setPage('tasks')
  actionMenu.value = null
}

const openNotifications = () => {
  unreadNotificationCount.value = 0
  notify('No new notifications')
}

const navigateFromNotification = async (target: { kind: 'task' | 'message'; id: string }) => {
  if (target.kind === 'task') {
    await navigateTo(`/tasks/${target.id}`)
    return
  }
  setPage('messages')
  if (import.meta.client) window.history.replaceState(window.history.state, '', `/#messages?message=${encodeURIComponent(target.id)}`)
}

const applyProfileData = (profile: { first_name?: string; last_name?: string; avatar?: string; email?: string; phone?: string; job_title?: string }) => {
  savedProfile.firstName = profile.first_name ?? ''
  savedProfile.lastName = profile.last_name ?? ''
  savedProfile.avatar = profile.avatar || ''
  savedProfile.email = profile.email ?? ''
  savedProfile.phone = profile.phone ?? ''
  savedProfile.role = profile.job_title ?? ''
  resetProfile()
  profileAvatarPreview.value = savedProfile.avatar
}

const loadProfile = async () => {
  try {
    applyProfileData(await taskFlowApi.getMe())
  } catch (error) {
    console.error('Profile load failed.', error)
  }
}

const handleLogout = async () => {
  actionMenu.value = null
  openDropdown.value = null
  taskFlowApi.logout()
  await navigateTo('/login')
}

const notify = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
  const requestedReport = reports.value.find((report) => message === `${report[0]} downloaded`)
  if (requestedReport) {
    void downloadReport(requestedReport)
    return
  }
  if (message === 'Member create needs user and department ids from backend') {
    if (canManageDepartment.value) openModal('member')
    else notifyError('You do not have permission to add members')
    return
  }
  toastType.value = type
  toast.value = message
  setTimeout(() => {
    if (toast.value === message) toast.value = ''
  }, 2400)
}

const notifyError = (message: string) => notify(message, 'error')

const closeFloatingMenus = (event: PointerEvent) => {
  const target = event.target as HTMLElement | null
  if (target?.closest('.tf-action-menu, .tf-dropdown, .tf-date-picker, .tf-project-member-picker, .tf-event-attendee-picker')) return
  actionMenu.value = null
  openDropdown.value = null
  openProjectDatePicker.value = null
  projectMemberPickerOpen.value = false
  projectMemberSearch.value = ''
  eventAttendeePickerOpen.value = false
}

watch(modal, (value) => {
  if (value) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return
  }

  document.body.style.overflow = previousBodyOverflow
})

watch(apiError, (message) => {
  if (message) notifyError(message)
}, { immediate: true })

watch(isDarkTheme, syncRootThemeClass)

onMounted(() => {
  document.addEventListener('pointerdown', closeFloatingMenus, true)
  window.addEventListener('hashchange', restoreActivePage)
  themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  systemPrefersDark.value = themeMediaQuery.matches
  themeMediaQuery.addEventListener('change', updateSystemTheme)
  loadProfile()

  const savedTheme = localStorage.getItem(themeStorageKey)
  if (isThemeOption(savedTheme)) {
    dropdownValues.theme = savedTheme
    appliedAppearance.theme = savedTheme
  }
  syncRootThemeClass()
  restoreActivePage()
  if (activePage.value === 'tasks') void loadTaskScope(taskScope.value)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', closeFloatingMenus, true)
  window.removeEventListener('hashchange', restoreActivePage)
  document.body.style.overflow = previousBodyOverflow
  clearFeedbackScreenshot()
  if (profileAvatarPreview.value && profileAvatarPreview.value.startsWith('blob:')) URL.revokeObjectURL(profileAvatarPreview.value)
  themeMediaQuery?.removeEventListener('change', updateSystemTheme)
  themeMediaQuery = null
})

const toggleTheme = () => {
  const nextTheme = isDarkTheme.value ? 'Light' : 'Dark'
  dropdownValues.theme = nextTheme
  appliedAppearance.theme = nextTheme
  persistTheme(nextTheme)
}

const setDropdownValue = (key: string, value: string) => {
  dropdownValues[key] = value
  if (key === 'theme') persistTheme(value)
  openDropdown.value = null
}

const setFormPriority = (value: string) => {
  form.priority = value
  openDropdown.value = null
}

const projectIdOf = (project: Array<string | number>) => String(project[6] || '')
const projectDescriptionOf = (project: Array<string | number>) => String(project[8] || '')
const projectStartDateOf = (project: Array<string | number>) => String(project[9] || '')
const projectDepartmentOf = (project: Array<string | number>) => String(project[10] || '')
const projectMemberDetailsOf = (project: Array<string | number>): ProjectCardMember[] => {
  try {
    const parsed = JSON.parse(String(project[11] || '[]'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
const projectMembersOf = (project: Array<string | number>) => project.slice(12).map(String).filter(Boolean)
const taskAssigneeDetailsOf = (task: Array<string | number>): ProjectCardMember[] => {
  try {
    const parsed = JSON.parse(String(task[9] || '[]'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
const projectMemberName = (member: ProjectCardMember) =>
  member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email || 'Member'
const teamMemberId = (member: Array<string | number>) => {
  const rawId = member[7]
  if (rawId !== undefined && rawId !== null && String(rawId) !== '') return String(rawId)
  return ''
}
const teamMemberName = (member: Array<string | number>) => String(member[0] || '')
const teamMemberEmail = (member: Array<string | number>) => String(member[2] || '')
const availableProjectMembers = computed(() => {
  const query = projectMemberSearch.value.trim().toLowerCase()

  return projectMemberOptions.value.filter((member) => {
    const id = teamMemberId(member)
    if (!id || editingProjectMembers.value.includes(id)) return false
    if (!query) return true

    return `${teamMemberName(member)} ${teamMemberEmail(member)}`.toLowerCase().includes(query)
  })
})
const projectMemberIdFromLabel = (label: string) => {
  const member = team.value.find((item) => teamMemberName(item) === label)
  return member ? teamMemberId(member) : ''
}
const membershipIdOf = (member: Array<string | number>) => String(member[7] || member[9] || '')
const payloadMemberId = (id: string) => (/^\d+$/.test(id) ? Number(id) : id)
const projectEnum = (value: string) => value.toLowerCase().replace(/\s+/g, '_')
const projectDisplayStatus = (value: string) => value.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
const todayIsoDate = () => new Date().toISOString().slice(0, 10)
const formatProjectDateInput = (date: Date) =>
  `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`
const formatTaskDateInput = formatProjectDateInput

const parseProjectDate = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  const dotted = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (dotted) return `${dotted[3]}-${dotted[2].padStart(2, '0')}-${dotted[1].padStart(2, '0')}`

  const parts = trimmed.split(/[/-]/).map((item) => item.trim())
  if (parts.length !== 3) return trimmed

  const [first, second, third] = parts
  if (third.length === 4) return `${third}-${second.padStart(2, '0')}-${first.padStart(2, '0')}`
  if (first.length === 4) return `${first}-${second.padStart(2, '0')}-${third.padStart(2, '0')}`

  return trimmed
}

const projectDatePickerDays = computed(() => {
  const year = datePickerView.year
  const month = datePickerView.month
  const leading = (new Date(year, month, 1).getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()

  return {
    label: `${monthNames[month]} ${year}`,
    cells: [
      ...Array.from({ length: leading }, (_, index) => ({ key: `blank-${index}`, day: null as number | null })),
      ...Array.from({ length: days }, (_, index) => ({ key: `day-${index + 1}`, day: index + 1, month, year }))
    ]
  }
})

const openDatePicker = (field: 'startDate' | 'dueDate') => {
  openProjectDatePicker.value = openProjectDatePicker.value === field ? null : field
  if (!openProjectDatePicker.value) return

  const parsed = parseProjectDate(form[field])
  const baseDate = parsed ? new Date(`${parsed}T00:00:00`) : new Date()
  const safeDate = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate
  datePickerView.year = safeDate.getFullYear()
  datePickerView.month = safeDate.getMonth()
}

const moveDatePickerMonth = (direction: number) => {
  const nextMonth = datePickerView.month + direction
  if (nextMonth < 0) {
    datePickerView.month = 11
    datePickerView.year -= 1
    return
  }
  if (nextMonth > 11) {
    datePickerView.month = 0
    datePickerView.year += 1
    return
  }
  datePickerView.month = nextMonth
}

const selectProjectDate = (day: number | null, month?: number, year?: number) => {
  if (!day || month === undefined || year === undefined || !openProjectDatePicker.value) return
  const date = new Date(year, month, day)
  form[openProjectDatePicker.value] = formatProjectDateInput(date)
  openProjectDatePicker.value = null
}

const handleDateInput = (event: Event, field: 'startDate' | 'dueDate') => {
  const input = event.target as HTMLInputElement
  const digits = input.value.replace(/\D/g, '').slice(0, 8)
  const formatted = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join('.')
  form[field] = formatted
  input.value = formatted
}
const handleTaskDueDateInput = (event: Event) => handleDateInput(event, 'dueDate')

const loadMembersFromBackend = async () => {
  searchLoading.team = true

  try {
    const role = dropdownValues.role !== 'All Roles' ? dropdownValues.role : undefined
    const isActive = dropdownValues.status === 'Active' ? true : dropdownValues.status === 'Inactive' ? false : undefined
    const department = /^[0-9a-f-]{32,36}$/i.test(dropdownValues.department) ? dropdownValues.department : undefined
    const response = await taskFlowApi.listMembers({
      department,
      is_active: isActive,
      role,
      search: teamSearch.value.trim() || undefined,
      page_size: 200
    })
    const mappedMembers = taskFlowApi.listItems(response).map(taskFlowApi.mapMember)
    state.value.team = mappedMembers

    const localSummary = {
      total_members: mappedMembers.length,
      average_efficiency: mappedMembers.length
        ? Math.round(mappedMembers.reduce((sum, member) => sum + Number(member[4] || 0), 0) / mappedMembers.length)
        : 0,
      active_tasks: mappedMembers.reduce((sum, member) => sum + Number(member[6] || 0), 0)
    }
    memberSummary.value = localSummary
    membersRawResponse.value = { list: response, summary: localSummary }

    try {
      const summary = await taskFlowApi.getMembersSummary()
      memberSummary.value = summary
      membersRawResponse.value = { list: response, summary }
    } catch (summaryError) {
      console.warn('Members summary load failed; using list totals.', summaryError)
    }
  } catch (error) {
    console.error('Members load failed.', error)
    notifyError(taskFlowApiErrorMessage(error, 'Members load failed'))
  } finally {
    searchLoading.team = false
  }
}

watch(teamSearch, () => {
  loadMembersFromBackend()
})

const toLocalIsoDateTime = (dateValue: string, timeValue: string, addMinutes = 0) => {
  const parsedDate = parseProjectDate(dateValue) || todayIsoDate()
  const normalizedTime = normalizeTimeValue(timeValue) || '09:00'
  const date = new Date(`${parsedDate}T${normalizedTime}:00`)
  if (Number.isNaN(date.getTime())) return `${parsedDate}T${normalizedTime}:00`
  if (addMinutes) date.setMinutes(date.getMinutes() + addMinutes)

  const timezoneOffset = -date.getTimezoneOffset()
  const sign = timezoneOffset >= 0 ? '+' : '-'
  const absoluteOffset = Math.abs(timezoneOffset)
  const offset = `${sign}${String(Math.floor(absoluteOffset / 60)).padStart(2, '0')}:${String(absoluteOffset % 60).padStart(2, '0')}`

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00${offset}`
}

const normalizeTimeValue = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (!digits) return ''

  const rawHour = digits.length <= 2 ? digits : digits.slice(0, 2)
  const rawMinute = digits.length <= 2 ? '' : digits.slice(2)
  const hour = Math.min(Number(rawHour || 0), 23)
  const minute = Math.min(Number(rawMinute.padEnd(2, '0') || 0), 59)

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

const projectPayloadFromForm = (status = 'in_progress') => {
  const startDate = parseProjectDate(form.startDate) || editingProjectStartDate.value || todayIsoDate()
  const dueDate = parseProjectDate(form.dueDate) || startDate
  const selectedMemberIds = editingProjectMembers.value.length
    ? editingProjectMembers.value
    : projectMemberLabels.value.map(projectMemberIdFromLabel).filter(Boolean)
  const managerId = projectMemberIdFromLabel(form.projectManager)
  if (managerId && !selectedMemberIds.includes(managerId)) selectedMemberIds.push(managerId)

  return {
    department: editingProjectDepartment.value || effectiveDepartmentId.value,
    name: form.title.trim(),
    description: form.description.trim(),
    status,
    priority: projectEnum(form.priority),
    start_date: startDate,
    due_date: dueDate,
    members: selectedMemberIds
  }
}

const eventPayloadFromForm = () => ({
  department: effectiveDepartmentId.value,
  title: form.title.trim(),
  event_type: form.eventType.trim() || 'Meeting',
  description: form.description.trim(),
  starts_at: toLocalIsoDateTime(form.dueDate, form.eventTime),
  ends_at: form.eventEndTime.trim() ? toLocalIsoDateTime(form.dueDate, form.eventEndTime) : toLocalIsoDateTime(form.dueDate, form.eventTime, 60),
  location: '',
  meeting_url: form.meetingLink.trim(),
  attendees: eventAttendeeIds.value.map(payloadMemberId)
})

const replaceProjectRow = (id: string, project: Array<string | number>) => {
  const index = state.value.projects.findIndex((item) => projectIdOf(item) === id)
  if (index === -1) {
    state.value.projects.unshift(project)
    return
  }

  state.value.projects.splice(index, 1, project)
}

const setListPage = (list: 'task' | 'project' | 'team' | 'report', page: number) => {
  const max = list === 'task' ? taskPageCount.value : list === 'project' ? projectPageCount.value : list === 'team' ? teamPageCount.value : reportPageCount.value
  const target = Math.min(Math.max(page, 1), max)
  if (list === 'task') taskPage.value = target
  if (list === 'project') projectPage.value = target
  if (list === 'report') reportPage.value = target
  if (list === 'team') teamPage.value = target
}

const openModal = (value: Exclude<ModalKey, null>) => {
  if (value === 'task' && !canAddTask.value) {
    notifyError('Only active owners, admins, and managers can add tasks')
    return
  }
  if (value === 'event' && !canCreateEvent.value) {
    notifyError('Only active owners, admins, and managers can add events')
    return
  }
  form.title = ''
  form.assignee = ''
  form.priority = value === 'project' ? 'Low' : 'Medium'
  taskFormStatus.value = 'Not Started'
  form.startDate = formatProjectDateInput(new Date())
  form.dueDate = value === 'event'
    ? formatProjectDateInput(new Date(calendarYear.value, calendarMonthIndex.value, selectedCalendarDay.value ?? 1))
    : formatProjectDateInput(new Date())
  form.projectManager = ''
  projectManagerSearch.value = ''
  form.category = ''
  form.eventType = ''
  form.eventTime = value === 'event' ? '09:00' : ''
  form.eventEndTime = value === 'event' ? '10:30' : ''
  form.eventColor = 'bg-task-blue'
  form.meetingLink = ''
  form.description = ''
  if (value === 'task') {
    editingTaskId.value = ''
    taskModalMode.value = 'create'
    taskAssigneeIds.value = []
    taskAssigneeLabels.value = []
    taskAssigneeSearch.value = ''
    taskAssigneeOptions.value = [...departmentTeam.value]
    void loadTaskAssignees()
  }
  if (value === 'member') {
    memberFirstName.value = ''
    memberLastName.value = ''
    memberEmail.value = ''
    memberRole.value = 'member'
  }
  if (value === 'event') {
    eventAttendeeIds.value = []
    eventAttendeeLabels.value = []
    eventAttendeePickerOpen.value = false
    eventAttendeeSearch.value = ''
    eventAttendeeOptions.value = [...team.value]
    void loadEventAttendees()
  }
  if (value === 'project') {
    editingProjectId.value = ''
    editingProjectDepartment.value = ''
    editingProjectMembers.value = []
    editingProjectStartDate.value = null
    projectMemberLabels.value = []
    projectMemberOptions.value = [...team.value]
    projectMemberPickerOpen.value = false
    projectMemberSearch.value = ''
  }
  if (value === 'report') {
    reportType.value = 'Productivity'
    reportStatus.value = 'All Statuses'
  }
  modal.value = value
}

const assignTaskTo = (member: string) => {
  actionMenu.value = null
  if (!canAddTask.value) return notifyError('Only active owners, admins, and managers can add tasks')
  openModal('task')
  form.assignee = member
  const memberId = projectMemberIdFromLabel(member)
  taskAssigneeIds.value = memberId ? [memberId] : []
  taskAssigneeLabels.value = memberId ? [member] : []
  taskAssigneeSearch.value = member
}

const loadTaskAssignees = async () => {
  taskAssigneesLoading.value = true
  try {
    const response = await taskFlowApi.listMembers({
      is_active: true,
      page_size: 200
    })
    taskAssigneeOptions.value = taskFlowApi.listItems(response).map(taskFlowApi.mapMember)
  } catch (error) {
    console.error('Task assignees load failed.', error)
    taskAssigneeOptions.value = [...team.value]
    notifyError(taskFlowApiErrorMessage(error, 'Could not load team members'))
  } finally {
    taskAssigneesLoading.value = false
  }
}

const selectTaskAssignee = (member: Array<string | number>) => {
  const id = teamMemberId(member)
  const name = teamMemberName(member)
  if (!id) return
  const selectedIndex = taskAssigneeIds.value.indexOf(id)
  if (selectedIndex >= 0) {
    removeTaskAssignee(selectedIndex)
    return
  }
  taskAssigneeIds.value.push(id)
  taskAssigneeLabels.value.push(name)
  form.assignee = taskAssigneeLabels.value.join(', ')
}

const removeTaskAssignee = (index: number) => {
  taskAssigneeIds.value.splice(index, 1)
  taskAssigneeLabels.value.splice(index, 1)
  form.assignee = taskAssigneeLabels.value.join(', ')
}

const removeProjectMember = (member: string) => {
  const index = projectMemberLabels.value.indexOf(member)
  projectMemberLabels.value = projectMemberLabels.value.filter((item) => item !== member)
  if (index >= 0) editingProjectMembers.value.splice(index, 1)
}

const addProjectMember = async () => {
  projectMemberPickerOpen.value = !projectMemberPickerOpen.value
  projectMemberSearch.value = ''
  if (!projectMemberPickerOpen.value) return

  projectMembersLoading.value = true
  try {
    const response = await taskFlowApi.listMembers({
      department: effectiveDepartmentId.value || undefined,
      is_active: true,
      page_size: 100
    })
    projectMemberOptions.value = taskFlowApi.listItems(response).map(taskFlowApi.mapMember)
  } catch (error) {
    console.error('Project members load failed.', error)
    notifyError(taskFlowApiErrorMessage(error, 'Members load failed'))
  } finally {
    projectMembersLoading.value = false
  }
}

const selectProjectMember = (member: Array<string | number>) => {
  const id = teamMemberId(member)
  if (!id || editingProjectMembers.value.includes(id)) return

  editingProjectMembers.value.push(id)
  projectMemberLabels.value.push(teamMemberName(member))
  projectMemberSearch.value = ''
}

const removeEventAttendee = (member: string) => {
  const index = eventAttendeeLabels.value.indexOf(member)
  eventAttendeeLabels.value = eventAttendeeLabels.value.filter((item) => item !== member)
  if (index >= 0) eventAttendeeIds.value.splice(index, 1)
}

const availableEventAttendees = computed(() => {
  const query = eventAttendeeSearch.value.trim().toLowerCase()
  return eventAttendeeOptions.value.filter((member) => {
    const id = teamMemberId(member)
    return id && (!query || `${teamMemberName(member)} ${teamMemberEmail(member)}`.toLowerCase().includes(query))
  })
})

const loadEventAttendees = async () => {
  eventAttendeesLoading.value = true
  try {
    const department = effectiveDepartmentId.value
    if (!department) {
      eventAttendeeOptions.value = []
      notifyError('Your account must belong to a department before selecting attendees')
      return
    }

    const response = await taskFlowApi.listMembers({
      department,
      is_active: true,
      page_size: 200
    })
    eventAttendeeOptions.value = taskFlowApi.listItems(response)
      .map(taskFlowApi.mapMember)
      .filter((member) => String(member[11] || '') === department)

    const allowedIds = new Set(eventAttendeeOptions.value.map(teamMemberId).filter(Boolean))
    for (let index = eventAttendeeIds.value.length - 1; index >= 0; index -= 1) {
      if (!allowedIds.has(eventAttendeeIds.value[index])) {
        eventAttendeeIds.value.splice(index, 1)
        eventAttendeeLabels.value.splice(index, 1)
      }
    }
  } catch (error) {
    console.error('Event attendees load failed.', error)
    eventAttendeeOptions.value = [...departmentTeam.value]
    notifyError(taskFlowApiErrorMessage(error, 'Could not load users'))
  } finally {
    eventAttendeesLoading.value = false
  }
}

const selectEventAttendee = (member: Array<string | number>) => {
  const id = teamMemberId(member)
  if (!id) return
  const selectedIndex = eventAttendeeIds.value.indexOf(id)
  if (selectedIndex >= 0) {
    eventAttendeeIds.value.splice(selectedIndex, 1)
    eventAttendeeLabels.value.splice(selectedIndex, 1)
    return
  }
  eventAttendeeIds.value.push(id)
  eventAttendeeLabels.value.push(teamMemberName(member))
}

const viewProject = async (project: Array<string | number>) => {
  actionMenu.value = null
  const id = projectIdOf(project)

  if (!id) {
    notify('Project detail is available after backend sync')
    return
  }

  try {
    const detail = await taskFlowApi.getProject(id)
    replaceProjectRow(id, taskFlowApi.mapProject(detail))
    notify(`${detail.name} loaded`)
  } catch (error) {
    console.error('Project detail load failed.', error)
    notifyError(taskFlowApiErrorMessage(error, 'Project detail load failed'))
  }
}

const editProject = (project: Array<string | number>) => {
  actionMenu.value = null
  editingProjectId.value = projectIdOf(project)
  editingProjectDepartment.value = projectDepartmentOf(project)
  editingProjectMembers.value = projectMembersOf(project)
  editingProjectStartDate.value = projectStartDateOf(project) || null
  form.title = String(project[0] || '')
  form.priority = String(project[2] || 'Low')
  const startDate = projectStartDateOf(project) ? new Date(`${parseProjectDate(projectStartDateOf(project))}T00:00:00`) : null
  form.startDate = startDate && !Number.isNaN(startDate.getTime()) ? formatProjectDateInput(startDate) : ''
  form.dueDate = String(project[5] || '')
  form.projectManager = ''
  projectManagerSearch.value = ''
  form.description = projectDescriptionOf(project)
  const projectDetails = projectMemberDetailsOf(project)
  projectMemberLabels.value = projectDetails.map(projectMemberName)
  if (!editingProjectMembers.value.length) editingProjectMembers.value = projectDetails.map((member) => member.id === undefined || member.id === null ? '' : String(member.id)).filter(Boolean)
  if (!projectMemberLabels.value.length) projectMemberLabels.value = team.value.filter((member) => editingProjectMembers.value.includes(teamMemberId(member))).map(teamMemberName).filter(Boolean)
  modal.value = 'project'
}

const updateTaskStatus = async (task: Array<string | number>, status: string) => {
  const id = String(task[6] || '')
  if (!id || updatingTaskId.value === id) return

  updatingTaskId.value = id
  try {
    await taskFlowApi.patchTask(id, {
      status,
      ...(status === 'completed' ? { progress: 100 } : {})
    })
    task[3] = projectDisplayStatus(status)
    if (status === 'completed') task[5] = 100
    notify(`Task moved to ${projectDisplayStatus(status)}`, 'success')
  } catch (error) {
    console.error('Task status update failed.', error)
    notifyError(taskFlowApiErrorMessage(error, 'Task status update failed'))
  } finally {
    updatingTaskId.value = ''
    draggedTaskId.value = ''
  }
}

const replaceTaskRow = (id: string, task: Array<string | number>) => {
  const index = state.value.tasks.findIndex((item) => String(item[6] || '') === id)
  if (index === -1) state.value.tasks.unshift(task)
  else state.value.tasks.splice(index, 1, task)
}

const openTask = async (task: Array<string | number>, mode: 'view' | 'edit') => {
  actionMenu.value = null
  const id = String(task[6] || '')
  if (!id) return notifyError('Task backend bilan hali sinxronlanmagan')
  taskSaving.value = true
  try {
    const details = await taskFlowApi.getTask(id)
    const mapped = taskFlowApi.mapTask(details)
    replaceTaskRow(id, mapped)
    editingTaskId.value = id
    taskModalMode.value = mode
    form.title = String(mapped[0] || '')
    form.priority = String(mapped[2] || 'Medium')
    taskFormStatus.value = String(mapped[3] || 'Not Started')
    form.description = String(mapped[10] || '')
    form.category = String(mapped[11] || '')
    const rawDueDate = String(mapped[12] || '')
    form.dueDate = rawDueDate ? formatProjectDateInput(new Date(`${rawDueDate}T00:00:00`)) : ''
    const assigneeDetails = taskAssigneeDetailsOf(mapped)
    const rawAssignees = JSON.parse(String(mapped[13] || '[]')) as Array<string | number>
    taskAssigneeIds.value = rawAssignees.map(String)
    if (!taskAssigneeIds.value.length) taskAssigneeIds.value = assigneeDetails.map((member) => String(member.id || '')).filter(Boolean)
    taskAssigneeLabels.value = assigneeDetails.map(projectMemberName)
    taskAssigneeSearch.value = ''
    taskAssigneeOptions.value = [...departmentTeam.value]
    void loadTaskAssignees()
    modal.value = 'task'
  } catch (error) {
    notifyError(taskFlowApiErrorMessage(error, 'Could not load task details'))
  } finally {
    taskSaving.value = false
  }
}

const openTaskFromCard = (task: Array<string | number>) =>
  openTask(task, canManageDepartment.value ? 'edit' : 'view')

const deleteTask = async (task: Array<string | number>) => {
  actionMenu.value = null
  const id = String(task[6] || '')
  if (!id) return notifyError('Task backend bilan hali sinxronlanmagan')
  if (import.meta.client && !window.confirm(`“${String(task[0])}” taskini o‘chirmoqchimisiz?`)) return
  try {
    await taskFlowApi.deleteTask(id)
    state.value.tasks = state.value.tasks.filter((item) => String(item[6] || '') !== id)
    notify('Task muvaffaqiyatli o‘chirildi', 'success')
  } catch (error) {
    notifyError(taskFlowApiErrorMessage(error, 'Could not delete the task'))
  }
}

const duplicateTask = async (task: Array<string | number>) => {
  actionMenu.value = null
  const department = String(task[8] || '')
  if (!department) return notifyError('Task bo‘limi topilmadi')
  try {
    const assignees = JSON.parse(String(task[13] || '[]')) as Array<string | number>
    const created = await taskFlowApi.createTask({
      department,
      title: `${String(task[0])} Copy`,
      description: String(task[10] || ''),
      status: projectEnum(String(task[3] || 'Not Started')),
      priority: projectEnum(String(task[2] || 'Medium')),
      category: String(task[11] || ''),
      assignees,
      due_date: String(task[12] || todayIsoDate()),
      progress: Number(task[5] || 0)
    })
    state.value.tasks.unshift(taskFlowApi.mapTask(created))
    notify('Task nusxasi yaratildi', 'success')
  } catch (error) {
    notifyError(taskFlowApiErrorMessage(error, 'Could not duplicate the task'))
  }
}

const dropTaskInColumn = (status: string) => {
  const task = tasks.value.find((item) => String(item[6] || '') === draggedTaskId.value)
  if (task) void updateTaskStatus(task, status)
}

const patchProjectStatus = async (project: Array<string | number>, status: string) => {
  actionMenu.value = null
  const id = projectIdOf(project)

  if (!id) {
    notify('Project can be updated after backend sync')
    return
  }

  try {
    const updated = await taskFlowApi.patchProject(id, { status })
    replaceProjectRow(id, taskFlowApi.mapProject(updated))
    notify(`Project marked ${projectDisplayStatus(status)}`)
  } catch (error) {
    console.error('Project patch failed.', error)
    notifyError(taskFlowApiErrorMessage(error, 'Project update failed'))
  }
}

const deleteProject = async (project: Array<string | number>) => {
  actionMenu.value = null
  const id = projectIdOf(project)
  const label = String(project[0])

  if (!id) {
    state.value.projects = state.value.projects.filter((item) => item[0] !== label)
    notify(`${label} deleted`)
    return
  }

  try {
    await taskFlowApi.deleteProject(id)
    state.value.projects = state.value.projects.filter((item) => projectIdOf(item) !== id)
    notify(`${label} deleted`)
  } catch (error) {
    console.error('Project delete failed.', error)
    notifyError(taskFlowApiErrorMessage(error, 'Project delete failed'))
  }
}

const updateMemberStatus = async (member: Array<string | number>, isActive: boolean) => {
  actionMenu.value = null
  const id = membershipIdOf(member)

  if (!id) {
    notifyError('Membership id is required from backend')
    return
  }

  try {
    await taskFlowApi.patchMember(id, { is_active: isActive })
    await loadMembersFromBackend()
    notify(`Member ${isActive ? 'activated' : 'deactivated'}`, 'success')
  } catch (error) {
    console.error('Member status update failed.', error)
    notifyError(taskFlowApiErrorMessage(error, 'Member update failed'))
  }
}

const deleteMember = async (member: Array<string | number>) => {
  actionMenu.value = null
  const id = membershipIdOf(member)
  const label = teamMemberName(member)

  if (!id) {
    notifyError('Membership id is required from backend')
    return
  }

  try {
    await taskFlowApi.deleteMember(id)
    state.value.team = state.value.team.filter((item) => membershipIdOf(item) !== id)
    await loadMembersFromBackend()
    notify(`${label || 'Member'} removed`, 'success')
  } catch (error) {
    console.error('Member delete failed.', error)
    notifyError(taskFlowApiErrorMessage(error, 'Member delete failed'))
  }
}

const submitModal = async () => {
  const title = form.title.trim()

  if (modal.value === 'member') {
    if (!canManageDepartment.value) {
      notifyError('You do not have permission to add members')
      return
    }
    if (!effectiveDepartmentId.value) {
      notifyError('Department is required')
      return
    }
    const email = memberEmail.value.trim().toLowerCase()
    if (!memberFirstName.value.trim() || !memberLastName.value.trim() || !email) {
      notifyError('First name, last name, and email are required')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      notifyError('Enter a valid email address')
      return
    }

    try {
      await taskFlowApi.createMember({
        first_name: memberFirstName.value.trim(),
        last_name: memberLastName.value.trim(),
        email,
        username: email,
        department: effectiveDepartmentId.value,
        role: memberRole.value,
        is_active: true
      })
      await loadMembersFromBackend()
      notify('Member added successfully', 'success')
    } catch (error) {
      console.error('Member create failed.', error)
      notifyError(taskFlowApiErrorMessage(error, 'Member create failed'))
      return
    }
  }

  if (modal.value === 'task') {
    if (taskModalMode.value === 'view') {
      modal.value = null
      return
    }
    if (!title) {
      notifyError('Task title is required')
      return
    }
    if (!taskAssigneeIds.value.length) {
      notifyError('Select at least one assignee')
      return
    }

    const department = String(effectiveDepartmentId.value || '')
    if (!department) {
      notifyError('Your user must belong to a department before creating tasks')
      return
    }
    if (!canAddTask.value && !editingTaskId.value) {
      notifyError('Only active owners, admins, and managers can add tasks')
      return
    }
    const status = projectEnum(taskFormStatus.value)
    const payload = {
      department,
      title,
      description: form.description.trim(),
      status,
      priority: projectEnum(form.priority),
      category: form.category.trim(),
      assignees: taskAssigneeIds.value.map(payloadMemberId),
      due_date: parseProjectDate(form.dueDate) || todayIsoDate(),
      progress: status === 'completed' ? 100 : 0
    }

    taskSaving.value = true
    try {
      const saved = editingTaskId.value
        ? await taskFlowApi.updateTask(editingTaskId.value, payload)
        : await taskFlowApi.createTask(payload)
      if (editingTaskId.value) replaceTaskRow(editingTaskId.value, taskFlowApi.mapTask(saved))
      else state.value.tasks.unshift(taskFlowApi.mapTask(saved))
      notify(editingTaskId.value ? 'Task muvaffaqiyatli yangilandi' : 'Task muvaffaqiyatli yaratildi', 'success')
    } catch (error) {
      console.error('Task create failed.', error)
      notifyError(taskFlowApiErrorMessage(error, 'Task create failed'))
      return
    } finally {
      taskSaving.value = false
    }
  }

  if (modal.value === 'project') {
    const projectPayload = projectPayloadFromForm('in_progress')
    if (!projectPayload.name) {
      notifyError('Project name is required')
      return
    }
    if (!projectPayload.department) {
      notifyError('Your account must be assigned to a department before managing projects')
      return
    }

    try {
      if (editingProjectId.value) {
        const updated = await taskFlowApi.updateProject(editingProjectId.value, {
          ...projectPayload,
          status: projectEnum(String(state.value.projects.find((project) => projectIdOf(project) === editingProjectId.value)?.[1] || 'In Progress'))
        })
        replaceProjectRow(editingProjectId.value, taskFlowApi.mapProject(updated))
        notify('Project updated')
      } else {
        const created = await taskFlowApi.createProject(projectPayload)
        state.value.projects.unshift(taskFlowApi.mapProject(created))
        notify('Project created')
      }
    } catch (error) {
      console.error('Project save failed.', error)
      notifyError(taskFlowApiErrorMessage(error, 'Project save failed'))
      return
    }
  }

  if (modal.value === 'report') {
    if (!title) {
      notifyError('Report name is required')
      return
    }
    try {
      const created = await taskFlowApi.createReport({
        name: title,
        report_type: reportType.value.toLowerCase().replace(/\s+/g, '_'),
        parameters: JSON.stringify({
          start_date: parseProjectDate(form.startDate),
          end_date: parseProjectDate(form.dueDate),
          priority: dropdownValues.priority === 'All Priorities' ? null : projectEnum(dropdownValues.priority),
          status: reportStatus.value === 'All Statuses' ? null : projectEnum(reportStatus.value)
        })
      })
      state.value.reports.unshift(taskFlowApi.mapReport(created))
      notify('Report created', 'success')
    } catch (error) {
      console.error('Report create failed.', error)
      notifyError(taskFlowApiErrorMessage(error, 'Report create failed'))
      return
    }
  }

  if (modal.value === 'event') {
    if (!canCreateEvent.value) {
      notifyError('Only active owners, admins, and managers can add events')
      return
    }
    if (!title) {
      notifyError('Event title is required')
      return
    }
    if (!form.eventType.trim()) {
      notifyError('Event type is required')
      return
    }
    if (!eventAttendeeIds.value.length) {
      notifyError('Select at least one attendee')
      eventAttendeePickerOpen.value = true
      return
    }

    const payload = eventPayloadFromForm()
    if (!payload.department) {
      notifyError('Your account must belong to a department before creating events')
      return
    }

    const allowedAttendeeIds = new Set(
      eventAttendeeOptions.value
        .filter((member) => String(member[11] || '') === payload.department)
        .map(teamMemberId)
        .filter(Boolean)
    )
    if (payload.attendees.some((attendeeId) => !allowedAttendeeIds.has(attendeeId))) {
      notifyError('Every attendee must belong to your current department')
      eventAttendeePickerOpen.value = true
      return
    }

    try {
      const created = await taskFlowApi.createEvent(payload)
      const mappedEvent = taskFlowApi.mapEvent(created)
      const createdEventId = String(mappedEvent[0] || '')
      if (createdEventId) eventColorById[createdEventId] = form.eventColor
      state.value.events.unshift(mappedEvent)
      notify('Event created')
      await nextTick()
      const createdCalendarEvent = calendarEvents.value.find((event) => event.id === createdEventId)
      if (createdCalendarEvent) {
        if (!createdCalendarEvent.attendeeNames.length) createdCalendarEvent.attendeeNames = [...eventAttendeeLabels.value]
        openEventDetails(createdCalendarEvent)
        return
      }
    } catch (error) {
      console.error('Event save failed.', error)
      notifyError(taskFlowApiErrorMessage(error, 'Event save failed'))
      return
    }
  }

  if (modal.value === 'team-filter') {
    actionMenu.value = null
    await loadMembersFromBackend()
  }

  modal.value = null
}

const sendMessage = () => {
  if (!chatDraft.value.trim()) return
  chatDraft.value = ''
  notify('Messages can be sent after backend endpoint is connected')
}

const generateReport = (name: string) => {
  notify(`${name} can be generated after backend endpoint is connected`)
}

const chooseProfileAvatar = () => {
  profileAvatarInput.value?.click()
}

const handleProfileAvatar = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    if (profileAvatarInput.value) profileAvatarInput.value.value = ''
    notifyError('Please upload an image')
    return
  }

  if (profileAvatarPreview.value && profileAvatarPreview.value.startsWith('blob:')) URL.revokeObjectURL(profileAvatarPreview.value)
  profileAvatarFile.value = file
  profileAvatarPreview.value = URL.createObjectURL(file)
  profileForm.avatar = file.name
}

const removeProfileAvatar = () => {
  profileForm.avatar = ''
  profileAvatarFile.value = null
  if (profileAvatarPreview.value && profileAvatarPreview.value.startsWith('blob:')) URL.revokeObjectURL(profileAvatarPreview.value)
  profileAvatarPreview.value = ''
  if (profileAvatarInput.value) profileAvatarInput.value.value = ''
}

const formatUzPhone = (value: string) => {
  let digits = value.replace(/\D/g, '')

  if (digits.startsWith('998')) digits = digits.slice(3)
  if (digits.startsWith('8')) digits = digits.slice(1)
  digits = digits.slice(0, 9)

  const parts = [
    digits.slice(0, 2),
    digits.slice(2, 5),
    digits.slice(5, 7),
    digits.slice(7, 9)
  ].filter(Boolean)

  return parts.length ? `+998 ${parts.join(' ')}` : '+998 '
}

const handleProfilePhoneInput = (event: Event) => {
  profileForm.phone = formatUzPhone((event.target as HTMLInputElement).value)
}

const passwordInputType = (field: 'current' | 'next' | 'confirm') => passwordVisible[field] ? 'text' : 'password'
const togglePasswordVisibility = (field: 'current' | 'next' | 'confirm') => {
  passwordVisible[field] = !passwordVisible[field]
}


const reportDownloadUrl = (file: string) => {
  if (/^https?:\/\//i.test(file)) return file
  const apiBase = String(runtimeConfig.public.apiBase || '')
  if (!apiBase) return file
  try {
    return new URL(file, `${new URL(apiBase).origin}/`).toString()
  } catch {
    return file
  }
}

const downloadReport = async (report: Array<string | number>) => {
  let currentReport = report
  const reportId = String(report[5] || '')

  if (!String(currentReport[6] || '') && reportId) {
    try {
      const refreshed = taskFlowApi.mapReport(await taskFlowApi.getReport(reportId))
      const index = state.value.reports.findIndex((item) => String(item[5] || '') === reportId)
      if (index >= 0) state.value.reports.splice(index, 1, refreshed)
      currentReport = refreshed
    } catch (error) {
      console.error('Report download refresh failed.', error)
      notifyError(taskFlowApiErrorMessage(error, 'Report download failed'))
      return
    }
  }

  const file = String(currentReport[6] || '')
  if (!file) {
    notify(String(currentReport[4] || '').toLowerCase() === 'processing' ? 'Report is still processing' : 'Report file is not available yet')
    return
  }

  const link = document.createElement('a')
  link.href = reportDownloadUrl(file)
  link.download = file.split('/').pop()?.split('?')[0] || `${String(currentReport[0] || 'report')}.pdf`
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

const createSupportRequest = (card: string) => {
  supportRequests.value.unshift(card)
  notify(`${card} request created`)
}

const clearFeedbackScreenshot = () => {
  if (feedbackScreenshotPreview.value) URL.revokeObjectURL(feedbackScreenshotPreview.value)
  feedbackScreenshotName.value = ''
  feedbackScreenshotPreview.value = ''
  if (feedbackScreenshotInput.value) feedbackScreenshotInput.value.value = ''
}

const attachFeedbackScreenshot = () => {
  feedbackScreenshotInput.value?.click()
}

const handleFeedbackScreenshot = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    clearFeedbackScreenshot()
    notifyError('Please upload an image')
    return
  }

  if (feedbackScreenshotPreview.value) URL.revokeObjectURL(feedbackScreenshotPreview.value)
  feedbackScreenshotName.value = file.name
  feedbackScreenshotPreview.value = URL.createObjectURL(file)
}

const sendFeedbackToTeam = () => {
  supportRequests.value.unshift(feedbackDraft.value.trim() || 'New feedback')
  feedbackDraft.value = ''
  clearFeedbackScreenshot()
  supportWidgetOpen.value = false
  notify('Feedback sent to team')
}

const saveSettings = async (section: string) => {
  if (section === 'Profile') {
    try {
      const profile = await taskFlowApi.updateMe({
        first_name: profileForm.firstName.trim(),
        last_name: profileForm.lastName.trim(),
        phone: profileForm.phone.trim(),
        job_title: profileForm.role.trim()
      }, profileAvatarFile.value)
      applyProfileData(profile)
      profileAvatarFile.value = null
      notify('Profile updated')
    } catch (error) {
      console.error('Profile update failed.', error)
      notifyError(taskFlowApiErrorMessage(error, 'Profile update failed'))
    }

    return
  }

  if (section === 'Password') {
    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
      notifyError('Fill all password fields')
      return
    }

    if (passwordForm.next !== passwordForm.confirm) {
      notifyError('Passwords do not match')
      return
    }

    try {
      await taskFlowApi.changePassword(passwordForm.current, passwordForm.next, passwordForm.confirm)
      passwordForm.current = ''
      passwordForm.next = ''
      passwordForm.confirm = ''
      notify('Password updated')
    } catch (error) {
      console.error('Change password failed.', error)
      notifyError(taskFlowApiErrorMessage(error, 'Password update failed'))
    }

    return
  }

  if (section === 'Appearance') {
    appliedAppearance.theme = dropdownValues.theme
    appliedAppearance.language = dropdownValues.language
    appliedAppearance.timezone = dropdownValues.timezone
    appliedAppearance.currency = dropdownValues.currency
    appliedAppearance.dateFormat = dropdownValues.dateFormat
    document.documentElement.lang = dropdownValues.language === 'Uzbek (UZ)' ? 'uz' : dropdownValues.language === 'Russian (RU)' ? 'ru' : 'en'
    persistTheme(dropdownValues.theme)
  }

  notify(`${section} settings saved`)
}

const resetAppearance = () => {
  dropdownValues.theme = appliedAppearance.theme
  persistTheme(appliedAppearance.theme)
  dropdownValues.language = appliedAppearance.language
  dropdownValues.timezone = appliedAppearance.timezone
  dropdownValues.currency = appliedAppearance.currency
  dropdownValues.dateFormat = appliedAppearance.dateFormat
  openDropdown.value = null
}

const resetProfile = () => {
  profileForm.firstName = savedProfile.firstName
  profileForm.lastName = savedProfile.lastName
  profileForm.avatar = savedProfile.avatar
  profileAvatarFile.value = null
  if (profileAvatarPreview.value && profileAvatarPreview.value.startsWith('blob:')) URL.revokeObjectURL(profileAvatarPreview.value)
  profileAvatarPreview.value = savedProfile.avatar
  profileForm.email = savedProfile.email
  profileForm.phone = savedProfile.phone
  profileForm.role = savedProfile.role
}

const resetPassword = () => {
  passwordForm.current = ''
  passwordForm.next = ''
  passwordForm.confirm = ''
}

const moveCalendar = (direction: number) => {
  const nextMonth = calendarMonthIndex.value + direction
  if (nextMonth < 0) {
    calendarMonthIndex.value = 11
    calendarYear.value -= 1
  } else if (nextMonth > 11) {
    calendarMonthIndex.value = 0
    calendarYear.value += 1
  } else {
    calendarMonthIndex.value = nextMonth
  }
  selectedCalendarDay.value = null
}

const selectCalendarDay = (day: number) => {
  selectedCalendarDay.value = day
}

const toggleActionMenu = (key: string) => {
  actionMenu.value = actionMenu.value === key ? null : key
}

const runAction = async (action: string, type: string, label: string) => {
  actionMenu.value = null

  if (type === 'task' && !canManageDepartment.value) {
    notifyError('Members can update only task status and progress')
    return
  }

  if (type === 'task') {
    const task = state.value.tasks.find((item) => String(item[0]) === label)
    if (!task) return notifyError('Task topilmadi')
    if (action === 'edit') return await openTask(task, 'edit')
    if (action === 'duplicate') return await duplicateTask(task)
    if (action === 'delete') return await deleteTask(task)
  }

  if (action === 'delete') {
    if (type === 'task') state.value.tasks = state.value.tasks.filter((item) => item[0] !== label)
    if (type === 'project') state.value.projects = state.value.projects.filter((item) => item[0] !== label)
    if (type === 'report') state.value.reports = state.value.reports.filter((item) => item[0] !== label)
    notify(`${label} deleted`)
    return
  }

  if (action === 'duplicate') {
    const source =
      type === 'task'
        ? state.value.tasks.find((item) => item[0] === label)
        : type === 'project'
          ? state.value.projects.find((item) => item[0] === label)
          : null

    if (source && type === 'task') state.value.tasks.unshift([`${source[0]} Copy`, ...source.slice(1)])
    if (source && type === 'project') state.value.projects.unshift([`${source[0]} Copy`, ...source.slice(1)])
    notify(`${label} duplicated`)
    return
  }

  if (action === 'edit') {
    form.title = label
    modal.value = type === 'project' ? 'project' : type === 'report' ? 'report' : 'task'
    return
  }

  actionMenu.value = null
}

const badgeClass = (value: string) => {
  if (value === 'High' || value === 'On Track' || value === 'Overloaded') return 'bg-task-dangerSoft text-task-danger'
  if (value === 'Medium' || value === 'Processing') return 'bg-task-warningSoft text-task-warning'
  if (value === 'Low' || value === 'Completed' || value === 'Ready') return 'bg-task-successSoft text-task-success'
  if (value === 'Not Started') return 'bg-slate-100 text-task-muted'
  if (value === 'Backlog') return 'bg-slate-200 text-slate-600'
  if (value === 'On Hold') return 'bg-amber-100 text-amber-700'
  return 'bg-task-blueSoft text-task-blue'
}

const initials = (name: string) => name.split(' ').filter(Boolean).map((item) => item[0]).join('').slice(0, 2) || 'U'

const iconPath = (name: string) => {
  const paths: Record<string, string> = {
    grid: 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z',
    check: 'M9 12.8 11.1 15 16 9.7M5 4h14v16H5V4Z',
    folder: 'M3 6.5h6l2 2h10v9.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6.5Z',
    chart: 'M5 19V9m7 10V5m7 14v-7',
    calendar: 'M7 3v4m10-4v4M4 8h16M5 5h14v15H5V5Z',
    users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    file: 'M7 3h7l4 4v14H7V3Zm7 0v5h5',
    message: 'M4 5h16v11H8l-4 4V5Z',
    settings: 'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0-5v3m0 12v3m9-9h-3M6 12H3m15.4-6.4-2.1 2.1M7.7 16.3l-2.1 2.1m12.8 0-2.1-2.1M7.7 7.7 5.6 5.6',
    help: 'M9.1 9a3 3 0 1 1 5.8 1c-.7 1.4-2.9 1.5-2.9 3m0 4h.01M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Z',
    robot: 'M12 3v3m-5 4h10a3 3 0 0 1 3 3v4a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-4a3 3 0 0 1 3-3Zm2-4h-4m-2 8h.01M16 14h.01M9 18h6',
    logout: 'M10 17l5-5-5-5m5 5H3m6-9h10v18H9',
    search: 'm21 21-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z',
	    bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8.3 12a2.5 2.5 0 0 0 4.6 0',
	    moon: 'M21 14.2A8.5 8.5 0 0 1 9.8 3 7 7 0 1 0 21 14.2Z',
	    sun: 'M12 4V2m0 20v-2m8-8h2M2 12h2m14.4-6.4 1.4-1.4M4.2 19.8l1.4-1.4m0-12.8L4.2 4.2m15.6 15.6-1.4-1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
    dots: 'M5 12m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0M12 12m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0M19 12m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0',
    plus: 'M12 5v14M5 12h14',
    filter: 'M4 7h16M7 12h10M10 17h4',
    mail: 'M4 6h16v12H4V6Zm0 0 8 7 8-7',
    phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z'
    ,
    eye: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    eyeOff: 'M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.5 10.5 0 0 1 12 5c6.5 0 10 7 10 7a18.6 18.6 0 0 1-3.2 4.2M6.6 6.6C3.7 8.3 2 12 2 12s3.5 7 10 7c1.9 0 3.5-.5 4.9-1.2'
  }
  return paths[name] ?? paths.grid
}
</script>

<template>
  <main :class="['tf-shell', isDarkTheme ? 'tf-dark' : '']">
    <section class="tf-window">
      <div v-if="mobileSidebarOpen" class="tf-mobile-overlay" @click="mobileSidebarOpen = false" />
      <aside :class="['tf-sidebar relative flex shrink-0 flex-col gap-4 border-r border-task-line bg-white py-5 transition-[width,padding] duration-300 ease-out', sidebarCollapsed ? 'w-[82px] px-3' : 'w-[230px] px-4', mobileSidebarOpen ? 'is-open' : '']">
        <button type="button" class="tf-icon-button absolute right-3 top-3 md:hidden" aria-label="Close menu" @click="mobileSidebarOpen = false">
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
        <div :class="['tf-panel flex h-12 items-center shadow-none', sidebarCollapsed ? 'justify-center px-2' : 'gap-2 px-3']">
          <button class="flex min-w-0 flex-1 items-center gap-3" type="button" :title="sidebarCollapsed ? 'Open menu' : 'TaskFlow'" :aria-label="sidebarCollapsed ? 'Open menu' : 'Go to dashboard'" @click="sidebarCollapsed ? (sidebarCollapsed = false) : setPage('dashboard')">
          <div :class="['grid h-8 w-8 shrink-0 place-items-center transition', sidebarCollapsed ? 'rounded-[10px] bg-task-blueSoft text-task-blue hover:bg-task-blue hover:text-white' : 'rounded-full bg-task-blue text-white']">
            <svg v-if="sidebarCollapsed" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 7h14M5 12h14M5 17h14" /></svg>
            <svg v-else viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.7"><path d="m7 12 3 3 7-7" /></svg>
          </div>
          <span v-if="!sidebarCollapsed" class="truncate text-lg font-bold">TaskFlow</span>
          </button>
          <button v-if="!sidebarCollapsed" type="button" class="group hidden h-10 w-10 shrink-0 place-items-center rounded-[12px] border border-task-line bg-slate-50 text-task-muted shadow-sm transition duration-200 hover:-translate-x-0.5 hover:border-task-blue hover:bg-task-blueSoft hover:text-task-blue md:grid" aria-label="Collapse menu" title="Close sidebar" @click="sidebarCollapsed = true">
            <svg viewBox="0 0 24 24" class="h-5 w-5 transition group-hover:scale-110" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6 9 12l6 6" /><path d="M20 6v12" /></svg>
          </button>
        </div>

        <nav :class="['tf-panel flex min-h-0 flex-1 flex-col overflow-hidden py-4 shadow-none', sidebarCollapsed ? 'px-2' : 'px-3']">
          <p v-if="!sidebarCollapsed" class="mb-3 text-xs font-medium text-task-muted">Menu</p>
          <div class="space-y-1">
            <button
              v-for="item in menuPages"
              :key="item.key"
              type="button"
              :disabled="isComingSoonPage(item.key)"
              :class="['tf-nav-item relative flex h-10 w-full items-center rounded-[12px] text-left text-sm transition', sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3', isComingSoonPage(item.key) ? 'cursor-not-allowed opacity-40 grayscale' : activePage === item.key ? 'is-active bg-task-blueSoft font-semibold text-task-blue' : 'text-task-muted hover:bg-slate-50 hover:text-task-ink']"
              :title="isComingSoonPage(item.key) ? `${item.label} — Coming soon` : sidebarCollapsed ? item.label : undefined"
              @click="setPage(item.key)"
            >
              <span :class="['grid h-7 w-7 shrink-0 place-items-center rounded-[9px] transition', !isComingSoonPage(item.key) && activePage === item.key ? 'bg-white text-task-blue shadow-sm' : '']"><svg viewBox="0 0 24 24" class="h-[17px] w-[17px]" fill="none" stroke="currentColor" stroke-width="1.7"><path :d="iconPath(item.icon)" /></svg></span>
              <span v-if="!sidebarCollapsed" class="min-w-0 flex-1 truncate">{{ item.label }}</span>
              <span v-if="isComingSoonPage(item.key) && !sidebarCollapsed" class="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-task-muted">Soon</span>
              <span v-if="item.badge && !sidebarCollapsed" class="grid h-5 min-w-5 place-items-center rounded-full bg-task-danger px-1 text-[10px] font-bold text-white">{{ item.badge }}</span>
              <span v-else-if="item.badge" class="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border border-white bg-task-danger" />
            </button>
          </div>

          <p v-if="generalPages.length && !sidebarCollapsed" class="mb-3 mt-8 text-xs font-medium text-task-muted">General</p>
          <div v-if="generalPages.length" :class="['space-y-1', sidebarCollapsed ? 'mt-5 border-t border-task-line pt-5' : '']">
            <button
              v-for="item in generalPages"
              :key="item.key"
              type="button"
              :class="['flex h-9 w-full items-center rounded-ui text-left text-sm transition', sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3', activePage === item.key ? 'bg-task-blueSoft font-semibold text-task-blue' : 'text-task-muted hover:bg-slate-50 hover:text-task-ink']"
              :title="sidebarCollapsed ? item.label : undefined"
              @click="setPage(item.key)"
            >
              <svg viewBox="0 0 24 24" class="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" stroke-width="1.7"><path :d="iconPath(item.icon)" /></svg>
              <span v-if="!sidebarCollapsed">{{ item.label }}</span>
            </button>
          </div>
          <div :class="['tf-sidebar-user mt-auto', sidebarCollapsed ? 'flex-col justify-center p-1.5' : '']">
          <button type="button" :class="['flex min-w-0 items-center gap-2 text-left', sidebarCollapsed ? 'justify-center' : 'flex-1']" :title="sidebarCollapsed ? profileName : undefined" @click="setPage('settings')">
            <span class="tf-sidebar-avatar">
              <img v-if="savedProfile.avatar" :src="savedProfile.avatar" alt="Profile avatar" class="h-full w-full rounded-full object-cover" />
              <span v-else>{{ profileInitials }}</span>
            </span>
            <span v-if="!sidebarCollapsed" class="min-w-0">
              <span class="tf-sidebar-profile-name block truncate text-sm font-bold leading-4">{{ profileName }}</span>
              <span class="tf-sidebar-profile-email block truncate text-[11px]">{{ savedProfile.email }}</span>
            </span>
          </button>
          <button v-if="!sidebarCollapsed" type="button" class="tf-sidebar-logout" aria-label="Logout" title="Logout" @click="handleLogout">
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('logout')" /></svg>
          </button>
          </div>
        </nav>

      </aside>

      <div :class="['tf-content min-w-0 flex-1 p-4', activePage === 'calendar' ? 'tf-content-calendar' : '']">
        <header :class="['tf-app-header relative z-30 mb-4 flex items-center justify-between gap-4 overflow-visible', activePage === 'dashboard' ? 'tf-dashboard-heading h-[68px] px-1' : 'tf-panel h-[76px] px-5 shadow-none']">
          <div v-if="activePage !== 'dashboard'" class="pointer-events-none absolute inset-y-0 right-0 w-72 bg-gradient-to-l from-task-blueSoft/70 to-transparent" />
          <svg v-if="activePage !== 'dashboard'" viewBox="0 0 180 80" class="pointer-events-none absolute -right-3 top-0 h-full w-52 text-task-blue opacity-[0.08]" fill="none"><path d="M12 79c28-42 48-5 74-40s57 20 94-34v74H12Z" fill="currentColor" /><circle cx="135" cy="18" r="30" stroke="currentColor" stroke-width="2" /></svg>
          <button type="button" class="tf-icon-button md:hidden" aria-label="Open menu" @click="mobileSidebarOpen = true">
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          <div class="tf-app-title relative z-10 flex min-w-0 flex-1 items-center gap-3.5">
            <span v-if="activePage !== 'dashboard'" :class="['grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-gradient-to-br shadow-sm ring-1 ring-white/70', pageAccentClass]">
              <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path :d="iconPath(pageIconName)" /></svg>
            </span>
            <div class="min-w-0"><h1 :class="['truncate font-bold', activePage === 'dashboard' ? 'text-[22px]' : 'text-lg']">{{ activePage === 'dashboard' ? dashboardGreeting : pageCopy[activePage].title }}</h1><p class="mt-1 truncate text-xs text-task-muted">{{ pageCopy[activePage].subtitle }}</p></div>
          </div>
          <div class="relative z-10 flex items-center gap-3">
            <label v-if="false" class="relative hidden sm:block">
              <svg viewBox="0 0 24 24" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-task-muted" fill="none" stroke="currentColor" stroke-width="1.7"><path :d="iconPath('search')" /></svg>
              <input v-model="taskSearchInput" class="tf-input w-[230px] pl-9 pr-10" placeholder="Search tasks..." @focus="focusTaskSearch" @input="focusTaskSearch" />
              <button v-if="taskSearchInput && !searchLoading.task" type="button" class="tf-search-clear" aria-label="Clear search" @click="clearSearch('task')">×</button>
              <span v-if="searchLoading.task" class="tf-search-spinner" />
            </label>
            <NotificationCenter @navigate="navigateFromNotification" />
            <button type="button" class="tf-theme-button" :aria-label="isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme'" :aria-pressed="isDarkTheme" :title="isDarkTheme ? 'Light theme' : 'Dark theme'" @click="toggleTheme">
              <svg viewBox="0 0 24 24" class="h-[17px] w-[17px]" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath(isDarkTheme ? 'sun' : 'moon')" /></svg>
            </button>
          </div>
        </header>

        <section v-if="activePage === 'dashboard'" class="space-y-4">
          <div class="tf-dashboard-stats grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
            <article v-for="(item, index) in stats" :key="String(item[1])" :class="['tf-panel tf-summary-card border p-4 shadow-none', `tf-summary-card--${index}`]">
              <div class="flex items-center gap-2.5"><span class="tf-summary-icon grid h-9 w-9 place-items-center rounded-[11px]"><svg viewBox="0 0 24 24" class="h-[17px] w-[17px]" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path :d="index === 1 ? 'm6 12 4 4 8-9' : index === 2 ? 'M12 7v5l3 2m7-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' : index === 4 ? 'M4 8h16l-1 12H5L4 8Zm2-4h12l2 4H4l2-4Zm4 8h4' : index === 5 ? 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-2-12v6m4-6v6' : index === 6 ? 'M12 9v4m0 4h.01M4.5 19h15L12 4 4.5 19Z' : index === 3 ? 'M6 4h12v16H6V4Zm4 5h4m-4 3h4' : 'M5 4h14v16H5V4Zm4 4h6m-6 4h6'" /></svg></span><p class="text-[11px] font-semibold text-task-muted">{{ item[1] }}</p></div>
              <p class="mt-3 text-2xl font-extrabold text-task-ink">{{ item[0] }}</p>
              <div class="mt-3 flex items-center gap-2 text-[11px] font-bold"><span class="tf-summary-percent">{{ Number(item[2] || 0).toFixed(0) }}%</span><div class="tf-summary-track h-1.5 flex-1 overflow-hidden rounded-full"><div class="tf-summary-progress h-full rounded-full" :style="{ width: `${Math.min(100, Number(item[2] || 0))}%` }" /></div></div>
            </article>
          </div>
          <div class="grid items-stretch gap-4 xl:grid-cols-3">
            <section v-for="panel in [{ title: 'Today’s Events', items: dashboardTodayEvents, upcoming: false }, { title: 'Upcoming Events', items: dashboardUpcomingEvents, upcoming: true }]" :key="panel.title" class="tf-panel tf-dashboard-list overflow-hidden p-0"><header class="tf-dashboard-list-header"><h2 class="flex items-center gap-2 font-bold"><span class="tf-section-icon">▣</span>{{ panel.title }}</h2><span class="tf-pill bg-task-blueSoft text-task-blue">{{ panel.items.length }}</span></header><div class="tf-dashboard-list-body divide-y divide-task-line"><article v-for="event in panel.items" :key="String(event.id)" class="tf-dashboard-list-row"><time class="tf-event-date grid h-11 min-w-14 place-items-center rounded-[9px] bg-task-blueSoft px-2 text-xs font-bold text-task-blue">{{ panel.upcoming ? dashboardDateTime(event.starts_at).split(' ').slice(0, 2).join(' ') : dashboardDateTime(event.starts_at, 'time') }}</time><div class="min-w-0 flex-1"><p class="truncate text-sm font-bold">{{ event.title }}</p><p class="mt-1 truncate text-xs text-task-muted">{{ event.department?.name || 'No department' }} · {{ event.location || 'Online' }}</p></div><span v-if="panel.upcoming" class="text-xs text-task-muted">{{ dashboardDateTime(event.starts_at, 'time') }} ›</span></article><div v-if="!panel.items.length" class="tf-empty-events"><EmptyCalendarArt /><p>No events scheduled for today.</p><small>Enjoy your free time! 🎉</small></div></div></section>
            <section class="tf-panel tf-dashboard-list overflow-hidden p-0"><header class="tf-dashboard-list-header"><h2 class="font-bold">Upcoming Deadlines</h2><button type="button" class="text-xs font-bold text-task-blue" @click="setPage('tasks')">View all</button></header><div class="tf-dashboard-list-body divide-y divide-task-line"><article v-for="task in dashboardDeadlines" :key="String(task.id)" class="tf-dashboard-list-row"><span :class="['h-2.5 w-2.5 shrink-0 rounded-full', task.priority === 'high' ? 'bg-task-danger' : task.priority === 'medium' ? 'bg-task-warning' : 'bg-task-success']" /><div class="min-w-0 flex-1"><p class="truncate text-sm font-bold">{{ task.title }}</p><p class="mt-1 truncate text-xs text-task-muted">{{ task.department?.name || 'No department' }}</p></div><div class="text-right"><p class="text-xs font-bold">{{ dashboardDateTime(task.due_date) }}</p><p class="mt-1 text-[10px] font-semibold text-task-warning">{{ task.days_remaining }} days left</p></div></article><div v-if="!dashboardDeadlines.length" class="tf-empty-events"><p>No upcoming deadlines.</p><small>You are all caught up.</small></div></div></section>
          </div>
          <div class="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
            <section class="tf-panel p-5">
              <h2 class="flex items-center gap-2 font-bold"><span class="tf-section-icon">◴</span>Tasks by Department</h2>
              <p class="mt-1 text-xs text-task-muted">Role-filtered task distribution</p>
              <div v-if="dashboardDepartments.length" class="mt-5 flex items-center gap-6">
                <div class="tf-department-donut"><span><b>{{ dashboardDepartmentTotal }}</b><small>Total</small></span></div>
                <div class="min-w-0 flex-1 space-y-4">
                  <div v-for="department in dashboardDepartments" :key="String(department.department_id)">
                    <div class="mb-2 flex items-center justify-between text-xs">
                      <span class="flex items-center gap-2 font-semibold"><i class="h-2 w-2 rounded-full bg-task-blue" />{{ department.department_name }}</span>
                      <span><b>{{ department.task_count }}</b> ({{ Number(department.percentage).toFixed(0) }}%)</span>
                    </div>
                    <div class="h-1.5 overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full bg-task-blue" :style="{ width: `${Math.min(100, Number(department.percentage))}%` }" /></div>
                  </div>
                </div>
              </div>
              <p v-else class="py-10 text-center text-sm text-task-muted">No department statistics available.</p>
            </section>
            <section class="tf-panel overflow-hidden p-0"><header class="flex items-center justify-between border-b border-task-line px-5 py-4"><div><h2 class="font-bold">Recent Tasks</h2><p class="mt-1 text-xs text-task-muted">Latest activity</p></div><button type="button" class="text-xs font-bold text-task-blue" @click="setPage('tasks')">View all</button></header><div class="overflow-x-auto"><table class="w-full min-w-[620px] text-left text-sm"><thead class="bg-slate-50 text-xs text-task-muted"><tr><th class="px-5 py-3">Task</th><th class="px-4 py-3">Department</th><th class="px-4 py-3">Created</th><th class="px-5 py-3">Status</th></tr></thead><tbody class="divide-y divide-task-line"><tr v-for="task in dashboardRecentTasks" :key="String(task.id)"><td class="px-5 py-3.5 font-semibold">{{ task.title }}</td><td class="px-4 py-3.5 text-task-muted">{{ task.department?.name || '—' }}</td><td class="px-4 py-3.5 text-task-muted">{{ dashboardDateTime(task.created_at) }}</td><td class="px-5 py-3.5"><span :class="['tf-pill', badgeClass(dashboardStatus(task.status))]">{{ dashboardStatus(task.status) }}</span></td></tr></tbody></table><p v-if="!dashboardRecentTasks.length" class="py-10 text-center text-sm text-task-muted">No recent tasks.</p></div></section>
          </div>
          <p v-if="dashboardGeneratedAt" class="text-right text-[11px] text-task-muted">Last updated {{ dashboardDateTime(dashboardGeneratedAt) }} at {{ dashboardDateTime(dashboardGeneratedAt, 'time') }}</p>
        </section>

        <section v-if="false" class="space-y-4">
          <div class="grid gap-4 xl:h-[429px] xl:grid-cols-[minmax(0,1fr)_399px] xl:items-stretch">
          <div class="grid gap-4 xl:grid-rows-[180px_233px]">
            <div class="tf-panel grid min-h-[132px] gap-3 p-4 sm:min-h-[180px] sm:grid-cols-4 sm:gap-4 sm:p-5 xl:h-full xl:min-h-0">
              <div v-for="(item, index) in stats" :key="String(item[1])" :class="['group relative flex h-[118px] min-w-0 flex-col justify-between overflow-hidden rounded-[18px] border bg-gradient-to-br p-4 sm:h-[138px]', dashboardStatStyles[index]?.card]">
                <div :class="['grid h-10 w-10 place-items-center rounded-full bg-white/85 shadow-[0_4px_14px_-8px_rgba(15,23,42,.35)] ring-1', dashboardStatStyles[index]?.icon]"><svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="index === 0 ? iconPath('folder') : index === 1 ? 'M4 13h4l2-7 4 13 2-6h4' : index === 2 ? 'M12 2c1 5 5 6 8 7-2 7-7 11-8 13-1-2-6-6-8-13 3-1 7-2 8-7Zm0 7v6m-3-3h6' : 'M12 8v5m0 4h.01M5 20h14L12 3 5 20Z'" /></svg></div>
                <div><div class="text-2xl font-bold leading-none sm:text-[28px]">{{ item[0] }} <span v-if="item[3]" class="text-sm">{{ item[3] }}</span></div><p class="mt-1.5 text-xs font-medium text-task-muted">{{ item[1] }}</p></div>
                <svg viewBox="0 0 90 35" class="absolute bottom-2.5 right-2.5 h-9 w-[86px] opacity-75 transition group-hover:scale-105" fill="none" :class="dashboardStatStyles[index]?.line"><path d="M3 30 22 17l18 4 18-7 14-11 15 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /><circle cx="87" cy="7" r="2.5" fill="currentColor" /></svg>
              </div>
            </div>

            <div class="tf-panel min-h-[190px] p-4 sm:min-h-[233px] sm:p-6 xl:h-full xl:min-h-0">
              <div class="mb-4 flex items-start justify-between sm:mb-6">
                <div><h2 class="text-[20px] font-medium leading-[120%]">Task Status Distribution</h2></div>
              </div>
              <div class="grid gap-0 divide-y divide-task-line md:grid-cols-3 md:divide-x md:divide-y-0">
                <div v-for="(item, index) in taskStatusCounts" :key="item[0]" class="px-1 py-4 first:pt-0 md:px-6 md:py-0 md:first:pl-0 md:last:pr-0">
                  <div class="flex items-center gap-3"><span :class="['grid h-8 w-8 place-items-center rounded-full text-white shadow-sm', item[2]]"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path :d="index === 0 ? 'M8 7h8M8 12h5M5 3h14v18H5V3Z' : index === 1 ? 'm6 12 4 4 8-9' : 'M12 7v5m0 4h.01M5 20h14L12 3 5 20Z'" /></svg></span><div><p class="text-sm font-semibold text-task-muted">{{ item[0] }}</p><p class="mt-0.5 text-xl font-bold">{{ item[1] }}</p></div></div>
                  <div :class="['mt-4 h-2 overflow-hidden rounded-full', item[3]]"><div :class="['h-full rounded-full', item[2]]" :style="{ width: item[1] }" /></div>
                </div>
              </div>
            </div>


          </div>

          <aside class="space-y-4 xl:h-full">
            <div class="tf-panel flex min-h-[429px] w-full flex-col p-5 xl:h-full xl:min-h-0">
              <div class="mb-4 flex items-start justify-between"><div><h2 class="text-lg font-bold">Task Priority</h2><p class="mt-1 text-sm text-task-muted">Distribution by priority level</p></div><div class="relative"><button type="button" class="tf-icon-button h-10 w-10 rounded-full" @click="toggleActionMenu('priority-actions')"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path :d="iconPath('dots')" /></svg></button><div v-if="actionMenu === 'priority-actions'" class="tf-action-menu min-w-44 text-base"><button type="button" class="tf-action-item" @click="setPage('analytics'); actionMenu = null">View Details</button><button type="button" class="tf-action-item" @click="actionMenu = null">Change Date Range</button><button type="button" class="tf-action-item" @click="actionMenu = null">Refresh</button></div></div></div>
              <div class="relative mx-auto my-3 h-[190px] w-[190px]" @mouseleave="activePrioritySegment = null">
                <svg viewBox="0 0 190 190" class="h-full w-full -rotate-90 overflow-visible" role="img" aria-label="Task priority distribution chart">
                  <circle cx="95" cy="95" r="70" fill="none" stroke="#EEF3F8" stroke-width="26" />
                  <circle v-for="segment in prioritySegments" :key="segment.key" cx="95" cy="95" r="70" fill="none" :stroke="segment.color" :stroke-width="activePrioritySegment === segment.key ? 31 : 26" stroke-linecap="butt" :stroke-dasharray="`${(segment.percent / 100) * priorityCircleLength} ${priorityCircleLength}`" :stroke-dashoffset="`${-(segment.offset / 100) * priorityCircleLength}`" class="cursor-pointer transition-all duration-200" tabindex="0" :aria-label="`${segment.label}: ${segment.count} tasks, ${Math.round(segment.percent)} percent`" @mouseenter="activePrioritySegment = segment.key" @focus="activePrioritySegment = segment.key" @blur="activePrioritySegment = null"><title>{{ segment.label }}: {{ segment.count }} tasks ({{ Math.round(segment.percent) }}%)</title></circle>
                </svg>
                <div v-if="activePriorityData" class="pointer-events-none absolute left-1/2 top-1/2 min-w-24 -translate-x-1/2 -translate-y-1/2 rounded-[12px] border border-task-line bg-white px-3 py-2 text-center shadow-lg"><p class="text-xs font-bold text-task-ink">{{ activePriorityData.label }}</p><p class="mt-0.5 text-[11px] text-task-muted">{{ activePriorityData.count }} · {{ Math.round(activePriorityData.percent) }}%</p></div>
              </div>
              <div class="mt-auto grid grid-cols-2 gap-x-4 gap-y-3 text-xs font-medium text-task-muted"><span><b class="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-task-blue" />High: <span class="font-bold text-task-ink">{{ priorityCounts.high }}</span></span><span><b class="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#4B96C1]" />Medium: <span class="font-bold text-task-ink">{{ priorityCounts.medium }}</span></span><span><b class="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#DCE8F4]" />Low: <span class="font-bold text-task-ink">{{ priorityCounts.low }}</span></span></div>
            </div>
          </aside>
          </div>

          <div class="grid items-stretch gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div class="tf-panel flex min-h-[260px] flex-col p-5">
                <div class="mb-4 flex items-start justify-between">
                  <div><h2 class="text-[20px] font-medium leading-[120%]">Team Activity</h2><p class="text-[16px] font-normal leading-[120%] text-task-muted">Understand your team productivity and workload.</p></div>
                  <div class="relative">
                    <button type="button" class="tf-icon-button" @click="toggleActionMenu('dashboard-activity')"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path :d="iconPath('dots')" /></svg></button>
                    <div v-if="actionMenu === 'dashboard-activity'" class="tf-action-menu">
                      <button type="button" class="tf-action-item" @click="setPage('team'); actionMenu = null">View team</button>
                      <button type="button" class="tf-action-item" @click="actionMenu = null">Refresh</button>
                    </div>
                  </div>
                </div>
                <div class="mb-4 flex items-end gap-3"><span class="text-3xl font-bold">{{ stats[1]?.[0] || '0%' }}</span><span class="mb-1 text-xs text-task-muted">from backend</span></div>
                <div class="grid grid-cols-[40px_1fr] gap-2">
                  <div class="grid h-[156px] grid-rows-4 text-xs text-task-muted"><span>10.00</span><span>09.30</span><span>09.00</span><span>08.00</span></div>
                  <div>
                    <div v-if="heatmap.length" class="grid grid-cols-[repeat(7,49.57px)] gap-x-2.5 gap-y-4">
                      <div v-for="(cell, index) in heatmap" :key="index" :class="['h-[46px] w-[49.57px] rounded-[8px]', cell === 0 ? 'bg-slate-100' : cell < 3 ? 'bg-[#CFE0F2]' : cell < 5 ? 'bg-[#7EA7D3]' : 'bg-task-blue']" />
                    </div>
                    <p v-else class="py-12 text-center text-sm text-task-muted">No activity data.</p>
                    <div v-if="heatmap.length" class="mt-3 grid grid-cols-[repeat(7,49.57px)] gap-x-2.5 text-center text-xs text-task-muted"><span>Sat</span><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span></div>
                  </div>
                </div>
              </div>

              <div class="tf-panel flex min-h-[260px] flex-col overflow-hidden p-5">
                <div class="mb-4 flex items-center justify-between"><h2 class="text-[20px] font-medium leading-[120%]">Team Workload</h2><button type="button" class="text-xs font-bold text-task-blue" @click="setPage('team')">See All</button></div>
                <table class="w-full flex-1 text-left text-sm">
                  <thead class="rounded-ui bg-slate-100 text-xs text-task-muted"><tr><th class="p-3">Name</th><th class="p-3">Active work</th><th class="p-3">Overdue</th><th class="p-3">Status</th><th class="p-3 text-right">Action</th></tr></thead>
                  <tbody class="divide-y divide-task-line">
                    <tr v-for="member in workload" :key="member[0]">
                      <td class="py-3"><div class="flex items-center gap-3"><div class="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-slate-200 to-slate-400 text-xs font-bold text-white">{{ initials(String(member[0])) }}</div><div><p class="font-semibold">{{ member[0] }}</p><p class="text-xs text-task-muted">{{ member[1] }}</p></div></div></td>
                      <td>{{ member[2] }}</td><td>{{ member[3] }}</td><td><span :class="['tf-pill', badgeClass(String(member[4]))]">{{ member[4] }}</span></td><td class="relative text-right"><div class="relative inline-flex"><button type="button" class="tf-icon-button" @click="toggleActionMenu(`workload-${member[0]}`)"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path :d="iconPath('dots')" /></svg></button><div v-if="actionMenu === `workload-${member[0]}`" class="tf-action-menu"><button type="button" class="tf-action-item" @click="setPage('team'); actionMenu = null">View profile</button><button type="button" class="tf-action-item" @click="notify('Messages section is disabled for now'); actionMenu = null">Message</button></div></div></td>
                    </tr>
                  </tbody>
                </table>
                <p v-if="!workload.length" class="py-10 text-center text-sm text-task-muted">No workload data.</p>
              </div>
            </div>
        </section>

        <section v-else-if="activePage === 'tasks'" class="tf-panel relative p-4 sm:p-5">
          <div class="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div><h2 class="text-lg font-bold">Task Board</h2><p class="mt-1 text-xs text-task-muted">Organize tasks and move them through each stage</p></div>
            <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <div v-if="taskScope !== 'archived'" class="inline-flex h-11 shrink-0 items-center rounded-[12px] border border-task-line bg-slate-50 p-1" role="tablist" aria-label="Board section">
                <button type="button" role="tab" :aria-selected="taskBoardSection === 'board'" :class="['h-9 rounded-[9px] px-3 text-xs font-bold transition', taskBoardSection === 'board' ? 'bg-white text-task-blue shadow-sm' : 'text-task-muted hover:text-task-ink']" @click="taskBoardSection = 'board'">Board</button>
                <button type="button" role="tab" :aria-selected="taskBoardSection === 'backlog'" :class="['inline-flex h-9 items-center gap-2 rounded-[9px] px-3 text-xs font-bold transition', taskBoardSection === 'backlog' ? 'bg-white text-task-blue shadow-sm' : 'text-task-muted hover:text-task-ink']" @click="taskBoardSection = 'backlog'"><span>Backlog</span><span class="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px]">{{ backlogTasks.length }}</span></button>
              </div>
              <div class="inline-flex h-11 shrink-0 items-center rounded-[12px] border border-task-line bg-slate-50 p-1" role="tablist" aria-label="Task scope">
                <button v-if="currentRole.toLowerCase() !== 'member'" type="button" role="tab" :aria-selected="taskScope === 'all'" :disabled="taskScopeLoading" :class="['h-9 rounded-[9px] px-3 text-xs font-bold transition disabled:opacity-60', taskScope === 'all' ? 'bg-white text-task-blue shadow-sm' : 'text-task-muted hover:text-task-ink']" @click="loadTaskScope('all')">All Tasks</button>
                <button type="button" role="tab" :aria-selected="taskScope === 'mine'" :disabled="taskScopeLoading" :class="['h-9 rounded-[9px] px-3 text-xs font-bold transition disabled:opacity-60', taskScope === 'mine' ? 'bg-white text-task-blue shadow-sm' : 'text-task-muted hover:text-task-ink']" @click="loadTaskScope('mine')">My Tasks</button>
                <button v-if="canManageDepartment" type="button" role="tab" :aria-selected="taskScope === 'archived'" :disabled="taskScopeLoading" :class="['h-9 rounded-[9px] px-3 text-xs font-bold transition disabled:opacity-60', taskScope === 'archived' ? 'bg-white text-task-blue shadow-sm' : 'text-task-muted hover:text-task-ink']" @click="loadTaskScope('archived')">Archive</button>
              </div>
              <div v-if="taskBoardSection === 'board'" class="inline-flex h-11 shrink-0 items-center gap-2" role="tablist" aria-label="Task view">
                <button type="button" role="tab" :aria-selected="taskViewMode === 'list'" :class="['inline-flex h-11 items-center gap-2 rounded-[12px] border px-4 text-sm font-semibold transition-all duration-200', taskViewMode === 'list' ? 'border-task-blue bg-task-blueSoft text-task-blue shadow-sm' : 'border-task-line bg-white text-task-muted hover:border-task-blue hover:text-task-blue']" @click="taskViewMode = 'list'">
                  <svg viewBox="0 0 20 20" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6.5 5h10M6.5 10h10M6.5 15h10" /><circle cx="3" cy="5" r=".7" fill="currentColor" stroke="none" /><circle cx="3" cy="10" r=".7" fill="currentColor" stroke="none" /><circle cx="3" cy="15" r=".7" fill="currentColor" stroke="none" /></svg>
                  List
                </button>
                <button type="button" role="tab" :aria-selected="taskViewMode === 'kanban'" :class="['inline-flex h-11 items-center gap-2 rounded-[12px] border px-4 text-sm font-semibold transition-all duration-200', taskViewMode === 'kanban' ? 'border-task-blue bg-task-blueSoft text-task-blue shadow-sm' : 'border-task-line bg-white text-task-muted hover:border-task-blue hover:text-task-blue']" @click="taskViewMode = 'kanban'">
                  <svg viewBox="0 0 20 20" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="2.5" y="3" width="4" height="14" rx="1.2" /><rect x="8" y="3" width="4" height="9" rx="1.2" /><rect x="13.5" y="3" width="4" height="12" rx="1.2" /></svg>
                  Kanban
                </button>
              </div>
              <label class="relative w-full sm:w-auto">
                <svg viewBox="0 0 24 24" class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-task-muted" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('search')" /></svg>
                <input v-model="taskSearchInput" class="tf-input h-11 w-full pl-10 pr-10 sm:w-64" placeholder="Search tasks..." />
                <button v-if="taskSearchInput && !searchLoading.task" type="button" class="tf-search-clear" aria-label="Clear task search" @click="clearSearch('task')">×</button>
                <span v-if="searchLoading.task" class="tf-search-spinner" />
              </label>
              <div class="tf-dropdown w-full sm:w-auto">
                <button type="button" class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-task-line bg-white px-4 text-sm font-semibold text-task-ink transition hover:border-task-blue hover:text-task-blue sm:w-auto" @click="openDropdown = openDropdown === 'taskPriority' ? null : 'taskPriority'">
                  <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('filter')" /></svg>
                  <span>{{ dropdownValues.priority === 'All Priorities' ? 'Filter' : dropdownValues.priority }}</span>
                </button>
                <div v-if="openDropdown === 'taskPriority'" class="tf-dropdown-menu min-w-52">
                  <button v-for="option in dropdownOptions.priority" :key="option" type="button" class="tf-dropdown-option" @click="setDropdownValue('priority', option)">
                    <span>{{ option }}</span>
                    <span v-if="dropdownValues.priority === option">✓</span>
                  </button>
                </div>
              </div>
              <button v-if="canAddTask && taskScope !== 'archived'" class="group inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#347FE0] to-[#2567AD] px-5 text-sm font-bold text-white shadow-[0_10px_22px_-10px_rgba(37,103,173,0.75)] transition duration-200 hover:-translate-y-0.5 active:translate-y-0 sm:w-auto" type="button" @click="openModal('task')">
                <svg viewBox="0 0 24 24" class="h-4 w-4 transition group-hover:rotate-90" fill="none" stroke="currentColor" stroke-width="2.2"><path :d="iconPath('plus')" /></svg>
                <span>New Task</span>
              </button>
            </div>
          </div>
          <div v-if="searchLoading.task || taskScopeLoading" class="tf-search-overlay"><span class="tf-search-loader" /> {{ taskScopeLoading ? 'Loading tasks...' : 'Searching tasks...' }}</div>
          <div v-if="taskScope === 'archived'" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <article v-for="task in paginatedTasks" :key="String(task[6])" class="tf-archive-card rounded-[16px] border p-4 transition hover:shadow-card">
              <div class="flex items-start justify-between gap-3"><div class="min-w-0"><span class="tf-archive-badge inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide">Archived</span><h3 class="mt-2 line-clamp-2 font-bold text-task-ink">{{ task[0] }}</h3></div><button v-if="canManageDepartment" type="button" class="tf-archive-restore inline-flex h-9 shrink-0 items-center gap-2 rounded-[10px] border px-3 text-xs font-bold text-task-blue transition" @click="unarchiveTask(task)"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M4 7h16v13H4V7Zm-1-4h18v4H3V3Zm6 9h6" /></svg>Restore</button></div>
              <div class="mt-4 flex flex-wrap gap-2"><span :class="['tf-pill', badgeClass(String(task[2]))]">{{ task[2] }}</span><span :class="['tf-pill', badgeClass(String(task[3]))]">{{ task[3] }}</span></div>
              <div class="mt-4 flex items-center justify-between border-t border-task-line pt-3 text-xs text-task-muted"><span>{{ task[1] }}</span><span>Archived {{ task[15] ? dashboardDateTime(task[15]) : '—' }}</span></div>
            </article>
            <div v-if="!paginatedTasks.length" class="col-span-full rounded-[16px] border border-dashed border-task-line py-16 text-center"><p class="font-semibold text-task-ink">Archive is empty</p><p class="mt-1 text-sm text-task-muted">Completed tasks can be archived here.</p></div>
          </div>
          <div v-else-if="taskBoardSection === 'backlog'" class="tf-backlog-panel rounded-[16px] border p-4 sm:p-5">
            <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 class="font-bold text-task-ink">Backlog</h3><p class="mt-1 text-xs text-task-muted">Ideas and tasks planned for later. Move a task to To Do when it is ready.</p></div><button v-if="canAddTask" type="button" class="tf-primary h-10 rounded-[11px]" @click="openModal('task')"><span class="text-lg leading-none">+</span>New Task</button></div>
            <div v-if="backlogTasks.length" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <article v-for="task in backlogTasks" :key="String(task[6] || `${task[0]}-${task[4]}`)" class="tf-kanban-card cursor-pointer" @click="openTaskFromCard(task)">
                <div class="flex items-start justify-between gap-3"><div class="min-w-0"><span class="inline-flex rounded-full bg-slate-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">For later</span><h4 class="mt-2 line-clamp-2 text-sm font-bold text-task-ink">{{ task[0] }}</h4></div><span :class="['tf-pill shrink-0', badgeClass(String(task[2]))]">{{ task[2] }}</span></div>
                <div class="mt-4 flex items-center justify-between border-t border-task-line pt-3 text-xs text-task-muted"><span>{{ task[4] }}</span><button type="button" class="font-bold text-task-blue transition hover:text-task-blueDark" :disabled="updatingTaskId === String(task[6]) || !task[6]" @click.stop="updateTaskStatus(task, 'not_started')">Move to To Do →</button></div>
              </article>
            </div>
            <div v-else class="rounded-[14px] border border-dashed border-task-line px-5 py-14 text-center"><p class="font-semibold text-task-ink">Backlog is empty</p><p class="mt-1 text-sm text-task-muted">Tasks planned for later will appear here.</p></div>
          </div>
          <div v-else-if="taskViewMode === 'list'">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-100 text-task-muted"><tr><th class="rounded-l-ui p-3">Task</th><th class="p-3">Assignee</th><th class="p-3">Priority</th><th class="p-3">Status</th><th class="p-3">Due Date</th><th class="p-3">Progress</th><th class="rounded-r-ui p-3 text-right">Actions</th></tr></thead>
            <tbody class="divide-y divide-task-line">
              <tr v-for="task in paginatedTasks" :key="String(task[6] || `${task[0]}-${task[4]}`)" class="cursor-pointer" @click="openTaskFromCard(task)">
                <td class="p-3 text-task-muted">{{ task[0] }}</td><td class="p-3"><div class="flex items-center gap-2"><div class="flex -space-x-2"><span v-for="i in 2" :key="i" class="grid h-6 w-6 place-items-center rounded-full border border-white bg-slate-300 text-[9px] font-bold text-white">{{ String(task[1]).slice(i - 1, i) }}</span></div>{{ task[1] }}</div></td><td class="p-3"><span :class="['tf-pill', badgeClass(String(task[2]))]">{{ task[2] }}</span></td><td class="p-3"><span :class="['tf-pill', badgeClass(String(task[3]))]">{{ task[3] }}</span></td><td class="p-3 text-task-muted">{{ task[4] }}</td><td class="p-3"><div class="flex items-center gap-2"><div class="h-2 w-20 rounded-full bg-slate-200"><div class="h-full rounded-full bg-task-blue" :style="{ width: `${task[5]}%` }" /></div><span>{{ task[5] }}%</span></div></td><td class="relative p-3 text-right"><div class="relative inline-flex"><button type="button" class="tf-icon-button" @click="toggleActionMenu(`task-${task[0]}`)"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path :d="iconPath('dots')" /></svg></button><div v-if="actionMenu === `task-${task[0]}`" class="tf-action-menu"><button type="button" class="tf-action-item" @click="actionMenu = null">View</button><button type="button" class="tf-action-item" @click="runAction('edit', 'task', String(task[0]))">Edit</button><button type="button" class="tf-action-item" @click="runAction('duplicate', 'task', String(task[0]))">Duplicate</button><button type="button" class="tf-action-item tf-action-danger" @click="runAction('delete', 'task', String(task[0]))">Delete</button></div></div></td>
              </tr>
            </tbody>
          </table>
          </div>
          <div v-else>
            <div class="mb-3 flex items-center gap-2 text-xs text-task-muted"><svg viewBox="0 0 24 24" class="h-4 w-4 text-task-blue" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 7h8M8 12h8M8 17h5M4 4h16v16H4V4Z" /></svg><span>Drag and drop task cards to change their status.</span></div>
            <div class="tf-kanban-board">
            <section
              v-for="column in kanbanColumns"
              :key="column.key"
              class="tf-kanban-column"
              :style="{ '--column-accent': column.color, '--column-soft': column.softColor }"
              @dragover.prevent
              @drop.prevent="dropTaskInColumn(column.key)"
            >
              <header class="tf-kanban-column-header">
                <div class="flex min-w-0 items-start gap-2.5">
                    <span class="tf-kanban-status-dot" />
                    <div class="min-w-0"><h3 class="text-[15px] font-bold tracking-[-0.01em] text-slate-900">{{ column.label }}</h3><p class="mt-0.5 truncate text-[10px] font-medium text-task-muted">{{ column.description }}</p></div>
                </div>
                <div class="flex items-center gap-2"><span class="tf-kanban-count">{{ column.tasks.length }}</span><button type="button" class="tf-kanban-add" aria-label="Column menu"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path :d="iconPath('dots')" /></svg></button></div>
              </header>
              <div class="tf-kanban-column-scroll space-y-2.5">
                <article
                  v-for="task in column.tasks"
                  :key="String(task[6] || `${task[0]}-${task[4]}`)"
                  :draggable="Boolean(task[6])"
                  :class="['tf-kanban-card group', updatingTaskId === String(task[6]) ? 'pointer-events-none opacity-60' : '']"
                  @dragstart="draggedTaskId = String(task[6] || '')"
                  @dragend="draggedTaskId = ''"
                  @click="openTaskFromCard(task)"
                >
                  <div class="flex items-start justify-between gap-3"><h4 class="line-clamp-2 text-[14px] font-bold leading-[1.4] tracking-[-0.01em] text-slate-900">{{ task[0] }}</h4><span v-if="column.key === 'completed'" class="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-task-success/40 bg-task-successSoft text-task-success"><svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m6 12 4 4 8-9" /></svg></span></div>
                  <p v-if="task[7]" class="mt-2 inline-flex max-w-full items-center gap-1.5 truncate text-xs font-medium text-slate-500"><svg viewBox="0 0 24 24" class="h-3.5 w-3.5 shrink-0 text-task-blue" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('folder')" /></svg>{{ task[7] }}</p>

                  <div v-if="column.key !== 'in_progress'" class="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3">
                    <span class="inline-flex min-w-0 flex-1 items-center gap-1.5 truncate text-[11px] font-medium text-slate-400">
                      <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 3v3m10-3v3M4.5 9.5h15M6.5 5h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /></svg>
                      {{ task[4] }}
                    </span>
                    <span v-if="column.key !== 'completed'" :class="['tf-kanban-priority', badgeClass(String(task[2]))]">{{ task[2] }}</span>
                    <span class="flex shrink-0 -space-x-2">
                      <span v-for="member in taskAssigneeDetailsOf(task).slice(0, 3)" :key="String(member.id || member.email || projectMemberName(member))" class="tf-kanban-avatar overflow-hidden" :title="projectMemberName(member)"><img v-if="member.avatar" :src="member.avatar" :alt="projectMemberName(member)" class="h-full w-full object-cover" /><span v-else>{{ initials(projectMemberName(member)) }}</span></span>
                      <span v-if="!taskAssigneeDetailsOf(task).length" class="tf-kanban-avatar" :title="String(task[1])">{{ initials(String(task[1])) }}</span>
                      <span v-if="taskAssigneeDetailsOf(task).length > 3" class="tf-kanban-avatar bg-task-blue text-white">+{{ taskAssigneeDetailsOf(task).length - 3 }}</span>
                    </span>
                  </div>

                  <div v-else class="mt-4 flex items-center gap-2.5 border-t border-slate-100 pt-3">
                    <span class="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-slate-400"><svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 7h8M8 12h5M5 3h14v18H5V3Z" /></svg>{{ Math.max(1, Math.round(Number(task[5] || 0) / 20)) }}/5</span>
                    <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full bg-task-blue transition-all duration-500" :style="{ width: `${task[5]}%` }" /></div>
                    <span class="w-8 text-right text-[10px] font-bold text-slate-400">{{ task[5] }}%</span>
                    <span class="flex shrink-0 -space-x-2">
                      <span v-for="member in taskAssigneeDetailsOf(task).slice(0, 3)" :key="String(member.id || member.email || projectMemberName(member))" class="tf-kanban-avatar overflow-hidden" :title="projectMemberName(member)"><img v-if="member.avatar" :src="member.avatar" :alt="projectMemberName(member)" class="h-full w-full object-cover" /><span v-else>{{ initials(projectMemberName(member)) }}</span></span>
                      <span v-if="!taskAssigneeDetailsOf(task).length" class="tf-kanban-avatar" :title="String(task[1])">{{ initials(String(task[1])) }}</span>
                      <span v-if="taskAssigneeDetailsOf(task).length > 3" class="tf-kanban-avatar bg-task-blue text-white">+{{ taskAssigneeDetailsOf(task).length - 3 }}</span>
                    </span>
                  </div>

                  <select class="tf-kanban-status-select" :value="column.key" :disabled="updatingTaskId === String(task[6]) || !task[6]" aria-label="Change task status" @click.stop @change="updateTaskStatus(task, ($event.target as HTMLSelectElement).value)">
                    <option value="backlog">Backlog</option>
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button v-if="column.key === 'completed' && canManageDepartment" type="button" class="mt-3 inline-flex h-8 w-full items-center justify-center gap-2 rounded-[9px] border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 transition hover:border-task-blue hover:bg-task-blueSoft hover:text-task-blue" @click.stop="archiveTask(task)"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M4 7h16v13H4V7Zm-1-4h18v4H3V3Zm6 9h6" /></svg>Archive</button>
                </article>
                <div v-if="!column.tasks.length" class="tf-kanban-empty flex-col gap-1.5"><span class="font-semibold text-slate-500">Drop tasks here</span><button v-if="canAddTask" type="button" class="font-bold text-task-blue" @click="openModal('task')">+ New task</button><span v-else class="text-[10px] text-task-muted">No tasks</span></div>
                <button v-else-if="canAddTask" type="button" class="tf-kanban-empty w-full" @click="openModal('task')"><span class="text-lg font-light">+</span><span>Add another task</span></button>
              </div>
            </section>
            </div>
            <button v-if="backlogTasks.length" type="button" class="mt-3 flex w-full items-center justify-between rounded-[12px] border border-task-line bg-task-blueSoft px-4 py-3 text-left text-sm transition hover:border-task-blue" @click="taskBoardSection = 'backlog'">
              <span><b class="text-task-ink">{{ backlogTasks.length }} {{ backlogTasks.length === 1 ? 'task is' : 'tasks are' }} in Backlog</b><span class="ml-2 text-task-muted">Planned for later and not shown in workflow columns.</span></span>
              <span class="shrink-0 font-bold text-task-blue">Open Backlog →</span>
            </button>
          </div>
          <p v-if="!filteredTasks.length" class="py-8 text-center text-sm text-task-muted">No tasks matched your filters.</p>
          <div v-if="filteredTasks.length > pageSize" class="mt-5 flex items-center justify-between text-xs text-task-muted"><span>Showing {{ paginatedTasks.length }} of {{ filteredTasks.length }} Tasks</span><div class="flex gap-2"><button class="tf-icon-button" type="button" @click="setListPage('task', taskPage - 1)">‹</button><button v-for="page in taskPageCount" :key="page" :class="[taskPage === page ? 'tf-primary' : 'tf-icon-button', 'h-9 w-9 p-0']" type="button" @click="setListPage('task', page)">{{ page }}</button><button class="tf-icon-button" type="button" @click="setListPage('task', taskPage + 1)">›</button></div></div>
        </section>

        <section v-else-if="activePage === 'projects'" class="space-y-4">
          <div class="tf-panel grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4">
            <div v-for="(item, index) in projectStats" :key="String(item[1])" :class="['group relative h-36 overflow-hidden rounded-[18px] border bg-gradient-to-br p-5', dashboardStatStyles[index]?.card]">
              <div class="flex items-start gap-4"><span :class="['grid h-12 w-12 shrink-0 place-items-center rounded-[15px] bg-white/85 shadow-sm ring-1', dashboardStatStyles[index]?.icon]"><svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="index === 0 ? iconPath('projects') : index === 1 ? 'M8 2h8M8 22h8M9 2v5l3 3 3-3V2M9 22v-5l3-3 3 3v5' : index === 2 ? 'm5 12 4 4L19 6' : 'M12 9v4m0 4h.01M10.3 3.5 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.5a2 2 0 0 0-3.4 0Z'" /></svg></span><div><p :class="['text-3xl font-bold', index === 0 ? 'text-task-blue' : index === 1 ? 'text-[#8057D5]' : index === 2 ? 'text-task-success' : 'text-task-danger']">{{ item[0] }}</p><p class="mt-1 text-sm font-medium text-task-muted">{{ item[1] }}</p></div></div>
              <div class="absolute bottom-4 left-5 right-5 flex items-end justify-between"><svg viewBox="0 0 90 28" :class="['h-7 w-28', dashboardStatStyles[index]?.line]" fill="none"><path d="M2 23 12 18l10 4 11-10 10 8 12-11 11 9 10-12 12 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg><span class="text-xs font-medium text-task-muted">Live overview</span></div>
            </div>
          </div>
          <div class="tf-panel relative overflow-hidden p-5 sm:p-6">
            <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><h2 class="text-xl font-bold">All Projects</h2><p class="mt-1 text-sm text-task-muted">Track progress, deadlines and assigned team members.</p></div><div class="flex flex-col gap-3 sm:flex-row"><label class="relative w-full sm:w-auto"><svg viewBox="0 0 24 24" class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-task-muted" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('search')" /></svg><input v-model="projectSearchInput" class="tf-input h-11 w-full pl-10 pr-10 sm:w-72" placeholder="Search projects..." /><button v-if="projectSearchInput && !searchLoading.project" type="button" class="tf-search-clear" aria-label="Clear project search" @click="clearSearch('project')">×</button><span v-if="searchLoading.project" class="tf-search-spinner" /></label><div class="tf-dropdown"><button type="button" class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-task-line bg-white px-4 text-sm font-semibold text-task-muted transition hover:border-task-blue hover:text-task-blue sm:w-auto" @click="openDropdown = openDropdown === 'projectFilter' ? null : 'projectFilter'"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('filter')" /></svg>{{ projectPriorityFilter === 'All Priorities' ? 'Filter' : projectPriorityFilter }}</button><div v-if="openDropdown === 'projectFilter'" class="tf-dropdown-menu min-w-48"><button v-for="option in dropdownOptions.priority" :key="option" type="button" class="tf-dropdown-option" @click="projectPriorityFilter = option; openDropdown = null">{{ option }}</button></div></div><button class="tf-primary h-11 w-full rounded-[12px] px-5 sm:w-auto" type="button" @click="openModal('project')"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" /></svg>Create New Project</button></div></div>
            <div v-if="searchLoading.project" class="tf-search-overlay"><span class="tf-search-loader" /> Searching projects...</div>
            <div class="grid gap-4 lg:grid-cols-3">
              <article v-for="(project, index) in paginatedProjects" :key="project[0]" :class="['relative overflow-visible rounded-[16px] border border-task-line bg-white p-5 shadow-[0_8px_25px_-22px_rgba(15,23,42,.5)] transition hover:-translate-y-0.5 hover:shadow-lg', String(project[1]).toLowerCase() === 'completed' ? 'before:bg-task-success' : index % 2 ? 'before:bg-[#8057D5]' : 'before:bg-task-blue', 'before:absolute before:inset-y-0 before:left-0 before:w-1 before:rounded-l-[16px]']">
                <div class="mb-3 flex items-start justify-between"><h3 class="text-lg font-bold">{{ project[0] }}</h3><div class="relative"><button type="button" class="tf-icon-button" @click="toggleActionMenu(`project-${project[0]}`)"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor"><path :d="iconPath('dots')" /></svg></button><div v-if="actionMenu === `project-${project[0]}`" class="tf-action-menu"><button type="button" class="tf-action-item" @click="viewProject(project)">View</button><button v-if="canManageDepartment" type="button" class="tf-action-item" @click="editProject(project)">Edit</button><button v-if="canManageDepartment" type="button" class="tf-action-item" @click="patchProjectStatus(project, 'completed')">Mark Completed</button><button v-if="canManageDepartment" type="button" class="tf-action-item" @click="patchProjectStatus(project, 'archived')">Archive</button><button v-if="canManageDepartment" type="button" class="tf-action-item tf-action-danger" @click="deleteProject(project)">Delete</button></div></div></div>
                <div class="mb-4 flex gap-2"><span :class="['tf-pill', badgeClass(String(project[1]))]">{{ project[1] }}</span><span :class="['tf-pill', badgeClass(String(project[2]))]">{{ project[2] }}</span></div>
                <div class="rounded-[13px] bg-slate-50 p-3"><div class="mb-2 flex justify-between text-sm"><span class="text-task-muted">Progress</span><b>{{ project[3] }}%</b></div><div class="h-2 overflow-hidden rounded-full bg-slate-200"><div :class="['h-full rounded-full transition-all', String(project[1]).toLowerCase() === 'completed' ? 'bg-task-success' : 'bg-gradient-to-r from-task-blue to-[#7654ED]']" :style="{ width: `${project[3]}%` }" /></div><p class="mt-3 text-sm text-task-muted">{{ project[4] }}</p><div class="mt-3 flex items-center justify-between gap-3 text-sm text-task-muted"><div class="flex min-h-7 -space-x-2"><span v-for="member in projectMemberDetailsOf(project).slice(0, 4)" :key="String(member.id || member.email)" class="grid h-8 w-8 place-items-center overflow-hidden rounded-full border-2 border-white bg-task-blueSoft text-[9px] font-bold text-task-blue" :title="projectMemberName(member)"><img v-if="member.avatar" :src="member.avatar" :alt="projectMemberName(member)" class="h-full w-full object-cover" /><span v-else>{{ initials(projectMemberName(member)) }}</span></span><span v-if="projectMemberDetailsOf(project).length > 4" class="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-task-blue text-[10px] font-bold text-white">+{{ projectMemberDetailsOf(project).length - 4 }}</span></div><span class="flex shrink-0 items-center gap-1.5"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('calendar')" /></svg>Due: {{ project[5] }}</span></div></div>
              </article>
            </div>
            <p v-if="!filteredProjects.length" class="py-8 text-center text-sm text-task-muted">No projects found.</p>
            <div v-if="filteredProjects.length > pageSize" class="mt-5 flex items-center justify-between text-xs text-task-muted"><span>Showing {{ paginatedProjects.length }} of {{ filteredProjects.length }} Projects</span><div class="flex gap-2"><button class="tf-icon-button" type="button" @click="setListPage('project', projectPage - 1)">‹</button><button v-for="page in projectPageCount" :key="page" :class="[projectPage === page ? 'tf-primary' : 'tf-icon-button', 'h-9 w-9 p-0']" type="button" @click="setListPage('project', page)">{{ page }}</button><button class="tf-icon-button" type="button" @click="setListPage('project', projectPage + 1)">›</button></div></div>
          </div>
        </section>

        <section v-else-if="activePage === 'analytics'" class="space-y-4">
          <div class="tf-panel grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4">
            <div v-for="(item, index) in analyticsStats" :key="String(item[1])" :class="['relative h-40 overflow-hidden rounded-[18px] border bg-gradient-to-br p-5', dashboardStatStyles[index]?.card]">
              <div class="flex items-start gap-4"><span :class="['grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/85 shadow-sm ring-1', dashboardStatStyles[index]?.icon]"><svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="index === 0 ? 'M8 12l3 3 5-6M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Z' : index === 1 ? 'M8 2h8M8 22h8M9 2v5l3 3 3-3V2M9 22v-5l3-3 3 3v5' : index === 2 ? 'M12 13 16 9M5.6 19a8 8 0 1 1 12.8 0M12 5v2M5 12H3m18 0h-2' : iconPath('projects')" /></svg></span><div><p :class="['text-3xl font-bold', index === 0 ? 'text-task-blue' : index === 1 ? 'text-[#8057D5]' : index === 2 ? 'text-task-success' : 'text-task-danger']">{{ item[0] }}</p><p class="mt-1 text-sm font-medium text-task-muted">{{ item[1] }}</p><span :class="['mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold', index === 0 ? 'bg-task-blueSoft text-task-blue' : index === 1 ? 'bg-task-lavender text-[#8057D5]' : index === 2 ? 'bg-task-successSoft text-task-success' : 'bg-task-dangerSoft text-task-danger']">Live vs last month</span></div></div>
              <svg viewBox="0 0 120 25" :class="['absolute bottom-3 left-4 right-4 h-7 w-[calc(100%-2rem)] opacity-80', dashboardStatStyles[index]?.line]" fill="none" preserveAspectRatio="none"><path d="M2 18 12 15l10 5 12-6 10 4 14-9 12 6 10-3 12 4 12-8 14 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </div>
          </div>

          <div class="grid gap-4 lg:grid-cols-2">
            <div class="tf-panel p-6">
              <div class="mb-5 flex items-start justify-between">
                <div>
                  <h2 class="text-xl font-bold leading-tight">Monthly Progress</h2>
                  <p class="mt-3 text-base text-task-muted">Task completion trends over 6 months</p>
                </div>
                <div class="relative">
                  <button type="button" class="tf-icon-button h-12 w-12 rounded-full" @click="toggleActionMenu('monthly-progress-actions')">
                    <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2"><path :d="iconPath('dots')" /></svg>
                  </button>
                  <div v-if="actionMenu === 'monthly-progress-actions'" class="tf-action-menu">
                    <button type="button" class="tf-action-item" @click="actionMenu = null">View Details</button>
                    <button type="button" class="tf-action-item" @click="actionMenu = null">Change Date Range</button>
                    <button type="button" class="tf-action-item" @click="actionMenu = null">Refresh</button>
                  </div>
                </div>
              </div>
              <div class="relative h-[300px] overflow-hidden" @mouseleave="hoveredMonthlyMonth = null">
                <div class="absolute left-0 top-[36px] z-10 grid h-[180px] grid-rows-5 text-base text-task-muted">
                  <span v-for="tick in yAxisTicks" :key="tick">{{ tick }}</span>
                </div>
                <div class="absolute inset-y-0 left-14 right-0">
                  <svg viewBox="0 0 560 230" class="h-full w-full overflow-visible" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="monthlyFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stop-color="#2567AD" stop-opacity="0.26" />
                        <stop offset="100%" stop-color="#2567AD" stop-opacity="0.03" />
                      </linearGradient>
                    </defs>
                    <path d="M0 42H560M0 85H560M0 128H560M0 171H560M0 214H560" fill="none" stroke="#E9EEF5" stroke-dasharray="7 8" stroke-width="1.5" />
                    <path v-if="selectedMonthlyPoint" :d="`M${selectedMonthlyPoint.x} 36V214`" fill="none" stroke="#DCE3EC" stroke-width="1.5" />
                    <path :d="monthlyAreaPath" fill="url(#monthlyFill)" />
                    <path :d="monthlyCompletedPath" fill="none" stroke="#2567AD" stroke-width="3" stroke-linecap="round" />
                    <path :d="monthlyCreatedPath" fill="none" stroke="#AEBECD" stroke-width="2" stroke-linecap="round" />
                    <circle v-if="selectedMonthlyPoint" :cx="selectedMonthlyPoint.x" :cy="selectedMonthlyPoint.y" r="8" fill="#2567AD" stroke="#FFFFFF" stroke-width="5" />
                    <circle v-if="selectedCreatedPoint" :cx="selectedCreatedPoint.x" :cy="selectedCreatedPoint.y" r="8" fill="#AEBECD" stroke="#FFFFFF" stroke-width="5" />
                  </svg>
                  <div v-if="selectedMonthlyPoint" class="absolute z-20 w-[150px] rounded-[24px] border border-task-line bg-white p-4 text-task-muted shadow-xl" :style="selectedMonthlyTooltipStyle">
                    <p class="mb-3 text-xl font-medium text-task-ink">{{ selectedMonthlyPoint.item.month }}</p>
                    <p class="mb-2 flex items-center gap-3 text-base"><span class="h-3.5 w-3.5 rounded-full bg-task-blue" />Completed: <b class="font-medium text-task-ink">{{ selectedMonthlyPoint.item.completed }}</b></p>
                    <p class="flex items-center gap-3 text-base"><span class="h-3.5 w-3.5 rounded-full bg-[#AEBECD]" />Created: <b class="font-medium text-task-ink">{{ selectedMonthlyPoint.item.created }}</b></p>
                  </div>
                  <div class="absolute inset-x-0 top-[36px] z-10 grid h-[178px]" :style="chartColumnsStyle(monthlyProgressData.length)">
                    <button
                      v-for="item in monthlyProgressData"
                      :key="`monthly-hover-${item.month}`"
                      type="button"
                      class="h-full w-full cursor-default"
                      :aria-label="`${item.month}: completed ${item.completed}, created ${item.created}`"
                      @mouseenter="hoveredMonthlyMonth = item.month"
                      @focus="hoveredMonthlyMonth = item.month"
                      @blur="hoveredMonthlyMonth = null"
                    />
                  </div>
                </div>
                <div class="absolute bottom-0 left-14 right-0 grid text-center text-base text-task-muted" :style="chartColumnsStyle(monthlyProgressData.length)">
                  <span v-for="item in monthlyProgressData" :key="item.month">{{ item.month }}</span>
                </div>
              </div>
            </div>

            <div class="tf-panel p-6">
              <div class="mb-5 flex items-start justify-between">
                <div>
                  <h2 class="text-xl font-bold leading-tight">Team Efficiency Trend</h2>
                  <p class="mt-3 text-base text-task-muted">Overall efficiency percentage over time</p>
                </div>
                <div class="relative">
                  <button type="button" class="tf-icon-button h-12 w-12 rounded-full" @click="toggleActionMenu('efficiency-actions')">
                    <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2"><path :d="iconPath('dots')" /></svg>
                  </button>
                  <div v-if="actionMenu === 'efficiency-actions'" class="tf-action-menu">
                    <button type="button" class="tf-action-item" @click="actionMenu = null">View Details</button>
                    <button type="button" class="tf-action-item" @click="actionMenu = null">Change Date Range</button>
                    <button type="button" class="tf-action-item" @click="actionMenu = null">Refresh</button>
                  </div>
                </div>
              </div>
              <div class="relative h-[300px] overflow-hidden" @mouseleave="hoveredEfficiencyMonth = null">
                <div class="absolute left-0 top-[36px] z-10 grid h-[180px] grid-rows-5 text-base text-task-muted">
                  <span v-for="tick in yAxisTicks" :key="tick">{{ tick }}</span>
                </div>
                <div class="absolute inset-y-0 left-14 right-0">
                  <svg viewBox="0 0 560 230" class="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                    <defs><linearGradient id="efficiencyFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#8057D5" stop-opacity="0.22" /><stop offset="100%" stop-color="#8057D5" stop-opacity="0.02" /></linearGradient></defs>
                    <path d="M0 42H560M0 85H560M0 128H560M0 171H560M0 214H560" fill="none" stroke="#E9EEF5" stroke-dasharray="7 8" stroke-width="1.5" />
                    <path :d="efficiencyAreaPath" fill="url(#efficiencyFill)" />
                    <path :d="efficiencyPath" fill="none" stroke="#8057D5" stroke-width="3" stroke-linecap="round" />
                    <circle v-for="point in efficiencyPoints" :key="String(point.item.month)" :cx="point.x" :cy="point.y" r="4" fill="#8057D5" stroke="#fff" stroke-width="2" />
                  </svg>
                  <div class="absolute inset-x-0 top-[36px] z-10 grid h-[178px]" :style="chartColumnsStyle(efficiencyTrendData.length)">
                    <button
                      v-for="bar in efficiencyTrendData"
                      :key="bar.month"
                      type="button"
                      class="group relative h-full outline-none"
                      :aria-label="`${bar.month}: efficiency ${bar.value}`"
                      @mouseenter="hoveredEfficiencyMonth = bar.month"
                      @focus="hoveredEfficiencyMonth = bar.month"
                      @blur="hoveredEfficiencyMonth = null"
                    >
                      <div v-if="bar.month === highlightedEfficiency?.month" class="absolute left-12 top-[30px] z-20 w-[150px] rounded-[24px] border border-task-line bg-white p-4 text-task-muted shadow-xl">
                        <p class="mb-4 text-xl font-medium text-task-ink">{{ bar.month }}</p>
                        <p class="flex items-center gap-3 text-base"><span class="h-3.5 w-3.5 rounded-full bg-task-blue" />Efficiency: <b class="font-medium text-task-ink">{{ bar.value }}</b></p>
                      </div>
                    </button>
                  </div>
                </div>
                <div class="absolute bottom-0 left-14 right-0 grid text-center text-base text-task-muted" :style="chartColumnsStyle(efficiencyTrendData.length)">
                  <span v-for="bar in efficiencyTrendData" :key="bar.month">{{ bar.month }}</span>
                </div>
              </div>
            </div>
          </div>

          <div :class="['grid gap-4', productivityTrendData.length ? 'lg:grid-cols-3' : 'lg:grid-cols-2']">
            <div class="tf-panel p-5">
              <div class="flex items-center justify-between"><h2 class="text-lg font-bold">Tasks by Category</h2><span class="grid h-9 w-9 place-items-center rounded-full bg-task-blueSoft text-task-blue"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('chart')" /></svg></span></div>
              <div class="mt-6 flex flex-col items-center gap-5 sm:flex-row lg:flex-col xl:flex-row"><div class="relative h-36 w-36 shrink-0 rounded-full bg-[conic-gradient(#2567AD_0_72%,#C9DAF7_72%_100%)]"><div class="absolute inset-7 grid place-items-center rounded-full bg-white text-center"><div><b class="block text-2xl">{{ tasks.length }}</b><span class="text-xs text-task-muted">Total</span></div></div></div><div class="w-full min-w-0 space-y-3"><div v-for="cat in categoryTrendData.slice(0, 4)" :key="cat.name" class="group relative"><div class="flex items-center justify-between gap-3 text-xs"><span class="flex min-w-0 items-center gap-2 text-task-muted"><i class="h-2 w-2 shrink-0 rounded-full bg-task-blue" /><span class="truncate">{{ cat.name }}</span></span><b>{{ cat.growth }}</b></div><div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full bg-task-blue" :style="{ width: `${cat.value}%` }" /></div><span class="tf-chart-tooltip"><b>{{ cat.name }}</b><span>{{ cat.growth }}</span></span></div><p v-if="!categoryTrendData.length" class="text-sm text-task-muted">No category data.</p></div></div>
            </div>

            <div class="tf-panel p-5">
              <h2 class="text-lg font-bold">Quick Insights</h2>
              <div class="mt-4 divide-y divide-task-line">
                <div v-for="insight in quickInsights" :key="insight" class="flex gap-3 py-3">
                  <span class="grid h-9 w-9 place-items-center rounded-full bg-task-blueSoft text-task-blue">
                    <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('chart')" /></svg>
                  </span>
                  <div>
                    <p class="font-semibold">{{ insight }}</p>
                    <p class="text-xs text-task-muted">Calculated from backend data.</p>
                  </div>
                </div>
                <p v-if="!quickInsights.length" class="py-10 text-center text-sm text-task-muted">No insight data.</p>
              </div>
            </div>

            <div v-if="productivityTrendData.length" class="tf-panel p-5">
              <h2 class="text-lg font-bold">Productivity Trends</h2>
              <div class="relative mx-auto my-6 h-44 w-44 rounded-full bg-[conic-gradient(#2567AD_0_32%,#8DB1D7_32%_55%,#BBD6F0_55%_72%,#DCE8F4_72%_100%)]">
                <div class="absolute inset-10 rounded-full bg-white" />
              </div>
              <div class="grid grid-cols-3 gap-2 text-xs text-task-muted">
                <span v-for="item in productivityTrendData" :key="item.day" class="group relative cursor-default rounded-ui px-1 py-1 hover:bg-task-blueSoft">
                  {{ item.day }}: {{ item.value }}%
                  <span class="tf-chart-tooltip">
                    <b>{{ item.day }}</b>
                    <span>Productivity: {{ item.value }}%</span>
                    <span>{{ item.growth }} from {{ item.from }}</span>
                  </span>
                </span>
              </div>
            </div>
          </div>
        </section>

        <section v-else-if="activePage === 'calendar'" class="tf-calendar-layout grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div class="h-full min-h-0">
            <div class="tf-calendar-main-panel tf-panel flex h-full min-h-0 flex-col overflow-hidden p-4 sm:p-5">
              <div class="mb-6 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div class="flex items-center gap-3"><button class="tf-icon-button h-11 w-11" type="button" aria-label="Previous month" @click="moveCalendar(-1)"><svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6" /></svg></button><h2 class="min-w-[150px] text-center text-xl font-bold">{{ calendarMonth }}</h2><button class="tf-icon-button h-11 w-11" type="button" aria-label="Next month" @click="moveCalendar(1)"><svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6" /></svg></button></div><button v-if="canCreateEvent" class="tf-primary h-11 rounded-[12px] px-5" @click="openModal('event')"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" /></svg>Add Event</button></div>
              <div class="tf-calendar-scroll">
                <div class="grid min-w-[734px] grid-cols-7 gap-2 text-center text-sm font-semibold text-task-muted"><span class="py-3">Mon</span><span class="py-3">Tue</span><span class="py-3">Wed</span><span class="py-3">Thu</span><span class="py-3">Fri</span><span class="py-3">Sat</span><span class="py-3 text-task-danger">Sun</span></div>
                <div class="grid min-w-[734px] grid-cols-[repeat(7,minmax(97px,1fr))] gap-2">
                  <template v-for="cell in calendarCells" :key="cell.key">
                    <button
                      v-if="cell.day"
                      type="button"
                      :class="[
                        'flex h-[126px] min-w-[97px] flex-col rounded-[12px] border border-task-line bg-white p-[10px] text-left shadow-[0_5px_18px_-16px_rgba(15,23,42,.5)] transition hover:-translate-y-0.5 hover:border-task-blue/40 hover:bg-task-blueSoft hover:shadow-card',
                        isTodayCell(cell.day) ? 'relative z-10 border-task-blue bg-task-blueSoft ring-1 ring-task-blue/20' : '',
                        selectedCalendarDay === cell.day ? 'relative z-10 border-task-blue bg-task-blueSoft ring-1 ring-task-blue/20' : ''
                      ]"
                      @click="selectCalendarDay(cell.day)"
                    >
                      <span class="flex h-7 items-center gap-2 text-base leading-7">
                        <span :class="[isTodayCell(cell.day) ? 'grid h-7 w-7 place-items-center rounded-full bg-task-blue text-sm font-bold text-white' : 'font-semibold', cell.day && (calendarLeadingBlanks + cell.day) % 7 === 0 ? 'text-task-danger' : '']">{{ cell.day }}</span>
                        <span v-if="isTodayCell(cell.day)" class="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-task-blue shadow-sm">Today</span>
                      </span>
                      <div class="mt-2 w-full space-y-1">
                        <span v-for="event in eventsForDay(cell.day).slice(0, 2)" :key="event.id" class="flex w-full items-center gap-1.5 rounded-[7px] bg-task-blueSoft px-2 py-1 text-[11px] font-semibold text-task-blue"><span :class="['h-1.5 w-1.5 shrink-0 rounded-full', event.color]" /><span class="truncate">{{ event.title }}</span></span>
                        <span v-if="eventsForDay(cell.day).length > 2" class="block px-2 text-[10px] font-bold text-task-muted">+{{ eventsForDay(cell.day).length - 2 }} more</span>
                      </div>
                    </button>
                    <div v-else class="h-[126px] min-w-[97px]" />
                  </template>
                </div>
              </div>
            </div>
          </div>
          <aside class="h-full min-h-0">
            <div class="tf-calendar-events-panel tf-panel flex h-full min-h-0 flex-col overflow-hidden p-0">
              <div class="border-b border-task-line bg-white/90 px-5 py-4 backdrop-blur"><div class="flex items-center justify-between gap-3"><div class="flex items-center gap-2"><span class="grid h-9 w-9 place-items-center rounded-[11px] bg-task-blueSoft text-task-blue"><svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('calendar')" /></svg></span><h2 class="text-lg font-bold">{{ selectedCalendarDay ? `${String(selectedCalendarDay).padStart(2, '0')} ${monthNames[calendarMonthIndex]}` : 'Upcoming Events' }}</h2></div><span class="grid h-8 min-w-8 place-items-center rounded-[10px] bg-task-blueSoft px-2 text-xs font-bold text-task-blue">{{ selectedDayEvents.length }}</span></div><div class="mt-2 flex items-center justify-between"><p class="text-xs text-task-muted">Scroll to view all events</p><button v-if="selectedCalendarDay" type="button" class="text-xs font-bold text-task-blue hover:underline" @click="selectedCalendarDay = null">View all</button></div></div>
              <div class="tf-event-scroll min-h-[220px] flex-1 space-y-3 overflow-y-auto p-4">
                <button v-for="event in selectedDayEvents" :key="event.id" type="button" class="group flex w-full gap-3 rounded-[14px] border border-transparent bg-slate-50 p-3 text-left transition hover:border-task-blue/20 hover:bg-task-blueSoft" @click="openEventDetails(event)">
                  <span :class="['grid h-12 w-12 shrink-0 place-items-center rounded-[12px] text-center text-[10px] font-bold leading-tight text-white shadow-sm', event.color]">{{ String(event.day).padStart(2, '0') }}<br />{{ event.meridiem }}</span>
                  <span class="min-w-0 flex-1"><span class="block truncate text-sm font-bold text-task-ink">{{ event.title }}</span><span class="mt-1 block text-[11px] leading-4 text-task-muted">{{ eventFullDate(event) }} · {{ event.time }}</span><span class="mt-1.5 inline-flex rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-task-muted">{{ event.attendees }} attendees</span></span>
                  <svg viewBox="0 0 24 24" class="mt-1 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-task-blue" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 5 7 7-7 7" /></svg>
                </button>
                <div v-if="!selectedDayEvents.length" class="grid min-h-36 place-items-center rounded-[14px] border border-dashed border-task-line bg-slate-50 px-4 text-center"><div><span class="mx-auto grid h-10 w-10 place-items-center rounded-full bg-task-blueSoft text-task-blue"><svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('calendar')" /></svg></span><p class="mt-3 text-sm font-semibold text-task-muted">No events for this day</p></div></div>
              </div>
            </div>
          </aside>
        </section>

        <section v-else-if="activePage === 'team'" class="space-y-4">
          <div class="tf-panel grid gap-4 p-5 sm:grid-cols-3">
            <div v-for="(item, index) in teamStats" :key="String(item[1])" :class="['group relative flex h-28 items-center gap-4 overflow-hidden rounded-[18px] border bg-gradient-to-br px-5', dashboardStatStyles[index]?.card]">
              <span :class="['grid h-12 w-12 shrink-0 place-items-center rounded-[15px] bg-white/85 shadow-sm ring-1', dashboardStatStyles[index]?.icon]"><svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="index === 0 ? iconPath('users') : index === 1 ? 'M4 17 10 11l4 4 6-8M15 7h5v5' : 'm6 12 4 4 8-9M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Z'" /></svg></span>
              <div class="relative z-10"><p class="text-3xl font-bold">{{ item[0] }}</p><p class="mt-1 text-sm font-medium text-task-muted">{{ item[1] }}</p></div>
              <svg viewBox="0 0 90 35" :class="['absolute bottom-3 right-3 h-9 w-24 opacity-75', dashboardStatStyles[index]?.line]" fill="none"><path d="M3 30 22 17l18 4 18-7 14-11 15 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /><circle cx="87" cy="7" r="2.5" fill="currentColor" /></svg>
            </div>
          </div>

          <div class="tf-panel relative overflow-hidden p-5">
            <div class="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><h2 class="text-xl font-bold">All Staff</h2><div class="flex flex-col gap-3 sm:flex-row"><label class="relative w-full sm:w-auto"><svg viewBox="0 0 24 24" class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-task-muted" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('search')" /></svg><input v-model="teamSearchInput" class="tf-input h-11 w-full pl-10 pr-10 sm:w-72" placeholder="Search staff..." /><button v-if="teamSearchInput && !searchLoading.team" type="button" class="tf-search-clear" aria-label="Clear staff search" @click="clearSearch('team')">×</button><span v-if="searchLoading.team" class="tf-search-spinner" /></label><button class="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border border-task-line bg-white px-4 text-sm font-semibold text-task-muted transition hover:border-task-blue hover:text-task-blue" @click="openModal('team-filter')"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('filter')" /></svg>Filter</button><button class="tf-primary h-11 rounded-[12px] px-5" @click="openModal('member')"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('users')" /><path d="M19 8v6m-3-3h6" /></svg>Add Member</button></div></div>
            <div v-if="searchLoading.team" class="tf-search-overlay"><span class="tf-search-loader" /> Searching staff...</div>
            <div class="overflow-x-auto"><table class="w-full min-w-[900px] text-left text-sm"><thead class="text-task-muted"><tr><th class="rounded-l-[14px] p-3 font-semibold">Staff</th><th class="p-3 font-semibold">Role</th><th class="p-3 font-semibold">Contact</th><th class="p-3 font-semibold">Efficiency</th><th class="p-3 font-semibold">Completed</th><th class="p-3 font-semibold">In Progress</th><th class="rounded-r-[14px] p-3 text-right font-semibold">Actions</th></tr></thead><tbody class="divide-y divide-task-line"><tr v-for="(member, index) in paginatedTeam" :key="String(member[9] || member[7] || member[0])"><td class="p-3"><div class="flex items-center gap-3"><span :class="['grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full text-xs font-bold', index % 4 === 0 ? 'bg-task-blueSoft text-task-blue' : index % 4 === 1 ? 'bg-[#F0E9FF] text-[#8057D5]' : index % 4 === 2 ? 'bg-task-warningSoft text-task-warning' : 'bg-task-successSoft text-task-success']"><img v-if="member[8]" :src="String(member[8])" :alt="String(member[0])" class="h-full w-full object-cover" /><span v-else>{{ initials(String(member[0])) }}</span></span><div class="min-w-0"><p class="truncate font-bold text-task-ink">{{ member[0] }}</p><p class="truncate text-xs text-task-muted">{{ member[2] }}</p></div></div></td><td class="p-3 text-task-muted">{{ member[1] }}</td><td class="p-3 text-task-muted">{{ member[3] }}</td><td class="p-3"><div class="flex items-center gap-2"><div class="h-2 w-24 overflow-hidden rounded-full bg-slate-200"><div class="h-full rounded-full bg-task-blue" :style="{ width: `${member[4]}%` }" /></div><span class="text-xs font-bold">{{ member[4] }}%</span></div></td><td class="p-3 font-semibold">{{ member[5] }}</td><td class="p-3 font-semibold">{{ member[6] }}</td><td class="relative p-3 text-right"><div class="relative inline-flex"><button type="button" class="tf-icon-button rounded-full" @click="toggleActionMenu(`team-${member[9] || member[7] || member[0]}`)"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor"><path :d="iconPath('dots')" /></svg></button><div v-if="actionMenu === `team-${member[9] || member[7] || member[0]}`" class="tf-action-menu"><button type="button" class="tf-action-item" @click="actionMenu = null">View profile</button><button type="button" class="tf-action-item" @click="updateMemberStatus(member, String(member[12]) === 'Inactive')">{{ String(member[12]) === 'Inactive' ? 'Activate' : 'Deactivate' }}</button><button type="button" class="tf-action-item tf-action-danger" @click="deleteMember(member)">Remove member</button></div></div></td></tr></tbody></table></div>
            <p v-if="!filteredTeam.length" class="py-10 text-center text-sm text-task-muted">No staff found.</p><div v-if="filteredTeam.length > pageSize" class="mt-5 flex justify-end gap-2"><button class="tf-icon-button" @click="setListPage('team', teamPage - 1)">‹</button><button v-for="page in teamPageCount" :key="page" :class="[teamPage === page ? 'tf-primary' : 'tf-icon-button', 'h-9 w-9 p-0']" @click="setListPage('team', page)">{{ page }}</button><button class="tf-icon-button" @click="setListPage('team', teamPage + 1)">›</button></div>
          </div>
        </section>

        <section v-else-if="activePage === 'reports'" class="space-y-4">
          <div class="tf-panel grid gap-4 p-5 sm:grid-cols-3">
            <div v-for="(item, index) in reportStats" :key="item.label" :class="['group relative flex h-28 items-center gap-4 overflow-hidden rounded-[18px] border bg-gradient-to-br px-5', dashboardStatStyles[index]?.card]">
              <span :class="['grid h-12 w-12 shrink-0 place-items-center rounded-[15px] bg-white/85 shadow-sm ring-1', dashboardStatStyles[index]?.icon]"><svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath(item.icon)" /></svg></span>
              <div class="relative z-10"><p class="text-3xl font-bold">{{ item.value }}</p><p class="mt-1 text-sm font-medium text-task-muted">{{ item.label }}</p></div>
              <svg viewBox="0 0 90 35" :class="['absolute bottom-3 right-3 h-9 w-24 opacity-75', dashboardStatStyles[index]?.line]" fill="none"><path d="M3 30 22 17l18 4 18-7 14-11 15 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /><circle cx="87" cy="7" r="2.5" fill="currentColor" /></svg>
            </div>
          </div>

          <div class="tf-panel relative overflow-hidden p-5 sm:p-6">
            <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div><h2 class="text-xl font-bold">Recent Reports</h2><p class="mt-1 text-sm text-task-muted">View and manage generated team reports.</p></div>
              <div class="flex flex-col gap-3 sm:flex-row">
                <label class="relative w-full sm:w-auto"><svg viewBox="0 0 24 24" class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-task-muted" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('search')" /></svg><input v-model="reportSearchInput" class="tf-input h-11 w-full pl-10 pr-10 sm:w-72" placeholder="Search reports..." /><button v-if="reportSearchInput && !searchLoading.report" type="button" class="tf-search-clear" aria-label="Clear report search" @click="clearSearch('report')">×</button><span v-if="searchLoading.report" class="tf-search-spinner" /></label>
                <button class="tf-primary h-11 w-full rounded-[12px] px-5 sm:w-auto" @click="openModal('report')"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14" /></svg>Custom Report</button>
              </div>
            </div>
            <div v-if="searchLoading.report" class="tf-search-overlay"><span class="tf-search-loader" /> Searching reports...</div>
            <div class="overflow-x-auto rounded-[16px] border border-task-line">
              <table class="w-full min-w-[820px] text-left text-sm">
                <thead class="text-task-muted"><tr><th class="p-4 font-semibold">Report Name</th><th class="p-4 font-semibold">Type</th><th class="p-4 font-semibold">Date Generated</th><th class="p-4 font-semibold">Generated By</th><th class="p-4 font-semibold">Status</th><th class="p-4 text-right font-semibold">Action</th></tr></thead>
                <tbody class="divide-y divide-task-line"><tr v-for="(report, index) in paginatedReports" :key="String(report[5] || report[0])"><td class="p-4"><div class="flex items-center gap-3"><span :class="['grid h-10 w-10 shrink-0 place-items-center rounded-[12px]', index % 3 === 0 ? 'bg-task-blueSoft text-task-blue' : index % 3 === 1 ? 'bg-[#F0E9FF] text-[#8057D5]' : 'bg-task-successSoft text-task-success']"><svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('file')" /></svg></span><span class="font-bold text-task-ink">{{ report[0] }}</span></div></td><td class="p-4 text-task-muted">{{ report[1] }}</td><td class="p-4 text-task-muted">{{ report[2] }}</td><td class="p-4 font-medium">{{ report[3] }}</td><td class="p-4"><span :class="['tf-pill', badgeClass(report[4])]">{{ report[4] }}</span></td><td class="p-4 text-right"><button type="button" class="tf-icon-button rounded-[12px]" title="Download report" aria-label="Download report" @click="notify(`${report[0]} downloaded`)"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" /></svg></button></td></tr></tbody>
              </table>
            </div>
            <div v-if="!filteredReports.length && !searchLoading.report" class="grid min-h-48 place-items-center text-center"><div><span class="mx-auto grid h-12 w-12 place-items-center rounded-[15px] bg-task-blueSoft text-task-blue"><svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('file')" /></svg></span><p class="mt-3 font-bold">No reports found</p><p class="mt-1 text-sm text-task-muted">Create a custom report or try another search.</p></div></div>
            <div v-if="filteredReports.length > pageSize" class="mt-5 flex flex-col gap-3 text-xs text-task-muted sm:flex-row sm:items-center sm:justify-between"><span>Showing {{ paginatedReports.length }} of {{ filteredReports.length }} reports</span><div class="flex gap-2"><button class="tf-icon-button" type="button" @click="setListPage('report', reportPage - 1)">‹</button><button v-for="page in reportPageCount" :key="page" :class="[reportPage === page ? 'tf-primary' : 'tf-icon-button', 'h-9 w-9 p-0']" type="button" @click="setListPage('report', page)">{{ page }}</button><button class="tf-icon-button" type="button" @click="setListPage('report', reportPage + 1)">›</button></div></div>
          </div>
        </section>

        <section v-else-if="activePage === 'notifications'" class="py-1">
          <NotificationsView />
        </section>

        <section v-else-if="activePage === 'messages'" class="tf-panel grid h-[650px] overflow-hidden p-0 lg:grid-cols-[290px_1fr]">
          <aside class="relative border-r border-task-line p-5"><h2 class="font-bold">Recent Messages</h2><label class="relative mt-4 block"><input v-model="messageSearchInput" class="tf-input w-full pr-10" placeholder="Search here..." /><button v-if="messageSearchInput && !searchLoading.message" type="button" class="tf-search-clear" aria-label="Clear message search" @click="clearSearch('message')">×</button><span v-if="searchLoading.message" class="tf-search-spinner" /></label><div v-if="searchLoading.message" class="tf-search-overlay"><span class="tf-search-loader" /> Searching...</div><div class="mt-4 divide-y divide-task-line"><button v-for="name in filteredMessages" :key="name" :class="['flex w-full items-center gap-3 py-3 text-left', activeMessage === name ? 'bg-task-blueSoft' : '']" @click="activeMessage = name"><span class="grid h-11 w-11 place-items-center rounded-full bg-slate-300 font-bold text-white">{{ initials(name) }}</span><span class="min-w-0 flex-1"><b class="block truncate">{{ name }}</b></span></button><p v-if="!filteredMessages.length" class="py-8 text-sm text-task-muted">No messages.</p></div></aside>
          <div class="flex min-w-0 flex-col items-center justify-center p-6 text-center text-task-muted">
            <p class="text-base font-semibold text-task-ink">{{ activeMessage || 'No conversation selected' }}</p>
            <p class="mt-2 text-sm">Messages data will appear here when it comes from backend.</p>
          </div>
        </section>

        <section v-else-if="activePage === 'settings'" class="space-y-4">
          <div class="tf-panel relative overflow-hidden px-6 py-7 sm:px-8">
            <div class="relative z-10"><h2 class="text-2xl font-bold tracking-[-0.02em]">Account Settings</h2><p class="mt-2 text-sm text-task-muted">Update your profile information and password to keep your account secure.</p></div>
            <div class="absolute inset-y-0 right-0 w-80 bg-gradient-to-l from-task-blueSoft to-transparent" />
            <svg viewBox="0 0 120 120" class="absolute right-8 top-1/2 h-28 w-28 -translate-y-1/2 text-task-blue opacity-20" fill="none" stroke="currentColor" stroke-width="5"><path d="M60 8 99 24v30c0 25-15 46-39 58C36 100 21 79 21 54V24L60 8Z" /><rect x="44" y="52" width="32" height="27" rx="5" /><path d="M50 52v-8a10 10 0 0 1 20 0v8" /></svg>
          </div>

          <div class="tf-settings-grid grid items-stretch gap-4 xl:grid-cols-[1.15fr_.85fr]">
            <div class="tf-panel tf-profile-panel h-full p-5 sm:p-7">
              <div class="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div class="relative shrink-0"><input ref="profileAvatarInput" class="hidden" type="file" accept="image/*" @change="handleProfileAvatar" /><button type="button" class="group relative block h-28 w-28 rounded-full" aria-label="Change profile image" @click="chooseProfileAvatar"><span class="grid h-full w-full place-items-center overflow-hidden rounded-full bg-gradient-to-br from-task-blueSoft to-[#D8E7F8] text-2xl font-bold text-task-blue ring-4 ring-white shadow-lg"><img v-if="profileAvatarPreview" :src="profileAvatarPreview" alt="Profile avatar preview" class="h-full w-full object-cover transition group-hover:brightness-90" /><span v-else>{{ profileFormInitials }}</span></span><span class="absolute bottom-0 right-0 grid h-10 w-10 place-items-center rounded-full border-4 border-white bg-task-blue text-white shadow-lg"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 8h4l2-3h4l2 3h4v11H4V8Z" /><circle cx="12" cy="13" r="3" /></svg></span></button></div>
                <div class="min-w-0 flex-1"><h3 class="truncate text-2xl font-bold">{{ profileName }}</h3><span class="mt-2 inline-flex rounded-full bg-task-blueSoft px-3 py-1 text-xs font-bold text-task-blue">{{ profileForm.role || 'Team Member' }}</span><div class="mt-4 space-y-2 text-sm text-task-muted"><p class="flex items-center gap-2"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('mail')" /></svg>{{ profileForm.email || 'No email' }}</p><p class="flex items-center gap-2"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('phone')" /></svg>{{ profileForm.phone || 'No phone' }}</p></div></div>
              </div>

              <div class="mt-7 grid gap-4 md:grid-cols-2"><label class="text-sm font-semibold">First Name<input v-model="profileForm.firstName" class="tf-input mt-2 h-12 w-full" /></label><label class="text-sm font-semibold">Last Name<input v-model="profileForm.lastName" class="tf-input mt-2 h-12 w-full" /></label><label class="md:col-span-2 text-sm font-semibold">Email Address<input v-model="profileForm.email" class="tf-input mt-2 h-12 w-full" readonly /></label><label class="text-sm font-semibold">Phone Number<input v-model="profileForm.phone" class="tf-input mt-2 h-12 w-full" inputmode="numeric" placeholder="+998 91 638 31 91" @input="handleProfilePhoneInput" /></label><label class="text-sm font-semibold">Role<input v-model="profileForm.role" class="tf-input mt-2 h-12 w-full" /></label></div>
              <button class="tf-primary mt-6 h-12 w-full rounded-xl text-base" @click="saveSettings('Profile')"><svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 4 4L19 6" /></svg>Save Changes</button>
            </div>

            <div class="tf-settings-side flex h-full flex-col gap-4">
              <div class="tf-panel tf-security-panel flex flex-1 flex-col p-5 sm:p-7">
                <div class="flex items-start gap-3"><span class="grid h-10 w-10 place-items-center rounded-xl bg-task-blueSoft text-task-blue"><svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3 20 6v6c0 5-3 8-8 10-5-2-8-5-8-10V6l8-3Z" /></svg></span><div><h2 class="text-xl font-bold">Security</h2><p class="mt-1 text-sm text-task-muted">Change your password to keep your account safe.</p></div></div>
                <div v-for="(field, index) in passwordFields" :key="field.key" class="mt-5"><label class="text-sm font-semibold">{{ index === 0 ? 'Current Password' : index === 1 ? 'New Password' : 'Confirm New Password' }}</label><div class="relative mt-2"><input v-model="passwordForm[field.key]" class="tf-input h-12 w-full pl-11 pr-12" :placeholder="field.placeholder" :type="passwordInputType(field.key)" /><svg viewBox="0 0 24 24" class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-task-muted" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg><button type="button" class="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-task-muted transition hover:bg-task-blueSoft hover:text-task-blue" :aria-label="passwordVisible[field.key] ? 'Hide password' : 'Show password'" @click="togglePasswordVisibility(field.key)"><svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath(passwordVisible[field.key] ? 'eyeOff' : 'eye')" /></svg></button></div></div>
                <div v-if="passwordForm.next" class="mt-3 flex items-center gap-2"><div class="flex flex-1 gap-1"><span v-for="i in 4" :key="i" :class="['h-1.5 flex-1 rounded-full', passwordForm.next.length >= i * 3 ? 'bg-task-success' : 'bg-slate-200']" /></div><span class="text-xs font-semibold text-task-success">{{ passwordForm.next.length >= 10 ? 'Strong' : 'Keep going' }}</span></div>
                <div class="mt-auto pt-6">
                  <button class="tf-primary h-12 w-full rounded-xl text-base" @click="saveSettings('Password')"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>Update Password</button>
                </div>
              </div>

              <div class="tf-panel tf-account-summary p-4 sm:p-5">
                <div class="flex items-start gap-3"><span class="grid h-9 w-9 place-items-center rounded-[11px] bg-task-blueSoft text-task-blue"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v9l6 3M12 21a9 9 0 1 1 9-9" /></svg></span><div><h2 class="text-lg font-bold">Account Summary</h2><p class="mt-0.5 text-xs text-task-muted">Overview of your account information.</p></div></div>
                <div class="mt-4 grid grid-cols-3 gap-3">
                  <div class="flex items-center gap-2.5"><span class="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-task-blueSoft text-task-blue"><svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 3v4m10-4v4M4 9h16M5 5h14v15H5V5Z" /></svg></span><div class="min-w-0"><p class="text-[11px] font-medium text-task-muted">Joined Date</p><p class="mt-0.5 truncate text-xs font-bold text-task-ink">{{ accountJoinedDate }}</p></div></div>
                  <div class="flex items-center gap-2.5"><span class="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-task-successSoft text-task-success"><svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3 20 6v6c0 5-3 8-8 10-5-2-8-5-8-10V6l8-3Zm-3 9 2 2 4-4" /></svg></span><div><p class="text-[11px] font-medium text-task-muted">Account Status</p><p class="mt-0.5 text-xs font-bold text-task-ink">Active</p></div></div>
                  <div class="flex items-center gap-2.5"><span class="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-task-warningSoft text-task-warning"><svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg></span><div class="min-w-0"><p class="text-[11px] font-medium text-task-muted">Last Login</p><p class="mt-0.5 truncate text-xs font-bold text-task-ink">{{ accountLastLogin }}</p><p class="text-[10px] font-semibold text-task-muted">{{ accountLastLoginTime }}</p></div></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section v-else-if="activePage === 'help'" class="flex min-h-[calc(100vh-120px)] justify-center px-4 py-14">
          <div class="w-full max-w-[980px] space-y-5">
            <div class="tf-panel flex items-start gap-5 p-7">
              <span class="grid h-14 w-14 shrink-0 place-items-center rounded-ui bg-task-blueSoft text-task-blue">
                <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path :d="iconPath('robot')" /></svg>
              </span>
              <p class="max-w-[760px] text-xl font-semibold leading-8 text-task-ink">
                Found a bug or have feedback? Describe it and attach a screenshot - it comes straight to our team for review.
              </p>
            </div>
            <textarea
              v-model="feedbackDraft"
              class="min-h-[260px] w-full resize-y rounded-ui border border-task-line bg-white p-7 text-xl font-semibold leading-8 text-task-ink outline-none transition placeholder:text-task-muted focus:border-task-blue focus:ring-4 focus:ring-task-blueSoft"
              placeholder="What went wrong, or what would you improve?"
            />
            <button type="button" class="flex h-16 w-full items-center justify-center gap-3 rounded-ui border border-dashed border-task-line bg-white text-lg font-semibold text-task-muted transition hover:border-task-blue hover:text-task-blue" @click="attachFeedbackScreenshot">
              <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5h16v14H4V5Zm4 10 3-3 2 2 3-4 4 5M8 8h.01" /></svg>
              {{ feedbackScreenshotName || 'Attach screenshot' }}
            </button>
            <input ref="feedbackScreenshotInput" class="hidden" type="file" accept="image/*" @change="handleFeedbackScreenshot" />
            <div v-if="feedbackScreenshotPreview" class="tf-panel flex items-center gap-5 p-4 shadow-none">
              <img :src="feedbackScreenshotPreview" :alt="feedbackScreenshotName" class="h-24 w-36 rounded-ui object-cover" />
              <div class="min-w-0 flex-1">
                <p class="truncate text-base font-bold">{{ feedbackScreenshotName }}</p>
                <p class="text-sm text-task-muted">Screenshot attached</p>
              </div>
              <button type="button" class="tf-icon-button" aria-label="Remove screenshot" title="Remove screenshot" @click="clearFeedbackScreenshot">
                <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <button type="button" class="tf-primary h-16 w-full text-lg" @click="sendFeedbackToTeam">
              <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" /></svg>
              Send to team
            </button>
          </div>
        </section>
      </div>
    </section>

    <div v-if="modal" class="fixed inset-0 z-50 grid place-items-center bg-slate-900/45 p-3 backdrop-blur-[2px] sm:p-6" @click.self="modal = null">
      <div :class="['tf-app-modal flex max-h-[calc(100vh-24px)] w-full flex-col overflow-hidden rounded-[22px] border border-white/70 bg-[#E3EAF2] shadow-[0_30px_90px_-20px_rgba(15,23,42,0.45)] sm:max-h-[calc(100vh-48px)]', modal === 'project' ? 'tf-project-modal max-w-[600px]' : modal === 'task' ? 'max-w-[620px]' : modal === 'member' ? 'tf-member-modal max-w-[520px]' : modal === 'event' || modal === 'event-detail' || modal === 'report' ? 'max-w-[620px]' : 'max-w-[520px]']">
        <div class="flex shrink-0 items-center justify-between px-5 py-3.5 sm:px-6 sm:py-4"><h2 class="text-[21px] font-semibold tracking-[-0.025em] sm:text-[22px]">{{ modal === 'task' ? (taskModalMode === 'view' ? 'Task Details' : taskModalMode === 'edit' ? 'Edit Task' : 'Create Task') : modal === 'project' ? 'Create New Project' : modal === 'event' ? 'Add New Event' : modal === 'event-detail' ? 'Event Details' : modal === 'report' ? 'Custom Report Builder' : modal === 'member' ? 'Add Department Member' : 'Filter Staff' }}</h2><button type="button" class="grid h-9 w-9 place-items-center rounded-full text-[28px] font-light leading-none transition hover:bg-white/60 hover:text-task-blue" aria-label="Close modal" @click="modal = null">×</button></div>
        <div :class="['min-h-0 overflow-y-auto bg-white', modal === 'project' || modal === 'task' ? 'mx-3 mb-3 rounded-[18px] p-5' : 'mx-2 mb-2 rounded-[16px] p-4', modal === 'member' ? 'tf-member-modal-body' : '']">
          <template v-if="modal === 'event-detail' && selectedCalendarEvent">
            <div class="flex items-start gap-3 border-b border-task-line pb-3"><span :class="['grid h-12 w-12 shrink-0 place-items-center rounded-full text-center text-[11px] font-bold text-white', selectedCalendarEvent.color]">{{ String(selectedCalendarEvent.day).padStart(2, '0') }}<br />{{ selectedCalendarEvent.meridiem }}</span><div><h3 class="text-lg font-bold text-task-ink">{{ selectedCalendarEvent.title }}</h3><span class="mt-1.5 inline-flex rounded-full bg-task-blueSoft px-3 py-1 text-xs font-semibold text-task-blue">{{ selectedCalendarEvent.eventType }}</span></div></div>
            <div class="mt-4 grid gap-3 sm:grid-cols-2"><div class="rounded-ui bg-slate-100 p-3"><p class="text-xs font-semibold uppercase tracking-wide text-task-muted">Date</p><p class="mt-1.5 text-sm font-semibold text-task-ink">{{ eventFullDate(selectedCalendarEvent) }}</p></div><div class="rounded-ui bg-slate-100 p-3"><p class="text-xs font-semibold uppercase tracking-wide text-task-muted">Time</p><p class="mt-1.5 text-sm font-semibold text-task-ink">{{ selectedCalendarEvent.time }}</p></div></div>
            <div class="mt-4 rounded-ui border border-task-line p-4"><div class="flex items-center justify-between gap-3"><p class="font-bold text-task-ink">Assigned attendees</p><span class="shrink-0 rounded-full bg-task-blue px-3 py-1 text-xs font-bold text-white">{{ selectedCalendarEvent.attendees }} people</span></div><div v-if="selectedCalendarEvent.attendeeNames.length" class="mt-3 flex flex-wrap gap-2"><span v-for="name in selectedCalendarEvent.attendeeNames" :key="name" class="inline-flex items-center gap-2 rounded-full border border-task-line bg-task-blueSoft px-3 py-2 text-sm font-semibold text-task-ink"><span class="grid h-7 w-7 place-items-center rounded-full bg-task-blue text-[10px] font-bold text-white">{{ initials(name) }}</span>{{ name }}</span></div><p v-else class="mt-3 text-sm text-task-muted">No attendees assigned.</p></div>
            <div v-if="selectedCalendarEvent.description" class="mt-4"><p class="font-bold text-task-ink">Description</p><p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-task-muted">{{ selectedCalendarEvent.description }}</p></div><a v-if="selectedCalendarEvent.meetingUrl" :href="selectedCalendarEvent.meetingUrl" target="_blank" rel="noopener" class="mt-4 inline-flex text-sm font-semibold text-task-blue">Open meeting link ↗</a>
          </template>
          <template v-else-if="modal === 'team-filter'">
            <div class="grid gap-4 md:grid-cols-2"><label v-for="field in [['Department','department'],['Role','role'],['Skills','skills'],['Status','status']]" :key="field[1]">{{ field[0] }}<div class="tf-dropdown mt-2"><button type="button" class="tf-dropdown-button" @click="openDropdown = openDropdown === field[1] ? null : String(field[1])"><span>{{ dropdownValues[String(field[1])] }}</span><svg viewBox="0 0 20 20" class="h-4 w-4 shrink-0 text-task-muted transition" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg></button><div v-if="openDropdown === field[1]" class="tf-dropdown-menu"><button v-for="option in dropdownOptions[String(field[1])]" :key="option" type="button" class="tf-dropdown-option" @click="setDropdownValue(String(field[1]), option)"><span>{{ option }}</span><span v-if="dropdownValues[String(field[1])] === option">✓</span></button></div></div></label></div><div class="mt-5 rounded-ui bg-slate-100 p-4"><p class="font-bold">Workload</p><input v-model.number="workloadFilter" type="range" min="0" max="100" class="mt-3 w-full accent-task-blue" /><div class="flex justify-between text-sm text-task-muted"><span>0%</span><span>Current: {{ workloadFilter }}%</span><span>100%</span></div></div>
          </template>
          <template v-else-if="modal === 'member'">
            <div class="rounded-ui bg-task-blueSoft p-4 text-sm text-task-muted">The member will be added to your current department automatically.</div>
            <div class="mt-4 grid gap-4 sm:grid-cols-2"><label class="block text-sm font-semibold">First Name<input v-model="memberFirstName" class="tf-input mt-2 h-12 w-full" placeholder="Enter first name" autocomplete="given-name" /></label><label class="block text-sm font-semibold">Last Name<input v-model="memberLastName" class="tf-input mt-2 h-12 w-full" placeholder="Enter last name" autocomplete="family-name" /></label></div>
            <label class="mt-4 block text-sm font-semibold">Email Address <span class="text-task-danger">*</span><input v-model="memberEmail" type="email" class="tf-input mt-2 h-12 w-full" placeholder="ali@example.com" autocomplete="email" required /></label>
            <label class="mb-5 mt-4 block text-sm font-semibold">Role<div class="tf-dropdown mt-2"><button type="button" class="tf-dropdown-button h-12" @click="openDropdown = openDropdown === 'memberRole' ? null : 'memberRole'"><span class="capitalize">{{ memberRole }}</span><svg viewBox="0 0 20 20" :class="['h-4 w-4 text-task-muted transition-transform', openDropdown === 'memberRole' ? 'rotate-180' : '']" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg></button><div v-if="openDropdown === 'memberRole'" class="tf-dropdown-menu tf-member-role-menu"><button v-for="role in memberRoleOptions" :key="role" type="button" class="tf-dropdown-option capitalize" @click="memberRole = role; openDropdown = null"><span>{{ role }}</span><span v-if="memberRole === role" class="text-task-blue">✓</span></button></div></div></label>
          </template>
          <template v-else-if="modal === 'task'">
            <div class="mb-4 flex items-center gap-3 rounded-[14px] border border-task-line bg-task-blueSoft px-4 py-3 text-sm">
              <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-task-blue"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 21V7l8-4 8 4v14M9 21v-5h6v5M8 9h1m6 0h1m-8 3h1m6 0h1" /></svg></span>
              <div><p class="font-semibold text-task-ink">Current department</p><p class="mt-0.5 text-xs text-task-muted">Task automatically belongs to your department.</p></div>
            </div>
            <label class="block text-sm font-semibold">
              Task Title
              <input v-model="form.title" class="tf-input mt-2 h-12 w-full" placeholder="Enter task title" />
            </label>
            <label class="mt-4 block text-sm font-semibold">
              Assignee
              <div class="tf-dropdown mt-2">
                <input
                  v-model="taskAssigneeSearch"
                  class="tf-input h-12 w-full pr-11"
                  placeholder="Search team member..."
                  autocomplete="off"
                  @focus="openDropdown = 'taskAssignee'"
                  @input="openDropdown = 'taskAssignee'"
                />
                <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-task-muted transition hover:text-task-blue" aria-label="Show team members" @click="openDropdown = openDropdown === 'taskAssignee' ? null : 'taskAssignee'">
                  <svg viewBox="0 0 20 20" :class="['h-4 w-4 transition-transform', openDropdown === 'taskAssignee' ? 'rotate-180' : '']" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg>
                </button>
                <div v-if="openDropdown === 'taskAssignee'" class="tf-dropdown-menu max-h-60 overflow-y-auto">
                  <p v-if="taskAssigneesLoading" class="flex items-center gap-2 px-3 py-3 text-sm text-task-muted"><span class="tf-search-spinner static translate-y-0" />Loading team members...</p>
                  <button v-for="member in filteredTaskAssignees" :key="String(member[7] || member[0])" type="button" :class="['tf-dropdown-option gap-3', taskAssigneeIds.includes(teamMemberId(member)) ? 'bg-task-blueSoft' : '']" @click="selectTaskAssignee(member)">
                    <span class="flex min-w-0 items-center gap-2.5">
                      <span :class="['grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-bold', taskAssigneeIds.includes(teamMemberId(member)) ? 'bg-task-blue text-white' : 'bg-task-blueSoft text-task-blue']">{{ initials(String(member[0])) }}</span>
                      <span class="min-w-0">
                        <span class="block truncate">
                          {{ highlightedMemberName(String(member[0])).before }}<mark v-if="highlightedMemberName(String(member[0])).match" class="tf-search-highlight">{{ highlightedMemberName(String(member[0])).match }}</mark>{{ highlightedMemberName(String(member[0])).after }}
                        </span>
                        <span class="block truncate text-[11px] font-normal text-task-muted">{{ member[2] }}</span>
                      </span>
                    </span>
                    <span :class="['grid h-6 w-6 shrink-0 place-items-center rounded-[7px] border text-sm font-bold', taskAssigneeIds.includes(teamMemberId(member)) ? 'border-task-blue bg-task-blue text-white' : 'border-task-line bg-white text-transparent']">✓</span>
                  </button>
                  <p v-if="!taskAssigneesLoading && !filteredTaskAssignees.length" class="px-3 py-3 text-sm text-task-muted">No team member found</p>
                </div>
              </div>
              <div v-if="taskAssigneeLabels.length" class="mt-3 flex flex-wrap gap-2">
                <span v-for="(member, index) in taskAssigneeLabels" :key="`${member}-${taskAssigneeIds[index]}`" class="inline-flex h-10 items-center gap-2 rounded-full border border-[#B9C8D8] bg-task-blueSoft pl-2 pr-3 text-sm font-semibold text-task-ink">
                  <span class="grid h-7 w-7 place-items-center rounded-full bg-white text-[9px] font-bold text-task-blue">{{ initials(member) }}</span>
                  {{ member }}
                  <button type="button" class="grid h-5 w-5 place-items-center rounded-full text-lg leading-none text-task-muted transition hover:bg-white hover:text-task-danger" :aria-label="`Remove ${member}`" @click="removeTaskAssignee(index)">×</button>
                </span>
              </div>
            </label>
            <label class="mt-4 block text-sm font-semibold">
              Category
              <input v-model="form.category" class="tf-input mt-2 h-12 w-full" placeholder="Design, Development, Marketing..." />
            </label>
            <label class="mt-4 block text-sm font-semibold">
              Priority
              <div class="tf-dropdown mt-2">
                <button type="button" class="tf-dropdown-button h-12" @click="openDropdown = openDropdown === 'formPriority' ? null : 'formPriority'">
                  <span>{{ form.priority }}</span>
                  <svg viewBox="0 0 20 20" class="h-4 w-4 shrink-0 text-task-muted transition" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg>
                </button>
                <div v-if="openDropdown === 'formPriority'" class="tf-dropdown-menu">
                  <button v-for="option in dropdownOptions.priority.filter((item) => item !== 'All Priorities')" :key="option" type="button" class="tf-dropdown-option" @click="setFormPriority(option)">
                    <span>{{ option }}</span>
                    <span v-if="form.priority === option">✓</span>
                  </button>
                </div>
              </div>
            </label>
            <div class="mt-4 grid gap-4 md:grid-cols-2">
              <label class="text-sm font-semibold">
                Status
                <div class="tf-dropdown mt-2">
                  <button type="button" class="tf-dropdown-button h-12" @click="openDropdown = openDropdown === 'taskStatus' ? null : 'taskStatus'">
                    <span>{{ taskFormStatus }}</span>
                    <svg viewBox="0 0 20 20" class="h-4 w-4 shrink-0 text-task-muted transition" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg>
                  </button>
                  <div v-if="openDropdown === 'taskStatus'" class="tf-dropdown-menu">
                    <button v-for="option in taskStatusOptions" :key="option" type="button" class="tf-dropdown-option" @click="taskFormStatus = option; openDropdown = null">
                      <span>{{ option }}</span>
                      <span v-if="taskFormStatus === option">✓</span>
                    </button>
                  </div>
                </div>
              </label>
              <label class="text-sm font-semibold">
                Due Date
                <div class="tf-date-picker relative mt-2">
                  <input v-model="form.dueDate" class="tf-input h-12 w-full pr-11" placeholder="DD.MM.YYYY" inputmode="numeric" maxlength="10" @input="handleTaskDueDateInput" @focus="openDatePicker('dueDate')" />
                  <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-task-muted transition hover:text-task-blue" aria-label="Open due date calendar" @click="openDatePicker('dueDate')">
                    <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 2v4M16 2v4M3 10h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /></svg>
                  </button>
                  <div v-if="openProjectDatePicker === 'dueDate'" class="tf-date-popover">
                    <div class="mb-3 flex items-center justify-between gap-3">
                      <p class="text-sm font-bold">{{ projectDatePickerDays.label }}</p>
                      <div class="flex items-center gap-1">
                        <button type="button" class="grid h-8 w-8 place-items-center rounded-full text-lg text-task-muted transition hover:bg-task-blueSoft hover:text-task-blue" aria-label="Previous month" @click.stop="moveDatePickerMonth(-1)">‹</button>
                        <button type="button" class="grid h-8 w-8 place-items-center rounded-full text-lg text-task-muted transition hover:bg-task-blueSoft hover:text-task-blue" aria-label="Next month" @click.stop="moveDatePickerMonth(1)">›</button>
                      </div>
                    </div>
                    <div class="mb-2 grid grid-cols-7 text-center text-[11px] font-semibold text-task-muted"><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span></div>
                    <div class="grid grid-cols-7 gap-1">
                      <button v-for="cell in projectDatePickerDays.cells" :key="cell.key" type="button" :class="['h-8 rounded-[8px] text-sm transition', cell.day ? 'hover:bg-task-blueSoft hover:text-task-blue' : 'pointer-events-none']" @click="selectProjectDate(cell.day, cell.month, cell.year)">{{ cell.day || '' }}</button>
                    </div>
                  </div>
                </div>
              </label>
            </div>
            <label class="mt-4 block text-sm font-semibold">
              Description
              <textarea v-model="form.description" class="tf-input mt-2 h-28 w-full resize-none py-3" placeholder="Add task details, requirements, or notes..." />
            </label>
          </template>
          <template v-else-if="modal === 'event'">
            <label class="block text-sm font-semibold">
              Event Title
              <input v-model="form.title" class="tf-input mt-2 h-12 w-full" placeholder="Sprint Planning, Design Review" />
            </label>
            <div class="mt-3 grid gap-3 md:grid-cols-[1fr_1fr]">
              <label class="text-sm font-semibold">
                Date
                <div class="tf-date-picker relative mt-2">
                  <input v-model="form.dueDate" class="tf-input h-11 w-full pr-11" placeholder="DD.MM.YYYY" inputmode="numeric" maxlength="10" @input="handleDateInput($event, 'dueDate')" @focus="openDatePicker('dueDate')" />
                  <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-task-muted transition hover:text-task-blue" aria-label="Open event date calendar" @click="openDatePicker('dueDate')">
                    <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 2v4M16 2v4M3 10h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /></svg>
                  </button>
                  <div v-if="openProjectDatePicker === 'dueDate'" class="tf-date-popover">
                    <div class="mb-3 flex items-center justify-between gap-3">
                      <p class="text-sm font-bold">{{ projectDatePickerDays.label }}</p>
                      <div class="flex items-center gap-1">
                        <button type="button" class="grid h-8 w-8 place-items-center rounded-full text-lg text-task-muted transition hover:bg-task-blueSoft hover:text-task-blue" aria-label="Previous month" @click.stop="moveDatePickerMonth(-1)">‹</button>
                        <button type="button" class="grid h-8 w-8 place-items-center rounded-full text-lg text-task-muted transition hover:bg-task-blueSoft hover:text-task-blue" aria-label="Next month" @click.stop="moveDatePickerMonth(1)">›</button>
                      </div>
                    </div>
                    <div class="mb-2 grid grid-cols-7 text-center text-[11px] font-semibold text-task-muted"><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span></div>
                    <div class="grid grid-cols-7 gap-1">
                      <button v-for="cell in projectDatePickerDays.cells" :key="cell.key" type="button" :class="['h-8 rounded-[8px] text-sm transition', cell.day ? 'hover:bg-task-blueSoft hover:text-task-blue' : 'pointer-events-none']" @click="selectProjectDate(cell.day, cell.month, cell.year)">{{ cell.day || '' }}</button>
                    </div>
                  </div>
                </div>
              </label>
              <div class="text-sm font-semibold">
                Time
                <div class="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <label class="relative">
                    <input v-model="form.eventTime" type="time" class="tf-input h-11 w-full cursor-text" step="60" aria-label="Event start time" />
                  </label>
                  <span class="text-task-muted">to</span>
                  <label class="relative">
                    <input v-model="form.eventEndTime" type="time" class="tf-input h-11 w-full cursor-text" step="60" aria-label="Event end time" />
                  </label>
                </div>
              </div>
            </div>
            <div class="mt-3">
              <label for="event-type" class="text-sm font-semibold">Event Type <span class="text-task-danger">*</span></label>
              <input id="event-type" v-model="form.eventType" list="event-type-suggestions" class="tf-input mt-2 h-11 w-full" placeholder="Select or type a custom event type" required autocomplete="off" />
              <datalist id="event-type-suggestions"><option v-for="option in eventTypeOptions" :key="option" :value="option" /></datalist>
              <p class="mt-1.5 text-xs italic text-task-muted">Choose a suggested type or enter your own.</p>
              <div class="mt-2 flex flex-wrap gap-2" aria-label="Suggested event types">
                <button
                  v-for="option in eventTypeOptions"
                  :key="option"
                  type="button"
                  :class="['inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition', form.eventType === option ? 'border-task-blue bg-task-blueSoft text-task-blue' : 'border-task-line bg-slate-100 text-task-muted hover:border-task-blue hover:text-task-blue']"
                  @click="form.eventType = option"
                >
                  <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path :d="option === 'Review' ? 'M4 13l5 5L20 6' : option === 'Workshop' ? 'M16 21v-2a4 4 0 0 0-8 0v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 10v-2a3 3 0 0 0-2-2.8M4 21v-2a3 3 0 0 1 2-2.8' : 'M7 8h10M7 12h10M9 16h6M5 4h14v16H5V4Z'" />
                  </svg>
                  {{ option }}
                </button>
              </div>
            </div>
            <div class="tf-event-attendee-picker relative mt-3">
              <p class="text-sm font-semibold">Attendees</p>
              <button type="button" class="tf-input mt-2 flex h-11 w-full items-center justify-between text-left" @click="eventAttendeePickerOpen = !eventAttendeePickerOpen"><span class="text-task-muted">Search and select attendees</span><span class="text-xl text-task-blue">+</span></button>
              <div v-if="eventAttendeePickerOpen" class="absolute left-0 right-0 top-[72px] z-[90] rounded-ui border border-task-line bg-white p-3 shadow-xl">
                <input v-model="eventAttendeeSearch" class="tf-input w-full" placeholder="Search by name or email..." />
                <div class="mt-2 max-h-52 overflow-y-auto">
                  <p v-if="eventAttendeesLoading" class="p-3 text-sm text-task-muted">Loading users...</p>
                  <button v-for="member in availableEventAttendees" :key="teamMemberId(member)" type="button" :class="['tf-dropdown-option gap-3', eventAttendeeIds.includes(teamMemberId(member)) ? 'bg-task-blueSoft' : '']" @click="selectEventAttendee(member)">
                    <span class="flex min-w-0 items-center gap-2.5"><span :class="['grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-bold', eventAttendeeIds.includes(teamMemberId(member)) ? 'bg-task-blue text-white' : 'bg-task-blueSoft text-task-blue']">{{ initials(teamMemberName(member)) }}</span><span class="min-w-0 text-left"><span class="block truncate font-semibold">{{ teamMemberName(member) }}</span><span class="block truncate text-[11px] font-normal text-task-muted">{{ teamMemberEmail(member) }}</span></span></span>
                    <span :class="['grid h-6 w-6 shrink-0 place-items-center rounded-[7px] border text-sm font-bold', eventAttendeeIds.includes(teamMemberId(member)) ? 'border-task-blue bg-task-blue text-white' : 'border-task-line bg-white text-transparent']">✓</span>
                  </button>
                  <p v-if="!eventAttendeesLoading && !availableEventAttendees.length" class="p-3 text-sm text-task-muted">No users found.</p>
                </div>
              </div>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <span v-for="member in eventAttendeeLabels" :key="member" class="inline-flex h-9 items-center gap-2 rounded-full border border-task-line bg-task-blueSoft px-3 text-sm font-semibold text-task-ink">
                  {{ member }} <button type="button" class="text-lg leading-none" @click="removeEventAttendee(member)">×</button>
                </span>
              </div>
            </div>
            <div class="mt-3 rounded-ui border border-[#B9C8D8] bg-task-blueSoft p-3">
              <p class="font-semibold">Meeting Link</p>
              <div class="mt-3 flex items-center gap-3">
                <input v-model="form.meetingLink" class="h-10 min-w-0 flex-1 rounded-full border border-transparent bg-white px-4 text-sm outline-none focus:border-task-blue" placeholder="https://meet.google.com/abc-defg-hij" />
                <button type="button" class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-task-ink transition hover:text-task-blue" @click="navigator.clipboard?.writeText(form.meetingLink)">
                  <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 8h10v12H8V8Zm-4 8V4h12" /></svg>
                </button>
              </div>
              <p class="mt-3 text-sm text-task-muted">Add Google Meet / Zoom Link</p>
            </div>
            <label class="mt-3 block text-sm font-semibold">
              Description
              <textarea v-model="form.description" class="tf-input mt-2 h-20 w-full resize-none py-3" placeholder="Describe project goals, scope, and objectives..." />
            </label>
          </template>
          <template v-else-if="modal === 'project'">
            <label class="block text-base font-semibold">
              Project Name
              <input v-model="form.title" class="tf-input mt-3 h-14 w-full rounded-[16px] px-5 text-base" placeholder="Enter project name" />
            </label>
            <label class="mt-5 block text-base font-semibold">
              Priority
              <div class="tf-dropdown mt-2">
                <button type="button" class="tf-dropdown-button h-14 rounded-[16px] px-5 text-base" @click="openDropdown = openDropdown === 'formPriority' ? null : 'formPriority'">
                  <span>{{ form.priority }}</span>
                  <svg viewBox="0 0 20 20" class="h-4 w-4 shrink-0 text-task-muted transition" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg>
                </button>
                <div v-if="openDropdown === 'formPriority'" class="tf-dropdown-menu">
                  <button v-for="option in dropdownOptions.priority.filter((item) => item !== 'All Priorities')" :key="option" type="button" class="tf-dropdown-option" @click="setFormPriority(option)">
                    <span>{{ option }}</span>
                    <span v-if="form.priority === option">✓</span>
                  </button>
                </div>
              </div>
            </label>
            <div class="mt-5 grid gap-x-6 gap-y-5 md:grid-cols-2">
              <label class="text-base font-semibold">
                Start Date
                <div class="tf-date-picker relative mt-2">
                  <input v-model="form.startDate" class="tf-input h-14 w-full rounded-[16px] px-5 pr-12 text-base" placeholder="DD.MM.YYYY" inputmode="numeric" maxlength="10" @input="handleDateInput($event, 'startDate')" @focus="openDatePicker('startDate')" />
                  <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-task-muted transition hover:text-task-blue" aria-label="Open start date calendar" @click="openDatePicker('startDate')">
                    <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 2v4M16 2v4M3 10h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /></svg>
                  </button>
                  <div v-if="openProjectDatePicker === 'startDate'" class="tf-date-popover">
                    <div class="mb-3 flex items-center justify-between gap-3">
                      <p class="text-sm font-bold">{{ projectDatePickerDays.label }}</p>
                      <div class="flex items-center gap-1">
                        <button type="button" class="grid h-8 w-8 place-items-center rounded-full text-lg text-task-muted transition hover:bg-task-blueSoft hover:text-task-blue" aria-label="Previous month" @click.stop="moveDatePickerMonth(-1)">‹</button>
                        <button type="button" class="grid h-8 w-8 place-items-center rounded-full text-lg text-task-muted transition hover:bg-task-blueSoft hover:text-task-blue" aria-label="Next month" @click.stop="moveDatePickerMonth(1)">›</button>
                      </div>
                    </div>
                    <div class="mb-2 grid grid-cols-7 text-center text-[11px] font-semibold text-task-muted"><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span></div>
                    <div class="grid grid-cols-7 gap-1">
                      <button v-for="cell in projectDatePickerDays.cells" :key="cell.key" type="button" :class="['h-8 rounded-[8px] text-sm transition', cell.day ? 'hover:bg-task-blueSoft hover:text-task-blue' : 'pointer-events-none']" @click="selectProjectDate(cell.day, cell.month, cell.year)">{{ cell.day || '' }}</button>
                    </div>
                  </div>
                </div>
              </label>
              <label class="text-base font-semibold">
                End Date
                <div class="tf-date-picker relative mt-2">
                  <input v-model="form.dueDate" class="tf-input h-14 w-full rounded-[16px] px-5 pr-12 text-base" placeholder="DD.MM.YYYY" inputmode="numeric" maxlength="10" @input="handleDateInput($event, 'dueDate')" @focus="openDatePicker('dueDate')" />
                  <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-task-muted transition hover:text-task-blue" aria-label="Open end date calendar" @click="openDatePicker('dueDate')">
                    <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 2v4M16 2v4M3 10h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /></svg>
                  </button>
                  <div v-if="openProjectDatePicker === 'dueDate'" class="tf-date-popover">
                    <div class="mb-3 flex items-center justify-between gap-3">
                      <p class="text-sm font-bold">{{ projectDatePickerDays.label }}</p>
                      <div class="flex items-center gap-1">
                        <button type="button" class="grid h-8 w-8 place-items-center rounded-full text-lg text-task-muted transition hover:bg-task-blueSoft hover:text-task-blue" aria-label="Previous month" @click.stop="moveDatePickerMonth(-1)">‹</button>
                        <button type="button" class="grid h-8 w-8 place-items-center rounded-full text-lg text-task-muted transition hover:bg-task-blueSoft hover:text-task-blue" aria-label="Next month" @click.stop="moveDatePickerMonth(1)">›</button>
                      </div>
                    </div>
                    <div class="mb-2 grid grid-cols-7 text-center text-[11px] font-semibold text-task-muted"><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span></div>
                    <div class="grid grid-cols-7 gap-1">
                      <button v-for="cell in projectDatePickerDays.cells" :key="cell.key" type="button" :class="['h-8 rounded-[8px] text-sm transition', cell.day ? 'hover:bg-task-blueSoft hover:text-task-blue' : 'pointer-events-none']" @click="selectProjectDate(cell.day, cell.month, cell.year)">{{ cell.day || '' }}</button>
                    </div>
                  </div>
                </div>
              </label>
              <label class="text-base font-semibold">
                Project Manager
                <div class="tf-dropdown mt-2">
                  <div class="relative"><svg viewBox="0 0 24 24" class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-task-muted" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('search')" /></svg><input v-model="projectManagerSearch" class="tf-input h-14 w-full rounded-[16px] pl-12 pr-11 text-base" :placeholder="form.projectManager || 'Search project manager...'" @focus="openDropdown = 'projectManager'" /><button v-if="form.projectManager || projectManagerSearch" type="button" class="absolute right-4 top-1/2 -translate-y-1/2 text-task-muted hover:text-task-blue" aria-label="Clear manager" @click="form.projectManager = ''; projectManagerSearch = ''; openDropdown = 'projectManager'">×</button></div>
                  <div v-if="openDropdown === 'projectManager'" class="tf-dropdown-menu max-h-64 overflow-y-auto p-2">
                    <button v-for="(member, index) in filteredProjectManagers" :key="teamMemberId(member) || String(member[0])" type="button" class="flex w-full items-center gap-3 rounded-[11px] px-3 py-2.5 text-left transition hover:bg-task-blueSoft" @click="form.projectManager = teamMemberName(member); projectManagerSearch = teamMemberName(member); openDropdown = null">
                      <span :class="['grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold', index % 4 === 0 ? 'bg-task-blueSoft text-task-blue' : index % 4 === 1 ? 'bg-task-lavender text-[#8057D5]' : index % 4 === 2 ? 'bg-task-successSoft text-task-success' : 'bg-task-warningSoft text-task-warning']">{{ initials(teamMemberName(member)) }}</span>
                      <span class="min-w-0 flex-1"><span class="block truncate text-sm font-semibold"><template v-for="(part, partIndex) in [highlightedSearchText(teamMemberName(member), projectManagerSearch)]" :key="partIndex">{{ part.before }}<mark v-if="part.match" class="tf-search-highlight">{{ part.match }}</mark>{{ part.after }}</template></span><span class="block truncate text-xs text-task-muted">{{ teamMemberEmail(member) }}</span></span>
                      <span v-if="form.projectManager === teamMemberName(member)" class="text-task-blue">✓</span>
                    </button>
                    <p v-if="!filteredProjectManagers.length" class="py-5 text-center text-sm text-task-muted">No manager found.</p>
                  </div>
                </div>
              </label>
              <label class="text-base font-semibold">
                Category
                <input v-model="form.category" class="tf-input mt-2 h-14 w-full rounded-[16px] px-5 text-base" placeholder="Development" />
              </label>
            </div>
            <div class="mt-5">
              <p class="text-base font-semibold">Team Members</p>
              <div class="tf-project-member-picker mt-2">
                <div class="relative">
                  <svg viewBox="0 0 24 24" class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-task-muted" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('search')" /></svg>
                  <input v-model="projectMemberSearch" class="tf-input h-12 w-full rounded-[14px] pl-12 pr-12 text-sm" type="search" placeholder="Search team member..." autocomplete="off" @focus="!projectMemberPickerOpen && addProjectMember()" />
                  <button type="button" class="absolute right-4 top-1/2 -translate-y-1/2 text-task-muted transition hover:text-task-blue" aria-label="Toggle team members" @click="addProjectMember"><svg viewBox="0 0 20 20" :class="['h-5 w-5 transition', projectMemberPickerOpen ? 'rotate-180' : '']" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg></button>
                  <div v-if="projectMemberPickerOpen" class="absolute left-0 top-[calc(100%+8px)] z-[90] w-full rounded-[14px] border border-task-line bg-white p-2 shadow-xl">
                  <div class="mt-2 max-h-56 overflow-y-auto">
                    <div v-if="projectMembersLoading" class="flex items-center justify-center gap-2 py-6 text-sm text-task-muted">
                      <span class="tf-search-loader" />
                      Loading members...
                    </div>
                    <button v-for="(member, index) in availableProjectMembers" v-else :key="teamMemberId(member)" type="button" class="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition hover:bg-task-blueSoft" @click="selectProjectMember(member)">
                      <span :class="['grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold', index % 4 === 0 ? 'bg-task-blueSoft text-task-blue' : index % 4 === 1 ? 'bg-task-lavender text-[#8057D5]' : index % 4 === 2 ? 'bg-task-successSoft text-task-success' : 'bg-task-warningSoft text-task-warning']">{{ initials(teamMemberName(member)) }}</span>
                      <span class="min-w-0">
                        <span class="block truncate text-sm font-semibold text-task-ink"><template v-for="(part, partIndex) in [highlightedSearchText(teamMemberName(member), projectMemberSearch)]" :key="partIndex">{{ part.before }}<mark v-if="part.match" class="tf-search-highlight">{{ part.match }}</mark>{{ part.after }}</template></span>
                        <span class="block truncate text-xs text-task-muted">{{ teamMemberEmail(member) }}</span>
                      </span>
                    </button>
                    <p v-if="!projectMembersLoading && !availableProjectMembers.length" class="py-6 text-center text-sm text-task-muted">No available members found.</p>
                  </div>
                  </div>
                </div>
                <div v-if="projectMemberLabels.length" class="mt-2 flex flex-wrap items-center gap-2">
                  <span v-for="member in projectMemberLabels" :key="member" class="inline-flex h-9 items-center gap-2 rounded-full border border-[#B9C8D8] bg-[#EAF2FC] px-3 text-xs font-semibold text-task-ink">
                    {{ member }}
                    <button type="button" class="text-base leading-none text-task-ink" aria-label="Remove member" @click="removeProjectMember(member)">×</button>
                  </span>
                </div>
              </div>
            </div>
            <label class="mt-4 block text-sm font-semibold">
              Description
              <textarea v-model="form.description" class="tf-input mt-2 h-24 w-full resize-none rounded-[14px] px-4 py-3 text-sm" placeholder="Describe project goals, scope, and objectives..." />
            </label>
          </template>
          <template v-else-if="modal === 'report'">
            <label class="block text-sm font-semibold">Report Name<input v-model="form.title" class="tf-input mt-2 h-12 w-full" placeholder="Team Performance Report" /></label>
            <label class="mt-4 block text-sm font-semibold">Report Type<div class="tf-dropdown mt-2"><button type="button" class="tf-dropdown-button h-12" @click="openDropdown = openDropdown === 'reportType' ? null : 'reportType'"><span>{{ reportType }}</span><svg viewBox="0 0 20 20" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg></button><div v-if="openDropdown === 'reportType'" class="tf-dropdown-menu"><button v-for="option in reportTypeOptions" :key="option" type="button" class="tf-dropdown-option" @click="reportType = option; openDropdown = null">{{ option }}</button></div></div></label>
            <div class="mt-4 grid gap-4 md:grid-cols-2">
              <label class="text-sm font-semibold">Start Date<input v-model="form.startDate" class="tf-input mt-2 h-12 w-full" placeholder="DD.MM.YYYY" inputmode="numeric" maxlength="10" @input="handleDateInput($event, 'startDate')" /></label>
              <label class="text-sm font-semibold">End Date<input v-model="form.dueDate" class="tf-input mt-2 h-12 w-full" placeholder="DD.MM.YYYY" inputmode="numeric" maxlength="10" @input="handleDateInput($event, 'dueDate')" /></label>
              <label class="text-sm font-semibold">Priority<div class="tf-dropdown mt-2"><button type="button" class="tf-dropdown-button h-12" @click="openDropdown = openDropdown === 'reportPriority' ? null : 'reportPriority'"><span>{{ dropdownValues.priority }}</span><svg viewBox="0 0 20 20" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg></button><div v-if="openDropdown === 'reportPriority'" class="tf-dropdown-menu"><button v-for="option in dropdownOptions.priority" :key="option" type="button" class="tf-dropdown-option" @click="setDropdownValue('priority', option)">{{ option }}</button></div></div></label>
              <label class="text-sm font-semibold">Status<div class="tf-dropdown mt-2"><button type="button" class="tf-dropdown-button h-12" @click="openDropdown = openDropdown === 'reportStatus' ? null : 'reportStatus'"><span>{{ reportStatus }}</span><svg viewBox="0 0 20 20" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg></button><div v-if="openDropdown === 'reportStatus'" class="tf-dropdown-menu"><button v-for="option in ['All Statuses', 'Completed', 'In Progress', 'Not Started']" :key="option" type="button" class="tf-dropdown-option" @click="reportStatus = option; openDropdown = null">{{ option }}</button></div></div></label>
            </div>
          </template>
          <div :class="['sticky bottom-0 flex justify-end gap-2.5 bg-white', modal === 'project' || modal === 'task' ? '-mx-5 -mb-5 mt-5 px-5 py-3' : '-mx-4 -mb-4 mt-4 border-t border-task-line px-4 py-3']">
            <button v-if="modal === 'task' && editingTaskId && taskFormStatus === 'Completed' && canManageDepartment" class="mr-auto h-10 rounded-full border border-slate-300 bg-slate-50 px-5 text-sm font-semibold text-slate-600 transition hover:border-task-blue hover:bg-task-blueSoft hover:text-task-blue" @click="archiveOpenedTask">Archive</button>
            <button class="h-10 rounded-full border border-task-line bg-white px-5 text-sm font-semibold shadow-button transition hover:border-task-blue hover:text-task-blue" @click="modal = null">Cancel</button>
            <button v-if="modal !== 'event-detail' && !(modal === 'task' && taskModalMode === 'view')" :disabled="taskSaving" class="h-10 rounded-full bg-gradient-to-b from-[#72A4D7] to-[#2567AD] px-6 text-sm font-semibold text-white shadow-button transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" @click="submitModal">{{ taskSaving ? 'Saving...' : modal === 'report' ? 'Generate Report' : modal === 'event' ? 'Create Event' : modal === 'project' ? (editingProjectId ? 'Update Project' : 'Create Project') : modal === 'member' ? 'Add Member' : modal === 'team-filter' ? 'Apply' : taskModalMode === 'edit' ? 'Save Changes' : 'Create Task' }}</button>
          </div>
        </div>
      </div>
    </div>

    <button v-if="supportWidgetOpen" type="button" class="fixed inset-0 z-[65] bg-slate-950/30 backdrop-blur-[1px]" aria-label="Close help support" @click="supportWidgetOpen = false" />
    <div class="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-3">
      <div v-if="supportWidgetOpen" class="tf-panel w-[380px] max-w-[calc(100vw-40px)] p-4 shadow-xl">
        <div class="mb-4 flex items-start justify-between gap-4">
          <div class="flex items-start gap-3">
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-ui bg-task-blueSoft text-task-blue">
              <svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true">
                <path d="M12 3v3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                <rect x="5" y="7.5" width="14" height="11.5" rx="4" fill="currentColor" />
                <circle cx="9.5" cy="13" r="1.1" fill="white" />
                <circle cx="14.5" cy="13" r="1.1" fill="white" />
                <path d="M9.5 16h5" fill="none" stroke="white" stroke-width="1.6" stroke-linecap="round" />
              </svg>
            </span>
            <div>
              <h2 class="font-bold">Help & Support</h2>
              <p class="mt-1 text-sm font-medium leading-5 text-task-muted">Found a bug or have feedback? Describe it and attach a screenshot.</p>
            </div>
          </div>
          <button type="button" class="tf-icon-button h-8 w-8 shrink-0" aria-label="Close support" title="Close" @click="supportWidgetOpen = false">
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <textarea
          v-model="feedbackDraft"
          class="tf-input h-32 w-full resize-none p-3 leading-5"
          placeholder="What went wrong, or what would you improve?"
        />
        <button type="button" class="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-ui border border-dashed border-task-line bg-white text-sm font-semibold text-task-muted transition hover:border-task-blue hover:text-task-blue" @click="attachFeedbackScreenshot">
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5h16v14H4V5Zm4 10 3-3 2 2 3-4 4 5M8 8h.01" /></svg>
          {{ feedbackScreenshotName || 'Attach screenshot' }}
        </button>
        <input ref="feedbackScreenshotInput" class="hidden" type="file" accept="image/*" @change="handleFeedbackScreenshot" />
        <div v-if="feedbackScreenshotPreview" class="mt-3 flex items-center gap-3 rounded-ui border border-task-line p-2">
          <img :src="feedbackScreenshotPreview" :alt="feedbackScreenshotName" class="h-14 w-20 rounded-ui object-cover" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-bold">{{ feedbackScreenshotName }}</p>
            <p class="text-xs text-task-muted">Screenshot attached</p>
          </div>
          <button type="button" class="tf-icon-button h-8 w-8" aria-label="Remove screenshot" title="Remove screenshot" @click="clearFeedbackScreenshot">
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <button type="button" class="tf-primary mt-3 h-11 w-full" @click="sendFeedbackToTeam">
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" /></svg>
          Send to team
        </button>
      </div>
      <button type="button" class="tf-support-launcher" aria-label="Open help support" title="Help & Support" @click="supportWidgetOpen = !supportWidgetOpen">
        <svg v-if="!supportWidgetOpen" viewBox="0 0 24 24" class="h-7 w-7" aria-hidden="true">
          <path d="M12 3v3" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
          <rect x="5" y="7.5" width="14" height="11.5" rx="4" fill="currentColor" />
          <circle cx="9.5" cy="13" r="1.1" fill="#2567AD" />
          <circle cx="14.5" cy="13" r="1.1" fill="#2567AD" />
          <path d="M9.5 16h5" fill="none" stroke="#2567AD" stroke-width="1.6" stroke-linecap="round" />
        </svg>
        <svg v-else viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M18 6 6 18M6 6l12 12" /></svg>
      </button>
    </div>

    <div
      v-if="toast"
      :class="[
        'tf-toast',
        toastType === 'error' ? 'tf-toast-error' : '',
        toastType === 'success' ? 'tf-toast-success' : '',
        toastType === 'info' ? 'tf-toast-info' : ''
      ]"
    >
      {{ toast }}
    </div>
  </main>
</template>
