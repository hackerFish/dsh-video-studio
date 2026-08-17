import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildSapiScript, sayAvailable } from '../src/voice/say-tts.ts'
import { FONT_CANDIDATES } from '../src/finalcut/render-ffmpeg.ts'

test('Windows SAPI 脚本：转义单引号 + 关键命令齐全', () => {
  const s = buildSapiScript("it's 测试", 'C:\\out\\line.wav', 'Huihui')
  assert.ok(s.includes('Add-Type -AssemblyName System.Speech'))
  assert.ok(s.includes("$s.Speak('it''s 测试')"))
  assert.ok(s.includes("$s.SetOutputToWaveFile('C:\\out\\line.wav')"))
  assert.ok(s.includes("$s.SelectVoice('Huihui')"))
  assert.ok(s.endsWith('$s.Dispose()'))
  // 不指定音色则不生成 SelectVoice
  const noVoice = buildSapiScript('x', 'C:\\o.wav')
  assert.ok(!noVoice.includes('SelectVoice'))
})

test('sayAvailable：darwin 与 win32 均可本地 TTS', () => {
  assert.equal(sayAvailable(), process.platform === 'darwin' || process.platform === 'win32')
})

test('中文字幕字体候选覆盖 Windows（微软雅黑/黑体/宋体）', () => {
  const joined = FONT_CANDIDATES.join('\n')
  assert.ok(joined.includes('C:\\Windows\\Fonts\\msyh.ttc'))
  assert.ok(joined.includes('C:\\Windows\\Fonts\\simhei.ttf'))
  assert.ok(joined.includes('C:\\Windows\\Fonts\\simsun.ttc'))
  assert.ok(joined.includes('/System/Library/Fonts/PingFang.ttc'))
})
