<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
import { useAuthStore } from '@/stores/auth'
import { parseFile, parseText } from '@/utils/dataParser'
import DataToolbar from '@/components/DataToolbar.vue'
import VirtualTable from '@/components/VirtualTable.vue'
import EdaSidebar from '@/components/EdaSidebar.vue'
import ChartModal from '@/components/ChartModal.vue'
import Papa from 'papaparse'

const route = useRoute()
const store = useWorkspaceStore()
const authStore = useAuthStore()

const isLoading = ref(true)
const errorMsg = ref(null)

const chartModalOpen = ref(false)
const selectedChartType = ref(null)

const describeData = computed(() => store.getDescribe())

onMounted(async () => {
  const source = route.params.source
  const id = route.params.id

  const restored = await store.loadFromStorage()
  if (restored && store.datasetSource === source && String(store.datasetId) === String(id)) {
    isLoading.value = false
    return
  }

  if (source === 'demo') {
    await loadDemo(id)
  } else if (source === 'saved') {
    await loadSaved(id)
  } else if (source === 'upload') {
    if (!restored || store.datasetSource !== 'upload') {
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
    }, 'demo', slug)
  } catch (e) {
    errorMsg.value = e.message
  } finally {
    isLoading.value = false
  }
}

// ─── Event handlers for sidebar ────────────────────────────────


async function loadSaved(id) {
  isLoading.value = true
  if (window.NProgress) window.NProgress.start()
  
  try {
    const res = await fetch(`http://localhost:8000/api/datasets/${id}/download/`, {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Ошибка сервера (${res.status}): ${errText.slice(0, 50)}`)
    }

    let filename = `dataset_${id}.csv`
    try {
      const metaRes = await fetch(`http://localhost:8000/api/datasets/${id}/`, {
        headers: { 'Authorization': `Bearer ${authStore.token}` }
      })
      if (metaRes.ok) {
        const metaData = await metaRes.json()
        if (metaData.name) {
          filename = metaData.name.endsWith('.csv') || metaData.name.endsWith('.json') 
            ? metaData.name 
            : metaData.name + '.csv'
        }
      }
    } catch (e) {}
    
    const text = await res.text()
    
    if (filename.toLowerCase().endsWith('.json')) {
      const parsed = JSON.parse(text)
      const data = Array.isArray(parsed) ? parsed : [parsed]
      const cols = data.length ? Object.keys(data[0]) : []
      store.setData(filename, cols, data, {
        totalRows: data.length, totalColumns: cols.length, fileSize: text.length, format: 'json'
      }, 'saved', id)
    } else {
      Papa.parse(text, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          store.setData(filename, results.meta.fields || [], results.data, {
            totalRows: results.data.length,
            totalColumns: (results.meta.fields || []).length,
            fileSize: text.length,
            format: 'csv'
          }, 'saved', id)
        }
      })
    }
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    isLoading.value = false
    if (window.NProgress) window.NProgress.done()
  }
}

function handleDeleteColumn(col) {
  if (confirm(`Удалить столбец «${col}»?`)) {
    store.deleteColumn(col)
  }
}

function handleFillNulls(col, strategy) {
  store.fillNulls(col, strategy)
}

async function handleRemoveDuplicates() {
  const removed = await store.removeDuplicates()
  alert(`Удалено дубликатов: ${removed}`)
}

function handleChangeType(col, newType) {
  store.changeColumnType(col, newType)
}

function handleNormalizeColumn(col, method) {
  store.normalizeColumn(col, method)
}

function handleClipColumn(col, method, minVal, maxVal) {
  store.clipColumn(col, method, minVal, maxVal)
}

function handleEncodeColumn(col, method) {
  store.encodeColumn(col, method)
}

function handleSetTarget(col) {
  store.targetVariable = col
}

function handleOpenChart(type) {
  selectedChartType.value = type
  chartModalOpen.value = true
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
        :canUndo="store.canUndo"
        :canRedo="store.canRedo"
        @undo="store.undo"
        @redo="store.redo"
      />

      <div class="workspace__body">
        <div class="workspace__table-area">
          <VirtualTable
            :columns="store.columns"
            :rows="store.rows"
            :columnTypes="store.columnTypes"
            :targetVariable="store.targetVariable"
            @delete-column="handleDeleteColumn"
            @rename-column="store.renameColumn"
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
          @clip-column="handleClipColumn"
          @encode-column="handleEncodeColumn"
          @set-target="handleSetTarget"
          @open-chart="handleOpenChart"
        />
      </div>

      <ChartModal
        :isOpen="chartModalOpen"
        :chartType="selectedChartType"
        :rows="store.rows"
        :columns="store.columns"
        :columnTypes="store.columnTypes"
        :targetVariable="store.targetVariable"
        @close="chartModalOpen = false"
      />

      <div v-if="store.isLoading" class="workspace__overlay">
        <div class="spinner"></div>
        <p>Применение изменений…</p>
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
  position: relative;
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

.workspace__overlay {
  position: absolute;
  inset: 0;
  background: var(--color-bg-primary, #ffffff);
  opacity: 0.8;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  color: var(--color-text-primary);
  font-weight: 500;
}
@supports (backdrop-filter: blur(2px)) {
  .workspace__overlay {
    background: rgba(255, 255, 255, 0.4);
    backdrop-filter: blur(2px);
  }
  @media (prefers-color-scheme: dark) {
    .workspace__overlay {
      background: rgba(0, 0, 0, 0.4);
    }
  }
}
</style>
