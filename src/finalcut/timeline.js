// 导演时间线模型：剪辑决策的机器表达（与任何剪辑软件无关的中性层）
// 单位：微秒（us），与剪映草稿内部一致。
import { randomUUID } from 'node:crypto'

export function createTimeline({ width = 1080, height = 1920 } = {}) {
  return {
    canvas: { width, height },
    clips: [],      // {id, src, startUs, durationUs, srcStartUs, volume, transitions[]}
    subtitles: [],  // {id, text, startUs, durationUs, style?}
    audio: [],      // {id, src, startUs, durationUs, srcStartUs, volume}
  }
}

export function addClip(tl, { src, durationUs, srcStartUs = 0, volume = 1.0, transitionOut = null }) {
  const startUs = tl.clips.reduce((acc, c) => acc + c.durationUs, 0) // 顺序拼接
  const clip = {
    id: randomUUID(), src, startUs, durationUs, srcStartUs, volume,
    transitions: transitionOut ? [{ name: transitionOut }] : [],
  }
  tl.clips.push(clip)
  return clip
}

export function addSubtitle(tl, { text, startUs, durationUs, style = 'default' }) {
  const s = { id: randomUUID(), text, startUs, durationUs, style }
  tl.subtitles.push(s)
  return s
}

export function addAudio(tl, { src, startUs, durationUs, srcStartUs = 0, volume = 1.0 }) {
  const a = { id: randomUUID(), src, startUs, durationUs, srcStartUs, volume }
  tl.audio.push(a)
  return a
}

export function totalDurationUs(tl) {
  return Math.max(
    tl.clips.reduce((acc, c) => acc + c.durationUs, 0),
    ...tl.audio.map((a) => a.startUs + a.durationUs),
    ...tl.subtitles.map((s) => s.startUs + s.durationUs),
    0,
  )
}
