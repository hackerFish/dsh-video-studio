// Local TTS: macOS `say`（中文，零 key）; Windows PowerShell SAPI（System.Speech，零 key）。
// 其他平台 → 抛错并引导用 voiceFile 挂外部配音（云 TTS / 真人录音）。
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

export function sayAvailable(): boolean {
  return process.platform === 'darwin' || process.platform === 'win32'
}

export interface SayTtsResult {
  outPath: string
  voice: string
  durationMs: number | null
}

/** 生成 Windows SAPI 的 PowerShell 脚本（纯函数，便于单测）。 */
export function buildSapiScript(text: string, outPath: string, voice?: string): string {
  const esc = (s: string): string => s.replace(/'/g, "''")
  const parts = [
    'Add-Type -AssemblyName System.Speech;',
    '$s = New-Object System.Speech.Synthesis.SpeechSynthesizer;',
  ]
  if (voice) parts.push(`$s.SelectVoice('${esc(voice)}');`)
  parts.push(`$s.SetOutputToWaveFile('${esc(outPath)}');`)
  parts.push(`$s.Speak('${esc(text)}');`)
  parts.push('$s.Dispose()')
  return parts.join(' ')
}

function sayWin({ text, voice, outPath }: { text: string; voice?: string; outPath: string }): Promise<SayTtsResult> {
  return new Promise((resolve, reject) => {
    const p = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', buildSapiScript(text, outPath, voice)])
    p.on('close', (code) => {
      if (code === 0 && existsSync(outPath)) resolve({ outPath, voice: 'SAPI', durationMs: null })
      else reject(new Error(`Windows SAPI 退出码 ${code}（中文语音需系统装有中文 TTS 语音包；或改用 voiceFile 挂外部配音）`))
    })
  })
}

function sayMac({ text, voice = 'Tingting', outPath }: { text: string; voice?: string; outPath: string }): Promise<SayTtsResult> {
  return new Promise((resolve, reject) => {
    const p = spawn('say', ['-v', voice, '-o', outPath, String(text)])
    p.on('close', (code) => {
      if (code === 0 && existsSync(outPath)) resolve({ outPath, voice, durationMs: null })
      else reject(new Error(`say 退出码 ${code}`))
    })
  })
}

export function sayTts({ text, voice, outPath }: { text: string; voice?: string; outPath: string }): Promise<SayTtsResult> {
  if (process.platform === 'darwin') return sayMac({ text, voice, outPath })
  if (process.platform === 'win32') return sayWin({ text, voice, outPath })
  return Promise.reject(new Error(`本地 TTS 仅支持 macOS/Windows（当前 ${process.platform}）——用分镜脚本的 voiceFile 挂云 TTS/真人录音`))
}
