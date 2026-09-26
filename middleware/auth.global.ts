export default defineNuxtRouteMiddleware((to) => {
  const publicRoutes = ['/login', '/logout', '/forgot-password', '/reset-password']
  // Static hosting canonicalizes page directories with a trailing slash.
  // Treat /login and /login/ as the same route before checking access.
  const path = to.path.replace(/\/+$/, '') || '/'
  // A saved token can be expired or invalid. Keep sign-in accessible so it
  // cannot bounce back to the dashboard before the session is verified.
  if (publicRoutes.includes(path)) return

  // During SSR the cookie is the shared source of truth. Redirecting before
  // rendering prevents the server from sending dashboard markup that the
  // client immediately replaces with the login page during hydration.
  // Prerendering has no request cookie, so it must stay route-neutral.
  if (import.meta.server) {
    if (import.meta.prerender) return
    if (!taskFlowHasSession()) return navigateTo('/login')
    return
  }

  // Static hosting initially serves the requested route's prerendered HTML.
  // Switching routes during hydration can retain its root attributes (for
  // example dashboard's tf-shell on the login page). Load the destination
  // document instead; later navigations remain client-side.
  const nuxtApp = useNuxtApp()
  const redirect = (path: string) => navigateTo(path, {
    replace: true,
    external: Boolean(nuxtApp.isHydrating && nuxtApp.payload.serverRendered)
  })

  if (!taskFlowHasSession()) {
    return redirect('/login')
  }
})
