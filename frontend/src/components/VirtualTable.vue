<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  columns: { type: Array, default: () => [] },
  rows: { type: Array, default: () => [] },
  columnTypes: { type: Object, default: () => ({}) },
})

const ROW_HEIGHT = 34
const BUFFER_ROWS = 10

const scrollContainerRef = ref(null)
const scrollTop = ref(0)
const containerHeight = ref(600)

const totalRows = computed(() => props.rows.length)
const totalHeight = computed(() => totalRows.value * ROW_HEIGHT)

const visibleStart = computed(() => {
  const start = Math.floor(scrollTop.value / ROW_HEIGHT) - BUFFER_ROWS
  return Math.max(0, start)
})

const visibleEnd = computed(() => {
  const visibleCount = Math.ceil(containerHeight.value / ROW_HEIGHT) + BUFFER_ROWS * 2
  return Math.min(totalRows.value, visibleStart.value + visibleCount)
})

const visibleRows = computed(() => {
  return props.rows.slice(visibleStart.value, visibleEnd.value)
})

const offsetY = computed(() => visibleStart.value * ROW_HEIGHT)

// Row counter — actual rows currently visible on screen (without buffer)
const visibleOnScreen = computed(() => {
  const onScreenStart = Math.floor(scrollTop.value / ROW_HEIGHT)
  const onScreenEnd = Math.min(
    totalRows.value,
    onScreenStart + Math.ceil(containerHeight.value / ROW_HEIGHT)
  )
  return { from: onScreenStart + 1, to: onScreenEnd }
})

// Pandas-style type mapping
function pandasType(col) {
  const t = props.columnTypes[col]
  if (t === 'number') return 'float64'
  if (t === 'boolean') return 'bool'
  if (t === 'empty') return 'empty'
  return 'object'
}

// Null count for column
function nullCount(col) {
  let count = 0
  for (const row of props.rows) {
    const v = row[col]
    if (v === null || v === undefined || v === '') count++
  }
  return count
}

// Cache null counts
const nullCounts = computed(() => {
  const result = {}
  for (const col of props.columns) {
    result[col] = nullCount(col)
  }
  return result
})

function onScroll(e) {
  scrollTop.value = e.target.scrollTop
}

function updateContainerHeight() {
  if (scrollContainerRef.value) {
    containerHeight.value = scrollContainerRef.value.clientHeight
  }
}

function cellClass(col, value) {
  if (value === null || value === undefined || value === '') return 'cell cell--null'
  const type = props.columnTypes[col]
  if (type === 'number') return 'cell cell--number'
  return 'cell'
}

function formatValue(v) {
  if (v === null || v === undefined || v === '') return 'NaN'
  return String(v)
}

onMounted(() => {
  updateContainerHeight()
  window.addEventListener('resize', updateContainerHeight)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateContainerHeight)
})
</script>

<template>
  <div class="vtable-wrapper">
    <!-- Single scroll container for both header and body -->
    <div class="vtable-scroll" ref="scrollContainerRef" @scroll="onScroll">
      <div class="vtable-spacer" :style="{ minHeight: totalHeight + 'px' }">
        <table class="vtable">
          <thead>
            <tr>
              <th class="vtable__index-col">#</th>
              <th v-for="col in columns" :key="col" class="vtable__th">
                <span class="vtable__col-name">{{ col }}</span>
                <div class="vtable__col-meta">
                  <span class="vtable__col-type">{{ pandasType(col) }}</span>
                  <span
                    v-if="nullCounts[col] > 0"
                    class="vtable__col-nulls"
                  >{{ nullCounts[col] }} null</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody :style="{ transform: `translateY(${offsetY}px)` }">
            <tr v-for="(row, i) in visibleRows" :key="visibleStart + i">
              <td class="vtable__index-col vtable__index">{{ visibleStart + i + 1 }}</td>
              <td
                v-for="col in columns"
                :key="col"
                :class="cellClass(col, row[col])"
              >
                {{ formatValue(row[col]) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div class="vtable-footer">
      Строки {{ visibleOnScreen.from }}–{{ visibleOnScreen.to }} из {{ totalRows.toLocaleString() }}
    </div>
  </div>
</template>

<style scoped>
.vtable-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-surface);
}

.vtable-scroll {
  flex: 1;
  overflow: auto;
  min-height: 0;
}

.vtable-spacer {
  position: relative;
}

.vtable {
  width: 100%;
  border-collapse: collapse;
  table-layout: auto;
  white-space: nowrap;
}

.vtable thead {
  position: sticky;
  top: 0;
  z-index: 2;
}

.vtable__th {
  padding: 8px 14px;
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-align: left;
  color: var(--color-text-primary);
  white-space: nowrap;
  background: var(--color-bg-tertiary);
  border-bottom: 2px solid var(--color-border);
}

.vtable__col-name {
  display: block;
  line-height: 1.3;
}

.vtable__col-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}

.vtable__col-type {
  font-size: 10px;
  font-weight: 500;
  color: var(--color-accent);
  text-transform: none;
  letter-spacing: 0;
}

.vtable__col-nulls {
  font-size: 10px;
  font-weight: 500;
  color: var(--color-warning);
  background: rgba(245, 158, 11, 0.1);
  padding: 0 4px;
  border-radius: 3px;
}

.vtable__index-col {
  width: 56px;
  min-width: 56px;
  max-width: 56px;
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
  padding: 6px 8px;
  border-right: 1px solid var(--color-border-light);
  background: var(--color-bg-tertiary);
}

.vtable__index {
  background: var(--color-bg-secondary);
}

.cell {
  padding: 6px 14px;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  border-bottom: 1px solid var(--color-border-light);
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  height: 34px;
  line-height: 22px;
}

.cell--null {
  color: var(--color-text-tertiary);
  font-style: italic;
  opacity: 0.6;
}

.cell--number {
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.vtable-footer {
  flex-shrink: 0;
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  text-align: center;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}
</style>
