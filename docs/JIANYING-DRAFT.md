# 剪映草稿通道（通道 A）设计说明

## 定位

导演层输出中性时间线（`src/finalcut/timeline.js`）→ 本模块映射为剪映可导入草稿目录：
`draft_content.json` + `draft_meta_info.json`。用户在剪映中打开草稿即可终审精修。

## 结构与诚实声明

- 剪映草稿格式是**社区逆向结构**（与 cutcli、ArcReel 等项目的产物同源），并非字节官方文档化接口；
- 本实现采用**保守字段集**：canvas_config / materials(videos,audios,texts,video_tracks,audio_tracks,text_tracks) / tracks；
- **版本敏感**：剪映升级可能改变格式兼容性。对策：
  1. 每次生成后跑 `validateDraft()` 结构校验（id 唯一、引用完整、时间轴合法）；
  2. 记录生成时使用的剪映版本，鼓励用户固定版本；
  3. 跟踪 cutcli/ArcReel 上游的格式变更并同步。
- **待验项**：真实导入剪映的端到端测试需要剪映客户端环境，当前未执行（本机无剪映），标注待验。

## 与其它通道的关系

- 通道 A（本模块）：剪映草稿 → 人工终审（默认，中国用户）
- 通道 B：ffmpeg 本地渲染 → 无人值守直出成片
- 通道 C：OTIO → Premiere/Resolve/FCP 互通（预留）

## 决策点

终剪阶段 gate 为 `ask` 时，DSH 会在落盘草稿前把"剪辑决策清单"（镜头顺序/字幕/转场/音量）交给用户确认；
gate 为 `auto` 时直接产出草稿并在会话内展示。
