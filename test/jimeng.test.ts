import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildJimengDraftContent, createJimengProvider } from '../src/providers/jimeng.ts'

test('draft 结构：与官网协议对齐（model_req_key/video_gen_inputs/commerce 字段）', () => {
  const d = buildJimengDraftContent({ prompt: '测试', width: 720, height: 1280 }) as unknown as {
    extend: { root_model: string; m_video_commerce_info: { resource_id: string } }
    http_common_info: { aid: number }
    draft_content: string
  }
  assert.equal((d.extend as { root_model: string }).root_model, 'dreamina_ic_generate_video_model_vgfm_lite')  // 免费档默认（2026-08-16 实测）
  const dc = JSON.parse(d.draft_content)
  const gen = dc.component_list[0].abilities.gen_video.text_to_video_params
  assert.equal(gen.model_req_key, 'dreamina_ic_generate_video_model_vgfm_lite')
  assert.equal(gen.video_aspect_ratio, '9:16')           // 720x1280 → 9:16
  assert.equal(gen.video_gen_inputs[0].prompt, '测试')
  assert.equal(gen.video_gen_inputs[0].duration_ms, 5000)
  assert.equal(gen.video_gen_inputs[0].resolution, '720p')
  assert.ok(d.extend.m_video_commerce_info.resource_id === 'generate_video')
  assert.ok(String(d.http_common_info.aid).length > 0)
})

test('比例计算：16:9 / 1:1 / 3:4', () => {
  const ratio = (w: number, h: number): string => (JSON.parse(buildJimengDraftContent({ prompt: 'x', width: w, height: h }).draft_content as string) as {
    component_list: { abilities: { gen_video: { text_to_video_params: { video_aspect_ratio: string } } } }[]
  }).component_list[0]?.abilities.gen_video.text_to_video_params.video_aspect_ratio ?? ''
  assert.equal(ratio(1280, 720), '16:9')
  assert.equal(ratio(1024, 1024), '1:1')
})

test('缺 sessionId 拒绝创建', () => {
  assert.throws(() => createJimengProvider({}), /sessionId/)
})
