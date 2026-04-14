<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'

const props = defineProps({
  columns: { type: Array, default: () => [] },
  rows: { type: Array, default: () => [] },
  columnTypes: { type: Object, default: () => ({}) },
})

const ROW_HEIGHT = 34
const BUFFER_ROWS = 10

const containerRef = ref(null)
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

function onScroll(e) {
  scrollTop.value = e.target.scrollTop
}

function updateContainerHeight() {
  if (containerRef.value) {
    containerHeight.value = containerRef.value.clientHeight
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
    <!-- Sticky header -->
    <div class="vtable-header">
      <table class="vtable">
        <thead>
          <tr>
            <th class="vtable__index-col">#</th>
            <th v-for="col in columns" :key="col" class="vtable__th">
              <span class="vtable__col-name">{{ col }}</span>
              <span class="vtable__col-type">{{ columnTypes[col] || '' }}</span>
            </th>
          </tr>
        </thead>
      </table>
    </div>

    <!-- Virtual scroll body -->
    <div class="vtable-scroll" ref="containerRef" @scroll="onScroll">
      <div class="vtable-spacer" :style="{ height: totalHeight + 'px' }">
        <table class="vtable" :style="{ transform: `translateY(${offsetY}px)` }">
          <tbody>
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
      Показано {{ Math.min(visibleEnd - visibleStart, totalRows) }} из {{ totalRows.toLocaleString() }} строк
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

.vtable-header {
  flex-shrink: 0;
  overflow: hidden;
  border-bottom: 2px solid var(--color-border);
  background: var(--color-bg-tertiary);
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

.vtable__th {
  padding: 6px 12px;
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-align: left;
  color: var(--color-text-primary);
  white-space: nowrap;
  position: sticky;
  top: 0;
  background: var(--color-bg-tertiary);
  z-index: 1;
}

.vtable__col-name {
  display: block;
  line-height: 1.2;
}

.vtable__col-type {
  display: block;
  font-size: 10px;
  font-weight: 400;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
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
}

.vtable__index {
  background: var(--color-bg-secondary);
}

.cell {
  padding: 6px 12px;
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
