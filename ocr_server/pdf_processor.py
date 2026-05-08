"""
PDF → image conversion using PyMuPDF.
Returns a list of PIL Images, one per page, at 300 DPI.
"""

import fitz  # PyMuPDF
from PIL import Image
import io
from typing import List


DPI = 300
_MAT = fitz.Matrix(DPI / 72, DPI / 72)


def pdf_bytes_to_images(pdf_bytes: bytes) -> List[Image.Image]:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    images: List[Image.Image] = []
    for page in doc:
        pix = page.get_pixmap(matrix=_MAT, colorspace=fitz.csRGB)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        images.append(img)
    doc.close()
    return images


def pdf_bytes_to_image_bytes_list(pdf_bytes: bytes) -> List[bytes]:
    """Return each page as PNG bytes."""
    result: List[bytes] = []
    for img in pdf_bytes_to_images(pdf_bytes):
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        result.append(buf.getvalue())
    return result
