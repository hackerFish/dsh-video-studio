# 顶级摄影指导 skill · AI 仿真人剧镜头语言知识库（来源标注版）

> **定位**：把摄影指导（DP/Cinematographer）的手艺编码成可直接写进**生图 / 图生视频提示词**的镜头·光·色指令。
> **管线引用点**：storyboard（定镜位/景别/运动）→ shot assets / video（逐镜注入镜头词、光词、色词、参考图约束）。7 段管线：story→script→storyboard→master asset→shot assets→video→final cut。
> **双层结构约定**：无标记的规则 = 来自下方「来源索引」的**真实摄影/行业资料**（ASC 体系、竖屏短剧实战、官方/社区 AI 提示词公式）；行首 `▶AI落地` = 本管线把该规则翻译成提示词的可执行写法；`〔来源:n〕` = 该条规则出处。**引用规则时把整条规则+来源一起读，勿只抄落地句。**
> **一句话原则**：AI 图生视频的"摄影质量" = 可解析的镜头词（英文响应最准）+ 参考图锁定的光色基线。评分级仿真人剧观众识破点前三 = 微表情/眼神、光影假、手——用光与机位语言兜底，脸能藏就藏。
> **铁律**：同一场戏连续镜头**不跳光、不跳侧、不跳焦距**。观众感觉"假"的第一现场就是连续性穿帮。来源：专业连续性剪辑传统 180° 线规则〔2〕+ AI 漫剧实战一致性教训〔11,13〕。

---

## 0. 先立"角色摄影语言"（每部剧开工前做一次）

摄影指导在开拍前为**每个主要角色/情绪态**定一套专属镜头规则，全片照此执行，观众下意识就读懂心理〔来源: ASC Shot Craft / Filmmakers Academy·Hurlbut ASC〕。
- Hurlbut 范例：角色"掌控全局时永远居中 punch-in；精神失控时被推到画面极端边缘 + 难受的头顶留白"——一镜即心理〔3〕。爱情线：先 clean 单人镜（两人分离）→ 关系升温后上 dirty 过肩、越推越近〔3〕。
- ▶AI落地：定妆/m 档即落三条"角色摄影卡"，全剧套用——角色A卡 = `centered, stable, eye-level, static`；角色B卡 = `framed at frame edge, tight headroom, handheld`；爱情线 = 分镜表按"clean→OTS→overlap"推进并写入每镜提示词。
- ▶AI落地：每部剧在 master asset 阶段同时产出**光色基线图**（主角定妆 + 场景各一张，标注 KEY 方向/色温/调色方向），shot/video 阶段逐镜引用——这是把"全剧视觉统一"从运气变成工程。

## 1. 景别体系（Shot Sizes）

景别 = 叙事距离，也是 AI 提示词的**第一权重词**：官方与实战指南一致要求提示词以镜头类型开场〔7,8,9〕——"front-load the shot type"是跨模型最强变量〔9〕。

| 景别 | 英文（写进提示词） | 叙事功能 | 典型用途 |
|---|---|---|---|
| 大远景 | EXTREME WIDE SHOT (EWS) | 世界/战局/孤立感 | 玄幻大战、宗门全貌〔9〕 |
| 远景 | WIDE SHOT (WS) | 环境+人物，地理交代 | 入场、转场；**地理锚点靠 wide 建立**〔1〕 |
| 全景 | FULL SHOT | 全身动作 | 打斗起手、登场 |
| 中景 | MEDIUM SHOT (MS) | 对话+手势 | 对话主力（Veo/可灵默认舒适区） |
| 近景 | MEDIUM CLOSE-UP (MCU) | 胸上表情 | 情感对话升压 |
| 特写 | CLOSE-UP (CU) | 面部情绪、亲密 | 眼神戏〔9〕 |
| 大特写 | EXTREME CLOSE-UP (ECU) | 单点细节 | 瞳孔、手指、法宝〔9〕 |

▶AI落地
- 句首公式：`CLOSE-UP, <主体+动作>, <光学/光/色/运动/构图>`——景别词永不缺席〔9〕。
- 情绪推进模板：MS→MCU→CU 逐级，每级 ≥1 镜；**高情绪戏可用客观远景冷静旁观反而放大冲击**（残酷事件不贴脸拍更痛）〔1〕。
- ECU 慎拍整脸（几何易崩），只给眼/手/物〔9,14〕。
- 玄幻/仙侠 EWS/WS 大场面 = 仿真人剧安全区（注意力在世界不在脸，容错高）；评级质检的爆点情绪戏尽量紧贴安全区镜头排布〔管线经验〕。

## 2. 机位与角度（Camera Position & Angle）

角度 = 权力与心理。眼线（eyeline）是核心参照系：机位离眼线越近越亲密，越高于/低于眼线越有操纵感〔1〕。

| 角度 | 英文 | 情绪语义 | 提示词锚点 |
|---|---|---|---|
| 平拍 | EYE LEVEL | 平等/客观/日常 | 对话主体，AI 最稳〔9〕 |
| 俯拍 | HIGH ANGLE（eye line 之上） | 弱化、脆弱、被掌控 | 提升机位以削弱角色〔1〕 |
| 仰拍 | LOW ANGLE | 威压、加重一句台词的分量 | `view from below`〔1〕 |
| 过肩 | OVER-THE-SHOULDER (OTS) | 空间关系、dirty 构图 | 谈判/对峙；**dirty OTS 是巩固地理的关键镜**〔1〕 |
| 顶拍 | TOP-DOWN / BIRDS-EYE | 全知、棋盘隐喻 | 阵法/对峙格局 |
| 倾斜 | DUTCH / CANTED | 失衡、精神异常 | 中毒幻觉 |

**180° 轴线规则（跨镜不穿帮的生命线）**〔2：Wikipedia/StudioBinder/Filmmakers Academy/HowToFilmSchool〕
- 轴线 = 两角色之间/运动方向的假想线；**机位只许待在轴线一侧**。越轴后果：A/B 画面左右互换、眼线不再相对、观众空间迷失 = "jumping the line / crossing the axis"——被普遍视为技术事故〔2〕。
- 越轴只有"有控制地越"：用可见的机位运动镜、骑在轴上的中性镜、或重新建立地理的 wide shot 过渡，观众才不晕〔2〕。
- ▶AI落地：同一场戏所有镜头提示词写死屏幕侧锚点：`A always faces screen-right, B always faces screen-left` / `camera stays on the same side of the axis`；正反打成对生成并逐对核对侧向。任何一场戏要用越轴制造眩晕，必须插入 `neutral shot on the axis` 或重建 wide。
- ▶AI落地：动作戏方向一致性同理——角色跑向 screen-right 后，后续镜不许反向跑〔2〕；分镜表用箭头统一标注运动方向。

## 3. 镜头运动（Camera Movement）

规则源：心理与身体化研究 + 一线 DP 经验〔3,4〕；跨模型关键词实测〔8〕；官方公式〔7〕。

**每个动作词的功能**
| 运动 | 英文 | 情绪/功能 | 可靠度与写法〔8〕 |
|---|---|---|---|
| 推 | PUSH-IN | 聚焦/加压/亲密 | 需要速度+落点："slow dolly in from medium shot to close-up"；裸写 "dolly in" 是掷硬币〔8〕 |
| 拉 | PULL-BACK | 揭示/抽离 | 结尾落 wide 揭示地理 |
| 摇 | PAN / TILT | 扫视/揭示 | **全模型最可靠的运动词**；crane 与 tilt 语义不同（crane=整机升降带透视变化，tilt 只抬头）〔8〕 |
| 环绕 | ORBIT / ARC | 审视/展品感 | "camera slowly orbits clockwise around the subject" 是最好用的复杂运动〔8〕 |
| 手持 | HANDHELD | 混乱/纪实/生命力 | Carpenter 称之为 "moving chaos"，用于闪回活力段〔3,4〕 |
| 斯坦尼康 | STEADICAM | 平滑长跟、贴近真人眼动 | 近似人眼稳定导航的自然感〔4〕 |
| 静态 | STATIC / LOCKED-OFF | 孤独、冷眼旁观 | **常被漏掉的关键词**；锁定镜头拍孤独是强手段〔3,9〕 |

▶AI落地
- **每镜一种主运动**——Veo/跨模型共识：一镜叠 dolly+pan+tilt 必出不稳定运动〔7,9〕；Runway 官方建议"先只写最必要运动，逐步加"〔7〕。
- 运动词给**速度+起点落点**：`slow dolly in from medium shot to CU, ending on her eyes`〔8,10〕；语序套 Atlabs 公式：[运动]+[速度]+[主体与取景]+[环境]+[镜头/质感]〔10〕。
- 静态镜也要写明 `static locked-off shot`；把运动绑定到动作节点："hold on him until he lunges, no cutting"〔9,11〕。
- 30s 长镜头调度（Seedance 2.5，管线能力）：用**时序词串运动序列**——中文创作圈已验证的两种写法：分段时间轴 `0-3秒画面：…3-8秒画面：…`〔12〕；或顺序连词 first…then…next…finally（Hunyuan 官方多动作惯例，适用于单镜内小叙事弧）〔7〕。示例：`single continuous take: she walks through the hall → tilt up to the mural → slow push-in on her face as she stops`。
- 大动作镜头机位优先静止/缓移：三动叠加（机位+主体+特效）必糊。AI 漫剧复刻实战教训：作者把一镜连续动态拆成两段生成反而不连贯——**能连则连，别拆**〔13〕。

## 4. 光学与焦点（Lens & Focus）

| 焦距 | 特征与用法 | 提示词 |
|---|---|---|
| 24-35mm 广角 | 空间大、近脸有畸变 | 环境带人、手持沉浸（Hurlbut：闪回/欢快戏用 wider lens 拉近距离感〔3〕） |
| 50mm | 标准透视、写实 | 对话主力 |
| 85mm+ 长焦 | 压缩、人像质感 | CU 表情戏（长焦=拉远观众距离，广角=浸入〔3,7〕） |

▶AI落地
- 光学参数（focal length/anamorphic/shallow DOF/spherical vs anamorphic）属"给剧组的话术"，直接进提示词〔9,11〕：`85mm, shallow depth of field, creamy bokeh`；`anamorphic lens, subtle flare, 2.39:1 feel`。
- **全剧焦距统一档位**（50-85mm 为主），跨镜换焦=脸型/透视突变〔管线连续性规则〕。
- 焦距演进是情绪叙事：爱情升温期从长焦（远）渐进到广角（浸入）〔3〕——爱情线分镜按此排。
- 焦点转换：`rack focus from her face to the sword`；前景虚化 `out-of-focus foreground branches` 同时补层次。

## 5. 布光（Lighting）

**光型来源：PPA/John Gress 人像九光型 + StudioBinder 布光指南〔5〕——经典光位照抄即高级。**

| 光型 | 位置定义〔5〕 | AI 提示词 | 用途 |
|---|---|---|---|
| 蝴蝶光 | 光源在机位正上方略前（表盘 6 点） | `butterfly lighting` | 偶像/仙尊柔美；光太高会罩住眼睛，需保持眼内有光〔5〕 |
| 伦勃朗 | 光源约 4/8 点高位，鼻影延伸接颧影，暗侧眼下出倒三角亮块 | `Rembrandt lighting` | 权谋/内心戏；仿真人剧质感王炸〔5〕 |
| 分割光 | 光源 9/3 点正侧 | `split lighting` | 强烈戏剧感〔5〕 |
| 环形光 | 光源略高于眼线约 5/7 点 | `loop lighting` | 通用美观默认〔5〕 |
| 三点布光 | KEY+FILL+RIM | `three-point lighting, soft key from left, rim light` | 对话戏默认；RIM 是 AI 人景分离救星 |

▶AI落地
- **每镜必给光**；给"源"别给形容词——`warm yellow lamp light from screen left` 优于 "warm lighting"〔11〕。最低配 = 方向+光质两词：`soft key light from upper left`。
- 人像默认 soft；硬光只硬场景不硬脸（AI 硬光直射脸易过曝塑料）。硬派需求写 chiaroscuro/split，脸留 45° 斜上主光。
- 剪影/逆光 = AI 藏拙位：`backlit silhouette` 把脸藏进影里，规避微表情/结构崩坏〔AI 一致性实践〕。
- 色温全剧锚定一场戏一个主基调（暖/冷），Ambient 氛围词单列〔7〕。

**氛围光速查（Ambient light——官方公式里的氛围槽，情绪直接到货）**
| 场景 | 提示词 |
|---|---|
| 烛光 | `warm candlelight flickering on her face, low-key amber glow` |
| 霓虹/夜街 | `neon lighting, cyan and magenta glow on wet street` |
| 月光夜戏 | `cool moonlight through a high window, pale blue tones` |
| 火场/炼器 | `dynamic orange firelight, deep flickering shadows` |
| 法阵/灵气 | `soft ethereal glow emanating from the formation` |
| 仙侠雾境 | `misty dawn light, volumetric god rays through clouds` |
| 夜戏保底 | `low-key lighting, gentle night ambience`（配一盏软辅光防"全黑无脸"） |

**硬软光与影向提示词一对**：`hard direct sunlight, sharp shadows` vs `diffused soft light, gentle shadows`；同场戏影向词写死（`shadows fall to the right`），是防"跳光"的第一道闸〔AI 质检常见返工项〕。

## 6. 色彩（Color）

规则源：Noam Kroll《调色心理学》〔6〕——**色温是对观众情绪最直接、最即时的变量**；同图暖/冷各调一次情绪完全不同。
- 暖 = 邀约、柔和、舒适（爱情喜剧倾向暖）；冷 = 临床、生硬、疏离（惊悚动作倾向冷）〔6〕。
- 极端色温有时代语义：暖+褪色/sepia=旧时光，冷青紫=未来/科幻〔6〕。**克制优于堆砌**：色温方向微推即可达情绪，过重显廉价〔6〕。
- 暖可用来"误导"：假的安全感被反转（暖色下的阴谋）〔6〕——反转剧可用。
- Teal-orange 是可用的对立色（冷青背景 vs 暖橙肤色，肤色突出）〔社区共识；实现上常用灯/胶片+调色〕。

▶AI落地
- 光色段固定语序：`[光位] + warm/cool tones + [grade 词]`，如 `soft key from left, warm amber tones, teal-and-orange grade`。
- 情绪-色彩映射（抄用）：压抑=冷低饱和 `cold desaturated blue-grey`；亲密=暖 `warm intimate amber`；仙侠=青白雾 `ethereal cyan-white, misty`；玄幻史诗=金红高饱和；虐心回忆=褪色 `faded nostalgic grade`；魔化危机=血红或青橙。
- **固有色锚**：角色服装/法宝/发色不可跨镜漂移（可变的是环境与光），否则"衣服变色=大穿帮"〔seektik 一致性清单：服装、发型、画风逐项检查〕。

## 7. 构图（Composition）

| 手法 | 英文 | 提示词 | 用途 |
|---|---|---|---|
| 三分法 | RULE OF THIRDS | `subject on the right third` | 通用对话（AI 默认居中需显式覆盖〔9〕） |
| 中心对称 | CENTERED SYMMETRY | `centered symmetrical` | 威压/仪式（Hurlbut：掌控角色=居中〔3〕） |
| 引导线 | LEADING LINES | `leading lines toward her` | 纵深 |
| 框架构图 | FRAMING | `framed by a doorway/arch` | **frame-in-frame=被困/孤独的心理利器**〔3〕 |
| 负空间 | NEGATIVE SPACE | `vast negative space above` | 苍凉（Hurlbut：不舒适留白=失序心理〔3〕） |

**AI 语境最易错的三个点**（必须显式给词）
1. **头顶留白 headroom**：不给词 AI 易切额/顶框。`comfortable headroom` 正常；故意压迫感/失控态写 `tight framing, awkward headroom`〔3〕。
2. **视线空间 nose room**：`facing screen right with space in that direction`；脸撞框边观众难受。
3. **位置**：默认"正中大脸"无商业感，位置词（third/centered/upper-middle）显式覆盖——**AI 默认 center-framing 是所有竖屏/横屏构图的头号敌人**〔9〕。

▶AI落地：构图 = 1 位置锚 + 1 手法，两个构图词打架必翻车（centered+rule of thirds 不同现）。

## 8. 竖屏特化（Vertical 9:16——仿真人剧主战场）

来源：竖屏短剧导演指南与 9:16 分镜设计〔9: zipx / dev.to / minionarts〕。核心反直觉结论：**竖屏构图比横屏需要更多纵深，而不是更少**；9:16 不是裁切，是另一种视觉语言。

- **三段带思维**：画面分上/中/下三条带；视线在竖屏里应做**纵向移动**（向上看→向下看），左右跳切在窄框里显得混乱〔9〕。
- **人脸安全位**：脸住上中带——眼睛放画面顶部下 35-45% 处；底部 15% 不安排情节关键物（被字幕/按钮压）〔minionarts〕；对话戏把说话者眼睛放上中带（距顶约 30%）〔zipx〕。
- **纵深堆叠替代并排**：9:16 太窄放不下横屏式左右双人 → 前后景纵向堆叠（前景角色占下半、后景角色在上半），OTS/镜子/门框构图是高分竖屏的主导模式〔9〕。
- **竖屏主光改 45° 斜上"光刮"**：横屏侧光在竖屏会把脸从下巴到胸埋进"竖向阴影隧道"；key 放眼线以上 45°、相机轴 45°，fill 放 key 对侧 90° 且只给 ~20% 强度〔zipx〕。
- **钩子帧（hook frame）是设计物**：观众约 3 秒内决定是否滑走；每集第一帧=全剧最贵的一帧——人脸峰值情绪/事件进行中、落在安全带、缩到 150px 缩略图仍可读；分镜阶段每集出 5 个候选钩子帧挑 1〔minionarts〕。

▶AI落地（提示词必须显式覆盖模型居中默认〔9〕）
- 竖屏提示词头部固定句：`vertical 9:16 composition, subject in the upper-middle band, layered depth, negative space above`。
- 对话纵深两景：`foreground character occupying the lower half, second character behind above`；连络元素（手/衣摆跨带连接）替代横屏 OTS 的左右关系〔9〕。
- 大场面用"高"代替"宽"：`towering scale, sky-scraping elements filling vertical frame`。
- 首帧（钩子）生成后用缩略图自检：150px 宽下脸仍可读、情绪可辨才放行〔9〕。

## 9. AI 特有：参考图、一致性、错误清单（本 skill 实战核心）

**参考图 = 身份与光色基线；提示词 = 状态。参考图权重 > 提示词。**
- 分层认领：主像参考锁脸/服装/发色（提示词只写 `same character as reference, face identical`，勿重述长相）；场景参考锁环境与光方向（`match the lighting of the reference image`）；没有参考图的一层才由提示词描述。
- Seedance 2.0/2.5 是**单条自由文本、无独立 negative 字段**：所有控制必须按序写进正文（subject→action→scene→camera→lighting→style）〔7〕；分镜用**素材槽+时间轴**格式：图1=角色参考、图2=场景参考，正文 `0-3秒画面：…`〔12〕。
- 可灵 3.0 能力增量（国产模型，比多数教材新）：单次多镜编排（≤6 镜/≤15s）、原生音频+对白口型同步、参考可来自文本/图/视频；官方公式 = 主体+运动+场景+镜头语言+光影氛围+声音；**以镜头动作开场、把提示词当微型剧本而非关键词堆叠**〔7〕。
- 跨模型彩蛋：提 Deakins 等署名 DP 风格词，各模型都响应——因训练数据里都是同一批带字幕的影片剧照；可当作风格快捷方式〔7〕。

**一致性约束模板（同场戏逐镜粘贴）**
- `lighting direction and color temperature identical to previous shot`
- `camera stays on same side; character screen-position unchanged`
- `costume, hair and props unchanged from reference`

**AI 漫剧实战返工教训（TapNow/AI漫剧开源工作流复刻实录〔13〕）**
1. 分镜九宫格生成前，**主要元素（人物/场景/道具）必须先出图并作为参考绑定**——漏一张佛像参考，后期整组返工。
2. 九宫格放大后逐细节核对（辫子方向、领口纹理、配饰），细节错了图生视频必连环返工。
3. 人设图+角色中景图**双参考**挂到分镜生成节点，一致性远好于单参考。
4. 一致性方案：先"角色设定卡"锁定（脸/发型/服装/画风），再允许场景情绪变化——**固定不变与允许变化分离**是中文 AI 漫剧社区共识〔11〕。
5. 按镜生成、单镜重拍，不做整集一次性生成（失败全废）〔AI 短剧平台实践〕。

**常见 AI 摄影错误清单（质检/返工触发词）**
| 错误 | 对策（提示词层） |
|---|---|
| 跳光（同场戏冷暖/影向翻转） | 光锚词逐镜粘贴；写 `shadows fall to the right` |
| 越轴/屏幕侧漂移 | 写死侧向词 + 正反打成对核对（§2） |
| 手指/五官崩 | 降 MS 或剪影；negative 替代法：把 "no bad hands" 换成正向 `detailed natural hands`〔9：negative 无正向替代会失效〕 |
| 人群几何崩 | 别写 crowd，写 `three people`〔9〕 |
| 塑料脸 | `natural skin texture, subtle film grain, subsurface scattering`〔7〕 |
| 乱码文本 | 画面内文字后制，不靠生成（生成失败率高） |
| 场景跳变/物件移位 | 场景参考图 + `environment identical to reference` |
| 静态 PPT 感 | 加小元素动作锚：`hair moving in breeze, robe swaying, dust drifting` |
| 过动糊帧 | 每镜一种主运动（§3）；能连成单镜长拍就别拆〔13〕 |

**微表情/眼神专项（评级高分胜负手）**
- 仿真人剧观众识破排序：微表情 > 眼神光 > 光影假 > 手〔管线调研〕。看眼——"眼睛是灵魂之窗"，机位贴近眼线才有连接感〔1〕。
- ▶AI落地：CU 给 `catchlight in the eyes, subtle eye movement`；情绪给**肌肉级动词**：`the corner of her mouth twitching` > "she feels sad"；说话镜写 `lips moving in sync`（可灵 3.0 口型同步已知可用〔7〕）。

**逐镜质检五问（storyboard→video 放行闸，每镜过五关才进下一段）**
1. 侧向对吗？本场所有镜的 A/B 左右与朝向一致（180° 线，§2）——不对 = 越轴，最高频事故。
2. 光跳了吗？KEY 方向、影向、冷暖与本场首镜一致（§5）——比对两镜缩略图，别只看文字。
3. 脸还是那张脸吗？服装/发色/画风零漂移〔11,13〕——九宫格/成片放大逐细节核对，辫子领口纹理都要查〔13〕。
4. 景别运动符合分镜意图吗？景别词前置、每镜 ≤1 种运动（§1/§3）。
5. 缩略图还成立吗？竖屏首帧 150px 可读、情绪可辨、钩子成立〔9〕。

**一次成片仍崩时的三张降级牌（按损失从小到大排）**
- 崩在脸 → 换剪影/逆光/远景/侧背，脸藏起来，叙事不损〔AI 藏拙位规则〕。
- 崩在连续 → 拆镜重拍单镜（勿整集重来）〔13〕；同批重 roll 换 seed 而非改提示词堆词。
- 崩在风格 → 回到角色摄影卡/光色基线图重挂参考，提示词只保留镜头+动作层。

## 10. 摄影指令速查表（用途 → 模板句，直接复制）

> 组装顺序〔7,11〕：`[景别/角度] + [主体动作] + [光学] + [光(源+方向+质)] + [色] + [运动(速度+落点)] + [构图锚] + [一致性锁]`。英文镜头词 + 中文情绪短句。

| 用途 | 模板句 |
|---|---|
| 日常对话（通用） | `MEDIUM SHOT, eye level, 50mm, soft key light from left, warm tones, static, subject on left third facing screen-right with headroom` |
| 情感对峙 | `MEDIUM CLOSE-UP, 85mm, shallow DOF, soft key + rim light, muted cool grade, slow push-in from MS ending on her eyes` |
| 仙尊登场 | `LOW ANGLE FULL SHOT, centered symmetrical, hard backlight halo, epic cool-white grade, slow crane up, robe flowing` |
| 玄幻大战 | `EXTREME WIDE SHOT, anamorphic, golden epic grade, drifting dust, slight handheld, fighters on both thirds, energy clash centered` |
| 虐心离别 | `WIDE SHOT, backlit silhouette at dusk, warm fading light, vast negative space, static, tiny figure alone` |
| 悬疑/危机 | `DUTCH ANGLE CLOSE-UP, split lighting, cold desaturated grade, subtle handheld, tight crop with awkward headroom` |
| 心动/暧昧 | `CLOSE-UP, 85mm, butterfly lighting, warm amber bokeh, shallow DOF, very slow dolly in` |
| 权谋对弈 | `OVER-THE-SHOULDER MS, 50mm, three-point lighting, teal-and-orange grade, static, chessboard leading lines` |
| 坠入回忆 | `TOP-DOWN / HIGH ANGLE, soft hazy glow, faded nostalgic grade, slow pull-back` |
| 法器炼成 | `MEDIUM SHOT, ethereal cyan glow on face, dark low-key room, floating embers, slow 180-degree orbit` |
| 30s 长镜（Seedance 2.5） | `0-3s: steadycam follows her through the hall. 3-10s: tilt up to the mural. 10-18s: slow dolly in on her face…one continuous take, no cuts` |
| 竖屏首帧钩子 | `vertical 9:16, her face in upper-middle band at peak emotion, bottom fifth empty, readable as thumbnail, layered depth` |
| 打斗双人 | `FULL SHOT, two fighters one on each third, 50mm, hard daylight, slight handheld, energy clash centered, tracking the lead punch` |
| 夜景告白 | `MCU, 85mm shallow DOF, warm candlelight + soft blue night ambience, slow push-in, upper-middle band 9:16` |
| 一致性兜底 | `match reference image lighting and face; camera stays same side; costume unchanged; consistent grade` |

## 附：分镜 → 提示词的"摄影字段卡"（storyboard 落地模板）

storyboard 阶段每镜填 8 个字段，video 阶段拼装成提示词（字段即 §0 角色摄影卡 + §10 语序）：
1. **景别**（必填，句首）2. **机位/角度+侧向**（轴侧写死）3. **焦距/景深** 4. **光**（源+方向+质+氛围）5. **色**（冷暖+grade）6. **运动**（≤1 种，带速度落点；长镜写时间轴）7. **构图锚** 8. **一致性锁**（同场戏 3 句粘贴）

实例（一镜字段 → 生成提示词）：
| 字段 | 值 |
|---|---|
| 景别 | MEDIUM CLOSE-UP |
| 机位 | eye level, from B's side (axis left), A faces screen-right |
| 光学 | 85mm, shallow depth of field |
| 光 | soft key from upper left, warm rim light |
| 色 | warm amber, teal-and-orange grade |
| 运动 | slow dolly in ending on her eyes |
| 构图 | A on right third, comfortable headroom |
| 一致性 | lighting and face identical to previous shot; costume unchanged |

拼装：`MEDIUM CLOSE-UP, eye level from B's side, A facing screen-right, 85mm shallow DOF, soft key from upper left + warm rim, warm amber teal-and-orange grade, slow dolly in ending on her eyes, A on right third with headroom — lighting and face identical to previous shot, costume unchanged`。

---

## 来源索引（Sources）

| # | 来源 | 内容供给 |
|---|---|---|
| 1 | ASC Shot Craft《Where Do You Put the Camera?》theasc.com（Jay Holben, ASC 技术编辑） | 机位即视觉语言、eyeline/180° 线、主客观视角、仰拍加权重、frame-in-frame、dirty OTS 定地理 |
| 2 | 180° 线：Wikipedia / StudioBinder / Filmmakers Academy（Shane Hurlbut, ASC）/ HowToFilmSchool | 轴线定义、越轴后果、受控越轴三种过渡、运动方向一致性 |
| 3 | Filmmakers Academy《Camera Techniques for Emotional Storytelling / Camera Emotion》（Hurlbut, ASC） | 每角色一套镜头规则、居中=掌控/边缘+怪留白=失控、孤独=锁定远镜、爱情线 clean→dirty OTS、闪回=手持+暖雾 |
| 4 | Frontiers in Neuroscience (2023)《An embodiment of the cinematographer》 | dolly/steadicam/handheld 差异与身体化体验（Storaro/Carpenter/Brown 引语） |
| 5 | PPA《9 Types of Portrait Lighting》John Gress + StudioBinder 布光指南 | 蝴蝶/伦勃朗/分割/环形光位定义、布光表盘法 |
| 6 | Noam Kroll《The Psychology of Color Grading》 | 色温=最直接情绪变量、冷暖语义、极端色温=时代/科幻、克制原则、暖色误导 |
| 7 | 官方与社区提示词公式：可灵官方教程/可灵 3.0 指南、阿里云 Model Studio、Seedance 2.0 开源 Storyboard Generator（liangdabiao）、ai-video-skill style-library（0xadvait）、Veo/Vertex 指南、Hunyuan 惯例 | 公式=主体+运动+场景+镜头语言+光影氛围(+声音)、单自由文本无负字段、素材槽+时间轴、每镜一运动、分块结构、时序连词、DP 风格词跨模型有效 |
| 8 | Cineprompt.io《Camera movement keywords that actually work》（跨 Runway/Kling/Veo/Sora/Seedance 实测） | pan 最可靠、dolly 需速度+距离词、crane vs tilt、orbit 可靠写法 |
| 9 | 竖屏短剧指南：zipx.ai《Vertical Video Composition for Drama 2026》×2 / dev.to / minionarts《9:16 Safe Zones & Hook Frame》；Veo 3.1 Lite Prompt Guide | 三段带、纵向视线舞、眼睛 35-45%/30%、底部 15% 禁区、纵深堆叠、45° 光刮、fill 20%、钩子帧 3 秒/150px、AI 默认居中需覆盖、shot type 前置、人群数、正向替代负向 |
| 10 | Atlabs《100 Cinematic Camera Prompts》 | [运动]+[速度]+[主体取景]+[环境]+[镜头/质感] 公式、"cinematic" 一词无效 |
| 11 | invideo.io《Camera Vocabulary for Better AI Video Prompts》 | 给剧组的词汇、点光源不点形容词、static hold/绑定动作的 hold、9 元素固定顺序、光比量化 |
| 12 | Seedance 2.0 Storyboard Generator 开源项目（github liangdabiao，中文 AI 漫剧社区 linux.do） | 素材清单+角色/场景参考槽、时间轴式 `0-3秒画面`、@ 延长续写、逐镜生成 |
| 13 | AI 漫剧/短剧实战实录：TapNow 开源工作流复刻（阿真 Irene/优设、卡尔的 AI 沃茨）、seektik《AI 角色一致性》、AI 短剧平台实践（掘金） | 参考图漏绑返工、九宫格逐细节核对、双参考挂分镜、设定卡"定变分离"、按镜重拍、能连不拆 |
| 14 | AI 绘图提示词专家 Skill（六维构建法，短剧社区） | 首词权重前 20%、负面词库（extra limbs/distorted faces 等） |

> 注：Seedance 2.5 音画一体/30s 长镜、可灵 3.0 多镜编排/口型同步为各模型厂商公开能力，随版本演进——落地时以目标模型当期文档复核，规则本体不受影响。

## English summary

A cinematography knowledge base for AI human-drama production, dual-layered: sourced film rules vs AI-prompt application. Every shot prompt = [shot type first] + [subject/action] + [lens/DOF] + [light source+direction+quality] + [color tone+grade] + [one camera move with speed and landing point] + [composition anchor] + [consistency lock]. Key sourced rules: front-load shot type (Veo guide), one move per clip, name the light source not the adjective, static holds are keywords too, 180° axis with prompt-level screen-side locks, Rembrandt/butterfly/split patterns (PPA), vertical 9:16 is a different language — depth stacking, eyes at 35–45% from top, bottom 15% is dead zone, 45° key to avoid the vertical shadow tunnel, hook frame readable at 150px (zipx/minionarts); color temperature is the strongest emotional lever (Noam Kroll); Seedance-class models take one free-form prompt with no negative field, so sequence everything in prose (time-stamped 0-3s blocks for 30s takes). Never change light side, color temp, focal length or screen side within a scene — continuity breaks are what make AI faces feel fake. When in doubt, hide the face: silhouette, backlight, wide shot, framed distance.
