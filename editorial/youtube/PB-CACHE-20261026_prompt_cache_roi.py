#!/usr/bin/env python3
"""PrismBay AI: transparent prompt-cache input-prefix cost comparison.

No API calls. No model prices hardcoded. Relative cost units use the
uncached price of the same eligible prefix. NOT a full-bill estimate.
"""
from __future__ import annotations
import argparse


def compare(requests: int, writes: int, reads: int, *, write_rate: float = 2.5,
            read_rate: float = 0.1) -> dict[str, float]:
    if not isinstance(requests, int) or not isinstance(writes, int) or not isinstance(reads, int):
        raise TypeError("requests, writes and reads must be integers")
    if requests < 1 or writes < 0 or reads < 0 or writes + reads > requests:
        raise ValueError("Require requests >= 1, writes >= 0, reads >= 0, writes+reads <= requests")
    if write_rate < 0 or read_rate < 0:
        raise ValueError("Rate multipliers must be nonnegative")
    misses = requests - writes - reads
    baseline = float(requests)
    cached = writes * write_rate + reads * read_rate + misses
    return {"requests": requests, "writes": writes, "reads": reads,
            "uncached_misses": misses, "uncached_units": baseline,
            "cache_units": round(cached, 6),
            "saved_units": round(baseline - cached, 6),
            "saved_percent_of_eligible_prefix_input": round(100 * (baseline - cached) / baseline, 3)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--requests", type=int, required=True)
    parser.add_argument("--writes", type=int, default=1)
    parser.add_argument("--reads", type=int, required=True)
    parser.add_argument("--write-rate", type=float, default=2.5,
                        help="2.5 for 12h; 1.25 for default 30m, on supported models")
    parser.add_argument("--read-rate", type=float, default=0.1,
                        help="0.1 for most supported models; 0.05 for GPT-6.1 Sol")
    args = parser.parse_args()
    result = compare(args.requests, args.writes, args.reads,
                     write_rate=args.write_rate, read_rate=args.read_rate)
    for key, value in result.items():
        print(f"{key}: {value}")
    print("NOTE: compares eligible repeated-prefix input only, not the entire API bill.")


if __name__ == "__main__":
    main()
