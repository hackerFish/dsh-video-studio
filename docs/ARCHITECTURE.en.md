# Architecture: Thin Abstraction × Decision Gates × Self-Optimization

## Core interface (Provider, 6 methods)

```ts
{
  id: 'kling',
  capabilities: { textToVideo, imageToVideo, firstLastFrame, lipSync, maxDurationSec, resolutions, qualityTier },
  quote(stage, spec) -> { qualityTier, costEstimate },
  submit(stage, spec) -> { jobId },
  status(jobId) -> { state: running|done|failed, progress },
  fetch(jobId) -> { outputs: [url] },
  health() -> { ok, quotaRemaining },
}
```

A new vendor = one adapter file + a capabilities declaration. The pipeline never changes.

## Quota scheduler (multi-account rotation)

Each account: `{id, provider, credential, dailyQuota, usedToday, qualityTier, lastUsedAt}`. Routing: quality-tier desc → quota available → least-recently-used. Free-quota accounts rotate first in `preferCost` mode; QC failure escalates to paid tiers. Every decision is audited (`quota/decide`).

## Prompt self-optimization loop

```
generate → frame scoring (LLM review + user retry/like) → promote (≥4) / retry (≤2) templates
                                                              ↓
next shot with same style → template hit → reuse + fine-tune
```

## Decision gates

Six stages × three modes: auto (agent decides) / ask (approval channel) / manual (user provides the stage output). Switchable at runtime, mid-run.

## Zero-key verification strategy

mock provider + local ffmpeg run the whole pipeline without credentials; unit tests cover routing/merging/draft structure; provider protocols verified against mock HTTP servers; live verified: jimeng free tier (model probe, SystemBusy anatomy) and tongyi-wanx free tier (real image generated).
