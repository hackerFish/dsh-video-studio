// 发行域：平台适配器（发行思维落地）。
// 每个平台声明：画幅/时长/标题字数/封面规格/安全合规预检清单/发布元数据模板。
// 导演流水线终剪后 → 走发行适配器生成"分平台发布包"（成片 + 元数据 + 合规检查结果）。
export const PLATFORMS = {
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

export function buildReleasePack(platformId, { hook = '', series = '', topic = '', tags = [], videoPath, durationSec, coverPath = null }) {
  const p = PLATFORMS[platformId]
  if (!p) throw new Error(`未知平台: ${platformId}（可选 ${Object.keys(PLATFORMS).join('/')}）`)
  const issues = []
  if (p.maxDurationSec && durationSec > p.maxDurationSec) issues.push(`时长 ${durationSec}s 超过平台上限 ${p.maxDurationSec}s`)
  const title = p.title.template
    .replace('{{hook}}', hook || '未填钩子')
    .replace('{{series}}', series || '')
    .replace('{{topic}}', topic || '')
    .replace('#话题', tags.map((t) => '#' + t).join(' '))
  if (title.length > p.title.maxChars) issues.push(`标题 ${title.length} 字超过上限 ${p.title.maxChars}`)
  return {
    platform: p.name,
    video: videoPath,
    cover: coverPath ?? `（待生成 ${p.cover.ratio} ${p.cover.note}）`,
    title,
    tags,
    checklist: p.compliance.map((c) => ({ item: c, status: 'pending' })),
    issues,
    ready: issues.length === 0,
  }
}

export function precheckCompliance(platformId, { text = '' } = {}) {
  // 基础文本预检（词库后续扩展）：AI 标注提示 + 导流外链粗检
  const issues = []
  if (/https?:\/\//.test(text)) issues.push('疑似外链：多数平台限制导流')
  return issues
}
