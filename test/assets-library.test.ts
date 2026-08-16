import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createAssetLibrary, injectReferences } from '../src/assets/library.ts'

test('资产库：主图登记 + 逐镜变体 + 查询', () => {
  const lib = createAssetLibrary()
  const whale = lib.addMaster('character', '鲸鱼', 'https://cdn/master-whale.png')
  assert.equal(lib.byKind('character').length, 1)
  lib.addVariation(whale.id, 'shot-1', 'https://cdn/whale-s1.png')
  lib.addVariation(whale.id, 'shot-2', 'https://cdn/whale-s2.png')
  assert.equal(lib.byId(whale.id)?.variations.length, 2)
  assert.throws(() => lib.addVariation('ghost', 's', 'u'), /不存在/)
})

test('资产库：导出/导入往返', () => {
  const lib = createAssetLibrary()
  lib.addMaster('scene', '深海', 'https://cdn/deep.png')
  const lib2 = createAssetLibrary(lib.export())
  assert.equal(lib2.byKind('scene')[0]?.name, '深海')
})

test('参考图注入：多资产 + 空资产', () => {
  const out = injectReferences('鲸鱼游动', [
    { name: '鲸鱼', url: 'https://cdn/w.png' },
    { name: '深海场景', url: 'https://cdn/s.png' },
  ])
  assert.match(out, /鲸鱼（参考图: https:\/\/cdn\/w\.png）/)
  assert.match(out, /深海场景/)
  assert.equal(injectReferences('纯文本', []), '纯文本')
})
