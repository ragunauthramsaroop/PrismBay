# PrismBay Flagship Video Studio

Review-only prototype combining three open-source tools through interoperable exports.

- [HyperFrames](https://github.com/heygen-com/hyperframes), Apache-2.0: editable six-clip HTML composition in `hyperframes/index.html`.
- [VoiceStudio](https://github.com/debpalash/VoiceStudio), AGPL-3.0: consented narration exported to local WAV, MP3 or M4A.
- [ArtCraft](https://github.com/storytold/artcraft), MIT/Apache-2.0: original or licensed scene PNG exports.

The native desktop tools and their model runtimes are not embedded. Their assets are optional. Integration status and licensing must be checked before commercial distribution.

## Render the 30-second baseline

Install Python 3.12+, Pillow, FFmpeg, FFprobe and DejaVu Sans fonts.

```bash
python video-studio/flagship-v1/render.py
python video-studio/flagship-v1/verify.py build/flagship-video/prismbay-30-second-demo.mp4
```

Optional approved exports:

```bash
python video-studio/flagship-v1/render.py --voice /path/to/voicestudio-export.wav --art-dir /path/to/artcraft-scenes
```

ArtCraft files must be named `scene-01.png` through `scene-06.png`. Missing scene files use original in-code graphics. VoiceStudio imports are mixed over an original soundtrack.

## HyperFrames editing

```bash
cd video-studio/flagship-v1/hyperframes
npx --yes hyperframes check --json
npx --yes hyperframes preview
npx --yes hyperframes render
```

Requires Node.js 22+, FFmpeg, and access to npm. The local baseline renderer is independently runnable. The HyperFrames source is a separate preview and rendering route until its CLI checks succeed.

## Safety and review

GitHub Actions renders only an unpublished MP4 and QA JSON. No posting, accounts, external messages, checkout activity or paid API calls. All publication gates remain blocked. No third-party creative assets, voice identities, credentials or private files should be committed. Validate license and consent for every export. Human creative review is required.
