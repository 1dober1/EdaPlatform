import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import NProgress from 'nprogress'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('eda_token') || null)
  const refreshToken = ref(localStorage.getItem('eda_refresh') || null)
  const user = ref(JSON.parse(localStorage.getItem('eda_user') || 'null'))

  const isAuthenticated = computed(() => !!token.value)
  const router = useRouter()

  function setAuth(data) {
    if (data.access) {
      token.value = data.access
      localStorage.setItem('eda_token', data.access)
    }
    if (data.refresh) {
      refreshToken.value = data.refresh
      localStorage.setItem('eda_refresh', data.refresh)
    }
    fetchMe()
  }

  async function fetchMe() {
    if (!token.value) return
    try {
      const res = await fetch(`${API_BASE}/api/auth/me/`, {
        headers: { 'Authorization': `Bearer ${token.value}` }
      })
      if (res.ok) {
        const data = await res.json()
        user.value = data
        localStorage.setItem('eda_user', JSON.stringify(data))
      } else {
        throw new Error('Invalid token')
      }
    } catch (e) {
      logout()
    }
  }

  async function login(email, password) {
    NProgress.start()
    try {
      const username = email.split('@')[0]
      const req = await fetch(`${API_BASE}/api/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      if (!req.ok) {
        const emailPrefix = email.split('@')[0]
        const searchReq = await fetch(`${API_BASE}/api/auth/login/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: emailPrefix, password })
        })
        if (!searchReq.ok) throw new Error('Неверные учетные данные')
        const data = await searchReq.json()
        setAuth(data)
        return true
      }
      const data = await req.json()
      setAuth(data)
      return true
    } finally {
      NProgress.done()
    }
  }

  async function register(email, password, passwordConfirm) {
    NProgress.start()
    try {
      const username = email.split('@')[0]
      const req = await fetch(`${API_BASE}/api/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password, password2: passwordConfirm })
      })
      if (!req.ok) {
        const errorData = await req.json()
        throw new Error(JSON.stringify(errorData))
      }

      const regData = await req.json()
      const loginReq = await fetch(`${API_BASE}/api/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: regData.username, password })
      })
      if (!loginReq.ok) throw new Error('Не удалось войти после регистрации')
      const loginData = await loginReq.json()
      setAuth(loginData)
      return true
    } finally {
      NProgress.done()
    }
  }

  function logout() {
    token.value = null
    refreshToken.value = null
    user.value = null
    localStorage.removeItem('eda_token')
    localStorage.removeItem('eda_refresh')
    localStorage.removeItem('eda_user')
    router.push('/')
  }

  return {
    token, user, isAuthenticated, login, register, logout, fetchMe,
    API_BASE,
  }
})
