// 剪映草稿生成器（通道 A）：
// 把导演时间线（timeline.js）映射为剪映可导入的草稿目录。
//
// 格式说明：剪映草稿是社区逆向的结构（与 cutcli / ArcReel 等项目的产物同源），
// 非官方文档化接口。本实现采用保守字段集 + 结构校验器（validateDraft），
// 并在 docs/JIANYING-DRAFT.md 中列明版本敏感点。导入剪映的实测依赖剪映客户端（待验）。
import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const TEXT_STYLE_DEFAULT = JSON.stringify({
  styles: [
    {
      type: 'text',
      name: '默认字幕',
      text_color: '#FFFFFF',
      background_color: 'rgba(0,0,0,0)',
      text_size: 9,
      bold: true,
      align: 1,
    },
  ],
})

function textMaterial(id, text) {
  return { id, type: 'text', content: JSON.stringify({ text: String(text) }), styles: TEXT_STYLE_DEFAULT }
}

export function buildDraftContent(tl) {
  const videos = tl.clips.map((c) => ({
    id: c.id, path: c.src, type: 'video',
    duration: c.durationUs, width: tl.canvas.width, height: tl.canvas.height,
  }))
  const audios = tl.audio.map((a) => ({
    id: a.id, path: a.src, type: 'audio', duration: a.durationUs,
  }))
  const texts = tl.subtitles.map((s) => textMaterial(s.id, s.text))

  const videoSegments = tl.clips.map((c) => {
    const seg = {
      id: randomUUID(), material_id: c.id,
      target_timerange: { start: c.startUs, duration: c.durationUs },
      source_timerange: { start: c.srcStartUs, duration: c.durationUs },
      speed: 1.0, volume: c.volume, common_keyframes: [],
    }
    if (c.transitions?.length) seg.transitions = c.transitions
    return seg
  })
  const audioSegments = tl.audio.map((a) => ({
    id: randomUUID(), material_id: a.id,
    target_timerange: { start: a.startUs, duration: a.durationUs },
    source_timerange: { start: a.srcStartUs, duration: a.durationUs },
    volume: a.volume,
  }))
  const textSegments = tl.subtitles.map((s) => ({
    id: randomUUID(), material_id: s.id,
    target_timerange: { start: s.startUs, duration: s.durationUs },
  }))

  const videoTrackId = randomUUID(), audioTrackId = randomUUID(), textTrackId = randomUUID()
  const materials = {}
  if (videos.length) materials.videos = videos
  if (audios.length) materials.audios = audios
  if (texts.length) materials.texts = texts
  if (videoSegments.length) materials.video_tracks = [{ id: videoTrackId, type: 'video', segments: videoSegments }]
  if (audioSegments.length) materials.audio_tracks = [{ id: audioTrackId, type: 'audio', segments: audioSegments }]
  if (textSegments.length) materials.text_tracks = [{ id: textTrackId, type: 'text', segments: textSegments }]

  const tracks = []
  if (videoSegments.length) tracks.push({ id: videoTrackId, type: 'video' })
  if (audioSegments.length) tracks.push({ id: audioTrackId, type: 'audio' })
  if (textSegments.length) tracks.push({ id: textTrackId, type: 'text' })

  return {
    canvas_config: { width: tl.canvas.width, height: tl.canvas.height, ratio: 'original' },
    materials,
    tracks,
  }
}

export function buildDraftMeta({ draftId = randomUUID(), name = '鲸影草稿', durationUs = 0 } = {}) {
  const now = Math.floor(Date.now() / 1000)
  return {
    draft_id: draftId,
    draft_name: name,
    draft_root_path: '.',
    draft_fold_path: '.',
    draft_removable_storage_device: '',
    tm_draft_create: now,
    tm_draft_modified: now,
    tm_draft_removed: 0,
    tm_duration: durationUs,
  }
}

export function validateDraft(content, meta) {
  const errors = []
  const m = content?.materials ?? {}
  const seenIds = new Set()
  const pushIds = (list, where) => {
    for (const it of list ?? []) {
      if (!it || typeof it.id !== 'string') { errors.push(`${where}: 缺 id`); continue }
      if (seenIds.has(it.id)) errors.push(`${where}: 重复 id ${it.id}`)
      seenIds.add(it.id)
    }
  }
  pushIds(m.videos, 'videos'); pushIds(m.audios, 'audios'); pushIds(m.texts, 'texts')
  for (const track of [...(m.video_tracks ?? []), ...(m.audio_tracks ?? []), ...(m.text_tracks ?? [])]) {
    for (const seg of track?.segments ?? []) {
      if (!seg.material_id || !seenIds.has(seg.material_id)) errors.push(`${track.type}: segment 引用了不存在的 material_id ${seg.material_id}`)
      const tr = seg.target_timerange ?? {}
      if (!(tr.start >= 0) || !(tr.duration > 0)) errors.push(`${track.type}: 非法 target_timerange ${JSON.stringify(tr)}`)
      pushIds([seg], `${track.type}:segments`)
    }
  }
  if (content?.canvas_config?.width <= 0 || content?.canvas_config?.height <= 0) errors.push('canvas_config 非法')
  if (!meta?.draft_id) errors.push('meta 缺 draft_id')
  return errors
}

export function writeDraft(dir, { name = '鲸影草稿', timeline }) {
  const content = buildDraftContent(timeline)
  const meta = buildDraftMeta({ name, durationUs: timeline.clips.reduce((a, c) => a + c.durationUs, 0) })
  const errors = validateDraft(content, meta)
  if (errors.length) throw new Error(`草稿结构校验失败: ${errors.join('; ')}`)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'draft_content.json'), JSON.stringify(content, null, 2))
  writeFileSync(join(dir, 'draft_meta_info.json'), JSON.stringify(meta, null, 2))
  return { dir, content, meta }
}
