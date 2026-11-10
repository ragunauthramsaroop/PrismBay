#!/usr/bin/env python3
"""Source-conscious PDF QC; runs on generic and client-local PDFs.

Does not establish factual truth, image rights or management authorization.
"""
from __future__ import annotations
import argparse
import csv
import json
from pathlib import Path

def check_register(path, columns, unique_field=None):
    issues, rows = [], []
    if not path:
        return issues, rows
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        missing = [x for x in columns if x not in (reader.fieldnames or [])]
        if missing:
            return [f"{path}: missing columns {', '.join(missing)}"], rows
        rows = list(reader)
    if unique_field:
        ids = [r[unique_field].strip() for r in rows]
        if any(not x for x in ids):
            issues.append(f"{path}: blank {unique_field}")
        if len(set(ids)) != len(ids):
            issues.append(f"{path}: repeated {unique_field}")
    for index, row in enumerate(rows, 2):
        if any(not row[col].strip() for col in columns):
            issues.append(f"{path}: empty required value at row {index}")
    return issues, rows

def audit(pdf_path, evidence=None, photos=None, release=False, minimum_ppi=150):
    try:
        import fitz
    except ImportError as exc:
        raise RuntimeError("Install PyMuPDF to inspect PDFs") from exc
    issues, warnings, pages = [], [], []
    doc = fitz.open(pdf_path)
    for index, page in enumerate(doc):
        rect = page.rect
        if not rect.width or not rect.height:
            issues.append(f"page {index + 1}: invalid dimensions")
        bad_spans = []
        for block in page.get_text("dict")["blocks"]:
            if block.get("type") != 0:
                continue
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    box = span["bbox"]
                    if box[0] < -2 or box[1] < -2 or box[2] > rect.width + 2 or box[3] > rect.height + 2:
                        bad_spans.append(span["text"][:50])
        if bad_spans:
            issues.append(f"page {index + 1}: {len(bad_spans)} text spans outside page")
        low_ppi = []
        for item in page.get_images(full=True):
            xref = item[0]
            try:
                image = doc.extract_image(xref)
                for placement in page.get_image_rects(xref):
                    if placement.width > 0 and placement.height > 0:
                        ppi = min(image["width"] * 72 / placement.width, image["height"] * 72 / placement.height)
                        if ppi < minimum_ppi:
                            low_ppi.append(round(ppi))
            except Exception as ex:
                warnings.append(f"page {index + 1}: image inspection failed: {ex}")
        if low_ppi:
            warnings.append(f"page {index + 1}: effective raster resolution below {minimum_ppi} PPI: {low_ppi}")
        pages.append({"page": index + 1, "size_pt": [round(rect.width, 1), round(rect.height, 1)],
                      "out_of_page_spans": len(bad_spans), "low_ppi_count": len(low_ppi)})
    ec = ["id", "reported_value", "metric_definition", "reporting_period", "source_document",
          "source_page", "evidence_class", "publication_control"]
    pc = ["asset", "source_document", "source_page", "captions_approved", "rights_cleared", "notes"]
    ei, er = check_register(evidence, ec, "id")
    pi, pr = check_register(photos, pc, "asset")
    issues.extend(ei + pi)
    ok_values = {"yes", "approved", "true", "cleared"}
    pending_photos = sum(1 for row in pr if
                         row["captions_approved"].strip().lower() not in ok_values or
                         row["rights_cleared"].strip().lower() not in ok_values)
    pending_claims = sum(1 for row in er if row["publication_control"].strip().lower() not in ok_values)
    if pending_photos:
        warnings.append(f"{pending_photos} photographic assets lack signed-off rights/captions")
    if pending_claims:
        warnings.append(f"{pending_claims} evidence claims require sign-off")
    if release:
        if not evidence or not photos:
            issues.append("release mode requires evidence and photo registers")
        if pending_photos or pending_claims:
            issues.append("release blocked by pending photo or evidence approval")
    return {"file": str(pdf_path), "pages": len(doc), "page_details": pages,
            "evidence_entries": len(er), "photo_entries": len(pr),
            "pending_photo_approvals": pending_photos, "pending_evidence_approvals": pending_claims,
            "issues": issues, "warnings": warnings, "status": "BLOCKED" if issues else "PREFLIGHT_ONLY"}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--evidence", type=Path)
    parser.add_argument("--photos", type=Path)
    parser.add_argument("--out", type=Path)
    parser.add_argument("--minimum-ppi", type=int, default=150)
    parser.add_argument("--release", action="store_true")
    args = parser.parse_args()
    result = audit(args.pdf, args.evidence, args.photos, args.release, args.minimum_ppi)
    output = json.dumps(result, indent=2)
    if args.out:
        args.out.write_text(output + "\n", encoding="utf-8")
    print(output)
    raise SystemExit(2 if result["issues"] else 0)

if __name__ == "__main__":
    main()
