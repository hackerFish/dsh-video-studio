// Distribution domain: per-platform specs (aspect/duration/title/cover/compliance) & release pack builder.
export interface PlatformSpec {
  id: string
  name: string
  aspectRatio: string
  maxDurationSec: number | null
  suggestedDurationSec: number[]
  title: { maxChars: number; template: string }
  cover: { ratio: string; note: string }
  compliance: string[]
}

export const PLATFORMS: Record<string, PlatformSpec> = {
  douyin: {
    id: 'douyin', name: '抖音', aspectRatio: '9:16', maxDurationSec: 180, suggestedDurationSec: [15, 60],
    title: { maxChars: 55, template: '{{hook}}｜{{topic}} #话题1 #话题2' },
    cover: { ratio: '3:4', note: '竖版封面，突出前 3 秒钩子' },
    compliance: ['无导流外链', '无违禁词', '医疗/金融需资质', 'AI 生成内容建议标注', '音乐版权检查'],
  },
  kuaishou: {
    id: 'kuaishou', name: '快手', aspectRatio: '9:16', maxDurationSec: 180, suggestedDurationSec: [15, 60],
    title: { maxChars: 20, template: '{{hook}} #话题' },
    cover: { ratio: '3:4', note: '竖版封面' },
    compliance: ['无导流外链', '无违禁词', 'AI 生成内容建议标注', '音乐版权检查'],
  },
  bilibili: {
    id: 'bilibili', name: 'B站', aspectRatio: '16:9', maxDurationSec: null, suggestedDurationSec: [60, 600],
    title: { maxChars: 80, template: '【{{series}}】{{hook}}' },
    cover: { ratio: '16:9', note: '横版封面，带系列标识' },
    compliance: ['分区正确', '无违禁词', 'AI 生成内容建议标注', '音乐版权检查'],
  },
  xiaohongshu: {
    id: 'xiaohongshu', name: '小红书', aspectRatio: '3:4', maxDurationSec: 300, suggestedDurationSec: [15, 90],
    title: { maxChars: 20, template: '{{hook}}' },
    cover: { ratio: '3:4', note: '封面=首帧，文字占 1/3' },
    compliance: ['无导流外链', '无违禁词', 'AI 生成内容建议标注', '音乐版权检查'],
  },
}

export interface ReleasePackInput {
  hook?: string
  series?: string
  topic?: string
  tags?: string[]
  videoPath: string
  durationSec: number
  coverPath?: string | null
}

export interface ReleasePack {
  platform: string
  video: string
  cover: string
  title: string
  tags: string[]
  checklist: { item: string; status: string }[]
  issues: string[]
  ready: boolean
}

export function buildReleasePack(platformId: string, opts: ReleasePackInput): ReleasePack {
  const p = PLATFORMS[platformId]
  if (!p) throw new Error(`未知平台: ${platformId}（可选 ${Object.keys(PLATFORMS).join('/')}）`)
  const issues: string[] = []
  if (p.maxDurationSec && opts.durationSec > p.maxDurationSec) issues.push(`时长 ${opts.durationSec}s 超过平台上限 ${p.maxDurationSec}s`)
  const title = p.title.template
    .replace('{{hook}}', opts.hook || '未填钩子')
    .replace('{{series}}', opts.series || '')
    .replace('{{topic}}', opts.topic || '')
    .replace('#话题', (opts.tags ?? []).map((t) => '#' + t).join(' '))
  if (title.length > p.title.maxChars) issues.push(`标题 ${title.length} 字超过上限 ${p.title.maxChars}`)
  return {
    platform: p.name,
    video: opts.videoPath,
    cover: opts.coverPath ?? `（待生成 ${p.cover.ratio} ${p.cover.note}）`,
    title,
    tags: opts.tags ?? [],
    checklist: p.compliance.map((c) => ({ item: c, status: 'pending' })),
    issues,
    ready: issues.length === 0,
  }
}

export function precheckCompliance(_platformId: string, opts: { text?: string } = {}): string[] {
  const issues: string[] = []
  if (/https?:\/\//.test(opts.text ?? '')) issues.push('疑似外链：多数平台限制导流')
  return issues
}
