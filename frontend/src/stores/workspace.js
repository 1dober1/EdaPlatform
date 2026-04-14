/**
 * Pinia store для данных текущего рабочего пространства.
 * Включает мутации: удаление столбцов, заполнение пропусков, удаление дубликатов,
 * смена типов, нормализация.
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
  const targetVariable = ref(null)

  // Типы колонок (кешируем)
  const columnTypes = computed(() => {
    const result = {}
    for (const col of columns.value) {
      result[col] = inferColumnType(rows.value, col)
    }
    return result
  })

  // Describe cache (invalidated on any mutation)
  const describeCache = ref(null)

  function invalidateCache() {
    describeCache.value = null
    // Update meta counts
    meta.value = {
      ...meta.value,
      totalRows: rows.value.length,
      totalColumns: columns.value.length,
    }
  }

  function setData(name, cols, rowsData, metaData = {}) {
    datasetName.value = name
    columns.value = cols
    rows.value = rowsData
    meta.value = metaData
    describeCache.value = null
    error.value = null
    targetVariable.value = null
  }

  function getDescribe() {
    if (!describeCache.value) {
      describeCache.value = describeAll(columns.value, rows.value)
    }
    return describeCache.value
  }

  // ─── Mutations ───────────────────────────────────────────────

  /** Удалить столбец */
  function deleteColumn(col) {
    columns.value = columns.value.filter(c => c !== col)
    rows.value = rows.value.map(row => {
      const newRow = { ...row }
      delete newRow[col]
      return newRow
    })
    if (targetVariable.value === col) targetVariable.value = null
    invalidateCache()
  }

  /** Заполнить пропуски в конкретном столбце */
  function fillNulls(col, strategy) {
    const type = inferColumnType(rows.value, col)

    if (strategy === 'drop') {
      rows.value = rows.value.filter(row => {
        const v = row[col]
        return v !== null && v !== undefined && v !== ''
      })
      invalidateCache()
      return
    }

    let fillValue = null

    if (strategy === 'mean' && type === 'number') {
      const nums = rows.value.map(r => r[col]).filter(v => v !== null && v !== undefined && v !== '').map(Number).filter(n => !isNaN(n))
      fillValue = nums.length > 0 ? nums.reduce((s, n) => s + n, 0) / nums.length : 0
      fillValue = Math.round(fillValue * 100) / 100
    } else if (strategy === 'median' && type === 'number') {
      const nums = rows.value.map(r => r[col]).filter(v => v !== null && v !== undefined && v !== '').map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b)
      if (nums.length > 0) {
        fillValue = nums.length % 2 === 0
          ? (nums[nums.length / 2 - 1] + nums[nums.length / 2]) / 2
          : nums[Math.floor(nums.length / 2)]
        fillValue = Math.round(fillValue * 100) / 100
      }
    } else if (strategy === 'mode') {
      const freq = {}
      for (const row of rows.value) {
        const v = row[col]
        if (v !== null && v !== undefined && v !== '') {
          const key = String(v)
          freq[key] = (freq[key] || 0) + 1
        }
      }
      const top = Object.entries(freq).sort((a, b) => b[1] - a[1])
      fillValue = top.length > 0 ? top[0][0] : ''
    } else if (strategy === 'zero') {
      fillValue = type === 'number' ? 0 : ''
    }

    if (fillValue !== null) {
      rows.value = rows.value.map(row => {
        const v = row[col]
        if (v === null || v === undefined || v === '') {
          return { ...row, [col]: fillValue }
        }
        return row
      })
      invalidateCache()
    }
  }

  /** Удалить дубликаты */
  function removeDuplicates() {
    const seen = new Set()
    const unique = []
    for (const row of rows.value) {
      const key = JSON.stringify(row)
      if (!seen.has(key)) {
        seen.add(key)
        unique.push(row)
      }
    }
    const removed = rows.value.length - unique.length
    rows.value = unique
    invalidateCache()
    return removed
  }

  /** Изменить тип данных столбца */
  function changeColumnType(col, newType) {
    rows.value = rows.value.map(row => {
      const v = row[col]
      if (v === null || v === undefined || v === '') return row

      let converted = v
      if (newType === 'float64' || newType === 'int64') {
        const num = Number(v)
        converted = isNaN(num) ? null : (newType === 'int64' ? Math.round(num) : num)
      } else if (newType === 'object') {
        converted = String(v)
      } else if (newType === 'bool') {
        const s = String(v).toLowerCase()
        converted = s === 'true' || s === '1' || s === 'yes'
      }

      return { ...row, [col]: converted }
    })
    invalidateCache()
  }

  /** Нормализация конкретного столбца */
  function normalizeColumn(col, method) {
    const nums = rows.value.map(r => {
      const v = r[col]
      return (v !== null && v !== undefined && v !== '') ? Number(v) : null
    })

    if (method === 'minmax') {
      const valid = nums.filter(n => n !== null && !isNaN(n))
      const min = Math.min(...valid)
      const max = Math.max(...valid)
      const range = max - min || 1
      rows.value = rows.value.map((row, i) => {
        if (nums[i] === null || isNaN(nums[i])) return row
        return { ...row, [col]: Math.round(((nums[i] - min) / range) * 10000) / 10000 }
      })
    } else if (method === 'zscore') {
      const valid = nums.filter(n => n !== null && !isNaN(n))
      const mean = valid.reduce((s, n) => s + n, 0) / valid.length
      const std = Math.sqrt(valid.reduce((s, n) => s + (n - mean) ** 2, 0) / valid.length) || 1
      rows.value = rows.value.map((row, i) => {
        if (nums[i] === null || isNaN(nums[i])) return row
        return { ...row, [col]: Math.round(((nums[i] - mean) / std) * 10000) / 10000 }
      })
    } else if (method === 'log') {
      rows.value = rows.value.map((row, i) => {
        if (nums[i] === null || isNaN(nums[i]) || nums[i] <= 0) return row
        return { ...row, [col]: Math.round(Math.log(nums[i]) * 10000) / 10000 }
      })
    }
    invalidateCache()
  }

  function clear() {
    datasetName.value = 'Без названия'
    columns.value = []
    rows.value = []
    meta.value = {}
    describeCache.value = null
    error.value = null
    targetVariable.value = null
  }

  return {
    datasetName,
    columns,
    rows,
    meta,
    isLoading,
    error,
    targetVariable,
    columnTypes,
    setData,
    getDescribe,
    deleteColumn,
    fillNulls,
    removeDuplicates,
    changeColumnType,
    normalizeColumn,
    clear,
  }
})
