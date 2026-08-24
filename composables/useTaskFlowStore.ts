import { taskFlowNavigation, type TaskFlowNavigationItem } from '~/constants/navigation'

export type TaskFlowPageItem = TaskFlowNavigationItem

export type TaskFlowTuple = Array<string | number>

export interface TaskFlowState {
  pages: TaskFlowPageItem[]
  stats: TaskFlowTuple[]
  projectStats: TaskFlowTuple[]
  analyticsStats: TaskFlowTuple[]
  monthlyProgress: TaskFlowTuple[]
  tasksByCategory: TaskFlowTuple[]
  tasks: TaskFlowTuple[]
  projects: TaskFlowTuple[]
  team: TaskFlowTuple[]
  workload: TaskFlowTuple[]
  reports: TaskFlowTuple[]
  events: TaskFlowTuple[]
  messages: string[]
  heatmap: number[]
  dashboardTodayEvents: Record<string, any>[]
  dashboardUpcomingEvents: Record<string, any>[]
  dashboardDeadlines: Record<string, any>[]
  dashboardDepartments: Record<string, any>[]
  dashboardRecentTasks: Record<string, any>[]
  dashboardGeneratedAt: string
  currentUserId: string
  currentDepartmentId: string
  currentRole: string
  currentUserActive: boolean
  currentUserHasAllDepartmentsAccess: boolean
  currentUserAccessibleDepartmentIds: string[]
  loaded: boolean
}

const createEmptyState = (): TaskFlowState => ({
  loaded: true,
  pages: taskFlowNavigation.map(item => ({ ...item })),
  stats: [],
  projectStats: [],
  analyticsStats: [],
  monthlyProgress: [],
  tasksByCategory: [],
  tasks: [],
  projects: [],
  team: [],
  workload: [],
  reports: [],
  events: [],
  messages: [],
  heatmap: [],
  dashboardTodayEvents: [],
  dashboardUpcomingEvents: [],
  dashboardDeadlines: [],
  dashboardDepartments: [],
  dashboardRecentTasks: [],
  dashboardGeneratedAt: '',
  currentUserId: '',
  currentDepartmentId: '',
  currentRole: '',
  currentUserActive: false,
  currentUserHasAllDepartmentsAccess: false,
  currentUserAccessibleDepartmentIds: []
})

export const useTaskFlowStore = () => {
  // Render the dashboard shell immediately. Backend data enhances the already
  // visible UI instead of gating the entire page (and its LCP image) behind API calls.
  const state = useState<TaskFlowState>('taskflow:store', () => createEmptyState())
  const apiError = useState('taskflow:api-error', () => '')

  const reset = () => {
    state.value = { ...createEmptyState(), loaded: false }
    apiError.value = ''
  }

  const loadBackendData = async () => {
    if (!import.meta.client) return

    const api = useTaskFlowApi()

    try {
      const backend = await api.loadDashboardData(({ dashboard, profile }) => {
        const membership = profile.department_membership || profile.membership || profile.memberships?.[0]
        const metric = (key: keyof typeof dashboard.summary) => ({
          count: Number(dashboard.summary?.[key]?.count ?? 0),
          percentage: Number(dashboard.summary?.[key]?.percentage ?? 0)
        })
        apiError.value = ''
        state.value = {
          ...state.value,
          loaded: true,
          stats: [
            [String(metric('total_tasks').count), 'Total Active Task', metric('total_tasks').percentage],
            [String(metric('completed_tasks').count), 'Submitted Tasks', metric('completed_tasks').percentage],
            [String(metric('in_progress_tasks').count), 'In Progress', metric('in_progress_tasks').percentage],
            [String(metric('not_started_tasks').count), 'Not Started', metric('not_started_tasks').percentage],
            [String(metric('backlog_tasks').count), 'Postponed', metric('backlog_tasks').percentage],
            [String(metric('on_hold_tasks').count), 'On Hold', metric('on_hold_tasks').percentage],
            [String(metric('overdue_tasks').count), 'Overdue Tasks', metric('overdue_tasks').percentage]
          ],
          dashboardTodayEvents: dashboard.today_events || [],
          dashboardUpcomingEvents: dashboard.upcoming_events || [],
          dashboardDeadlines: dashboard.upcoming_deadlines || [],
          dashboardDepartments: dashboard.tasks_by_department || [],
          dashboardRecentTasks: dashboard.recent_tasks || [],
          dashboardGeneratedAt: dashboard.generated_at || '',
          currentUserId: String(profile.id ?? ''),
          currentDepartmentId: String(profile.department || membership?.department || ''),
          currentRole: String(profile.role || membership?.role || '').trim().toLowerCase(),
          currentUserActive: profile.is_active !== false && membership?.is_active !== false,
          currentUserHasAllDepartmentsAccess: profile.has_all_departments_access === true || membership?.has_all_departments_access === true,
          currentUserAccessibleDepartmentIds: Array.from(new Set([
            String(profile.department || membership?.department || ''),
            ...(profile.accessible_departments || membership?.accessible_departments || []).map((department: any) => String(typeof department === 'object' ? department?.id || '' : department || ''))
          ].filter(Boolean)))
        }
      })

      if (!backend) {
        apiError.value = ''
        state.value = createEmptyState()
        return
      }

      const projectSummary = backend.stats.projectSummary
      const dashboard = backend.dashboard
      const dashboardMetric = (key: keyof NonNullable<typeof dashboard>['summary']) => {
        const metric = dashboard?.summary?.[key]
        return {
          count: Number(metric?.count ?? 0),
          percentage: Number(metric?.percentage ?? 0)
        }
      }

      apiError.value = ''
      state.value = {
        ...createEmptyState(),
        loaded: true,
        stats: dashboard ? [
          [String(dashboardMetric('total_tasks').count), 'Total Active Task', dashboardMetric('total_tasks').percentage],
          [String(dashboardMetric('completed_tasks').count), 'Submitted Tasks', dashboardMetric('completed_tasks').percentage],
          [String(dashboardMetric('in_progress_tasks').count), 'In Progress', dashboardMetric('in_progress_tasks').percentage],
          [String(dashboardMetric('not_started_tasks').count), 'Not Started', dashboardMetric('not_started_tasks').percentage],
          [String(dashboardMetric('backlog_tasks').count), 'Postponed', dashboardMetric('backlog_tasks').percentage],
          [String(dashboardMetric('on_hold_tasks').count), 'On Hold', dashboardMetric('on_hold_tasks').percentage],
          [String(dashboardMetric('overdue_tasks').count), 'Overdue Tasks', dashboardMetric('overdue_tasks').percentage]
        ] : [],
        projectStats: [
          [String(projectSummary.active), 'Active Projects', 'bg-[#EAF2FC]'],
          [String(projectSummary.inProgress), 'In Progress', 'bg-task-lavender'],
          [String(projectSummary.completed), 'Completed', 'bg-task-mint'],
          [String(projectSummary.atRisk), 'At Risk Projects', 'bg-task-rose']
        ],
        analyticsStats: [
          [`${backend.stats.utilization}%`, 'Task Completion Rate', 'bg-[#EAF2FC]'],
          [String(backend.stats.overdueTasks), 'Overdue Tasks', 'bg-task-lavender'],
          [String(backend.stats.teamVelocity), 'Team Velocity', 'bg-task-mint'],
          [String(backend.stats.activeProjects), 'Active Projects', 'bg-task-rose']
        ],
        monthlyProgress: api.mapAnalyticsMonthlyProgress(backend.analytics),
        tasksByCategory: api.mapAnalyticsTasksByCategory(backend.analytics),
        tasks: backend.tasks.map(api.mapTask),
        projects: backend.projects.map(api.mapProject),
        team: backend.members.map(api.mapMember),
        workload: backend.members.slice(0, 5).map((member) => {
          const mapped = api.mapMember(member)
          const active = Number(mapped[6] || 0)
          const completed = Number(mapped[5] || 0)
          const status = active > 8 ? 'Under Pressure' : completed > 18 ? 'On Track' : 'Balanced'

          return [mapped[0], mapped[1], active, Math.max(0, Math.round(active / 3)), status, 'success']
        }),
        reports: backend.reports.map(api.mapReport),
        events: backend.events.map(api.mapEvent),
        dashboardTodayEvents: dashboard?.today_events || [],
        dashboardUpcomingEvents: dashboard?.upcoming_events || [],
        dashboardDeadlines: dashboard?.upcoming_deadlines || [],
        dashboardDepartments: dashboard?.tasks_by_department || [],
        dashboardRecentTasks: dashboard?.recent_tasks || [],
        dashboardGeneratedAt: dashboard?.generated_at || '',
        currentUserId: backend.currentUserId,
        currentDepartmentId: backend.currentDepartmentId,
        currentRole: backend.currentRole,
        currentUserActive: backend.currentUserActive,
        currentUserHasAllDepartmentsAccess: backend.currentUserHasAllDepartmentsAccess,
        currentUserAccessibleDepartmentIds: backend.currentUserAccessibleDepartmentIds
      }
    } catch (error) {
      console.warn('TaskFlow API load failed.', error)
      apiError.value = taskFlowApiErrorMessage(error, 'Could not load dashboard data')
      // Keep permissions available even when an unrelated dashboard/list
      // endpoint fails. Creation rights are defined by `/me/`, not by the
      // success of projects, analytics, members, or reports requests.
      try {
        const profile = await api.getMe()
        const membership = profile.department_membership || profile.membership || profile.memberships?.[0]
        state.value = {
          ...createEmptyState(),
          loaded: true,
          currentUserId: String(profile.id ?? ''),
          currentDepartmentId: String(profile.department || membership?.department || ''),
          currentRole: String(profile.role || membership?.role || '').trim().toLowerCase(),
          currentUserActive: profile.is_active !== false && membership?.is_active !== false,
          currentUserHasAllDepartmentsAccess: profile.has_all_departments_access === true || membership?.has_all_departments_access === true,
          currentUserAccessibleDepartmentIds: Array.from(new Set([
            String(profile.department || membership?.department || ''),
            ...(profile.accessible_departments || membership?.accessible_departments || []).map((department: any) => String(typeof department === 'object' ? department?.id || '' : department || ''))
          ].filter(Boolean)))
        }
      } catch (profileError) {
        console.warn('TaskFlow profile load failed.', profileError)
        state.value = {
          ...createEmptyState(),
          loaded: true
        }
      }
    }
  }

  return {
    state,
    reset,
    loadBackendData,
    pages: computed(() => state.value.pages),
    stats: computed(() => state.value.stats),
    projectStats: computed(() => state.value.projectStats),
    analyticsStats: computed(() => state.value.analyticsStats),
    monthlyProgress: computed(() => state.value.monthlyProgress),
    tasksByCategory: computed(() => state.value.tasksByCategory),
    tasks: computed(() => state.value.tasks),
    projects: computed(() => state.value.projects),
    team: computed(() => state.value.team),
    workload: computed(() => state.value.workload),
    reports: computed(() => state.value.reports),
    events: computed(() => state.value.events),
    messages: computed(() => state.value.messages),
    heatmap: computed(() => state.value.heatmap),
    dashboardTodayEvents: computed(() => state.value.dashboardTodayEvents),
    dashboardUpcomingEvents: computed(() => state.value.dashboardUpcomingEvents),
    dashboardDeadlines: computed(() => state.value.dashboardDeadlines),
    dashboardDepartments: computed(() => state.value.dashboardDepartments),
    dashboardRecentTasks: computed(() => state.value.dashboardRecentTasks),
    dashboardGeneratedAt: computed(() => state.value.dashboardGeneratedAt),
    currentUserId: computed(() => state.value.currentUserId),
    currentDepartmentId: computed(() => state.value.currentDepartmentId),
    currentRole: computed(() => state.value.currentRole),
    currentUserActive: computed(() => state.value.currentUserActive),
    currentUserHasAllDepartmentsAccess: computed(() => state.value.currentUserHasAllDepartmentsAccess),
    currentUserAccessibleDepartmentIds: computed(() => state.value.currentUserAccessibleDepartmentIds),
    apiError: computed(() => apiError.value)
  }
}
