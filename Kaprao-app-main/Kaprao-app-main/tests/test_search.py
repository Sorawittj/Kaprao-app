#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
UI/UX Pro Max Test Suite - Search accuracy and regression tests.

Usage:
    python -m pytest tests/ -v
    python tests/test_search.py
"""

import sys
import os
from pathlib import Path

# Add src/scripts to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "scripts"))

from core import (
    search, search_stack, detect_domain, detect_tech_stack,
    expand_synonyms, translate_query, levenshtein_distance, fuzzy_match,
    BM25
)


class TestDomainDetection:
    """Test auto-domain detection."""
    
    def test_saas_detects_product(self):
        assert detect_domain("SaaS dashboard") == "product"
    
    def test_color_detects_color(self):
        assert detect_domain("color palette blue") == "color"
    
    def test_chart_detects_chart(self):
        assert detect_domain("bar chart comparison") == "chart"
    
    def test_font_detects_typography(self):
        assert detect_domain("font pairing serif") == "typography"
    
    def test_accessibility_detects_ux(self):
        assert detect_domain("accessibility wcag") == "ux"
    
    def test_icon_detects_icons(self):
        assert detect_domain("icon lucide heroicons") == "icons"
    
    def test_animation_detects_animations(self):
        assert detect_domain("animation framer motion") == "animations"
    
    def test_react_detects_react(self):
        assert detect_domain("react suspense memo") == "react"
    
    def test_default_to_style(self):
        assert detect_domain("something random") == "style"


class TestSearchAccuracy:
    """Test search returns relevant results."""
    
    def test_saas_returns_saas(self):
        result = search("SaaS", "product", 3)
        assert result["count"] > 0
        types = [r.get("Product Type", "").lower() for r in result["results"]]
        assert any("saas" in t for t in types)
    
    def test_ecommerce_returns_ecommerce(self):
        result = search("e-commerce shop", "product", 3)
        assert result["count"] > 0
        types = [r.get("Product Type", "").lower() for r in result["results"]]
        assert any("commerce" in t or "shop" in t for t in types)
    
    def test_healthcare_returns_healthcare(self):
        result = search("healthcare medical", "product", 3)
        assert result["count"] > 0
        types = [r.get("Product Type", "").lower() for r in result["results"]]
        assert any("health" in t for t in types)
    
    def test_glassmorphism_returns_style(self):
        result = search("glassmorphism", "style", 3)
        assert result["count"] > 0
        styles = [r.get("Style Category", "").lower() for r in result["results"]]
        assert any("glass" in s for s in styles)
    
    def test_minimalism_returns_style(self):
        result = search("minimalism clean", "style", 3)
        assert result["count"] > 0
    
    def test_serif_returns_typography(self):
        result = search("serif elegant", "typography", 3)
        assert result["count"] > 0


class TestSynonymExpansion:
    """Test synonym expansion."""
    
    def test_modern_expands(self):
        expanded = expand_synonyms("modern")
        assert "contemporary" in expanded or "sleek" in expanded
    
    def test_minimal_expands(self):
        expanded = expand_synonyms("minimal")
        assert "minimalism" in expanded or "simple" in expanded
    
    def test_luxury_expands(self):
        expanded = expand_synonyms("luxury")
        assert "premium" in expanded or "elegant" in expanded
    
    def test_unknown_word_unchanged(self):
        expanded = expand_synonyms("xyzabc123")
        assert "xyzabc123" in expanded


class TestMultiLanguage:
    """Test multi-language query translation."""
    
    def test_thai_modern(self):
        translated = translate_query("ทันสมัย")
        assert "modern" in translated
    
    def test_thai_dark(self):
        translated = translate_query("มืด")
        assert "dark" in translated
    
    def test_thai_ecommerce(self):
        translated = translate_query("ร้านค้า")
        assert "ecommerce" in translated or "shop" in translated
    
    def test_chinese_minimal(self):
        translated = translate_query("简约")
        assert "minimal" in translated
    
    def test_japanese_modern(self):
        translated = translate_query("モダン")
        assert "modern" in translated
    
    def test_english_unchanged(self):
        translated = translate_query("modern design")
        assert translated == "modern design"


class TestFuzzyMatching:
    """Test fuzzy matching for typos."""
    
    def test_levenshtein_same(self):
        assert levenshtein_distance("hello", "hello") == 0
    
    def test_levenshtein_one_char(self):
        assert levenshtein_distance("hello", "helo") == 1
    
    def test_levenshtein_two_chars(self):
        assert levenshtein_distance("hello", "hllo") == 1
    
    def test_fuzzy_finds_match(self):
        corpus = {"minimalism", "glassmorphism", "brutalism"}
        matches = fuzzy_match("minimalsm", corpus, threshold=2)
        assert len(matches) > 0
        assert matches[0][0] == "minimalism"
    
    def test_fuzzy_no_match_far(self):
        corpus = {"minimalism", "glassmorphism"}
        matches = fuzzy_match("xyz", corpus, threshold=2)
        assert len(matches) == 0


class TestBM25:
    """Test BM25 search engine."""
    
    def test_basic_search(self):
        bm25 = BM25(use_synonyms=False, use_fuzzy=False)
        docs = ["apple banana cherry", "banana date elderberry", "cherry fig grape"]
        bm25.fit(docs)
        scores = bm25.score("banana")
        # First two docs should score highest
        assert scores[0][1] > 0
    
    def test_empty_corpus(self):
        bm25 = BM25(use_synonyms=False, use_fuzzy=False)
        bm25.fit([])
        scores = bm25.score("test")
        assert len(scores) == 0
    
    def test_no_match(self):
        bm25 = BM25(use_synonyms=False, use_fuzzy=False)
        docs = ["apple banana cherry"]
        bm25.fit(docs)
        scores = bm25.score("zzzzzzz")
        assert scores[0][1] == 0


class TestStackSearch:
    """Test stack-specific search."""
    
    def test_html_tailwind_search(self):
        result = search_stack("responsive layout", "html-tailwind", 3)
        assert "error" not in result or "not found" in result.get("error", "")
    
    def test_invalid_stack(self):
        result = search_stack("test", "invalid-stack", 3)
        assert "error" in result


# ============ RUN TESTS ============
def run_tests():
    """Simple test runner without pytest."""
    test_classes = [
        TestDomainDetection,
        TestSearchAccuracy,
        TestSynonymExpansion,
        TestMultiLanguage,
        TestFuzzyMatching,
        TestBM25,
        TestStackSearch,
    ]
    
    total = 0
    passed = 0
    failed = 0
    errors = []
    
    for cls in test_classes:
        print(f"\n{cls.__name__}:")
        instance = cls()
        methods = [m for m in dir(instance) if m.startswith("test_")]
        
        for method_name in methods:
            total += 1
            try:
                getattr(instance, method_name)()
                passed += 1
                print(f"  PASS: {method_name}")
            except AssertionError as e:
                failed += 1
                errors.append(f"{cls.__name__}.{method_name}: {e}")
                print(f"  FAIL: {method_name}: {e}")
            except Exception as e:
                failed += 1
                errors.append(f"{cls.__name__}.{method_name}: {type(e).__name__}: {e}")
                print(f"  ERROR: {method_name}: {type(e).__name__}: {e}")
    
    print(f"\n{'=' * 60}")
    print(f"Results: {passed}/{total} passed, {failed} failed")
    
    if errors:
        print("\nFailures:")
        for err in errors:
            print(f"  - {err}")
    
    return failed == 0


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
