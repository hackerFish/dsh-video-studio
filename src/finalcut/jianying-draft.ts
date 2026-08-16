// JianYing (剪映) draft generator — channel A of the final-cut engine.
// Community reverse-engineered structure (same lineage as cutcli/ArcReel); conservative field set + validator.
import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Timeline } from './timeline.ts'

interface TextMaterial { id: string; type: 'text'; content: string; styles: string }
interface VideoMaterial { id: string; path: string; type: 'video'; duration: number; width: number; height: number }
interface AudioMaterial { id: string; path: string; type: 'audio'; duration: number }
interface Segment { id: string; material_id: string; target_timerange: { start: number; duration: number }; source_timerange?: { start: number; duration: number }; speed?: number; volume?: number; common_keyframes?: unknown[]; transitions?: unknown[] }
interface Track { id: string; type: string; segments: Segment[] }
export interface DraftContent {
  canvas_config: { width: number; height: number; ratio: string }
  materials: Record<string, unknown>
  tracks: { id: string; type: string }[]
}
export interface DraftMeta {
  draft_id: string
  draft_name: string
  draft_root_path: string
  draft_fold_path: string
  draft_removable_storage_device: string
  tm_draft_create: number
  tm_draft_modified: number
  tm_draft_removed: number
  tm_duration: number
}

const TEXT_STYLE_DEFAULT = JSON.stringify({ styles: [{ type: 'text', name: '默认字幕', text_color: '#FFFFFF', background_color: 'rgba(0,0,0,0)', text_size: 9, bold: true, align: 1 }] })

function textMaterial(id: string, text: string): TextMaterial {
  return { id, type: 'text', content: JSON.stringify({ text: String(text) }), styles: TEXT_STYLE_DEFAULT }
}

export function buildDraftContent(tl: Timeline): DraftContent {
  const videos: VideoMaterial[] = tl.clips.map((c) => ({ id: c.id, path: c.src, type: 'video', duration: c.durationUs, width: tl.canvas.width, height: tl.canvas.height }))
  const audios: AudioMaterial[] = tl.audio.map((a) => ({ id: a.id, path: a.src, type: 'audio', duration: a.durationUs }))
  const texts: TextMaterial[] = tl.subtitles.map((s) => textMaterial(s.id, s.text))
  const videoSegments: Segment[] = tl.clips.map((c) => ({
    id: randomUUID(), material_id: c.id,
    target_timerange: { start: c.startUs, duration: c.durationUs },
    source_timerange: { start: c.srcStartUs, duration: c.durationUs },
    speed: 1.0, volume: c.volume, common_keyframes: [],
    ...(c.transitions.length ? { transitions: c.transitions } : {}),
  }))
  const audioSegments: Segment[] = tl.audio.map((a) => ({
    id: randomUUID(), material_id: a.id,
    target_timerange: { start: a.startUs, duration: a.durationUs },
    source_timerange: { start: a.srcStartUs, duration: a.durationUs },
    volume: a.volume,
  }))
  const textSegments: Segment[] = tl.subtitles.map((s) => ({
    id: randomUUID(), material_id: s.id,
    target_timerange: { start: s.startUs, duration: s.durationUs },
  }))
  const videoTrackId = randomUUID(), audioTrackId = randomUUID(), textTrackId = randomUUID()
  const materials: Record<string, unknown> = {}
  if (videos.length) materials.videos = videos
  if (audios.length) materials.audios = audios
  if (texts.length) materials.texts = texts
  if (videoSegments.length) materials.video_tracks = [{ id: videoTrackId, type: 'video', segments: videoSegments }] as Track[]
  if (audioSegments.length) materials.audio_tracks = [{ id: audioTrackId, type: 'audio', segments: audioSegments }] as Track[]
  if (textSegments.length) materials.text_tracks = [{ id: textTrackId, type: 'text', segments: textSegments }] as Track[]
  const tracks: { id: string; type: string }[] = []
  if (videoSegments.length) tracks.push({ id: videoTrackId, type: 'video' })
  if (audioSegments.length) tracks.push({ id: audioTrackId, type: 'audio' })
  if (textSegments.length) tracks.push({ id: textTrackId, type: 'text' })
  return { canvas_config: { width: tl.canvas.width, height: tl.canvas.height, ratio: 'original' }, materials, tracks }
}

export function buildDraftMeta(opts: { draftId?: string; name?: string; durationUs?: number } = {}): DraftMeta {
  const now = Math.floor(Date.now() / 1000)
  return {
    draft_id: opts.draftId ?? randomUUID(),
    draft_name: opts.name ?? '鲸影草稿',
    draft_root_path: '.',
    draft_fold_path: '.',
    draft_removable_storage_device: '',
    tm_draft_create: now,
    tm_draft_modified: now,
    tm_draft_removed: 0,
    tm_duration: opts.durationUs ?? 0,
  }
}

export function validateDraft(content: DraftContent, meta: DraftMeta): string[] {
  const errors: string[] = []
  const m = content?.materials ?? {}
  const seenIds = new Set<string>()
  const pushIds = (list: unknown, where: string): void => {
    for (const it of (Array.isArray(list) ? list : []) as Array<Record<string, unknown> | null | undefined>) {
      if (!it || typeof it.id !== 'string') { errors.push(`${where}: 缺 id`); continue }
      if (seenIds.has(it.id)) errors.push(`${where}: 重复 id ${it.id}`)
      seenIds.add(it.id)
    }
  }
  pushIds(m.videos, 'videos'); pushIds(m.audios, 'audios'); pushIds(m.texts, 'texts')
  for (const track of [...(Array.isArray(m.video_tracks) ? m.video_tracks as Track[] : []), ...(Array.isArray(m.audio_tracks) ? m.audio_tracks as Track[] : []), ...(Array.isArray(m.text_tracks) ? m.text_tracks as Track[] : [])]) {
    for (const seg of track?.segments ?? []) {
      if (!seg.material_id || !seenIds.has(seg.material_id)) errors.push(`${track.type}: segment 引用了不存在的 material_id ${seg.material_id}`)
      const tr = seg.target_timerange ?? { start: -1, duration: -1 }
      if (!(tr.start >= 0) || !(tr.duration > 0)) errors.push(`${track.type}: 非法 target_timerange ${JSON.stringify(tr)}`)
      pushIds([seg], `${track.type}:segments`)
    }
  }
  if ((content?.canvas_config?.width ?? 0) <= 0 || (content?.canvas_config?.height ?? 0) <= 0) errors.push('canvas_config 非法')
  if (!meta?.draft_id) errors.push('meta 缺 draft_id')
  return errors
}

export interface WriteDraftResult { dir: string; content: DraftContent; meta: DraftMeta }

export function writeDraft(dir: string, opts: { name?: string; timeline: Timeline }): WriteDraftResult {
  const content = buildDraftContent(opts.timeline)
  const meta = buildDraftMeta({ name: opts.name ?? '鲸影草稿', durationUs: opts.timeline.clips.reduce((a, c) => a + c.durationUs, 0) })
  const errors = validateDraft(content, meta)
  if (errors.length) throw new Error(`草稿结构校验失败: ${errors.join('; ')}`)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'draft_content.json'), JSON.stringify(content, null, 2))
  writeFileSync(join(dir, 'draft_meta_info.json'), JSON.stringify(meta, null, 2))
  return { dir, content, meta }
}
