<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  describeData: { type: Array, default: () => [] },
  columns: { type: Array, default: () => [] },
  rows: { type: Array, default: () => [] },
  columnTypes: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['export'])

const isCollapsed = ref(false)
const activeSection = ref(null)

// ─── EDA Tool Sections ─────────────────────────────────────────
const tools = [
  {
    id: 'describe',
    label: 'Describe',
    icon: 'M4 6h16M4 12h8M4 18h16',
    description: 'Сводная статистика по каждому столбцу',
  },
  {
    id: 'nulls',
    label: 'Пропуски',
    icon: 'M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    description: 'Анализ и обработка пропущенных значений',
  },
  {
    id: 'duplicates',
    label: 'Дубликаты',
    icon: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6v4H9z',
    description: 'Поиск и удаление дубликатов строк',
  },
  {
    id: 'types',
    label: 'Типы данных',
    icon: 'M7 7h10v10H7zM3 3l4 4M17 3l-4 4M3 21l4-4M17 21l-4-4',
    description: 'Просмотр и изменение типов столбцов',
  },
  {
    id: 'normalize',
    label: 'Нормализация',
    icon: 'M22 12h-4l-3 9L9 3l-3 9H2',
    description: 'Min-Max, Z-Score, Log-нормализация',
  },
  {
    id: 'target',
    label: 'Целевая переменная',
    icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14a4 4 0 1 1 0-8 4 4 0 0 1 0 8z',
    description: 'Выбрать целевую переменную для анализа',
  },
]

const charts = [
  {
    id: 'distribution',
    label: 'Распределение',
    icon: 'M18 20V10M12 20V4M6 20v-6',
    description: 'Гистограммы распределения признаков',
  },
  {
    id: 'scatter',
    label: 'Матрица рассеяния',
    icon: 'M3 3v18h18M7 14l4-4 4 4 5-5',
    description: 'Scatter plot для пар признаков',
  },
  {
    id: 'correlation',
    label: 'Корреляция',
    icon: 'M3 3h18v18H3zM8 8h2v2H8zM14 8h2v2h-2zM8 14h2v2H8zM14 14h2v2h-2zM11 11h2v2h-2z',
    description: 'Корреляционная матрица',
  },
  {
    id: 'boxplot',
    label: 'Box Plot',
    icon: 'M9 4v16M15 4v16M9 8h6M9 16h6M7 8H5M7 16H5M19 8h-2M19 16h-2',
    description: 'Выбросы и распределение по квартилям',
  },
]

function toggleSection(id) {
  activeSection.value = activeSection.value === id ? null : id
}

// ─── Describe ──────────────────────────────────────────────────

// ─── Nulls ─────────────────────────────────────────────────────
const nullsSummary = computed(() => {
  return props.describeData.map(d => ({
    column: d.column,
    nulls: d.nulls,
    nullPercent: parseFloat(d.nullPercent),
    total: d.count,
  }))
})

// ─── Duplicates ────────────────────────────────────────────────
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

// ─── Target variable ──────────────────────────────────────────
const selectedTarget = ref(null)
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

      <!-- Tools list -->
      <div class="sidebar__section">
        <div
          v-for="tool in tools"
          :key="tool.id"
          class="tool-item"
          :class="{ 'is-active': activeSection === tool.id }"
        >
          <button class="tool-item__btn" @click="toggleSection(tool.id)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path :d="tool.icon" />
            </svg>
            <span class="tool-item__label">{{ tool.label }}</span>
            <svg class="tool-item__chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline :points="activeSection === tool.id ? '18 15 12 9 6 15' : '6 9 12 15 18 9'" />
            </svg>
          </button>

          <!-- Describe panel -->
          <div v-if="activeSection === 'describe' && tool.id === 'describe'" class="tool-panel">
            <div v-for="d in describeData" :key="d.column" class="stat-card">
              <div class="stat-card__header">
                <span class="stat-card__name">{{ d.column }}</span>
                <span class="stat-card__type" :class="'type--' + d.type">{{ d.type === 'number' ? 'float64' : 'object' }}</span>
              </div>
              <div class="stat-card__body">
                <div class="stat-row"><span>Non-null</span><span>{{ d.nonNull?.toLocaleString() }}</span></div>
                <div class="stat-row"><span>Null</span><span>{{ d.nulls?.toLocaleString() }} ({{ d.nullPercent }}%)</span></div>
                <div class="stat-row"><span>Unique</span><span>{{ d.unique?.toLocaleString() ?? '—' }}</span></div>
                <template v-if="d.type === 'number'">
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

          <!-- Nulls panel -->
          <div v-if="activeSection === 'nulls' && tool.id === 'nulls'" class="tool-panel">
            <p class="tool-panel__hint">Столбцы с пропусками:</p>
            <div v-for="n in nullsSummary" :key="n.column" class="null-row">
              <div class="null-row__header">
                <span class="null-row__name">{{ n.column }}</span>
                <span class="null-row__pct">{{ n.nulls > 0 ? n.nullPercent.toFixed(1) + '%' : '✓' }}</span>
              </div>
              <div class="null-row__bar-bg">
                <div
                  class="null-row__bar-fill"
                  :style="{ width: Math.max(n.nullPercent, n.nulls > 0 ? 1 : 0) + '%' }"
                  :class="{ 'bar--ok': n.nullPercent === 0, 'bar--warn': n.nullPercent > 0 && n.nullPercent < 30, 'bar--danger': n.nullPercent >= 30 }"
                />
              </div>
            </div>
            <div class="tool-panel__actions">
              <button class="btn btn--outline btn--xs" disabled title="Скоро">Заполнить средним</button>
              <button class="btn btn--outline btn--xs" disabled title="Скоро">Заполнить медианой</button>
              <button class="btn btn--outline btn--xs" disabled title="Скоро">Удалить строки</button>
            </div>
          </div>

          <!-- Duplicates panel -->
          <div v-if="activeSection === 'duplicates' && tool.id === 'duplicates'" class="tool-panel">
            <div class="tool-panel__stat">
              <span class="tool-panel__stat-num">{{ duplicateCount.toLocaleString() }}</span>
              <span class="tool-panel__stat-label">дубликатов найдено</span>
            </div>
            <div class="tool-panel__actions">
              <button class="btn btn--outline btn--xs" disabled title="Скоро">Удалить дубликаты</button>
            </div>
          </div>

          <!-- Types panel -->
          <div v-if="activeSection === 'types' && tool.id === 'types'" class="tool-panel">
            <div v-for="col in columns" :key="col" class="type-row">
              <span class="type-row__name">{{ col }}</span>
              <select class="type-row__select" disabled>
                <option :selected="columnTypes[col] === 'number'">float64</option>
                <option :selected="columnTypes[col] === 'string'">object</option>
                <option>int64</option>
                <option>bool</option>
                <option>datetime</option>
                <option>category</option>
              </select>
            </div>
            <p class="tool-panel__hint">Изменение типов — скоро</p>
          </div>

          <!-- Normalize panel -->
          <div v-if="activeSection === 'normalize' && tool.id === 'normalize'" class="tool-panel">
            <p class="tool-panel__hint">Методы нормализации:</p>
            <div class="tool-panel__actions tool-panel__actions--col">
              <button class="btn btn--outline btn--xs" disabled>Min-Max Scaling</button>
              <button class="btn btn--outline btn--xs" disabled>Z-Score (StandardScaler)</button>
              <button class="btn btn--outline btn--xs" disabled>Log Transform</button>
              <button class="btn btn--outline btn--xs" disabled>Robust Scaler</button>
            </div>
          </div>

          <!-- Target variable panel -->
          <div v-if="activeSection === 'target' && tool.id === 'target'" class="tool-panel">
            <p class="tool-panel__hint">Выберите целевую переменную:</p>
            <select v-model="selectedTarget" class="tool-panel__select">
              <option :value="null">— не выбрана —</option>
              <option v-for="col in columns" :key="col" :value="col">{{ col }}</option>
            </select>
            <p v-if="selectedTarget" class="tool-panel__hint" style="margin-top: 8px;">
              Выбрано: <strong>{{ selectedTarget }}</strong>
            </p>
          </div>
        </div>
      </div>

      <!-- Charts section -->
      <div class="sidebar__divider"></div>
      <h4 class="sidebar__subtitle">Графики</h4>
      <div class="sidebar__section">
        <div v-for="chart in charts" :key="chart.id" class="tool-item">
          <button class="tool-item__btn" disabled>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path :d="chart.icon" />
            </svg>
            <span class="tool-item__label">{{ chart.label }}</span>
            <span class="tool-item__soon">скоро</span>
          </button>
        </div>
      </div>

      <!-- Export -->
      <div class="sidebar__export">
        <button class="btn btn--accent-export" @click="emit('export')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Экспорт CSV
        </button>
      </div>
    </div>
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

.sidebar.is-collapsed {
  width: 40px;
  min-width: 40px;
}

.sidebar__toggle {
  position: absolute;
  top: var(--space-3);
  left: var(--space-2);
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  z-index: 2;
  transition: background var(--transition-fast);
}

.sidebar__toggle:hover {
  background: var(--color-bg-tertiary);
}

.sidebar__content {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding-top: 44px;
  overflow-y: auto;
}

.sidebar__title {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-text-primary);
  padding: 0 var(--space-3) var(--space-2);
  letter-spacing: 0.3px;
}

.sidebar__subtitle {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 var(--space-3) var(--space-2);
}

.sidebar__divider {
  height: 1px;
  background: var(--color-border);
  margin: var(--space-3) 0;
}

.sidebar__section {
  padding: 0 var(--space-2);
}

/* Tool Item */
.tool-item {
  border-radius: var(--radius-sm);
  margin-bottom: 1px;
}

.tool-item.is-active {
  background: var(--color-bg-secondary);
}

.tool-item__btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 7px 10px;
  font-size: var(--font-size-xs);
  font-weight: 500;
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  text-align: left;
}

.tool-item__btn:hover:not(:disabled) {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.tool-item__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tool-item__label {
  flex: 1;
}

.tool-item__chevron {
  flex-shrink: 0;
  opacity: 0.4;
}

.tool-item__soon {
  font-size: 9px;
  font-weight: 500;
  padding: 1px 5px;
  border-radius: var(--radius-full);
  background: var(--color-bg-tertiary);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

/* Tool Panel */
.tool-panel {
  padding: var(--space-2) var(--space-3) var(--space-3);
}

.tool-panel__hint {
  font-size: 11px;
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-2);
}

.tool-panel__actions {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
  margin-top: var(--space-2);
}

.tool-panel__actions--col {
  flex-direction: column;
}

.tool-panel__stat {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  padding: var(--space-2) 0;
}

.tool-panel__stat-num {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
}

.tool-panel__stat-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.tool-panel__select {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-family: var(--font-family);
  font-size: var(--font-size-xs);
  outline: none;
}

.tool-panel__select:focus {
  border-color: var(--color-accent);
}

.btn--xs {
  padding: 3px 10px;
  font-size: 11px;
  border-radius: var(--radius-sm);
}

/* Stat cards */
.stat-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  overflow: hidden;
  margin-bottom: var(--space-2);
}

.stat-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  border-bottom: 1px solid var(--color-border-light);
  background: var(--color-bg-tertiary);
}

.stat-card__name {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stat-card__type {
  font-size: 9px;
  font-weight: 500;
  padding: 1px 5px;
  border-radius: var(--radius-full);
  text-transform: none;
}

.type--number { background: rgba(79, 110, 247, 0.1); color: #4f6ef7; }
.type--string { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
.type--boolean { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.type--mixed { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.type--empty { background: var(--color-bg-tertiary); color: var(--color-text-tertiary); }

.stat-card__body {
  padding: 4px 8px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  padding: 1px 0;
  color: var(--color-text-secondary);
}

.stat-row__val {
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Nulls bars */
.null-row {
  padding: 2px 0;
}

.null-row__header {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  margin-bottom: 2px;
}

.null-row__name {
  font-weight: 500;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140px;
}

.null-row__pct {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.null-row__bar-bg {
  height: 5px;
  background: var(--color-bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
}

.null-row__bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width var(--transition-base);
}

.bar--ok { background: var(--color-success); width: 100% !important; }
.bar--warn { background: var(--color-warning); }
.bar--danger { background: var(--color-error); }

/* Type change rows */
.type-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 0;
}

.type-row__name {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
}

.type-row__select {
  width: 90px;
  padding: 2px 6px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-primary);
  color: var(--color-text-secondary);
  font-family: var(--font-family);
  font-size: 10px;
}

/* Export */
.sidebar__export {
  flex-shrink: 0;
  padding: var(--space-3);
  border-top: 1px solid var(--color-border);
  margin-top: auto;
}

.btn--accent-export {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: #fff;
  background: var(--color-accent-gradient);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  box-shadow: 0 2px 8px rgba(79, 110, 247, 0.3);
}

.btn--accent-export:hover {
  filter: brightness(1.1);
  box-shadow: 0 4px 14px rgba(79, 110, 247, 0.4);
  transform: translateY(-1px);
}
</style>
