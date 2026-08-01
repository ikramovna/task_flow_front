<script setup lang="ts">
import type { Ref } from 'vue'

type PageKey = 'dashboard' | 'tasks' | 'projects' | 'analytics' | 'calendar' | 'team' | 'reports' | 'messages' | 'settings' | 'help'
type ModalKey = 'task' | 'project' | 'event' | 'report' | 'team-filter' | 'logout' | null
type ProjectCardMember = {
  id?: string
  email?: string
  full_name?: string
  first_name?: string
  last_name?: string
  avatar?: string
  phone?: string
  job_title?: string
}

const activePage = ref<PageKey>('dashboard')
const settingsTab = ref<'profile' | 'notifications' | 'security'>('profile')
const modal = ref<ModalKey>(null)
const openDropdown = ref<string | null>(null)
const dropdownValues = reactive<Record<string, string>>({
  priority: 'All Priorities',
  department: 'All',
  experience: 'Mid-Level',
  skills: 'UI/UX',
  status: 'All Statuses',
  theme: 'Light',
  language: 'English (US)',
  timezone: 'Pacific Time (PT) - UTC - 8',
  currency: 'USD - US Dollar ($)',
  dateFormat: 'MM/DD/YYYY'
})
const dropdownOptions: Record<string, string[]> = {
  priority: ['All Priorities', 'Medium', 'High', 'Low'],
  department: ['All', 'Design', 'Development', 'Product', 'QA'],
  experience: ['Junior', 'Mid-Level', 'Senior', 'Lead'],
  skills: ['UI/UX', 'Frontend', 'Backend', 'Testing'],
  status: ['All Statuses', 'Active', 'Busy', 'Away'],
  theme: ['Light', 'Dark', 'System'],
  language: ['English (US)', 'Uzbek (UZ)', 'Russian (RU)'],
  timezone: ['Pacific Time (PT) - UTC - 8', 'Tashkent (UZT) - UTC + 5', 'Eastern Time (ET) - UTC - 5'],
  currency: ['USD - US Dollar ($)', 'UZS - Uzbek Som', 'EUR - Euro (€)'],
  dateFormat: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']
}
const taskFlowStore = useTaskFlowStore()
const taskFlowApi = useTaskFlowApi()

await taskFlowStore.loadBackendData()

const { state, pages, stats, projectStats, analyticsStats, monthlyProgress, tasksByCategory, tasks, projects, team, workload, reports, events, messages, heatmap, workspaceId, apiError } = taskFlowStore
const taskSearchInput = ref('')
const taskSearch = ref('')
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
const activeMessage = ref('')
const chatDraft = ref('')
const toast = ref('')
const toastType = ref<'info' | 'success' | 'error'>('info')
const actionMenu = ref<string | null>(null)
const hoveredMonthlyMonth = ref<string | null>(null)
const hoveredEfficiencyMonth = ref<string | null>(null)
const mobileSidebarOpen = ref(false)
const taskPage = ref(1)
const projectPage = ref(1)
const reportPage = ref(1)
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
const unreadNotificationCount = ref(2)
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
const deletePassword = ref('')
const appliedAppearance = reactive<Record<string, string>>({
  theme: 'Light',
  language: 'English (US)',
  timezone: 'Pacific Time (PT) - UTC - 8',
  currency: 'USD - US Dollar ($)',
  dateFormat: 'MM/DD/YYYY'
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
}

const form = reactive({
  title: '',
  assignee: '',
  priority: 'Medium',
  startDate: '',
  dueDate: '',
  projectManager: '',
  eventType: 'Meeting',
  eventTime: '',
  eventEndTime: '',
  eventColor: 'bg-task-blue',
  meetingLink: '',
  description: ''
})
const eventTypeOptions = ['Meeting', 'Review', 'Workshop']
const eventColorOptions = ['bg-task-blue', 'bg-task-success', 'bg-[#EF4444]', 'bg-[#8B5CF6]']
const editingProjectId = ref('')
const editingProjectWorkspace = ref('')
const editingProjectMembers = ref<string[]>([])
const editingProjectStartDate = ref<string | null>(null)
const projectMemberLabels = ref<string[]>([])
const eventAttendeeIds = ref<string[]>([])
const eventAttendeeLabels = ref<string[]>([])
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
const filteredProjects = computed(() => projects.value.filter((project) => includesQuery(project, projectSearch.value)))
const filteredTeam = computed(() =>
  team.value.filter((member) => {
    const role = String(member[1]).toLowerCase()
    const matchesDepartment =
      dropdownValues.department === 'All' ||
      (dropdownValues.department === 'Design' && role.includes('designer')) ||
      (dropdownValues.department === 'Development' && (role.includes('developer') || role.includes('stack'))) ||
      (dropdownValues.department === 'QA' && role.includes('qa')) ||
      (dropdownValues.department === 'Product' && role.includes('product'))
    const matchesSkills =
      dropdownValues.skills === 'UI/UX' ? role.includes('designer') : dropdownValues.skills === 'Backend' ? role.includes('backend') : dropdownValues.skills === 'Testing' ? role.includes('qa') : true
    return includesQuery(member, teamSearch.value) && matchesDepartment && matchesSkills
  })
)
const filteredReports = computed(() => reports.value.filter((report) => includesQuery(report, reportSearch.value)))
const filteredMessages = computed(() => messages.value.filter((name) => includesQuery(name, messageSearch.value)))
const filteredFaqs = computed<string[]>(() => [])
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
const teamStats = computed(() => {
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
const profileName = computed(() => `${savedProfile.firstName} ${savedProfile.lastName}`.trim())
const profileInitials = computed(() => profileName.value ? initials(profileName.value) : '')
const dashboardTitle = computed(() => profileName.value ? `Welcome back, ${savedProfile.firstName || profileName.value}!` : 'Dashboard')
const hasSavedProfileInfo = computed(() => Boolean(profileName.value || savedProfile.role || savedProfile.email))
const profileFormInitials = computed(() => {
  const name = `${profileForm.firstName} ${profileForm.lastName}`.trim()
  return name ? initials(name) : ''
})
const isDarkTheme = computed(() => dropdownValues.theme === 'Dark' || (dropdownValues.theme === 'System' && systemPrefersDark.value))
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

      return {
        id: String(event[0] || `event-${index}`),
        backendId: String(event[0] || ''),
        year: startsAt.getFullYear(),
        month: startsAt.getMonth(),
        day: startsAt.getDate(),
        meridiem: startsAt.getHours() >= 12 ? 'PM' : 'AM',
        title: String(event[1] || 'Untitled Event'),
        time: eventTimeText(startsAt, endsAt && !Number.isNaN(endsAt.getTime()) ? endsAt : null),
        color: eventColorClass(eventType),
        eventType,
        meetingUrl: String(event[6] || ''),
        description: String(event[7] || '')
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
const monthlyProgressData = computed(() => {
  return monthlyProgress.value.map((item, index, items) => {
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
  team.value
    .filter((member) => Number.isFinite(Number(member[4])))
    .slice(0, 6)
    .map((member, index, items) => {
      const value = Number(member[4] || 0)
      const previous = Number(items[index - 1]?.[4] || 0)
      const diff = value - previous
      return {
        month: String(member[0] || `Member ${index + 1}`),
        value,
        from: 'previous member',
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

const eventLabelForDay = (day: number) => currentMonthEvents.value.find((event) => event.day === day)?.title ?? ''

const eventFullDate = (event: CalendarEvent) => `${String(event.day).padStart(2, '0')} ${monthNames[event.month]} ${event.year}`

const pageCopy: Record<PageKey, { title: string; subtitle: string; eyebrow?: string }> = {
  dashboard: { title: 'Dashboard', subtitle: "Here's what's happening with your team today", eyebrow: 'Dashboard' },
  tasks: { title: 'Tasks', subtitle: 'Manage and track all team tasks', eyebrow: 'Tasks' },
  projects: { title: 'Projects', subtitle: 'Manage and monitor all active projects', eyebrow: 'Projects' },
  analytics: { title: 'Analytics & Reports', subtitle: "Detailed insights into your team's performance", eyebrow: 'Analytics' },
  calendar: { title: 'Calendar', subtitle: 'Schedule and manage team events', eyebrow: 'Calendar' },
  team: { title: 'Staff List', subtitle: 'Manage your staff and track their performance', eyebrow: 'Staff List' },
  reports: { title: 'Reports', subtitle: 'Generate and download various team reports', eyebrow: 'Reports' },
  messages: { title: 'Messages', subtitle: 'Communicate with your team members', eyebrow: 'Messages' },
  settings: { title: 'Settings', subtitle: 'Manage your account and application preferences', eyebrow: settingsTab.value === 'profile' ? 'Profile' : 'Settings' },
  help: { title: 'Settings', subtitle: 'Manage your account and application preferences', eyebrow: 'Help & Support' }
}

const setPage = (key: PageKey) => {
  activePage.value = key
  if (key === 'settings' && settingsTab.value === 'profile') settingsTab.value = 'profile'
  actionMenu.value = null
  mobileSidebarOpen.value = false
}

const focusTaskSearch = () => {
  activePage.value = 'tasks'
  actionMenu.value = null
}

const openNotifications = () => {
  setPage('settings')
  settingsTab.value = 'notifications'
  unreadNotificationCount.value = 0
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

const handleLogout = () => {
  actionMenu.value = null
  openDropdown.value = null
  modal.value = 'logout'
}

const confirmLogout = () => {
  taskFlowApi.logout()
  modal.value = null
  navigateTo('/login')
}

const notify = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
  toastType.value = type
  toast.value = message
  setTimeout(() => {
    if (toast.value === message) toast.value = ''
  }, 2400)
}

const notifyError = (message: string) => notify(message, 'error')

const closeFloatingMenus = (event: MouseEvent) => {
  const target = event.target as HTMLElement | null
  if (target?.closest('.tf-action-menu, .tf-dropdown, .tf-icon-button, .tf-date-picker')) return
  actionMenu.value = null
  openDropdown.value = null
  openProjectDatePicker.value = null
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

onMounted(() => {
  document.addEventListener('click', closeFloatingMenus)
  themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  systemPrefersDark.value = themeMediaQuery.matches
  themeMediaQuery.addEventListener('change', updateSystemTheme)
  loadProfile()

  const savedTheme = localStorage.getItem(themeStorageKey)
  if (isThemeOption(savedTheme)) {
    dropdownValues.theme = savedTheme
    appliedAppearance.theme = savedTheme
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeFloatingMenus)
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
const projectWorkspaceOf = (project: Array<string | number>) => String(project[7] || '')
const projectDescriptionOf = (project: Array<string | number>) => String(project[8] || '')
const projectStartDateOf = (project: Array<string | number>) => String(project[9] || '')
const projectMemberDetailsOf = (project: Array<string | number>): ProjectCardMember[] => {
  try {
    const parsed = JSON.parse(String(project[10] || '[]'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
const projectMembersOf = (project: Array<string | number>) => project.slice(11).map(String).filter(Boolean)
const projectMemberName = (member: ProjectCardMember) =>
  member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email || 'Member'
const teamMemberId = (member: Array<string | number>) => {
  const explicitId = String(member[7] || '')
  if (explicitId) return explicitId
  return ''
}
const teamMemberName = (member: Array<string | number>) => String(member[0] || '')
const projectMemberIdFromLabel = (label: string) => {
  const member = team.value.find((item) => teamMemberName(item) === label)
  return member ? teamMemberId(member) : ''
}
const payloadMemberId = (id: string) => (/^\d+$/.test(id) ? Number(id) : id)
const projectEnum = (value: string) => value.toLowerCase().replace(/\s+/g, '_')
const projectDisplayStatus = (value: string) => value === 'not_started' ? 'Not Started' : value === 'in_progress' ? 'In Progress' : value === 'at_risk' ? 'At Risk' : value.charAt(0).toUpperCase() + value.slice(1)
const todayIsoDate = () => new Date().toISOString().slice(0, 10)
const formatProjectDateInput = (date: Date) =>
  `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`

const parseProjectDate = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  const parts = trimmed.split(/[/-]/).map((item) => item.trim())
  if (parts.length !== 3) return trimmed

  const [first, second, third] = parts
  if (third.length === 4) return `${third}-${first.padStart(2, '0')}-${second.padStart(2, '0')}`
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
  form[openProjectDatePicker.value] = formatProjectDateInput(new Date(year, month, day))
  openProjectDatePicker.value = null
}

const defaultProjectWorkspace = () => {
  const backendProject = projects.value.find((project) => projectWorkspaceOf(project))
  return backendProject ? projectWorkspaceOf(backendProject) : workspaceId.value
}

const resolveWorkspaceId = async () => {
  const existingWorkspace = defaultProjectWorkspace()
  if (existingWorkspace) return existingWorkspace

  const workspaceResponse = await taskFlowApi.listWorkspaces()
  const workspaces = Array.isArray(workspaceResponse) ? workspaceResponse : workspaceResponse.results
  const workspace = workspaces.find((item) => item?.id)

  if (workspace?.id) {
    state.value.workspaceId = workspace.id
    state.value.workspaceName = workspace.name || workspace.slug || ''
    return workspace.id
  }

  return ''
}

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

const maskTimeInput = (field: 'eventTime' | 'eventEndTime', event: Event) => {
  const target = event.target as HTMLInputElement
  const digits = target.value.replace(/\D/g, '').slice(0, 4)
  const formatted = digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits
  form[field] = formatted
  target.value = formatted
}

const finalizeTimeInput = (field: 'eventTime' | 'eventEndTime') => {
  form[field] = normalizeTimeValue(form[field])
}

const projectPayloadFromForm = (workspace: string, status = 'in_progress') => {
  const startDate = parseProjectDate(form.startDate) || editingProjectStartDate.value || todayIsoDate()
  const dueDate = parseProjectDate(form.dueDate) || startDate
  const selectedMemberIds = editingProjectMembers.value.length
    ? editingProjectMembers.value
    : projectMemberLabels.value.map(projectMemberIdFromLabel).filter(Boolean)

  return {
    workspace: editingProjectWorkspace.value || workspace,
    name: form.title.trim(),
    description: form.description.trim(),
    status,
    priority: projectEnum(form.priority),
    start_date: startDate,
    due_date: dueDate,
    members: selectedMemberIds
  }
}

const eventPayloadFromForm = (workspace: string) => ({
  workspace,
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

const setListPage = (list: 'task' | 'project' | 'report', page: number) => {
  const target = Math.min(Math.max(page, 1), 3)
  if (list === 'task') taskPage.value = target
  if (list === 'project') projectPage.value = target
  if (list === 'report') reportPage.value = target
}

const openModal = (value: Exclude<ModalKey, null>) => {
  form.title = ''
  form.assignee = ''
  form.priority = 'Medium'
  form.startDate = todayIsoDate()
  form.dueDate = value === 'event' ? `${calendarYear.value}-${String(calendarMonthIndex.value + 1).padStart(2, '0')}-${String(selectedCalendarDay.value ?? 1).padStart(2, '0')}` : todayIsoDate()
  form.projectManager = String(team.value[0]?.[0] || '')
  form.eventType = 'Meeting'
  form.eventTime = value === 'event' ? '09:00' : ''
  form.eventEndTime = value === 'event' ? '10:30' : ''
  form.eventColor = 'bg-task-blue'
  form.meetingLink = ''
  form.description = ''
  if (value === 'event') {
    eventAttendeeIds.value = []
    eventAttendeeLabels.value = []
  }
  if (value === 'project') {
    editingProjectId.value = ''
    editingProjectWorkspace.value = ''
    editingProjectMembers.value = []
    editingProjectStartDate.value = null
    projectMemberLabels.value = []
  }
  modal.value = value
}

const assignTaskTo = (member: string) => {
  actionMenu.value = null
  openModal('task')
  form.assignee = member
}

const removeProjectMember = (member: string) => {
  const index = projectMemberLabels.value.indexOf(member)
  projectMemberLabels.value = projectMemberLabels.value.filter((item) => item !== member)
  if (index >= 0) editingProjectMembers.value.splice(index, 1)
}

const addProjectMember = () => {
  const candidate = team.value.find((member) => {
    const id = teamMemberId(member)
    return id && !editingProjectMembers.value.includes(id)
  })

  if (candidate) {
    editingProjectMembers.value.push(teamMemberId(candidate))
    projectMemberLabels.value.push(teamMemberName(candidate))
    return
  }

  notify('No more staff to add')
}

const removeEventAttendee = (member: string) => {
  const index = eventAttendeeLabels.value.indexOf(member)
  eventAttendeeLabels.value = eventAttendeeLabels.value.filter((item) => item !== member)
  if (index >= 0) eventAttendeeIds.value.splice(index, 1)
}

const addEventAttendee = () => {
  const candidate = team.value.find((member) => {
    const id = teamMemberId(member)
    return id && !eventAttendeeIds.value.includes(id)
  })

  if (candidate) {
    eventAttendeeIds.value.push(teamMemberId(candidate))
    eventAttendeeLabels.value.push(teamMemberName(candidate))
    return
  }

  notify('No more staff to add')
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
  editingProjectWorkspace.value = projectWorkspaceOf(project)
  editingProjectMembers.value = projectMembersOf(project)
  editingProjectStartDate.value = projectStartDateOf(project) || null
  form.title = String(project[0] || '')
  form.priority = String(project[2] || 'Medium')
  form.startDate = projectStartDateOf(project) || ''
  form.dueDate = String(project[5] || '')
  form.projectManager = String(team.value[0]?.[0] || '')
  form.description = projectDescriptionOf(project)
  const projectDetails = projectMemberDetailsOf(project)
  projectMemberLabels.value = projectDetails.map(projectMemberName)
  if (!editingProjectMembers.value.length) editingProjectMembers.value = projectDetails.map((member) => String(member.id || '')).filter(Boolean)
  if (!projectMemberLabels.value.length) projectMemberLabels.value = team.value.filter((member) => editingProjectMembers.value.includes(teamMemberId(member))).map(teamMemberName).filter(Boolean)
  modal.value = 'project'
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

const submitModal = async () => {
  const title = form.title.trim()

  if (modal.value === 'task') {
    notify('Tasks can be created after backend endpoint is connected')
  }

  if (modal.value === 'project') {
    const resolvedWorkspace = await resolveWorkspaceId()
    const projectPayload = projectPayloadFromForm(resolvedWorkspace, 'in_progress')
    if (!projectPayload.name) {
      notifyError('Project name is required')
      return
    }
    if (!projectPayload.workspace) {
      notifyError('Workspace is required from backend')
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
    notify('Reports can be created after backend endpoint is connected')
  }

  if (modal.value === 'event') {
    const resolvedWorkspace = await resolveWorkspaceId()
    const payload = eventPayloadFromForm(resolvedWorkspace)
    if (!payload.title) {
      notifyError('Event title is required')
      return
    }
    if (!payload.workspace) {
      notifyError('Workspace is required from backend')
      return
    }

    try {
      const created = await taskFlowApi.createEvent(payload)
      state.value.events.unshift(taskFlowApi.mapEvent(created))
      notify('Event created')
    } catch (error) {
      console.error('Event save failed.', error)
      notifyError(taskFlowApiErrorMessage(error, 'Event save failed'))
      return
    }
  }

  if (modal.value === 'team-filter') {
    actionMenu.value = null
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

const exportReports = () => {
  notify(`Exported ${filteredReports.value.length} reports`)
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

const deleteAccount = () => {
  if (!deletePassword.value.trim()) {
    notifyError('Enter password to delete account')
    return
  }

  taskFlowApi.deleteAccount(deletePassword.value)
    .then(() => {
      deletePassword.value = ''
      taskFlowApi.logout()
      navigateTo('/login')
    })
    .catch((error) => {
      console.error('Delete account failed.', error)
      notifyError(taskFlowApiErrorMessage(error, 'Delete account failed'))
    })
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

const runAction = (action: string, type: string, label: string) => {
  actionMenu.value = null

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
      <aside :class="['tf-sidebar flex w-[210px] shrink-0 flex-col gap-4 border-r border-task-line bg-white px-4 py-5', mobileSidebarOpen ? 'is-open' : '']">
        <button type="button" class="tf-icon-button absolute right-3 top-3 md:hidden" aria-label="Close menu" @click="mobileSidebarOpen = false">
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
        <button class="tf-panel flex h-12 items-center gap-3 px-4 shadow-none" type="button" @click="setPage('dashboard')">
          <div class="grid h-7 w-7 place-items-center rounded-full bg-task-blue">
            <svg viewBox="0 0 24 24" class="h-4 w-4 text-white" fill="none" stroke="currentColor" stroke-width="2.7"><path d="m7 12 3 3 7-7" /></svg>
          </div>
          <span class="text-lg font-bold">TaskFlow</span>
        </button>

        <nav class="tf-panel overflow-hidden px-3 py-4 shadow-none">
          <p class="mb-3 text-xs font-medium text-task-muted">Menu</p>
          <div class="space-y-1">
            <button
              v-for="item in menuPages"
              :key="item.key"
              type="button"
              :class="['flex h-9 w-full items-center gap-3 rounded-ui px-3 text-left text-sm transition', activePage === item.key ? 'bg-task-blueSoft font-semibold text-task-blue' : 'text-task-muted hover:bg-slate-50 hover:text-task-ink']"
              @click="setPage(item.key)"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.7"><path :d="iconPath(item.icon)" /></svg>
              <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
              <span v-if="item.badge" class="grid h-5 min-w-5 place-items-center rounded-full bg-task-danger px-1 text-[10px] font-bold text-white">{{ item.badge }}</span>
            </button>
          </div>

          <p v-if="generalPages.length" class="mb-3 mt-8 text-xs font-medium text-task-muted">General</p>
          <div v-if="generalPages.length" class="space-y-1">
            <button
              v-for="item in generalPages"
              :key="item.key"
              type="button"
              :class="['flex h-9 w-full items-center gap-3 rounded-ui px-3 text-left text-sm transition', activePage === item.key ? 'bg-task-blueSoft font-semibold text-task-blue' : 'text-task-muted hover:bg-slate-50 hover:text-task-ink']"
              @click="setPage(item.key)"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.7"><path :d="iconPath(item.icon)" /></svg>
              <span>{{ item.label }}</span>
            </button>
          </div>
        </nav>

        <div class="tf-sidebar-user mt-auto">
          <button type="button" class="flex min-w-0 flex-1 items-center gap-2 text-left" @click="setPage('settings')">
            <span class="tf-sidebar-avatar overflow-hidden">
              <img v-if="savedProfile.avatar" :src="savedProfile.avatar" alt="Profile avatar" class="h-full w-full object-cover" />
              <span v-else>{{ profileInitials }}</span>
            </span>
            <span class="min-w-0">
              <span class="block truncate text-sm font-bold leading-4">{{ profileName }}</span>
              <span class="block truncate text-[11px] text-task-muted">{{ savedProfile.email }}</span>
            </span>
          </button>
          <button type="button" class="tf-sidebar-logout" aria-label="Logout" title="Logout" @click="handleLogout">
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('logout')" /></svg>
          </button>
        </div>

      </aside>

      <div class="tf-content min-w-0 flex-1 p-4">
        <header class="tf-app-header tf-panel mb-4 flex h-14 items-center justify-between gap-4 px-4 shadow-none">
          <button type="button" class="tf-icon-button md:hidden" aria-label="Open menu" @click="mobileSidebarOpen = true">
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          <div class="tf-app-title min-w-0 flex-1">
            <h1 class="text-lg font-bold">{{ activePage === 'dashboard' ? dashboardTitle : pageCopy[activePage].title }}</h1>
            <p class="text-xs text-task-muted">{{ pageCopy[activePage].subtitle }}</p>
          </div>
          <div class="flex items-center gap-3">
            <label class="relative hidden sm:block">
              <svg viewBox="0 0 24 24" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-task-muted" fill="none" stroke="currentColor" stroke-width="1.7"><path :d="iconPath('search')" /></svg>
              <input v-model="taskSearchInput" class="tf-input w-[230px] pl-9 pr-10" placeholder="Search tasks..." @focus="focusTaskSearch" @input="focusTaskSearch" />
              <span v-if="searchLoading.task" class="tf-search-spinner" />
            </label>
            <button type="button" class="tf-icon-button relative" @click="openNotifications">
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.7"><path :d="iconPath('bell')" /></svg>
              <span v-if="showNotificationBadge" class="absolute right-2 top-2 h-2 w-2 rounded-full bg-task-danger" />
            </button>
            <button type="button" class="tf-icon-button" :aria-label="isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme'" :title="isDarkTheme ? 'Light theme' : 'Dark theme'" @click="toggleTheme">
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath(isDarkTheme ? 'sun' : 'moon')" /></svg>
            </button>
          </div>
        </header>

        <section v-if="activePage === 'dashboard'" class="space-y-4">
          <div class="grid gap-4 xl:h-[429px] xl:grid-cols-[minmax(0,1fr)_399px] xl:items-stretch">
          <div class="grid gap-4 xl:grid-rows-[180px_233px]">
            <div class="tf-panel grid min-h-[132px] gap-3 p-4 sm:min-h-[180px] sm:grid-cols-4 sm:gap-4 sm:p-6 xl:h-full xl:min-h-0">
              <div v-for="item in stats" :key="String(item[1])" :class="['flex h-[92px] flex-col items-center justify-center rounded-ui px-4 text-center sm:h-[120px]', item[2]]">
                <div class="text-2xl font-bold leading-none">{{ item[0] }} <span v-if="item[3]" class="text-sm">{{ item[3] }}</span></div>
                <p class="mt-2 text-xs text-task-muted">{{ item[1] }}</p>
              </div>
            </div>

            <div class="tf-panel min-h-[190px] p-4 sm:min-h-[233px] sm:p-6 xl:h-full xl:min-h-0">
              <div class="mb-4 flex items-start justify-between sm:mb-6">
                <div><h2 class="text-[20px] font-medium leading-[120%]">Task Status Distribution</h2></div>
                <div class="relative">
                  <button type="button" class="tf-icon-button" @click="toggleActionMenu('dashboard-status')"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path :d="iconPath('dots')" /></svg></button>
                  <div v-if="actionMenu === 'dashboard-status'" class="tf-action-menu">
                    <button type="button" class="tf-action-item" @click="actionMenu = null">Refresh</button>
                    <button type="button" class="tf-action-item" @click="setPage('tasks'); actionMenu = null">View tasks</button>
                    <button type="button" class="tf-action-item" @click="notify('Task status exported'); actionMenu = null">Export</button>
                  </div>
                </div>
              </div>
              <div class="grid gap-5 md:grid-cols-3">
                <div v-for="item in taskStatusCounts" :key="item[0]" class="tf-status-item">
                  <div class="tf-status-rail">
                    <span :class="['tf-status-dot', item[2]]" />
                    <span :class="['tf-status-line', item[2]]" />
                  </div>
                  <div>
                    <p class="tf-status-label">{{ item[0] }}</p>
                    <p class="tf-status-value">{{ item[1] }}</p>
                    <div :class="['tf-status-bar', item[3]]" />
                  </div>
                </div>
              </div>
            </div>


          </div>

          <aside class="space-y-4 xl:h-full">
            <div class="tf-panel flex min-h-[429px] w-full flex-col p-5 xl:h-full xl:min-h-0">
              <div class="mb-4 flex items-start justify-between"><div><h2 class="text-lg font-bold">Task Priority</h2><p class="mt-1 text-sm text-task-muted">Distribution by priority level</p></div><div class="relative"><button type="button" class="tf-icon-button h-10 w-10 rounded-full" @click="toggleActionMenu('priority-actions')"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path :d="iconPath('dots')" /></svg></button><div v-if="actionMenu === 'priority-actions'" class="tf-action-menu min-w-44 text-base"><button type="button" class="tf-action-item" @click="setPage('analytics'); actionMenu = null">View Details</button><button type="button" class="tf-action-item" @click="actionMenu = null">Change Date Range</button><button type="button" class="tf-action-item" @click="notify('Priority chart exported'); actionMenu = null">Export</button><button type="button" class="tf-action-item" @click="actionMenu = null">Refresh</button></div></div></div>
              <div class="relative mx-auto my-3 h-[178px] w-[178px] rounded-full" :style="priorityChartStyle"><div class="absolute inset-[58px] rounded-full bg-white" /></div>
              <div class="mt-auto grid grid-cols-2 gap-x-4 gap-y-2 text-[16px] font-normal leading-[120%] text-task-muted"><span><b class="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-task-blue" />High Priority: <span class="text-task-ink">{{ priorityCounts.high }}</span></span><span><b class="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#4B96C1]" />Medium Priority: <span class="text-task-ink">{{ priorityCounts.medium }}</span></span><span><b class="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#DCE8F4]" />Low Priority: <span class="text-task-ink">{{ priorityCounts.low }}</span></span></div>
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
                      <button type="button" class="tf-action-item" @click="notify('Team activity exported'); actionMenu = null">Export</button>
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
                      <td>{{ member[2] }}</td><td>{{ member[3] }}</td><td><span :class="['tf-pill', badgeClass(String(member[4]))]">{{ member[4] }}</span></td><td class="relative text-right"><div class="relative inline-flex"><button type="button" class="tf-icon-button" @click="toggleActionMenu(`workload-${member[0]}`)"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path :d="iconPath('dots')" /></svg></button><div v-if="actionMenu === `workload-${member[0]}`" class="tf-action-menu"><button type="button" class="tf-action-item" @click="setPage('team'); actionMenu = null">View profile</button><button type="button" class="tf-action-item" @click="notify('Messages section is disabled for now'); actionMenu = null">Message</button><button type="button" class="tf-action-item" @click="notify(`${member[0]} workload exported`); actionMenu = null">Export</button></div></div></td>
                    </tr>
                  </tbody>
                </table>
                <p v-if="!workload.length" class="py-10 text-center text-sm text-task-muted">No workload data.</p>
              </div>
            </div>
        </section>

        <section v-else-if="activePage === 'tasks'" class="tf-panel relative p-4 sm:p-5">
          <div class="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 class="text-lg font-bold">All Tasks</h2>
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label class="relative w-full sm:w-auto">
                <input v-model="taskSearchInput" class="tf-input w-full pr-10 sm:w-80" placeholder="Search tasks..." />
                <span v-if="searchLoading.task" class="tf-search-spinner" />
              </label>
              <div class="tf-dropdown w-full sm:w-auto">
                <button type="button" class="tf-filter-pill w-full sm:w-auto" @click="openDropdown = openDropdown === 'taskPriority' ? null : 'taskPriority'">
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
              <button class="tf-create-pill w-full sm:w-auto" type="button" @click="openModal('task')">
                <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('plus')" /></svg>
                Create Task
              </button>
            </div>
          </div>
          <div v-if="searchLoading.task" class="tf-search-overlay"><span class="tf-search-loader" /> Searching tasks...</div>
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-100 text-task-muted"><tr><th class="rounded-l-ui p-3">Task</th><th class="p-3">Assignee</th><th class="p-3">Priority</th><th class="p-3">Status</th><th class="p-3">Due Date</th><th class="p-3">Progress</th><th class="rounded-r-ui p-3 text-right">Actions</th></tr></thead>
            <tbody class="divide-y divide-task-line">
              <tr v-for="task in filteredTasks" :key="`${task[0]}-${task[4]}`">
                <td class="p-3 text-task-muted">{{ task[0] }}</td><td class="p-3"><div class="flex items-center gap-2"><div class="flex -space-x-2"><span v-for="i in 2" :key="i" class="grid h-6 w-6 place-items-center rounded-full border border-white bg-slate-300 text-[9px] font-bold text-white">{{ String(task[1]).slice(i - 1, i) }}</span></div>{{ task[1] }}</div></td><td class="p-3"><span :class="['tf-pill', badgeClass(String(task[2]))]">{{ task[2] }}</span></td><td class="p-3"><span :class="['tf-pill', badgeClass(String(task[3]))]">{{ task[3] }}</span></td><td class="p-3 text-task-muted">{{ task[4] }}</td><td class="p-3"><div class="flex items-center gap-2"><div class="h-2 w-20 rounded-full bg-slate-200"><div class="h-full rounded-full bg-task-blue" :style="{ width: `${task[5]}%` }" /></div><span>{{ task[5] }}%</span></div></td><td class="relative p-3 text-right"><div class="relative inline-flex"><button type="button" class="tf-icon-button" @click="toggleActionMenu(`task-${task[0]}`)"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path :d="iconPath('dots')" /></svg></button><div v-if="actionMenu === `task-${task[0]}`" class="tf-action-menu"><button type="button" class="tf-action-item" @click="actionMenu = null">View</button><button type="button" class="tf-action-item" @click="runAction('edit', 'task', String(task[0]))">Edit</button><button type="button" class="tf-action-item" @click="runAction('duplicate', 'task', String(task[0]))">Duplicate</button><button type="button" class="tf-action-item tf-action-danger" @click="runAction('delete', 'task', String(task[0]))">Delete</button></div></div></td>
              </tr>
            </tbody>
          </table>
          <p v-if="!filteredTasks.length" class="py-8 text-center text-sm text-task-muted">No tasks matched your filters.</p>
          <div class="mt-5 flex items-center justify-between text-xs text-task-muted"><span>Showing {{ filteredTasks.length }} of {{ tasks.length }} Tasks</span><div class="flex gap-2"><button class="tf-icon-button" type="button" @click="setListPage('task', taskPage - 1)">‹</button><button v-for="page in [1, 2, 3]" :key="page" :class="[taskPage === page ? 'tf-primary' : 'tf-icon-button', 'h-9 w-9 p-0']" type="button" @click="setListPage('task', page)">{{ page }}</button><button class="tf-icon-button" type="button" @click="setListPage('task', taskPage + 1)">›</button></div></div>
        </section>

        <section v-else-if="activePage === 'projects'" class="space-y-4">
          <div class="tf-panel grid gap-4 p-4 sm:grid-cols-4"><div v-for="item in projectStats" :key="item[1]" :class="['rounded-ui p-8 text-center', item[2]]"><p class="text-3xl font-bold">{{ item[0] }}</p><p class="text-sm text-task-muted">{{ item[1] }}</p></div></div>
          <div class="tf-panel relative p-5">
            <div class="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><h2 class="text-lg font-bold">All Projects</h2><div class="flex flex-col gap-3 sm:flex-row"><label class="relative w-full sm:w-auto"><input v-model="projectSearchInput" class="tf-input w-full pr-10 sm:w-80" placeholder="Search projects..." /><span v-if="searchLoading.project" class="tf-search-spinner" /></label><button class="tf-icon-button w-full px-4 sm:w-auto" type="button" @click="clearSearch('project')">Clear</button><button class="tf-primary w-full sm:w-auto" type="button" @click="openModal('project')">New Projects</button></div></div>
            <div v-if="searchLoading.project" class="tf-search-overlay"><span class="tf-search-loader" /> Searching projects...</div>
            <div class="grid gap-4 lg:grid-cols-3">
              <article v-for="project in filteredProjects" :key="project[0]" class="rounded-ui border border-task-line p-4">
                <div class="mb-3 flex items-start justify-between"><h3 class="text-lg font-bold">{{ project[0] }}</h3><div class="relative"><button type="button" class="tf-icon-button" @click="toggleActionMenu(`project-${project[0]}`)"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor"><path :d="iconPath('dots')" /></svg></button><div v-if="actionMenu === `project-${project[0]}`" class="tf-action-menu"><button type="button" class="tf-action-item" @click="viewProject(project)">View</button><button type="button" class="tf-action-item" @click="editProject(project)">Edit</button><button type="button" class="tf-action-item" @click="patchProjectStatus(project, 'completed')">Mark Completed</button><button type="button" class="tf-action-item" @click="patchProjectStatus(project, 'archived')">Archive</button><button type="button" class="tf-action-item tf-action-danger" @click="deleteProject(project)">Delete</button></div></div></div>
                <div class="mb-4 flex gap-2"><span :class="['tf-pill', badgeClass(String(project[1]))]">{{ project[1] }}</span><span :class="['tf-pill', badgeClass(String(project[2]))]">{{ project[2] }}</span></div>
                <div class="rounded-ui bg-slate-100 p-3"><div class="mb-2 flex justify-between text-sm"><span class="text-task-muted">Progress</span><span>{{ project[3] }}%</span></div><div class="h-2 rounded-full bg-slate-200"><div class="h-full rounded-full bg-task-blue" :style="{ width: `${project[3]}%` }" /></div><div class="mt-3 flex justify-between text-sm text-task-muted"><span>{{ project[4] }}</span><span>Due: {{ project[5] }}</span></div></div>
              </article>
            </div>
            <p v-if="!filteredProjects.length" class="py-8 text-center text-sm text-task-muted">No projects found.</p>
            <div class="mt-5 flex items-center justify-between text-xs text-task-muted"><span>Showing {{ filteredProjects.length }} of {{ projects.length }} Projects</span><div class="flex gap-2"><button class="tf-icon-button" type="button" @click="setListPage('project', projectPage - 1)">‹</button><button v-for="page in [1, 2, 3]" :key="page" :class="[projectPage === page ? 'tf-primary' : 'tf-icon-button', 'h-9 w-9 p-0']" type="button" @click="setListPage('project', page)">{{ page }}</button><button class="tf-icon-button" type="button" @click="setListPage('project', projectPage + 1)">›</button></div></div>
          </div>
        </section>

        <section v-else-if="activePage === 'analytics'" class="space-y-4">
          <div class="tf-panel grid gap-4 p-4 sm:grid-cols-4">
            <div v-for="item in analyticsStats" :key="String(item[1])" :class="['rounded-ui p-8 text-center', item[2]]">
              <p class="text-3xl font-bold">{{ item[0] }}</p>
              <p class="text-sm text-task-muted">{{ item[1] }}</p>
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
                    <button type="button" class="tf-action-item" @click="notify('Monthly progress exported'); actionMenu = null">Export</button>
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
                    <button type="button" class="tf-action-item" @click="notify('Efficiency chart exported'); actionMenu = null">Export</button>
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
                    <path d="M0 42H560M0 85H560M0 128H560M0 171H560M0 214H560" fill="none" stroke="#E9EEF5" stroke-dasharray="7 8" stroke-width="1.5" />
                  </svg>
                  <div class="absolute bottom-[41px] left-0 right-0 grid items-end gap-8 px-4" :style="chartColumnsStyle(efficiencyTrendData.length)">
                    <button
                      v-for="bar in efficiencyTrendData"
                      :key="bar.month"
                      type="button"
                      class="group relative flex justify-center outline-none"
                      :aria-label="`${bar.month}: efficiency ${bar.value}`"
                      @mouseenter="hoveredEfficiencyMonth = bar.month"
                      @focus="hoveredEfficiencyMonth = bar.month"
                      @blur="hoveredEfficiencyMonth = null"
                    >
                      <div
                        :class="[
                          'w-full max-w-[58px] rounded-[14px] transition',
                          bar.month === highlightedEfficiency?.month ? 'bg-task-blue' : 'bg-slate-100 group-hover:bg-task-blueSoft'
                        ]"
                        :style="{ height: efficiencyBarHeight(Number(bar.value)) }"
                      />
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

          <div class="grid gap-4 lg:grid-cols-3">
            <div class="tf-panel p-5">
              <h2 class="text-lg font-bold">Tasks by Category</h2>
              <div class="mt-5 space-y-4">
                <div v-for="cat in categoryTrendData" :key="cat.name" class="group relative grid grid-cols-[100px_1fr] items-center gap-3 text-sm">
                  <span class="text-task-muted">{{ cat.name }}</span>
                  <div class="h-4 rounded bg-slate-100">
                    <div class="h-full rounded bg-task-blue transition group-hover:bg-task-blueDark" :style="{ width: `${cat.value}%` }" />
                  </div>
                  <span class="tf-chart-tooltip">
                    <b>{{ cat.name }}</b>
                    <span>{{ cat.value }} tasks</span>
                    <span>{{ cat.growth }} from {{ cat.from }}</span>
                  </span>
                </div>
              </div>
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

            <div class="tf-panel p-5">
              <h2 class="text-lg font-bold">Productivity Trends</h2>
              <div v-if="productivityTrendData.length" class="relative mx-auto my-6 h-44 w-44 rounded-full bg-[conic-gradient(#2567AD_0_32%,#8DB1D7_32%_55%,#BBD6F0_55%_72%,#DCE8F4_72%_100%)]">
                <div class="absolute inset-10 rounded-full bg-white" />
              </div>
              <p v-else class="py-12 text-center text-sm text-task-muted">No productivity data.</p>
              <div v-if="productivityTrendData.length" class="grid grid-cols-3 gap-2 text-xs text-task-muted">
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

        <section v-else-if="activePage === 'calendar'" class="grid gap-4 lg:grid-cols-[1fr_300px]">
          <div class="space-y-4">
            <div class="tf-panel p-5">
              <div class="mb-6 flex items-center justify-between"><div class="flex items-center gap-5"><button class="text-2xl" type="button" @click="moveCalendar(-1)">‹</button><h2 class="text-lg font-bold">{{ calendarMonth }}</h2><button class="text-2xl" type="button" @click="moveCalendar(1)">›</button></div><button class="tf-primary" @click="openModal('event')">Add Event</button></div>
              <div class="tf-calendar-scroll">
                <div class="mb-4 grid min-w-[734px] grid-cols-7 text-center text-sm text-task-muted"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
                <div class="grid min-w-[734px] grid-cols-[repeat(7,minmax(97px,1fr))] gap-2.5">
                  <template v-for="cell in calendarCells" :key="cell.key">
                    <button
                      v-if="cell.day"
                      type="button"
                      :class="[
                        'flex h-[132px] min-w-[97px] flex-col rounded-[12px] border border-task-line p-[10px] text-left transition hover:border-task-blue hover:bg-task-blueSoft',
                        isTodayCell(cell.day) ? 'border-task-blue bg-task-blueSoft ring-2 ring-task-blue/20' : '',
                        selectedCalendarDay === cell.day ? 'border-task-blue bg-task-blueSoft' : ''
                      ]"
                      @click="selectCalendarDay(cell.day)"
                    >
                      <span class="flex h-7 items-center gap-2 text-base leading-7">
                        <span :class="isTodayCell(cell.day) ? 'grid h-7 w-7 place-items-center rounded-full bg-task-blue text-sm font-bold text-white' : ''">{{ cell.day }}</span>
                        <span v-if="isTodayCell(cell.day)" class="rounded-full bg-task-blue px-2 py-0.5 text-[10px] font-bold text-white">Today</span>
                      </span>
                      <div class="mt-3 min-h-[26px] w-full">
                        <span v-if="eventDays.has(cell.day)" class="block truncate rounded-full bg-task-blueSoft px-2 py-1 text-xs text-task-blue">
                          {{ eventLabelForDay(cell.day) }}
                        </span>
                      </div>
                    </button>
                    <div v-else class="h-[132px] min-w-[97px] rounded-[12px] border border-transparent" />
                  </template>
                </div>
              </div>
            </div>
          </div>
          <aside class="space-y-4">
            <div class="tf-panel p-5"><h2 class="text-lg font-bold">{{ selectedCalendarDay ? `${String(selectedCalendarDay).padStart(2, '0')} ${monthNames[calendarMonthIndex]} ${calendarYear}` : `${monthNames[calendarMonthIndex]} ${calendarYear} Events` }}</h2><div class="mt-4 space-y-4"><button v-for="event in selectedDayEvents" :key="event.id" type="button" class="flex w-full gap-4 rounded-ui bg-slate-100 p-4 text-left transition hover:bg-task-blueSoft"><span :class="['grid h-12 w-12 place-items-center rounded-full text-center text-xs font-bold text-white', event.color]">{{ String(event.day).padStart(2, '0') }}<br />{{ event.meridiem }}</span><div><p class="font-bold">{{ event.title }}</p><p class="text-xs text-task-muted">{{ eventFullDate(event) }}</p><p class="text-xs text-task-muted">{{ event.time }}</p><p class="mt-2 text-xs text-task-muted">6 attendees</p></div></button><p v-if="!selectedDayEvents.length" class="text-sm text-task-muted">No events for this day.</p></div></div>
          </aside>
        </section>

        <section v-else-if="activePage === 'team'" class="space-y-4">
          <div class="tf-panel grid gap-4 p-4 sm:grid-cols-3"><div v-for="item in teamStats" :key="item[1]" :class="['rounded-ui p-8 text-center', item[2]]"><p class="text-3xl font-bold">{{ item[0] }}</p><p class="text-sm text-task-muted">{{ item[1] }}</p></div></div>
          <div class="tf-panel relative overflow-x-auto p-5"><div class="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><h2 class="text-lg font-bold">All Staff</h2><div class="flex flex-col gap-3 sm:flex-row"><label class="relative w-full sm:w-auto"><input v-model="teamSearchInput" class="tf-input w-full pr-10 sm:w-80" placeholder="Search staff..." /><span v-if="searchLoading.team" class="tf-search-spinner" /></label><button class="tf-icon-button w-full px-4 sm:w-auto" @click="openModal('team-filter')">Filter</button><button class="tf-primary w-full sm:w-auto" @click="openModal('task')">Add Staff</button></div></div><div v-if="searchLoading.team" class="tf-search-overlay"><span class="tf-search-loader" /> Searching staff...</div><table class="w-full min-w-[900px] text-left text-sm"><thead class="bg-slate-100 text-task-muted"><tr><th class="rounded-l-ui p-3 font-semibold">Staff</th><th class="p-3 font-semibold">Role</th><th class="p-3 font-semibold">Contact</th><th class="p-3 font-semibold">Efficiency</th><th class="p-3 font-semibold">Completed</th><th class="p-3 font-semibold">In Progress</th><th class="rounded-r-ui p-3 text-right font-semibold">Actions</th></tr></thead><tbody class="divide-y divide-task-line"><tr v-for="member in filteredTeam" :key="member[0]" class="transition hover:bg-slate-50"><td class="p-3"><div class="flex items-center gap-3"><div class="grid h-9 w-9 place-items-center rounded-full bg-slate-300 text-xs font-bold text-white">{{ initials(String(member[0])) }}</div><div><p class="font-semibold text-task-ink">{{ member[0] }}</p><p class="text-xs text-task-muted">{{ member[2] }}</p></div></div></td><td class="p-3 text-task-muted">{{ member[1] }}</td><td class="p-3 text-task-muted">{{ member[3] }}</td><td class="p-3"><div class="flex items-center gap-2"><div class="h-2 w-24 rounded-full bg-slate-200"><div class="h-full rounded-full bg-task-blue" :style="{ width: `${member[4]}%` }" /></div><span class="font-medium">{{ member[4] }}%</span></div></td><td class="p-3 font-medium">{{ member[5] }}</td><td class="p-3 font-medium">{{ member[6] }}</td><td class="relative p-3 text-right"><div class="relative inline-flex"><button type="button" class="tf-icon-button" @click="toggleActionMenu(`team-${member[0]}`)"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor"><path :d="iconPath('dots')" /></svg></button><div v-if="actionMenu === `team-${member[0]}`" class="tf-action-menu"><button type="button" class="tf-action-item" @click="actionMenu = null">View profile</button><button type="button" class="tf-action-item" @click="notify('Messages section is disabled for now'); actionMenu = null">Message</button><button type="button" class="tf-action-item" @click="assignTaskTo(String(member[0]))">Assign task</button></div></div></td></tr></tbody></table><p v-if="!filteredTeam.length" class="py-8 text-center text-sm text-task-muted">No staff found.</p></div>
        </section>

        <section v-else-if="activePage === 'reports'" class="space-y-4">
          <div class="tf-panel relative p-5"><div class="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><h2 class="text-lg font-bold">Recent Reports</h2><div class="flex flex-col gap-3 sm:flex-row"><label class="relative w-full sm:w-auto"><input v-model="reportSearchInput" class="tf-input w-full pr-10 sm:w-64" placeholder="Search here..." /><span v-if="searchLoading.report" class="tf-search-spinner" /></label><button class="tf-icon-button w-full px-4 sm:w-auto" @click="clearSearch('report')">Clear</button><button class="tf-icon-button w-full px-4 sm:w-auto" @click="exportReports">Export</button><button class="tf-primary w-full sm:w-auto" @click="openModal('report')">Custom Reports</button></div></div><div v-if="searchLoading.report" class="tf-search-overlay"><span class="tf-search-loader" /> Searching reports...</div><table class="w-full text-left text-sm"><thead class="bg-slate-100 text-task-muted"><tr><th class="rounded-l-ui p-3">Report Name</th><th class="p-3">Type</th><th class="p-3">Date Generated</th><th class="p-3">Generated By</th><th class="p-3">Status</th><th class="rounded-r-ui p-3 text-right">Action</th></tr></thead><tbody><tr v-for="report in filteredReports" :key="report[0]"><td class="p-4">{{ report[0] }}</td><td>{{ report[1] }}</td><td>{{ report[2] }}</td><td>{{ report[3] }}</td><td><span :class="['tf-pill', badgeClass(report[4])]">{{ report[4] }}</span></td><td class="relative text-right"><div class="relative inline-flex"><button type="button" class="tf-icon-button" @click="toggleActionMenu(`report-${report[0]}`)"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path :d="iconPath('dots')" /></svg></button><div v-if="actionMenu === `report-${report[0]}`" class="tf-action-menu"><button type="button" class="tf-action-item" @click="notify(`${report[0]} downloaded`); actionMenu = null">Download</button><button type="button" class="tf-action-item" @click="generateReport(String(report[0])); actionMenu = null">Regenerate</button><button type="button" class="tf-action-item tf-action-danger" @click="runAction('delete', 'report', String(report[0]))">Delete</button></div></div></td></tr></tbody></table><div class="mt-5 flex items-center justify-between text-xs text-task-muted"><span>Showing {{ filteredReports.length }} of {{ reports.length }} Reports</span><div class="flex gap-2"><button class="tf-icon-button" type="button" @click="setListPage('report', reportPage - 1)">‹</button><button v-for="page in [1, 2, 3]" :key="page" :class="[reportPage === page ? 'tf-primary' : 'tf-icon-button', 'h-9 w-9 p-0']" type="button" @click="setListPage('report', page)">{{ page }}</button><button class="tf-icon-button" type="button" @click="setListPage('report', reportPage + 1)">›</button></div></div></div>
        </section>

        <section v-else-if="activePage === 'messages'" class="tf-panel grid h-[650px] overflow-hidden p-0 lg:grid-cols-[290px_1fr]">
          <aside class="relative border-r border-task-line p-5"><h2 class="font-bold">Recent Messages</h2><label class="relative mt-4 block"><input v-model="messageSearchInput" class="tf-input w-full pr-10" placeholder="Search here..." /><span v-if="searchLoading.message" class="tf-search-spinner" /></label><div v-if="searchLoading.message" class="tf-search-overlay"><span class="tf-search-loader" /> Searching...</div><div class="mt-4 divide-y divide-task-line"><button v-for="name in filteredMessages" :key="name" :class="['flex w-full items-center gap-3 py-3 text-left', activeMessage === name ? 'bg-task-blueSoft' : '']" @click="activeMessage = name"><span class="grid h-11 w-11 place-items-center rounded-full bg-slate-300 font-bold text-white">{{ initials(name) }}</span><span class="min-w-0 flex-1"><b class="block truncate">{{ name }}</b></span></button><p v-if="!filteredMessages.length" class="py-8 text-sm text-task-muted">No messages.</p></div></aside>
          <div class="flex min-w-0 flex-col items-center justify-center p-6 text-center text-task-muted">
            <p class="text-base font-semibold text-task-ink">{{ activeMessage || 'No conversation selected' }}</p>
            <p class="mt-2 text-sm">Messages data will appear here when it comes from backend.</p>
          </div>
        </section>

        <section v-else-if="activePage === 'settings'" class="tf-panel min-h-[640px] p-5">
          <div class="mb-8 flex gap-3 border-b border-task-line pb-6"><button v-for="tab in ['profile','notifications','security']" :key="tab" :class="['rounded-full border px-4 py-2 text-sm capitalize', settingsTab === tab ? 'border-task-ink bg-task-ink text-white' : 'border-task-line text-task-muted']" @click="settingsTab = tab as typeof settingsTab">{{ tab }}</button></div>
          <div v-if="settingsTab === 'profile'" class="max-w-[720px]"><h2 class="mb-5 text-lg font-bold">My Profile</h2><div class="rounded-ui border border-task-line p-5"><div class="mb-6 flex flex-wrap items-center gap-4"><span class="grid h-16 w-16 place-items-center overflow-hidden rounded-ui bg-[#EEE9FF] text-xl font-bold text-[#6F55D9]"><img v-if="profileAvatarPreview" :src="profileAvatarPreview" alt="Profile avatar preview" class="h-full w-full object-cover" /><span v-else>{{ profileFormInitials }}</span></span><input ref="profileAvatarInput" class="hidden" type="file" accept="image/*" @change="handleProfileAvatar" /><button class="h-8 rounded-full border border-task-line px-4 shadow-button" @click="chooseProfileAvatar">Change Image</button><button v-if="profileForm.avatar" class="h-8 rounded-full border border-task-line px-4 text-sm text-task-muted shadow-button" @click="removeProfileAvatar">Remove</button></div><div class="grid gap-4 md:grid-cols-2"><label class="text-sm font-semibold">First Name<input v-model="profileForm.firstName" class="tf-input mt-2 w-full" /></label><label class="text-sm font-semibold">Last Name<input v-model="profileForm.lastName" class="tf-input mt-2 w-full" /></label></div><label class="mt-4 block text-sm font-semibold">Email Address<input v-model="profileForm.email" class="tf-input mt-2 w-full" readonly /></label><label class="mt-4 block text-sm font-semibold">Phone Number<input v-model="profileForm.phone" class="tf-input mt-2 w-full" inputmode="numeric" placeholder="+998 91 638 31 91" @input="handleProfilePhoneInput" /></label><label class="mt-4 block text-sm font-semibold">Role<input v-model="profileForm.role" class="tf-input mt-2 w-full" /></label><div v-if="hasSavedProfileInfo" class="mt-4 rounded-ui bg-task-blueSoft p-3 text-sm text-task-muted"><span class="font-semibold text-task-ink">Saved user:</span> {{ [profileName, savedProfile.role, savedProfile.email].filter(Boolean).join(' · ') }}</div><div class="mt-6 flex justify-end gap-3"><button class="tf-icon-button w-auto px-4" @click="resetProfile">Cancel</button><button class="tf-primary" @click="saveSettings('Profile')">Save Changes</button></div></div></div>
          <div v-else-if="settingsTab === 'notifications'" class="max-w-[720px]"><h2 class="mb-5 text-lg font-bold">Notifications</h2><div v-for="group in ['Email Notifications','In-App Notifications']" :key="group" class="mb-5 rounded-ui border border-task-line p-5"><h3 class="border-b border-task-line pb-4 text-lg font-bold">{{ group }}</h3><div v-for="item in group === 'Email Notifications' ? ['Email Notifications','Task Updates','Team Messages','Weekly Reports'] : ['Task Assigned to You','Task Deadline Reminder','Task Overdue Alert']" :key="item" class="flex items-center justify-between py-3"><div><p class="font-semibold">{{ item }}</p><p class="text-sm text-task-muted">Notify when tasks are updated</p></div><button :class="['h-5 w-10 rounded-full p-0.5', notificationToggles[item] ? 'bg-task-blue' : 'bg-slate-300']" @click="notificationToggles[item] = !notificationToggles[item]"><span :class="['block h-4 w-4 rounded-full bg-white transition', notificationToggles[item] ? 'translate-x-5' : '']" /></button></div></div></div>
          <div v-else-if="settingsTab === 'security'" class="max-w-[720px] space-y-5">
            <h2 class="text-lg font-bold">Security</h2>
            <div class="rounded-ui border border-task-line p-5">
              <h3 class="border-b border-task-line pb-4 text-lg font-bold">Change Password</h3>
              <div v-for="field in passwordFields" :key="field.key" class="relative mt-4">
                <input
                  v-model="passwordForm[field.key]"
                  class="tf-input w-full pr-12"
                  :placeholder="field.placeholder"
                  :type="passwordInputType(field.key)"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-task-muted transition hover:bg-task-blueSoft hover:text-task-blue"
                  :aria-label="passwordVisible[field.key] ? 'Hide password' : 'Show password'"
                  @click="togglePasswordVisibility(field.key)"
                >
                  <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path :d="iconPath(passwordVisible[field.key] ? 'eyeOff' : 'eye')" />
                  </svg>
                </button>
              </div>
              <div class="mt-5 flex justify-end gap-3">
                <button class="tf-icon-button w-auto px-4" @click="resetPassword">Cancel</button>
                <button class="tf-primary" @click="saveSettings('Password')">Update Password</button>
              </div>
            </div>
            <div class="rounded-ui border border-task-dangerSoft bg-task-dangerSoft p-5">
              <h3 class="text-lg font-bold text-task-danger">Delete Account</h3>
              <p class="mt-1 text-sm text-task-muted">Enter your password to permanently delete this account.</p>
              <input v-model="deletePassword" class="tf-input mt-4 w-full" placeholder="Enter password" type="password" />
              <div class="mt-5 flex justify-end">
                <button class="rounded-ui bg-task-danger px-5 py-2 text-sm font-semibold text-white shadow-button" @click="deleteAccount">Delete Account</button>
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

    <div v-if="modal" class="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-6">
      <div :class="['w-full overflow-hidden rounded-ui bg-[#E3EAF2] shadow-2xl', modal === 'project' || modal === 'event' ? 'max-w-[720px]' : 'max-w-[560px]']">
        <div class="flex items-center justify-between px-6 py-5"><h2 class="text-xl font-bold">{{ modal === 'task' ? 'Create Task' : modal === 'project' ? 'Create New Project' : modal === 'event' ? 'Add New Event' : modal === 'report' ? 'Custom Report Builder' : modal === 'logout' ? 'Log out' : 'Filter Staff' }}</h2><button class="text-3xl leading-none" @click="modal = null">×</button></div>
        <div class="m-2 rounded-ui bg-white p-4">
          <template v-if="modal === 'logout'">
            <div class="flex items-start gap-4">
              <span class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-task-blueSoft text-task-blue">
                <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.9"><path :d="iconPath('logout')" /></svg>
              </span>
              <div>
                <p class="text-lg font-semibold text-task-ink">Are you sure you want to log out?</p>
                <p class="mt-1 text-sm text-task-muted">Your current session will be closed and you will need to sign in again.</p>
              </div>
            </div>
          </template>
          <template v-else-if="modal === 'team-filter'">
            <div class="grid gap-4 md:grid-cols-2"><label v-for="field in [['Department','department'],['Experience','experience'],['Skills','skills'],['Status','status']]" :key="field[1]">{{ field[0] }}<div class="tf-dropdown mt-2"><button type="button" class="tf-dropdown-button" @click="openDropdown = openDropdown === field[1] ? null : String(field[1])"><span>{{ dropdownValues[String(field[1])] }}</span><svg viewBox="0 0 20 20" class="h-4 w-4 shrink-0 text-task-muted transition" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg></button><div v-if="openDropdown === field[1]" class="tf-dropdown-menu"><button v-for="option in dropdownOptions[String(field[1])]" :key="option" type="button" class="tf-dropdown-option" @click="setDropdownValue(String(field[1]), option)"><span>{{ option }}</span><span v-if="dropdownValues[String(field[1])] === option">✓</span></button></div></div></label></div><div class="mt-5 rounded-ui bg-slate-100 p-4"><p class="font-bold">Workload</p><input type="range" class="mt-3 w-full accent-task-blue" value="70" /><div class="flex justify-between text-sm text-task-muted"><span>0%</span><span>Current: 70%</span><span>100%</span></div></div>
          </template>
          <template v-else-if="modal === 'event'">
            <label class="block text-sm font-semibold">
              Event Title
              <input v-model="form.title" class="tf-input mt-2 h-12 w-full" placeholder="Sprint Planning, Design Review" />
            </label>
            <div class="mt-4 grid gap-4 md:grid-cols-[1fr_1fr]">
              <label class="text-sm font-semibold">
                Date
                <div class="tf-date-picker relative mt-2">
                  <input v-model="form.dueDate" class="tf-input h-12 w-full pr-11" placeholder="MM/DD/YYYY" @focus="openDatePicker('dueDate')" />
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
                    <input v-model="form.eventTime" class="tf-input h-12 w-full pr-10" inputmode="numeric" maxlength="5" placeholder="09:00" @input="maskTimeInput('eventTime', $event)" @blur="finalizeTimeInput('eventTime')" />
                    <svg viewBox="0 0 24 24" class="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-task-muted" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 6v6l4 2M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Z" /></svg>
                  </label>
                  <span class="text-task-muted">to</span>
                  <label class="relative">
                    <input v-model="form.eventEndTime" class="tf-input h-12 w-full pr-10" inputmode="numeric" maxlength="5" placeholder="10:30" @input="maskTimeInput('eventEndTime', $event)" @blur="finalizeTimeInput('eventEndTime')" />
                    <svg viewBox="0 0 24 24" class="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-task-muted" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 6v6l4 2M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Z" /></svg>
                  </label>
                </div>
              </div>
            </div>
            <div class="mt-4">
              <p class="text-sm font-semibold">Event Type</p>
              <div class="mt-2 flex flex-wrap gap-2">
                <button
                  v-for="option in eventTypeOptions"
                  :key="option"
                  type="button"
                  :class="['inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition', form.eventType === option ? 'border-task-blue bg-task-blueSoft text-task-ink' : 'border-task-line bg-slate-100 text-task-ink hover:border-task-blue']"
                  @click="form.eventType = option"
                >
                  <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path :d="option === 'Review' ? 'M4 13l5 5L20 6' : option === 'Workshop' ? 'M16 21v-2a4 4 0 0 0-8 0v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 10v-2a3 3 0 0 0-2-2.8M4 21v-2a3 3 0 0 1 2-2.8' : 'M7 8h10M7 12h10M9 16h6M5 4h14v16H5V4Z'" />
                  </svg>
                  {{ option }}
                </button>
              </div>
            </div>
            <div class="mt-4">
              <p class="text-sm font-semibold">Attendees</p>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <span v-for="member in eventAttendeeLabels" :key="member" class="inline-flex h-9 items-center gap-2 rounded-full border border-task-line bg-task-blueSoft px-3 text-sm font-semibold text-task-ink">
                  {{ member }} <button type="button" class="text-lg leading-none" @click="removeEventAttendee(member)">×</button>
                </span>
                <button type="button" class="inline-flex h-9 items-center gap-2 rounded-full px-2 text-sm font-semibold text-task-blue transition hover:bg-task-blueSoft" @click="addEventAttendee">
                  <span class="text-2xl leading-none">+</span>
                  Add attendee
                </button>
              </div>
            </div>
            <div class="mt-4 rounded-ui border border-[#B9C8D8] bg-task-blueSoft p-4">
              <p class="font-semibold">Meeting Link</p>
              <div class="mt-3 flex items-center gap-3">
                <input v-model="form.meetingLink" class="h-11 min-w-0 flex-1 rounded-full border border-transparent bg-white px-4 text-sm outline-none focus:border-task-blue" placeholder="https://meet.google.com/abc-defg-hij" />
                <button type="button" class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-task-ink transition hover:text-task-blue" @click="navigator.clipboard?.writeText(form.meetingLink)">
                  <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 8h10v12H8V8Zm-4 8V4h12" /></svg>
                </button>
              </div>
              <p class="mt-3 text-sm text-task-muted">Add Google Meet / Zoom Link</p>
            </div>
            <div class="mt-4">
              <p class="text-sm font-semibold">Event Color</p>
              <div class="mt-2 flex gap-3">
                <button
                  v-for="color in eventColorOptions"
                  :key="color"
                  type="button"
                  :class="['h-9 w-9 rounded-full ring-offset-2 transition', color, form.eventColor === color ? 'ring-2 ring-task-ink' : 'hover:scale-105']"
                  aria-label="Select event color"
                  @click="form.eventColor = color"
                />
              </div>
            </div>
            <label class="mt-4 block text-sm font-semibold">
              Description
              <textarea v-model="form.description" class="tf-input mt-2 h-28 w-full resize-none py-3" placeholder="Describe project goals, scope, and objectives..." />
            </label>
          </template>
          <template v-else-if="modal === 'project'">
            <label class="block text-sm font-semibold">
              Project Name
              <input v-model="form.title" class="tf-input mt-2 h-12 w-full" placeholder="Enter project name" />
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
                Start Date
                <div class="tf-date-picker relative mt-2">
                  <input v-model="form.startDate" class="tf-input h-12 w-full pr-11" placeholder="YYYY-MM-DD" @focus="openDatePicker('startDate')" />
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
              <label class="text-sm font-semibold">
                End Date
                <div class="tf-date-picker relative mt-2">
                  <input v-model="form.dueDate" class="tf-input h-12 w-full pr-11" placeholder="YYYY-MM-DD" @focus="openDatePicker('dueDate')" />
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
              <label class="text-sm font-semibold md:col-span-2">
                Project Manager
                <div class="tf-dropdown mt-2">
                  <button type="button" class="tf-dropdown-button h-12" @click="openDropdown = openDropdown === 'projectManager' ? null : 'projectManager'">
                    <span>{{ form.projectManager || 'Select manager' }}</span>
                    <svg viewBox="0 0 20 20" class="h-4 w-4 shrink-0 text-task-muted transition" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg>
                  </button>
                  <div v-if="openDropdown === 'projectManager'" class="tf-dropdown-menu">
                    <button v-for="member in team" :key="String(member[0])" type="button" class="tf-dropdown-option" @click="form.projectManager = String(member[0]); openDropdown = null">
                      <span>{{ member[0] }}</span>
                      <span v-if="form.projectManager === String(member[0])">✓</span>
                    </button>
                  </div>
                </div>
              </label>
            </div>
            <div class="mt-4">
              <p class="text-sm font-semibold">Team Members</p>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <span v-for="member in projectMemberLabels" :key="member" class="inline-flex h-9 items-center gap-2 rounded-full border border-task-line bg-task-blueSoft px-3 text-sm font-semibold text-task-ink">
                  {{ member }}
                  <button type="button" class="text-lg leading-none text-task-ink" aria-label="Remove member" @click="removeProjectMember(member)">×</button>
                </span>
                <button type="button" class="inline-flex h-9 items-center gap-2 rounded-full px-2 text-sm font-semibold text-task-blue" @click="addProjectMember">
                  <span class="text-2xl leading-none">+</span>
                  Add member
                </button>
              </div>
            </div>
            <label class="mt-4 block text-sm font-semibold">
              Description
              <textarea v-model="form.description" class="tf-input mt-2 h-28 w-full resize-none py-3" placeholder="Describe project goals, scope, and objectives..." />
            </label>
          </template>
          <template v-else>
            <label class="block text-sm font-semibold">{{ modal === 'report' ? 'Report Name' : modal === 'event' ? 'Event Title' : modal === 'project' ? 'Project Name' : 'Task Title' }}<input v-model="form.title" class="tf-input mt-2 w-full" :placeholder="modal === 'report' ? 'Team Performance Report' : modal === 'event' ? 'Sprint Planning' : 'Enter title'" /></label>
            <div class="mt-4 grid gap-4 md:grid-cols-2"><label class="text-sm font-semibold">Priority<div class="tf-dropdown mt-2"><button type="button" class="tf-dropdown-button" @click="openDropdown = openDropdown === 'formPriority' ? null : 'formPriority'"><span>{{ form.priority }}</span><svg viewBox="0 0 20 20" class="h-4 w-4 shrink-0 text-task-muted transition" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg></button><div v-if="openDropdown === 'formPriority'" class="tf-dropdown-menu"><button v-for="option in dropdownOptions.priority.filter((item) => item !== 'All Priorities')" :key="option" type="button" class="tf-dropdown-option" @click="setFormPriority(option)"><span>{{ option }}</span><span v-if="form.priority === option">✓</span></button></div></div></label><label class="text-sm font-semibold">Due Date<input v-model="form.dueDate" class="tf-input mt-2 w-full" /></label></div>
            <label v-if="modal === 'task'" class="mt-4 block text-sm font-semibold">Assignee<input v-model="form.assignee" class="tf-input mt-2 w-full" /></label>
            <label class="mt-4 block text-sm font-semibold">Description<textarea v-model="form.description" class="tf-input mt-2 h-24 w-full resize-none" placeholder="Describe project goals, scope, and objectives..." /></label>
          </template>
          <div class="mt-5 flex justify-end gap-3">
            <button class="tf-icon-button w-auto px-4" @click="modal = null">Cancel</button>
            <button v-if="modal === 'logout'" class="tf-primary" @click="confirmLogout">Log out</button>
            <button v-else class="tf-primary" @click="submitModal">{{ modal === 'report' ? 'Generate Report' : modal === 'event' ? 'Create Event' : modal === 'project' ? (editingProjectId ? 'Update Project' : 'Create Project') : modal === 'team-filter' ? 'Apply' : 'Create Task' }}</button>
          </div>
        </div>
      </div>
    </div>

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
