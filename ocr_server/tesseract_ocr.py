"""
Tesseract OCR with image preprocessing for handwritten Spanish medical forms.
Preprocessing pipeline: grayscale → deskew → threshold → denoise.
"""

from __future__ import annotations

import pytesseract
from PIL import Image, ImageFilter, ImageOps, ImageEnhance
import io
import math
import numpy as np
from typing import List, Optional


# Tesseract config tuned for mixed print+handwrite Spanish forms
_TESS_CONFIG = "--oem 3 --psm 3 -l spa+eng"
_TESS_CONFIG_SINGLE_LINE = "--oem 3 --psm 7 -l spa+eng"


def _to_grayscale(img: Image.Image) -> Image.Image:
    return img.convert("L")


def _enhance_contrast(img: Image.Image) -> Image.Image:
    return ImageEnhance.Contrast(img).enhance(2.0)


def _sharpen(img: Image.Image) -> Image.Image:
    return img.filter(ImageFilter.SHARPEN)


def _threshold(img: Image.Image, value: int = 150) -> Image.Image:
    """Simple binary threshold to improve OCR on degraded scans."""
    return img.point(lambda p: 255 if p > value else 0)


def _deskew(img: Image.Image) -> Image.Image:
    """Rotate image to correct skew using projection profile."""
    try:
        data = np.array(img)
        # Only attempt deskew if numpy is available and image has content
        angles = range(-10, 11)
        best_angle = 0
        best_score = -1
        for angle in angles:
            rotated = img.rotate(angle, expand=True, fillcolor=255)
            row_sums = np.sum(np.array(rotated) < 128, axis=1)
            score = float(np.var(row_sums))
            if score > best_score:
                best_score = score
                best_angle = angle
        if best_angle != 0:
            return img.rotate(best_angle, expand=True, fillcolor=255)
    except Exception:
        pass
    return img


def preprocess(img: Image.Image) -> Image.Image:
    img = _to_grayscale(img)
    img = _enhance_contrast(img)
    img = _sharpen(img)
    img = _deskew(img)
    img = _threshold(img)
    return img


def image_to_text(img: Image.Image, single_line: bool = False) -> str:
    processed = preprocess(img)
    config = _TESS_CONFIG_SINGLE_LINE if single_line else _TESS_CONFIG
    text = pytesseract.image_to_string(processed, config=config)
    return text.strip()


def image_bytes_to_text(image_bytes: bytes, single_line: bool = False) -> str:
    img = Image.open(io.BytesIO(image_bytes))
    return image_to_text(img, single_line=single_line)


def image_to_data(img: Image.Image) -> List[dict]:
    """Return word-level bounding boxes and confidence scores."""
    processed = preprocess(img)
    data = pytesseract.image_to_data(
        processed,
        config=_TESS_CONFIG,
        output_type=pytesseract.Output.DICT,
    )
    results = []
    for i, word in enumerate(data["text"]):
        if word.strip() and int(data["conf"][i]) > 0:
            results.append({
                "text": word,
                "conf": int(data["conf"][i]),
                "x": data["left"][i],
                "y": data["top"][i],
                "w": data["width"][i],
                "h": data["height"][i],
            })
    return results
