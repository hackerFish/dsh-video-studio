// Local TTS via macOS `say` (Chinese voices, zero API keys). Non-macOS → throws with guidance.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

export function sayAvailable(): boolean {
  return process.platform === 'darwin'
}

export interface SayTtsResult {
  outPath: string
  voice: string
  durationMs: number | null
}

export function sayTts({ text, voice = 'Tingting', outPath }: { text: string; voice?: string; outPath: string }): Promise<SayTtsResult> {
  return new Promise((resolve, reject) => {
    if (!sayAvailable()) return reject(new Error('say 仅限 macOS；请改用云 TTS 供应商'))
    const p = spawn('say', ['-v', voice, '-o', outPath, String(text)])
    p.on('close', (code) => {
      if (code === 0 && existsSync(outPath)) resolve({ outPath, voice, durationMs: null })
      else reject(new Error(`say 退出码 ${code}`))
    })
  })
}
