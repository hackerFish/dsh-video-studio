# 鲸影 · 节点式工作区愿景（2026-08-19 定稿）

> 用户原话：**"工作区也是自由的，可以兼容 comfyui 的格式文件和流程，也可以每个节点自定义创建。我想要的就是 dsh 可以控制生成调优每个数据，让大家在 dsh 里面就把 comfyui 的活就干了，而且不比它差，产出也很好。"**
> 状态：**P0 愿景**。自 2026-08-19 18:00 恢复开发（用户明确省 token，午后继续）。

## 目标

在 DSH 里做一个 **ComfyUI 级**的节点式生成工作区，且不差于它：

1. **自由画布**：React Flow（@xyflow/react 已装 v12.11.3），节点任意摆放、连线；
2. **兼容 ComfyUI 格式**：导入/导出 ComfyUI workflow JSON（`buildWorkflow`/`validateWorkflow` 已有），可直接执行 ComfyUI 流；也支持云引擎节点（万相/豆包/可灵）；
3. **每个节点自定义创建**：自定义节点类型（文生图/图生图/视频/分镜/提示词精调/一致性校验…），节点参数（prompt/模型/引擎/画幅）可改；
4. **DSH 控制生成与调优每个数据**：每节点可单独运行（接 /generate、/storyboard 端点）、结果图/视频回显在节点下、评审/评分回写闭环（scorebook）接入节点；
5. **不比 ComfyUI 差**：云 API（万相✅真机/豆包/可灵）+ 本地 ComfyUI 双引擎；成本护栏、账号池、模板/增益提示词工程全部进节点。

## 已完成（截至 18:00 前的 WIP）

- `@xyflow/react` v12.11.3 已装（peer react >=17 兼容）；
- `src/client/flow.ts`：WhaleFlow 画布雏形——7 段流水线节点（分镜/场景/道具/逐镜/视频/成片）+ 连线 + 单节点运行（接 /storyboard、/generate）+ 结果回显 + 最小注入样式；
- `src/client/index.ts`：全屏工坊加「🕸 节点视图 / ▦ 卡片视图」切换，节点图占整窗；
- **待办**：
  - [ ] 复核 `npm run build`（上次尾部有 Node 报错，需确认 self-test 通过 + 包体大小正常）；
  - [ ] 跑通后重启 host 让 rev 更新（构建标记已是 r6）；
  - [ ] ComfyUI workflow JSON 导入/导出（节点 ↔ `buildWorkflow`）；
  - [ ] 自定义节点创建器（节点仓库面板）；
  - [ ] 节点右键菜单（运行/复制/删除/改参数）；
  - [ ] 评审/评分回写节点接线（scorebook）；
  - [ ] 双引擎路由（云/本地 ComfyUI 节点类型切换）。

## 验收标准

在 DSH 里：拖节点 → 填提示词 → 单节点出图/出视频 → 连线成流 → 导入一个 ComfyUI workflow 也能跑 → 产出不比 ComfyUI 差（有真片/真图证据）。
