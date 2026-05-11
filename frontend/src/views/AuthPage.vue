<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'
import Papa from 'papaparse'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()

const isRegister = computed(() => route.path === '/register')
const title = computed(() => isRegister.value ? 'Регистрация' : 'Вход')
const buttonText = computed(() => isRegister.value ? 'Зарегистрироваться' : 'Войти')

const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const errorMsg = ref('')
const isSubmitting = ref(false)

async function claimWorkspaceDataset() {
  if (!workspaceStore.rows.length || !workspaceStore.columns.length) return
  if (workspaceStore.datasetSource !== 'upload') return

  try {
    const csv = Papa.unparse(workspaceStore.rows)
    const blob = new Blob([csv], { type: 'text/csv' })
    const file = new File([blob], (workspaceStore.datasetName || 'dataset') + '.csv', { type: 'text/csv' })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', workspaceStore.datasetName || 'Без названия')

    const API_BASE = authStore.API_BASE
    const res = await fetch(`${API_BASE}/api/datasets/claim/`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authStore.token}` },
      body: formData,
    })

    if (res.ok) {
      const dataset = await res.json()
      workspaceStore.datasetSource = 'saved'
      workspaceStore.datasetId = dataset.id
    }
  } catch (e) {
    console.warn('Could not claim dataset:', e)
  }
}

async function handleSubmit() {
  errorMsg.value = ''

  if (isRegister.value && password.value !== passwordConfirm.value) {
    errorMsg.value = 'Пароли не совпадают'
    return
  }

  try {
    isSubmitting.value = true
    if (isRegister.value) {
      await authStore.register(email.value, password.value, passwordConfirm.value)
    } else {
      await authStore.login(email.value, password.value)
    }

    await claimWorkspaceDataset()

    const returnUrl = localStorage.getItem('eda_return_url')
    localStorage.removeItem('eda_return_url')

    if (returnUrl) {
      router.push(returnUrl)
    } else {
      router.push('/saved-datasets')
    }
  } catch (err) {
    let msg = err.message
    try {
      const parsed = JSON.parse(msg)
      msg = Object.values(parsed).flat()[0] || 'Ошибка при обработке запроса'
    } catch {}
    errorMsg.value = msg
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <div class="auth-page__bg-blobs">
      <div class="auth-blob auth-blob--1"></div>
      <div class="auth-blob auth-blob--2"></div>
    </div>
    <div class="auth-page__inner">
      <div class="auth-page__header">
        <h1 class="auth-page__title">{{ title }}</h1>
        <p class="auth-page__subtitle">{{ isRegister ? 'Создайте аккаунт для сохранения ваших датасетов' : 'С возвращением в платформу EDA' }}</p>
      </div>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <div class="auth-form__group">
          <label class="auth-form__label">Email</label>
          <input
            type="email"
            v-model="email"
            class="auth-form__input"
            required
            placeholder="user@example.com"
          />
        </div>

        <div class="auth-form__group">
          <label class="auth-form__label">Пароль</label>
          <input
            type="password"
            v-model="password"
            class="auth-form__input"
            required
            placeholder="••••••••"
          />
        </div>

        <div v-if="isRegister" class="auth-form__group">
          <label class="auth-form__label">Подтверждение пароля</label>
          <input
            type="password"
            v-model="passwordConfirm"
            class="auth-form__input"
            required
            placeholder="••••••••"
          />
        </div>

        <div v-if="errorMsg" class="auth-form__error">{{ errorMsg }}</div>

        <button type="submit" class="btn btn--primary btn--submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'Подождите...' : buttonText }}
        </button>
      </form>

      <div class="auth-page__footer">
        <router-link v-if="isRegister" to="/login" class="auth-page__link">
          Уже есть аккаунт? <span>Войти</span>
        </router-link>
        <router-link v-else to="/register" class="auth-page__link">
          Нет аккаунта? <span>Зарегистрироваться</span>
        </router-link>
      </div>
    </div>
  </main>
</template>

<style scoped>
.auth-page {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - var(--header-height));
  padding: var(--space-8);
  overflow: hidden;
}

.auth-page__bg-blobs {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.auth-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.15;
}

.auth-blob--1 {
  width: 400px; height: 400px;
  background: #4f6ef7;
  top: -10%; left: -5%;
}

.auth-blob--2 {
  width: 300px; height: 300px;
  background: #7c5cf5;
  bottom: 0%; right: -5%;
}

.auth-page__inner {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 440px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-10) var(--space-10);
  box-shadow: var(--shadow-xl);
  backdrop-filter: blur(10px);
}

.auth-page__header {
  text-align: center;
  margin-bottom: var(--space-8);
}

.auth-page__title {
  font-size: var(--font-size-3xl);
  font-weight: 800;
  background: var(--color-accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: var(--space-2);
}

.auth-page__subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.auth-form__group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.auth-form__label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
}

.auth-form__input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;
  transition: all var(--transition-fast);
}

.auth-form__input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-light);
  background: var(--color-surface);
}

.btn--submit {
  width: 100%;
  padding: var(--space-3);
  font-size: var(--font-size-base);
  font-weight: 700;
  margin-top: var(--space-2);
  background: var(--color-accent-gradient);
  border: none;
  border-radius: var(--radius-md);
  box-shadow: 0 4px 15px rgba(79, 110, 247, 0.3);
  transition: all var(--transition-fast);
}

.btn--submit:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(79, 110, 247, 0.4);
}

.auth-form__error {
  font-size: var(--font-size-sm);
  color: #fff;
  background: rgba(239, 68, 68, 0.9);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  text-align: center;
  font-weight: 500;
}

.auth-page__footer {
  margin-top: var(--space-8);
  text-align: center;
}

.auth-page__link {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
}

.auth-page__link span {
  color: var(--color-accent);
  font-weight: 600;
  transition: color var(--transition-fast);
}

.auth-page__link:hover span {
  color: #7c5cf5;
}
</style>
