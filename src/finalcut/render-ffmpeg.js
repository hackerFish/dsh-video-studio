// 通道 B：ffmpeg 全自动渲染器（零依赖直出成片）
// 流程：逐镜标准化(尺寸/fps/像素格式) → concat 拼接 → 旁白/BGM 混音(adelay+amix) → drawtext 字幕 → 成片
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export function locateFfmpeg() {
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
  ].filter(Boolean)
  for (const c of candidates) {
    if (c === 'ffmpeg' || existsSync(c)) return c
  }
  return null
}

export function runFfmpeg(args, { timeoutMs = 180000 } = {}) {
  return new Promise((resolve, reject) => {
    const bin = locateFfmpeg()
    if (!bin) return reject(new Error('未找到 ffmpeg：设置 DSH_FFMPEG 或安装 @ffmpeg-installer/ffmpeg'))
    const p = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let err = ''
    p.stderr.on('data', (d) => { err += d })
    const t = setTimeout(() => { p.kill('SIGKILL'); reject(new Error('ffmpeg 超时')) }, timeoutMs)
    p.on('close', (code) => {
      clearTimeout(t)
      code === 0 ? resolve({ stderr: err }) : reject(new Error(`ffmpeg 退出码 ${code}: ${err.slice(-500)}`))
    })
  })
}

export async function probeDurationSec(src) {
  const bin = locateFfmpeg()
  if (!bin) throw new Error('未找到 ffmpeg')
  const p = spawn(bin, ['-i', src], { stdio: ['ignore', 'ignore', 'pipe'] })
  let err = ''
  p.stderr.on('data', (d) => { err += d })
  await new Promise((r) => p.on('close', r))
  const m = err.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/)
  if (!m) throw new Error(`无法读取时长: ${src}`)
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
}

const FONT_CANDIDATES = [
  '/System/Library/Fonts/PingFang.ttc',
  '/System/Library/Fonts/STHeiti Light.ttc',
  '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
]

function pickFont() {
  return FONT_CANDIDATES.find((f) => existsSync(f)) ?? null
}

function drawtextFor(s, font, canvasH) {
  const esc = String(s.text).replace(/[\\'%:]/g, (c) => '\\' + c)
  const fontPart = font ? `:fontfile=${font.replace(/:/g, '\\:')}` : ''
  const start = s.startUs / 1e6
  const end = (s.startUs + s.durationUs) / 1e6
  return `drawtext=text='${esc}'${fontPart}:fontsize=72:fontcolor=white:borderw=3:bordercolor=black:x=(w-text_w)/2:y=h*0.78:enable='between(t,${start},${end})'`
}

export async function renderTimeline({ timeline, outPath, fps = 30, crf = 23, subtitles = true, onProgress } = {}) {
  const bin = locateFfmpeg()
  if (!bin) throw new Error('未找到 ffmpeg：设置 DSH_FFMPEG 或安装 @ffmpeg-installer/ffmpeg')
  const W = timeline.canvas.width, H = timeline.canvas.height
  // 1) 逐镜标准化
  const norm = []
  for (const [i, c] of timeline.clips.entries()) {
    const out = `${outPath}.norm${i}.mp4`
    await runFfmpeg(['-y', '-i', c.src,
      '-ss', String(c.srcStartUs / 1e6), '-t', String(c.durationUs / 1e6),
      '-vf', `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,fps=${fps},format=yuv420p`,
      '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', out])
    norm.push(out)
    onProgress?.('normalize', i + 1, timeline.clips.length)
  }
  // 2) 拼 filter 图：视频 concat + 字幕 drawtext
  const args = []
  const vInputs = norm.map((n) => ['-i', n]).flat()
  args.push(...vInputs)
  const font = pickFont()
  const draws = (subtitles && timeline.subtitles.length)
    ? ',' + timeline.subtitles.map((s) => drawtextFor(s, font, H)).join(',')
    : ''
  // 单一连续链：输入 → concat → drawtext* → 打标签 [v]
  const vf = norm.map((_, i) => `[${i}:v]`).join('') + `concat=n=${norm.length}:v=1:a=0${draws}[v]`
  // 3) 音频：旁白/BGM adelay + amix
  const audioInputs = timeline.audio.map((a) => ['-i', a.src]).flat()
  args.push(...audioInputs)
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
