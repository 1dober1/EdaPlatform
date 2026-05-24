<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { analyzeOutliers } from '@/utils/outlierDetection'
import { guessTargetVariable } from '@/utils/targetGuess'
import { generateEdaReport } from '@/utils/edaReport'

const props = defineProps({
  describeData: { type: Array, default: () => [] },
  columns: { type: Array, default: () => [] },
  rows: { type: Array, default: () => [] },
  columnTypes: { type: Object, default: () => ({}) },
  targetVariable: { type: String, default: null },
  namedVersions: { type: Array, default: () => [] },
})

const isCollapsed = ref(window.innerWidth <= 768)
const activeSection = ref(null)

const authStore = useAuthStore()
const router = useRouter()

const showExportModal = ref(false)

function handleExport() {
  if (!authStore.isAuthenticated) {
    
    localStorage.setItem('eda_pending_action', 'export')
    localStorage.setItem('eda_return_url', window.location.pathname)
    alert('Для экспорта датасета необходимо зарегистрироваться в системе')
    router.push('/register')
    return
  }
  showExportModal.value = true
}

function handleExportFormat(format) {
  showExportModal.value = false
  emit('export', format)
}

const emit = defineEmits([
  'export',
  'fill-nulls',
  'remove-duplicates',
  'change-type',
  'normalize-column',
  'clip-column',
  'encode-column',
  'set-target',
  'open-chart',
  'replace-nan-values',
  'remove-outliers',
  'save-version',
  'restore-version',
])

const tools = [
  { id: 'describe', label: 'Describe', icon: 'M4 6h16M4 12h8M4 18h16' },
  { id: 'nulls', label: 'Пропуски', icon: 'M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' },
  { id: 'nan-values', label: 'Строковые NaN', icon: 'M12 9v2m0 4h.01M5.07 19H19a2 2 0 001.75-2.95L13.75 4a2 2 0 00-3.5 0L3.32 16.05A2 2 0 005.07 19z' },
  { id: 'outliers', label: 'Выбросы', icon: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01' },
  { id: 'duplicates', label: 'Дубликаты', icon: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6v4H9z' },
  { id: 'types', label: 'Типы данных', icon: 'M7 7h10v10H7zM3 3l4 4M17 3l-4 4M3 21l4-4M17 21l-4-4' },
  { id: 'normalize', label: 'Нормализация', icon: 'M22 12h-4l-3 9L9 3l-3 9H2' },
  { id: 'clip', label: 'Обрезка значений', icon: 'M6 2v14a2 2 0 0 0 2 2h14 M18 22V8a2 2 0 0 0-2-2H2' },
  { id: 'encode', label: 'Кодирование', icon: 'M7 20l4-16m2 16l4-16M6 9h14M4 15h14' },
  { id: 'target', label: 'Целевая переменная', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14a4 4 0 1 1 0-8 4 4 0 0 1 0 8z' },
  { id: 'versions', label: 'Версии', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
]

const charts = [
  { id: 'distribution', label: 'Распределение', icon: 'M18 20V10M12 20V4M6 20v-6' },
  { id: 'scatter', label: 'Матрица рассеяния', icon: 'M3 3v18h18M7 14l4-4 4 4 5-5' },
  { id: 'correlation', label: 'Корреляция', icon: 'M3 3h18v18H3zM8 8h2v2H8zM14 8h2v2h-2zM8 14h2v2H8zM14 14h2v2h-2zM11 11h2v2h-2z' },
  { id: 'boxplot', label: 'Box Plot', icon: 'M9 4v16M15 4v16M9 8h6M9 16h6M7 8H5M7 16H5M19 8h-2M19 16h-2' },
]

function toggleSection(id) {
  activeSection.value = activeSection.value === id ? null : id
}

const columnsWithNulls = computed(() => {
  return props.describeData.filter(d => d.nulls > 0).map(d => ({
    column: d.column,
    type: d.type,
    nulls: d.nulls,
    nullPercent: parseFloat(d.nullPercent),
    total: d.count,
  }))
})

function handleFillNulls(col, strategy) {
  emit('fill-nulls', col, strategy)
}

const duplicateCount = computed(() => {
  const seen = new Set()
  let dups = 0
  for (const row of props.rows) {
    const key = JSON.stringify(row)
    if (seen.has(key)) dups++
    else seen.add(key)
  }
  return dups
})

function handleRemoveDuplicates() {
  emit('remove-duplicates')
}

function pandasType(col) {
  const t = props.columnTypes[col]
  if (t === 'number') return 'float64'
  if (t === 'integer') return 'int64'
  if (t === 'boolean') return 'bool'
  return 'object'
}

function displayType(col) {
  const t = props.columnTypes[col]
  if (t === 'number') return 'number'
  if (t === 'integer') return 'integer'
  if (t === 'boolean') return 'boolean'
  return 'object' 
}

function handleChangeType(col, newType) {
  
  const currentType = props.columnTypes[col]
  if ((currentType === 'string' || currentType === 'mixed' || currentType === 'object') &&
      (newType === 'int64' || newType === 'float64')) {
    const confirmed = confirm(
      `⚠️ Внимание: столбец «${col}» содержит текстовые значения.\n\n` +
      `При конвертации в ${newType} нечисловые значения станут пустыми (NaN).\n\n` +
      `Продолжить?`
    )
    if (!confirmed) return
  }
  emit('change-type', col, newType)
}

const nanKeywords = ref({})
const defaultNanKeywords = 'NaN, None, NA, N/A, null, -, --'

function initNanKeywords() {
  props.columns.forEach(c => {
    if (!nanKeywords.value[c]) nanKeywords.value[c] = ''
  })
}
initNanKeywords()

function handleReplaceNanValues(col) {
  const raw = nanKeywords.value[col] || defaultNanKeywords
  const keywords = raw.split(',').map(k => k.trim()).filter(k => k.length > 0)
  if (keywords.length === 0) return
  emit('replace-nan-values', col, keywords)
  nanKeywords.value[col] = ''
}

const numericColumns = computed(() => {
  return props.columns.filter(c => props.columnTypes[c] === 'number' || props.columnTypes[c] === 'integer')
})

function handleNormalize(col, method) {
  emit('normalize-column', col, method)
}

import { watch } from 'vue'

const clipBounds = ref({})

watch(() => props.columns, (cols) => {
  cols.forEach(c => {
    if (!clipBounds.value[c]) clipBounds.value[c] = { min: '', max: '' }
  })
}, { immediate: true })

function handleClip(col, method, minVal = null, maxVal = null) {
  emit('clip-column', col, method, minVal, maxVal)
}

const categoricalColumns = computed(() => {
  return props.columns.filter(c => {
    const t = props.columnTypes[c]
    return t === 'object' || t === 'string' || t === 'boolean' || t === 'mixed'
  })
})

function handleEncode(col, method) {
  emit('encode-column', col, method)
}

const localTarget = ref(props.targetVariable)

function handleSetTarget(val) {
  const v = val || null
  localTarget.value = v
  emit('set-target', v)
}

const targetGuessResult = computed(() => {
  if (props.columns.length === 0 || props.rows.length === 0) return null
  return guessTargetVariable(props.columns, props.rows, props.columnTypes)
})

function applyTargetGuess() {
  if (targetGuessResult.value && targetGuessResult.value.column) {
    handleSetTarget(targetGuessResult.value.column)
  }
}

const outlierAnalysis = computed(() => {
  return numericColumns.value.map(col => analyzeOutliers(props.rows, col))
})

function handleRemoveOutliers(col, method) {
  emit('remove-outliers', col, method)
}

function handleGenerateReport() {
  generateEdaReport(
    'dataset',
    props.columns,
    props.rows,
    props.columnTypes,
    props.targetVariable,
  )
}

const versionName = ref('')

function handleSaveVersion() {
  if (!authStore.isAuthenticated) {
    localStorage.setItem('eda_pending_action', 'export')
    localStorage.setItem('eda_return_url', window.location.pathname)
    alert('Для сохранения версий датасета необходимо зарегистрироваться в системе')
    router.push('/register')
    return
  }
  const name = versionName.value.trim() || `v${new Date().toLocaleString('ru-RU')}`
  emit('save-version', name)
  versionName.value = ''
}

function handleRestoreVersion(id) {
  if (confirm('Восстановить эту версию? Текущие изменения будут потеряны.')) {
    emit('restore-version', id)
  }
}


</script>

<template>
  <aside class="sidebar" :class="{ 'is-collapsed': isCollapsed }">
    <button class="sidebar__toggle" @click="isCollapsed = !isCollapsed" :title="isCollapsed ? 'Развернуть' : 'Свернуть'">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline v-if="isCollapsed" points="9 18 15 12 9 6" />
        <polyline v-else points="15 18 9 12 15 6" />
      </svg>
    </button>

    <div class="sidebar__content" v-show="!isCollapsed">
      <h3 class="sidebar__title">Инструменты EDA</h3>

      <div class="sidebar__section">
        <div v-for="tool in tools" :key="tool.id" class="tool-item" :class="{ 'is-active': activeSection === tool.id }">
          <button class="tool-item__btn" @click="toggleSection(tool.id)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path :d="tool.icon" /></svg>
            <span class="tool-item__label">{{ tool.label }}</span>
            <svg class="tool-item__chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline :points="activeSection === tool.id ? '18 15 12 9 6 15' : '6 9 12 15 18 9'" />
            </svg>
          </button>

          
          <div v-if="activeSection === 'describe' && tool.id === 'describe'" class="tool-panel">
            <div v-for="d in describeData" :key="d.column" class="stat-card">
              <div class="stat-card__header">
                <span class="stat-card__name">{{ d.column }}</span>
                <span class="stat-card__type" :class="'type--' + displayType(d.column)">{{ d.type === 'number' ? 'float64' : d.type === 'integer' ? 'int64' : 'object' }}</span>
              </div>
              <div class="stat-card__body">
                <div class="stat-row"><span>Non-null</span><span>{{ d.nonNull?.toLocaleString() }}</span></div>
                <div class="stat-row"><span>Null</span><span>{{ d.nulls?.toLocaleString() }} ({{ d.nullPercent }}%)</span></div>
                <div class="stat-row"><span>Unique</span><span>{{ d.unique?.toLocaleString() ?? '—' }}</span></div>
                <template v-if="d.type === 'number' || d.type === 'integer'">
                  <div class="stat-row"><span>Mean</span><span>{{ d.mean }}</span></div>
                  <div class="stat-row"><span>Std</span><span>{{ d.std }}</span></div>
                  <div class="stat-row"><span>Min / Max</span><span>{{ d.min }} / {{ d.max }}</span></div>
                  <div class="stat-row"><span>Median</span><span>{{ d.median }}</span></div>
                </template>
                <template v-if="d.topValues">
                  <div class="stat-row" v-for="tv in d.topValues" :key="tv.value">
                    <span class="stat-row__val" :title="tv.value">{{ tv.value }}</span>
                    <span>{{ tv.count }}</span>
                  </div>
                </template>
              </div>
            </div>
          </div>

          
          <div v-if="activeSection === 'nan-values' && tool.id === 'nan-values'" class="tool-panel">
            <p class="tool-panel__hint">
              Укажите слова, которые нужно считать пропусками (через запятую).
              По умолчанию: NaN, None, NA, N/A, null, -, --
            </p>
            <div v-for="col in columns" :key="col" class="nan-card">
              <div class="nan-card__header">
                <span class="nan-card__name">{{ col }}</span>
              </div>
              <div class="nan-card__body">
                <input
                  type="text"
                  class="tool-panel__select"
                  v-model="nanKeywords[col]"
                  :placeholder="defaultNanKeywords"
                />
                <button class="act-btn" @click="handleReplaceNanValues(col)">Заменить</button>
              </div>
            </div>
          </div>

          
          <div v-if="activeSection === 'outliers' && tool.id === 'outliers'" class="tool-panel">
            <div v-if="numericColumns.length === 0" class="tool-panel__empty">
              Нет числовых столбцов
            </div>
            <div v-for="oa in outlierAnalysis" :key="oa.column" class="outlier-card">
              <div class="outlier-card__header">
                <span class="outlier-card__name">{{ oa.column }}</span>
              </div>
              <div class="outlier-card__body">
                <div class="outlier-method">
                  <span class="outlier-label">IQR:</span>
                  <span class="outlier-count" :class="{ 'has-outliers': oa.iqr.count > 0 }">
                    {{ oa.iqr.count }} выбр. ({{ oa.iqr.percent }}%)
                  </span>
                  <button v-if="oa.iqr.count > 0" class="act-btn act-btn--danger" @click="handleRemoveOutliers(oa.column, 'iqr')" title="Удалить выбросы IQR">Удалить</button>
                </div>
                <div class="outlier-detail">
                  <span>Q1: {{ oa.iqr.q1 }}</span>
                  <span>Q3: {{ oa.iqr.q3 }}</span>
                  <span>IQR: {{ oa.iqr.iqr }}</span>
                </div>
                <div class="outlier-detail">
                  <span>Границы: [{{ oa.iqr.lower }}, {{ oa.iqr.upper }}]</span>
                </div>
                <div class="outlier-method" style="margin-top:4px">
                  <span class="outlier-label">Z-score (&gt;3σ):</span>
                  <span class="outlier-count" :class="{ 'has-outliers': oa.zscore.count > 0 }">
                    {{ oa.zscore.count }} выбр. ({{ oa.zscore.percent }}%)
                  </span>
                  <button v-if="oa.zscore.count > 0" class="act-btn act-btn--danger" @click="handleRemoveOutliers(oa.column, 'zscore')" title="Удалить выбросы Z-score">Удалить</button>
                </div>
                <div class="outlier-detail">
                  <span>μ: {{ oa.zscore.mean }}</span>
                  <span>σ: {{ oa.zscore.std }}</span>
                </div>
              </div>
            </div>
          </div>

          
          <div v-if="activeSection === 'nulls' && tool.id === 'nulls'" class="tool-panel">
            <div v-if="columnsWithNulls.length === 0" class="tool-panel__empty">
              ✓ Пропусков нет
            </div>
            <div v-for="n in columnsWithNulls" :key="n.column" class="null-card">
              <div class="null-card__header">
                <span class="null-card__name">{{ n.column }}</span>
                <span class="null-card__info">{{ n.nulls }} ({{ n.nullPercent.toFixed(1) }}%)</span>
              </div>
              <div class="null-card__bar-bg">
                <div class="null-card__bar-fill" :style="{ width: Math.max(n.nullPercent, 1) + '%' }" :class="{ 'bar--warn': n.nullPercent < 30, 'bar--danger': n.nullPercent >= 30 }"/>
              </div>
              <div class="null-card__actions">
                <template v-if="n.type === 'number'">
                  <button class="act-btn" @click="handleFillNulls(n.column, 'mean')" title="Заполнить средним">Mean</button>
                  <button class="act-btn" @click="handleFillNulls(n.column, 'median')" title="Заполнить медианой">Median</button>
                  <button class="act-btn" @click="handleFillNulls(n.column, 'zero')" title="Заполнить нулями">0</button>
                </template>
                <template v-else>
                  <button class="act-btn" @click="handleFillNulls(n.column, 'mode')" title="Заполнить модой">Mode</button>
                </template>
                <button class="act-btn act-btn--danger" @click="handleFillNulls(n.column, 'drop')" title="Удалить строки с пропусками">Drop</button>
              </div>
            </div>
          </div>

          
          <div v-if="activeSection === 'duplicates' && tool.id === 'duplicates'" class="tool-panel">
            <div class="tool-panel__stat">
              <span class="tool-panel__stat-num">{{ duplicateCount.toLocaleString() }}</span>
              <span class="tool-panel__stat-label">{{ duplicateCount === 0 ? 'дубликатов не найдено' : 'дубликатов найдено' }}</span>
            </div>
            <button v-if="duplicateCount > 0" class="act-btn act-btn--wide act-btn--danger" @click="handleRemoveDuplicates">
              Удалить дубликаты
            </button>
          </div>

          
          <div v-if="activeSection === 'types' && tool.id === 'types'" class="tool-panel">
            <div v-for="col in columns" :key="col" class="type-row">
              <span class="type-row__name" :title="col">{{ col }}</span>
              <select class="type-row__select" :value="pandasType(col)" @change="handleChangeType(col, $event.target.value)">
                <option value="float64">float64</option>
                <option value="int64">int64</option>
                <option value="object">object</option>
                <option value="bool">bool</option>
              </select>
            </div>
          </div>

          
          <div v-if="activeSection === 'normalize' && tool.id === 'normalize'" class="tool-panel">
            <div v-if="numericColumns.length === 0" class="tool-panel__empty">
              Нет числовых столбцов
            </div>
            <div v-for="col in numericColumns" :key="col" class="norm-card">
              <span class="norm-card__name">{{ col }}</span>
              <div class="norm-card__actions">
                <button class="act-btn" @click="handleNormalize(col, 'minmax')">Min-Max</button>
                <button class="act-btn" @click="handleNormalize(col, 'zscore')">Z-Score</button>
                <button class="act-btn" @click="handleNormalize(col, 'log')">Log</button>
              </div>
            </div>
          </div>

          
          <div v-if="activeSection === 'clip' && tool.id === 'clip'" class="tool-panel">
            <div v-if="numericColumns.length === 0" class="tool-panel__empty">
              Нет числовых столбцов
            </div>
            <div v-for="col in numericColumns" :key="col" class="norm-card" style="flex-direction: column; align-items: stretch;">
              <span class="norm-card__name" style="margin-bottom: 6px; max-width: 100%;">{{ col }}</span>
              <div class="clip-actions" style="display: flex; gap: 4px; margin-bottom: 6px;">
                <button class="act-btn act-btn--wide" @click="handleClip(col, 'quantile')">По квантилям (1% — 99%)</button>
              </div>
              <div class="clip-manual" style="display: flex; gap: 4px;" v-if="clipBounds[col]">
                <input type="number" class="tool-panel__select" placeholder="Min" v-model="clipBounds[col].min" style="flex: 1; padding: 4px 6px;">
                <input type="number" class="tool-panel__select" placeholder="Max" v-model="clipBounds[col].max" style="flex: 1; padding: 4px 6px;">
                <button class="act-btn" @click="handleClip(col, 'manual', clipBounds[col].min, clipBounds[col].max)">OK</button>
              </div>
            </div>
          </div>

          
          <div v-if="activeSection === 'encode' && tool.id === 'encode'" class="tool-panel">
            <div v-if="categoricalColumns.length === 0" class="tool-panel__empty">
              Нет категориальных столбцов
            </div>
            <div v-for="col in categoricalColumns" :key="col" class="norm-card" style="flex-direction: column; align-items: stretch;">
              <span class="norm-card__name" style="margin-bottom: 6px; max-width: 100%;">{{ col }}</span>
              <div class="clip-actions" style="display: flex; gap: 4px;">
                <button class="act-btn act-btn--wide" @click="handleEncode(col, 'label')">Label Env</button>
                <button class="act-btn act-btn--wide" @click="handleEncode(col, 'onehot')">One-Hot</button>
              </div>
            </div>
          </div>

          
          <div v-if="activeSection === 'target' && tool.id === 'target'" class="tool-panel">
            <p class="tool-panel__hint">Выберите целевую переменную:</p>
            <select class="tool-panel__select" :value="targetVariable || ''" @change="handleSetTarget($event.target.value)">
              <option value="">— не выбрана —</option>
              <option v-for="col in columns" :key="col" :value="col">{{ col }}</option>
            </select>

            
            <div v-if="targetGuessResult && targetGuessResult.column && !targetVariable" class="target-guess">
              <div class="target-guess__header">
                <span class="target-guess__icon">🤖</span>
                <span class="target-guess__title">Предположение</span>
                <span class="target-guess__badge" :class="'guess--' + targetGuessResult.confidence">
                  {{ targetGuessResult.confidence === 'high' ? 'высокая' : targetGuessResult.confidence === 'medium' ? 'средняя' : 'низкая' }} уверенность
                </span>
              </div>
              <p class="target-guess__col">Столбец: <strong>{{ targetGuessResult.column }}</strong></p>
              <ul class="target-guess__reasons">
                <li v-for="(r, i) in targetGuessResult.reasons" :key="i">{{ r }}</li>
              </ul>
              <button class="act-btn act-btn--wide" @click="applyTargetGuess">Применить предположение</button>
            </div>

            <p v-if="targetVariable" class="tool-panel__target-note">
              Столбец <strong>{{ targetVariable }}</strong> помечен как целевая переменная
            </p>
          </div>

          
          <div v-if="activeSection === 'versions' && tool.id === 'versions'" class="tool-panel">
            <p class="tool-panel__hint">Сохраняйте версии датасета для отката к любому состоянию.</p>
            <div class="version-save">
              <input type="text" class="tool-panel__select" v-model="versionName" placeholder="Название версии (опционально)" />
              <button class="act-btn act-btn--wide" @click="handleSaveVersion" style="margin-top:4px">💾 Сохранить версию</button>
            </div>
            <div class="version-list">
              <div v-if="props.namedVersions.length === 0" class="tool-panel__empty" style="font-size:11px;color:var(--color-text-tertiary);padding:4px 0">
                Нет сохранённых версий
              </div>
              <div v-for="ver in props.namedVersions" :key="ver.id" class="version-item">
                <div>
                  <div class="version-item__name" :title="ver.name">{{ ver.name }}</div>
                  <div class="version-item__meta">{{ ver.date }} · {{ ver.rowCount }} стр. · {{ ver.colCount }} столб.</div>
                </div>
                <button class="act-btn" @click="handleRestoreVersion(ver.id)">Восстановить</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      
      <div class="sidebar__divider"></div>
      <h4 class="sidebar__subtitle">Графики</h4>
      <div class="sidebar__section">
        <div v-for="chart in charts" :key="chart.id" class="tool-item">
          <button class="tool-item__btn" @click="emit('open-chart', chart.id)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path :d="chart.icon" /></svg>
            <span class="tool-item__label">{{ chart.label }}</span>
          </button>
        </div>
      </div>

      
      <div class="sidebar__divider"></div>
      <div class="sidebar__section" style="padding-bottom:var(--space-2)">
        <button class="act-btn act-btn--wide report-btn" @click="handleGenerateReport">
          📊 Сгенерировать EDA-отчёт (HTML)
        </button>
      </div>

      
      <div class="sidebar__export">
        <button class="btn--accent-export" @click="handleExport">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Экспорт датасета
        </button>
      </div>
    </div>

    
    <Teleport to="body">
      <div v-if="showExportModal" class="export-modal-overlay" @click.self="showExportModal = false">
        <div class="export-modal">
          <h3 class="export-modal__title">Выберите формат экспорта</h3>
          <div class="export-modal__options">
            <button class="export-modal__btn" @click="handleExportFormat('csv')">
              <span class="export-modal__icon">📄</span>
              <span class="export-modal__label">CSV</span>
              <span class="export-modal__desc">Comma-separated values</span>
            </button>
            <button class="export-modal__btn" @click="handleExportFormat('json')">
              <span class="export-modal__icon">📋</span>
              <span class="export-modal__label">JSON</span>
              <span class="export-modal__desc">JavaScript Object Notation</span>
            </button>
            <button class="export-modal__btn" @click="handleExportFormat('parquet')">
              <span class="export-modal__icon">📦</span>
              <span class="export-modal__label">Parquet</span>
              <span class="export-modal__desc">Apache Parquet (columnar)</span>
            </button>
          </div>
          <button class="export-modal__cancel" @click="showExportModal = false">Отмена</button>
        </div>
      </div>
    </Teleport>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  width: 300px;
  min-width: 300px;
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  transition: width var(--transition-base), min-width var(--transition-base);
  overflow: hidden;
  position: relative;
}

.sidebar.is-collapsed { width: 40px; min-width: 40px; }

.sidebar__toggle {
  position: absolute;
  top: var(--space-3); left: var(--space-2);
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  z-index: 2;
  transition: background var(--transition-fast);
}
.sidebar__toggle:hover { background: var(--color-bg-tertiary); }

.sidebar__content {
  display: flex; flex-direction: column;
  height: 100%; padding-top: 44px; overflow-y: auto;
}

.sidebar__title {
  font-size: var(--font-size-sm); font-weight: 700;
  color: var(--color-text-primary);
  padding: 0 var(--space-3) var(--space-2);
}

.sidebar__subtitle {
  font-size: var(--font-size-xs); font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase; letter-spacing: 0.5px;
  padding: 0 var(--space-3) var(--space-2);
}

.sidebar__divider { height: 1px; background: var(--color-border); margin: var(--space-3) 0; }
.sidebar__section { padding: 0 var(--space-2); }

.tool-item { border-radius: var(--radius-sm); margin-bottom: 1px; }
.tool-item.is-active { background: var(--color-bg-secondary); }

.tool-item__btn {
  width: 100%; display: flex; align-items: center; gap: var(--space-2);
  padding: 7px 10px; font-size: var(--font-size-xs); font-weight: 500;
  color: var(--color-text-secondary); border-radius: var(--radius-sm);
  transition: all var(--transition-fast); text-align: left;
}
.tool-item__btn:hover:not(:disabled) { background: var(--color-surface-hover); color: var(--color-text-primary); }
.tool-item__btn:disabled { opacity: 0.5; cursor: not-allowed; }
.tool-item__label { flex: 1; }
.tool-item__chevron { flex-shrink: 0; opacity: 0.4; }

.tool-panel { padding: var(--space-2) var(--space-3) var(--space-3); }

.tool-panel__hint { font-size: 11px; color: var(--color-text-tertiary); margin-bottom: var(--space-2); }

.tool-panel__empty {
  font-size: 12px; color: var(--color-success); font-weight: 500;
  padding: var(--space-2) 0;
}

.tool-panel__stat { display: flex; align-items: baseline; gap: var(--space-2); padding: var(--space-2) 0; }
.tool-panel__stat-num { font-size: var(--font-size-2xl); font-weight: 700; color: var(--color-text-primary); }
.tool-panel__stat-label { font-size: var(--font-size-xs); color: var(--color-text-tertiary); }

.tool-panel__select {
  width: 100%; padding: 6px 10px;
  border: 1px solid var(--color-border); border-radius: var(--radius-sm);
  background: var(--color-bg-primary); color: var(--color-text-primary);
  font-family: var(--font-family); font-size: var(--font-size-xs); outline: none;
}
.tool-panel__select:focus { border-color: var(--color-accent); }

.tool-panel__target-note {
  font-size: 11px; color: var(--color-accent); margin-top: var(--space-2);
}

.act-btn {
  padding: 3px 8px; font-size: 10px; font-weight: 600;
  border: 1px solid var(--color-border); border-radius: var(--radius-sm);
  background: var(--color-bg-primary); color: var(--color-text-secondary);
  cursor: pointer; transition: all var(--transition-fast);
  font-family: var(--font-family);
}
.act-btn:hover { border-color: var(--color-accent); color: var(--color-accent); background: var(--color-accent-light); }
.act-btn--danger { color: var(--color-error); }
.act-btn--danger:hover { border-color: var(--color-error); color: #fff; background: var(--color-error); }
.act-btn--wide { width: 100%; padding: 5px 8px; font-size: 11px; }

.stat-card { background: var(--color-bg-primary); border: 1px solid var(--color-border-light); border-radius: var(--radius-sm); overflow: hidden; margin-bottom: var(--space-2); }
.stat-card__header { display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; border-bottom: 1px solid var(--color-border-light); background: var(--color-bg-tertiary); }
.stat-card__name { font-size: 11px; font-weight: 600; color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.stat-card__type { font-size: 9px; font-weight: 500; padding: 1px 5px; border-radius: var(--radius-full); }
.type--number, .type--integer { background: rgba(79, 110, 247, 0.1); color: #4f6ef7; }
.type--object { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
.type--string { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
.type--boolean { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.type--mixed { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.stat-card__body { padding: 4px 8px; }
.stat-row { display: flex; justify-content: space-between; font-size: 11px; padding: 1px 0; color: var(--color-text-secondary); }
.stat-row__val { max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.null-card { padding: var(--space-2) 0; border-bottom: 1px solid var(--color-border-light); }
.null-card:last-child { border-bottom: none; }
.null-card__header { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; }
.null-card__name { font-weight: 600; color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 130px; }
.null-card__info { color: var(--color-text-tertiary); flex-shrink: 0; }
.null-card__bar-bg { height: 4px; background: var(--color-bg-tertiary); border-radius: 2px; overflow: hidden; margin-bottom: 4px; }
.null-card__bar-fill { height: 100%; border-radius: 2px; }
.bar--warn { background: var(--color-warning); }
.bar--danger { background: var(--color-error); }
.null-card__actions { display: flex; gap: 3px; flex-wrap: wrap; }

.type-row { display: flex; justify-content: space-between; align-items: center; padding: 3px 0; }
.type-row__name { font-size: 11px; font-weight: 500; color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 120px; }
.type-row__select {
  width: 90px; padding: 2px 6px;
  border: 1px solid var(--color-border); border-radius: var(--radius-sm);
  background: var(--color-bg-primary); color: var(--color-text-secondary);
  font-family: var(--font-family); font-size: 10px; cursor: pointer;
}

.norm-card {
  display: flex; justify-content: space-between; align-items: center;
  padding: 4px 0; border-bottom: 1px solid var(--color-border-light);
}
.norm-card:last-child { border-bottom: none; }
.norm-card__name { font-size: 11px; font-weight: 500; color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 90px; }
.norm-card__actions { display: flex; gap: 3px; }

.sidebar__export { flex-shrink: 0; padding: var(--space-3); border-top: 1px solid var(--color-border); margin-top: auto; }
.btn--accent-export {
  width: 100%; display: flex; align-items: center; justify-content: center;
  gap: var(--space-2); padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-sm); font-weight: 600; color: #fff;
  background: var(--color-accent-gradient); border-radius: var(--radius-sm);
  transition: all var(--transition-fast); box-shadow: 0 2px 8px rgba(79, 110, 247, 0.3);
  cursor: pointer; border: none; font-family: var(--font-family);
}
.btn--accent-export:hover { filter: brightness(1.1); box-shadow: 0 4px 14px rgba(79, 110, 247, 0.4); transform: translateY(-1px); }

.nan-card { padding: var(--space-2) 0; border-bottom: 1px solid var(--color-border-light); }
.nan-card:last-child { border-bottom: none; }
.nan-card__header { margin-bottom: 4px; }
.nan-card__name { font-size: 11px; font-weight: 600; color: var(--color-text-primary); }
.nan-card__body { display: flex; gap: 4px; align-items: center; }
.nan-card__body input { flex: 1; padding: 4px 8px; font-size: 10px; }

.export-modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(4px);
}
.export-modal {
  background: var(--color-surface); border-radius: var(--radius-lg);
  padding: var(--space-8); width: 360px; max-width: 90vw;
  box-shadow: var(--shadow-xl); border: 1px solid var(--color-border);
}
.export-modal__title {
  font-size: var(--font-size-lg); font-weight: 700;
  color: var(--color-text-primary); margin-bottom: var(--space-5); text-align: center;
}
.export-modal__options { display: flex; flex-direction: column; gap: var(--space-3); }
.export-modal__btn {
  display: flex; align-items: center; gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  background: var(--color-bg-primary); cursor: pointer;
  transition: all var(--transition-fast); font-family: var(--font-family);
}
.export-modal__btn:hover {
  border-color: var(--color-accent); background: var(--color-accent-light);
  transform: translateX(4px);
}
.export-modal__icon { font-size: 1.4rem; }
.export-modal__label { font-size: var(--font-size-base); font-weight: 600; color: var(--color-text-primary); }
.export-modal__desc { font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-left: auto; }
.export-modal__cancel {
  width: 100%; margin-top: var(--space-4); padding: var(--space-2);
  font-size: var(--font-size-sm); color: var(--color-text-secondary);
  background: none; border: none; cursor: pointer; font-family: var(--font-family);
}
.export-modal__cancel:hover { color: var(--color-text-primary); }

.outlier-card { padding: var(--space-2) 0; border-bottom: 1px solid var(--color-border-light); }
.outlier-card:last-child { border-bottom: none; }
.outlier-card__header { margin-bottom: 4px; }
.outlier-card__name { font-size: 11px; font-weight: 600; color: var(--color-text-primary); }
.outlier-card__body { padding: 2px 0; }
.outlier-method { display: flex; align-items: center; gap: 4px; font-size: 10px; margin-bottom: 2px; }
.outlier-label { font-weight: 600; color: var(--color-text-secondary); min-width: 55px; }
.outlier-count { color: var(--color-success); font-weight: 500; flex: 1; }
.outlier-count.has-outliers { color: var(--color-warning); }
.outlier-detail { display: flex; gap: 8px; font-size: 9px; color: var(--color-text-tertiary); margin-bottom: 2px; padding-left: 4px; }

.target-guess { margin-top: var(--space-3); padding: var(--space-2); background: var(--color-accent-light, rgba(79,110,247,0.05)); border-radius: var(--radius-sm); border: 1px dashed var(--color-accent, #4f6ef7); }
.target-guess__header { display: flex; align-items: center; gap: 4px; margin-bottom: 4px; }
.target-guess__icon { font-size: 14px; }
.target-guess__title { font-size: 11px; font-weight: 600; color: var(--color-text-primary); }
.target-guess__badge { font-size: 9px; font-weight: 600; padding: 1px 6px; border-radius: var(--radius-full); margin-left: auto; }
.guess--high { background: rgba(34,197,94,0.15); color: #22c55e; }
.guess--medium { background: rgba(245,158,11,0.15); color: #f59e0b; }
.guess--low { background: rgba(239,68,68,0.15); color: #ef4444; }
.target-guess__col { font-size: 11px; color: var(--color-text-secondary); margin-bottom: 4px; }
.target-guess__reasons { font-size: 10px; color: var(--color-text-tertiary); list-style: none; margin-bottom: 6px; }
.target-guess__reasons li::before { content: '→ '; color: var(--color-accent); }

.version-save { margin-bottom: var(--space-3); }
.version-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--color-border-light); font-size: 10px; }
.version-item:last-child { border-bottom: none; }
.version-item__name { font-weight: 500; font-size: 11px; color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px; margin-bottom: 2px; }
.version-item__meta { font-size: 9px; color: var(--color-text-tertiary); }

.report-btn { padding: 8px 12px !important; font-size: 11px !important; background: var(--color-accent-light, rgba(79,110,247,0.08)) !important; border-color: var(--color-accent, #4f6ef7) !important; color: var(--color-accent, #4f6ef7) !important; font-weight: 600 !important; }
.report-btn:hover { background: var(--color-accent, #4f6ef7) !important; color: #fff !important; }

@media (max-width: 768px) {
  .sidebar {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    z-index: 50;
    box-shadow: -4px 0 15px rgba(0,0,0,0.15);
    transition: transform var(--transition-base);
    overflow: visible;
  }
  .sidebar.is-collapsed {
    transform: translateX(100%);
    width: 300px;
    min-width: 300px;
  }
  .sidebar.is-collapsed .sidebar__toggle {
    left: -28px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-right: none;
    border-radius: var(--radius-sm) 0 0 var(--radius-sm);
    box-shadow: -2px 0 5px rgba(0,0,0,0.05);
  }
}
</style>
