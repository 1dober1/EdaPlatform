<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const demoDatasets = ref([
  { id: 'trees', name: 'Trees.csv' },
  { id: 'wine', name: 'Wine.json' },
  { id: 'house_prices', name: 'House prices.csv' },
  { id: 'users', name: 'Users.csv' },
  { id: 'titanic', name: 'Titanic.csv' },
  { id: 'iris', name: 'Iris.csv' },
])

function openDataset(id) {
  // На будущее: переход к анализу конкретного демо-датасета
  console.log('Открыть демо датасет:', id)
}
</script>

<template>
  <main class="demo-page container">
    <div class="demo-page__inner">
      <h1 class="demo-page__title">Демо-датасеты</h1>
      <div class="demo-grid">
        <div 
          v-for="dataset in demoDatasets" 
          :key="dataset.id" 
          class="demo-card"
          @click="openDataset(dataset.id)"
        >
          <div class="demo-card__icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <span class="demo-card__name">{{ dataset.name }}</span>
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
  max-width: 800px;
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
  margin-bottom: var(--space-12);
}

.demo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-6);
}

.demo-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-8) var(--space-4);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.demo-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--color-accent);
  color: var(--color-accent);
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
  font-weight: 500;
  text-align: center;
}
</style>
