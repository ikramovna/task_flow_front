export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/tailwind.css'],
  devtools: { enabled: true },
  experimental: {
    emitRouteChunkError: 'reload-immediate'
  },
  routeRules: {
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
      title: 'TaskFlow Dashboard',
      htmlAttrs: {
        lang: 'en'
      },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'TaskFlow task management dashboard built with Nuxt and Tailwind CSS.'
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
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&display=swap'
        }
      ]
    }
  }
})
