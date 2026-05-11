<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const demoDatasets = ref([])
const isLoading = ref(true)

onMounted(async () => {
  try {
    const res = await fetch('http://localhost:8000/api/datasets/demo/')
    if (res.ok) {
      demoDatasets.value = await res.json()
    }
  } catch (e) {
    console.error('Не удалось загрузить список демо-датасетов:', e)
  } finally {
    isLoading.value = false
  }
})

function openDataset(slug) {
  router.push(`/workspace/demo/${slug}`)
}
</script>

<template>
  <main class="demo-page container">
    <div class="demo-page__inner">
      <h1 class="demo-page__title">Демо-датасеты</h1>
      <p class="demo-page__subtitle">Выберите один из готовых наборов данных для исследования</p>

      <div v-if="isLoading" class="demo-page__loading">Загрузка…</div>

      <div v-else class="demo-grid">
        <div 
          v-for="dataset in demoDatasets" 
          :key="dataset.slug" 
          class="demo-card"
          @click="openDataset(dataset.slug)"
        >
          <div class="demo-card__icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <span class="demo-card__name">{{ dataset.name }}</span>
          <span class="demo-card__desc">{{ dataset.description }}</span>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.demo-page {
  display: flex;
  justify-content: center;
  padding: var(--space-16) var(--space-4);
}

.demo-page__inner {
  width: 100%;
  max-width: 900px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-10) var(--space-12);
  box-shadow: var(--shadow-sm);
}

.demo-page__title {
  text-align: center;
  font-size: var(--font-size-2xl);
  font-weight: 700;
  margin-bottom: var(--space-2);
}

.demo-page__subtitle {
  text-align: center;
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-10);
}

.demo-page__loading {
  text-align: center;
  padding: var(--space-10);
  color: var(--color-text-tertiary);
}

.demo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-4);
}

.demo-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-6) var(--space-4);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: center;
}

.demo-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--color-accent);
}

.demo-card__icon {
  color: var(--color-text-secondary);
  transition: color var(--transition-fast);
}

.demo-card:hover .demo-card__icon {
  color: var(--color-accent);
}

.demo-card__name {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-primary);
}

.demo-card__desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  line-height: 1.4;
}
</style>
