<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
import { parseFile, parseText } from '@/utils/dataParser'
import DataToolbar from '@/components/DataToolbar.vue'
import VirtualTable from '@/components/VirtualTable.vue'
import EdaSidebar from '@/components/EdaSidebar.vue'
import Papa from 'papaparse'

const route = useRoute()
const store = useWorkspaceStore()

const isLoading = ref(true)
const errorMsg = ref(null)

const describeData = computed(() => store.getDescribe())

onMounted(async () => {
  const source = route.params.source
  const id = route.params.id

  if (source === 'demo') {
    await loadDemo(id)
  } else if (source === 'upload') {
    if (store.rows.length === 0) {
      errorMsg.value = 'Нет данных для отображения. Пожалуйста, загрузите файл.'
    }
    isLoading.value = false
  }
})

async function loadDemo(slug) {
  try {
    isLoading.value = true
    errorMsg.value = null
    const res = await fetch(`http://localhost:8000/api/datasets/demo/${slug}/`)
    if (!res.ok) throw new Error('Не удалось загрузить демо-датасет')
    const json = await res.json()

    const columns = json.data.length > 0 ? Object.keys(json.data[0]) : []
    store.setData(json.name, columns, json.data, {
      totalRows: json.data.length,
      totalColumns: columns.length,
      format: 'csv',
    })
  } catch (e) {
    errorMsg.value = e.message
  } finally {
    isLoading.value = false
  }
}

// ─── Event handlers for sidebar ────────────────────────────────

function handleDeleteColumn(col) {
  if (confirm(`Удалить столбец «${col}»?`)) {
    store.deleteColumn(col)
  }
}

function handleFillNulls(col, strategy) {
  store.fillNulls(col, strategy)
}

function handleRemoveDuplicates() {
  const removed = store.removeDuplicates()
  alert(`Удалено дубликатов: ${removed}`)
}

function handleChangeType(col, newType) {
  store.changeColumnType(col, newType)
}

function handleNormalizeColumn(col, method) {
  store.normalizeColumn(col, method)
}

function handleSetTarget(col) {
  store.targetVariable = col
}

function handleExport() {
  const csv = Papa.unparse(store.rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = (store.datasetName || 'export') + '.csv'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="workspace">
    <div v-if="isLoading" class="workspace__loading">
      <div class="spinner"></div>
      <p>Загрузка датасета…</p>
    </div>

    <div v-else-if="errorMsg" class="workspace__error">
      <p>{{ errorMsg }}</p>
      <router-link to="/" class="btn btn--primary btn--sm">На главную</router-link>
    </div>

    <template v-else>
      <DataToolbar
        v-model="store.datasetName"
        :totalRows="store.meta.totalRows || store.rows.length"
        :totalColumns="store.meta.totalColumns || store.columns.length"
        :fileSize="store.meta.fileSize || 0"
        :format="store.meta.format || ''"
      />

      <div class="workspace__body">
        <div class="workspace__table-area">
          <VirtualTable
            :columns="store.columns"
            :rows="store.rows"
            :columnTypes="store.columnTypes"
            :targetVariable="store.targetVariable"
            @delete-column="handleDeleteColumn"
          />
        </div>

        <EdaSidebar
          :describeData="describeData"
          :columns="store.columns"
          :rows="store.rows"
          :columnTypes="store.columnTypes"
          :targetVariable="store.targetVariable"
          @export="handleExport"
          @fill-nulls="handleFillNulls"
          @remove-duplicates="handleRemoveDuplicates"
          @change-type="handleChangeType"
          @normalize-column="handleNormalizeColumn"
          @set-target="handleSetTarget"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.workspace {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--header-height));
  overflow: hidden;
}

.workspace__body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.workspace__table-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: var(--space-3);
}

.workspace__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: var(--space-4);
  color: var(--color-text-secondary);
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

.workspace__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: var(--space-4);
  color: var(--color-error);
}
</style>
