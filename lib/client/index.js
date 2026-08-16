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
  const [error, setError] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    let alive = true;
    const load = () => {
      fetch("/dsh-video-studio/runs", { cache: "no-store" }).then((r) => r.json()).then((d) => {
        if (alive) setDoc(d);
      }).catch((e) => {
        if (alive) setError(String(e?.message ?? e));
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
  return (0, import_react.createElement)(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: 16 } },
    (0, import_react.createElement)("h2", null, "\u9CB8\u5F71\u5DE5\u4F5C\u53F0 / Pipeline Workbench"),
    runs.length === 0 ? (0, import_react.createElement)("p", null, "\u6682\u65E0\u8FD0\u884C\u8BB0\u5F55\u2014\u2014\u5728\u4F1A\u8BDD\u91CC\u8C03\u7528 whale_generate_video \u540E\uFF0C\u8FD9\u91CC\u4F1A\u663E\u793A\u516D\u6BB5\u6D41\u6C34\u7EBF\u8FDB\u5EA6\u3002") : runs.map((run) => {
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
  );
}
var PROVIDER_LABELS = {
  mock: "mock\uFF08\u94FE\u8DEF\u81EA\u6D4B\uFF09",
  jimeng: "\u5373\u68A6 sessionid",
  "tongyi-wanx": "\u901A\u4E49\u4E07\u76F8",
  kling: "\u53EF\u7075\u5B98\u65B9",
  "kling-dashscope": "DashScope \u89C6\u9891",
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
