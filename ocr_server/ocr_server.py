"""
BDTH Offline OCR Server — FastAPI
Exposes a single /ocr endpoint that accepts a base64-encoded image or PDF,
runs Tesseract, detects/redacts PII, parses BDTH fields, and returns JSON.

Usage:
  uvicorn ocr_server:app --host 0.0.0.0 --port 8765 --reload
"""

from __future__ import annotations

import base64
import io
import logging
from typing import Dict, List, Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from pdf_processor import pdf_bytes_to_image_bytes_list
from tesseract_ocr import image_bytes_to_text
from pii_detector import detect_and_redact, extract_clinical_entities
from bdth_parser import parse

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger("bdth-ocr")

app = FastAPI(title="BDTH Offline OCR", version="1.0.0")

# Allow connections from local network only (same as Express server)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|localhost|127\.0\.0\.1)",
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


class OCRRequest(BaseModel):
    image_base64: str                          # base64-encoded PNG/JPEG/PDF
    media_type: str = "image/jpeg"             # "image/jpeg", "image/png", "application/pdf"
    seccion: Literal["donante", "implante", "postoperatorio"] = "donante"
    redact_pii: bool = True


class OCRResponse(BaseModel):
    ok: bool
    seccion: str
    fields: Dict                               # parsed BDTH fields
    raw_text: str                              # OCR text after PII redaction
    found_pii: List[str]                       # list of redacted PII tokens
    clinical_entities: List[Dict]              # openmed entities (best-effort)
    confidence: str                            # "high" | "medium" | "low"


@app.get("/status")
def status():
    return {"ok": True, "service": "BDTH Offline OCR", "version": "1.0.0"}


@app.post("/ocr", response_model=OCRResponse)
def run_ocr(req: OCRRequest):
    # ── Decode ────────────────────────────────────────────────────────────────
    try:
        raw_bytes = base64.b64decode(req.image_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="image_base64 is not valid base64")

    # ── PDF → images ──────────────────────────────────────────────────────────
    if req.media_type == "application/pdf":
        try:
            image_pages = pdf_bytes_to_image_bytes_list(raw_bytes)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"PDF processing failed: {e}")
        if not image_pages:
            raise HTTPException(status_code=422, detail="PDF has no pages")
        # OCR all pages and join (BDTH forms are 1 page per section)
        texts = []
        for page_bytes in image_pages:
            texts.append(image_bytes_to_text(page_bytes))
        ocr_text = "\n\n".join(texts)
    else:
        # ── Image OCR ─────────────────────────────────────────────────────────
        try:
            ocr_text = image_bytes_to_text(raw_bytes)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"OCR failed: {e}")

    log.info("OCR done — %d chars, section=%s", len(ocr_text), req.seccion)

    # ── PII detection ─────────────────────────────────────────────────────────
    found_pii: list[str] = []
    if req.redact_pii:
        pii_result = detect_and_redact(ocr_text)
        ocr_text = pii_result["redacted_text"]
        found_pii = pii_result["found_pii"]
        if found_pii:
            log.warning("PII detected and redacted: %s", found_pii)

    # ── Clinical entity extraction (async-safe best-effort) ───────────────────
    clinical_entities = extract_clinical_entities(ocr_text)

    # ── BDTH field parsing ────────────────────────────────────────────────────
    fields = parse(ocr_text, req.seccion)

    # ── Confidence heuristic ──────────────────────────────────────────────────
    n_fields = len(fields)
    confidence = "high" if n_fields >= 8 else ("medium" if n_fields >= 3 else "low")

    return OCRResponse(
        ok=True,
        seccion=req.seccion,
        fields=fields,
        raw_text=ocr_text,
        found_pii=found_pii,
        clinical_entities=[dict(e) for e in clinical_entities],
        confidence=confidence,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ocr_server:app", host="0.0.0.0", port=8765, reload=False)
