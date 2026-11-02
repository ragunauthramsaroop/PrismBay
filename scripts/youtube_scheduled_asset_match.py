#!/usr/bin/env python3
"""Read-only exact-byte comparison of a private scheduled asset with an approved review export.

Never uploads, schedules, publishes or grants editorial approval. Only use local media files.
Example: python scripts/youtube_scheduled_asset_match.py --scheduled-file /tmp/draft.mp4 --approved-file /tmp/review.mp4 --manifest /tmp/manifest.json --report /tmp/match.json
"""
import argparse
import hashlib
import json
from pathlib import Path

CHANNEL = 'UCw2hs85TzIpdKwJtG-BSxzQ'
BRAND = '6945443'
DIGEST_FIELDS = ('videoSha256', 'reviewVideoSHA256', 'captionedReviewVideoSHA256', 'captionedMP4SHA256', 'sha256')


def digest(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def assess(scheduled_file, approved_file, manifest):
    if manifest.get('channelId') != CHANNEL or str(manifest.get('brandId')) != BRAND:
        raise ValueError('STOP: incorrect target channel or Metricool brand')
    if any(manifest.get(k) is not False for k in ('published', 'publicationApproved', 'uploadPermitted')):
        raise ValueError('STOP: review manifest does not explicitly prohibit publication')
    if manifest.get('paidSpendUSD', manifest.get('paidSpend')) != 0:
        raise ValueError('STOP: missing or nonzero paid spend')
    values = [str(manifest[k]).lower() for k in DIGEST_FIELDS if manifest.get(k)]
    if not values or any(len(x) != 64 or any(c not in '0123456789abcdef' for c in x) for x in values):
        raise ValueError('STOP: invalid or missing approved SHA-256')
    if len(set(values)) > 1:
        raise ValueError('STOP: conflicting approved media SHA-256 fields')
    approved_digest = values[0]
    actual_approved = digest(approved_file)
    scheduled_digest = digest(scheduled_file)
    if actual_approved != approved_digest:
        raise ValueError('STOP: approved export does not match its review manifest')
    match = scheduled_digest == approved_digest
    return {
        'channelId': CHANNEL, 'brandId': BRAND,
        'approvedSHA256': approved_digest,
        'scheduledSHA256': scheduled_digest,
        'exactByteMatch': match,
        'status': 'EXACT_MATCH_TECHNICAL_ONLY' if match else 'HOLD_DIFFERENT_BYTES',
        'publicationApproved': False, 'uploadPermitted': False,
        'editorialApproval': 'NOT_VERIFIED',
        'rightsApproval': 'NOT_VERIFIED',
        'realDevicePlayback': 'NOT_VERIFIED',
        'disclaimer': 'A byte match is not a publication authorization. A mismatch does not prove different creative content; platforms can transcode uploads.'
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--scheduled-file', required=True)
    ap.add_argument('--approved-file', required=True)
    ap.add_argument('--manifest', required=True)
    ap.add_argument('--report', required=True)
    args = ap.parse_args()
    report = assess(args.scheduled_file, args.approved_file, json.loads(Path(args.manifest).read_text(encoding='utf-8')))
    Path(args.report).write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, indent=2))
    return 0 if report['exactByteMatch'] else 2


if __name__ == '__main__':
    raise SystemExit(main())
