"""CaribContract Atlas: evidence-limited public tender report engine.

This module reads only a known public procurement API and PDF documents from
the exact government host. No credentials, private purchaser information,
payments, email sending or bid submissions belong in this worker.
"""
from __future__ import annotations

import argparse
from datetime import date, datetime, timedelta, timezone
from hashlib import sha256
from html import escape
from io import BytesIO
import json
from pathlib import Path
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urljoin, urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

from jinja2 import Environment, FileSystemLoader, select_autoescape

SOURCE = "https://eprocure.gov.gy/"
API = SOURCE + "api/method/doctracker.api.powerbi.get_public_bid_opportunities"
TZ_GUYANA = timezone(timedelta(hours=-4))
ID_PATTERN = re.compile(r"^PROC-20\d{2}-\d{5,}$")
MAX_PDF_BYTES = 5_000_000
MAX_PAGES = 30
MAX_FEED_BYTES = 2_000_000
MIN_EXTRACTED_TEXT = 250

TOPICS = (
    ("Submission instructions", re.compile(r"\b(submission|submit|sealed bids?|bids? must|bid opening)\b", re.I),
     "Confirm the precise submission deadline, format, place and supporting forms in the complete instructions."),
    ("Bidder qualifications", re.compile(r"\b(eligible|eligibility|qualification|registration|experience)\b", re.I),
     "Verify bidder eligibility, corporate registration and capacity requirements in the complete bidding documents."),
    ("Bid or performance security", re.compile(r"\b(bid security|bid bond|bid guarantee|performance security)\b", re.I),
     "Check whether any security is required, its value, format and issuing authority."),
    ("Technical scope", re.compile(r"\b(specifications?|technical|scope of work|schedule of requirements)\b", re.I),
     "Check each lot, technical requirement and acceptable proof of conformity."),
    ("Commercial requirements", re.compile(r"\b(price schedule|quotation|pricing|payment terms|currency)\b", re.I),
     "Confirm pricing format, currency, taxes, payment provisions and quotation validity."),
    ("Delivery and timing", re.compile(r"\b(delivery|completion period|contract period|timeline|location)\b", re.I),
     "Confirm the actual delivery or completion schedule and locations."),
    ("Clarifications and addenda", re.compile(r"\b(clarification|addend(?:a|um)|amendment|pre-bid)\b", re.I),
     "Check the original portal and issuing authority for current written clarifications and changes."),
)

class SourceError(RuntimeError):
    """Source blocked, unsupported or not trustworthy."""


class GovernmentOnlyRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not is_official_url(newurl):
            raise SourceError("Official-source redirect left government host")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


OPENER = build_opener(GovernmentOnlyRedirects)


def is_official_url(value: str) -> bool:
    try:
        u = urlsplit(value)
        return (
            u.scheme == "https" and u.hostname == "eprocure.gov.gy"
            and u.port in (None, 443) and not u.username and not u.password
            and not u.fragment
        )
    except (TypeError, ValueError):
        return False


def official_pdf_url(value: str) -> str:
    if not isinstance(value, str) or not value.startswith("/files/"):
        raise SourceError("Document is not an official /files/ path")
    url = urljoin(SOURCE, value)
    parts = urlsplit(url)
    if not is_official_url(url) or not parts.path.startswith("/files/"):
        raise SourceError("Document URL does not match the official source")
    if not parts.path.lower().endswith(".pdf"):
        raise SourceError("Only published PDF advertisements are supported")
    # The government API often returns literal spaces in file names.
    # Percent-encode every path segment while preserving existing percent escapes.
    encoded = quote(parts.path, safe="/%")
    return urlunsplit((parts.scheme, parts.netloc, encoded, parts.query, ""))


def read_public_bytes(url: str, limit: int, expected_type: str) -> bytes:
    if not is_official_url(url):
        raise SourceError("External-source requests are prohibited")
    request = Request(
        url, headers={
            "Accept": "application/pdf" if expected_type == "pdf" else "application/json",
            "User-Agent": "CaribContractAtlas-EvidenceAgent/1.0 (read-only government research)"
        }, method="GET"
    )
    try:
        with OPENER.open(request, timeout=22) as response:
            if not is_official_url(response.url):
                raise SourceError("Source unexpectedly redirected")
            content_type = response.headers.get("Content-Type", "").lower()
            if expected_type not in content_type:
                raise SourceError("Unexpected source content type: " + content_type[:50])
            hinted = response.headers.get("Content-Length")
            if hinted and int(hinted) > limit:
                raise SourceError("Source document exceeds processing limit")
            chunks, size = [], 0
            while True:
                piece = response.read(min(65536, limit + 1 - size))
                if not piece:
                    break
                size += len(piece)
                if size > limit:
                    raise SourceError("Source exceeds maximum download size")
                chunks.append(piece)
            data = b"".join(chunks)
            if expected_type == "pdf" and not data.startswith(b"%PDF"):
                raise SourceError("Source response is not a valid PDF file")
            return data
    except (HTTPError, URLError, TimeoutError) as exc:
        raise SourceError("Official source unavailable: " + str(exc)[:100]) from exc


def public_feed() -> list[dict]:
    value = json.loads(read_public_bytes(API, MAX_FEED_BYTES, "json"))
    records = value.get("message") if isinstance(value, dict) else None
    if not isinstance(records, list) or not 1 <= len(records) <= 500:
        raise SourceError("Official API returned no validated tender array")
    return records


def normalize_tender(row: dict) -> dict:
    if not isinstance(row, dict):
        raise SourceError("Invalid tender record")
    project_id = str(row.get("project_id", "")).strip()
    if not ID_PATTERN.fullmatch(project_id):
        raise SourceError("Invalid official procurement reference")
    title = str(row.get("project_name", "")).strip()
    agency = re.sub(r"^\d{1,3}\s*-\s*", "", str(row.get("agency", "")).strip())
    if not (8 <= len(title) <= 300 and 3 <= len(agency) <= 150):
        raise SourceError("Tender identity incomplete")
    opening = str(row.get("projected_bid_opening_date") or "")[:10]
    try:
        date.fromisoformat(opening)
    except ValueError as exc:
        raise SourceError("Tender has no valid advertised bid-opening date") from exc
    documents = row.get("advertisement_documents")
    pdf = None
    if isinstance(documents, list):
        for item in documents:
            if isinstance(item, dict):
                try:
                    pdf = official_pdf_url(item.get("document_file", ""))
                    break
                except SourceError:
                    pass
    if not pdf:
        raise SourceError("Public PDF advertisement not available")
    return {
        "id": project_id,
        "title": title,
        "agency": agency,
        "advertised_opening": opening,
        "published": str(row.get("advertisement_date") or "")[:10],
        "region": ", ".join(x[:70] for x in row.get("regions", [])[:3] if isinstance(x, str))
            if isinstance(row.get("regions"), list) else "",
        "procurement_type": str(row.get("procurement_nature") or "Not reported")[:90],
        "procurement_method": str(row.get("procurement_method") or "Not reported")[:90],
        "source_url": SOURCE,
        "document_url": pdf,
    }


def select_automatic_tender(feed: list[dict], *, current: date | None = None) -> dict:
    """Select a single upcoming publicly advertised source, never a customer order."""
    today = current or datetime.now(TZ_GUYANA).date()
    candidates = []
    for row in feed:
        if not isinstance(row, dict) or row.get("current_state") not in (None, "Bid Advertised"):
            continue
        try:
            notice = normalize_tender(row)
            if business_days_until(notice["advertised_opening"], today) >= 3:
                candidates.append(notice)
        except SourceError:
            continue
    if not candidates:
        raise SourceError("No eligible future public advertisement found for scheduled sample")
    return sorted(candidates, key=lambda x: (x["advertised_opening"], x["id"]))[0]


def select_tender(feed: list[dict], tender_id: str) -> dict:
    if not ID_PATTERN.fullmatch(tender_id):
        raise SourceError("Only official PROC-YYYY-NNNNN identifiers are accepted")
    matches = [row for row in feed if isinstance(row, dict) and row.get("project_id") == tender_id]
    if len(matches) != 1:
        raise SourceError("Tender not uniquely present in current government feed")
    return normalize_tender(matches[0])


def extract_pages(pdf_bytes: bytes) -> list[str]:
    """pdfplumber is MIT licensed; only inspect first thirty accessible pages."""
    import pdfplumber  # optional outside the worker's locked dependencies
    pages = []
    with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages[:MAX_PAGES]:
            pages.append((page.extract_text(layout=False) or "")[:18000])
    return pages


def source_excerpt(text: str, match: re.Match[str]) -> str:
    start = max(0, match.start() - 70)
    end = min(len(text), match.end() + 110)
    snippet = " ".join(text[start:end].split())
    return " ".join(snippet.split()[:18])[:180]


def evidence_matrix(pages: list[str]) -> list[dict]:
    entries = []
    for name, expression, question in TOPICS:
        found = None
        for page_num, raw in enumerate(pages, start=1):
            compact = " ".join(raw.split())
            match = expression.search(compact)
            if match:
                found = {
                    "page": page_num,
                    "excerpt": source_excerpt(compact, match),
                }
                break
        entries.append({
            "topic": name,
            "status": "Reference detected; check original text" if found else "Not confirmed in accessible advertisement",
            "evidence": found,
            "question": question,
        })
    return entries


def business_days_until(value: str, current: date) -> int:
    advertised = date.fromisoformat(value)
    if advertised <= current:
        return 0
    count = 0
    day = current
    while day < advertised:
        day += timedelta(days=1)
        if day.weekday() < 5:
            count += 1
    return count


def compose_report(tender: dict, pages: list[str], *, current: date | None = None, pdf_hash: str = "") -> dict:
    today = current or datetime.now(TZ_GUYANA).date()
    extracted_chars = sum(len(p.strip()) for p in pages)
    evidence = evidence_matrix(pages)
    days = business_days_until(tender["advertised_opening"], today)
    enough_text = extracted_chars >= MIN_EXTRACTED_TEXT
    state = "candidate_needs_human_review" if enough_text else "source_text_insufficient"
    steps = [
        "Confirm the actual submission deadline, time zone and location from the complete official tender documents.",
        "Request the full bidder instructions, technical schedules and any addenda directly from the issuing agency.",
        "Prepare a requirements-by-requirements evidence register for your own organization.",
        "Verify administrative eligibility, pricing requirements, bid securities and delivery obligations only against the complete tender package.",
        "Arrange an internal go/no-go decision before committing bid preparation expenditure.",
    ]
    if days < 3:
        steps.insert(0, "Urgent timing check: advertised opening is near or past. Verify current status with the procuring agency before purchasing preparation services.")
    return {
        "brand": "CaribContract Atlas",
        "report_type": "Public advertisement evidence review, NOT a complete bidding document review",
        "tender": tender,
        "generated_on": today.isoformat(),
        "quality_gate": state,
        "business_days_to_advertised_opening": days,
        "text_characters_examined": extracted_chars,
        "pages_examined": len(pages),
        "source_sha256": pdf_hash,
        "evidence_matrix": evidence,
        "questions_for_issuer": [row["question"] for row in evidence],
        "next_steps": steps,
        "limitations": [
            "The advertised bid-opening date is NOT independently verified as the submission cutoff.",
            "Text matches are evidence-location hints, not proof of a mandatory requirement.",
            "Full tender documents, addenda and eligibility conditions may not be available in the public advertisement.",
            "No legal advice, bid submission, procurement influence, suitability certification or award guarantee is provided.",
            "An actual paid customer report requires human source verification and paid-order identity checks before delivery.",
        ],
    }


def write_artifacts(report: dict, output_dir: Path) -> tuple[Path, Path, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    ref = report["tender"]["id"]
    env = Environment(
        loader=FileSystemLoader(str(Path(__file__).parent / "templates")),
        autoescape=True,  # .html.j2 is not recognized by select_autoescape(["html"])
    )
    html = env.get_template("dossier.html.j2").render(**report)
    html_path = output_dir / f"{ref}.html"
    json_path = output_dir / f"{ref}.json"
    text_path = output_dir / f"{ref}.txt"
    html_path.write_text(html, encoding="utf-8")
    json_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    lines = [
        "CARIBCONTRACT ATLAS | PUBLIC ADVERTISEMENT REVIEW",
        f"Reference: {ref}",
        f"Tender: {report['tender']['title']}",
        f"Agency: {report['tender']['agency']}",
        f"Advertised bid opening: {report['tender']['advertised_opening']} (NOT confirmed submission deadline)",
        f"Official advertisement: {report['tender']['document_url']}",
        f"Quality gate: {report['quality_gate']}",
        "",
        "PUBLIC PDF TEXT REFERENCES, NOT DETERMINATIONS:",
    ]
    for item in report["evidence_matrix"]:
        ev = item["evidence"]
        suffix = f" (page {ev['page']}: {ev['excerpt']})" if ev else ""
        lines.append(f"- {item['topic']}: {item['status']}{suffix}")
    lines += ["", "QUESTIONS FOR THE ISSUING AUTHORITY:"]
    lines.extend("- " + question for question in report["questions_for_issuer"])
    lines += ["", "NEXT STEPS:"]
    lines.extend("- " + step for step in report["next_steps"])
    lines += ["", "LIMITATIONS:"]
    lines.extend("- " + limitation for limitation in report["limitations"])
    text_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return html_path, json_path, text_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Read-only public Guyana procurement evidence report")
    parser.add_argument("--tender-id", required=True, help="Official public PROC-YYYY-NNNNN identifier")
    parser.add_argument("--output-dir", default="output/dossiers")
    args = parser.parse_args()
    try:
        rows = public_feed()
        tender = select_automatic_tender(rows) if args.tender_id == "auto" else select_tender(rows, args.tender_id)
        pdf_bytes = read_public_bytes(tender["document_url"], MAX_PDF_BYTES, "pdf")
        pages = extract_pages(pdf_bytes)
        report = compose_report(tender, pages, pdf_hash=sha256(pdf_bytes).hexdigest())
        paths = write_artifacts(report, Path(args.output_dir))
        print(json.dumps({
            "status": report["quality_gate"], "reference": tender["id"],
            "pages_examined": report["pages_examined"],
            "evidence_topics": sum(x["evidence"] is not None for x in report["evidence_matrix"]),
            "artifacts": [str(p) for p in paths],
            "publication": "PRIVATE ACTION ARTIFACT, HUMAN SOURCE REVIEW REQUIRED",
            "payment": "NONE",
        }))
        return 0 if report["quality_gate"] == "candidate_needs_human_review" else 2
    except (SourceError, ValueError, OSError) as exc:
        print(json.dumps({"status": "SOURCE_VALIDATION_FAILED", "reason": str(exc)[:180]}), file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
