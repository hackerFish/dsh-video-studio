import { test } from 'node:test'
import assert from 'node:assert/strict'
import { splitShots, parseCharacters, buildCharacterPrompt, buildShotPrompt, buildStoryboard } from '../src/host/storyboard.ts'

test('splitShots：按句与换行拆镜头，空输入返回空', () => {
  assert.deepEqual(splitShots('第一句。第二句！第三句'), ['第一句。', '第二句！', '第三句'])
  assert.deepEqual(splitShots('一\n二\n三'), ['一', '二', '三'])
  assert.equal(splitShots('').length, 0)
  assert.ok(splitShots('单句').length >= 1)
  assert.ok(splitShots('句。'.repeat(20)).length <= 12, '上限 12')
})

test('parseCharacters：| 与中文冒号分隔，无分隔符整行作名字', () => {
  const list = parseCharacters('林越|28岁男性\n苏婉：26岁女性\n路人')
  assert.equal(list.length, 3)
  assert.equal(list[0]?.name, '林越')
  assert.equal(list[0]?.description, '28岁男性')
  assert.equal(list[1]?.name, '苏婉')
  assert.equal(list[1]?.description, '26岁女性')
  assert.equal(list[2]?.name, '路人')
  assert.equal(list[2]?.description, '')
})

test('角色提示词卡：三视图模板 + 增益（8K/一致性命中）', () => {
  const c = buildCharacterPrompt({ name: '林越', description: '冷峻眼神' }, '国漫写实', '9:16')
  assert.ok(c.prompt.includes('三视图'))
  assert.ok(c.prompt.includes('8K'))
  assert.ok(c.prompt.includes('林越'))
  assert.ok(c.prompt.includes('冷峻眼神'))
  assert.ok(c.negative.length > 0)
})

test('逐镜提示词：注入角色引用 + 风格 + 负面清单', () => {
  const r = buildShotPrompt('他转身离去', { style: '赛博朋克', ratio: '16:9', characters: [{ name: '林越', description: '冷峻' }] })
  assert.ok(r.prompt.includes('林越'))
  assert.ok(r.prompt.includes('赛博朋克'))
  assert.ok(r.prompt.includes('他转身离去'))
  assert.ok(r.negative.length > 0)
})

test('buildStoryboard 一键计划：角色卡 + 逐镜提示词齐全', () => {
  const plan = buildStoryboard({
    outline: '他抬头。她笑了。',
    charactersText: '林越|冷峻\n苏婉|温柔',
    style: '国漫',
    aspectRatio: '9:16',
  })
  assert.equal(plan.characters.length, 2)
  assert.equal(plan.shots.length, 2)
  for (const s of plan.shots) {
    assert.ok(s.prompt.includes('8K'))
    assert.ok(s.prompt.length > 20)
    assert.ok(s.durationSec > 0)
  }
  for (const c of plan.characters) assert.ok(c.prompt.includes('三视图'))
})
