// 分镜工坊核心：大纲 → 分镜拆分 → 角色提示词卡 → 逐镜顶级提示词（全部纯本地，不调 LLM）。
import { optimizePrompt } from '../prompts/optimizer.ts'
import { applyTemplate } from '../prompts/templates.ts'

export interface StudioCharacter {
  name: string
  description: string
  prompt: string
  negative: string[]
}

export interface StudioShot {
  index: number
  line: string
  prompt: string
  negative: string[]
  durationSec: number
}

export interface StudioPlan {
  characters: StudioCharacter[]
  shots: StudioShot[]
  appliedBoosters: string[]
}

/** 大纲按句拆分（。！？换行），与 whale_storyboard 同一规则。 */
export function splitShots(outline: string, maxShots = 12): string[] {
  const parts = String(outline ?? '').split(/(?<=[。！？!?])\s*|\n+/).map((s) => s.trim()).filter(Boolean)
  const list = parts.length ? parts : outline?.trim() ? [outline.trim()] : []
  return list.slice(0, Math.max(1, Math.min(maxShots, 12)))
}

/** 解析角色清单：每行 "名字|描述" 或 "名字：描述" 或 "名字: 描述"；无分隔符则整行为名字。 */
export function parseCharacters(text: string): { name: string; description: string }[] {
  return String(text ?? '')
    .split('\n').map((l) => l.trim()).filter(Boolean)
    .map((line) => {
      const m = line.match(/^(.{1,24}?)[|｜：:]\s*(.+)$/)
      if (m) return { name: m[1].trim(), description: m[2].trim() }
      return { name: line.slice(0, 24), description: '' }
    })
    .filter((c) => c.name.length > 0)
}

/** 角色卡：三视图模板 + 增益 → 顶级提示词（名字注入正文）。 */
export function buildCharacterPrompt(c: { name: string; description: string }, style?: string, ratio = '9:16'): StudioCharacter {
  const base = applyTemplate('character-sheet', {
    style,
    description: c.description ? `${c.name}：${c.description}` : `${c.name}，原创角色`,
    aspectRatio: ratio,
  })
  const opt = optimizePrompt(base, { style, aspectRatio: ratio })
  return { name: c.name, description: c.description, prompt: opt.optimized, negative: opt.negative }
}

/** 逐镜提示词：画面句 + 风格 + 角色引用注入 → 增益。 */
export function buildShotPrompt(line: string, opts: { style?: string; ratio?: string; characters?: { name: string; description: string }[] }): { prompt: string; negative: string[] } {
  const refs = (opts.characters ?? []).map((c) => `主体：${c.name}${c.description ? `（${c.description.slice(0, 60)}）` : ''}`).join('；')
  const raw = ['画面：' + line, opts.style ? `风格：${opts.style}` : '', refs ? refs : ''].filter(Boolean).join('，')
  const opt = optimizePrompt(raw, { style: opts.style, aspectRatio: opts.ratio })
  return { prompt: opt.optimized, negative: opt.negative }
}

/** 一键：大纲 + 角色 → 完整分镜计划（角色卡 + 逐镜顶级提示词）。 */
export function buildStoryboard(input: { outline?: string; charactersText?: string; style?: string; aspectRatio?: string; durationSec?: number }): StudioPlan {
  const ratio = input.aspectRatio ?? '16:9'
  const chars = parseCharacters(input.charactersText ?? '')
  const characters = chars.map((c) => buildCharacterPrompt(c, input.style, ratio))
  const lines = splitShots(input.outline ?? '')
  const shots = lines.map((line, i) => {
    const { prompt, negative } = buildShotPrompt(line, { style: input.style, ratio, characters: chars })
    return { index: i, line, prompt, negative, durationSec: input.durationSec ?? 3 }
  })
  // 全计划统一应用一次的增益清单（取第一个镜头为准，简单起见）
  const appliedBoosters: string[] = shots[0] ? [] : []
  return { characters, shots, appliedBoosters }
}
