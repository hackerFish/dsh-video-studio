// Channel B: ffmpeg auto-render (zero-dependency final cut).
// Pipeline: per-clip normalize (size/fps/pixfmt) → concat → drawtext subtitles → adelay+amix audio → final mp4.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Timeline } from './timeline.ts'

export function locateFfmpeg(): string | null {
  const repoRoot = fileURLToPath(new URL('../..', import.meta.url))
  const base = `${repoRoot}/../_tools/ffmpeg/node_modules/@ffmpeg-installer`
  const candidates = [
    process.env.DSH_FFMPEG,
    `${base}/darwin-x64/ffmpeg`,
    `${base}/darwin-arm64/ffmpeg`,
    `${base}/linux-x64/ffmpeg`,
    `${base}/linux-arm64/ffmpeg`,
    `${base}/win32-x64/ffmpeg.exe`,
    'ffmpeg',
  ].filter((c): c is string => Boolean(c))
  for (const c of candidates) {
    if (c === 'ffmpeg' || existsSync(c)) return c
  }
  return null
}

export function runFfmpeg(args: string[], opts: { timeoutMs?: number } = {}): Promise<{ stderr: string }> {
  return new Promise((resolve, reject) => {
    const bin = locateFfmpeg()
    if (!bin) return reject(new Error('未找到 ffmpeg：设置 DSH_FFMPEG 或安装 @ffmpeg-installer/ffmpeg'))
    const p = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let err = ''
    p.stderr.on('data', (d: Buffer) => { err += d.toString() })
    const t = setTimeout(() => { p.kill('SIGKILL'); reject(new Error('ffmpeg 超时')) }, opts.timeoutMs ?? 180000)
    p.on('close', (code) => {
      clearTimeout(t)
      if (code === 0) resolve({ stderr: err })
      else reject(new Error(`ffmpeg 退出码 ${code}: ${err.slice(-500)}`))
    })
  })
}

export async function probeDurationSec(src: string): Promise<number> {
  const bin = locateFfmpeg()
  if (!bin) throw new Error('未找到 ffmpeg')
  const p = spawn(bin, ['-i', src], { stdio: ['ignore', 'ignore', 'pipe'] })
  let err = ''
  p.stderr.on('data', (d: Buffer) => { err += d.toString() })
  await new Promise((r) => p.on('close', r))
  const m = err.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/)
  if (!m) throw new Error(`无法读取时长: ${src}`)
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
}

const FONT_CANDIDATES = [
  '/System/Library/Fonts/Supplemental/Songti.ttc',
  '/System/Library/Fonts/PingFang.ttc',
  '/System/Library/Fonts/STHeiti Light.ttc',
  '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
]

export function pickFont(): string | null {
  return FONT_CANDIDATES.find((f) => existsSync(f)) ?? null
}

function drawtextFor(s: { text: string; startUs: number; durationUs: number }, font: string | null): string {
  const esc = String(s.text).replace(/[\\'%:]/g, (c) => '\\' + c)
  const fontPart = font ? `:fontfile=${font.replace(/:/g, '\\:')}` : ''
  const start = s.startUs / 1e6
  const end = (s.startUs + s.durationUs) / 1e6
  return `drawtext=text='${esc}'${fontPart}:fontsize=72:fontcolor=white:borderw=3:bordercolor=black:x=(w-text_w)/2:y=h*0.78:enable='between(t,${start},${end})'`
}

export interface RenderOptions {
  timeline: Timeline
  outPath: string
  fps?: number
  crf?: number
  subtitles?: boolean
  onProgress?: (stage: 'normalize' | 'render', index: number | null, total: number | null) => void
}

export interface RenderResult { outPath: string; durationSec: number; ffmpeg: string }

export async function renderTimeline({ timeline, outPath, fps = 30, crf = 23, subtitles = true, onProgress }: RenderOptions): Promise<RenderResult> {
  const bin = locateFfmpeg()
  if (!bin) throw new Error('未找到 ffmpeg：设置 DSH_FFMPEG 或安装 @ffmpeg-installer/ffmpeg')
  const W = timeline.canvas.width, H = timeline.canvas.height
  const norm: string[] = []
  for (const [i, c] of timeline.clips.entries()) {
    const out = `${outPath}.norm${i}.mp4`
    await runFfmpeg(['-y', '-i', c.src,
      '-ss', String(c.srcStartUs / 1e6), '-t', String(c.durationUs / 1e6),
      '-vf', `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,fps=${fps},format=yuv420p`,
      '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', out])
    norm.push(out)
    onProgress?.('normalize', i + 1, timeline.clips.length)
  }
  const args: string[] = []
  for (const n of norm) args.push('-i', n)
  const font = pickFont()
  const draws = (subtitles && timeline.subtitles.length)
    ? ',' + timeline.subtitles.map((s) => drawtextFor(s, font)).join(',')
    : ''
  const vf = norm.map((_, i) => `[${i}:v]`).join('') + `concat=n=${norm.length}:v=1:a=0${draws}[v]`
  const audioInputs = timeline.audio.map((a) => a.src)
  for (const a of audioInputs) args.push('-i', a)
  const total = timeline.clips.reduce((acc, c) => acc + c.durationUs, 0) / 1e6
  if (audioInputs.length) {
    const afParts = timeline.audio.map((a, i) => {
      const delay = Math.round(a.startUs / 1000)
      const trim = `atrim=start=${a.srcStartUs / 1e6}:duration=${a.durationUs / 1e6}`
      return `[${norm.length + i}:a]${trim},adelay=${delay}|${delay},volume=${a.volume ?? 1}[a${i}]`
    })
    const mix = timeline.audio.map((_, i) => `[a${i}]`).join('') + `amix=inputs=${timeline.audio.length}:duration=longest:dropout_transition=0[a]`
    args.push('-filter_complex', `${vf};${afParts.join(';')};${mix}`)
    args.push('-map', '[v]', '-map', '[a]')
  } else {
    args.push('-filter_complex', vf)
    args.push('-map', '[v]')
  }
  args.push('-t', String(total), '-c:v', 'libx264', '-preset', 'medium', '-crf', String(crf), '-movflags', '+faststart', '-y', outPath)
  onProgress?.('render', null, null)
  await runFfmpeg(args)
  return { outPath, durationSec: total, ffmpeg: bin }
}
