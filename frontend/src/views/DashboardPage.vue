<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
import { useAuthStore } from '@/stores/auth'
import { parseFile, getParquetMetadataParams } from '@/utils/dataParser'

const router = useRouter()
const store = useWorkspaceStore()
const authStore = useAuthStore()

const isDragging = ref(false)
const isProcessing = ref(false)
const errorMsg = ref(null)

function onDragEnter() { isDragging.value = true }
function onDragLeave() { isDragging.value = false }

function onDrop(event) {
  isDragging.value = false
  const files = event.dataTransfer.files
  if (files && files.length > 0) handleFile(files[0])
}

function onFileSelect(event) {
  const files = event.target.files
  if (files && files.length > 0) handleFile(files[0])
}

async function handleFile(file) {
  try {
    isProcessing.value = true
    errorMsg.value = null

    if (authStore.isAuthenticated) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('name', file.name.replace(/\.[^.]+$/, ''))

      if (file.name.toLowerCase().endsWith('.parquet')) {
        const meta = await getParquetMetadataParams(file)
        formData.append('rows', meta.rows)
        formData.append('columns', meta.columns)
      }

      const req = await fetch(`${authStore.API_BASE}/api/datasets/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authStore.token}` },
        body: formData
      })
      if (!req.ok) throw new Error('Ошибка загрузки датасета на сервер')
      const dataset = await req.json()
      router.push(`/workspace/saved/${dataset.id}`)
    } else {
      const result = await parseFile(file)
      store.setData(
        file.name.replace(/\.[^.]+$/, ''),
        result.columns,
        result.rows,
        result.meta,
        'upload',
        'local'
      )
      router.push('/workspace/upload/local')
    }
  } catch (e) {
    errorMsg.value = e.message
  } finally {
    isProcessing.value = false
  }
}
</script>

<template>
  <main class="dashboard container">
    <div class="dashboard__inner">
      <div class="dashboard__header">
        <h1 class="dashboard__empty-text">Рабочее пространство</h1>
        <p class="dashboard__empty-subtext">Откройте или перетащите файл для начала работы</p>
      </div>

      <div v-if="errorMsg" class="dashboard__error">
        {{ errorMsg }}
      </div>

      <div
        class="dashboard__dropzone"
        :class="{ 'is-dragging': isDragging, 'is-processing': isProcessing }"
        @dragenter.prevent="onDragEnter"
        @dragover.prevent=""
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDrop"
      >
        <div class="dashboard__dropzone-content">
          <template v-if="isProcessing">
            <div class="spinner"></div>
            <span class="dashboard__dropzone-text">Обработка файла…</span>
          </template>
          <template v-else>
            <svg class="dashboard__dropzone-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span class="dashboard__dropzone-text">Перетащите или откройте файл</span>
            <span class="dashboard__dropzone-hint">Поддерживаются CSV, JSON и Parquet</span>
          </template>
        </div>
        <label class="dashboard__dropzone-trigger" v-show="!isProcessing">
          <input type="file" accept=".csv,.json,.parquet" @change="onFileSelect" />
        </label>
      </div>
    </div>
  </main>
</template>

<style scoped>
.dashboard {
  padding: var(--space-16) var(--space-4);
}

.dashboard__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.dashboard__header {
  text-align: center;
  margin-bottom: var(--space-12);
}

.dashboard__empty-text {
  font-size: var(--font-size-2xl);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}

.dashboard__empty-subtext {
  font-size: var(--font-size-xl);
  font-weight: 500;
  color: var(--color-text-secondary);
}

.dashboard__error {
  margin-bottom: var(--space-4);
  padding: var(--space-3) var(--space-6);
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-error);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
}

.dashboard__dropzone {
  position: relative;
  width: 100%;
  max-width: 900px;
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-xl);
  transition: all var(--transition-fast);
}

.dashboard__dropzone:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-text-tertiary);
}

.dashboard__dropzone.is-dragging {
  background: var(--color-accent-light);
  border-color: var(--color-accent);
}

.dashboard__dropzone.is-processing {
  pointer-events: none;
  opacity: 0.7;
}

.dashboard__dropzone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  pointer-events: none;
}

.dashboard__dropzone-icon {
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-2);
}

.dashboard__dropzone.is-dragging .dashboard__dropzone-icon {
  color: var(--color-accent);
}

.dashboard__dropzone-text {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-text-primary);
}

.dashboard__dropzone-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

.dashboard__dropzone-trigger {
  position: absolute;
  inset: 0;
  cursor: pointer;
}

.dashboard__dropzone-trigger input {
  display: none;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
