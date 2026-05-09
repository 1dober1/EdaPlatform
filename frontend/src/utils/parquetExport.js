/**
 * parquetExport.js — Export data as Parquet.
 * Since true Parquet export requires heavy WASM dependencies
 * that are impractical in the browser, this falls back to CSV
 * with a helpful conversion instruction.
 */

import Papa from 'papaparse'

/**
 * Export rows in a Parquet-like format. Currently falls back to CSV
 * with a Python conversion guide, since browser-based Parquet writing
 * requires heavy WASM dependencies.
 */
export function parquetExport(columns, rows, baseName) {
  const csv = Papa.unparse(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = baseName + '.csv'
  a.click()
  URL.revokeObjectURL(url)
  
  alert(
    'Экспорт в формате Parquet пока недоступен напрямую в браузере.\n' +
    'Файл сохранён как CSV.\n\n' +
    'Для конвертации в Parquet используйте Python:\n' +
    `import pandas as pd\n` +
    `df = pd.read_csv("${baseName}.csv")\n` +
    `df.to_parquet("${baseName}.parquet")`
  )
}
