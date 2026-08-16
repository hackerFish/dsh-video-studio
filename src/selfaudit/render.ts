// 审计报告渲染：AuditFacts → markdown（写入 docs/AUDIT-REPORT.md 或返回给工具）。
import type { AuditFacts, GapRow } from './audit.ts'

const GAP_STATUS: Record<GapRow['status'], string> = {
  'waiting-key': '🔑 等 key',
  todo: '⬜ 待办',
  planned: '🧭 计划中',
}

export function renderAuditMarkdown(a: AuditFacts): string {
  const l: string[] = []
  l.push('# 鲸影自我审计报告 / Whale Self-Audit Report')
  l.push('')
  l.push(`> 自动生成于 ${a.generatedAt} —— \`node scripts/self-audit.ts\` 或 \`whale_self_audit\` 工具。`)
  l.push('> 本文件是生成物，勿手改；每天重跑一次，差异见 git diff（这正是"自我分析"的用法）。')
  l.push('')
  l.push('## 概览')
  l.push('')
  l.push(`- 包: **${a.package.name}** v${a.package.version}`)
  if (a.git) {
    l.push(`- git: \`${a.git.branch}\` · ${a.git.commits} commits${a.git.dirty ? ' · ⚠️ 工作区有未提交改动' : ''}`)
    l.push(`- 最近提交: ${a.git.lastCommit}`)
  }
  l.push(`- 测试: ${a.tests.files} 个文件 / ${a.tests.cases} 个用例（静态计数；权威数字跑 \`node --test\`）`)
  l.push(`- 源码: ${a.modules.length} 个 TS 模块 / ${a.modules.reduce((n, m) => n + m.lines, 0)} 行`)
  l.push(`- 供应商: ${a.matrix.total} 个（实测 ${a.matrix.liveVerified} · 适配器待 key ${a.matrix.adapter} · 其中纯 key 型 ${a.matrix.waitingKey}）`)
  l.push('')
  l.push('## 供应商矩阵')
  l.push('')
  l.push('| 供应商 | 通道 | 状态 | 免费额度 | 备注 |')
  l.push('|---|---|---|---|---|')
  for (const p of a.providers) {
    const status = p.status === 'live-verified' ? '✅ 实测' : p.status === 'adapter' ? '🔧 适配器就绪' : '📄 协议存档'
    l.push(`| ${p.id} | ${p.channel} | ${status} | ${p.freeQuota ? '✅' : '—'} | ${p.note} |`)
  }
  l.push('')
  l.push('## 能力清单')
  l.push('')
  l.push(`- 模型工具 (${a.tools.length}): ${a.tools.map((t) => `\`${t}\``).join(' ')}`)
  l.push(`- HTTP 路由 (${a.routes.length}): ${a.routes.map((r) => `\`${r}\``).join(' ')}`)
  l.push(`- 设置页 tab (${a.clientTabs.length}): ${a.clientTabs.map((t) => `\`${t}\``).join(' ')}`)
  l.push(`- 预置题材 (${a.presets.length}): ${a.presets.map((p) => `${p.id}(${p.shots}镜)`).join(' ')}`)
  l.push('')
  l.push('## 差距清单（下一步）')
  l.push('')
  for (const g of a.gaps) {
    l.push(`- [${GAP_STATUS[g.status]}] **${g.item}** — ${g.note}`)
  }
  l.push('')
  l.push('## 源码模块（按行数）')
  l.push('')
  const top = [...a.modules].sort((x, y) => y.lines - x.lines).slice(0, 12)
  for (const m of top) l.push(`- \`${m.path}\` — ${m.lines} 行`)
  l.push('')
  return l.join('\n')
}
