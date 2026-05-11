

import Papa from 'papaparse'

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
