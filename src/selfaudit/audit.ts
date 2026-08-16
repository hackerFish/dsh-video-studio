// 项目自我分析（self-audit）：扫描源码/测试/能力清单/git 状态，拼出可渲染、可对比的 AuditFacts。
// 原则：只读、快速、确定性——报告由 facts 渲染，facts 由仓库现状推导，不靠聊天记忆。
import { readdirSync, readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PROVIDER_MATRIX, matrixStats } from './matrix.ts'
import { STORY_PRESETS } from '../content/presets.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')

export interface ModuleStat {
  path: string
  lines: number
}

export interface GapRow {
  id: string
  item: string
  status: 'todo' | 'waiting-key' | 'planned'
  note: string
}

export interface AuditFacts {
  generatedAt: string
  package: { name: string; version: string }
  git: { branch: string; commits: number; lastCommit: string; dirty: boolean } | null
  modules: ModuleStat[]
  tests: { files: number; cases: number }
  matrix: { total: number; liveVerified: number; adapter: number; waitingKey: number }
  providers: { id: string; channel: string; status: string; freeQuota: boolean; note: string }[]
  tools: string[]
  routes: string[]
  clientTabs: string[]
  presets: { id: string; title: string; shots: number }[]
  gaps: GapRow[]
}

/** 递归收集 src/ 下全部 .ts 模块与行数。 */
export function scanModules(): ModuleStat[] {
  const base = join(ROOT, 'src')
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.ts') ? [join(dir, e.name)] : [])
  return walk(base)
    .map((p) => ({ path: p.slice(ROOT.length + 1), lines: readFileSync(p, 'utf8').split('\n').length }))
    .sort((a, b) => a.path.localeCompare(b.path))
}

/** 测试文件数与 test() 用例数（静态近似；权威数字以 node --test 为准）。 */
export function scanTests(): { files: number; cases: number } {
  const base = join(ROOT, 'test')
  const files = readdirSync(base).filter((f) => f.endsWith('.test.ts'))
  const cases = files.reduce(
    (n, f) => n + (readFileSync(join(base, f), 'utf8').match(/^test\(/gm) ?? []).length, 0)
  return { files: files.length, cases }
}

/** 已注册的模型工具名（src/host/tools.ts 内 name 字段）。 */
export function scanTools(): string[] {
  const src = readFileSync(join(ROOT, 'src/host/tools.ts'), 'utf8')
  return [...src.matchAll(/name: '([a-z_]+)'/g)].map((m) => m[1] as string)
}

/** host 注册的 HTTP 路由。 */
export function scanRoutes(): string[] {
  const src = readFileSync(join(ROOT, 'src/host/index.ts'), 'utf8')
  return [...src.matchAll(/path: '(\/[a-z0-9/_-]+)'/g)].map((m) => m[1] as string)
}

/** 设置页 tab id（鲸影系列）。 */
export function scanClientTabs(): string[] {
  const src = readFileSync(join(ROOT, 'src/client/index.ts'), 'utf8')
  return [...src.matchAll(/id: '(whale(-[a-z]+)?)'/g)].map((m) => m[1] as string)
}

export function gitFacts(): AuditFacts['git'] {
  try {
    const run = (args: string): string => execSync(`git ${args}`, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    return {
      branch: run('rev-parse --abbrev-ref HEAD'),
      commits: Number(run('rev-list --count HEAD')),
      lastCommit: run('log -1 --format=%s'),
      dirty: run('status --porcelain').length > 0,
    }
  } catch {
    return null
  }
}

/** 差距清单：项目自己知道的"下一步"。每条都能被 diff 追踪。 */
export function knownGaps(): GapRow[] {
  return [
    { id: 'lip-sync-live', item: '口型同步真实调用', status: 'waiting-key', note: '适配器+8 单测就绪，差一个可灵 key 跑真片' },
    { id: 'official-key-live', item: '可灵官方/百炼/豆包 ARK/万相视频真实生成', status: 'waiting-key', note: '五个适配器就绪，全部等真实 key' },
    { id: 'host-pool-wiring', item: 'UI 账号 → 运行时账号池接线', status: 'todo', note: 'vault/pool/pipeline 三件套已备好；host 全局池（启动时 loadPool → 工具调用走池）待接线' },
    { id: 'long-demo', item: '真实长片漫剧成片', status: 'todo', note: '现有 demo 为 mock/短镜；需先通一个视频通道' },
    { id: 'ui-eyes', item: '三个设置页 tab 人眼验证', status: 'todo', note: 'boot 与 API 已验证；UI 观感需用户在浏览器确认' },
    { id: 'promotion', item: '推广位（Discussions #2400 更新/发布说明）', status: 'todo', note: '能力已就绪，差内容更新' },
  ]
}

export function buildAudit(): AuditFacts {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { name: string; version: string }
  const stats = matrixStats()
  return {
    generatedAt: new Date().toISOString(),
    package: { name: pkg.name, version: pkg.version },
    git: gitFacts(),
    modules: scanModules(),
    tests: scanTests(),
    matrix: stats,
    providers: PROVIDER_MATRIX.map((m) => ({ ...m })),
    tools: scanTools(),
    routes: scanRoutes(),
    clientTabs: scanClientTabs(),
    presets: STORY_PRESETS.map((p) => ({ id: p.id, title: p.title, shots: p.shots.length })),
    gaps: knownGaps(),
  }
}
