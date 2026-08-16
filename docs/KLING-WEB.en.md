# Kling Web Channel — Protocol Anatomy (archived from a real capture, 2026-08-16)

## Headline conclusion

- Endpoint: `POST https://klingai.com/api/task/submit?__NS_hxfalcon=<falcon-token>&caver=2`
- **`__NS_hxfalcon` is a one-time, seconds-valid anti-bot token**: replaying a 35-minute-old token returned `{"result":-401,"error_msg":"token value error"}`.
- The only reliable automation path = a browser-extension capture bridge (intercept in-flight requests). Copy-paste can never be fast enough.

## Captured request anatomy (sanitized)

| Part | Content |
|---|---|
| Key headers | `kww` (matches the `kwfv1` cookie value), Origin/Referer (`/app/video/new`), Time-Zone, Chrome UA + sec-ch-ua |
| Cookies | `kwssectoken` + `kwscode` + `kwfv1` + `kGateway-identity` + `userId` + device cookies |
| Body | `{"type":"m2v_img2video","arguments":[{name,value}×17: negative_prompt/duration/imageCount/kling_version(1.5)/prompt/rich_prompt/cfg(0.5)/camera_json/camera_control_enabled/prefer_multi_shots/biz(klingai)/enable_audio/audio_prompt/music_prompt/enable_asmr/source/paymentMode(1)/showPrice(2000)],"inputs":[{"inputType":"URL","url":…,"name":"input","fromUploadId":…}]}` |
| Text-to-video | Expected `type` = `m2v_txt2video` (pending capture confirmation) |

## Status

Anatomy archived ✅. Real-time token bridge 🔜. Until then this channel is `blocked: one-time-falcon-token` and the scheduler skips it.
