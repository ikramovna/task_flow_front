<script setup lang="ts">
import type { Ref } from 'vue'
import type { AnalyticsCard, AnalyticsSummary, ApiChatMessage, ApiConversation } from '~/composables/useTaskFlowApi'
import GreetingCard from '~/components/GreetingCard.vue'
import { greetingConfig } from '~/constants/greetings'
import { taskFlowSidebarGroups, type TaskFlowPageKey } from '~/constants/navigation'

type PageKey = TaskFlowPageKey
type ModalKey = 'task' | 'project' | 'event' | 'event-detail' | 'event-delete' | 'report' | 'member' | 'member-profile' | 'member-remove' | 'analytics-user-tasks' | 'team-filter' | 'logout' | null
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
type SmartTaskDraft = {
  title: string
  description: string
  priority: 'Low' | 'Medium' | 'High'
  dueDate: string
  category: string
  departmentId: string
  departmentName: string
  assigneeId: string
  assigneeName: string
  acceptanceCriteria: string[]
}

const pageStorageKey = 'taskflow-active-page'
const validPageKeys: PageKey[] = ['dashboard', 'tasks', 'projects', 'analytics', 'calendar', 'team', 'reports', 'messages', 'notifications', 'settings', 'help']
const pageCookie = useCookie<PageKey | null>('taskflow-active-page', { sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 })
// The cookie is available to both SSR and the first client render, preventing
// Dashboard from flashing before the URL/local preference is restored.
const initialPage = pageCookie.value && validPageKeys.includes(pageCookie.value) ? pageCookie.value : 'dashboard'
const activePage = ref<PageKey>(initialPage)
const tikoPageLoading = ref(true)
let tikoPageLoadingSequence = 0
const finishTikoPageLoading = async (sequence: number, startedAt: number) => {
  const remaining = Math.max(0, 420 - (Date.now() - startedAt))
  if (remaining) await new Promise(resolve => setTimeout(resolve, remaining))
  if (sequence === tikoPageLoadingSequence) tikoPageLoading.value = false
}
const sidebarNavigationKey = ref(0)
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
const route = useRoute()

const analyticsFilters = reactive({
  department: '',
  employee: '',
  priority: '',
  status: '',
  days: '30',
  start_date: '',
  end_date: '',
  granularity: 'day'
})
const analyticsLoading = ref(false)
const analyticsFilterError = ref('')
const analyticsPerformanceLevel = ref('')
const analyticsGlobalSearch = ref('')
const analyticsStaffSearchInput = ref('')
const analyticsStaffSearch = ref('')
const analyticsStaffSearchPending = ref(false)
type AnalyticsStaffRow = {
  id: string
  name: string
  role: string
  avatar: string
  department: string
  assigned: number
  completed: number
  active: number
  onHold: number
  overdue: number
  onTime: number
  performanceScore: number | null
  performanceLevel: string
  avgCompletionDays: number
}
const analyticsStaffRows = ref<AnalyticsStaffRow[]>([])
const selectedAnalyticsStaff = ref<AnalyticsStaffRow | null>(null)
const analyticsStaffTotal = ref(0)
const analyticsStaffTotalPages = ref(1)
const analyticsSummary = ref<AnalyticsSummary | null>(null)
type AnalyticsDepartmentPerformanceChartItem = {
  key: string
  label: string
  value: number
  completed: number
  inProgress: number
  overdue: number
  total: number
}
const analyticsDepartmentPerformance = ref<AnalyticsDepartmentPerformanceChartItem[]>([])
const analyticsMetricNumber = (value: unknown) => {
  const rawValue = value && typeof value === 'object' && 'value' in value
    ? (value as { value?: unknown }).value
    : value
  const numericValue = Number(rawValue)
  return Number.isFinite(numericValue) ? numericValue : 0
}
const normalizeAnalyticsDepartmentPerformance = (value: unknown): AnalyticsDepartmentPerformanceChartItem[] => {
  const payload = value as any
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.results)
      ? payload.results
      : payload && typeof payload === 'object'
        ? Object.entries(payload).map(([key, item]) => item && typeof item === 'object' ? { ...(item as object), __key: key } : { __key: key, value: item })
        : []

  return rows.map((rawItem: any, index: number) => {
    const item = rawItem && typeof rawItem === 'object' ? rawItem : { value: rawItem }
    const department = item.department
    const departmentDetail = department && typeof department === 'object' ? department : {}
    const label = String(
      item.department_name
      ?? departmentDetail.name
      ?? departmentDetail.title
      ?? (typeof department === 'string' && department.trim() ? department : undefined)
      ?? item.name
      ?? item.label
      ?? item.__key
      ?? `Department ${index + 1}`
    ).trim()
    const score = item.completion_rate
    return {
      key: String(item.department_id ?? departmentDetail.id ?? item.__key ?? label ?? index),
      label: label || `Department ${index + 1}`,
      value: Math.max(0, analyticsMetricNumber(score)),
      completed: analyticsMetricNumber(item.completed),
      inProgress: analyticsMetricNumber(item.in_progress),
      overdue: analyticsMetricNumber(item.overdue),
      total: analyticsMetricNumber(item.total)
    }
  })
}
const absoluteMediaUrl = (value: unknown) => {
  const mediaPath = String(value || '').trim()
  if (!mediaPath || /^(?:https?:)?\/\//i.test(mediaPath) || mediaPath.startsWith('data:') || mediaPath.startsWith('blob:')) return mediaPath
  const apiBase = String(runtimeConfig.public.apiBase || '')
  if (!apiBase) return mediaPath
  try {
    return new URL(mediaPath, `${new URL(apiBase).origin}/`).toString()
  } catch {
    return mediaPath
  }
}
const analyticsOrdering = ref('-performance')
const analyticsTableOrdering = ref('-performance')
const analyticsOrderingOptions = [
  ['-performance', 'Highest performance'],
  ['-assigned', 'Most assigned'],
  ['-completed', 'Most completed'],
  ['-in_progress', 'Most in progress'],
  ['-on_hold', 'Most on hold'],
  ['-overdue', 'Most overdue'],
  ['-on_time', 'Highest on-time'],
  ['avg_time', 'Fastest avg. time'],
  ['name', 'Name A–Z'],
] as const
const analyticsOrderingLabel = computed(() => analyticsOrderingOptions.find(item => item[0] === analyticsOrdering.value)?.[1] || 'Highest performance')
type AnalyticsSortColumn = 'name' | 'department' | 'assigned' | 'completed' | 'in_progress' | 'on_hold' | 'overdue' | 'on_time' | 'avg_time' | 'performance'
const toggleAnalyticsSort = (column: AnalyticsSortColumn) => {
  const isCurrentColumn = analyticsTableOrdering.value.replace(/^-/, '') === column
  analyticsTableOrdering.value = isCurrentColumn
    ? (analyticsTableOrdering.value.startsWith('-') ? column : `-${column}`)
    : (column === 'name' || column === 'department' || column === 'avg_time' ? column : `-${column}`)
  analyticsPage.value = 1
}
const analyticsSortMark = (column: AnalyticsSortColumn) => {
  if (analyticsTableOrdering.value.replace(/^-/, '') !== column) return '↕'
  return analyticsTableOrdering.value.startsWith('-') ? '↓' : '↑'
}
const analyticsPage = ref(1)
const analyticsPageSize = ref(8)
let analyticsRequestSequence = 0

const resetAnalyticsFilters = () => {
  Object.assign(analyticsFilters, { department: '', employee: '', priority: '', status: '', days: '30', start_date: '', end_date: '', granularity: 'day' })
  analyticsPerformanceLevel.value = ''
  analyticsGlobalSearch.value = ''
  analyticsStaffSearchInput.value = ''
  analyticsStaffSearch.value = ''
  analyticsStaffSearchPending.value = false
  analyticsOrdering.value = '-performance'
  analyticsPage.value = 1
  analyticsPageSize.value = 8
}

const setAnalyticsDays = (days: string) => {
  analyticsFilters.days = days
  analyticsFilters.start_date = ''
  analyticsFilters.end_date = ''
  analyticsPage.value = 1
  openDropdown.value = null
  void loadFilteredAnalytics()
}

const loadFilteredAnalytics = async () => {
  if (activePage.value !== 'analytics') return
  const sequence = ++analyticsRequestSequence
  analyticsLoading.value = true
  analyticsFilterError.value = ''
  try {
    const query = {
      ...Object.fromEntries(Object.entries(analyticsFilters).filter(([, value]) => value)),
      performance_level: analyticsPerformanceLevel.value || undefined,
      search: analyticsGlobalSearch.value.trim() || undefined,
      staff_search: analyticsStaffSearch.value.trim() || undefined,
      ordering: analyticsOrdering.value,
      page: analyticsPage.value,
      page_size: analyticsPageSize.value
    } as any
    if (query.start_date || query.end_date) delete query.days
    if (query.days) delete query.granularity
    const analytics = await taskFlowApi.getAnalytics(query)
    if (sequence !== analyticsRequestSequence) return
    const summary = analytics.summary
    analyticsSummary.value = summary || null
    const analyticsPayload = analytics as any
    const departmentPerformancePayload = analyticsPayload.department_performance
      ?? analyticsPayload.charts?.department_performance
      ?? analyticsPayload.data?.department_performance
      ?? analyticsPayload.results?.department_performance
      ?? analyticsPayload.analytics?.department_performance
    analyticsDepartmentPerformance.value = normalizeAnalyticsDepartmentPerformance(departmentPerformancePayload)
    const staffPerformance = analytics.staff_performance || {}
    const staffResults = Array.isArray(staffPerformance.results) ? staffPerformance.results : []
    analyticsStaffRows.value = staffResults.map((item: any) => {
      const staff = item.staff_member || item.staff_member_detail || item.employee || item.employee_detail || item.user || item.staff || {}
      const department = item.department || staff.department || {}
      return {
        id: String(item.id ?? item.employee_id ?? staff.id ?? ''),
        name: String(item.full_name ?? item.name ?? staff.full_name ?? staff.name ?? staff.email ?? 'Member'),
        role: String(item.job_title ?? item.position ?? staff.job_title ?? staff.position ?? staff.role ?? 'Team member'),
        avatar: absoluteMediaUrl(item.avatar ?? item.avatar_url ?? item.profile_picture ?? staff.avatar ?? staff.avatar_url ?? staff.profile_picture),
        department: String(item.department_name ?? department.name ?? department.title ?? 'No department'),
        assigned: Number(item.assigned ?? item.assigned_tasks ?? item.total_tasks ?? 0),
        completed: Number(item.completed ?? item.completed_tasks ?? 0),
        active: Number(item.in_progress ?? item.in_progress_tasks ?? 0),
        onHold: Number(item.on_hold ?? item.on_hold_tasks ?? 0),
        overdue: Number(item.overdue ?? item.overdue_tasks ?? 0),
        onTime: Number(item.on_time ?? item.on_time_percentage ?? item.on_time_rate ?? 0),
        performanceScore: item.performance_score == null || !Number.isFinite(Number(item.performance_score)) ? null : Number(item.performance_score),
        performanceLevel: String(item.performance_level ?? 'not_rated'),
        avgCompletionDays: Number(item.avg_completion_days ?? 0),
      }
    })
    analyticsStaffTotal.value = Number(staffPerformance.count ?? analyticsStaffRows.value.length)
    analyticsStaffTotalPages.value = Math.max(1, Number(staffPerformance.total_pages ?? Math.ceil(analyticsStaffTotal.value / analyticsPageSize.value)))
    state.value.analyticsStats = (summary?.cards || []).map((card) => [String(card.value), card.label, card.unit])
    state.value.monthlyProgress = taskFlowApi.mapAnalyticsMonthlyProgress(analytics)
    state.value.tasksByCategory = taskFlowApi.mapAnalyticsTasksByCategory(analytics)
  } catch (error) {
    if (sequence === analyticsRequestSequence) analyticsFilterError.value = taskFlowApiErrorMessage(error, 'Analytics data could not be loaded')
  } finally {
    if (sequence === analyticsRequestSequence) {
      analyticsLoading.value = false
      if (analyticsStaffSearchInput.value.trim() === analyticsStaffSearch.value.trim()) analyticsStaffSearchPending.value = false
    }
  }
}

let analyticsFilterTimer: ReturnType<typeof setTimeout> | undefined
let analyticsStaffSearchTimer: ReturnType<typeof setTimeout> | undefined
watch(analyticsStaffSearchInput, (value) => {
  analyticsStaffSearchPending.value = true
  clearTimeout(analyticsStaffSearchTimer)
  analyticsStaffSearchTimer = setTimeout(() => {
    if (analyticsStaffSearch.value === value) {
      analyticsStaffSearchPending.value = false
      return
    }
    analyticsStaffSearch.value = value
    if (analyticsPage.value !== 1) analyticsPage.value = 1
    else void loadFilteredAnalytics()
  }, 300)
})
watch([activePage, () => ({ ...analyticsFilters }), analyticsPerformanceLevel, analyticsGlobalSearch, analyticsOrdering, analyticsPage, analyticsPageSize], () => {
  clearTimeout(analyticsFilterTimer)
  analyticsFilterTimer = setTimeout(loadFilteredAnalytics, 250)
}, { deep: true })
watch([() => analyticsFilters.department, () => analyticsFilters.employee, () => analyticsFilters.status, () => analyticsFilters.days, analyticsPerformanceLevel, analyticsGlobalSearch, analyticsOrdering, analyticsPageSize], () => {
  if (analyticsPage.value !== 1) analyticsPage.value = 1
})
watch(analyticsOrdering, (value) => {
  analyticsTableOrdering.value = value
})

const initialLoadingStartedAt = Date.now()
const initialLoadingSequence = ++tikoPageLoadingSequence
void taskFlowStore.loadBackendData().finally(async () => {
  // The initial dashboard bootstrap intentionally carries no analytics payload
  // and replaces the shared store. Reload the filtered analytics afterwards so
  // a direct refresh on #analytics cannot wipe out performance_trend.
  if (activePage.value === 'analytics') await loadFilteredAnalytics()
  await finishTikoPageLoading(initialLoadingSequence, initialLoadingStartedAt)
})

const { state, pages, stats, projectStats, analyticsStats, monthlyProgress, tasksByCategory, tasks, projects, team, workload, reports, events, messages, heatmap, currentUserId, currentDepartmentId, currentRole, currentUserActive, currentUserHasAllDepartmentsAccess, currentUserAccessibleDepartmentIds, apiError, dashboardTodayEvents, dashboardUpcomingEvents, dashboardDeadlines, dashboardDepartments, dashboardRecentTasks, dashboardGeneratedAt } = taskFlowStore
const normalizedRole = computed(() => currentRole.value.trim().toLowerCase())
const canManageDepartment = computed(() => ['owner', 'admin', 'manager'].includes(normalizedRole.value))
const canManageMembers = computed(() => currentUserActive.value && ['owner', 'admin', 'manager'].includes(normalizedRole.value))
const canAddTask = computed(() => currentUserActive.value && ['owner', 'admin', 'manager'].includes(normalizedRole.value))
const canCreateEvent = computed(() => canAddTask.value)
const canCreateTaskInAnyDepartment = computed(() => currentUserActive.value && ['owner', 'admin', 'manager'].includes(normalizedRole.value))
const canChooseDepartment = computed(() =>
  ['owner', 'admin', 'manager'].includes(normalizedRole.value) &&
  (currentUserHasAllDepartmentsAccess.value || currentUserAccessibleDepartmentIds.value.length > 1 || !currentDepartmentId.value)
)
const canChooseTaskDepartment = computed(() => canCreateTaskInAnyDepartment.value || canChooseDepartment.value)
const effectiveDepartmentId = computed(() => {
  if (currentDepartmentId.value) return currentDepartmentId.value
  const ownMembership = team.value.find((member) => String(member[2] || '').trim().toLowerCase() === savedProfile.email.trim().toLowerCase())
  return String(ownMembership?.[11] || '')
})
const visibleDepartmentIds = computed(() => new Set(
  currentUserHasAllDepartmentsAccess.value
    ? []
    : currentUserAccessibleDepartmentIds.value.length
      ? currentUserAccessibleDepartmentIds.value
      : [effectiveDepartmentId.value].filter(Boolean)
))
const visibleTeam = computed(() => {
  if (currentUserHasAllDepartmentsAccess.value) return team.value
  return team.value.filter((member) => visibleDepartmentIds.value.has(String(member[11] || '')))
})
const departmentTeam = computed(() => visibleTeam.value.filter((member) => !effectiveDepartmentId.value || String(member[11] || '') === effectiveDepartmentId.value))
const taskSearchInput = ref('')
const taskSearch = ref('')
const taskScope = ref<'all' | 'mine' | 'archived'>('all')
const taskScopeLoading = ref(false)
const projectSearchInput = ref('')
const projectSearch = ref('')
const teamSearchInput = ref('')
const teamSearch = ref('')
const reportSearchInput = ref('')
const reportSearch = ref('')
const reportStatusFilter = ref('All statuses')
const reportSort = ref<'newest' | 'oldest'>('newest')
const reportTemplates = [
  { title: 'Weekly Progress Report', description: 'A focused summary of completed and in-progress tasks for the week.', type: 'Weekly Progress', tone: 'blue', icon: 'M4 19V5m0 14h16M7 15l3-4 3 2 5-7' },
  { title: 'Team Performance Report', description: 'Individual output, team momentum and productivity insights.', type: 'Team Performance', tone: 'green', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 0a4 4 0 0 0 0-8m5 18v-2a4 4 0 0 0-3-3.87' },
  { title: 'Project Status Report', description: 'Project health, delivery risks and milestone tracking in one view.', type: 'Project Status', tone: 'orange', icon: 'M3 7h18v13H3V7Zm0 0 3-4h5l2 4' },
  { title: 'Time Tracking Report', description: 'Hours logged by team members across active projects.', type: 'Time Tracking', tone: 'violet', icon: 'M12 8v5l3 2m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' }
]
const messageSearchInput = ref('')
const messageSearch = ref('')
const helpSearchInput = ref('')
const helpSearch = ref('')
const openFaq = ref<number | null>(0)
const helpFaqs = [
  { question: 'How do I create a new task?', answer: 'Open Tasks from the sidebar, select Create Task, complete the details and assign it to a team member.' },
  { question: 'How do I add team members?', answer: 'Open Staff List and select Add Member. Owners, admins and managers can invite people to their department.' },
  { question: 'How can I track project progress?', answer: 'Use Projects for milestone progress and Analytics for detailed team performance, workload and completion trends.' },
  { question: 'How do I assign tasks to team members?', answer: 'Create or edit a task, open the assignee picker and select one or more available department members.' },
  { question: 'How do I generate a report?', answer: 'Open Reports, choose a ready-made template or Custom Report, select the date range and filters, then generate it.' }
]
const feedbackDraft = ref('')
const feedbackType = ref<'Bug' | 'Suggestion' | 'Feedback'>('Feedback')
const feedbackScreenshotInput = ref<HTMLInputElement | null>(null)
const feedbackScreenshotName = ref('')
const feedbackScreenshotPreview = ref('')
const feedbackScreenshotFile = ref<File | null>(null)
const feedbackSending = ref(false)
const profileAvatarInput = ref<HTMLInputElement | null>(null)
const profileAvatarPreview = ref('')
const profileAvatarFile = ref<File | null>(null)
const supportWidgetOpen = ref(false)
const supportWidgetRoot = ref<HTMLElement | null>(null)
const supportWidgetPosition = ref<{ x: number; y: number } | null>(null)
const supportWidgetDragging = ref(false)
let supportDragOrigin = { pointerX: 0, pointerY: 0, x: 0, y: 0 }
let supportDragMoved = false
let supportDragPointerId: number | null = null
const supportWidgetStyle = computed(() => supportWidgetPosition.value ? {
  left: `${supportWidgetPosition.value.x}px`,
  top: `${supportWidgetPosition.value.y}px`,
  right: 'auto',
  bottom: 'auto'
} : undefined)
const supportPanelPlacement = computed(() => {
  if (!import.meta.client || !supportWidgetPosition.value) return 'bottom-[68px] right-0'
  const { x, y } = supportWidgetPosition.value
  return `${y < window.innerHeight / 2 ? 'top-[68px]' : 'bottom-[68px]'} ${x < window.innerWidth / 2 ? 'left-0' : 'right-0'}`
})
const startSupportDrag = (event: PointerEvent) => {
  if (event.button !== 0 || !supportWidgetRoot.value) return
  event.preventDefault()
  const rect = supportWidgetRoot.value.getBoundingClientRect()
  supportDragOrigin = { pointerX: event.clientX, pointerY: event.clientY, x: rect.left, y: rect.top }
  supportDragMoved = false
  supportDragPointerId = event.pointerId
  supportWidgetDragging.value = true
  window.addEventListener('pointermove', moveSupportDrag)
  window.addEventListener('pointerup', stopSupportDrag)
  window.addEventListener('pointercancel', stopSupportDrag)
}
const moveSupportDrag = (event: PointerEvent) => {
  if (!supportWidgetDragging.value || event.pointerId !== supportDragPointerId) return
  event.preventDefault()
  const dx = event.clientX - supportDragOrigin.pointerX
  const dy = event.clientY - supportDragOrigin.pointerY
  if (Math.abs(dx) + Math.abs(dy) > 4) supportDragMoved = true
  supportWidgetPosition.value = {
    x: Math.max(12, Math.min(window.innerWidth - 68, supportDragOrigin.x + dx)),
    y: Math.max(12, Math.min(window.innerHeight - 68, supportDragOrigin.y + dy))
  }
}
const stopSupportDrag = (event: PointerEvent) => {
  if (event.pointerId !== supportDragPointerId) return
  supportWidgetDragging.value = false
  supportDragPointerId = null
  window.removeEventListener('pointermove', moveSupportDrag)
  window.removeEventListener('pointerup', stopSupportDrag)
  window.removeEventListener('pointercancel', stopSupportDrag)
  if (supportWidgetPosition.value) localStorage.setItem('taskflow-support-position', JSON.stringify(supportWidgetPosition.value))
}
const toggleSupportWidget = () => {
  if (supportDragMoved) {
    supportDragMoved = false
    return
  }
  supportWidgetOpen.value = !supportWidgetOpen.value
}
const membersRawResponse = ref<unknown>(null)
const memberSummary = ref<{ total_members?: number; average_efficiency?: number; active_tasks?: number; overdue_tasks?: number } | null>(null)
const selectedTeamMember = ref<Array<string | number> | null>(null)
const memberDeleting = ref(false)
const activeMessage = ref('')
const chatDraft = ref('')
const conversations = ref<ApiConversation[]>([])
const conversationMessages = ref<ApiChatMessage[]>([])
const chatBody = ref<HTMLElement | null>(null)
const conversationPeerById = reactive<Record<string, ProjectCardMember>>({})
const chatPresenceByUserId = reactive<Record<string, { isOnline: boolean; lastSeen: string | null }>>({})
const chatReadAtByUserId = reactive<Record<string, string>>({})
const conversationsLoading = ref(false)
const messagesLoading = ref(false)
const messageSending = ref(false)
const messageFilter = ref<'all' | 'unread'>('all')
const newConversationOpen = ref(false)
const newConversationSearch = ref('')
const conversationCreating = ref(false)
const conversationDeleting = ref(false)
const messageAttachmentInput = ref<HTMLInputElement | null>(null)
const selectedMessageAttachment = ref<File | null>(null)
const messageAttachmentPreview = ref('')
const chatSocketState = ref<'offline' | 'connecting' | 'online'>('offline')
const typingUserId = ref('')
const emojiPickerOpen = ref(false)
const emojiSearch = ref('')
const chatSearchOpen = ref(false)
const chatSearch = ref('')
const emojiOptions = [
  ['😀', 'grinning happy smile'], ['😂', 'laugh tears funny'], ['😊', 'smile happy blush'], ['😍', 'love heart eyes'],
  ['🥳', 'party celebrate'], ['😎', 'cool sunglasses'], ['🤔', 'thinking'], ['😢', 'sad cry'], ['😮', 'surprised wow'],
  ['👍', 'thumbs up yes'], ['👎', 'thumbs down no'], ['👏', 'clap applause'], ['🙏', 'thanks please'], ['💪', 'strong'],
  ['❤️', 'heart love'], ['🔥', 'fire great'], ['🎉', 'party celebration'], ['✅', 'check done'], ['👀', 'eyes look'], ['🚀', 'rocket launch']
]
const filteredEmojiOptions = computed(() => {
  const query = emojiSearch.value.trim().toLowerCase()
  return emojiOptions.filter(option => !query || option[1].includes(query))
})
let chatSocket: WebSocket | null = null
let typingStopTimer: ReturnType<typeof setTimeout> | null = null
const toast = ref('')
const toastType = ref<'info' | 'success' | 'error'>('info')
const actionMenu = ref<string | null>(null)
const hoveredMonthlyMonth = ref<string | null>(null)
const hoveredEfficiencyMonth = ref<string | null>(null)
const mobileSidebarOpen = ref(false)
const sidebarCollapsed = ref(false)
const taskPage = ref(1)
const selectedTaskKeys = ref<string[]>([])
const archivedTaskCount = ref(0)
const dashboardStats = computed(() => {
  const total = Number(stats.value[0]?.[0] || 0)
  const archivedPercent = total ? Math.round((archivedTaskCount.value / total) * 100) : 0
  const renamedStats = stats.value.map(item => item[1] === 'Completed Tasks' ? [item[0], 'Submitted Tasks', item[2]] : item)
  return [...renamedStats, [String(archivedTaskCount.value), 'Completed Tasks', archivedPercent]]
})
const taskViewMode = ref<'list' | 'kanban'>('kanban')
const taskBoardSection = ref<'board' | 'backlog'>('board')
const taskAttentionFilter = ref<'all' | 'overdue' | 'today' | 'on_hold' | 'unassigned'>('all')
const draggedTaskId = ref('')
const updatingTaskId = ref('')
const editingTaskId = ref('')
const taskModalMode = ref<'create' | 'edit' | 'view'>('create')
const taskModalReturnToAnalytics = ref(false)
const taskSaving = ref(false)
const projectPage = ref(1)
const reportPage = ref(1)
const teamPage = ref(1)
const pageSize = 10
const projectPriorityFilter = ref('All Priorities')
// Show every staff member by default. The workload filter is an optional
// maximum threshold and must not silently hide members on the initial load.
const workloadFilter = ref(100)
const teamDepartmentFilter = ref('all')
const teamRoleFilter = ref('all')
const teamSort = ref<'name_asc' | 'name_desc' | 'department_asc' | 'department_desc' | 'role_asc' | 'role_desc' | 'efficiency_asc' | 'efficiency_desc'>('name_asc')
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
const themeCookie = useCookie<string | null>('taskflow-theme', { sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 })

const updateSystemTheme = (event: MediaQueryListEvent) => {
  systemPrefersDark.value = event.matches
}

const isThemeOption = (value: string | null): value is 'Light' | 'Dark' | 'System' => value === 'Light' || value === 'Dark' || value === 'System'

if (isThemeOption(themeCookie.value)) {
  dropdownValues.theme = themeCookie.value
  appliedAppearance.theme = themeCookie.value
}

const persistTheme = (theme: string) => {
  if (!import.meta.client || !isThemeOption(theme)) return
  localStorage.setItem(themeStorageKey, theme)
  document.cookie = `${themeStorageKey}=${encodeURIComponent(theme)}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`
  themeCookie.value = theme
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
  effortScore: 3,
  startDate: '',
  dueDate: '',
  projectId: '',
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
const taskStatusOptions = ['Postponed', 'Not Started', 'In Progress', 'On Hold', 'Completed']
const taskEffortOptions = [
  { value: 1, label: '1 — Very simple (1–2 hours)' },
  { value: 2, label: '2 — Small (half a day)' },
  { value: 3, label: '3 — Medium (about 1 day)' },
  { value: 4, label: '4 — Complex (2–3 days)' },
  { value: 5, label: '5 — Very complex (4+ days)' }
]
const taskFormStatus = ref('Not Started')
const taskIsHidden = ref(false)
const aiTaskAssistantOpen = ref(false)
const aiTaskPrompt = ref('')
const aiTaskListening = ref(false)
const aiTaskError = ref('')
const aiTaskDraft = ref<SmartTaskDraft | null>(null)
let aiSpeechRecognition: any = null
watch(aiTaskPrompt, () => {
  aiTaskDraft.value = null
  aiTaskError.value = ''
})
const taskAssigneeIds = ref<string[]>([])
const taskAssigneeLabels = ref<string[]>([])
const taskMainAssigneeId = ref('')
const taskAssigneeSearch = ref('')
const taskAssigneeInput = ref<HTMLInputElement | null>(null)
const taskAssigneePicker = ref<HTMLElement | null>(null)
const taskAssigneeConfirmation = ref('')
const taskAssigneeOptions = ref<Array<Array<string | number>>>([])
const taskAssigneesLoading = ref(false)
const filteredTaskAssignees = computed(() => {
  const query = taskAssigneeSearch.value.trim().toLowerCase()
  return taskAssigneeOptions.value.filter((member) => {
    const memberId = teamMemberId(member)
    if (!memberId || taskAssigneeIds.value.includes(memberId)) return false
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
  const query = search.trim().split(/\s+/).find(term => name.toLowerCase().includes(term.toLowerCase())) || ''
  const index = name.toLowerCase().indexOf(query.toLowerCase())
  if (!query || index < 0) return { before: name, match: '', after: '' }
  return { before: name.slice(0, index), match: name.slice(index, index + query.length), after: name.slice(index + query.length) }
}
const memberFirstName = ref('')
const memberLastName = ref('')
const editingMemberId = ref('')
const memberEmail = ref('')
const memberUsername = ref('')
const memberPassword = ref('')
const memberPasswordConfirm = ref('')
const showMemberPassword = ref(false)
const showMemberPasswordConfirm = ref(false)
const memberPhone = ref('')
const memberJobTitle = ref('')
const memberAvatarInput = ref<HTMLInputElement | null>(null)
const memberAvatarFile = ref<File | null>(null)
const memberAvatarPreview = ref('')
const memberRole = ref('member')
const memberIsActive = ref(true)
const memberDepartment = ref('')
const memberDepartments = ref<Array<{ id: string; name: string }>>([])
const memberDepartmentsLoading = ref(false)
const modalDepartment = ref('')
const memberRoleOptions = ['member', 'manager', 'admin', 'owner']
const memberDepartmentOptions = computed(() => {
  const options = [...memberDepartments.value]
  dashboardDepartments.value
    .map((department) => ({
      id: String(department.department_id || department.id || ''),
      name: String(department.department_name || department.name || 'Unnamed department')
    }))
    .filter((department) => department.id)
    .forEach((department) => {
      if (!options.some((option) => option.id === department.id)) options.push(department)
    })
  if (effectiveDepartmentId.value && !options.some((department) => department.id === effectiveDepartmentId.value)) {
    options.unshift({ id: effectiveDepartmentId.value, name: 'Current department' })
  }
  // `/departments/` already returns the departments accessible to the current
  // user. Filtering that response again with the profile's often partial
  // `accessible_departments` list hid valid departments from this dropdown.
  return options
})
const departmentNameById = (departmentId: string | number, fallback = '') => {
  const id = String(departmentId || '')
  if (!id) return fallback || 'No department'
  const direct = memberDepartments.value.find(department => department.id === id)?.name
  if (direct) return direct
  const dashboard = dashboardDepartments.value.find(department => String(department.department_id || department.id || '') === id)
  return String(dashboard?.department_name || dashboard?.name || fallback || 'No department')
}
const taskDepartmentOptions = computed(() => {
  if (!canCreateTaskInAnyDepartment.value) return memberDepartmentOptions.value
  const options = [...memberDepartments.value]
  dashboardDepartments.value.forEach((department) => {
    const id = String(department.department_id || department.id || '')
    if (id && !options.some((option) => option.id === id)) {
      options.push({ id, name: String(department.department_name || department.name || 'Unnamed department') })
    }
  })
  return options
})
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
const eventAttendeeConfirmation = ref('')
const eventAttendeeOptions = ref<Array<Array<string | number>>>([])
const eventAttendeesLoading = ref(false)
let eventAttendeeSearchTimer: ReturnType<typeof setTimeout> | undefined
const eventColorById = reactive<Record<string, string>>({})
const selectedCalendarEvent = ref<CalendarEvent | null>(null)
const editingEventId = ref('')
const eventDeleting = ref(false)
const reportType = ref('Weekly Progress')
const reportStatus = ref('All Statuses')
const reportPriority = ref('All Priorities')
const reportTypeOptions = ['Weekly Progress', 'Team Performance', 'Project Status', 'Time Tracking']
const reportTypeApiValues: Record<string, string> = {
  'Weekly Progress': 'weekly_progress',
  'Team Performance': 'team_performance',
  'Project Status': 'project_status',
  'Time Tracking': 'time_tracking'
}
const openProjectDatePicker = ref<'startDate' | 'dueDate' | 'analyticsStart' | 'analyticsEnd' | null>(null)
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

const tashkentTodayIso = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date())
const taskDueIso = (task: Array<string | number>) => {
  const raw = String(task[12] || task[4] || '').trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  const dotted = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  return dotted ? `${dotted[3]}-${dotted[2].padStart(2, '0')}-${dotted[1].padStart(2, '0')}` : ''
}
const isTaskOverdue = (task: Array<string | number>) => {
  const status = String(task[3] || '').toLowerCase()
  if (status === 'completed' || status === 'archived') return false
  if (status === 'overdue') return true
  const dueDate = taskDueIso(task)
  return Boolean(dueDate && dueDate < tashkentTodayIso())
}
const matchesTaskAttentionFilter = (task: Array<string | number>) => {
  if (taskAttentionFilter.value === 'all') return true
  if (taskAttentionFilter.value === 'overdue') return isTaskOverdue(task)
  if (taskAttentionFilter.value === 'today') return taskDueIso(task) === tashkentTodayIso()
  if (taskAttentionFilter.value === 'on_hold') return String(task[3] || '').toLowerCase() === 'on hold'
  return !String(task[1] || '').trim() || String(task[1] || '').toLowerCase() === 'unassigned'
}

const isArchivedTaskRow = (task: Array<string | number>) => String(task[14] || '').toLowerCase() === 'true' || String(task[3] || '').toLowerCase() === 'archived'
const filteredTasks = computed(() =>
  tasks.value.filter((task) =>
    (taskScope.value === 'archived' || !isArchivedTaskRow(task)) &&
    includesQuery(task, taskSearch.value) &&
    matchesTaskAttentionFilter(task) &&
    (dropdownValues.priority === 'All Priorities' || String(task[2]) === dropdownValues.priority)
  )
)
const taskOverviewCards = computed(() => [
  { label: 'All Active Tasks', value: tasks.value.length, color: 'blue', status: 'all' },
  { label: 'To Do', value: tasks.value.filter((task) => String(task[3]).toLowerCase() === 'not started').length, color: 'slate', status: 'all' },
  { label: 'In Progress', value: tasks.value.filter((task) => String(task[3]).toLowerCase() === 'in progress').length, color: 'blue', status: 'all' },
  { label: 'On Hold', value: tasks.value.filter((task) => String(task[3]).toLowerCase() === 'on hold').length, color: 'amber', status: 'on_hold' },
  { label: 'Submitted', value: tasks.value.filter((task) => String(task[3]).toLowerCase() === 'completed').length, color: 'green', status: 'all' },
  { label: 'Overdue', value: tasks.value.filter(isTaskOverdue).length, color: 'rose', status: 'overdue' },
  { label: 'Completed', value: archivedTaskCount.value, color: 'slate', status: 'archived' }
])
const overdueTaskRows = computed(() => tasks.value.filter(isTaskOverdue))
const analyticsUserTasks = computed(() => {
  const selected = selectedAnalyticsStaff.value
  if (!selected) return []
  const selectedId = String(selected.id || '')
  const selectedName = selected.name.trim().toLowerCase()

  return tasks.value.filter((task) => {
    const assigneeName = String(task[1] || '').toLowerCase()
    if (selectedName && assigneeName.split(',').some(name => name.trim() === selectedName)) return true
    return selectedId && [task[9], task[13], task[18]].some((value) => {
      try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value
        const entries = Array.isArray(parsed) ? parsed : parsed ? [parsed] : []
        return entries.some((entry: any) => String(entry?.id ?? entry?.user_id ?? entry) === selectedId)
      } catch {
        return String(value || '') === selectedId
      }
    }) || String(task[17] || '') === selectedId
  })
})
const openAnalyticsUserTasks = (row: AnalyticsStaffRow) => {
  selectedAnalyticsStaff.value = row
  modal.value = 'analytics-user-tasks'
}
const handleAnalyticsStaffTableClick = (event: MouseEvent) => {
  const rowElement = (event.target as HTMLElement | null)?.closest('tbody tr') as HTMLTableRowElement | null
  if (!rowElement) return
  const row = analyticsWorkloadRows.value[rowElement.sectionRowIndex]
  if (row) openAnalyticsUserTasks(row)
}
const analyticsOverdueByStaff = computed(() => {
  const groups = new Map<string, Array<Array<string | number>>>()
  overdueTaskRows.value.forEach((task) => {
    const assignee = String(task[1] || 'Unassigned')
    if (!groups.has(assignee)) groups.set(assignee, [])
    groups.get(assignee)!.push(task)
  })
  return [...groups.entries()].map(([name, rows]) => ({ name, rows })).sort((a, b) => b.rows.length - a.rows.length)
})
const analyticsOverdueDays = (task: Array<string | number>) => {
  const due = taskDueIso(task)
  if (!due) return 0
  const todayMs = new Date(`${tashkentTodayIso()}T00:00:00+05:00`).getTime()
  const dueMs = new Date(`${due}T00:00:00+05:00`).getTime()
  return Math.max(0, Math.floor((todayMs - dueMs) / 86_400_000))
}
const dueTodayTaskRows = computed(() => tasks.value.filter(task => taskDueIso(task) === tashkentTodayIso() && String(task[3] || '').toLowerCase() !== 'completed'))
const onHoldTaskRows = computed(() => tasks.value.filter(task => String(task[3] || '').toLowerCase() === 'on hold'))
const unassignedTaskRows = computed(() => tasks.value.filter(task => !String(task[1] || '').trim() || String(task[1] || '').toLowerCase() === 'unassigned'))
const backlogTasks = computed(() => filteredTasks.value.filter((task) => String(task[3]).toLowerCase() === 'backlog'))
const filteredProjects = computed(() => projects.value.filter((project) => includesQuery(project, projectSearch.value) && (projectPriorityFilter.value === 'All Priorities' || String(project[2]) === projectPriorityFilter.value)))
const filteredTeam = computed(() => {
  // The members endpoint already applies the caller's access scope. Filtering
  // it again with profile department IDs can hide valid members when those IDs
  // are incomplete or use a different membership representation.
  const rows = team.value.filter((member) =>
    Number(member[4] || 0) <= workloadFilter.value &&
    (teamDepartmentFilter.value === 'all' || String(member[11] || '') === teamDepartmentFilter.value) &&
    (teamRoleFilter.value === 'all' || String(member[14] || '').toLowerCase() === teamRoleFilter.value)
  )
  const collator = new Intl.Collator('en', { sensitivity: 'base' })
  return [...rows].sort((a, b) => {
    if (teamSort.value === 'name_desc') return collator.compare(String(b[0] || ''), String(a[0] || ''))
    if (teamSort.value === 'department_asc') return collator.compare(String(a[10] || a[11] || ''), String(b[10] || b[11] || ''))
    if (teamSort.value === 'department_desc') return collator.compare(String(b[10] || b[11] || ''), String(a[10] || a[11] || ''))
    if (teamSort.value === 'role_asc') return collator.compare(String(a[14] || a[1] || ''), String(b[14] || b[1] || ''))
    if (teamSort.value === 'role_desc') return collator.compare(String(b[14] || b[1] || ''), String(a[14] || a[1] || ''))
    if (teamSort.value === 'efficiency_asc') return Number(a[4] || 0) - Number(b[4] || 0)
    if (teamSort.value === 'efficiency_desc') return Number(b[4] || 0) - Number(a[4] || 0)
    return collator.compare(String(a[0] || ''), String(b[0] || ''))
  })
})
const filteredReports = computed(() => {
  const rows = reports.value.filter((report) =>
    includesQuery(report, reportSearch.value) &&
    (reportStatusFilter.value === 'All statuses' || String(report[4]).toLowerCase() === reportStatusFilter.value.toLowerCase())
  )
  return reportSort.value === 'oldest' ? [...rows].reverse() : rows
})
const reportStats = computed(() => [
  { value: reports.value.length, label: 'Total Reports', icon: 'file' },
  { value: reports.value.filter((report) => String(report[4]).toLowerCase() === 'ready').length, label: 'Ready Reports', icon: 'check' },
  { value: new Set(reports.value.map((report) => String(report[1])).filter(Boolean)).size, label: 'Report Types', icon: 'analytics' }
])
const conversationIdentity = (conversation: ApiConversation) => {
  if (conversation.is_group) return `group:${conversation.id}`
  const other = conversationDisplayUser(conversation)
  return `direct:${String(other?.id || other?.email || conversation.title || conversation.id).trim().toLowerCase()}`
}
const uniqueConversations = computed(() => {
  const seen = new Set<string>()
  return conversations.value.filter(conversation => {
    const identity = conversationIdentity(conversation)
    if (seen.has(identity)) return false
    seen.add(identity)
    return true
  })
})
const filteredMessages = computed(() => {
  const query = messageSearch.value.trim().toLowerCase()
  return uniqueConversations.value.filter(conversation => {
    if (messageFilter.value === 'unread' && !Number(conversation.unread_count || 0)) return false
    return !query || `${conversation.title || ''} ${conversation.participant_details?.map(item => item.full_name || item.email).join(' ') || ''}`.toLowerCase().includes(query)
  })
})
const selectedConversation = computed(() => conversations.value.find(item => item.id === activeMessage.value) || null)
const conversationDisplayUser = (conversation: ApiConversation) => {
  const currentId = String(currentUserId.value)
  if (conversationPeerById[conversation.id]) return conversationPeerById[conversation.id]
  const otherParticipant = conversation.participant_details?.find(item => String(item.id) !== currentId)
  if (otherParticipant) return otherParticipant

  const lastMessage = conversation.last_message as Record<string, any> | null | undefined
  const lastSender = lastMessage?.sender_detail as ProjectCardMember | undefined
  if (lastSender && String(lastSender.id) !== currentId) return lastSender

  const messageSender = conversation.id === activeMessage.value
    ? conversationMessages.value.find(message => String(message.sender) !== currentId)?.sender_detail
    : undefined
  if (messageSender) return messageSender

  return conversation.participant_details?.[0]
}
const conversationTitle = (conversation: ApiConversation) => conversation.title || conversationDisplayUser(conversation)?.full_name || conversationDisplayUser(conversation)?.email || 'Conversation'
const conversationAvatar = (conversation: ApiConversation) => absoluteMediaUrl(conversationDisplayUser(conversation)?.avatar)
const conversationLastMessage = (conversation: ApiConversation) => String(conversation.last_message?.body || 'No messages yet')
const conversationPresence = (conversation: ApiConversation | null) => {
  if (!conversation) return { isOnline: false, lastSeen: null as string | null }
  const peer = conversationDisplayUser(conversation) as ProjectCardMember & { is_online?: boolean; last_seen_at?: string | null }
  const userId = String(peer?.id || '')
  return chatPresenceByUserId[userId] || { isOnline: Boolean(peer?.is_online), lastSeen: peer?.last_seen_at || null }
}
const conversationIsOnline = (conversation: ApiConversation) => conversationPresence(conversation).isOnline
const formatLastSeen = (value: string | null) => {
  if (!value) return 'last seen recently'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'last seen recently'
  const now = new Date()
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const seenDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dayDifference = Math.round((today.getTime() - seenDay.getTime()) / 86_400_000)
  if (dayDifference === 0) return `last seen today at ${time}`
  if (dayDifference === 1) return `last seen yesterday at ${time}`
  return `last seen ${date.toLocaleDateString([], { day: 'numeric', month: 'short' })} at ${time}`
}
const selectedConversationPresence = computed(() => conversationPresence(selectedConversation.value))
const selectedConversationPresenceLabel = computed(() => {
  if (typingUserName.value) return `${typingUserName.value} is typing...`
  if (selectedConversationPresence.value.isOnline) return 'Online'
  if (chatSocketState.value === 'connecting') return 'Connecting...'
  return formatLastSeen(selectedConversationPresence.value.lastSeen)
})
const messageIsMine = (message: ApiChatMessage) => String(message.sender) === String(currentUserId.value)
const messageReadByPeer = (message: ApiChatMessage) => {
  if (!selectedConversation.value || !message.created_at) return false
  const peerId = String(conversationDisplayUser(selectedConversation.value)?.id || '')
  const readAt = chatReadAtByUserId[peerId]
  if (!readAt) return false
  const messageTime = new Date(message.created_at).getTime()
  const readTime = new Date(readAt).getTime()
  return Number.isFinite(messageTime) && Number.isFinite(readTime) && messageTime <= readTime
}
const isImageAttachment = (value?: string | null) => Boolean(value && /\.(png|jpe?g|gif|webp|avif|svg)(?:\?.*)?$/i.test(value))
const typingUserName = computed(() => {
  if (!typingUserId.value || !selectedConversation.value) return ''
  const user = selectedConversation.value.participant_details?.find(item => String(item.id) === typingUserId.value)
  return user?.full_name || user?.email || 'Someone'
})
const filteredFaqs = computed(() => {
  const query = helpSearch.value.trim().toLowerCase()
  return helpFaqs.map((item, index) => ({ ...item, index })).filter(item => !query || `${item.question} ${item.answer}`.toLowerCase().includes(query))
})
const pageCount = (length: number) => Math.max(1, Math.ceil(length / pageSize))
const paginate = <T>(items: T[], page: number) => items.slice((page - 1) * pageSize, page * pageSize)
// Tasks stay in one continuous list/board; backend responses must not be split
// into a second client-side pagination layer.
const paginatedTasks = computed(() => filteredTasks.value)
const taskListPageTasks = computed(() => paginate(filteredTasks.value, taskPage.value))
const taskSelectionKey = (task: Array<string | number>) => String(task[6] || `${task[0]}-${task[4]}`)
const isTaskSelected = (task: Array<string | number>) => selectedTaskKeys.value.includes(taskSelectionKey(task))
const currentTaskPageAllSelected = computed(() => taskListPageTasks.value.length > 0 && taskListPageTasks.value.every(isTaskSelected))
const currentTaskPageSomeSelected = computed(() => taskListPageTasks.value.some(isTaskSelected) && !currentTaskPageAllSelected.value)
const toggleTaskSelection = (task: Array<string | number>) => {
  const key = taskSelectionKey(task)
  selectedTaskKeys.value = selectedTaskKeys.value.includes(key)
    ? selectedTaskKeys.value.filter(item => item !== key)
    : [...selectedTaskKeys.value, key]
}
const toggleCurrentTaskPageSelection = () => {
  const pageKeys = taskListPageTasks.value.map(taskSelectionKey)
  selectedTaskKeys.value = currentTaskPageAllSelected.value
    ? selectedTaskKeys.value.filter(key => !pageKeys.includes(key))
    : [...new Set([...selectedTaskKeys.value, ...pageKeys])]
}
const kanbanColumns = computed(() => [
  { key: 'not_started', label: 'To Do', description: 'Ready to start', color: '#8B96A7', softColor: '#F3F5F7', tasks: paginatedTasks.value.filter((task) => String(task[3]).toLowerCase() === 'not started') },
  { key: 'in_progress', label: 'In Progress', description: 'Being worked on', color: '#3B82F6', softColor: '#EEF5FF', tasks: paginatedTasks.value.filter((task) => String(task[3]).toLowerCase() === 'in progress') },
  { key: 'on_hold', label: 'On Hold', description: 'Temporarily paused', color: '#F59E0B', softColor: '#FFFBEB', tasks: paginatedTasks.value.filter((task) => String(task[3]).toLowerCase() === 'on hold') },
  { key: 'completed', label: 'Submitted', description: 'Finished', color: '#18A875', softColor: '#ECF9F4', tasks: paginatedTasks.value.filter((task) => String(task[3]).toLowerCase() === 'completed') }
])
const paginatedProjects = computed(() => paginate(filteredProjects.value, projectPage.value))
const paginatedTeam = computed(() => paginate(filteredTeam.value, teamPage.value))
const paginatedReports = computed(() => paginate(filteredReports.value, reportPage.value))
const taskPageCount = computed(() => pageCount(filteredTasks.value.length))
const projectPageCount = computed(() => pageCount(filteredProjects.value.length))
const teamPageCount = computed(() => pageCount(filteredTeam.value.length))
const reportPageCount = computed(() => pageCount(filteredReports.value.length))
watch([taskSearch, () => dropdownValues.priority], () => { taskPage.value = 1 })
watch([() => filteredTasks.value.length, taskPageCount], () => {
  if (taskPage.value > taskPageCount.value) taskPage.value = taskPageCount.value
  if (taskPage.value < 1) taskPage.value = 1
})
watch([projectSearch, projectPriorityFilter], () => { projectPage.value = 1 })
watch([teamSearch, workloadFilter], () => { teamPage.value = 1 })
watch([reportSearch, reportStatusFilter, reportSort], () => { reportPage.value = 1 })
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
  const overdueTasks = memberSummary.value?.overdue_tasks ?? tasks.value.filter(isTaskOverdue).length
  if (memberSummary.value) {
    return [
      [String(memberSummary.value.total_members ?? 0), 'Total Members', 'bg-[#EAF2FC]'],
      [`${memberSummary.value.average_efficiency ?? 0}%`, 'Avg Efficiency', 'bg-task-lavender'],
      [String(memberSummary.value.active_tasks ?? 0), 'Active Tasks', 'bg-task-mint'],
      [String(overdueTasks), 'Overdue Tasks', 'bg-task-dangerSoft']
    ]
  }

  const total = team.value.length
  const avgEfficiency = total ? Math.round(team.value.reduce((sum, member) => sum + Number(member[4] || 0), 0) / total) : 0
  const activeTasks = team.value.reduce((sum, member) => sum + Number(member[6] || 0), 0)

  return [
    [String(total), 'Total Members', 'bg-[#EAF2FC]'],
    [`${avgEfficiency}%`, 'Avg Efficiency', 'bg-task-lavender'],
    [String(activeTasks), 'Active Tasks', 'bg-task-mint'],
    [String(overdueTasks), 'Overdue Tasks', 'bg-task-dangerSoft']
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
const sidebarGroups = computed(() => taskFlowSidebarGroups.map(group => ({
  label: group.label,
  items: pages.value.filter(page => (group.keys as readonly string[]).includes(page.key))
})).filter(group => group.items.length))
const comingSoonPages = new Set<PageKey>()
const isComingSoonPage = (key: PageKey) => comingSoonPages.has(key)
const profileName = computed(() => `${savedProfile.firstName} ${savedProfile.lastName}`.trim())
const isMuslimaRadioUser = computed(() => profileName.value.trim().replace(/\s+/g, ' ').toLocaleLowerCase() === 'muslima zokirjonova')
const profileInitials = computed(() => profileName.value ? initials(profileName.value) : '')
const dashboardTitle = computed(() => profileName.value ? `Welcome back, ${savedProfile.firstName || profileName.value}!` : 'Dashboard')
const tashkentNowMs = useState<number>('dashboard-tashkent-clock', () => Date.now())
const tashkentNow = computed(() => new Date(tashkentNowMs.value))
const tashkentHour = computed(() => Number(new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Tashkent', hour: '2-digit', hour12: false
}).format(tashkentNow.value)))
const dashboardGreetingPeriod = computed(() => tashkentHour.value < 12 ? 'morning' : tashkentHour.value < 18 ? 'afternoon' : 'evening')
const dashboardGreetingIcon = computed(() => dashboardGreetingPeriod.value === 'morning' ? '☀️' : dashboardGreetingPeriod.value === 'afternoon' ? '🌤️' : '🌙')
const dashboardQuote = computed(() => ({
  morning: { text: 'Every morning is a fresh start. Make today amazing.', author: 'Unknown' },
  afternoon: { text: 'Progress is the sum of small efforts, repeated day in and day out.', author: 'Robert Collier' },
  evening: { text: "Don't watch the clock; do what it does. Keep going.", author: 'Sam Levenson' }
}[dashboardGreetingPeriod.value]))
const dashboardGreeting = computed(() => {
  return `Good ${dashboardGreetingPeriod.value}, ${savedProfile.firstName || profileName.value || 'there'}!`
})
const dashboardGreetingConfig = computed(() => greetingConfig(
  dashboardGreetingPeriod.value,
  isDarkTheme.value ? 'dark' : 'light'
))
const tashkentWeekday = computed(() => new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tashkent', weekday: 'long' }).format(tashkentNow.value))
const tashkentDate = computed(() => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tashkent', day: 'numeric', month: 'long', year: 'numeric' }).format(tashkentNow.value))
const tashkentTime = computed(() => new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit', hour12: true }).format(tashkentNow.value))
let dashboardClockTimer: ReturnType<typeof setInterval> | null = null
const dashboardDepartmentTotal = computed(() => dashboardDepartments.value.reduce((total, department) => total + Number(department.task_count || 0), 0))
const dashboardDepartmentPercentage = (department: Record<string, any>) => {
  const total = dashboardDepartmentTotal.value
  return total > 0 ? (Number(department.task_count || 0) / total) * 100 : 0
}
const dashboardDepartmentColors = ['#2877ED', '#6366E8', '#18A875', '#F59E0B', '#EC4899', '#06B6D4', '#8B5CF6']
const dashboardDepartmentColor = (index: number) => dashboardDepartmentColors[index % dashboardDepartmentColors.length]
const dashboardDepartmentGradient = computed(() => {
  let cursor = 0
  const segments = dashboardDepartments.value.map((department, index) => {
    const start = cursor
    cursor = Math.min(100, cursor + dashboardDepartmentPercentage(department))
    return `${dashboardDepartmentColor(index)} ${start}% ${cursor}%`
  })
  return segments.length ? `conic-gradient(${segments.join(', ')})` : 'conic-gradient(#E2E8F0 0 100%)'
})
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
  ...Array.from({ length: daysInCalendarMonth.value }, (_, index) => ({ key: `day-${calendarMonthIndex.value}-${index + 1}`, day: index + 1 })),
  ...Array.from({ length: 42 - calendarLeadingBlanks.value - daysInCalendarMonth.value }, (_, index) => ({ key: `trailing-${calendarMonthIndex.value}-${index}`, day: null as number | null }))
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
  const rows = selectedCalendarDay.value
    ? currentMonthEvents.value.filter((event) => event.day === selectedCalendarDay.value)
    : currentMonthEvents.value
  return rows
})
const eventDays = computed(() => new Set(currentMonthEvents.value.map((event) => event.day)))
const isTodayCell = (day: number | null) => day === currentDay && calendarMonthIndex.value === currentMonthIndex && calendarYear.value === currentYear
const analyticsTrendPointLimit = computed(() => Math.max(1, Number(analyticsFilters.days) || 30))
const monthlyTrendSource = computed(() => monthlyProgress.value.slice(-analyticsTrendPointLimit.value))
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
    .map((item, index) => {
      return {
        month: String(item[0] || `Point ${index + 1}`),
        completed: Number(item[1] || 0),
        assigned: Number(item[2] || 0)
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
const performanceTrendMax = computed(() => {
  const largest = Math.max(0, ...efficiencyTrendData.value.flatMap((item) => [item.completed, item.assigned]))
  return Math.max(4, Math.ceil(largest / 4) * 4)
})
const performanceTrendTicks = computed(() => [1, .75, .5, .25, 0].map((ratio) => Math.round(performanceTrendMax.value * ratio)))
const performanceChartTop = 8
const performanceChartBottom = 222
const performanceChartHeight = performanceChartBottom - performanceChartTop
const performanceChartLeft = 5
const performanceChartRight = 555
const buildPerformancePoints = (key: 'completed' | 'assigned') => efficiencyTrendData.value.map((item, index) => ({
  x: efficiencyTrendData.value.length <= 1
    ? chartWidth / 2
    : performanceChartLeft + (index / (efficiencyTrendData.value.length - 1)) * (performanceChartRight - performanceChartLeft),
  y: performanceChartBottom - (Math.min(Math.max(item[key], 0), performanceTrendMax.value) / performanceTrendMax.value) * performanceChartHeight,
  item
}))
const completedTrendPoints = computed(() => buildPerformancePoints('completed'))
const assignedTrendPoints = computed(() => buildPerformancePoints('assigned'))
const completedTrendPath = computed(() => buildSmoothPath(completedTrendPoints.value))
const assignedTrendPath = computed(() => buildSmoothPath(assignedTrendPoints.value))
const completedTrendAreaPath = computed(() => completedTrendPoints.value.length && completedTrendPath.value
  ? `${completedTrendPath.value} L${completedTrendPoints.value.at(-1)!.x} ${performanceChartBottom} L${completedTrendPoints.value[0].x} ${performanceChartBottom} Z`
  : '')
const assignedTrendAreaPath = computed(() => assignedTrendPoints.value.length && assignedTrendPath.value
  ? `${assignedTrendPath.value} L${assignedTrendPoints.value.at(-1)!.x} ${performanceChartBottom} L${assignedTrendPoints.value[0].x} ${performanceChartBottom} Z`
  : '')
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
  if (hoveredEfficiencyMonth.value) {
    return efficiencyTrendData.value.find((item) => item.month === hoveredEfficiencyMonth.value) ?? null
  }
  return efficiencyTrendData.value.reduce<(typeof efficiencyTrendData.value)[number] | null>(
    (highest, item) => !highest || item.assigned > highest.assigned ? item : highest,
    null,
  )
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
const analyticsFilteredMembers = computed(() => [...analyticsStaffRows.value].sort((a, b) => {
  const descending = analyticsTableOrdering.value.startsWith('-')
  const key = analyticsTableOrdering.value.replace(/^-/, '')
  const orderingValue = (member: AnalyticsStaffRow) => {
    if (key === 'name') return member.name
    if (key === 'department') return member.department
    if (key === 'completed') return member.completed
    if (key === 'in_progress') return member.active
    if (key === 'on_hold') return member.onHold
    if (key === 'overdue') return member.overdue
    if (key === 'assigned') return member.assigned
    if (key === 'on_time') return member.onTime
    if (key === 'performance') return member.performanceScore ?? -1
    if (key === 'avg_time') return member.avgCompletionDays
    return 0
  }
  const left = orderingValue(a)
  const right = orderingValue(b)
  const result = typeof left === 'string' ? left.localeCompare(String(right)) : left - Number(right)
  return descending ? -result : result
}))
const analyticsPageCount = computed(() => analyticsStaffTotalPages.value)
const analyticsWorkloadRows = computed(() => analyticsFilteredMembers.value)
const analyticsPerformanceLevelLabel = (level: string) => level
  ? level.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  : 'Not Rated'
const analyticsRowPerformanceLevel = (row: AnalyticsStaffRow) => row.performanceScore == null
  ? 'not_rated'
  : row.performanceLevel || 'not_rated'
const analyticsPerformanceLevelClass = (level: string) => {
  const normalized = level.trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (normalized === 'outstanding') return 'is-outstanding'
  if (normalized === 'excellent') return 'is-excellent'
  if (normalized === 'good') return 'is-good'
  if (normalized === 'needs_improvement') return 'is-improvement'
  if (normalized === 'critical') return 'is-critical'
  return 'is-not-rated'
}
const analyticsPerformanceBarClass = (level: string) => {
  const normalized = level.trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (normalized === 'outstanding') return 'bg-emerald-700'
  if (normalized === 'excellent') return 'bg-task-success'
  if (normalized === 'good') return 'bg-task-warning'
  if (normalized === 'needs_improvement') return 'bg-orange-600'
  if (normalized === 'critical') return 'bg-task-danger'
  return 'bg-slate-400'
}
const formatAnalyticsCardValue = (card: AnalyticsCard) => {
  switch (card.unit) {
    case 'percent': return `${card.value}%`
    case 'days': return `${card.value} days`
    case 'tasks_per_employee': return String(card.value)
    case 'effort_points_per_employee': return String(card.value)
    default: return String(card.value)
  }
}
const formatAnalyticsCardLabel = (card: AnalyticsCard) => card.label.replace(/\bAverage\b/g, 'Avg.')
const analyticsKpiCards = computed(() => analyticsSummary.value?.cards || [])
const analyticsDepartmentPerformanceMax = computed(() => {
  const highestTaskTotal = Math.max(0, ...analyticsDepartmentPerformance.value.map(item => item.completed + item.inProgress + item.overdue))
  return Math.max(10, Math.ceil(highestTaskTotal / 10) * 10)
})
const analyticsDepartmentStackTotal = (item: AnalyticsDepartmentPerformanceChartItem) => item.completed + item.inProgress + item.overdue
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

const eventTimeInputValue = (value?: string) => {
  const date = new Date(String(value || ''))
  if (Number.isNaN(date.getTime())) return ''
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const editSelectedEvent = async () => {
  const id = selectedCalendarEvent.value?.backendId
  if (!id || !canCreateEvent.value) return
  try {
    const detail = await taskFlowApi.getEvent(id)
    const startsAt = new Date(String(detail.starts_at || ''))
    const department = detail.department
    editingEventId.value = id
    form.title = detail.title || ''
    form.eventType = detail.event_type || 'Meeting'
    form.description = detail.description || ''
    form.dueDate = Number.isNaN(startsAt.getTime()) ? '' : formatProjectDateInput(startsAt)
    form.eventTime = eventTimeInputValue(detail.starts_at)
    form.eventEndTime = eventTimeInputValue(detail.ends_at)
    form.meetingLink = detail.meeting_url || ''
    form.eventColor = selectedCalendarEvent.value?.color || eventColorClass(detail.event_type || '')
    modalDepartment.value = String(typeof department === 'object' ? department?.id || '' : department || effectiveDepartmentId.value)
    eventAttendeeIds.value = (detail.attendees || detail.attendee_details?.map(member => member.id) || []).map(String).filter(Boolean)
    eventAttendeeLabels.value = eventAttendeeIds.value.map((memberId) => {
      const member = detail.attendee_details?.find(item => String(item.id || '') === memberId)
      return String(member?.full_name || member?.email || team.value.find(item => teamMemberId(item) === memberId)?.[0] || 'Member')
    })
    eventAttendeeSearch.value = ''
    eventAttendeeConfirmation.value = ''
    eventAttendeePickerOpen.value = false
    modal.value = 'event'
    await loadEventAttendees()
  } catch (error) {
    console.error('Event detail load failed.', error)
    notifyError(taskFlowApiErrorMessage(error, 'Could not load event'))
  }
}

const requestEventDelete = () => {
  if (!selectedCalendarEvent.value?.backendId || !canCreateEvent.value) return
  modal.value = 'event-delete'
}

const cancelEventDelete = () => {
  modal.value = selectedCalendarEvent.value ? 'event-detail' : null
}

const deleteSelectedEvent = async () => {
  const id = selectedCalendarEvent.value?.backendId
  if (!id || eventDeleting.value || !canCreateEvent.value) return
  eventDeleting.value = true
  try {
    await taskFlowApi.deleteEvent(id)
    state.value.events = state.value.events.filter(event => String(event[0] || '') !== id)
    selectedCalendarEvent.value = null
    modal.value = null
    notify('Event deleted', 'success')
  } catch (error) {
    console.error('Event delete failed.', error)
    notifyError(taskFlowApiErrorMessage(error, 'Event delete failed'))
  } finally {
    eventDeleting.value = false
  }
}

const openDashboardEvent = (event: { id: string; starts_at: string }) => {
  const eventDate = new Date(event.starts_at)
  if (Number.isNaN(eventDate.getTime())) return notifyError('Could not open this event date')
  calendarYear.value = eventDate.getFullYear()
  calendarMonthIndex.value = eventDate.getMonth()
  selectedCalendarDay.value = eventDate.getDate()
  setPage('calendar')
}

const openDashboardTask = async (task: { id: string; title: string; priority: string; status: string }) => {
  setPage('tasks')
  const taskRow = state.value.tasks.find((item) => String(item[6] || '') === String(task.id)) || [task.title, '', task.priority, task.status, '', 0, task.id]
  await openTaskFromCard(taskRow)
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
  if (scope === 'archived' && !canManageDepartment.value) scope = 'all'
  if (taskScopeLoading.value) return
  taskScope.value = scope
  taskScopeLoading.value = true
  actionMenu.value = null
  try {
    const response = await taskFlowApi.listTasks({
      page_size: 100,
      // The backend already limits members to tasks they are allowed to see,
      // including hidden tasks where they are one of the assignees.
      my_tasks: scope === 'mine' ? 'true' : undefined,
      archived: scope === 'archived' ? 'true' : undefined
    })
    state.value.tasks = taskFlowApi.listItems(response).map(taskFlowApi.mapTask)
    if (scope === 'archived') archivedTaskCount.value = Number((response as { count?: number }).count ?? state.value.tasks.length)
    else if (canManageDepartment.value) {
      const archivedResponse = await taskFlowApi.listTasks({ page_size: 1, archived: 'true' })
      archivedTaskCount.value = Number((archivedResponse as { count?: number }).count ?? taskFlowApi.listItems(archivedResponse).length)
    }
    taskPage.value = 1
  } catch (error) {
    notifyError(taskFlowApiErrorMessage(error, 'Could not load tasks'))
  } finally {
    taskScopeLoading.value = false
  }
}

const loadArchivedTaskCount = async () => {
  if (!canManageDepartment.value) return
  try {
    const response = await taskFlowApi.listTasks({ page_size: 1, archived: 'true' })
    archivedTaskCount.value = Number((response as { count?: number }).count ?? taskFlowApi.listItems(response).length)
  } catch {
    archivedTaskCount.value = 0
  }
}

watch(canManageDepartment, (canManage) => {
  if (canManage) void loadArchivedTaskCount()
}, { immediate: true })

const openTaskOverviewCard = (status: string) => {
  if (status === 'archived') return
  if (taskScope.value === 'archived') void loadTaskScope('all')
  if (status === 'all') clearTaskAttentionFilter()
  else openTaskAttention(status as typeof taskAttentionFilter.value)
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

const dashboardStatus = (value: unknown) => {
  const status = String(value || '').split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  return status.toLowerCase() === 'backlog' ? 'Postponed' : status
}

const setPage = (key: PageKey) => {
  if (isComingSoonPage(key)) {
    notify('Coming soon')
    mobileSidebarOpen.value = false
    return
  }
  const enteringTasks = key === 'tasks' && activePage.value !== 'tasks'
  if (enteringTasks) {
    taskBoardSection.value = 'board'
    taskViewMode.value = 'kanban'
    taskAttentionFilter.value = 'all'
    taskPage.value = 1
    if (taskScope.value === 'archived') taskScope.value = 'all'
  }
  const pageChanged = activePage.value !== key
  // Keep the user's sidebar choice unchanged while navigating.
  activePage.value = key
  // Recreate the navigation after a hash-restored page change. This prevents
  // SSR's previously active item from surviving hydration after a refresh.
  if (pageChanged) sidebarNavigationKey.value += 1
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
  if (key === 'team') void loadMembersFromBackend()
  if (key === 'analytics') void loadFilteredAnalytics()
  if (key === 'messages') {
    void loadConversations()
    void loadMembersFromBackend()
  }
  actionMenu.value = null
  mobileSidebarOpen.value = false
}

const navigateSidebar = (event: MouseEvent, key: PageKey) => {
  setPage(key)
  ;(event.currentTarget as HTMLButtonElement | null)?.blur()
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

const showAttentionTasks = (filter: 'overdue' | 'today' | 'on_hold' | 'unassigned' = 'overdue') => {
  setPage('tasks')
  taskAttentionFilter.value = filter
  taskBoardSection.value = 'board'
  taskViewMode.value = 'list'
  taskPage.value = 1
}

const clearTaskAttentionFilter = () => {
  taskAttentionFilter.value = 'all'
  taskPage.value = 1
}

const openNotifications = () => {
  unreadNotificationCount.value = 0
  notify('No new notifications')
}

const navigateFromNotification = async (target: { kind: 'task' | 'message'; id: string }) => {
  if (target.kind === 'task') {
    setPage('tasks')
    await loadTaskScope(taskScope.value)
    const task = state.value.tasks.find((item) => String(item[6] || '') === target.id)
    await openTask(task || [target.id, '', '', '', '', 0, target.id], 'view', true)
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

const handleLogout = () => {
  actionMenu.value = null
  openDropdown.value = null
  modal.value = 'logout'
}

const confirmLogout = async () => {
  modal.value = null
  localStorage.removeItem(themeStorageKey)
  themeCookie.value = null
  document.documentElement.classList.remove('tf-dark')
  document.documentElement.style.colorScheme = 'light'
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

const addEmojiToMessage = (emoji: string) => {
  chatDraft.value += emoji
  emojiPickerOpen.value = false
  emojiSearch.value = ''
}

const applyChatSearchHighlights = async () => {
  if (!import.meta.client) return
  await nextTick()
  const cssHighlights = (CSS as any).highlights
  if (!cssHighlights || typeof (window as any).Highlight !== 'function') return
  cssHighlights.delete('chat-search')
  const query = chatSearch.value.trim().toLowerCase()
  if (!chatSearchOpen.value || !query) return
  const ranges: Range[] = []
  document.querySelectorAll('.tf-chat-bubble').forEach(element => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
    let node = walker.nextNode()
    while (node) {
      const text = node.textContent || ''
      let start = text.toLowerCase().indexOf(query)
      while (start >= 0) {
        const range = new Range()
        range.setStart(node, start)
        range.setEnd(node, start + query.length)
        ranges.push(range)
        start = text.toLowerCase().indexOf(query, start + query.length)
      }
      node = walker.nextNode()
    }
  })
  if (ranges.length) cssHighlights.set('chat-search', new (window as any).Highlight(...ranges))
}

const closeFloatingMenus = (event: PointerEvent) => {
  const target = event.target as HTMLElement | null
  if (target?.closest('[aria-label="Add emoji"]')) {
    emojiPickerOpen.value = !emojiPickerOpen.value
    return
  }
  if (target?.closest('.tf-chat-search-button, .tf-chat-menu-button')) {
    chatSearchOpen.value = !chatSearchOpen.value
    if (!chatSearchOpen.value) chatSearch.value = ''
    void applyChatSearchHighlights()
    return
  }
  if (!target?.closest('.tf-chat-search')) chatSearchOpen.value = false
  if (!target?.closest('.tf-emoji-picker')) emojiPickerOpen.value = false
  if (openDropdown.value === 'taskAssignee' && target && !taskAssigneePicker.value?.contains(target)) {
    openDropdown.value = null
  }
  if (target?.closest('.tf-action-menu, .tf-dropdown, .tf-date-picker, .tf-project-member-picker, .tf-event-attendee-picker')) return
  actionMenu.value = null
  openDropdown.value = null
  openProjectDatePicker.value = null
  projectMemberPickerOpen.value = false
  projectMemberSearch.value = ''
  eventAttendeePickerOpen.value = false
}

const handleModalKeydown = (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && ['a', 'c', 'v', 'x'].includes(event.key.toLowerCase())) {
    event.stopPropagation()
  }
}

const handleGlobalKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return
  const hasOpenLayer = Boolean(
    modal.value || supportWidgetOpen.value || mobileSidebarOpen.value || actionMenu.value || openDropdown.value ||
    openProjectDatePicker.value || projectMemberPickerOpen.value || eventAttendeePickerOpen.value
  )
  if (!hasOpenLayer) return

  event.preventDefault()
  actionMenu.value = null
  openDropdown.value = null
  openProjectDatePicker.value = null
  projectMemberPickerOpen.value = false
  projectMemberSearch.value = ''
  eventAttendeePickerOpen.value = false
  mobileSidebarOpen.value = false
  supportWidgetOpen.value = false
  modal.value = null
}

const closeModalFromBackdrop = () => {
  if (import.meta.client) {
    const activeElement = document.activeElement
    const hasInputSelection = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement
      ? activeElement.selectionStart !== activeElement.selectionEnd
      : false
    if (window.getSelection()?.toString() || hasInputSelection) return
  }
  modal.value = null
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

watch(chatDraft, (value) => {
  if (!chatSocket || chatSocket.readyState !== WebSocket.OPEN) return
  chatSocket.send(JSON.stringify({ type: 'typing.set', is_typing: Boolean(value.trim()) }))
  if (typingStopTimer) clearTimeout(typingStopTimer)
  if (value.trim()) {
    typingStopTimer = setTimeout(() => {
      if (chatSocket?.readyState === WebSocket.OPEN) chatSocket.send(JSON.stringify({ type: 'typing.set', is_typing: false }))
    }, 1200)
  }
})

watch([chatSearch, chatSearchOpen, conversationMessages], applyChatSearchHighlights, { deep: true })

onMounted(() => {
  // The app scrolls inside `.tf-content`; never restore document-level
  // horizontal scrolling after a production reload.
  window.scrollTo({ left: 0, top: 0 })
  document.documentElement.scrollLeft = 0
  document.body.scrollLeft = 0
  document.addEventListener('pointerdown', closeFloatingMenus, true)
  document.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('hashchange', restoreActivePage)
  themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  systemPrefersDark.value = themeMediaQuery.matches
  themeMediaQuery.addEventListener('change', updateSystemTheme)
  loadProfile()
  void loadMemberDepartments()
  try {
    const saved = JSON.parse(localStorage.getItem('taskflow-support-position') || 'null')
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
      supportWidgetPosition.value = {
        x: Math.max(12, Math.min(window.innerWidth - 68, saved.x)),
        y: Math.max(12, Math.min(window.innerHeight - 68, saved.y))
      }
    }
  } catch {
    localStorage.removeItem('taskflow-support-position')
  }

  const savedTheme = localStorage.getItem(themeStorageKey)
  if (isThemeOption(savedTheme)) {
    dropdownValues.theme = savedTheme
    appliedAppearance.theme = savedTheme
    themeCookie.value = savedTheme
  }
  syncRootThemeClass()
  restoreActivePage()
  void loadArchivedTaskCount()
  const linkedTaskId = String(route.query.task || '')
  if (linkedTaskId) {
    setPage('tasks')
    void openTask([linkedTaskId, '', '', '', '', 0, linkedTaskId], 'view')
  }
  tashkentNowMs.value = Date.now()
  dashboardClockTimer = setInterval(() => { tashkentNowMs.value = Date.now() }, 30_000)
  if (activePage.value === 'tasks') void loadTaskScope(taskScope.value)
})

onBeforeUnmount(() => {
  closeChatSocket()
  clearMessageAttachment()
  document.removeEventListener('pointerdown', closeFloatingMenus, true)
  document.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('hashchange', restoreActivePage)
  window.removeEventListener('pointermove', moveSupportDrag)
  window.removeEventListener('pointerup', stopSupportDrag)
  window.removeEventListener('pointercancel', stopSupportDrag)
  document.body.style.overflow = previousBodyOverflow
  clearFeedbackScreenshot()
  if (profileAvatarPreview.value && profileAvatarPreview.value.startsWith('blob:')) URL.revokeObjectURL(profileAvatarPreview.value)
  themeMediaQuery?.removeEventListener('change', updateSystemTheme)
  themeMediaQuery = null
  if (dashboardClockTimer) clearInterval(dashboardClockTimer)
  dashboardClockTimer = null
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
const projectManagerDetailOf = (project: Array<string | number>): ProjectCardMember | null => {
  try {
    const parsed = JSON.parse(String(project[12] || 'null'))
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}
const projectCategoryOf = (project: Array<string | number>) => String(project[13] || '')
const projectMembersOf = (project: Array<string | number>) => project.slice(14).map(String).filter(Boolean)
const taskProjectOptions = computed(() => state.value.projects.filter((project) => {
  const departmentId = projectDepartmentOf(project)
  return !effectiveDepartmentId.value || !departmentId || departmentId === effectiveDepartmentId.value
}))
const refreshProjectsFromBackend = async () => {
  try {
    const response = await taskFlowApi.listProjects({
      department: effectiveDepartmentId.value || undefined,
      page_size: 200
    })
    state.value.projects = taskFlowApi.listItems(response).map(taskFlowApi.mapProject)
  } catch (error) {
    console.error('Projects refresh failed.', error)
  }
}
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
const dashboardTaskCreatorName = (task: Record<string, any>) => {
  const creator = task.created_by_detail || task.creator_detail || task.owner_detail || task.created_by
  if (creator && typeof creator === 'object') return projectMemberName(creator)
  if (creator !== undefined && creator !== null && String(creator) !== '') {
    const member = team.value.find((item) => teamMemberId(item) === String(creator))
    if (member) return teamMemberName(member)
  }
  return '—'
}
const teamMemberId = (member: Array<string | number>) => {
  const rawId = member[7]
  if (rawId !== undefined && rawId !== null && String(rawId) !== '') return String(rawId)
  return ''
}
const teamMemberName = (member: Array<string | number>) => String(member[0] || '')
const teamMemberEmail = (member: Array<string | number>) => String(member[2] || '')
const messageMemberOptions = computed(() => {
  const query = newConversationSearch.value.trim().toLowerCase()
  return team.value.filter((member) => {
    const id = teamMemberId(member)
    if (!id || id === String(currentUserId.value) || String(member[12] || '').toLowerCase() === 'inactive') return false
    return !query || `${teamMemberName(member)} ${teamMemberEmail(member)}`.toLowerCase().includes(query)
  })
})
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
const memberDepartmentNameOf = (member: Array<string | number>) => departmentNameById(member[11], String(member[10] || ''))
const toggleTeamSort = (column: 'name' | 'department' | 'role' | 'efficiency') => {
  if (column === 'name') teamSort.value = teamSort.value === 'name_asc' ? 'name_desc' : 'name_asc'
  if (column === 'department') teamSort.value = teamSort.value === 'department_asc' ? 'department_desc' : 'department_asc'
  if (column === 'role') teamSort.value = teamSort.value === 'role_asc' ? 'role_desc' : 'role_asc'
  if (column === 'efficiency') teamSort.value = teamSort.value === 'efficiency_desc' ? 'efficiency_asc' : 'efficiency_desc'
  teamPage.value = 1
}
const payloadMemberId = (id: string) => (/^\d+$/.test(id) ? Number(id) : id)
const projectEnum = (value: string) => value.toLowerCase().replace(/\s+/g, '_')
const taskStatusApiValue = (value: string) => value.trim().toLowerCase() === 'postponed' ? 'backlog' : projectEnum(value)
const taskStatusDisplay = (value: unknown) => String(value || '').trim().toLowerCase() === 'backlog' ? 'Postponed' : String(value || '')
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

const openDatePicker = (field: 'startDate' | 'dueDate' | 'analyticsStart' | 'analyticsEnd') => {
  openProjectDatePicker.value = openProjectDatePicker.value === field ? null : field
  if (!openProjectDatePicker.value) return

  const rawValue = field === 'analyticsStart'
    ? analyticsFilters.start_date
    : field === 'analyticsEnd'
      ? analyticsFilters.end_date
      : form[field]
  const parsed = parseProjectDate(rawValue)
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
  const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  if (openProjectDatePicker.value === 'analyticsStart') analyticsFilters.start_date = isoDate
  else if (openProjectDatePicker.value === 'analyticsEnd') analyticsFilters.end_date = isoDate
  else form[openProjectDatePicker.value] = formatProjectDateInput(date)
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

const isTodayDatePickerCell = (day: number | null, month?: number, year?: number) => {
  if (!day || month === undefined || year === undefined) return false
  const today = new Date()
  return day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
}

const loadMemberDepartments = async () => {
  memberDepartmentsLoading.value = true
  try {
    const response = await taskFlowApi.listDepartments()
    memberDepartments.value = taskFlowApi.listItems(response)
      .map((department: any) => ({
        id: String(department?.id || department?.department_id || ''),
        name: String(department?.name || department?.department_name || department?.title || 'Unnamed department')
      }))
      .filter((department: { id: string }) => department.id)
  } catch (error) {
    console.warn('Departments load failed; using dashboard departments.', error)
  } finally {
    memberDepartmentsLoading.value = false
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
  const colonMatch = value.trim().match(/^(\d{1,2}):(\d{0,2})$/)
  if (colonMatch) {
    const hour = Math.min(Number(colonMatch[1] || 0), 23)
    const minute = Math.min(Number((colonMatch[2] || '0').padEnd(2, '0')), 59)
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  }
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (!digits) return ''

  const rawHour = digits.length <= 2 ? digits : digits.slice(0, 2)
  const rawMinute = digits.length <= 2 ? '' : digits.slice(2)
  const hour = Math.min(Number(rawHour || 0), 23)
  const minute = Math.min(Number(rawMinute.padEnd(2, '0') || 0), 59)

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

const eventTimeMinutes = (value: string) => {
  const [hour, minute] = (normalizeTimeValue(value) || '09:00').split(':').map(Number)
  return hour * 60 + minute
}
const formatEventTimeMinutes = (value: number) => {
  const normalized = ((value % 1440) + 1440) % 1440
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`
}
const normalizeEventTimeField = (field: 'eventTime' | 'eventEndTime') => {
  form[field] = normalizeTimeValue(form[field]) || (field === 'eventTime' ? '09:00' : '10:00')
}
const handleEventTimeInput = (event: Event, field: 'eventTime' | 'eventEndTime') => {
  const input = event.target as HTMLInputElement
  const raw = input.value.replace(/[^\d:]/g, '')
  let masked = ''
  if (raw.includes(':')) {
    const [rawHour = '', rawMinute = ''] = raw.split(':')
    masked = `${rawHour.replace(/\D/g, '').slice(0, 2)}:${rawMinute.replace(/\D/g, '').slice(0, 2)}`
  } else {
    const digits = raw.replace(/\D/g, '').slice(0, 4)
    masked = digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits
  }
  input.value = masked
  form[field] = masked
}
const setEventDuration = (minutes: number) => {
  normalizeEventTimeField('eventTime')
  form.eventEndTime = formatEventTimeMinutes(eventTimeMinutes(form.eventTime) + minutes)
}

const projectPayloadFromForm = (status = 'active') => {
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
    category: form.category.trim(),
    start_date: startDate,
    end_date: dueDate,
    manager: managerId ? payloadMemberId(managerId) : null,
    team_members: selectedMemberIds.map(payloadMemberId)
  }
}

const eventPayloadFromForm = () => ({
  department: modalDepartment.value || effectiveDepartmentId.value,
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

const setTaskPage = (page: number) => {
  setListPage('task', page)
  if (!import.meta.client) return
  void nextTick(() => document.querySelector('[data-task-board]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

const openModal = (value: Exclude<ModalKey, null>) => {
  if (value === 'member' && !canManageMembers.value) {
    notifyError('Only active owners, admins, and managers can add members')
    return
  }
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
  form.effortScore = 3
  taskFormStatus.value = 'Not Started'
  form.startDate = formatProjectDateInput(new Date())
  form.dueDate = formatProjectDateInput(new Date())
  form.projectId = ''
  form.projectManager = ''
  projectManagerSearch.value = ''
  form.category = ''
  form.eventType = ''
  form.eventTime = value === 'event' ? '09:00' : ''
  form.eventEndTime = value === 'event' ? '10:30' : ''
  form.eventColor = 'bg-task-blue'
  form.meetingLink = ''
  form.description = ''
  modalDepartment.value = effectiveDepartmentId.value
  if (value === 'event' && canChooseDepartment.value) void loadModalDepartments()
  if (value === 'task') {
    editingTaskId.value = ''
    taskModalMode.value = 'create'
    aiTaskAssistantOpen.value = false
    aiTaskPrompt.value = ''
    aiTaskDraft.value = null
    aiTaskError.value = ''
    taskIsHidden.value = false
    taskAssigneeIds.value = []
    taskAssigneeLabels.value = []
    taskMainAssigneeId.value = ''
    taskAssigneeSearch.value = ''
    taskAssigneeOptions.value = []
  }
  if (value === 'member') {
    editingMemberId.value = ''
    if (memberAvatarPreview.value.startsWith('blob:')) URL.revokeObjectURL(memberAvatarPreview.value)
    memberFirstName.value = ''
    memberLastName.value = ''
    memberEmail.value = ''
    memberUsername.value = ''
    memberPassword.value = ''
    memberPasswordConfirm.value = ''
    showMemberPassword.value = false
    showMemberPasswordConfirm.value = false
    memberPhone.value = ''
    memberJobTitle.value = ''
    memberAvatarFile.value = null
    memberAvatarPreview.value = ''
    if (memberAvatarInput.value) memberAvatarInput.value.value = ''
    memberRole.value = 'member'
    memberIsActive.value = true
    memberDepartment.value = effectiveDepartmentId.value
    void loadMemberDepartments()
  }
  if (value === 'event') {
    editingEventId.value = ''
    eventAttendeeIds.value = []
    eventAttendeeLabels.value = []
    eventAttendeePickerOpen.value = false
    eventAttendeeSearch.value = ''
    eventAttendeeConfirmation.value = ''
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
    reportType.value = 'Weekly Progress'
    reportStatus.value = 'All Statuses'
    reportPriority.value = 'All Priorities'
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
  taskMainAssigneeId.value = memberId
  taskAssigneeSearch.value = member
}

let taskAssigneeSearchTimer: ReturnType<typeof setTimeout> | undefined
let taskAssigneeRequestId = 0
const loadTaskAssignees = async (search: string) => {
  const query = search.trim()
  const requestId = ++taskAssigneeRequestId
  taskAssigneesLoading.value = true
  try {
    const requests = [taskFlowApi.listMembers({ is_active: true, search: query || undefined, page_size: 200 })]
    if (query) requests.push(taskFlowApi.searchTaskAssignees(query))
    const responses = await Promise.allSettled(requests)
    if (requestId !== taskAssigneeRequestId) return
    const members = responses.flatMap(result => result.status === 'fulfilled' ? taskFlowApi.listItems(result.value) : [])
    const seen = new Set<string>()
    taskAssigneeOptions.value = members.map(taskFlowApi.mapMember).filter(member => {
      const id = teamMemberId(member)
      if (!id || seen.has(id)) return false
      seen.add(id)
      return true
    })
  } catch (error) {
    if (requestId !== taskAssigneeRequestId) return
    console.error('Task assignees load failed.', error)
    taskAssigneeOptions.value = []
    notifyError(taskFlowApiErrorMessage(error, 'Could not search task assignees'))
  } finally {
    if (requestId === taskAssigneeRequestId) taskAssigneesLoading.value = false
  }
}
watch(taskAssigneeSearch, (search) => {
  clearTimeout(taskAssigneeSearchTimer)
  if (!search.trim()) {
    void loadTaskAssignees('')
    return
  }
  taskAssigneeSearchTimer = setTimeout(() => void loadTaskAssignees(search), 250)
})
const toggleTaskAssigneeDropdown = () => {
  const opening = openDropdown.value !== 'taskAssignee'
  openDropdown.value = opening ? 'taskAssignee' : null
  if (opening) void loadTaskAssignees(taskAssigneeSearch.value)
}
const taskIsHiddenOf = (task: Array<string | number>) => String(task[17] || '') === 'true'
const taskMainAssigneeIdOf = (task: Array<string | number>) => String(task[18] || '')
const taskMainAssigneeOf = (task: Array<string | number>): ProjectCardMember | null => {
  try {
    return JSON.parse(String(task[19] || 'null')) as ProjectCardMember | null
  } catch {
    return null
  }
}

const loadModalDepartments = async () => {
  if (modal.value === 'task' ? !canChooseTaskDepartment.value : !canChooseDepartment.value) return
  await loadMemberDepartments()
  const options = modal.value === 'task' ? taskDepartmentOptions.value : memberDepartmentOptions.value
  if (!modalDepartment.value && options.length === 1) {
    modalDepartment.value = options[0].id
  }
}

const selectModalDepartment = (departmentId: string) => {
  modalDepartment.value = departmentId
  openDropdown.value = null
  if (modal.value === 'event') void loadEventAttendees()
  if (modal.value === 'task') {
    taskAssigneeIds.value = []
    taskAssigneeLabels.value = []
    taskMainAssigneeId.value = ''
    form.assignee = ''
    void loadTaskAssignees(taskAssigneeSearch.value)
  }
}
const currentMemberId = computed(() => {
  const email = savedProfile.email.trim().toLowerCase()
  if (!email) return ''
  const member = team.value.find((item) => String(item[2] || '').trim().toLowerCase() === email)
  return member ? teamMemberId(member) : ''
})
const modalDepartmentName = computed(() =>
  (modal.value === 'task' ? taskDepartmentOptions.value : memberDepartmentOptions.value)
    .find((department) => department.id === modalDepartment.value)?.name || 'Select department'
)

const normalizeSmartText = (value: string) => value
  .toLocaleLowerCase('uz')
  .replace(/[ʻʼ’‘`]/g, "'")
  .replace(/[^a-z0-9а-яёғқўҳ' ]/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const smartDraftDueDate = (prompt: string) => {
  const explicit = prompt.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/)
  if (explicit) return `${explicit[1].padStart(2, '0')}.${explicit[2].padStart(2, '0')}.${explicit[3]}`

  const normalized = normalizeSmartText(prompt)
  const date = new Date()
  if (/\b(ertaga|tomorrow)\b/.test(normalized)) date.setDate(date.getDate() + 1)
  else {
    const daysFromNow = normalized.match(/\b(\d+)\s*(kun|day)s?\b/)
    if (daysFromNow) date.setDate(date.getDate() + Number(daysFromNow[1]))
    else {
      const weekdays: Array<[RegExp, number]> = [
        [/\b(dushanba|monday)\b/, 1], [/\b(seshanba|tuesday)\b/, 2],
        [/\b(chorshanba|wednesday)\b/, 3], [/\b(payshanba|thursday)\b/, 4],
        [/\b(juma|friday)\b/, 5], [/\b(shanba|saturday)\b/, 6], [/\b(yakshanba|sunday)\b/, 0]
      ]
      const weekday = weekdays.find(([pattern]) => pattern.test(normalized))
      if (weekday) {
        const distance = (weekday[1] - date.getDay() + 7) % 7 || 7
        date.setDate(date.getDate() + distance)
      } else date.setDate(date.getDate() + 7)
    }
  }
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`
}

const generateSmartTaskDraft = () => {
  const prompt = aiTaskPrompt.value.trim()
  aiTaskError.value = ''
  if (prompt.length < 5) {
    aiTaskError.value = 'Task haqida kamida bir necha so‘z yozing yoki gapiring.'
    return
  }

  const normalized = normalizeSmartText(prompt)
  const candidates = [...taskAssigneeOptions.value, ...team.value].filter((member, index, rows) => {
    const id = teamMemberId(member)
    return id && rows.findIndex((item) => teamMemberId(item) === id) === index
  })
  const promptWords = normalized.split(' ').filter(Boolean)
  const memberMatches = candidates.map((member) => {
    const name = normalizeSmartText(teamMemberName(member))
    const nameParts = name.split(' ').filter((part) => part.length > 2)
    let score = normalized.includes(name) ? 100 + name.length : 0
    nameParts.forEach((part, index) => {
      const exactOrSuffixed = promptWords.some((word) =>
        word === part || ['ga', 'ka', 'qa', 'ni', 'ning', 'dan'].some((suffix) => word === `${part}${suffix}`)
      )
      if (exactOrSuffixed) score += index === 0 ? 40 : 20
    })
    return { member, score }
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score)
  const matchedMember = memberMatches[0]?.member
  const matchedDepartment = taskDepartmentOptions.value.find((department) =>
    normalized.includes(normalizeSmartText(department.name))
  )
  const departmentId = matchedDepartment?.id || String(matchedMember?.[11] || '') || modalDepartment.value || effectiveDepartmentId.value
  const departmentName = matchedDepartment?.name || taskDepartmentOptions.value.find((item) => item.id === departmentId)?.name || 'Current department'
  const assigneeName = matchedMember ? teamMemberName(matchedMember) : ''
  const assigneeId = matchedMember ? teamMemberId(matchedMember) : ''
  const priority: SmartTaskDraft['priority'] = /\b(high|yuqori|urgent|shoshilinch)\b/.test(normalized)
    ? 'High'
    : /\b(low|past)\b/.test(normalized) ? 'Low' : 'Medium'

  let title = prompt
    .replace(/\b(priority|prioritet)\s*[:=-]?\s*(high|medium|low|yuqori|o['‘’]?rta|past)\b/gi, '')
    .replace(/\b(ertaga|bugun|tomorrow|today|dushanba|seshanba|chorshanba|payshanba|juma|shanba|yakshanba|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*(kuni|kunigacha|gacha|day)?\b/gi, '')
    .replace(/\b(taskini|taskni|task|vazifani|vazifa)\s*(ber|yarat|create|assign)?\b/gi, '')
  if (assigneeName) {
    assigneeName.split(' ').filter(Boolean).forEach((part) => {
      title = title.replace(new RegExp(`${part}(ga|ka|qa)?`, 'gi'), '')
    })
  }
  title = title.replace(/\s+/g, ' ').replace(/^[,.:;\s-]+|[,.:;\s-]+$/g, '').trim()
  if (!title) title = 'New task'
  title = title.charAt(0).toUpperCase() + title.slice(1, 100)

  const category = /\b(design|dizayn|ui|ux)\b/.test(normalized) ? 'Design'
    : /\b(development|frontend|backend|api|code|dastur)\b/.test(normalized) ? 'Development'
      : /\b(test|qa|tekshir)\b/.test(normalized) ? 'QA'
        : /\b(marketing|reklama|content|kontent)\b/.test(normalized) ? 'Marketing' : ''
  const isEnglishPrompt = /\b(please|create|assign|complete|design|develop|fix|by|priority)\b/.test(normalized) && !/\b(uchun|kerak|ber|yarat|tayyorla|gacha)\b/.test(normalized)
  const acceptanceCriteria = isEnglishPrompt
    ? category === 'Design'
      ? ['Final design is ready for review.', 'Source file and responsive states are included.']
      : category === 'Development'
        ? ['Implementation is ready for code review.', 'The change is tested without known regressions.']
        : ['Requested outcome is ready for review.', 'Requirements are verified and task status is updated.']
    : category === 'Design'
      ? ['Yakuniy dizayn review uchun tayyor bo‘ladi.', 'Source fayl va responsive holatlar birga topshiriladi.']
      : category === 'Development'
        ? ['Kod review uchun tayyor holatda topshiriladi.', 'O‘zgarish test qilinib, regressiya yo‘qligi tekshiriladi.']
        : category === 'QA'
          ? ['Test natijalari va topilgan muammolar yozib boriladi.', 'Talablar bajarilgani yakuniy tekshiruvdan o‘tkaziladi.']
          : ['Natija review uchun tayyor holatda topshiriladi.', 'Talablar bajarilgani tekshiriladi va task statusi yangilanadi.']
  aiTaskDraft.value = {
    title,
    description: `${prompt}\n\nAcceptance criteria:\n${acceptanceCriteria.map((item) => `• ${item}`).join('\n')}`,
    priority,
    dueDate: smartDraftDueDate(prompt),
    category,
    departmentId,
    departmentName,
    assigneeId,
    assigneeName,
    acceptanceCriteria
  }
}

const applySmartTaskDraft = async () => {
  const draft = aiTaskDraft.value
  if (!draft) return
  form.title = draft.title
  form.description = draft.description
  form.priority = draft.priority
  form.dueDate = draft.dueDate
  form.category = draft.category
  if (draft.departmentId) modalDepartment.value = draft.departmentId
  if (draft.assigneeId) {
    taskAssigneeIds.value = [draft.assigneeId]
    taskAssigneeLabels.value = [draft.assigneeName]
    taskMainAssigneeId.value = draft.assigneeId
    form.assignee = draft.assigneeName
  }
  aiTaskAssistantOpen.value = false
  notify('AI draft applied to the task form. Review it before creating the task.', 'success')
}

const toggleSmartTaskVoice = () => {
  if (!import.meta.client) return
  if (aiTaskListening.value) {
    aiSpeechRecognition?.stop?.()
    return
  }
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SpeechRecognition) {
    aiTaskError.value = 'Bu brauzer voice input’ni qo‘llamaydi. Matn yozib foydalanishingiz mumkin.'
    return
  }
  aiTaskError.value = ''
  aiSpeechRecognition = new SpeechRecognition()
  aiSpeechRecognition.lang = 'uz-UZ'
  aiSpeechRecognition.interimResults = true
  aiSpeechRecognition.continuous = false
  aiSpeechRecognition.onstart = () => { aiTaskListening.value = true }
  aiSpeechRecognition.onresult = (event: any) => {
    aiTaskPrompt.value = Array.from(event.results)
      .map((result: any) => result[0]?.transcript || '')
      .join(' ')
      .trim()
  }
  aiSpeechRecognition.onerror = () => { aiTaskError.value = 'Ovoz aniqlanmadi. Qayta urinib ko‘ring.' }
  aiSpeechRecognition.onend = () => { aiTaskListening.value = false }
  aiSpeechRecognition.start()
}
const canChangeTaskStatus = (task: Array<string | number>) => {
  const mainAssigneeId = taskMainAssigneeIdOf(task)
  const mainAssignee = taskMainAssigneeOf(task)
  const currentEmail = savedProfile.email.trim().toLowerCase()
  const mainAssigneeEmail = String(mainAssignee?.email || '').trim().toLowerCase()

  return Boolean(
    (mainAssigneeId && [String(currentUserId.value), currentMemberId.value].includes(mainAssigneeId)) ||
    (currentEmail && mainAssigneeEmail === currentEmail)
  )
}
const taskCreatorOf = (task: Array<string | number>): ProjectCardMember | null => {
  try {
    return JSON.parse(String(task[20] || 'null')) as ProjectCardMember | null
  } catch {
    return null
  }
}
const isTaskCreator = (task: Array<string | number>) =>
  Boolean(currentUserId.value) && String(taskCreatorOf(task)?.id || '') === String(currentUserId.value)
const canDeleteTask = (task: Array<string | number>) => canManageDepartment.value || isTaskCreator(task)
const taskCreatorNameOf = (task: Array<string | number>) => {
  const creator = taskCreatorOf(task)
  if (!creator) return '—'
  const name = projectMemberName(creator)
  if (name !== 'Member') return name
  const member = team.value.find((item) => teamMemberId(item) === String(creator.id || ''))
  return member ? teamMemberName(member) : '—'
}
const taskCreatorAvatarOf = (task: Array<string | number>) => {
  const avatar = String(taskCreatorOf(task)?.avatar || '')
  if (!avatar || /^https?:\/\//i.test(avatar)) return avatar
  const apiBase = String(runtimeConfig.public.apiBase || '')
  if (!apiBase) return avatar
  try {
    return new URL(avatar, `${new URL(apiBase).origin}/`).toString()
  } catch {
    return avatar
  }
}
const openedTask = computed(() => state.value.tasks.find((task) => String(task[6] || '') === editingTaskId.value))
const canDeleteOpenedTask = computed(() => Boolean(openedTask.value && canDeleteTask(openedTask.value)))
const openedTaskCanChangeStatus = computed(() => !editingTaskId.value || Boolean(openedTask.value && canChangeTaskStatus(openedTask.value)))

const selectTaskAssignee = (member: Array<string | number>) => {
  const id = teamMemberId(member)
  const name = teamMemberName(member)
  if (!id) return
  const selectedIndex = taskAssigneeIds.value.indexOf(id)
  if (selectedIndex >= 0) {
    removeTaskAssignee(selectedIndex)
    taskAssigneeSearch.value = ''
    openDropdown.value = 'taskAssignee'
    nextTick(() => taskAssigneeInput.value?.focus())
    return
  }
  taskAssigneeIds.value.push(id)
  taskAssigneeLabels.value.push(name)
  if (!taskMainAssigneeId.value) taskMainAssigneeId.value = id
  form.assignee = taskAssigneeLabels.value.join(', ')
  taskAssigneeSearch.value = ''
  openDropdown.value = 'taskAssignee'
  taskAssigneeConfirmation.value = `${name} selected`
  window.setTimeout(() => {
    if (taskAssigneeConfirmation.value === `${name} selected`) taskAssigneeConfirmation.value = ''
  }, 2200)
  nextTick(() => taskAssigneeInput.value?.focus())
}

const removeTaskAssignee = (index: number) => {
  const removedId = taskAssigneeIds.value[index]
  taskAssigneeIds.value.splice(index, 1)
  taskAssigneeLabels.value.splice(index, 1)
  if (removedId === taskMainAssigneeId.value) taskMainAssigneeId.value = taskAssigneeIds.value[0] || ''
  form.assignee = taskAssigneeLabels.value.join(', ')
}

const setTaskMainAssignee = (index: number) => {
  if (index <= 0 || index >= taskAssigneeIds.value.length) return
  const [id] = taskAssigneeIds.value.splice(index, 1)
  const [label] = taskAssigneeLabels.value.splice(index, 1)
  taskAssigneeIds.value.unshift(id)
  taskAssigneeLabels.value.unshift(label)
  taskMainAssigneeId.value = id
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

const removeEventAttendee = (index: number) => {
  if (index < 0 || index >= eventAttendeeIds.value.length) return
  eventAttendeeIds.value.splice(index, 1)
  eventAttendeeLabels.value.splice(index, 1)
}

const availableEventAttendees = computed(() => {
  const query = eventAttendeeSearch.value.trim().toLowerCase()
  return eventAttendeeOptions.value.filter((member) => {
    const id = teamMemberId(member)
    return id && !eventAttendeeIds.value.includes(id) && (!query || `${teamMemberName(member)} ${teamMemberEmail(member)}`.toLowerCase().includes(query))
  })
})

const loadEventAttendees = async () => {
  eventAttendeesLoading.value = true
  try {
    const department = modalDepartment.value || effectiveDepartmentId.value
    if (!department && !canChooseDepartment.value) {
      eventAttendeeOptions.value = []
      notifyError('Your account must belong to a department before selecting attendees')
      return
    }

    if (canCreateEvent.value) {
      const response = await taskFlowApi.listMembers({ page_size: 200 })
      eventAttendeeOptions.value = taskFlowApi.listItems(response).map(taskFlowApi.mapMember)
    } else {
      const response = await taskFlowApi.listMembers({ department, page_size: 200 })
      eventAttendeeOptions.value = taskFlowApi.listItems(response)
        .map(taskFlowApi.mapMember)
        .filter(member => String(member[11] || '') === department)
    }

    const allowedIds = new Set(eventAttendeeOptions.value.map(teamMemberId).filter(Boolean))
    for (let index = eventAttendeeIds.value.length - 1; index >= 0; index -= 1) {
      if (!allowedIds.has(eventAttendeeIds.value[index])) {
        eventAttendeeIds.value.splice(index, 1)
        eventAttendeeLabels.value.splice(index, 1)
      }
    }
  } catch (error) {
    console.error('Event attendees load failed.', error)
    eventAttendeeOptions.value = canCreateEvent.value ? [...visibleTeam.value] : [...departmentTeam.value]
    notifyError(taskFlowApiErrorMessage(error, 'Could not load users'))
  } finally {
    eventAttendeesLoading.value = false
  }
}

watch(eventAttendeeSearch, (value) => {
  clearTimeout(eventAttendeeSearchTimer)
  const query = value.trim()
  if (!query || modal.value !== 'event') return
  eventAttendeeSearchTimer = setTimeout(async () => {
    try {
      const response = await taskFlowApi.searchTaskAssignees(query)
      const members = taskFlowApi.listItems(response).map(taskFlowApi.mapMember)
      const existingById = new Map(eventAttendeeOptions.value.map(member => [teamMemberId(member), member]))
      members.forEach((member) => {
        const id = teamMemberId(member)
        if (id) existingById.set(id, member)
      })
      eventAttendeeOptions.value = [...existingById.values()]
    } catch (error) {
      console.error('Event attendee search failed.', error)
    }
  }, 250)
})

const selectEventAttendee = (member: Array<string | number>) => {
  const id = teamMemberId(member)
  if (!id || eventAttendeeIds.value.includes(id)) return
  const name = teamMemberName(member)
  eventAttendeeIds.value.push(id)
  eventAttendeeLabels.value.push(name)
  eventAttendeeSearch.value = ''
  eventAttendeePickerOpen.value = true
  eventAttendeeConfirmation.value = `${name} selected`
  window.setTimeout(() => {
    if (eventAttendeeConfirmation.value === `${name} selected`) eventAttendeeConfirmation.value = ''
  }, 1800)
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
  const managerDetail = projectManagerDetailOf(project)
  form.projectManager = managerDetail ? projectMemberName(managerDetail) : ''
  projectManagerSearch.value = form.projectManager
  form.category = projectCategoryOf(project)
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
  if (!canChangeTaskStatus(task)) {
    notifyError('Only the main assignee can update task status and progress.')
    return
  }

  updatingTaskId.value = id
  try {
    await taskFlowApi.patchTask(id, {
      status,
      ...(status === 'completed' ? { progress: 100 } : {})
    })
    task[3] = projectDisplayStatus(status)
    if (status === 'completed') task[5] = 100
    await refreshProjectsFromBackend()
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

const openTask = async (task: Array<string | number>, mode: 'view' | 'edit', fromNotification = false) => {
  taskModalReturnToAnalytics.value = false
  actionMenu.value = null
  const id = String(task[6] || '')
  if (!id) return notifyError('This task has not been synchronized with the backend yet')
  taskSaving.value = true
  try {
    const details = await taskFlowApi.getTask(id)
    const mapped = taskFlowApi.mapTask(details)
    replaceTaskRow(id, mapped)
    editingTaskId.value = id
    taskModalMode.value = mode
    form.title = String(mapped[0] || '')
    form.priority = String(mapped[2] || 'Medium')
    form.effortScore = Math.min(5, Math.max(1, Number(mapped[21] || 3)))
    taskFormStatus.value = taskStatusDisplay(mapped[3] || 'Not Started')
    taskIsHidden.value = taskIsHiddenOf(mapped)
    form.description = String(mapped[10] || '')
    form.category = String(mapped[11] || '')
    form.projectId = String(mapped[22] || '')
    modalDepartment.value = String(mapped[8] || effectiveDepartmentId.value || '')
    const rawDueDate = String(mapped[12] || '')
    form.dueDate = rawDueDate ? formatProjectDateInput(new Date(`${rawDueDate}T00:00:00`)) : ''
    const assigneeDetails = taskAssigneeDetailsOf(mapped)
    const rawAssignees = JSON.parse(String(mapped[13] || '[]')) as Array<string | number>
    taskAssigneeIds.value = rawAssignees.map(String)
    if (!taskAssigneeIds.value.length) taskAssigneeIds.value = assigneeDetails.map((member) => String(member.id || '')).filter(Boolean)
    taskMainAssigneeId.value = taskMainAssigneeIdOf(mapped) || taskAssigneeIds.value[0] || ''
    const mainAssigneeIndex = taskAssigneeIds.value.indexOf(taskMainAssigneeId.value)
    if (mainAssigneeIndex > 0) {
      const [mainAssigneeId] = taskAssigneeIds.value.splice(mainAssigneeIndex, 1)
      taskAssigneeIds.value.unshift(mainAssigneeId)
    }
    taskAssigneeLabels.value = taskAssigneeIds.value.map((id) => {
      const detail = assigneeDetails.find((member) => String(member.id || '') === id)
      const teamMember = team.value.find((member) => teamMemberId(member) === id)
      return detail ? projectMemberName(detail) : teamMember ? teamMemberName(teamMember) : `User ${id}`
    })
    taskAssigneeSearch.value = ''
    taskAssigneeOptions.value = []
    modal.value = 'task'
  } catch (error) {
    notifyError(fromNotification ? 'This task is no longer available or you do not have access to it.' : taskFlowApiErrorMessage(error, 'Could not load task details'))
  } finally {
    taskSaving.value = false
  }
}

const openTaskFromCard = (task: Array<string | number>) =>
  openTask(task, canManageDepartment.value ? 'edit' : 'view')

const openAnalyticsTaskDetails = async (task: Array<string | number>) => {
  await openTask(task, canManageDepartment.value ? 'edit' : 'view')
  if (modal.value === 'task') taskModalReturnToAnalytics.value = true
}

const returnToAnalyticsUserTasks = () => {
  taskModalReturnToAnalytics.value = false
  modal.value = 'analytics-user-tasks'
}

const handleModalCloseCapture = (event: MouseEvent) => {
  const closeButton = (event.target as HTMLElement | null)?.closest('button[aria-label="Close modal"]')
  if (!closeButton || modal.value !== 'task' || !taskModalReturnToAnalytics.value) return
  event.preventDefault()
  event.stopImmediatePropagation()
  returnToAnalyticsUserTasks()
}

const deleteTask = async (task: Array<string | number>) => {
  actionMenu.value = null
  const id = String(task[6] || '')
  if (!id) {
    notifyError('This task has not been synchronized with the backend yet')
    return false
  }
  if (!canDeleteTask(task)) {
    notifyError('You can delete only tasks you created')
    return false
  }
  if (import.meta.client && !window.confirm(`“${String(task[0])}” taskini o‘chirmoqchimisiz?`)) return
  try {
    await taskFlowApi.deleteTask(id)
    state.value.tasks = state.value.tasks.filter((item) => String(item[6] || '') !== id)
    await refreshProjectsFromBackend()
    notify('Task deleted successfully', 'success')
  } catch (error) {
    notifyError(taskFlowApiErrorMessage(error, 'Could not delete the task'))
    return false
  }
}

const deleteOpenedTask = async () => {
  if (!openedTask.value) return
  const id = String(openedTask.value[6] || '')
  await deleteTask(openedTask.value)
  if (id && !state.value.tasks.some((task) => String(task[6] || '') === id)) modal.value = null
}

const duplicateTask = async (task: Array<string | number>) => {
  actionMenu.value = null
  const department = String(task[8] || '')
  if (!department) return notifyError('The task department could not be found')
  try {
    const assignees = JSON.parse(String(task[13] || '[]')) as Array<string | number>
    const created = await taskFlowApi.createTask({
      department,
      project: String(task[22] || '') || null,
      title: `${String(task[0])} Copy`,
      description: String(task[10] || ''),
      status: projectEnum(String(task[3] || 'Not Started')),
      priority: projectEnum(String(task[2] || 'Medium')),
      effort_score: Math.min(5, Math.max(1, Number(task[21] || 3))),
      category: String(task[11] || ''),
      assignees,
      due_date: String(task[12] || todayIsoDate()),
      progress: Number(task[5] || 0),
      is_hidden: taskIsHiddenOf(task)
    })
    state.value.tasks.unshift(taskFlowApi.mapTask(created))
    await refreshProjectsFromBackend()
    notify('Task duplicated successfully', 'success')
  } catch (error) {
    notifyError(taskFlowApiErrorMessage(error, 'Could not duplicate the task'))
  }
}

const dropTaskInColumn = (status: string) => {
  const task = tasks.value.find((item) => String(item[6] || '') === draggedTaskId.value)
  if (task && canChangeTaskStatus(task)) void updateTaskStatus(task, status)
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
    return false
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

const viewMemberProfile = async (member: Array<string | number>) => {
  actionMenu.value = null
  selectedTeamMember.value = member
  modal.value = 'member-profile'
  const id = membershipIdOf(member)
  if (!id) return
  try {
    selectedTeamMember.value = taskFlowApi.mapMember(await taskFlowApi.getMember(id))
  } catch (error) {
    console.error('Member profile load failed.', error)
  }
}

const editSelectedMember = () => {
  const member = selectedTeamMember.value
  if (!member) return
  const id = membershipIdOf(member)
  if (!id) {
    notifyError('Membership id is required from backend')
    return
  }

  const nameParts = teamMemberName(member).trim().split(/\s+/).filter(Boolean)
  editingMemberId.value = id
  memberFirstName.value = nameParts.shift() || ''
  memberLastName.value = nameParts.join(' ')
  memberEmail.value = String(member[2] || '')
  memberUsername.value = ''
  memberPassword.value = ''
  memberPasswordConfirm.value = ''
  memberPhone.value = String(member[3] === '-' ? '' : member[3] || '')
  memberJobTitle.value = String(member[1] || '')
  memberDepartment.value = String(member[11] || effectiveDepartmentId.value || '')
  memberRole.value = String(member[14] || 'member').toLowerCase()
  memberIsActive.value = String(member[12]) !== 'Inactive'
  memberAvatarFile.value = null
  memberAvatarPreview.value = String(member[8] || '')
  openDropdown.value = null
  void loadMemberDepartments()
  modal.value = 'member'
}

const requestMemberRemoval = (member: Array<string | number>) => {
  actionMenu.value = null
  selectedTeamMember.value = member
  modal.value = 'member-remove'
}

const viewSelectedMemberTasks = () => {
  if (!selectedTeamMember.value) return
  const memberName = teamMemberName(selectedTeamMember.value)
  modal.value = null
  taskAttentionFilter.value = 'all'
  dropdownValues.priority = 'All Priorities'
  taskSearchInput.value = memberName
  taskSearch.value = memberName
  taskPage.value = 1
  setPage('tasks')
}

const deleteMember = async (member: Array<string | number>) => {
  actionMenu.value = null
  const id = membershipIdOf(member)
  const label = teamMemberName(member)

  if (!id) {
    notifyError('Membership id is required from backend')
    return false
  }

  try {
    await taskFlowApi.deleteMember(id)
    state.value.team = state.value.team.filter((item) => membershipIdOf(item) !== id)
    await loadMembersFromBackend()
    notify(`${label || 'Member'} removed`, 'success')
    return true
  } catch (error) {
    console.error('Member delete failed.', error)
    notifyError(taskFlowApiErrorMessage(error, 'Member delete failed'))
    return false
  }
}

const confirmMemberRemoval = async () => {
  if (!selectedTeamMember.value || memberDeleting.value) return
  memberDeleting.value = true
  try {
    if (await deleteMember(selectedTeamMember.value)) {
      modal.value = null
      selectedTeamMember.value = null
    }
  } finally {
    memberDeleting.value = false
  }
}

const submitModal = async () => {
  const title = form.title.trim()

  if (modal.value === 'member') {
    if (!canManageDepartment.value) {
      notifyError('You do not have permission to manage members')
      return
    }
    if (!memberDepartment.value) {
      notifyError('Department is required')
      return
    }
    const email = memberEmail.value.trim().toLowerCase()
    const username = memberUsername.value.trim()
    const password = memberPassword.value
    if (!memberFirstName.value.trim() || !memberLastName.value.trim() || !email || (!editingMemberId.value && (!username || !password))) {
      notifyError(editingMemberId.value ? 'First name, last name, and email are required' : 'First name, last name, email, username, and password are required')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      notifyError('Enter a valid email address')
      return
    }
    if (!editingMemberId.value && password.length < 8) {
      notifyError('Password must be at least 8 characters')
      return
    }
    if (!editingMemberId.value && password !== memberPasswordConfirm.value) {
      notifyError('Passwords do not match')
      return
    }

    try {
      const memberPayload = {
        first_name: memberFirstName.value.trim(),
        last_name: memberLastName.value.trim(),
        email,
        phone: memberPhone.value.trim(),
        job_title: memberJobTitle.value.trim(),
        department: memberDepartment.value,
        role: memberRole.value,
        is_active: memberIsActive.value
      }
      if (editingMemberId.value) {
        await taskFlowApi.patchMember(editingMemberId.value, memberPayload, memberAvatarFile.value)
      } else {
        await taskFlowApi.createMember({ ...memberPayload, username, password }, memberAvatarFile.value)
      }
      await loadMembersFromBackend()
      notify(editingMemberId.value ? 'Member updated successfully' : 'Member added successfully', 'success')
    } catch (error) {
      console.error('Member save failed.', error)
      notifyError(taskFlowApiErrorMessage(error, 'Member save failed'))
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

    if (!canAddTask.value && !editingTaskId.value) {
      notifyError('Only active owners, admins, and managers can add tasks')
      return
    }
    const status = taskStatusApiValue(taskFormStatus.value)
    const payload = {
      department: modalDepartment.value || effectiveDepartmentId.value,
      ...(form.projectId ? { project: form.projectId } : editingTaskId.value ? {} : { project: null }),
      title,
      description: form.description.trim(),
      status,
      priority: projectEnum(form.priority),
      effort_score: form.effortScore,
      category: form.category.trim(),
      assignees: [
        taskMainAssigneeId.value,
        ...taskAssigneeIds.value.filter((id) => id !== taskMainAssigneeId.value)
      ].filter(Boolean).map(payloadMemberId),
      due_date: parseProjectDate(form.dueDate) || todayIsoDate(),
      progress: status === 'completed' ? 100 : 0,
      is_hidden: taskIsHidden.value
    }

    taskSaving.value = true
    try {
      const { status: _status, progress: _progress, ...nonStatusPayload } = payload
      const saved = editingTaskId.value
        ? await taskFlowApi.patchTask(editingTaskId.value, openedTaskCanChangeStatus.value ? payload : nonStatusPayload)
        : await taskFlowApi.createTask(payload)
      if (editingTaskId.value) replaceTaskRow(editingTaskId.value, taskFlowApi.mapTask(saved))
      else state.value.tasks.unshift(taskFlowApi.mapTask(saved))
      await refreshProjectsFromBackend()
      notify(editingTaskId.value ? 'Task updated successfully' : 'Task created successfully', 'success')
    } catch (error) {
      console.error('Task create failed.', error)
      notifyError(taskFlowApiErrorMessage(error, 'Task create failed'))
      return
    } finally {
      taskSaving.value = false
    }
  }

  if (modal.value === 'project') {
    const projectPayload = projectPayloadFromForm('active')
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
          status: projectEnum(String(state.value.projects.find((project) => projectIdOf(project) === editingProjectId.value)?.[1] || 'Active'))
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
    const reportStartDate = parseProjectDate(form.startDate)
    const reportEndDate = parseProjectDate(form.dueDate)
    if (!reportStartDate || !reportEndDate) {
      notifyError('Start and end dates are required')
      return
    }
    if (reportStartDate > reportEndDate) {
      notifyError('End date cannot be before start date')
      return
    }
    if (!effectiveDepartmentId.value) {
      notifyError('Your account must be assigned to a department before generating reports')
      return
    }
    try {
      const created = await taskFlowApi.createReport({
        department: effectiveDepartmentId.value,
        name: title,
        report_type: reportTypeApiValues[reportType.value] || 'weekly_progress',
        parameters: JSON.stringify({
          start_date: reportStartDate,
          end_date: reportEndDate,
          priority: reportPriority.value === 'All Priorities' ? null : projectEnum(reportPriority.value),
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
      notifyError(canChooseDepartment.value ? 'Select a department for this event' : 'Your account must belong to a department before creating events')
      return
    }

    const allowedAttendeeIds = new Set(
      eventAttendeeOptions.value
        .map(teamMemberId)
        .filter(Boolean)
    )
    if (payload.attendees.some((attendeeId) => !allowedAttendeeIds.has(String(attendeeId)))) {
      notifyError('Every attendee must belong to the selected department')
      eventAttendeePickerOpen.value = true
      return
    }

    try {
      const saved = editingEventId.value
        ? await taskFlowApi.patchEvent(editingEventId.value, payload)
        : await taskFlowApi.createEvent(payload)
      const mappedEvent = taskFlowApi.mapEvent(saved)
      const savedEventId = String(mappedEvent[0] || editingEventId.value || '')
      if (savedEventId) eventColorById[savedEventId] = form.eventColor
      const existingIndex = state.value.events.findIndex(event => String(event[0] || '') === savedEventId)
      if (existingIndex >= 0) state.value.events.splice(existingIndex, 1, mappedEvent)
      else state.value.events.unshift(mappedEvent)
      notify(editingEventId.value ? 'Event updated' : 'Event created', 'success')
      editingEventId.value = ''
      await nextTick()
      const savedCalendarEvent = calendarEvents.value.find((event) => event.id === savedEventId)
      if (savedCalendarEvent) {
        if (!savedCalendarEvent.attendeeNames.length) savedCalendarEvent.attendeeNames = [...eventAttendeeLabels.value]
        openEventDetails(savedCalendarEvent)
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

const loadConversations = async () => {
  conversationsLoading.value = true
  try {
    const response = await taskFlowApi.listConversations({ ordering: '-updated_at', page_size: 100 })
    conversations.value = taskFlowApi.listItems(response) as ApiConversation[]
    if (!activeMessage.value && conversations.value.length) await openConversation(conversations.value[0])
  } catch (error) {
    notifyError(taskFlowApiErrorMessage(error, 'Could not load conversations'))
  } finally {
    conversationsLoading.value = false
  }
}

const startDirectConversation = async (member: Array<string | number>) => {
  const memberId = teamMemberId(member)
  if (!memberId || conversationCreating.value) return
  const memberEmail = teamMemberEmail(member).trim().toLowerCase()
  const memberName = teamMemberName(member).trim().toLowerCase()
  const existing = conversations.value.find(conversation =>
    !conversation.is_group && (
      conversation.participants?.some(id => String(id) === memberId) ||
      conversation.participant_details?.some(user => String(user.id) === memberId || Boolean(memberEmail && user.email?.toLowerCase() === memberEmail)) ||
      Boolean(memberName && conversation.title?.trim().toLowerCase() === memberName)
    )
  )
  if (existing) {
    newConversationOpen.value = false
    newConversationSearch.value = ''
    await openConversation(existing)
    return
  }

  const department = String(member[11] || currentDepartmentId.value || '')
  if (!department) return notifyError('A department is required to start a conversation')
  conversationCreating.value = true
  try {
    const created = await taskFlowApi.createConversation({
      department,
      title: teamMemberName(member),
      is_group: false,
      participants: [Number(memberId)]
    })
    conversations.value.unshift(created)
    newConversationOpen.value = false
    newConversationSearch.value = ''
    await openConversation(created)
    notify('Conversation started successfully', 'success')
  } catch (error) {
    notifyError(taskFlowApiErrorMessage(error, 'Could not start the conversation'))
  } finally {
    conversationCreating.value = false
  }
}

const deleteConversationItem = async (conversation: ApiConversation | null) => {
  if (!conversation || conversationDeleting.value) return
  if (import.meta.client && !window.confirm(`Delete the conversation with ${conversationTitle(conversation)}?`)) return
  conversationDeleting.value = true
  try {
    await taskFlowApi.deleteConversation(conversation.id)
    const deletedActiveConversation = activeMessage.value === conversation.id
    conversations.value = conversations.value.filter(item => item.id !== conversation.id)
    if (deletedActiveConversation) {
      closeChatSocket()
      activeMessage.value = ''
      conversationMessages.value = []
      const nextConversation = uniqueConversations.value[0]
      if (nextConversation) await openConversation(nextConversation)
    }
    notify('Conversation deleted successfully', 'success')
  } catch (error) {
    notifyError(taskFlowApiErrorMessage(error, 'Could not delete the conversation'))
  } finally {
    conversationDeleting.value = false
  }
}

const closeChatSocket = () => {
  if (typingStopTimer) clearTimeout(typingStopTimer)
  typingStopTimer = null
  typingUserId.value = ''
  chatSocket?.close()
  chatSocket = null
  chatSocketState.value = 'offline'
}

const chatIsNearBottom = () => {
  const element = chatBody.value
  if (!element) return true
  return element.scrollHeight - element.scrollTop - element.clientHeight < 140
}

const scrollChatToBottom = async (force = false) => {
  const shouldScroll = force || chatIsNearBottom()
  if (!shouldScroll) return
  await nextTick()
  requestAnimationFrame(() => {
    const element = chatBody.value
    if (element) element.scrollTop = element.scrollHeight
  })
}

const appendChatMessage = (message: ApiChatMessage) => {
  if (conversationMessages.value.some(item => item.id === message.id)) return
  const shouldFollowLatest = messageIsMine(message) || chatIsNearBottom()
  conversationMessages.value.push(message)
  const conversation = conversations.value.find(item => item.id === message.conversation)
  if (conversation) {
    conversation.last_message = message as unknown as Record<string, unknown>
    conversation.updated_at = message.created_at
  }
  void scrollChatToBottom(shouldFollowLatest)
}

const setChatPresence = (entry: Record<string, any>, fallbackUserId = '') => {
  const userId = String(entry.user_id ?? entry.id ?? fallbackUserId ?? '')
  if (!userId || userId === String(currentUserId.value)) return
  chatPresenceByUserId[userId] = {
    isOnline: Boolean(entry.is_online),
    lastSeen: entry.last_seen ?? entry.last_seen_at ?? null
  }
}

const applyPresenceSnapshot = (payload: Record<string, any>) => {
  const snapshot = payload.presences ?? payload.presence ?? payload.participants ?? payload.users ?? payload.data ?? payload.snapshot ?? []
  if (Array.isArray(snapshot)) {
    snapshot.forEach(entry => entry && typeof entry === 'object' && setChatPresence(entry))
    return
  }
  if (snapshot && typeof snapshot === 'object') {
    Object.entries(snapshot).forEach(([userId, entry]) => {
      if (entry && typeof entry === 'object') setChatPresence(entry as Record<string, any>, userId)
    })
  }
}

const connectChatSocket = (conversationId: string) => {
  closeChatSocket()
  if (!import.meta.client) return
  const token = taskFlowApi.getAccessToken()
  const apiBase = String(runtimeConfig.public.apiBase || '')
  if (!token || !apiBase) return

  try {
    const apiUrl = new URL(apiBase)
    const protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:'
    const socketUrl = `${protocol}//${apiUrl.host}/ws/chat/${encodeURIComponent(conversationId)}/?token=${encodeURIComponent(token)}`
    chatSocketState.value = 'connecting'
    chatSocket = new WebSocket(socketUrl)
    chatSocket.onopen = () => {
      chatSocketState.value = 'online'
      chatSocket?.send(JSON.stringify({ type: 'conversation.read' }))
    }
    chatSocket.onmessage = (event) => {
      try {
        const payload = JSON.parse(String(event.data)) as Record<string, any>
        if (payload.type === 'message.created' && payload.message) appendChatMessage(payload.message as ApiChatMessage)
        if (payload.type === 'typing.updated' && String(payload.user_id) !== String(currentUserId.value)) {
          typingUserId.value = payload.is_typing ? String(payload.user_id) : ''
        }
        if (payload.type === 'presence.snapshot') applyPresenceSnapshot(payload)
        if (payload.type === 'presence.changed') setChatPresence(payload)
        if (payload.type === 'conversation.read' && String(payload.user_id) !== String(currentUserId.value)) {
          chatReadAtByUserId[String(payload.user_id)] = String(payload.read_at || new Date().toISOString())
        }
        if (payload.type === 'error') notifyError(String(payload.detail || 'Real-time chat error'))
      } catch {
        notifyError('An invalid real-time chat response was received')
      }
    }
    chatSocket.onerror = () => { chatSocketState.value = 'offline' }
    chatSocket.onclose = event => {
      chatSocketState.value = 'offline'
      if (event.code === 4401) notifyError('Your chat session has expired. Please sign in again.')
      if (event.code === 4403) notifyError('You do not have access to this conversation.')
    }
  } catch {
    chatSocketState.value = 'offline'
  }
}

const openConversation = async (conversation: ApiConversation) => {
  activeMessage.value = conversation.id
  connectChatSocket(conversation.id)
  messagesLoading.value = true
  try {
    const [response] = await Promise.all([
      taskFlowApi.listMessages(conversation.id),
      conversation.unread_count ? taskFlowApi.markConversationRead(conversation.id) : Promise.resolve(null)
    ])
    conversationMessages.value = taskFlowApi.listItems(response) as ApiChatMessage[]
    const peer = conversationMessages.value.find(message => String(message.sender) !== String(currentUserId.value))?.sender_detail
    if (peer) conversationPeerById[conversation.id] = peer
    conversation.unread_count = 0
  } catch (error) {
    notifyError(taskFlowApiErrorMessage(error, 'Could not load messages'))
  } finally {
    messagesLoading.value = false
    await scrollChatToBottom(true)
  }
}

const sendMessage = async () => {
  const body = chatDraft.value.trim()
  const attachment = selectedMessageAttachment.value
  if ((!body && !attachment) || !activeMessage.value || messageSending.value) return
  messageSending.value = true
  try {
    if (attachment) {
      appendChatMessage(await taskFlowApi.createMessage({ conversation: activeMessage.value, body, attachment }))
      clearMessageAttachment()
    } else if (chatSocket?.readyState === WebSocket.OPEN) {
      chatSocket.send(JSON.stringify({ type: 'message.send', body, client_id: crypto.randomUUID() }))
    } else {
      appendChatMessage(await taskFlowApi.createMessage({ conversation: activeMessage.value, body }))
    }
    chatDraft.value = ''
  } catch (error) {
    notifyError(taskFlowApiErrorMessage(error, 'Message could not be sent'))
  } finally {
    messageSending.value = false
  }
}

const chooseMessageAttachment = () => messageAttachmentInput.value?.click()
const sendMessageAttachment = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (messageAttachmentPreview.value) URL.revokeObjectURL(messageAttachmentPreview.value)
  selectedMessageAttachment.value = file
  messageAttachmentPreview.value = /^image\/(png|jpe?g|gif|webp|avif)$/i.test(file.type) ? URL.createObjectURL(file) : ''
}

const clearMessageAttachment = () => {
  if (messageAttachmentPreview.value) URL.revokeObjectURL(messageAttachmentPreview.value)
  selectedMessageAttachment.value = null
  messageAttachmentPreview.value = ''
}

const generateReport = (name: string) => {
  notify(`${name} can be generated after backend endpoint is connected`)
}

const chooseMemberAvatar = () => memberAvatarInput.value?.click()

const handleMemberAvatar = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    input.value = ''
    notifyError('Please upload an image file')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    input.value = ''
    notifyError('Avatar must be smaller than 5 MB')
    return
  }
  if (memberAvatarPreview.value.startsWith('blob:')) URL.revokeObjectURL(memberAvatarPreview.value)
  memberAvatarFile.value = file
  memberAvatarPreview.value = URL.createObjectURL(file)
}

const removeMemberAvatar = () => {
  memberAvatarFile.value = null
  if (memberAvatarPreview.value.startsWith('blob:')) URL.revokeObjectURL(memberAvatarPreview.value)
  memberAvatarPreview.value = ''
  if (memberAvatarInput.value) memberAvatarInput.value.value = ''
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
  feedbackScreenshotFile.value = null
  if (feedbackScreenshotInput.value) feedbackScreenshotInput.value.value = ''
}

const attachFeedbackScreenshot = () => {
  feedbackScreenshotInput.value?.click()
}

const setFeedbackScreenshot = (file: File) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    clearFeedbackScreenshot()
    notifyError('Only JPEG, PNG, or WebP files are allowed.')
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    clearFeedbackScreenshot()
    notifyError('The screenshot must be smaller than 5 MB.')
    return
  }

  if (feedbackScreenshotPreview.value) URL.revokeObjectURL(feedbackScreenshotPreview.value)
  feedbackScreenshotFile.value = file
  feedbackScreenshotName.value = file.name
  feedbackScreenshotPreview.value = URL.createObjectURL(file)
}

const handleFeedbackScreenshot = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) setFeedbackScreenshot(file)
}

const handleFeedbackPaste = (event: ClipboardEvent) => {
  if (!supportWidgetOpen.value || feedbackSending.value) return
  const imageItem = Array.from(event.clipboardData?.items || []).find(item => item.kind === 'file' && item.type.startsWith('image/'))
  const pastedFile = imageItem?.getAsFile()
  if (!pastedFile) return

  event.preventDefault()
  const extension = pastedFile.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png'
  const namedFile = new File([pastedFile], `pasted-screenshot-${Date.now()}.${extension}`, { type: pastedFile.type })
  setFeedbackScreenshot(namedFile)
}

const sendFeedbackToTeam = async () => {
  const message = feedbackDraft.value.trim()
  if (!message || feedbackSending.value) return

  feedbackSending.value = true
  const loadingStartedAt = Date.now()
  try {
    await taskFlowApi.sendSupportMessage(`[${feedbackType.value}] ${message}`, feedbackScreenshotFile.value)
    feedbackDraft.value = ''
    clearFeedbackScreenshot()
    supportWidgetOpen.value = false
    notify('Your request has been sent to the team', 'success')
  } catch (error) {
    console.error('Support message send failed.', error)
    notifyError(taskFlowApiErrorMessage(error, 'Could not send your request.'))
  } finally {
    const remainingLoadingTime = Math.max(0, 1100 - (Date.now() - loadingStartedAt))
    if (remainingLoadingTime) await new Promise(resolve => window.setTimeout(resolve, remainingLoadingTime))
    feedbackSending.value = false
  }
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

  if (type === 'task' && action === 'delete') {
    const task = state.value.tasks.find((item) => String(item[0]) === label)
    if (!task) return notifyError('Task not found')
    if (!canDeleteTask(task)) return notifyError('You can delete only tasks you created')
    return await deleteTask(task)
  }

  if (type === 'task' && !canManageDepartment.value) {
    notifyError('Members can update only task status and progress')
    return
  }

  if (type === 'task') {
    const task = state.value.tasks.find((item) => String(item[0]) === label)
    if (!task) return notifyError('Task not found')
    if (action === 'edit') return await openTask(task, 'edit')
    if (action === 'duplicate') return await duplicateTask(task)
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
  if (value === 'Backlog' || value === 'Postponed') return 'bg-slate-200 text-slate-600'
  if (value === 'On Hold') return 'tf-status-on-hold'
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
    <LoadingPulse v-if="tikoPageLoading" overlay title="Loading data" subtitle="Tiko is preparing this page for you…" image="/images/tiko-loading-ui.png" />
    <LoadingPulse v-else-if="feedbackSending" overlay title="Sending your message" subtitle="Tiko is delivering your feedback to the team…" image="/images/tiko-message-sent.png" />
    <section v-else class="tf-window">
      <div v-if="mobileSidebarOpen" class="tf-mobile-overlay" @click="mobileSidebarOpen = false" />
      <aside :class="['tf-sidebar tf-sidebar-modern relative flex shrink-0 flex-col border-r border-task-line bg-white transition-[width,padding] duration-300 ease-out', sidebarCollapsed ? 'w-[82px] px-3 py-4' : 'w-[250px] px-4 py-4', mobileSidebarOpen ? 'is-open' : '']">
        <button type="button" class="tf-icon-button absolute right-3 top-3 md:hidden" aria-label="Close menu" @click="mobileSidebarOpen = false">
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
        <div :class="['tf-sidebar-brand flex h-[64px] items-center', sidebarCollapsed ? 'justify-center px-1' : 'gap-1 px-0']">
          <button class="flex min-w-0 flex-1 items-center justify-start" type="button" :title="sidebarCollapsed ? 'Open menu' : 'TaskFlow'" :aria-label="sidebarCollapsed ? 'Open menu' : 'Go to dashboard'" @click="sidebarCollapsed ? (sidebarCollapsed = false) : setPage('dashboard')">
            <img v-if="sidebarCollapsed" src="/taskflow-logo-mark.webp" width="96" height="96" alt="TaskFlow" class="h-11 w-11 rounded-[12px] object-contain" />
            <span v-else class="tf-sidebar-brand-logo relative block h-[54px] w-[145px]">
              <img src="/taskflow-logo-compact.webp" width="480" height="146" alt="TaskFlow" class="tf-sidebar-brand-logo__light absolute inset-0 h-full w-full object-contain object-left" />
              <img src="/taskflow-logo-compact-dark.webp" width="480" height="146" alt="" aria-hidden="true" class="tf-sidebar-brand-logo__dark absolute inset-0 h-full w-full object-contain object-left" />
            </span>
          </button>
          <button v-if="!sidebarCollapsed" type="button" class="group hidden h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-slate-50 text-slate-500 transition duration-200 hover:-translate-x-0.5 hover:bg-task-blueSoft hover:text-task-blue md:grid" aria-label="Collapse menu" title="Close sidebar" @click="sidebarCollapsed = true">
            <svg viewBox="0 0 24 24" class="h-5 w-5 transition group-hover:scale-110" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m13 7-5 5 5 5M19 7l-5 5 5 5" /></svg>
          </button>
        </div>

        <nav :key="sidebarNavigationKey" :class="['tf-sidebar-nav flex min-h-0 flex-1 flex-col overflow-y-auto pt-2', sidebarCollapsed ? 'px-1' : 'px-2']">
          <section v-for="(group, groupIndex) in sidebarGroups" :key="group.label" :class="['tf-sidebar-group shrink-0', groupIndex ? 'mt-3 border-t border-task-line pt-3' : '']">
            <p v-if="!sidebarCollapsed" class="tf-sidebar-group-label">{{ group.label }}</p>
            <div class="mt-2 space-y-1.5">
              <button v-for="item in group.items" :key="item.key" type="button" :disabled="isComingSoonPage(item.key)" :aria-current="activePage === item.key ? 'page' : undefined" :class="['tf-nav-item relative flex h-11 w-full items-center rounded-[12px] text-left text-sm transition', sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3', isComingSoonPage(item.key) ? 'cursor-not-allowed text-slate-400' : activePage === item.key ? 'is-active font-semibold text-task-blue' : 'text-task-muted']" :title="isComingSoonPage(item.key) ? `${item.label} — Coming soon` : sidebarCollapsed ? item.label : undefined" @click="navigateSidebar($event, item.key)">
                <span class="grid h-7 w-7 shrink-0 place-items-center"><svg viewBox="0 0 24 24" class="h-[19px] w-[19px]" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path :d="iconPath(item.icon)" /></svg></span>
                <span v-if="!sidebarCollapsed" class="min-w-0 flex-1 truncate">{{ item.label }}</span>
                <span v-if="isComingSoonPage(item.key) && !sidebarCollapsed" class="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">Soon</span>
                <span v-if="item.badge && !sidebarCollapsed" class="grid h-5 min-w-5 place-items-center rounded-full bg-task-danger px-1 text-[10px] font-bold text-white">{{ item.badge }}</span>
              </button>
            </div>
          </section>
          <div :class="['tf-sidebar-user sticky bottom-0 z-10 mt-3 shrink-0 bg-white', sidebarCollapsed ? 'flex-col justify-center p-1.5' : '']">
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

      <div :class="['tf-content relative min-w-0 flex-1 p-4', activePage === 'calendar' ? 'tf-content-calendar' : '']">
        <div v-if="activePage === 'dashboard'" class="relative z-40 mb-4">
          <button type="button" class="tf-dashboard-mobile-menu tf-icon-button absolute left-3 top-3 z-20 md:hidden" aria-label="Open menu" @click="mobileSidebarOpen = true">
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          <GreetingCard :config="dashboardGreetingConfig" :name="savedProfile.firstName || profileName || 'there'">
            <template #actions>
              <NotificationCenter :active-page="activePage" :dark="isDarkTheme" @navigate="navigateFromNotification" @view-all="setPage('notifications')" />
              <button type="button" class="tf-theme-button" :aria-label="isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme'" :aria-pressed="isDarkTheme" :title="isDarkTheme ? 'Light theme' : 'Dark theme'" @click="toggleTheme">
                <svg viewBox="0 0 24 24" class="h-[17px] w-[17px]" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath(isDarkTheme ? 'sun' : 'moon')" /></svg>
              </button>
            </template>
          </GreetingCard>
        </div>
        <header v-else class="tf-app-header tf-panel relative z-30 mb-4 flex h-[76px] items-center justify-between gap-4 overflow-visible px-5 shadow-none">
          <div v-if="activePage === 'dashboard'" class="tf-dashboard-hero-art" aria-hidden="true" />
          <div v-if="activePage !== 'dashboard'" class="pointer-events-none absolute inset-y-0 right-0 w-72 bg-gradient-to-l from-task-blueSoft/70 to-transparent" />
          <svg v-if="activePage !== 'dashboard'" viewBox="0 0 180 80" class="pointer-events-none absolute -right-3 top-0 h-full w-52 text-task-blue opacity-[0.08]" fill="none"><path d="M12 79c28-42 48-5 74-40s57 20 94-34v74H12Z" fill="currentColor" /><circle cx="135" cy="18" r="30" stroke="currentColor" stroke-width="2" /></svg>
          <button type="button" class="tf-icon-button md:hidden" aria-label="Open menu" @click="mobileSidebarOpen = true">
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          <div class="tf-app-title relative z-10 flex min-w-0 flex-1 items-center gap-3.5">
            <span v-if="activePage !== 'dashboard'" :class="['grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-gradient-to-br shadow-sm ring-1 ring-white/70', pageAccentClass]">
              <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path :d="iconPath(pageIconName)" /></svg>
            </span>
            <div v-if="activePage === 'dashboard'" class="tf-dashboard-hero-content min-w-0">
              <h1 class="tf-dashboard-greeting font-bold">{{ dashboardGreeting }} <span aria-hidden="true">{{ dashboardGreetingIcon }}</span></h1>
              <p class="mt-1.5 text-sm text-task-muted">{{ pageCopy.dashboard.subtitle }}</p>
              <div class="tf-dashboard-meta">
                <div class="tf-dashboard-meta-item"><span class="tf-dashboard-meta-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('calendar')" /></svg></span><span><b>{{ tashkentWeekday }}</b><small>{{ tashkentDate }}</small></span></div>
                <div class="tf-dashboard-meta-separator" />
                <div class="tf-dashboard-meta-item"><span class="tf-dashboard-meta-icon tf-dashboard-meta-icon--time"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg></span><span><b>{{ tashkentTime }}</b><small>Tashkent Time</small></span></div>
                <div class="tf-dashboard-meta-separator tf-dashboard-quote-separator" />
                <blockquote class="tf-dashboard-quote"><p>“{{ dashboardQuote.text }}”</p><cite>— {{ dashboardQuote.author }}</cite></blockquote>
              </div>
            </div>
            <div v-else class="min-w-0"><h1 class="truncate text-lg font-bold">{{ pageCopy[activePage].title }}</h1><p class="mt-1 truncate text-xs text-task-muted">{{ pageCopy[activePage].subtitle }}</p></div>
          </div>
          <div class="relative z-10 flex items-center gap-3">
            <label v-if="false" class="relative hidden sm:block">
              <svg viewBox="0 0 24 24" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-task-muted" fill="none" stroke="currentColor" stroke-width="1.7"><path :d="iconPath('search')" /></svg>
              <input v-model="taskSearchInput" class="tf-input w-[230px] pl-9 pr-10" placeholder="Search tasks..." @focus="focusTaskSearch" @input="focusTaskSearch" />
              <button v-if="taskSearchInput && !searchLoading.task" type="button" class="tf-search-clear" aria-label="Clear search" @click="clearSearch('task')">×</button>
              <span v-if="searchLoading.task" class="tf-search-spinner" />
            </label>
            <NotificationCenter :active-page="activePage" :dark="isDarkTheme" @navigate="navigateFromNotification" @view-all="setPage('notifications')" />
            <button type="button" class="tf-theme-button" :aria-label="isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme'" :aria-pressed="isDarkTheme" :title="isDarkTheme ? 'Light theme' : 'Dark theme'" @click="toggleTheme">
              <svg viewBox="0 0 24 24" class="h-[17px] w-[17px]" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath(isDarkTheme ? 'sun' : 'moon')" /></svg>
            </button>
          </div>
        </header>

        <ClientOnly>
          <div :class="['tf-persistent-focus-radio', activePage === 'analytics' ? 'is-analytics' : '']">
            <FocusRadio :dark="isDarkTheme" :muslima-music="isMuslimaRadioUser" />
          </div>
        </ClientOnly>

        <section v-if="activePage === 'dashboard'" class="space-y-4">
          <div class="tf-dashboard-stats grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
            <article v-for="index in state.loaded ? 0 : 8" :key="`summary-skeleton-${index}`" class="tf-panel h-[118px] animate-pulse border p-4 shadow-none"><div class="h-9 w-9 rounded-[11px] bg-slate-200" /><div class="mt-3 h-6 w-12 rounded bg-slate-200" /><div class="mt-3 h-1.5 rounded-full bg-slate-200" /></article>
            <article v-for="(item, index) in dashboardStats" :key="String(item[1])" :class="['tf-panel tf-summary-card border p-4 shadow-none', `tf-summary-card--${index}`]">
              <div class="flex items-center gap-2.5"><span class="tf-summary-icon grid h-9 w-9 place-items-center rounded-[11px]"><svg viewBox="0 0 24 24" class="h-[17px] w-[17px]" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path :d="index === 7 ? 'M4 7h16v13H4V7Zm-1-4h18v4H3V3Zm6 9h6' : index === 1 ? 'm6 12 4 4 8-9' : index === 2 ? 'M12 7v5l3 2m7-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' : index === 4 ? 'M4 8h16l-1 12H5L4 8Zm2-4h12l2 4H4l2-4Zm4 8h4' : index === 5 ? 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-2-12v6m4-6v6' : index === 6 ? 'M12 9v4m0 4h.01M4.5 19h15L12 4 4.5 19Z' : index === 3 ? 'M6 4h12v16H6V4Zm4 5h4m-4 3h4' : 'M5 4h14v16H5V4Zm4 4h6m-6 4h6'" /></svg></span><p class="text-[11px] font-semibold text-task-muted">{{ item[1] }}</p></div>
              <p class="mt-3 text-2xl font-extrabold text-task-ink">{{ item[0] }}</p>
              <div class="mt-3 flex items-center gap-2 text-[11px] font-bold"><span class="tf-summary-percent">{{ Number(item[2] || 0).toFixed(0) }}%</span><div class="tf-summary-track h-1.5 flex-1 overflow-hidden rounded-full"><div class="tf-summary-progress h-full rounded-full" :style="{ width: `${Math.min(100, Number(item[2] || 0))}%` }" /></div></div>
            </article>
          </div>
          <div class="grid items-stretch gap-4 xl:grid-cols-3">
            <section class="tf-panel tf-dashboard-list tf-attention-list overflow-hidden p-0"><header class="tf-dashboard-list-header"><h2 class="flex items-center gap-2 font-bold"><span class="text-task-danger">⚠</span>Needs Attention</h2><button type="button" class="text-xs font-bold text-task-blue" @click="showAttentionTasks('overdue')">View all →</button></header><div class="tf-dashboard-list-body divide-y divide-task-line"><button type="button" class="tf-dashboard-list-row tf-attention-row tf-attention-row--danger flex w-full items-center text-left" @click="showAttentionTasks('overdue')"><span class="grid h-9 w-9 place-items-center rounded-[10px] bg-task-dangerSoft text-task-danger">!</span><span class="min-w-0 flex-1 font-semibold">Overdue Tasks</span><b class="text-task-danger">{{ overdueTaskRows.length }}</b></button><button type="button" class="tf-dashboard-list-row tf-attention-row tf-attention-row--warning flex w-full items-center text-left" @click="showAttentionTasks('today')"><span class="grid h-9 w-9 place-items-center rounded-[10px] bg-task-warningSoft text-task-warning">▣</span><span class="min-w-0 flex-1 font-semibold">Deadlines Today</span><b class="text-task-warning">{{ dueTodayTaskRows.length }}</b></button><button type="button" class="tf-dashboard-list-row tf-attention-row tf-attention-row--warning flex w-full items-center text-left" @click="showAttentionTasks('on_hold')"><span class="grid h-9 w-9 place-items-center rounded-[10px] bg-task-warningSoft text-task-warning">Ⅱ</span><span class="min-w-0 flex-1 font-semibold">On Hold Tasks</span><b class="text-task-warning">{{ onHoldTaskRows.length }}</b></button><button type="button" class="tf-dashboard-list-row tf-attention-row tf-attention-row--blue flex w-full items-center text-left" @click="showAttentionTasks('unassigned')"><span class="grid h-9 w-9 place-items-center rounded-[10px] bg-task-blueSoft text-task-blue">?</span><span class="min-w-0 flex-1 font-semibold">Tasks without Assignees</span><b class="text-task-blue">{{ unassignedTaskRows.length }}</b></button></div></section>
            <section class="tf-panel tf-dashboard-list overflow-hidden p-0"><header class="tf-dashboard-list-header"><h2 class="flex items-center gap-2 font-bold"><span class="tf-section-icon">▣</span>Today’s Schedule</h2><div class="flex items-center gap-3"><span class="tf-pill bg-task-blueSoft text-task-blue">{{ dashboardTodayEvents.length }}</span><button type="button" class="text-xs font-bold text-task-blue" @click="setPage('calendar')">View all</button></div></header><div class="tf-dashboard-list-body divide-y divide-task-line"><button v-for="event in dashboardTodayEvents" :key="String(event.id)" type="button" class="tf-dashboard-list-row w-full text-left transition hover:bg-task-blueSoft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-task-blue" @click="openDashboardEvent(event)"><time class="tf-event-date grid h-11 min-w-14 place-items-center rounded-[9px] bg-task-blueSoft px-2 text-xs font-bold text-task-blue">{{ dashboardDateTime(event.starts_at, 'time') }}</time><div class="min-w-0 flex-1"><p class="truncate text-sm font-bold">{{ event.title }}</p><p class="mt-1 truncate text-xs text-task-muted">{{ event.department?.name || 'No department' }} · {{ event.location || 'Online' }}</p></div><span class="text-xs text-task-muted">›</span></button><div v-if="!dashboardTodayEvents.length" class="tf-empty-events"><EmptyCalendarArt /><p>No events scheduled for today.</p><small>Enjoy your free time! 🎉</small></div></div></section>
            <section class="tf-panel tf-dashboard-list overflow-hidden p-0"><header class="tf-dashboard-list-header"><h2 class="font-bold">Upcoming Deadlines</h2><div class="flex items-center gap-3"><span class="tf-pill bg-task-blueSoft text-task-blue">{{ dashboardDeadlines.length }}</span><button type="button" class="text-xs font-bold text-task-blue" @click="setPage('tasks')">View all</button></div></header><div class="tf-dashboard-list-body divide-y divide-task-line"><button v-for="task in dashboardDeadlines" :key="String(task.id)" type="button" class="tf-dashboard-list-row w-full text-left transition hover:bg-task-blueSoft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-task-blue" @click="openDashboardTask(task)"><span :class="['h-2.5 w-2.5 shrink-0 rounded-full', task.priority === 'high' ? 'bg-task-danger' : task.priority === 'medium' ? 'bg-task-warning' : 'bg-task-success']" /><div class="min-w-0 flex-1"><p class="truncate text-sm font-bold">{{ task.title }}</p><p class="mt-1 truncate text-xs text-task-muted">{{ task.department?.name || 'No department' }}</p></div><div class="text-right"><p class="text-xs font-bold">{{ dashboardDateTime(task.due_date) }}</p><p class="mt-1 text-[10px] font-semibold text-task-warning">{{ task.days_remaining }} days left</p></div></button><div v-if="!dashboardDeadlines.length" class="tf-empty-events"><p>No upcoming deadlines.</p><small>You are all caught up.</small></div></div></section>
          </div>
          <div class="grid items-stretch gap-4 xl:h-[360px] xl:grid-cols-[0.8fr_1.2fr]">
            <section class="tf-panel flex h-full min-h-[330px] flex-col overflow-hidden p-0 xl:min-h-0">
              <header class="border-b border-task-line px-5 py-4">
                <div><h2 class="flex items-center gap-2 font-bold"><span class="grid h-8 w-8 place-items-center rounded-[10px] bg-task-blueSoft text-task-blue"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M4 20V10h4v10m2 0V4h4v16m2 0v-7h4v7" /></svg></span>Tasks by Department</h2><p class="mt-1 text-xs text-task-muted">Role-filtered task distribution</p></div>
              </header>
              <div v-if="dashboardDepartments.length" class="grid min-h-0 flex-1 gap-3 p-4 sm:grid-cols-[122px_minmax(0,1fr)]">
                <div class="flex min-h-[205px] flex-col items-center justify-center rounded-[14px] border border-task-line px-3 py-4">
                  <div class="tf-department-donut" :style="{ background: dashboardDepartmentGradient }">
                    <span><b>{{ dashboardDepartmentTotal }}</b><small>Total active<br>task</small></span>
                  </div>
                  <p class="mt-4 text-center text-[11px] font-semibold text-task-muted">{{ dashboardDepartments.length }} departments</p>
                </div>
                <div class="min-h-0 space-y-3 overflow-y-auto pr-1">
                  <div v-for="(department, index) in dashboardDepartments" :key="String(department.department_id)" class="rounded-[14px] border border-task-line px-4 py-4">
                    <div class="flex min-w-0 items-center justify-between gap-3">
                      <span class="flex min-w-0 items-center gap-2"><i class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ backgroundColor: dashboardDepartmentColor(index) }" /><b class="truncate text-xs text-task-ink">{{ department.department_name }}</b></span>
                      <span class="shrink-0 text-xs"><b class="text-task-ink">{{ department.task_count }}</b><span class="text-task-muted"> ({{ dashboardDepartmentPercentage(department).toFixed(1) }}%)</span></span>
                    </div>
                    <span class="mt-3 block h-1.5 overflow-hidden rounded-full bg-slate-200"><i class="block h-full rounded-full transition-all duration-500" :style="{ width: `${Math.min(100, dashboardDepartmentPercentage(department))}%`, backgroundColor: dashboardDepartmentColor(index) }" /></span>
                  </div>
                </div>
              </div>
              <div v-else class="grid flex-1 place-items-center p-5"><p class="text-center text-sm text-task-muted">No department statistics available.</p></div>
            </section>
            <section class="tf-panel flex h-full min-h-[330px] flex-col overflow-hidden p-0 xl:min-h-0"><header class="shrink-0 flex items-center justify-between border-b border-task-line px-5 py-4"><div><h2 class="font-bold">Recent Tasks</h2><p class="mt-1 text-xs text-task-muted">Latest activity</p></div><button type="button" class="text-xs font-bold text-task-blue" @click="setPage('tasks')">View all</button></header><div class="min-h-0 flex-1 overflow-auto"><table class="w-full min-w-[760px] text-left text-sm"><thead class="sticky top-0 z-10 bg-slate-50 text-xs text-task-muted"><tr><th class="px-5 py-3">Task</th><th class="px-4 py-3">Department</th><th class="px-4 py-3">Created by</th><th class="px-4 py-3">Created</th><th class="px-5 py-3">Status</th></tr></thead><tbody class="divide-y divide-task-line"><tr v-for="task in dashboardRecentTasks" :key="String(task.id)"><td class="px-5 py-3.5 font-semibold">{{ task.title }}</td><td class="px-4 py-3.5 text-task-muted">{{ task.department?.name || '—' }}</td><td class="px-4 py-3.5 font-medium text-task-ink">{{ dashboardTaskCreatorName(task) }}</td><td class="px-4 py-3.5 text-task-muted">{{ dashboardDateTime(task.created_at) }}</td><td class="px-5 py-3.5"><span :class="['tf-pill', badgeClass(dashboardStatus(task.status))]">{{ dashboardStatus(task.status) }}</span></td></tr></tbody></table><p v-if="!dashboardRecentTasks.length" class="py-10 text-center text-sm text-task-muted">No recent tasks.</p></div></section>
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

        <section v-else-if="activePage === 'tasks'" class="space-y-4">
          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
            <div v-for="(card, index) in taskOverviewCards" :key="card.label" class="tf-panel flex min-h-[92px] cursor-default items-center justify-between border p-4 text-left shadow-none">
              <span><span class="flex items-center gap-2 text-[11px] font-semibold text-task-muted"><i :class="['h-2 w-2 rounded-full', index === 0 || index === 2 ? 'bg-task-blue' : index === 1 ? 'bg-slate-400' : index === 3 ? 'bg-task-warning' : index === 4 ? 'bg-task-success' : 'bg-task-danger']" />{{ card.label }}</span><b :class="['mt-2 block text-2xl text-task-ink', index === 5 ? 'text-task-danger' : '']">{{ card.value }}</b></span>
              <span :class="['grid h-9 w-9 place-items-center rounded-[11px]', index === 0 || index === 2 ? 'bg-task-blueSoft text-task-blue' : index === 1 ? 'bg-slate-100 text-slate-500' : index === 3 ? 'bg-task-warningSoft text-task-warning' : index === 4 ? 'bg-task-successSoft text-task-success' : 'bg-task-dangerSoft text-task-danger']"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.9"><path :d="index === 0 ? 'M6 4h12v16H6V4Zm3 4h6m-6 4h6' : index === 4 ? 'm6 12 4 4 8-9' : index === 5 ? 'M12 9v4m0 4h.01M4.5 19h15L12 4 4.5 19Z' : index === 3 ? 'M9 9h6v6H9z' : 'M12 7v5l3 2m7-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'" /></svg></span>
            </div>
          </div>

          <div class="tf-panel flex flex-col gap-3 border p-2 shadow-none lg:flex-row lg:items-center lg:justify-between">
            <div class="flex min-w-0 overflow-x-auto" role="tablist" aria-label="Task views">
              <button type="button" :class="['inline-flex h-12 shrink-0 items-center gap-2 border-b-2 px-5 text-sm font-semibold transition', taskBoardSection === 'backlog' && taskScope !== 'archived' ? 'border-task-blue text-task-blue' : 'border-transparent text-task-muted hover:text-task-blue']" @click="taskBoardSection = 'backlog'; taskScope === 'archived' && loadTaskScope('all')"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5h16v14H4V5Zm4 4h8m-8 4h8" /></svg>Postponed <span class="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px]">{{ backlogTasks.length }}</span></button>
              <button v-if="canManageDepartment" type="button" :class="['inline-flex h-12 shrink-0 items-center gap-2 border-b-2 px-5 text-sm font-semibold transition', taskScope === 'archived' ? 'border-task-blue text-task-blue' : 'border-transparent text-task-muted hover:text-task-blue']" @click="taskBoardSection = 'board'; loadTaskScope('archived')"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16v13H4V7Zm-1-4h18v4H3V3Zm6 9h6" /></svg>Archive <span class="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px]">{{ archivedTaskCount }}</span></button>
            </div>
            <div class="flex shrink-0 items-center gap-1 overflow-x-auto">
              <button type="button" :class="['inline-flex h-11 shrink-0 items-center gap-2 rounded-[10px] px-4 text-sm font-semibold transition', taskBoardSection === 'board' && taskViewMode === 'list' && taskScope !== 'archived' ? 'bg-task-blueSoft text-task-blue' : 'text-task-muted hover:text-task-blue']" @click="taskBoardSection = 'board'; taskViewMode = 'list'; taskScope === 'archived' && loadTaskScope('all')"><svg viewBox="0 0 20 20" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 5h11M6 10h11M6 15h11M3 5h.01M3 10h.01M3 15h.01" /></svg>List</button>
              <button type="button" :class="['inline-flex h-11 shrink-0 items-center gap-2 rounded-[10px] px-4 text-sm font-semibold transition', taskBoardSection === 'board' && taskViewMode === 'kanban' && taskScope !== 'archived' ? 'bg-task-blueSoft text-task-blue' : 'text-task-muted hover:text-task-blue']" @click="taskBoardSection = 'board'; taskViewMode = 'kanban'; taskScope === 'archived' && loadTaskScope('all')"><svg viewBox="0 0 20 20" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="2.5" y="3" width="4" height="14" rx="1.2" /><rect x="8" y="3" width="4" height="9" rx="1.2" /><rect x="13.5" y="3" width="4" height="12" rx="1.2" /></svg>Kanban</button>
              <button v-if="canAddTask && taskScope !== 'archived'" class="tf-primary ml-3 h-11 shrink-0 rounded-[11px] px-5" type="button" @click="openModal('task')"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" /></svg>New Task</button>
            </div>
          </div>

          <div data-task-board class="tf-panel relative scroll-mt-4 p-4 sm:p-5">
            <div class="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div class="flex flex-wrap items-center gap-2"><h2 class="text-lg font-bold">{{ taskScope === 'archived' ? 'Archived Tasks' : taskBoardSection === 'backlog' ? 'Postponed Tasks' : taskViewMode === 'kanban' ? 'Kanban Board' : 'All Active Tasks' }}</h2><span class="rounded-full bg-task-blueSoft px-2.5 py-1 text-[10px] font-extrabold text-task-blue">{{ filteredTasks.length }} tasks</span><span v-if="selectedTaskKeys.length && taskViewMode === 'list'" class="rounded-full bg-task-successSoft px-2.5 py-1 text-[10px] font-extrabold text-task-success">{{ selectedTaskKeys.length }} selected</span><button v-if="taskAttentionFilter !== 'all'" type="button" class="rounded-full bg-task-dangerSoft px-3 py-1 text-[10px] font-bold uppercase text-task-danger" @click="clearTaskAttentionFilter">{{ taskAttentionFilter.replace('_', ' ') }} ×</button></div>
              <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <div class="inline-flex h-11 items-center rounded-[11px] border border-task-line bg-slate-50 p-1"><button type="button" :class="['h-9 rounded-[8px] px-3 text-xs font-bold transition', taskScope === 'all' ? 'bg-task-blue text-white shadow-sm' : 'text-task-muted hover:text-task-blue']" @click="loadTaskScope('all')">All Tasks</button><button type="button" :class="['h-9 rounded-[8px] border px-3 text-xs font-bold transition', taskScope === 'mine' ? 'border-task-danger bg-task-danger text-white shadow-sm' : 'border-task-danger/20 bg-task-dangerSoft text-task-danger hover:border-task-danger hover:bg-task-danger hover:text-white']" @click="loadTaskScope('mine')">My Tasks</button></div>
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
            <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 class="font-bold text-task-ink">Postponed</h3><p class="mt-1 text-xs text-task-muted">Ideas and tasks planned for later. Move a task to To Do when it is ready.</p></div><button v-if="canAddTask" type="button" class="tf-primary h-10 rounded-[11px]" @click="openModal('task')"><span class="text-lg leading-none">+</span>New Task</button></div>
            <div v-if="backlogTasks.length" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <article v-for="task in backlogTasks" :key="String(task[6] || `${task[0]}-${task[4]}`)" class="tf-kanban-card cursor-pointer" @click="openTaskFromCard(task)">
                <div class="flex items-start justify-between gap-3"><div class="min-w-0"><span class="inline-flex rounded-full bg-slate-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">For later</span><h4 class="mt-2 line-clamp-2 text-sm font-bold text-task-ink">{{ task[0] }}</h4></div><span :class="['tf-pill shrink-0', badgeClass(String(task[2]))]">{{ task[2] }}</span></div>
                <div class="mt-4 flex items-center justify-between border-t border-task-line pt-3 text-xs text-task-muted"><span>{{ task[4] }}</span><button type="button" class="font-bold text-task-blue transition hover:text-task-blueDark" :disabled="updatingTaskId === String(task[6]) || !task[6]" @click.stop="updateTaskStatus(task, 'not_started')">Move to To Do →</button></div>
              </article>
            </div>
            <div v-else class="rounded-[14px] border border-dashed border-task-line px-5 py-14 text-center"><p class="font-semibold text-task-ink">Postponed is empty</p><p class="mt-1 text-sm text-task-muted">Tasks planned for later will appear here.</p></div>
          </div>
          <div v-else-if="taskViewMode === 'list'" class="overflow-x-auto">
          <table class="tf-task-list-table w-full min-w-[940px] text-left text-sm">
            <thead><tr><th class="w-12 p-3"><input type="checkbox" class="tf-task-checkbox" :checked="currentTaskPageAllSelected" :indeterminate="currentTaskPageSomeSelected" aria-label="Select all tasks on this page" @click.stop @change="toggleCurrentTaskPageSelection" /></th><th class="p-3">Task</th><th class="p-3">Project</th><th class="p-3">Assignee</th><th class="p-3">Priority</th><th class="p-3">Due Date</th><th class="p-3">Status</th><th class="p-3 text-right">Actions</th></tr></thead>
            <tbody class="divide-y divide-task-line">
              <tr v-for="(task, taskIndex) in taskListPageTasks" :key="String(task[6] || `${task[0]}-${task[4]}`)" :class="['cursor-pointer', isTaskSelected(task) ? 'is-selected' : '']" @click="openTaskFromCard(task)">
                <td class="p-3"><input type="checkbox" class="tf-task-checkbox" :checked="isTaskSelected(task)" :aria-label="`Select ${task[0]}`" @click.stop @change="toggleTaskSelection(task)" /></td>
                <td class="p-3"><p class="font-bold text-task-ink"><template v-if="taskSearch.trim()">{{ highlightedSearchText(String(task[0]), taskSearch).before }}<mark v-if="highlightedSearchText(String(task[0]), taskSearch).match" class="tf-search-highlight">{{ highlightedSearchText(String(task[0]), taskSearch).match }}</mark>{{ highlightedSearchText(String(task[0]), taskSearch).after }}</template><template v-else>{{ task[0] }}</template></p><p class="mt-1 max-w-64 truncate text-[11px] text-task-muted">{{ task[7] || 'Team task' }}</p></td>
                <td class="p-3"><span class="inline-flex rounded-full bg-task-lavender px-2.5 py-1 text-[11px] font-semibold text-[#8057D5]">{{ task[7] || 'General' }}</span></td>
                <td class="p-3"><div class="flex items-center gap-2"><span class="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-task-blueSoft text-[9px] font-bold text-task-blue"><img v-if="taskAssigneeDetailsOf(task)[0]?.avatar" :src="taskAssigneeDetailsOf(task)[0]?.avatar" :alt="String(task[1])" class="h-full w-full object-cover" /><span v-else>{{ initials(String(task[1])) }}</span></span><span class="max-w-36 truncate text-task-ink">{{ task[1] }}</span></div></td>
                <td class="p-3"><span :class="['tf-pill', badgeClass(String(task[2]))]">{{ task[2] }}</span></td>
                <td class="p-3"><p class="font-medium text-task-ink">{{ task[4] }}</p><p class="mt-1 text-[10px] text-task-muted">Due date</p></td>
                <td class="p-3"><span :class="['tf-pill', badgeClass(String(task[3]))]">{{ task[3] }}</span></td>
                <td class="relative p-3 text-right"><div class="relative inline-flex"><button type="button" class="tf-icon-button border-0 bg-transparent shadow-none" @click.stop="toggleActionMenu(`task-${task[0]}`)"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path :d="iconPath('dots')" /></svg></button><div v-if="actionMenu === `task-${task[0]}`" :class="['tf-action-menu', taskIndex >= taskListPageTasks.length - 2 ? 'tf-action-menu--up' : '']"><button type="button" class="tf-action-item" @click="actionMenu = null; openTaskFromCard(task)">View</button><button type="button" class="tf-action-item" @click="runAction('edit', 'task', String(task[0]))">Edit</button><button type="button" class="tf-action-item" @click="runAction('duplicate', 'task', String(task[0]))">Duplicate</button><button type="button" class="tf-action-item tf-action-danger" @click="runAction('delete', 'task', String(task[0]))">Delete</button></div></div></td>
              </tr>
            </tbody>
          </table>
          <div v-if="filteredTasks.length > pageSize" class="tf-task-pagination mt-4 flex flex-col items-center justify-between gap-3 border-t border-task-line pt-4 text-xs text-task-muted sm:flex-row">
            <span>Showing {{ (taskPage - 1) * pageSize + 1 }}–{{ Math.min(taskPage * pageSize, filteredTasks.length) }} of {{ filteredTasks.length }} tasks</span>
            <div class="flex items-center gap-2">
              <button class="tf-icon-button disabled:cursor-not-allowed disabled:opacity-40" type="button" :disabled="taskPage === 1" aria-label="Previous task page" @click="setTaskPage(taskPage - 1)">‹</button>
              <button v-for="page in taskPageCount" :key="page" :class="[taskPage === page ? 'tf-primary' : 'tf-icon-button', 'h-9 w-9 p-0']" type="button" :aria-current="taskPage === page ? 'page' : undefined" @click="setTaskPage(page)">{{ page }}</button>
              <button class="tf-icon-button disabled:cursor-not-allowed disabled:opacity-40" type="button" :disabled="taskPage === taskPageCount" aria-label="Next task page" @click="setTaskPage(taskPage + 1)">›</button>
            </div>
          </div>
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
                    <div class="min-w-0"><h3 class="text-[15px] font-bold tracking-[-0.01em] text-task-ink">{{ column.label }}</h3><p class="mt-0.5 truncate text-[10px] font-medium text-task-muted">{{ column.description }}</p></div>
                </div>
                <span class="tf-kanban-count">{{ column.tasks.length }}</span>
              </header>
              <div class="tf-kanban-column-scroll space-y-2.5">
                <article
                  v-for="task in column.tasks"
                  :key="String(task[6] || `${task[0]}-${task[4]}`)"
                  :draggable="Boolean(task[6]) && canChangeTaskStatus(task)"
                  :class="['tf-kanban-card group', updatingTaskId === String(task[6]) ? 'pointer-events-none opacity-60' : '']"
                  @dragstart="canChangeTaskStatus(task) && (draggedTaskId = String(task[6] || ''))"
                  @dragend="draggedTaskId = ''"
                  @click="openTaskFromCard(task)"
                >
                  <div class="flex items-start justify-between gap-3"><div class="min-w-0"><h4 :class="['line-clamp-2 text-[13px] font-bold leading-[1.4] tracking-[-0.01em] text-task-ink', column.key === 'completed' ? 'line-through opacity-65' : '']"><template v-if="taskSearch.trim()">{{ highlightedSearchText(String(task[0]), taskSearch).before }}<mark v-if="highlightedSearchText(String(task[0]), taskSearch).match" class="tf-search-highlight">{{ highlightedSearchText(String(task[0]), taskSearch).match }}</mark>{{ highlightedSearchText(String(task[0]), taskSearch).after }}</template><template v-else>{{ task[0] }}</template></h4><span v-if="taskIsHiddenOf(task)" class="tf-hidden-badge mt-2"><svg viewBox="0 0 24 24" class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>Hidden</span></div></div>
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

                  <select class="tf-kanban-status-select" :value="column.key" :disabled="updatingTaskId === String(task[6]) || !task[6] || !canChangeTaskStatus(task)" aria-label="Change task status" @click.stop @change="updateTaskStatus(task, ($event.target as HTMLSelectElement).value)">
                    <option value="backlog">Postponed</option>
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Submitted</option>
                  </select>
                  <button v-if="column.key === 'completed' && canManageDepartment" type="button" class="mt-3 inline-flex h-8 w-full items-center justify-center gap-2 rounded-[9px] border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 transition hover:border-task-blue hover:bg-task-blueSoft hover:text-task-blue" @click.stop="archiveTask(task)"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M4 7h16v13H4V7Zm-1-4h18v4H3V3Zm6 9h6" /></svg>Archive</button>
                </article>
                <div v-if="!column.tasks.length" class="tf-kanban-empty tf-kanban-empty--column flex-col gap-1.5"><svg viewBox="0 0 24 24" class="mb-2 h-11 w-11" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 7h16l1 5v7H3v-7l1-5Z"/><path d="M3 13h5l1.5 2h5L16 13h5"/></svg><span class="font-semibold text-task-muted">No tasks {{ column.label.toLowerCase() }}</span><span class="text-[10px] text-task-muted">Drag a task here or</span><button v-if="canAddTask" type="button" class="font-bold text-task-blue" @click="openModal('task')">+ Add task</button></div>
                <button v-else-if="canAddTask" type="button" class="tf-kanban-column-add" @click="openModal('task')"><span class="text-lg font-light">+</span><span>Add task</span></button>
              </div>
            </section>
            </div>
            <button v-if="backlogTasks.length" type="button" class="mt-3 flex w-full items-center justify-between rounded-[12px] border border-task-line bg-task-blueSoft px-4 py-3 text-left text-sm transition hover:border-task-blue" @click="taskBoardSection = 'backlog'">
              <span><b class="text-task-ink">{{ backlogTasks.length }} {{ backlogTasks.length === 1 ? 'task is' : 'tasks are' }} Postponed</b><span class="ml-2 text-task-muted">Planned for later and not shown in workflow columns.</span></span>
              <span class="shrink-0 font-bold text-task-blue">Open Postponed →</span>
            </button>
          </div>
          <p v-if="!filteredTasks.length" class="py-8 text-center text-sm text-task-muted">No tasks matched your filters.</p>
          </div>
        </section>

        <section v-else-if="activePage === 'projects'" class="tf-projects-page space-y-5">
          <div class="tf-project-stats grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div v-for="(item, index) in projectStats" :key="String(item[1])" :class="['tf-project-stat group relative h-40 overflow-hidden rounded-[18px] border bg-gradient-to-br p-5', dashboardStatStyles[index]?.card]">
              <div class="flex items-start gap-4"><span :class="['grid h-12 w-12 shrink-0 place-items-center rounded-[15px] bg-white/85 shadow-sm ring-1', dashboardStatStyles[index]?.icon]"><svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="index === 0 ? iconPath('projects') : index === 1 ? 'M8 2h8M8 22h8M9 2v5l3 3 3-3V2M9 22v-5l3-3 3 3v5' : index === 2 ? 'm5 12 4 4L19 6' : 'M12 9v4m0 4h.01M10.3 3.5 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.5a2 2 0 0 0-3.4 0Z'" /></svg></span><div><p :class="['text-3xl font-bold', index === 0 ? 'text-task-blue' : index === 1 ? 'text-[#8057D5]' : index === 2 ? 'text-task-success' : 'text-task-danger']">{{ item[0] }}</p><p class="mt-1 text-sm font-medium text-task-muted">{{ item[1] }}</p></div></div>
              <div class="absolute bottom-4 left-5 right-5 flex items-end justify-between"><svg viewBox="0 0 90 28" :class="['h-7 w-28', dashboardStatStyles[index]?.line]" fill="none"><path d="M2 23 12 18l10 4 11-10 10 8 12-11 11 9 10-12 12 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg><span class="text-xs font-medium text-task-muted">Live overview</span></div>
            </div>
          </div>
          <div class="tf-panel tf-project-list-panel relative overflow-visible p-5 sm:p-6">
            <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><h2 class="text-xl font-bold">All Projects</h2><p class="mt-1 text-sm text-task-muted">Track progress, deadlines and assigned team members.</p></div><div class="flex flex-col gap-3 sm:flex-row"><label class="relative w-full sm:w-auto"><svg viewBox="0 0 24 24" class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-task-muted" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('search')" /></svg><input v-model="projectSearchInput" class="tf-input h-11 w-full pl-10 pr-10 sm:w-72" placeholder="Search projects..." /><button v-if="projectSearchInput && !searchLoading.project" type="button" class="tf-search-clear" aria-label="Clear project search" @click="clearSearch('project')">×</button><span v-if="searchLoading.project" class="tf-search-spinner" /></label><div class="tf-dropdown"><button type="button" class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-task-line bg-white px-4 text-sm font-semibold text-task-muted transition hover:border-task-blue hover:text-task-blue sm:w-auto" @click="openDropdown = openDropdown === 'projectFilter' ? null : 'projectFilter'"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('filter')" /></svg>{{ projectPriorityFilter === 'All Priorities' ? 'Filter' : projectPriorityFilter }}</button><div v-if="openDropdown === 'projectFilter'" class="tf-dropdown-menu min-w-48"><button v-for="option in dropdownOptions.priority" :key="option" type="button" class="tf-dropdown-option" @click="projectPriorityFilter = option; openDropdown = null">{{ option }}</button></div></div><button class="tf-primary h-11 w-full rounded-[12px] px-5 sm:w-auto" type="button" @click="openModal('project')"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" /></svg>Create New Project</button></div></div>
            <div v-if="searchLoading.project" class="tf-search-overlay"><span class="tf-search-loader" /> Searching projects...</div>
            <div class="tf-project-grid grid gap-5 lg:grid-cols-3">
              <article v-for="(project, index) in paginatedProjects" :key="project[0]" class="tf-project-card relative overflow-visible rounded-[17px] border border-task-line bg-white p-5 transition">
                <div class="mb-3 flex items-start justify-between"><h3 class="text-lg font-bold">{{ project[0] }}</h3><div class="relative"><button type="button" class="tf-icon-button" @click="toggleActionMenu(`project-${project[0]}`)"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor"><path :d="iconPath('dots')" /></svg></button><div v-if="actionMenu === `project-${project[0]}`" class="tf-action-menu"><button type="button" class="tf-action-item" @click="viewProject(project)">View</button><button v-if="canManageDepartment" type="button" class="tf-action-item" @click="editProject(project)">Edit</button><button v-if="canManageDepartment" type="button" class="tf-action-item" @click="patchProjectStatus(project, 'completed')">Mark Completed</button><button v-if="canManageDepartment" type="button" class="tf-action-item" @click="patchProjectStatus(project, 'archived')">Archive</button><button v-if="canManageDepartment" type="button" class="tf-action-item tf-action-danger" @click="deleteProject(project)">Delete</button></div></div></div>
                <div class="mb-4 flex gap-2"><span :class="['tf-pill', badgeClass(String(project[1]))]">{{ project[1] }}</span><span :class="['tf-pill', badgeClass(String(project[2]))]">{{ project[2] }}</span></div>
                <div class="rounded-[13px] bg-slate-50 p-3"><div class="mb-2 flex justify-between text-sm"><span class="text-task-muted">Progress</span><b>{{ project[3] }}%</b></div><div class="h-2 overflow-hidden rounded-full bg-slate-200"><div :class="['h-full rounded-full transition-all', String(project[1]).toLowerCase() === 'completed' ? 'bg-task-success' : 'bg-gradient-to-r from-task-blue to-[#7654ED]']" :style="{ width: `${project[3]}%` }" /></div><p class="mt-3 text-sm text-task-muted">{{ project[4] }}</p><div class="mt-3 flex items-center justify-between gap-3 text-sm text-task-muted"><div class="flex min-h-7 -space-x-2"><span v-for="member in projectMemberDetailsOf(project).slice(0, 4)" :key="String(member.id || member.email)" class="grid h-8 w-8 place-items-center overflow-hidden rounded-full border-2 border-white bg-task-blueSoft text-[9px] font-bold text-task-blue" :title="projectMemberName(member)"><img v-if="member.avatar" :src="member.avatar" :alt="projectMemberName(member)" class="h-full w-full object-cover" /><span v-else>{{ initials(projectMemberName(member)) }}</span></span><span v-if="projectMemberDetailsOf(project).length > 4" class="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-task-blue text-[10px] font-bold text-white">+{{ projectMemberDetailsOf(project).length - 4 }}</span></div><span class="flex shrink-0 items-center gap-1.5"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('calendar')" /></svg>Due: {{ project[5] }}</span></div></div>
              </article>
            </div>
            <p v-if="!filteredProjects.length" class="py-8 text-center text-sm text-task-muted">No projects found.</p>
            <div v-if="filteredProjects.length > pageSize" class="mt-5 flex items-center justify-between text-xs text-task-muted"><span>Showing {{ paginatedProjects.length }} of {{ filteredProjects.length }} Projects</span><div class="flex gap-2"><button class="tf-icon-button" type="button" @click="setListPage('project', projectPage - 1)">‹</button><button v-for="page in projectPageCount" :key="page" :class="[projectPage === page ? 'tf-primary' : 'tf-icon-button', 'h-9 w-9 p-0']" type="button" @click="setListPage('project', page)">{{ page }}</button><button class="tf-icon-button" type="button" @click="setListPage('project', projectPage + 1)">›</button></div></div>
          </div>
        </section>

        <section v-else-if="activePage === 'analytics'" class="tf-analytics-page grid items-start gap-4">
          <div class="tf-analytics-main min-w-0 space-y-3">
          <div :class="['tf-analytics-filter-panel tf-panel p-4', openDropdown?.startsWith('analytics') ? 'is-dropdown-open' : '']">
            <div class="tf-analytics-filter-grid">
              <div class="tf-analytics-filter-label">Department<div class="tf-dropdown mt-2"><button type="button" class="tf-analytics-filter-button" @click="openDropdown = openDropdown === 'analyticsDepartment' ? null : 'analyticsDepartment'"><span class="tf-analytics-filter-leading"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 21v-9h6v9M7 12V6h6v15m0-11h7v11M7 9h.01M16 13h.01M16 17h.01" /></svg></span><span class="min-w-0 flex-1 truncate text-left">{{ memberDepartmentOptions.find(item => item.id === analyticsFilters.department)?.name || 'All departments' }}</span><svg viewBox="0 0 20 20" :class="['h-4 w-4 shrink-0 transition-transform', openDropdown === 'analyticsDepartment' ? 'rotate-180' : '']" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg></button><div v-if="openDropdown === 'analyticsDepartment'" class="tf-dropdown-menu max-h-56 overflow-y-auto"><button type="button" class="tf-dropdown-option" @click="analyticsFilters.department = ''; openDropdown = null">All departments</button><button v-for="item in memberDepartmentOptions" :key="item.id" type="button" class="tf-dropdown-option" @click="analyticsFilters.department = item.id; openDropdown = null"><span>{{ item.name }}</span><span v-if="analyticsFilters.department === item.id">✓</span></button></div></div></div>
              <div class="tf-analytics-filter-label">Employee<div class="tf-dropdown mt-2"><button type="button" class="tf-analytics-filter-button" @click="openDropdown = openDropdown === 'analyticsEmployee' ? null : 'analyticsEmployee'"><span class="tf-analytics-filter-leading"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('users')" /></svg></span><span class="min-w-0 flex-1 truncate text-left">{{ team.find(item => String(item[9] || item[7] || '') === analyticsFilters.employee)?.[0] || 'All staff' }}</span><svg viewBox="0 0 20 20" :class="['h-4 w-4 shrink-0 transition-transform', openDropdown === 'analyticsEmployee' ? 'rotate-180' : '']" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg></button><div v-if="openDropdown === 'analyticsEmployee'" class="tf-dropdown-menu max-h-56 overflow-y-auto"><button type="button" class="tf-dropdown-option" @click="analyticsFilters.employee = ''; openDropdown = null">All staff</button><button v-for="item in team" :key="String(item[9] || item[7] || item[0])" type="button" class="tf-dropdown-option" @click="analyticsFilters.employee = String(item[9] || item[7] || ''); openDropdown = null"><span>{{ item[0] }}</span><span v-if="analyticsFilters.employee === String(item[9] || item[7] || '')">✓</span></button></div></div></div>
              <div class="tf-analytics-filter-label">Date range<div class="tf-dropdown mt-2"><button type="button" class="tf-analytics-filter-button" @click="openDropdown = openDropdown === 'analyticsDateRange' ? null : 'analyticsDateRange'"><span class="tf-analytics-filter-leading"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('calendar')" /></svg></span><span class="min-w-0 flex-1 truncate text-left">Last {{ analyticsFilters.days }} Days</span><svg viewBox="0 0 20 20" :class="['h-4 w-4 shrink-0 transition-transform', openDropdown === 'analyticsDateRange' ? 'rotate-180' : '']" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg></button><div v-if="openDropdown === 'analyticsDateRange'" class="tf-dropdown-menu"><button v-for="days in ['7','30','90','365']" :key="days" type="button" class="tf-dropdown-option" @click="setAnalyticsDays(days)"><span>Last {{ days }} Days</span><span v-if="analyticsFilters.days === days">✓</span></button></div></div></div>
              <div class="tf-analytics-filter-label">Status<div class="tf-dropdown mt-2"><button type="button" class="tf-analytics-filter-button" @click="openDropdown = openDropdown === 'analyticsStatus' ? null : 'analyticsStatus'"><span class="tf-analytics-filter-leading"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 7v5l3 2m7-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" /></svg></span><span class="min-w-0 flex-1 truncate text-left">{{ analyticsFilters.status === 'backlog' ? 'Postponed' : analyticsFilters.status ? analyticsFilters.status.split('_').map(word => word[0].toUpperCase() + word.slice(1)).join(' ') : 'All statuses' }}</span><svg viewBox="0 0 20 20" :class="['h-4 w-4 shrink-0 transition-transform', openDropdown === 'analyticsStatus' ? 'rotate-180' : '']" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg></button><div v-if="openDropdown === 'analyticsStatus'" class="tf-dropdown-menu"><button v-for="item in [['','All statuses'],['backlog','Postponed'],['not_started','Not started'],['in_progress','In progress'],['on_hold','On hold'],['completed','Completed']]" :key="item[0]" type="button" class="tf-dropdown-option" @click="analyticsFilters.status = item[0]; openDropdown = null"><span>{{ item[1] }}</span><span v-if="analyticsFilters.status === item[0]">✓</span></button></div></div></div>
              <div class="tf-analytics-filter-label">Performance level<div class="tf-dropdown mt-2"><button type="button" class="tf-analytics-filter-button" @click="openDropdown = openDropdown === 'analyticsPerformance' ? null : 'analyticsPerformance'"><span class="tf-analytics-filter-leading"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20V10m6 10V4m6 16v-7m4 7V7" /></svg></span><span class="min-w-0 flex-1 truncate text-left">{{ analyticsPerformanceLevel ? analyticsPerformanceLevelLabel(analyticsPerformanceLevel) : 'All levels' }}</span><svg viewBox="0 0 20 20" :class="['h-4 w-4 shrink-0 transition-transform', openDropdown === 'analyticsPerformance' ? 'rotate-180' : '']" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg></button><div v-if="openDropdown === 'analyticsPerformance'" class="tf-dropdown-menu"><button v-for="item in [['','All levels'],['outstanding','Outstanding'],['excellent','Excellent'],['good','Good'],['needs_improvement','Needs Improvement'],['critical','Critical'],['not_rated','Not Rated']]" :key="item[0]" type="button" class="tf-dropdown-option" @click="analyticsPerformanceLevel = item[0]; openDropdown = null"><span>{{ item[1] }}</span><span v-if="analyticsPerformanceLevel === item[0]">✓</span></button></div></div></div>
              <div class="tf-analytics-filter-label">Sort<div class="tf-dropdown mt-2"><button type="button" class="tf-analytics-filter-button" @click="openDropdown = openDropdown === 'analyticsOrdering' ? null : 'analyticsOrdering'"><span class="tf-analytics-filter-leading"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 6h12M4 6h.01M8 12h9M4 12h.01M8 18h6M4 18h.01" /></svg></span><span class="min-w-0 flex-1 truncate text-left">{{ analyticsOrderingLabel }}</span><svg viewBox="0 0 20 20" :class="['h-4 w-4 shrink-0 transition-transform', openDropdown === 'analyticsOrdering' ? 'rotate-180' : '']" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg></button><div v-if="openDropdown === 'analyticsOrdering'" class="tf-dropdown-menu min-w-52"><button v-for="item in analyticsOrderingOptions" :key="item[0]" type="button" class="tf-dropdown-option" @click="analyticsOrdering = item[0]; analyticsPage = 1; openDropdown = null"><span>{{ item[1] }}</span><span v-if="analyticsOrdering === item[0]">✓</span></button></div></div></div>
              <button type="button" class="tf-analytics-reset-button self-end" aria-label="Reset analytics filters" title="Reset filters" @click="resetAnalyticsFilters"><svg viewBox="0 0 24 24" class="tf-analytics-reset-icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6v5h-5" /><path d="M19 11a7.5 7.5 0 1 0 .15 4.5" /></svg><span class="tf-analytics-reset-text">Reset filters</span></button>
            </div>
            <p v-if="analyticsFilterError" class="mt-3 text-xs font-semibold text-task-danger">{{ analyticsFilterError }}</p><p v-else-if="analyticsLoading" class="mt-3 text-xs text-task-muted">Updating analytics…</p>
          </div>
          <div class="tf-analytics-kpis grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <div v-for="(item, index) in analyticsKpiCards" :key="item.key" class="tf-panel relative min-h-[104px] overflow-hidden p-4">
              <div class="flex items-center gap-3"><span class="tf-analytics-kpi-icon"><svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path :d="index === 0 ? 'M5.6 19a8 8 0 1 1 12.8 0M12 12l4-4' : index === 1 ? 'M12 7v5l3 2m7-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' : index === 2 ? 'M8 12l3 3 5-6M7 3h10v3H7zM6 5H4v16h16V5h-2' : index === 3 ? 'M4 7h16v13H4V7Zm-1-4h18v4H3V3Zm6 9h6' : index === 4 ? 'M9 9h6v6H9z' : 'M4 5h16v14H4V5Zm4 4h8m-8 4h8'" /></svg></span><div class="min-w-0"><p class="truncate text-[11px] font-bold text-task-muted">{{ formatAnalyticsCardLabel(item) }}</p><p class="mt-0.5 text-2xl font-extrabold text-task-ink">{{ formatAnalyticsCardValue(item) }}</p></div></div>
              <svg viewBox="0 0 120 25" :class="['absolute bottom-3 right-3 h-7 w-20 opacity-80', dashboardStatStyles[index % dashboardStatStyles.length]?.line]" fill="none" preserveAspectRatio="none"><path d="M2 18 12 15l10 5 12-6 10 4 14-9 12 6 10-3 12 4 12-8 14 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </div>
          </div>

          <div class="tf-analytics-trends grid gap-3 xl:grid-cols-2">
            <section class="tf-panel tf-performance-trend-card p-5">
              <header class="flex items-start justify-between gap-4">
                <div><h2 class="text-base font-extrabold text-task-ink">Performance Trend</h2><p class="mt-1 text-xs text-task-muted">Assigned and completed tasks over time</p></div>
                <button type="button" class="tf-icon-button h-8 w-8 rounded-full" aria-label="Performance trend options"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor"><path :d="iconPath('dots')"/></svg></button>
              </header>
              <div class="relative mt-4 h-[270px] overflow-hidden" @mouseleave="hoveredEfficiencyMonth = null">
                <div class="absolute inset-y-3 left-0 flex flex-col justify-between pb-7 text-[10px] text-task-muted"><span v-for="tick in performanceTrendTicks" :key="tick">{{ tick }}</span></div>
                <div class="absolute bottom-7 left-10 right-0 top-3">
                  <svg viewBox="0 0 560 230" class="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                    <defs><linearGradient id="performance-completed-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5B8FC8" stop-opacity=".38"/><stop offset="1" stop-color="#5B8FC8" stop-opacity=".03"/></linearGradient><linearGradient id="performance-assigned-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#AFC2D8" stop-opacity=".2"/><stop offset="1" stop-color="#AFC2D8" stop-opacity=".02"/></linearGradient></defs>
                    <path d="M0 0H560M0 57.5H560M0 115H560M0 172.5H560M0 230H560" fill="none" stroke="currentColor" class="tf-performance-grid" stroke-dasharray="3 5"/>
                    <path :d="assignedTrendAreaPath" fill="url(#performance-assigned-fill)" />
                    <path :d="completedTrendAreaPath" fill="url(#performance-completed-fill)" />
                    <path :d="assignedTrendPath" fill="none" stroke="#A8B7C9" stroke-width="1.7" stroke-linecap="round" />
                    <path :d="completedTrendPath" fill="none" stroke="#4E7EAE" stroke-width="2.2" stroke-linecap="round" />
                    <circle v-for="point in assignedTrendPoints" :key="`assigned-${point.item.month}`" :cx="point.x" :cy="point.y" r="3" fill="#fff" stroke="#A8B7C9" stroke-width="1.5" />
                    <circle v-for="point in completedTrendPoints" :key="`completed-${point.item.month}`" :cx="point.x" :cy="point.y" r="3.5" fill="#fff" stroke="#4E7EAE" stroke-width="2" />
                  </svg>
                  <div class="absolute inset-0 z-10 grid" :style="chartColumnsStyle(efficiencyTrendData.length)"><button v-for="(bar, barIndex) in efficiencyTrendData" :key="bar.month" type="button" class="group relative h-full" @mouseenter="hoveredEfficiencyMonth = bar.month" @focus="hoveredEfficiencyMonth = bar.month"><span v-if="bar.month === highlightedEfficiency?.month" :class="['tf-performance-tooltip absolute top-4 z-20 min-w-max rounded-[10px] px-3 py-2 text-left text-[11px] shadow-xl', barIndex === 0 ? 'left-0' : barIndex === efficiencyTrendData.length - 1 ? 'right-0' : 'left-1/2 -translate-x-1/2']"><b class="mb-1 block text-task-ink">{{ bar.month }}</b><span class="block"><i class="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#4E7EAE]"/>Completed: {{ bar.completed }}</span><span class="mt-1 block"><i class="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#A8B7C9]"/>Assigned: {{ bar.assigned }}</span></span></button></div>
                </div>
                <div class="absolute bottom-0 left-10 right-0 grid text-center text-[10px] text-task-muted" :style="chartColumnsStyle(efficiencyTrendData.length)"><span v-for="item in efficiencyTrendData" :key="item.month">{{ item.month }}</span></div>
              </div>
            </section>

            <section class="tf-panel p-5">
              <header class="flex flex-wrap items-start justify-between gap-3">
                <div><h2 class="text-base font-extrabold text-task-ink">Department Performance</h2><p class="mt-1 text-xs text-task-muted">Task status mix and backend completion rate by department</p></div>
                <div class="flex flex-wrap justify-end gap-3 text-[10px] text-task-muted"><span class="flex items-center gap-1.5"><i class="h-2 w-2 rounded-full bg-[#49d28e]"/>Completed</span><span class="flex items-center gap-1.5"><i class="h-2 w-2 rounded-full bg-[#2689ef]"/>In Progress</span><span class="flex items-center gap-1.5"><i class="h-2 w-2 rounded-full bg-[#ff6b57]"/>Overdue</span></div>
              </header>
              <div class="relative mt-4 h-[340px] pl-9">
                <div class="absolute inset-y-3 left-0 flex flex-col justify-between pb-7 text-[10px] text-task-muted"><span>{{ analyticsDepartmentPerformanceMax }}</span><span>{{ Math.round(analyticsDepartmentPerformanceMax * .75) }}</span><span>{{ Math.round(analyticsDepartmentPerformanceMax * .5) }}</span><span>{{ Math.round(analyticsDepartmentPerformanceMax * .25) }}</span><span>0</span></div>
                <div class="absolute bottom-7 left-9 right-0 top-3 flex items-end justify-around gap-3 border-b border-[#203650] bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_calc(25%-1px),#203650_calc(25%-1px),#203650_25%)] px-3">
                  <div v-for="item in analyticsDepartmentPerformance" :key="item.key" class="group relative flex h-full min-w-0 flex-1 items-end justify-center">
                    <div class="relative w-full max-w-12" :style="{ height: `${Math.max(5, (analyticsDepartmentStackTotal(item) / analyticsDepartmentPerformanceMax) * 100)}%` }"><span class="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-task-ink">{{ item.value }}%</span><div class="absolute inset-0 flex flex-col-reverse overflow-hidden rounded-t-sm shadow-[0_0_0_1px_rgba(255,255,255,.04)] transition-opacity group-hover:opacity-80"><i class="min-h-0 bg-[#49d28e]" :style="{ flexGrow: item.completed, flexBasis: 0 }"/><i class="min-h-0 bg-[#2689ef]" :style="{ flexGrow: item.inProgress, flexBasis: 0 }"/><i class="min-h-0 bg-[#ff6b57]" :style="{ flexGrow: item.overdue, flexBasis: 0 }"/></div></div>
                    <div class="pointer-events-none absolute bottom-1/2 left-1/2 z-20 hidden w-44 -translate-x-1/2 rounded-lg border border-[#29425e] bg-[#071426] p-3 text-[10px] shadow-2xl group-hover:block"><b class="block text-xs text-white">{{ item.label }}</b><p class="mt-2 text-white">Completion rate: {{ item.value }}%</p><p class="mt-1 text-slate-300">Completed {{ item.completed }} · In progress {{ item.inProgress }} · Overdue {{ item.overdue }} · Total {{ item.total }}</p></div>
                  </div>
                  <p v-if="!analyticsDepartmentPerformance.length" class="m-auto text-xs text-task-muted">No department performance data.</p>
                </div>
                <div class="absolute bottom-0 left-9 right-0 flex justify-around gap-3 px-3 text-center text-[10px] text-task-muted"><span v-for="item in analyticsDepartmentPerformance" :key="item.key" class="min-w-0 flex-1 truncate" :title="item.label">{{ item.label }}</span></div>
              </div>
            </section>
          </div>

          <div class="tf-analytics-workload grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
            <section class="tf-panel relative min-w-0 p-5" @click="handleAnalyticsStaffTableClick">
              <div class="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <h2 class="flex items-center gap-2 text-lg font-bold text-task-ink">Staff Performance <span class="h-1 w-1 rounded-full bg-task-blue"/><span class="text-sm font-semibold text-task-muted">{{ analyticsStaffTotal }}</span></h2>
                <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
                  <label class="relative w-full sm:w-60"><svg viewBox="0 0 24 24" class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-task-muted" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('search')"/></svg><input v-model="analyticsStaffSearchInput" class="tf-input h-10 w-full pl-10 pr-10" placeholder="Search staff..."/><button v-if="analyticsStaffSearchInput && !analyticsStaffSearchPending && !analyticsLoading" type="button" class="tf-search-clear" aria-label="Clear analytics staff search" @click="analyticsStaffSearchInput = ''">×</button><span v-if="analyticsStaffSearchPending || analyticsLoading" class="tf-search-spinner"/></label>
                </div>
              </div>
              <div v-if="analyticsStaffSearchPending || analyticsLoading" class="tf-search-overlay"><span class="tf-search-loader"/> Searching staff...</div>
              <div class="tf-analytics-staff-table-wrap relative overflow-x-auto"><p v-if="!analyticsWorkloadRows.length && !analyticsLoading && !analyticsStaffSearchPending" class="absolute inset-0 z-10 grid place-items-center text-sm text-task-muted">No staff found.</p><table class="w-full min-w-[1200px] table-fixed text-left text-sm"><thead class="border-y border-task-line bg-slate-50/80 text-[11px] uppercase tracking-wide text-task-muted"><tr><th class="w-[285px] p-3 font-semibold"><button type="button" :class="['inline-flex items-center gap-1.5 transition hover:text-task-blue', analyticsTableOrdering.replace(/^-/, '') === 'name' ? 'text-task-blue' : '']" @click="toggleAnalyticsSort('name')">Staff <span>{{ analyticsSortMark('name') }}</span></button></th><th class="w-[170px] p-3 font-semibold"><button type="button" :class="['inline-flex items-center gap-1.5 transition hover:text-task-blue', analyticsTableOrdering.replace(/^-/, '') === 'department' ? 'text-task-blue' : '']" @click="toggleAnalyticsSort('department')">Department <span>{{ analyticsSortMark('department') }}</span></button></th><th class="w-[82px] p-3 font-semibold"><button type="button" :class="['inline-flex items-center gap-1.5 transition hover:text-task-blue', analyticsTableOrdering.replace(/^-/, '') === 'assigned' ? 'text-task-blue' : '']" @click="toggleAnalyticsSort('assigned')">Assigned <span>{{ analyticsSortMark('assigned') }}</span></button></th><th class="w-[88px] p-3 font-semibold"><button type="button" :class="['inline-flex items-center gap-1.5 transition hover:text-task-blue', analyticsTableOrdering.replace(/^-/, '') === 'completed' ? 'text-task-blue' : '']" @click="toggleAnalyticsSort('completed')">Completed <span>{{ analyticsSortMark('completed') }}</span></button></th><th class="w-[90px] p-3 font-semibold"><button type="button" :class="['inline-flex items-center gap-1.5 transition hover:text-task-blue', analyticsTableOrdering.replace(/^-/, '') === 'in_progress' ? 'text-task-blue' : '']" @click="toggleAnalyticsSort('in_progress')">In Progress <span>{{ analyticsSortMark('in_progress') }}</span></button></th><th class="w-[78px] p-3 font-semibold"><button type="button" :class="['inline-flex items-center gap-1.5 transition hover:text-task-blue', analyticsTableOrdering.replace(/^-/, '') === 'on_hold' ? 'text-task-blue' : '']" @click="toggleAnalyticsSort('on_hold')">On Hold <span>{{ analyticsSortMark('on_hold') }}</span></button></th><th class="w-[76px] p-3 font-semibold"><button type="button" :class="['inline-flex items-center gap-1.5 transition hover:text-task-blue', analyticsTableOrdering.replace(/^-/, '') === 'overdue' ? 'text-task-blue' : '']" @click="toggleAnalyticsSort('overdue')">Overdue <span>{{ analyticsSortMark('overdue') }}</span></button></th><th class="w-[72px] p-3 font-semibold"><button type="button" :class="['inline-flex items-center gap-1.5 transition hover:text-task-blue', analyticsTableOrdering.replace(/^-/, '') === 'on_time' ? 'text-task-blue' : '']" @click="toggleAnalyticsSort('on_time')">On-time <span>{{ analyticsSortMark('on_time') }}</span></button></th><th class="w-[82px] p-3 font-semibold"><button type="button" :class="['inline-flex items-center gap-1.5 transition hover:text-task-blue', analyticsTableOrdering.replace(/^-/, '') === 'avg_time' ? 'text-task-blue' : '']" @click="toggleAnalyticsSort('avg_time')">Avg. Time <span>{{ analyticsSortMark('avg_time') }}</span></button></th><th class="w-[205px] p-3 font-semibold"><button type="button" :class="['inline-flex items-center gap-1.5 transition hover:text-task-blue', analyticsTableOrdering.replace(/^-/, '') === 'performance' ? 'text-task-blue' : '']" @click="toggleAnalyticsSort('performance')">Performance <span>{{ analyticsSortMark('performance') }}</span></button></th><th class="w-[58px] p-3 text-right font-semibold">Actions</th></tr></thead><tbody class="divide-y divide-task-line"><tr v-for="(row, index) in analyticsWorkloadRows" :key="row.name" class="transition hover:bg-task-blueSoft/40"><td class="max-w-[285px] p-3"><div class="flex min-w-0 items-center gap-3"><span :class="['relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full text-xs font-bold', index % 4 === 0 ? 'bg-task-blueSoft text-task-blue' : index % 4 === 1 ? 'bg-[#F0E9FF] text-[#8057D5]' : index % 4 === 2 ? 'bg-task-warningSoft text-task-warning' : 'bg-task-successSoft text-task-success']"><span>{{ initials(row.name) }}</span><img v-if="row.avatar" :src="row.avatar" :alt="row.name + ' avatar'" class="absolute inset-0 h-full w-full object-cover" @error="($event.currentTarget as HTMLImageElement).remove()" /></span><div class="min-w-0 flex-1"><p class="truncate font-bold text-task-ink"><template v-for="(part, partIndex) in [highlightedSearchText(row.name, analyticsStaffSearch || analyticsGlobalSearch)]" :key="partIndex">{{ part.before }}<mark v-if="part.match" class="tf-search-highlight">{{ part.match }}</mark>{{ part.after }}</template></p><p class="tf-staff-role-clamp text-xs text-task-muted" :title="row.role"><template v-for="(part, partIndex) in [highlightedSearchText(row.role, analyticsStaffSearch || analyticsGlobalSearch)]" :key="partIndex">{{ part.before }}<mark v-if="part.match" class="tf-search-highlight">{{ part.match }}</mark>{{ part.after }}</template></p></div></div></td><td class="p-3"><span class="inline-flex min-h-7 w-max max-w-full items-center whitespace-normal break-words rounded-[12px] bg-task-blueSoft px-2.5 py-1 text-left text-xs font-semibold leading-4 text-task-blue" :title="row.department"><template v-for="(part, partIndex) in [highlightedSearchText(row.department, analyticsStaffSearch || analyticsGlobalSearch)]" :key="partIndex">{{ part.before }}<mark v-if="part.match" class="tf-search-highlight">{{ part.match }}</mark>{{ part.after }}</template></span></td><td class="p-3">{{ row.assigned }}</td><td class="p-3 text-task-success">{{ row.completed }}</td><td class="p-3 text-task-blue">{{ row.active }}</td><td class="p-3 font-semibold text-task-warning">{{ row.onHold }}</td><td :class="['p-3', row.overdue ? 'font-bold text-task-danger' : 'text-task-success']">{{ row.overdue }}</td><td class="p-3 font-semibold">{{ row.onTime }}%</td><td class="p-3 text-task-muted">{{ row.avgCompletionDays }} days</td><td class="p-3"><div class="min-w-[150px]"><div class="flex items-center justify-between gap-3"><b class="text-xs text-task-ink">{{ row.performanceScore == null ? '—' : `${row.performanceScore}%` }}</b><span :class="['tf-performance-badge', analyticsPerformanceLevelClass(analyticsRowPerformanceLevel(row))]">{{ analyticsPerformanceLevelLabel(analyticsRowPerformanceLevel(row)) }}</span></div><div class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200"><div :class="['h-full rounded-full', analyticsPerformanceBarClass(analyticsRowPerformanceLevel(row))]" :style="{ width: `${row.performanceScore ?? 0}%` }"/></div></div></td><td class="p-3 text-right"><button type="button" class="tf-icon-button rounded-full"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor"><path :d="iconPath('dots')"/></svg></button></td></tr></tbody></table></div>
              <div :class="['tf-analytics-pagination', !analyticsStaffTotal ? 'invisible' : '']"><span>Showing {{ (analyticsPage - 1) * analyticsPageSize + 1 }} to {{ Math.min(analyticsPage * analyticsPageSize, analyticsStaffTotal) }} of {{ analyticsStaffTotal }} staff members</span><div class="tf-analytics-pagination-controls"><div class="flex gap-2"><button type="button" class="tf-icon-button" :disabled="analyticsPage <= 1" @click="analyticsPage--">‹</button><button v-for="page in analyticsPageCount" :key="page" type="button" :class="[analyticsPage === page ? 'tf-primary' : 'tf-icon-button', 'h-9 w-9 p-0']" @click="analyticsPage = page">{{ page }}</button><button type="button" class="tf-icon-button" :disabled="analyticsPage >= analyticsPageCount" @click="analyticsPage++">›</button></div><div class="tf-dropdown tf-page-size-dropdown"><button type="button" class="tf-page-size-control" aria-label="Rows per page" @click="openDropdown = openDropdown === 'analyticsPageSize' ? null : 'analyticsPageSize'"><span>{{ analyticsPageSize }} per page</span><svg viewBox="0 0 20 20" :class="['h-4 w-4 transition-transform', openDropdown === 'analyticsPageSize' ? 'rotate-180' : '']" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg></button><div v-if="openDropdown === 'analyticsPageSize'" class="tf-dropdown-menu bottom-[calc(100%+7px)] top-auto min-w-full"><button v-for="size in [8, 16, 24]" :key="size" type="button" class="tf-dropdown-option" @click="analyticsPageSize = size; analyticsPage = 1; openDropdown = null"><span>{{ size }} per page</span><span v-if="analyticsPageSize === size">✓</span></button></div></div></div></div>
            </section>
            <section class="tf-panel min-w-0 p-5">
              <div class="flex items-center justify-between"><div><h2 class="text-base font-extrabold text-task-ink">Overdue Tasks Trend</h2><p class="mt-1 text-xs text-task-muted">Current overdue workload by staff</p></div><span class="tf-pill bg-task-dangerSoft text-task-danger">{{ overdueTaskRows.length }} overdue</span></div>
              <div class="mt-6 flex h-44 items-end gap-3 border-b border-task-line px-2"><div v-for="group in analyticsOverdueByStaff.slice(0, 10)" :key="group.name" class="group flex h-full min-w-0 flex-1 flex-col justify-end"><div class="relative mx-auto w-full max-w-12 rounded-t-md bg-gradient-to-t from-task-danger to-[#ff899d] transition hover:opacity-80" :style="{ height: `${Math.max(8, Math.min(100, group.rows.length / Math.max(overdueTaskRows.length, 1) * 100))}%` }"><span class="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-task-danger">{{ group.rows.length }}</span></div><span class="mt-2 truncate text-center text-[9px] text-task-muted">{{ group.name.split(' ')[0] }}</span></div><p v-if="!analyticsOverdueByStaff.length" class="m-auto text-sm text-task-muted">No overdue tasks.</p></div>
            </section>
          </div>

          <div v-if="false" :class="['grid gap-4', productivityTrendData.length ? 'lg:grid-cols-3' : 'lg:grid-cols-2']">
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
          </div>

          <aside class="tf-analytics-overdue tf-panel overflow-hidden p-0 xl:sticky xl:top-4">
            <header class="flex items-start justify-between border-b border-task-line px-4 py-4">
              <div><h2 class="font-extrabold text-task-ink">Overdue Tasks</h2><p class="mt-1 text-[11px] text-task-muted">Requires immediate attention</p></div>
              <span class="grid h-10 w-10 place-items-center rounded-[13px] bg-gradient-to-br from-rose-100 to-orange-50 text-task-danger shadow-sm ring-1 ring-rose-200"><svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5l3 1.8M18.5 5.5l-2-2M5.5 5.5l2-2"/></svg></span>
            </header>
            <div class="tf-analytics-overdue-summary border-b border-task-line px-4 py-4">
              <div class="flex items-end gap-2"><b class="text-3xl leading-none text-task-danger">{{ overdueTaskRows.length }}</b><span class="pb-0.5 text-xs font-bold text-task-ink">overdue tasks</span></div>
              <p class="mt-1 text-[10px] text-task-muted">Across {{ analyticsOverdueByStaff.length }} staff members</p>
            </div>
            <div class="p-3">
              <h3 class="px-1 pb-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-task-muted">Overdue by staff</h3>
              <div class="space-y-2">
                <section v-for="group in analyticsOverdueByStaff.slice(0, 5)" :key="group.name" class="overflow-hidden rounded-[12px] border border-task-line">
                  <div class="flex items-center gap-2 bg-slate-50 px-3 py-2.5"><span class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-task-dangerSoft text-[9px] font-extrabold text-task-danger">{{ initials(group.name) }}</span><b class="min-w-0 flex-1 truncate text-xs text-task-ink">{{ group.name }}</b><span class="shrink-0 text-[10px] font-bold text-task-danger">{{ group.rows.length }} overdue</span></div>
                  <button v-for="task in group.rows.slice(0, 3)" :key="String(task[6] || task[0])" type="button" class="tf-analytics-overdue-task flex w-full items-start gap-2 border-t border-task-line px-3 py-2.5 text-left transition" @click="openTaskFromCard(task)">
                    <i class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-task-danger" /><span class="min-w-0 flex-1"><b class="line-clamp-2 text-[11px] leading-4 text-task-ink">{{ task[0] }}</b><small class="mt-1 block text-[9px] text-task-muted">Due {{ task[4] || '—' }}</small></span><span class="shrink-0 text-[9px] font-bold text-task-danger">{{ analyticsOverdueDays(task) }}d</span>
                  </button>
                </section>
                <div v-if="!analyticsOverdueByStaff.length" class="rounded-[12px] border border-dashed border-task-line px-4 py-10 text-center"><p class="text-sm font-bold text-task-ink">All caught up</p><p class="mt-1 text-xs text-task-muted">No overdue tasks.</p></div>
              </div>
              <button v-if="overdueTaskRows.length" type="button" class="mt-3 h-10 w-full rounded-[11px] bg-task-blueSoft text-xs font-bold text-task-blue transition hover:bg-task-blue hover:text-white" @click="showAttentionTasks('overdue')">View all overdue tasks →</button>
            </div>
          </aside>
        </section>

        <section v-else-if="activePage === 'calendar'" class="tf-calendar-layout grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div class="h-full min-h-0">
            <div class="tf-calendar-main-panel tf-panel flex h-full min-h-0 flex-col overflow-hidden p-4 sm:p-5">
              <div class="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div class="flex items-center gap-3"><button class="tf-icon-button h-10 w-10" type="button" aria-label="Previous month" @click="moveCalendar(-1)"><svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6" /></svg></button><h2 class="min-w-[150px] text-center text-xl font-bold">{{ calendarMonth }}</h2><button class="tf-icon-button h-10 w-10" type="button" aria-label="Next month" @click="moveCalendar(1)"><svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6" /></svg></button></div><button v-if="canCreateEvent" class="tf-primary h-10 rounded-[12px] px-5" @click="openModal('event')"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" /></svg>Add Event</button></div>
              <div class="tf-calendar-scroll">
                <div class="grid min-w-[734px] grid-cols-7 gap-2 text-center text-sm font-semibold text-task-muted"><span class="py-2">Mon</span><span class="py-2">Tue</span><span class="py-2">Wed</span><span class="py-2">Thu</span><span class="py-2">Fri</span><span class="py-2">Sat</span><span class="py-2 text-task-danger">Sun</span></div>
                <div class="grid min-w-[734px] grid-cols-[repeat(7,minmax(97px,1fr))] gap-2">
                  <template v-for="cell in calendarCells" :key="cell.key">
                    <button
                      v-if="cell.day"
                      type="button"
                      :class="[
                        'tf-calendar-cell flex min-w-[97px] flex-col rounded-[12px] border border-task-line bg-white p-2.5 text-left shadow-[0_5px_18px_-16px_rgba(15,23,42,.5)] transition hover:-translate-y-0.5 hover:border-task-blue/40 hover:bg-task-blueSoft hover:shadow-card',
                        isTodayCell(cell.day) ? 'relative z-10 border-task-blue bg-task-blueSoft ring-1 ring-task-blue/20' : '',
                        selectedCalendarDay === cell.day ? 'relative z-10 border-task-blue bg-task-blueSoft ring-1 ring-task-blue/20' : ''
                      ]"
                      @click="selectCalendarDay(cell.day)"
                    >
                      <span class="flex h-6 items-center gap-1.5 text-sm leading-6">
                        <span :class="[isTodayCell(cell.day) ? 'grid h-6 w-6 place-items-center rounded-full bg-task-danger text-xs font-bold text-white' : 'font-semibold', cell.day && (calendarLeadingBlanks + cell.day) % 7 === 0 ? 'text-task-danger' : '']">{{ cell.day }}</span>
                        <span v-if="isTodayCell(cell.day)" class="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-task-blue shadow-sm">Today</span>
                      </span>
                      <div class="mt-1.5 w-full space-y-1">
                        <span v-for="event in eventsForDay(cell.day).slice(0, 1)" :key="event.id" class="flex w-full items-center gap-1.5 rounded-[6px] bg-task-blueSoft px-2 py-1 text-[10px] font-semibold leading-4 text-task-blue"><span :class="['h-1.5 w-1.5 shrink-0 rounded-full', event.color]" /><span class="truncate">{{ event.title }}</span></span>
                        <span v-if="eventsForDay(cell.day).length > 1" class="block truncate px-2 text-[9px] font-bold leading-3 text-task-muted">+{{ eventsForDay(cell.day).length - 1 }} more</span>
                      </div>
                    </button>
                    <div v-else class="tf-calendar-cell min-w-[97px] invisible" aria-hidden="true" />
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
          <div class="tf-panel grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
            <div v-for="(item, index) in teamStats" :key="String(item[1])" :class="['group relative flex h-24 items-center gap-3 overflow-hidden rounded-[15px] border bg-gradient-to-br px-4', dashboardStatStyles[index]?.card]">
              <span :class="['grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-white/85 shadow-sm ring-1', dashboardStatStyles[index]?.icon]"><svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="index === 0 ? iconPath('users') : index === 1 ? 'M4 17 10 11l4 4 6-8M15 7h5v5' : index === 2 ? 'm6 12 4 4 8-9M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Z' : 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8 12h4'" /></svg></span>
              <div class="relative z-10"><p class="text-3xl font-bold">{{ item[0] }}</p><p class="mt-1 text-sm font-medium text-task-muted">{{ item[1] }}</p></div>
              <svg viewBox="0 0 90 35" :class="['absolute bottom-3 right-3 h-8 w-20 opacity-70', dashboardStatStyles[index]?.line]" fill="none"><path d="M3 30 22 17l18 4 18-7 14-11 15 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /><circle cx="87" cy="7" r="2.5" fill="currentColor" /></svg>
            </div>
          </div>

          <div class="tf-panel relative p-5">
            <div class="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 class="flex items-center gap-2 text-lg font-bold text-task-ink">Staff Members <span class="h-1 w-1 rounded-full bg-task-blue" /><span class="text-sm font-semibold text-task-muted">{{ filteredTeam.length }}</span></h2>
              </div>
              <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
                <div class="tf-dropdown w-full sm:w-40">
                  <button type="button" class="tf-dropdown-button h-10 bg-white px-3 text-xs" @click="openDropdown = openDropdown === 'staffDepartment' ? null : 'staffDepartment'"><span class="truncate">{{ teamDepartmentFilter === 'all' ? 'All departments' : memberDepartmentOptions.find((department) => department.id === teamDepartmentFilter)?.name || 'Department' }}</span><svg viewBox="0 0 20 20" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg></button>
                  <div v-if="openDropdown === 'staffDepartment'" class="tf-dropdown-menu z-50 max-h-56 overflow-y-auto"><button type="button" class="tf-dropdown-option" @click="teamDepartmentFilter = 'all'; teamPage = 1; openDropdown = null">All departments</button><button v-for="department in memberDepartmentOptions" :key="department.id" type="button" class="tf-dropdown-option" @click="teamDepartmentFilter = department.id; teamPage = 1; openDropdown = null"><span>{{ department.name }}</span><span v-if="teamDepartmentFilter === department.id">✓</span></button></div>
                </div>
                <div class="tf-dropdown w-full sm:w-36">
                  <button type="button" class="tf-dropdown-button h-10 bg-white px-3 text-xs capitalize" @click="openDropdown = openDropdown === 'staffRole' ? null : 'staffRole'"><span class="truncate">{{ teamRoleFilter === 'all' ? 'All roles' : teamRoleFilter }}</span><svg viewBox="0 0 20 20" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg></button>
                  <div v-if="openDropdown === 'staffRole'" class="tf-dropdown-menu z-50"><button type="button" class="tf-dropdown-option" @click="teamRoleFilter = 'all'; teamPage = 1; openDropdown = null">All roles</button><button v-for="role in memberRoleOptions" :key="role" type="button" class="tf-dropdown-option capitalize" @click="teamRoleFilter = role; teamPage = 1; openDropdown = null"><span>{{ role }}</span><span v-if="teamRoleFilter === role">✓</span></button></div>
                </div>
                <label class="relative w-full sm:w-60"><svg viewBox="0 0 24 24" class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-task-muted" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('search')" /></svg><input v-model="teamSearchInput" class="tf-input h-10 w-full pl-10 pr-10" placeholder="Search staff..." /><button v-if="teamSearchInput && !searchLoading.team" type="button" class="tf-search-clear" aria-label="Clear staff search" @click="clearSearch('team')">×</button><span v-if="searchLoading.team" class="tf-search-spinner" /></label>
                <button v-if="teamDepartmentFilter !== 'all' || teamRoleFilter !== 'all' || teamSort !== 'name_asc' || workloadFilter !== 100" type="button" class="h-10 rounded-[10px] px-2.5 text-xs font-bold text-task-blue transition hover:bg-task-blueSoft" @click="teamDepartmentFilter = 'all'; teamRoleFilter = 'all'; teamSort = 'name_asc'; workloadFilter = 100; teamPage = 1">Reset</button>
                  <button v-if="canManageMembers" class="tf-primary h-10 rounded-[11px] px-4 text-xs" @click="openModal('member')"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('users')" /><path d="M19 8v6m-3-3h6" /></svg>Add Member</button>
              </div>
            </div>
            <div v-if="searchLoading.team" class="tf-search-overlay"><span class="tf-search-loader" /> Searching staff...</div>
            <div class="overflow-x-auto"><table class="w-full min-w-[940px] text-left text-sm"><thead class="border-y border-task-line bg-slate-50/80 text-[11px] uppercase tracking-wide text-task-muted"><tr><th class="p-3 font-semibold"><button type="button" :class="['inline-flex items-center gap-1.5 transition hover:text-task-blue', teamSort.startsWith('name_') ? 'text-task-blue' : '']" @click="toggleTeamSort('name')">Staff <span>{{ teamSort.startsWith('name_') ? (teamSort.endsWith('_asc') ? '↑' : '↓') : '↕' }}</span></button></th><th class="p-3 font-semibold"><button type="button" :class="['inline-flex items-center gap-1.5 transition hover:text-task-blue', teamSort.startsWith('department_') ? 'text-task-blue' : '']" @click="toggleTeamSort('department')">Department <span>{{ teamSort.startsWith('department_') ? (teamSort.endsWith('_asc') ? '↑' : '↓') : '↕' }}</span></button></th><th class="p-3 font-semibold"><button type="button" :class="['inline-flex items-center gap-1.5 transition hover:text-task-blue', teamSort.startsWith('role_') ? 'text-task-blue' : '']" @click="toggleTeamSort('role')">Position <span>{{ teamSort.startsWith('role_') ? (teamSort.endsWith('_asc') ? '↑' : '↓') : '↕' }}</span></button></th><th class="p-3 font-semibold">Contact</th><th class="p-3 font-semibold"><button type="button" :class="['inline-flex items-center gap-1.5 transition hover:text-task-blue', teamSort.startsWith('efficiency_') ? 'text-task-blue' : '']" @click="toggleTeamSort('efficiency')">Efficiency <span>{{ teamSort.startsWith('efficiency_') ? (teamSort.endsWith('_asc') ? '↑' : '↓') : '↕' }}</span></button></th><th class="p-3 font-semibold">Tasks</th><th class="p-3 text-right font-semibold">Actions</th></tr></thead><tbody class="divide-y divide-task-line"><tr v-for="(member, index) in paginatedTeam" :key="String(member[9] || member[7] || member[0])" class="transition hover:bg-task-blueSoft/40"><td class="p-3"><div class="flex items-center gap-3"><span :class="['grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full text-xs font-bold', index % 4 === 0 ? 'bg-task-blueSoft text-task-blue' : index % 4 === 1 ? 'bg-[#F0E9FF] text-[#8057D5]' : index % 4 === 2 ? 'bg-task-warningSoft text-task-warning' : 'bg-task-successSoft text-task-success']"><img v-if="member[8]" :src="String(member[8])" :alt="String(member[0])" class="h-full w-full object-cover" /><span v-else>{{ initials(String(member[0])) }}</span></span><div class="min-w-0"><p class="truncate font-bold text-task-ink">{{ member[0] }}</p><p class="truncate text-xs text-task-muted">{{ member[2] }}</p></div></div></td><td class="p-3"><span class="inline-flex rounded-full bg-task-blueSoft px-2.5 py-1 text-xs font-semibold text-task-blue">{{ memberDepartmentNameOf(member) }}</span></td><td class="max-w-[190px] p-3 text-task-muted">{{ member[1] }}</td><td class="p-3 text-task-muted">{{ member[3] || '—' }}</td><td class="p-3"><div class="min-w-[110px]"><b class="text-xs text-task-ink">{{ member[4] }}%</b><div class="mt-1.5 h-1.5 w-24 overflow-hidden rounded-full bg-slate-200"><div class="h-full rounded-full bg-task-blue" :style="{ width: `${member[4]}%` }" /></div></div></td><td class="p-3"><b class="text-task-ink">{{ Number(member[5] || 0) + Number(member[6] || 0) }} total</b><p class="mt-1 text-[11px] text-task-muted"><span class="text-task-success">{{ member[5] }} ✓</span> · <span class="text-task-blue">{{ member[6] }} active</span></p></td><td class="relative p-3 text-right"><div class="relative inline-flex"><button type="button" class="tf-icon-button rounded-full" @click="toggleActionMenu(`team-${member[9] || member[7] || member[0]}`)"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor"><path :d="iconPath('dots')" /></svg></button><div v-if="actionMenu === `team-${member[9] || member[7] || member[0]}`" class="tf-action-menu"><button type="button" class="tf-action-item" @click="viewMemberProfile(member)">View profile</button><button type="button" class="tf-action-item" @click="updateMemberStatus(member, String(member[12]) === 'Inactive')">{{ String(member[12]) === 'Inactive' ? 'Activate' : 'Deactivate' }}</button><button type="button" class="tf-action-item tf-action-danger" @click="requestMemberRemoval(member)">Remove member</button></div></div></td></tr></tbody></table></div>
            <p v-if="!filteredTeam.length" class="py-10 text-center text-sm text-task-muted">No staff found.</p><div v-if="filteredTeam.length" class="mt-5 flex flex-col items-center justify-between gap-3 border-t border-task-line pt-4 text-xs text-task-muted sm:flex-row"><span>Showing {{ (teamPage - 1) * pageSize + 1 }} to {{ Math.min(teamPage * pageSize, filteredTeam.length) }} of {{ filteredTeam.length }} staff members</span><div v-if="filteredTeam.length > pageSize" class="flex gap-2"><button class="tf-icon-button" @click="setListPage('team', teamPage - 1)">‹</button><button v-for="page in teamPageCount" :key="page" :class="[teamPage === page ? 'tf-primary' : 'tf-icon-button', 'h-9 w-9 p-0']" @click="setListPage('team', page)">{{ page }}</button><button class="tf-icon-button" @click="setListPage('team', teamPage + 1)">›</button></div></div>
          </div>
        </section>

        <section v-else-if="activePage === 'reports'" class="tf-reports-page space-y-5">
          <div class="tf-report-templates grid gap-4 lg:grid-cols-2">
            <article v-for="template in reportTemplates" :key="template.title" :class="['tf-report-template', `is-${template.tone}`]">
              <span class="tf-report-template-icon"><svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path :d="template.icon" /></svg></span>
              <div class="min-w-0 flex-1"><h2 class="text-base font-extrabold text-task-ink">{{ template.title }}</h2><p class="mt-1 max-w-md text-sm leading-5 text-task-muted">{{ template.description }}</p></div>
              <button type="button" class="tf-report-generate" @click="openModal('report'); form.title = template.title; reportType = template.type"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 19h14" /></svg>Generate</button>
            </article>
          </div>

          <div class="tf-panel relative p-4 sm:p-6">
            <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div><div class="flex items-center gap-3"><h2 class="text-xl font-extrabold">Recent Reports</h2><span class="rounded-full bg-task-blueSoft px-2.5 py-1 text-[11px] font-bold text-task-blue">{{ filteredReports.length }}</span></div><p class="mt-1 text-sm text-task-muted">Search, filter and download generated team reports.</p></div>
              <div class="flex flex-wrap items-center gap-2 lg:justify-end">
                <label class="relative w-full sm:w-auto"><svg viewBox="0 0 24 24" class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-task-muted" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('search')" /></svg><input v-model="reportSearchInput" class="tf-input h-11 w-full pl-10 pr-10 sm:w-72" placeholder="Search reports..." /><button v-if="reportSearchInput && !searchLoading.report" type="button" class="tf-search-clear" aria-label="Clear report search" @click="clearSearch('report')">×</button><span v-if="searchLoading.report" class="tf-search-spinner" /></label>
                <div class="tf-dropdown sm:w-40"><button type="button" class="tf-dropdown-button h-11" @click="openDropdown = openDropdown === 'reportStatusFilter' ? null : 'reportStatusFilter'"><span>{{ reportStatusFilter }}</span><svg viewBox="0 0 20 20" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg></button><div v-if="openDropdown === 'reportStatusFilter'" class="tf-dropdown-menu"><button v-for="option in ['All statuses', 'Ready', 'Processing']" :key="option" type="button" class="tf-dropdown-option" @click="reportStatusFilter = option; openDropdown = null"><span>{{ option }}</span><span v-if="reportStatusFilter === option" class="text-task-blue">✓</span></button></div></div>
                <button class="tf-primary h-11 w-full rounded-[12px] px-5 sm:w-auto" @click="openModal('report')"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14" /></svg>Custom Report</button>
              </div>
            </div>
            <div v-if="searchLoading.report" class="tf-search-overlay"><span class="tf-search-loader" /> Searching reports...</div>
            <div class="overflow-x-auto rounded-[16px] border border-task-line">
              <table class="w-full min-w-[820px] text-left text-sm">
                <thead class="bg-slate-50/80 text-task-muted"><tr><th class="p-4 font-semibold">Report Name</th><th class="p-4 font-semibold">Type</th><th class="p-4 font-semibold"><button type="button" class="inline-flex items-center gap-1.5 hover:text-task-blue" @click="reportSort = reportSort === 'newest' ? 'oldest' : 'newest'">Date Generated <span>{{ reportSort === 'newest' ? '↓' : '↑' }}</span></button></th><th class="p-4 font-semibold">Generated By</th><th class="p-4 font-semibold">Status</th><th class="p-4 text-right font-semibold">Action</th></tr></thead>
                <tbody class="divide-y divide-task-line"><tr v-for="(report, index) in paginatedReports" :key="String(report[5] || report[0])" class="transition hover:bg-task-blueSoft/40"><td class="p-4"><div class="flex items-center gap-3"><span :class="['grid h-10 w-10 shrink-0 place-items-center rounded-[12px]', index % 3 === 0 ? 'bg-task-blueSoft text-task-blue' : index % 3 === 1 ? 'bg-[#F0E9FF] text-[#8057D5]' : 'bg-task-successSoft text-task-success']"><svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('file')" /></svg></span><span class="font-bold text-task-ink">{{ report[0] }}</span></div></td><td class="p-4"><span class="rounded-full bg-task-blueSoft px-2.5 py-1 text-xs font-semibold text-task-blue">{{ report[1] }}</span></td><td class="p-4 text-task-muted">{{ report[2] }}</td><td class="p-4 font-medium">{{ report[3] }}</td><td class="p-4"><span :class="['tf-pill', badgeClass(report[4])]">{{ report[4] }}</span></td><td class="p-4 text-right"><button type="button" class="tf-icon-button rounded-[12px]" title="Download report" aria-label="Download report" @click="downloadReport(report)"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" /></svg></button></td></tr></tbody>
              </table>
            </div>
            <div v-if="!filteredReports.length && !searchLoading.report" class="grid min-h-48 place-items-center text-center"><div><span class="mx-auto grid h-12 w-12 place-items-center rounded-[15px] bg-task-blueSoft text-task-blue"><svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('file')" /></svg></span><p class="mt-3 font-bold">No reports found</p><p class="mt-1 text-sm text-task-muted">Create a custom report or try another search.</p></div></div>
            <div v-if="filteredReports.length" class="mt-5 flex flex-col gap-3 text-xs text-task-muted sm:flex-row sm:items-center sm:justify-between"><span>Showing {{ (reportPage - 1) * pageSize + 1 }}–{{ Math.min(reportPage * pageSize, filteredReports.length) }} of {{ filteredReports.length }} reports</span><div v-if="filteredReports.length > pageSize" class="flex gap-2"><button class="tf-icon-button" type="button" @click="setListPage('report', reportPage - 1)">‹</button><button v-for="page in reportPageCount" :key="page" :class="[reportPage === page ? 'tf-primary' : 'tf-icon-button', 'h-9 w-9 p-0']" type="button" @click="setListPage('report', page)">{{ page }}</button><button class="tf-icon-button" type="button" @click="setListPage('report', reportPage + 1)">›</button></div></div>
          </div>
        </section>

        <section v-else-if="activePage === 'notifications'" class="py-1">
          <NotificationsView @navigate="navigateFromNotification" />
        </section>

        <section v-else-if="activePage === 'messages'" :class="['tf-messages-page tf-panel grid h-[calc(100vh-112px)] min-h-[620px] overflow-hidden p-0 lg:grid-cols-[350px_1fr]', selectedConversation ? 'has-active-chat' : '']">
          <aside class="relative flex min-h-0 flex-col border-r border-task-line">
            <div class="shrink-0 p-4">
              <div class="flex items-center gap-3"><div class="grid min-w-0 flex-1 grid-cols-2 gap-2"><button v-for="filter in ['all', 'unread']" :key="filter" type="button" :class="['tf-message-filter', messageFilter === filter ? 'is-active' : '']" @click="messageFilter = filter as 'all' | 'unread'">{{ filter === 'all' ? 'All' : 'Unread' }}<span v-if="filter === 'unread' && conversations.some(item => item.unread_count)">{{ conversations.reduce((sum, item) => sum + Number(item.unread_count || 0), 0) }}</span></button></div><button type="button" class="tf-new-message-button" :title="newConversationOpen ? 'Back to conversations' : 'New message'" :aria-label="newConversationOpen ? 'Back to conversations' : 'New message'" @click="newConversationOpen = !newConversationOpen; messageFilter = 'all'"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4M4 4h7"/></svg></button></div>
              <label v-if="!newConversationOpen" class="relative mt-3 block"><svg viewBox="0 0 24 24" class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-task-muted" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('search')"/></svg><input v-model="messageSearchInput" class="tf-input h-10 w-full pl-10 pr-10" placeholder="Search conversations..." /></label>
            </div>
            <div class="min-h-0 flex-1 overflow-y-auto pb-3">
              <div v-if="newConversationOpen" class="px-3 pb-3"><div class="sticky top-0 z-10 bg-white pb-3"><p class="px-1 text-xs font-extrabold uppercase tracking-[0.12em] text-task-muted">Select a team member</p><label class="relative mt-2 block"><svg viewBox="0 0 24 24" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-task-muted" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('search')"/></svg><input v-model="newConversationSearch" class="tf-input h-10 w-full pl-9" placeholder="Search members..."/></label></div><button v-for="member in messageMemberOptions" :key="teamMemberId(member)" type="button" class="tf-message-contact px-2 py-3" :disabled="conversationCreating" @click="startDirectConversation(member)"><span class="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-task-blueSoft text-xs font-bold text-task-blue"><img v-if="member[8]" :src="absoluteMediaUrl(String(member[8]))" :alt="teamMemberName(member)" class="h-full w-full object-cover"/><span v-else>{{ initials(teamMemberName(member)) }}</span></span><span class="min-w-0 flex-1"><b class="block truncate text-sm">{{ teamMemberName(member) }}</b><small class="mt-1 block truncate text-[11px]">{{ teamMemberEmail(member) }}</small></span><span class="text-task-blue">›</span></button><p v-if="!messageMemberOptions.length" class="px-4 py-10 text-center text-sm text-task-muted">No team members found.</p></div>
              <div v-else-if="conversationsLoading" class="grid h-40 place-items-center"><span class="tf-search-loader"/></div>
              <template v-else>
                <div v-for="conversation in filteredMessages" :key="conversation.id" :class="['tf-message-contact group rounded-none border-t border-task-line px-4 py-4', activeMessage === conversation.id ? 'is-active' : '']" role="button" tabindex="0" @click="openConversation(conversation)" @keydown.enter="openConversation(conversation)">
                  <span class="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-task-blueSoft text-xs font-bold text-task-blue"><img v-if="conversationAvatar(conversation)" :src="conversationAvatar(conversation)" :alt="conversationTitle(conversation)" class="h-full w-full object-cover"/><span v-else>{{ initials(conversationTitle(conversation)) }}</span><i v-if="conversationIsOnline(conversation)" class="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-task-success"/></span>
                  <span class="min-w-0 flex-1"><span class="flex items-center justify-between gap-2"><b class="truncate text-sm">{{ conversationTitle(conversation) }}</b><small>{{ conversation.updated_at ? new Date(conversation.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '' }}</small></span><span class="mt-1 block truncate text-[11px] text-task-muted">{{ conversationLastMessage(conversation) }}</span></span>
                  <i v-if="conversation.unread_count" class="grid h-5 min-w-5 place-items-center rounded-full bg-task-blue px-1 text-[10px] font-bold text-white">{{ conversation.unread_count }}</i>
                  <button type="button" class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-task-muted opacity-0 transition hover:bg-task-dangerSoft hover:text-task-danger group-hover:opacity-100 focus:opacity-100" title="Delete conversation" aria-label="Delete conversation" :disabled="conversationDeleting" @click.stop="deleteConversationItem(conversation)"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5"/></svg></button>
                </div>
                <p v-if="!filteredMessages.length" class="py-10 text-center text-sm text-task-muted">No conversations found.</p>
              </template>
            </div>
          </aside>
          <div class="flex min-h-0 min-w-0 flex-col bg-slate-50/40">
            <template v-if="selectedConversation"><header class="tf-chat-header flex shrink-0 items-center gap-3 border-b border-task-line bg-white px-4"><button type="button" class="tf-chat-back" aria-label="Back to conversations" title="Back to conversations" @click="activeMessage = null"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button><span class="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-task-blueSoft text-xs font-bold text-task-blue"><img v-if="conversationAvatar(selectedConversation)" :src="conversationAvatar(selectedConversation)" :alt="conversationTitle(selectedConversation)" class="h-full w-full object-cover"/><span v-else>{{ initials(conversationTitle(selectedConversation)) }}</span></span><div class="min-w-0 flex-1"><h2 class="truncate text-base font-extrabold">{{ conversationTitle(selectedConversation) }}</h2><p :class="['mt-0.5 flex items-center gap-1.5 text-[11px]', selectedConversationPresence.isOnline || typingUserName ? 'text-task-success' : 'text-task-muted']"><i :class="['h-1.5 w-1.5 rounded-full', selectedConversationPresence.isOnline ? 'bg-task-success' : 'bg-slate-400']"/>{{ selectedConversationPresenceLabel }}</p></div><button type="button" class="tf-icon-button tf-chat-search-button rounded-full" aria-label="Search in conversation" title="Search"><svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg></button><button type="button" class="tf-icon-button tf-chat-menu-button rounded-full" aria-label="Conversation menu" title="More"><svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12h.01M12 12h.01M19 12h.01"/></svg></button></header><div ref="chatBody" class="tf-chat-body min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-7"><div v-if="messagesLoading" class="grid h-full place-items-center"><span class="tf-search-loader"/></div><template v-else><div v-for="message in conversationMessages" :key="message.id" :class="['flex items-end gap-2', messageIsMine(message) ? 'justify-end' : '']"><span v-if="!messageIsMine(message)" class="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-task-blueSoft text-[9px] font-bold text-task-blue"><img v-if="absoluteMediaUrl(message.sender_detail?.avatar)" :src="absoluteMediaUrl(message.sender_detail?.avatar)" :alt="message.sender_detail?.full_name || 'Sender'" class="h-full w-full object-cover"/><span v-else>{{ initials(message.sender_detail?.full_name || 'U') }}</span></span><div :class="['tf-message-stack', messageIsMine(message) ? 'is-mine' : '']"><p v-if="!messageIsMine(message)" class="tf-message-meta">{{ message.sender_detail?.full_name || 'Member' }}</p><p :class="['tf-chat-bubble', messageIsMine(message) ? 'is-outgoing' : 'is-incoming']"><span>{{ message.is_deleted ? 'Message deleted' : message.body }}</span><small class="tf-bubble-time">{{ message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '' }}<b v-if="messageIsMine(message)" :class="['tf-read-check', { 'is-read': messageReadByPeer(message) }]"><svg viewBox="0 0 16 12" aria-hidden="true"><path d="m1 6 3.5 3.5L15 1"/></svg><svg v-if="messageReadByPeer(message)" viewBox="0 0 16 12" aria-hidden="true"><path d="m1 6 3.5 3.5L15 1"/></svg></b></small></p><a v-if="message.attachment" :href="absoluteMediaUrl(message.attachment)" target="_blank" class="mt-2 block"><img v-if="isImageAttachment(message.attachment)" :src="absoluteMediaUrl(message.attachment)" alt="Message attachment" class="max-h-64 max-w-[320px] rounded-xl object-cover shadow-md"/><span v-else class="text-[10px] font-bold text-task-blue">Open attachment</span></a></div></div><p v-if="!conversationMessages.length" class="py-16 text-center text-sm text-task-muted">No messages yet. Start the conversation.</p></template></div><form class="shrink-0 border-t border-task-line bg-white p-4" @submit.prevent="sendMessage"><div class="tf-message-composer"><div v-if="selectedMessageAttachment" class="tf-composer-attachment"><img v-if="messageAttachmentPreview" :src="messageAttachmentPreview" alt="Attachment preview"/><span v-else>📄</span><button type="button" :title="selectedMessageAttachment.name" @click="clearMessageAttachment">×</button></div><input ref="messageAttachmentInput" type="file" class="hidden" @change="sendMessageAttachment"/><button type="button" class="tf-composer-action" aria-label="Attach a file" title="Attach a file" :disabled="messageSending" @click="chooseMessageAttachment"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></button><input v-model="chatDraft" class="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Type a message..."/><button type="button" class="tf-composer-action tf-emoji-action" aria-label="Add emoji" title="Add emoji" :aria-expanded="emojiPickerOpen"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 14.5s1.25 1.75 3.5 1.75 3.5-1.75 3.5-1.75"/><path d="M9 9.25h.01M15 9.25h.01"/></svg></button><button type="submit" class="tf-primary tf-chat-send h-9 rounded-[10px] px-4 text-xs" :disabled="messageSending || (!chatDraft.trim() && !selectedMessageAttachment)"><span>{{ messageSending ? 'Sending...' : 'Send' }}</span><svg v-if="!messageSending" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></button></div></form></template>
            <div v-else class="grid h-full place-items-center p-8 text-center"><div><span class="mx-auto grid h-16 w-16 place-items-center rounded-[20px] bg-task-blueSoft text-task-blue"><svg viewBox="0 0 24 24" class="h-7 w-7" fill="none" stroke="currentColor" stroke-width="1.7"><path :d="iconPath('message')"/></svg></span><h2 class="mt-4 text-lg font-extrabold text-task-ink">Select a conversation</h2><p class="mt-2 text-sm text-task-muted">Choose a team member to view the conversation.</p></div></div>
          </div>
          <div v-if="chatSearchOpen" class="tf-chat-search absolute right-4 top-[76px] z-[91] w-72 rounded-xl border border-task-line bg-white p-2 shadow-xl"><label class="relative block"><svg viewBox="0 0 24 24" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-task-muted" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('search')"/></svg><input v-model="chatSearch" class="tf-input h-10 w-full pl-9 pr-9 text-sm" placeholder="Search in conversation..." autofocus/><button v-if="chatSearch" type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-task-muted" aria-label="Clear chat search" @click="chatSearch = ''">×</button></label></div>
          <div v-if="emojiPickerOpen" class="tf-emoji-picker absolute bottom-20 right-4 z-[90] w-64 rounded-2xl border border-task-line bg-white p-3 shadow-2xl">
            <label class="relative block"><svg viewBox="0 0 24 24" class="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-task-muted" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('search')"/></svg><input v-model="emojiSearch" class="tf-input h-9 w-full pl-9 text-xs" placeholder="Search emoji..." autofocus/></label>
            <div class="mt-2 grid max-h-44 grid-cols-5 gap-1 overflow-y-auto"><button v-for="option in filteredEmojiOptions" :key="option[0]" type="button" class="grid h-9 w-9 place-items-center rounded-lg text-lg transition hover:bg-task-blueSoft" :title="option[1]" @click="addEmojiToMessage(option[0])">{{ option[0] }}</button></div>
            <p v-if="!filteredEmojiOptions.length" class="py-5 text-center text-xs text-task-muted">No emoji found</p>
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

        <section v-else-if="activePage === 'help'" class="tf-help-page space-y-5">
          <header class="tf-help-hero relative overflow-hidden rounded-[22px] px-5 py-10 text-center sm:py-12">
            <div class="relative z-10"><span class="mx-auto grid h-12 w-12 place-items-center rounded-[15px] bg-white text-task-blue shadow-card"><svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.3 2.3 0 1 1 3.7 1.8c-1 .7-1.5 1.1-1.5 2.2M12 17h.01"/></svg></span><h1 class="mt-4 text-3xl font-extrabold tracking-tight text-task-ink">Help & Support</h1><p class="mt-2 text-sm text-task-muted">Find answers, explore resources or connect with our support team.</p><div class="mx-auto mt-6 flex max-w-xl flex-col gap-2 sm:flex-row"><label class="relative flex-1"><svg viewBox="0 0 24 24" class="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-task-muted" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('search')"/></svg><input v-model="helpSearchInput" class="tf-input h-12 w-full rounded-[15px] bg-white pl-11" placeholder="Ask a question..." /></label><button type="button" class="tf-primary h-12 rounded-[15px] px-7" @click="openFaq = filteredFaqs[0]?.index ?? null"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path :d="iconPath('search')"/></svg>Search</button></div></div>
          </header>

          <div class="grid gap-4 lg:grid-cols-3">
            <article class="tf-help-contact is-blue"><span class="tf-help-contact-icon"><svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 5h18v14H3V5Zm1 1 8 7 8-7"/></svg></span><h2>Email Support</h2><p>hello.confidency@gmail.com<br>Response within 24 hours</p><a class="tf-help-contact-action" href="mailto:hello.confidency@gmail.com">Get Support</a></article>
            <article class="tf-help-contact is-violet"><span class="tf-help-contact-icon"><svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12a8 8 0 0 1-8 8H6l-4 2 1.3-4A8 8 0 1 1 21 12Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></svg></span><h2>Live Chat</h2><p>Chat with our support team<br>Available Mon–Fri, 9AM–6PM</p><button type="button" class="tf-help-contact-action" @click="supportWidgetOpen = true">Get Support</button></article>
            <article class="tf-help-contact is-green"><span class="tf-help-contact-icon"><svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 3h4l2 5-2.5 1.5a15 15 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2C10.2 21 3 13.8 3 5a2 2 0 0 1 2-2Z"/></svg></span><h2>Phone Support</h2><p>+998 91 638 31 91<br>Available Mon–Fri, 9AM–6PM</p><a class="tf-help-contact-action" href="tel:+998916383191">Get Support</a></article>
          </div>

          <div>
            <section class="tf-panel p-4 sm:p-5"><div class="mb-4 flex items-center gap-3"><span class="grid h-9 w-9 place-items-center rounded-full bg-task-blueSoft text-task-blue">?</span><h2 class="text-lg font-extrabold">Frequently Asked Questions</h2></div><div class="space-y-2"><article v-for="faq in filteredFaqs" :key="faq.question" class="overflow-hidden rounded-[13px] border border-task-line"><button type="button" class="flex w-full items-center justify-between gap-4 px-4 py-4 text-left text-sm font-bold transition hover:bg-task-blueSoft/50" @click="openFaq = openFaq === faq.index ? null : faq.index"><span>{{ faq.question }}</span><svg viewBox="0 0 20 20" :class="['h-4 w-4 shrink-0 text-task-muted transition', openFaq === faq.index ? 'rotate-180' : '']" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5"/></svg></button><p v-if="openFaq === faq.index" class="border-t border-task-line px-4 py-4 text-sm leading-6 text-task-muted">{{ faq.answer }}</p></article><p v-if="!filteredFaqs.length" class="py-10 text-center text-sm text-task-muted">No matching questions found.</p></div></section>
          </div>
        </section>
      </div>
    </section>

    <div v-if="modal" class="fixed inset-0 z-50 grid place-items-center bg-slate-900/45 p-3 backdrop-blur-[2px] sm:p-6" @click.self="closeModalFromBackdrop">
      <div :class="['tf-app-modal flex max-h-[calc(100vh-24px)] w-full flex-col overflow-hidden rounded-[22px] border border-white/70 bg-[#E3EAF2] shadow-[0_30px_90px_-20px_rgba(15,23,42,0.45)] sm:max-h-[calc(100vh-48px)]', modal === 'project' ? 'tf-project-modal max-w-[600px]' : modal === 'task' ? 'max-w-[620px]' : modal === 'member' ? 'tf-member-modal max-w-[760px]' : modal === 'member-remove' ? 'max-w-[660px]' : modal === 'event' || modal === 'event-detail' || modal === 'report' ? 'max-w-[620px]' : 'max-w-[520px]']" @click.capture="handleModalCloseCapture" @keydown="handleModalKeydown">
        <div class="flex shrink-0 items-center justify-between px-5 py-3.5 sm:px-6 sm:py-4"><h2 class="text-[21px] font-semibold tracking-[-0.025em] sm:text-[22px]">{{ modal === 'task' ? (taskModalMode === 'view' ? 'Task Details' : taskModalMode === 'edit' ? 'Edit Task' : 'Create Task') : modal === 'project' ? 'Create New Project' : modal === 'event' ? (editingEventId ? 'Edit Event' : 'Add New Event') : modal === 'event-detail' ? 'Event Details' : modal === 'event-delete' ? 'Delete Event' : modal === 'report' ? 'Custom Report Builder' : modal === 'member' ? (editingMemberId ? 'Edit Department Member' : 'Add Department Member') : modal === 'member-profile' ? 'Staff Profile' : modal === 'member-remove' ? 'Remove Member' : modal === 'analytics-user-tasks' ? `${selectedAnalyticsStaff?.name || 'Staff'} Tasks` : modal === 'logout' ? 'Log out' : 'Filter Staff' }}</h2><button type="button" class="grid h-9 w-9 place-items-center rounded-full text-[28px] font-light leading-none transition hover:bg-white/60 hover:text-task-blue" aria-label="Close modal" @click="modal === 'event-delete' ? cancelEventDelete() : modal = null">×</button></div>
        <div :class="['min-h-0 overflow-y-auto bg-white', modal === 'project' || modal === 'task' ? 'mx-3 mb-3 rounded-[18px] p-5' : 'mx-2 mb-2 rounded-[16px] p-4', modal === 'member' ? 'tf-member-modal-body' : '']">
          <template v-if="modal === 'logout'">
            <div class="flex gap-4 rounded-[14px] border border-task-danger/20 bg-task-dangerSoft/60 p-4">
              <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-task-danger shadow-sm">
                <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17l5-5-5-5m5 5H3m6-9h10v18H9" /></svg>
              </span>
              <div><h3 class="text-lg font-bold text-task-ink">Are you sure you want to log out?</h3><p class="mt-1.5 text-sm leading-6 text-task-muted">You will need to sign in again to access your TaskFlow workspace.</p></div>
            </div>
          </template>
          <template v-else-if="modal === 'member-profile' && selectedTeamMember">
            <div class="flex flex-col items-center text-center"><span class="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-task-blueSoft text-xl font-bold text-task-blue"><img v-if="selectedTeamMember[8]" :src="String(selectedTeamMember[8])" :alt="teamMemberName(selectedTeamMember)" class="h-full w-full object-cover" /><span v-else>{{ initials(teamMemberName(selectedTeamMember)) }}</span></span><h3 class="mt-3 text-xl font-bold text-task-ink">{{ teamMemberName(selectedTeamMember) }}</h3><p class="mt-1 text-sm text-task-muted">{{ selectedTeamMember[1] || 'Team member' }}</p><span :class="['mt-2 rounded-full px-3 py-1 text-xs font-bold', String(selectedTeamMember[12]) === 'Inactive' ? 'bg-slate-100 text-slate-500' : 'bg-task-successSoft text-task-success']">{{ selectedTeamMember[12] || 'Active' }}</span></div>
            <div class="mt-5 grid gap-3 sm:grid-cols-2"><div class="rounded-[12px] bg-slate-50 p-3"><p class="text-[10px] font-bold uppercase tracking-wide text-task-muted">Department</p><p class="mt-1.5 text-sm font-semibold text-task-ink">{{ memberDepartmentNameOf(selectedTeamMember) }}</p></div><div class="rounded-[12px] bg-slate-50 p-3"><p class="text-[10px] font-bold uppercase tracking-wide text-task-muted">Email</p><p class="mt-1.5 truncate text-sm font-semibold text-task-ink">{{ selectedTeamMember[2] }}</p></div><div class="rounded-[12px] bg-slate-50 p-3"><p class="text-[10px] font-bold uppercase tracking-wide text-task-muted">Phone</p><p class="mt-1.5 text-sm font-semibold text-task-ink">{{ selectedTeamMember[3] }}</p></div><div class="rounded-[12px] bg-slate-50 p-3"><p class="text-[10px] font-bold uppercase tracking-wide text-task-muted">Efficiency</p><p class="mt-1.5 text-sm font-semibold text-task-ink">{{ selectedTeamMember[4] }}%</p></div></div>
            <div class="mb-3 mt-3 grid grid-cols-2 gap-3"><div class="rounded-[12px] border border-task-line p-3 text-center"><p class="text-xl font-bold text-task-success">{{ selectedTeamMember[5] }}</p><p class="mt-1 text-xs text-task-muted">Completed tasks</p></div><div class="rounded-[12px] border border-task-line p-3 text-center"><p class="text-xl font-bold text-task-blue">{{ selectedTeamMember[6] }}</p><p class="mt-1 text-xs text-task-muted">In progress</p></div></div>
          </template>
          <template v-else-if="modal === 'analytics-user-tasks' && selectedAnalyticsStaff">
            <div class="flex items-center gap-3 border-b border-task-line pb-4">
              <span class="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-task-blueSoft text-sm font-bold text-task-blue"><span>{{ initials(selectedAnalyticsStaff.name) }}</span><img v-if="selectedAnalyticsStaff.avatar" :src="selectedAnalyticsStaff.avatar" :alt="selectedAnalyticsStaff.name" class="absolute inset-0 h-full w-full object-cover" /></span>
              <div class="min-w-0"><h3 class="truncate font-bold text-task-ink">{{ selectedAnalyticsStaff.name }}</h3><p class="truncate text-xs text-task-muted">{{ selectedAnalyticsStaff.role }} · {{ selectedAnalyticsStaff.department }}</p></div>
              <span class="ml-auto rounded-full bg-task-blueSoft px-3 py-1 text-xs font-bold text-task-blue">{{ analyticsUserTasks.length }} tasks</span>
            </div>
            <div v-if="analyticsUserTasks.length" class="mt-3 space-y-2">
              <button v-for="task in analyticsUserTasks" :key="String(task[6] || task[0])" type="button" class="flex w-full items-center gap-3 rounded-[13px] border border-task-line p-3 text-left transition hover:border-task-blue hover:bg-task-blueSoft/40" @click="openAnalyticsTaskDetails(task)">
                <span :class="['h-2.5 w-2.5 shrink-0 rounded-full', String(task[3]).toLowerCase() === 'completed' ? 'bg-task-success' : String(task[3]).toLowerCase() === 'overdue' ? 'bg-task-danger' : 'bg-task-blue']" />
                <span class="min-w-0 flex-1"><b class="block truncate text-sm text-task-ink">{{ task[0] }}</b><small class="mt-1 block text-xs text-task-muted">{{ task[3] || 'Not started' }} · Due {{ task[4] || '—' }}</small></span>
                <span class="text-lg text-task-muted">›</span>
              </button>
            </div>
            <div v-else class="mt-4 rounded-[14px] border border-dashed border-task-line py-10 text-center"><p class="font-bold text-task-ink">No tasks found</p><p class="mt-1 text-sm text-task-muted">This staff member has no assigned tasks.</p></div>
          </template>
          <template v-else-if="modal === 'member-remove' && selectedTeamMember">
            <p class="text-lg font-bold leading-7 text-task-ink sm:text-xl">Are you sure you want to remove this member<br class="hidden sm:block" /> from the <span class="text-task-blue">{{ memberDepartmentNameOf(selectedTeamMember) }}</span> department?</p>
            <div class="tf-member-remove-card mt-5 flex items-center gap-4 rounded-[14px] border border-task-line bg-slate-50/70 p-4">
              <span class="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-task-blueSoft text-base font-bold text-task-blue"><img v-if="selectedTeamMember[8]" :src="String(selectedTeamMember[8])" :alt="teamMemberName(selectedTeamMember)" class="h-full w-full object-cover" /><span v-else>{{ initials(teamMemberName(selectedTeamMember)) }}</span></span>
              <div class="min-w-0"><h3 class="truncate text-lg font-bold text-task-ink">{{ teamMemberName(selectedTeamMember) }}</h3><p class="mt-0.5 truncate text-sm text-task-muted">{{ selectedTeamMember[1] || 'Team member' }}</p><p class="mt-2 flex items-center gap-2 truncate text-sm font-medium text-task-blue"><svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18v12H3V6Zm0 1 9 7 9-7" /></svg>{{ selectedTeamMember[2] }}</p></div>
            </div>
            <div class="tf-member-remove-warning mt-4 flex gap-3 rounded-[14px] border border-task-danger/25 bg-task-dangerSoft/60 p-4"><svg viewBox="0 0 24 24" class="mt-0.5 h-5 w-5 shrink-0 text-task-danger" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4m0 4h.01M4.5 19h15L12 4 4.5 19Z" /></svg><p class="text-sm leading-6 text-task-muted">This will remove <b class="text-task-ink">{{ teamMemberName(selectedTeamMember) }}</b> from the {{ memberDepartmentNameOf(selectedTeamMember) }} department.<br />Their TaskFlow account and task history will not be deleted.</p></div>
            <div class="mt-4 flex items-center gap-3 rounded-[14px] border border-task-line px-4 py-3.5"><svg viewBox="0 0 24 24" class="h-5 w-5 shrink-0 text-task-blue" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></svg><p class="min-w-0 flex-1 text-sm text-task-muted"><b class="text-task-ink">{{ Number(selectedTeamMember[6] || 0) }}</b> active tasks are currently assigned to this member.</p><button type="button" class="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-task-blue transition hover:translate-x-0.5" @click="viewSelectedMemberTasks">View tasks <span aria-hidden="true">→</span></button></div>
          </template>
          <template v-else-if="modal === 'event-detail' && selectedCalendarEvent">
            <div class="flex items-start gap-3 border-b border-task-line pb-3"><span :class="['grid h-12 w-12 shrink-0 place-items-center rounded-full text-center text-[11px] font-bold text-white', selectedCalendarEvent.color]">{{ String(selectedCalendarEvent.day).padStart(2, '0') }}<br />{{ selectedCalendarEvent.meridiem }}</span><div><h3 class="text-lg font-bold text-task-ink">{{ selectedCalendarEvent.title }}</h3><span class="mt-1.5 inline-flex rounded-full bg-task-blueSoft px-3 py-1 text-xs font-semibold text-task-blue">{{ selectedCalendarEvent.eventType }}</span></div></div>
            <div class="mt-4 grid gap-3 sm:grid-cols-2"><div class="rounded-ui bg-slate-100 p-3"><p class="text-xs font-semibold uppercase tracking-wide text-task-muted">Date</p><p class="mt-1.5 text-sm font-semibold text-task-ink">{{ eventFullDate(selectedCalendarEvent) }}</p></div><div class="rounded-ui bg-slate-100 p-3"><p class="text-xs font-semibold uppercase tracking-wide text-task-muted">Time</p><p class="mt-1.5 text-sm font-semibold text-task-ink">{{ selectedCalendarEvent.time }}</p></div></div>
            <div class="mt-4 rounded-ui border border-task-line p-4"><div class="flex items-center justify-between gap-3"><p class="font-bold text-task-ink">Assigned attendees</p><span class="shrink-0 rounded-full bg-task-blue px-3 py-1 text-xs font-bold text-white">{{ selectedCalendarEvent.attendees }} people</span></div><div v-if="selectedCalendarEvent.attendeeNames.length" class="mt-3 flex flex-wrap gap-2"><span v-for="name in selectedCalendarEvent.attendeeNames" :key="name" class="inline-flex items-center gap-2 rounded-full border border-task-line bg-task-blueSoft px-3 py-2 text-sm font-semibold text-task-ink"><span class="grid h-7 w-7 place-items-center rounded-full bg-task-blue text-[10px] font-bold text-white">{{ initials(name) }}</span>{{ name }}</span></div><p v-else class="mt-3 text-sm text-task-muted">No attendees assigned.</p></div>
            <div v-if="selectedCalendarEvent.description" class="mt-4"><p class="font-bold text-task-ink">Description</p><p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-task-muted">{{ selectedCalendarEvent.description }}</p></div><a v-if="selectedCalendarEvent.meetingUrl" :href="selectedCalendarEvent.meetingUrl" target="_blank" rel="noopener" class="mt-4 inline-flex text-sm font-semibold text-task-blue">Open meeting link ↗</a>
          </template>
          <template v-else-if="modal === 'event-delete' && selectedCalendarEvent">
            <div class="text-center">
              <span class="mx-auto grid h-20 w-20 place-items-center rounded-full bg-task-dangerSoft text-task-danger ring-8 ring-task-dangerSoft/50"><svg viewBox="0 0 24 24" class="h-9 w-9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" /></svg></span>
              <h3 class="mt-5 text-xl font-extrabold text-task-ink">Remove this event?</h3>
              <p class="mx-auto mt-2 max-w-sm text-sm leading-6 text-task-muted">This action cannot be undone. The event will disappear from the calendar for every assigned attendee.</p>
            </div>
            <div class="mt-5 rounded-[16px] border border-task-danger/20 bg-task-dangerSoft/50 p-4"><div class="flex items-center gap-3"><span :class="['grid h-12 w-12 shrink-0 place-items-center rounded-[13px] text-center text-[10px] font-bold text-white', selectedCalendarEvent.color]">{{ String(selectedCalendarEvent.day).padStart(2, '0') }}<br />{{ selectedCalendarEvent.meridiem }}</span><div class="min-w-0"><p class="truncate font-bold text-task-ink">{{ selectedCalendarEvent.title }}</p><p class="mt-1 text-xs text-task-muted">{{ eventFullDate(selectedCalendarEvent) }} · {{ selectedCalendarEvent.time }}</p></div></div></div>
          </template>
          <template v-else-if="modal === 'team-filter'">
            <div class="grid gap-4 md:grid-cols-2"><label v-for="field in [['Department','department'],['Role','role'],['Skills','skills'],['Status','status']]" :key="field[1]">{{ field[0] }}<div class="tf-dropdown mt-2"><button type="button" class="tf-dropdown-button" @click="openDropdown = openDropdown === field[1] ? null : String(field[1])"><span>{{ dropdownValues[String(field[1])] }}</span><svg viewBox="0 0 20 20" class="h-4 w-4 shrink-0 text-task-muted transition" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg></button><div v-if="openDropdown === field[1]" class="tf-dropdown-menu"><button v-for="option in dropdownOptions[String(field[1])]" :key="option" type="button" class="tf-dropdown-option" @click="setDropdownValue(String(field[1]), option)"><span>{{ option }}</span><span v-if="dropdownValues[String(field[1])] === option">✓</span></button></div></div></label></div><div class="mt-5 rounded-ui bg-slate-100 p-4"><p class="font-bold">Workload</p><input v-model.number="workloadFilter" type="range" min="0" max="100" class="mt-3 w-full accent-task-blue" /><div class="flex justify-between text-sm text-task-muted"><span>0%</span><span>Current: {{ workloadFilter }}%</span><span>100%</span></div></div>
          </template>
          <template v-else-if="modal === 'member'">
            <div class="grid gap-4 sm:grid-cols-2"><label class="block text-sm font-semibold">First Name<input v-model="memberFirstName" class="tf-input mt-2 h-12 w-full" placeholder="Enter first name" autocomplete="given-name" /></label><label class="block text-sm font-semibold">Last Name<input v-model="memberLastName" class="tf-input mt-2 h-12 w-full" placeholder="Enter last name" autocomplete="family-name" /></label></div>
            <div class="mt-4 grid gap-4 sm:grid-cols-2"><label class="block text-sm font-semibold">Email Address <span class="text-task-danger">*</span><input v-model="memberEmail" type="email" class="tf-input mt-2 h-12 w-full" placeholder="ali@example.com" autocomplete="email" required /></label>
            <template v-if="!editingMemberId">
            <label class="block text-sm font-semibold">Username <span class="text-task-danger">*</span><input v-model="memberUsername" class="tf-input mt-2 h-12 w-full" placeholder="Enter username" autocomplete="username" required /></label>
            </template>
            </div>
            <div v-if="!editingMemberId" class="mt-4 grid gap-4 sm:grid-cols-2">
              <label class="block text-sm font-semibold">Password <span class="text-task-danger">*</span><span class="relative mt-2 block"><input v-model="memberPassword" :type="showMemberPassword ? 'text' : 'password'" class="tf-input h-12 w-full pr-12" placeholder="Minimum 8 characters" autocomplete="new-password" required /><button type="button" class="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-task-muted transition hover:bg-task-blueSoft hover:text-task-blue" :aria-label="showMemberPassword ? 'Hide password' : 'Show password'" @click="showMemberPassword = !showMemberPassword"><svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /><path v-if="showMemberPassword" d="m4 4 16 16" /></svg></button></span></label>
              <label class="block text-sm font-semibold">Confirm Password <span class="text-task-danger">*</span><span class="relative mt-2 block"><input v-model="memberPasswordConfirm" :type="showMemberPasswordConfirm ? 'text' : 'password'" class="tf-input h-12 w-full pr-12" placeholder="Repeat password" autocomplete="new-password" required /><button type="button" class="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-task-muted transition hover:bg-task-blueSoft hover:text-task-blue" :aria-label="showMemberPasswordConfirm ? 'Hide password' : 'Show password'" @click="showMemberPasswordConfirm = !showMemberPasswordConfirm"><svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /><path v-if="showMemberPasswordConfirm" d="m4 4 16 16" /></svg></button></span></label>
            </div>
            <div class="mt-4 grid gap-4 sm:grid-cols-2"><label class="block text-sm font-semibold">Phone<input v-model="memberPhone" type="tel" class="tf-input mt-2 h-12 w-full" placeholder="+998 90 123 45 67" autocomplete="tel" /></label><label class="block text-sm font-semibold">Job Title<input v-model="memberJobTitle" class="tf-input mt-2 h-12 w-full" placeholder="e.g. Designer" autocomplete="organization-title" /></label></div>
            <div class="mt-4 text-sm font-semibold">Avatar <span class="font-normal text-task-muted">(optional)</span><input ref="memberAvatarInput" class="hidden" type="file" accept="image/*" @change="handleMemberAvatar" /><div class="mt-2 flex items-center gap-4 rounded-ui border border-task-line p-3"><button type="button" class="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-task-blueSoft font-bold text-task-blue" aria-label="Choose avatar" @click="chooseMemberAvatar"><img v-if="memberAvatarPreview" :src="memberAvatarPreview" alt="Member avatar preview" class="h-full w-full object-cover" /><span v-else>Photo</span></button><div class="min-w-0 flex-1"><p class="truncate text-sm font-semibold">{{ memberAvatarFile?.name || 'No image selected' }}</p><p class="mt-1 text-xs font-normal text-task-muted">PNG, JPG, WEBP — maximum 5 MB</p><div class="mt-2 flex gap-3"><button type="button" class="text-xs font-semibold text-task-blue" @click="chooseMemberAvatar">Choose file</button><button v-if="memberAvatarFile" type="button" class="text-xs font-semibold text-task-danger" @click="removeMemberAvatar">Remove</button></div></div></div></div>
            <div class="mt-4 grid gap-4 sm:grid-cols-2"><label class="block text-sm font-semibold">Department <span class="text-task-danger">*</span><div class="tf-dropdown mt-2"><button type="button" class="tf-dropdown-button h-12" @click="openDropdown = openDropdown === 'memberDepartment' ? null : 'memberDepartment'"><span class="truncate">{{ memberDepartmentsLoading ? 'Loading departments...' : memberDepartmentOptions.find((department) => department.id === memberDepartment)?.name || 'Select department' }}</span><svg viewBox="0 0 20 20" :class="['h-4 w-4 shrink-0 text-task-muted transition-transform', openDropdown === 'memberDepartment' ? 'rotate-180' : '']" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg></button><div v-if="openDropdown === 'memberDepartment'" class="tf-dropdown-menu max-h-56 overflow-y-auto"><p v-if="memberDepartmentsLoading" class="px-3 py-3 text-sm font-normal text-task-muted">Loading departments...</p><button v-for="department in memberDepartmentOptions" :key="department.id" type="button" class="tf-dropdown-option" @click="memberDepartment = department.id; openDropdown = null"><span>{{ department.name }}</span><span v-if="memberDepartment === department.id" class="text-task-blue">✓</span></button><p v-if="!memberDepartmentsLoading && !memberDepartmentOptions.length" class="px-3 py-3 text-sm font-normal text-task-muted">No departments available</p></div></div></label><label class="block text-sm font-semibold">Role<div class="tf-dropdown mt-2"><button type="button" class="tf-dropdown-button h-12" @click="openDropdown = openDropdown === 'memberRole' ? null : 'memberRole'"><span class="capitalize">{{ memberRole }}</span><svg viewBox="0 0 20 20" :class="['h-4 w-4 text-task-muted transition-transform', openDropdown === 'memberRole' ? 'rotate-180' : '']" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg></button><div v-if="openDropdown === 'memberRole'" class="tf-dropdown-menu tf-member-role-menu"><button v-for="role in memberRoleOptions" :key="role" type="button" class="tf-dropdown-option capitalize" @click="memberRole = role; openDropdown = null"><span>{{ role }}</span><span v-if="memberRole === role" class="text-task-blue">✓</span></button></div></div></label></div>
            <label class="mb-5 mt-4 flex items-center justify-between gap-4 rounded-ui border border-task-line px-4 py-3 text-sm font-semibold"><span><span class="block">Active member</span><span class="mt-0.5 block text-xs font-normal text-task-muted">Allow this member to sign in immediately.</span></span><input v-model="memberIsActive" type="checkbox" class="h-5 w-5 accent-task-blue" /></label>
          </template>
          <template v-else-if="modal === 'task'">
            <section v-if="false" class="mb-4 overflow-hidden rounded-[16px] border border-[#C9B7FF] bg-gradient-to-br from-[#F8F5FF] via-white to-task-blueSoft/60 shadow-sm">
              <button type="button" class="flex w-full items-center gap-3 px-4 py-3.5 text-left" @click="aiTaskAssistantOpen = !aiTaskAssistantOpen">
                <span class="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-gradient-to-br from-[#8B5CF6] to-task-blue text-white shadow-button"><svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z"/><path d="m18.5 14 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"/></svg></span>
                <span class="min-w-0 flex-1"><b class="block text-sm text-task-ink">Create with AI</b><small class="mt-0.5 block text-[11px] text-task-muted">Write or speak naturally — get a ready-to-review task draft.</small></span>
                <svg viewBox="0 0 20 20" :class="['h-4 w-4 text-task-muted transition-transform', aiTaskAssistantOpen ? 'rotate-180' : '']" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg>
              </button>
              <div v-if="aiTaskAssistantOpen" class="border-t border-[#DDD2FF] px-4 pb-4 pt-3">
                <label class="text-xs font-bold text-task-ink">Tell the assistant what you need</label>
                <div class="relative mt-2">
                  <textarea v-model="aiTaskPrompt" class="tf-input h-28 w-full resize-none py-3 pl-3 pr-12 leading-5" placeholder="Masalan: Dilafruzga landing page dizaynini juma kunigacha tayyorlash taskini ber, priority high." />
                  <button type="button" :class="['absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-[11px] transition', aiTaskListening ? 'animate-pulse bg-task-danger text-white' : 'bg-task-blueSoft text-task-blue hover:bg-task-blue hover:text-white']" :aria-label="aiTaskListening ? 'Stop listening' : 'Speak task request'" @click="toggleSmartTaskVoice"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3m-4 0h8"/></svg></button>
                </div>
                <p v-if="aiTaskListening" class="mt-2 text-xs font-semibold text-task-danger">Listening… gapirishingiz mumkin.</p>
                <p v-if="aiTaskError" class="mt-2 text-xs font-semibold text-task-danger">{{ aiTaskError }}</p>
                <div class="mt-3 flex items-center justify-between gap-3"><small class="text-[10px] leading-4 text-task-muted">Local smart draft · Always review before creating.</small><button type="button" class="tf-primary h-10 shrink-0 rounded-[11px] px-4 text-xs" @click="generateSmartTaskDraft"><span>✦</span> Generate draft</button></div>
                <div v-if="aiTaskDraft" class="mt-4 rounded-[14px] border border-task-line bg-white p-3.5 shadow-sm">
                  <div class="flex items-start justify-between gap-3"><div><p class="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#7C3AED]">Draft preview</p><h3 class="mt-1 text-sm font-bold text-task-ink">{{ aiTaskDraft.title }}</h3></div><span :class="['tf-pill shrink-0', badgeClass(aiTaskDraft.priority)]">{{ aiTaskDraft.priority }}</span></div>
                  <div class="mt-3 grid gap-2 text-[11px] sm:grid-cols-2">
                    <p class="rounded-[9px] bg-slate-50 px-3 py-2 text-task-muted"><b class="text-task-ink">Assignee:</b> {{ aiTaskDraft.assigneeName || 'Select manually' }}</p>
                    <p class="rounded-[9px] bg-slate-50 px-3 py-2 text-task-muted"><b class="text-task-ink">Due:</b> {{ aiTaskDraft.dueDate }}</p>
                    <p class="rounded-[9px] bg-slate-50 px-3 py-2 text-task-muted"><b class="text-task-ink">Department:</b> {{ aiTaskDraft.departmentName }}</p>
                    <p class="rounded-[9px] bg-slate-50 px-3 py-2 text-task-muted"><b class="text-task-ink">Category:</b> {{ aiTaskDraft.category || 'General' }}</p>
                  </div>
                  <div class="mt-3 flex justify-end"><button type="button" class="inline-flex h-10 items-center gap-2 rounded-[11px] bg-task-success px-4 text-xs font-bold text-white shadow-sm transition hover:brightness-95" @click="applySmartTaskDraft"><span>✓</span> Apply to task</button></div>
                </div>
              </div>
            </section>
            <div v-if="taskModalMode === 'view' && openedTask" class="mb-4 rounded-[12px] border border-task-line bg-slate-50 px-4 py-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-task-muted">Created by</p>
              <div class="mt-2 flex items-center gap-3">
                <span class="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-task-blueSoft text-xs font-bold text-task-blue">
                  <img v-if="taskCreatorAvatarOf(openedTask)" :src="taskCreatorAvatarOf(openedTask)" :alt="taskCreatorNameOf(openedTask)" class="h-full w-full object-cover" />
                  <span v-else>{{ initials(taskCreatorNameOf(openedTask)) }}</span>
                </span>
                <span class="font-semibold text-task-ink">{{ taskCreatorNameOf(openedTask) }}</span>
              </div>
            </div>
            <label class="block text-sm font-semibold">
              Task Title
              <input v-model="form.title" class="tf-input mt-2 h-12 w-full" placeholder="Enter task title" />
            </label>
            <label class="mt-4 block text-sm font-semibold">
              Assignee
              <div ref="taskAssigneePicker" class="tf-dropdown mt-2">
                <input
                  ref="taskAssigneeInput"
                  v-model="taskAssigneeSearch"
                  class="tf-input h-12 w-full pr-11"
                  placeholder="Start typing a name or surname..."
                  autocomplete="off"
                  @focus="openDropdown = 'taskAssignee'; loadTaskAssignees(taskAssigneeSearch)"
                  @input="openDropdown = 'taskAssignee'"
                />
                <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-task-muted transition hover:text-task-blue" aria-label="Show team members" @click="toggleTaskAssigneeDropdown">
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
                  <p v-if="!taskAssigneesLoading && !filteredTaskAssignees.length" class="px-3 py-3 text-sm text-task-muted">No active team member found</p>
                </div>
              </div>
              <Transition name="assignee-confirm">
                <div v-if="taskAssigneeConfirmation" class="mt-2 inline-flex items-center gap-2 rounded-[9px] border border-task-success/25 bg-task-successSoft px-3 py-2 text-xs font-bold text-task-success">
                  <span class="grid h-5 w-5 place-items-center rounded-full bg-task-success text-[11px] text-white">✓</span>
                  {{ taskAssigneeConfirmation }}
                </div>
              </Transition>
              <div v-if="taskAssigneeLabels.length" class="mt-3 flex flex-wrap gap-2">
                <span v-for="(member, index) in taskAssigneeLabels" :key="`${member}-${taskAssigneeIds[index]}`" class="inline-flex h-10 items-center gap-2 rounded-full border border-[#B9C8D8] bg-task-blueSoft pl-2 pr-3 text-sm font-semibold text-task-ink">
                  <span class="grid h-7 w-7 place-items-center rounded-full bg-white text-[9px] font-bold text-task-blue">{{ initials(member) }}</span>
                  {{ member }}
                  <span v-if="taskAssigneeIds[index] === taskMainAssigneeId" class="rounded-full bg-task-blue px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">Main</span>
                  <button v-else type="button" class="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-task-blue transition hover:bg-white" :aria-label="`Make ${member} main assignee`" @click="setTaskMainAssignee(index)">Make main</button>
                  <button type="button" class="grid h-5 w-5 place-items-center rounded-full text-lg leading-none text-task-muted transition hover:bg-white hover:text-task-danger" :aria-label="`Remove ${member}`" @click="removeTaskAssignee(index)">×</button>
                </span>
              </div>
            </label>
            <label class="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-[12px] border border-task-line bg-slate-50 px-4 py-3 text-sm" :class="taskModalMode === 'view' ? 'cursor-default opacity-75' : ''">
              <span><span class="block font-semibold text-task-ink">Hide task</span><span class="mt-0.5 block text-xs text-task-muted">Only permitted roles and assigned users can see this task.</span></span>
              <input v-model="taskIsHidden" type="checkbox" class="h-5 w-5 shrink-0 accent-task-blue" :disabled="taskModalMode === 'view'" />
            </label>
            <label class="mt-4 block text-sm font-semibold">
              Project <span class="font-normal text-task-muted">(optional)</span>
              <div class="tf-dropdown mt-2">
                <button type="button" class="tf-dropdown-button h-12" :disabled="taskModalMode === 'view'" @click="openDropdown = openDropdown === 'taskProject' ? null : 'taskProject'">
                  <span class="truncate">{{ taskProjectOptions.find(project => projectIdOf(project) === form.projectId)?.[0] || 'No project' }}</span>
                  <svg viewBox="0 0 20 20" class="h-4 w-4 shrink-0 text-task-muted" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg>
                </button>
                <div v-if="openDropdown === 'taskProject'" class="tf-dropdown-menu max-h-60 overflow-y-auto">
                  <button type="button" class="tf-dropdown-option" @click="form.projectId = ''; openDropdown = null"><span>No project</span><span v-if="!form.projectId">✓</span></button>
                  <button v-for="project in taskProjectOptions" :key="projectIdOf(project)" type="button" class="tf-dropdown-option" @click="form.projectId = projectIdOf(project); openDropdown = null"><span class="truncate">{{ project[0] }}</span><span v-if="form.projectId === projectIdOf(project)">✓</span></button>
                </div>
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
            <label class="mt-4 block text-sm font-semibold">
              Effort Score
              <select v-model.number="form.effortScore" class="tf-input mt-2 h-12 w-full" :disabled="taskModalMode === 'view'">
                <option v-for="option in taskEffortOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
              <span class="mt-1.5 block text-xs font-normal text-task-muted">Estimated effort required to complete this task.</span>
            </label>
            <div class="mt-4 grid gap-4 md:grid-cols-2">
              <label class="text-sm font-semibold">
                Status
                <div class="tf-dropdown mt-2">
                  <button type="button" class="tf-dropdown-button h-12 disabled:cursor-not-allowed disabled:opacity-60" :disabled="!openedTaskCanChangeStatus" @click="openDropdown = openDropdown === 'taskStatus' ? null : 'taskStatus'">
                    <span>{{ taskFormStatus === 'Completed' ? 'Submitted' : taskFormStatus }}</span>
                    <svg viewBox="0 0 20 20" class="h-4 w-4 shrink-0 text-task-muted transition" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg>
                  </button>
                  <div v-if="openDropdown === 'taskStatus'" class="tf-dropdown-menu">
                    <button v-for="option in taskStatusOptions" :key="option" type="button" class="tf-dropdown-option" @click="taskFormStatus = option; openDropdown = null">
                      <span>{{ option === 'Completed' ? 'Submitted' : option }}</span>
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
                      <button v-for="cell in projectDatePickerDays.cells" :key="cell.key" type="button" :class="['h-8 rounded-[8px] text-sm transition', cell.day ? 'hover:bg-task-blueSoft hover:text-task-blue' : 'pointer-events-none', isTodayDatePickerCell(cell.day, cell.month, cell.year) ? 'bg-task-danger font-bold text-white hover:bg-task-danger hover:text-white' : '']" @click="selectProjectDate(cell.day, cell.month, cell.year)">{{ cell.day || '' }}</button>
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
            <label v-if="canChooseDepartment" class="mb-4 block text-sm font-semibold">
              Department <span class="text-task-danger">*</span>
              <div class="tf-dropdown mt-2">
                <button type="button" class="tf-dropdown-button h-12" @click="openDropdown = openDropdown === 'modalDepartment' ? null : 'modalDepartment'"><span class="truncate">{{ memberDepartmentsLoading ? 'Loading departments...' : modalDepartmentName }}</span><svg viewBox="0 0 20 20" :class="['h-4 w-4 shrink-0 text-task-muted transition-transform', openDropdown === 'modalDepartment' ? 'rotate-180' : '']" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg></button>
                <div v-if="openDropdown === 'modalDepartment'" class="tf-dropdown-menu max-h-56 overflow-y-auto"><button v-for="department in memberDepartmentOptions" :key="department.id" type="button" class="tf-dropdown-option" @click="selectModalDepartment(department.id)"><span>{{ department.name }}</span><span v-if="modalDepartment === department.id" class="text-task-blue">✓</span></button><p v-if="!memberDepartmentsLoading && !memberDepartmentOptions.length" class="px-3 py-3 text-sm font-normal text-task-muted">No departments available</p></div>
              </div>
            </label>
            <label class="block text-sm font-semibold">
              Event Title
              <input v-model="form.title" class="tf-input mt-2 h-12 w-full" placeholder="Sprint Planning, Design Review" />
            </label>
            <div class="mt-3 flex flex-col gap-3">
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
                      <button v-for="cell in projectDatePickerDays.cells" :key="cell.key" type="button" :class="['h-8 rounded-[8px] text-sm transition', cell.day ? 'hover:bg-task-blueSoft hover:text-task-blue' : 'pointer-events-none', isTodayDatePickerCell(cell.day, cell.month, cell.year) ? 'bg-task-danger font-bold text-white hover:bg-task-danger hover:text-white' : '']" @click="selectProjectDate(cell.day, cell.month, cell.year)">{{ cell.day || '' }}</button>
                    </div>
                  </div>
                </div>
              </label>
              <div class="text-sm font-semibold">
                Time
                <div class="tf-event-time-range mt-2">
                  <label class="tf-event-time-field">
                    <span>Start time</span>
                    <div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg><input :value="form.eventTime" inputmode="numeric" maxlength="5" placeholder="09:00" aria-label="Event start time" @input="handleEventTimeInput($event, 'eventTime')" @blur="normalizeEventTimeField('eventTime')" /></div>
                  </label>
                  <span class="tf-event-time-arrow" aria-hidden="true">→</span>
                  <label class="tf-event-time-field">
                    <span>End time</span>
                    <div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg><input :value="form.eventEndTime" inputmode="numeric" maxlength="5" placeholder="10:00" aria-label="Event end time" @input="handleEventTimeInput($event, 'eventEndTime')" @blur="normalizeEventTimeField('eventEndTime')" /></div>
                  </label>
                </div>
                <div class="mt-2 flex flex-wrap items-center gap-1.5"><span class="mr-1 text-[11px] font-medium text-task-muted">Quick duration:</span><button v-for="duration in [{ label: '30 min', value: 30 }, { label: '1 hour', value: 60 }, { label: '1.5 hours', value: 90 }, { label: '2 hours', value: 120 }]" :key="duration.value" type="button" class="tf-duration-chip" @click="setEventDuration(duration.value)">{{ duration.label }}</button></div>
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
              <p class="text-sm font-semibold">Assignee</p>
              <div class="relative mt-2"><input v-model="eventAttendeeSearch" class="tf-input h-12 w-full pr-11" placeholder="Start typing a name or surname..." autocomplete="off" @focus="eventAttendeePickerOpen = true" @input="eventAttendeePickerOpen = true" /><button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-task-muted transition hover:text-task-blue" aria-label="Show team members" @click="eventAttendeePickerOpen = !eventAttendeePickerOpen"><svg viewBox="0 0 20 20" :class="['h-4 w-4 transition-transform', eventAttendeePickerOpen ? 'rotate-180' : '']" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg></button></div>
              <div v-if="eventAttendeePickerOpen" class="absolute left-0 right-0 top-[72px] z-[90] rounded-ui border border-task-line bg-white p-3 shadow-xl">
                <div class="max-h-52 overflow-y-auto">
                  <p v-if="eventAttendeesLoading" class="p-3 text-sm text-task-muted">Loading users...</p>
                  <button v-for="member in availableEventAttendees" :key="teamMemberId(member)" type="button" :class="['tf-dropdown-option gap-3', eventAttendeeIds.includes(teamMemberId(member)) ? 'bg-task-blueSoft' : '']" @click="selectEventAttendee(member)">
                    <span class="flex min-w-0 items-center gap-2.5"><span :class="['grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-bold', eventAttendeeIds.includes(teamMemberId(member)) ? 'bg-task-blue text-white' : 'bg-task-blueSoft text-task-blue']">{{ initials(teamMemberName(member)) }}</span><span class="min-w-0 text-left"><span class="block truncate font-semibold"><template v-for="(part, partIndex) in [highlightedSearchText(teamMemberName(member), eventAttendeeSearch)]" :key="partIndex">{{ part.before }}<mark v-if="part.match" class="tf-search-highlight">{{ part.match }}</mark>{{ part.after }}</template></span><span class="block truncate text-[11px] font-normal text-task-muted"><template v-for="(part, partIndex) in [highlightedSearchText(teamMemberEmail(member), eventAttendeeSearch)]" :key="partIndex">{{ part.before }}<mark v-if="part.match" class="tf-search-highlight">{{ part.match }}</mark>{{ part.after }}</template></span></span></span>
                    <span :class="['grid h-6 w-6 shrink-0 place-items-center rounded-[7px] border text-sm font-bold', eventAttendeeIds.includes(teamMemberId(member)) ? 'border-task-blue bg-task-blue text-white' : 'border-task-line bg-white text-transparent']">✓</span>
                  </button>
                  <p v-if="!eventAttendeesLoading && !availableEventAttendees.length" class="p-3 text-sm text-task-muted">No team member found.</p>
                </div>
              </div>
              <Transition name="assignee-confirm"><div v-if="eventAttendeeConfirmation" class="mt-2 inline-flex items-center gap-2 rounded-[9px] border border-task-success/25 bg-task-successSoft px-3 py-2 text-xs font-bold text-task-success"><span class="grid h-5 w-5 place-items-center rounded-full bg-task-success text-[11px] text-white">✓</span>{{ eventAttendeeConfirmation }}</div></Transition>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <span v-for="(member, index) in eventAttendeeLabels" :key="`${member}-${eventAttendeeIds[index]}`" class="inline-flex h-10 items-center gap-2 rounded-full border border-[#B9C8D8] bg-task-blueSoft pl-2 pr-3 text-sm font-semibold text-task-ink">
                  <span class="grid h-7 w-7 place-items-center rounded-full bg-white text-[9px] font-bold text-task-blue">{{ initials(member) }}</span>{{ member }} <button type="button" class="grid h-5 w-5 place-items-center rounded-full text-lg leading-none text-task-muted transition hover:bg-white hover:text-task-danger" :aria-label="`Remove ${member}`" @click="removeEventAttendee(index)">×</button>
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
                      <button v-for="cell in projectDatePickerDays.cells" :key="cell.key" type="button" :class="['h-8 rounded-[8px] text-sm transition', cell.day ? 'hover:bg-task-blueSoft hover:text-task-blue' : 'pointer-events-none', isTodayDatePickerCell(cell.day, cell.month, cell.year) ? 'bg-task-danger font-bold text-white hover:bg-task-danger hover:text-white' : '']" @click="selectProjectDate(cell.day, cell.month, cell.year)">{{ cell.day || '' }}</button>
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
                      <button v-for="cell in projectDatePickerDays.cells" :key="cell.key" type="button" :class="['h-8 rounded-[8px] text-sm transition', cell.day ? 'hover:bg-task-blueSoft hover:text-task-blue' : 'pointer-events-none', isTodayDatePickerCell(cell.day, cell.month, cell.year) ? 'bg-task-danger font-bold text-white hover:bg-task-danger hover:text-white' : '']" @click="selectProjectDate(cell.day, cell.month, cell.year)">{{ cell.day || '' }}</button>
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
                    <button v-for="member in availableProjectMembers" v-else :key="teamMemberId(member)" type="button" class="tf-dropdown-option gap-3" @click="selectProjectMember(member)">
                      <span class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-task-blueSoft text-[10px] font-bold text-task-blue">{{ initials(teamMemberName(member)) }}</span>
                      <span class="min-w-0 flex-1">
                        <span class="block truncate text-sm font-semibold text-task-ink"><template v-for="(part, partIndex) in [highlightedSearchText(teamMemberName(member), projectMemberSearch)]" :key="partIndex">{{ part.before }}<mark v-if="part.match" class="tf-search-highlight">{{ part.match }}</mark>{{ part.after }}</template></span>
                        <span class="block truncate text-xs text-task-muted">{{ teamMemberEmail(member) }}</span>
                      </span>
                      <span class="grid h-6 w-6 shrink-0 place-items-center rounded-[7px] border border-task-line bg-white text-transparent">✓</span>
                    </button>
                    <p v-if="!projectMembersLoading && !availableProjectMembers.length" class="py-6 text-center text-sm text-task-muted">No available members found.</p>
                  </div>
                  </div>
                </div>
                <div v-if="projectMemberLabels.length" class="mt-3 flex flex-wrap gap-2">
                  <span v-for="member in projectMemberLabels" :key="member" class="inline-flex h-10 items-center gap-2 rounded-full border border-[#B9C8D8] bg-task-blueSoft pl-2 pr-3 text-sm font-semibold text-task-ink">
                    <span class="grid h-7 w-7 place-items-center rounded-full bg-white text-[9px] font-bold text-task-blue">{{ initials(member) }}</span>
                    {{ member }}
                    <button type="button" class="grid h-5 w-5 place-items-center rounded-full text-lg leading-none text-task-muted transition hover:bg-white hover:text-task-danger" :aria-label="`Remove ${member}`" @click="removeProjectMember(member)">×</button>
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
              <label class="text-sm font-semibold">Start Date<div class="tf-date-picker relative mt-2"><input v-model="form.startDate" class="tf-input h-12 w-full pr-12" placeholder="DD.MM.YYYY" inputmode="numeric" maxlength="10" @input="handleDateInput($event, 'startDate')" @focus="openDatePicker('startDate')" /><button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-task-muted transition hover:text-task-blue" aria-label="Open start date calendar" @click="openDatePicker('startDate')"><svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 2v4M16 2v4M3 10h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /></svg></button><div v-if="openProjectDatePicker === 'startDate'" class="tf-date-popover"><div class="mb-3 flex items-center justify-between"><b class="text-sm">{{ projectDatePickerDays.label }}</b><div class="flex gap-1"><button type="button" class="tf-icon-button h-8 w-8" @click.stop="moveDatePickerMonth(-1)">‹</button><button type="button" class="tf-icon-button h-8 w-8" @click.stop="moveDatePickerMonth(1)">›</button></div></div><div class="mb-2 grid grid-cols-7 text-center text-[10px] font-semibold text-task-muted"><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span></div><div class="grid grid-cols-7 gap-1"><button v-for="cell in projectDatePickerDays.cells" :key="cell.key" type="button" :class="['h-8 rounded-[8px] text-sm transition', cell.day ? 'hover:bg-task-blueSoft hover:text-task-blue' : 'pointer-events-none', isTodayDatePickerCell(cell.day, cell.month, cell.year) ? 'bg-task-danger font-bold text-white' : '']" @click="selectProjectDate(cell.day, cell.month, cell.year)">{{ cell.day || '' }}</button></div></div></div></label>
              <label class="text-sm font-semibold">End Date<div class="tf-date-picker relative mt-2"><input v-model="form.dueDate" class="tf-input h-12 w-full pr-12" placeholder="DD.MM.YYYY" inputmode="numeric" maxlength="10" @input="handleDateInput($event, 'dueDate')" @focus="openDatePicker('dueDate')" /><button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-task-muted transition hover:text-task-blue" aria-label="Open end date calendar" @click="openDatePicker('dueDate')"><svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 2v4M16 2v4M3 10h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /></svg></button><div v-if="openProjectDatePicker === 'dueDate'" class="tf-date-popover right-0 left-auto"><div class="mb-3 flex items-center justify-between"><b class="text-sm">{{ projectDatePickerDays.label }}</b><div class="flex gap-1"><button type="button" class="tf-icon-button h-8 w-8" @click.stop="moveDatePickerMonth(-1)">‹</button><button type="button" class="tf-icon-button h-8 w-8" @click.stop="moveDatePickerMonth(1)">›</button></div></div><div class="mb-2 grid grid-cols-7 text-center text-[10px] font-semibold text-task-muted"><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span></div><div class="grid grid-cols-7 gap-1"><button v-for="cell in projectDatePickerDays.cells" :key="cell.key" type="button" :class="['h-8 rounded-[8px] text-sm transition', cell.day ? 'hover:bg-task-blueSoft hover:text-task-blue' : 'pointer-events-none', isTodayDatePickerCell(cell.day, cell.month, cell.year) ? 'bg-task-danger font-bold text-white' : '']" @click="selectProjectDate(cell.day, cell.month, cell.year)">{{ cell.day || '' }}</button></div></div></div></label>
              <label class="text-sm font-semibold">Priority<div class="tf-dropdown mt-2"><button type="button" class="tf-dropdown-button h-12" @click="openDropdown = openDropdown === 'reportPriority' ? null : 'reportPriority'"><span>{{ reportPriority }}</span><svg viewBox="0 0 20 20" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg></button><div v-if="openDropdown === 'reportPriority'" class="tf-dropdown-menu"><button v-for="option in dropdownOptions.priority" :key="option" type="button" class="tf-dropdown-option" @click="reportPriority = option; openDropdown = null"><span>{{ option }}</span><span v-if="reportPriority === option" class="text-task-blue">✓</span></button></div></div></label>
              <label class="text-sm font-semibold">Status<div class="tf-dropdown mt-2"><button type="button" class="tf-dropdown-button h-12" @click="openDropdown = openDropdown === 'reportStatus' ? null : 'reportStatus'"><span>{{ reportStatus }}</span><svg viewBox="0 0 20 20" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5" /></svg></button><div v-if="openDropdown === 'reportStatus'" class="tf-dropdown-menu"><button v-for="option in ['All Statuses', 'Completed', 'In Progress', 'Not Started']" :key="option" type="button" class="tf-dropdown-option" @click="reportStatus = option; openDropdown = null">{{ option }}</button></div></div></label>
            </div>
          </template>
          <div :class="['sticky bottom-0 flex justify-end gap-2.5 bg-white', modal === 'project' || modal === 'task' ? '-mx-5 -mb-5 mt-5 px-5 py-3' : modal === 'logout' ? '-mx-4  px-4 pt-4' : modal === 'event-detail' || modal === 'event-delete' || modal === 'member-profile' || modal === 'member-remove' ? '-mx-4 -mb-4 mt-7 border-t border-task-line px-4 py-3' : '-mx-4 -mb-4 mt-4 border-t border-task-line px-4 py-3']">
            <button v-if="modal === 'task' && editingTaskId && canDeleteOpenedTask" class="mr-auto h-10 rounded-full border border-task-danger bg-white px-5 text-sm font-semibold text-task-danger transition hover:bg-task-dangerSoft" @click="deleteOpenedTask">Delete Task</button>
            <button v-if="modal === 'event-detail' && canCreateEvent" type="button" class="mr-auto h-10 rounded-full border border-task-danger bg-white px-5 text-sm font-semibold text-task-danger transition hover:bg-task-dangerSoft" @click="requestEventDelete">Delete Event</button>
            <button v-if="modal === 'task' && editingTaskId && taskFormStatus === 'Completed' && canManageDepartment" class="mr-auto h-10 rounded-full border border-slate-300 bg-slate-50 px-5 text-sm font-semibold text-slate-600 transition hover:border-task-blue hover:bg-task-blueSoft hover:text-task-blue" @click="archiveOpenedTask">Archive</button>
            <button class="h-10 rounded-full border border-task-line bg-white px-5 text-sm font-semibold shadow-button transition hover:border-task-blue hover:text-task-blue" @click="modal === 'event-delete' ? cancelEventDelete() : modal = null">{{ modal === 'member-profile' ? 'Close' : modal === 'event-delete' ? 'Keep Event' : 'Cancel' }}</button>
            <button v-if="modal === 'member-profile' && canManageDepartment" type="button" class="inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-b from-[#72A4D7] to-[#2567AD] px-6 text-sm font-semibold text-white shadow-button transition hover:-translate-y-0.5" @click="editSelectedMember"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>Edit</button>
            <button v-if="modal === 'event-detail' && canCreateEvent" type="button" class="inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-b from-[#72A4D7] to-[#2567AD] px-6 text-sm font-semibold text-white shadow-button transition hover:-translate-y-0.5" @click="editSelectedEvent">Edit</button>
            <button v-if="modal === 'logout'" type="button" class="h-10 rounded-full bg-task-danger px-6 text-sm font-semibold text-white shadow-button transition hover:-translate-y-0.5 hover:bg-rose-700" @click="confirmLogout">Log out</button>
            <button v-else-if="modal === 'member-remove'" type="button" :disabled="memberDeleting" class="h-10 rounded-full bg-task-danger px-6 text-sm font-semibold text-white shadow-button transition hover:-translate-y-0.5 hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60" @click="confirmMemberRemoval">{{ memberDeleting ? 'Removing...' : 'Remove Member' }}</button>
            <button v-else-if="modal === 'event-delete'" type="button" :disabled="eventDeleting" class="inline-flex h-10 items-center gap-2 rounded-full bg-task-danger px-6 text-sm font-semibold text-white shadow-button transition hover:-translate-y-0.5 hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60" @click="deleteSelectedEvent"><span v-if="eventDeleting" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />{{ eventDeleting ? 'Deleting...' : 'Delete Event' }}</button>
            <button v-else-if="modal !== 'event-detail' && modal !== 'member-profile' && modal !== 'analytics-user-tasks' && !(modal === 'task' && taskModalMode === 'view')" :disabled="taskSaving" class="h-10 rounded-full bg-gradient-to-b from-[#72A4D7] to-[#2567AD] px-6 text-sm font-semibold text-white shadow-button transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" @click="submitModal">{{ taskSaving ? 'Saving...' : modal === 'report' ? 'Generate Report' : modal === 'event' ? (editingEventId ? 'Update Event' : 'Create Event') : modal === 'project' ? (editingProjectId ? 'Update Project' : 'Create Project') : modal === 'member' ? (editingMemberId ? 'Update Member' : 'Add Member') : modal === 'team-filter' ? 'Apply' : taskModalMode === 'edit' ? 'Save Changes' : 'Create Task' }}</button>
          </div>
        </div>
      </div>
    </div>

    <button v-if="supportWidgetOpen" type="button" class="fixed inset-0 z-[65] bg-transparent" aria-label="Close help support" @click="!feedbackSending && (supportWidgetOpen = false)" />
    <div ref="supportWidgetRoot" class="fixed bottom-5 right-5 z-[70] h-14 w-14" :style="supportWidgetStyle" @paste="handleFeedbackPaste">
      <div v-if="supportWidgetOpen" :class="['tf-panel tf-support-panel absolute max-h-[calc(100dvh-116px)] w-[390px] max-w-[calc(100vw-32px)] overflow-x-hidden overflow-y-auto overscroll-contain p-5 shadow-2xl', supportPanelPlacement]">
        <div class="flex touch-none items-start justify-between gap-4" :class="supportWidgetDragging ? 'cursor-grabbing' : 'cursor-move'" @pointerdown="startSupportDrag">
          <div class="flex select-none items-center gap-3">
            <span class="grid h-14 w-14 shrink-0 place-items-center rounded-[16px] bg-gradient-to-br from-task-blueSoft to-white p-0.5 shadow-sm ring-1 ring-task-blue/15"><img src="/images/tiko-assistant.webp" width="192" height="192" alt="Tiko feedback assistant" class="h-full w-full object-contain" /></span>
            <div><h2 class="text-lg font-extrabold text-task-ink">Tiko</h2><p class="mt-0.5 text-xs font-medium text-task-muted">Feedback Assistant</p></div>
          </div>
          <button type="button" class="tf-icon-button h-8 w-8 shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50" :disabled="feedbackSending" aria-label="Close support" title="Close" @pointerdown.stop @click="supportWidgetOpen = false">
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div class="mt-4"><p class="text-sm font-bold text-task-ink">Something not working as expected?</p><p class="mt-1 text-xs leading-5 text-task-muted">Report an issue or share an idea with us.</p></div>
        <div class="tf-support-type-tabs mt-4 grid grid-cols-3 overflow-hidden rounded-[12px] border border-task-line bg-slate-50/70 p-1">
          <button v-for="type in ['Bug', 'Suggestion', 'Feedback']" :key="type" type="button" :class="['tf-support-type flex h-10 items-center justify-center gap-2 rounded-[9px] text-xs font-semibold transition', feedbackType === type ? 'is-active bg-gradient-to-b from-[#4B91EB] to-[#2768C7] text-white shadow-button' : 'text-task-muted hover:bg-white hover:text-task-blue']" @click="feedbackType = type as typeof feedbackType"><svg v-if="type === 'Bug'" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 9h8v9a4 4 0 0 1-8 0V9Zm-2 4H3m18 0h-3M8 7 6 5m10 2 2-2M9 3h6v4H9V3Z" /></svg><svg v-else-if="type === 'Suggestion'" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Zm6 10 .8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8L18 13Z" /></svg><svg v-else viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" /></svg>{{ type }}</button>
        </div>
        <label class="mt-4 block text-xs font-semibold text-task-ink">Tell us more</label>
        <div class="relative mt-2">
        <textarea
          v-model="feedbackDraft"
          class="tf-input h-36 w-full resize-none rounded-[13px] p-3 pb-8 text-sm leading-5 focus:ring-2 focus:ring-task-blue/15"
          placeholder="What happened, or what would you like us to improve?"
          maxlength="3000"
          :disabled="feedbackSending"
        />
          <span class="pointer-events-none absolute bottom-2.5 right-3 text-[10px] text-task-muted">{{ feedbackDraft.length }}/3000</span>
        </div>
        <div class="mt-4 flex items-center gap-3"><button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-[11px] border border-dashed border-task-line bg-white px-4 text-xs font-semibold text-task-muted transition hover:border-task-blue hover:text-task-blue disabled:cursor-not-allowed disabled:opacity-60" :disabled="feedbackSending" @click="attachFeedbackScreenshot"><svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m8 12 5-5a3 3 0 0 1 4 4l-7 7a5 5 0 0 1-7-7l7-7" /></svg>{{ feedbackScreenshotName || 'Add screenshot' }}</button><span class="text-[10px] leading-4 text-task-muted">PNG, JPG up to 5 MB<br>or paste with ⌘/Ctrl + V</span></div>
        <input ref="feedbackScreenshotInput" class="hidden" type="file" accept="image/jpeg,image/png,image/webp" @change="handleFeedbackScreenshot" />
        <div v-if="feedbackScreenshotPreview" class="mt-3 flex items-center gap-3 rounded-ui border border-task-line p-2">
          <img :src="feedbackScreenshotPreview" :alt="feedbackScreenshotName" class="h-14 w-20 rounded-ui object-cover" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-bold">{{ feedbackScreenshotName }}</p>
            <p class="text-xs text-task-muted">Screenshot attached</p>
          </div>
          <button type="button" class="tf-icon-button h-8 w-8 disabled:cursor-not-allowed disabled:opacity-50" :disabled="feedbackSending" aria-label="Remove screenshot" title="Remove screenshot" @click="clearFeedbackScreenshot">
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <button type="button" class="tf-primary tf-support-send mt-5 h-12 w-full rounded-[12px] bg-gradient-to-b from-[#4D95F3] to-[#205FCD] text-sm shadow-[0_14px_28px_-14px_rgba(37,103,173,.8)] disabled:cursor-not-allowed" :disabled="!feedbackDraft.trim() || feedbackSending" @click="sendFeedbackToTeam">
          <svg v-if="feedbackSending" viewBox="0 0 24 24" class="h-5 w-5 animate-spin" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a9 9 0 1 1-9 9" /></svg>
          <svg v-else viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" /></svg>
          {{ feedbackSending ? 'Sending...' : 'Send Feedback →' }}
        </button>
      </div>
      <button type="button" :class="['tf-support-launcher touch-none select-none', supportWidgetOpen ? 'is-open' : '', supportWidgetDragging ? 'is-dragging cursor-grabbing scale-105' : 'cursor-grab']" aria-label="Open or move Tiko support" title="Drag to move · Click to open" @dragstart.prevent @pointerdown="startSupportDrag" @click="toggleSupportWidget">
        <span class="tf-support-greeting" aria-hidden="true"><b>Hi! I'm Tiko 👋</b><small>Ask Tiko <i>✦</i></small></span>
        <span class="tf-support-robot-stage relative block h-[66px] w-[66px] shrink-0" aria-hidden="true">
          <img src="/images/tiko-sleep-clean.png" width="256" height="256" alt="" draggable="false" decoding="async" class="tf-support-robot tf-support-robot--sleep pointer-events-none absolute inset-0 h-full w-full max-w-none select-none object-contain drop-shadow-[0_8px_12px_rgba(7,40,91,.38)]" />
          <img src="/images/tiko-assistant.webp" width="192" height="192" alt="" draggable="false" decoding="async" class="tf-support-robot tf-support-robot--awake pointer-events-none absolute inset-0 h-full w-full max-w-none select-none object-contain drop-shadow-[0_8px_12px_rgba(7,40,91,.38)]" />
          <span class="tf-support-sleep-sign tf-support-sleep-sign--one">z</span>
          <span class="tf-support-sleep-sign tf-support-sleep-sign--two">z</span>
          <span class="tf-support-sleep-sign tf-support-sleep-sign--three">Z</span>
        </span>
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
