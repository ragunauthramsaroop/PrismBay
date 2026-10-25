import importlib.util
import json
import unittest
from pathlib import Path
SCRIPT=Path(__file__).resolve().with_name("render-retail-film-first.py")
spec=importlib.util.spec_from_file_location("prismbay_retail_film_first",SCRIPT)
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
class FilmFirstQualityTests(unittest.TestCase):
    def test_only_real_film_source_catalog(self):
        self.assertTrue(module.validate_sources())
        self.assertGreaterEqual(len(module.SRC),2)
        for name,source in module.SRC.items():
            self.assertEqual(len(source["hooks"]),4)
            self.assertIn("ILLUSTRATIVE",source["disclosure"])
            self.assertTrue(source["licensePage"].startswith("https://"))
            self.assertTrue(source["sourcePage"].startswith("https://"))
            self.assertFalse(source["url"].startswith("https://buy.stripe.com/"))
    def test_no_unverified_exact_product_demonstration(self):
        for name,source in module.SRC.items():
            story=module.storyboard(name,source)
            self.assertIn("not footage of",story["rights"].replace("Commercial license applies to editorial background footage only.","not footage of a precise SKU"))
            self.assertIn("ILLUSTRATIVE",story["disclosure"])
            self.assertNotIn("guaranteed",story["promise"].lower().replace("no guaranteed",""))
    def test_no_product_pages_used_as_motion_footage(self):
        for info in module.SRC.values():
            for url in info["candidates"]:
                self.assertIn(".mp4",url)
                self.assertNotIn("prismbayai.com",url)
                self.assertNotIn("github.com",url)
    def test_checkout_locked_until_verified_rights_and_fulfillment(self):
        for key,spec in module.SRC.items():
            s=module.storyboard(key,spec)
            self.assertIn("Not approved",s["saleCopy"])
            self.assertIn("license",s)
if __name__=="__main__":unittest.main()
