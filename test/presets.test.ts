import { test } from 'node:test'
import assert from 'node:assert/strict'
import { STORY_PRESETS, listStoryPresets, getStoryPreset, presetToScript } from '../src/content/presets.ts'

test('预置内容包完整性：5 套题材，每套要素齐全且双语文案', () => {
  assert.equal(STORY_PRESETS.length, 5)
  for (const p of STORY_PRESETS) {
    assert.ok(p.title, `${p.id} 缺中文标题`)
    assert.ok(p.titleEn, `${p.id} 缺英文标题`)
    assert.ok(p.genre && p.logline && p.hook && p.styleDna, `${p.id} 梗概/钩子/风格DNA 不完整`)
    assert.ok(p.characters.length >= 2, `${p.id} 角色不足 2 个`)
    assert.ok(p.scenes.length >= 1, `${p.id} 缺场景`)
    assert.ok(p.shots.length >= 4, `${p.id} 分镜少于 4 条`)
    for (const c of p.characters) assert.ok(c.appearance && c.voiceHint, `${p.id}/${c.id} 角色卡不完整`)
    for (const s of p.shots) {
      assert.ok(s.line && s.prompt, `${p.id} 有条分镜缺台词/画面`)
      if (s.characterId) assert.ok(p.characters.some((c) => c.id === s.characterId), `${p.id} 引用了不存在的角色 ${s.characterId}`)
      if (s.sceneId) assert.ok(p.scenes.some((sc) => sc.id === s.sceneId), `${p.id} 引用了不存在的场景 ${s.sceneId}`)
    }
    // 每条台词都是钩子级短句（漫剧节奏）
    for (const s of p.shots) assert.ok(s.line.length <= 40, `${p.id} 台词过长: ${s.line.slice(0, 20)}`)
  }
})

test('listStoryPresets 摘要字段齐且 id 唯一', () => {
  const list = listStoryPresets()
  assert.equal(list.length, 5)
  assert.equal(new Set(list.map((s) => s.id)).size, 5)
  const first = list[0]!
  assert.ok(first.title && first.titleEn && first.genre && first.hook)
  assert.ok(first.shotCount >= 4 && first.characterCount >= 2)
})

test('getStoryPreset：命中/未命中', () => {
  assert.equal(getStoryPreset('suspense-last-train')?.titleEn, 'The Last Train: Passenger No.13')
  assert.equal(getStoryPreset('not-exist'), null)
})

test('presetToScript：角色外观+场景描述注入每条分镜', () => {
  const p = getStoryPreset('xianxia-sword')!
  const script = presetToScript(p)
  assert.ok(script.title.includes('仙门弃徒'))
  assert.equal(script.shots.length, p.shots.length)
  const s0 = script.shots[0]!
  assert.ok(s0.prompt.includes('青梧真人'), '第一镜应含角色名')
  assert.ok(s0.prompt.includes('昆仑山门'), '第一镜应含场景名')
  assert.ok(s0.prompt.includes('白发道人'), '第一镜应含角色外观')
  assert.equal(s0.line, p.shots[0]?.line)
  // 无 characterId/sceneId 的分镜也能渲染
  const loose = presetToScript({ ...p, shots: [{ line: 'x', prompt: '纯画面' }] })
  assert.equal(loose.shots[0]?.prompt, '纯画面')
})

test('presetToScript includeCharacterSheet=false 不注入外观', () => {
  const p = getStoryPreset('comeback-latte')!
  const script = presetToScript(p, { includeCharacterSheet: false })
  assert.ok(!script.shots[0]?.prompt.includes('角色外观'))
  assert.ok(script.shots[0]?.prompt.includes('林越'))
})

test('预置脚本可直接喂给流水线（Script 契约）', () => {
  for (const p of STORY_PRESETS) {
    const script = presetToScript(p)
    assert.ok(Array.isArray(script.shots))
    for (const s of script.shots) {
      assert.equal(typeof s.line, 'string')
      assert.equal(typeof s.prompt, 'string')
      assert.ok(!s.durationSec || s.durationSec > 0)
    }
  }
})
