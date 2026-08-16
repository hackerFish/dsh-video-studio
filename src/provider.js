// Provider 接口与能力注册表（薄抽象：新增供应商只加一个适配器文件）
export const PROVIDER_CAPABILITIES = {
  textToVideo: '文生视频',
  imageToVideo: '图生视频',
  firstLastFrame: '首尾帧控制',
  lipSync: '口型同步',
  tts: '配音',
  image: '文生图（分镜静帧）',
}

export function assertProvider(p) {
  for (const m of ['id', 'capabilities', 'quote', 'submit', 'status', 'fetch', 'health']) {
    if (typeof p[m] === 'undefined') throw new Error(`provider ${p?.id ?? '?'} 缺少方法/字段: ${m}`)
  }
  return p
}

export function route(providers, need, preferCost = false) {
  // 能力路由：need 为 {imageToVideo:true,...}；按 preferCost(省钱) 或质量优先排序
  const ok = providers.filter((p) => Object.entries(need).every(([k, v]) => !v || p.capabilities[k]))
  if (!ok.length) return null
  ok.sort((a, b) => {
    const ta = a.capabilities.qualityTier ?? 5
    const tb = b.capabilities.qualityTier ?? 5
    return preferCost ? ta - tb : tb - ta
  })
  return ok[0]
}
