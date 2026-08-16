// 本地 TTS：macOS say 命令（中文语音，零 API key）。非 macOS 环境返回不可用并提示降级。
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

export function sayAvailable() {
  return process.platform === 'darwin'
}

export function sayTts({ text, voice = 'Tingting', outPath }) {
  return new Promise((resolve, reject) => {
    if (!sayAvailable()) return reject(new Error('say 仅限 macOS；请改用云 TTS 供应商'))
    const p = spawn('say', ['-v', voice, '-o', outPath, String(text)])
    p.on('close', (code) => {
      code === 0 && existsSync(outPath)
        ? resolve({ outPath, voice, durationMs: null })
        : reject(new Error(`say 退出码 ${code}`))
    })
  })
}
