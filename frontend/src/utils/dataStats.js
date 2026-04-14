/**
 * dataStats.js — Вычисление базовых статистик на фронтенде.
 * Универсальный модуль: работает с любым датасетом любого размера.
 */

/**
 * Определяет тип колонки по значениям.
 * @param {object[]} rows
 * @param {string} col
 * @returns {'number' | 'integer' | 'string' | 'boolean' | 'mixed' | 'empty'}
 */
export function inferColumnType(rows, col) {
  let numCount = 0
  let intCount = 0
  let strCount = 0
  let boolCount = 0
  let nullCount = 0
  const sampleSize = Math.min(rows.length, 500)

  for (let i = 0; i < sampleSize; i++) {
    const val = rows[i][col]
    if (val === null || val === undefined || val === '') {
      nullCount++
      continue
    }
    if (typeof val === 'boolean') { boolCount++; continue }
    if (typeof val === 'number' || (typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val)))) {
      numCount++
      if (Number.isInteger(Number(val))) intCount++
    } else {
      strCount++
    }
  }

  const total = sampleSize - nullCount
  if (total === 0) return 'empty'
  if (numCount / total > 0.8) {
    return intCount === numCount ? 'integer' : 'number'
  }
  if (boolCount / total > 0.8) return 'boolean'
  if (strCount / total > 0.5) return 'string'
  return 'mixed'
}

/**
 * Вычисляет describe-статистику для одной колонки.
 */
export function describeColumn(rows, col) {
  const type = inferColumnType(rows, col)
  const totalCount = rows.length
  let nullCount = 0
  const values = []

  for (const row of rows) {
    const v = row[col]
    if (v === null || v === undefined || v === '') {
      nullCount++
    } else {
      values.push(v)
    }
  }

  const base = {
    column: col,
    type,
    count: totalCount,
    nonNull: values.length,
    nulls: nullCount,
    nullPercent: totalCount > 0 ? ((nullCount / totalCount) * 100).toFixed(1) : '0.0',
  }

  if (type === 'number' || type === 'integer') {
    const nums = values.map(Number).filter(n => !isNaN(n))
    nums.sort((a, b) => a - b)
    const sum = nums.reduce((s, n) => s + n, 0)
    const mean = nums.length > 0 ? sum / nums.length : 0
    const variance = nums.length > 0
      ? nums.reduce((s, n) => s + (n - mean) ** 2, 0) / nums.length
      : 0

    return {
      ...base,
      unique: new Set(nums).size,
      mean: mean.toFixed(2),
      std: Math.sqrt(variance).toFixed(2),
      min: nums[0] ?? null,
      max: nums[nums.length - 1] ?? null,
      median: nums.length > 0
        ? (nums.length % 2 === 0
          ? ((nums[nums.length / 2 - 1] + nums[nums.length / 2]) / 2).toFixed(2)
          : nums[Math.floor(nums.length / 2)].toFixed(2))
        : null,
    }
  }

  // String / boolean / mixed
  const uniques = new Set(values)
  return {
    ...base,
    unique: uniques.size,
    topValues: getTopValues(values, 5),
  }
}

/**
 * Вычисляет describe для всех колонок.
 */
export function describeAll(columns, rows) {
  return columns.map(col => describeColumn(rows, col))
}

/**
 * Возвращает топ-N частых значений.
 */
function getTopValues(values, n) {
  const freq = {}
  for (const v of values) {
    const key = String(v)
    freq[key] = (freq[key] || 0) + 1
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([value, count]) => ({ value, count }))
}
