// 官方 client-modules 注册协议（对齐 dsh-recommend 线上产物格式）：
// window.__ModuleLoader__.load({ id: "<包名>", factory: (require) => { ...CJS 主体... } })
// React 由加载器的 require("react") 提供，绝不打进 bundle。
import { readFileSync, writeFileSync } from 'node:fs'

const PKG_ID = '@hackerfish/dsh-video-studio'
const file = new URL('../lib/client/index.js', import.meta.url)
const body = readFileSync(file, 'utf8')
const wrapped = `window.__ModuleLoader__.load({\n  id: "${PKG_ID}",\n  factory: (require) => {\n    var module = { exports: {} };\n    var exports = module.exports;\n${body}\n    return module.exports;\n  }\n});\n`
writeFileSync(file, wrapped)
console.log('client bundle wrapped: __ModuleLoader__.load(' + PKG_ID + ')')
