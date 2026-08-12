import type { GreetingCardConfig, GreetingPeriod, GreetingTheme } from '~/types/greeting'

export const GREETING_SUBTITLE = "Here's what's happening with your team today"

const copy = {
  morning: { greeting: 'Good morning', icon: '☀️', quote: 'Every morning is a fresh start. Make today amazing.', author: 'Unknown' },
  afternoon: { greeting: 'Good afternoon', icon: '🌤️', quote: 'Progress is the sum of small efforts, repeated day in and day out.', author: 'Robert Collier' },
  evening: { greeting: 'Good evening', icon: '🌙', quote: "Don't watch the clock; do what it does. Keep going.", author: 'Sam Levenson' }
} as const

export const greetingConfig = (period: GreetingPeriod, theme: GreetingTheme): GreetingCardConfig => ({
  period,
  theme,
  ...copy[period],
  background: `/greeting-cards/${period}-${theme}-panorama-v4-1440.webp`
})
