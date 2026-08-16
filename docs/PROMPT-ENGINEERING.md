# 提示词结构学（Prompt Structure Study）

> 学习对象：行业公认的专业级提示词范例（角色设定三视图、MJ 公式、角色参考表社区模板）与 2026 图像提示词工程指南。
> 本文是 `src/prompts/templates.ts` 的设计依据：总结 10 条可复用原则，并落到代码。

## 十原则（The 10 Principles）

1. **区块化分层**：主体 → 外观分层（发型/五官/体型/服装/配饰逐项）→ 姿态表情 → 光影 → 镜头 → 渲染画质 → 背景 → 构图版式 → 负面约束 → 一致性锁 → 画幅。顺序即权重，靠前更强。
2. **版式标签是命脉**：view arrangement（视图排布）/ spacing / background 决定"设定板 vs 肖像"。版式标签必须原样保留，只换角色描述变量。
3. **一致性三重锁**：面部特征 / 身体比例 / 服装配饰 三条**分别**声明（`所有视图面部特征一致` 等），笼统的"保持一致"不如三句分开有效。
4. **多视图三宗罪负面清单**：view merging（视图融合）、feature drift（面板间特征漂移）、scenic background contamination（风景背景污染）——这是多视图生成独有的失败模式，单图提示词里不存在。
5. **画幅与版式匹配**：16:9 横版三视图 / 3:4 竖版堆叠 / 1:1 表情网格。
6. **可度量锚点**：三视图高度=画面 80%、面部占满左区、三视图高度统一——量化锚点比"大一点/小一点"稳定。
7. **渲染术语分层**：次世代建模 + OC 渲染 + 8K + 85mm 焦距 + 无畸变 + PBR + 次表面散射——术语越具体，模型越可预期。
8. **姿态表情双重约束**：肯定句（自然站立）+ 否定句（无多余动作/无夸张表情/空手/无背负）。
9. **负面清单独立通道**：negative prompt 字段与正文分离，不稀释正文权重（生成器支持时）。
10. **参数化复用**：角色描述 = 变量；结构标签 = 常量。模板库保结构，调用方换变量。

## 模板库（templates.ts v2）

| 模板 | 版式 | 负面清单 | 画幅建议 |
|---|---|---|---|
| character-sheet | 左区正脸特写 + 右区三视图 | 三宗罪 + 通用 12 项 | 16:9 / 3:4 / 1:1 |
| scene-master | 纯环境 | 通用 8 项 | 16:9 |
| shot-scene | 单镜画面 | 通用 8 项 | 9:16 / 16:9 |

## 增益库（可组合片段）

- 渲染：ultra / material
- 背景：clean / cleanGray
- 姿态：neutral / plain
- 负面：noText
- 一致性：consistentFace / consistentBody / consistentOutfit

## English summary

Professional prompts are built from layered sections whose **order encodes weight**: subject → appearance details (hair/face/body/outfit/accessory, one line each) → pose & expression → lighting → camera → render quality → background → layout → negative constraints → consistency locks → aspect ratio. Multi-view character sheets additionally need: intact layout tags, **three separate consistency locks** (face/body/outfit), measurable anchors (80% height), and a dedicated negative list for the three multi-view-only failures: view merging, feature drift, scenic background contamination.
