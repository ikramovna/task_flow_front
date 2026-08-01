type ApiTokens = {
  access: string
  refresh: string
}

type PaginatedResponse<T> = {
  count: number
  results: T[]
}

type UserBrief = {
  id?: string
  email?: string
  full_name?: string
  first_name?: string
  last_name?: string
  avatar?: string
  phone?: string
  job_title?: string
}

type MeProfile = {
  email?: string
  first_name?: string
  last_name?: string
  avatar?: string
  phone?: string
  job_title?: string
}

type ApiTask = {
  title: string
  status?: string
  priority?: string
  due_date?: string | null
  progress?: number
  assignee_details?: UserBrief[]
}

type ApiProject = {
  id?: string
  workspace?: string
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
  workspace: string
  name: string
  description: string
  status: string
  priority: string
  start_date: string
  due_date: string
  members: string[]
}

type ApiWorkspace = {
  id: string
  name?: string
  slug?: string
}

type ApiMember = {
  user?: string
  role?: string
  user_detail?: UserBrief
  efficiency?: number
  completed_tasks?: number
  in_progress_tasks?: number
}

type ApiReport = {
  name: string
  report_type?: string
  created_at?: string
  status?: string
  generated_by_detail?: UserBrief
}

type ApiAnalytics = {
  task_completion_rate?: number
  team_velocity?: number
  overdue_tasks?: number
  monthly_progress?: Array<string | Record<string, unknown>>
  tasks_by_category?: Array<string | Record<string, unknown>>
}

type ApiEvent = {
  id?: string
  workspace?: string
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
  workspace: string
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

export const taskFlowApiErrorMessage = (error: unknown, fallback: string) => {
  const data = (error as { data?: unknown })?.data
  const message = (error as { message?: unknown })?.message
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

  if (typeof data === 'string') return data
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
  return new Intl.DateTimeFormat('en-GB').format(date).replace(/\//g, '-')
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

    saveStoredTokens({
      ...tokens,
      email,
      remember,
      loggedInAt: new Date().toISOString()
    })

    return tokens
  }

  const logout = () => {
    const accessCookie = useCookie<string | null>('taskflow-access')
    const refreshCookie = useCookie<string | null>('taskflow-refresh')

    accessCookie.value = null
    refreshCookie.value = null

    if (import.meta.client) localStorage.removeItem(authStorageKey)
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

  const getMe = async () => await apiFetch<MeProfile>('/me/')

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

    return await apiFetch<MeProfile>('/me/', {
      method: 'PATCH',
      body: form
    })
  }

  const listWorkspaces = async () => await apiFetch<PaginatedResponse<ApiWorkspace> | ApiWorkspace[]>('/workspaces/')

  const listProjects = async (query: Record<string, string | number | undefined> = {}) => {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value))
    })

    const suffix = params.toString() ? `?${params}` : ''
    return await apiFetch<PaginatedResponse<ApiProject>>(`/projects/${suffix}`)
  }

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

  const workspaceQuery = (workspaceId: string, extra: Record<string, string | number | undefined> = {}) => {
    const params = new URLSearchParams({ workspace: workspaceId })
    Object.entries(extra).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value))
    })
    return `?${params.toString()}`
  }

  const loadDashboardData = async () => {
    if (!getStoredTokens()) return null

    const workspaceResponse = await listWorkspaces()
    const workspaces = Array.isArray(workspaceResponse) ? workspaceResponse : workspaceResponse.results
    const workspace = workspaces[0]

    if (!workspace?.id) {
      return {
        workspaceId: '',
        workspaceName: '',
        analytics: {},
        tasks: [],
        projects: [],
        members: [],
        reports: [],
        events: [],
        stats: {
          activeProjects: 0,
          utilization: 0,
          teamVelocity: 0,
          overdueTasks: 0,
          projectSummary: {
            active: 0,
            inProgress: 0,
            completed: 0,
            atRisk: 0
          }
        }
      }
    }

    const workspaceId = workspace.id
    const [analytics, tasks, projects, members, reports, events] = await Promise.all([
      apiFetch<ApiAnalytics>(`/analytics/${workspaceQuery(workspaceId)}`),
      apiFetch<PaginatedResponse<ApiTask>>(`/tasks/${workspaceQuery(workspaceId, { page_size: 40 })}`),
      apiFetch<PaginatedResponse<ApiProject>>(`/projects/${workspaceQuery(workspaceId, { page_size: 40 })}`),
      apiFetch<PaginatedResponse<ApiMember>>(`/members/${workspaceQuery(workspaceId, { page_size: 60 })}`),
      apiFetch<PaginatedResponse<ApiReport>>(`/reports/${workspaceQuery(workspaceId, { page_size: 40 })}`),
      apiFetch<PaginatedResponse<ApiEvent>>(`/events/${workspaceQuery(workspaceId, { page_size: 100 })}`)
    ])
    const projectSummary = projects.results.reduce(
      (summary, project) => {
        if (project.status === 'in_progress') summary.inProgress += 1
        if (project.status === 'completed') summary.completed += 1
        if (project.status === 'at_risk') summary.atRisk += 1
        return summary
      },
      {
        active: projects.count,
        inProgress: 0,
        completed: 0,
        atRisk: 0
      }
    )

    return {
      workspaceId,
      workspaceName: workspace.name || workspace.slug || '',
      analytics,
      tasks: tasks.results,
      projects: projects.results,
      members: members.results,
      reports: reports.results,
      events: events.results,
      stats: {
        activeProjects: projects.count,
        utilization: Math.round(analytics.task_completion_rate || 0),
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
    task.progress ?? 0
  ]

  const mapProject = (project: ApiProject) => [
    project.name,
    titleCase(project.status),
    titleCase(project.priority),
    project.progress ?? 0,
    `${project.completed_task_count ?? 0}/${project.task_count ?? 0} tasks completed`,
    formatDate(project.due_date),
    project.id || '',
    project.workspace || '',
    project.description || '',
    project.start_date || '',
    JSON.stringify(project.member_details || []),
    ...projectMemberIds(project)
  ]

  const mapMember = (member: ApiMember) => {
    const user = member.user_detail || {}

    return [
      user.full_name || user.email || 'Team Member',
      user.job_title || titleCase(member.role),
      user.email || '-',
      user.phone || '-',
      member.efficiency ?? 0,
      member.completed_tasks ?? 0,
      member.in_progress_tasks ?? 0,
      member.user ?? user.id ?? 0,
      user.avatar || ''
    ]
  }

  const mapReport = (report: ApiReport) => [
    report.name,
    titleCase(report.report_type),
    formatDate(report.created_at),
    report.generated_by_detail?.full_name || 'System',
    titleCase(report.status)
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

  const mapAnalyticsMonthlyProgress = (analytics: ApiAnalytics) =>
    (analytics.monthly_progress || []).map((entry, index) => {
      const item = parseAnalyticsItem(entry)
      const month =
        String(item.month || item.name || item.label || item.date || `Month ${index + 1}`)
          .split(/\s+/)[0]
          .slice(0, 12)
      const completed = asNumber(item.completed ?? item.completed_tasks ?? item.completed_count ?? item.done ?? item.value)
      const created = asNumber(item.created ?? item.created_tasks ?? item.created_count ?? item.total ?? item.count)

      return [month, completed, created]
    })

  const mapAnalyticsTasksByCategory = (analytics: ApiAnalytics) =>
    (analytics.tasks_by_category || []).map((entry) => {
      const item = parseAnalyticsItem(entry)
      const name = String(item.category || item.name || item.label || item.title || 'Uncategorized')
      const value = asNumber(item.percent ?? item.percentage ?? item.value ?? item.count)
      const count = asNumber(item.count ?? item.tasks ?? item.total, value)

      return [name, value, count]
    })

  return {
    login,
    logout,
    refreshToken,
    changePassword,
    deleteAccount,
    getMe,
    updateMe,
    listProjects,
    listEvents,
    getEvent,
    createEvent,
    patchEvent,
    deleteEvent,
    listWorkspaces,
    getProject,
    createProject,
    updateProject,
    patchProject,
    deleteProject,
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
