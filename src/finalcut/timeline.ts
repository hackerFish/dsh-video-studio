// Director timeline model: the neutral machine expression of editing decisions. Unit: microseconds.
import { randomUUID } from 'node:crypto'

export interface Transition { name: string }
export interface Clip { id: string; src: string; startUs: number; durationUs: number; srcStartUs: number; volume: number; transitions: Transition[] }
export interface Subtitle { id: string; text: string; startUs: number; durationUs: number; style?: string }
export interface AudioTrack { id: string; src: string; startUs: number; durationUs: number; srcStartUs: number; volume: number }
export interface Timeline {
  canvas: { width: number; height: number }
  clips: Clip[]
  subtitles: Subtitle[]
  audio: AudioTrack[]
}

export function createTimeline({ width = 1080, height = 1920 }: { width?: number; height?: number } = {}): Timeline {
  return { canvas: { width, height }, clips: [], subtitles: [], audio: [] }
}

export function addClip(tl: Timeline, opts: { src: string; durationUs: number; srcStartUs?: number; volume?: number; transitionOut?: string | null }): Clip {
  const startUs = tl.clips.reduce((acc, c) => acc + c.durationUs, 0)
  const clip: Clip = {
    id: randomUUID(), src: opts.src, startUs, durationUs: opts.durationUs,
    srcStartUs: opts.srcStartUs ?? 0, volume: opts.volume ?? 1.0,
    transitions: opts.transitionOut ? [{ name: opts.transitionOut }] : [],
  }
  tl.clips.push(clip)
  return clip
}

export function addSubtitle(tl: Timeline, opts: { text: string; startUs: number; durationUs: number; style?: string }): Subtitle {
  const s: Subtitle = { id: randomUUID(), text: opts.text, startUs: opts.startUs, durationUs: opts.durationUs, style: opts.style ?? 'default' }
  tl.subtitles.push(s)
  return s
}

export function addAudio(tl: Timeline, opts: { src: string; startUs: number; durationUs: number; srcStartUs?: number; volume?: number }): AudioTrack {
  const a: AudioTrack = {
    id: randomUUID(), src: opts.src, startUs: opts.startUs, durationUs: opts.durationUs,
    srcStartUs: opts.srcStartUs ?? 0, volume: opts.volume ?? 1.0,
  }
  tl.audio.push(a)
  return a
}

export function totalDurationUs(tl: Timeline): number {
  return Math.max(
    tl.clips.reduce((acc, c) => acc + c.durationUs, 0),
    ...tl.audio.map((a) => a.startUs + a.durationUs),
    ...tl.subtitles.map((s) => s.startUs + s.durationUs),
    0,
  )
}
