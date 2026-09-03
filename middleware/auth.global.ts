export default defineNuxtRouteMiddleware((to) => {
  const publicRoutes = ['/login', '/logout', '/forgot-password', '/reset-password']
  const accessToken = useCookie<string | null>('taskflow-access')
  const hasCookieToken = Boolean(accessToken.value)

  // During SSR the cookie is the shared source of truth. Redirecting before
  // rendering prevents the server from sending dashboard markup that the
  // client immediately replaces with the login page during hydration.
  // Prerendering has no request cookie, so it must stay route-neutral.
  if (import.meta.server) {
    if (import.meta.prerender) return
    if (!hasCookieToken && !publicRoutes.includes(to.path)) return navigateTo('/login')
    if (hasCookieToken && to.path === '/login') return navigateTo('/')
    return
  }

  let hasClientToken = false

  try {
    const stored = JSON.parse(localStorage.getItem('taskflow-auth') || '{}')
    hasClientToken = Boolean(stored.access && stored.refresh)
  } catch {
    localStorage.removeItem('taskflow-auth')
  }
  const isAuthenticated = hasCookieToken || hasClientToken

  if (!isAuthenticated && !publicRoutes.includes(to.path)) {
    return navigateTo('/login')
  }

  if (isAuthenticated && to.path === '/login') {
    return navigateTo('/')
  }
})
