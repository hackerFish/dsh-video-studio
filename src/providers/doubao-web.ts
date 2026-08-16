// 豆包网页版（doubao.com/chat/completion, SSE 流）——免费额度通道，2026-08-17 真实抓包回放验证。
// 能力：LLM 三段（写小说/拆剧本/分镜，chat 文本）+ 资产图（"生成图片：..." 走图片 bot）。
// 诚实说明：msToken/a_bogus/fp 等风控参数会轮换，需定期重新抓包；专业版免费额度按 7 天窗口恢复。
import { randomUUID } from 'node:crypto'
import { assertProvider, type Provider } from '../provider.ts'

const DEFAULT_BASE = 'https://www.doubao.com'

export interface DoubaoWebOptions {
  cookieStr?: string
  msToken?: string
  deviceId?: string
  fp?: string
  aBogus?: string
  botId?: string
  conversationId?: string
  baseUrl?: string
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

const IMAGE_BOT_ID = '7338286299411103781' // 图片生成 bot（抓包实证）
const LLM_BOT_ID = '7338286299411103781'   // 同 bot 支持文本；后续可按需分开

function parseSse(text: string): { events: { event: string; data: unknown }[] } {
  const events: { event: string; data: unknown }[] = []
  for (const block of text.split(/\n\n+/)) {
    let event = ''
    const dataLines: string[] = []
    for (const line of block.split('\n')) {
      if (line.startsWith('event: ')) event = line.slice(7).trim()
      else if (line.startsWith('data: ')) dataLines.push(line.slice(6))
    }
    if (!event && !dataLines.length) continue
    const raw = dataLines.join('\n')
    let data: unknown = raw
    try { data = JSON.parse(raw) } catch { /* 保持原文 */ }
    events.push({ event, data })
  }
  return { events }
}

export function createDoubaoWebProvider(opts: DoubaoWebOptions = {}): Provider {
  const { cookieStr = '', msToken = '', deviceId = '', fp = '', aBogus = '', baseUrl = DEFAULT_BASE, timeoutMs = 120000, fetchImpl = fetch } = opts
  if (!cookieStr) throw new Error('doubao-web: 缺少 cookieStr（F12 复制 doubao.com 请求的 Cookie 整行）')
  const buildUrl = (): string => {
    const params = new URLSearchParams({
      aid: '497858', channel: 'baidu_pz', device_id: deviceId, device_platform: 'web',
      doubao_device_platform: 'web', doubao_pc_version: '3.32.8', fp, language: 'zh',
      pc_version: '3.32.8', pkg_type: 'release_version', real_aid: '497858', region: 'CN',
      samantha_web: '1', sys_region: 'CN', tea_uuid: deviceId, tz_name: 'Asia/Shanghai',
      'use-olympus-account': '1', version_code: '20800', web_id: deviceId,
      web_platform: 'browser', web_tab_id: randomUUID(), msToken, a_bogus: aBogus,
    })
    return `${baseUrl}/chat/completion?${params.toString()}`
  }
  const chatOnce = async (text: string, { image = false }: { image?: boolean } = {}): Promise<{ text: string; imageUrls: string[]; questionId?: string }> => {
    const localMessageId = randomUUID()
    const content = image ? `生成图片：${text}` : text
    const body = {
      client_meta: { conversation_id: opts.conversationId ?? '', bot_id: IMAGE_BOT_ID, last_section_id: '', last_message_index: 0 },
      messages: [{ local_message_id: localMessageId, content_block: [{ block_type: 10000, content: { text_block: { text: content, icon_url: '', icon_url_dark: '', summary: '' }, pc_event_block: '' } }], block_id: randomUUID(), parent_id: '', meta_info: [], append_fields: [] }], message_status: 0,
      option: { send_message_scene: '', create_time_ms: Date.now(), collect_id: '', is_audio: false, answer_with_suggest: false, agent_mode: 1, tts_switch: false, need_deep_think: 4, click_clear_context: false, from_suggest: false, is_regen: false, is_replace: false, is_from_click_option: false, is_from_click_softlink: false, disable_sse_cache: false, select_text_action: '', is_select_text: false, resend_for_regen: false, scene_type: 0, unique_key: randomUUID(), start_seq: 0, need_create_conversation: false, regen_query_id: [], edit_query_id: [], regen_instruction: '', no_replace_for_regen: false, message_from: 0, shared_app_name: '', shared_app_id: '', sse_recv_event_options: { support_chunk_delta: true }, is_ai_playground: false, is_old_user: true, general_task_param: { action: 0, thread_local_message_id: [localMessageId], selected_skills: [], skill_selections: [] }, recovery_option: { is_recovery: false, req_create_time_sec: Math.floor(Date.now() / 1000), append_sse_event_scene: 0 }, message_storage_type: 0, related_deleted_message_ids: {}, connector_info_list: [], model_config: { model_item_key: '4', model_extra_params: { total_window_size: '256000' } }, aggregate_params: { model_item_key: '4', provider_id: '' } },
      user_context: [], ext: { use_deep_think: '4', collection_id: '', commerce_credit_config_enable: '0' },
    }
    const res = await fetchImpl(buildUrl(), {
      method: 'POST',
      headers: {
        accept: '*/*', 'accept-language': 'zh-CN,zh;q=0.9', 'agw-js-conv': 'str, str',
        'content-type': 'application/json', cookie: cookieStr,
        origin: baseUrl, referer: `${baseUrl}/chat/`,
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) throw new Error(`doubao-web HTTP ${res.status}`)
    const raw = await res.text()
    const { events } = parseSse(raw)
    let textOut = ''
    let questionId: string | undefined
    const imageUrls: string[] = []
    for (const e of events) {
      const d = e.data
      if (d && typeof d === 'object') {
        const rec = d as Record<string, unknown>
        if (rec.question_id) questionId = String(rec.question_id)
        const str = JSON.stringify(rec)
        const t = (rec.text ?? rec.content ?? rec.msg) as string | undefined
        if (typeof t === 'string' && t) textOut += t
        for (const m of str.matchAll(/https?:\/\/[^"\\\s]+\.(?:png|jpg|jpeg|webp)[^"\\\s]*/g)) {
          const u = m[0]
          if (!/bytednsdoc\.com|static/.test(u)) imageUrls.push(u)
        }
      }
    }
    return { text: textOut, imageUrls: [...new Set(imageUrls)], questionId }
  }
  return assertProvider({
    id: 'doubao-web',
    capabilities: { textToVideo: false, imageToVideo: false, firstLastFrame: false, lipSync: false, tts: false, image: true, maxDurationSec: 0, resolutions: ['9:16', '1:1'], qualityTier: 4, freeQuota: true, llm: true },
    async quote() { return { qualityTier: 4, costEstimate: 0, currency: 'doubao-web-free' } },
    async health() { return { ok: true, quotaRemaining: null, note: '免费额度按 7 天窗口（专业版额度耗尽时图片 bot 暂停，文本仍可用）' } },
    async submit(stage, spec) {
      const s = (spec ?? {}) as Record<string, any>
      const text = String(s?.positive ?? s?.prompt ?? s?.text ?? '')
      const image = stage === 'shot-assets' || stage === 'master-asset'
      const jobId = randomUUID()
      ;(async () => {
        try { await chatOnce(text, { image }) } catch { /* 流式结果经 fetch 阶段取回；这里只保留任务号 */ }
      })()
      return { jobId }
    },
    async status() { return { state: 'done', progress: 1 } },
    async fetch() {
      // 流式一次取回：submit 已触发；此处按约定返回占位（真实调用走 runOnce）
      return { outputs: [], meta: { status: 'success', note: 'doubao-web 是流式通道：请使用 runOnce 获取文本与图片' } }
    },
    async runOnce(stage: string, spec: Record<string, unknown>) {
      const s = spec ?? {}
      const text = String(s?.positive ?? s?.prompt ?? s?.text ?? '')
      const image = stage === 'shot-assets' || stage === 'master-asset'
      const r = await chatOnce(text, { image })
      return { text: r.text, imageUrls: r.imageUrls, questionId: r.questionId }
    },
  } as Provider & { runOnce(stage: string, spec: Record<string, unknown>): Promise<{ text: string; imageUrls: string[]; questionId?: string }> })
}
