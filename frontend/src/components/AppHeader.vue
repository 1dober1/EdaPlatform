<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isDark = ref(false)
const userEmail = ref(null)

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
  localStorage.setItem('eda-theme', isDark.value ? 'dark' : 'light')
}

// Простая проверка авторизации (localStorage) 
// В реальном проекте должен быть Pinia или Vuex
function checkAuth() {
  userEmail.value = localStorage.getItem('eda-user')
}

// При выходе
function handleLogout() {
  localStorage.removeItem('eda-token')
  localStorage.removeItem('eda-user')
  userEmail.value = null
  router.push('/')
}

onMounted(() => {
  const saved = localStorage.getItem('eda-theme')
  if (saved === 'dark') {
    isDark.value = true
    document.documentElement.setAttribute('data-theme', 'dark')
  }
  
  checkAuth()
  
  // Добавляем листенер для возможности обновления (если делать через window.dispatchEvent)
  window.addEventListener('storage', checkAuth)
})

onUnmounted(() => {
  window.removeEventListener('storage', checkAuth)
})
</script>

<template>
  <header class="app-header">
    <div class="app-header__inner container">
      <router-link to="/" class="app-header__logo">
        <svg class="app-header__logo-icon" width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="7" fill="url(#logo-grad)" />
          <path d="M7 19l4-10 4 6 3-4 3 8" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <defs>
            <linearGradient id="logo-grad" x1="0" y1="0" x2="28" y2="28">
              <stop stop-color="#4f6ef7"/>
              <stop offset="1" stop-color="#7c5cf5"/>
            </linearGradient>
          </defs>
        </svg>
        <span class="app-header__logo-text">EDA Platform</span>
      </router-link>

      <nav class="app-header__nav">
        <button class="app-header__theme-toggle" @click="toggleTheme" :title="isDark ? 'Светлая тема' : 'Тёмная тема'">
          <svg v-if="!isDark" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        </button>

        <template v-if="userEmail">
          <span class="app-header__user-email">{{ userEmail }}</span>
          <button @click="handleLogout" class="btn btn--outline btn--sm" id="btn-logout-header">
            Выйти
          </button>
        </template>

        <template v-else>
          <router-link to="/dashboard" class="btn btn--outline btn--sm" id="btn-upload-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Загрузить свой датасет
          </router-link>

          <router-link to="/login" class="btn btn--primary btn--sm" id="btn-login-header">
            Войти
          </router-link>
        </template>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  height: var(--header-height);
  background: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border-light);
  backdrop-filter: blur(12px);
  background: rgba(var(--color-bg-primary), 0.85);
  transition: background var(--transition-base), border-color var(--transition-base);
}

[data-theme='dark'] .app-header {
  background: rgba(15, 17, 23, 0.88);
}

[data-theme='light'] .app-header,
:root:not([data-theme]) .app-header {
  background: rgba(255, 255, 255, 0.88);
}

.app-header__inner {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Logo */
.app-header__logo {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--color-text-primary);
  font-weight: 700;
  font-size: var(--font-size-lg);
  text-decoration: none;
}

.app-header__logo:hover {
  color: var(--color-text-primary);
}

.app-header__logo-icon {
  flex-shrink: 0;
}

/* Nav */
.app-header__nav {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.app-header__user-email {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

/* Theme Toggle */
.app-header__theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  background: transparent;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.app-header__theme-toggle:hover {
  background: var(--color-accent-light);
  color: var(--color-accent);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-weight: 500;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  white-space: nowrap;
  text-decoration: none;
}

.btn--sm {
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-sm);
  height: 36px;
}

.btn--outline {
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  background: transparent;
}

.btn--outline:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-accent-light);
}

.btn--primary {
  background: var(--color-accent-gradient);
  color: #fff;
  border: none;
  box-shadow: 0 2px 8px rgba(79, 110, 247, 0.25);
}

.btn--primary:hover {
  box-shadow: 0 4px 16px rgba(79, 110, 247, 0.35);
  transform: translateY(-1px);
}

/* Responsive */
@media (max-width: 640px) {
  .app-header__nav {
    gap: var(--space-2);
  }

  .btn--sm {
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-size-xs);
  }

  .btn--outline svg {
    display: none;
  }
}
</style>
