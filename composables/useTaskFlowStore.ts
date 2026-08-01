export interface TaskFlowPageItem {
  key: string
  label: string
  icon: string
  group: 'menu' | 'general'
  badge?: number
}

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
  workspaceId: string
  workspaceName: string
  currentUserId: string
  currentDepartmentId: string
  currentRole: string
  loaded: boolean
}

const createEmptyState = (): TaskFlowState => ({
  loaded: true,
  pages: [
    { key: 'dashboard', label: 'Dashboard', icon: 'grid', group: 'menu' },
    { key: 'tasks', label: 'Tasks', icon: 'check', group: 'menu' },
    { key: 'projects', label: 'Projects', icon: 'folder', group: 'menu' },
    { key: 'analytics', label: 'Analytics', icon: 'chart', group: 'menu' },
    { key: 'calendar', label: 'Calendar', icon: 'calendar', group: 'menu' },
    { key: 'team', label: 'Team Members', icon: 'users', group: 'menu' },
    { key: 'reports', label: 'Reports', icon: 'file', group: 'menu' }
  ],
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
  workspaceId: '',
  workspaceName: '',
  currentUserId: '',
  currentDepartmentId: '',
  currentRole: ''
})

export const useTaskFlowStore = () => {
  const state = useState<TaskFlowState>('taskflow:store', () => ({ ...createEmptyState(), loaded: false }))
  const apiError = useState('taskflow:api-error', () => '')

  const loadBackendData = async () => {
    if (!import.meta.client) {
      state.value = { ...createEmptyState(), loaded: false }
      return
    }

    const api = useTaskFlowApi()

    try {
      const backend = await api.loadDashboardData()

      if (!backend) {
        apiError.value = ''
        state.value = createEmptyState()
        return
      }

      const projectSummary = backend.stats.projectSummary

      apiError.value = ''
      state.value = {
        ...createEmptyState(),
        loaded: true,
        stats: [
          [String(backend.stats.activeProjects), 'Active Projects', 'bg-[#EAF2FC]'],
          [`${backend.stats.utilization}%`, 'Utilization Rate', 'bg-task-lavender'],
          [String(backend.stats.teamVelocity), 'Team Velocity', 'bg-task-mint'],
          [String(backend.stats.overdueTasks), 'Overdue Tasks', 'bg-task-rose']
        ],
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
        workspaceId: backend.workspaceId,
        workspaceName: backend.workspaceName,
        currentUserId: backend.currentUserId,
        currentDepartmentId: backend.currentDepartmentId,
        currentRole: backend.currentRole
      }
    } catch (error) {
      console.warn('TaskFlow API load failed.', error)
      apiError.value = taskFlowApiErrorMessage(error, 'Could not load dashboard data')
      state.value = {
        ...createEmptyState(),
        loaded: true
      }
    }
  }

  return {
    state,
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
    workspaceId: computed(() => state.value.workspaceId),
    workspaceName: computed(() => state.value.workspaceName),
    currentUserId: computed(() => state.value.currentUserId),
    currentDepartmentId: computed(() => state.value.currentDepartmentId),
    currentRole: computed(() => state.value.currentRole),
    apiError: computed(() => apiError.value)
  }
}
