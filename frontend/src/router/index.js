import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: () => import('../views/LandingPage.vue'),
    },
    {
      path: '/demo',
      name: 'demo',
      component: () => import('../views/DemoPage.vue'),
    },
    {
      path: '/auth-prompt',
      name: 'auth-prompt',
      component: () => import('../views/AuthPromptPage.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/AuthPage.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/AuthPage.vue'),
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardPage.vue'),
    },
    {
      path: '/saved-datasets',
      name: 'saved-datasets',
      component: () => import('../views/SavedDatasetsPage.vue'),
    },
    {
      path: '/workspace/:source/:id',
      name: 'workspace',
      component: () => import('../views/WorkspacePage.vue'),
    },
  ],
})

import { useAuthStore } from '@/stores/auth'

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if ((to.name === 'dashboard' || to.name === 'saved-datasets') && !authStore.isAuthenticated) {
    next({ name: 'auth-prompt' })
  } else {
    next()
  }
})

export default router
