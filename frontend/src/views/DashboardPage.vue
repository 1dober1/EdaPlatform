<script setup>
import { ref } from 'vue'

const isDragging = ref(false)

function onDragEnter() {
  isDragging.value = true
}

function onDragLeave() {
  isDragging.value = false
}

function onDrop(event) {
  isDragging.value = false
  const files = event.dataTransfer.files
  if (files && files.length > 0) {
    handleFile(files[0])
  }
}

function onFileSelect(event) {
  const files = event.target.files
  if (files && files.length > 0) {
    handleFile(files[0])
  }
}

function handleFile(file) {
  // TODO: Загрузка файла на бэкенд
  console.log('Selected file:', file.name)
  alert(`Выбран файл: ${file.name}. Реализация загрузки на сервер будет позже.`)
}
</script>

<template>
  <main class="dashboard container">
    <div class="dashboard__inner">
      <div class="dashboard__header">
        <h1 class="dashboard__empty-text">У вас пока нет сохраненных проектов.</h1>
        <p class="dashboard__empty-subtext">Загрузите свой первый датасет</p>
      </div>

      <div 
        class="dashboard__dropzone"
        :class="{ 'is-dragging': isDragging }"
        @dragenter.prevent="onDragEnter"
        @dragover.prevent=""
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDrop"
      >
        <div class="dashboard__dropzone-content">
          <svg class="dashboard__dropzone-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <span class="dashboard__dropzone-text">Перетащите или откройте файл</span>
          <span class="dashboard__dropzone-hint">Поддерживаются CSV, JSON</span>
        </div>
        <!-- Hidden file input for click to upload -->
        <label class="dashboard__dropzone-trigger">
          <input type="file" accept=".csv,.json" @change="onFileSelect" />
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

.dashboard__dropzone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  pointer-events: none; /* Let drag events hit the parent */
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
</style>
