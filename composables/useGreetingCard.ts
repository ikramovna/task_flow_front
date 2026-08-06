import { greetingConfig } from '~/constants/greetings'
import { getGreetingPeriod } from '~/utils/greeting'
import type { GreetingTheme } from '~/types/greeting'

export const useGreetingCard = (theme: Ref<GreetingTheme>) => {
  const now = ref(Date.now())
  const period = computed(() => getGreetingPeriod(new Date(now.value)))
  const config = computed(() => greetingConfig(period.value, theme.value))
  let timer: ReturnType<typeof setInterval> | undefined

  onMounted(() => { timer = setInterval(() => { now.value = Date.now() }, 30_000) })
  onBeforeUnmount(() => { if (timer) clearInterval(timer) })

  return { config: readonly(config), period: readonly(period) }
}
