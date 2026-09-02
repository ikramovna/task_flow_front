export type ReportTemplate = {
  title: string
  description: string
  type: string
  tone: string
  icon: string
  apiType?: string
}

export const fallbackReportTemplates: ReportTemplate[] = [
  { title: 'Weekly Progress Report', description: 'A focused summary of completed and in-progress tasks for the week.', type: 'Weekly Progress', tone: 'blue', icon: 'M4 19V5m0 14h16M7 15l3-4 3 2 5-7' },
  { title: 'Team Performance Report', description: 'Individual output, team momentum and productivity insights.', type: 'Team Performance', tone: 'green', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 0a4 4 0 0 0 0-8m5 18v-2a4 4 0 0 0-3-3.87' },
  { title: 'Project Status Report', description: 'Project health, delivery risks and milestone tracking in one view.', type: 'Project Status', tone: 'orange', icon: 'M3 7h18v13H3V7Zm0 0 3-4h5l2 4' },
  { title: 'Time Tracking Report', description: 'Hours logged by team members across active projects.', type: 'Time Tracking', tone: 'violet', icon: 'M12 8v5l3 2m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' }
]

export const reportTypeOptions = ['Weekly Progress', 'Team Performance', 'Project Status', 'Time Tracking']
export const reportTypeApiValues: Record<string, string> = {
  'Weekly Progress': 'weekly_progress',
  'Team Performance': 'team_performance',
  'Project Status': 'project_status',
  'Time Tracking': 'time_tracking'
}

export const useReportsStore = () => {
  const searchInput = useState('reports:search-input', () => '')
  const search = useState('reports:search', () => '')
  const statusFilter = useState('reports:status-filter', () => 'All statuses')
  const sort = useState<'newest' | 'oldest'>('reports:sort', () => 'newest')
  const typeFilter = useState('reports:type-filter', () => 'All types')
  const dateFilter = useState('reports:date-filter', () => 'Last 30 days')
  const templates = useState<ReportTemplate[]>('reports:templates', () => fallbackReportTemplates.map(item => ({ ...item })))
  const summary = useState('reports:summary', () => ({ generated: 0, scheduled: 0, lastGenerated: 'No reports yet' }))
  const total = useState('reports:total', () => 0)
  const loading = useState('reports:loading', () => false)
  const page = useState('reports:page', () => 1)
  const reportType = useState('reports:builder-type', () => 'Weekly Progress')
  const reportStatus = useState('reports:builder-status', () => 'All Statuses')
  const reportPriority = useState('reports:builder-priority', () => 'All Priorities')

  const resetFilters = () => {
    searchInput.value = ''
    search.value = ''
    statusFilter.value = 'All statuses'
    typeFilter.value = 'All types'
    dateFilter.value = 'Last 30 days'
    sort.value = 'newest'
    page.value = 1
  }

  return {
    searchInput, search, statusFilter, sort, typeFilter, dateFilter, templates,
    summary, total, loading, page, reportType, reportStatus, reportPriority,
    reportTypeOptions, reportTypeApiValues, fallbackReportTemplates, resetFilters
  }
}
