// react/jsx-runtime 兜底 shim：宿主只保证提供 react；React Flow 内部用 jsx-runtime，
// 这里把它指回 createElement，保证客户端包无意外外部依赖。
import { createElement, Fragment } from 'react'

export { Fragment }

export function jsx(type: any, props: any, key?: any): any {
  return createElement(type, { ...props, key })
}

export function jsxs(type: any, props: any, key?: any): any {
  return createElement(type, { ...props, key })
}

export function jsxDEV(type: any, props: any, key?: any): any {
  return createElement(type, { ...props, key })
}
