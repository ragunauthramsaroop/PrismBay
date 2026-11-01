"""Read-only public Coinbase Exchange daily OHLCV data, without auth or order routes."""
from __future__ import annotations

import json
import time
from datetime import datetime, timedelta, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from .core import Candle, validate_candles

BASE = "https://api.exchange.coinbase.com"
PUBLIC_ENDPOINT = BASE + "/products/BTC-USD/candles?granularity=86400"
SAFE_PRODUCTS = ("BTC-USD", "ETH-USD")


def _get_json(url: str, retries: int = 3) -> list:
    last_error = None
    for attempt in range(retries):
        try:
            req = Request(url, headers={"User-Agent": "PaperOnlyResearch/0.2",
                                         "Accept": "application/json"})
            with urlopen(req, timeout=25) as response:
                if response.status != 200:
                    raise RuntimeError(f"Public market-data request HTTP {response.status}")
                value = json.load(response)
            if not isinstance(value, list):
                raise ValueError("Public market-data response was not a list")
            return value
        except (HTTPError, URLError, TimeoutError) as err:
            last_error = err
            if isinstance(err, HTTPError) and err.code not in (429, 500, 502, 503, 504):
                raise
            if attempt + 1 < retries:
                time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"Public market-data service unavailable: {type(last_error).__name__}")


def _rows_to_candles(rows: list) -> list[Candle]:
    candles = []
    for row in rows:
        if not isinstance(row, list) or len(row) < 6:
            raise ValueError("Invalid candle row")
        candles.append(Candle(
            datetime.fromtimestamp(int(row[0]), tz=timezone.utc).date().isoformat(),
            float(row[3]), float(row[2]), float(row[1]), float(row[4]), float(row[5])
        ))
    return candles


def fetch_coinbase_history(days: int = 900, product: str = "BTC-USD") -> list[Candle]:
    """Collect completed UTC daily candles in 200-day windows (under API's 300 limit)."""
    if product not in SAFE_PRODUCTS:
        raise ValueError("Only approved public research tickers supported")
    if not 120 <= days <= 2000:
        raise ValueError("History request must cover 120 to 2000 days")
    utc_midnight = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    earliest = utc_midnight - timedelta(days=days)
    cursor = earliest
    seen: dict[str, Candle] = {}
    while cursor < utc_midnight:
        chunk_end = min(cursor + timedelta(days=200), utc_midnight)
        query = urlencode({
            "granularity": 86400, "start": cursor.isoformat().replace("+00:00", "Z"),
            "end": chunk_end.isoformat().replace("+00:00", "Z")
        })
        url = f"{BASE}/products/{product}/candles?{query}"
        for candle in _rows_to_candles(_get_json(url)):
            if earliest.date().isoformat() <= candle.date < utc_midnight.date().isoformat():
                if candle.date in seen and seen[candle.date] != candle:
                    raise ValueError(f"Inconsistent duplicate market data on {candle.date}")
                seen[candle.date] = candle
        cursor = chunk_end
    candles = sorted(seen.values(), key=lambda x: x.date)
    validate_candles(candles)
    if len(candles) < days * 0.90:
        raise ValueError(f"Historical candle coverage insufficient: {len(candles)}/{days}")
    if (utc_midnight.date() - datetime.fromisoformat(candles[-1].date).date()).days > 3:
        raise ValueError("Stale public daily market data")
    return candles


def fetch_coinbase_daily() -> list[Candle]:
    """Recent completed public BTC-USD daily candles, backwards-compatible."""
    return fetch_coinbase_history(days=200, product="BTC-USD")
