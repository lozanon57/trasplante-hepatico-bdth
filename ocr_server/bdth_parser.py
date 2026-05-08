"""
BDTH-specific field extractor from raw Tesseract OCR text.

Strategy:
  1. Normalise text (collapse whitespace, fix common OCR errors).
  2. Use section-specific regex patterns to match form labels and capture values.
  3. Return a dict matching the JSON shape expected by the React Native app
     (same keys as the Claude Vision output).

Three sections: "donante", "implante", "postoperatorio".
"""

from __future__ import annotations

import re
from typing import Any, Optional


# ── Normalisation ─────────────────────────────────────────────────────────────

def _norm(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # Fix common OCR confusion in Spanish forms
    text = re.sub(r"\bI(?=\d)", "1", text)     # I3 → 13 (OCR confusion)
    text = re.sub(r"\bO(?=\d)", "0", text)     # O3 → 03
    text = re.sub(r"(?<=[A-Za-z])0(?=[A-Za-z])", "o", text)  # c0n → con
    text = re.sub(r"\s{2,}", " ", text)
    return text.strip()


# ── Generic helpers ────────────────────────────────────────────────────────────

def _find(pattern: str, text: str, default: Any = None) -> Any:
    m = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
    return m.group(1).strip() if m else default


def _find_float(pattern: str, text: str) -> Optional[str]:
    m = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
    if not m:
        return None
    raw = m.group(1).replace(",", ".").strip()
    try:
        float(raw)
        return raw
    except ValueError:
        return None


def _find_int(pattern: str, text: str) -> Optional[str]:
    v = _find_float(pattern, text)
    if v is None:
        return None
    try:
        return str(int(float(v)))
    except ValueError:
        return None


def _yn(pattern: str, text: str) -> Optional[str]:
    """Extract Yes/No → '1'/'0'."""
    m = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
    if not m:
        return None
    raw = m.group(1).strip().lower()
    if raw in ("si", "sí", "yes", "1", "x", "✓", "[x]"):
        return "1"
    if raw in ("no", "0", "[ ]", "-"):
        return "0"
    return None


def _date(pattern: str, text: str) -> Optional[str]:
    """Extract DD/MM/YYYY."""
    m = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
    if not m:
        return None
    raw = m.group(1).strip()
    # normalise separators
    raw = re.sub(r"[.\-]", "/", raw)
    parts = raw.split("/")
    if len(parts) == 3:
        d, mo, y = parts
        if len(y) == 2:
            y = "20" + y
        return f"{d.zfill(2)}/{mo.zfill(2)}/{y}"
    return raw


# ── DONANTE parser ─────────────────────────────────────────────────────────────

def parse_donante(text: str) -> dict:
    t = _norm(text)
    return {
        "edad_donante":          _find_int(r"edad\s+donante\s*[:\-]?\s*(\d+)", t),
        "peso_donante":          _find_float(r"peso\s*[:\-]?\s*([\d,\.]+)\s*kg?", t),
        "talla_donante":         _find_float(r"talla\s*[:\-]?\s*([\d,\.]+)\s*cm?", t),
        "sexo_donante":          _find(r"sexo\s*[:\-]?\s*(hombre|mujer|h|m|masculino|femenino)", t),
        "grupo_sanguineo":       _find(r"grupo\s*(?:sanguineo|abo)\s*[:\-]?\s*([ABO]{1,3}[+-]?)", t),
        "causa_muerte":          _find(r"causa\s+(?:de\s+)?muerte\s*[:\-]?\s*([^\n]{2,50})", t),
        "tipo_donacion":         _find(r"tipo\s+donaci[oó]n\s*[:\-]?\s*([^\n]{2,40})", t),
        "fecha_extraccion":      _date(r"fecha\s+extracci[oó]n\s*[:\-]?\s*([\d/\.\-]{6,10})", t),
        "hta":                   _yn(r"HTA\s*[:\-]?\s*(si|no|s[íi]|1|0)", t),
        "diabetes":              _yn(r"diabetes\s*[:\-]?\s*(si|no|s[íi]|1|0)", t),
        "enolismo":              _yn(r"enolismo\s*[:\-]?\s*(si|no|s[íi]|1|0)", t),
        "sodio":                 _find_float(r"sodio\s+basal\s*[:\-]?\s*([\d,\.]+)", t),
        "creatinina_basal":      _find_float(r"creatinina\s+basal\s*[:\-]?\s*([\d,\.]+)", t),
        "alt_basal":             _find_float(r"ALT\s+basal\s*[:\-]?\s*([\d,\.]+)", t),
        "ast_basal":             _find_float(r"AST\s+basal\s*[:\-]?\s*([\d,\.]+)", t),
        "ggt_basal":             _find_float(r"GGT\s+basal\s*[:\-]?\s*([\d,\.]+)", t),
        "bilirrubina_basal":     _find_float(r"bili(?:rrubina)?\s+basal\s*[:\-]?\s*([\d,\.]+)", t),
        "inr_basal":             _find_float(r"INR\s+basal\s*[:\-]?\s*([\d,\.]+)", t),
        "ph_basal":              _find_float(r"pH\s+basal\s*[:\-]?\s*([\d,\.]+)", t),
        "lactato_basal":         _find_float(r"lactato\s+basal\s*[:\-]?\s*([\d,\.]+)", t),
        "twit":                  _find_int(r"TWIT\s*[:\-]?\s*(\d+)", t),
        "fwit":                  _find_int(r"FWIT\s*[:\-]?\s*(\d+)", t),
        "organox":               _yn(r"organox\s*[:\-]?\s*(si|no|s[íi]|1|0)", t),
        "bilis_2h":              _find_float(r"bilis\s+2h?\s*[:\-]?\s*([\d,\.]+)", t),
        "esteatosis":            _find_int(r"esteatosis\s*[:\-]?\s*(\d+)\s*%?", t),
    }


# ── IMPLANTE parser ────────────────────────────────────────────────────────────

def parse_implante(text: str) -> dict:
    t = _norm(text)
    return {
        "edad_receptor":         _find_int(r"edad\s+receptor\s*[:\-]?\s*(\d+)", t),
        "peso_receptor":         _find_float(r"peso\s+receptor\s*[:\-]?\s*([\d,\.]+)", t),
        "hepatopatia":           _find(r"hepatopat[íi]a\s*[:\-]?\s*([^\n]{2,60})", t),
        "meld":                  _find_int(r"MELD\s*[:\-]?\s*(\d+)", t),
        "creatinina_receptor":   _find_float(r"creatinina\s+receptor\s*[:\-]?\s*([\d,\.]+)", t),
        "bilirrubina_receptor":  _find_float(r"bilirrubina\s+receptor\s*[:\-]?\s*([\d,\.]+)", t),
        "inr_receptor":          _find_float(r"INR\s+receptor\s*[:\-]?\s*([\d,\.]+)", t),
        "tecnica_implante":      _find(r"t[eé]cnica\s*[:\-]?\s*([^\n]{2,60})", t),
        "tiempo_isquemia_fria":  _find_int(r"isquemia\s+fr[íi]a\s*[:\-]?\s*(\d+)", t),
        "tiempo_isquemia_caliente": _find_int(r"isquemia\s+caliente\s*[:\-]?\s*(\d+)", t),
        "flujo_portal":          _find_float(r"flujo\s+portal\s*[:\-]?\s*([\d,\.]+)", t),
        "flujo_arterial":        _find_float(r"flujo\s+arterial\s*[:\-]?\s*([\d,\.]+)", t),
        "hope":                  _yn(r"HOPE\s*[:\-]?\s*(si|no|s[íi]|1|0)", t),
        "tiempo_hope":           _find_int(r"tiempo\s+HOPE\s*[:\-]?\s*(\d+)", t),
        "sindrome_reperfusion":  _yn(r"s[íi]ndrome\s+reperfusi[oó]n\s*[:\-]?\s*(si|no|s[íi]|1|0)", t),
        "bilis_reperfusion":     _find_float(r"bilis\s+reperfusi[oó]n\s*[:\-]?\s*([\d,\.]+)", t),
    }


# ── POSTOPERATORIO parser ──────────────────────────────────────────────────────

def parse_postoperatorio(text: str) -> dict:
    t = _norm(text)
    return {
        "alt_pico":              _find_float(r"ALT\s+pico\s*[:\-]?\s*([\d,\.]+)", t),
        "ast_pico":              _find_float(r"AST\s+pico\s*[:\-]?\s*([\d,\.]+)", t),
        "ggt_pico":              _find_float(r"GGT\s+pico\s*[:\-]?\s*([\d,\.]+)", t),
        "bilirrubina_pico":      _find_float(r"bili(?:rrubina)?\s+pico\s*[:\-]?\s*([\d,\.]+)", t),
        "inr_pico":              _find_float(r"INR\s+pico\s*[:\-]?\s*([\d,\.]+)", t),
        "creatinina_pico":       _find_float(r"creatinina\s+pico\s*[:\-]?\s*([\d,\.]+)", t),
        "disfuncion_primaria":   _find(r"disfunci[oó]n\s+primaria\s*[:\-]?\s*([^\n]{2,40})", t),
        "complicaciones_qx":     _find(r"complicaciones\s+(?:quir[uú]rgicas)?\s*[:\-]?\s*([^\n]{2,100})", t),
        "clavien_dindo":         _find_int(r"clavien(?:\s*[-]?\s*dindo)?\s*[:\-]?\s*(\d+)", t),
        "estancia_uci":          _find_int(r"estancia\s+UCI\s*[:\-]?\s*(\d+)", t),
        "estancia_total":        _find_int(r"estancia\s+total\s*[:\-]?\s*(\d+)", t),
        "fecha_alta":            _date(r"fecha\s+alta\s*[:\-]?\s*([\d/\.\-]{6,10})", t),
        "exitus_30d":            _yn(r"[eé]xitus\s+30\s*d\s*[:\-]?\s*(si|no|s[íi]|1|0)", t),
        "exitus_7d":             _yn(r"[eé]xitus\s+7\s*d\s*[:\-]?\s*(si|no|s[íi]|1|0)", t),
        "retrasplante":          _yn(r"retrasplante\s*[:\-]?\s*(si|no|s[íi]|1|0)", t),
        "perdida_injerto":       _yn(r"p[eé]rdida\s+injerto\s*[:\-]?\s*(si|no|s[íi]|1|0)", t),
        "trombosis_arterial":    _yn(r"trombosis\s+arterial\s*[:\-]?\s*(si|no|s[íi]|1|0)", t),
        "colangiopatia":         _yn(r"colangiopat[íi]a\s*[:\-]?\s*(si|no|s[íi]|1|0)", t),
    }


# ── Dispatcher ────────────────────────────────────────────────────────────────

def parse(text: str, seccion: str) -> dict:
    """
    seccion: "donante" | "implante" | "postoperatorio"
    Returns dict with only non-None values (same contract as Claude Vision output).
    """
    parsers = {
        "donante":         parse_donante,
        "implante":        parse_implante,
        "postoperatorio":  parse_postoperatorio,
    }
    fn = parsers.get(seccion.lower())
    if fn is None:
        return {}
    raw = fn(text)
    return {k: v for k, v in raw.items() if v is not None}
