export default defineNuxtRouteMiddleware((to) => {
  const publicRoutes = ['/login', '/logout']
  const accessToken = useCookie<string | null>('taskflow-access')
  const hasCookieToken = Boolean(accessToken.value)
  const hasClientToken = import.meta.client && Boolean(localStorage.getItem('taskflow-auth'))
  const isAuthenticated = hasCookieToken || hasClientToken

  if (!isAuthenticated && !publicRoutes.includes(to.path)) {
    return navigateTo('/login')
  }

  if (isAuthenticated && to.path === '/login') {
    return navigateTo('/')
  }
})
