import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildImageWorkflow, validateWorkflow, IMAGE_TEMPLATE } from '../src/director/workflow-builder.ts'

test('buildImageWorkflow：文生图链路完整（ckpt→CLIP→Latent→KSampler→VAE→Save）', () => {
  const wf = buildImageWorkflow({ positive: '三视图提示词', negative: '模糊', checkpoint: 'myckpt.safetensors', width: 1024, height: 1536 })
  assert.equal(wf['1']?.class_type, 'CheckpointLoaderSimple')
  assert.equal(wf['1']?.inputs?.ckpt_name, 'myckpt.safetensors')
  assert.equal(wf['2']?.inputs?.text, '三视图提示词')
  assert.equal(wf['4']?.inputs?.width, 1024)
  assert.equal(wf['5']?.class_type, 'KSampler')
  assert.deepEqual(wf['5']?.inputs?.model, ['1', 0])
  assert.deepEqual(wf['5']?.inputs?.positive, ['2', 0])
  assert.deepEqual(wf['6']?.inputs?.vae, ['1', 2])
  assert.equal(wf['7']?.class_type, 'SaveImage')
  assert.deepEqual(validateWorkflow(wf), [])
})

test('checkpoint 缺省时留占位并被校验器指出', () => {
  const wf = buildImageWorkflow({ positive: 'x' })
  assert.equal(wf['1']?.inputs?.ckpt_name, 'REPLACE_WITH_CHECKPOINT_NAME')
  const issues = validateWorkflow(wf)
  assert.ok(issues.some((s) => s.includes('REPLACE_WITH_CHECKPOINT_NAME')), issues.join(','))
})

test('IMAGE_TEMPLATE 与 buildWorkflow 的 DEFAULT_TEMPLATE 独立（视频/图像两模板共存）', () => {
  assert.ok(IMAGE_TEMPLATE['7']?.class_type === 'SaveImage')
  assert.equal(Object.keys(IMAGE_TEMPLATE).length, 7)
})
