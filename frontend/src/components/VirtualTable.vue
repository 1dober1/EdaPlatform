<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  columns: { type: Array, default: () => [] },
  rows: { type: Array, default: () => [] },
  columnTypes: { type: Object, default: () => ({}) },
  targetVariable: { type: String, default: null },
})

const emit = defineEmits(['delete-column', 'rename-column'])

const ROW_HEIGHT = 34
const BUFFER_ROWS = 10

const scrollContainerRef = ref(null)
const scrollTop = ref(0)
const containerHeight = ref(600)

const editingCol = ref(null)
const editName = ref('')

function startEdit(col) {
  editingCol.value = col
  editName.value = col
}

function finishEdit() {
  if (editingCol.value && editName.value.trim() !== '' && editName.value !== editingCol.value) {
    emit('rename-column', editingCol.value, editName.value.trim())
  }
  editingCol.value = null
}

const totalRows = computed(() => props.rows.length)

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

const visibleOnScreen = computed(() => {
  const onScreenStart = Math.floor(scrollTop.value / ROW_HEIGHT)
  const onScreenEnd = Math.min(
    totalRows.value,
    onScreenStart + Math.ceil(containerHeight.value / ROW_HEIGHT)
  )
  return { from: onScreenStart + 1, to: onScreenEnd }
})

function pandasType(col) {
  const t = props.columnTypes[col]
  if (t === 'number') return 'float64'
  if (t === 'integer') return 'int64'
  if (t === 'boolean') return 'bool'
  if (t === 'empty') return 'empty'
  return 'object'
}

const nullCounts = computed(() => {
  const result = {}
  for (const col of props.columns) {
    let count = 0
    for (const row of props.rows) {
      const v = row[col]
      if (v === null || v === undefined || v === '') count++
    }
    result[col] = count
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
  const classes = ['cell']
  if (value === null || value === undefined || value === '') {
    classes.push('cell--null')
  } else if (props.columnTypes[col] === 'number' || props.columnTypes[col] === 'integer') {
    classes.push('cell--number')
  }
  if (col === props.targetVariable) {
    classes.push('cell--target')
  }
  return classes.join(' ')
}

function thClass(col) {
  const classes = ['vtable__th']
  if (col === props.targetVariable) classes.push('vtable__th--target')
  return classes.join(' ')
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
    <div class="vtable-scroll" ref="scrollContainerRef" @scroll="onScroll">
      
      <div :style="{ height: visibleStart * ROW_HEIGHT + 'px' }"></div>
      
      <table class="vtable">
        <thead>
          <tr>
            <th class="vtable__index-col">#</th>
            <th v-for="col in columns" :key="col" :class="thClass(col)">
              <div class="vtable__th-content">
                <div class="vtable__th-left">
                  <input
                    v-if="editingCol === col"
                    v-model="editName"
                    @blur="finishEdit"
                    @keyup.enter="finishEdit"
                    @keyup.esc="editingCol = null"
                    class="vtable__col-input"
                    v-focus
                  />
                  <span v-else class="vtable__col-name" @dblclick="startEdit(col)" title="Двойной клик для переименования">
                    {{ col }}
                  </span>
                  <div class="vtable__col-meta">
                    <span class="vtable__col-type">{{ pandasType(col) }}</span>
                    <span
                      v-if="nullCounts[col] > 0"
                      class="vtable__col-nulls"
                    >{{ nullCounts[col] }} null</span>
                    <span v-if="col === targetVariable" class="vtable__col-target">target</span>
                  </div>
                </div>
                <button
                  class="vtable__col-delete"
                  @click.stop="emit('delete-column', col)"
                  title="Удалить столбец"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </th>
          </tr>
        </thead>
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

      
      <div :style="{ height: Math.max(0, (totalRows - visibleEnd) * ROW_HEIGHT) + 'px' }"></div>
    </div>

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
  padding: 0;
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-align: left;
  color: var(--color-text-primary);
  white-space: nowrap;
  background: var(--color-bg-tertiary);
  border-bottom: 2px solid var(--color-border);
}

.vtable__th--target {
  background: rgba(79, 110, 247, 0.08);
  border-bottom-color: var(--color-accent);
}

.vtable__th-content {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 4px;
  padding: 8px 12px;
}

.vtable__th-left {
  display: flex;
  flex-direction: column;
}

.vtable__col-name {
  line-height: 1.3;
  cursor: text;
}

.vtable__col-input {
  width: 100%;
  font-family: var(--font-family);
  font-size: var(--font-size-xs);
  font-weight: 600;
  padding: 0 2px;
  border: 1px solid var(--color-accent);
  border-radius: 2px;
  background: var(--color-surface);
  color: var(--color-text-primary);
  outline: none;
}

.vtable__col-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
}

.vtable__col-type {
  font-size: 10px;
  font-weight: 500;
  color: var(--color-accent);
}

.vtable__col-nulls {
  font-size: 10px;
  font-weight: 500;
  color: var(--color-warning);
  background: rgba(245, 158, 11, 0.1);
  padding: 0 4px;
  border-radius: 3px;
}

.vtable__col-target {
  font-size: 9px;
  font-weight: 600;
  color: #fff;
  background: var(--color-accent);
  padding: 0 5px;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.vtable__col-delete {
  opacity: 0;
  padding: 2px;
  border-radius: 3px;
  color: var(--color-text-tertiary);
  transition: all var(--transition-fast);
  flex-shrink: 0;
  margin-top: 2px;
}

.vtable__th:hover .vtable__col-delete {
  opacity: 0.6;
}

.vtable__col-delete:hover {
  opacity: 1 !important;
  color: var(--color-error);
  background: rgba(239, 68, 68, 0.1);
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

thead .vtable__index-col {
  background: var(--color-bg-tertiary);
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

.cell--target {
  background: rgba(79, 110, 247, 0.04);
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
