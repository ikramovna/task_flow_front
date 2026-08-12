
import type { DefineComponent, SlotsType } from 'vue'
type IslandComponent<T> = DefineComponent<{}, {refresh: () => Promise<void>}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, SlotsType<{ fallback: { error: unknown } }>> & T

type HydrationStrategies = {
  hydrateOnVisible?: IntersectionObserverInit | true
  hydrateOnIdle?: number | true
  hydrateOnInteraction?: keyof HTMLElementEventMap | Array<keyof HTMLElementEventMap> | true
  hydrateOnMediaQuery?: string
  hydrateAfter?: number
  hydrateWhen?: boolean
  hydrateNever?: true
}
type LazyComponent<T> = DefineComponent<HydrationStrategies, {}, {}, {}, {}, {}, {}, { hydrated: () => void }> & T


export const EmptyCalendarArt: typeof import("../components/EmptyCalendarArt.vue")['default']
export const FocusRadio: typeof import("../components/FocusRadio.vue")['default']
export const GreetingAfternoonDark: typeof import("../components/GreetingAfternoonDark.vue")['default']
export const GreetingAfternoonLight: typeof import("../components/GreetingAfternoonLight.vue")['default']
export const GreetingCard: typeof import("../components/GreetingCard.vue")['default']
export const GreetingEveningDark: typeof import("../components/GreetingEveningDark.vue")['default']
export const GreetingEveningLight: typeof import("../components/GreetingEveningLight.vue")['default']
export const GreetingMorningDark: typeof import("../components/GreetingMorningDark.vue")['default']
export const GreetingMorningLight: typeof import("../components/GreetingMorningLight.vue")['default']
export const LoadingPulse: typeof import("../components/LoadingPulse.vue")['default']
export const NotificationCenter: typeof import("../components/NotificationCenter.vue")['default']
export const NotificationItem: typeof import("../components/NotificationItem.vue")['default']
export const NotificationPreferences: typeof import("../components/NotificationPreferences.vue")['default']
export const NotificationsView: typeof import("../components/NotificationsView.vue")['default']
export const NuxtWelcome: typeof import("../node_modules/nuxt/dist/app/components/welcome.vue")['default']
export const NuxtLayout: typeof import("../node_modules/nuxt/dist/app/components/nuxt-layout")['default']
export const NuxtErrorBoundary: typeof import("../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']
export const ClientOnly: typeof import("../node_modules/nuxt/dist/app/components/client-only")['default']
export const DevOnly: typeof import("../node_modules/nuxt/dist/app/components/dev-only")['default']
export const ServerPlaceholder: typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']
export const NuxtLink: typeof import("../node_modules/nuxt/dist/app/components/nuxt-link")['default']
export const NuxtLoadingIndicator: typeof import("../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']
export const NuxtTime: typeof import("../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']
export const NuxtRouteAnnouncer: typeof import("../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']
export const NuxtImg: typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']
export const NuxtPicture: typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']
export const NuxtPage: typeof import("../node_modules/nuxt/dist/pages/runtime/page")['default']
export const NoScript: typeof import("../node_modules/nuxt/dist/head/runtime/components")['NoScript']
export const Link: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Link']
export const Base: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Base']
export const Title: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Title']
export const Meta: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Meta']
export const Style: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Style']
export const Head: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Head']
export const Html: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Html']
export const Body: typeof import("../node_modules/nuxt/dist/head/runtime/components")['Body']
export const NuxtIsland: typeof import("../node_modules/nuxt/dist/app/components/nuxt-island")['default']
export const LazyEmptyCalendarArt: LazyComponent<typeof import("../components/EmptyCalendarArt.vue")['default']>
export const LazyFocusRadio: LazyComponent<typeof import("../components/FocusRadio.vue")['default']>
export const LazyGreetingAfternoonDark: LazyComponent<typeof import("../components/GreetingAfternoonDark.vue")['default']>
export const LazyGreetingAfternoonLight: LazyComponent<typeof import("../components/GreetingAfternoonLight.vue")['default']>
export const LazyGreetingCard: LazyComponent<typeof import("../components/GreetingCard.vue")['default']>
export const LazyGreetingEveningDark: LazyComponent<typeof import("../components/GreetingEveningDark.vue")['default']>
export const LazyGreetingEveningLight: LazyComponent<typeof import("../components/GreetingEveningLight.vue")['default']>
export const LazyGreetingMorningDark: LazyComponent<typeof import("../components/GreetingMorningDark.vue")['default']>
export const LazyGreetingMorningLight: LazyComponent<typeof import("../components/GreetingMorningLight.vue")['default']>
export const LazyLoadingPulse: LazyComponent<typeof import("../components/LoadingPulse.vue")['default']>
export const LazyNotificationCenter: LazyComponent<typeof import("../components/NotificationCenter.vue")['default']>
export const LazyNotificationItem: LazyComponent<typeof import("../components/NotificationItem.vue")['default']>
export const LazyNotificationPreferences: LazyComponent<typeof import("../components/NotificationPreferences.vue")['default']>
export const LazyNotificationsView: LazyComponent<typeof import("../components/NotificationsView.vue")['default']>
export const LazyNuxtWelcome: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/welcome.vue")['default']>
export const LazyNuxtLayout: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-layout")['default']>
export const LazyNuxtErrorBoundary: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-error-boundary.vue")['default']>
export const LazyClientOnly: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/client-only")['default']>
export const LazyDevOnly: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/dev-only")['default']>
export const LazyServerPlaceholder: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/server-placeholder")['default']>
export const LazyNuxtLink: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-link")['default']>
export const LazyNuxtLoadingIndicator: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-loading-indicator")['default']>
export const LazyNuxtTime: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-time.vue")['default']>
export const LazyNuxtRouteAnnouncer: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-route-announcer")['default']>
export const LazyNuxtImg: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtImg']>
export const LazyNuxtPicture: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-stubs")['NuxtPicture']>
export const LazyNuxtPage: LazyComponent<typeof import("../node_modules/nuxt/dist/pages/runtime/page")['default']>
export const LazyNoScript: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['NoScript']>
export const LazyLink: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Link']>
export const LazyBase: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Base']>
export const LazyTitle: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Title']>
export const LazyMeta: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Meta']>
export const LazyStyle: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Style']>
export const LazyHead: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Head']>
export const LazyHtml: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Html']>
export const LazyBody: LazyComponent<typeof import("../node_modules/nuxt/dist/head/runtime/components")['Body']>
export const LazyNuxtIsland: LazyComponent<typeof import("../node_modules/nuxt/dist/app/components/nuxt-island")['default']>

export const componentNames: string[]
