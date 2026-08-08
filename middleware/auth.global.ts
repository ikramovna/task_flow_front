export default defineNuxtRouteMiddleware((to) => {
  // Static generation has no browser token. A server redirect here would be
  // baked into index.html and log users out on every hard refresh.
  if (import.meta.server) return

  const publicRoutes = ['/login', '/logout', '/forgot-password', '/reset-password']
  const accessToken = useCookie<string | null>('taskflow-access')
  const hasCookieToken = Boolean(accessToken.value)
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
