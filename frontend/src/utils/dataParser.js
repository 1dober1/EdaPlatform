import Papa from 'papaparse'

const PARSERS = {
  csv: parseCsv,
  json: parseJson,
  parquet: parseParquet,
}

export async function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  const parser = PARSERS[ext]
  if (!parser) {
    throw new Error(`Формат .${ext} не поддерживается. Поддерживаемые: ${Object.keys(PARSERS).join(', ')}`)
  }

  let content
  if (ext === 'parquet') {
    content = await file.arrayBuffer()
  } else {
    content = await file.text()
  }

  const result = await parser(content)
  result.meta = {
    ...result.meta,
    fileName: file.name,
    fileSize: file.size,
    format: ext,
  }
  return result
}

export async function parseText(text, ext) {
  const parser = PARSERS[ext]
  if (!parser) throw new Error(`Формат .${ext} не поддерживается.`)
  return parser(text)
}

export function getSupportedFormats() {
  return Object.keys(PARSERS)
}

function parseCsv(text) {
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete(results) {
        // Fallback: if it parsed as 1 column and the content looks like JSON
        const cols = results.meta.fields || []
        if (cols.length === 1 && (text.trim().startsWith('[') || text.trim().startsWith('{'))) {
          try {
            const data = JSON.parse(text)
            const rows = extractJsonRows(data)
            if (rows.length > 0) {
              const jsonCols = Object.keys(rows[0])
              resolve({
                columns: jsonCols,
                rows,
                meta: {
                  totalRows: rows.length,
                  totalColumns: jsonCols.length,
                  delimiter: 'json-fallback',
                },
              })
              return
            }
          } catch (e) {}
        }
        
        resolve({
          columns: cols,
          rows: results.data,
          meta: {
            totalRows: results.data.length,
            totalColumns: cols.length,
            delimiter: results.meta.delimiter,
          },
        })
      },
      error(err) {
        reject(err)
      },
    })
  })
}

function extractJsonRows(data) {
  if (Array.isArray(data) && data.length > 0) {
    if (typeof data[0] === 'object' && data[0] !== null) {
      return data
    }
  }

  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    if ('data' in data) {
      const inner = data.data
      if (Array.isArray(inner) && inner.length > 0 && typeof inner[0] === 'object') {
        return inner
      }
    }

    if ('results' in data) {
      const inner = data.results
      if (Array.isArray(inner) && inner.length > 0 && typeof inner[0] === 'object') {
        return inner
      }
    }

    if ('records' in data) {
      const inner = data.records
      if (Array.isArray(inner) && inner.length > 0 && typeof inner[0] === 'object') {
        return inner
      }
    }

    const keys = Object.keys(data)
    if (keys.length > 0 && Array.isArray(data[keys[0]])) {
      const len = data[keys[0]].length
      const rows = []
      for (let i = 0; i < len; i++) {
        const row = {}
        for (const k of keys) {
          row[k] = Array.isArray(data[k]) && i < data[k].length ? data[k][i] : null
        }
        rows.push(row)
      }
      return rows
    }

    if (keys.length > 0 && typeof data[keys[0]] !== 'object') {
      return [data]
    }
  }

  return []
}

function parseJson(text) {
  return new Promise((resolve, reject) => {
    try {
      const data = JSON.parse(text)
      const rows = extractJsonRows(data)
      const columns = rows.length > 0 ? Object.keys(rows[0]) : []

      resolve({
        columns,
        rows,
        meta: {
          totalRows: rows.length,
          totalColumns: columns.length,
        },
      })
    } catch (err) {
      reject(new Error('Не удалось распарсить JSON: ' + err.message))
    }
  })
}

async function parseParquet(arrayBuffer) {
  try {
    const { parquetMetadata, parquetRead } = await import('hyparquet')

    const metadata = parquetMetadata(arrayBuffer)
    const columns = metadata.schema
      .filter(s => s.name !== 'schema')
      .map(s => s.name)

    return new Promise((resolve, reject) => {
      try {
        parquetRead({
          file: arrayBuffer,
          onComplete: (data) => {
            const rows = data.map(rowArr => {
              const obj = {}
              columns.forEach((col, i) => {
                let val = rowArr[i] !== undefined ? rowArr[i] : null
                if (typeof val === 'bigint') val = Number(val)
                obj[col] = val
              })
              return obj
            })

            resolve({
              columns,
              rows,
              meta: {
                totalRows: rows.length,
                totalColumns: columns.length,
              },
            })
          },
        })
      } catch (e) {
        reject(e)
      }
    })
  } catch (e) {
    throw new Error(
      'Не удалось прочитать Parquet файл: ' + e.message + '\n\n' +
      'Попробуйте сконвертировать файл в CSV:\n' +
      'import pandas as pd\n' +
      'df = pd.read_parquet("file.parquet")\n' +
      'df.to_csv("file.csv", index=False)'
    )
  }
}
