# 架构：薄抽象 × 决策点 × 自优化

## 核心接口（Provider，6 方法）

```js
{
  id: 'kling',                    // 供应商唯一 id
  capabilities: {                 // 能力声明 = 路由依据
    textToVideo: true, imageToVideo: true, firstLastFrame: false,
    lipSync: true, maxDurationSec: 10, resolutions: ['1080p'],
  },
  quote(stage, spec) -> {qualityTier, costEstimate},  // 报价=费用追踪
  submit(stage, spec) -> {jobId},                     // 提交任务
  status(jobId) -> {state, progress},                 // 轮询
  fetch(jobId) -> {outputs: [file], meta},            // 取结果
  health() -> {ok, quotaRemaining},                   // 健康与剩余额度
}
```

新增供应商 = 一个适配器文件 + capabilities 声明，流水线零改动。

## 额度调度器（多账号轮换）

- 每个账号：`{provider, credential, dailyQuota, usedToday, qualityTier}`
- 选路顺序：同供应商内按 `qualityTier` 高→低 → 配额未耗尽 → 最近使用时间（均衡）
- 免费额度（sessionid 型）作为 qualityTier 最低档参与轮换；质检失败时升级到高成本档重试
- 所有决策可审计：每次选择记录理由（`quota/decide` 事件）

## 提示词自优化闭环

```
生成 → 抽帧 → 评分（LLM 评审 + 用户反馈） → 高分提示词进模板库
                                              ↓
下一镜同风格 → 模板库命中 → 自动复用 + 微调
```

- 评分维度：一致性 / 构图 / 动作 / 时长利用率 / 风格符合度
- 模板库按风格 DNA 命名空间隔离；重拍记录降权

## 决策点（gate）

每段三种模式：auto（代理决定）/ ask（每步经 DSH 审批通道询问）/ manual（用户提供该段成品）。
gate 状态存在会话内，可随时切换模式并重跑该段。

## 无 key 验证策略

- mock provider 产出占位静帧 → 本地 ffmpeg 跑通 ④⑤⑥ 链路（分镜合成/字幕/配音）
- 单元测试覆盖：调度选路、提示词四层合并、能力路由（node --test）
