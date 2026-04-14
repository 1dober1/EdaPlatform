<script setup>
import { ref, onMounted } from 'vue'

/* ---- Animated stats counter ---- */
// TODO: В будущем получать актуальную статистику с бэкенда (например, /api/stats/)
// Пока используются хардкод значения для презентации
const stats = ref([
  { label: 'Датасетов в системе', value: 0, target: 450, suffix: '+' },
  { label: 'Графиков построено', value: 0, target: 6048, suffix: '+' },
  { label: 'Пользователей', value: 0, target: 234, suffix: '+' },
])

function animateCounters() {
  stats.value.forEach((stat) => {
    const duration = 2000
    const step = Math.ceil(stat.target / (duration / 16))
    const interval = setInterval(() => {
      stat.value = Math.min(stat.value + step, stat.target)
      if (stat.value >= stat.target) clearInterval(interval)
    }, 16)
  })
}

/* ---- Features list ---- */
const features = [
  {
    icon: 'table',
    title: 'Интерактивная таблица',
    description: 'Пагинация, сортировка и мгновенный просмотр больших датасетов прямо в браузере.',
  },
  {
    icon: 'chart',
    title: 'Визуализация',
    description: 'Гистограммы, scatter-матрицы и анализ распределений в один клик.',
  },
  {
    icon: 'clean',
    title: 'Очистка данных',
    description: 'Удаление дубликатов, заполнение пропусков и нормализация — с возможностью отмены.',
  },
  {
    icon: 'export',
    title: 'Экспорт',
    description: 'Скачайте чистый датасет в CSV после всех преобразований.',
  },
]

onMounted(() => {
  /* Start counters when hero scrolls into view */
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        animateCounters()
        observer.disconnect()
      }
    },
    { threshold: 0.3 }
  )
  const el = document.querySelector('.landing-stats')
  if (el) observer.observe(el)
})
</script>

<template>
  <main class="landing">
    <!-- ========== Hero ========== -->
    <section class="hero">
      <div class="hero__bg-blobs">
        <div class="hero__blob hero__blob--1"></div>
        <div class="hero__blob hero__blob--2"></div>
        <div class="hero__blob hero__blob--3"></div>
      </div>

      <div class="hero__content container">
        <span class="hero__badge">Бесплатно · Без установки · В браузере</span>

        <h1 class="hero__title">
          Интерактивный анализ и очистка данных в&nbsp;браузере
        </h1>

        <p class="hero__subtitle">
          Загружайте датасеты, визуализируйте связи и&nbsp;готовьте данные
          к&nbsp;машинному обучению за&nbsp;пару кликов
        </p>

        <div class="hero__actions">
          <router-link to="/demo" class="btn btn--hero-outline" id="btn-demo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Попробовать демо-данные
          </router-link>
          <router-link to="/dashboard" class="btn btn--hero-primary" id="btn-start">
            Начать работу
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </router-link>
        </div>
      </div>
    </section>

    <!-- ========== Stats ========== -->
    <section class="landing-stats container">
      <div class="landing-stats__grid">
        <div v-for="stat in stats" :key="stat.label" class="stat-card">
          <span class="stat-card__value">{{ stat.value.toLocaleString('ru-RU') }}{{ stat.suffix }}</span>
          <span class="stat-card__label">{{ stat.label }}</span>
        </div>
      </div>
    </section>

    <!-- ========== Features ========== -->
    <section class="features container">
      <h2 class="features__heading">Возможности платформы</h2>
      <div class="features__grid">
        <article v-for="f in features" :key="f.title" class="feature-card">
          <div class="feature-card__icon">
            <!-- table -->
            <svg v-if="f.icon === 'table'" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>
            </svg>
            <!-- chart -->
            <svg v-if="f.icon === 'chart'" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            <!-- clean -->
            <svg v-if="f.icon === 'clean'" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
            <!-- export -->
            <svg v-if="f.icon === 'export'" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </div>
          <h3 class="feature-card__title">{{ f.title }}</h3>
          <p class="feature-card__desc">{{ f.description }}</p>
        </article>
      </div>
    </section>

    <!-- ========== CTA ========== -->
    <section class="cta container">
      <div class="cta__card">
        <h2 class="cta__heading">Готовы попробовать?</h2>
        <p class="cta__text">Загрузите свой датасет или начните с демо&nbsp;данных прямо сейчас.</p>
        <div class="cta__actions">
          <router-link to="/upload" class="btn btn--hero-primary" id="btn-cta-start">
            Начать работу
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </router-link>
        </div>
      </div>
    </section>

    <!-- ========== Footer ========== -->
    <footer class="landing-footer">
      <div class="container">
        <span class="landing-footer__text">© 2026 EDA Platform</span>
      </div>
    </footer>
  </main>
</template>

<style scoped>
/* ================================================================
   Landing page styles — grid-based layout
   ================================================================ */

.landing {
  overflow-x: hidden;
}

/* ---------- Hero ---------- */
.hero {
  position: relative;
  display: grid;
  place-items: center;
  min-height: calc(100vh - var(--header-height));
  padding: var(--space-16) 0 var(--space-20);
  text-align: center;
}

.hero__bg-blobs {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.hero__blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.35;
  animation: blobFloat 8s ease-in-out infinite alternate;
}

.hero__blob--1 {
  width: 420px; height: 420px;
  background: #4f6ef7;
  top: -10%; left: -5%;
}
.hero__blob--2 {
  width: 360px; height: 360px;
  background: #7c5cf5;
  bottom: -5%; right: -8%;
  animation-delay: 2s;
}
.hero__blob--3 {
  width: 280px; height: 280px;
  background: #22c55e;
  top: 30%; right: 10%;
  animation-delay: 4s;
  opacity: 0.18;
}

[data-theme='dark'] .hero__blob { opacity: 0.15; }

@keyframes blobFloat {
  from { transform: translate(0, 0) scale(1); }
  to   { transform: translate(30px, -20px) scale(1.08); }
}

.hero__content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-6);
  max-width: 780px;
}

.hero__badge {
  display: inline-block;
  padding: var(--space-1) var(--space-4);
  font-size: var(--font-size-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-accent);
  background: var(--color-accent-light);
  border: 1px solid rgba(79, 110, 247, 0.15);
  border-radius: var(--radius-full);
}

.hero__title {
  font-size: var(--font-size-4xl);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, var(--color-text-primary) 60%, var(--color-accent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero__subtitle {
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
  line-height: 1.6;
  max-width: 560px;
}

.hero__actions {
  display: flex;
  gap: var(--space-4);
  margin-top: var(--space-4);
  flex-wrap: wrap;
  justify-content: center;
}

/* Hero Buttons */
.btn--hero-outline,
.btn--hero-primary {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-8);
  font-size: var(--font-size-base);
  font-weight: 600;
  border-radius: var(--radius-lg);
  text-decoration: none;
  transition: all var(--transition-fast);
}

.btn--hero-outline {
  border: 1.5px solid var(--color-border);
  color: var(--color-text-primary);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.btn--hero-outline:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.btn--hero-primary {
  background: var(--color-accent-gradient);
  color: #fff;
  border: none;
  box-shadow: 0 4px 20px rgba(79, 110, 247, 0.3);
}

.btn--hero-primary:hover {
  box-shadow: 0 6px 28px rgba(79, 110, 247, 0.4);
  transform: translateY(-2px);
}

/* ---------- Stats ---------- */
.landing-stats {
  margin-top: calc(-1 * var(--space-10));
  margin-bottom: var(--space-20);
  position: relative;
  z-index: 2;
}

.landing-stats__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-6);
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-8) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.stat-card__value {
  font-size: var(--font-size-3xl);
  font-weight: 800;
  background: var(--color-accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-card__label {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  font-weight: 500;
}

/* ---------- Features ---------- */
.features {
  padding: var(--space-16) 0;
}

.features__heading {
  font-size: var(--font-size-3xl);
  font-weight: 800;
  text-align: center;
  margin-bottom: var(--space-12);
  letter-spacing: -0.01em;
}

.features__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-6);
}

.feature-card {
  padding: var(--space-8) var(--space-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--color-accent);
}

.feature-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md);
  background: var(--color-accent-light);
  color: var(--color-accent);
  margin-bottom: var(--space-5);
}

.feature-card__title {
  font-size: var(--font-size-lg);
  font-weight: 700;
  margin-bottom: var(--space-2);
}

.feature-card__desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.6;
}

/* ---------- CTA ---------- */
.cta {
  padding: var(--space-16) 0;
}

.cta__card {
  text-align: center;
  padding: var(--space-16) var(--space-8);
  background: var(--color-accent-gradient);
  border-radius: var(--radius-xl);
  color: #fff;
}

.cta__heading {
  font-size: var(--font-size-3xl);
  font-weight: 800;
  margin-bottom: var(--space-4);
}

.cta__text {
  font-size: var(--font-size-lg);
  opacity: 0.9;
  margin-bottom: var(--space-8);
}

.cta__actions .btn--hero-primary {
  background: rgba(255, 255, 255, 0.2);
  border: 1.5px solid rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(8px);
}

.cta__actions .btn--hero-primary:hover {
  background: rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

/* ---------- Footer ---------- */
.landing-footer {
  padding: var(--space-8) 0;
  border-top: 1px solid var(--color-border-light);
  text-align: center;
}

.landing-footer__text {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

/* ---------- Responsive ---------- */
@media (max-width: 1024px) {
  .features__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .hero__title {
    font-size: var(--font-size-3xl);
  }

  .hero__subtitle {
    font-size: var(--font-size-base);
  }

  .landing-stats__grid {
    grid-template-columns: 1fr;
  }

  .features__grid {
    grid-template-columns: 1fr;
  }

  .stat-card__value {
    font-size: var(--font-size-2xl);
  }
}

@media (max-width: 480px) {
  .hero__title {
    font-size: var(--font-size-2xl);
  }

  .hero__actions {
    flex-direction: column;
    width: 100%;
  }

  .btn--hero-outline,
  .btn--hero-primary {
    width: 100%;
    justify-content: center;
  }
}
</style>
