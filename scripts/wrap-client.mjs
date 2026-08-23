// 官方 client-modules 注册协议（对齐 dsh-recommend 线上产物格式）：
// window.__ModuleLoader__.load({ id: "<包名>", factory: (require) => { ...CJS 主体... } })
// React 由加载器的 require("react") 提供，绝不打进 bundle。
// react/jsx-runtime：宿主只保证 react，这里注入内联 shim（指回 createElement）并替换 require。
import { readFileSync, writeFileSync } from 'node:fs'

const PKG_ID = '@hackerfish/dsh-video-studio'
const file = new URL('../lib/client/index.js', import.meta.url)
let body = readFileSync(file, 'utf8')

// 内联 jsx-runtime + react-dom shim（只依赖 require("react")，与加载器提供的 react 同源）
const JSX_SHIM = `    var __whale_jsx_runtime = (function () {
      var _r = require("react");
      var _e = function (type, props, key) { return _r.createElement(type, Object.assign({}, props, key !== undefined ? { key: key } : {})); };
      return { Fragment: _r.Fragment || "Fragment", jsx: _e, jsxs: _e, jsxDEV: _e };
    })();
    var __whale_react_dom = (function () {
      var _r = require("react");
      return { createPortal: function (children) { return children; }, flushSync: function (fn) { return fn(); }, findDOMNode: function () { return null; }, render: function () { return null; }, hydrate: function () { return null; }, unmountComponentAtNode: function () { return true; }, version: "18.0.0" };
    })();
`
// 替换所有 react/jsx-runtime 与 react-dom 引用（单双引号两种形态）
body = body.split('require("react/jsx-runtime")').join('__whale_jsx_runtime')
body = body.split("require('react/jsx-runtime')").join('__whale_jsx_runtime')
body = body.split('require("react-dom")').join('__whale_react_dom')
body = body.split("require('react-dom')").join('__whale_react_dom')

const wrapped = `window.__ModuleLoader__.load({\n  id: "${PKG_ID}",\n  factory: (require) => {\n    var module = { exports: {} };\n    var exports = module.exports;\n${JSX_SHIM}${body}\n    return module.exports;\n  }\n});\n`
writeFileSync(file, wrapped)
console.log('client bundle wrapped: __ModuleLoader__.load(' + PKG_ID + ') + jsx-runtime shim injected')
