"""Fetch public candles only. No private key, no account data, no order endpoints."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from .core import Candle, validate_candles

PUBLIC_ENDPOINT = "https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=86400"


def fetch_coinbase_daily() -> list[Candle]:
    request = Request(PUBLIC_ENDPOINT, headers={"User-Agent": "PaperOnlyResearch/0.1", "Accept": "application/json"})
    with urlopen(request, timeout=20) as response:
        if response.status != 200:
            raise RuntimeError(f"Market data request failed: HTTP {response.status}")
        raw = json.load(response)
    if not isinstance(raw, list) or not raw:
        raise ValueError("No market data available")
    # API rows: [unix_seconds, low, high, open, close, volume], newest first.
    candles = [Candle(datetime.fromtimestamp(row[0], tz=timezone.utc).date().isoformat(),
                      float(row[3]), float(row[2]), float(row[1]), float(row[4]), float(row[5])) for row in raw]
    candles.sort(key=lambda c: c.date)
    # Exclude the current, incomplete UTC daily candle.
    today_utc = datetime.now(timezone.utc).date().isoformat()
    candles = [c for c in candles if c.date < today_utc]
    validate_candles(candles)
    return candles
