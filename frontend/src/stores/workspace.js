/**
 * Pinia store для данных текущего рабочего пространства.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { describeAll, inferColumnType } from '@/utils/dataStats'

export const useWorkspaceStore = defineStore('workspace', () => {
  const datasetName = ref('Без названия')
  const columns = ref([])
  const rows = ref([])
  const meta = ref({})
  const isLoading = ref(false)
  const error = ref(null)

  // Типы колонок (кешируем)
  const columnTypes = computed(() => {
    const result = {}
    for (const col of columns.value) {
      result[col] = inferColumnType(rows.value, col)
    }
    return result
  })

  // Describe cache
  const describeCache = ref(null)

  function setData(name, cols, rowsData, metaData = {}) {
    datasetName.value = name
    columns.value = cols
    rows.value = rowsData
    meta.value = metaData
    describeCache.value = null
    error.value = null
  }

  function getDescribe() {
    if (!describeCache.value) {
      describeCache.value = describeAll(columns.value, rows.value)
    }
    return describeCache.value
  }

  function clear() {
    datasetName.value = 'Без названия'
    columns.value = []
    rows.value = []
    meta.value = {}
    describeCache.value = null
    error.value = null
  }

  return {
    datasetName,
    columns,
    rows,
    meta,
    isLoading,
    error,
    columnTypes,
    setData,
    getDescribe,
    clear,
  }
})
