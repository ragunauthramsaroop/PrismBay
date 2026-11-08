# Integration guide: ten upstream projects

The studio implements direct API integrations only where current stable interfaces are known. The other products connect using safe file interchange or application links. No external API, source repository or license is silently assumed to be a running service.

## 1. OpenCut: edit and finish

Repository: https://github.com/OpenCut-app/OpenCut

OpenCut's rewrite is still in progress. The classic editor at https://opencut.app is the pragmatic near-term path. From a studio project, download **Editor handoff ZIP**. Extract `media/` and `delivery/latest-master.mp4`, and import the media into the editor manually. The studio manifest is proprietary to this project, not the native OpenCut format. Automated editor control should be added only after its documented Editor API is shipped and stable.

## 2. VoiceStudio: narration and dubbing

Repository: https://github.com/debpalash/VoiceStudio

Install locally, create approved voice tracks and export WAV or MP3. In the studio use **Media library > Upload media**, then **Production > Voice & soundtrack > Apply narration**. The studio can produce basic computer-voice drafts with local eSpeak; those are not equivalent to professional neural voices. Clone only voices with explicit consent.

## 3. AppFlowy: scripts and storyboards

Repository: https://github.com/AppFlowy-IO/AppFlowy

From the studio production editor, select **Export storyboard**. Import the Markdown text into AppFlowy. Keep AppFlowy as the collaborative research and reference library if desired. AppFlowy is AGPL-licensed, so review obligations before modifying/deploying a derived server.

## 4. Plane: production schedule and task tracking

Repository: https://github.com/makeplane/plane

Built-in task tracking works without external accounts. To create optional Plane issues, set:

```env
PLANE_API_KEY=your-api-token
PLANE_WORKSPACE_SLUG=your-workspace-slug
PLANE_BASE_URL=https://api.plane.so
```

Open **Production > Create Plane task**. Paste the Plane project's ID and a reviewed issue title. The studio makes a direct authorized request to the documented `POST /api/v1/workspaces/{slug}/projects/{project_id}/issues/` endpoint. API configuration and permissions depend on your own installation.

## 5. Cal.diy: consultations

Repository: https://github.com/calcom/cal.diy

Set `CAL_BOOKING_URL` to your self-hosted calendar booking page. Use **Clients & bookings** to maintain a client roster and record confirmed consultations with a timestamp and booking URL. The Cal.diy upstream explicitly recommends personal, non-production use. Do not treat this codebase as a commercially supported booking service without a separate due-diligence review. The integrated consultation record system works independently.

## 6. Chatwoot: client communications

Repository: https://github.com/chatwoot/chatwoot

Set:

```env
CHATWOOT_BASE_URL=https://your-chatwoot.example
CHATWOOT_API_TOKEN=your-token
CHATWOOT_ACCOUNT_ID=your-account-number
```

Open **Production > Send Chatwoot update** and enter an existing conversation ID and a reviewed message. The studio calls `POST /api/v1/accounts/{id}/conversations/{conversation_id}/messages`. This is an external action and will send a client-visible message.

## 7. OpenSEO: video-page optimization

Repository: https://github.com/every-app/open-seo

Open **Distribution & SEO** and record validated keyword research, target audience, title, description, and notes. Download the SEO metadata JSON from the project. Use OpenSEO for keyword analysis with a compatible provider. The upstream notes its data API is pay-as-you-go, so do not assume this service is zero-cost. No background paid requests occur in the studio.

## 8. Cap: screen capture

Repository: https://github.com/CapSoftware/Cap

Record a tutorial/screencast in Cap. Export the local MP4 and upload to the studio Media library, then add a **video** shot to your timeline. The studio loops/trims the source video to the shot duration and exports at the project aspect ratio.

## 9. Dyad: interface building

Repository: https://github.com/dyad-sh/dyad

Dyad is a local app-development helper, not a video-rendering backend. Use the studio's browser files (`web/`) as a starting point for Dyad-assisted UI changes. Review Dyad's licenses, including fair-source Pro modules, before distributing derived code.

## 10. OpenWhispr: transcription and subtitles

Repository: https://github.com/OpenWhispr/openwhispr

Run OpenWhispr locally. Generate subtitles and review punctuation and timings. Paste corrected standard SRT into **Production > Subtitle workflow**, then save. Video render will burn captions into the picture. If OpenWhispr provides text without SRT timestamps, use the studio's estimated SRT export as a draft and correct timing manually. The estimated draft is not speech-aligned.

## Connection status semantics

- **Ready**: the integration handoff is operational locally, but the upstream product may not be installed.
- **Needs configuration**: an API token or booking URL has not been provided.
- **Connected**: the expected environment variable exists. Actual remote permissions and service health still require a live request.

## Webhooks

The endpoint `/api/webhooks/{service}` accepts signed JSON from trusted connectors. Set `STUDIO_WEBHOOK_SECRET` and put the lowercase SHA-256 HMAC hex digest of the raw request body into `X-Studio-Signature`. No webhook executes user-supplied shell commands, automatically publishes videos, or sends unaudited client messages.
