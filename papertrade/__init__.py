"""Experimental open-source paper-trading research. No live execution interfaces."""
from .core import Candle, Config, simulate, load_csv
__all__ = ["Candle", "Config", "simulate", "load_csv"]
