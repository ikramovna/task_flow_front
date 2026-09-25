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

  // Static hosting initially serves the requested route's prerendered HTML.
  // Switching routes during hydration can retain its root attributes (for
  // example dashboard's tf-shell on the login page). Load the destination
  // document instead; later navigations remain client-side.
  const nuxtApp = useNuxtApp()
  const redirect = (path: string) => navigateTo(path, {
    replace: true,
    external: Boolean(nuxtApp.isHydrating && nuxtApp.payload.serverRendered)
  })

  if (!isAuthenticated && !publicRoutes.includes(to.path)) {
    return redirect('/login')
  }

  if (isAuthenticated && to.path === '/login') {
    return redirect('/')
  }
})
