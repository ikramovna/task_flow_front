export type GreetingPeriod = 'morning' | 'afternoon' | 'evening'
export type GreetingTheme = 'light' | 'dark'

export interface GreetingCardConfig {
  period: GreetingPeriod
  theme: GreetingTheme
  greeting: string
  icon: string
  quote: string
  author: string
  background: string
}

export interface GreetingCardProps {
  name: string
  subtitle?: string
  notificationCount?: number
  showActions?: boolean
  interactive?: boolean
}
