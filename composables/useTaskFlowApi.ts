type ApiTokens = {
  access: string
  refresh: string
}

type PaginatedResponse<T> = {
  count: number
  results: T[]
}

type ListResponse<T> = PaginatedResponse<T> | T[] | {
  data?: T[] | PaginatedResponse<T>
  items?: T[]
  results?: T[]
}

type UserBrief = {
  id?: string | number
  email?: string
  full_name?: string
  first_name?: string
  last_name?: string
  avatar?: string
  phone?: string
  job_title?: string
}

type MeProfile = {
  id?: string | number
  email?: string
  first_name?: string
  last_name?: string
  avatar?: string
  phone?: string
  job_title?: string
  department?: string | null
  role?: string
  is_active?: boolean
  has_all_departments_access?: boolean
  accessible_departments?: Array<string | number | ApiDepartment>
  membership?: { role?: string; department?: string; is_active?: boolean; has_all_departments_access?: boolean; accessible_departments?: Array<string | number | ApiDepartment> }
  department_membership?: { role?: string; department?: string; is_active?: boolean; has_all_departments_access?: boolean; accessible_departments?: Array<string | number | ApiDepartment> }
  memberships?: Array<{ role?: string; department?: string; is_active?: boolean; has_all_departments_access?: boolean; accessible_departments?: Array<string | number | ApiDepartment> }>
}

type ApiTask = {
  id?: string
  department?: string
  title: string
  status?: string
  priority?: string
  effort_score?: number
  due_date?: string | null
  progress?: number
  description?: string
  category?: string
  assignees?: Array<string | number>
  assignee_details?: UserBrief[]
  is_hidden?: boolean
  main_assignee?: string | number | null
  main_assignee_detail?: UserBrief | null
  created_by?: string | number | UserBrief | null
  created_by_detail?: UserBrief | null
  creator_detail?: UserBrief | null
  owner_detail?: UserBrief | null
  is_archived?: boolean
  archived_at?: string | null
  archived_by?: string | number | UserBrief | null
}

type TaskPayload = {
  department?: string
  title: string
  description: string
  status: string
  priority: string
  effort_score: number
  category: string
  assignees: Array<string | number>
  due_date: string
  progress: number
  is_hidden: boolean
}

type ApiProject = {
  id?: string
  department?: string
  name: string
  description?: string
  status?: string
  priority?: string
  start_date?: string | null
  progress?: number
  task_count?: number
  completed_task_count?: number
  due_date?: string | null
  members?: string[]
  member_details?: UserBrief[]
}

type ProjectPayload = {
  department: string
  name: string
  description: string
  status: string
  priority: string
  start_date: string
  due_date: string
  members: Array<string | number>
}

type ApiMember = {
  id?: string
  first_name?: string
  last_name?: string
  full_name?: string
  email?: string
  username?: string
  phone?: string
  avatar?: string
  job_title?: string
  department?: string | { id?: string; name?: string }
  role?: string
  is_active?: boolean
  date_joined?: string
  joined_at?: string
  efficiency?: number
  task_count?: number
  total_tasks?: number
  assigned_tasks?: number
  completed_tasks?: number
  in_progress_tasks?: number
}

type MemberPayload = {
  first_name: string
  last_name: string
  email: string
  username: string
  password: string
  phone: string
  job_title: string
  department: string
  role: string
  is_active: boolean
}

type MemberSummary = {
  total_members?: number
  average_efficiency?: number
  active_tasks?: number
}

type ApiDepartment = { id?: string; name?: string; title?: string }

type ApiReport = {
  id?: string
  name: string
  report_type?: string
  description?: string
  created_at?: string
  status?: string
  generated_by_detail?: UserBrief
}

type ReportPayload = {
  department: string
  name: string
  report_type: string
  parameters: string
}

export type ApiConversation = {
  id: string
  department?: string | null
  title?: string
  is_group?: boolean
  participants?: Array<string | number>
  participant_details?: UserBrief[]
  last_message?: Record<string, unknown> | null
  unread_count?: number
  created_at?: string
  updated_at?: string
}

export type ApiChatMessage = {
  id: string
  conversation: string
  sender: number
  sender_detail?: UserBrief
  body?: string
  attachment?: string | null
  edited_at?: string | null
  is_deleted?: boolean
  created_at?: string
}

export type AnalyticsMetric = {
  value: number
  unit: 'percent' | 'tasks' | 'staff' | 'days'
  label?: string
}

export type AnalyticsCardKey =
  | 'total_average_performance'
  | 'total_average_on_time'
  | 'total_average_completion_days'
  | 'tasks_per_employee'
  | 'overdue_rate'
  | 'weighted_workload_per_employee'

export type AnalyticsCardUnit =
  | 'percent'
  | 'days'
  | 'tasks_per_employee'
  | 'effort_points_per_employee'

export type AnalyticsCard = {
  key: AnalyticsCardKey
  label: string
  value: number
  unit: AnalyticsCardUnit
  total_tasks?: number
  completed_tasks?: number
  overdue_tasks?: number
  total_effort_points?: number
  employees?: number
}

export type AnalyticsSummary = {
  cards: AnalyticsCard[]
  task_completion_rate?: AnalyticsMetric
  active_tasks?: AnalyticsMetric
  completed_tasks?: AnalyticsMetric
  archived_tasks?: AnalyticsMetric
  on_hold_tasks?: AnalyticsMetric
  postponed_tasks?: AnalyticsMetric
}

export type AnalyticsStatusChartItem = {
  key: string
  value: number
  label?: string
}

export type AnalyticsDepartmentPerformanceItem = {
  department_id?: string | number
  department_name?: string
  department?: string | { id?: string | number; name?: string; title?: string }
  name?: string
  label?: string
  average_performance?: number | AnalyticsMetric
  performance_score?: number | AnalyticsMetric
  performance?: number | AnalyticsMetric
  weighted_score?: number | AnalyticsMetric
  task_completion_rate?: number | AnalyticsMetric
  completion_rate?: number | AnalyticsMetric
  value?: number | AnalyticsMetric
  completed?: number
  in_progress?: number
  overdue?: number
  total?: number
  staff_count?: number
}

type ApiAnalytics = {
  summary?: AnalyticsSummary
  department_performance?: AnalyticsDepartmentPerformanceItem[] | { results?: AnalyticsDepartmentPerformanceItem[] }
  status_chart?: AnalyticsStatusChartItem[]
  task_status_chart?: AnalyticsStatusChartItem[]
  tasks_by_status?: AnalyticsStatusChartItem[]
  status_breakdown?: AnalyticsStatusChartItem[]
  task_completion_rate?: number
  team_velocity?: number
  overdue_tasks?: number
  monthly_progress?: Array<string | Record<string, unknown>>
  performance_trend?: Array<string | Record<string, unknown>> | { labels?: unknown[]; values?: unknown[] | Record<string, unknown>; data?: unknown[]; datasets?: Array<{ data?: unknown[] }> }
  performance_over_time?: Array<string | Record<string, unknown>> | { labels?: unknown[]; values?: unknown[] | Record<string, unknown>; data?: unknown[]; datasets?: Array<{ data?: unknown[] }> }
  trend?: Array<string | Record<string, unknown>> | { labels?: unknown[]; values?: unknown[] | Record<string, unknown>; data?: unknown[]; datasets?: Array<{ data?: unknown[] }> }
  tasks_by_category?: Array<string | Record<string, unknown>>
  staff_performance?: {
    count?: number
    total_pages?: number
    results?: Array<Record<string, unknown>>
  }
}

export type AnalyticsQuery = {
  department?: string
  employee?: string
  priority?: 'low' | 'medium' | 'high'
  status?: 'backlog' | 'not_started' | 'in_progress' | 'on_hold' | 'completed'
  days?: 7 | 30 | 90 | 365
  start_date?: string
  end_date?: string
  granularity?: 'day' | 'week' | 'month'
  ordering?: string
  page?: number
  page_size?: number
  performance_level?: string
  search?: string
  staff_filter?: string
  staff_search?: string
}

type DashboardMetric = { count: number; percentage: number }
type DashboardDepartment = { id: string; name: string }
type DashboardEvent = {
  id: string; title: string; event_type: string; department: DashboardDepartment
  starts_at: string; ends_at: string; location?: string; meeting_url?: string | null
  attendee_count: number; attendees: Array<{ id: string | number; full_name: string }>
}
type DashboardTask = {
  id: string; title: string; department: DashboardDepartment; priority: string; status: string
  due_date?: string; days_remaining?: number; created_at?: string
  created_by?: string | number | UserBrief | null
  created_by_detail?: UserBrief | null
  creator_detail?: UserBrief | null
  owner_detail?: UserBrief | null
}
type DashboardResponse = {
  summary: Partial<Record<'total_tasks' | 'completed_tasks' | 'in_progress_tasks' | 'not_started_tasks' | 'backlog_tasks' | 'on_hold_tasks' | 'overdue_tasks', DashboardMetric>>
  today_events: DashboardEvent[]
  upcoming_events: DashboardEvent[]
  upcoming_deadlines: DashboardTask[]
  tasks_by_department: Array<{ department_id: string; department_name: string; task_count: number; percentage: number }>
  recent_tasks: DashboardTask[]
  generated_at: string
}

export type NotificationType = 'task_assigned' | 'deadline_reminder' | 'task_overdue' | 'task_completed' | 'new_message'

export type TaskFlowNotification = {
  id: string
  notification_type: NotificationType
  title: string
  body: string
  actor_detail?: UserBrief | null
  task?: string | number | { id?: string | number; pk?: string | number; url?: string } | null
  message?: string | number | { id?: string | number; pk?: string | number; url?: string } | null
  is_read: boolean
  read_at?: string | null
  created_at: string
}

export const notificationRelationId = (value: TaskFlowNotification['task'] | TaskFlowNotification['message']) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return notificationRelationId(value.id ?? value.pk ?? value.url ?? '')
  const raw = String(value).trim().replace(/[?#].*$/, '').replace(/\/+$/, '')
  if (!raw) return ''
  return raw.includes('/') ? raw.split('/').pop() || '' : raw
}

export type NotificationPreferences = {
  task_assigned: boolean
  deadline_reminder: boolean
  task_overdue: boolean
  task_updates: boolean
  team_messages: boolean
}

type ApiEvent = {
  id?: string
  department?: string | number | ApiDepartment
  title: string
  event_type?: string
  description?: string
  starts_at?: string
  ends_at?: string
  location?: string
  meeting_url?: string
  attendees?: Array<string | number>
  attendee_details?: UserBrief[]
}

type EventPayload = {
  department: string
  title: string
  event_type: string
  description: string
  starts_at: string
  ends_at: string
  location: string
  meeting_url: string
  attendees: Array<string | number>
}

const authStorageKey = 'taskflow-auth'
let sharedMeRequest: Promise<MeProfile> | null = null

export const taskFlowApiErrorMessage = (error: unknown, fallback: string) => {
  const data = (error as { data?: unknown })?.data
  const message = (error as { message?: unknown })?.message
  const status = (error as { status?: number; statusCode?: number })?.status
    || (error as { statusCode?: number })?.statusCode
  const isNetworkError = !status && typeof message === 'string'
    && /failed to fetch|fetch failed|networkerror|load failed/i.test(message)
  const extractMessage = (value: unknown): string => {
    if (typeof value === 'string') return value
    if (Array.isArray(value)) return value.map(extractMessage).filter(Boolean).join(', ')
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>
      for (const key of ['detail', 'message', 'error', 'errors', 'non_field_errors']) {
        const nested = extractMessage(record[key])
        if (nested) return nested
      }
    }
    return ''
  }

  if (typeof data === 'string') {
    const trimmed = data.trim()
    if (/^<!doctype html/i.test(trimmed) || /^<html/i.test(trimmed)) {
      return status ? `Server request failed (${status})` : fallback
    }
    return data
  }
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    const directMessage = extractMessage(record)
    if (directMessage) return directMessage

    const fieldError = Object.entries(record)
      .map(([field, value]) => {
        if (Array.isArray(value)) return `${field}: ${value.join(', ')}`
        if (typeof value === 'string') return `${field}: ${value}`
        if (value && typeof value === 'object') {
          const nested = extractMessage(value)
          return nested ? `${field}: ${nested}` : `${field}: ${JSON.stringify(value)}`
        }
        return ''
      })
      .filter(Boolean)
      .join(' ')

    if (fieldError) return fieldError
  }

  if (isNetworkError) return 'Could not connect to the API. Check your internet connection and try again.'
  return typeof message === 'string' && message ? message : fallback
}

const titleCase = (value?: string) =>
  String(value || '')
    .split('_')
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(' ') || 'Not Started'

const projectMemberIds = (project: ApiProject) => {
  if (project.members?.length) return project.members
  return project.member_details?.map((member) => member.id).filter((id): id is string => typeof id === 'string' && Boolean(id)) || []
}

const formatDate = (value?: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`
}

const asNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^\d.-]/g, ''))
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

const parseAnalyticsItem = (item: string | Record<string, unknown>) => {
  if (typeof item !== 'string') return item

  try {
    const parsed = JSON.parse(item)
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
  } catch {
    return { label: item }
  }

  return { label: item }
}

const getStoredTokens = (): ApiTokens | null => {
  const accessCookie = useCookie<string | null>('taskflow-access')
  const refreshCookie = useCookie<string | null>('taskflow-refresh')

  if (accessCookie.value && refreshCookie.value) {
    return {
      access: accessCookie.value,
      refresh: refreshCookie.value
    }
  }

  if (!import.meta.client) return null

  try {
    const stored = JSON.parse(localStorage.getItem(authStorageKey) || '{}')
    if (typeof stored.access === 'string' && typeof stored.refresh === 'string') return stored
  } catch {
    return null
  }

  return null
}

const saveStoredTokens = (tokens: Partial<ApiTokens> & Record<string, unknown>) => {
  const accessCookie = useCookie<string | null>('taskflow-access', { sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 })
  const refreshCookie = useCookie<string | null>('taskflow-refresh', { sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 })

  if (typeof tokens.access === 'string') accessCookie.value = tokens.access
  if (typeof tokens.refresh === 'string') refreshCookie.value = tokens.refresh

  if (!import.meta.client) return

  const current = JSON.parse(localStorage.getItem(authStorageKey) || '{}')
  localStorage.setItem(authStorageKey, JSON.stringify({
    ...current,
    ...tokens
  }))
}

export const useTaskFlowApi = () => {
  const config = useRuntimeConfig()
  const apiBase = String(config.public.apiBase || '').replace(/\/$/, '')
  const meCache = useState<MeProfile | null>('taskflow:me-cache', () => null)

  const refreshToken = async () => {
    const tokens = getStoredTokens()
    if (!tokens?.refresh) throw new Error('Refresh token is missing')

    const refreshed = await $fetch<Partial<ApiTokens> & Pick<ApiTokens, 'access'>>(`${apiBase}/auth/token/refresh/`, {
      method: 'POST',
      body: { refresh: tokens.refresh }
    })

    saveStoredTokens(refreshed)

    return refreshed.access
  }

  const apiFetch = async <T>(path: string, options: Parameters<typeof $fetch<T>>[1] = {}, retry = true): Promise<T> => {
    const tokens = getStoredTokens()
    const headers = new Headers(options.headers as HeadersInit | undefined)

    if (tokens?.access) headers.set('Authorization', `Bearer ${tokens.access}`)

    try {
      return await $fetch<T>(`${apiBase}${path}`, {
        ...options,
        headers
      })
    } catch (error: any) {
      if (retry && error?.status === 401 && tokens?.refresh) {
        const access = await refreshToken()
        const retryHeaders = new Headers(options.headers as HeadersInit | undefined)
        retryHeaders.set('Authorization', `Bearer ${access}`)

        return await $fetch<T>(`${apiBase}${path}`, {
          ...options,
          headers: retryHeaders
        })
      }

      throw error
    }
  }

  const login = async (email: string, password: string, remember: boolean) => {
    const tokens = await $fetch<ApiTokens>(`${apiBase}/auth/token/`, {
      method: 'POST',
      body: { email, password }
    })

    meCache.value = null
    saveStoredTokens({
      ...tokens,
      email,
      remember,
      loggedInAt: new Date().toISOString()
    })

    return tokens
  }

  const requestPasswordReset = async (email: string) =>
    await $fetch<{ detail: string }>(`${apiBase}/auth/password-reset/`, {
      method: 'POST',
      body: { email }
    })

  const confirmPasswordReset = async (uid: string, token: string, newPassword: string, confirmPassword: string) =>
    await $fetch<{ detail: string }>(`${apiBase}/auth/password-reset/confirm/`, {
      method: 'POST',
      body: {
        uid,
        token,
        new_password: newPassword,
        confirm_password: confirmPassword
      }
    })

  const logout = () => {
    const accessCookie = useCookie<string | null>('taskflow-access')
    const refreshCookie = useCookie<string | null>('taskflow-refresh')

    accessCookie.value = null
    refreshCookie.value = null
    meCache.value = null

    if (import.meta.client) {
      localStorage.removeItem(authStorageKey)
      sessionStorage.removeItem(authStorageKey)
    }
  }

  const changePassword = async (currentPassword: string, newPassword: string, confirmPassword: string) =>
    await apiFetch('/me/change-password/', {
      method: 'POST',
      body: {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      }
    })

  const deleteAccount = async (password: string) =>
    await apiFetch('/me/delete-account/', {
      method: 'POST',
      body: { password }
    })

  const getMe = async (force = false) => {
    if (!force && meCache.value) return meCache.value
    if (!force && sharedMeRequest) return await sharedMeRequest
    sharedMeRequest = apiFetch<MeProfile>('/me/')
    try {
      const profile = await sharedMeRequest
      meCache.value = profile
      return profile
    } finally {
      sharedMeRequest = null
    }
  }
  const getDashboard = async () => await apiFetch<DashboardResponse>('/dashboard/')
  const getNotifications = async (query: { unread?: boolean; page?: number; page_size?: number } = {}) => {
    const params = new URLSearchParams()
    if (query.unread !== undefined) params.set('unread', String(query.unread))
    if (query.page !== undefined) params.set('page', String(query.page))
    params.set('page_size', String(query.page_size ?? 10))
    return await apiFetch<PaginatedResponse<TaskFlowNotification> & { next?: string | null; previous?: string | null }>(`/notifications/?${params}`)
  }
  const getUnreadNotificationCount = async () => await apiFetch<{ unread_count: number }>('/notifications/unread_count/')
  const markNotificationRead = async (id: string) => await apiFetch<TaskFlowNotification>(`/notifications/${id}/mark_read/`, { method: 'POST' })
  const markAllNotificationsRead = async () => await apiFetch<{ updated: number }>('/notifications/mark_all_read/', { method: 'POST' })
  const getNotificationPreferences = async () => await apiFetch<NotificationPreferences>('/me/preferences/')
  const patchNotificationPreferences = async (preference: Partial<NotificationPreferences>) =>
    await apiFetch<NotificationPreferences>('/me/preferences/', { method: 'PATCH', body: preference })

  const sendSupportMessage = async (message: string, screenshot?: File | null) => {
    const form = new FormData()
    form.append('message', message.trim())
    if (screenshot) form.append('screenshot', screenshot)

    return await apiFetch<{ detail: string }>('/support/bot/', {
      method: 'POST',
      body: form
    })
  }

  const updateMe = async (
    profile: Required<Pick<MeProfile, 'first_name' | 'last_name' | 'phone' | 'job_title'>>,
    avatarFile?: File | null
  ) => {
    const form = new FormData()

    form.append('first_name', profile.first_name)
    form.append('last_name', profile.last_name)
    form.append('phone', profile.phone)
    form.append('job_title', profile.job_title)
    if (avatarFile) form.append('avatar', avatarFile)

    const updated = await apiFetch<MeProfile>('/me/', {
      method: 'PUT',
      body: form
    })
    meCache.value = updated
    return updated
  }

  const listItems = <T>(response: ListResponse<T> | unknown): T[] => {
    if (Array.isArray(response)) return response
    if (!response || typeof response !== 'object') return []

    const record = response as Record<string, unknown>
    if (Array.isArray(record.results)) return record.results as T[]
    if (Array.isArray(record.data)) return record.data as T[]
    if (Array.isArray(record.items)) return record.items as T[]
    if (record.data && typeof record.data === 'object') {
      const dataRecord = record.data as Record<string, unknown>
      if (Array.isArray(dataRecord.results)) return dataRecord.results as T[]
      if (Array.isArray(dataRecord.items)) return dataRecord.items as T[]
    }

    return []
  }

  const listProjects = async (query: Record<string, string | number | undefined> = {}) => {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value))
    })

    const suffix = params.toString() ? `?${params}` : ''
    return await apiFetch<PaginatedResponse<ApiProject>>(`/projects/${suffix}`)
  }

  const listMembers = async (query: Record<string, string | number | boolean | undefined> = {}) => {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value))
    })

    const suffix = params.toString() ? `?${params}` : ''
    return await apiFetch<ListResponse<ApiMember>>(`/members/${suffix}`)
  }

  const getAnalytics = async (query: AnalyticsQuery = {}) => {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value))
    })
    const suffix = params.toString() ? `?${params}` : ''
    return await apiFetch<ApiAnalytics>(`/analytics/${suffix}`)
  }

  const getMember = async (id: string) => await apiFetch<ApiMember>(`/members/${id}/`)

  const createMember = async (member: MemberPayload, avatarFile?: File | null) => {
    const form = new FormData()
    Object.entries(member).forEach(([key, value]) => form.append(key, String(value)))
    if (avatarFile) form.append('avatar', avatarFile)

    return await apiFetch<ApiMember>('/members/', {
      method: 'POST',
      body: form
    })
  }

  const patchMember = async (id: string, member: Partial<MemberPayload>, avatarFile?: File | null) => {
    if (avatarFile) {
      const form = new FormData()
      Object.entries(member).forEach(([key, value]) => {
        if (value !== undefined) form.append(key, String(value))
      })
      form.append('avatar', avatarFile)
      return await apiFetch<ApiMember>(`/members/${id}/`, {
        method: 'PATCH',
        body: form
      })
    }

    return await apiFetch<ApiMember>(`/members/${id}/`, {
      method: 'PATCH',
      body: member
    })
  }

  const deleteMember = async (id: string) =>
    await apiFetch(`/members/${id}/`, {
      method: 'DELETE'
    })

  const getMembersSummary = async () =>
    await apiFetch<MemberSummary>('/members/summary/')

  const listDepartments = async () =>
    await apiFetch<ListResponse<ApiDepartment>>('/departments/?page_size=200')

  const getProject = async (id: string) => await apiFetch<ApiProject>(`/projects/${id}/`)

  const createProject = async (project: ProjectPayload) =>
    await apiFetch<ApiProject>('/projects/', {
      method: 'POST',
      body: project
    })

  const updateProject = async (id: string, project: ProjectPayload) =>
    await apiFetch<ApiProject>(`/projects/${id}/`, {
      method: 'PUT',
      body: project
    })

  const patchProject = async (id: string, project: Partial<ProjectPayload>) =>
    await apiFetch<ApiProject>(`/projects/${id}/`, {
      method: 'PATCH',
      body: project
    })

  const deleteProject = async (id: string) =>
    await apiFetch(`/projects/${id}/`, {
      method: 'DELETE'
    })

  const patchTask = async (id: string, task: Partial<ApiTask>) =>
    await apiFetch<ApiTask>(`/tasks/${id}/`, {
      method: 'PATCH',
      body: task
    })

  const getTask = async (id: string) => await apiFetch<ApiTask>(`/tasks/${id}/`)

  const listTasks = async (query: Record<string, string | number | undefined> = {}) => {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value))
    })
    const suffix = params.toString() ? `?${params}` : ''
    return await apiFetch<PaginatedResponse<ApiTask>>(`/tasks/${suffix}`)
  }

  const searchTaskAssignees = async (search: string) => {
    const params = new URLSearchParams({ search: search.trim() })
    return await apiFetch<ListResponse<ApiMember>>(`/tasks/assignees/?${params}`)
  }

  const createTask = async (task: TaskPayload) =>
    await apiFetch<ApiTask>('/tasks/', {
      method: 'POST',
      body: task
    })

  const updateTask = async (id: string, task: TaskPayload) =>
    await apiFetch<ApiTask>(`/tasks/${id}/`, {
      method: 'PUT',
      body: task
    })

  const deleteTask = async (id: string) =>
    await apiFetch(`/tasks/${id}/`, { method: 'DELETE' })

  const archiveTask = async (id: string) =>
    await apiFetch<ApiTask>(`/tasks/${id}/archive/`, { method: 'POST' })

  const unarchiveTask = async (id: string) =>
    await apiFetch<ApiTask>(`/tasks/${id}/unarchive/`, { method: 'POST' })

  const listEvents = async (query: Record<string, string | number | undefined> = {}) => {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value))
    })

    const suffix = params.toString() ? `?${params}` : ''
    return await apiFetch<PaginatedResponse<ApiEvent>>(`/events/${suffix}`)
  }

  const getEvent = async (id: string) => await apiFetch<ApiEvent>(`/events/${id}/`)

  const createEvent = async (event: EventPayload) =>
    await apiFetch<ApiEvent>('/events/', {
      method: 'POST',
      body: event
    })

  const patchEvent = async (id: string, event: Partial<EventPayload>) =>
    await apiFetch<ApiEvent>(`/events/${id}/`, {
      method: 'PATCH',
      body: event
    })

  const deleteEvent = async (id: string) =>
    await apiFetch(`/events/${id}/`, {
      method: 'DELETE'
    })

  const createReport = async (report: ReportPayload) =>
    await apiFetch<ApiReport>('/reports/', {
      method: 'POST',
      body: report
    })

  const createConversation = async (payload: { department: string; title: string; is_group: boolean; participants: number[] }) =>
    await apiFetch<ApiConversation>('/chat/conversations/', { method: 'POST', body: payload })

  const listConversations = async (query: { search?: string; ordering?: string; page?: number; page_size?: number } = {}) => {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value))
    })
    const suffix = params.toString() ? `?${params}` : ''
    return await apiFetch<ListResponse<ApiConversation>>(`/chat/conversations/${suffix}`)
  }

  const listMessages = async (conversation: string, pageSize = 200) =>
    await apiFetch<ListResponse<ApiChatMessage>>(`/chat/messages/?conversation=${encodeURIComponent(conversation)}&ordering=created_at&page_size=${pageSize}`)

  const createMessage = async (payload: { conversation: string; body: string; attachment?: File | null }) => {
    if (payload.attachment) {
      const form = new FormData()
      form.append('conversation', payload.conversation)
      form.append('body', payload.body)
      form.append('attachment', payload.attachment)
      return await apiFetch<ApiChatMessage>('/chat/messages/', { method: 'POST', body: form })
    }
    return await apiFetch<ApiChatMessage>('/chat/messages/', { method: 'POST', body: { conversation: payload.conversation, body: payload.body } })
  }

  const markConversationRead = async (id: string) =>
    await apiFetch<ApiConversation>(`/chat/conversations/${id}/mark_read/`, { method: 'POST', body: {} })

  const deleteConversation = async (id: string) =>
    await apiFetch(`/chat/conversations/${id}/`, { method: 'DELETE' })

  const getReport = async (id: string) => await apiFetch<ApiReport>(`/reports/${id}/`)

  const loadDashboardData = async (onCoreLoaded?: (core: { dashboard: DashboardResponse; profile: MeProfile }) => void) => {
    if (!getStoredTokens()) return null

    // Start the heavier list requests immediately instead of waiting for the
    // dashboard/profile round-trip first. This removes one full network
    // waterfall from every refresh.
    const secondaryDataPromise = Promise.allSettled([
      apiFetch<PaginatedResponse<ApiTask>>('/tasks/?page_size=100'),
      listMembers({ page_size: 200 }),
      apiFetch<PaginatedResponse<ApiEvent>>('/events/?page_size=100'),
      // These sections are currently marked "Coming soon" in the UI. Avoid
      // downloading their full datasets during every application refresh.
      Promise.resolve({} as ApiAnalytics),
      Promise.resolve({ count: 0, results: [] } as PaginatedResponse<ApiProject>),
      Promise.resolve({ count: 0, results: [] } as PaginatedResponse<ApiReport>)
    ])
    const [dashboard, profile] = await Promise.all([getDashboard(), getMe()])
    onCoreLoaded?.({ dashboard, profile })
    const profileMembership = profile.department_membership || profile.membership || profile.memberships?.[0]
    const profileRole = String(profile.role || profileMembership?.role || '').trim().toLowerCase()
    const profileDepartment = String(profile.department || profileMembership?.department || '')
    const accessibleDepartments = (profile.accessible_departments || profileMembership?.accessible_departments || [])
      .map((department) => typeof department === 'object'
        ? String(department.id || '')
        : String(department || ''))
      .filter(Boolean)
    const profileIsActive = profile.is_active !== false && profileMembership?.is_active !== false

    const [tasksResult, membersResult, eventsResult, analyticsResult, projectsResult, reportsResult] = await secondaryDataPromise
    const tasks = tasksResult.status === 'fulfilled' ? listItems<ApiTask>(tasksResult.value) : []
    const members = membersResult.status === 'fulfilled' ? listItems<ApiMember>(membersResult.value) : []
    const events = eventsResult.status === 'fulfilled' ? listItems<ApiEvent>(eventsResult.value) : []
    const analytics = analyticsResult.status === 'fulfilled' ? analyticsResult.value : {}
    const projects = projectsResult.status === 'fulfilled' ? listItems<ApiProject>(projectsResult.value) : []
    const reports = reportsResult.status === 'fulfilled' ? listItems<ApiReport>(reportsResult.value) : []
    const projectSummary = projects.reduce(
      (summary, project) => {
        if (project.status === 'in_progress') summary.inProgress += 1
        if (project.status === 'completed') summary.completed += 1
        if (project.status === 'at_risk') summary.atRisk += 1
        return summary
      },
      {
        active: projects.length,
        inProgress: 0,
        completed: 0,
        atRisk: 0
      }
    )

    return {
      currentUserId: String(profile.id ?? ''),
      currentDepartmentId: profileDepartment,
      currentRole: profileRole,
      currentUserActive: profileIsActive,
      currentUserHasAllDepartmentsAccess: profile.has_all_departments_access === true || profileMembership?.has_all_departments_access === true,
      currentUserAccessibleDepartmentIds: Array.from(new Set([profileDepartment, ...accessibleDepartments].filter(Boolean))),
      dashboard,
      analytics,
      tasks,
      projects,
      members,
      reports,
      events,
      stats: {
        activeProjects: projects.length,
        utilization: Number(analytics.summary?.task_completion_rate?.value ?? 0),
        teamVelocity: analytics.team_velocity || 0,
        overdueTasks: analytics.overdue_tasks || 0,
        projectSummary
      }
    }
  }

  const mapTask = (task: ApiTask) => [
    task.title,
    task.assignee_details?.map((user) => user.full_name || user.email).filter(Boolean).join(', ') || 'Unassigned',
    titleCase(task.priority),
    titleCase(task.status),
    formatDate(task.due_date),
    task.progress ?? 0,
    task.id || '',
    '',
    task.department || '',
    JSON.stringify(task.assignee_details || []),
    task.description || '',
    task.category || '',
    task.due_date || '',
    JSON.stringify(task.assignees || []),
    task.is_archived ? 'true' : 'false',
    task.archived_at || '',
    typeof task.archived_by === 'object' ? JSON.stringify(task.archived_by || {}) : String(task.archived_by || ''),
    task.is_hidden ? 'true' : 'false',
    task.main_assignee === null || task.main_assignee === undefined ? '' : String(task.main_assignee),
    JSON.stringify(task.main_assignee_detail || null),
    JSON.stringify(
      task.created_by_detail ||
      task.creator_detail ||
      task.owner_detail ||
      (typeof task.created_by === 'object' ? task.created_by : task.created_by == null ? null : { id: task.created_by })
    ),
    task.effort_score ?? 3
  ]

  const mapProject = (project: ApiProject) => [
    project.name,
    titleCase(project.status),
    titleCase(project.priority),
    project.progress ?? 0,
    `${project.completed_task_count ?? 0}/${project.task_count ?? 0} tasks completed`,
    formatDate(project.due_date),
    project.id || '',
    '',
    project.description || '',
    project.start_date || '',
    project.department || '',
    JSON.stringify(project.member_details || []),
    ...projectMemberIds(project)
  ]

  const mapMember = (member: ApiMember) => {
    const fullName = member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email || ''
    const memberId = member.id ?? ''
    const departmentId = typeof member.department === 'string' ? member.department : member.department?.id || ''
    const departmentName = typeof member.department === 'string' ? '' : member.department?.name || ''

    return [
      fullName,
      member.job_title || titleCase(member.role),
      member.email || '-',
      member.phone || '-',
      member.efficiency ?? 0,
      member.completed_tasks ?? 0,
      member.in_progress_tasks ?? 0,
      memberId,
      member.avatar || '',
      memberId,
      departmentName,
      departmentId,
      member.is_active === false ? 'Inactive' : 'Active',
      member.date_joined || member.joined_at || '',
      member.role || 'member',
      member.task_count ?? member.total_tasks ?? member.assigned_tasks ?? ''
    ]
  }

  const mapReport = (report: ApiReport) => [
    report.name,
    titleCase(report.report_type),
    formatDate(report.created_at),
    report.generated_by_detail?.full_name || 'System',
    titleCase(report.status),
    report.id || '',
    report.file || '',
    report.result || ''
  ]

  const mapEvent = (event: ApiEvent) => [
    event.id || '',
    event.title,
    event.event_type || 'Meeting',
    event.starts_at || '',
    event.ends_at || '',
    event.location || '',
    event.meeting_url || '',
    event.description || '',
    JSON.stringify(event.attendee_details || []),
    ...(event.attendees || []).map(String)
  ]

  const mapAnalyticsMonthlyProgress = (analytics: ApiAnalytics) => {
    const analyticsCharts = (analytics as ApiAnalytics & { charts?: ApiAnalytics }).charts
    const performanceTrend = analytics.performance_trend || analyticsCharts?.performance_trend || analytics.performance_over_time || analytics.trend || []
    if (!Array.isArray(performanceTrend)) {
      const valueRecord = performanceTrend.values && !Array.isArray(performanceTrend.values) ? performanceTrend.values : null
      const labels = Array.isArray(performanceTrend.labels)
        ? performanceTrend.labels
        : valueRecord ? Object.keys(valueRecord) : []
      const values = Array.isArray(performanceTrend.values)
        ? performanceTrend.values
        : valueRecord ? Object.values(valueRecord)
          : Array.isArray(performanceTrend.data) ? performanceTrend.data
            : Array.isArray(performanceTrend.datasets?.[0]?.data) ? performanceTrend.datasets[0].data : []
      if (values.length) {
        return values.map((value, index) => {
          const valueItem = value && typeof value === 'object' ? value as Record<string, unknown> : null
          const completed = asNumber(valueItem ? valueItem.completed ?? valueItem.completed_tasks ?? valueItem.completed_count ?? valueItem.done ?? valueItem.value : value)
          const assigned = asNumber(valueItem ? valueItem.assigned ?? valueItem.assigned_tasks ?? valueItem.assigned_count ?? valueItem.created ?? valueItem.total : 0)
          const label = valueItem?.date ?? valueItem?.day ?? valueItem?.period ?? valueItem?.label ?? labels[index] ?? `Point ${index + 1}`
          return [String(label).slice(0, 12), completed, assigned]
        })
      }
    }

    const performanceEntries = Array.isArray(performanceTrend) ? performanceTrend : []
    if (performanceEntries.length) {
      return performanceEntries.map((entry, index) => {
        const item = parseAnalyticsItem(entry)
        const label = String(item.date || item.day || item.period || item.label || item.name || `Point ${index + 1}`).slice(0, 12)
        const completed = asNumber(item.completed ?? item.completed_tasks ?? item.completed_count ?? item.done ?? item.value)
        const assigned = asNumber(item.assigned ?? item.assigned_tasks ?? item.assigned_count ?? item.created ?? item.total)
        return [label, completed, assigned]
      })
    }

    return (analytics.monthly_progress || []).map((entry, index) => {
      const item = parseAnalyticsItem(entry)
      const month =
        String(item.month || item.name || item.label || item.date || `Month ${index + 1}`)
          .split(/\s+/)[0]
          .slice(0, 12)
      const completed = asNumber(item.completed ?? item.completed_tasks ?? item.completed_count ?? item.done ?? item.value)
      const created = asNumber(item.created ?? item.created_tasks ?? item.created_count ?? item.total ?? item.count)

      return [month, completed, created]
    })
  }

  const mapAnalyticsTasksByCategory = (analytics: ApiAnalytics) =>
    (analytics.tasks_by_category || []).map((entry) => {
      const item = parseAnalyticsItem(entry)
      const key = String(item.key || item.status || '').trim().toLowerCase()
      const name = key === 'archived'
        ? 'Verified & Archived'
        : key === 'backlog' || key === 'postponed'
          ? 'Postponed'
          : String(item.category || item.name || item.label || item.title || key || 'Uncategorized')
      const value = asNumber(item.percent ?? item.percentage ?? item.value ?? item.count)
      const count = asNumber(item.count ?? item.tasks ?? item.total, value)

      return [name, value, count]
    })

  return {
    login,
    requestPasswordReset,
    confirmPasswordReset,
    logout,
    refreshToken,
    changePassword,
    deleteAccount,
    getMe,
    getDashboard,
    getNotifications,
    getUnreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    getNotificationPreferences,
    patchNotificationPreferences,
    sendSupportMessage,
    updateMe,
    listProjects,
    listMembers,
    getAnalytics,
    getMember,
    createMember,
    patchMember,
    deleteMember,
    getMembersSummary,
    listDepartments,
    listEvents,
    getEvent,
    createEvent,
    createReport,
    createConversation,
    listConversations,
    listMessages,
    createMessage,
    markConversationRead,
    deleteConversation,
    getAccessToken: () => getStoredTokens()?.access || '',
    getReport,
    patchEvent,
    deleteEvent,
    listItems,
    getProject,
    createProject,
    updateProject,
    patchProject,
    deleteProject,
    createTask,
    getTask,
    listTasks,
    searchTaskAssignees,
    updateTask,
    deleteTask,
    archiveTask,
    unarchiveTask,
    patchTask,
    loadDashboardData,
    mapTask,
    mapProject,
    mapMember,
    mapReport,
    mapEvent,
    mapAnalyticsMonthlyProgress,
    mapAnalyticsTasksByCategory
  }
}
