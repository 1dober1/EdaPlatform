<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: 'Без названия' },
  totalRows: { type: Number, default: 0 },
  totalColumns: { type: Number, default: 0 },
  fileSize: { type: Number, default: 0 },
  format: { type: String, default: '' },
  canUndo: { type: Boolean, default: false },
  canRedo: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'undo', 'redo'])

const isEditing = ref(false)
const editValue = ref(props.modelValue)

watch(() => props.modelValue, v => { editValue.value = v })

function startEdit() {
  editValue.value = props.modelValue
  isEditing.value = true
}

function finishEdit() {
  isEditing.value = false
  if (editValue.value.trim()) {
    emit('update:modelValue', editValue.value.trim())
  }
}

function formatBytes(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>

<template>
  <div class="toolbar">
    <div class="toolbar__name-group">
      <div v-if="isEditing" class="toolbar__edit-wrap">
        <input
          v-model="editValue"
          class="toolbar__name-input"
          @blur="finishEdit"
          @keyup.enter="finishEdit"
          ref="nameInput"
          autofocus
        />
      </div>
      <h2 v-else class="toolbar__name" @click="startEdit" title="Клик для редактирования">
        {{ modelValue }}
        <svg class="toolbar__edit-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
      </h2>
    </div>

    <div class="toolbar__history">
      <button class="btn btn--sm btn--icon-text" :disabled="!canUndo" @click="emit('undo')" title="Отменить последнее действие (Undo)">
        <svg fill="none" width="14" height="14" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" /></svg>
      </button>
      <button class="btn btn--sm btn--icon-text" :disabled="!canRedo" @click="emit('redo')" title="Вернуть действие (Redo)">
        <svg fill="none" width="14" height="14" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7" /></svg>
      </button>
    </div>

    <div class="toolbar__badges">
      <span class="badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        {{ totalRows.toLocaleString() }} строк
      </span>
      <span class="badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
        {{ totalColumns }} столбцов
      </span>
      <span class="badge" v-if="fileSize">
        {{ formatBytes(fileSize) }}
      </span>
      <span class="badge badge--accent" v-if="format">
        {{ format.toUpperCase() }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  gap: var(--space-4);
  flex-shrink: 0;
}

.toolbar__name-group {
  display: flex;
  align-items: center;
  min-width: 0;
}

.toolbar__name {
  font-size: var(--font-size-lg);
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color var(--transition-fast);
}

.toolbar__name:hover {
  color: var(--color-accent);
}

.toolbar__edit-icon {
  opacity: 0.3;
  flex-shrink: 0;
}

.toolbar__name:hover .toolbar__edit-icon {
  opacity: 0.7;
}

.toolbar__name-input {
  font-family: var(--font-family);
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-sm);
  padding: var(--space-1) var(--space-2);
  outline: none;
  width: 260px;
}

.toolbar__history {
  display: flex;
  gap: var(--space-2);
  margin-right: auto;
  margin-left: var(--space-4);
}

.btn--icon-text {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
}

.btn--icon-text:hover:not(:disabled) {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.btn--icon-text:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toolbar__badges {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  font-weight: 500;
  padding: 3px 10px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.badge--accent {
  background: var(--color-accent-light);
  color: var(--color-accent);
  font-weight: 600;
}

@media (max-width: 768px) {
  .toolbar {
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .toolbar__name-group {
    width: 100%;
    order: 1;
  }
  .toolbar__name-input {
    width: 100%;
  }
  .toolbar__history {
    margin-left: 0;
    margin-right: auto;
    order: 2;
  }
  .toolbar__badges {
    flex-wrap: wrap;
    order: 3;
    justify-content: flex-start;
  }
}
</style>
