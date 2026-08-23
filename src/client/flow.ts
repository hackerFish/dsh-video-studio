// 节点式工作流画布（ComfyUI 式）：@xyflow/react，流水线七段节点 + 连线 + 单节点运行。
// 节点运行复用 /storyboard、/generate 端点；结果图挂在节点下。
import { createElement, useState, useCallback } from 'react'
import { ReactFlow, Background, Controls, Handle, Position, MarkerType, useNodesState, useEdgesState } from '@xyflow/react'

// React Flow 最小必要样式（避免引入整份 CSS，client 加载器只跑 JS）
const FLOW_CSS = `
.react-flow__handle { width: 10px; height: 10px; background: #4176e6; border: 2px solid #fff; border-radius: 50%; }
.react-flow__edge-path { stroke: #9aa5b1; stroke-width: 2; }
.react-flow__controls { box-shadow: 0 1px 4px rgba(0,0,0,.15); border-radius: 8px; overflow: hidden; }
.react-flow__controls button { width: 28px; height: 28px; background: #fff; border: 0; border-bottom: 1px solid #e5e7eb; cursor: pointer; }
.react-flow__minimap { border-radius: 8px; overflow: hidden; }
`

// 节点运行端点映射：stage → host 路由
const STAGE_ENDPOINT: Record<string, string> = {
  storyboard: '/dsh-video-studio/storyboard',
  scene: '/dsh-video-studio/generate',
  props: '/dsh-video-studio/generate',
  'per-shot': '/dsh-video-studio/generate',
  video: '/dsh-video-studio/generate',
  'final-cut': '/dsh-video-studio/generate',
}

// 自定义节点：标题 + 提示词输入 + 引擎选择 + 运行 + 结果
function StageNode({ data, selected }: any): any {
  const [prompt, setPrompt] = useState(data.prompt ?? '')
  const [busy, setBusy] = useState(false)
  const run = useCallback(async () => {
    setBusy(true)
    try {
      const isStory = data.stage === 'storyboard'
      const body = isStory
        ? { outline: prompt, charactersText: data.charactersText ?? '', style: data.style ?? '', aspectRatio: data.ratio ?? '16:9' }
        : { prompt, aspectRatio: data.ratio ?? '16:9', durationSec: 5 }
      const res = await fetch(STAGE_ENDPOINT[data.stage] ?? '/dsh-video-studio/generate', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
      })
      const j = await res.json()
      data.onResult(data.stage, j)
    } catch (e) {
      data.onResult(data.stage, { ok: false, error: String((e as Error)?.message ?? e) })
    } finally { setBusy(false) }
  }, [prompt, data])
  const r = data.result
  return createElement('div', {
    style: {
      width: 280, border: selected ? '2px solid #4176e6' : '1px solid #d0d5dd', borderRadius: 12,
      background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.08)', padding: 12, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13,
    },
  },
    createElement(Handle, { type: 'target', position: Position.Top }),
    createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
      createElement('strong', { style: { fontSize: 13 } }, data.icon + ' ' + data.label),
      createElement('span', { style: { fontSize: 10, opacity: 0.5 } }, data.stage)),
    createElement('textarea', {
      value: prompt, onChange: (e: any) => setPrompt(e.target.value), rows: data.stage === 'storyboard' ? 3 : 2,
      placeholder: data.stage === 'storyboard' ? '大纲（或角色清单）' : '提示词',
      style: { width: '100%', boxSizing: 'border-box', padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(0,0,0,.18)', fontSize: 12, fontFamily: 'inherit' },
    }),
    createElement('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
      createElement('button', {
        onClick: run, disabled: busy,
        style: { border: 'none', borderRadius: 6, background: busy ? '#9aa5b1' : '#2ea043', color: '#fff', padding: '3px 12px', cursor: 'pointer', fontSize: 12 },
      }, busy ? '运行中…' : '▶ 运行'),
      createElement('span', { style: { fontSize: 10, opacity: 0.6 } }, data.engine ?? 'auto')),
    r && (r.ok
      ? (r.shots
          ? createElement('div', { style: { fontSize: 11, background: 'rgba(46,160,67,.1)', borderRadius: 6, padding: 4 } }, '分镜 ' + r.shots.length + ' 镜已生成')
          : r.url
            ? createElement('img', { src: r.url, alt: 'out', style: { width: '100%', borderRadius: 6, border: '1px solid rgba(0,0,0,.1)' } })
            : createElement('div', { style: { fontSize: 11, opacity: 0.7 } }, '✅ 完成'))
      : createElement('div', { role: 'alert', style: { fontSize: 11, color: r?.status === 'quota-paused' ? '#b3870e' : '#c83c3c' } },
          (r?.status ?? 'error') + ': ' + (r?.error ?? r?.message ?? ''))),
    createElement(Handle, { type: 'source', position: Position.Bottom }),
  )
}

const NODE_TYPES = { stage: StageNode }

export function WhaleFlow(_props: any): any {
  const [resultMap, setResultMap] = useState<Record<string, any>>({})
  const onResult = useCallback((stage: string, j: any) => {
    setResultMap((m) => ({ ...m, [stage]: j }))
  }, [])
  const initNodes = [
    { id: 'storyboard', type: 'stage', position: { x: 0, y: 0 }, data: { stage: 'storyboard', label: '分镜', icon: '📋', prompt: '三年前你们踩我出局，今天我让你们所有人求我回来。\n苏婉，这份做空报告，你确定要发？', onResult } },
    { id: 'scene', type: 'stage', position: { x: 0, y: 170 }, data: { stage: 'scene', label: '场景主图', icon: '🏞️', prompt: '雨夜十字路口，霓虹倒影，车流光轨', onResult } },
    { id: 'props', type: 'stage', position: { x: 0, y: 340 }, data: { stage: 'props', label: '道具图', icon: '🎒', prompt: '一支旧手机，屏幕亮着 K 线', onResult } },
    { id: 'per-shot', type: 'stage', position: { x: 0, y: 510 }, data: { stage: 'per-shot', label: '逐镜资产图', icon: '🎞️', prompt: '林越雨夜骑手装站在十字路口，霓虹背光', onResult } },
    { id: 'video', type: 'stage', position: { x: 0, y: 680 }, data: { stage: 'video', label: '视频', icon: '🎬', prompt: '林越雨夜骑手装站在十字路口，霓虹背光，雨丝清晰', onResult } },
    { id: 'final-cut', type: 'stage', position: { x: 0, y: 850 }, data: { stage: 'final-cut', label: '成片', icon: '✂️', prompt: '全片剪辑合成', onResult } },
  ].map((n: any) => ({ ...n, data: { ...n.data, result: resultMap[n.id] } }))
  const initEdges: import('@xyflow/react').Edge[] = [
    { id: 'e1', source: 'storyboard', target: 'scene', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e2', source: 'scene', target: 'props', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e3', source: 'props', target: 'per-shot', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e4', source: 'per-shot', target: 'video', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e5', source: 'video', target: 'final-cut', markerEnd: { type: MarkerType.ArrowClosed } },
  ]
  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges)
  const addNode = () => {
    const id = 'custom-' + Date.now()
    setNodes((nds: any[]) => [...nds, {
      id, type: 'stage', position: { x: 120 + Math.random() * 240, y: 60 + Math.random() * 200 },
      data: { stage: 'per-shot', label: '自定义节点', icon: '🔧', prompt: '自定义提示词', onResult, onDelete: () => setNodes((cur: any[]) => cur.filter((n) => n.id !== id)) },
    }])
  }
  const exportJson = () => {
    const payload = { kind: 'whale-flow', version: 1, nodes: nodes.map((n: any) => ({ id: n.id, stage: n.data?.stage, label: n.data?.label, prompt: n.data?.prompt, x: n.position?.x, y: n.position?.y })), edges: edges.map((e: any) => ({ id: e.id, source: e.source, target: e.target })) }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'whale-workflow.json'; a.click()
  }
  const importJson = (ev: any) => {
    const file = ev.target?.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const j = JSON.parse(String(reader.result))
        // 兼容 ComfyUI workflow：{nodeId: {class_type, inputs}} 形态
        const comfy = j && !Array.isArray(j) && !j.kind && Object.values(j).every((v: any) => v && typeof v === 'object' && v.class_type)
        if (comfy) {
          const imported = Object.entries(j).map(([id, v]: [string, any], i: number) => {
            const inputs = v.inputs ?? {}
            const promptVal = Object.values(inputs).find((x) => typeof x === 'string') ?? v.class_type
            return {
              id: 'comfy-' + id, type: 'stage', position: { x: (i % 3) * 320, y: Math.floor(i / 3) * 200 },
              data: { stage: 'per-shot', label: String(v.class_type ?? '节点'), icon: '🧩', prompt: String(promptVal), onResult, onDelete: () => setNodes((cur: any[]) => cur.filter((n) => n.id !== 'comfy-' + id)) },
            }
          })
          setNodes(imported)
          setEdges([])
        } else if (j.kind === 'whale-flow') {
          const imported = (j.nodes ?? []).map((n: any) => ({ id: n.id, type: 'stage', position: { x: n.x ?? 0, y: n.y ?? 0 }, data: { stage: n.stage ?? 'per-shot', label: n.label ?? '节点', icon: '🔧', prompt: n.prompt ?? '', onResult, onDelete: () => setNodes((cur: any[]) => cur.filter((x) => x.id !== n.id)) } }))
          setNodes(imported)
          setEdges((j.edges ?? []).map((e: any) => ({ id: e.id, source: e.source, target: e.target, markerEnd: { type: MarkerType.ArrowClosed } })))
        }
      } catch (e) { window.alert('导入失败: ' + String((e as Error)?.message ?? e)) }
      ev.target.value = ''
    }
    reader.readAsText(file)
  }
  const toolbarBtn = { border: '1px solid rgba(0,0,0,.2)', borderRadius: 6, background: '#fff', cursor: 'pointer', padding: '3px 10px', fontSize: 12 }
  return createElement('div', { style: { width: '100%', height: '100%', minHeight: 640, position: 'relative', display: 'flex', flexDirection: 'column' } },
    createElement('style', null, FLOW_CSS),
    createElement('div', { style: { display: 'flex', gap: 8, padding: '6px 8px', borderBottom: '1px solid rgba(0,0,0,.08)', alignItems: 'center' } },
      createElement('button', { onClick: addNode, style: toolbarBtn }, '＋ 添加节点'),
      createElement('button', { onClick: exportJson, style: toolbarBtn }, '⬇ 导出 JSON'),
      createElement('label', { style: toolbarBtn, cursor: 'pointer' },
        '⬆ 导入 JSON（兼容 ComfyUI workflow）',
        createElement('input', { type: 'file', accept: '.json', onChange: importJson, style: { display: 'none' } })),
      createElement('span', { style: { fontSize: 11, opacity: 0.55 } }, '节点=生成步骤；ComfyUI workflow 可导入为节点；连线=数据流'),
    ),
    createElement('div', { style: { flex: 1, position: 'relative' } },
      createElement(ReactFlow, {
        nodes, edges, nodeTypes: NODE_TYPES as any,
        onNodesChange, onEdgesChange,
        fitView: true, fitViewOptions: { padding: 0.2 }, minZoom: 0.3, maxZoom: 1.6,
      },
        createElement(Background, { gap: 24 }),
        createElement(Controls, null),
      ),
    ),
  )
}
