<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
import { useAuthStore } from '@/stores/auth'
import { parseFile, parseText } from '@/utils/dataParser'
import DataToolbar from '@/components/DataToolbar.vue'
import VirtualTable from '@/components/VirtualTable.vue'
import EdaSidebar from '@/components/EdaSidebar.vue'
import ChartModal from '@/components/ChartModal.vue'
import Papa from 'papaparse'
import { parquetExport } from '@/utils/parquetExport'

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
    checkPendingAction()
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
  checkPendingAction()
})

function checkPendingAction() {
  const pending = localStorage.getItem('eda_pending_action')
  if (pending === 'export' && authStore.isAuthenticated) {
    localStorage.removeItem('eda_pending_action')
    setTimeout(() => {
      alert('Вы успешно авторизовались! Теперь вы можете экспортировать датасет.')
    }, 500)
  }
}

async function loadDemo(slug) {
  try {
    isLoading.value = true
    errorMsg.value = null
    const res = await fetch(`${authStore.API_BASE}/api/datasets/demo/${slug}/`)
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

async function loadSaved(id) {
  isLoading.value = true
  if (window.NProgress) window.NProgress.start()

  try {
    const res = await fetch(`${authStore.API_BASE}/api/datasets/${id}/download/`, {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Ошибка сервера (${res.status}): ${errText.slice(0, 50)}`)
    }

    let filename = `dataset_${id}`
    let ext = 'csv'
    try {
      const metaRes = await fetch(`${authStore.API_BASE}/api/datasets/${id}/`, {
        headers: { 'Authorization': `Bearer ${authStore.token}` }
      })
      if (metaRes.ok) {
        const metaData = await metaRes.json()
        if (metaData.name) filename = metaData.name
        if (metaData.file) {
          ext = metaData.file.split('.').pop().toLowerCase()
        }
      }
    } catch (e) {}

    try {
      let result
      let fileSize = 0
      if (ext === 'parquet') {
        const buffer = await res.arrayBuffer()
        fileSize = buffer.byteLength
        const { parseText } = await import('@/utils/dataParser')
        result = await parseText(buffer, ext)
      } else {
        const text = await res.text()
        fileSize = text.length
        result = await parseText(text, ext)
      }
      
      store.setData(
        filename,
        result.columns,
        result.rows,
        {
          totalRows: result.rows.length,
          totalColumns: result.columns.length,
          fileSize: fileSize,
          format: ext
        },
        'saved',
        id
      )
    } catch (parseErr) {
      throw new Error('Ошибка парсинга файла: ' + parseErr.message)
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

function handleReplaceNanValues(col, keywords) {
  store.replaceNanValues(col, keywords)
}

function handleExport(format = 'csv') {
  const baseName = store.datasetName || 'export'
  let blob, ext

  if (format === 'csv') {
    const csv = Papa.unparse(store.rows)
    blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    ext = '.csv'
  } else if (format === 'json') {
    const json = JSON.stringify(store.rows, null, 2)
    blob = new Blob([json], { type: 'application/json;charset=utf-8;' })
    ext = '.json'
  } else if (format === 'parquet') {
    parquetExport(store.columns, store.rows, baseName)
    return
  } else {
    return
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = baseName + ext
  a.click()
  URL.revokeObjectURL(url)
}

function handleRemoveOutliers(col, method) {
  store.removeOutliers(col, method)
}

function handleSaveVersion(name) {
  store.saveNamedVersion(name)
  alert(`Версия «${name}» сохранена`)
}

function handleRestoreVersion(idx) {
  store.restoreNamedVersion(idx)
}

watch(() => store.datasetName, async (newName) => {
  if (store.datasetSource === 'saved' && store.datasetId && authStore.isAuthenticated) {
    try {
      await fetch(`${authStore.API_BASE}/api/datasets/${store.datasetId}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authStore.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newName }),
      })
    } catch (e) {}
  }
})
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
          :namedVersions="store.namedVersions"
          @export="handleExport"
          @fill-nulls="handleFillNulls"
          @replace-nan-values="handleReplaceNanValues"
          @remove-duplicates="handleRemoveDuplicates"
          @change-type="handleChangeType"
          @normalize-column="handleNormalizeColumn"
          @clip-column="handleClipColumn"
          @encode-column="handleEncodeColumn"
          @set-target="handleSetTarget"
          @open-chart="handleOpenChart"
          @remove-outliers="handleRemoveOutliers"
          @save-version="handleSaveVersion"
          @restore-version="handleRestoreVersion"
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
