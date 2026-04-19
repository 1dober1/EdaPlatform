<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import NProgress from 'nprogress'

const authStore = useAuthStore()
const router = useRouter()
const datasets = ref([])
const isLoading = ref(true)

onMounted(async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  
  await fetchDatasets()
})

async function fetchDatasets() {
  isLoading.value = true
  NProgress.start()
  try {
    const res = await fetch('http://localhost:8000/api/datasets/', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (res.ok) {
      datasets.value = await res.json()
    }
  } catch (e) {
    console.error(e)
  } finally {
    isLoading.value = false
    NProgress.done()
  }
}

async function handleDelete(id) {
  if (!confirm('Удалить этот датасет безвозвратно?')) return

  try {
    const res = await fetch(`http://localhost:8000/api/datasets/${id}/`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (res.ok) {
      datasets.value = datasets.value.filter(d => d.id !== id)
    }
  } catch (e) {
    console.error(e)
  }
}

function openWorkspace(id) {
  router.push(`/workspace/saved/${id}`)
}
</script>

<template>
  <main class="saved-data container">
    <div class="saved-data__header">
      <h1 class="page-title">Мои Датасеты</h1>
      <router-link to="/dashboard" class="btn btn--primary">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        Новый датасет
      </router-link>
    </div>

    <div v-if="isLoading" class="loading-state">
      <div class="loader"></div>
      <p>Загрузка датасетов...</p>
    </div>

    <div v-else-if="datasets.length === 0" class="empty-state">
      <div class="empty-icon">📂</div>
      <h3>У вас пока нет сохраненных датасетов</h3>
      <p>Загрузите свой первый файл для анализа Данные будут надежно сохранены в вашем профиле.</p>
      <router-link to="/dashboard" class="btn btn--primary mt-4">Загрузить данные</router-link>
    </div>

    <div v-else class="datasets-grid">
      <div v-for="dataset in datasets" :key="dataset.id" class="dataset-card">
        <div class="dataset-card__icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        </div>
        <div class="dataset-card__content">
          <h3 class="dataset-card__title">{{ dataset.name || dataset.file.split('/').pop() }}</h3>
          <div class="dataset-card__meta">
            <span class="meta-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              {{ dataset.rows }} строк
            </span>
            <span class="meta-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
              {{ dataset.columns }} столбцов
            </span>
          </div>
          <div class="dataset-card__date">
            {{ new Date(dataset.uploaded_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) }}
          </div>
        </div>
        <div class="dataset-card__actions">
          <button class="action-btn" @click="openWorkspace(dataset.id)" title="Открыть в Workspace">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </button>
          <a :href="dataset.file" target="_blank" class="action-btn" title="Скачать CSV файл" download>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </a>
          <button class="action-btn action-btn--danger" @click="handleDelete(dataset.id)" title="Удалить">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.saved-data {
  padding: var(--space-10) 0;
  min-height: calc(100vh - var(--header-height));
}

.saved-data__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-8);
}

.page-title {
  font-size: var(--font-size-3xl);
  font-weight: 800;
  color: var(--color-text-primary);
}

.datasets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-6);
}

/* CARDS */
.dataset-card {
  display: flex;
  gap: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.dataset-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--color-border-light);
}

.dataset-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: var(--color-accent-light);
  color: var(--color-accent);
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.dataset-card__content {
  flex: 1;
  min-width: 0;
}

.dataset-card__title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dataset-card__meta {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  font-weight: 500;
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.dataset-card__date {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.dataset-card__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-bg-primary);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-btn:hover {
  background: var(--color-accent-light);
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.action-btn--danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-error);
  border-color: var(--color-error);
}

/* EMPTY STATE */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-16) var(--space-8);
  background: var(--color-surface);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: var(--space-4);
  opacity: 0.8;
}

.empty-state h3 {
  font-size: var(--font-size-xl);
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}

.empty-state p {
  color: var(--color-text-secondary);
  max-width: 400px;
}

.mt-4 {
  margin-top: var(--space-6);
}

/* LOADING */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-16);
  color: var(--color-text-secondary);
  font-weight: 500;
  gap: var(--space-4);
}

.loader {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border-light);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
