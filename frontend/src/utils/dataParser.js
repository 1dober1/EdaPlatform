/**
 * dataParser.js — Абстрактный слой парсинга файлов.
 *
 * Расширяемая архитектура: для добавления нового формата
 * достаточно добавить одну функцию-парсер в PARSERS.
 *
 * API:  parseFile(file)  → Promise<{ columns: string[], rows: object[], meta: object }>
 *       parseText(text, ext) → Promise<...>
 */

import Papa from 'papaparse'

// ─── Parsers registry ──────────────────────────────────────────
const PARSERS = {
  csv: parseCsv,
  json: parseJson,
  parquet: parseParquet,
  xlsx: parseExcel,
  xls: parseExcel,
}

/**
 * Основная точка входа: парсит File-объект.
 * @param {File} file
 * @returns {Promise<{columns: string[], rows: object[], meta: object}>}
 */
export async function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  const parser = PARSERS[ext]
  if (!parser) {
    throw new Error(`Формат .${ext} пока не поддерживается. Поддерживаемые: ${Object.keys(PARSERS).join(', ')}`)
  }
  
  let content
  if (ext === 'parquet' || ext === 'xlsx' || ext === 'xls') {
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

/**
 * Парсит текстовую строку при известном формате.
 */
export async function parseText(text, ext) {
  const parser = PARSERS[ext]
  if (!parser) throw new Error(`Формат .${ext} не поддерживается.`)
  return parser(text)
}

/**
 * Возвращает список поддерживаемых расширений.
 */
export function getSupportedFormats() {
  return Object.keys(PARSERS)
}

// ─── CSV ───────────────────────────────────────────────────────
function parseCsv(text) {
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete(results) {
        resolve({
          columns: results.meta.fields || [],
          rows: results.data,
          meta: {
            totalRows: results.data.length,
            totalColumns: (results.meta.fields || []).length,
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

// ─── JSON (массив объектов) ────────────────────────────────────
function parseJson(text) {
  return new Promise((resolve, reject) => {
    try {
      const data = JSON.parse(text)

      let rows = []
      if (Array.isArray(data)) {
        rows = data
      } else if (typeof data === 'object' && data !== null) {
        // Если это объект с ключами-массивами (DataFrame-style: {col: [vals]})
        const keys = Object.keys(data)
        if (keys.length > 0 && Array.isArray(data[keys[0]])) {
          const len = data[keys[0]].length
          for (let i = 0; i < len; i++) {
            const row = {}
            for (const k of keys) {
              row[k] = data[k]?.[i] ?? null
            }
            rows.push(row)
          }
        } else {
          rows = [data]
        }
      }

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

// ─── Parquet ─────────────────────────────────────────────────
async function parseParquet(arrayBuffer) {
  try {
    const { parquetMetadata, parquetRead } = await import('hyparquet')
    
    // Get column names from metadata
    const metadata = parquetMetadata(arrayBuffer)
    const columns = metadata.schema
      .filter(s => s.name !== 'schema')  // skip root schema entry
      .map(s => s.name)
    
    return new Promise((resolve, reject) => {
      parquetRead({
        file: arrayBuffer,
        onComplete: (data) => {
          // data is array of arrays — convert to array of objects
          const rows = data.map(rowArr => {
            const obj = {}
            columns.forEach((col, i) => {
              obj[col] = rowArr[i] !== undefined ? rowArr[i] : null
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

// ─── Excel (xlsx / xls) ─────────────────────────────────────
async function parseExcel(arrayBuffer) {
  try {
    const XLSX = await import('xlsx')
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    
    // Use first sheet
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    
    // Convert to array of objects with headers
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null })
    const columns = rows.length > 0 ? Object.keys(rows[0]) : []
    
    return {
      columns,
      rows,
      meta: {
        totalRows: rows.length,
        totalColumns: columns.length,
        sheetName,
        totalSheets: workbook.SheetNames.length,
      },
    }
  } catch (e) {
    throw new Error(
      'Не удалось прочитать Excel файл: ' + e.message + '\n\n' +
      'Убедитесь, что файл не повреждён.'
    )
  }
}
