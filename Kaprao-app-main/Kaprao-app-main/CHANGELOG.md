# Changelog

All notable changes to UI/UX Pro Max will be documented in this file.

## [2.0.0] - 2026-02-14

### Added
- **Single Source of Truth** — `src/` directory as canonical data/scripts source
- **Build/Sync Script** — `scripts/build.py` to distribute to all editor directories
- **Tailwind Config Export** — `--export tailwind` flag generates `tailwind.config.js`
- **CSS Variables Export** — `--export css` flag generates CSS custom properties file
- **Design Tokens JSON Export** — `--export tokens` flag generates Style Dictionary format
- **Synonym Expansion** — Search now matches synonyms (e.g., "modern" → "contemporary, sleek")
- **Fuzzy Matching** — Typo-tolerant search using Levenshtein distance
- **Dark Mode Color Palettes** — All 96 palettes now include dark mode variants
- **Component Patterns Database** — `components.csv` with 50+ common UI patterns
- **Component Starter Code** — `--starter` flag generates boilerplate for selected stack
- **Auto-detect Tech Stack** — Reads `package.json`/`pubspec.yaml` to auto-select stack
- **MCP Server** — Direct tool integration via Model Context Protocol
- **Web UI Preview** — Browser-based design system previewer at `web/`
- **Animation Library Recommendations** — Per-style animation library suggestions
- **Icon Integration** — Design system output now includes icon recommendations
- **Context-aware Recommendations** — Reads existing project files to suggest matching styles
- **Design Review Mode** — `--review` flag analyzes existing UI code
- **Multi-language Queries** — Thai, Chinese, Japanese keyword mapping
- **A/B Test Suggestions** — Design variant recommendations for conversion testing
- **Search Accuracy Tests** — Comprehensive test suite for search quality
- **CSV Validation** — Automated data integrity checks
- **GitHub Actions CI** — Auto-validate, test, and sync on push
- **Root README.md** — Full project documentation

### Changed
- Architecture refactored to single source of truth pattern
- BM25 search engine enhanced with synonym and fuzzy matching layers
- Design system generator now includes icon and animation recommendations
- Export system expanded from 2 formats to 7+

## [1.0.0] - 2025-XX-XX

### Initial Release
- BM25 search engine across CSV databases
- 67 styles, 96 color palettes, 57 font pairings
- 13 technology stack guidelines
- Design system generator with reasoning engine
- Master + Overrides persistence pattern
- Multi-editor distribution (Claude, Cursor, Windsurf, Roo, GitHub Copilot, etc.)
