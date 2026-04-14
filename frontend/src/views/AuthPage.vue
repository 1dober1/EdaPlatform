<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const isRegister = computed(() => route.path === '/register')
const title = computed(() => isRegister.value ? 'Регистрация' : 'Вход')
const buttonText = computed(() => isRegister.value ? 'Зарегистрироваться' : 'Войти')

const email = ref('')
const password = ref('')

function handleSubmit() {
  // TODO: Вызов API бэкенда для логина/регистрации
  console.log('Form submitted:', { email: email.value, password: password.value, mode: title.value })
  
  // Мокаем успешный вход: сохраняем токен в localStorage
  localStorage.setItem('eda-token', 'dummy-token')
  localStorage.setItem('eda-user', email.value || 'user@example.com')
  
  // Принудительно перезагружаем страницу, чтобы AppHeader обновил состояние,
  // либо используем Pinia-стор (в будущем). Пока простой редирект:
  window.location.href = '/dashboard'
}
</script>

<template>
  <main class="auth-page container">
    <div class="auth-page__inner">
      <h1 class="auth-page__title">{{ title }}</h1>
      
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
          <label class="auth-form__label">Password</label>
          <input 
            type="password" 
            v-model="password" 
            class="auth-form__input" 
            required
            placeholder="••••••••"
          />
        </div>

        <button type="submit" class="btn btn--primary btn--submit">
          {{ buttonText }}
        </button>
      </form>

      <div class="auth-page__footer">
        <router-link v-if="isRegister" to="/login" class="auth-page__link">
          Уже есть аккаунт? Войти
        </router-link>
        <router-link v-else to="/register" class="auth-page__link">
          Нет аккаунта? Зарегистрироваться
        </router-link>
      </div>
    </div>
  </main>
</template>

<style scoped>
.auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - var(--header-height));
  padding: var(--space-8);
}

.auth-page__inner {
  width: 100%;
  max-width: 440px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-12) var(--space-10);
  box-shadow: var(--shadow-md);
}

.auth-page__title {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  text-align: center;
  margin-bottom: var(--space-8);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.auth-form__group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.auth-form__label {
  font-size: var(--font-size-sm);
  font-weight: 500;
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
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.auth-form__input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-light);
}

.btn--submit {
  width: 100%;
  padding: var(--space-3);
  font-size: var(--font-size-base);
  margin-top: var(--space-2);
}

.auth-page__footer {
  margin-top: var(--space-6);
  text-align: center;
}

.auth-page__link {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.auth-page__link:hover {
  color: var(--color-accent);
}
</style>
