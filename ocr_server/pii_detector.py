"""
Medical PII detection for BDTH OCR pipeline.

Detects and redacts identifiers that must not leave the device:
  - NHC (hospital record numbers): 6-10 consecutive digits
  - DNI/NIE: 8-digit + letter patterns
  - Dates of birth in DD/MM/YYYY form (when adjacent to "nacimiento", "FN", etc.)
  - Spanish phone numbers
  - Names (heuristic: capitalised word pairs near "paciente", "nombre", etc.)

OpenMed is used to detect clinical entities (diseases, meds, anatomy) so the
parser can prioritise those tokens during field extraction.
"""

from __future__ import annotations

import re
from typing import List, TypedDict


class PIIResult(TypedDict):
    redacted_text: str
    found_pii: List[str]


class ClinicalEntity(TypedDict):
    text: str
    label: str
    score: float


# ── Regex patterns ────────────────────────────────────────────────────────────

_RE_NHC = re.compile(
    r"\b(?:NHC|nhc|N\.H\.C\.?|Historia\s+n[úu]mero?|HC|H\.C\.?)\s*[:\-]?\s*(\d{6,10})\b",
    re.IGNORECASE,
)

# Bare 7-9 digit numbers that look like NHC (no context needed if on a labelled form)
_RE_BARE_NHC = re.compile(r"\b(\d{7,9})\b")

_RE_DNI = re.compile(r"\b(\d{8}[A-Z])\b", re.IGNORECASE)

_RE_NIE = re.compile(r"\b([XYZ]\d{7}[A-Z])\b", re.IGNORECASE)

_RE_PHONE = re.compile(r"\b((?:\+34\s?)?[6789]\d{8})\b")

_RE_DOB_NEAR_LABEL = re.compile(
    r"(?:nacimiento|fecha\s+nac|F\.?N\.?|DOB)\s*[:\-]?\s*(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})",
    re.IGNORECASE,
)

_RE_NAME_NEAR_LABEL = re.compile(
    r"(?:paciente|nombre|apellidos?)\s*[:\-]?\s*([A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+(?:\s+[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]+){1,3})",
    re.IGNORECASE,
)


def _redact(text: str, pattern: re.Pattern, label: str, found: list[str]) -> str:
    def replace(m: re.Match) -> str:
        captured = m.group(1) if m.lastindex else m.group(0)
        found.append(f"{label}:{captured}")
        full = m.group(0)
        return full.replace(captured, f"[{label}_REDACTED]")
    return pattern.sub(replace, text)


def detect_and_redact(text: str) -> PIIResult:
    found: List[str] = []
    out = text
    out = _redact(out, _RE_NHC,           "NHC",   found)
    out = _redact(out, _RE_DOB_NEAR_LABEL, "DOB",   found)
    out = _redact(out, _RE_NAME_NEAR_LABEL,"NAME",  found)
    out = _redact(out, _RE_DNI,            "DNI",   found)
    out = _redact(out, _RE_NIE,            "NIE",   found)
    out = _redact(out, _RE_PHONE,          "PHONE", found)
    # Bare NHC-like numbers only if we haven't already matched them in context
    if not any(f.startswith("NHC:") for f in found):
        out = _redact(out, _RE_BARE_NHC, "NHC?", found)
    return PIIResult(redacted_text=out, found_pii=found)


# ── OpenMed clinical entity extraction (best-effort, no crash on failure) ─────

_openmed_available = False
try:
    import openmed as _om
    _openmed_available = True
except ImportError:
    pass


def extract_clinical_entities(text: str) -> List[ClinicalEntity]:
    """
    Run OpenMed disease-detection NER on text.
    Returns empty list if model unavailable or text is too short.
    Model is downloaded on first call (~400 MB) and cached by HuggingFace.
    """
    if not _openmed_available or len(text) < 20:
        return []
    try:
        result = _om.analyze_text(
            text,
            model_name="disease_detection_superclinical",
            confidence_threshold=0.6,
            output_format="dict",
        )
        entities: list[ClinicalEntity] = []
        raw = result if isinstance(result, list) else getattr(result, "predictions", [])
        for ent in raw:
            entities.append(ClinicalEntity(
                text=ent.get("word", ent.get("text", "")),
                label=ent.get("entity_group", ent.get("entity", "")),
                score=float(ent.get("score", 0.0)),
            ))
        return entities
    except Exception:
        return []
