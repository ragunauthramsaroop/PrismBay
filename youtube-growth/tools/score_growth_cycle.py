#!/usr/bin/env python3
"""Fail-closed PrismBay YouTube growth snapshot scorer. No publishing actions."""
import argparse
import datetime as dt
import json
from pathlib import Path

CHANNEL = "UCw2hs85TzIpdKwJtG-BSxzQ"
BRAND = "6945443"

def score(s):
    if s.get("channel_id") != CHANNEL or str(s.get("brand_id")) != BRAND:
        raise ValueError("Unauthorized channel or brand")
    dates = s["evolution"]["daily_views"]
    if not dates:
        raise ValueError("No daily view observations")
    for day, views in dates.items():
        dt.date.fromisoformat(day)
        if views is not None and (isinstance(views, bool) or not isinstance(views, int) or views < 0):
            raise ValueError("Views must be nonnegative integers or null")
    subscribers = s["evolution"]["last_observed_subscribers"]
    if isinstance(subscribers, bool) or not isinstance(subscribers, int) or subscribers < 0:
        raise ValueError("Invalid subscribers")
    private_drafts = []
    for p in s.get("scheduled_posts", []):
        if p["channel_id"] != CHANNEL:
            raise ValueError("Scheduled post targets a different channel")
        if p.get("draft") is True and p.get("auto_publish") is False and p.get("privacy") == "private":
            private_drafts.append(p["id"])
    decisions = {}
    for e in s.get("experiments", []):
        m = e.get("observed_metrics")
        state = "HOLD_NO_VIDEO_LEVEL_DATA"
        if m:
            keys = ("impressions", "views", "ctr", "average_view_duration_seconds", "subscribers_gained")
            if all(isinstance(m.get(k), (int, float)) and not isinstance(m.get(k), bool) for k in keys):
                i, v, ctr, avg, gained = (m[k] for k in keys)
                if i >= 200 and v >= 100 and 0 <= ctr <= 1 and avg >= 0 and gained >= 0:
                    conversion = gained * 100 / v
                    if ctr >= .04 and avg >= 210 and conversion >= 1:
                        state = "SCALE_CANDIDATE_REQUIRES_BASELINE_REVIEW"
                    elif ctr < .04 and avg >= 210:
                        state = "RETEST_PACKAGING"
                    elif ctr >= .04 and avg < 210:
                        state = "MODIFY_RETENTION"
                    else:
                        state = "INSUFFICIENT_EVIDENCE_TO_STOP"
                else:
                    state = "HOLD_INSUFFICIENT_EXPOSURE"
        decisions[e["id"]] = state
    values = list(dates.values())
    return {
        "channel_id": CHANNEL, "brand_id": BRAND,
        "observed_subscribers": subscribers,
        "observed_view_sum": sum(v for v in values if v is not None),
        "days_with_view_data": sum(v is not None for v in values),
        "days_with_missing_view_data": sum(v is None for v in values),
        "view_sum_is_complete": all(v is not None for v in values),
        "private_unpublished_draft_ids": private_drafts,
        "public_uploads_verified_by_this_snapshot": s.get("verified_public_upload_ids", []),
        "experiment_decisions": decisions,
        "editorial_candidates": {x["id"]: x["release_state"] for x in s.get("release_candidates", [])},
        "publishing_action": "NONE: editorial release gates remain open; drafts are not public uploads",
        "paid_spend_usd": 0
    }

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("snapshot", type=Path)
    p.add_argument("--output", type=Path)
    a = p.parse_args()
    report = json.dumps(score(json.loads(a.snapshot.read_text(encoding="utf-8"))), indent=2, sort_keys=True) + "\n"
    if a.output:
        a.output.write_text(report, encoding="utf-8")
    print(report, end="")

if __name__ == "__main__":
    main()
