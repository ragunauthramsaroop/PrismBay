#!/usr/bin/env python3
"""Evidence-first, offline report compilation and print PDF engine."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter
from datetime import date
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import Paragraph
from pypdf import PdfReader

WIDTH, HEIGHT = A4
INK = colors.HexColor("#17252A")
GREEN = colors.HexColor("#174B45")
GOLD = colors.HexColor("#C69B4A")
PAPER = colors.HexColor("#F6F4EF")
MUTED = colors.HexColor("#52605D")
LEFT = 55
RIGHT = WIDTH - 55
BODY_WIDTH = RIGHT - LEFT
MIN_BOTTOM = 84
MAX_INPUT_MB = 40
KINDS = {"narrative", "metrics", "photo"}


class ReportError(ValueError):
    """Input or layout failed a publication gate."""


def read_manifest(path: Path) -> dict:
    try:
        doc = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise ReportError("Manifest is unreadable JSON: " + str(exc)) from exc
    if not isinstance(doc, dict):
        raise ReportError("Manifest root must be an object")
    return doc


def source_ids(row: dict) -> list[str]:
    return row.get("source_ids", []) if isinstance(row, dict) else []


def validate(doc: dict, manifest_path: Path) -> list[str]:
    errors = []
    meta = doc.get("meta", {})
    if not isinstance(meta, dict):
        return ["meta must be an object"]
    demo = meta.get("demonstration") is True
    for key in ("title", "organization", "year", "classification"):
        if not str(meta.get(key, "")).strip():
            errors.append("meta." + key + " is required")
    if not isinstance(doc.get("pages"), list) or not doc["pages"]:
        errors.append("pages must be a non-empty array")
    sources = doc.get("sources")
    if not isinstance(sources, list) or not sources:
        errors.append("sources must be a non-empty array")
        sources = []
    seen = set()
    for i, src in enumerate(sources):
        if not isinstance(src, dict):
            errors.append("sources[%d] must be an object" % i)
            continue
        sid = str(src.get("id", ""))
        if not re.fullmatch(r"[A-Za-z0-9_-]{2,32}", sid):
            errors.append("sources[%d].id must be 2-32 alphanumeric/underscore/dash characters" % i)
        if sid in seen:
            errors.append("duplicate source ID: " + sid)
        seen.add(sid)
        for key in ("title", "locator", "reviewed_at"):
            if not str(src.get(key, "")).strip():
                errors.append("source %s missing %s" % (sid, key))
        if src.get("status") not in ({"verified", "synthetic"} if demo else {"verified"}):
            errors.append("source %s is not verified" % sid)
    used = set()
    pages = doc.get("pages", []) if isinstance(doc.get("pages"), list) else []
    for ix, page in enumerate(pages):
        label = "pages[%d]" % ix
        if not isinstance(page, dict):
            errors.append(label + " must be an object")
            continue
        kind = page.get("type")
        if kind not in KINDS:
            errors.append(label + " unsupported type")
            continue
        if not str(page.get("title", "")).strip():
            errors.append(label + " missing title")
        if kind == "narrative":
            paragraphs = page.get("paragraphs", [])
            if not isinstance(paragraphs, list) or not paragraphs:
                errors.append(label + " needs paragraphs")
                paragraphs = []
            for j, item in enumerate(paragraphs):
                if not isinstance(item, dict) or not str(item.get("text", "")).strip():
                    errors.append(label + ".paragraphs[%d] requires text" % j)
                    continue
                refs = source_ids(item)
                if not isinstance(refs, list) or not refs:
                    errors.append(label + ".paragraphs[%d] requires source_ids" % j)
                else:
                    used.update(refs)
        if kind == "metrics":
            metrics = page.get("metrics", [])
            if not isinstance(metrics, list) or not 1 <= len(metrics) <= 6:
                errors.append(label + " requires 1 to 6 metrics")
                metrics = []
            for j, item in enumerate(metrics):
                if not isinstance(item, dict) or not all(str(item.get(k, "")).strip() for k in ("label", "value")):
                    errors.append(label + ".metrics[%d] requires label and value" % j)
                    continue
                refs = source_ids(item)
                if not isinstance(refs, list) or not refs:
                    errors.append(label + ".metrics[%d] requires source_ids" % j)
                else:
                    used.update(refs)
        if kind == "photo":
            refs = source_ids(page)
            if not isinstance(refs, list) or not refs:
                errors.append(label + " requires source_ids")
            else:
                used.update(refs)
            img = str(page.get("image", ""))
            target = (manifest_path.parent / img).resolve()
            parent = manifest_path.parent.resolve()
            if not img or not target.is_relative_to(parent) or not target.is_file():
                errors.append(label + " image missing or outside manifest folder")
            elif target.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
                errors.append(label + " unsupported image type")
            for key in ("caption", "credit", "alt_text"):
                if not str(page.get(key, "")).strip():
                    errors.append(label + " missing " + key)
            if page.get("rights") not in {"owned", "licensed"}:
                errors.append(label + " requires owned or licensed image rights")
    for sid in sorted(used - seen):
        errors.append("missing source reference: " + str(sid))
    if not used:
        errors.append("report must reference at least one source")
    return errors


def xml(text: object) -> str:
    return escape(str(text))


def paragraph(text: str, font_size: float = 11, leading: float = 17, color=INK, bold=False) -> Paragraph:
    style = ParagraphStyle(
        "report", fontName="Helvetica-Bold" if bold else "Helvetica",
        fontSize=font_size, leading=leading, textColor=color, spaceBefore=0,
        spaceAfter=0, splitLongWords=True, allowWidows=0, allowOrphans=0,
    )
    return Paragraph(xml(text), style)


def draw_para(c: Canvas, text: str, x: float, top: float, width: float,
              font_size: float = 11, leading: float = 17, color=INK,
              bold=False, bottom: float = MIN_BOTTOM) -> float:
    obj = paragraph(text, font_size, leading, color, bold)
    _, h = obj.wrap(width, HEIGHT)
    if top - h < bottom:
        raise ReportError("Page content overflow near: " + text[:80])
    obj.drawOn(c, x, top - h)
    return top - h


def page_frame(c: Canvas, eyebrow: str, title: str, continued=False) -> float:
    c.setFillColor(PAPER)
    c.rect(0, 0, WIDTH, HEIGHT, fill=1, stroke=0)
    c.setFillColor(GREEN)
    c.rect(0, HEIGHT - 11, WIDTH, 11, fill=1, stroke=0)
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(GOLD)
    c.drawString(LEFT, HEIGHT - 68, eyebrow.upper()[:62])
    top = draw_para(c, title + (" (continued)" if continued else ""), LEFT,
                    HEIGHT - 96, BODY_WIDTH, 27, 32, INK, True, bottom=HEIGHT - 220)
    c.setStrokeColor(GOLD)
    c.setLineWidth(1.5)
    c.line(LEFT, top - 20, LEFT + 80, top - 20)
    return top - 46


def footer(c: Canvas, meta: dict) -> None:
    c.setStrokeColor(colors.HexColor("#D5D9D4"))
    c.setLineWidth(.5)
    c.line(LEFT, 59, RIGHT, 59)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8)
    c.drawString(LEFT, 43, str(meta.get("organization", ""))[:53])
    c.drawCentredString(WIDTH / 2, 43, str(meta.get("classification", "")).upper()[:44])
    c.drawRightString(RIGHT, 43, "%02d" % c.getPageNumber())


def cover(c: Canvas, meta: dict) -> None:
    c.setFillColor(INK)
    c.rect(0, 0, WIDTH, HEIGHT, stroke=0, fill=1)
    c.setFillColor(GREEN)
    c.rect(WIDTH * .7, 0, WIDTH * .3, HEIGHT, stroke=0, fill=1)
    c.setStrokeColor(colors.HexColor("#467068"))
    c.setLineWidth(.8)
    for i in range(13):
        x = WIDTH * .57 + i * 20
        c.line(x, HEIGHT * .25, x + 110, HEIGHT * .9)
    c.setFillColor(GOLD)
    c.rect(LEFT, HEIGHT - 105, 50, 5, stroke=0, fill=1)
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(colors.white)
    c.drawString(LEFT, HEIGHT - 81, str(meta["organization"]).upper()[:64])
    draw_para(c, str(meta["title"]), LEFT, HEIGHT - 265, WIDTH - 115,
              39, 46, colors.white, True, bottom=HEIGHT - 530)
    c.setFont("Helvetica", 14)
    c.setFillColor(colors.HexColor("#E2E9E4"))
    draw_para(c, str(meta.get("subtitle", "Evidence-first report")), LEFT,
              HEIGHT - 548, WIDTH - 135, 14, 20, colors.HexColor("#E2E9E4"),
              bottom=HEIGHT - 620)
    c.setFillColor(GOLD)
    c.rect(LEFT, 119, 115, 2, stroke=0, fill=1)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(LEFT, 94, str(meta["year"]))
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.white)
    c.drawString(LEFT, 70, str(meta["classification"]).upper()[:62])
    c.showPage()


def narrative(c: Canvas, meta: dict, page: dict) -> None:
    heading = str(page["title"])
    eyebrow = str(page.get("eyebrow", "Executive report"))
    top = page_frame(c, eyebrow, heading)
    for item in page["paragraphs"]:
        body = str(item["text"])
        refs = "  [" + ", ".join(item["source_ids"]) + "]"
        words = body.split()
        chunk = []
        while words:
            chunk.append(words.pop(0))
            candidate = " ".join(chunk) + refs
            obj = paragraph(candidate)
            _, h = obj.wrap(BODY_WIDTH, HEIGHT)
            if top - h - 12 < MIN_BOTTOM:
                if len(chunk) == 1:
                    footer(c, meta)
                    c.showPage()
                    top = page_frame(c, eyebrow, heading, continued=True)
                else:
                    last = chunk.pop()
                    top = draw_para(c, " ".join(chunk), LEFT, top, BODY_WIDTH) - 14
                    footer(c, meta)
                    c.showPage()
                    top = page_frame(c, eyebrow, heading, continued=True)
                    chunk = [last]
            if not words:
                top = draw_para(c, candidate, LEFT, top, BODY_WIDTH) - 22
    footer(c, meta)
    c.showPage()


def metrics(c: Canvas, meta: dict, page: dict) -> None:
    top = page_frame(c, str(page.get("eyebrow", "Performance and indicators")),
                     str(page["title"]))
    intro = str(page.get("intro", "Indicators trace to the sources shown below each value."))
    top = draw_para(c, intro, LEFT, top, BODY_WIDTH, 10, 15, MUTED) - 25
    items = page["metrics"]
    col_gap = 17
    w = (BODY_WIDTH - col_gap) / 2
    row_height = 155
    for ix, item in enumerate(items):
        row = ix // 2
        col = ix % 2
        x = LEFT + col * (w + col_gap)
        ytop = top - row * row_height
        if ytop - row_height < MIN_BOTTOM:
            raise ReportError("Metrics page exceeds six-card design")
        c.setFillColor(colors.white)
        c.setStrokeColor(colors.HexColor("#DADFD8"))
        c.roundRect(x, ytop - 139, w, 139, 9, fill=1, stroke=1)
        c.setFillColor(GOLD)
        c.rect(x + 17, ytop - 18, 32, 3, stroke=0, fill=1)
        draw_para(c, str(item["value"]), x + 17, ytop - 34, w - 34,
                  26, 31, GREEN, True, bottom=ytop - 92)
        draw_para(c, str(item["label"]), x + 17, ytop - 82, w - 34,
                  10, 13, INK, True, bottom=ytop - 119)
        c.setFont("Helvetica", 8)
        c.setFillColor(MUTED)
        c.drawString(x + 17, ytop - 125, ", ".join(item["source_ids"])[:39])
    footer(c, meta)
    c.showPage()


def photo(c: Canvas, meta: dict, page: dict, manifest_path: Path) -> None:
    top = page_frame(c, str(page.get("eyebrow", "Photographic evidence")),
                     str(page["title"]))
    img_path = (manifest_path.parent / page["image"]).resolve()
    image = ImageReader(str(img_path))
    iw, ih = image.getSize()
    maxw = BODY_WIDTH
    maxh = min(460, top - 184)
    if maxh < 120:
        raise ReportError("Not enough room for photograph")
    scale = min(maxw / iw, maxh / ih)
    dw, dh = iw * scale, ih * scale
    y = top - dh
    c.drawImage(image, LEFT + (BODY_WIDTH - dw) / 2, y, dw, dh,
                preserveAspectRatio=True, mask="auto")
    bottom = draw_para(c, str(page["caption"]), LEFT, y - 15, BODY_WIDTH,
                       11, 15, INK, True, bottom=MIN_BOTTOM + 25)
    credit = "Image: " + str(page["credit"]) + " | " + str(page["rights"]) + " | " + ", ".join(page["source_ids"])
    draw_para(c, credit, LEFT, bottom - 12, BODY_WIDTH, 8, 11, MUTED,
              bottom=MIN_BOTTOM)
    footer(c, meta)
    c.showPage()


def sources_pages(c: Canvas, meta: dict, sources: list[dict]) -> None:
    top = page_frame(c, "Source register", "Evidence and references")
    for src in sources:
        title = str(src["id"]) + "  " + str(src["title"])
        note = str(src["locator"]) + " | reviewed " + str(src["reviewed_at"]) + " | " + str(src["status"])
        a = paragraph(title, 11, 15, GREEN, True)
        b = paragraph(note, 8.5, 12, MUTED)
        ha = a.wrap(BODY_WIDTH, HEIGHT)[1]
        hb = b.wrap(BODY_WIDTH, HEIGHT)[1]
        if top - ha - hb - 23 < MIN_BOTTOM:
            footer(c, meta)
            c.showPage()
            top = page_frame(c, "Source register", "Evidence and references", continued=True)
        top = draw_para(c, title, LEFT, top, BODY_WIDTH, 11, 15, GREEN, True) - 7
        top = draw_para(c, note, LEFT, top, BODY_WIDTH, 8.5, 12, MUTED) - 18
    footer(c, meta)
    c.showPage()


def build(manifest_path: Path, output: Path) -> dict:
    manifest_path = manifest_path.resolve()
    doc = read_manifest(manifest_path)
    errors = validate(doc, manifest_path)
    if errors:
        raise ReportError("Publication blocked:\n- " + "\n- ".join(errors))
    output.parent.mkdir(parents=True, exist_ok=True)
    c = Canvas(str(output), pagesize=A4, pageCompression=1)
    meta = doc["meta"]
    c.setTitle(str(meta["title"]))
    c.setAuthor(str(meta["organization"]))
    c.setSubject("Evidence-first report | sources in final section")
    cover(c, meta)
    for page in doc["pages"]:
        if page["type"] == "narrative":
            narrative(c, meta, page)
        elif page["type"] == "metrics":
            metrics(c, meta, page)
        elif page["type"] == "photo":
            photo(c, meta, page, manifest_path)
    sources_pages(c, meta, doc["sources"])
    c.save()
    result = inspect(output)
    if result["blank_pages"] or not result["has_sources"]:
        raise ReportError("Generated PDF failed post-build inspection")
    return result


def inspect(pdf_path: Path) -> dict:
    reader = PdfReader(str(pdf_path))
    texts = [(p.extract_text() or "").strip() for p in reader.pages]
    pages = len(texts)
    return {
        "pdf": str(pdf_path),
        "pages": pages,
        "blank_pages": [i + 1 for i, text in enumerate(texts) if len(text) < 20],
        "has_sources": any("Evidence and references" in t for t in texts),
        "a4_pages": all(abs(float(p.mediabox.width) - WIDTH) < 1 and
                        abs(float(p.mediabox.height) - HEIGHT) < 1 for p in reader.pages),
        "sha256": hashlib.sha256(pdf_path.read_bytes()).hexdigest(),
    }


def extract_sources(src_dir: Path, out_dir: Path) -> list[dict]:
    """Extract text locally for editorial review; never assert extracted claims are verified."""
    if out_dir.resolve().is_relative_to(src_dir.resolve()):
        raise ReportError("Extraction output directory must be outside input directory")
    out_dir.mkdir(parents=True, exist_ok=True)
    records = []
    for path in sorted(src_dir.iterdir()):
        if not path.is_file() or path.suffix.lower() not in {".pdf", ".docx", ".xlsx", ".txt"}:
            continue
        if path.stat().st_size > MAX_INPUT_MB * 1024 * 1024:
            raise ReportError("Source too large: " + path.name)
        ext = path.suffix.lower()
        if ext == ".pdf":
            reader = PdfReader(str(path))
            data = "\n\n".join("PDF page %d\n%s" % (i + 1, p.extract_text() or "")
                                for i, p in enumerate(reader.pages))
        elif ext == ".docx":
            from docx import Document
            data = "\n".join(p.text for p in Document(str(path)).paragraphs)
        elif ext == ".xlsx":
            from openpyxl import load_workbook
            wb = load_workbook(str(path), read_only=True, data_only=True)
            lines = []
            for sheet in wb:
                lines.append("WORKSHEET " + sheet.title)
                for row in sheet.iter_rows(values_only=True):
                    lines.append("\t".join(str(v) if v is not None else "" for v in row))
            wb.close()
            data = "\n".join(lines)
        else:
            data = path.read_text(encoding="utf-8", errors="replace")
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        dest = out_dir / (path.stem + "-" + digest[:10] + ".txt")
        dest.write_text(data, encoding="utf-8")
        records.append({
            "filename": path.name, "sha256": digest,
            "extracted_to": dest.name, "characters": len(data),
            "verification": "pending_human_review",
        })
    (out_dir / "inventory.json").write_text(json.dumps(records, indent=2), encoding="utf-8")
    return records


def main() -> None:
    parser = argparse.ArgumentParser(description="Offline evidence-first PDF report studio")
    sub = parser.add_subparsers(dest="command", required=True)
    validate_parser = sub.add_parser("validate")
    validate_parser.add_argument("manifest", type=Path)
    build_parser = sub.add_parser("build")
    build_parser.add_argument("manifest", type=Path)
    build_parser.add_argument("--output", required=True, type=Path)
    inspect_parser = sub.add_parser("inspect")
    inspect_parser.add_argument("pdf", type=Path)
    extract_parser = sub.add_parser("extract")
    extract_parser.add_argument("source_directory", type=Path)
    extract_parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    try:
        if args.command == "validate":
            issues = validate(read_manifest(args.manifest), args.manifest.resolve())
            if issues:
                raise ReportError("Publication blocked:\n- " + "\n- ".join(issues))
            result = {"valid": True, "manifest": str(args.manifest)}
        elif args.command == "build":
            result = build(args.manifest, args.output)
        elif args.command == "inspect":
            result = inspect(args.pdf)
        else:
            result = {"extracted": extract_sources(args.source_directory, args.output)}
        print(json.dumps(result, indent=2))
    except (ReportError, OSError) as exc:
        parser.exit(2, "ERROR: " + str(exc) + "\n")


if __name__ == "__main__":
    main()
