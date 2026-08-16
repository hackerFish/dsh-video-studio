// 导演层 → ComfyUI workflow JSON（API 格式：节点 id → {class_type, inputs}）
// 保守策略：默认模板是"结构性占位"骨架，变量替换后仍需要用户按自己安装的节点包
// 填写 checkpoint 与视频节点名；社区模板可放入 templates/comfyui/ 复用。
export const DEFAULT_TEMPLATE = {
  '1': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: '{{checkpoint}}' } },
  '2': { class_type: 'CLIPTextEncode', inputs: { text: '{{positive}}', clip: ['1', 1] } },
  '3': { class_type: 'CLIPTextEncode', inputs: { text: '{{negative}}', clip: ['1', 1] } },
  '4': { class_type: 'REPLACE_WITH_VIDEO_SAMPLER_NODE', inputs: {
    width: '{{width}}', height: '{{height}}', length: '{{frames}}', batch_size: 1, seed: '{{seed}}',
    positive: ['2', 0], negative: ['3', 0], model: ['1', 0],
  } },
  '5': { class_type: 'VAEDecode', inputs: { samples: ['4', 0], vae: ['1', 2] } },
  '6': { class_type: 'SaveVideo', inputs: { filename_prefix: 'whale/{{shotId}}', fps: '{{fps}}', images: ['5', 0] } },
}

function applyVars(node, vars) {
  const walk = (v) => {
    if (typeof v === 'string') {
      const exact = v.match(/^\{\{(\w+)\}\}$/)
      if (exact && typeof vars[exact[1]] === 'number') return vars[exact[1]] // 整值占位符保留数字类型
      return v.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
    }
    if (Array.isArray(v)) return v.map(walk)
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]))
    return v
  }
  return walk(node)
}

export function buildWorkflow({ checkpoint, positive, negative, width = 1080, height = 1920, frames = 121, fps = 24, seed, shotId = 'shot-01', workflowTemplate = DEFAULT_TEMPLATE } = {}) {
  const vars = {
    checkpoint: checkpoint ?? 'REPLACE_WITH_CHECKPOINT_NAME',
    positive: positive ?? '', negative: negative ?? '',
    width, height, frames, fps,
    seed: seed ?? Math.floor(Math.random() * 1e9),
    shotId,
  }
  return Object.fromEntries(
    Object.entries(workflowTemplate).map(([nid, node]) => [nid, applyVars(node, vars)]),
  )
}

export function validateWorkflow(wf) {
  const errors = []
  if (!wf || typeof wf !== 'object' || Array.isArray(wf)) return ['workflow 必须是节点对象']
  for (const [nid, node] of Object.entries(wf)) {
    if (!node || typeof node.class_type !== 'string' || !node.class_type) errors.push(`节点 ${nid} 缺 class_type`)
    if (node.class_type.includes('REPLACE_')) errors.push(`节点 ${nid} 含未替换占位: ${node.class_type}`)
    if (node.inputs && typeof node.inputs !== 'object') errors.push(`节点 ${nid} inputs 非法`)
  }
  return errors
}
