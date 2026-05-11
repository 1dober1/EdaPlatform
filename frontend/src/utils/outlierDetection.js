

export function detectOutliersIQR(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  if (n < 4) return { lower: -Infinity, upper: Infinity, outlierIndices: [], q1: 0, q3: 0, iqr: 0 }

  const q1 = sorted[Math.floor(n * 0.25)]
  const q3 = sorted[Math.floor(n * 0.75)]
  const iqr = q3 - q1
  const lower = q1 - 1.5 * iqr
  const upper = q3 + 1.5 * iqr

  const outlierIndices = []
  values.forEach((v, i) => {
    if (v < lower || v > upper) outlierIndices.push(i)
  })

  return { lower, upper, outlierIndices, q1, q3, iqr }
}

export function detectOutliersZScore(values, threshold = 3.0) {
  const n = values.length
  if (n < 2) return { mean: 0, std: 0, outlierIndices: [], threshold }

  const mean = values.reduce((s, v) => s + v, 0) / n
  const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n) || 1

  const outlierIndices = []
  values.forEach((v, i) => {
    const z = Math.abs((v - mean) / std)
    if (z > threshold) outlierIndices.push(i)
  })

  return { mean, std, outlierIndices, threshold }
}

export function analyzeOutliers(rows, col) {
  const values = []
  const validIndices = []

  rows.forEach((row, i) => {
    const v = row[col]
    if (v !== null && v !== undefined && v !== '' && !isNaN(Number(v))) {
      values.push(Number(v))
      validIndices.push(i)
    }
  })

  if (values.length < 4) {
    return {
      column: col,
      totalValues: values.length,
      iqr: { lower: 0, upper: 0, count: 0, indices: [], q1: 0, q3: 0, iqr: 0 },
      zscore: { mean: 0, std: 0, count: 0, indices: [], threshold: 3 },
    }
  }

  const iqrResult = detectOutliersIQR(values)
  const zResult = detectOutliersZScore(values)

  return {
    column: col,
    totalValues: values.length,
    iqr: {
      q1: Math.round(iqrResult.q1 * 100) / 100,
      q3: Math.round(iqrResult.q3 * 100) / 100,
      iqr: Math.round(iqrResult.iqr * 100) / 100,
      lower: Math.round(iqrResult.lower * 100) / 100,
      upper: Math.round(iqrResult.upper * 100) / 100,
      count: iqrResult.outlierIndices.length,
      percent: ((iqrResult.outlierIndices.length / values.length) * 100).toFixed(1),
      
      indices: iqrResult.outlierIndices.map(i => validIndices[i]),
    },
    zscore: {
      mean: Math.round(zResult.mean * 100) / 100,
      std: Math.round(zResult.std * 100) / 100,
      threshold: zResult.threshold,
      count: zResult.outlierIndices.length,
      percent: ((zResult.outlierIndices.length / values.length) * 100).toFixed(1),
      indices: zResult.outlierIndices.map(i => validIndices[i]),
    },
  }
}
