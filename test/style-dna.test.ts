import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergePromptLayers, applyVariables, scorePrompt } from '../src/prompts/style-dna.ts'

test('四层合并顺序：DNA → 模板 → 手写，负向单独输出', () => {
  const r = mergePromptLayers({ dna: '国风，暖色调', shotTemplate: '中景，缓慢推镜，{{duration}}秒', manual: '主角回眸', injections: '低质量，模糊' })
  assert.equal(r.positive, '国风，暖色调，中景，缓慢推镜，{{duration}}秒，主角回眸')
  assert.equal(r.negative, '低质量，模糊')
})

test('手写层可完全覆盖模板（传空模板）', () => {
  assert.equal(mergePromptLayers({ manual: '全景，雨夜，霓虹' }).positive, '全景，雨夜，霓虹')
})

test('变量替换', () => {
  assert.equal(applyVariables('{{a}}与{{b}}', { a: '景别', b: '运镜' }), '景别与运镜')
})

test('评分闭环：>=4 晋升，<=2 重拍，权重随分数演化', () => {
  const good = scorePrompt({ weight: 1 }, 5)
  assert.equal(good.promote, true)
  const bad = scorePrompt({ weight: 1 }, 1)
  assert.equal(bad.retry, true)
  assert.ok((good.weight ?? 1) > (bad.weight ?? 1))
})
