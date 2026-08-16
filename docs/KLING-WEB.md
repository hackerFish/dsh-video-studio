# 可灵网页通道协议解剖（2026-08-16 真实抓包存档）

## 结论先行

- 端点：`POST https://klingai.com/api/task/submit?__NS_hxfalcon=<风控令牌>&caver=2`
- **`__NS_hxfalcon` 是火山 falcon 风控的一次性令牌（秒级有效）**：回放 35 分钟前的令牌返回 `{"result":-401,"error_msg":"token value error"}`。
- 自动化唯一可靠路径 = **浏览器扩展实时抓包桥**（拦截刚发出的请求并转发），复制粘贴不可行。

## 请求解剖（真实抓包，脱敏后）

| 部分 | 内容 |
|---|---|
| 端点 | `/api/task/submit?__NS_hxfalcon=…&caver=2` |
| 关键头 | `kww: <与 kwfv1 Cookie 同值的长 token>`、`Origin/Referer(app/video/new)`、`Time-Zone`、Chrome 151 UA + sec-ch-ua |
| Cookie | `kwssectoken` + `kwscode` + `kwfv1` + `kGateway-identity` + `userId` + 设备 Cookie 全家桶 |
| 请求体 | `{"type":"m2v_img2video","arguments":[{name,value}×17: negative_prompt/duration/imageCount/kling_version(1.5)/prompt/rich_prompt/cfg(0.5)/camera_json/camera_control_enabled/prefer_multi_shots/biz(klingai)/enable_audio/audio_prompt/music_prompt/enable_asmr/source/paymentMode(1)/showPrice(2000)],"inputs":[{"inputType":"URL","url":…,"name":"input","fromUploadId":…}]}` |
| 文生视频 | 预计 `type` 为 `m2v_txt2video`（待抓包确认），其余 arguments 相同 |

## 状态

- 协议形状已存档 ✅；实时令牌桥 🔜 待建（浏览器扩展 + 本地桥服务器）；
- 在桥建成前，可灵网页通道标记为 `blocked: one-time-falcon-token`，调度器自动跳过。
