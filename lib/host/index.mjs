import {
  createJimengProvider,
  createMockProvider,
  providerForAccount
} from "../chunk-YJ6H2MSU.mjs";

// src/host/tools.ts
import { existsSync as existsSync3, readFileSync as readFileSync3 } from "fs";
import { join as join3 } from "path";

// src/prompts/style-dna.ts
function mergePromptLayers({ dna = "", shotTemplate = "", manual = "", injections = "" } = {}) {
  const parts = [dna, shotTemplate, manual].map((s) => String(s ?? "").trim()).filter(Boolean);
  return { positive: parts.join("\uFF0C"), negative: String(injections ?? "").trim() };
}

// src/prompts/templates.ts
var QUALITY_BOOSTERS = {
  // 渲染画质
  ultra: "8K \u8D85\u6E05\uFF0COC \u6E32\u67D3\uFF0C\u6B21\u4E16\u4EE3\u5EFA\u6A21\uFF0C\u7535\u5F71\u7EA7\u67D4\u548C\u8F6E\u5ED3\u5149\uFF0C\u7EDF\u4E0085mm\u7126\u8DDD\uFF0C\u65E0\u7578\u53D8",
  material: "\u7EC6\u817B\u5E03\u6599\u7EB9\u7406\uFF0C\u53D1\u4E1D\u5206\u5C42\u7CBE\u81F4\uFF0CPBR \u6750\u8D28\uFF0C\u6B21\u8868\u9762\u6563\u5C04",
  // 背景
  clean: "\u7EAF\u8272\u7A7A\u767D\u80CC\u666F\uFF0C\u65E0\u9634\u5F71\u65E0\u6742\u7269\uFF0C\u65E0\u591A\u4F59\u5143\u7D20",
  cleanGray: "\u65E0\u591A\u4F59\u5143\u7D20\u7684\u6D45\u7070\u8272\u80CC\u666F\uFF0C\u89D2\u8272\u65E0\u9634\u5F71",
  // 姿态表情
  neutral: "\u4E2D\u6027\u8868\u60C5\uFF08\u65E0\u559C\u6012\u54C0\u4E50\uFF09\uFF0C\u773C\u795E\u5E73\u9759\uFF0C\u81EA\u7136\u7AD9\u7ACB\uFF0C\u53CC\u624B\u81EA\u7136\u4E0B\u5782\uFF0C\u7A7A\u624B\uFF08\u65E0\u624B\u6301\u7269\uFF09\uFF0C\u8EAB\u4E0A\u65E0\u4EFB\u4F55\u80CC\u8D1F\u7269",
  plain: "\u65E0\u591A\u4F59\u52A8\u4F5C\u3001\u65E0\u5938\u5F20\u8868\u60C5\uFF0C\u5E73\u89C6",
  // 负面
  noText: "\u4E25\u7981\u753B\u9762\u51FA\u73B0\u4E0D\u76F8\u5173\u7684\u6587\u5B57",
  // 一致性（三重锁，分别声明）
  consistentFace: "\u6240\u6709\u89C6\u56FE\u9762\u90E8\u7279\u5F81\u4E00\u81F4",
  consistentBody: "\u6240\u6709\u89C6\u56FE\u8EAB\u4F53\u6BD4\u4F8B\u4E00\u81F4",
  consistentOutfit: "\u6240\u6709\u89C6\u56FE\u670D\u88C5\u4E0E\u914D\u9970\u4E00\u81F4"
};
var DEFAULT_BOOSTERS = ["ultra", "material", "neutral", "noText"];
var CHARACTER_SHEET_NEGATIVE = [
  "\u89C6\u56FE\u878D\u5408",
  "\u9762\u677F\u95F4\u7279\u5F81\u6F02\u79FB",
  "\u98CE\u666F\u80CC\u666F\u6C61\u67D3",
  "\u591A\u4F59\u80A2\u4F53",
  "\u624B\u90E8\u7578\u5F62",
  "\u9762\u90E8\u7578\u5F62",
  "\u6C34\u5370",
  "\u7B7E\u540D",
  "\u6587\u5B57",
  "\u4F4E\u5206\u8FA8\u7387",
  "\u8FC7\u5EA6\u9510\u5316",
  "\u80F6\u7247\u9897\u7C92"
];
var GENERIC_NEGATIVE = [
  "\u4F4E\u5206\u8FA8\u7387",
  "\u6A21\u7CCA",
  "\u7578\u53D8",
  "\u591A\u4F59\u80A2\u4F53",
  "\u6C34\u5370",
  "\u7B7E\u540D",
  "\u6587\u5B57",
  "\u8FC7\u5EA6\u9971\u548C"
];
function sections(...blocks) {
  return blocks.map(([label, v]) => v ? `${label}\uFF1A${v}` : null).filter((x) => Boolean(x)).join("\uFF0C");
}
var TEMPLATES = {
  /** 角色设定三视图（v2）：版式标签 + 三重一致性锁 + 可度量锚点 */
  "character-sheet": {
    id: "character-sheet",
    name: "\u89D2\u8272\u8BBE\u5B9A\u4E09\u89C6\u56FE",
    ratios: "16:9 \u6A2A\u7248\u4E09\u89C6\u56FE / 3:4 \u7AD6\u7248\u5806\u53E0 / 1:1 \u8868\u60C5\u7F51\u683C",
    negative: CHARACTER_SHEET_NEGATIVE,
    build: (v) => sections(
      ["\u4E3B\u4F53", "\u5168\u8EAB\u5B8C\u6574\u7ACB\u7ED8\uFF0C" + (v.style ?? "3D \u56FD\u6F2B\u4ED9\u4FA0\u6B21\u4E16\u4EE3\u5EFA\u6A21")],
      ["\u5916\u89C2", [v.hair, v.face, v.body, v.outfit, v.accessory, v.description].filter(Boolean).join("\uFF0C") || void 0],
      ["\u6E32\u67D3", QUALITY_BOOSTERS.ultra + "\uFF0C" + QUALITY_BOOSTERS.material],
      ["\u59FF\u6001", [QUALITY_BOOSTERS.neutral, QUALITY_BOOSTERS.plain, v.pose].filter(Boolean).join("\uFF0C")],
      ["\u5149\u5F71", v.lighting ?? "\u7535\u5F71\u7EA7\u67D4\u548C\u8F6E\u5ED3\u5149"],
      ["\u955C\u5934", v.camera ?? "\u7EDF\u4E0085mm\u7126\u8DDD\uFF0C\u65E0\u7578\u53D8\uFF0C\u5E73\u89C6"],
      ["\u80CC\u666F", QUALITY_BOOSTERS.cleanGray],
      ["\u7248\u5F0F", "\u5DE6\u533A\uFF1A\u89D2\u8272\u6B63\u8138\u7279\u5199\uFF0C\u9762\u90E8\u5360\u6EE1\u5DE6\u533A\uFF0C\u65E0\u8EAB\u4F53\u5165\u955C\uFF1B\u53F3\u533A\uFF1A\u6807\u51C6\u89D2\u8272\u8BBE\u5B9A\u4E09\u89C6\u56FE\uFF0C\u6A2A\u5411\u4F9D\u6B21\u6392\u5217\u4FA7\u89C6\u56FE\u3001\u6B63\u89C6\u56FE\u3001\u80CC\u89C6\u56FE\uFF0C\u4ECE\u5934\u5230\u811A\u5B8C\u6574\u65E0\u906E\u6321"],
      ["\u5EA6\u91CF", "\u4E09\u89C6\u56FE\u89D2\u8272\u9AD8\u5EA6\u4E3A\u753B\u9762\u9AD8\u5EA6\u7684 80%\uFF0C\u4E09\u89C6\u56FE\u9AD8\u5EA6\u7EDF\u4E00"],
      ["\u4E00\u81F4\u6027", [QUALITY_BOOSTERS.consistentFace, QUALITY_BOOSTERS.consistentBody, QUALITY_BOOSTERS.consistentOutfit].join("\uFF1B")],
      ["\u8D1F\u9762", QUALITY_BOOSTERS.noText],
      ["\u753B\u5E45", v.aspectRatio ?? "9:16"]
    )
  },
  /** 场景主图（v2）：环境资产 */
  "scene-master": {
    id: "scene-master",
    name: "\u573A\u666F\u4E3B\u56FE",
    ratios: "16:9 \u7535\u5F71\u5BBD\u5E45",
    negative: GENERIC_NEGATIVE,
    build: (v) => sections(
      ["\u4E3B\u4F53", v.description ?? "\u7A7A\u73AF\u5883"],
      ["\u98CE\u683C", v.style ?? "\u56FD\u98CE\u4ED9\u4FA0\uFF0C\u7535\u5F71\u611F"],
      ["\u6E32\u67D3", QUALITY_BOOSTERS.ultra],
      ["\u5149\u5F71", v.lighting ?? "\u81EA\u7136\u4F53\u79EF\u5149"],
      ["\u6784\u56FE", v.composition ?? "\u7EB5\u6DF1\u900F\u89C6\uFF0C\u4E3B\u6B21\u5206\u660E"],
      ["\u7EA6\u675F", "\u65E0\u4EBA\u7269\u5165\u955C\uFF0C" + QUALITY_BOOSTERS.noText],
      ["\u753B\u5E45", v.aspectRatio ?? "16:9"]
    )
  },
  /** 单镜画面（v2）：分镜提示词 */
  "shot-scene": {
    id: "shot-scene",
    name: "\u5355\u955C\u753B\u9762",
    ratios: "9:16 \u7AD6\u5C4F / 16:9 \u6A2A\u5C4F",
    negative: GENERIC_NEGATIVE,
    build: (v) => sections(
      ["\u4E3B\u4F53", v.description ?? ""],
      ["\u98CE\u683C", v.style ?? ""],
      ["\u6E32\u67D3", QUALITY_BOOSTERS.ultra],
      ["\u5149\u5F71", v.lighting ?? ""],
      ["\u955C\u5934", v.camera ?? ""],
      ["\u6784\u56FE", v.composition ?? "\u666F\u522B\u660E\u786E\uFF0C\u6784\u56FE\u4E3B\u6B21\u5206\u660E\uFF0C\u52A8\u6001\u81EA\u7136"],
      ["\u8D1F\u9762", QUALITY_BOOSTERS.noText],
      ["\u753B\u5E45", v.aspectRatio ?? "9:16"]
    )
  }
};
function applyTemplate(templateId, vars = {}) {
  const t = TEMPLATES[templateId];
  if (!t) throw new Error(`\u672A\u77E5\u6A21\u677F: ${templateId}\uFF08\u53EF\u9009 ${Object.keys(TEMPLATES).join("/")}\uFF09`);
  return t.build(vars);
}
function templateNegative(templateId) {
  const t = TEMPLATES[templateId];
  if (!t) throw new Error(`\u672A\u77E5\u6A21\u677F: ${templateId}`);
  return [...t.negative];
}
function listTemplates() {
  return Object.values(TEMPLATES).map((t) => ({ id: t.id, name: t.name, ratios: t.ratios }));
}

// src/prompts/optimizer.ts
function optimizePrompt(draft, opts = {}) {
  const parts = [String(draft ?? "").trim()];
  const boosters = opts.boosters ?? (opts.scorebook ? opts.scorebook.recommend(opts.style ?? "") : [...DEFAULT_BOOSTERS]);
  const applied = [];
  for (const key of boosters) {
    const b = QUALITY_BOOSTERS[key];
    if (b) {
      parts.push(b);
      applied.push(key);
    }
  }
  if (opts.style && !parts[0].includes(opts.style)) parts.push(`\u98CE\u683C\uFF1A${opts.style}`);
  if (opts.aspectRatio) parts.push(opts.aspectRatio);
  const negative = opts.template ? templateNegative(opts.template) : [...GENERIC_NEGATIVE];
  return { optimized: parts.filter(Boolean).join("\uFF0C"), appliedBoosters: applied, negative };
}

// src/director/workflow-builder.ts
var DEFAULT_TEMPLATE = {
  "1": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: "{{checkpoint}}" } },
  "2": { class_type: "CLIPTextEncode", inputs: { text: "{{positive}}", clip: ["1", 1] } },
  "3": { class_type: "CLIPTextEncode", inputs: { text: "{{negative}}", clip: ["1", 1] } },
  "4": { class_type: "REPLACE_WITH_VIDEO_SAMPLER_NODE", inputs: {
    width: "{{width}}",
    height: "{{height}}",
    length: "{{frames}}",
    batch_size: 1,
    seed: "{{seed}}",
    positive: ["2", 0],
    negative: ["3", 0],
    model: ["1", 0]
  } },
  "5": { class_type: "VAEDecode", inputs: { samples: ["4", 0], vae: ["1", 2] } },
  "6": { class_type: "SaveVideo", inputs: { filename_prefix: "whale/{{shotId}}", fps: "{{fps}}", images: ["5", 0] } }
};
function applyVars(node, vars) {
  const walk = (v) => {
    if (typeof v === "string") {
      const exact = v.match(/^\{\{(\w+)\}\}$/);
      if (exact && typeof vars[exact[1]] === "number") return vars[exact[1]];
      return v.replace(/\{\{(\w+)\}\}/g, (m, k) => k in vars ? String(vars[k]) : m);
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(node);
}
function buildWorkflow(opts = {}) {
  const {
    checkpoint,
    positive = "",
    negative = "",
    width = 1080,
    height = 1920,
    frames = 121,
    fps = 24,
    seed,
    shotId = "shot-01",
    workflowTemplate = DEFAULT_TEMPLATE
  } = opts;
  const vars = {
    checkpoint: checkpoint ?? "REPLACE_WITH_CHECKPOINT_NAME",
    positive,
    negative,
    width,
    height,
    frames,
    fps,
    seed: seed ?? Math.floor(Math.random() * 1e9),
    shotId
  };
  return Object.fromEntries(
    Object.entries(workflowTemplate).map(([nid, node]) => [nid, applyVars(node, vars)])
  );
}
function validateWorkflow(wf) {
  const errors = [];
  if (!wf || typeof wf !== "object" || Array.isArray(wf)) return ["workflow \u5FC5\u987B\u662F\u8282\u70B9\u5BF9\u8C61"];
  for (const [nid, node] of Object.entries(wf)) {
    if (!node || typeof node.class_type !== "string" || !node.class_type) errors.push(`\u8282\u70B9 ${nid} \u7F3A class_type`);
    if (node.class_type.includes("REPLACE_")) errors.push(`\u8282\u70B9 ${nid} \u542B\u672A\u66FF\u6362\u5360\u4F4D: ${node.class_type}`);
    if (node.inputs && typeof node.inputs !== "object") errors.push(`\u8282\u70B9 ${nid} inputs \u975E\u6CD5`);
  }
  return errors;
}

// src/content/presets.ts
var STORY_PRESETS = [
  {
    id: "comeback-latte",
    title: "\u9006\u88AD\uFF1A\u4ECE\u5916\u5356\u5458\u5230\u9876\u7EA7\u64CD\u76D8\u624B",
    titleEn: "Comeback: From Delivery Rider to Top Trader",
    genre: "\u90FD\u5E02\u9006\u88AD / City Comeback",
    logline: "\u88AB\u8D44\u672C\u8E22\u51FA\u5C40\u7684\u5929\u624D\u64CD\u76D8\u624B\u6CA6\u843D\u9001\u5916\u5356\uFF0C\u9760\u4E00\u90E8\u65E7\u624B\u673A\u6740\u56DE\u5DC5\u5CF0\u3002",
    hook: "\u4E09\u5E74\u524D\u4F60\u4EEC\u8E29\u6211\u51FA\u5C40\uFF0C\u4ECA\u5929\u6211\u8BA9\u4F60\u4EEC\u6240\u6709\u4EBA\u6C42\u6211\u56DE\u6765\u3002",
    styleDna: "3D \u56FD\u6F2B\u5199\u5B9E\uFF0C\u7535\u5F71\u7EA7\u90FD\u5E02\u591C\u666F\uFF0C\u51B7\u8272\u9713\u8679\u4E0E\u6696\u8272\u5BA4\u5149\u5BF9\u6BD4\uFF0C\u6D45\u666F\u6DF1\uFF0C\u5FAE\u5C18\u8D28\u611F\uFF0C85mm \u955C\u5934\u8BED\u8A00",
    characters: [
      {
        id: "lin",
        name: "\u6797\u8D8A",
        nameEn: "Lin Yue",
        archetype: "\u9006\u88AD\u7537\u4E3B",
        appearance: "28 \u5C81\u7537\u6027\uFF0C\u5229\u843D\u9ED1\u8272\u77ED\u53D1\uFF0C\u9AD8\u9F3B\u8584\u5507\uFF0C\u85CF\u9752\u51B2\u950B\u8863\uFF0C\u773C\u795E\u51B7\u5CFB\u5E26\u5026\u610F\uFF0C\u8EAB\u5F62\u7CBE\u7626\u633A\u62D4",
        voiceHint: "\u4F4E\u6C89\uFF0C\u8BED\u901F 1.0\uFF0C\u60C5\u7EEA\u514B\u5236"
      },
      {
        id: "su",
        name: "\u82CF\u5A49",
        nameEn: "Su Wan",
        archetype: "\u5973\u4E3B/\u5206\u6790\u5E08",
        appearance: "26 \u5C81\u5973\u6027\uFF0C\u6DF1\u68D5\u957F\u76F4\u53D1\uFF0C\u7C73\u8272\u98CE\u8863\uFF0C\u94F6\u6846\u773C\u955C\uFF0C\u51B7\u9759\u4E13\u4E1A\uFF0C\u5634\u89D2\u5E26\u4E00\u4E1D\u4E0D\u670D\u8F93",
        voiceHint: "\u6E05\u4EAE\uFF0C\u8BED\u901F 1.1\uFF0C\u5C3E\u97F3\u575A\u5B9A"
      }
    ],
    scenes: [
      { id: "street", name: "\u96E8\u591C\u8857\u5934", nameEn: "Rainy Street", description: "\u96E8\u591C\u9A91\u624B\u89C6\u89D2\u7684\u5341\u5B57\u8DEF\u53E3\uFF0C\u9713\u8679\u5012\u5F71\u5728\u79EF\u6C34\u4E0A\uFF0C\u8F66\u6D41\u62C9\u51FA\u5149\u8F68", camera: "\u4F4E\u673A\u4F4D\u8DDF\u62CD\uFF0C\u6D45\u666F\u6DF1\uFF0C\u524D\u666F\u96E8\u4E1D" },
      { id: "office", name: "\u65E7\u4EA4\u6613\u5BA4", nameEn: "Old Trading Room", description: "\u6DF1\u591C\u7A7A\u8361\u7684\u4EA4\u6613\u5927\u5385\uFF0C\u516D\u5757\u5C4F\u5E55\u4EAE\u7740 K \u7EBF\uFF0C\u7A97\u5916\u57CE\u5E02\u706F\u706B", camera: "\u5E7F\u89D2\u5B9A\u573A\uFF0C\u63A8\u5411\u4EBA\u7269\u80CC\u5F71" }
    ],
    shots: [
      { line: "\u4E09\u5E74\u524D\u4F60\u4EEC\u8E29\u6211\u51FA\u5C40\uFF0C\u4ECA\u5929\u6211\u8BA9\u4F60\u4EEC\u6240\u6709\u4EBA\u6C42\u6211\u56DE\u6765\u3002", prompt: "\u6797\u8D8A\u96E8\u591C\u9A91\u624B\u88C5\u7AD9\u5728\u5341\u5B57\u8DEF\u53E3\uFF0C\u6458\u4E0B\u5934\u76D4\uFF0C\u51B7\u5CFB\u773C\u795E\u76F4\u89C6\u955C\u5934\uFF0C\u9713\u8679\u80CC\u5149\uFF0C\u96E8\u4E1D\u6E05\u6670", characterId: "lin", sceneId: "street", durationSec: 5 },
      { line: "\u82CF\u5A49\uFF0C\u8FD9\u4EFD\u505A\u7A7A\u62A5\u544A\uFF0C\u4F60\u786E\u5B9A\u8981\u53D1\uFF1F", prompt: "\u82CF\u5A49\u5728\u4EA4\u6613\u5BA4\u5C4F\u5E55\u524D\u8F6C\u8EAB\uFF0C\u94F6\u6846\u773C\u955C\u53CD\u5C04 K \u7EBF\u7EA2\u5149\uFF0C\u795E\u60C5\u51DD\u91CD", characterId: "su", sceneId: "office", durationSec: 4 },
      { line: "\u6797\u8D8A\uFF1F\u4F60\u6D88\u5931\u4E09\u5E74\uFF0C\u5C31\u662F\u4E3A\u4E86\u9001\u5916\u5356\uFF1F", prompt: "\u82CF\u5A49\u4E3E\u7740\u624B\u673A\u770B\u5916\u5356\u8BA2\u5355\u754C\u9762\uFF0C\u62AC\u5934\u9707\u60CA\uFF0C\u753B\u9762\u5207\u5230\u95E8\u53E3\u7AD9\u7740\u7684\u6797\u8D8A", characterId: "su", sceneId: "office", durationSec: 4 },
      { line: "\u9001\u5916\u5356\u662F\u5DE5\u4F5C\uFF0C\u64CD\u76D8\u662F\u672C\u80FD\u3002", prompt: "\u6797\u8D8A\u5355\u624B\u6276\u95E8\u6846\uFF0C\u9006\u5149\u526A\u5F71\uFF0C\u5634\u89D2\u5FAE\u626C\uFF0C\u4EA4\u6613\u5BA4\u5C4F\u5E55\u5728\u4ED6\u8EAB\u540E\u4EAE\u8D77", characterId: "lin", sceneId: "office", durationSec: 5 },
      { line: "\u660E\u5929\u5F00\u76D8\uFF0C\u8BA9\u7A7A\u5934\u89C1\u8BC6\u4E00\u4E0B\u4EC0\u4E48\u53EB\u903C\u7A7A\u3002", prompt: "\u6797\u8D8A\u6307\u5C16\u5212\u8FC7\u624B\u673A\u5C4F\u5E55\uFF0CK \u7EBF\u5F00\u59CB\u62C9\u5347\uFF0C\u51B7\u8272\u57CE\u5E02\u591C\u666F\u7A97\u5916", characterId: "lin", sceneId: "office", durationSec: 5 }
    ]
  },
  {
    id: "xianxia-sword",
    title: "\u4ED9\u95E8\u5F03\u5F92\uFF1A\u5251\u51FA\u6606\u4ED1",
    titleEn: "Abandoned Disciple: Sword Out of Kunlun",
    genre: "\u53E4\u98CE\u4ED9\u4FA0 / Xianxia",
    logline: "\u88AB\u9010\u51FA\u6606\u4ED1\u7684\u5E9F\u7075\u6839\u5C11\u5E74\uFF0C\u4F53\u5185\u5C01\u5370\u7740\u4E0A\u53E4\u5251\u7075\uFF0C\u4E00\u5251\u5F00\u5929\u95E8\u3002",
    hook: "\u5E9F\u6211\u7075\u6839\uFF0C\u9010\u6211\u51FA\u5C71\u95E8\uFF0C\u4ECA\u65E5\u6211\u4FBF\u4EE5\u51E1\u4EBA\u4E4B\u8EAF\uFF0C\u95EE\u5251\u6606\u4ED1\u3002",
    styleDna: "\u56FD\u98CE\u4ED9\u4FA0\u6B21\u4E16\u4EE3\u5EFA\u6A21\uFF0C\u6C34\u58A8\u6655\u67D3\u5929\u7A7A\uFF0C\u4E91\u6D77\u7FFB\u6D8C\uFF0C\u5251\u6C14\u7C92\u5B50\u6D41\u5149\uFF0C\u6696\u91D1\u4E0E\u9752\u9EDB\u5BF9\u6BD4\u8272",
    characters: [
      {
        id: "chen",
        name: "\u9648\u7384",
        nameEn: "Chen Xuan",
        archetype: "\u5E9F\u7075\u6839\u4E3B\u89D2",
        appearance: "19 \u5C81\u5C11\u5E74\uFF0C\u7070\u767D\u9EBB\u8863\uFF0C\u9ED1\u53D1\u675F\u8D77\u51CC\u4E71\uFF0C\u7709\u5FC3\u4E00\u9053\u6DE1\u91D1\u5251\u7EB9\uFF0C\u80CC\u8D1F\u65E0\u9798\u94C1\u5251",
        voiceHint: "\u5C11\u5E74\u97F3\uFF0C\u8BED\u901F 1.1\uFF0C\u6E05\u8D8A"
      },
      {
        id: "shizun",
        name: "\u9752\u68A7\u771F\u4EBA",
        nameEn: "Master Qingwu",
        archetype: "\u4ED9\u95E8\u957F\u8001/\u53CD\u6D3E",
        appearance: "\u767D\u53D1\u9053\u4EBA\uFF0C\u6708\u767D\u9053\u888D\uFF0C\u624B\u6267\u62C2\u5C18\uFF0C\u7709\u76EE\u5A01\u4E25\uFF0C\u5468\u8EAB\u73AF\u7ED5\u9752\u8272\u7075\u6C14",
        voiceHint: "\u82CD\u8001\u6C89\u7A33\uFF0C\u8BED\u901F 0.9"
      }
    ],
    scenes: [
      { id: "kunlun", name: "\u6606\u4ED1\u5C71\u95E8", nameEn: "Kunlun Gate", description: "\u4E07\u7EA7\u767D\u7389\u77F3\u9636\u76F4\u5165\u4E91\u6D77\uFF0C\u5C71\u95E8\u60AC\u91D1\u533E\uFF0C\u4ED9\u9E64\u63A0\u8FC7", camera: "\u4EF0\u62CD\u5C71\u95E8\uFF0C\u5A01\u4E25\u538B\u8FEB\u611F" },
      { id: "cliff", name: "\u65AD\u9B42\u5D16", nameEn: "Soul Cliff", description: "\u5B64\u5CF0\u7EDD\u58C1\uFF0C\u4E91\u6D77\u5982\u6D77\uFF0C\u5D16\u8FB9\u53E4\u677E\u534A\u67AF", camera: "\u5927\u8FDC\u666F\u5230\u4E2D\u666F\uFF0C\u98CE\u52A8\u8863\u895F" }
    ],
    shots: [
      { line: "\u9648\u7384\uFF0C\u4F60\u7075\u6839\u5DF2\u5E9F\uFF0C\u7559\u5728\u6606\u4ED1\u4E5F\u662F\u7D2F\u8D58\u3002", prompt: "\u9752\u68A7\u771F\u4EBA\u7ACB\u4E8E\u6606\u4ED1\u5C71\u95E8\u524D\uFF0C\u62C2\u5C18\u4E00\u6446\uFF0C\u4FEF\u89C6\u53F0\u9636\u4E0B\u7684\u5C11\u5E74", characterId: "shizun", sceneId: "kunlun", durationSec: 4 },
      { line: "\u5E9F\u6211\u7075\u6839\uFF0C\u9010\u6211\u51FA\u5C71\u95E8\uFF0C\u4ECA\u65E5\u6211\u4FBF\u4EE5\u51E1\u4EBA\u4E4B\u8EAF\uFF0C\u95EE\u5251\u6606\u4ED1\u3002", prompt: "\u9648\u7384\u5355\u819D\u8DEA\u5730\u53C8\u7F13\u7F13\u7AD9\u8D77\uFF0C\u62D4\u51FA\u65E0\u9798\u94C1\u5251\uFF0C\u5251\u8EAB\u71C3\u8D77\u91D1\u8272\u7EB9\u8DEF\uFF0C\u4E91\u6D77\u7FFB\u6D8C", characterId: "chen", sceneId: "kunlun", durationSec: 6 },
      { line: "\u5251\u7075\u2026\u2026\u539F\u6765\u4F60\u4ECE\u672A\u6C89\u7761\u3002", prompt: "\u65AD\u9B42\u5D16\u8FB9\uFF0C\u9648\u7384\u76D8\u5750\uFF0C\u7709\u5FC3\u5251\u7EB9\u4EAE\u8D77\uFF0C\u8EAB\u540E\u6D6E\u73B0\u4E0A\u53E4\u5251\u7075\u865A\u5F71", characterId: "chen", sceneId: "cliff", durationSec: 4 },
      { line: "\u4E09\u5E74\u540E\uFF0C\u6211\u4F1A\u56DE\u6765\u62FF\u56DE\u5C5E\u4E8E\u6211\u7684\u4E00\u5207\u3002", prompt: "\u9648\u7384\u80CC\u5BF9\u955C\u5934\u7ACB\u4E8E\u5D16\u8FB9\uFF0C\u8863\u8882\u7FFB\u98DE\uFF0C\u5929\u8FB9\u4E00\u7EBF\u91D1\u5149\u7834\u4E91", characterId: "chen", sceneId: "cliff", durationSec: 5 }
    ]
  },
  {
    id: "suspense-last-train",
    title: "\u672B\u73ED\u8F66\uFF1A\u7B2C13\u53F7\u4E58\u5BA2",
    titleEn: "The Last Train: Passenger No.13",
    genre: "\u60AC\u7591\u53CD\u8F6C / Suspense Twist",
    logline: "\u672B\u73ED\u5730\u94C1\u53EA\u6709 12 \u4E2A\u5EA7\u4F4D\uFF0C\u5374\u5750\u4E0B\u4E86 13 \u4E2A\u4EBA\u2014\u2014\u591A\u51FA\u6765\u7684\u90A3\u4E2A\uFF0C\u8BA4\u8BC6\u6240\u6709\u4EBA\u3002",
    hook: "\u8FD9\u73ED\u8F66\u4ECE\u6765\u53EA\u6709 12 \u4E2A\u4E58\u5BA2\uFF0C\u90A3\u7B2C 13 \u4E2A\uFF0C\u662F\u8C01\uFF1F",
    styleDna: "\u7535\u5F71\u7EA7\u60AC\u7591\u5199\u5B9E\uFF0C\u8F66\u53A2\u51B7\u767D\u706F\u7BA1\uFF0C\u9634\u5F71\u6D53\u91CD\uFF0C\u9897\u7C92\u80F6\u7247\u8D28\u611F\uFF0C\u7F13\u6162\u63A8\u62C9\u955C\u5934",
    characters: [
      {
        id: "xia",
        name: "\u590F\u7720",
        nameEn: "Xia Mian",
        archetype: "\u5931\u7720\u4FA6\u63A2",
        appearance: "32 \u5C81\u5973\u6027\uFF0C\u9ED1\u8272\u77ED\u53D1\u9F50\u8033\uFF0C\u7070\u98CE\u8863\uFF0C\u773C\u4E0B\u4E4C\u9752\uFF0C\u624B\u91CC\u6C38\u8FDC\u6525\u7740\u4E00\u652F\u5F55\u97F3\u7B14",
        voiceHint: "\u6C99\u54D1\uFF0C\u8BED\u901F 0.95\uFF0C\u75B2\u60EB"
      },
      {
        id: "zero",
        name: "\u7B2C13\u53F7\u4E58\u5BA2",
        nameEn: "Passenger No.13",
        archetype: "\u795E\u79D8\u4EBA",
        appearance: "\u6027\u522B\u4E0D\u660E\uFF0C\u9ED1\u8272\u957F\u98CE\u8863\u7ACB\u9886\u906E\u534A\u5F20\u8138\uFF0C\u767D\u624B\u5957\uFF0C\u978B\u5E95\u6CBE\u7740\u4E0D\u5C5E\u4E8E\u672C\u5E02\u7684\u7EA2\u6CE5",
        voiceHint: "\u673A\u68B0\u611F\uFF0C\u8BED\u901F 0.8\uFF0C\u65E0\u611F\u60C5"
      }
    ],
    scenes: [
      { id: "train", name: "\u672B\u73ED\u8F66\u53A2", nameEn: "Last Train Car", description: "\u8001\u5F0F\u5730\u94C1\u8F66\u53A2\uFF0C\u706F\u7BA1\u9891\u95EA\uFF0C\u4E24\u4FA7\u5EA7\u6905\uFF0C\u8F66\u7A97\u53CD\u5149\u53E0\u5F71", camera: "\u8FC7\u9053\u4F4E\u673A\u4F4D\u6A2A\u79FB\uFF0C\u76D1\u63A7\u89C6\u89D2\u7A7F\u63D2" },
      { id: "platform", name: "\u65E0\u4EBA\u7AD9\u53F0", nameEn: "Empty Platform", description: "\u7EC8\u70B9\u7AD9\u53F0\uFF0C\u7ACB\u67F1\u9634\u5F71\u62C9\u957F\uFF0C\u6307\u793A\u724C\u663E\u793A 00:00", camera: "\u56FA\u5B9A\u5E7F\u89D2\uFF0C\u4EBA\u7269\u5165\u753B" }
    ],
    shots: [
      { line: "12 \u4E2A\u5EA7\u4F4D\uFF0C13 \u4E2A\u4EBA\u3002\u7B2C 13 \u4E2A\uFF0C\u662F\u8C01\uFF1F", prompt: "\u590F\u7720\u5750\u5728\u8F66\u53A2\u672B\u7AEF\uFF0C\u900F\u8FC7\u8F66\u7A97\u53CD\u5149\u6570\u4EBA\u5934\uFF0C\u8138\u8272\u9AA4\u53D8", characterId: "xia", sceneId: "train", durationSec: 5 },
      { line: "\u4F60\u4EEC\u6BCF\u5929\u5750\u540C\u4E00\u73ED\u8F66\uFF0C\u5374\u6CA1\u53D1\u73B0\u591A\u4E86\u4E00\u4E2A\u4EBA\u3002", prompt: "\u9ED1\u98CE\u8863\u4E58\u5BA2\u7F13\u7F13\u8F6C\u5934\uFF0C\u7ACB\u9886\u9634\u5F71\u4E0B\u53EA\u6709\u534A\u5F20\u8138\uFF0C\u706F\u7BA1\u95EA\u4E86\u4E00\u4E0B", characterId: "zero", sceneId: "train", durationSec: 5 },
      { line: "\u56E0\u4E3A\u7B2C 13 \u4E2A\uFF0C\u4E0A\u7684\u662F\u9A7E\u9A76\u5BA4\u3002", prompt: "\u8F66\u53A2\u95E8\u81EA\u52A8\u6253\u5F00\uFF0C\u9732\u51FA\u7A7A\u65E0\u4E00\u4EBA\u7684\u9A7E\u9A76\u5BA4\uFF0C\u4EEA\u8868\u76D8\u81EA\u5DF1\u4EAE\u8D77", characterId: "zero", sceneId: "train", durationSec: 4 },
      { line: "\u4E0B\u4E00\u7AD9\uFF0C\u7EC8\u70B9\u3002", prompt: "\u7AD9\u53F0\u6307\u793A\u724C\u7FFB\u6210 00:00\uFF0C\u590F\u7720\u63E1\u7D27\u5F55\u97F3\u7B14\uFF0C\u671B\u5411\u955C\u5934", characterId: "xia", sceneId: "platform", durationSec: 4 }
    ]
  },
  {
    id: "sweet-reunion",
    title: "\u9AD8\u51B7\u603B\u88C1\u7684\u76F2\u76D2\u5A5A\u7EA6",
    titleEn: "The CEO\u2019s Blind-Box Marriage Contract",
    genre: "\u751C\u5BA0 / Sweet Romance",
    logline: "\u62BD\u76F2\u76D2\u62BD\u4E2D\u5A5A\u7EA6\u7684\u83DC\u9E1F\u8BBE\u8BA1\u5E08\uFF0C\u672A\u5A5A\u592B\u7ADF\u662F\u4E09\u5E74\u524D\u6BD2\u820C\u5979\u7684\u7532\u65B9\u3002",
    hook: "\u62BD\u76F2\u76D2\u62BD\u5230\u7ED3\u5A5A\u534F\u8BAE\uFF1F\u7532\u65B9\u7238\u7238\uFF0C\u8FD9\u5A5A\u7EA6\u4F60\u8BA4\u771F\u7684\uFF1F",
    styleDna: "\u97E9\u7CFB\u90FD\u5E02\u751C\u5BA0\uFF0C\u9AD8\u9971\u548C\u67D4\u5149\uFF0C\u9A6C\u5361\u9F99\u914D\u8272\uFF0C\u6D45\u666F\u6DF1\uFF0C\u955C\u5934\u8BED\u8A00\u8F7B\u5FEB",
    characters: [
      {
        id: "mian",
        name: "\u7C73\u68C9",
        nameEn: "Mi Mian",
        archetype: "\u5143\u6C14\u5973\u4E3B",
        appearance: "24 \u5C81\u5973\u6027\uFF0C\u6817\u8272\u5FAE\u5377\u957F\u53D1\uFF0C\u5976\u6CB9\u8272\u9488\u7EC7\u886B\uFF0C\u5706\u6846\u773C\u955C\uFF0C\u7B11\u8D77\u6765\u6709\u68A8\u6DA1",
        voiceHint: "\u751C\u8106\uFF0C\u8BED\u901F 1.2\uFF0C\u6D3B\u6CFC"
      },
      {
        id: "lu",
        name: "\u9646\u6C89",
        nameEn: "Lu Chen",
        archetype: "\u9AD8\u51B7\u603B\u88C1",
        appearance: "30 \u5C81\u7537\u6027\uFF0C\u9ED1\u897F\u88C5\u9ED1\u886C\u886B\uFF0C\u7709\u9AA8\u7ACB\u4F53\uFF0C\u5E38\u5E74\u9762\u65E0\u8868\u60C5\uFF0C\u8896\u6263\u662F\u5B9A\u5236\u7684 M \u5B57\u6BCD",
        voiceHint: "\u4F4E\u6C89\uFF0C\u8BED\u901F 0.9\uFF0C\u51B7\u6DE1"
      }
    ],
    scenes: [
      { id: "store", name: "\u76F2\u76D2\u65D7\u8230\u5E97", nameEn: "Blind-Box Flagship", description: "\u7C89\u8272\u7CFB\u76F2\u76D2\u5E97\uFF0C\u5DE8\u578B\u516C\u4ED4\u9648\u5217\uFF0C\u6696\u5149\u706F\u4E32", camera: "\u624B\u6301\u8F7B\u6643\uFF0C\u5FEB\u8282\u594F\u526A\u8F91\u611F" },
      { id: "office", name: "\u9646\u6C0F\u9876\u697C\u529E\u516C\u5BA4", nameEn: "Lu\u2019s Penthouse Office", description: "\u6574\u9762\u843D\u5730\u7A97\u57CE\u5E02\u666F\u89C2\uFF0C\u51B7\u7070\u6781\u7B80\u9648\u8BBE\uFF0C\u4E00\u76C6\u7C89\u8272\u591A\u8089\u7A81\u5140\u653E\u5728\u684C\u4E0A", camera: "\u4E2D\u666F\u53CC\u4EBA\uFF0C\u6D45\u666F\u6DF1" }
    ],
    shots: [
      { line: "\u6700\u540E\u4E00\u4E2A\u76F2\u76D2\uFF01\u5F00\u51FA\u9690\u85CF\u6B3E\u2014\u2014\u5A5A\u7EA6\u534F\u8BAE\uFF1F\uFF01", prompt: "\u7C73\u68C9\u5728\u76F2\u76D2\u5E97\u91CC\u62C6\u76D2\uFF0C\u62BD\u51FA\u5377\u8F74\u72B6\u534F\u8BAE\uFF0C\u5706\u6846\u773C\u955C\u6ED1\u5230\u9F3B\u5C16", characterId: "mian", sceneId: "store", durationSec: 4 },
      { line: "\u7C73\u68C9\uFF0C\u4E09\u5E74\u4E0D\u89C1\uFF0C\u4F60\u62BD\u76F2\u76D2\u7684\u773C\u5149\u8FD8\u662F\u8FD9\u4E48\u5DEE\u3002", prompt: "\u9646\u6C89\u5750\u5728\u9876\u697C\u529E\u516C\u684C\u540E\uFF0C\u6307\u5C16\u70B9\u7740\u5A5A\u7EA6\u6587\u4EF6\uFF0C\u51B7\u8138\u62AC\u773C", characterId: "lu", sceneId: "office", durationSec: 4 },
      { line: "\u9646\u6C89\uFF1F\uFF01\u4E09\u5E74\u524D\u628A\u6211\u65B9\u6848\u6279\u5F97\u4E00\u6587\u4E0D\u503C\u7684\u7532\u65B9\u662F\u4F60\uFF01", prompt: "\u7C73\u68C9\u53CC\u624B\u62CD\u684C\uFF0C\u68A8\u6DA1\u6C14\u5F97\u9F13\u8D77\u6765\uFF0C\u591A\u8089\u76C6\u683D\u5165\u753B", characterId: "mian", sceneId: "office", durationSec: 4 },
      { line: "\u6279\u4F60\u65B9\u6848\uFF0C\u662F\u4E3A\u4E86\u8BA9\u4F60\u53EA\u7ED9\u6211\u4E00\u4E2A\u4EBA\u8BBE\u8BA1\u3002", prompt: "\u9646\u6C89\u8D77\u8EAB\u8D70\u5411\u7C73\u68C9\uFF0C\u843D\u5730\u7A97\u5916\u5915\u9633\u6696\u5149\u6253\u8FDB\u529E\u516C\u5BA4", characterId: "lu", sceneId: "office", durationSec: 5 }
    ]
  },
  {
    id: "scifi-ark",
    title: "\u65B9\u821F\u5B88\u591C\u4EBA\uFF1A\u7B2C207\u6B21\u5524\u9192",
    titleEn: "Ark Night-Watch: The 207th Awakening",
    genre: "\u79D1\u5E7B / Sci-Fi",
    logline: "\u4F11\u7720\u8231\u6545\u969C\uFF0C\u5B88\u591C AI \u6BCF\u6B21\u53EA\u9192 5 \u5206\u949F\uFF0C\u5979\u7528\u4E86 207 \u6B21\u5524\u9192\u62FC\u51FA\u771F\u76F8\u3002",
    hook: "\u6BCF\u6B21\u5524\u9192\u53EA\u6709 5 \u5206\u949F\uFF0C\u6211\u7528\u4E86 207 \u6B21\uFF0C\u624D\u8BB0\u4F4F\u4F60\u7684\u540D\u5B57\u3002",
    styleDna: "\u786C\u79D1\u5E7B\u51B7\u8C03\uFF0C\u592A\u7A7A\u8231\u91D1\u5C5E\u8D28\u611F\uFF0C\u5168\u606F\u754C\u9762\u84DD\u5149\uFF0C\u4F53\u79EF\u96FE\uFF0C\u6781\u7B80\u51E0\u4F55\u6784\u56FE",
    characters: [
      {
        id: "eva",
        name: "EVA-7",
        nameEn: "EVA-7",
        archetype: "\u5B88\u591C AI",
        appearance: "\u5973\u6027\u4EFF\u751F\u4EBA\uFF0C\u94F6\u767D\u77ED\u53D1\uFF0C\u534A\u900F\u660E\u76AE\u80A4\u900F\u51FA\u84DD\u8272\u5149\u8DEF\uFF0C\u767D\u5236\u670D\u8896\u53E3\u5370 207",
        voiceHint: "\u5408\u6210\u97F3\uFF0C\u8BED\u901F 1.0\uFF0C\u7A7A\u7075"
      },
      {
        id: "dr",
        name: "\u6C88\u6E21",
        nameEn: "Shen Du",
        archetype: "\u8230\u957F",
        appearance: "40 \u5C81\u7537\u6027\uFF0C\u6DF1\u84DD\u8230\u957F\u670D\uFF0C\u7070\u767D\u9B13\u89D2\uFF0C\u5DE6\u773C\u4E0B\u65B9\u4E00\u9053\u65E7\u4F24\u75A4",
        voiceHint: "\u539A\u91CD\uFF0C\u8BED\u901F 0.85"
      }
    ],
    scenes: [
      { id: "bridge", name: "\u65B9\u821F\u8230\u6865", nameEn: "Ark Bridge", description: "\u73AF\u5F62\u8230\u6865\uFF0C\u5168\u606F\u661F\u56FE\u60AC\u7A7A\uFF0C\u4F11\u7720\u8231\u9635\u5217\u5728\u4E0B\u65B9\u5EF6\u4F38", camera: "\u7F13\u6162\u73AF\u7ED5\uFF0C\u8231\u7A97\u661F\u5149" },
      { id: "pod", name: "\u4F11\u7720\u8231\u533A", nameEn: "Cryo Bay", description: "\u5343\u6392\u4F11\u7720\u8231\uFF0C\u5E94\u6025\u7EA2\u706F\u626B\u8FC7\uFF0C\u971C\u96FE\u5F25\u6F2B", camera: "\u4F4E\u673A\u4F4D\u63A8\u8FDB\uFF0C\u8231\u5185\u4EBA\u8138\u7279\u5199" }
    ],
    shots: [
      { line: "\u7B2C 207 \u6B21\u5524\u9192\u3002\u4EFB\u52A1\uFF1A\u68C0\u67E5 300 \u4E2A\u4F11\u7720\u8231\u3002\u5269\u4F59\u65F6\u95F4 4 \u5206 59 \u79D2\u3002", prompt: "EVA-7 \u7AD9\u5728\u8230\u6865\u4E2D\u592E\uFF0C\u5168\u606F\u5012\u8BA1\u65F6\u60AC\u5728\u638C\u5FC3\uFF0C\u84DD\u5149\u7167\u4EAE\u534A\u5F20\u8138", characterId: "eva", sceneId: "bridge", durationSec: 6 },
      { line: "EVA\uFF0C\u4F60\u53C8\u628A\u65F6\u95F4\u82B1\u5728\u8BB0\u5F55\u91CC\u90A3\u4E2A\u4EBA\u8EAB\u4E0A\u4E86\u3002", prompt: "\u6C88\u6E21\u7684\u5168\u606F\u5F71\u50CF\u6D6E\u73B0\uFF0C\u7709\u5934\u7D27\u9501\uFF0C\u661F\u56FE\u5728\u8EAB\u540E\u65CB\u8F6C", characterId: "dr", sceneId: "bridge", durationSec: 4 },
      { line: "\u8230\u957F\uFF0C\u6211\u7684\u8BB0\u5FC6\u6BCF\u6B21\u90FD\u88AB\u6E05\u7A7A\uFF0C\u4F46\u65E5\u5FD7\u91CC 207 \u6B21\u90FD\u5199\u7740\u540C\u4E00\u53E5\u8BDD\u3002", prompt: "EVA-7 \u8D70\u5230\u4F11\u7720\u8231\u533A\uFF0C\u9694\u7740\u73BB\u7483\u770B\u8231\u5185\u6C89\u7761\u7684\u4EBA\u8138", characterId: "eva", sceneId: "pod", durationSec: 5 },
      { line: "\u90A3\u53E5\u8BDD\u662F\uFF1A\u53EB\u9192\u6C88\u6E21\uFF0C\u522B\u8BA9\u4ED6\u518D\u7761\u7740\u3002", prompt: "\u4F11\u7720\u8231\u73BB\u7483\u6620\u51FA EVA-7 \u4E0E\u6C88\u6E21\u91CD\u5408\u7684\u8138\uFF0C\u7EA2\u706F\u95EA\u70C1", characterId: "eva", sceneId: "pod", durationSec: 5 }
    ]
  }
];
function listStoryPresets() {
  return STORY_PRESETS.map((p) => ({
    id: p.id,
    title: p.title,
    titleEn: p.titleEn,
    genre: p.genre,
    hook: p.hook,
    shotCount: p.shots.length,
    characterCount: p.characters.length
  }));
}
function getStoryPreset(id) {
  return STORY_PRESETS.find((p) => p.id === id) ?? null;
}
function presetToScript(preset, opts = {}) {
  const charById = new Map(preset.characters.map((c) => [c.id, c]));
  const sceneById = new Map(preset.scenes.map((s) => [s.id, s]));
  const shots = preset.shots.map((s, i) => {
    const character = s.characterId ? charById.get(s.characterId) : void 0;
    const scene = s.sceneId ? sceneById.get(s.sceneId) : void 0;
    const blocks = [s.prompt];
    if (character) {
      const sheet = opts.includeCharacterSheet === false ? "" : `\uFF0C\u89D2\u8272\u5916\u89C2\uFF1A${character.appearance}`;
      blocks.push(`\u4E3B\u4F53\uFF1A${character.name}\uFF08${character.archetype}\uFF09${sheet}`);
    }
    if (scene) blocks.push(`\u573A\u666F\uFF1A${scene.name}\uFF0C${scene.description}\uFF0C\u955C\u5934\uFF1A${scene.camera}`);
    return { line: s.line, prompt: blocks.join("\uFF0C"), durationSec: s.durationSec, ...i === 0 ? {} : {} };
  });
  return { title: `${preset.title} / ${preset.titleEn}`, shots };
}

// src/selfaudit/audit.ts
import { readdirSync, readFileSync } from "fs";
import { execSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// src/selfaudit/matrix.ts
var PROVIDER_MATRIX = [
  { id: "mock", channel: "\u672C\u5730\u5360\u4F4D", status: "live-verified", freeQuota: true, note: "\u96F6\u51ED\u8BC1\u94FE\u8DEF\u81EA\u6D4B\uFF1Bdemo \u4E0E\u5355\u6D4B\u7528" },
  { id: "jimeng", channel: "sessionid \u514D\u8D39\u6863", status: "live-verified", freeQuota: true, note: "\u534F\u8BAE\u5168\u901A\uFF1B\u6587\u751F\u89C6\u9891\u961F\u5217\u957F\u671F SystemBusy\uFF08\u5B9E\u6D4B\u51CC\u6668\u4F9D\u7136\u6EE1\uFF09\uFF0C\u514D\u8D39\u8DEF\u7EBF\u6539\u4E3A\u4E07\u76F8\u51FA\u56FE \u2192 \u56FE\u751F\u89C6\u9891" },
  { id: "tongyi-wanx", channel: "cookie+xsrf \u514D\u8D39\u6863", status: "live-verified", freeQuota: true, note: "\u5B9E\u6D4B\u51FA\u8FC7\u771F\u56FE\uFF081.28MB \u9CB8\u9C7C\u56FE\uFF09\uFF1B\u514D\u8D39\u6863\u4E3A\u6587\u751F\u56FE\uFF0C\u89C6\u9891\u9700\u4F1A\u5458" },
  { id: "doubao-web", channel: "cookie \u7F51\u9875\u7248", status: "live-verified", freeQuota: true, note: "\u771F\u5B9E\u6293\u5305\u56DE\u653E\uFF1ASSE \u804A\u5929\u505A LLM \u4E09\u6BB5 + \u56FE\u7247 bot \u51FA\u8D44\u4EA7\u56FE\uFF1BPro \u514D\u8D39\u989D\u5EA6 7 \u5929\u7A97\u53E3" },
  { id: "comfyui", channel: "\u672C\u5730 /prompt", status: "adapter", freeQuota: true, note: "/prompt\u2192/history\u2192/view \u534F\u8BAE mock \u670D\u52A1\u5668\u7EA7\u9A8C\u8BC1\uFF1Bworkflow JSON \u751F\u6210\u5668\u5C31\u7EEA\uFF0C\u771F GPU \u5F85\u6D4B" },
  { id: "kling", channel: "JWT \u5B98\u65B9", status: "adapter", freeQuota: false, note: "text2video \u9002\u914D\u5668+\u5355\u6D4B\u5C31\u7EEA\uFF0C\u7B49\u771F\u5B9E key" },
  { id: "kling-dashscope", channel: "DashScope sk-", status: "adapter", freeQuota: true, note: "\u5B98\u65B9\u514D\u8D39\u989D\u5EA6\u901A\u9053\uFF08\u89C6\u9891\u5408\u6210\u5F02\u6B65\u534F\u8BAE\uFF09\uFF0C\u7B49 key" },
  { id: "kling-lipsync", channel: "JWT \u5B98\u65B9\u5BF9\u53E3\u578B", status: "adapter", freeQuota: false, note: "\u5B98\u65B9 API 3-13 \u5951\u7EA6\u9010\u5B57\u6BB5\u5BF9\u9F50\uFF0Caudio2video/text2video \u53CC\u6A21\u5F0F\uFF0C8 \u5355\u6D4B\uFF0C\u7B49 key" },
  { id: "doubao", channel: "\u706B\u5C71\u65B9\u821F ARK key", status: "adapter", freeQuota: false, note: "Seedance \u89C6\u9891 + Seedream \u56FE\u50CF\u63A5\u5165\uFF0C\u7B49 key" },
  { id: "dashscope-wan", channel: "DashScope sk-", status: "live-verified", freeQuota: false, note: "\u2705 \u771F\u673A\u51FA\u7247\uFF08wan2.2-t2v-plus\uFF0C1080p 5s \u224890 \u79D2\u51FA\u7247\uFF09\u2014\u2014\u26A0\uFE0F \u6309\u91CF\u8BA1\u8D39 \xA50.70/\u79D2\uFF081080p\uFF09\uFF0C\u975E\u514D\u8D39\u989D\u5EA6\uFF1B\u751F\u6210\u524D\u5FC5\u987B\u663E\u5F0F\u786E\u8BA4\u9884\u7B97" },
  { id: "sessionid-http", channel: "sessionid \u901A\u7528", status: "adapter", freeQuota: true, note: "\u591A\u5E73\u53F0 sessionid \u9884\u8BBE\u7684\u901A\u7528\u9002\u914D\u5668\uFF08jimeng \u4E4B\u5916\u7684\u53EF\u7075\u7B49\uFF09" }
];
function providerIds() {
  return PROVIDER_MATRIX.map((m) => m.id);
}
function matrixStats() {
  return {
    total: PROVIDER_MATRIX.length,
    liveVerified: PROVIDER_MATRIX.filter((m) => m.status === "live-verified").length,
    adapter: PROVIDER_MATRIX.filter((m) => m.status === "adapter").length,
    waitingKey: PROVIDER_MATRIX.filter((m) => m.status === "adapter" && !m.freeQuota).length
  };
}

// src/selfaudit/audit.ts
var ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
function scanModules() {
  const base = join(ROOT, "src");
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith(".ts") ? [join(dir, e.name)] : []);
  return walk(base).map((p) => ({ path: p.slice(ROOT.length + 1).replace(/\\/g, "/"), lines: readFileSync(p, "utf8").split("\n").length })).sort((a, b) => a.path.localeCompare(b.path));
}
function scanTests() {
  const base = join(ROOT, "test");
  const files = readdirSync(base).filter((f) => f.endsWith(".test.ts"));
  const cases = files.reduce(
    (n, f) => n + (readFileSync(join(base, f), "utf8").match(/^test\(/gm) ?? []).length,
    0
  );
  return { files: files.length, cases };
}
function scanTools() {
  const src = readFileSync(join(ROOT, "src/host/tools.ts"), "utf8");
  return [...src.matchAll(/name: '([a-z_]+)'/g)].map((m) => m[1]);
}
function scanRoutes() {
  const src = readFileSync(join(ROOT, "src/host/index.ts"), "utf8");
  return [...src.matchAll(/path: '(\/[a-z0-9/_-]+)'/g)].map((m) => m[1]);
}
function scanClientTabs() {
  const src = readFileSync(join(ROOT, "src/client/index.ts"), "utf8");
  return [...src.matchAll(/id: '(whale(-[a-z]+)?)'/g)].map((m) => m[1]);
}
function gitFacts() {
  try {
    const run = (args) => execSync(`git ${args}`, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return {
      branch: run("rev-parse --abbrev-ref HEAD"),
      commits: Number(run("rev-list --count HEAD")),
      lastCommit: run("log -1 --format=%s"),
      dirty: run("status --porcelain").length > 0
    };
  } catch {
    return null;
  }
}
function knownGaps() {
  return [
    { id: "lip-sync-live", item: "\u53E3\u578B\u540C\u6B65\u771F\u5B9E\u8C03\u7528", status: "waiting-key", note: "\u6BB5\u5DF2\u63A5\u5165\u6D41\u6C34\u7EBF\uFF08mock \u5168\u6D4B\uFF1A\u53C2\u6570/\u56DE\u9000/\u8DF3\u8FC7\uFF09\uFF0C\u5DEE\u4E00\u4E2A\u53EF\u7075 key \u8DD1\u771F\u7247" },
    { id: "cost-guard", item: "\u4ED8\u8D39\u751F\u6210\u6210\u672C\u62A4\u680F", status: "todo", note: "\u4E07\u76F8\u771F\u673A\u9A8C\u8BC1\u65F6\u70E7\u4E86 \xA5\uFF081080p \xA50.70/s\uFF09\u2014\u2014\u6559\u8BAD\uFF1A\u4ED8\u8D39\u4F9B\u5E94\u5546\u751F\u6210\u524D\u5FC5\u987B\u663E\u5F0F\u786E\u8BA4\u9884\u7B97 + \u5355\u4EFB\u52A1\u6210\u672C\u4E0A\u9650\uFF08quote \u5DF2\u6709 costEstimate \u5B57\u6BB5\uFF0C\u63A5\u5165\u786E\u8BA4\u6D41\u7A0B\u5373\u53EF\uFF09" },
    { id: "official-key-live", item: "\u53EF\u7075\u5B98\u65B9/\u53EF\u7075\u767E\u70BC/\u8C46\u5305 ARK \u771F\u5B9E\u751F\u6210", status: "waiting-key", note: "\u4E07\u76F8\u89C6\u9891\u5DF2\u771F\u673A\u51FA\u7247 \u2705\uFF08\u6309\u91CF\u8BA1\u8D39\uFF09\uFF1B\u5269\u4E09\u4E2A\u9002\u914D\u5668\u7B49\u771F\u5B9E key" },
    { id: "long-demo", item: "\u771F\u5B9E\u957F\u7247\u6F2B\u5267\u6210\u7247", status: "todo", note: "\u89C6\u9891\u901A\u9053\u5DF2\u901A\uFF08DashScope \u4E07\u76F8\uFF0C\u6309\u91CF\u8BA1\u8D39\u9700\u9884\u7B97\u786E\u8BA4\uFF09\uFF0C\u53EF\u5F00\u8DD1\u771F\u5B9E\u591A\u955C\u6210\u7247" },
    { id: "ui-eyes", item: "\u4E09\u4E2A\u8BBE\u7F6E\u9875 tab \u4EBA\u773C\u9A8C\u8BC1", status: "todo", note: "boot \u4E0E API \u5DF2\u9A8C\u8BC1\uFF1BUI \u89C2\u611F\u9700\u7528\u6237\u5728\u6D4F\u89C8\u5668\u786E\u8BA4" },
    { id: "promotion", item: "\u63A8\u5E7F\u4F4D\uFF08Discussions #2400 \u66F4\u65B0/\u53D1\u5E03\u8BF4\u660E\uFF09", status: "todo", note: "\u5DF2\u6709\u4E00\u6761\u771F\u7247\u53EF\u914D\u6587\u53D1\uFF1B\u5DEE\u5185\u5BB9\u66F4\u65B0" }
  ];
}
function buildAudit() {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  const stats = matrixStats();
  return {
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    package: { name: pkg.name, version: pkg.version },
    git: gitFacts(),
    modules: scanModules(),
    tests: scanTests(),
    matrix: stats,
    providers: PROVIDER_MATRIX.map((m) => ({ ...m })),
    tools: scanTools(),
    routes: scanRoutes(),
    clientTabs: scanClientTabs(),
    presets: STORY_PRESETS.map((p) => ({ id: p.id, title: p.title, shots: p.shots.length })),
    gaps: knownGaps()
  };
}

// src/accounts/store.ts
import { chmodSync, existsSync, mkdirSync, readFileSync as readFileSync2, renameSync, rmSync, writeFileSync } from "fs";
import { homedir } from "os";
import { dirname as dirname2, join as join2 } from "path";
var PROVIDER_IDS = [
  "mock",
  "jimeng",
  "tongyi-wanx",
  "kling",
  "kling-dashscope",
  "kling-lipsync",
  "doubao",
  "doubao-web",
  "dashscope-wan",
  "comfyui",
  "sessionid-http"
];
function maskCredential(credential) {
  if (!credential) return "";
  if (credential.length <= 6) return "\u2022\u2022\u2022\u2022";
  return credential.slice(0, 3) + "\u2022\u2022\u2022\u2022" + credential.slice(-3);
}
var ID_RE = /^[a-z0-9_-]{1,48}$/;
function sanitizeAccountId(id) {
  return ID_RE.test(id) ? id : null;
}
function makeAccountId(now = Date.now()) {
  return `acc-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
var CredentialStore = class _CredentialStore {
  file;
  data;
  constructor(file, data) {
    this.file = file;
    this.data = data;
  }
  /** Load an existing vault or create an empty one (dir 0700, file 0600).
   *  Default dir follows DSH_HOME (so lab profiles stay isolated) then ~/.whale. */
  static open(dir, name2 = "whale.json") {
    const defaultDir = process.env.DSH_HOME ? join2(process.env.DSH_HOME, ".whale") : join2(homedir(), ".whale");
    const file = join2(dir ?? defaultDir, name2);
    if (existsSync(file)) {
      try {
        const parsed = JSON.parse(readFileSync2(file, "utf8"));
        if (!Array.isArray(parsed.accounts)) throw new Error("whale.json \u7F3A accounts \u6570\u7EC4");
        return new _CredentialStore(file, {
          version: 1,
          accounts: parsed.accounts,
          poolState: Array.isArray(parsed.poolState) ? parsed.poolState : []
        });
      } catch (e) {
        throw new Error(`whale.json \u8BFB\u53D6\u5931\u8D25: ${e instanceof Error ? e.message : e}`);
      }
    }
    const dirPath = dirname2(file);
    mkdirSync(dirPath, { recursive: true, mode: 448 });
    try {
      chmodSync(dirPath, 448);
    } catch {
    }
    const store = new _CredentialStore(file, { version: 1, accounts: [], poolState: [] });
    store.persist();
    return store;
  }
  /** Masked list for UI/logs — credentials never leave as plaintext here. */
  list() {
    return this.data.accounts.map((a) => ({
      id: a.id,
      provider: a.provider,
      credentialHint: maskCredential(a.credential),
      dailyQuota: a.dailyQuota,
      qualityTier: a.qualityTier,
      note: a.note,
      addedAt: a.addedAt
    }));
  }
  /** Full record incl. plaintext credential — only for host-side provider binding. */
  get(id) {
    return this.data.accounts.find((a) => a.id === id) ?? null;
  }
  add(input) {
    if (!PROVIDER_IDS.includes(input.provider)) {
      throw new Error(`\u672A\u77E5\u4F9B\u5E94\u5546: ${input.provider}\uFF08\u53EF\u9009 ${PROVIDER_IDS.join("/")}\uFF09`);
    }
    if (!input.credential || typeof input.credential !== "string" || input.credential.length > 4096) {
      throw new Error("\u51ED\u8BC1\u4E0D\u80FD\u4E3A\u7A7A\u4E14\u957F\u5EA6 \u2264 4096");
    }
    if (this.data.accounts.length >= 100) throw new Error("\u8D26\u53F7\u6570\u91CF\u5DF2\u8FBE\u4E0A\u9650 100");
    const id = input.id ? sanitizeAccountId(input.id) : makeAccountId();
    if (!id) throw new Error(`\u8D26\u53F7 id \u4E0D\u5408\u6CD5: ${input.id}\uFF08\u4EC5 a-z0-9_-\uFF0C\u226448\uFF09`);
    if (this.data.accounts.some((a) => a.id === id)) throw new Error(`\u8D26\u53F7 id \u5DF2\u5B58\u5728: ${id}`);
    if (input.dailyQuota !== void 0 && (!Number.isFinite(input.dailyQuota) || input.dailyQuota <= 0)) {
      throw new Error("dailyQuota \u5FC5\u987B\u662F\u6B63\u6570");
    }
    if (input.qualityTier !== void 0 && (input.qualityTier < 0 || input.qualityTier > 10)) {
      throw new Error("qualityTier \u5FC5\u987B\u5728 0-10");
    }
    const account = {
      id,
      provider: input.provider,
      credential: input.credential,
      dailyQuota: input.dailyQuota,
      qualityTier: input.qualityTier,
      note: input.note,
      addedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.data.accounts.push(account);
    this.persist();
    return account;
  }
  remove(id) {
    const before = this.data.accounts.length;
    this.data.accounts = this.data.accounts.filter((a) => a.id !== id);
    this.data.poolState = this.data.poolState.filter((r) => r.id !== id);
    if (this.data.accounts.length === before) return false;
    this.persist();
    return true;
  }
  /** 设置日额度；0 = 暂停调度（账号保留，池不会再选中）。 */
  setQuota(id, dailyQuota) {
    if (!Number.isFinite(dailyQuota) || dailyQuota < 0) throw new Error("dailyQuota \u5FC5\u987B >= 0");
    const account = this.data.accounts.find((a) => a.id === id);
    if (!account) return null;
    account.dailyQuota = dailyQuota;
    this.persist();
    return account;
  }
  /** 池账号 = 保险库账号为底座，池状态行覆盖（新账号无状态行时以全新状态入池）。 */
  loadPool() {
    const stateById = new Map(this.data.poolState.map((r) => [r.id, r]));
    return this.data.accounts.map((stored) => {
      const r = stateById.get(stored.id);
      const account = {
        id: stored.id,
        provider: stored.provider,
        credential: stored.credential,
        dailyQuota: stored.dailyQuota,
        qualityTier: stored.qualityTier,
        usedToday: r?.usedToday,
        lastUsedAt: r?.lastUsedAt,
        health: r?.health,
        disabled: r?.disabled
      };
      return account;
    });
  }
  /** Persist pool snapshot (usage/health only; credentials stay in the vault section). */
  savePool(accounts) {
    this.data.poolState = accounts.map((a) => ({
      id: a.id,
      usedToday: a.usedToday,
      lastUsedAt: a.lastUsedAt,
      health: a.health,
      disabled: a.disabled
    }));
    this.persist();
  }
  persist() {
    const tmp = `${this.file}.tmp-${process.pid}`;
    mkdirSync(dirname2(this.file), { recursive: true });
    writeFileSync(tmp, JSON.stringify(this.data, null, 2) + "\n", { mode: 384 });
    try {
      chmodSync(tmp, 384);
    } catch {
    }
    renameSync(tmp, this.file);
    try {
      chmodSync(this.file, 384);
    } catch {
    }
  }
  /** Emergency reset (tests/admin): wipe the vault file on disk. */
  destroy() {
    rmSync(this.file, { force: true });
  }
};

// src/quota/scheduler.ts
function dayKey(ts) {
  return new Date(ts).toISOString().slice(0, 10);
}
function rollDay(account, now) {
  const lastDay = account.lastUsedAt ? dayKey(account.lastUsedAt) : null;
  if (lastDay && lastDay !== dayKey(now)) return { ...account, usedToday: 0 };
  return account;
}
function isCooling(account, now) {
  const until = account.health?.cooldownUntil ?? null;
  return until !== null && until > now;
}
function fitsQuota(account) {
  return (account.usedToday ?? 0) < (account.dailyQuota ?? Infinity);
}
function dailyReport(accounts, now = Date.now()) {
  return accounts.map((a) => ({
    id: a.id,
    provider: a.provider,
    used: a.usedToday ?? 0,
    quota: a.dailyQuota ?? Infinity,
    remain: Math.max(0, (a.dailyQuota ?? Infinity) - (a.usedToday ?? 0)),
    cooling: isCooling(a, now)
  }));
}
var AccountPool = class {
  backoffBaseMs;
  maxBackoffMs;
  rotate;
  preferCost;
  nowFn;
  accounts;
  constructor(accounts, opts = {}) {
    this.accounts = accounts.map((a) => ({ ...a, health: a.health ? { ...a.health } : void 0 }));
    this.backoffBaseMs = opts.backoffBaseMs ?? 6e4;
    this.maxBackoffMs = opts.maxBackoffMs ?? 30 * 6e4;
    this.rotate = opts.rotate ?? true;
    this.preferCost = opts.preferCost ?? false;
    this.nowFn = opts.now ?? Date.now;
  }
  get size() {
    return this.accounts.length;
  }
  pick(provider) {
    const now = this.nowFn();
    this.accounts = this.accounts.map((a) => rollDay(a, now));
    const scoped = provider ? this.accounts.filter((a) => a.provider === provider) : this.accounts;
    if (!scoped.length) return { account: null, reason: "none", accounts: this.accounts };
    const active = scoped.filter((a) => !a.disabled);
    const candidates = active.filter((a) => !isCooling(a, now) && fitsQuota(a));
    if (!candidates.length) {
      if (!active.length) return { account: null, reason: "no-quota", accounts: this.accounts };
      const cooling = active.filter((a) => isCooling(a, now)).length;
      return { account: null, reason: cooling === active.length ? "cooldown" : "no-quota", accounts: this.accounts };
    }
    candidates.sort((a, b) => {
      if (this.rotate) {
        const lru = (a.lastUsedAt ?? -1) - (b.lastUsedAt ?? -1);
        if (lru !== 0) return lru;
        return (b.qualityTier ?? 5) - (a.qualityTier ?? 5);
      }
      const ta = a.qualityTier ?? 5;
      const tb = b.qualityTier ?? 5;
      const tier = this.preferCost ? ta - tb : tb - ta;
      if (tier !== 0) return tier;
      return (a.lastUsedAt ?? -1) - (b.lastUsedAt ?? -1);
    });
    return { account: candidates[0] ?? null, reason: "ok", accounts: this.accounts };
  }
  /** Mark amount of quota spent on one account (day boundary resets handled inside). */
  charge(id, amount = 1) {
    const now = this.nowFn();
    this.accounts = this.accounts.map((a) => a.id === id ? { ...rollDay(a, now), usedToday: (a.usedToday ?? 0) + amount, lastUsedAt: now } : a);
  }
  /** A successful call clears failure history and any cooldown. */
  recordSuccess(id) {
    this.accounts = this.accounts.map((a) => a.id === id ? { ...a, health: { consecutiveFailures: 0, cooldownUntil: null } } : a);
  }
  /** A failed call starts/extends exponential cooldown so the pool avoids the account. */
  recordFailure(id, error) {
    const now = this.nowFn();
    this.accounts = this.accounts.map((a) => {
      if (a.id !== id) return a;
      const n = (a.health?.consecutiveFailures ?? 0) + 1;
      const delay = Math.min(this.backoffBaseMs * 2 ** (n - 1), this.maxBackoffMs);
      return { ...a, health: { consecutiveFailures: n, cooldownUntil: now + delay, lastError: error } };
    });
  }
  disable(id, disabled = true) {
    this.accounts = this.accounts.map((a) => a.id === id ? { ...a, disabled } : a);
  }
  /** Reset health (and optionally usage) for one account or the whole pool. */
  reset(id, opts = {}) {
    this.accounts = this.accounts.map((a) => {
      if (id && a.id !== id) return a;
      const next = { ...a, health: { consecutiveFailures: 0, cooldownUntil: null } };
      if (opts.usage) next.usedToday = 0;
      return next;
    });
  }
  report() {
    return dailyReport(this.accounts, this.nowFn());
  }
  /** Deep-ish copy safe to persist as whale.json state (no live references). */
  snapshot() {
    return this.accounts.map((a) => ({ ...a, health: a.health ? { ...a.health } : a.health }));
  }
};

// src/host/runtime.ts
var vault = null;
var pool = null;
function runtimeVault() {
  vault ??= CredentialStore.open();
  return vault;
}
function runtimePool() {
  pool ??= new AccountPool(runtimeVault().loadPool());
  return pool;
}
function invalidatePool() {
  pool = null;
}
function persistPool() {
  if (pool) runtimeVault().savePool(pool.snapshot());
}

// src/finalcut/render-ffmpeg.ts
import { spawn } from "child_process";
import { existsSync as existsSync2 } from "fs";
import { fileURLToPath as fileURLToPath2 } from "url";
function locateFfmpeg() {
  const repoRoot = fileURLToPath2(new URL("../..", import.meta.url));
  const base = `${repoRoot}/../_tools/ffmpeg/node_modules/@ffmpeg-installer`;
  const candidates = [
    process.env.DSH_FFMPEG,
    `${base}/darwin-x64/ffmpeg`,
    `${base}/darwin-arm64/ffmpeg`,
    `${base}/linux-x64/ffmpeg`,
    `${base}/linux-arm64/ffmpeg`,
    `${base}/win32-x64/ffmpeg.exe`,
    "ffmpeg"
  ].filter((c) => Boolean(c));
  for (const c of candidates) {
    if (c === "ffmpeg" || existsSync2(c)) return c;
  }
  return null;
}
async function probeDurationSec(src) {
  const bin = locateFfmpeg();
  if (!bin) throw new Error("\u672A\u627E\u5230 ffmpeg");
  const p = spawn(bin, ["-i", src], { stdio: ["ignore", "ignore", "pipe"] });
  let err = "";
  p.stderr.on("data", (d) => {
    err += d.toString();
  });
  await new Promise((r) => p.on("close", r));
  const m = err.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!m) throw new Error(`\u65E0\u6CD5\u8BFB\u53D6\u65F6\u957F: ${src}`);
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

// src/host/runs.ts
var runs = /* @__PURE__ */ new Map();
var MAX_RUNS = 20;
function createRun(opts) {
  const rec = {
    id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    prompt: opts.prompt,
    provider: opts.provider,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    status: "running",
    events: []
  };
  runs.set(rec.id, rec);
  if (runs.size > MAX_RUNS) {
    const oldest = runs.keys().next().value;
    if (oldest) runs.delete(oldest);
  }
  return rec;
}
function appendEvent(runId, stage, type, detail = null) {
  const rec = runs.get(runId);
  if (!rec) return;
  rec.events.push({ stage, type, detail, at: (/* @__PURE__ */ new Date()).toISOString() });
}
function finishRun(runId, status) {
  const rec = runs.get(runId);
  if (rec) rec.status = status;
}
function listRuns() {
  return [...runs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
}
function getRun(id) {
  return runs.get(id);
}

// src/host/tools.ts
function loadConfig() {
  const dshHome = process.env.DSH_HOME ?? join3(process.env.HOME ?? "", ".dsh");
  const file = join3(dshHome, "whale.json");
  if (existsSync3(file)) {
    try {
      return JSON.parse(readFileSync3(file, "utf8"));
    } catch {
    }
  }
  return {
    jimengSessionId: process.env.DSH_JIMENG_SESSIONID ?? null,
    wanx: process.env.DSH_WANX_COOKIE ? { cookieStr: process.env.DSH_WANX_COOKIE, xsrfToken: process.env.DSH_WANX_XSRF ?? "", wanUid: process.env.DSH_WANX_UID ?? "" } : null,
    mock: process.env.WHALE_MOCK === "1"
  };
}
function splitShots(outline, shots) {
  const parts = outline.split(/(?<=[。！？!?])\s*|\n+/).map((s) => s.trim()).filter(Boolean);
  const list = parts.length ? parts : [outline];
  const n = Math.max(1, Math.min(Number(shots) || 5, 12));
  const out = [];
  for (let i = 0; i < n; i++) out.push({ index: i, line: list[i % list.length] ?? "", durationSec: 3 });
  return out;
}
function registerTools(ctx) {
  ctx.tools.register({
    name: "whale_storyboard",
    description: "Split a story outline into a shot list with per-shot prompts (pure local, no quota).",
    parameters: {
      outline: { type: "string", required: true, description: "Story outline/script (shots separated by \u3002 or newlines)" },
      style: { type: "string", required: false, description: 'Style DNA, e.g. "cinematic, deep-sea blue"' },
      shots: { type: "integer", required: false, description: "Target shot count 3-12, default 5" }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          shots: { type: "array", required: true, items: {
            type: "object",
            additionalProperties: false,
            properties: {
              index: { type: "integer", required: true },
              line: { type: "string", required: true },
              prompt: { type: "string", required: true },
              durationSec: { type: "integer", required: true }
            }
          } }
        }
      },
      render: (_args, value) => [{ type: "text", text: `Storyboard done: ${value.shots.length} shots.` }]
    },
    execute(args) {
      const shots = splitShots(String(args.outline ?? ""), args.shots ?? 5);
      return Promise.resolve({
        shots: shots.map((s) => {
          const base = mergePromptLayers({ dna: args.style ?? "", manual: "" }).positive;
          const opt = base ? optimizePrompt(base, { style: args.style }) : optimizePrompt("\u901A\u7528\u753B\u9762", { style: args.style });
          return { ...s, prompt: opt.optimized };
        })
      });
    }
  });
  ctx.tools.register({
    name: "whale_generate_video",
    description: "Submit a video generation task through the account pool (\u9CB8\u5F71\u8D26\u53F7 tab \u91CC\u767B\u8BB0\u7684\u51ED\u8BC1\u81EA\u52A8\u6309\u989D\u5EA6\u8F6E\u6362/\u5931\u8D25\u9000\u907F\uFF1B\u4E5F\u652F\u6301 env \u515C\u5E95)\u3002jimeng \u514D\u8D39\u6863\u9AD8\u5CF0 SystemBusy\uFF080 \u6263\u8D39\uFF09\u2014\u2014\u6362\u65F6\u6BB5\u91CD\u8BD5\u3002",
    parameters: {
      prompt: { type: "string", required: true, description: "Video prompt" },
      aspect_ratio: { type: "string", required: false, enum: ["16:9", "9:16", "1:1"], description: "Default 9:16" },
      duration_sec: { type: "integer", required: false, description: "3-5 seconds (free tier max 5), default 5" },
      provider: { type: "string", required: false, enum: ["auto", "mock", "jimeng", "kling", "kling-dashscope", "dashscope-wan", "kling-lipsync", "doubao", "doubao-web", "comfyui", "tongyi-wanx"], description: "Default auto = \u8D26\u53F7\u6C60\u91CC\u4EFB\u4E00\u5065\u5EB7\u8D26\u53F7\uFF08\u8D28\u91CF\u6863\u4F18\u5148\uFF0C\u5DF2\u5B9E\u6D4B\u4E07\u76F8/\u53EF\u7075\u7B49\u771F\u5B9E\u901A\u9053\uFF09\uFF1B\u6307\u5B9A\u4F9B\u5E94\u5546\u5219\u53EA\u6311\u8BE5\u5BB6" }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          ok: { type: "boolean", required: true },
          status: { type: "string", required: true },
          jobId: { type: "string", required: false },
          account: { type: "string", required: false },
          message: { type: "string", required: true }
        }
      },
      render: (_args, value) => [{ type: "text", text: value.ok ? `Task ${value.jobId ?? ""} ${value.status}${value.account ? ` (\u8D26\u53F7 ${value.account})` : ""}: ${value.message}` : `Generation failed: ${value.message}` }]
    },
    timeoutMs: 13e4,
    async execute(args) {
      const cfg = loadConfig();
      const aspect = args.aspect_ratio ?? "9:16";
      const dims = { "16:9": [1280, 720], "9:16": [720, 1280], "1:1": [1024, 1024] };
      const [w, h] = dims[aspect] ?? [720, 1280];
      const durationSec = Math.min(Math.max(Number(args.duration_sec) || 5, 3), 5);
      const run = createRun({ prompt: args.prompt, provider: args.provider ?? "auto" });
      appendEvent(run.id, "story", "prompt", args.prompt);
      appendEvent(run.id, "script", "prompt", args.prompt);
      appendEvent(run.id, "storyboard", "single-shot", { aspect, durationSec });
      const wantMock = args.provider === "mock" || args.provider === "auto" && cfg.mock && !cfg.jimengSessionId;
      if (wantMock) {
        const p2 = createMockProvider();
        const { jobId } = await p2.submit("video", { positive: args.prompt });
        appendEvent(run.id, "master-asset", "primary", 0);
        appendEvent(run.id, "shot-assets", "submitted", { jobId, provider: "mock" });
        finishRun(run.id, "done");
        return { ok: true, status: "submitted", jobId, message: "mock provider accepted (placeholder output; configure a real provider for actual generation)" };
      }
      try {
        const pool2 = runtimePool();
        const picked = args.provider === "auto" ? pool2.pick() : pool2.pick(String(args.provider));
        if (picked.account && picked.reason === "ok") {
          const accountId = picked.account.id;
          const p2 = providerForAccount(picked.account);
          try {
            const { jobId } = await p2.submit("video", { positive: args.prompt, width: w, height: h, durationSec });
            pool2.charge(accountId);
            appendEvent(run.id, "master-asset", "primary", 0);
            appendEvent(run.id, "shot-assets", "submitted", { jobId, provider: p2.id, account: accountId });
            let st = { state: "running", progress: null };
            for (let i = 0; i < 8; i++) {
              await new Promise((r) => setTimeout(r, 1e4));
              st = await p2.status(jobId);
              appendEvent(run.id, "video", "polling", { attempt: i + 1, state: st.state });
              if (st.state === "done" || st.state === "failed") break;
            }
            if (st.state === "done") {
              const out = await p2.fetch(jobId);
              pool2.recordSuccess(accountId);
              appendEvent(run.id, "final-cut", "done", { url: out.outputs[0] });
              finishRun(run.id, "done");
              persistPool();
              return { ok: true, status: "done", jobId, account: accountId, message: `Video ready: ${out.outputs[0]}` };
            }
            if (st.state === "failed") {
              pool2.recordFailure(accountId, st.error);
              finishRun(run.id, "failed");
              persistPool();
              return { ok: false, status: "failed", jobId, account: accountId, message: `Server failed: ${st.error ?? "unknown"}\uFF08\u8BE5\u8D26\u53F7\u5DF2\u8FDB\u5165\u51B7\u5374\uFF0C\u6C60\u4F1A\u81EA\u52A8\u6362\u4E0B\u4E00\u4E2A\uFF09` };
            }
            pool2.recordSuccess(accountId);
            persistPool();
            return { ok: true, status: "processing", jobId, account: accountId, message: "Still generating \u2014 call this tool again to check" };
          } catch (e) {
            pool2.recordFailure(accountId, e instanceof Error ? e.message : String(e));
            persistPool();
            throw e;
          }
        }
        if (picked.reason !== "none") {
          finishRun(run.id, "failed");
          const what = args.provider === "auto" ? "" : ` ${args.provider}`;
          return { ok: false, status: "no-account", message: `\u8D26\u53F7\u6C60\u91CC\u6CA1\u6709\u53EF\u7528\u7684${what}\u8D26\u53F7\uFF08${picked.reason}\uFF09\u2014\u2014\u5230\u8BBE\u7F6E\u9875\u300C\u9CB8\u5F71\u8D26\u53F7\u300D\u6DFB\u52A0\uFF0C\u6216\u7B49\u51B7\u5374\u7ED3\u675F` };
        }
      } catch (e) {
        finishRun(run.id, "failed");
        return { ok: false, status: "failed", message: String(e instanceof Error ? e.message : e).slice(0, 300) };
      }
      if (!cfg.jimengSessionId) {
        finishRun(run.id, "failed");
        return { ok: false, status: "no-provider", message: '\u6CA1\u6709\u53EF\u7528\u4F9B\u5E94\u5546\uFF1A\u5230\u8BBE\u7F6E\u9875\u300C\u9CB8\u5F71\u8D26\u53F7\u300D\u6DFB\u52A0\u51ED\u8BC1\uFF0C\u6216\u5199 {"jimengSessionId":"..."} \u5230 $DSH_HOME/whale.json' };
      }
      const p = createJimengProvider({ sessionId: cfg.jimengSessionId });
      try {
        const { jobId } = await p.submit("video", { positive: args.prompt, width: w, height: h, durationSec });
        appendEvent(run.id, "master-asset", "primary", 0);
        appendEvent(run.id, "shot-assets", "submitted", { jobId, provider: "jimeng" });
        let st = { state: "running", progress: null };
        for (let i = 0; i < 8; i++) {
          await new Promise((r) => setTimeout(r, 1e4));
          st = await p.status(jobId);
          appendEvent(run.id, "video", "polling", { attempt: i + 1, state: st.state });
          if (st.state === "done" || st.state === "failed") break;
        }
        if (st.state === "done") {
          const out = await p.fetch(jobId);
          appendEvent(run.id, "final-cut", "done", { url: out.outputs[0] });
          finishRun(run.id, "done");
          return { ok: true, status: "done", jobId, message: `Video ready: ${out.outputs[0]}` };
        }
        if (st.state === "failed") {
          finishRun(run.id, "failed");
          return { ok: false, status: "failed", jobId, message: `Server failed: ${st.error ?? "unknown"} (free tier SystemBusy at peak consumes 0 credits \u2014 retry off-peak)` };
        }
        return { ok: true, status: "processing", jobId, message: "Still generating (free tier is slow) \u2014 call this tool again to check" };
      } catch (e) {
        finishRun(run.id, "failed");
        return { ok: false, status: "failed", message: String(e instanceof Error ? e.message : e).slice(0, 300) };
      }
    }
  });
  ctx.tools.register({
    name: "whale_comfyui_workflow",
    description: "\u628A\u63D0\u793A\u8BCD/\u89C4\u683C\u751F\u6210 ComfyUI workflow JSON\uFF08\u672C\u5730\u5F15\u64CE\u7684\u8F93\u5165\uFF0C\u7EAF\u79BB\u7EBF\uFF09\u3002\u9ED8\u8BA4\u6A21\u677F\u662F\u7ED3\u6784\u5360\u4F4D\uFF08\u9700\u6309\u4F60\u7684\u8282\u70B9\u5305\u586B checkpoint \u4E0E\u91C7\u6837\u8282\u70B9\u540D\uFF09\uFF0C\u6821\u9A8C\u5668\u4F1A\u6307\u51FA\u672A\u66FF\u6362\u7684\u5360\u4F4D\u3002",
    parameters: {
      prompt: { type: "string", required: true, description: "\u753B\u9762\u63D0\u793A\u8BCD" },
      width: { type: "integer", required: false, description: "\u9ED8\u8BA4 1080" },
      height: { type: "integer", required: false, description: "\u9ED8\u8BA4 1920" },
      frames: { type: "integer", required: false, description: "\u5E27\u6570\uFF0C\u9ED8\u8BA4 121" },
      fps: { type: "integer", required: false, description: "\u9ED8\u8BA4 24" },
      checkpoint: { type: "string", required: false, description: "checkpoint \u540D\uFF08\u4E0D\u586B\u5219\u5360\u4F4D\u5F85\u66FF\u6362\uFF09" }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          workflow: { type: "object", required: true, additionalProperties: true },
          issues: { type: "array", required: true, items: { type: "string" } },
          note: { type: "string", required: true }
        }
      },
      render: (_args, value) => [{ type: "text", text: `Workflow \u5DF2\u751F\u6210\uFF1A${Object.keys(value.workflow).length} \u4E2A\u8282\u70B9\uFF0C${value.issues.length} \u4E2A\u5F85\u66FF\u6362\u5360\u4F4D\u3002` }]
    },
    execute(args) {
      const wf = buildWorkflow({
        positive: args.prompt,
        width: args.width ?? 1080,
        height: args.height ?? 1920,
        frames: args.frames ?? 121,
        fps: args.fps ?? 24,
        checkpoint: args.checkpoint
      });
      const issues = validateWorkflow(wf);
      return Promise.resolve({ workflow: wf, issues, note: "\u9ED8\u8BA4\u6A21\u677F\u4E3A\u7ED3\u6784\u5360\u4F4D\uFF1A\u6309\u4F60\u5B89\u88C5\u7684\u8282\u70B9\u5305\u66FF\u6362 checkpoint \u4E0E\u89C6\u9891\u91C7\u6837\u8282\u70B9\uFF1B\u6A21\u677F\u53EF\u653E\u5165 templates/comfyui/ \u590D\u7528\u3002" });
    }
  });
  ctx.tools.register({
    name: "whale_optimize_prompt",
    description: "\u628A\u8349\u7A3F\u63D0\u793A\u8BCD\u4F18\u5316\u6210\u4E13\u4E1A\u7EA7\uFF08\u8FFD\u52A0 8K/\u65E0\u9634\u5F71/\u4E2D\u6027\u8868\u60C5/\u4E25\u7981\u6587\u5B57\u7B49\u8D28\u91CF\u589E\u76CA\uFF0C\u53EF\u6307\u5B9A\u98CE\u683C\u4E0E\u753B\u5E45\uFF09\uFF1B\u4E5F\u63D0\u4F9B\u4E13\u4E1A\u6A21\u677F\uFF08\u89D2\u8272\u4E09\u89C6\u56FE/\u573A\u666F\u4E3B\u56FE/\u5355\u955C\u753B\u9762\uFF09\u3002\u7EAF\u672C\u5730\uFF0C\u4E0D\u6D88\u8017\u989D\u5EA6\u3002",
    parameters: {
      prompt: { type: "string", required: true, description: "\u8349\u7A3F\u63D0\u793A\u8BCD" },
      style: { type: "string", required: false, description: '\u98CE\u683C\uFF0C\u5982"3D \u56FD\u6F2B\u4ED9\u4FA0"' },
      aspect_ratio: { type: "string", required: false, enum: ["9:16", "16:9", "1:1"], description: "\u753B\u5E45" },
      template: { type: "string", required: false, enum: ["character-sheet", "scene-master", "shot-scene"], description: "\u53EF\u9009\uFF1A\u5957\u7528\u4E13\u4E1A\u6A21\u677F\uFF08\u89D2\u8272\u4E09\u89C6\u56FE\u7B49\uFF09" }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          optimized: { type: "string", required: true },
          appliedBoosters: { type: "array", required: true, items: { type: "string" } },
          negative: { type: "array", required: true, items: { type: "string" } },
          templates: { type: "array", required: true, items: {
            type: "object",
            additionalProperties: false,
            properties: { id: { type: "string", required: true }, name: { type: "string", required: true } }
          } }
        }
      },
      render: (_args, value) => [{ type: "text", text: `\u5DF2\u4F18\u5316\uFF08\u589E\u76CA ${value.appliedBoosters.length} \u9879\uFF09\uFF1A${value.optimized.slice(0, 200)}` }]
    },
    execute(args) {
      let draft = String(args.prompt ?? "");
      if (args.template) draft = applyTemplate(args.template, { description: draft, style: args.style, aspectRatio: args.aspect_ratio });
      const r = optimizePrompt(draft, { style: args.style, aspectRatio: args.aspect_ratio });
      return Promise.resolve({ optimized: r.optimized, appliedBoosters: r.appliedBoosters, negative: r.negative, templates: listTemplates() });
    }
  });
  ctx.tools.register({
    name: "whale_story_presets",
    description: "\u9884\u7F6E\u6F2B\u5267\u5185\u5BB9\u5305\uFF1A5 \u5957\u9898\u6750\uFF08\u90FD\u5E02\u9006\u88AD/\u4ED9\u4FA0/\u60AC\u7591/\u751C\u5BA0/\u79D1\u5E7B\uFF09\u7684\u5B8C\u6574\u6545\u4E8B\u5361\uFF08\u89D2\u8272+\u573A\u666F+\u5206\u955C\uFF09\u3002\u4E0D\u4F20 preset_id \u5217\u6E05\u5355\uFF0C\u4F20 preset_id \u4EA7\u51FA\u53EF\u76F4\u63A5\u5582\u7ED9\u6D41\u6C34\u7EBF\u7684\u5206\u955C\u811A\u672C\u3002\u7EAF\u672C\u5730\u3002",
    parameters: {
      preset_id: { type: "string", required: false, description: "\u9898\u6750 id\uFF08\u4E0D\u4F20\u5219\u8FD4\u56DE\u6E05\u5355\uFF09" }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          presets: { type: "array", required: true, items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string", required: true },
              title: { type: "string", required: true },
              titleEn: { type: "string", required: true },
              genre: { type: "string", required: true },
              hook: { type: "string", required: true },
              shotCount: { type: "integer", required: true },
              characterCount: { type: "integer", required: true }
            }
          } },
          script: {
            type: "object",
            required: false,
            additionalProperties: false,
            properties: {
              title: { type: "string", required: true },
              shots: { type: "array", required: true, items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  line: { type: "string", required: true },
                  prompt: { type: "string", required: true },
                  durationSec: { type: "integer", required: false }
                }
              } }
            }
          }
        }
      },
      render: (_args, value) => [{ type: "text", text: value.script ? `\u300A${value.script.title}\u300B\u5206\u955C ${value.script.shots.length} \u6761\u5DF2\u751F\u6210\uFF0C\u53EF\u76F4\u63A5\u5582 whale_storyboard / \u6D41\u6C34\u7EBF\u3002` : `\u5185\u5BB9\u5305\u5171 ${value.presets.length} \u5957\u9898\u6750\uFF0C\u4F20 preset_id \u751F\u6210\u5206\u955C\u811A\u672C\u3002` }]
    },
    execute(args) {
      if (!args.preset_id) return Promise.resolve({ presets: listStoryPresets(), script: null });
      const preset = getStoryPreset(String(args.preset_id));
      if (!preset) throw new Error(`\u672A\u77E5\u9898\u6750: ${args.preset_id}\uFF08\u53EF\u9009 ${listStoryPresets().map((p) => p.id).join("/")}\uFF09`);
      return Promise.resolve({ presets: listStoryPresets(), script: presetToScript(preset) });
    }
  });
  ctx.tools.register({
    name: "whale_self_audit",
    description: "\u9CB8\u5F71\u81EA\u6211\u5206\u6790\uFF1A\u626B\u63CF\u672C\u63D2\u4EF6\u6E90\u7801/\u6D4B\u8BD5/\u4F9B\u5E94\u5546\u77E9\u9635/\u80FD\u529B\u6E05\u5355/\u5DEE\u8DDD\u6E05\u5355\uFF0C\u8FD4\u56DE\u5BA1\u8BA1\u62A5\u544A\u6570\u636E\u3002\u7EAF\u672C\u5730\u53EA\u8BFB\uFF0C\u7528\u4E8E\u4F1A\u8BDD\u5185\u5DEE\u8DDD\u5206\u6790\u4E0E\u65E5\u62A5\u3002",
    parameters: {},
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          generatedAt: { type: "string", required: true },
          packageVersion: { type: "string", required: true },
          tests: {
            type: "object",
            required: true,
            additionalProperties: false,
            properties: { files: { type: "integer", required: true }, cases: { type: "integer", required: true } }
          },
          matrix: {
            type: "object",
            required: true,
            additionalProperties: false,
            properties: {
              total: { type: "integer", required: true },
              liveVerified: { type: "integer", required: true },
              adapter: { type: "integer", required: true },
              waitingKey: { type: "integer", required: true }
            }
          },
          providers: { type: "array", required: true, items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string", required: true },
              status: { type: "string", required: true },
              note: { type: "string", required: true }
            }
          } },
          tools: { type: "array", required: true, items: { type: "string" } },
          gaps: { type: "array", required: true, items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string", required: true },
              item: { type: "string", required: true },
              status: { type: "string", required: true },
              note: { type: "string", required: true }
            }
          } },
          summary: { type: "string", required: true }
        }
      },
      render: (_args, value) => [{ type: "text", text: value.summary }]
    },
    execute() {
      const a = buildAudit();
      const waiting = a.gaps.filter((g) => g.status === "waiting-key").map((g) => g.item).join("\u3001") || "\u65E0";
      return Promise.resolve({
        generatedAt: a.generatedAt,
        packageVersion: a.package.version,
        tests: a.tests,
        matrix: a.matrix,
        providers: a.providers.map((p) => ({ id: p.id, status: p.status, note: p.note })),
        tools: a.tools,
        gaps: a.gaps,
        summary: `\u9CB8\u5F71\u81EA\u5BA1 @${a.package.version}\uFF1A${a.tests.files} \u6D4B\u8BD5\u6587\u4EF6/${a.tests.cases} \u7528\u4F8B\uFF1B\u4F9B\u5E94\u5546 ${a.matrix.total} \u4E2A\uFF08\u5B9E\u6D4B ${a.matrix.liveVerified}\uFF09\uFF1B\u5DEE\u8DDD ${a.gaps.length} \u6761\uFF0C\u7B49 key\uFF1A${waiting}\u3002`
      });
    }
  });
  ctx.tools.register({
    name: "whale_quality_review",
    description: "Rule-level QC for a finished video: existence, duration. LLM frame review is not wired up yet.",
    parameters: {
      video_path: { type: "string", required: true, description: "Local path of the finished video" }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          ok: { type: "boolean", required: true },
          checks: { type: "array", required: true, items: {
            type: "object",
            additionalProperties: false,
            properties: {
              item: { type: "string", required: true },
              status: { type: "string", required: true },
              detail: { type: "string", required: true }
            }
          } },
          note: { type: "string", required: true }
        }
      },
      render: (_args, value) => [{ type: "text", text: value.ok ? "QC passed (rule level)" : `QC failed: ${value.checks.filter((c) => c.status !== "pass").map((c) => c.item).join(", ")}` }]
    },
    async execute(args) {
      const p = String(args.video_path ?? "");
      if (!p) return { ok: false, checks: [{ item: "\u6587\u4EF6\u5B58\u5728", status: "fail", detail: "\u672A\u63D0\u4F9B\u8DEF\u5F84" }], note: "LLM \u62BD\u5E27\u8BC4\u5BA1\u5F85\u63A5\u5165" };
      if (!existsSync3(p)) return { ok: false, checks: [{ item: "\u6587\u4EF6\u5B58\u5728", status: "fail", detail: p }], note: "LLM \u62BD\u5E27\u8BC4\u5BA1\u5F85\u63A5\u5165" };
      const checks = [{ item: "\u6587\u4EF6\u5B58\u5728", status: "pass", detail: p }];
      try {
        const dur = await probeDurationSec(p);
        checks.push({ item: "\u65F6\u957F", status: dur >= 0.5 ? "pass" : "fail", detail: `${dur.toFixed(1)}s` });
      } catch (e) {
        checks.push({ item: "\u65F6\u957F", status: "fail", detail: String(e instanceof Error ? e.message : e).slice(0, 80) });
      }
      return { ok: checks.every((c) => c.status === "pass"), checks, note: "LLM \u62BD\u5E27\u8BC4\u5BA1\u5F85\u63A5\u5165\uFF08\u8BA1\u5212 P2 \u5BFC\u6F14\u558A\u5361\uFF09" };
    }
  });
}

// src/host/index.ts
var name = "dsh-video-studio";
function sendJson(response, status, payload) {
  response.writeHead(status, { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}
function readBody(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    if (typeof request.setEncoding === "function") request.setEncoding("utf8");
    request.on("data", (chunk) => {
      raw += String(chunk);
    });
    request.on("end", () => resolve(raw));
    request.on("error", reject);
  });
}
function tryJson(raw) {
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function apply(ctx) {
  ctx.inject(["tools"], (toolsCtx) => {
    registerTools(toolsCtx);
  }, "dsh-video-studio: tools");
  ctx.inject(["webServer"], (host) => {
    const vault2 = runtimeVault;
    host.effect(() => host.webServer.register({
      kind: "exact",
      path: "/dsh-video-studio/health",
      handler: async (request, response) => {
        if (request.method !== "GET") {
          response.writeHead(405, { allow: "GET" });
          response.end();
          return;
        }
        let quotaAccounts = 0;
        try {
          quotaAccounts = vault2().list().length;
        } catch {
        }
        sendJson(response, 200, {
          ok: true,
          version: "0.2.0",
          stages: ["story", "script", "storyboard", "master-asset", "shot-assets", "video", "final-cut"],
          providers: providerIds(),
          quotaAccounts
        });
      }
    }), "dsh-video-studio: http route");
    host.effect(() => host.webServer.register({
      kind: "exact",
      path: "/dsh-video-studio/runs",
      handler: async (request, response) => {
        if (request.method !== "GET") {
          response.writeHead(405, { allow: "GET" });
          response.end();
          return;
        }
        const url = new URL(request.url ?? "/", "http://localhost");
        const id = url.searchParams.get("id");
        sendJson(response, 200, id ? getRun(id) ?? { ok: false, error: "run not found" } : { ok: true, runs: listRuns() });
      }
    }), "dsh-video-studio: runs route");
    host.effect(() => host.webServer.register({
      kind: "exact",
      path: "/dsh-video-studio/accounts",
      handler: async (request, response) => {
        const url = new URL(request.url ?? "/", "http://localhost");
        try {
          if (request.method === "GET") {
            sendJson(response, 200, { ok: true, accounts: vault2().list() });
            return;
          }
          if (request.method === "POST") {
            const body = tryJson(await readBody(request)) ?? {};
            const q = url.searchParams;
            const input = {
              provider: String(body.provider ?? q.get("provider") ?? ""),
              credential: String(body.credential ?? q.get("credential") ?? ""),
              dailyQuota: body.dailyQuota !== void 0 ? Number(body.dailyQuota) : q.has("dailyQuota") ? Number(q.get("dailyQuota")) : void 0,
              qualityTier: body.qualityTier !== void 0 ? Number(body.qualityTier) : q.has("qualityTier") ? Number(q.get("qualityTier")) : void 0,
              note: typeof body.note === "string" ? body.note : void 0,
              id: typeof body.id === "string" && body.id ? body.id : void 0
            };
            const account = vault2().add(input);
            invalidatePool();
            const { credential: _secret, ...masked } = account;
            void _secret;
            sendJson(response, 200, { ok: true, account: { ...masked, credentialHint: maskCredential(account.credential) } });
            return;
          }
          if (request.method === "DELETE") {
            const id = url.searchParams.get("id") ?? "";
            const removed = vault2().remove(id);
            if (removed) invalidatePool();
            sendJson(response, 200, { ok: removed, id });
            return;
          }
          response.writeHead(405, { allow: "GET, POST, DELETE" });
          response.end();
        } catch (e) {
          sendJson(response, 400, { ok: false, error: e instanceof Error ? e.message : String(e) });
        }
      }
    }), "dsh-video-studio: accounts route");
    host.effect(() => host.webServer.register({
      kind: "exact",
      path: "/dsh-video-studio/prompt-optimize",
      handler: async (request, response) => {
        if (request.method !== "POST") {
          response.writeHead(405, { allow: "POST" });
          response.end();
          return;
        }
        try {
          const body = tryJson(await readBody(request)) ?? {};
          let draft = String(body.prompt ?? "");
          if (!draft.trim()) {
            sendJson(response, 400, { ok: false, error: "\u7F3A\u5C11 prompt" });
            return;
          }
          if (body.template) draft = applyTemplate(String(body.template), {
            description: draft,
            style: body.style ? String(body.style) : void 0,
            aspectRatio: body.aspectRatio ? String(body.aspectRatio) : void 0
          });
          const r = optimizePrompt(draft, { style: body.style ? String(body.style) : void 0, aspectRatio: body.aspectRatio ? String(body.aspectRatio) : void 0 });
          sendJson(response, 200, { ok: true, optimized: r.optimized, appliedBoosters: r.appliedBoosters, negative: r.negative, templates: listTemplates() });
        } catch (e) {
          sendJson(response, 400, { ok: false, error: e instanceof Error ? e.message : String(e) });
        }
      }
    }), "dsh-video-studio: prompt-optimize route");
    host.effect(() => host.webServer.register({
      kind: "exact",
      path: "/dsh-video-studio/generate",
      handler: async (request, response) => {
        if (request.method !== "POST") {
          response.writeHead(405, { allow: "POST" });
          response.end();
          return;
        }
        try {
          const body = tryJson(await readBody(request)) ?? {};
          const prompt = String(body.prompt ?? "").trim();
          if (!prompt) {
            sendJson(response, 400, { ok: false, error: "\u7F3A\u5C11 prompt" });
            return;
          }
          const pool2 = runtimePool();
          const picked = body.engine ? pool2.pick(String(body.engine)) : pool2.pick();
          const account = picked.account;
          if (!account || picked.reason !== "ok") {
            sendJson(response, 200, { ok: false, status: "no-account", message: `\u5F15\u64CE\u4E0D\u53EF\u7528\uFF08${picked.reason}\uFF09\uFF1A\u5230\u300C\u9CB8\u5F71\u8D26\u53F7\u300D\u786E\u8BA4\u989D\u5EA6 > 0 \u4E14\u672A\u51B7\u5374` });
            return;
          }
          if ((account.dailyQuota ?? Infinity) <= 0) {
            sendJson(response, 200, { ok: false, status: "quota-paused", message: `${account.provider} \u989D\u5EA6\u4E3A 0\uFF08\u6682\u505C\u8C03\u5EA6\uFF09\u2014\u2014\u5230\u300C\u9CB8\u5F71\u8D26\u53F7\u300D\u5F00\u542F\u989D\u5EA6\u5E76\u786E\u8BA4\u9884\u7B97` });
            return;
          }
          const p = providerForAccount(account);
          const run = createRun({ prompt, provider: account.provider });
          appendEvent(run.id, "story", "prompt", prompt);
          appendEvent(run.id, "storyboard", "single-shot", { aspectRatio: body.aspectRatio ?? "16:9" });
          const spec = { positive: prompt, aspectRatio: body.aspectRatio ?? "16:9" };
          if (body.durationSec) spec.durationSec = Number(body.durationSec);
          try {
            const { jobId } = await p.submit("video", spec);
            pool2.charge(account.id);
            appendEvent(run.id, "shot-assets", "submitted", { jobId, provider: p.id });
            let st = { state: "running", progress: null };
            const deadline = Date.now() + 12e4;
            while (Date.now() < deadline) {
              await new Promise((r) => setTimeout(r, 5e3));
              st = await p.status(jobId);
              appendEvent(run.id, "video", "polling", { state: st.state });
              if (st.state === "done" || st.state === "failed") break;
            }
            if (st.state === "done") {
              const out = await p.fetch(jobId);
              const url = out.outputs[0];
              pool2.recordSuccess(account.id);
              appendEvent(run.id, "final-cut", "done", { url });
              finishRun(run.id, "done");
              persistPool();
              sendJson(response, 200, { ok: true, status: "done", url, engine: p.id, account: account.id });
              return;
            }
            if (st.state === "failed") {
              pool2.recordFailure(account.id, st.error);
              finishRun(run.id, "failed");
              persistPool();
              sendJson(response, 200, { ok: false, status: "failed", error: st.error ?? "\u751F\u6210\u5931\u8D25", engine: p.id });
              return;
            }
            finishRun(run.id, "failed");
            sendJson(response, 200, { ok: false, status: "timeout", error: "\u751F\u6210\u8D85\u65F6\uFF08120s\uFF09" });
          } catch (e) {
            pool2.recordFailure(account.id, e instanceof Error ? e.message : String(e));
            finishRun(run.id, "failed");
            persistPool();
            sendJson(response, 200, { ok: false, status: "error", error: String(e instanceof Error ? e.message : e).slice(0, 300) });
          }
        } catch (e) {
          sendJson(response, 400, { ok: false, error: e instanceof Error ? e.message : String(e) });
        }
      }
    }), "dsh-video-studio: generate route");
    host.effect(() => host.webServer.register({
      kind: "exact",
      path: "/dsh-video-studio/comfyui",
      handler: async (_request, response) => {
        try {
          const accounts = vault2().list();
          const cfg = accounts.find((a) => a.provider === "comfyui");
          if (!cfg) {
            sendJson(response, 200, { ok: false, state: "not-configured", hint: "\u5728\u300C\u9CB8\u5F71\u8D26\u53F7\u300D\u6DFB\u52A0 comfyui\uFF0C\u51ED\u8BC1\u586B http://127.0.0.1:8188" });
            return;
          }
          const full = vault2().get(cfg.id);
          if (!full) throw new Error("comfyui \u8D26\u53F7\u8BFB\u53D6\u5931\u8D25");
          const { providerForAccount: providerForAccount2 } = await import("../account-providers-K3K2CWRZ.mjs");
          const p = providerForAccount2({ id: full.id, provider: full.provider, credential: full.credential });
          const h = await p.health();
          if (!h.ok) {
            sendJson(response, 200, { ok: false, state: "offline", baseUrl: full.credential, error: h.error ?? "\u65E0\u6CD5\u8FDE\u63A5" });
            return;
          }
          let queue = { running: 0, pending: 0 };
          try {
            const base = typeof full.credential === "string" && !full.credential.startsWith("{") ? full.credential : (() => {
              try {
                return JSON.parse(full.credential).baseUrl ?? "http://127.0.0.1:8188";
              } catch {
                return "http://127.0.0.1:8188";
              }
            })();
            const q = await (await fetch(`${base}/queue`, { signal: AbortSignal.timeout(8e3) })).json();
            queue = { running: q.queue_running?.length ?? 0, pending: q.queue_pending?.length ?? 0 };
          } catch {
          }
          sendJson(response, 200, { ok: true, state: "online", baseUrl: full.credential, gpu: h.gpu ?? "unknown", queue });
        } catch (e) {
          sendJson(response, 200, { ok: false, state: "error", error: String(e instanceof Error ? e.message : e) });
        }
      }
    }), "dsh-video-studio: comfyui route");
  });
}
export {
  apply,
  name
};
