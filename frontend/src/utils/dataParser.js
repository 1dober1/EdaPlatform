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
  const text = await file.text()
  const result = await parser(text)
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
