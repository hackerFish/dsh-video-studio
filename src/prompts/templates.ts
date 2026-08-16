// 提示词模板库 v2：按"专业提示词结构学 10 原则"重构（区块分层/版式命脉/一致性三重锁/多视图三宗罪负面/可度量锚点）。
// 设计文档: docs/PROMPT-ENGINEERING.md

/** 质量增益片段（按区块分类，可组合）。 */
export const QUALITY_BOOSTERS: Record<string, string> = {
  // 渲染画质
  ultra: '8K 超清，OC 渲染，次世代建模，电影级柔和轮廓光，统一85mm焦距，无畸变',
  material: '细腻布料纹理，发丝分层精致，PBR 材质，次表面散射',
  // 背景
  clean: '纯色空白背景，无阴影无杂物，无多余元素',
  cleanGray: '无多余元素的浅灰色背景，角色无阴影',
  // 姿态表情
  neutral: '中性表情（无喜怒哀乐），眼神平静，自然站立，双手自然下垂，空手（无手持物），身上无任何背负物',
  plain: '无多余动作、无夸张表情，平视',
  // 负面
  noText: '严禁画面出现不相关的文字',
  // 一致性（三重锁，分别声明）
  consistentFace: '所有视图面部特征一致',
  consistentBody: '所有视图身体比例一致',
  consistentOutfit: '所有视图服装与配饰一致',
}

/** 默认增益组合：画质+材质+姿态+负面。 */
export const DEFAULT_BOOSTERS = ['ultra', 'material', 'neutral', 'noText'] as const

/** 多视图/角色设定板专属负面清单（三宗罪 + 通用）。 */
export const CHARACTER_SHEET_NEGATIVE: string[] = [
  '视图融合', '面板间特征漂移', '风景背景污染', '多余肢体', '手部畸形', '面部畸形',
  '水印', '签名', '文字', '低分辨率', '过度锐化', '胶片颗粒',
]

/** 通用负面清单（单图/场景）。 */
export const GENERIC_NEGATIVE: string[] = [
  '低分辨率', '模糊', '畸变', '多余肢体', '水印', '签名', '文字', '过度饱和',
]

export interface TemplateVars {
  style?: string
  description?: string
  face?: string
  hair?: string
  body?: string
  outfit?: string
  accessory?: string
  pose?: string
  expression?: string
  lighting?: string
  camera?: string
  background?: string
  composition?: string
  aspectRatio?: string
  [key: string]: string | undefined
}

export interface PromptTemplate {
  id: string
  name: string
  build: (vars: TemplateVars) => string
  negative: string[]
  ratios: string
}

/** 区块拼接：跳过空块，保证顺序即权重。 */
function sections(...blocks: [string, string | undefined][]): string {
  return blocks.map(([label, v]) => (v ? `${label}：${v}` : null)).filter((x): x is string => Boolean(x)).join('，')
}

export const TEMPLATES: Record<string, PromptTemplate> = {
  /** 角色设定三视图（v2）：版式标签 + 三重一致性锁 + 可度量锚点 */
  'character-sheet': {
    id: 'character-sheet',
    name: '角色设定三视图',
    ratios: '16:9 横版三视图 / 3:4 竖版堆叠 / 1:1 表情网格',
    negative: CHARACTER_SHEET_NEGATIVE,
    build: (v) => sections(
      ['主体', '全身完整立绘，' + (v.style ?? '3D 国漫仙侠次世代建模')],
      ['外观', [v.hair, v.face, v.body, v.outfit, v.accessory, v.description].filter(Boolean).join('，') || undefined],
      ['渲染', QUALITY_BOOSTERS.ultra + '，' + QUALITY_BOOSTERS.material],
      ['姿态', [QUALITY_BOOSTERS.neutral, QUALITY_BOOSTERS.plain, v.pose].filter(Boolean).join('，')],
      ['光影', v.lighting ?? '电影级柔和轮廓光'],
      ['镜头', v.camera ?? '统一85mm焦距，无畸变，平视'],
      ['背景', QUALITY_BOOSTERS.cleanGray],
      ['版式', '左区：角色正脸特写，面部占满左区，无身体入镜；右区：标准角色设定三视图，横向依次排列侧视图、正视图、背视图，从头到脚完整无遮挡'],
      ['度量', '三视图角色高度为画面高度的 80%，三视图高度统一'],
      ['一致性', [QUALITY_BOOSTERS.consistentFace, QUALITY_BOOSTERS.consistentBody, QUALITY_BOOSTERS.consistentOutfit].join('；')],
      ['负面', QUALITY_BOOSTERS.noText],
      ['画幅', v.aspectRatio ?? '9:16'],
    ),
  },
  /** 场景主图（v2）：环境资产 */
  'scene-master': {
    id: 'scene-master',
    name: '场景主图',
    ratios: '16:9 电影宽幅',
    negative: GENERIC_NEGATIVE,
    build: (v) => sections(
      ['主体', v.description ?? '空环境'],
      ['风格', v.style ?? '国风仙侠，电影感'],
      ['渲染', QUALITY_BOOSTERS.ultra],
      ['光影', v.lighting ?? '自然体积光'],
      ['构图', v.composition ?? '纵深透视，主次分明'],
      ['约束', '无人物入镜，' + QUALITY_BOOSTERS.noText],
      ['画幅', v.aspectRatio ?? '16:9'],
    ),
  },
  /** 单镜画面（v2）：分镜提示词 */
  'shot-scene': {
    id: 'shot-scene',
    name: '单镜画面',
    ratios: '9:16 竖屏 / 16:9 横屏',
    negative: GENERIC_NEGATIVE,
    build: (v) => sections(
      ['主体', v.description ?? ''],
      ['风格', v.style ?? ''],
      ['渲染', QUALITY_BOOSTERS.ultra],
      ['光影', v.lighting ?? ''],
      ['镜头', v.camera ?? ''],
      ['构图', v.composition ?? '景别明确，构图主次分明，动态自然'],
      ['负面', QUALITY_BOOSTERS.noText],
      ['画幅', v.aspectRatio ?? '9:16'],
    ),
  },
}

export function applyTemplate(templateId: string, vars: TemplateVars = {}): string {
  const t = TEMPLATES[templateId]
  if (!t) throw new Error(`未知模板: ${templateId}（可选 ${Object.keys(TEMPLATES).join('/')}）`)
  return t.build(vars)
}

export function templateNegative(templateId: string): string[] {
  const t = TEMPLATES[templateId]
  if (!t) throw new Error(`未知模板: ${templateId}`)
  return [...t.negative]
}

export function listTemplates(): { id: string; name: string; ratios: string }[] {
  return Object.values(TEMPLATES).map((t) => ({ id: t.id, name: t.name, ratios: t.ratios }))
}
