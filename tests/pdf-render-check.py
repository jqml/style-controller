"""Render and validate the PDFs produced by pdf-export-obsidian.mjs (PyMuPDF)."""
import json
from collections import Counter
import re
import sys
from pathlib import Path

import fitz

folder = Path(sys.argv[1])
report = {}
for mode in ["off", "on", *(["dark"] if (folder / "chemistry-dark.pdf").exists() else []), "fixture"]:
    document = fitz.open(folder / f"chemistry-{mode}.pdf")
    text = "".join(page.get_text() for page in document)
    assert len(document) > 1, "Expected a real multi-page PDF"
    images = sum(len(page.get_images()) for page in document)
    assert images == (1 if mode == "fixture" else 7), (mode, images)
    for index, page in enumerate(document):
        page.get_pixmap(matrix=fitz.Matrix(1.25, 1.25)).save(folder / f"{mode}-page-{index+1}.png")
        for block in page.get_text("dict")["blocks"]:
            if block["type"] != 0:
                continue
            for line in block["lines"]:
                x0, y0, x1, y1 = line["bbox"]
                assert x0 >= -1 and y0 >= -1 and x1 <= page.rect.width + 1 and y1 <= page.rect.height + 1, (mode, index, line)
    if mode == "fixture":
        title_page = next(index for index, page in enumerate(document) if "PDF callout" in page.get_text())
        body_page = next(index for index, page in enumerate(document) if "Callout content remains readable." in page.get_text())
        assert title_page == body_page, "Short callout title orphaned from its body"
        for row in range(1, 91):
            assert f"ROW{row:03}" in text, row
        for line in range(1, 81):
            assert f"CODE{line:03}" in text, line
        for sentinel in ["PDF COMPLETENESS SENTINEL 038", "Footnote content sentinel.", "Callout content remains readable.", "Nested item"]:
            assert sentinel in text, sentinel
        lines = [line for page in document for block in page.get_text("dict")["blocks"] if block["type"] == 0 for line in block["lines"]]
        for level, css_size in enumerate([42, 27, 25, 23, 21, 20], 1):
            assert f"Heading level {level}" in text
            heading = next(line["spans"][0] for line in lines if "".join(span["text"] for span in line["spans"]) == f"Heading level {level}")
            assert abs(heading["size"] - css_size * 0.75) < 0.01, (level, heading)
    if mode == "on":
        spans = [span for page in document for block in page.get_text("dict")["blocks"] if block["type"] == 0 for line in block["lines"] for span in line["spans"]]
        title = next(span for span in spans if "Experiment A" in span["text"])
        lines = [line for page in document for block in page.get_text("dict")["blocks"] if block["type"] == 0 for line in block["lines"]]
        # Chromium can subset variable system fonts into several Type3 spans.
        abstract = next(line["spans"][0] for line in lines if "".join(span["text"] for span in line["spans"]) == "Abstract")
        student = next(line["spans"][0] for line in lines if "Student: Enming Kang" in "".join(span["text"] for span in line["spans"]))
        assert abs(title["size"] - 30) < 0.01, title
        assert abs(abstract["size"] - 18.75) < 0.01, abstract
        assert abstract["color"] == 0x08005C
        assert abs(student["size"] - 17.25) < 0.01, student
        assert student["color"] == 0x046C06
    for page in document:
        for image in page.get_image_info():
            x0, y0, x1, y1 = image["bbox"]
            assert x0 >= -1 and y0 >= -1 and x1 <= page.rect.width + 1 and y1 <= page.rect.height + 1, (mode, image["bbox"])
    report[mode] = {"pages": len(document), "images": images, "textCharacters": len(text), "allTextInsidePage": True}
    report[mode]["normalizedText"] = re.sub(r"\s+", "", text)
# PDF text extraction records MathJax glyph runs in paint order, which can
# move relative to prose when pagination changes. Verify the complete inventory.
assert Counter(report["off"]["normalizedText"]) == Counter(report["on"]["normalizedText"]), "Report content inventory changed in styled export"
for data in report.values():
    del data["normalizedText"]
(folder / "pdf-verification.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
