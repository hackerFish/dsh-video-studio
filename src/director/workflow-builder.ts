// Director decisions → ComfyUI workflow JSON (node id → {class_type, inputs}).
export interface WorkflowNode {
  class_type: string
  inputs?: Record<string, unknown>
}
export type Workflow = Record<string, WorkflowNode>

export const DEFAULT_TEMPLATE: Workflow = {
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

type Vars = Record<string, string | number>

function applyVars(node: WorkflowNode, vars: Vars): WorkflowNode {
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') {
      const exact = v.match(/^\{\{(\w+)\}\}$/)
      if (exact && typeof vars[exact[1]] === 'number') return vars[exact[1]]
      return v.replace(/\{\{(\w+)\}\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
    }
    if (Array.isArray(v)) return v.map(walk)
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, walk(x)]))
    return v
  }
  return walk(node) as WorkflowNode
}

export interface BuildWorkflowOptions {
  checkpoint?: string
  positive?: string
  negative?: string
  width?: number
  height?: number
  frames?: number
  fps?: number
  seed?: number
  shotId?: string
  workflowTemplate?: Workflow
}

export function buildWorkflow(opts: BuildWorkflowOptions = {}): Workflow {
  const {
    checkpoint, positive = '', negative = '', width = 1080, height = 1920,
    frames = 121, fps = 24, seed, shotId = 'shot-01', workflowTemplate = DEFAULT_TEMPLATE,
  } = opts
  const vars: Vars = {
    checkpoint: checkpoint ?? 'REPLACE_WITH_CHECKPOINT_NAME',
    positive, negative, width, height, frames, fps,
    seed: seed ?? Math.floor(Math.random() * 1e9),
    shotId,
  }
  return Object.fromEntries(
    Object.entries(workflowTemplate).map(([nid, node]) => [nid, applyVars(node, vars)]),
  )
}

export function validateWorkflow(wf: Workflow): string[] {
  const errors: string[] = []
  if (!wf || typeof wf !== 'object' || Array.isArray(wf)) return ['workflow 必须是节点对象']
  const walk = (v: unknown, nid: string): void => {
    if (typeof v === 'string' && v.includes('REPLACE_')) errors.push(`节点 ${nid} 含未替换占位: ${v}`)
    else if (Array.isArray(v)) v.forEach((x) => walk(x, nid))
    else if (v && typeof v === 'object') Object.values(v as Record<string, unknown>).forEach((x) => walk(x, nid))
  }
  for (const [nid, node] of Object.entries(wf)) {
    if (!node || typeof node.class_type !== 'string' || !node.class_type) errors.push(`节点 ${nid} 缺 class_type`)
    if (node.class_type.includes('REPLACE_')) errors.push(`节点 ${nid} 含未替换占位: ${node.class_type}`)
    if (node.inputs && typeof node.inputs !== 'object') errors.push(`节点 ${nid} inputs 非法`)
    if (node.inputs) walk(node.inputs, nid)
  }
  return errors
}

/** 文生图模板（角色三视图/场景/道具通用）：ckpt → 正负 CLIP → EmptyLatent → KSampler → VAE → SaveImage。 */
export const IMAGE_TEMPLATE: Workflow = {
  '1': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: '{{checkpoint}}' } },
  '2': { class_type: 'CLIPTextEncode', inputs: { text: '{{positive}}', clip: ['1', 1] } },
  '3': { class_type: 'CLIPTextEncode', inputs: { text: '{{negative}}', clip: ['1', 1] } },
  '4': { class_type: 'EmptyLatentImage', inputs: { width: '{{width}}', height: '{{height}}', batch_size: 1 } },
  '5': { class_type: 'KSampler', inputs: {
    seed: '{{seed}}', steps: '{{steps}}', cfg: '{{cfg}}', sampler_name: '{{sampler}}', scheduler: '{{scheduler}}',
    denoise: 1, model: ['1', 0], positive: ['2', 0], negative: ['3', 0], latent_image: ['4', 0],
  } },
  '6': { class_type: 'VAEDecode', inputs: { samples: ['5', 0], vae: ['1', 2] } },
  '7': { class_type: 'SaveImage', inputs: { filename_prefix: 'whale/{{shotId}}', images: ['6', 0] } },
}

export interface BuildImageWorkflowOptions {
  checkpoint?: string
  positive?: string
  negative?: string
  width?: number
  height?: number
  steps?: number
  cfg?: number
  sampler?: string
  scheduler?: string
  seed?: number
  shotId?: string
}

/** 角色三视图/单图通用文生图 workflow（本地 ComfyUI 执行）。 */
export function buildImageWorkflow(opts: BuildImageWorkflowOptions = {}): Workflow {
  const {
    checkpoint, positive = '', negative = '',
    width = 1024, height = 1024, steps = 30, cfg = 7,
    sampler = 'euler', scheduler = 'normal', seed, shotId = 'character-sheet',
  } = opts
  const vars: Vars = {
    checkpoint: checkpoint ?? 'REPLACE_WITH_CHECKPOINT_NAME',
    positive, negative, width, height, steps, cfg, sampler, scheduler,
    seed: seed ?? Math.floor(Math.random() * 1e9), shotId,
  }
  return Object.fromEntries(Object.entries(IMAGE_TEMPLATE).map(([nid, node]) => [nid, applyVars(node, vars)]))
}
