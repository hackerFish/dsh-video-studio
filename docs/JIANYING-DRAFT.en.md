# JianYing Draft Channel (Channel A)

Director timeline (`src/finalcut/timeline.ts`) → JianYing-importable draft folder (`draft_content.json` + `draft_meta_info.json`). Users open the draft in JianYing/CapCut for final polish on real tracks with keyframes.

## Honesty notes

- The draft format is community reverse-engineered (same lineage as cutcli / ArcReel), not officially documented by ByteDance.
- Conservative field set: canvas_config / materials(videos,audios,texts,video_tracks,audio_tracks,text_tracks) / tracks.
- Version-sensitive: pin your JianYing version; re-validate on upgrades (`validateDraft()` checks id uniqueness, reference integrity, timeline legality).
- End-to-end import test requires a JianYing client — not executed on this machine (honest pending).

## Channel matrix

- A: JianYing draft → manual polish (default for Chinese users)
- B: ffmpeg local render → unattended final video (verified end-to-end)
- C: OTIO → Premiere/Resolve/FCP interchange (planned)
