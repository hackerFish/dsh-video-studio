// 四层提示词合并（纯逻辑，可单测）
// layer1 风格DNA(全局) < layer2 分镜模板 < layer3 逐镜手写 < layer4 负向/一致性注入
export function mergePromptLayers({ dna = '', shotTemplate = '', manual = '', injections = '' } = {}) {
  const parts = [dna, shotTemplate, manual].map((s) => String(s ?? '').trim()).filter(Boolean)
  return { positive: parts.join('，'), negative: String(injections ?? '').trim() }
}

export function applyVariables(template, vars = {}) {
  return String(template ?? '').replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
}

// 自优化：评分(1-5) → 加权沉淀；低于阈值视为"该重拍"，降权该提示词
export function scorePrompt(entry, score) {
  const w = entry.weight ?? 1
  const v = Number(score) ?? 3
  return { ...entry, weight: w * (v / 3), lastScore: v, promote: v >= 4, retry: v <= 2 }
}
