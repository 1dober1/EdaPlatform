<template>
  <main class="auth-prompt container">
    <div class="auth-prompt__card">
      <h1 class="auth-prompt__title">
        Чтобы загружать свои файлы и сохранять прогресс, пожалуйста, авторизуйтесь
      </h1>
      
      <div class="auth-prompt__actions">
        <router-link to="/register" class="btn btn--outline btn--lg">
          Создать аккаунт
        </router-link>
        <router-link to="/login" class="btn btn--primary btn--lg">
          Войти
        </router-link>
      </div>
    </div>
  </main>
</template>

<style scoped>
.auth-prompt {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - var(--header-height));
  padding: var(--space-8);
}

.auth-prompt__card {
  width: 100%;
  max-width: 680px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-16) var(--space-10);
  text-align: center;
  box-shadow: var(--shadow-sm);
}

.auth-prompt__title {
  font-size: var(--font-size-2xl);
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: var(--space-12);
  color: var(--color-text-primary);
}

.auth-prompt__actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
}

.btn--lg {
  padding: var(--space-3) var(--space-8);
  font-size: var(--font-size-base);
}

@media (max-width: 640px) {
  .auth-prompt__actions {
    flex-direction: column;
    width: 100%;
  }

  .btn--lg {
    width: 100%;
  }
}
</style>
