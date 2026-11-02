#!/usr/bin/env python3
"""Regression checks for both original private-review Shorts' mobile-safe frames."""
import importlib.util
import tempfile
import unittest
from pathlib import Path
from PIL import Image

PRODUCTION=Path(__file__).resolve().parents[1]/"production"

def load(name):
    path=PRODUCTION/name
    spec=importlib.util.spec_from_file_location(name.replace(".py",""),path)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

class MobileSafeCardTests(unittest.TestCase):
    def test_accepted_output_all_twelve_cards(self):
        m=load("render_accepted_output_short.py")
        self.assertEqual(m.CHANNEL,"UCw2hs85TzIpdKwJtG-BSxzQ")
        with tempfile.TemporaryDirectory() as tmp:
            for i,(scene,spoken) in enumerate(m.PHRASES):
                path=Path(tmp)/f"{i}.png"
                m.card(scene,spoken,path,i)
                with Image.open(path) as im:
                    self.assertEqual(im.size,(1080,1920))

    def test_capacity_cash_all_twelve_cards(self):
        m=load("render_capacity_cash_short.py")
        self.assertEqual(m.CHANNEL,"UCw2hs85TzIpdKwJtG-BSxzQ")
        with tempfile.TemporaryDirectory() as tmp:
            for i,(scene,spoken) in enumerate(m.PHRASES):
                path=Path(tmp)/f"{i}.png"
                m.card(scene,spoken,path,i)
                with Image.open(path) as im:
                    self.assertEqual(im.size,(1080,1920))

if __name__=="__main__":
    unittest.main()
