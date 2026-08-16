# 🐳 dsh-video-studio (Whale) — AI Video & Motion-Comic Studio for DeepSeek Harness

**A DeepSeek Harness native plugin for AI video and motion-comic (漫剧) production: six-stage director pipeline × multi-provider free-quota scheduling × four-layer prompt engineering with self-optimization. Quality first, cost second.**

[中文](README.zh.md) · Siblings: [dsh-lab](https://github.com/hackerFish/dsh-lab) · [awesome-dsh-skills](https://github.com/hackerFish/awesome-dsh-skills) · [awesome-dsh-presets](https://github.com/hackerFish/awesome-dsh-presets)

> The DSH ecosystem has 1000+ plugins — none does generative video. Whale brings the industry-validated motion-comic pipeline (waoowaoo / LumenX / MangaV / ArcReel pattern) into DSH as a hot-pluggable, per-step-controllable plugin.

## Pipeline — the industry-standard seven-stage workflow

```
story (LLM, e.g. Doubao writes the novel) → script (LLM breaks it down)
→ storyboard (LLM shot list) → master asset (MJ-style hero image)
→ shot assets (image-model variations for consistency) → video (Seedance/Jimeng/Kling)
→ final cut (JianYing draft export / local ffmpeg render)
```

- **The first three stages are LLM stages**: inside DSH the session model itself (Doubao/DeepSeek/anything) does them — the agent is the brain; the plugin supplies the rest.
- Every stage has a gate: auto / ask / manual.
- Parallel shots, quota scheduler, style genome, distribution pack as before.

- **Consistency asset library**: character/scene master assets + per-shot variations with automatic reference-image injection into prompts (the motion-comic standard technique)
- **Parallel shots**: batch submit → concurrent polling (configurable concurrency)
- **Quota scheduler**: multi-account free-quota rotation, quality-aware fallback, per-day caps, full audit
- **Style genome (memory)**: style DNA, shot-template scoring evolution, retry feedback — persists across sessions
- **Prompt self-optimization**: A/B → frame scoring → promote (≥4) / retry (≤2) templates

## Providers (verified matrix)

| Provider | Channel | Status |
|---|---|---|
| jimeng (即梦) | sessionid, free daily quota | ✅ protocol verified end-to-end; **text-to-video queue stays `SystemBusy` even off-peak (0 credits consumed)** — free route is now: wanx images → image-to-video |
| tongyi-wanx (通义万相) | cookie+xsrf, free credits | ✅ **live-verified: real whale image generated & downloaded** (free tier = text-to-image; video needs membership) |
| kling official (可灵) | accessKey:secretKey JWT, api-beijing.klingai.com | ✅ adapter written — not yet tested against a real key |
| kling via DashScope | `sk-` key | ✅ adapter written — not yet tested against a real key |
| **wan video via DashScope (通义万相视频)** | `sk-` key, official free quota | ✅ adapter written (same async protocol as kling) — model id to confirm on first real key |
| doubao/Seedance (火山方舟) | ARK API key | ✅ adapter written — not yet tested against a real key |
| ComfyUI local | workflow JSON builder + /prompt protocol | ✅ protocol-tested (mock server), real GPU pending |
| kling web (sessionid) | anti-bot one-time falcon token | 📄 anatomy documented; automation needs a capture bridge (deferred) |

## Editing & distribution

- **ffmpeg auto-render** — verified end-to-end (synthetic clips → timeline → burned subtitles → audio mix → final mp4, duration-checked)
- **JianYing (剪映) draft export** — editable tracks/keyframes/subtitles for manual polish; structure-validated
- **say TTS** — real Chinese voiceover with zero API keys
- **Distribution pack** — platform specs + compliance precheck for 4 Chinese platforms

## DSH integration (deep invocation)

- **Model tools**: `whale_storyboard` (offline shot planning), `whale_generate_video` (provider routing with honest error surfacing), `whale_quality_review` (rule-level QC; LLM frame review planned)
- **Host plugin**: `/dsh-video-studio/health` route; installs via `dsh plugin add`, boot-verified clean
- Planned: slash commands, subagent-parallel shots, workbench UI, style-genome wiring

## Verification discipline

43 unit tests green (quota routing, prompt merging, jianying draft structure, ffmpeg end-to-end render, provider protocols via mock servers, live jimeng model probe, live wanx image generation). Test logs and proof artifacts live in `demos/`.

## Install

```bash
dsh plugin --profile web add github:hackerFish/dsh-video-studio --ignore-workspace-root-check
# or npm once published
```

## Honesty notes

Model output quality is bounded by the vendor model; the pipeline maximizes it (consistency tokens, QC retry loop planned). sessionid/cookie usage is per-platform ToS — respect each platform's terms. Not affiliated with DeepSeek.

## License

[MIT](LICENSE)
