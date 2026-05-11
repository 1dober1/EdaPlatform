<template>
  <main class="auth-prompt">
    <div class="auth-prompt__bg">
      <div class="auth-prompt__blob auth-prompt__blob--1"></div>
      <div class="auth-prompt__blob auth-prompt__blob--2"></div>
      <div class="auth-prompt__blob auth-prompt__blob--3"></div>
    </div>

    <div class="auth-prompt__card">
      <div class="auth-prompt__icon-wrap">
        <svg class="auth-prompt__icon" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          <circle cx="12" cy="16" r="1"/>
        </svg>
      </div>

      <h1 class="auth-prompt__title">Требуется авторизация</h1>
      <p class="auth-prompt__text">
        Для загрузки файлов, сохранения прогресса и экспорта результатов необходимо войти в аккаунт или создать новый
      </p>

      <div class="auth-prompt__features">
        <div class="auth-prompt__feature">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <span>Загрузка своих датасетов</span>
        </div>
        <div class="auth-prompt__feature">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          <span>Сохранение версий</span>
        </div>
        <div class="auth-prompt__feature">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>Экспорт и отчёты</span>
        </div>
      </div>

      <div class="auth-prompt__actions">
        <router-link to="/register" class="auth-prompt__btn auth-prompt__btn--primary" id="btn-register-prompt">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          Создать аккаунт
        </router-link>
        <router-link to="/login" class="auth-prompt__btn auth-prompt__btn--outline" id="btn-login-prompt">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
          Войти
        </router-link>
      </div>

      <p class="auth-prompt__note">
        Вы также можете исследовать
        <router-link to="/demo" class="auth-prompt__link">демо-датасеты</router-link>
        без регистрации
      </p>
    </div>
  </main>
</template>

<style scoped>
.auth-prompt {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - var(--header-height));
  padding: var(--space-8);
  overflow: hidden;
}

.auth-prompt__bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.auth-prompt__blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.2;
  animation: promptFloat 8s ease-in-out infinite alternate;
}

.auth-prompt__blob--1 {
  width: 400px;
  height: 400px;
  background: #4f6ef7;
  top: -10%;
  left: -5%;
}

.auth-prompt__blob--2 {
  width: 320px;
  height: 320px;
  background: #7c5cf5;
  bottom: -5%;
  right: -8%;
  animation-delay: 2s;
}

.auth-prompt__blob--3 {
  width: 240px;
  height: 240px;
  background: #22c55e;
  top: 40%;
  right: 15%;
  animation-delay: 4s;
  opacity: 0.12;
}

[data-theme='dark'] .auth-prompt__blob {
  opacity: 0.1;
}

@keyframes promptFloat {
  from { transform: translate(0, 0) scale(1); }
  to { transform: translate(20px, -15px) scale(1.06); }
}

.auth-prompt__card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 520px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-12) var(--space-10);
  text-align: center;
  box-shadow: var(--shadow-xl);
  backdrop-filter: blur(12px);
}

.auth-prompt__icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 88px;
  height: 88px;
  border-radius: var(--radius-lg);
  background: var(--color-accent-light);
  color: var(--color-accent);
  margin-bottom: var(--space-6);
}

.auth-prompt__title {
  font-size: var(--font-size-2xl);
  font-weight: 800;
  background: var(--color-accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: var(--space-3);
  line-height: 1.3;
}

.auth-prompt__text {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-bottom: var(--space-8);
  max-width: 380px;
  margin-inline: auto;
}

.auth-prompt__features {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-8);
  padding: var(--space-4) var(--space-5);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
}

.auth-prompt__feature {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  text-align: left;
}

.auth-prompt__feature svg {
  color: var(--color-accent);
  flex-shrink: 0;
}

.auth-prompt__actions {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}

.auth-prompt__btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-6);
  font-size: var(--font-size-sm);
  font-weight: 600;
  border-radius: var(--radius-md);
  text-decoration: none;
  transition: all var(--transition-fast);
}

.auth-prompt__btn--primary {
  background: var(--color-accent-gradient);
  color: #fff;
  border: none;
  box-shadow: 0 4px 15px rgba(79, 110, 247, 0.3);
}

.auth-prompt__btn--primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(79, 110, 247, 0.4);
}

.auth-prompt__btn--outline {
  border: 1.5px solid var(--color-border);
  color: var(--color-text-primary);
  background: var(--color-surface);
}

.auth-prompt__btn--outline:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.auth-prompt__note {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.auth-prompt__link {
  color: var(--color-accent);
  font-weight: 600;
  text-decoration: none;
  transition: color var(--transition-fast);
}

.auth-prompt__link:hover {
  color: #7c5cf5;
}

@media (max-width: 640px) {
  .auth-prompt__card {
    padding: var(--space-8) var(--space-6);
  }

  .auth-prompt__actions {
    flex-direction: column;
  }
}
</style>
