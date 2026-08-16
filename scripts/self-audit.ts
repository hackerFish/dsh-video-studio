// 自我分析入口：扫描项目 → 生成报告 → 写入 docs/AUDIT-REPORT.md。
// 用法: node scripts/self-audit.ts [--write]   （默认即写入，--write 保留作显式语义）
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildAudit } from '../src/selfaudit/audit.ts'
import { renderAuditMarkdown } from '../src/selfaudit/render.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(ROOT, 'docs/AUDIT-REPORT.md')

const facts = buildAudit()
const markdown = renderAuditMarkdown(facts)
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, markdown)
console.log(`✔ 审计完成: ${out}`)
console.log(`  ${facts.tests.files} 测试文件 / ${facts.tests.cases} 用例 · ${facts.modules.length} 模块`)
console.log(`  供应商 ${facts.matrix.total} 个（实测 ${facts.matrix.liveVerified} · 待 key ${facts.matrix.adapter}）`)
console.log(`  差距清单 ${facts.gaps.length} 条 · 最近提交: ${facts.git?.lastCommit ?? '（git 不可用）'}`)
if (facts.git?.dirty) console.log('  ⚠️ 工作区有未提交改动，报告可能领先于已推送状态')
