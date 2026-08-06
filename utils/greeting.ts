import type { GreetingPeriod } from '~/types/greeting'

export const getTashkentHour = (date = new Date()): number => Number(new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Tashkent', hour: '2-digit', hour12: false
}).format(date))

export const getGreetingPeriod = (date = new Date()): GreetingPeriod => {
  const hour = getTashkentHour(date)
  return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
}
