import type { TaskFlowNotification } from './useTaskFlowApi'

export interface NotificationState {
  notifications: TaskFlowNotification[]
  unreadCount: number
  totalCount: number
  loading: boolean
  error: string | null
}

export const useNotifications = () => {
  const api = useTaskFlowApi()
  const state = useState<NotificationState>('taskflow:notifications', () => ({
    notifications: [], unreadCount: 0, totalCount: 0, loading: false, error: null
  }))
  const reset = () => {
    state.value = { notifications: [], unreadCount: 0, totalCount: 0, loading: false, error: null }
  }

  const load = async (options: { unread?: boolean; page?: number; pageSize?: number; append?: boolean } = {}) => {
    state.value.loading = true
    state.value.error = null
    try {
      const response = await api.getNotifications({ unread: options.unread, page: options.page, page_size: options.pageSize ?? 10 })
      state.value.notifications = options.append ? [...state.value.notifications, ...response.results] : response.results
      state.value.totalCount = response.count
      return response
    } catch (error) {
      state.value.error = taskFlowApiErrorMessage(error, 'Could not load notifications')
      throw error
    } finally {
      state.value.loading = false
    }
  }

  const refreshUnreadCount = async () => {
    try {
      const response = await api.getUnreadNotificationCount()
      state.value.unreadCount = Math.max(0, Number(response.unread_count) || 0)
    } catch (error) {
      console.warn('Notification count load failed.', error)
    }
  }

  const markRead = async (notification: TaskFlowNotification) => {
    if (notification.is_read) return notification
    const snapshot = state.value.notifications.map(item => ({ ...item }))
    const previousCount = state.value.unreadCount
    state.value.notifications = state.value.notifications.map(item => item.id === notification.id ? { ...item, is_read: true, read_at: new Date().toISOString() } : item)
    state.value.unreadCount = Math.max(0, previousCount - 1)
    try {
      const updated = await api.markNotificationRead(notification.id)
      state.value.notifications = state.value.notifications.map(item => item.id === updated.id ? updated : item)
      return updated
    } catch (error) {
      state.value.notifications = snapshot
      state.value.unreadCount = previousCount
      throw error
    }
  }

  const markAllRead = async (options: { reload?: boolean } = {}) => {
    const snapshot = state.value.notifications.map(item => ({ ...item }))
    const previousCount = state.value.unreadCount
    state.value.notifications = state.value.notifications.map(item => ({ ...item, is_read: true, read_at: item.read_at || new Date().toISOString() }))
    state.value.unreadCount = 0
    try {
      const result = await api.markAllNotificationsRead()
      if (options.reload !== false) await load({ pageSize: Math.max(10, state.value.notifications.length) })
      return result
    } catch (error) {
      state.value.notifications = snapshot
      state.value.unreadCount = previousCount
      throw error
    }
  }

  return { state, reset, load, refreshUnreadCount, markRead, markAllRead }
}
