window.__ModuleLoader__.load({
  id: "@hackerfish/dsh-video-studio",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.ts
var client_exports = {};
__export(client_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(client_exports);
var import_react = require("react");
var inject = ["slots"];
function Panel({ loadHealth }) {
  const [state, setState] = (0, import_react.useState)({ loading: true, error: null, data: null });
  (0, import_react.useEffect)(() => {
    let alive = true;
    loadHealth().then((data) => {
      if (alive) setState({ loading: false, error: null, data });
    }).catch((err) => {
      if (alive) setState({ loading: false, error: String(err?.message ?? err), data: null });
    });
    return () => {
      alive = false;
    };
  }, [loadHealth]);
  if (state.loading) return (0, import_react.createElement)("p", { role: "status" }, "Reading whale status\u2026");
  if (state.error) return (0, import_react.createElement)("p", { role: "alert" }, "Status read failed: " + state.error);
  const d = state.data;
  return (0, import_react.createElement)(
    "div",
    null,
    (0, import_react.createElement)("h2", null, "\u9CB8\u5F71 \xB7 \u8D26\u53F7\u4E0E\u989D\u5EA6 / Accounts & Quota"),
    (0, import_react.createElement)("p", null, "Version " + d.version + " \xB7 Pipeline: " + d.stages.join(" \u2192 ")),
    (0, import_react.createElement)(
      "ul",
      null,
      d.providers.map((p) => (0, import_react.createElement)(
        "li",
        { key: p },
        p,
        p === "sessionid-http" ? "\uFF08\u5373\u68A6/\u53EF\u7075\u514D\u8D39\u989D\u5EA6\uFF0Csessionid \u5F85\u914D\u7F6E\uFF09" : ""
      ))
    ),
    (0, import_react.createElement)(
      "p",
      { style: { opacity: 0.7 } },
      "Accounts registered: " + d.quotaAccounts + " \xB7 Quota scheduler ready (quality first, cost second)"
    )
  );
}
function VideoCard(props) {
  const block = props?.block ?? null;
  const args = block?.call?.arguments ?? block?.arguments ?? {};
  const res = block?.result ?? block?.call?.result ?? null;
  const value = res?.value ?? (typeof res?.content === "string" ? (() => {
    try {
      return JSON.parse(res.content);
    } catch {
      return null;
    }
  })() : null);
  const message = value?.message ?? "";
  const url = (message.match(/https?:\/\/[^\s"'<>]+/) ?? [null])[0];
  const status = value?.status ?? (res?.isError ? "failed" : "running");
  return (0, import_react.createElement)(
    "div",
    { style: { padding: "8px 0", display: "flex", flexDirection: "column", gap: 8 } },
    (0, import_react.createElement)(
      "div",
      null,
      (0, import_react.createElement)("strong", null, "\u{1F3AC} \u9CB8\u5F71\u751F\u6210 "),
      (0, import_react.createElement)("span", { style: { opacity: 0.75, fontSize: 13 } }, "\u72B6\u6001: " + String(status))
    ),
    args?.prompt ? (0, import_react.createElement)("div", { style: { fontSize: 13, opacity: 0.85 } }, "\u63D0\u793A\u8BCD: " + String(args.prompt)) : null,
    message ? (0, import_react.createElement)("div", { style: { fontSize: 13 } }, message) : null,
    url ? (0, import_react.createElement)("video", { src: url, controls: true, style: { width: "100%", maxWidth: 420, borderRadius: 8 } }) : null
  );
}
var WHALE_BUILD = "r5-storyboard";
var WHALE_STAGE_LABELS = {
  story: "\u6545\u4E8B",
  script: "\u5267\u672C",
  storyboard: "\u5206\u955C",
  "master-asset": "\u4E3B\u56FE",
  "shot-assets": "\u8D44\u4EA7\u56FE",
  video: "\u89C6\u9891",
  "final-cut": "\u6210\u7247"
};
function WorkbenchPanel(_props) {
  const [doc, setDoc] = (0, import_react.useState)(null);
  const [comfy, setComfy] = (0, import_react.useState)(null);
  const [error, setError] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    let alive = true;
    const load = () => {
      fetch("/dsh-video-studio/runs", { cache: "no-store" }).then((r) => r.json()).then((d) => {
        if (alive) setDoc(d);
      }).catch((e) => {
        if (alive) setError(String(e?.message ?? e));
      });
      fetch("/dsh-video-studio/comfyui", { cache: "no-store" }).then((r) => r.json()).then((d) => {
        if (alive) setComfy(d);
      }).catch(() => {
        if (alive) setComfy({ state: "error", error: "comfyui \u8DEF\u7531\u4E0D\u53EF\u8FBE" });
      });
    };
    load();
    const timer = setInterval(load, 3e3);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  if (error) return (0, import_react.createElement)("p", { role: "alert" }, "\u5DE5\u4F5C\u53F0\u8BFB\u53D6\u5931\u8D25: " + error);
  if (!doc) return (0, import_react.createElement)("p", { role: "status" }, "\u6B63\u5728\u8BFB\u53D6\u8FD0\u884C\u8BB0\u5F55\u2026");
  const runs = doc.runs ?? [];
  const comfyState = comfy?.state ?? "loading";
  const comfyColor = comfyState === "online" ? "#2ea043" : comfyState === "offline" || comfyState === "error" ? "#c83c3c" : "rgba(0,0,0,.45)";
  const comfyTitle = comfyState === "online" ? "ComfyUI \u5728\u7EBF" : comfyState === "offline" ? "ComfyUI \u79BB\u7EBF" : comfyState === "not-configured" ? "ComfyUI \u672A\u914D\u7F6E" : comfyState === "error" ? "ComfyUI \u72B6\u6001\u8BFB\u53D6\u5931\u8D25" : "ComfyUI \u72B6\u6001\u8BFB\u53D6\u4E2D\u2026";
  const comfyDetail = comfyState === "online" ? `GPU: ${comfy.gpu ?? "unknown"} \xB7 \u961F\u5217 \u8FD0\u884C${comfy.queue?.running ?? 0}/\u7B49\u5F85${comfy.queue?.pending ?? 0}` : comfyState === "offline" ? comfy.error ?? "\u65E0\u6CD5\u8FDE\u63A5" : comfyState === "not-configured" ? comfy.hint ?? "" : comfyState === "error" ? comfy.error ?? "\u8BF7\u91CD\u542F dsh \u52A0\u8F7D\u65B0\u7248\u8DEF\u7531" : "";
  const ASSET_STAGES = [
    { id: "character-sheet", label: "\u89D2\u8272\u4E09\u89C6\u56FE", tmpl: "character-sheet", hint: "\u6A21\u677F\u5DF2\u5C31\u7EEA\uFF1Awhale_optimize_prompt \u5957\u7528" },
    { id: "scene-master", label: "\u573A\u666F\u4E3B\u56FE", tmpl: "scene-master", hint: "\u6A21\u677F\u5DF2\u5C31\u7EEA\uFF1Ascene-master" },
    { id: "props", label: "\u9053\u5177\u56FE", tmpl: "shot-scene", hint: "\u5F85\u63A5\u5165\u751F\u6210" },
    { id: "per-shot", label: "\u9010\u955C\u8D44\u4EA7\u56FE", tmpl: "shot-scene", hint: "\u4E0E shot-assets \u9636\u6BB5\u8054\u52A8" }
  ];
  const collectImages = (run) => {
    const out = [];
    for (const e of run.events ?? []) {
      const d = e.detail;
      if (typeof d === "string" && /^https?:/.test(d)) out.push(d);
      else if (d && typeof d === "object") {
        if (typeof d.url === "string" && /^https?:/.test(d.url)) out.push(d.url);
        const outs = d.outputs ?? d.out;
        if (Array.isArray(outs)) {
          for (const u of outs) if (typeof u === "string" && /^https?:/.test(u)) out.push(u);
        }
      }
    }
    return out;
  };
  const lastRun = runs[0] ?? null;
  const runImages = lastRun ? collectImages(lastRun) : [];
  const reviewEvents = lastRun ? (lastRun.events ?? []).filter((e) => e.type === "review" || e.type === "promote" || e.type === "retry") : [];
  const [full, setFull] = (0, import_react.useState)(false);
  const fullStyle = full ? { position: "fixed", inset: 0, zIndex: 9990, background: "var(--ds-surface, #fafafa)", overflow: "auto", padding: "20px 28px 60px" } : {};
  const innerStyle = full ? { maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 } : { display: "flex", flexDirection: "column", gap: 16 };
  return (0, import_react.createElement)(
    "div",
    { style: fullStyle },
    (0, import_react.createElement)(
      "div",
      { style: innerStyle },
      (0, import_react.createElement)(
        "div",
        { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
        (0, import_react.createElement)("h2", { style: { margin: 0 } }, "\u9CB8\u5F71\u5DE5\u4F5C\u53F0 / Pipeline Workbench \xB7 " + WHALE_BUILD),
        (0, import_react.createElement)("button", {
          onClick: () => setFull(!full),
          style: { border: "1px solid rgba(0,0,0,.2)", borderRadius: 8, padding: "4px 14px", background: full ? "rgba(200,60,60,.08)" : "rgba(65,118,230,.08)", cursor: "pointer", fontSize: 13 }
        }, full ? "\u2715 \u9000\u51FA\u5168\u5C4F" : "\u26F6 \u5168\u5C4F\u5DE5\u574A")
      ),
      // ---- ComfyUI 常驻卡 ----
      (0, import_react.createElement)(
        "div",
        { style: { border: "1px solid rgba(0,0,0,.12)", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 } },
        (0, import_react.createElement)("span", { style: { width: 10, height: 10, borderRadius: "50%", background: comfyColor, flexShrink: 0 } }),
        (0, import_react.createElement)(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: 2 } },
          (0, import_react.createElement)("strong", null, comfyTitle),
          (0, import_react.createElement)("span", { style: { fontSize: 12, opacity: 0.7 } }, comfyDetail || "\u672C\u5730\u6216\u8FDC\u7A0B GPU \u673A\u5730\u5740\u7686\u53EF\uFF0C\u586B\u5230\u300C\u9CB8\u5F71\u8D26\u53F7\u300D\u5373\u53EF")
        )
      ),
      // ---- 云引擎卡（不依赖 ComfyUI） ----
      (0, import_react.createElement)(
        "div",
        { style: { border: "1px solid rgba(0,0,0,.12)", borderRadius: 10, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 } },
        (0, import_react.createElement)(
          "div",
          { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
          (0, import_react.createElement)("strong", null, "\u4E91\u5F15\u64CE / Cloud Engines"),
          (0, import_react.createElement)("span", { style: { fontSize: 11, opacity: 0.5 } }, "\u65E0\u9700\u672C\u5730 GPU\uFF0C\u4E0E ComfyUI \u4E92\u4E0D\u4F9D\u8D56")
        ),
        (0, import_react.createElement)(
          "div",
          { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
          [
            { k: "dashscope-wan", label: "\u4E07\u76F8\u89C6\u9891", status: "live", note: "\u2705 \u771F\u673A\u51FA\u7247" },
            { k: "tongyi-wanx", label: "\u4E07\u76F8\u751F\u56FE", status: "live", note: "\u2705 \u771F\u56FE" },
            { k: "doubao", label: "\u8C46\u5305 Seedance", status: "key", note: "\u{1F511} \u7B49 ARK key" },
            { k: "kling", label: "\u53EF\u7075", status: "key", note: "\u{1F511} \u7B49 key" },
            { k: "jimeng", label: "\u5373\u68A6", status: "warn", note: "\u26A0\uFE0F \u961F\u5217\u6EE1" }
          ].map((e) => (0, import_react.createElement)("span", {
            key: e.k,
            style: {
              padding: "4px 10px",
              borderRadius: 999,
              fontSize: 12,
              border: "1px solid rgba(0,0,0,.12)",
              background: e.status === "live" ? "rgba(46,160,67,.12)" : e.status === "key" ? "rgba(255,171,0,.12)" : "rgba(200,60,60,.1)"
            }
          }, e.label + " " + e.note))
        ),
        (0, import_react.createElement)(
          "span",
          { style: { fontSize: 11, opacity: 0.5 } },
          '\u81EA\u52A8\u5316\uFF08workflow \u751F\u6210 / \u8D44\u4EA7\u677F\uFF09\u7EAF\u672C\u5730\u53EF\u7528\uFF0C\u4E0D\u4F9D\u8D56\u4EFB\u4F55\u5F15\u64CE\uFF1B\u53EA\u6709"\u6267\u884C\u51FA\u56FE"\u624D\u9700\u8981\u9009\u4E00\u4E2A\u5F15\u64CE\u3002'
        )
      ),
      // ---- 分镜工坊：大纲 → 角色提示词卡 + 逐镜顶级提示词 → 一键开做 ----
      (0, import_react.createElement)(StoryboardStudio, null),
      // ---- 提示词精调台（引擎无关，纯本地精调 → 提交云引擎） ----
      (0, import_react.createElement)(PromptCockpit, null),
      // ---- 资产流水线看板（脚手架，占位不真生成） ----
      (0, import_react.createElement)(
        "div",
        { style: { border: "1px solid rgba(0,0,0,.12)", borderRadius: 10, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 } },
        (0, import_react.createElement)(
          "div",
          { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
          (0, import_react.createElement)("strong", null, "\u8D44\u4EA7\u6D41\u6C34\u7EBF / Asset Board"),
          (0, import_react.createElement)("span", { style: { fontSize: 11, opacity: 0.5 } }, "\u811A\u624B\u67B6\uFF1AUI \u5148\u884C\uFF0C\u771F\u5B9E\u751F\u6210\u540E\u7EED\u63A5\u5165")
        ),
        (0, import_react.createElement)(
          "div",
          { style: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 } },
          ASSET_STAGES.map((a) => (0, import_react.createElement)(
            "div",
            {
              key: a.id,
              style: { border: "1px dashed rgba(0,0,0,.18)", borderRadius: 8, padding: 8, display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }
            },
            (0, import_react.createElement)(
              "div",
              { style: { width: 48, height: 48, borderRadius: 6, background: "rgba(0,0,0,.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 } },
              a.id === "character-sheet" ? "\u{1F9D1}" : a.id === "scene-master" ? "\u{1F3DE}\uFE0F" : a.id === "props" ? "\u{1F392}" : "\u{1F39E}\uFE0F"
            ),
            (0, import_react.createElement)("span", { style: { fontSize: 12 } }, a.label),
            (0, import_react.createElement)("span", { style: { fontSize: 10, opacity: 0.6, textAlign: "center" } }, a.hint)
          ))
        ),
        lastRun && (0, import_react.createElement)(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: 6 } },
          (0, import_react.createElement)(
            "div",
            { style: { fontSize: 12, opacity: 0.8 } },
            "\u6700\u8FD1\u4E00\u6B21\u8FD0\u884C\u300C" + (lastRun.prompt ?? "").slice(0, 30) + "\u300D\u4EA7\u51FA\u56FE\u7247: " + runImages.length + " \u5F20" + (reviewEvents.length ? " \xB7 \u4E00\u81F4\u6027\u8BC4\u5BA1\u4E8B\u4EF6 " + reviewEvents.length + " \u6761" : "")
          ),
          runImages.length > 0 && (0, import_react.createElement)(
            "div",
            { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
            runImages.map((u, i) => (0, import_react.createElement)("img", { key: i, src: u, alt: "asset" + i, style: { width: 64, height: 64, objectFit: "cover", borderRadius: 6, border: "1px solid rgba(0,0,0,.1)" } }))
          ),
          (0, import_react.createElement)(
            "span",
            { style: { fontSize: 11, opacity: 0.5 } },
            "\u89C4\u5212\uFF1A\u5206\u955C \u2192 \u4E3B\u89D2\u4E09\u89C6\u56FE\u4E00\u81F4\u6027\u6821\u9A8C \u2192 \u573A\u666F\u56FE/\u9053\u5177\u56FE \u2192 \u9010\u955C\u8D44\u4EA7\u3002\u771F\u5B9E\u751F\u6210\u5F85\u63A5\u5165\uFF08\u6709\u771F\u5B9E\u901A\u9053\u540E\u5F00\u542F\uFF0C\u9075\u5B88\u6210\u672C\u62A4\u680F\uFF09\u3002"
          )
        )
      ),
      runs.length === 0 ? (0, import_react.createElement)("p", null, "\u6682\u65E0\u8FD0\u884C\u8BB0\u5F55\u2014\u2014\u5728\u4F1A\u8BDD\u91CC\u8C03\u7528 whale_generate_video \u540E\uFF0C\u8FD9\u91CC\u4F1A\u663E\u793A\u4E03\u6BB5\u6D41\u6C34\u7EBF\u8FDB\u5EA6\u3002") : runs.map((run) => {
        const doneStages = new Set((run.events ?? []).map((e) => e.stage));
        const lastStage = (run.events ?? []).slice(-1)[0]?.stage ?? null;
        return (0, import_react.createElement)(
          "div",
          { key: run.id, style: { border: "1px solid rgba(0,0,0,.12)", borderRadius: 10, padding: "10px 14px" } },
          (0, import_react.createElement)(
            "div",
            { style: { display: "flex", justifyContent: "space-between", fontSize: 13, opacity: 0.8 } },
            (0, import_react.createElement)("span", null, "\u{1F3AC} " + (run.prompt ?? "").slice(0, 40)),
            (0, import_react.createElement)("span", null, run.provider + " \xB7 " + run.status)
          ),
          (0, import_react.createElement)(
            "div",
            { style: { display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" } },
            Object.keys(WHALE_STAGE_LABELS).map((s) => {
              const done = doneStages.has(s);
              const current = run.status === "running" && lastStage === s;
              const style = {
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 12,
                background: done ? "rgba(46,160,67,.15)" : current ? "rgba(65,118,230,.18)" : "rgba(0,0,0,.05)",
                color: done ? "#2ea043" : current ? "#4176e6" : "rgba(0,0,0,.45)"
              };
              return (0, import_react.createElement)("span", { key: s, style }, (done ? "\u2713 " : current ? "\u25C9 " : "\u25CB ") + WHALE_STAGE_LABELS[s]);
            })
          ),
          (0, import_react.createElement)(
            "div",
            { style: { marginTop: 8, fontSize: 12, opacity: 0.7 } },
            "\u4E8B\u4EF6: " + (run.events ?? []).map((e) => e.stage + "." + e.type).join(" \u2192 ")
          )
        );
      })
    )
  );
}
function StoryboardStudio(_props) {
  const [outline, setOutline] = (0, import_react.useState)("\u4E09\u5E74\u524D\u4F60\u4EEC\u8E29\u6211\u51FA\u5C40\uFF0C\u4ECA\u5929\u6211\u8BA9\u4F60\u4EEC\u6240\u6709\u4EBA\u6C42\u6211\u56DE\u6765\u3002\n\u82CF\u5A49\uFF0C\u8FD9\u4EFD\u505A\u7A7A\u62A5\u544A\uFF0C\u4F60\u786E\u5B9A\u8981\u53D1\uFF1F");
  const [charsText, setCharsText] = (0, import_react.useState)("\u6797\u8D8A|28\u5C81\u7537\u6027\uFF0C\u5229\u843D\u9ED1\u77ED\u53D1\uFF0C\u51B7\u5CFB\u773C\u795E\uFF0C\u85CF\u9752\u51B2\u950B\u8863\n\u82CF\u5A49|26\u5C81\u5973\u6027\uFF0C\u6DF1\u68D5\u957F\u76F4\u53D1\uFF0C\u7C73\u8272\u98CE\u8863\uFF0C\u94F6\u6846\u773C\u955C");
  const [style, setStyle] = (0, import_react.useState)("3D \u56FD\u6F2B\u5199\u5B9E\uFF0C\u7535\u5F71\u7EA7\u90FD\u5E02\u591C\u666F\uFF0C\u51B7\u8272\u9713\u8679");
  const [ratio, setRatio] = (0, import_react.useState)("9:16");
  const [plan, setPlan] = (0, import_react.useState)(null);
  const [busy, setBusy] = (0, import_react.useState)(false);
  const [shotsOut, setShotsOut] = (0, import_react.useState)({});
  const [running, setRunning] = (0, import_react.useState)(null);
  const inputStyle = { padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(0,0,0,.2)", fontSize: 13, fontFamily: "inherit" };
  const card = { border: "1px solid rgba(0,0,0,.1)", borderRadius: 10, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.06)" };
  const build = () => {
    setBusy(true);
    setPlan(null);
    setShotsOut({});
    fetch("/dsh-video-studio/storyboard", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ outline, charactersText: charsText, style: style || void 0, aspectRatio: ratio })
    }).then((r) => r.json()).then((d) => {
      setBusy(false);
      setPlan(d);
    }).catch((e) => {
      setBusy(false);
      setPlan({ ok: false, error: String(e?.message ?? e) });
    });
  };
  const genOne = (i, prompt) => {
    setRunning(i);
    fetch("/dsh-video-studio/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt, aspectRatio: ratio, durationSec: 5 })
    }).then((r) => r.json()).then((d) => {
      setShotsOut((m) => ({ ...m, [i]: d }));
      setRunning(null);
    }).catch((e) => {
      setShotsOut((m) => ({ ...m, [i]: { ok: false, error: String(e?.message ?? e) } }));
      setRunning(null);
    });
  };
  const runAll = async () => {
    for (const s of plan?.shots ?? []) {
      genOne(s.index, s.prompt);
      await new Promise((r) => setTimeout(r, 600));
    }
  };
  const copy = (t) => {
    try {
      navigator.clipboard?.writeText(t).catch(() => {
      });
    } catch {
    }
  };
  const section = (title, sub, children) => (0, import_react.createElement)(
    "div",
    { style: { ...card, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 } },
    (0, import_react.createElement)(
      "div",
      { style: { display: "flex", justifyContent: "space-between", alignItems: "baseline" } },
      (0, import_react.createElement)("strong", { style: { fontSize: 14 } }, title),
      (0, import_react.createElement)("span", { style: { fontSize: 11, opacity: 0.55 } }, sub)
    ),
    children
  );
  return (0, import_react.createElement)(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: 10 } },
    section(
      "\u5206\u955C\u5DE5\u574A / Storyboard Studio",
      "\u5927\u7EB2 + \u89D2\u8272 \u2192 \u9876\u7EA7\u63D0\u793A\u8BCD\u5361\u4E0E\u9010\u955C\u63D0\u793A\u8BCD\uFF08\u7EAF\u672C\u5730\uFF0C\u4E0D\u70E7 token\uFF09",
      (0, import_react.createElement)(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 8 } },
        (0, import_react.createElement)("textarea", { value: outline, onChange: (e) => setOutline(e.target.value), rows: 3, placeholder: "\u5927\u7EB2\uFF08\u6309\u53E5\u5B50/\u6362\u884C\u81EA\u52A8\u62C6\u5206\u4E3A\u955C\u5934\uFF09", style: { ...inputStyle, width: "100%", boxSizing: "border-box" } }),
        (0, import_react.createElement)("textarea", { value: charsText, onChange: (e) => setCharsText(e.target.value), rows: 2, placeholder: "\u89D2\u8272\u6E05\u5355\uFF1A\u6BCF\u884C \u540D\u5B57|\u63CF\u8FF0", style: { ...inputStyle, width: "100%", boxSizing: "border-box" } }),
        (0, import_react.createElement)(
          "div",
          { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
          (0, import_react.createElement)("input", { value: style, onChange: (e) => setStyle(e.target.value), placeholder: "\u98CE\u683C", style: { ...inputStyle, flex: 1, minWidth: 180 } }),
          (0, import_react.createElement)(
            "select",
            { value: ratio, onChange: (e) => setRatio(e.target.value), style: inputStyle },
            ["9:16", "16:9", "1:1", "4:3", "3:4"].map((r) => (0, import_react.createElement)("option", { key: r, value: r }, r))
          ),
          (0, import_react.createElement)("button", { onClick: build, disabled: busy, style: { ...inputStyle, background: "#4176e6", color: "#fff", border: "none", cursor: "pointer" } }, busy ? "\u62C6\u89E3\u4E2D\u2026" : "\u{1F4CB} \u751F\u6210\u5206\u955C")
        )
      )
    )
  ), plan && !plan.ok && (0, import_react.createElement)("div", { role: "alert", style: { fontSize: 12, color: "#c83c3c" } }, "\u5931\u8D25: " + (plan.error ?? "")), plan && plan.ok && (0, import_react.createElement)(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: 10 } },
    // 角色提示词卡
    plan.characters.length > 0 && section(
      "\u89D2\u8272\u63D0\u793A\u8BCD\u5361 \xB7 " + plan.characters.length,
      "\u4E09\u89C6\u56FE\u6A21\u677F + \u589E\u76CA\u5E93\uFF0C\u9876\u7EA7\u53EF\u76F4\u63A5\u7528",
      (0, import_react.createElement)(
        "div",
        { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 } },
        plan.characters.map((c) => (0, import_react.createElement)(
          "div",
          { key: c.name, style: { ...card, padding: 10, display: "flex", flexDirection: "column", gap: 6 } },
          (0, import_react.createElement)(
            "div",
            { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
            (0, import_react.createElement)("strong", null, "\u{1F9D1} " + c.name),
            (0, import_react.createElement)("button", { onClick: () => copy(c.prompt), style: { fontSize: 11, border: "1px solid rgba(0,0,0,.2)", borderRadius: 5, background: "none", cursor: "pointer", padding: "2px 8px" } }, "\u590D\u5236")
          ),
          (0, import_react.createElement)("div", { style: { fontSize: 11, opacity: 0.65, maxHeight: 96, overflow: "hidden" } }, c.prompt)
        ))
      )
    ),
    // 逐镜提示词
    section(
      "\u5206\u955C\u63D0\u793A\u8BCD \xB7 " + plan.shots.length,
      "\u6BCF\u955C\u9876\u7EA7\u63D0\u793A\u8BCD\uFF0C\u53EF\u5355\u72EC\u751F\u6210\u6216\u4E00\u952E\u5F00\u505A",
      (() => {
        const rows = plan.shots.map((s) => (0, import_react.createElement)(
          "div",
          { key: s.index, style: { ...card, padding: 10, display: "flex", flexDirection: "column", gap: 6 } },
          (0, import_react.createElement)(
            "div",
            { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
            (0, import_react.createElement)("strong", { style: { fontSize: 13 } }, "\u955C " + (s.index + 1) + " \xB7 " + s.line),
            (0, import_react.createElement)(
              "div",
              { style: { display: "flex", gap: 6 } },
              (0, import_react.createElement)("button", { onClick: () => copy(s.prompt), style: { fontSize: 11, border: "1px solid rgba(0,0,0,.2)", borderRadius: 5, background: "none", cursor: "pointer", padding: "2px 8px" } }, "\u590D\u5236"),
              (0, import_react.createElement)("button", { onClick: () => genOne(s.index, s.prompt), disabled: running === s.index, style: { fontSize: 11, border: "none", borderRadius: 5, background: "#2ea043", color: "#fff", cursor: "pointer", padding: "2px 8px" } }, running === s.index ? "\u751F\u6210\u4E2D\u2026" : "\u751F\u6210\u6B64\u955C")
            )
          ),
          (0, import_react.createElement)("div", { style: { fontSize: 11, opacity: 0.7 } }, s.prompt),
          shotsOut[s.index] && (shotsOut[s.index].ok ? (0, import_react.createElement)("img", { src: shotsOut[s.index].url, alt: "shot" + s.index, style: { maxWidth: 220, borderRadius: 6, border: "1px solid rgba(0,0,0,.1)" } }) : (0, import_react.createElement)(
            "div",
            { role: "alert", style: { fontSize: 11, color: shotsOut[s.index].status === "quota-paused" ? "#b3870e" : "#c83c3c" } },
            (shotsOut[s.index].status ?? "error") + ": " + (shotsOut[s.index].error ?? shotsOut[s.index].message ?? "")
          ))
        ));
        const runBtn = (0, import_react.createElement)("button", { onClick: runAll, style: { alignSelf: "flex-start", ...inputStyle, background: "#7c3aed", color: "#fff", border: "none", cursor: "pointer" } }, "\u{1F3AC} \u4E00\u952E\u5F00\u505A\uFF08\u987A\u5E8F\u751F\u6210\uFF09");
        return (0, import_react.createElement)("div", { style: { display: "flex", flexDirection: "column", gap: 8 } }, ...rows, runBtn);
      })()
    )
  );
}
function PromptCockpit(_props) {
  const [draft, setDraft] = (0, import_react.useState)("\u4E00\u53EA\u9CB8\u9C7C\u5728\u6DF1\u6D77\u4E2D\u6E38\u52A8\uFF0C\u84DD\u8272\u8C03\uFF0C\u7535\u5F71\u611F");
  const [style, setStyle] = (0, import_react.useState)("3D \u56FD\u6F2B\u5199\u5B9E\uFF0C\u7535\u5F71\u7EA7");
  const [template, setTemplate] = (0, import_react.useState)("");
  const [ratio, setRatio] = (0, import_react.useState)("16:9");
  const [result, setResult] = (0, import_react.useState)(null);
  const [busy, setBusy] = (0, import_react.useState)(false);
  const [gen, setGen] = (0, import_react.useState)(null);
  const optimize = () => {
    setBusy(true);
    fetch("/dsh-video-studio/prompt-optimize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: draft, style: style || void 0, template: template || void 0, aspectRatio: ratio })
    }).then((r) => r.json()).then((d) => {
      setBusy(false);
      setResult(d);
    }).catch((e) => {
      setBusy(false);
      setResult({ ok: false, error: String(e?.message ?? e) });
    });
  };
  const generate = () => {
    const src = result?.ok ? result.optimized : draft;
    setGen({ running: true });
    fetch("/dsh-video-studio/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: src, aspectRatio: ratio, durationSec: 5 })
    }).then((r) => r.json()).then((d) => setGen(d)).catch((e) => setGen({ ok: false, status: "error", error: String(e?.message ?? e) }));
  };
  const inputStyle = { padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(0,0,0,.2)", fontSize: 13, fontFamily: "inherit" };
  return (0, import_react.createElement)(
    "div",
    { style: { border: "1px solid rgba(0,0,0,.12)", borderRadius: 10, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 } },
    (0, import_react.createElement)(
      "div",
      { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
      (0, import_react.createElement)("strong", null, "\u63D0\u793A\u8BCD\u7CBE\u8C03\u53F0 / Prompt Cockpit"),
      (0, import_react.createElement)("span", { style: { fontSize: 11, opacity: 0.5 } }, "\u7EAF\u672C\u5730\u7CBE\u8C03\uFF08\u6A21\u677F+\u589E\u76CA\u5E93\uFF09\uFF0C\u65E0 GPU \u4E5F\u80FD\u7528")
    ),
    (0, import_react.createElement)("textarea", {
      value: draft,
      onChange: (e) => setDraft(e.target.value),
      rows: 3,
      style: { ...inputStyle, width: "100%", boxSizing: "border-box" }
    }),
    (0, import_react.createElement)(
      "div",
      { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
      (0, import_react.createElement)("input", { value: style, onChange: (e) => setStyle(e.target.value), placeholder: "\u98CE\u683C", style: { ...inputStyle, flex: 1, minWidth: 160 } }),
      (0, import_react.createElement)(
        "select",
        { value: template, onChange: (e) => setTemplate(e.target.value), style: inputStyle },
        (0, import_react.createElement)("option", { value: "" }, "\u4E0D\u5957\u6A21\u677F"),
        (0, import_react.createElement)("option", { value: "character-sheet" }, "\u89D2\u8272\u4E09\u89C6\u56FE"),
        (0, import_react.createElement)("option", { value: "scene-master" }, "\u573A\u666F\u4E3B\u56FE"),
        (0, import_react.createElement)("option", { value: "shot-scene" }, "\u5355\u955C\u753B\u9762")
      ),
      (0, import_react.createElement)(
        "select",
        { value: ratio, onChange: (e) => setRatio(e.target.value), style: inputStyle },
        ["16:9", "9:16", "1:1", "4:3", "3:4"].map((r) => (0, import_react.createElement)("option", { key: r, value: r }, r))
      ),
      (0, import_react.createElement)("button", { onClick: optimize, disabled: busy, style: { ...inputStyle, background: "#4176e6", color: "#fff", border: "none", cursor: "pointer" } }, busy ? "\u7CBE\u8C03\u4E2D\u2026" : "\u26A1 \u7CBE\u8C03\u5230\u9876\u7EA7"),
      (0, import_react.createElement)("button", { onClick: generate, style: { ...inputStyle, background: "#2ea043", color: "#fff", border: "none", cursor: "pointer" } }, "\u{1F3AC} \u63D0\u4EA4\u751F\u6210")
    ),
    result && (result.ok ? (0, import_react.createElement)(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12 } },
      (0, import_react.createElement)("div", null, "\u4F18\u5316\u540E\uFF08\u589E\u76CA " + result.appliedBoosters.length + " \u9879\uFF09\uFF1A" + result.optimized),
      (0, import_react.createElement)("div", { style: { opacity: 0.7 } }, "\u8D1F\u9762: " + (result.negative ?? []).join("\uFF0C"))
    ) : (0, import_react.createElement)("div", { role: "alert", style: { fontSize: 12, color: "#c83c3c" } }, "\u7CBE\u8C03\u5931\u8D25: " + (result.error ?? ""))),
    gen && gen.running && (0, import_react.createElement)("div", { style: { fontSize: 12, opacity: 0.7 } }, "\u751F\u6210\u4E2D\uFF08\u989D\u5EA6\u62A4\u680F\u751F\u6548\uFF0C\u9ED8\u8BA4\u8D70\u6C60\u5185\u5065\u5EB7\u5F15\u64CE\uFF09\u2026"),
    gen && !gen.running && (gen.ok ? (0, import_react.createElement)(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: 6 } },
      (0, import_react.createElement)("span", { style: { fontSize: 12, opacity: 0.8 } }, "\u2705 \u5DF2\u751F\u6210\uFF08" + (gen.engine ?? "") + "\uFF09"),
      (0, import_react.createElement)("img", { src: gen.url, alt: "generated", style: { width: "100%", maxWidth: 320, borderRadius: 8, border: "1px solid rgba(0,0,0,.1)" } })
    ) : (0, import_react.createElement)(
      "div",
      { role: "alert", style: { fontSize: 12, color: gen.status === "quota-paused" ? "#b3870e" : "#c83c3c" } },
      "\u751F\u6210\u672A\u5B8C\u6210\uFF08" + (gen.status ?? "error") + "\uFF09: " + (gen.error ?? gen.message ?? "")
    ))
  );
}
var PROVIDER_LABELS = {
  mock: "mock\uFF08\u94FE\u8DEF\u81EA\u6D4B\uFF09",
  jimeng: "\u5373\u68A6 sessionid",
  "tongyi-wanx": "\u901A\u4E49\u4E07\u76F8",
  kling: "\u53EF\u7075\u5B98\u65B9",
  "kling-dashscope": "DashScope \u89C6\u9891",
  "kling-lipsync": "\u53EF\u7075\u5BF9\u53E3\u578B",
  doubao: "\u8C46\u5305 Seedance/Seedream",
  comfyui: "ComfyUI \u672C\u5730",
  "sessionid-http": "sessionid \u901A\u7528"
};
function AccountPanel(_props) {
  const [doc, setDoc] = (0, import_react.useState)(null);
  const [error, setError] = (0, import_react.useState)(null);
  const [busy, setBusy] = (0, import_react.useState)(false);
  const [form, setForm] = (0, import_react.useState)({ provider: "jimeng", credential: "", dailyQuota: "66", note: "" });
  const reload = () => {
    fetch("/dsh-video-studio/accounts", { cache: "no-store" }).then((r) => r.json()).then((d) => {
      setDoc(d);
      setError(null);
    }).catch((e) => setError(String(e?.message ?? e)));
  };
  (0, import_react.useEffect)(() => {
    reload();
    return () => {
    };
  }, []);
  const submit = () => {
    if (!form.credential.trim()) {
      setError("\u5148\u586B\u51ED\u8BC1");
      return;
    }
    setBusy(true);
    fetch("/dsh-video-studio/accounts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: form.provider,
        credential: form.credential.trim(),
        dailyQuota: Number(form.dailyQuota) || void 0,
        note: form.note.trim() || void 0
      })
    }).then((r) => r.json()).then((d) => {
      setBusy(false);
      if (!d.ok) {
        setError(d.error ?? "\u6DFB\u52A0\u5931\u8D25");
        return;
      }
      setForm({ ...form, credential: "", note: "" });
      reload();
    }).catch((e) => {
      setBusy(false);
      setError(String(e?.message ?? e));
    });
  };
  const remove = (id) => {
    setBusy(true);
    fetch("/dsh-video-studio/accounts?id=" + encodeURIComponent(id), { method: "DELETE" }).then((r) => r.json()).then(() => {
      setBusy(false);
      reload();
    }).catch((e) => {
      setBusy(false);
      setError(String(e?.message ?? e));
    });
  };
  const inputStyle = { padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(0,0,0,.2)", fontSize: 14 };
  const accounts = doc?.accounts ?? [];
  return (0, import_react.createElement)(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: 14 } },
    (0, import_react.createElement)("h2", null, "\u9CB8\u5F71\u8D26\u53F7 / Account Vault"),
    (0, import_react.createElement)(
      "p",
      { style: { opacity: 0.7, fontSize: 13 } },
      "\u51ED\u8BC1\u53EA\u4FDD\u5B58\u5728\u672C\u673A ~/.whale/whale.json\uFF080600 \u6743\u9650\uFF09\uFF0C\u63A5\u53E3\u53EA\u8FD4\u56DE\u8131\u654F\u63D0\u793A\u3002\u591A\u8D26\u53F7\u6309\u65E5\u989D\u5EA6\u8F6E\u6362\uFF0C\u5931\u8D25\u81EA\u52A8\u51B7\u5374\u3002"
    ),
    error ? (0, import_react.createElement)("p", { role: "alert" }, "\u64CD\u4F5C\u5931\u8D25: " + error) : null,
    (0, import_react.createElement)(
      "div",
      { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
      (0, import_react.createElement)("select", {
        value: form.provider,
        onChange: (e) => setForm({ ...form, provider: e.target.value }),
        style: inputStyle
      }, Object.keys(PROVIDER_LABELS).map((p) => (0, import_react.createElement)("option", { key: p, value: p }, PROVIDER_LABELS[p]))),
      (0, import_react.createElement)("input", {
        type: "password",
        placeholder: "\u51ED\u8BC1\uFF08sessionid / cookie / key\uFF09",
        value: form.credential,
        onChange: (e) => setForm({ ...form, credential: e.target.value }),
        style: { ...inputStyle, flex: 1, minWidth: 220 }
      }),
      (0, import_react.createElement)("input", {
        type: "number",
        placeholder: "\u65E5\u989D\u5EA6",
        value: form.dailyQuota,
        onChange: (e) => setForm({ ...form, dailyQuota: e.target.value }),
        style: { ...inputStyle, width: 90 }
      }),
      (0, import_react.createElement)("input", {
        type: "text",
        placeholder: "\u5907\u6CE8\uFF08\u53EF\u9009\uFF09",
        value: form.note,
        onChange: (e) => setForm({ ...form, note: e.target.value }),
        style: { ...inputStyle, width: 140 }
      }),
      (0, import_react.createElement)("button", {
        onClick: submit,
        disabled: busy,
        style: { ...inputStyle, background: "#4176e6", color: "#fff", border: "none", cursor: "pointer" }
      }, busy ? "\u4FDD\u5B58\u4E2D\u2026" : "\u6DFB\u52A0\u8D26\u53F7")
    ),
    accounts.length === 0 ? (0, import_react.createElement)("p", { style: { opacity: 0.6 } }, "\u6682\u65E0\u8D26\u53F7\u2014\u2014\u628A\u514D\u8D39\u7684\u5373\u68A6/\u901A\u4E49/\u8C46\u5305\u51ED\u8BC1\u6302\u8FDB\u6765\uFF0C\u8C03\u5EA6\u5668\u4F1A\u81EA\u52A8\u8F6E\u6362\u3002") : accounts.map((a) => (0, import_react.createElement)(
      "div",
      {
        key: a.id,
        style: { border: "1px solid rgba(0,0,0,.12)", borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 10 }
      },
      (0, import_react.createElement)("strong", null, PROVIDER_LABELS[a.provider] ?? a.provider),
      (0, import_react.createElement)("code", { style: { fontSize: 12 } }, a.credentialHint),
      (0, import_react.createElement)("span", { style: { fontSize: 12, opacity: 0.7 } }, "\u65E5\u989D\u5EA6 " + (a.dailyQuota ?? "\u221E")),
      a.note ? (0, import_react.createElement)("span", { style: { fontSize: 12, opacity: 0.7 } }, a.note) : null,
      (0, import_react.createElement)("button", {
        onClick: () => remove(a.id),
        disabled: busy,
        style: { marginLeft: "auto", background: "none", border: "1px solid rgba(200,60,60,.5)", color: "#c83c3c", borderRadius: 6, padding: "2px 10px", cursor: "pointer" }
      }, "\u5220\u9664")
    ))
  );
}
function apply(ctx) {
  const injected = () => ({
    loadHealth: async () => {
      const res = await fetch("/dsh-video-studio/health", { cache: "no-store" });
      if (!res.ok) throw new Error("health route " + res.status);
      return res.json();
    }
  });
  ctx.slots.inject("settings.plugins.tab", () => ctx.slots.register({
    name: "settings.plugins.tab",
    id: "whale",
    order: 30,
    label: () => "\u9CB8\u5F71",
    inject: injected
  }, Panel));
  ctx.slots.inject("settings.plugins.tab", () => ctx.slots.register({
    name: "settings.plugins.tab",
    id: "whale-workbench",
    order: 31,
    label: () => "\u9CB8\u5F71\u5DE5\u4F5C\u53F0",
    inject: () => ({})
  }, WorkbenchPanel));
  ctx.slots.inject("settings.plugins.tab", () => ctx.slots.register({
    name: "settings.plugins.tab",
    id: "whale-accounts",
    order: 32,
    label: () => "\u9CB8\u5F71\u8D26\u53F7",
    inject: () => ({})
  }, AccountPanel));
  ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
    name: "tool.call.toolview",
    key: "whale_generate_video"
  }, VideoCard));
}

    return module.exports;
  }
});
