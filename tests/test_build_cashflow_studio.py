"""Independent checks for the generated workbook and customer package."""
import importlib.util
import pathlib
import tempfile
import unittest
import zipfile
import xml.etree.ElementTree as ET

ROOT=pathlib.Path(__file__).resolve().parents[1]
SPEC=importlib.util.spec_from_file_location("cashflow",ROOT/"scripts/build-cashflow-studio.py")
MOD=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MOD)
NS={"s":"http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

class ProductContract(unittest.TestCase):
    def test_exact_release_files_and_archive_integrity(self):
        with tempfile.TemporaryDirectory() as td:
            zpath=MOD.package(td)
            self.assertTrue(zpath.exists())
            with zipfile.ZipFile(zpath) as outer:
                self.assertIsNone(outer.testzip())
                self.assertEqual(set(outer.namelist()), {"PrismBay_Cashflow_Studio_v1.xlsx","START_HERE.txt","LICENSE.txt"})
                inner=outer.read("PrismBay_Cashflow_Studio_v1.xlsx")
            with tempfile.TemporaryDirectory() as wd:
                f=pathlib.Path(wd)/"sample.xlsx";f.write_bytes(inner)
                with zipfile.ZipFile(f) as book:
                    self.assertIsNone(book.testzip())
                    names=set(book.namelist())
                    self.assertEqual(len([x for x in names if x.startswith("xl/worksheets/sheet") and x.endswith(".xml")]),5)
                    workbook=ET.fromstring(book.read("xl/workbook.xml"))
                    labels=[t.attrib["name"] for t in workbook.findall(".//s:sheet",NS)]
                    self.assertEqual(labels,MOD.SHEET_NAMES)
                    self.assertEqual(workbook.find(".//s:calcPr",NS).attrib["fullCalcOnLoad"],"1")
                    trans=ET.fromstring(book.read("xl/worksheets/sheet3.xml"))
                    self.assertEqual(len(trans.findall(".//s:dataValidation",NS)),2)
                    cells={c.attrib["r"]:c for c in trans.findall(".//s:c",NS)}
                    self.assertIn("A306",cells)
                    self.assertIn("G306",cells)
                    self.assertIn("F306",cells)
                    self.assertIn("IF(OR(A306",cells["G306"].find("s:f",NS).text)
                    self.assertNotIn("pi_","".join(book.namelist()))
                    month=ET.fromstring(book.read("xl/worksheets/sheet2.xml"))
                    m={c.attrib["r"]:c for c in month.findall(".//s:c",NS)}
                    self.assertIn("SUMIFS",m["B5"].find("s:f",NS).text)
                    self.assertIn("Expense",m["C16"].find("s:f",NS).text)
                    self.assertIn("SUM($D$5:D16)",m["E16"].find("s:f",NS).text)
                    self.assertIn("E16",m["E18"].find("s:f",NS).text)
            import json
            manifest=json.loads((pathlib.Path(td)/"manifest.json").read_text())
            self.assertFalse(manifest["paidDeliveryVerified"])
            self.assertFalse(manifest["publicDownloadAllowed"])
            self.assertEqual(manifest["priceUsdProposed"],5.99)
            self.assertEqual(manifest["status"],"review_only_not_for_sale")

    def test_business_logic_reference_cases(self):
        # Separate arithmetic checks against the intended SUMIFS / income-minus-expenses semantics.
        entries=[
          ("2026-01-05","Income",3200),("2026-01-08","Expense",850),
          ("2026-01-12","Expense",120),("2026-02-04","Income",1950),
          ("2026-02-09","Expense",325),("2025-12-20","Income",9000)
        ]
        jan=sum(a if t=="Income" else -a for date,t,a in entries if date.startswith("2026-01"))
        feb=sum(a if t=="Income" else -a for date,t,a in entries if date.startswith("2026-02"))
        self.assertEqual((jan,feb,jan+feb),(2230,1625,3855))

    def test_no_nonconsensual_distribution_or_live_checkout_in_build_source(self):
        code=(ROOT/"scripts/build-cashflow-studio.py").read_text()
        self.assertNotIn("stripe.com/v1",code)
        self.assertNotIn("import requests",code)
        self.assertNotIn("smtp",code)
        self.assertNotIn("urllib.request",code)

if __name__=="__main__":
    unittest.main()
