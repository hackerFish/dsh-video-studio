# 🐳 dsh-video-studio (Whale) — AI Video & Motion-Comic Studio for DeepSeek Harness

**A DeepSeek Harness native plugin for AI video and motion-comic (漫剧) production: seven-stage director pipeline × multi-account quota pool with failure fallback × credential vault × four-layer prompt engineering with a score-feedback loop. Quality first, cost second.**

[中文](README.zh.md) · Siblings: [dsh-lab](https://github.com/hackerFish/dsh-lab) · [awesome-dsh-skills](https://github.com/hackerFish/awesome-dsh-skills) · [awesome-dsh-presets](https://github.com/hackerFish/awesome-dsh-presets)

> The DSH ecosystem has 1000+ plugins — none does generative video. Whale brings the industry-validated motion-comic pipeline (waoowaoo / LumenX / MangaV / ArcReel pattern) into DSH as a hot-pluggable, per-step-controllable plugin.

## Pipeline — the industry-standard seven-stage workflow

```
story (LLM, e.g. Doubao writes the novel) → script (LLM breaks it down)
→ storyboard (LLM shot list) → master asset (MJ-style hero image)
→ shot assets (image-model variations for consistency) → video (Seedance/Jimeng/Kling)
→ final cut (JianYing draft export / local ffmpeg render)
```

- **The first three stages are LLM stages**: inside DSH the session model itself does them — the model you're chatting with (Doubao, DeepSeek, whatever) is the brain that writes the story, script and shots; the plugin never calls an external LLM.

**Mapping to the industry-standard toolchain**:

| Industry flow | Whale |
|---|---|
| Doubao writes novel / script / shots | = DSH session model doing story/script/storyboard (pick a Doubao model and it IS "Doubao writes") |
| MJ hero asset | = master-asset stage (MJ official API adapter to come; wanx/Seedream can substitute) |
| image variations | = shot-assets stage (wanx ✅ verified · **Doubao Seedream ✅ wired**) |
| Seedance video | = video stage (**Doubao Seedance ✅** / jimeng / kling / ComfyUI) |
| JianYing final cut | = final-cut stage (JianYing draft export ✅ / ffmpeg ✅) |
- Every stage has a gate: auto / ask / manual.
- Parallel shots, quota scheduler, style genome, distribution pack as before.

- **Consistency asset library**: character/scene master assets + per-shot variations with automatic reference-image injection into prompts (the motion-comic standard technique)
- **Parallel shots**: batch submit → concurrent polling (configurable concurrency)
- **Account pool (quota scheduler)**: multi-account rotation per provider, per-day caps, exponential backoff on failure, automatic fallback re-submit to the next healthy account mid-pipeline, full audit trail
- **Credential vault**: `~/.whale/whale.json` (0600, atomic writes), masked API responses, account management UI in the plugin settings (鲸影账号 tab)
- **Style genome (memory)**: style DNA, shot-template scoring evolution, retry feedback — persists across sessions
- **Prompt engineering**: parameterized professional template library (character sheet / scene master / single shot) + composable quality boosters (8K / clean bg / neutral face / no text …) + optimizer; `whale_optimize_prompt` upgrades drafts to pro-grade prompts locally
- **Score-feedback loop (评分回写)**: every reviewed shot writes its score + booster combo back to the scorebook; the optimizer then picks boosters by real historical performance
- **Preset motion-comic pack**: 5 genres (city comeback / xianxia / suspense / sweet romance / sci-fi) with bilingual character cards, scene cards and shot scripts — `whale_story_presets` turns one preset id into a pipeline-ready script, `scripts/demo-presets.ts` runs it end-to-end with the mock provider (zero keys)

## Providers (verified matrix)

| Provider | Channel | Status |
|---|---|---|
| jimeng (即梦) | sessionid, free daily quota | ✅ protocol verified end-to-end; **text-to-video queue stays `SystemBusy` even off-peak (0 credits consumed)** — free route is now: wanx images → image-to-video |
| tongyi-wanx (通义万相) | cookie+xsrf, free credits | ✅ **live-verified: real whale image generated & downloaded** (free tier = text-to-image; video needs membership) |
| kling official (可灵) | accessKey:secretKey JWT, api-beijing.klingai.com | ✅ adapter written — not yet tested against a real key |
| kling via DashScope | `sk-` key | ✅ adapter written — not yet tested against a real key |
| **kling-lipsync (可灵对口型)** | official JWT, `/v1/videos/lip-sync` | ✅ adapter written against the official 3-13 contract (audio2video + text2video voice modes), 8 tests — not yet tested against a real key |
| **wan video via DashScope (通义万相视频)** | `sk-` key, official free quota | ✅ adapter written (same async protocol as kling) — model id to confirm on first real key |
| doubao (火山方舟) | ARK API key | ✅ Seedance video + **Seedream image** (assets) — not yet tested against a real key |
| **doubao-web (豆包网页版)** | cookie, free web quota | ✅ **live-replayed & parsed**: SSE chat for the LLM stages (story/script/shots) + image bot for assets. Pro-tier free quota runs on a 7-day window (image bot pauses when spent; text keeps working) |
| ComfyUI local | workflow JSON builder + /prompt protocol | ✅ protocol-tested (mock server), real GPU pending |
| kling web (sessionid) | anti-bot one-time falcon token | 📄 anatomy documented; automation needs a capture bridge (deferred) |

## Editing & distribution

- **ffmpeg auto-render** — verified end-to-end (synthetic clips → timeline → burned subtitles → audio mix → final mp4, duration-checked)
- **JianYing (剪映) draft export** — editable tracks/keyframes/subtitles for manual polish; structure-validated
- **say TTS** — real Chinese voiceover with zero API keys
- **Distribution pack** — platform specs + compliance precheck for 4 Chinese platforms

## DSH integration (deep invocation)

- **Model tools**: `whale_story_presets` (5-genre content pack → pipeline script), `whale_storyboard` (offline shot planning), `whale_generate_video` (provider routing), `whale_optimize_prompt` (pro-grade prompt upgrade), `whale_quality_review` (rule-level QC), `whale_comfyui_workflow` (ComfyUI workflow JSON)
- **Host routes**: `/dsh-video-studio/health`, `/dsh-video-studio/runs`, `/dsh-video-studio/accounts` (GET list masked / POST add / DELETE remove)
- **Client UI**: 鲸影 (status) · 鲸影工作台 (live pipeline progress per run) · 鲸影账号 (account vault management) tabs in plugin settings; `whale_generate_video` gets a dedicated video card view
- Installs via `dsh plugin add`, boot-verified clean
- Planned: slash commands, subagent-parallel shots, lip-sync stage wiring into the final cut

## Verification discipline

101 unit tests green (account pool rotation/backoff/fallback, credential vault, quota routing, prompt merging, score-feedback loop, jianying draft structure, ffmpeg end-to-end render, provider protocols via mock servers incl. kling lip-sync, preset pack integrity, live jimeng model probe, live wanx image generation). Test logs and proof artifacts live in `demos/`.

## Install

```bash
dsh plugin --profile web add github:hackerFish/dsh-video-studio --ignore-workspace-root-check
# or npm once published
```

## Honesty notes

Model output quality is bounded by the vendor model; the pipeline maximizes it (consistency tokens, QC retry loop, score-feedback booster selection). sessionid/cookie usage is per-platform ToS — respect each platform's terms. Credentials live only in the local vault file and are never logged or returned unmasked. Not affiliated with DeepSeek.

## License

[MIT](LICENSE)
