// host 运行时单例：凭证保险库 + 账号池，工具与路由共用同一实例——
// 跨调用保持额度/冷却状态，UI 增删账号后下一次工具调用自动重建池。

import { CredentialStore } from '../accounts/store.ts'
import { AccountPool } from '../quota/scheduler.ts'

let vault: CredentialStore | null = null
let pool: AccountPool | null = null

/** 懒加载保险库（首次打开失败会在调用点带错误信息抛出）。 */
export function runtimeVault(): CredentialStore {
  vault ??= CredentialStore.open()
  return vault
}

/** 账号池（从保险库载入已持久化的额度/健康状态，凭据按 id 回填）。 */
export function runtimePool(): AccountPool {
  pool ??= new AccountPool(runtimeVault().loadPool())
  return pool
}

/** UI 增删账号后调用：废弃旧池，下次工具调用按最新账号重建。 */
export function invalidatePool(): void {
  pool = null
}

/** 工具调用结束后把池状态（额度/冷却）落回保险库，重启不断账。 */
export function persistPool(): void {
  if (pool) runtimeVault().savePool(pool.snapshot())
}
