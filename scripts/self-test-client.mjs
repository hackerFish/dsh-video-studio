// 客户端包自测：在 Node 里模拟 DSH 浏览器的 __ModuleLoader__ 加载协议，
// 把前三次踩过的坑（无注册调用 / module 未定义 / React 未外置 / 注册缺失）全部变成自动断言。
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'

const PKG_ID = '@hackerfish/dsh-video-studio'
const code = readFileSync(new URL('../lib/client/index.js', import.meta.url), 'utf8')

// ── 静态结构断言（官方协议逐项） ──
assert.ok(code.startsWith('window.__ModuleLoader__.load({'), '① 缺少 __ModuleLoader__.load 注册调用')
assert.ok(code.includes(`id: "${PKG_ID}"`), '② 包名 id 错误')
assert.ok(code.includes('var module = { exports: {} };'), '③ 缺 module 声明（会导致 module is not defined）')
assert.ok(code.includes('var exports = module.exports;'), '④ 缺 exports 声明')
assert.ok(code.includes('require("react")'), '⑤ React 未外置（必须由加载器提供）')
assert.ok(code.trimEnd().endsWith('});'), '⑥ 尾部结构错误')

// ── 动态模拟：执行 bundle，让假加载器调用 factory ──
const requireReal = createRequire(import.meta.url)
const loaded = { exports: null }
const fakeWindow = {
  __ModuleLoader__: {
    load(entry) {
      assert.equal(entry.id, PKG_ID, '加载器收到的 id 不匹配')
      loaded.exports = entry.factory((spec) => {
        if (spec === 'react') return requireReal('react')
        throw new Error('意外 require: ' + spec)
      })
    },
  },
}
// eslint-disable-next-line no-new-func
new Function('window', code)(fakeWindow)
assert.ok(loaded.exports, '⑦ factory 未被执行')
assert.equal(typeof loaded.exports.apply, 'function', '⑧ apply 导出缺失')
assert.ok(Array.isArray(loaded.exports.inject), '⑨ inject 导出缺失')

// ── apply(ctx) 冒烟：mock ctx，确认三处注册全部发生 ──
const registered = []
const ctx = {
  slots: {
    inject: (_slot, thunk) => { registered.push(thunk()); return () => {} },
    register: (opts) => ({ ...opts }),
  },
  effect: (fn) => { fn(); return () => {} },
  locale: { register: () => {}, bind: () => () => 'x' },
}
loaded.exports.apply(ctx)
assert.ok(registered.some((r) => r.id === 'whale'), '⑩ 「鲸影」标签未注册')
assert.ok(registered.some((r) => r.id === 'whale-workbench'), '⑪ 「鲸影工作台」未注册')
assert.ok(registered.some((r) => r.key === 'whale_generate_video'), '⑫ 视频卡片未注册')

console.log('✅ client 包自测通过：结构 6 项 + 加载 3 项 + 注册 3 项，共 12 项断言')
