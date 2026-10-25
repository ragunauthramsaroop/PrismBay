# GitHub-only TikTok automated publisher

## Operating model

PrismBay's publishing path is **GitHub Actions → exact approved original MP4 → PrismBay GitHub Pages → authenticated Zernio → TikTok @prismbayclean**. No personal laptop, unofficial browser bot, account scraping, paid ad campaign, or automatic publication of unapproved creative.

**Scheduled cadence:** A daily **read-only** queue, identity and safety audit runs at 9:45 a.m. Guyana time (13:45 UTC). Approved publication remains Monday, Wednesday and Friday at 10:13 a.m. Guyana time (14:13 UTC), maximum **one distinct approved video per run**. The daily audit does not publish or authorize new creatives. GitHub scheduling is best-effort and may be delayed. Runs are serialized by GitHub Actions concurrency.

**Current status (October 25, 2026):** Owner-approved exact original digital-tool videos are enabled for @prismbayclean in `config/tiktok-approved-autopost.json`; the earlier creative-reset lock has been released for this approved queue. The first stakeholder-toolkit video received a Zernio provider response of `published` in [Actions run #40208721003](https://github.com/ragunauthramsaroop/PrismBay/actions/runs/40208721003), but the provider had not returned a verified public TikTok video URL as of the [read-only reconciliation run #40209222959](https://github.com/ragunauthramsaroop/PrismBay/actions/runs/40209222959). Its ledger status is `submitted_unverified`, and it must not be reposted. The ESG and free-pricing-calculator creatives remain individually approved and unsubmitted. Future creatives require their own exact media and caption authorization. The three approved clips demonstrate digital business tools, not physical cleaning products; never imply otherwise.

## Evidence

- Video review and SHA256 fingerprints: https://github.com/ragunauthramsaroop/PrismBay/actions/runs/40159396599
- Prior publishing review: https://github.com/ragunauthramsaroop/PrismBay/issues/457
- Zernio's account connection was verified by a read-only GitHub Actions check in the video-production run. Connection alone does not prove public-posting rights, current creator permissions or video approval.
- Follow `PrismBay TikTok Approved Autoposter` in GitHub Actions for the next production, blocked or provider-accepted result.

## One-time approval process: GitHub PR only

1. Open the video-production Actions run, download `prismbay-authentic-tiktok-review-40159396599`, and watch each original MP4 end to end. These are genuine PrismBay screen-capture demos of digital business tools, not physical household product demonstrations. Validate on-screen media rights, captions, exact offer prices, and the audience fit of this content on a historically home-cleaning-focused @prismbayclean account.
2. For the exact approved video, obtain its `expectedSha256` and `approvedCaptionSha256` from `node scripts/tiktok-zernio-autopost.mjs hashes` or the automated test job log (prints no credentials or confidential data). Keep the exact caption unchanged after approval. Any edit needs a new hash and owner review.
3. In a new reviewed GitHub PR, edit `config/tiktok-approved-autopost.json` to set only the selected creative's `approval` fields: `ownerApproved:true`, `rightsVerified:true`, `destinationVerified:true`, `accountAudienceFitApproved:true`, `contentPreviewConfirmed:true`, `expressConsentGiven:true`; also set `approvedMediaSha256`, `approvedCaptionSha256`, `approvedAt` (UTC), `expiresAt` (UTC, no more than 14 days after approval), and the **actual review PR or issue URL** as `approvalRecordUrl`.
4. After the premium replacement creative is explicitly approved, a separately reviewed PR can change `config/tiktok-publish-lock.json` to `locked:false`. This existing safety lock must not be bypassed by workers. Enable `enabled:true` in the new queue, and merge all audited authorization changes to `main`.
5. The next eligible scheduled run will automatically select the first approved, unsubmitted creative. A repository owner can also use GitHub Actions → *PrismBay TikTok Approved Autoposter* → *Run workflow* → **publish-approved**. Selecting this option does not bypass any approval, media rights or TikTok creator settings.

Do not put OAuth tokens or secret values into commits, logs or issues. The configured GitHub Actions `ZERNIO_API_KEY` is read from GitHub Secrets, not from source. The GitHub Actions provider access is used only in the gated publishing job.

## Automated release checks

1. Run 10 regression tests and refuse work while either the existing creative lock or the new queue disable flag is active.
2. Read the durable `automation/tiktok-post-ledger` branch, which is separate from `main`. A creative whose ID is already reserved or submitted is ineligible for all future automated runs.
3. Re-render original UI footage from the source via Playwright, Chromium, Pillow and FFmpeg in a GitHub-hosted runner. Confirm the output MP4's SHA256 equals the owner's approved SHA256.
4. Upload **only the selected exact approved MP4** to branded GitHub Pages, if not already present. Check the branded `CNAME`. This stage must never write to the unrelated educational YouTube channel.
5. Verify the publicly retrievable MP4 bytes and SHA256, authenticated Zernio account ID + username, current creator public privacy option, own-brand commercial disclosure and posting capacity using read-only GET requests.
6. Write a **reservation to the persistent ledger branch and successfully push it to GitHub before** issuing one `POST /v1/posts` request. If the reservation cannot be pushed, publishing never starts.
7. Issue one idempotency-keyed Zernio request, using a single TikTok platform target, a single original MP4, `publishNow:true`, own-brand labeling, AI-content transparency, explicit preview confirmation and creator consent.
8. Store a sanitized provider receipt and update the durable ledger. If the POST response is lost, the reserved creative stays blocked from automated retry. If Zernio returns HTTP 207 / moderation failure, status stays **manual reconciliation required**, never shown as published.
9. A provider `published` or `publishing` response is **not independent verification** of a live, public TikTok URL. Obtain the verified platform URL when available. Only genuine Stripe payment/order evidence establishes revenue.

## Operational warnings

- Zernio's creator-info endpoint determines actual privacy and commercial settings. An API account being connected does not mean the video will post successfully.
- The design handles short, original videos already checked by the source creator. It does not automatically invent new testimonial footage or review the legal rights of every future render.
- The queue contains *three* video drafts. It stops after the approved videos have each received one submission. Any additional growth campaign needs additional independently approved, distinct media.
- Professional ESG and stakeholder toolkits may not match a cleaning-products TikTok audience. A channel-specific editorial decision is compulsory for these B2B product ads.
- TikTok may moderate, delay or reject submissions. Never invent virality, orders, conversions, profit, public post URLs or approval.
- Zernio accepts public MP4 URLs and can create/schedule posts. API docs: https://docs.zernio.com/platforms/tiktok and https://docs.zernio.com/sdks/php.
- GitHub Action minutes, Actions artifacts, repository storage and Zernio use remain subject to the account's actual quotas and terms. The implementation does not create a paid subscription, but no permanent zero-cost guarantee is asserted.
