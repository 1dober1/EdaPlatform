/**
 * Pinia store для данных текущего рабочего пространства.
 * Включает мутации: удаление столбцов, заполнение пропусков, удаление дубликатов,
 * смена типов, нормализация.
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { describeAll, inferColumnType } from '@/utils/dataStats'
import { detectOutliersIQR, detectOutliersZScore } from '@/utils/outlierDetection'
import NProgress from 'nprogress'
import localforage from 'localforage'

export const useWorkspaceStore = defineStore('workspace', () => {
  const datasetName = ref('Без названия')
  const columns = ref([])
  const rows = ref([])
  const meta = ref({})
  const isLoading = ref(false)
  const error = ref(null)
  const targetVariable = ref(null)

  const datasetSource = ref(null)
  const datasetId = ref(null)

  // ─── Undo/Redo & History ──────────────────────────────────────────
  const history = ref([])
  const historyIndex = ref(-1)

  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value >= 0 && historyIndex.value < history.value.length - 1)

  function saveState() {
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }
    history.value.push({
      columns: [...columns.value],
      rows: rows.value.map(r => ({ ...r })),
      targetVariable: targetVariable.value,
      datasetName: datasetName.value,
      datasetSource: datasetSource.value,
      datasetId: datasetId.value,
      meta: { ...meta.value }
    })
    if (history.value.length > 10) history.value.shift()
    else historyIndex.value++
    persistToStorage()
  }

  function undo() {
    if (!canUndo.value) return
    historyIndex.value--
    restoreState(history.value[historyIndex.value])
  }

  function redo() {
    if (!canRedo.value) return
    historyIndex.value++
    restoreState(history.value[historyIndex.value])
  }

  function restoreState(state) {
    if (!state) return
    columns.value = [...state.columns]
    rows.value = state.rows.map(r => ({ ...r }))
    targetVariable.value = state.targetVariable
    datasetName.value = state.datasetName
    datasetSource.value = state.datasetSource || null
    datasetId.value = state.datasetId || null
    invalidateCache()
    persistToStorage()
  }

  // ─── Persistence ──────────────────────────────────────────
  async function persistToStorage() {
    try {
      if (historyIndex.value >= 0) {
        const rawState = JSON.parse(JSON.stringify(history.value[historyIndex.value]))
        await localforage.setItem('eda_workspace_state', rawState)
      }
    } catch (e) {
      console.error('Failed to save to localforage', e)
    }
  }

  async function loadFromStorage() {
    try {
      const state = await localforage.getItem('eda_workspace_state')
      if (state && state.columns && state.rows) {
        columns.value = state.columns
        rows.value = state.rows
        targetVariable.value = state.targetVariable
        datasetName.value = state.datasetName
        datasetSource.value = state.datasetSource || null
        datasetId.value = state.datasetId || null
        if (state.meta) meta.value = state.meta
        history.value = [state]
        historyIndex.value = 0
        invalidateCache()
        return true
      }
    } catch (e) {}
    return false
  }

  // ─── Async wrapper ──────────────────────────────────────────
  async function withSync(fn) {
    isLoading.value = true
    NProgress.start()
    // Увеличим таймаут чтобы Vue успел отрендерить оверлей загрузки
    await new Promise(r => setTimeout(r, 20))
    if (history.value.length === 0) saveState()
    let result
    try {
      result = fn()
      saveState()
      invalidateCache()
    } catch (e) {
      alert("Сбой операции: " + e.message)
      console.error(e)
    } finally {
      isLoading.value = false
      NProgress.done()
    }
    return result
  }

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

  function setData(name, cols, rowsData, metaData = {}, source = null, id = null) {
    datasetName.value = name
    columns.value = cols
    rows.value = rowsData
    meta.value = metaData
    datasetSource.value = source
    datasetId.value = id
    describeCache.value = null
    error.value = null
    targetVariable.value = null
    history.value = []
    historyIndex.value = -1
    saveState()
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
    withSync(() => {
      columns.value = columns.value.filter(c => c !== col)
      rows.value = rows.value.map(row => {
        const newRow = { ...row }
        delete newRow[col]
        return newRow
      })
      if (targetVariable.value === col) targetVariable.value = null
    })
  }

  /** Переименовать столбец */
  function renameColumn(oldCol, newCol) {
    if (!columns.value.includes(oldCol) || columns.value.includes(newCol) || !newCol.trim()) return
    withSync(() => {
      const idx = columns.value.indexOf(oldCol)
      columns.value[idx] = newCol.trim()
      rows.value = rows.value.map(row => {
        const newRow = { ...row }
        newRow[newCol.trim()] = newRow[oldCol]
        delete newRow[oldCol]
        return newRow
      })
      if (targetVariable.value === oldCol) targetVariable.value = newCol.trim()
    })
  }



  /** Заполнить пропуски в конкретном столбце */
  function fillNulls(col, strategy) {
    withSync(() => {
      const type = inferColumnType(rows.value, col)

      if (strategy === 'drop') {
        rows.value = rows.value.filter(row => {
          const v = row[col]
          return v !== null && v !== undefined && v !== ''
        })
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
      }
    })
  }

  function removeDuplicates() {
    return withSync(() => {
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
      return removed
    })
  }

  /** Изменить тип данных столбца */
  function changeColumnType(col, newType) {
    withSync(() => {
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
    })
  }

  /** Нормализация конкретного столбца */
  function normalizeColumn(col, method) {
    withSync(() => {
      const nums = rows.value.map(r => {
        const v = r[col]
        return (v !== null && v !== undefined && v !== '') ? Number(v) : null
      })

      if (method === 'minmax') {
        const valid = nums.filter(n => n !== null && !isNaN(n))
        const min = valid.reduce((a, b) => a < b ? a : b, Infinity)
        const max = valid.reduce((a, b) => a > b ? a : b, -Infinity)
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
    })
  }

  /** Обрезка (clipping) значений столбца по краям (квантилям или ручным границам) */
  function clipColumn(col, method, minVal, maxVal) {
    withSync(() => {
      const nums = rows.value.map(r => {
        const v = r[col]
        return (v !== null && v !== undefined && v !== '') ? Number(v) : null
      })
      const valid = nums.filter(n => n !== null && !isNaN(n)).sort((a, b) => a - b)
      if (valid.length === 0) return

      let clipMin = -Infinity
      let clipMax = Infinity

      if (method === 'quantile') {
        const lowerIdx = Math.floor(valid.length * 0.01)
        const upperIdx = Math.floor(valid.length * 0.99)
        clipMin = valid[lowerIdx]
        clipMax = valid[Math.min(upperIdx, valid.length - 1)]
      } else if (method === 'manual') {
        if (minVal !== null && minVal !== undefined && minVal !== '') clipMin = Number(minVal)
        if (maxVal !== null && maxVal !== undefined && maxVal !== '') clipMax = Number(maxVal)
      }

      rows.value = rows.value.map((row, i) => {
        if (nums[i] === null || isNaN(nums[i])) return row
        const clamped = Math.max(clipMin, Math.min(clipMax, nums[i]))
        return { ...row, [col]: clamped }
      })
    })
  }

  /** Категориальное кодирование (Label / One-Hot) */
  function encodeColumn(col, method, dropOriginal = true) {
    withSync(() => {
      if (method === 'label') {
        // Уникальные значения
        const uniqueValues = Array.from(new Set(rows.value.map(r => String(r[col])))).sort()
        const map = new Map()
        uniqueValues.forEach((v, i) => map.set(v, i))
        
        rows.value = rows.value.map(row => {
          return { ...row, [col]: map.get(String(row[col])) }
        })
      } else if (method === 'onehot') {
        const uniqueValues = Array.from(new Set(rows.value.map(r => String(r[col]))))
        
        rows.value = rows.value.map(row => {
          const newRow = { ...row }
          const cellValue = String(row[col])
          uniqueValues.forEach(val => {
            const cleanVal = val.replace(/[\s\W]+/g, '_').toLowerCase()
            const newColName = `${col}_${cleanVal}`
            newRow[newColName] = cellValue === val ? 1 : 0
          })
          if (dropOriginal) delete newRow[col]
          return newRow
        })
        
        const colIndex = columns.value.indexOf(col)
        const newCols = uniqueValues.map(val => {
          const cleanVal = val.replace(/[\s\W]+/g, '_').toLowerCase()
          return `${col}_${cleanVal}`
        })
        
        if (dropOriginal) {
          columns.value.splice(colIndex, 1, ...newCols)
          if (targetVariable.value === col) targetVariable.value = null
        } else {
          columns.value.splice(colIndex + 1, 0, ...newCols)
        }
      }
    })
  }

  /** Заменить строковые NaN-значения на null */
  function replaceNanValues(col, keywords) {
    withSync(() => {
      const keySet = new Set(keywords.map(k => k.trim()))
      let replaced = 0
      rows.value = rows.value.map(row => {
        const v = row[col]
        if (v !== null && v !== undefined && keySet.has(String(v).trim())) {
          replaced++
          return { ...row, [col]: null }
        }
        return row
      })
      alert(`Столбец «${col}»: заменено ${replaced} значений на пустые (NaN).`)
    })
  }

  function clear() {
    history.value = []
    historyIndex.value = -1
    namedVersions.value = []
    localforage.removeItem('eda_workspace_state')
    localforage.removeItem('eda_named_versions')
  }

  /** Удалить выбросы из столбца по IQR или Z-score */
  function removeOutliers(col, method) {
    withSync(() => {
      const values = rows.value.map(r => {
        const v = r[col]
        return (v !== null && v !== undefined && v !== '') ? Number(v) : null
      })

      let indicesToRemove = new Set()

      if (method === 'iqr') {
        const validValues = values.filter(v => v !== null && !isNaN(v))
        const result = detectOutliersIQR(validValues)
        // Map valid indices back to original indices
        let validIdx = 0
        values.forEach((v, i) => {
          if (v !== null && !isNaN(v)) {
            if (v < result.lower || v > result.upper) {
              indicesToRemove.add(i)
            }
            validIdx++
          }
        })
      } else if (method === 'zscore') {
        const validValues = values.filter(v => v !== null && !isNaN(v))
        const result = detectOutliersZScore(validValues)
        let validIdx = 0
        values.forEach((v, i) => {
          if (v !== null && !isNaN(v)) {
            const z = Math.abs((v - result.mean) / result.std)
            if (z > result.threshold) {
              indicesToRemove.add(i)
            }
            validIdx++
          }
        })
      }

      const removedCount = indicesToRemove.size
      rows.value = rows.value.filter((_, i) => !indicesToRemove.has(i))
      alert(`Удалено ${removedCount} выбросов из «${col}» (метод: ${method.toUpperCase()})`)
    })
  }

  // ─── Named Versions ──────────────────────────────────────────
  const allNamedVersions = ref([])

  const namedVersions = computed(() => {
    const currentId = `${datasetSource.value}_${datasetId.value}`
    return allNamedVersions.value
      .filter(v => v.sourceId === currentId)
      .sort((a, b) => b.timestamp - a.timestamp)
  })

  async function loadNamedVersions() {
    try {
      const saved = await localforage.getItem('eda_named_versions')
      if (saved && Array.isArray(saved)) allNamedVersions.value = saved
    } catch (e) {}
  }
  loadNamedVersions()

  function saveNamedVersion(name) {
    const currentId = `${datasetSource.value}_${datasetId.value}`
    const snapshot = {
      id: Date.now(),
      timestamp: Date.now(),
      sourceId: currentId,
      name,
      date: new Date().toLocaleString('ru-RU'),
      rowCount: rows.value.length,
      colCount: columns.value.length,
      columns: [...columns.value],
      rows: rows.value.map(r => ({ ...r })),
      targetVariable: targetVariable.value,
      datasetName: datasetName.value,
      meta: { ...meta.value },
    }
    allNamedVersions.value.push(snapshot)
    
    const datasetVersions = allNamedVersions.value.filter(v => v.sourceId === currentId)
    if (datasetVersions.length > 20) {
      const oldestId = datasetVersions[0].id
      allNamedVersions.value = allNamedVersions.value.filter(v => v.id !== oldestId)
    }
    
    localforage.setItem('eda_named_versions', JSON.parse(JSON.stringify(allNamedVersions.value)))
  }

  function restoreNamedVersion(id) {
    const ver = allNamedVersions.value.find(v => v.id === id)
    if (!ver) return
    // Save current state before restoring
    saveState()
    columns.value = [...ver.columns]
    rows.value = ver.rows.map(r => ({ ...r }))
    targetVariable.value = ver.targetVariable
    datasetName.value = ver.datasetName
    if (ver.meta) meta.value = { ...ver.meta }
    invalidateCache()
    saveState()
    persistToStorage()
  }

  return {
    datasetName,
    datasetSource,
    datasetId,
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
    renameColumn,
    fillNulls,
    removeDuplicates,
    changeColumnType,
    normalizeColumn,
    clipColumn,
    encodeColumn,
    replaceNanValues,
    removeOutliers,
    namedVersions,
    saveNamedVersion,
    restoreNamedVersion,
    clear,
    canUndo,
    canRedo,
    undo,
    redo,
    loadFromStorage,
  }
})
