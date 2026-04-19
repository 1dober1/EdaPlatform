<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import * as echarts from 'echarts'
import VChart from 'vue-echarts'

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  chartType: { type: String, default: null }, // 'distribution', 'scatter', 'correlation', 'boxplot'
  rows: { type: Array, default: () => [] },
  columns: { type: Array, default: () => [] },
  columnTypes: { type: Object, default: () => ({}) },
  targetVariable: { type: String, default: null },
})

const emit = defineEmits(['close'])

const numericColumns = computed(() => {
  return props.columns.filter(c => props.columnTypes[c] === 'number' || props.columnTypes[c] === 'integer')
})

const selectedX = ref(null)
const selectedY = ref(null)

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    // Default selections
    if (numericColumns.value.length > 0) {
      selectedX.value = numericColumns.value[0]
      selectedY.value = props.targetVariable || (numericColumns.value.length > 1 ? numericColumns.value[1] : numericColumns.value[0])
    }
  }
})

// ─── Math Utils ──────────────
function pearson(xSeries, ySeries) {
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0
  let n = 0
  for (let i = 0; i < xSeries.length; i++) {
    const x = xSeries[i]
    const y = ySeries[i]
    if (x !== null && y !== null && !isNaN(x) && !isNaN(y)) {
      sumX += x; sumY += y; sumXY += x * y;
      sumX2 += x * x; sumY2 += y * y; n++;
    }
  }
  if (n === 0) return 0
  const num = (n * sumXY) - (sumX * sumY)
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
  return den === 0 ? 0 : num / den
}

function getQuantiles(arr) {
  const valid = arr.filter(v => v !== null && v !== undefined && v !== '')
  const nums = valid.map(Number).filter(n => !isNaN(n))
  if (nums.length === 0) return [0,0,0,0,0]
  const sorted = nums.sort((a,b) => a-b)
  const q1 = sorted[Math.floor(sorted.length * 0.25)]
  const median = sorted[Math.floor(sorted.length * 0.5)]
  const q3 = sorted[Math.floor(sorted.length * 0.75)]
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  return [min, q1, median, q3, max]
}

// ─── Chart Options ───────────
const chartOptions = computed(() => {
  if (props.chartType === 'distribution' && selectedX.value) {
    const type = props.columnTypes[selectedX.value]
    if (type === 'number' || type === 'integer') {
      // Histogram
      const rawVals = props.rows.map(r => r[selectedX.value])
      const validVals = rawVals.filter(v => v !== null && v !== undefined && v !== '')
      const vals = validVals.map(Number).filter(n => !isNaN(n))
      if (vals.length === 0) return {}
      const min = Math.min(...vals)
      const max = Math.max(...vals)
      const bins = 30
      const step = (max - min) / bins || 1
      const hist = new Array(bins).fill(0)
      vals.forEach(v => {
        let idx = Math.floor((v - min) / step)
        if (idx === bins) idx--
        hist[idx]++
      })
      const xData = Array.from({length: bins}, (_, i) => (min + i * step).toFixed(2))

      return {
        title: { text: `Распределение: ${selectedX.value}`, left: 'center' },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: xData },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', data: hist, itemStyle: { color: '#4f6ef7' } }]
      }
    } else {
      // Bar chart for categorical
      const freq = {}
      props.rows.forEach(r => {
        let v = r[selectedX.value]
        if (v === null || v === undefined) v = 'NaN'
        freq[v] = (freq[v] || 0) + 1
      })
      const entries = Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0, 20)
      return {
        title: { text: `Частоты: ${selectedX.value} (Топ 20)`, left: 'center' },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: entries.map(e => e[0]), axisLabel: { rotate: 45 } },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', data: entries.map(e => e[1]), itemStyle: { color: '#22c55e' } }]
      }
    }
  }

  if (props.chartType === 'scatter' && selectedX.value && selectedY.value) {
    const data = []
    props.rows.forEach(r => {
      const vxRaw = r[selectedX.value]
      const vyRaw = r[selectedY.value]
      if (vxRaw !== null && vxRaw !== '' && vyRaw !== null && vyRaw !== '') {
        const vx = Number(vxRaw)
        const vy = Number(vyRaw)
        if (!isNaN(vx) && !isNaN(vy)) {
          data.push([vx, vy])
        }
      }
    })
    return {
      title: { text: `${selectedY.value} vs ${selectedX.value}`, left: 'center' },
      tooltip: { formatter: (p) => `${selectedX.value}: ${p.data[0]}<br/>${selectedY.value}: ${p.data[1]}` },
      xAxis: { type: 'value', name: selectedX.value, nameLocation: 'middle', nameGap: 30 },
      yAxis: { type: 'value', name: selectedY.value, nameLocation: 'middle', nameGap: 40 },
      series: [{ type: 'scatter', symbolSize: 5, data, itemStyle: { color: 'rgba(79, 110, 247, 0.5)' } }]
    }
  }

  if (props.chartType === 'correlation') {
    const cols = numericColumns.value
    const corrMat = []
    
    for (let i = 0; i < cols.length; i++) {
      const iVals = props.rows.map(r => r[cols[i]] !== null && r[cols[i]] !== '' ? Number(r[cols[i]]) : null)
      for (let j = 0; j < cols.length; j++) {
        const jVals = props.rows.map(r => r[cols[j]] !== null && r[cols[j]] !== '' ? Number(r[cols[j]]) : null)
        const c = cols[i] === cols[j] ? 1 : pearson(iVals, jVals)
        corrMat.push([j, i, c.toFixed(2)])
      }
    }

    return {
      title: { text: 'Корреляционная матрица', left: 'center' },
      tooltip: { position: 'top' },
      grid: { height: '60%', top: '10%' },
      xAxis: { type: 'category', data: cols, axisLabel: { rotate: 45 } },
      yAxis: { type: 'category', data: cols },
      visualMap: {
        min: -1, max: 1, calculable: true, orient: 'horizontal', left: 'center', bottom: '5%',
        inRange: { color: ['#ef4444', '#ffffff', '#4f6ef7'] }
      },
      series: [{
        name: 'Pearson Corr', type: 'heatmap', data: corrMat,
        label: { show: true },
        itemStyle: { borderColor: '#e2e8f0', borderWidth: 1 }
      }]
    }
  }

  if (props.chartType === 'boxplot') {
    const cols = numericColumns.value
    const boxData = cols.map(c => {
      const rawVals = props.rows.map(r => r[c])
      return getQuantiles(rawVals)
    })
    
    return {
      title: { text: 'Box Plot числовых признаков', left: 'center' },
      tooltip: { trigger: 'item', axisPointer: { type: 'shadow' } },
      grid: { left: '10%', right: '10%', bottom: '15%' },
      xAxis: { type: 'category', data: cols, axisLabel: { rotate: 45 } },
      yAxis: { type: 'value' },
      series: [
        {
          name: 'Boxplot',
          type: 'boxplot',
          data: boxData,
          itemStyle: {
            color: 'rgba(79, 110, 247, 0.6)',
            borderColor: '#4f6ef7',
            borderWidth: 2
          }
        }
      ]
    }
  }

  return {}
})

</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">Визуализация: 
          <span v-if="chartType==='distribution'">Распределение</span>
          <span v-if="chartType==='scatter'">Матрица рассеяния</span>
          <span v-if="chartType==='correlation'">Корреляционная матрица</span>
          <span v-if="chartType==='boxplot'">Box Plot</span>
        </h3>
        <button class="modal-close" @click="emit('close')">✕</button>
      </div>

      <div class="modal-controls" v-if="chartType === 'distribution' || chartType === 'scatter'">
        <div class="control-group">
          <label>Ось X:</label>
          <select v-model="selectedX">
            <option v-for="c in (chartType==='distribution' ? columns : numericColumns)" :key="c" :value="c">{{c}}</option>
          </select>
        </div>
        <div class="control-group" v-if="chartType === 'scatter'">
          <label>Ось Y:</label>
          <select v-model="selectedY">
            <option v-for="c in numericColumns" :key="c" :value="c">{{c}}</option>
          </select>
        </div>
      </div>

      <div class="modal-body">
        <v-chart style="height: 100%; width: 100%" :option="chartOptions" autoresize />
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
  padding: var(--space-6);
}

.modal-content {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  width: 100%;
  max-width: 900px;
  height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-primary);
}

.modal-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.modal-close {
  background: transparent;
  border: none;
  font-size: 20px;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.modal-close:hover {
  color: var(--color-error);
}

.modal-controls {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-6);
  background: var(--color-bg-tertiary);
  border-bottom: 1px solid var(--color-border-light);
}

.control-group {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.control-group label {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
}

.control-group select {
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-family: var(--font-family);
}

.modal-body {
  flex: 1;
  padding: var(--space-4);
  background: var(--color-bg-primary);
  min-height: 0;
}
</style>
