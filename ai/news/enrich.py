"""Deterministic keyword-based enrichment for news items.

No LLM is wired in — this module is the sole implementation behind
POST /news/enrich. It never invents content: the summary comes from the
source text, and crop / disease / category are tagged by keyword matching.

Rules (keywords, CNN disease classes, scoring) live in keywords.json, the
single source of truth also read by the Laravel fallback
(backend/app/Services/News/NewsAiClient.php), so both layers always agree.

Matching is on WHOLE WORDS and accent-sensitive: « blé » does not match
« possible », « maïs » does not match the conjunction « mais ». A trailing
« s » / « x » is tolerated for plurals, and longer expressions are tried
first (« pomme de terre » before « pomme »).
"""

import html
import json
import re
from pathlib import Path

_TAG_RE = re.compile(r"<[^>]+>")
MAX_SUMMARY_LENGTH = 280

with open(Path(__file__).with_name("keywords.json"), encoding="utf-8") as _fh:
    RULES = json.load(_fh)


def _pattern(keyword: str) -> re.Pattern:
    # (?<!\w) / (?!\w) : bornes de mot Unicode (lettres accentuées comprises).
    return re.compile(r"(?<!\w)" + re.escape(keyword.lower()) + r"(?:s|x)?(?!\w)")


def _longest_first(pairs):
    return sorted(pairs, key=lambda pair: len(pair[0]), reverse=True)


# (mot-clé, culture), expressions les plus longues d'abord.
_CROP_PATTERNS = [
    (_pattern(kw), crop)
    for kw, crop in _longest_first([(kw, crop) for crop, kws in RULES["crops"].items() for kw in kws])
]

# (mot-clé, {culture: classe CNN}), expressions les plus longues d'abord.
_DISEASE_PATTERNS = [
    (_pattern(kw), classes)
    for kw, classes in _longest_first([(kw, rule["classes"]) for rule in RULES["diseases"] for kw in rule["keywords"]])
]

_CATEGORY_PATTERNS = [
    (category, [_pattern(kw) for kw in kws]) for category, kws in RULES["categories"].items()
]

_AGRI_PATTERNS = [_pattern(kw) for kw in RULES["agri_context"]]


def _find_crop(haystack: str) -> str | None:
    for pattern, crop in _CROP_PATTERNS:
        if pattern.search(haystack):
            return crop
    return None


def _find_disease(haystack: str, crop: str | None) -> str | None:
    """Classe CNN exacte (ex. « Tomato__late_blight ») ou None.

    Une maladie n'est retenue que si la culture est connue ET que le CNN
    possède cette maladie pour cette culture : on ne fabrique jamais de
    classe inexistante (« tomato__virus », « wheat__rust »…).
    """
    if not crop:
        return None
    for pattern, classes in _DISEASE_PATTERNS:
        if crop in classes and pattern.search(haystack):
            return classes[crop]
    return None


def _find_category(haystack: str) -> str:
    for category, patterns in _CATEGORY_PATTERNS:
        if any(p.search(haystack) for p in patterns):
            return category
    return "info"


def _score(agri: bool, crop: str | None, disease_class: str | None, category: str) -> float:
    s = RULES["scoring"]
    score = s["base"]
    if agri or crop or disease_class:
        score += s["agri_signal"]
        if crop:
            score += s["crop"]
        if disease_class:
            score += s["disease"]
        if category != "info":
            score += s["category"]
    return round(min(score, s["max"]), 2)


def _clean_text(text: str) -> str:
    """RSS descriptions (Google News in particular) often embed raw HTML
    (e.g. an <a> wrapped snippet) and HTML entities — strip both so neither
    leaks into the summary shown to users."""
    text = _TAG_RE.sub(" ", text)
    text = html.unescape(text)
    return " ".join(text.split())


def _summarize(title: str, description: str) -> str:
    text = _clean_text(description or title)
    if not text:
        text = _clean_text(title)
    if len(text) <= MAX_SUMMARY_LENGTH:
        return text
    return text[: MAX_SUMMARY_LENGTH - 1].rsplit(" ", 1)[0] + "…"


def enrich(title: str, description: str, link: str) -> dict:
    haystack = _clean_text(f"{title} {description}").lower()

    crop = _find_crop(haystack)
    disease_class = _find_disease(haystack, crop)
    category = _find_category(haystack)
    agri = any(p.search(haystack) for p in _AGRI_PATTERNS)

    return {
        "summary": _summarize(title, description),
        "category": category,
        "crop": crop,
        "disease_class": disease_class,
        "relevance_score": _score(agri, crop, disease_class, category),
    }
