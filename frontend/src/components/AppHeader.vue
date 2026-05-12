<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const isDark = ref(false)

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
  localStorage.setItem('eda-theme', isDark.value ? 'dark' : 'light')
}

function handleLogout() {
  authStore.logout()
}

onMounted(() => {
  const saved = localStorage.getItem('eda-theme')
  if (saved === 'dark') {
    isDark.value = true
    document.documentElement.setAttribute('data-theme', 'dark')
  }
})
</script>

<template>
  <header class="app-header">
    <div class="app-header__inner">
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

        <template v-if="authStore.isAuthenticated && authStore.user">
          <router-link to="/saved-datasets" class="btn btn--outline btn--sm" id="btn-saved-header" title="Мои датасеты">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            <span class="btn-text">Мои датасеты</span>
          </router-link>
          <router-link to="/dashboard" class="app-header__user-email">{{ authStore.user.username }}</router-link>
          <button @click="handleLogout" class="btn btn--outline btn--sm" id="btn-logout-header" title="Выйти">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span class="btn-text">Выйти</span>
          </button>
        </template>

        <template v-else>
          <router-link to="/dashboard" class="btn btn--outline btn--sm" id="btn-upload-header" title="Загрузить свой датасет">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span class="btn-text">Загрузить свой датасет</span>
          </router-link>

          <router-link to="/login" class="btn btn--primary btn--sm" id="btn-login-header" title="Войти">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            <span class="btn-text">Войти</span>
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
  padding: 0 var(--space-6);
  max-width: 100%;
}

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

.app-header__nav {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.app-header__user-email {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  text-decoration: none;
  transition: color var(--transition-fast);
}

.app-header__user-email:hover {
  color: var(--color-accent);
}

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

@media (max-width: 640px) {
  .app-header__inner {
    padding: 0 var(--space-3);
  }

  .app-header__nav {
    gap: var(--space-2);
  }

  .btn--sm {
    padding: var(--space-2) var(--space-2);
  }

  .btn-text,
  .app-header__user-email,
  .app-header__logo-text {
    display: none;
  }
}
</style>
