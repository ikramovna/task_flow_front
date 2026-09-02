export type MessageFilter = 'all' | 'unread' | 'groups'
export type ContactInfoSection = 'overview' | 'files' | 'links'

export const useMessagesStore = () => {
  const searchInput = useState('messages:search-input', () => '')
  const search = useState('messages:search', () => '')
  const activeConversationId = useState('messages:active-conversation', () => '')
  const draft = useState('messages:draft', () => '')
  const filter = useState<MessageFilter>('messages:filter', () => 'all')
  const newConversationOpen = useState('messages:new-conversation-open', () => false)
  const newConversationSearch = useState('messages:new-conversation-search', () => '')
  const emojiPickerOpen = useState('messages:emoji-picker-open', () => false)
  const emojiSearch = useState('messages:emoji-search', () => '')
  const chatSearchOpen = useState('messages:chat-search-open', () => false)
  const chatSearch = useState('messages:chat-search', () => '')
  const contactInfoOpen = useState('messages:contact-open', () => true)
  const contactInfoSection = useState<ContactInfoSection>('messages:contact-section', () => 'overview')
  const mutedConversations = useState<Record<string, boolean>>('messages:muted-conversations', () => ({}))
  const isConversationMuted = (conversationId?: string | number | null) => Boolean(conversationId && mutedConversations.value[String(conversationId)])
  const setConversationMuted = (conversationId: string | number, muted: boolean) => {
    mutedConversations.value = { ...mutedConversations.value, [String(conversationId)]: muted }
  }
  const toggleConversationMuted = (conversationId: string | number) => setConversationMuted(conversationId, !isConversationMuted(conversationId))

  const resetConversationUi = () => {
    chatSearchOpen.value = false
    chatSearch.value = ''
    emojiPickerOpen.value = false
    emojiSearch.value = ''
    contactInfoOpen.value = true
    contactInfoSection.value = 'overview'
  }

  return {
    searchInput, search, activeConversationId, draft, filter,
    newConversationOpen, newConversationSearch, emojiPickerOpen, emojiSearch,
    chatSearchOpen, chatSearch, contactInfoOpen, contactInfoSection,
    mutedConversations, isConversationMuted, setConversationMuted, toggleConversationMuted,
    resetConversationUi
  }
}
