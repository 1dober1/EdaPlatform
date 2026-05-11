

const TARGET_KEYWORDS = [
  'target', 'label', 'class', 'y', 'outcome', 'result',
  'survived', 'diagnosis', 'default', 'churn', 'fraud',
  'species', 'category', 'status', 'type', 'grade',
  'цель', 'метка', 'класс', 'результат', 'диагноз',
]

const ANTI_KEYWORDS = [
  'id', 'name', 'index', 'date', 'time', 'timestamp',
  'имя', 'номер', 'дата', 'время',
]

function scoreColumn(col, rows, colIndex, totalCols, columnType) {
  let score = 0
  const reasons = []
  const lowerCol = col.toLowerCase().replace(/[_\-\s]+/g, '')

  
  for (const kw of TARGET_KEYWORDS) {
    if (lowerCol === kw || lowerCol.includes(kw)) {
      score += 50
      reasons.push(`Имя столбца содержит «${kw}»`)
      break
    }
  }

  
  for (const kw of ANTI_KEYWORDS) {
    if (lowerCol === kw || lowerCol.startsWith(kw) || lowerCol.endsWith(kw)) {
      score -= 100
      break
    }
  }

  
  const values = rows.map(r => r[col]).filter(v => v !== null && v !== undefined && v !== '')
  const uniqueCount = new Set(values).size
  const uniqueRatio = values.length > 0 ? uniqueCount / values.length : 1

  
  if (uniqueCount === 2) {
    score += 30
    reasons.push('Бинарный столбец (2 уник. значения)')
  }
  
  else if (uniqueCount >= 3 && uniqueCount <= 10) {
    score += 15
    reasons.push(`Мало классов (${uniqueCount} уник. значений)`)
  }
  
  else if (uniqueRatio > 0.5 && uniqueCount > 50) {
    score -= 20
  }

  
  if (columnType === 'integer' && uniqueCount <= 20) {
    score += 10
    reasons.push('Целочисленный с малым числом значений')
  }
  if (columnType === 'boolean') {
    score += 25
    reasons.push('Булев тип')
  }

  
  if (colIndex === totalCols - 1) {
    score += 10
    reasons.push('Последний столбец')
  }

  return { column: col, score, reasons }
}

export function guessTargetVariable(columns, rows, columnTypes) {
  if (!columns.length || !rows.length) {
    return { column: null, confidence: 'low', reasons: [] }
  }

  const scores = columns.map((col, i) =>
    scoreColumn(col, rows, i, columns.length, columnTypes[col])
  )

  
  scores.sort((a, b) => b.score - a.score)

  const best = scores[0]
  if (!best || best.score <= 0) {
    return { column: null, confidence: 'low', reasons: ['Не удалось определить целевую переменную'] }
  }

  let confidence = 'low'
  if (best.score >= 60) confidence = 'high'
  else if (best.score >= 30) confidence = 'medium'

  return {
    column: best.column,
    confidence,
    reasons: best.reasons,
    allScores: scores.filter(s => s.score > 0).slice(0, 5),
  }
}
