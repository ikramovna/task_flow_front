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
  workspaces?: T[]
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
  membership?: { role?: string; department?: string; is_active?: boolean }
  department_membership?: { role?: string; department?: string; is_active?: boolean }
  memberships?: Array<{ role?: string; department?: string; is_active?: boolean }>
}

type ApiTask = {
  id?: string
  department?: string
  title: string
  status?: string
  priority?: string
  due_date?: string | null
  progress?: number
  description?: string
  category?: string
  assignees?: Array<string | number>
  assignee_details?: UserBrief[]
  is_archived?: boolean
  archived_at?: string | null
  archived_by?: string | number | UserBrief | null
}

type TaskPayload = {
  department: string
  title: string
  description: string
  status: string
  priority: string
  category: string
  assignees: Array<string | number>
  due_date: string
  progress: number
}

type ApiProject = {
  id?: string
  workspace?: string
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
  workspace: string
  department: string
  name: string
  description: string
  status: string
  priority: string
  start_date: string
  due_date: string
  members: Array<string | number>
}

type ApiWorkspace = {
  id?: string
  uuid?: string
  workspace?: string | { id?: string; uuid?: string; name?: string; slug?: string }
  workspace_id?: string
  name?: string
  slug?: string
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
  completed_tasks?: number
  in_progress_tasks?: number
}

type MemberPayload = {
  first_name: string
  last_name: string
  email: string
  username: string
  department: string
  role: string
  is_active: boolean
}

type MemberSummary = {
  total_members?: number
  average_efficiency?: number
  active_tasks?: number
}

type ApiReport = {
  id?: string
  workspace?: string
  name: string
  report_type?: string
  description?: string
  created_at?: string
  status?: string
  generated_by_detail?: UserBrief
}

type ReportPayload = {
  workspace: string
  name: string
  report_type: string
  parameters: string
}

type ApiAnalytics = {
  task_completion_rate?: number
  team_velocity?: number
  overdue_tasks?: number
  monthly_progress?: Array<string | Record<string, unknown>>
  tasks_by_category?: Array<string | Record<string, unknown>>
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
  const status = (error as { status?: number; statusCode?: number })?.status
    || (error as { statusCode?: number })?.statusCode
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

    if (import.meta.client) {
      localStorage.removeItem(authStorageKey)
      sessionStorage.removeItem(authStorageKey)
      document.documentElement.classList.remove('tf-dark')
      document.documentElement.style.colorScheme = 'light'
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

  const getMe = async () => await apiFetch<MeProfile>('/me/')
  const getDashboard = async () => await apiFetch<DashboardResponse>('/dashboard/')

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
      method: 'PUT',
      body: form
    })
  }

  const listItems = <T>(response: ListResponse<T> | unknown): T[] => {
    if (Array.isArray(response)) return response
    if (!response || typeof response !== 'object') return []

    const record = response as Record<string, unknown>
    if (Array.isArray(record.results)) return record.results as T[]
    if (Array.isArray(record.data)) return record.data as T[]
    if (Array.isArray(record.items)) return record.items as T[]
    if (Array.isArray(record.workspaces)) return record.workspaces as T[]

    if (record.data && typeof record.data === 'object') {
      const dataRecord = record.data as Record<string, unknown>
      if (Array.isArray(dataRecord.results)) return dataRecord.results as T[]
      if (Array.isArray(dataRecord.items)) return dataRecord.items as T[]
    }

    return []
  }

  const listWorkspaces = async (): Promise<ApiWorkspace[]> => {
    const sources = await Promise.allSettled([
      apiFetch<PaginatedResponse<ApiProject>>('/projects/?page_size=1'),
      apiFetch<ListResponse<ApiMember>>('/members/?page_size=1'),
      apiFetch<PaginatedResponse<ApiEvent>>('/events/?page_size=1'),
      apiFetch<PaginatedResponse<ApiReport>>('/reports/?page_size=1')
    ])

    for (const source of sources) {
      if (source.status !== 'fulfilled') continue
      const item = listItems<{ workspace?: string }>(source.value)[0]
      if (item?.workspace) return [{ id: item.workspace }]
    }

    return []
  }

  const workspaceIdOf = (workspace: ApiWorkspace) => {
    if (workspace.id) return workspace.id
    if (workspace.uuid) return workspace.uuid
    if (workspace.workspace_id) return workspace.workspace_id
    if (typeof workspace.workspace === 'string') return workspace.workspace
    return workspace.workspace?.id || workspace.workspace?.uuid || ''
  }

  const workspaceNameOf = (workspace: ApiWorkspace) => {
    if (workspace.name || workspace.slug) return workspace.name || workspace.slug || ''
    if (typeof workspace.workspace === 'object') return workspace.workspace.name || workspace.workspace.slug || ''
    return ''
  }

  const workspaceItems = (response: ListResponse<ApiWorkspace> | unknown) => {
    const listed = listItems<ApiWorkspace>(response)
    if (listed.length) return listed
    if (!response || typeof response !== 'object') return []

    const record = response as Record<string, unknown>
    const direct = record as ApiWorkspace
    if (workspaceIdOf(direct)) return [direct]

    if (record.data && typeof record.data === 'object' && !Array.isArray(record.data)) {
      const dataWorkspace = record.data as ApiWorkspace
      if (workspaceIdOf(dataWorkspace)) return [dataWorkspace]
    }

    if (record.workspace && typeof record.workspace === 'object' && !Array.isArray(record.workspace)) {
      const nestedWorkspace = record.workspace as ApiWorkspace
      if (workspaceIdOf(nestedWorkspace)) return [nestedWorkspace]
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

  const getMember = async (id: string) => await apiFetch<ApiMember>(`/members/${id}/`)

  const createMember = async (member: MemberPayload) =>
    await apiFetch<ApiMember>('/members/', {
      method: 'POST',
      body: member
    })

  const patchMember = async (id: string, member: Partial<MemberPayload>) =>
    await apiFetch<ApiMember>(`/members/${id}/`, {
      method: 'PATCH',
      body: member
    })

  const deleteMember = async (id: string) =>
    await apiFetch(`/members/${id}/`, {
      method: 'DELETE'
    })

  const getMembersSummary = async () =>
    await apiFetch<MemberSummary>('/members/summary/')

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

  const getReport = async (id: string) => await apiFetch<ApiReport>(`/reports/${id}/`)

  const workspaceQuery = (workspaceId: string, extra: Record<string, string | number | undefined> = {}) => {
    const params = new URLSearchParams({ workspace: workspaceId })
    Object.entries(extra).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value))
    })
    return `?${params.toString()}`
  }

  const loadDashboardData = async () => {
    if (!getStoredTokens()) return null

    // The dashboard is department/user scoped and must not depend on legacy workspace discovery.
    const [dashboard, profile] = await Promise.all([getDashboard(), getMe()])
    const profileMembership = profile.department_membership || profile.membership || profile.memberships?.[0]
    const profileRole = String(profile.role || profileMembership?.role || '').trim().toLowerCase()
    const profileDepartment = String(profile.department || profileMembership?.department || '')
    const profileIsActive = profile.is_active !== false && profileMembership?.is_active !== false

    const workspaceResponse = await listWorkspaces()
    const workspaces = workspaceItems(workspaceResponse)
    const workspace = workspaces[0]

    const resolvedWorkspaceId = workspace ? workspaceIdOf(workspace) : ''

    if (!resolvedWorkspaceId) {
      return {
        workspaceId: '',
        workspaceName: '',
        currentUserId: String(profile.id ?? ''),
        currentDepartmentId: profileDepartment,
        currentRole: profileRole,
        currentUserActive: profileIsActive,
        dashboard,
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

    const workspaceId = resolvedWorkspaceId
    const [analytics, tasks, projects, members, reports, events] = await Promise.all([
      apiFetch<ApiAnalytics>(`/analytics/${workspaceQuery(workspaceId)}`),
      apiFetch<PaginatedResponse<ApiTask>>('/tasks/?page_size=40'),
      apiFetch<PaginatedResponse<ApiProject>>(`/projects/${workspaceQuery(workspaceId, { page_size: 40 })}`),
      listMembers({ page_size: 60 }),
      apiFetch<PaginatedResponse<ApiReport>>(`/reports/${workspaceQuery(workspaceId, { page_size: 40 })}`),
      apiFetch<PaginatedResponse<ApiEvent>>(`/events/${workspaceQuery(workspaceId, { page_size: 100 })}`)
    ])
    const memberItems = listItems<ApiMember>(members)
    const isCurrentMembership = (member: ApiMember) => {
      const memberUserId = String(member.id ?? '')
      const memberEmail = String(member.email ?? '').trim().toLowerCase()
      return memberUserId === String(profile.id ?? '') || Boolean(profile.email && memberEmail === profile.email.trim().toLowerCase())
    }
    let currentMembership = memberItems.find(isCurrentMembership)
    if (!currentMembership && profile.email) {
      const ownMemberships = listItems<ApiMember>(await listMembers({
        search: profile.email,
        page_size: 10
      }))
      currentMembership = ownMemberships.find(isCurrentMembership)
    }
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
      workspaceName: workspaceNameOf(workspace),
      currentUserId: String(profile.id ?? ''),
      // `/me/` is the authoritative source for permissions. A stale or partial
      // member row must never downgrade an owner/admin/manager in the UI.
      currentDepartmentId: profileDepartment || String(currentMembership?.department || ''),
      currentRole: profileRole,
      currentUserActive: profileIsActive,
      dashboard,
      analytics,
      tasks: tasks.results,
      projects: projects.results,
      members: memberItems,
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
    typeof task.archived_by === 'object' ? JSON.stringify(task.archived_by || {}) : String(task.archived_by || '')
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
    project.department || '',
    JSON.stringify(project.member_details || []),
    ...projectMemberIds(project)
  ]

  const mapMember = (member: ApiMember) => {
    const fullName = member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email || ''
    const memberId = member.id ?? ''
    const departmentId = typeof member.department === 'string' ? member.department : member.department?.id || ''

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
      '',
      departmentId,
      member.is_active === false ? 'Inactive' : 'Active',
      member.date_joined || member.joined_at || ''
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
    getDashboard,
    updateMe,
    listProjects,
    listMembers,
    getMember,
    createMember,
    patchMember,
    deleteMember,
    getMembersSummary,
    listEvents,
    getEvent,
    createEvent,
    createReport,
    getReport,
    patchEvent,
    deleteEvent,
    listWorkspaces,
    listItems,
    workspaceItems,
    workspaceIdOf,
    workspaceNameOf,
    getProject,
    createProject,
    updateProject,
    patchProject,
    deleteProject,
    createTask,
    getTask,
    listTasks,
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
