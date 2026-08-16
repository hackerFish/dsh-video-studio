// 风格基因（记忆层）：跨会话沉淀你的风格 DNA、分镜模板评分与重拍反馈。
// 存储：本地 JSON（零依赖），与 DSH 会话记忆接口预留合并点。
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const VERSION = 1

export function createStyleGenome(filePath) {
  let data = { version: VERSION, styleDna: '', shotTemplates: {}, feedback: [] }
  if (existsSync(filePath)) {
    try {
      const loaded = JSON.parse(readFileSync(filePath, 'utf8'))
      data = { ...data, ...loaded, version: VERSION }
    } catch { /* 损坏文件从空开始，不抛错 */ }
  }
  const save = () => { mkdirSync(dirname(filePath), { recursive: true }); writeFileSync(filePath, JSON.stringify(data, null, 2)) }
  return {
    get styleDna() { return data.styleDna },
    setStyleDna(text) { data.styleDna = String(text ?? ''); save() },
    recordTemplate(key, template) {
      const t = data.shotTemplates[key] ?? { template, weight: 1, uses: 0 }
      t.template = String(template ?? ''); t.uses += 1; data.shotTemplates[key] = t; save()
      return t
    },
    bestTemplate(key) {
      const t = data.shotTemplates[key]
      return t ? t.template : ''
    },
    scoreTemplate(key, score) {
      const t = data.shotTemplates[key]
      if (!t) return null
      const v = Number(score) ?? 3
      t.weight = (t.weight ?? 1) * (v / 3)
      t.promote = v >= 4; t.retry = v <= 2
      save(); return t
    },
    recordFeedback({ shotIndex, decision, reason = '', at = new Date().toISOString() }) {
      data.feedback.push({ at, shotIndex, decision, reason })
      if (data.feedback.length > 500) data.feedback = data.feedback.slice(-500)
      save()
    },
    export() { return JSON.parse(JSON.stringify(data)) },
  }
}
