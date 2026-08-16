// 提示词模板库与质量增益库：把"专业级提示词"的结构拆成可复用、可参数化的资产。
// 来源：行业公认的顶级提示词范例（角色三视图设定等）抽象而来，非搬运。

/** 质量增益片段：可任意组合追加到草稿提示词后。 */
export const QUALITY_BOOSTERS: Record<string, string> = {
  ultra: '8K 超清，OC 渲染，电影级柔和轮廓光，统一85mm焦距，无畸变',
  clean: '纯色空白背景，无阴影无杂物，无多余元素',
  neutral: '中性表情（无喜怒哀乐），眼神平静，自然站立，双手自然下垂，空手（无手持物），身上无任何背负物',
  noText: '严禁画面出现不相关的文字',
  consistent: '五官 / 服装 / 配饰 / 体态 100% 一致',
  fullBody: '全身完整不裁切，从头到脚完整无遮挡',
  plain: '无多余动作、无夸张表情，平视',
}

export const DEFAULT_BOOSTERS = ['ultra', 'clean', 'neutral', 'noText'] as const

export interface TemplateVars {
  style?: string
  description?: string
  aspectRatio?: string
  [key: string]: string | undefined
}

export interface PromptTemplate {
  id: string
  name: string
  build: (vars: TemplateVars) => string
}

export const TEMPLATES: Record<string, PromptTemplate> = {
  /** 角色设定三视图（主图资产）：左区正脸特写 + 右区标准三视图，一致性锁定 */
  'character-sheet': {
    id: 'character-sheet',
    name: '角色设定三视图',
    build: (v) => [
      '全身完整立绘',
      QUALITY_BOOSTERS.clean,
      v.style ?? '3D 国漫仙侠次世代建模',
      QUALITY_BOOSTERS.ultra,
      v.description ?? '',
      QUALITY_BOOSTERS.fullBody,
      '左区：角色正脸特写，面部占满左区，五官 / 发型 / 配饰清晰，无身体入镜、无遮挡变形',
      '右区：标准角色设定三视图，横向依次排列侧视图、正视图和背视图，三个视图严格呈现侧视、正视和背视，从头到脚完整无遮挡',
      '核心约束：特写与三视图为同一角色，' + QUALITY_BOOSTERS.consistent,
      '右区尺寸：三视图角色高度为画面高度的 80%，三视图高度统一',
      QUALITY_BOOSTERS.noText,
      QUALITY_BOOSTERS.plain,
      v.aspectRatio ?? '9:16',
    ].filter(Boolean).join('，'),
  },
  /** 场景主图：环境资产，风格与氛围约束 */
  'scene-master': {
    id: 'scene-master',
    name: '场景主图',
    build: (v) => [
      v.description ?? '',
      v.style ?? '国风仙侠，电影感',
      QUALITY_BOOSTERS.ultra,
      '无人物入镜，纯环境，透视自然',
      QUALITY_BOOSTERS.noText,
      v.aspectRatio ?? '16:9',
    ].filter(Boolean).join('，'),
  },
  /** 单镜画面：分镜提示词的结构化扩展（景别/动作/情绪） */
  'shot-scene': {
    id: 'shot-scene',
    name: '单镜画面',
    build: (v) => [
      v.description ?? '',
      v.style ?? '',
      QUALITY_BOOSTERS.ultra,
      '景别明确，构图主次分明，动态自然',
      QUALITY_BOOSTERS.noText,
      v.aspectRatio ?? '9:16',
    ].filter(Boolean).join('，'),
  },
}

export function applyTemplate(templateId: string, vars: TemplateVars = {}): string {
  const t = TEMPLATES[templateId]
  if (!t) throw new Error(`未知模板: ${templateId}（可选 ${Object.keys(TEMPLATES).join('/')}）`)
  return t.build(vars)
}

export function listTemplates(): { id: string; name: string }[] {
  return Object.values(TEMPLATES).map((t) => ({ id: t.id, name: t.name }))
}
