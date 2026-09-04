# 顶级提示词博士 skill · AI 仿真人剧管线的提示词工程控制论（AI 调教 × 产出物严肃调整）

> 岗位知识库 · 鲸影 AI 仿真人剧生产管线（D:\CY\dsh-video-studio，纯 TS）· 定位：**AI 调教 + 产出物严肃调整的控制论方法论**——对 AI 的调教（把意图写成模型能执行的指令）+ 对产出物的严肃调整（评估→诊断→迭代闭环）。模型写提示词/评估产出/返工决策时引用本 skill；所有者（资深前端 + LLM 应用开发者：novel-agent 爆款学习闭环、token 成本优化经验）把它当实操手册。
> 被引用场景：video 生成 prompt / quality review 质检评审 / optimizer A/B / boost-scorebook 沉淀 / 返工与换模型决策。管线代码落点：#16。
> 一句话心法：**提示词是你唯一能完全控制的变量，其余全是分布。把要求写成指令，把模型答不出来的部分换成它能答出来的问法（改提示词→改参考→改镜头设计→换模型），永不和同一个骰子对赌。**
> 铁律（损失函数见 §4.4）：单镜同参连抽 N 次不中就停——**继续抽是掷硬币，停下来诊断才是工程**。
> 行业坐标（2026-09）：生成模型 Seedance 2.5（30s 长镜/音画一体/参考≤50 按传入顺序加权/API 实限 720p）、Kling 3.0 Pro、即梦、可灵、SkyReels（开源表情模型）。可用率是成本命门：抽卡公式 C_v=S×m×p（单抽成本×抽数×失败放大≈1/可用率），可用率 20%→90% 有效算力差 4.5 倍；头部酱油文化月营收 5000 万的核心壁垒=提示词工程人才垄断 + 影视编导理解；"抽卡师"是行业真实新职业（把脚本翻译成 AI 指令 + 深夜微调一致性）〔行业2026#15〕。

### 来源标注体系（每条规则行尾附分层+来源标签，防把 AI 语境经验当影视通则）

- **[经典]** 稳定方法论：官方文档的稳定部分 / 权威教程 / 已发表论文 / 影视工业母规则，无条件遵守。
- **[行业2026]** 2026 年前后的厂商官方指南、生产实证、社区实测与行业情报——**版本敏感**，换模型版本须按当期文档复核（见文末版本注）。
- **[AI落地]** 鲸影把上层规则工程化的可执行写法（行首 `▶AI落地`），仅对提示词与生成器能力边界负责；标注 `〔AI落地〕` 的来源默认 #16（管线代码/本库 craft 系列实证），继承外部规则时另附其分层编号。
- 行尾标签格式 `〔分层#编号〕`，编号对应文末来源索引；引用规则时把整条规则+来源一起读，勿只抄落地句。
- **证据优先级（2026-09 定稿准则）**：可用率数字、失败分类、抽卡上限等**结论性经验以国际一手实测为准**（#17-20：官方文档/学术/带数据的生产实录）；中文社区经验（#8,9,11）作交叉验证的补充并已标注出处——两者冲突时采信前者并在台账里注明。

---

## 0. 控制论回路：博士在两个环里工作

调教环（下指令）：意图 → 模板化写提示词 → 生成；产出物调整环（验收）：产出 → 评估 → 诊断 → 处方 → 返工 / 沉淀。博士不直接产成片，只产三类东西：**①提示词 ②评审意见（含返工处方）③沉淀条目（增益词/模板/参考组/反模式）**。每条规则在这条回路里有文件落点：

| 回路节点 | 管线落点 | 本 skill 章节 |
|---|---|---|
| 写提示词 | src/prompts/templates.ts（区块模板）+ optimizer.ts（增益拼装） | §1-3 |
| 评估 | src/quality/review.ts（抽帧→规则检查→LLM 评审→重拍判定） | §5 |
| 诊断/处方 | 返工决策（≤2 分重拍；本 skill 失败分类学） | §5.4, §7, §8.1 |
| 沉淀 | boost-scorebook.ts（增益记分册）+ style-dna.ts（风格基因）+ 资产库 | §6 |

`▶AI落地`：博士以"评审 prompt + 本 skill 规则"注入 review.ts 的 reviewer 回调；无 reviewer 时规则层单独判定、如实标注——**双轨评审缺一不可**（§5.2）。〔AI落地〕

---

## 1. 提示词的解剖学（结构范式 / few-shot / 负面约束 / 长度密度）

### 1.1 组装序：先有槽位框架，再谈遣词

各模型官方公式收敛后高度同构——槽位=模型的注意力结构，**顺序即权重**〔AI落地：templates.ts sections() 跳过空块、顺序拼接〕：

| 模型 | 官方/主流公式 | 纪律要点 |
|---|---|---|
| Seedance 2.5（官方六段） | subject+action → scene → visual style → camera/cut → sound；只前两段必填 | 每段一句话，别同义反复；@参考指派见 §3〔行业2026#1〕 |
| 即梦/Seedance 中文圈 8 维 | 主体→动作→场景→光影→镜头→风格→画质→约束 | **必写四件：动作、镜头、画质、约束**；其余按需〔行业2026#8〕 |
| Kling（官方） | Subject + Movement + Scene + (Camera Language + Lighting + Atmosphere) | 主体描述可多条短句列出（发型/服装/姿态…）〔行业2026#3〕 |
| Veo 3.1（社区归纳官方） | [Cinematography]+[Subject]+[Action]+[Context]+[Style&Ambiance] | **摄影段打头**——先定怎么看，再定看什么〔行业2026#4〕 |

跨模型通用基准（国际实测）：vidscore 对照 27+ 模型官方文档蒸馏出的**五段通用框架 Subject+Action+Camera+Environment+Style 全模型可用**，最优长度 40-120 词（2-4 句）〔行业2026#19〕。模型方言差异是最后一层微调：Kling v3 支持带标签的分镜列表（shot 1…shot 6）；Veo 3.1 对音频 cue 与引号对白（触发口型）响应最强；Runway Gen-4 的运镜走专用控制面板不走文字——**先按通用框架写，再按目标模型文档过一遍方言**〔行业2026#19〕。Seedance 官方答疑点名第一大错：**把镜头运动与主体运动混写在一句里**（`camera dollies in as she walks` 模型无法拆解）——相机句与动作句必须分开〔行业2026#19〕。

▶AI落地（鲸影镜头提示词通用 8 槽，video 阶段拼装）：`景别/镜头 → 主体与动作 → 场景 → 光 → 色 → 风格 → 声音 cue → 全局规则收尾`。**全局规则收尾**是 Seedance 官方教法：结尾重申必须跨全片成立的连续性约束与排除项（服装不变/无字幕/光一致），放在正文后而不是塞进中间某句〔行业2026#1〕。

- 每槽一个职责，**一槽一问不打架**：Seedance 官方指出 300 词堆满互相打架的摄影词（"手持纪实感"+"锁定对称构图"）会让模型两头落空〔行业2026#1〕；Prompt Architects 200 条实测：**一镜 2-3 个 camera 修饰词最优，>3 开始互相中和变浑浊**〔行业2026#4〕；一镜只给一个主运动（Veo 官方建议同源）〔行业2026#4〕。
- 把"最想要的那个画面变量"放在句首槽：模型对早期位置的权重更高——景别/镜头词永远句首〔AI落地，见 docs/craft/cinematography.md §1〕。
- 结构≠八股（国际一线校准）：Runway Academy 明说"严格公式没那么重要，清晰传达+减少歧义才是关键；组织方法的价值在于**方便迭代**"——槽位公式的用途是防漏与可迭代，不是套模板〔行业2026#18〕；同时警告**过度指定反噬**（over-specification：多段超长 prompt 把模型自由度压死，反而出意外结果）〔行业2026#18〕。写法基调："像导演给组员 notes，不像搜索引擎堆标签"——自然语言叙事优于纯关键词罗列〔行业2026#18,19〕。
- **关键动作只写一次**：官方指南明令"不要两次描述同一动作"，重复 = 稀释 = 模型在两次之间取折中〔行业2026#1〕。

### 1.2 few-shot：示例在"定义分布"，不在"抄答案"

机制：LLM 从你给的示例里学的是 **label space 与输入分布**（哪些输入会配哪些输出），而非逐字模板——Min et al. (2022)：演示的标签空间与分布比单条标签是否正确更能决定行为〔经典#7〕。含义：写例子要**和你的目标同分布**，而不是"找一条最漂亮的"。

- Anthropic：**最小 prompt 起步 → 用 eval 找到失败模式 → 再按失败补指令与示例**；few-shot 是官方强推手段〔经典#6〕。OpenAI 同向：先跑通最小可用，按失败模式迭代，而不是第一版就堆满〔经典#5〕。
- ▶AI落地：给"提示词重写/评审"类 LLM 任务配 1 正 1 反示例最值钱：正例=符合本 skill 公式的成品提示词，反例=常见烂写法（形容词堆砌/没槽位/裸列 @），并注明反例为什么错——比 5 条正例更能压住漂移〔经典#6,7〕。官方细则（Anthropic/Google 两侧同向）：示例**相关+多样+覆盖边界情况**，数量 3-5 条封顶——过多样式会过拟合示例本身〔经典#17〕；示例间**格式必须完全一致**（XML 标签/空行/分隔符统一），因为 few-shot 的一大职责就是教输出格式〔经典#17〕；LLM 任务给角色（system prompt）+ 编号步骤优于一段散文〔经典#17〕。
- 对生成模型本身不喂文本示例（无此字段）："示例"职能由**参考图**承担（§3.2）——4 张参考 = 用图片做 few-shot〔行业2026#10〕。

### 1.3 负面约束：先查模型方言，再决定怎么写

| 模型/入口 | negative 能力 | 落地姿势 |
|---|---|---|
| Seedance/即梦系 | 官方明确**不读负面提示词/不建议写**（中文圈实测：写了等于白写） | 全部**翻转成正向描述**〔行业2026#1,8〕 |
| Kling 系 | prompt 与 negative 各 2500 字符，支持负面 | 负面只列伪影类硬伤（多余肢体/畸形/水印），别写风格否定〔行业2026#3〕 |
| 开源本地系（SkyReels/Wan@ComfyUI，可本地表情链路） | positive/negative 双 CONDITIONING + CFG/NAG 引导 | SD 心智在这里成立：负面清单+引导强度可调；NAG 建议 I2V 降 scale 保护参考图〔行业2026#21〕 |
| 图生管线 GENERIC_NEGATIVE | 生图侧支持 | 复用 templates.ts 负面清单（低分辨率/多余肢体/水印/文字…）〔AI落地〕 |

▶AI落地：**负向正说的"三换"**——换主语（"手别畸形"→`自然放松的双手，五指比例正常`）、换动词（"避免模糊"→`保持清晰锐利`）、换粒度（抽象否定"不要不自然"→具体可见属性 `皮肤纹理自然，无塑料感`）。Seedance 系把排除项写进**全局规则收尾**（"画面始终不出现字幕、水印、无关文字"）〔行业2026#1,8〕。正向书写的国际版本是通则不是流派：promptingguide.ai 经典建议 "avoid saying what not to do — say what to do instead"（与其说"不要做什么"，不如说"去做什么"）〔经典#17〕；Runway Academy 同样"只用正向语言，描述你不想要的（no shaking）常常恰好生成它"〔行业2026#18〕。

### 1.4 长度与信息密度：微博长度是甜区，超载是衰减

- 中文视频 prompt **80-200 字甜区**：<50 字模型靠猜（每个变量都是骰子）；>300 字信息过载，**后半段权重被稀释**——不是写越多越听话，是越精准越听话〔行业2026#8〕。
- Seedance 官方侧同向：**60 词把七槽填完，胜过 300 词形容词**；~150 词之后继续加字不如加参考图（参考堆叠见 §3）〔行业2026#2〕；Kling 侧：60-100 词精简提示词优于塞满 2500 字符上限〔行业2026#3〕。
- 国际长度校准（跨 27+ 模型基准）：**40-120 词最优（2-4 句）**，超过 ~500 字符模型开始丢指令——与中文 80-200 字甜区互为印证〔行业2026#19〕。
- **mood words 无效**：cinematic/beautiful/高级感 这类词给不了模型"可指向的变量"，只会退化成最平均的读法——fal 官方答疑点名""beautiful/cinematic" gives the model nothing it can point a camera at"〔行业2026#12〕；Runway 侧同判：avoid ambiguous/conceptual language〔行业2026#18〕。
- 图生视频**别复述起始帧已有内容**（主体/场景已在图里）：只写动作、镜头、声音、变化〔行业2026#3,10〕——Runway Academy 把这条讲成模式级规则：**I2V prompt 几乎只写 motion**（主体动作/环境运动/镜头运动/节奏与速度），画面要素交给输入图〔行业2026#18〕；反例警示：输入图自带 implied motion（运动模糊/半空姿态）时，文字若与之矛盾要多轮迭代——先检查输入图的运动暗示再怪提示词〔行业2026#18〕。

---

## 2. 影视术语翻译层（中文导演意图 → 英文可执行词表）

为什么术语值钱：模型在电影语料上训练，**术语=已打包的镜头执行模板**——写 "dolly shot" 模型直接调用该运动的视觉与情绪模式，写"镜头慢慢往前推，带点电影感"则无可锚点〔行业2026#3,14〕。精度即执行率：Veo 3.1 相机术语遵循率 90%+，而 Sora 2 / Kling 3.0 约 60-70%——**术语照写，但按模型 adherence 决定"是否关键依赖镜头词"**（关键戏选高 adherence 模型）〔行业2026#4〕。**术语容受度是模型差异不是通则**：Veo/Kling/Seedance 吃专业术语，而 Runway 官方明言"不需要电影学位、平实的英文比行话好使"——同一镜头意图给 Runway 写自然语言、给 Veo/Kling 写术语〔行业2026#18,19〕。

| 中文导演意图 | 英文术语（入 prompt） | 提示词示例 |
|---|---|---|
| 焦点从脸转到剑（不是"模糊"） | rack focus | `rack focus from her face to the sword` |
| 推近（带速度与落点，裸写无效） | slow dolly in…to CU | `slow dolly in from medium shot to close-up, ending on her eyes`〔行业2026#3,14〕 |
| 摇摄扫视（全模型最可靠） | pan / tilt | `slow pan right across the hall` |
| 环绕审视 | orbit clockwise | `camera slowly orbits clockwise around the subject` |
| 手持纪实慌乱 | handheld | `handheld, slight camera shake` |
| 仰拍加威压 | low angle, view from below | `low angle shot, looking up at him` |
| 伦勃朗光权谋戏 | Rembrandt lighting | `Rembrandt lighting, dark moody background` |
| 逆光剪影藏脸 | backlit silhouette | `backlit silhouette against the window` |
| 长焦人像压缩 | 85mm, shallow depth of field | `85mm lens, creamy bokeh` |
| 景别先行 | CLOSE-UP / MEDIUM SHOT… | 景别词永远句首〔AI落地，见 cinematography.md〕 |
| 冷调压制 | cool desaturated grade | `cold desaturated color grade` |
| 锁定机位防漂移 | locked-off tripod, static | `locked-off tripod shot, no pan, no zoom`〔行业2026#4〕 |
| 动作动词具体化 | slams/glides/ billows | 具体动词优于 is/seems/缓缓（引导词表）〔行业2026#4〕 |

- **rack focus 类术语 vs "焦点转换/模糊"**：术语描述机制（谁先实谁后实），模糊词让模型随机选焦；同理 "dolly in" 与 "zoom in" 语义不同（前者带视差位移）——写错机制=物理穿帮〔行业2026#4,14〕。
- ▶AI落地：**双语策略——中文写意图，英文写画面**。Seedance/即梦中文理解是原生级（场景/动作/情绪用中文更准），但中文镜头词（"推近""环绕"）响应不稳，统一转写英文标准术语再入句〔行业2026#8〕；同一概念不要中英同义混写（"slow dolly in 慢慢推近"=重复描述同一动作，§1.1 禁忌）。镜头/光/风格术语全剧词库一致，见 docs/craft/cinematography.md §1-6 已核词表〔AI落地#16〕。

---

## 3. 角色与一致性提示词工程（@绑定方言 / 参考图组法 / 锁定字段纪律）

### 3.1 参考图绑定方言（2026-09 实测方言，接入 provider.ts 前按当期文档复核）

| 平台/入口 | 引用语法 | 说明 |
|---|---|---|
| Seedance 2.5 官方（火山方舟/即梦） | `@Image1` `@Video1` `@Audio1` | 上传自动编号；提示词里按编号**指派职责**；≤50 参考（≤30 图 + ≤10 视频 + ≤10 音频）**按传入顺序加权，越靠前越重**〔行业2026#1〕 |
| fal Seedance 1.0 系早期 | `[Image1]` 占位式 | 旧方言，接入时以当期端点文档为准〔行业2026#1,10〕 |
| fal Seedance 2.x reference-to-video | `@Image1` | 生产验证端点；参考以 URL 直传〔行业2026#10,12〕 |
| 可灵 3.0 Omni | `<<<image_1>>>` 主体参考（elements 概念 1-4 图） | 角色 ID 提取式绑定 + 多主体元素化；音画同出〔行业2026#3,11〕 |
| 即梦平台界面 | `@图片1` `@视频1` | 中文界面方言，语义同 @ImageN〔行业2026#8,9〕 |

- **一素材一职责**：上传的每张图/每段视频只干一件事（锁脸 / 锁服装 / 锁场景 / 复制运镜 / 锁声音）。反模式=堆一堆产品图告诉模型"这个人就这样"——不同光位十张产品图教出来的是"这个人不一致"〔行业2026#2〕。
- **绑定铁律三句**：①@编号只在提示词里出现一次"指派语句"（`Define the woman in Image1 as Subject 1`），此后全篇只用角色标签不再提编号〔行业2026#1〕；②裸列 `@Image1, @Image2` 不指派角色=串脸温床，必须写 `the boy from @Image1 rides the dog from @Image4`〔行业2026#10〕；③多视角图同属一个对象**必须明说**（`@Image1-4 是同一盏折叠灯的四个视角，成品里只有一盏灯`），否则模型按"四个对象"理解〔行业2026#1〕。
- ▶AI落地：资产编号规范 C01/P01/S01（角色/道具/场景）贯穿资产生成到分镜（中文社区长剧管线已验证）〔行业2026#9〕；鲸影 master asset 阶段同规则命名，@绑定由 provider.ts 方言层翻译〔AI落地〕。

### 3.2 参考图组法（生产验证过的最小完备集）

- **单人 4 参考技术**：①正脸 hero（平光、素背景、眼神看镜头）②纯侧特写（锁脸型/鼻/耳/镜框）③3/4 动态（不同光位，防止模型锁死单一姿态）④正脸 alt（**不同背景不同服装细节、同一张脸**，防①的背景渗漏）。为何 4 张：2 张时模型过拟合锐度更高的那张姿态；4 张把约束分散到角度上，模型**平均到"身份"而非"某张姿态"**〔行业2026#10〕。
- **多主体 3+2 规则**：同框主角给 3 张（hero+profile+alt）、配角给 2 张（hero+profile）——等量给图会**身份互渗**（宠物花纹上孩子的衬衫、眼睛互换）〔行业2026#10〕。
- 参考图质量 checklist：短边≥1024；身份图人脸占帧≥40%；无运动模糊；无重色偏（夕阳/水下蓝光会污染身份）；身份图用素背景；**每张必须新增角度信息**（禁重复）；HEIC 转 JPG〔行业2026#10〕。
- **参考数不要贪**：多数制作 3-8 张而非 50——50 上限是给多角色×多角度×动效+音频的复杂工程用的，不是目标〔行业2026#2〕。
- **跨镜跨集（>单镜叙事）双策略+混合**：A. 换新场景/新"世界"时**每 clip 全量 reference-lock**（同组参考喂进每一次生成——身份锚在参考集，不在前文记忆）；B. 同场景镜间用**上一镜末帧作下一镜起始帧**续接（姿态/光/服装无缝，但图生视频端点不接额外参考、长 clip 会漂）。混合：A 管跨场，B 管场内，**转场一律切角度**——模型在剪辑点接受姿态跳变远比镜中段容易〔行业2026#10〕。

### 3.3 描述进提示词的规范写法（无参考兜底时的"文字角色卡"）

- **身份锁定字段（跨镜逐字不变）**：脸型/发色发型/瞳色/肤色/眉骨疤痕等特征 + 服化锚（颜色+款式+配件）。细节即控制（Veo 官方："woman in her 30s, short curly black hair, olive skin, plain white crewneck, small gold hoop earrings" 远好于 "a brown-haired woman"）〔行业2026#4〕。
- **"锁定字段+状态词"分层纪律**（设定卡定变分离）：字段分三层——identity（全剧锁定，从角色卡**原样复制**）、outfit lock（场锁定）、state（镜可变：wear/表情/情绪/手持物，每镜按戏改）。身份字段每次经自然语言改写 = "cousin 效应"（同一人写两遍变亲戚）；模型无跨镜记忆，服装必须**逐镜点名**（"眼镜在整镜中保持 intact" 类保命短语）〔行业2026#10,11〕。
- 模型**没有跨镜记忆**：每个新 clip 都在顶部重述视觉锚（服装颜色/光方案/发型），这是跨镜一致性成本最低的写法（Veo 侧同规则：re-establish anchors every clip）〔行业2026#4,11〕。
- ▶AI落地：角色卡字段落 templates.ts 的 TemplateVars（face/hair/body/outfit/accessory 常驻槽），video 拼装时自动注入锁字段、只换 state 槽——把"纪律"变成代码结构〔AI落地〕。

### 3.4 多角色同框的现实边界

2026 年中**双人同框仍是全平台弱项**（身份模糊/串脸普遍）〔行业2026#11〕。处方：同框镜主角≤2 且给足物理/色相区隔；双人参考+role phrase（§3.1）；涉及双手互动的同框镜用双人手部锁定词并减动作幅度（中文社区 12 铁律之一）〔行业2026#9〕；仍不行=拆单人镜+正反打（回到导演课 180° 打法），别在 prompt 上死磕。

---

## 4. 可用率工程（抽卡策略与成本命门）

### 4.1 成本模型：可用率是唯一的整体杠杆

行业抽卡公式 C_v = S × m × p（单抽成本×抽数×失败放大≈1/可用率）：**可用率 20%→90%，同量可用素材的摊薄算力差 4.5 倍**〔行业2026#15〕。**国际一手实测校准**（带记录的制作数据，2026-07）：约 **3 次生成换 1 个可用镜头**、**~25% 生成件进终剪**（164 生成→41 使用）、真实"单可用镜头成本"是标价的 **3-4 倍**；复杂度分级：普通混合镜 3-5 抽/可用，**复杂镜（手部/口型/行走/多主体/手物交互）6-10 抽/可用是常态**（Kling 3.0 约 1-in-4 可用、Veo 3.1 约 1-in-5）〔行业2026#20〕。把"25% 可用率"当行业基线而不是你的失败：能稳定抬到 40%+ 就是竞争壁垒〔行业2026#20,15〕。中文产业情报交叉验证：头部酱油文化月营收 5000 万的核心壁垒=提示词工程人才+影视编导理解，员工=输入提示词+检查逻辑/风格一致性的"审核员"——**你的可用率就是审核员时薪的倒数**；"抽卡师"把脚本翻成指令+深夜微调一致性，本质也是抬可用率〔行业2026#15〕。

### 4.2 两阶段抽卡策略

- **探索期（广撒网探方向）**：便宜档快速验证——5s/720p 先锁风格再升时长分辨率（fal 成本纪律，单条约 $1.5 级，风格没锁之前别上高参数）〔行业2026#12〕；Seedance 系用低档/1.5 先验方向、方向对了再上正式档〔行业2026#8〕。此阶段**一次只测一个变量**（§6.1 A/B 纪律），测出的是"方向"不是"成品"。
- **锁定期（锁定后精抽）**：参考集 + 提示词模板版本 + 参数档位全部冻结，同镜并发生成 2-4 条择优；浮动范围只允许 state 槽（表情/手持物/微动作）与运镜微调。探索/锁定切换点=出现第一条"可过"基线（score≥3）〔AI落地〕。
- **先挖矿再重抽（国际制作实录，最省钱的习惯）**：一条 15s 生成通常含 **4-7 个可用候选段**，成片平均只用每条的 ~5s——选段拼接（Frankenstein shot，一部 3 分钟动画 41 个终剪镜里 17 个是拼接镜）优先于整条重抽〔行业2026#20〕；一条好镜只坏一处连续性时，**回源头改角色/场景资产并只重生成坏段**，别整镜重摇〔行业2026#20〕。
- **先锁资产再抽镜头**：角色视觉身份锁定平均耗 ~5 次生成/角色（约 $9.78/角色）——锁定发生在任何镜头抽卡之前，否则每次重抽都在"重新发现长相"〔行业2026#20〕（鲸影 master asset 阶段即此步〔AI落地〕）。

### 4.3 可用率提升杠杆排序（投入次序，低序杠杆别先动）

1. **模型选型**：镜头/一致性 adherence 差距可达 90% vs 60-70%（Veo 3.1 vs Kling3.0/Sora2 实测）〔行业2026#4〕；按**单可用镜成本**而非标价选模型——国际实测（8s clip 档，含重抽摊薄）：Kling 3.0 ~$1.2-1.8/可用镜、Veo 3 Fast ~$2.6-4.3、Seedance 2.0(720p) ~$5.0、Veo 3.1 ~$3.4-9.3，贵模型贵在 Day5 也一样贵〔行业2026#20〕。关键戏（微表情/复杂运镜/双人）选高 adherence 模型，大场面远景戏可下放便宜档。
2. **提示词质量**：公式槽位、术语化、密度（§1-2）、全局规则收尾——零边际成本杠杆，且有国际基准背书：10,000+ 视频重写实验里 **87% 的 <4/10 分输出在换用更好的提示词后升到 ≥7/10**（三次独立工程师重写取齐）〔行业2026#19〕。
3. **参考资产**：4 参考组、参考质量 checklist、光色基线图（§3.2）。
4. **参数档位**：时长/分辨率/比例/模型版本；**别调不存在的参数**——Seedance 无 seed、无权重语法、无采样参数可调（`(masterpiece:1.5)` 会被当普通文字），"调参空间"只存在于 UI/API 给的那几个档〔行业2026#8〕。
5. **重试次数**：最低优先级——重试只改善方差不改均值（§4.4）。

### 4.4 单镜抽卡上限决策规则（超阈值=回查而非继续抽）

阈值按**复杂度分档**设（国际实测基线：普通混合镜 3-5 抽/可用、复杂镜 6-10 抽/可用〔行业2026#20〕），下表的"停"= 对该镜做一次诊断（§8.1），不是删镜：

| 连续无可用抽数 | 动作 |
|---|---|
| 2 抽 | 两抽同型失败（同类缺陷复现）→ 判定为**系统性问题而非运气**，直接诊断；缺陷互异 → 普通镜可再抽 1 次，**复杂镜（手/口型/行走/多主体/手物交互）直接进入诊断**（6-10 抽/可用意味着别指望头两抽） |
| 3-4 抽（普通镜） | 停。回查提示词：槽缺没缺 / 术语还是形容词 / 有没有互相打架的指令（§8.1 Q1-Q2） |
| 6-7 抽（复杂镜） | 停。换层：参考绑定（§8.1 Q3）或换模型/换档位（§8.1 Q5）；复杂镜还没到国际实测的 6-10 上限区间低端时**优先排查手部/口型类已知弱项**而非怀疑提示词〔行业2026#20〕 |
| 超复杂度档位上限（复杂镜 10 抽+） | **禁止继续**——每多抽一次的期望成本超过一次诊断的时薪。进提示词诊所（§8.1） |

依据：eval 必须贴近生成环——"Put eval inside the generation loop"，早期抓错省返工〔行业2026#13〕；3-reroll A/B 法：证明一条短语是否有效=每版各抽 3 次看可用率，而不是单条成败（单条=噪声）〔行业2026#4〕。`▶AI落地`：不要把"同一镜头连续 2 条高分后突然 0 分"当模型变差/变好——无 seed 方言下每次都是独立采样；高分样本进记分册时记版本快照〔AI落地〕。

---

## 5. 产出物严肃评估（维度体系 / 双轨评审 / 失败分类学）

### 5.1 评估维度体系（评分级仿真人剧观众识破点：微表情眼神 / 光影假 / 手）

| 维度 | 判什么 | 检查问题样例 |
|---|---|---|
| 一致性 | 身份/服装/道具 vs 参考集 | 脸还是 @Image1 那张吗？服装颜色款型变没变？〔行业2026#10〕 |
| 构图/景别 | 镜头语言达没达意 | 该 CU 给到 CU 没？主体在画面里被裁得合理吗？ |
| 动作逻辑 | 动作是否物理成立 | 起身→转身→抬手 顺序对吗？脚步/重心合理吗？〔行业2026#9〕 |
| 表情/微表情 | 情绪是否"演出来" | 眼神有戏吗？嘴型与情绪同步吗？还是塑料脸？〔行业2026#9〕 |
| 物理 | 世界法则不破 | 影子方向、杯水重力、布料随动、遮挡关系〔行业2026#13〕 |
| 音画 | 声音与画面绑定 | 口型/音效/配乐情绪是否与画面同拍（Seedance/Kling Omni 音画一体特性）〔行业2026#1,3〕 |
| 穿帮/污染 | 硬伤清单 | 字幕水印乱入？多余肢体？背景文字？延长段跳变？〔行业2026#1,9〕 |

### 5.2 双轨评审（规则评审 + LLM/视觉评审）与评审 prompt 设计

- **规则评审（确定性、无 LLM 也可跑）**：抽帧→检查分辨率/黑帧/冻结帧/时长/首尾帧一致性/水印字幕痕迹。review.ts 已实现规则层，无 reviewer 时如实标注——这是防"LLM 全判过"的底线〔AI落地〕。
- **LLM/视觉评审**：LLM-as-judge 两大已知弱点——**对 prompt 措辞极度敏感**（同视频不同评审措辞给不同分）与**绝对分漂移**；缓解手段=人标定样本定期校准评审 prompt + 优先**成对比较**（A 好还是 B 好）而非绝对打分（Maor Bril 3 秒评审器生产经验）〔行业2026#13〕。
- **评审 prompt 四原则**（模板见 §8.2）：①**先查后评（check-before-score）**——把提示词拆成加权原子需求逐条核验，聚合已核验结论再给分〔行业2026#13 FIRM-Video〕；②**实体可见性核验**——角色/道具/服装"根本没出现在画面里"时不得评"一致/不一致"，先判可见性〔行业2026#13〕；③**证据链先行**——禁止无约束理由给分后补解释（unfaithful justification），先列证据帧再下结论〔行业2026#13〕；④**分维评分**——同一段推理同时扣多个维度 = 重复惩罚（entangled attribution），一致性/物理/画质分开查分开报〔行业2026#13〕。评估 schema 应随评审模型校准（per-VLM 分维度评估比全局 schema 相对提升 ~32%）〔行业2026#13〕。

### 5.3 评分→行动映射（对接 review.ts 的 1-5 制）

| 分 | 含义 | 行动 |
|---|---|---|
| 1 | 不可用：硬伤贯穿（变脸/结构崩/穿帮） | 重拍——先诊断（§8.1）再改，禁止原样重抽 |
| 2 | 差：方向对但多处缺陷 | 重拍——局部改提示词，同处方验证一次 |
| 3 | 可接受：有缺陷但后制可救/观众不可见 | 过，缺陷记入返修清单 |
| 4 | 好：无明显穿帮、情绪达标 | 过；可作 A/B 参照基线 |
| 5 | 优秀 | 过 + **沉淀**：增益词/模板/参考组入册（§6.3）〔AI落地〕 |

`▶AI落地`：评审返回的 score 必须伴随 failureClass 与处方，否则"返工"只是重摇骰子——见 5.4 与 §8.2 输出 schema〔AI落地〕。

### 5.4 失败分类学：按根因归类，每类一个处方

| 失败类别 | 判据 | 处方 |
|---|---|---|
| 提示词语义 | 缺陷随措辞变、同类词换写即好 | 重写公式槽 / 术语化 / 减冲突指令（§1,2） |
| 参考绑定 | 脸是"像但不是"、服装串、对象多出来 | 补 @指派语句 / 按 3.2 重组参考 / 参考质量 checklist〔行业2026#10〕 |
| 模型能力边界 | 双人同框串脸、**手部/口型/行走/手物交互（国际实测 6-10 抽/可用类别，属于已知成本不是 bug）**、超快动作崩、超长复杂调度崩 | 不写提示词了——改镜头设计（藏拙位/拆镜/切角度）或换模型〔行业2026#4,11〕；该类镜按 6-10 抽预算排队而非当失败诊断〔行业2026#20〕 |
| 参数档位 | 时长超能力、低档糊、比例裁切坏构图 | 降时长 / 升档 / 换比例；别调不存在的采样参数〔行业2026#8〕 |
| 随机运气 | 同参同缺陷不复现、单次孤例 | 同参重抽，上限 3 次（§4.4） |
| 风格漂移 | 单镜 OK、连镜观感散 | 回风格基线（光色基线图/DNA），锁 style 槽（§6.4）〔AI落地〕 |

---

## 6. 迭代闭环（A/B / 回归 / 沉淀 / 风格 DNA）

### 6.1 A/B 测试设计：同镜两版，只差一个变量

- 每版各抽 3 次比**可用率**，不比单条成败（单条=噪声）〔行业2026#4〕；评审用**成对比较**优于绝对分（§5.2）〔行业2026#13〕。
- 值得测：槽位措辞（镜头词写法/光词给源还是给形容词）、语序（镜头词句首 vs 句中）、负面写法（翻转前后）、参考组组合（4 张 vs 2 张）。不值得测：形容词堆叠、玄学词（§1.4）〔行业2026#12〕。
- 结论必须落册：A/B 结论是沉淀条目的一种（winning 写法 + 数据），进 boost-scorebook 同库〔AI落地〕。

### 6.2 回归管理：改 A 镜不许破坏 B 镜

- **模板版本化**：templates.ts 的区块就是版本单元——prompt 变更 = 改代码，走 OpenAI 官方实践："prompt builders 放功能旁的小模块 + 上线前备 fixtures/tests/eval 检查 + 变更带版本"〔经典#5〕；风格字段不许散落在单镜草稿里手改（改一镜的"顺手"会通过同模板污染整场）〔AI落地〕。
- **风格回归抽检**：每个风格改版后，跑一条固定"风格锚 prompt"（同一参考+同一风格槽）抽 1 条对比 style-dna 基线——把"风格没变味"变成回归测试〔AI落地#16〕。

### 6.3 高分沉淀机制（对应 boost-scorebook）

- 记分册逻辑：`recordOutcome(style, boosters, score)` 按风格记每个增益词的得分史；**warm≥3 次才有数据**（少于 3 次=噪声）；optimizer 按该风格历史高分推荐增益组合——A/B 生成 → 评分 → 高分组合沉淀 → 下次自用〔AI落地#16〕。
- 沉淀单元三档：**增益词**（boosters，哪个词对这个风格有效）/ **整条模板**（templates，模板版本化）/ **资产组**（参考组+角色卡+光色基线，跨集复用）。5 分镜头必沉淀，3 分镜头的失败处方也沉淀——"能指出具体缺陷的反面案例比一堆好片更值钱"〔行业2026#13〕。

### 6.4 风格 DNA 维护

- 风格不放在每镜 prompt 里赌，放资产层：**光色基线图/风格参考帧**（master asset 阶段产出）锚住全剧观感 + prompt 层固定 style 槽短标签；单镜只许在 state/运镜上浮动〔AI落地#16〕。
- style-dna.ts 管"哪个模板适合这个风格"，boost-scorebook 管"哪些增益词有效"——互补双库，沉淀时对号入座〔AI落地#16〕。

### 6.5 回路总览

`意图 →(模板化) 提示词 → 生成 →(规则+LLM 双轨) 评估 →(分类学) 诊断 → 处方 →(A/B) 迭代 →(记分册/DNA/资产) 沉淀`——每个箭头都有文件落点（§0 表）。模型引用本 skill 就是在回路上工作：**评估不带处方是空转，沉淀不落库是遗忘。**

---

## 7. 防幻觉与穿帮处方（AI 失败模式速查表）

| 症状 | 常见根因 | 提示词侧处方 | 兜底 |
|---|---|---|---|
| 变脸/脸 morph（镜中渐变） | prompt 暗示了"变形"事件；身份约束弱 | 拆成两镜硬切（morph 常在模型试图表现转变时出现）〔行业2026#10〕；图生加"保持 @Image1 人脸特征一致"全局规则 | 藏脸（剪影/逆光/远景）〔AI落地〕 |
| 崩手/多余肢体 | 动作幅度大、速度快；**手部镜头属国际实测 6-10 抽/可用类**〔行业2026#20〕 | 动作拆小慢化（慢、连、稳）；手部写具体状态 `自然放松的双手`；手部特写镜拆出单独预算〔行业2026#8〕 | 手部给景别/遮挡；Kling 系负面列手部畸形〔AI落地〕 |
| 光跳变/影调跳（跨镜） | 光方案没锁定 | 每镜光锁句 `match reference lighting`；同场光向/色温/主光位写死〔AI落地#16〕 | 回光色基线图返工 |
| 道具漂移/换手 | 道具无参考、未逐镜点名 | 道具建 P 编号参考 + 每镜点名 `sword in his LEFT hand, intact throughout`〔行业2026#9,10〕 | 道具特写单镜生成后拼接 |
| 服装突变 | 只给第一镜绑了服装 | 每镜重述服化锚（§3.3 锁字段注入）；换装戏用 outfit anchor 图〔行业2026#10,11〕 | 服装单镜校准 |
| 双人串脸/双胞胎化 | 无 role 指派、等量参考 | role phrase + 3+2 参考（§3.2）〔行业2026#10〕 | 拆单人镜正反打 |
| 字幕/乱码文字入屏 | 模型自发生成字幕 | 全局规则收尾：`画面始终不出现字幕、水印、任何文字`〔行业2026#1,8〕 | 抽帧检查时拦下 |
| 续写/延长跳变 | 首帧没锁、变化量过大 | @视频延长以末帧为锚 + 降变化量；延长段只动小元素〔行业2026#9〕 | 独立成镜重生成接剪辑 |
| 快动作变形/残影 | 帧间差异过大（插值猜错） | 动作动词降速、拆拍；运动给速度词 `slow`〔行业2026#8〕 | 远景/遮挡拍大动作 |
| 塑料脸/眼神死（ECU） | 大特写硬拍微表情 | 表情写"变化过程"而非定格（嘴角上扬的过程/眼神先垂后抬）〔行业2026#9〕 | ECU 少拍整脸，拍眼/手/物〔AI落地〕 |

---

## 8. 交付工具包（诊所流程卡 / 评审 prompt 模板 / 可用率台账）

### 8.1 提示词诊所流程卡（拿到差产出→诊断 5 问→处方选择树）

```
拿到不合格产出
 ├─ Q1 指令完整吗？8 槽缺了没（动作/镜头/画质/约束必写四件）……缺 → 补槽（§1.1）
 ├─ Q2 说的是术语还是形容词？("电影感/高级/模糊"存在吗)…有 → 翻术语（§2）
 ├─ Q3 参考绑对了吗？指派语句有吗？参考图过质量 checklist 吗？…没过 → 重绑（§3）
 ├─ Q4 对照上一镜成功案例，这次改了哪个变量？(同参考同风格只该动 state)…乱改 → 回滚
 └─ Q5 是能力边界还是写法问题？(双人同框/超快动作/复杂长调度=边界)
       ├─ 边界 → 不改 prompt：改镜头设计（藏拙位/拆镜/切角度/换模型）（§5.4, 7）
       └─ 写法 → 落处方：改槽→改词→改参考→精抽（上限 3-5 抽，§4.4）
 失败类别判据表见 §5.4；每次诊断结果记台账（§8.3）
```

### 8.2 评审 prompt 模板（可直接注入 review.ts reviewer / 视觉模型，先查后评）

用法注：按 Anthropic XML 分隔法把三类内容分标签包裹（`<video_input>` 帧路径 / `<shot_prompt>` 提示词 / `<checklist>` 维度），防止评审把输入当指令〔经典#17〕；评审 prompt 自身也要过健康检查（无主观限定词、单任务、不超出评审模型能力——Google prompt health checklist）〔经典#17〕；措辞一旦改动即视为评审器版本变更，须人标定校准（§5.2）。

```text
你是仿真人漫剧的质检评审。对给定镜头视频与其提示词，遵循"先查后评"：
步骤1 拆解：把提示词拆成加权原子需求（主体/动作/场景/光/色/镜头/声音/一致性约束），标注各自权重。
步骤2 核验（check，逐条给 yes/no+证据帧时刻）：逐条核对画面是否满足；凡涉及角色/服装/道具，
       先判"该实体是否实际出现在画面中"，未出现则该维度记"不可判"而非"一致/不一致"。
步骤3 分维评估（不跨维复用同一处缺陷）：一致性 / 构图景别 / 动作逻辑 / 表情微表情 /
       物理合理 / 音画同步 / 硬伤污染（字幕水印多余肢体背景文字），每维独立查、独立报。
步骤4 打分：1 硬伤贯穿不可用；2 方向对但多处缺陷；3 可接受有缺陷；4 无明显穿帮情绪达标；
       5 优秀。先列证据再给分，禁止先给分后补理由；同类失败已在上一步记录则不再重复扣分。
输出 JSON：{"score":1-5,"per_dim":{"consistency":"pass|fail|unjudgeable",…},"top_issues":[
{"issue","frame_time","dimension"}],"failure_class":"提示词语义|参考绑定|能力边界|参数档位|随机|风格漂移",
"prescription":"一句话处方（指向 §8.1 Q1-Q5 与 §5.4 表）","evidence":["帧时刻+所见"]}
```

设计依据：check-before-score / 实体可见性 / 反事后合理化 / 防 entangled attribution（FIRM-Video 三原则）〔行业2026#13〕；1-5 映射对齐 review.ts 重拍判定〔AI落地〕。**评审措辞改动要人标定校准**（§5.2）。

### 8.3 可用率台账字段清单（每镜每抽一行，对接 cost-control.md 台账）

`shotId | model | modelVer | promptVer | refSetHash | refCount | params(时长/比例/分辨率档) | attempt# | usable(0/1) | score(1-5) | failureClass | diagnosis | prescription | cost(单抽) | ts | note`

- refSetHash：参考集内容哈希——换任何一张图都算新 refSet，台账才可比；promptVer 对应模板 git 版本（§6.2）。
- 台账是 §4.4 阈值与 §6.1 A/B 的数据库：**"凭感觉重抽"是台账上最贵的一行**〔AI落地〕。
- 汇总口径：单可用镜头成本 = Σ(该镜所有抽的 cost) ÷ usable 数；按 model/refSet/promptVer 三个维度透视，找可用率洼地——那就是下一个诊断对象〔行业2026#15〕。**单可用成本逐集攀升 = 提示词正在漂离模型擅长区**（国际无脸频道运营指标：爬升就查 prompt drift，跌破素材替代成本线说明工作流在挣钱）——趋势当早期告警，别等一集拍完才发现〔行业2026#20〕。

---

## 来源索引（Sources）

| # | 来源 | 内容供给 |
|---|---|---|
| 1 | 火山引擎《Doubao Seedance 2.5 提示词指南》(volcengine.com/docs/82379/2222480)；官方指南英文译本 dev.to/super_lewis《The Seedance 2.5 Prompting Guide, in English》(2026-08-05)；segmind/suno.bi 六段式解读 | 六段式公式、@ImageN 引用指派、≤50 参考按传入顺序加权(≤30 图+≤10 视频+≤10 音频)、秒级时间戳/Shot N、全局规则收尾、同对象多视角必须明说、"九件不做"、音画一体 |
| 2 | seedance25ai.app《Seedance 2.5 Prompt Guide: Structure, Reference Stacking》(2026-06-27) | 30s 四到五拍甜区、60 词填满七槽>300 词形容词、~150 词后上参考、多数制作 3-8 张参考、参考按职责分类、给最后一拍落点 |
| 3 | Kling 官方《Text-to-Video Prompt Guide》(kling.ai/quickstart, 2025-11)；Atlas Cloud《Kling AI 影片提示詞指南2026》(atlascloud.ai)；可灵开放平台 Kling 3.0/3.0 Omni API 文档(klingai.com/document-api) | Subject+Movement+Scene+(Camera+Lighting+Atmosphere) 公式、prompt/negative 各 2500 字符、60-100 词优于塞满、图生视频只写动作镜头、精确术语 vs "电影感"、Omni 主体参考与音画同出 |
| 4 | Google DeepMind《Veo 3 Prompt Guide》(deepmind.google/models/veo/prompt-guide)；Prompt Architects《30 Cinematic Camera Prompts for Veo 3 & Kling 2026》(200 条实测)；sunra.ai《Veo 3.1 Complete Guide》(遵循率基准)；veo3gen《Veo 3 Shot-Language Cheat Sheet / Shot Brief》(2026-06)；jgarzik/ai-video veo3-flow-guide(Dave Clark Prompt Rules) | 细节即控制、framing/motion 分列、Veo 3.1 五段式 [Cinematography] 打头、2-3 个 camera 修饰词上限、一镜一主运动、镜头遵循率 90% vs 60-70%、locked-off 硬约束写法、3-reroll A/B、每 clip 重述视觉锚、动词具体化 |
| 5 | OpenAI《Prompt engineering》官方指南(developers.openai.com) | prompt 版本化与快照、fixtures/tests/evals 先行再改生产 prompt、按失败模式迭代 |
| 6 | Anthropic《Effective context engineering for AI agents》(anthropic.com/engineering) | 最小 prompt 起步→按测量到的失败补指令与示例、few-shot 强推 |
| 7 | DAIR《Prompt Engineering Guide》Few-Shot 章 + Min et al. (2022, arxiv 2202.12837) | few-shot 机制：演示的 label space 与输入分布塑造行为 |
| 8 | 知乎 彼岸流天《Seedance 2.0 提示词攻略：掌握这套公式》(2026-02-12, zhuanlan.zhihu.com/p/2005428746417640272) **[中文补充]** | 8 维公式、必写四件、80-200 字甜区、>300 字稀释、不读负面提示词→正向翻转、无 seed/权重语法、慢连稳、约束词=保命绳、一个视频一件事、中文原生写作 |
| 9 | mantoufan《seedance-prompts-skill》(github, 2026-05, 115★；抖音创作者实操经验蒸馏) **[中文补充]** | 12 生产铁律、C/S/P 资产编号、@图片/@视频引用语法、跨集 @视频1 延长续接、ID 漂移/双胞胎/字幕/风格漂移避坑、表情写过程 8 步、双人手部锁定 |
| 10 | Jango-AI《seedance-skill: references/character-consistency.md》(github, fal reference-to-video 生产验证) | 单人 4 参考技术及原理、多主体 3+2 防 identity bleed、role phrase 写法、跨 clip reference-lock/last-frame 双策略+混合、参考图质量 checklist、失败模式表 |
| 11 | 2026 一致性指南：aimagicx《Long-form AI Video Character Consistency Guide 2026》；higgsfield《7 Tools for Consistent AI Characters》；neolemon《Consistent Characters in AI Videos》；verticalstudio《2026 Guide》 | 参考 sheet 流程、Kling 3.0 Character ID(3-5 图)、模型无记忆→逐镜重述、一次只改一个变量、双人同框串脸为 2026 年中全平台弱项、outfit anchor、I2V 优先、转场切角度 |
| 12 | fal.ai《Seedance Prompting Guide》(fal.ai/learn) | 5s/720p 先锁风格再升档的成本纪律、mood words("cinematic/beautiful")无效、参考堆叠替代长 prompt |
| 13 | 视频自动评审研究：FIRM-Video《Check Before You Score》(arxiv 2608.21839)；《Each Judge Its Own Yardstick: Per-VLM Taxonomies》(arxiv 2606.22918)；Maor Bril《3-Second AI Video Judge》(AI Engineers podcast 转述, yourai.pro) | check-before-score 清单法、IF 拆加权原子需求、实体可见性核验、反 unfaithful justification、防 entangled attribution、per-VLM 分维度评估 ~32% 相对提升、eval 进生成环、成对比较优于绝对分、人标定校准 |
| 14 | 影视术语→AI 映射词表：Atlas/Kling、Prompt Architects、veo3gen 词表 + 本库 docs/craft/cinematography.md §1-6（ASC/Hurlbut,ASC/PPA 系已核词表） | 术语=执行模板的机制、rack focus/dolly/pan/orbit 等精确写法、光型/景别词库 |
| 15 | 行业情报（中文产业报道，作背景参照）：cbndata《AI漫剧大逃杀：成为前1%，或者倒下》(2026-03)；bmronline《酱油文化"AI漫剧工厂"的成本革命》(2025-12)；wallstreetcn《AI重构内容工业+海外变现验证》(2026-02)；tmtpost《AI漫剧：百亿风口下90%在亏损》(2026-03) | 酱油文化月营收 5000 万、员工="审核员而非制作者"(输提示词+查逻辑+查一致性)、护城河=提示词工程人才+影视编导理解、抽卡师职业现实、可用率即成本命门 |
| 16 | 鲸影管线代码与本库 craft 系列：src/prompts/{templates.ts, optimizer.ts, boost-scorebook.ts, style-dna.ts}、src/quality/review.ts、src/provider.ts、docs/craft/*.md（director/cinematography/cost-control…） | 区块模板"顺序即权重"与一致性三重锁、记分册 warm≥3/按风格推荐、1-2 重拍 3 可接受 4-5 晋升、无 reviewer 如实标注、风格 DNA 双库互补 |
| 17 | 国际 LLM 提示词官方方法论（国际一手）：Anthropic《Prompting best practices / Overview》(docs.anthropic.com)、Google Gemini API《Prompt design strategies》(ai.google.dev/gemini-api/docs/prompting-strategies) + Google Prompting Essentials 五步框架（grow.google/prompting, Coursera）、promptingguide.ai《General Tips / Few-Shot》 | 角色+编号步骤优于散文、示例 3-5 条相关多样覆盖边界、few-shot 格式必须一致、正向书写通则（"say what to do instead"）、prompt health checklist（模糊限定词/多任务/超出能力任务）、prompt 迭代与版本化为课程一级技能 |
| 18 | Runway Academy《Prompting Guide / Text-to-Video & Image-to-Video Prompting》(academy.runwayml.com) + runway.com《AI Video Prompting Guide》 | start simple 逐次加细节、只用正向语言、I2V prompt 几乎只写 motion、over-specification 反噬、自然语言>关键词、"导演 notes 而非标签"、输入图 implied motion 陷阱、last-frame 续接官方文档化、locked-off/最小运动句、模型无跨 clip 记忆 |
| 19 | vidscore.dev《AI Video Prompt Guide 2026》(对照 27+ 模型官方文档，2026-04 核) | 五段通用框架 Subject+Action+Camera+Environment+Style 全模型可用、40-120 词最优 / >500 字符丢指令、模型方言表（Kling v3 分镜列表/Veo 3.1 音频 cue 与引号对白/Runway Gen-4 控制面板/Seedance 相机与主体运动分离）、10,000+ 视频基准：87% 的 <4/10 输出经重写提示词升到 ≥7/10 |
| 20 | 可用率一手实测（国际带数据生产实录）：invideo.io《True Cost Per Usable AI Video Clip》系列 FAQ(2026-07)、poppify.ai《The Real Cost of AI Video Generation 2026》、root-nation.com 无脸频道成本分析 | ~3 生成/可用镜、~25% 过片率（164→41）、单可用镜成本=标价 3-4 倍、每 15s 生成含 4-7 个可用候选段（先挖矿再重抽）、17/41 拼接镜、资产锁定 ~5 抽/角色($9.78)、普通混合镜 3-5 抽 / 复杂镜(手/口型/行走/多主体/手物交互) 6-10 抽、Kling 3.0 1-in-4 / Veo 3.1 1-in-5、单可用镜成本 $1.2-9.33/模型分布、单可用成本攀升=prompt drift 告警 |
| 21 | ComfyUI 官方文档：docs.comfy.org《Wan2.1 Video Examples / 视频节点》+ comfy.icu Wan Video NAG | 开源本地视频链路（Wan/SkyReels）positive/negative 双 CONDITIONING、CFG 与 NAG（attention-space 引导，I2V 建议低 scale 保参考）——SD 心智在本地链路成立 |

> 版本注：Seedance 2.5(2026-07-31 发布)/可灵 3.0 Omni 等模型能力、@绑定方言与 negative 字段支持随版本演进——落地时以目标模型当期官方文档复核，规则本体（公式槽位/评估闭环/沉淀机制）不受影响。本文档与 docs/craft/ 系列同构（[经典]/[行业2026]/[AI落地] 三层标注 + 来源索引）。

## English summary

A cybernetic prompt-engineering playbook for the Jingying AI human-drama pipeline: tuning AI (writing instructions) and rigorously adjusting output (evaluate → diagnose → iterate). Core claims, all source-tagged: (1) Prompts are slot-assemblies — model formulas (Seedance six-part, Kling subject formula, Veo 3.1 cinematography-first five-part, universal 5-part cross-model benchmark) converge on order-as-weight, ~40-120 words / 80-200 Chinese chars sweet spot, mood words are void, end with global continuity rules; Seedance-class models ignore negative fields so negate positively. (2) Camera terms are executable templates (rack focus ≠ blur; 2-3 camera modifiers max per shot; Veo 3.1 adherence 90% vs Kling/Sora 60-70%), but jargon tolerance is per-model (Runway prefers plain English). (3) Consistency is reference engineering, not prose: @ImageN role-phrase binding per provider dialect, 4-ref angle-spread technique, 3+2 multi-subject rule, reference-lock + last-frame hybrid across clips. (4) Usability rate is the cost lever (C_v=S×m×p; 20%→90% = 4.5× compute); international production data calibrate the norms — ~3 generations per usable shot, ~25% pass rate, 3-5 draws for ordinary shots vs 6-10 for complex (hands/lip-sync/walking/multi-subject), so stop re-rolling past your complexity class's ceiling and diagnose instead; mine 4-7 usable segments per 15s generation before re-rolling. (5) Evaluate checklist-before-score on split dimensions with entity-visibility checks (FIRM-Video), map 1-5 to rework/promote in review.ts, classify failures by root cause and prescribe per class; A/B one variable, version templates to protect sibling shots, sink winners into the boost scorebook. Delivers: 5-question diagnosis card, ready-to-use review prompt template (XML-separated inputs per Anthropic), and a usability ledger schema whose per-usable cost trend doubles as a prompt-drift alarm. Quantitative claims follow international first-hand sources (#17-20); Chinese-community practice (#8,9) is supplementary and explicitly tagged.
