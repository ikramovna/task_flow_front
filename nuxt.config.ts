export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/tailwind.css'],
  devtools: { enabled: false },
  experimental: {
    emitRouteChunkError: 'reload-immediate'
  },
  routeRules: {
    '/_nuxt/**': {
      headers: { 'cache-control': 'public, max-age=31536000, immutable' }
    },
    '/greeting-cards/**': {
      headers: { 'cache-control': 'public, max-age=31536000, immutable' }
    },
    '/images/**': {
      headers: { 'cache-control': 'public, max-age=31536000, immutable' }
    },
    '/taskflow-logo*': {
      headers: { 'cache-control': 'public, max-age=31536000, immutable' }
    },
    '/': {
      headers: {
        'cache-control': 'no-cache, no-store, must-revalidate',
        pragma: 'no-cache',
        expires: '0'
      }
    },
    '/login': {
      headers: {
        'cache-control': 'no-cache, no-store, must-revalidate'
      }
    },
    '/forgot-password': {
      headers: {
        'cache-control': 'no-cache, no-store, must-revalidate'
      }
    },
    '/reset-password': {
      headers: {
        'cache-control': 'no-cache, no-store, must-revalidate'
      }
    },
    '/logout': {
      headers: {
        'cache-control': 'no-cache, no-store, must-revalidate'
      }
    }
  },
  typescript: {
    strict: true
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || ''
    }
  },
  app: {
    head: {
      title: 'TaskFlow — Work in flow',
      htmlAttrs: {
        lang: 'en'
      },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'Plan tasks, align your team and move every project forward with TaskFlow.'
        },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'TaskFlow' },
        { property: 'og:title', content: 'TaskFlow — Work in flow' },
        {
          property: 'og:description',
          content: 'Tasks, people and deadlines — beautifully organized in one workspace.'
        },
        { property: 'og:url', content: 'https://taskflow.websteredu.uz/' },
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:title', content: 'TaskFlow — Work in flow' },
        {
          name: 'twitter:description',
          content: 'Tasks, people and deadlines — beautifully organized in one workspace.'
        }
      ],
      script: [
        {
          key: 'taskflow-theme-init',
          tagPosition: 'head',
          innerHTML: `(function(){try{var saved=localStorage.getItem('taskflow-theme');var match=document.cookie.match(/(?:^|;\\s*)taskflow-theme=([^;]+)/);var theme=saved||(match?decodeURIComponent(match[1]):'');var dark=theme==='Dark'||(theme==='System'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('tf-dark',dark);document.documentElement.style.colorScheme=dark?'dark':'light';}catch(e){}})()`
        }
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png?v=2' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png?v=2' },
      ]
    }
  }
})
