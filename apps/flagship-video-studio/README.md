# FLAGSHIP VIDEO STUDIO

**A local-first video production platform. From script to final MP4, with a ten-product open-source ecosystem.**

An operational FastAPI browser studio offering production management, client/booking records, task tracking, SEO briefs, asset uploads, storyboard/timeline assembly, draft voice generation, narration import, SRT subtitle handling, FFmpeg rendering, MP4 previews/downloads, exportable storyboards and SEO metadata, and integration adapters for external creative/business tools.

## Start locally (no subscription)

Requirements: Python 3.11+, `ffmpeg`, `ffprobe`, `espeak` (optional), modern browser.

```bash
python -m venv .venv
source .venv/bin/activate    # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m app
```

Then visit http://127.0.0.1:8765. Studio data goes into `./data` unless `STUDIO_DATA_DIR` is set.

### Docker Compose (for self-hosting)

```bash
cp .env.example .env
# Edit .env and set a unique long STUDIO_PASSWORD.
docker compose up --build -d
```

Open http://127.0.0.1:8765. The Docker service binds loopback only. Add a private VPN or secured reverse proxy with HTTPS before any remote access; never publicly expose raw FFmpeg processing or source media.

## What works now

1. Create landscape (16:9), portrait (9:16), or square (1:1) projects with custom colors.
2. Add title frames, closing frames, source photographs, and looping/trimmed video segments.
3. Reorder scenes, save scripts, upload audio narration, or generate a **basic draft** using local eSpeak.
4. Upload corrected SRT subtitles. Approximate draft SRT is available but **not** synchronized with speech.
5. Render an MP4 with fixed-length shots and optional narrated audio; download/export the finished film.
6. Export storyboard Markdown for AppFlowy, generic ZIP editor handoff bundles, JSON project manifests for archive, and SEO metadata for OpenSEO.
7. Send a Plane task or Chatwoot message through explicit, configured API connectors.
8. Use the operational integrations dashboard to understand what is connected or awaiting configuration.
9. Import Cap recordings and VoiceStudio audio directly. Use OpenWhispr to generate corrected SRT captions locally.
10. Use Dyad to assist development of the frontend, while OpenCut serves as a separate editorial finishing tool.
11. Manage a local production task board, client roster, consultation journal and video publishing briefs without paid services.

## Ten upstream tools and their integration mode

| Upstream | Role | Current integration |
|---|---|---|
| [OpenCut](https://github.com/OpenCut-app/OpenCut) | Advanced manual editing | Launch/handoff source assets and final MP4. New editor is being rewritten; **no unsupported automatic native-project import claim**. |
| [VoiceStudio](https://github.com/debpalash/VoiceStudio) | Narration, dubbing, consensual voice cloning | Audio WAV/MP3 upload after local generation. |
| [AppFlowy](https://github.com/AppFlowy-IO/AppFlowy) | Scripts and storyboards | Markdown export/import. |
| [Plane](https://github.com/makeplane/plane) | Production schedules and tasks | Working issue creation API with opt-in credentials. |
| [Cal.diy](https://github.com/calcom/cal.diy) | Bookings | External URL reference. Upstream README recommends personal/non-production use. Choose another licensed production booking provider for commercial deployment. |
| [Chatwoot](https://github.com/chatwoot/chatwoot) | Client communications | Working API to post an approved message to an existing conversation. |
| [OpenSEO](https://github.com/every-app/open-seo) | Video SEO | Metadata JSON export, manual review in OpenSEO. Search data providers incur charges. |
| [Cap](https://github.com/CapSoftware/Cap) | Screen recording | Upload recordings into the asset library. |
| [Dyad](https://github.com/dyad-sh/dyad) | AI-assisted user-interface development | Project customization tool, not a runtime media editor. License includes fair-source Pro modules. |
| [OpenWhispr](https://github.com/OpenWhispr/openwhispr) | Transcription/captions | Export corrected SRT from upstream and import into project. |

**External services are not installed automatically.** The product code integrates each project in the appropriate way without falsely claiming that all ten API backends are deployed. Third-party products remain governed by their own licenses and hosting obligations. All third-party components need their own setup if you want direct native app access.

For detailed handoff steps, see [Integrations](docs/INTEGRATIONS.md) and [Deployment](docs/DEPLOYMENT.md).

## API endpoints

- `GET /api/health`, `/api/stats`, `/api/projects`, `/api/assets`, `/api/jobs`, `/api/integrations`
- `GET/POST /api/tasks`, `PATCH/DELETE /api/tasks/{id}`, `GET/POST /api/clients`, `GET/POST /api/bookings`, `GET/PUT /api/seo/{project_id}`
- `POST /api/projects`, `PATCH /api/projects/{id}`, `POST /api/projects/{id}/shots`
- `POST /api/assets` multipart `file`
- `POST /api/projects/{id}/tts`, `POST /api/projects/{id}/narration/{asset_id}`
- `POST /api/projects/{id}/captions`, `GET /api/projects/{id}/captions/estimated.srt`
- `GET /api/projects/{id}/storyboard.md`, `/seo.json`, `/manifest.json`, `/bundle.zip`
- `POST /api/projects/{id}/render`; poll `GET /api/jobs/{job_id}`; download `/api/jobs/{job_id}/download`
- `POST /api/integrations/plane/issue`, `POST /api/integrations/chatwoot/message`
- `POST /api/webhooks/{plane|chatwoot|cal|openseo|appflowy}` with HMAC SHA-256 signature in `X-Studio-Signature`.

## Production architecture

```text
Browser UI ─── FastAPI ── SQLite (projects, shots, jobs, assets registry)
               │               │
               ├── Media upload └── Protected local volume
               ├── Background render queue (single worker)
               ├── FFmpeg H.264 render + SRT caption burn-in
               ├── eSpeak draft narration (optional)
               ├── Plane API / Chatwoot API / signed webhooks
               └── Hand-off exports for the other eight upstream systems
```

The single-worker, local SQLite configuration is intended for a local workstation or small-team pilot, not unbounded internet-scale usage. For hosted multi-user deployment, replace the in-process queue with an authenticated worker service, use object storage, separate accounts and access roles, isolate the renderer, and add virus scanning, rate limiting, usage quotas and observability.

## Security

- Media uploads have a maximum size and media type validation.
- External URLs are never passed to FFmpeg.
- FFmpeg commands do not use shell execution.
- Browser/API HTTP Basic credentials activate when you set `STUDIO_USERNAME` and `STUDIO_PASSWORD`.
- Docker requires credentials by default, runs as non-root, drops capabilities, and binds localhost.
- Never commit `.env`, secrets, client-owned footage, voice samples or private subtitles.
- Voice cloning must be limited to voices you own or are authorized to use.
- Confirm that you hold required content rights before external distribution.

## Automated verification

```bash
pip install -r requirements.txt pytest
pytest -q
```

Test suite covers project creation, timeline validation, full sample MP4 rendering, exported captions, integration discovery and credential enforcement.

## Priority enhancements

For a hosted commercial platform, add customer authentication, organization roles, cloud-compatible isolated render workers, durable queueing, object storage, payment plans, and approvals. For native editor integration, wait until OpenCut's published editor API supports a stable import contract.
