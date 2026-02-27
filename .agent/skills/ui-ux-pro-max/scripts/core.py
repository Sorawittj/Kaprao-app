#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
UI/UX Pro Max Core v2.0 - Enhanced BM25 search engine with synonym expansion,
fuzzy matching, and multi-language support.
"""

import csv
import re
import json
from pathlib import Path
from math import log
from collections import defaultdict

# ============ CONFIGURATION ============
DATA_DIR = Path(__file__).parent.parent / "data"
MAX_RESULTS = 3

CSV_CONFIG = {
    "style": {
        "file": "styles.csv",
        "search_cols": ["Style Category", "Keywords", "Best For", "Type", "AI Prompt Keywords"],
        "output_cols": ["Style Category", "Type", "Keywords", "Primary Colors", "Effects & Animation", "Best For", "Performance", "Accessibility", "Framework Compatibility", "Complexity", "AI Prompt Keywords", "CSS/Technical Keywords", "Implementation Checklist", "Design System Variables"]
    },
    "color": {
        "file": "colors.csv",
        "search_cols": ["Product Type", "Notes"],
        "output_cols": ["Product Type", "Primary (Hex)", "Secondary (Hex)", "CTA (Hex)", "Background (Hex)", "Text (Hex)", "Notes"]
    },
    "chart": {
        "file": "charts.csv",
        "search_cols": ["Data Type", "Keywords", "Best Chart Type", "Accessibility Notes"],
        "output_cols": ["Data Type", "Keywords", "Best Chart Type", "Secondary Options", "Color Guidance", "Accessibility Notes", "Library Recommendation", "Interactive Level"]
    },
    "landing": {
        "file": "landing.csv",
        "search_cols": ["Pattern Name", "Keywords", "Conversion Optimization", "Section Order"],
        "output_cols": ["Pattern Name", "Keywords", "Section Order", "Primary CTA Placement", "Color Strategy", "Conversion Optimization"]
    },
    "product": {
        "file": "products.csv",
        "search_cols": ["Product Type", "Keywords", "Primary Style Recommendation", "Key Considerations"],
        "output_cols": ["Product Type", "Keywords", "Primary Style Recommendation", "Secondary Styles", "Landing Page Pattern", "Dashboard Style (if applicable)", "Color Palette Focus"]
    },
    "ux": {
        "file": "ux-guidelines.csv",
        "search_cols": ["Category", "Issue", "Description", "Platform"],
        "output_cols": ["Category", "Issue", "Platform", "Description", "Do", "Don't", "Code Example Good", "Code Example Bad", "Severity"]
    },
    "typography": {
        "file": "typography.csv",
        "search_cols": ["Font Pairing Name", "Category", "Mood/Style Keywords", "Best For", "Heading Font", "Body Font"],
        "output_cols": ["Font Pairing Name", "Category", "Heading Font", "Body Font", "Mood/Style Keywords", "Best For", "Google Fonts URL", "CSS Import", "Tailwind Config", "Notes"]
    },
    "icons": {
        "file": "icons.csv",
        "search_cols": ["Category", "Icon Name", "Keywords", "Best For"],
        "output_cols": ["Category", "Icon Name", "Keywords", "Library", "Import Code", "Usage", "Best For", "Style"]
    },
    "components": {
        "file": "components.csv",
        "search_cols": ["Component Name", "Category", "Keywords", "Description"],
        "output_cols": ["Component Name", "Category", "Keywords", "Description", "Variants", "Accessibility", "Animation", "Best Practices", "Anti-Patterns"]
    },
    "animations": {
        "file": "animations.csv",
        "search_cols": ["Animation Name", "Category", "Keywords", "Style Match"],
        "output_cols": ["Animation Name", "Category", "Keywords", "CSS Code", "Framer Motion", "GSAP", "Style Match", "Duration", "Easing", "Performance"]
    },
    "react": {
        "file": "react-performance.csv",
        "search_cols": ["Category", "Issue", "Keywords", "Description"],
        "output_cols": ["Category", "Issue", "Platform", "Description", "Do", "Don't", "Code Example Good", "Code Example Bad", "Severity"]
    },
    "web": {
        "file": "web-interface.csv",
        "search_cols": ["Category", "Issue", "Keywords", "Description"],
        "output_cols": ["Category", "Issue", "Platform", "Description", "Do", "Don't", "Code Example Good", "Code Example Bad", "Severity"]
    }
}

STACK_CONFIG = {
    "html-tailwind": {"file": "stacks/html-tailwind.csv"},
    "react": {"file": "stacks/react.csv"},
    "nextjs": {"file": "stacks/nextjs.csv"},
    "astro": {"file": "stacks/astro.csv"},
    "vue": {"file": "stacks/vue.csv"},
    "nuxtjs": {"file": "stacks/nuxtjs.csv"},
    "nuxt-ui": {"file": "stacks/nuxt-ui.csv"},
    "svelte": {"file": "stacks/svelte.csv"},
    "swiftui": {"file": "stacks/swiftui.csv"},
    "react-native": {"file": "stacks/react-native.csv"},
    "flutter": {"file": "stacks/flutter.csv"},
    "shadcn": {"file": "stacks/shadcn.csv"},
    "jetpack-compose": {"file": "stacks/jetpack-compose.csv"}
}

# Common columns for all stacks
_STACK_COLS = {
    "search_cols": ["Category", "Guideline", "Description", "Do", "Don't"],
    "output_cols": ["Category", "Guideline", "Description", "Do", "Don't", "Code Good", "Code Bad", "Severity", "Docs URL"]
}

AVAILABLE_STACKS = list(STACK_CONFIG.keys())


# ============ SYNONYM EXPANSION (Phase 2) ============
SYNONYMS = {
    # Style synonyms
    "modern": ["contemporary", "sleek", "clean", "current", "fresh"],
    "minimal": ["minimalism", "minimalist", "simple", "clean", "sparse", "less-is-more"],
    "elegant": ["sophisticated", "refined", "graceful", "luxurious", "premium", "classy"],
    "playful": ["fun", "whimsical", "cheerful", "vibrant", "energetic", "lively"],
    "professional": ["corporate", "business", "formal", "enterprise", "serious"],
    "dark": ["dark-mode", "night", "oled", "dark-theme", "moody"],
    "light": ["light-mode", "bright", "white", "airy", "clean"],
    "bold": ["strong", "impactful", "powerful", "dramatic", "striking"],
    "soft": ["gentle", "subtle", "muted", "pastel", "calm", "soothing"],
    "retro": ["vintage", "nostalgic", "classic", "old-school", "throwback"],
    "futuristic": ["sci-fi", "cyber", "tech", "neon", "space-age"],
    "organic": ["natural", "earthy", "botanical", "eco", "green"],
    "luxury": ["premium", "high-end", "exclusive", "opulent", "lavish"],
    "glassmorphism": ["glass", "frosted", "blur", "translucent", "transparent"],
    "neumorphism": ["soft-ui", "embossed", "raised", "inset", "3d-soft"],
    "brutalism": ["raw", "unpolished", "anti-design", "punk", "grunge"],
    
    # Product synonyms
    "saas": ["software", "app", "platform", "tool", "service", "cloud"],
    "ecommerce": ["e-commerce", "shop", "store", "marketplace", "retail", "buy", "sell"],
    "dashboard": ["admin", "panel", "analytics", "metrics", "data", "monitoring"],
    "landing": ["homepage", "marketing", "promo", "launch", "hero"],
    "portfolio": ["showcase", "gallery", "work", "projects", "personal"],
    "blog": ["article", "post", "news", "content", "magazine", "journal"],
    
    # Color synonyms
    "blue": ["azure", "navy", "cobalt", "cerulean", "indigo", "sapphire"],
    "red": ["crimson", "scarlet", "ruby", "cherry", "vermillion"],
    "green": ["emerald", "sage", "mint", "forest", "lime", "olive"],
    "purple": ["violet", "lavender", "plum", "amethyst", "mauve"],
    "orange": ["amber", "tangerine", "coral", "peach", "apricot"],
    "pink": ["rose", "blush", "magenta", "fuchsia", "salmon"],
    
    # Typography synonyms
    "serif": ["traditional", "classic", "editorial", "newspaper", "book"],
    "sans-serif": ["sans", "modern", "clean", "geometric", "grotesk"],
    "monospace": ["mono", "code", "terminal", "developer", "typewriter"],
    "handwritten": ["script", "cursive", "calligraphy", "brush", "hand-lettered"],
}

# Reverse synonym map for quick lookup
_REVERSE_SYNONYMS = {}
for key, values in SYNONYMS.items():
    for v in values:
        if v not in _REVERSE_SYNONYMS:
            _REVERSE_SYNONYMS[v] = set()
        _REVERSE_SYNONYMS[v].add(key)
    if key not in _REVERSE_SYNONYMS:
        _REVERSE_SYNONYMS[key] = set()
    for v in values:
        _REVERSE_SYNONYMS[key].add(v)


# ============ MULTI-LANGUAGE SUPPORT (Phase 4) ============
LANGUAGE_MAP = {
    # Thai keywords
    "สวย": "beautiful elegant",
    "เรียบ": "minimal clean simple",
    "หรู": "luxury premium elegant",
    "ทันสมัย": "modern contemporary",
    "มืด": "dark dark-mode",
    "สว่าง": "light bright",
    "สี": "color palette",
    "ฟอนต์": "font typography",
    "ปุ่ม": "button cta",
    "หน้าแรก": "landing homepage hero",
    "แดชบอร์ด": "dashboard admin panel",
    "ร้านค้า": "ecommerce shop store",
    "สุขภาพ": "healthcare medical health",
    "อาหาร": "food restaurant",
    "การศึกษา": "education learning",
    "เกม": "gaming game",
    "การเงิน": "fintech finance banking",
    "ท่องเที่ยว": "travel tourism",
    "อสังหา": "real-estate property",
    "ความงาม": "beauty spa wellness",
    "เทคโนโลยี": "technology tech startup",
    "แอนิเมชัน": "animation motion",
    "ไอคอน": "icon icons svg",
    "ตาราง": "table grid data",
    "ฟอร์ม": "form input",
    "การ์ด": "card component",
    "เมนู": "navbar menu navigation",
    
    # Chinese keywords
    "美观": "beautiful elegant",
    "简约": "minimal clean simple",
    "奢华": "luxury premium",
    "现代": "modern contemporary",
    "暗色": "dark dark-mode",
    "配色": "color palette",
    "字体": "font typography",
    "按钮": "button cta",
    "首页": "landing homepage",
    "仪表盘": "dashboard admin",
    "电商": "ecommerce shop",
    "医疗": "healthcare medical",
    "教育": "education learning",
    "游戏": "gaming game",
    "金融": "fintech finance",
    "动画": "animation motion",
    "图标": "icon icons",
    
    # Japanese keywords
    "美しい": "beautiful elegant",
    "シンプル": "minimal clean simple",
    "高級": "luxury premium",
    "モダン": "modern contemporary",
    "ダーク": "dark dark-mode",
    "カラー": "color palette",
    "フォント": "font typography",
    "ボタン": "button cta",
    "ランディング": "landing homepage",
    "ダッシュボード": "dashboard admin",
    "ショップ": "ecommerce shop",
    "ゲーム": "gaming game",
    "アニメーション": "animation motion",
    "アイコン": "icon icons",
}


def translate_query(query: str) -> str:
    """Translate non-English keywords to English equivalents."""
    translated = query
    for foreign, english in LANGUAGE_MAP.items():
        if foreign in translated:
            translated = translated.replace(foreign, english)
    return translated


def expand_synonyms(query: str) -> str:
    """Expand query with synonym terms for better recall."""
    words = query.lower().split()
    expanded = set(words)
    
    for word in words:
        # Direct synonym lookup
        if word in SYNONYMS:
            expanded.update(SYNONYMS[word][:3])  # Add top 3 synonyms
        # Reverse synonym lookup
        if word in _REVERSE_SYNONYMS:
            expanded.update(list(_REVERSE_SYNONYMS[word])[:2])  # Add top 2 reverse
    
    return " ".join(expanded)


# ============ FUZZY MATCHING (Phase 2) ============
def levenshtein_distance(s1: str, s2: str) -> int:
    """Calculate Levenshtein distance between two strings."""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    
    prev_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        curr_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = prev_row[j + 1] + 1
            deletions = curr_row[j] + 1
            substitutions = prev_row[j] + (c1 != c2)
            curr_row.append(min(insertions, deletions, substitutions))
        prev_row = curr_row
    
    return prev_row[-1]


def fuzzy_match(query_token: str, corpus_tokens: set, threshold: int = 2) -> list:
    """Find fuzzy matches for a token within threshold distance."""
    matches = []
    for token in corpus_tokens:
        if abs(len(query_token) - len(token)) > threshold:
            continue
        dist = levenshtein_distance(query_token, token)
        if dist <= threshold and dist > 0:
            matches.append((token, dist))
    return sorted(matches, key=lambda x: x[1])


# ============ BM25 IMPLEMENTATION (Enhanced) ============
class BM25:
    """Enhanced BM25 ranking with synonym expansion and fuzzy matching."""

    def __init__(self, k1=1.5, b=0.75, use_synonyms=True, use_fuzzy=True):
        self.k1 = k1
        self.b = b
        self.use_synonyms = use_synonyms
        self.use_fuzzy = use_fuzzy
        self.corpus = []
        self.doc_lengths = []
        self.avgdl = 0
        self.idf = {}
        self.doc_freqs = defaultdict(int)
        self.N = 0
        self._all_tokens = set()

    def tokenize(self, text):
        """Lowercase, split, remove punctuation, filter short words"""
        text = re.sub(r'[^\w\s]', ' ', str(text).lower())
        return [w for w in text.split() if len(w) > 2]

    def fit(self, documents):
        """Build BM25 index from documents"""
        self.corpus = [self.tokenize(doc) for doc in documents]
        self.N = len(self.corpus)
        if self.N == 0:
            return
        self.doc_lengths = [len(doc) for doc in self.corpus]
        self.avgdl = sum(self.doc_lengths) / self.N

        for doc in self.corpus:
            seen = set()
            for word in doc:
                self._all_tokens.add(word)
                if word not in seen:
                    self.doc_freqs[word] += 1
                    seen.add(word)

        for word, freq in self.doc_freqs.items():
            self.idf[word] = log((self.N - freq + 0.5) / (freq + 0.5) + 1)

    def score(self, query):
        """Score all documents against query with synonym and fuzzy expansion."""
        # Translate non-English queries
        translated_query = translate_query(query)
        
        # Expand with synonyms
        if self.use_synonyms:
            expanded_query = expand_synonyms(translated_query)
        else:
            expanded_query = translated_query
        
        query_tokens = self.tokenize(expanded_query)
        
        # Add fuzzy matches
        if self.use_fuzzy:
            fuzzy_additions = []
            for token in query_tokens:
                if token not in self.idf:
                    matches = fuzzy_match(token, self._all_tokens, threshold=2)
                    for match, dist in matches[:2]:
                        fuzzy_additions.append(match)
            query_tokens.extend(fuzzy_additions)
        
        scores = []
        for idx, doc in enumerate(self.corpus):
            score = 0
            doc_len = self.doc_lengths[idx]
            term_freqs = defaultdict(int)
            for word in doc:
                term_freqs[word] += 1

            for token in query_tokens:
                if token in self.idf:
                    tf = term_freqs[token]
                    idf = self.idf[token]
                    numerator = tf * (self.k1 + 1)
                    denominator = tf + self.k1 * (1 - self.b + self.b * doc_len / self.avgdl)
                    score += idf * numerator / denominator

            scores.append((idx, score))

        return sorted(scores, key=lambda x: x[1], reverse=True)


# ============ INDEX CACHE (Phase 1) ============
_INDEX_CACHE = {}

def _get_cached_index(filepath, search_cols):
    """Get or create cached BM25 index for a CSV file."""
    cache_key = str(filepath)
    mtime = filepath.stat().st_mtime if filepath.exists() else 0
    
    if cache_key in _INDEX_CACHE:
        cached_mtime, cached_data, cached_bm25 = _INDEX_CACHE[cache_key]
        if cached_mtime == mtime:
            return cached_data, cached_bm25
    
    # Build new index
    data = _load_csv(filepath)
    documents = [" ".join(str(row.get(col, "")) for col in search_cols) for row in data]
    
    bm25 = BM25()
    bm25.fit(documents)
    
    _INDEX_CACHE[cache_key] = (mtime, data, bm25)
    return data, bm25


# ============ SEARCH FUNCTIONS ============
def _load_csv(filepath):
    """Load CSV and return list of dicts"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return list(csv.DictReader(f))


def _search_csv(filepath, search_cols, output_cols, query, max_results):
    """Core search function using cached BM25"""
    if not filepath.exists():
        return []

    data, bm25 = _get_cached_index(filepath, search_cols)
    ranked = bm25.score(query)

    # Get top results with score > 0
    results = []
    for idx, score in ranked[:max_results]:
        if score > 0:
            row = data[idx]
            results.append({col: row.get(col, "") for col in output_cols if col in row})

    return results


def detect_domain(query):
    """Auto-detect the most relevant domain from query"""
    query_lower = query.lower()

    domain_keywords = {
        "color": ["color", "palette", "hex", "#", "rgb"],
        "chart": ["chart", "graph", "visualization", "trend", "bar", "pie", "scatter", "heatmap", "funnel"],
        "landing": ["landing", "page", "cta", "conversion", "hero", "testimonial", "pricing", "section"],
        "product": ["saas", "ecommerce", "e-commerce", "fintech", "healthcare", "gaming", "portfolio", "crypto", "dashboard"],
        "style": ["style", "design", "ui", "minimalism", "glassmorphism", "neumorphism", "brutalism", "dark mode", "flat", "aurora", "prompt", "css", "implementation", "variable", "checklist", "tailwind"],
        "ux": ["ux", "usability", "accessibility", "wcag", "touch", "scroll", "animation", "keyboard", "navigation", "mobile"],
        "typography": ["font", "typography", "heading", "serif", "sans"],
        "icons": ["icon", "icons", "lucide", "heroicons", "symbol", "glyph", "pictogram", "svg icon"],
        "components": ["component", "button", "modal", "navbar", "sidebar", "card", "table", "form", "input", "dropdown", "tooltip"],
        "animations": ["animation", "motion", "transition", "framer", "gsap", "keyframe", "easing"],
        "react": ["react", "next.js", "nextjs", "suspense", "memo", "usecallback", "useeffect", "rerender", "bundle", "waterfall", "barrel", "dynamic import", "rsc", "server component"],
        "web": ["aria", "focus", "outline", "semantic", "virtualize", "autocomplete", "form", "input type", "preconnect"]
    }

    scores = {domain: sum(1 for kw in keywords if kw in query_lower) for domain, keywords in domain_keywords.items()}
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "style"


def search(query, domain=None, max_results=MAX_RESULTS):
    """Main search function with auto-domain detection"""
    if domain is None:
        domain = detect_domain(query)

    config = CSV_CONFIG.get(domain, CSV_CONFIG["style"])
    filepath = DATA_DIR / config["file"]

    if not filepath.exists():
        return {"error": f"File not found: {filepath}", "domain": domain}

    results = _search_csv(filepath, config["search_cols"], config["output_cols"], query, max_results)

    return {
        "domain": domain,
        "query": query,
        "file": config["file"],
        "count": len(results),
        "results": results
    }


def search_stack(query, stack, max_results=MAX_RESULTS):
    """Search stack-specific guidelines"""
    if stack not in STACK_CONFIG:
        return {"error": f"Unknown stack: {stack}. Available: {', '.join(AVAILABLE_STACKS)}"}

    filepath = DATA_DIR / STACK_CONFIG[stack]["file"]

    if not filepath.exists():
        return {"error": f"Stack file not found: {filepath}", "stack": stack}

    results = _search_csv(filepath, _STACK_COLS["search_cols"], _STACK_COLS["output_cols"], query, max_results)

    return {
        "domain": "stack",
        "stack": stack,
        "query": query,
        "file": STACK_CONFIG[stack]["file"],
        "count": len(results),
        "results": results
    }


# ============ AUTO-DETECT TECH STACK (Phase 2) ============
def detect_tech_stack(project_dir: str = None) -> str:
    """Auto-detect tech stack from project files."""
    if project_dir is None:
        project_dir = Path.cwd()
    else:
        project_dir = Path(project_dir)
    
    # Check package.json
    pkg_json = project_dir / "package.json"
    if pkg_json.exists():
        try:
            with open(pkg_json, 'r', encoding='utf-8') as f:
                pkg = json.load(f)
            deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
            
            if "next" in deps:
                return "nextjs"
            if "nuxt" in deps:
                if "@nuxt/ui" in deps:
                    return "nuxt-ui"
                return "nuxtjs"
            if "astro" in deps:
                return "astro"
            if "svelte" in deps or "@sveltejs/kit" in deps:
                return "svelte"
            if "react-native" in deps:
                return "react-native"
            if "react" in deps:
                if "shadcn" in str(deps) or "@radix-ui" in str(deps):
                    return "shadcn"
                return "react"
            if "vue" in deps:
                return "vue"
        except (json.JSONDecodeError, IOError):
            pass
    
    # Check pubspec.yaml (Flutter)
    pubspec = project_dir / "pubspec.yaml"
    if pubspec.exists():
        return "flutter"
    
    # Check for SwiftUI
    if any(project_dir.glob("**/*.swift")):
        return "swiftui"
    
    # Check for Jetpack Compose
    if any(project_dir.glob("**/build.gradle.kts")):
        return "jetpack-compose"
    
    # Default
    return "html-tailwind"
