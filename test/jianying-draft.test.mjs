import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createTimeline, addClip, addSubtitle, addAudio, totalDurationUs } from '../src/finalcut/timeline.ts'
import { buildDraftContent, buildDraftMeta, validateDraft, writeDraft } from '../src/finalcut/jianying-draft.js'

const US = 1_000_000

test('导演时间线：镜头顺序拼接，总时长正确', () => {
  const tl = createTimeline({ width: 1080, height: 1920 })
  addClip(tl, { src: 'shots/a.mp4', durationUs: 3 * US })
  addClip(tl, { src: 'shots/b.mp4', durationUs: 2 * US, transitionOut: 'fade' })
  assert.equal(tl.clips[0].startUs, 0)
  assert.equal(tl.clips[1].startUs, 3 * US)
  assert.equal(totalDurationUs(tl), 5 * US)
})

test('草稿结构：素材 id 唯一、引用完整、时间轴合法', () => {
  const tl = createTimeline({ width: 1080, height: 1920 })
  const c1 = addClip(tl, { src: 'shots/a.mp4', durationUs: 3 * US })
  addSubtitle(tl, { text: '第一句台词', startUs: 500_000, durationUs: 2 * US })
  addAudio(tl, { src: 'voice/narration.mp3', startUs: 0, durationUs: 5 * US })
  const content = buildDraftContent(tl)
  const meta = buildDraftMeta({ durationUs: totalDurationUs(tl) })
  const errors = validateDraft(content, meta)
  assert.deepEqual(errors, [])
  assert.equal(content.canvas_config.width, 1080)
  assert.equal(content.materials.videos[0].id, c1.id)
  assert.equal(content.materials.video_tracks[0].segments.length, 1)
})

test('校验器能抓住：悬空引用与非法时长', () => {
  const content = {
    canvas_config: { width: 1080, height: 1920, ratio: 'original' },
    materials: {
      videos: [],
      video_tracks: [{ id: 't1', type: 'video', segments: [
        { id: 's1', material_id: 'ghost', target_timerange: { start: 0, duration: -1 } },
      ] }],
    },
    tracks: [{ id: 't1', type: 'video' }],
  }
  const errors = validateDraft(content, buildDraftMeta({}))
  assert.ok(errors.some((e) => e.includes('ghost')), errors.join(';'))
  assert.ok(errors.some((e) => e.includes('非法')), errors.join(';'))
})

test('writeDraft 落盘两个文件且结构可回读', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-draft-'))
  try {
    const tl = createTimeline({ width: 1080, height: 1920 })
    addClip(tl, { src: 'shots/a.mp4', durationUs: 3 * US })
    addSubtitle(tl, { text: '测试字幕', startUs: 0, durationUs: 2 * US })
    const out = writeDraft(dir, { name: '测试草稿', timeline: tl })
    assert.ok(JSON.parse(readFileSync(join(dir, 'draft_content.json'), 'utf8')))
    assert.ok(JSON.parse(readFileSync(join(dir, 'draft_meta_info.json'), 'utf8')))
    assert.deepEqual(validateDraft(out.content, out.meta), [])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
