// 预置漫剧内容包：一装即有可演示的题材。
// 每套含 故事梗概 + 风格 DNA + 角色卡 + 场景卡 + 分镜脚本（台词/画面/时长），
// presetToScript 直接产出流水线可用的 Script（与 runPipeline 对齐）。
// 全部双语文案，风格 DNA 走 PROMPT-ENGINEERING.md 的区块结构。

import type { Script, ScriptShot } from '../director/pipeline.ts'

export interface CharacterCard {
  id: string
  name: string
  nameEn: string
  archetype: string
  appearance: string
  voiceHint: string
}

export interface SceneCard {
  id: string
  name: string
  nameEn: string
  description: string
  camera: string
}

export interface PresetShot {
  line: string
  prompt: string
  characterId?: string
  sceneId?: string
  durationSec?: number
}

export interface StoryPreset {
  id: string
  title: string
  titleEn: string
  genre: string
  logline: string
  hook: string
  styleDna: string
  characters: CharacterCard[]
  scenes: SceneCard[]
  shots: PresetShot[]
}

export const STORY_PRESETS: StoryPreset[] = [
  {
    id: 'comeback-latte',
    title: '逆袭：从外卖员到顶级操盘手',
    titleEn: 'Comeback: From Delivery Rider to Top Trader',
    genre: '都市逆袭 / City Comeback',
    logline: '被资本踢出局的天才操盘手沦落送外卖，靠一部旧手机杀回巅峰。',
    hook: '三年前你们踩我出局，今天我让你们所有人求我回来。',
    styleDna: '3D 国漫写实，电影级都市夜景，冷色霓虹与暖色室光对比，浅景深，微尘质感，85mm 镜头语言',
    characters: [
      {
        id: 'lin', name: '林越', nameEn: 'Lin Yue', archetype: '逆袭男主',
        appearance: '28 岁男性，利落黑色短发，高鼻薄唇，藏青冲锋衣，眼神冷峻带倦意，身形精瘦挺拔',
        voiceHint: '低沉，语速 1.0，情绪克制',
      },
      {
        id: 'su', name: '苏婉', nameEn: 'Su Wan', archetype: '女主/分析师',
        appearance: '26 岁女性，深棕长直发，米色风衣，银框眼镜，冷静专业，嘴角带一丝不服输',
        voiceHint: '清亮，语速 1.1，尾音坚定',
      },
    ],
    scenes: [
      { id: 'street', name: '雨夜街头', nameEn: 'Rainy Street', description: '雨夜骑手视角的十字路口，霓虹倒影在积水上，车流拉出光轨', camera: '低机位跟拍，浅景深，前景雨丝' },
      { id: 'office', name: '旧交易室', nameEn: 'Old Trading Room', description: '深夜空荡的交易大厅，六块屏幕亮着 K 线，窗外城市灯火', camera: '广角定场，推向人物背影' },
    ],
    shots: [
      { line: '三年前你们踩我出局，今天我让你们所有人求我回来。', prompt: '林越雨夜骑手装站在十字路口，摘下头盔，冷峻眼神直视镜头，霓虹背光，雨丝清晰', characterId: 'lin', sceneId: 'street', durationSec: 5 },
      { line: '苏婉，这份做空报告，你确定要发？', prompt: '苏婉在交易室屏幕前转身，银框眼镜反射 K 线红光，神情凝重', characterId: 'su', sceneId: 'office', durationSec: 4 },
      { line: '林越？你消失三年，就是为了送外卖？', prompt: '苏婉举着手机看外卖订单界面，抬头震惊，画面切到门口站着的林越', characterId: 'su', sceneId: 'office', durationSec: 4 },
      { line: '送外卖是工作，操盘是本能。', prompt: '林越单手扶门框，逆光剪影，嘴角微扬，交易室屏幕在他身后亮起', characterId: 'lin', sceneId: 'office', durationSec: 5 },
      { line: '明天开盘，让空头见识一下什么叫逼空。', prompt: '林越指尖划过手机屏幕，K 线开始拉升，冷色城市夜景窗外', characterId: 'lin', sceneId: 'office', durationSec: 5 },
    ],
  },
  {
    id: 'xianxia-sword',
    title: '仙门弃徒：剑出昆仑',
    titleEn: 'Abandoned Disciple: Sword Out of Kunlun',
    genre: '古风仙侠 / Xianxia',
    logline: '被逐出昆仑的废灵根少年，体内封印着上古剑灵，一剑开天门。',
    hook: '废我灵根，逐我出山门，今日我便以凡人之躯，问剑昆仑。',
    styleDna: '国风仙侠次世代建模，水墨晕染天空，云海翻涌，剑气粒子流光，暖金与青黛对比色',
    characters: [
      {
        id: 'chen', name: '陈玄', nameEn: 'Chen Xuan', archetype: '废灵根主角',
        appearance: '19 岁少年，灰白麻衣，黑发束起凌乱，眉心一道淡金剑纹，背负无鞘铁剑',
        voiceHint: '少年音，语速 1.1，清越',
      },
      {
        id: 'shizun', name: '青梧真人', nameEn: 'Master Qingwu', archetype: '仙门长老/反派',
        appearance: '白发道人，月白道袍，手执拂尘，眉目威严，周身环绕青色灵气',
        voiceHint: '苍老沉稳，语速 0.9',
      },
    ],
    scenes: [
      { id: 'kunlun', name: '昆仑山门', nameEn: 'Kunlun Gate', description: '万级白玉石阶直入云海，山门悬金匾，仙鹤掠过', camera: '仰拍山门，威严压迫感' },
      { id: 'cliff', name: '断魂崖', nameEn: 'Soul Cliff', description: '孤峰绝壁，云海如海，崖边古松半枯', camera: '大远景到中景，风动衣襟' },
    ],
    shots: [
      { line: '陈玄，你灵根已废，留在昆仑也是累赘。', prompt: '青梧真人立于昆仑山门前，拂尘一摆，俯视台阶下的少年', characterId: 'shizun', sceneId: 'kunlun', durationSec: 4 },
      { line: '废我灵根，逐我出山门，今日我便以凡人之躯，问剑昆仑。', prompt: '陈玄单膝跪地又缓缓站起，拔出无鞘铁剑，剑身燃起金色纹路，云海翻涌', characterId: 'chen', sceneId: 'kunlun', durationSec: 6 },
      { line: '剑灵……原来你从未沉睡。', prompt: '断魂崖边，陈玄盘坐，眉心剑纹亮起，身后浮现上古剑灵虚影', characterId: 'chen', sceneId: 'cliff', durationSec: 4 },
      { line: '三年后，我会回来拿回属于我的一切。', prompt: '陈玄背对镜头立于崖边，衣袂翻飞，天边一线金光破云', characterId: 'chen', sceneId: 'cliff', durationSec: 5 },
    ],
  },
  {
    id: 'suspense-last-train',
    title: '末班车：第13号乘客',
    titleEn: 'The Last Train: Passenger No.13',
    genre: '悬疑反转 / Suspense Twist',
    logline: '末班地铁只有 12 个座位，却坐下了 13 个人——多出来的那个，认识所有人。',
    hook: '这班车从来只有 12 个乘客，那第 13 个，是谁？',
    styleDna: '电影级悬疑写实，车厢冷白灯管，阴影浓重，颗粒胶片质感，缓慢推拉镜头',
    characters: [
      {
        id: 'xia', name: '夏眠', nameEn: 'Xia Mian', archetype: '失眠侦探',
        appearance: '32 岁女性，黑色短发齐耳，灰风衣，眼下乌青，手里永远攥着一支录音笔',
        voiceHint: '沙哑，语速 0.95，疲惫',
      },
      {
        id: 'zero', name: '第13号乘客', nameEn: 'Passenger No.13', archetype: '神秘人',
        appearance: '性别不明，黑色长风衣立领遮半张脸，白手套，鞋底沾着不属于本市的红泥',
        voiceHint: '机械感，语速 0.8，无感情',
      },
    ],
    scenes: [
      { id: 'train', name: '末班车厢', nameEn: 'Last Train Car', description: '老式地铁车厢，灯管频闪，两侧座椅，车窗反光叠影', camera: '过道低机位横移，监控视角穿插' },
      { id: 'platform', name: '无人站台', nameEn: 'Empty Platform', description: '终点站台，立柱阴影拉长，指示牌显示 00:00', camera: '固定广角，人物入画' },
    ],
    shots: [
      { line: '12 个座位，13 个人。第 13 个，是谁？', prompt: '夏眠坐在车厢末端，透过车窗反光数人头，脸色骤变', characterId: 'xia', sceneId: 'train', durationSec: 5 },
      { line: '你们每天坐同一班车，却没发现多了一个人。', prompt: '黑风衣乘客缓缓转头，立领阴影下只有半张脸，灯管闪了一下', characterId: 'zero', sceneId: 'train', durationSec: 5 },
      { line: '因为第 13 个，上的是驾驶室。', prompt: '车厢门自动打开，露出空无一人的驾驶室，仪表盘自己亮起', characterId: 'zero', sceneId: 'train', durationSec: 4 },
      { line: '下一站，终点。', prompt: '站台指示牌翻成 00:00，夏眠握紧录音笔，望向镜头', characterId: 'xia', sceneId: 'platform', durationSec: 4 },
    ],
  },
  {
    id: 'sweet-reunion',
    title: '高冷总裁的盲盒婚约',
    titleEn: 'The CEO’s Blind-Box Marriage Contract',
    genre: '甜宠 / Sweet Romance',
    logline: '抽盲盒抽中婚约的菜鸟设计师，未婚夫竟是三年前毒舌她的甲方。',
    hook: '抽盲盒抽到结婚协议？甲方爸爸，这婚约你认真的？',
    styleDna: '韩系都市甜宠，高饱和柔光，马卡龙配色，浅景深，镜头语言轻快',
    characters: [
      {
        id: 'mian', name: '米棉', nameEn: 'Mi Mian', archetype: '元气女主',
        appearance: '24 岁女性，栗色微卷长发，奶油色针织衫，圆框眼镜，笑起来有梨涡',
        voiceHint: '甜脆，语速 1.2，活泼',
      },
      {
        id: 'lu', name: '陆沉', nameEn: 'Lu Chen', archetype: '高冷总裁',
        appearance: '30 岁男性，黑西装黑衬衫，眉骨立体，常年面无表情，袖扣是定制的 M 字母',
        voiceHint: '低沉，语速 0.9，冷淡',
      },
    ],
    scenes: [
      { id: 'store', name: '盲盒旗舰店', nameEn: 'Blind-Box Flagship', description: '粉色系盲盒店，巨型公仔陈列，暖光灯串', camera: '手持轻晃，快节奏剪辑感' },
      { id: 'office', name: '陆氏顶楼办公室', nameEn: 'Lu’s Penthouse Office', description: '整面落地窗城市景观，冷灰极简陈设，一盆粉色多肉突兀放在桌上', camera: '中景双人，浅景深' },
    ],
    shots: [
      { line: '最后一个盲盒！开出隐藏款——婚约协议？！', prompt: '米棉在盲盒店里拆盒，抽出卷轴状协议，圆框眼镜滑到鼻尖', characterId: 'mian', sceneId: 'store', durationSec: 4 },
      { line: '米棉，三年不见，你抽盲盒的眼光还是这么差。', prompt: '陆沉坐在顶楼办公桌后，指尖点着婚约文件，冷脸抬眼', characterId: 'lu', sceneId: 'office', durationSec: 4 },
      { line: '陆沉？！三年前把我方案批得一文不值的甲方是你！', prompt: '米棉双手拍桌，梨涡气得鼓起来，多肉盆栽入画', characterId: 'mian', sceneId: 'office', durationSec: 4 },
      { line: '批你方案，是为了让你只给我一个人设计。', prompt: '陆沉起身走向米棉，落地窗外夕阳暖光打进办公室', characterId: 'lu', sceneId: 'office', durationSec: 5 },
    ],
  },
  {
    id: 'scifi-ark',
    title: '方舟守夜人：第207次唤醒',
    titleEn: 'Ark Night-Watch: The 207th Awakening',
    genre: '科幻 / Sci-Fi',
    logline: '休眠舱故障，守夜 AI 每次只醒 5 分钟，她用了 207 次唤醒拼出真相。',
    hook: '每次唤醒只有 5 分钟，我用了 207 次，才记住你的名字。',
    styleDna: '硬科幻冷调，太空舱金属质感，全息界面蓝光，体积雾，极简几何构图',
    characters: [
      {
        id: 'eva', name: 'EVA-7', nameEn: 'EVA-7', archetype: '守夜 AI',
        appearance: '女性仿生人，银白短发，半透明皮肤透出蓝色光路，白制服袖口印 207',
        voiceHint: '合成音，语速 1.0，空灵',
      },
      {
        id: 'dr', name: '沈渡', nameEn: 'Shen Du', archetype: '舰长',
        appearance: '40 岁男性，深蓝舰长服，灰白鬓角，左眼下方一道旧伤疤',
        voiceHint: '厚重，语速 0.85',
      },
    ],
    scenes: [
      { id: 'bridge', name: '方舟舰桥', nameEn: 'Ark Bridge', description: '环形舰桥，全息星图悬空，休眠舱阵列在下方延伸', camera: '缓慢环绕，舱窗星光' },
      { id: 'pod', name: '休眠舱区', nameEn: 'Cryo Bay', description: '千排休眠舱，应急红灯扫过，霜雾弥漫', camera: '低机位推进，舱内人脸特写' },
    ],
    shots: [
      { line: '第 207 次唤醒。任务：检查 300 个休眠舱。剩余时间 4 分 59 秒。', prompt: 'EVA-7 站在舰桥中央，全息倒计时悬在掌心，蓝光照亮半张脸', characterId: 'eva', sceneId: 'bridge', durationSec: 6 },
      { line: 'EVA，你又把时间花在记录里那个人身上了。', prompt: '沈渡的全息影像浮现，眉头紧锁，星图在身后旋转', characterId: 'dr', sceneId: 'bridge', durationSec: 4 },
      { line: '舰长，我的记忆每次都被清空，但日志里 207 次都写着同一句话。', prompt: 'EVA-7 走到休眠舱区，隔着玻璃看舱内沉睡的人脸', characterId: 'eva', sceneId: 'pod', durationSec: 5 },
      { line: '那句话是：叫醒沈渡，别让他再睡着。', prompt: '休眠舱玻璃映出 EVA-7 与沈渡重合的脸，红灯闪烁', characterId: 'eva', sceneId: 'pod', durationSec: 5 },
    ],
  },
]

export interface StoryPresetSummary {
  id: string
  title: string
  titleEn: string
  genre: string
  hook: string
  shotCount: number
  characterCount: number
}

export function listStoryPresets(): StoryPresetSummary[] {
  return STORY_PRESETS.map((p) => ({
    id: p.id,
    title: p.title,
    titleEn: p.titleEn,
    genre: p.genre,
    hook: p.hook,
    shotCount: p.shots.length,
    characterCount: p.characters.length,
  }))
}

export function getStoryPreset(id: string): StoryPreset | null {
  return STORY_PRESETS.find((p) => p.id === id) ?? null
}

/** 把预置故事转成流水线 Script：风格 DNA + 角色外观 + 场景描述 注入每条分镜提示词。 */
export function presetToScript(preset: StoryPreset, opts: { includeCharacterSheet?: boolean } = {}): Script {
  const charById = new Map(preset.characters.map((c) => [c.id, c]))
  const sceneById = new Map(preset.scenes.map((s) => [s.id, s]))
  const shots: ScriptShot[] = preset.shots.map((s, i) => {
    const character = s.characterId ? charById.get(s.characterId) : undefined
    const scene = s.sceneId ? sceneById.get(s.sceneId) : undefined
    const blocks: string[] = [s.prompt]
    if (character) {
      const sheet = opts.includeCharacterSheet === false ? '' : `，角色外观：${character.appearance}`
      blocks.push(`主体：${character.name}（${character.archetype}）${sheet}`)
    }
    if (scene) blocks.push(`场景：${scene.name}，${scene.description}，镜头：${scene.camera}`)
    return { line: s.line, prompt: blocks.join('，'), durationSec: s.durationSec, ...(i === 0 ? {} : {}) }
  })
  return { title: `${preset.title} / ${preset.titleEn}`, shots }
}
