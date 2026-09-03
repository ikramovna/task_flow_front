export type HelpTopic = {
  key: string
  title: string
  description: string
  articles: number
  tone: string
  icon: string
}

export type HelpFaq = { question: string; answer: string; topics: string[] }

const topics: HelpTopic[] = [
  { key: 'getting-started', title: 'Getting Started', description: 'Learn the basics and set up your workspace.', articles: 1, tone: 'blue', icon: 'M5 15 3 21l6-2 9-9a4.2 4.2 0 0 0-6-6l-9 9 2 2Zm7-11 6 6M9 19l-4-4m10-8 2-2' },
  { key: 'tasks-projects', title: 'Tasks & Projects', description: 'Manage tasks, projects, and workflows.', articles: 3, tone: 'violet', icon: 'M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2' },
  { key: 'team-management', title: 'Team Management', description: 'Invite team members and manage permissions.', articles: 2, tone: 'cyan', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
  { key: 'account-security', title: 'Account & Security', description: 'Manage your account, security and privacy.', articles: 1, tone: 'green', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Zm-3-10 2 2 4-4' },
  { key: 'reports-analytics', title: 'Reports & Analytics', description: 'Track progress and analyze your productivity.', articles: 2, tone: 'pink', icon: 'M4 20V10m5 10V4m5 16v-7m5 7V7' }
]

const faqs: HelpFaq[] = [
  { question: 'How do I create a new task?', answer: 'Open Tasks from the sidebar, select Create Task, complete the details and assign it to a team member.', topics: ['getting-started', 'tasks-projects'] },
  { question: 'How do I add team members?', answer: 'Open Staff List and select Add Member. Owners, admins and managers can invite people to their department.', topics: ['team-management'] },
  { question: 'How can I track project progress?', answer: 'Use Projects for milestone progress and Analytics for detailed team performance, workload and completion trends.', topics: ['tasks-projects', 'reports-analytics'] },
  { question: 'How do I assign tasks to team members?', answer: 'Create or edit a task, open the assignee picker and select one or more available department members.', topics: ['tasks-projects', 'team-management'] },
  { question: 'How do I generate a report?', answer: 'Open Reports, choose a ready-made template or Custom Report, select the date range and filters, then generate it.', topics: ['reports-analytics'] },
  { question: 'How do I manage notifications?', answer: 'Open Notifications from the sidebar to review updates. In Messages, use Contact Info to mute or enable notifications for the selected conversation.', topics: ['account-security'] },
]

export const useHelpStore = () => {
  const searchInput = useState('help:search-input', () => '')
  const search = useState('help:search', () => '')
  const activeTopic = useState('help:active-topic', () => '')
  const openFaq = useState<number | null>('help:open-faq', () => 0)

  const filteredFaqs = computed(() => {
    const query = search.value.trim().toLowerCase()
    return faqs.map((item, index) => ({ ...item, index })).filter(item => {
      if (activeTopic.value) return item.topics.includes(activeTopic.value)
      return !query || `${item.question} ${item.answer}`.toLowerCase().includes(query)
    })
  })

  const runSearch = (query = searchInput.value) => {
    activeTopic.value = ''
    searchInput.value = query
    search.value = query.trim()
    openFaq.value = filteredFaqs.value[0]?.index ?? null
  }

  const runTopicSearch = (topic: HelpTopic) => {
    searchInput.value = topic.title
    search.value = topic.title
    activeTopic.value = topic.key
    openFaq.value = filteredFaqs.value[0]?.index ?? null
  }

  return { topics, searchInput, search, activeTopic, openFaq, filteredFaqs, runSearch, runTopicSearch }
}
