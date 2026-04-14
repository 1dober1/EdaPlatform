<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  describeData: { type: Array, default: () => [] },
  columns: { type: Array, default: () => [] },
  rows: { type: Array, default: () => [] },
})

const emit = defineEmits(['export'])

const isCollapsed = ref(false)
const activeTab = ref('describe')

const tabs = [
  { id: 'describe', label: 'Describe', icon: 'M4 6h16M4 12h16M4 18h7' },
  { id: 'nulls', label: 'Пропуски', icon: 'M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' },
]

// Nulls summary
const nullsSummary = computed(() => {
  return props.describeData.map(d => ({
    column: d.column,
    nulls: d.nulls,
    nullPercent: d.nullPercent,
    total: d.count,
    barWidth: parseFloat(d.nullPercent),
  }))
})
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
      <!-- Tabs -->
      <div class="sidebar__tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="sidebar__tab"
          :class="{ 'is-active': activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path :d="tab.icon" />
          </svg>
          {{ tab.label }}
        </button>
      </div>

      <!-- Describe panel -->
      <div v-if="activeTab === 'describe'" class="sidebar__panel">
        <div v-for="d in describeData" :key="d.column" class="stat-card">
          <div class="stat-card__header">
            <span class="stat-card__name">{{ d.column }}</span>
            <span class="stat-card__type" :class="'type--' + d.type">{{ d.type }}</span>
          </div>
          <div class="stat-card__body">
            <div class="stat-row">
              <span>Non-null</span>
              <span>{{ d.nonNull.toLocaleString() }}</span>
            </div>
            <div class="stat-row">
              <span>Null</span>
              <span>{{ d.nulls.toLocaleString() }} ({{ d.nullPercent }}%)</span>
            </div>
            <div class="stat-row">
              <span>Unique</span>
              <span>{{ d.unique?.toLocaleString() ?? '—' }}</span>
            </div>
            <template v-if="d.type === 'number'">
              <div class="stat-row">
                <span>Mean</span>
                <span>{{ d.mean }}</span>
              </div>
              <div class="stat-row">
                <span>Std</span>
                <span>{{ d.std }}</span>
              </div>
              <div class="stat-row">
                <span>Min / Max</span>
                <span>{{ d.min }} / {{ d.max }}</span>
              </div>
              <div class="stat-row">
                <span>Median</span>
                <span>{{ d.median }}</span>
              </div>
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
      <div v-if="activeTab === 'nulls'" class="sidebar__panel">
        <div v-for="n in nullsSummary" :key="n.column" class="null-row">
          <div class="null-row__header">
            <span class="null-row__name">{{ n.column }}</span>
            <span class="null-row__pct">{{ n.nullPercent }}%</span>
          </div>
          <div class="null-row__bar-bg">
            <div
              class="null-row__bar-fill"
              :style="{ width: Math.max(n.barWidth, 0.5) + '%' }"
              :class="{ 'bar--ok': n.barWidth === 0, 'bar--warn': n.barWidth > 0 && n.barWidth < 30, 'bar--danger': n.barWidth >= 30 }"
            />
          </div>
        </div>
      </div>

      <!-- Export -->
      <div class="sidebar__export">
        <button class="btn btn--outline btn--sm sidebar__export-btn" @click="emit('export')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
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
  width: 320px;
  min-width: 320px;
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
  overflow: hidden;
}

.sidebar__tabs {
  display: flex;
  gap: 2px;
  padding: 0 var(--space-3);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.sidebar__tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-xs);
  font-weight: 500;
  color: var(--color-text-tertiary);
  border-bottom: 2px solid transparent;
  transition: all var(--transition-fast);
}

.sidebar__tab:hover {
  color: var(--color-text-secondary);
}

.sidebar__tab.is-active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

.sidebar__panel {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* Stat cards */
.stat-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.stat-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border-light);
  background: var(--color-bg-tertiary);
}

.stat-card__name {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stat-card__type {
  font-size: 10px;
  font-weight: 500;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.type--number { background: rgba(79, 110, 247, 0.1); color: #4f6ef7; }
.type--string { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
.type--boolean { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.type--mixed { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.type--empty { background: var(--color-bg-tertiary); color: var(--color-text-tertiary); }

.stat-card__body {
  padding: var(--space-2) var(--space-3);
}

.stat-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  padding: 2px 0;
  color: var(--color-text-secondary);
}

.stat-row__val {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Nulls bars */
.null-row {
  padding: var(--space-1) 0;
}

.null-row__header {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  margin-bottom: 3px;
}

.null-row__name {
  font-weight: 500;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.null-row__pct {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.null-row__bar-bg {
  height: 6px;
  background: var(--color-bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
}

.null-row__bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width var(--transition-base);
}

.bar--ok { background: var(--color-success); }
.bar--warn { background: var(--color-warning); }
.bar--danger { background: var(--color-error); }

/* Export */
.sidebar__export {
  flex-shrink: 0;
  padding: var(--space-3);
  border-top: 1px solid var(--color-border);
}

.sidebar__export-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
}
</style>
