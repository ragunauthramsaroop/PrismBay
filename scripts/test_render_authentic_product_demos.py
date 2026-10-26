import importlib.util
import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from PIL import Image

SCRIPT=Path(__file__).resolve().with_name("render-authentic-product-demos.py")
spec=importlib.util.spec_from_file_location("real_prismbay_demo",SCRIPT)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class AuthenticShortTests(unittest.TestCase):
    def test_three_real_owned_website_sources(self):
        self.assertTrue(mod.check_inputs())
        self.assertEqual(len(mod.CLIPS),3)
        for clip in mod.CLIPS:
            self.assertTrue((mod.SRC/clip["file"]).is_file())
            self.assertTrue(clip["url"].startswith(mod.SITE+"/digital/"))
    def test_campaign_labels_drafts_not_claimed_posts(self):
        data=mod.manifest()
        self.assertIs(data["tiktokPublished"],False)
        self.assertIs(data["tiktokLockRequired"],True)
        self.assertEqual(data["verifiedPaidSales"],0)
        self.assertTrue(all(x["status"]=="review_draft" for x in data["clips"]))
        self.assertFalse(data["realActorsUsed"])
        self.assertFalse(data["physicalMerchandiseDemos"])
    def test_channel_link_and_prices_are_consistent(self):
        for c in mod.CLIPS:
            text=mod.caption(c)
            self.assertIn("utm_source=tiktok",text)
            self.assertIn(c["url"],text)
            self.assertNotIn("guaranteed",text.lower())
            if c["price"]: self.assertIn("USD, one-time",text)
    def test_scenes_are_composited_from_actual_screenshots(self):
        with TemporaryDirectory() as t:
            t=Path(t)
            screen=t/"screen.png";out=t/"scene.png"
            Image.new("RGB",(780,1688),(240,248,244)).save(screen)
            mod.scene(mod.CLIPS[0],0,screen,out)
            with Image.open(out) as im:
                self.assertEqual(im.size,(1080,1920))
                self.assertEqual(im.mode,"RGB")
    def test_unique_target_ids_and_scene_count(self):
        self.assertEqual(len({x["id"] for x in mod.CLIPS}),len(mod.CLIPS))
        for c in mod.CLIPS:
            self.assertEqual(len(c["hooks"]),4)
            self.assertEqual(len(c["lines"]),4)
            self.assertEqual(len(c["selectors"]),4)

if __name__=="__main__":unittest.main()
