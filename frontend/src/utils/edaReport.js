/**
 * edaReport.js — Генерация HTML EDA-отчёта.
 * 
 * Генерирует полностью автономный HTML-файл со всеми
 * статистиками, таблицами и встроенными SVG-графиками.
 */

import { describeAll, inferColumnType } from './dataStats'
import { analyzeOutliers } from './outlierDetection'

/**
 * Generate a full EDA report as a downloadable HTML file.
 * @param {string} datasetName
 * @param {string[]} columns
 * @param {object[]} rows
 * @param {object} columnTypes
 * @param {string|null} targetVariable
 */
export function generateEdaReport(datasetName, columns, rows, columnTypes, targetVariable) {
  const describe = describeAll(columns, rows)
  const numericCols = columns.filter(c => columnTypes[c] === 'number' || columnTypes[c] === 'integer')
  
  // Outlier analysis for numeric columns
  const outlierResults = numericCols.map(col => analyzeOutliers(rows, col))

  // Correlation matrix for numeric columns
  const correlations = computeCorrelationMatrix(numericCols, rows)

  // Missing values summary
  const missingInfo = describe.map(d => ({
    column: d.column,
    nulls: d.nulls,
    percent: d.nullPercent,
    type: d.type,
  }))

  const html = buildHtml(datasetName, columns, rows, describe, numericCols, outlierResults, correlations, missingInfo, columnTypes, targetVariable)
  
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${datasetName || 'eda'}_report.html`
  a.click()
  URL.revokeObjectURL(url)
}

function computeCorrelationMatrix(numericCols, rows) {
  if (numericCols.length < 2) return null
  
  const data = {}
  numericCols.forEach(col => {
    data[col] = rows.map(r => {
      const v = r[col]
      return (v !== null && v !== undefined && v !== '') ? Number(v) : null
    })
  })

  const matrix = []
  for (let i = 0; i < numericCols.length; i++) {
    const row = []
    for (let j = 0; j < numericCols.length; j++) {
      if (i === j) {
        row.push(1)
      } else {
        row.push(pearsonCorr(data[numericCols[i]], data[numericCols[j]]))
      }
    }
    matrix.push(row)
  }

  return { columns: numericCols, matrix }
}

function pearsonCorr(a, b) {
  const pairs = []
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== null && b[i] !== null && !isNaN(a[i]) && !isNaN(b[i])) {
      pairs.push([a[i], b[i]])
    }
  }
  if (pairs.length < 3) return 0

  const n = pairs.length
  const sumX = pairs.reduce((s, p) => s + p[0], 0)
  const sumY = pairs.reduce((s, p) => s + p[1], 0)
  const sumXY = pairs.reduce((s, p) => s + p[0] * p[1], 0)
  const sumX2 = pairs.reduce((s, p) => s + p[0] ** 2, 0)
  const sumY2 = pairs.reduce((s, p) => s + p[1] ** 2, 0)

  const num = n * sumXY - sumX * sumY
  const den = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2))
  
  return den === 0 ? 0 : Math.round((num / den) * 100) / 100
}

function buildHtml(name, columns, rows, describe, numericCols, outlierResults, correlations, missingInfo, columnTypes, targetVariable) {
  const totalRows = rows.length
  const totalCols = columns.length
  const totalNulls = missingInfo.reduce((s, m) => s + m.nulls, 0)
  const totalCells = totalRows * totalCols
  const nullPercent = totalCells > 0 ? ((totalNulls / totalCells) * 100).toFixed(1) : '0.0'
  const now = new Date().toLocaleString('ru-RU')

  // Build histogram SVGs for numeric columns
  const histograms = numericCols.slice(0, 12).map(col => buildHistogramSvg(rows, col))

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>EDA Report — ${escHtml(name)}</title>
<style>
  :root { --accent: #4f6ef7; --accent-light: #eef1ff; --bg: #f8f9fb; --surface: #fff; --border: #e5e7eb; --text: #1a1a2e; --text2: #6b7280; --success: #22c55e; --warn: #f59e0b; --danger: #ef4444; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }
  .container { max-width: 1100px; margin: 0 auto; padding: 2rem 1.5rem; }
  h1 { font-size: 1.8rem; font-weight: 800; margin-bottom: 0.5rem; color: var(--accent); }
  h2 { font-size: 1.3rem; font-weight: 700; margin: 2rem 0 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid var(--accent); color: var(--text); }
  h3 { font-size: 1.05rem; font-weight: 600; margin: 1rem 0 0.5rem; color: var(--text); }
  .meta { color: var(--text2); font-size: 0.85rem; margin-bottom: 1.5rem; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1rem 0; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 1.2rem; }
  .card__num { font-size: 1.8rem; font-weight: 800; color: var(--accent); }
  .card__label { font-size: 0.8rem; color: var(--text2); margin-top: 0.25rem; }
  table { width: 100%; border-collapse: collapse; font-size: 0.82rem; margin: 0.5rem 0; }
  th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--border); }
  th { background: var(--accent-light); font-weight: 600; color: var(--accent); position: sticky; top: 0; }
  tr:hover td { background: #f0f4ff; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 0.7rem; font-weight: 600; }
  .badge--blue { background: rgba(79,110,247,0.1); color: #4f6ef7; }
  .badge--green { background: rgba(34,197,94,0.1); color: #22c55e; }
  .badge--orange { background: rgba(245,158,11,0.1); color: #f59e0b; }
  .badge--red { background: rgba(239,68,68,0.1); color: #ef4444; }
  .bar-bg { height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 3px; }
  .bar--ok { background: var(--success); }
  .bar--warn { background: var(--warn); }
  .bar--danger { background: var(--danger); }
  .hist-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin: 1rem 0; }
  .hist-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 1rem; }
  .hist-card h4 { font-size: 0.85rem; font-weight: 600; margin-bottom: 0.5rem; }
  .corr-table td { text-align: center; font-size: 0.75rem; font-weight: 500; min-width: 60px; }
  .corr-table th { font-size: 0.72rem; }
  .outlier-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 1rem; margin-bottom: 1rem; }
  .outlier-card h4 { font-size: 0.9rem; margin-bottom: 0.5rem; }
  .outlier-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.8rem; }
  .outlier-stats span { color: var(--text2); }
  .outlier-stats strong { color: var(--text); }
  .target-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; }
  .target-badge--active { background: rgba(79,110,247,0.1); color: var(--accent); }
  .footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid var(--border); color: var(--text2); font-size: 0.75rem; text-align: center; }
  @media print { body { background: #fff; } .container { max-width: 100%; } }
</style>
</head>
<body>
<div class="container">
  <h1>📊 EDA Report</h1>
  <p class="meta"><strong>${escHtml(name)}</strong> · ${now}</p>

  <h2>📋 Обзор датасета</h2>
  <div class="cards">
    <div class="card"><div class="card__num">${totalRows.toLocaleString()}</div><div class="card__label">Строк</div></div>
    <div class="card"><div class="card__num">${totalCols}</div><div class="card__label">Столбцов</div></div>
    <div class="card"><div class="card__num">${totalNulls.toLocaleString()}</div><div class="card__label">Пропусков (${nullPercent}%)</div></div>
    <div class="card"><div class="card__num">${numericCols.length}</div><div class="card__label">Числовых столбцов</div></div>
  </div>
  ${targetVariable ? `<p style="margin-top:1rem"><span class="target-badge target-badge--active">🎯 Целевая переменная: ${escHtml(targetVariable)}</span></p>` : ''}

  <h2>📊 Describe — все столбцы</h2>
  <div style="overflow-x:auto">
  <table>
    <thead><tr><th>Столбец</th><th>Тип</th><th>Non-null</th><th>Null</th><th>Null%</th><th>Unique</th><th>Mean</th><th>Std</th><th>Min</th><th>Max</th><th>Median</th></tr></thead>
    <tbody>
    ${describe.map(d => `<tr>
      <td><strong>${escHtml(d.column)}</strong></td>
      <td><span class="badge ${badgeClass(d.type)}">${typeLabel(d.type)}</span></td>
      <td>${(d.nonNull || 0).toLocaleString()}</td>
      <td>${(d.nulls || 0).toLocaleString()}</td>
      <td>${d.nullPercent}%</td>
      <td>${d.unique !== undefined ? d.unique.toLocaleString() : '—'}</td>
      <td>${d.mean ?? '—'}</td>
      <td>${d.std ?? '—'}</td>
      <td>${d.min ?? '—'}</td>
      <td>${d.max ?? '—'}</td>
      <td>${d.median ?? '—'}</td>
    </tr>`).join('\n    ')}
    </tbody>
  </table>
  </div>

  <h2>⚠️ Пропуски</h2>
  ${missingInfo.filter(m => m.nulls > 0).length === 0 
    ? '<p style="color:var(--success);font-weight:600">✓ Пропусков нет</p>'
    : `<table>
    <thead><tr><th>Столбец</th><th>Пропуски</th><th>%</th><th>Визуализация</th></tr></thead>
    <tbody>
    ${missingInfo.filter(m => m.nulls > 0).sort((a, b) => b.nulls - a.nulls).map(m => {
      const pct = parseFloat(m.percent)
      const barClass = pct < 10 ? 'bar--ok' : pct < 30 ? 'bar--warn' : 'bar--danger'
      return `<tr>
        <td><strong>${escHtml(m.column)}</strong></td>
        <td>${m.nulls.toLocaleString()}</td>
        <td>${m.percent}%</td>
        <td style="width:200px"><div class="bar-bg"><div class="bar-fill ${barClass}" style="width:${Math.max(pct, 1)}%"></div></div></td>
      </tr>`
    }).join('\n    ')}
    </tbody>
  </table>`}

  ${numericCols.length > 0 ? `
  <h2>📈 Распределения (числовые столбцы)</h2>
  <div class="hist-grid">
    ${histograms.map((svg, i) => `<div class="hist-card"><h4>${escHtml(numericCols[i])}</h4>${svg}</div>`).join('\n    ')}
  </div>` : ''}

  ${correlations ? `
  <h2>🔗 Корреляционная матрица</h2>
  <div style="overflow-x:auto">
  <table class="corr-table">
    <thead><tr><th></th>${correlations.columns.map(c => `<th>${escHtml(c.length > 12 ? c.slice(0,10)+'…' : c)}</th>`).join('')}</tr></thead>
    <tbody>
    ${correlations.matrix.map((row, i) => `<tr><th>${escHtml(correlations.columns[i].length > 12 ? correlations.columns[i].slice(0,10)+'…' : correlations.columns[i])}</th>${row.map(v => {
      const abs = Math.abs(v)
      const bg = abs > 0.7 ? 'rgba(79,110,247,0.3)' : abs > 0.4 ? 'rgba(79,110,247,0.15)' : abs > 0.2 ? 'rgba(79,110,247,0.07)' : 'transparent'
      return `<td style="background:${bg}">${v.toFixed(2)}</td>`
    }).join('')}</tr>`).join('\n    ')}
    </tbody>
  </table>
  </div>` : ''}

  ${outlierResults.filter(o => o.iqr.count > 0 || o.zscore.count > 0).length > 0 ? `
  <h2>🔍 Выбросы</h2>
  ${outlierResults.filter(o => o.iqr.count > 0 || o.zscore.count > 0).map(o => `
  <div class="outlier-card">
    <h4>${escHtml(o.column)}</h4>
    <div class="outlier-stats">
      <div><span>IQR метод:</span> <strong>${o.iqr.count} выбросов (${o.iqr.percent}%)</strong></div>
      <div><span>Z-score (>3σ):</span> <strong>${o.zscore.count} выбросов (${o.zscore.percent}%)</strong></div>
      <div><span>Q1 / Q3:</span> <strong>${o.iqr.q1} / ${o.iqr.q3}</strong></div>
      <div><span>IQR:</span> <strong>${o.iqr.iqr}</strong></div>
      <div><span>Границы IQR:</span> <strong>[${o.iqr.lower}, ${o.iqr.upper}]</strong></div>
      <div><span>Mean ± Std:</span> <strong>${o.zscore.mean} ± ${o.zscore.std}</strong></div>
    </div>
  </div>`).join('\n  ')}` : ''}

  <h2>📝 Первые 10 строк</h2>
  <div style="overflow-x:auto">
  <table>
    <thead><tr>${columns.map(c => `<th>${escHtml(c)}</th>`).join('')}</tr></thead>
    <tbody>
    ${rows.slice(0, 10).map(row => `<tr>${columns.map(c => `<td>${escHtml(String(row[c] ?? ''))}</td>`).join('')}</tr>`).join('\n    ')}
    </tbody>
  </table>
  </div>

  <div class="footer">
    Создано с помощью EDA Platform · ${now}
  </div>
</div>
</body>
</html>`
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function badgeClass(type) {
  if (type === 'number' || type === 'integer') return 'badge--blue'
  if (type === 'boolean') return 'badge--orange'
  if (type === 'mixed') return 'badge--red'
  return 'badge--green'
}

function typeLabel(type) {
  if (type === 'number') return 'float64'
  if (type === 'integer') return 'int64'
  if (type === 'boolean') return 'bool'
  return 'object'
}

/**
 * Build a simple SVG histogram for a numeric column.
 */
function buildHistogramSvg(rows, col) {
  const values = rows
    .map(r => r[col])
    .filter(v => v !== null && v !== undefined && v !== '' && !isNaN(Number(v)))
    .map(Number)

  if (values.length === 0) return '<p style="color:#999;font-size:0.8rem">Нет данных</p>'

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const binCount = Math.min(20, Math.max(5, Math.ceil(Math.sqrt(values.length))))
  const binWidth = range / binCount
  const bins = new Array(binCount).fill(0)

  values.forEach(v => {
    let idx = Math.floor((v - min) / binWidth)
    if (idx >= binCount) idx = binCount - 1
    bins[idx]++
  })

  const maxBin = Math.max(...bins)
  const svgW = 300
  const svgH = 120
  const barW = svgW / binCount - 1
  const barPad = 1

  const bars = bins.map((count, i) => {
    const h = maxBin > 0 ? (count / maxBin) * (svgH - 20) : 0
    const x = i * (barW + barPad)
    const y = svgH - 16 - h
    return `<rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="#4f6ef7" rx="1" opacity="0.85"/>`
  }).join('')

  const labelMin = min.toFixed(1)
  const labelMax = max.toFixed(1)

  return `<svg viewBox="0 0 ${svgW} ${svgH}" style="width:100%;max-width:${svgW}px">
    ${bars}
    <text x="0" y="${svgH - 2}" font-size="9" fill="#6b7280">${labelMin}</text>
    <text x="${svgW}" y="${svgH - 2}" font-size="9" fill="#6b7280" text-anchor="end">${labelMax}</text>
  </svg>`
}
