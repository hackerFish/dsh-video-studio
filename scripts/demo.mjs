// 无 key 全自动样片：三镜原创剧本 → ffmpeg 静帧 → macOS say 中文配音 → 字幕烧录 → 混音 → 成片
// 运行: node scripts/demo.mjs   （产物: demos/whale-demo.mp4）
import { mkdirSync, existsSync } from 'node:fs'
import { createTimeline, addClip, addSubtitle, addAudio } from '../src/finalcut/timeline.js'
import { renderTimeline, runFfmpeg, probeDurationSec, locateFfmpeg, pickFont } from '../src/finalcut/render-ffmpeg.js'
import { sayTts, sayAvailable } from '../src/voice/say-tts.js'

const ROOT = new URL('..', import.meta.url).pathname
const DEMO = `${ROOT}/demos`
mkdirSync(DEMO, { recursive: true })
const FONT = pickFont()
const fontPart = FONT ? `:fontfile=${FONT}` : ''

const shots = [
  { title: '第一镜', line: '在这片深海之下，住着一只爱做梦的鲸鱼。', c0: '0x0a2a5e', c1: '0x123c7a' },
  { title: '第二镜', line: '它梦想着，有一天能游进云层之上。', c0: '0x0f3d6e', c1: '0x1d5a9e' },
  { title: '第三镜', line: '今天，它终于浮出了海面。', c0: '0x144a80', c1: '0x2a6fb0' },
]

console.log('① 生成静帧与配音…')
const clipSpecs = []
for (const [i, s] of shots.entries()) {
  const still = `${DEMO}/shot${i}.mp4`
  // 注: 捆绑的静态 ffmpeg 为 2018 老版本，无 gradients 滤镜；用 color 滤镜（全版本可用）
  await runFfmpeg(['-y', '-f', 'lavfi', '-i', `color=c=${s.c0}:s=1080x1920:d=1`,
    '-vf', `drawtext=text='${s.title}'${fontPart}:fontsize=120:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2`,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-t', '1', still])
  const voiceRaw = `${DEMO}/line${i}.aiff`
  const voiceMp3 = `${DEMO}/line${i}.mp3`
  if (sayAvailable()) {
    await sayTts({ text: s.line, outPath: voiceRaw })
    await runFfmpeg(['-y', '-i', voiceRaw, '-ac', '1', voiceMp3])
  }
  const voiceDur = sayAvailable() ? await probeDurationSec(voiceMp3) : 3
  const clipDur = Math.round((voiceDur + 1.2) * 1e6) // 配音 + 留白
  clipSpecs.push({ still, voice: voiceMp3, line: s.line, clipDur, voiceDur })
}

console.log('② 组装导演时间线（镜头顺序拼接 + 字幕 + 配音 + BGM）…')
const tl = createTimeline({ width: 1080, height: 1920 })
let t = 0
for (const [i, c] of clipSpecs.entries()) {
  addClip(tl, { src: c.still, durationUs: c.clipDur })
  if (sayAvailable()) addAudio(tl, { src: c.voice, startUs: t + 400_000, durationUs: Math.round(c.voiceDur * 1e6), volume: 1.0 })
  addSubtitle(tl, { text: c.line, startUs: t + 200_000, durationUs: Math.round((c.voiceDur + 0.8) * 1e6) })
  t += c.clipDur
}
await runFfmpeg(['-y', '-f', 'lavfi', '-i', `sine=frequency=220:duration=${Math.ceil(t / 1e6)}`, `${DEMO}/bgm.mp3`])
addAudio(tl, { src: `${DEMO}/bgm.mp3`, startUs: 0, durationUs: t, volume: 0.15 })

console.log('③ 全自动渲染成片（ffmpeg 通道 B）…')
const out = `${DEMO}/whale-demo.mp4`
const r = await renderTimeline({ timeline: tl, outPath: out, subtitles: true })
const dur = await probeDurationSec(out)
console.log('✅ 成片:', out)
console.log(`   时长 ${dur.toFixed(1)}s · ffmpeg: ${r.ffmpeg}`)
