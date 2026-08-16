import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRun, appendEvent, finishRun, listRuns, getRun } from '../src/host/runs.ts'

test('运行注册表：创建/事件/完成/列表排序', () => {
  const a = createRun({ prompt: '鲸鱼', provider: 'mock' })
  const b = createRun({ prompt: '海豚', provider: 'jimeng' })
  assert.equal(a.status, 'running')
  appendEvent(a.id, 'parse', 'prompt')
  appendEvent(a.id, 'stills', 'submitted', { jobId: 'x' })
  finishRun(a.id, 'done')
  assert.equal(getRun(a.id)?.events.length, 2)
  assert.equal(getRun(a.id)?.status, 'done')
  const list = listRuns()
  assert.equal(list[0]?.id, b.id) // 新在前
  assert.ok(list.length === 2)
})

test('未知 run 安全处理', () => {
  appendEvent('ghost', 'x', 'y') // 不抛错
  assert.equal(getRun('ghost'), undefined)
})
