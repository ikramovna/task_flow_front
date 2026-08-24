export type TaskFlowPageKey =
  | 'dashboard'
  | 'tasks'
  | 'projects'
  | 'analytics'
  | 'calendar'
  | 'team'
  | 'reports'
  | 'messages'
  | 'notifications'
  | 'settings'
  | 'help'

export type TaskFlowNavigationItem = {
  key: TaskFlowPageKey
  label: string
  icon: string
  group: 'menu' | 'general'
  badge?: number
}

export const taskFlowNavigation: TaskFlowNavigationItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid', group: 'menu' },
  { key: 'tasks', label: 'Tasks', icon: 'check', group: 'menu' },
  { key: 'projects', label: 'Projects', icon: 'folder', group: 'menu' },
  { key: 'analytics', label: 'Analytics', icon: 'chart', group: 'menu' },
  { key: 'calendar', label: 'Calendar', icon: 'calendar', group: 'menu' },
  { key: 'team', label: 'Team Members', icon: 'users', group: 'menu' },
  { key: 'reports', label: 'Reports', icon: 'file', group: 'menu' },
  { key: 'messages', label: 'Messages', icon: 'message', group: 'menu' },
  { key: 'settings', label: 'Settings', icon: 'settings', group: 'general' },
  { key: 'help', label: 'Help & Support', icon: 'help', group: 'general' }
]

export const taskFlowSidebarGroups = [
  { label: 'MAIN', keys: ['dashboard', 'tasks', 'projects', 'analytics', 'calendar'] },
  { label: 'TEAM', keys: ['team'] },
  { label: 'REPORTS', keys: ['reports', 'messages'] },
  { label: 'GENERAL', keys: ['help'] }
] as const
