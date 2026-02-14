# UI/UX Pro Max v2.0

> **AI-Powered Design Intelligence** — 67 styles, 96 color palettes, 57 font pairings, 25 chart types, 25 component patterns, 20 animation presets across 13 technology stacks.

[![CI](https://github.com/Kaprao52/Kaprao-app/actions/workflows/ci.yml/badge.svg)](https://github.com/Kaprao52/Kaprao-app/actions)

## What is UI/UX Pro Max?

UI/UX Pro Max is a design intelligence tool that generates comprehensive design system recommendations for any product type. It uses BM25 search with synonym expansion and fuzzy matching across curated CSV databases to recommend styles, colors, typography, layouts, icons, and animations.

**Works with:** Claude Code, Cursor, Windsurf, GitHub Copilot, Roo, and 10+ AI code editors.

## Quick Start

```bash
# Generate a design system
python src/scripts/search.py "SaaS dashboard" --design-system -p "MyApp"

# Search specific domain
python src/scripts/search.py "glassmorphism dark" --domain style

# Export as Tailwind config
python src/scripts/search.py "SaaS dashboard" --design-system --export tailwind

# Export as CSS variables
python src/scripts/search.py "SaaS dashboard" --design-system --export css

# Export as Design Tokens (JSON)
python src/scripts/search.py "SaaS dashboard" --design-system --export tokens

# Auto-detect tech stack
python src/scripts/search.py --detect-stack

# Review existing UI code
python src/scripts/search.py --review src/components/

# Generate with A/B test suggestions
python src/scripts/search.py "SaaS dashboard" --design-system --ab-test
```

## Features

### Core
- 🔍 **BM25 Search** with synonym expansion and fuzzy matching
- 🎨 **Design System Generator** with reasoning engine
- 📁 **Master + Overrides** persistence pattern
- 🌍 **Multi-language** queries (Thai, Chinese, Japanese, English)

### v2.0 New
- 🌙 **Dark Mode** auto-generated color palettes
- 📦 **Export** to Tailwind, CSS variables, Design Tokens JSON
- 🧩 **Component Patterns** database (25 common UI patterns)
- ✨ **Animation Presets** with CSS, Framer Motion, and GSAP code
- 🔌 **MCP Server** for direct AI tool integration
- 🌐 **Web UI** preview at `web/index.html`
- 🔍 **Code Review** mode for accessibility and UX issues
- 🧪 **A/B Test** variant suggestions
- 🔧 **Auto-detect** tech stack from project files
- ✅ **Test Suite** and CSV validation
- 🔄 **Build Script** for syncing across all editor directories

## Architecture

```
ui-ux-pro-max/
├── src/                          # Single Source of Truth
│   ├── data/                     # CSV databases
│   │   ├── styles.csv            # 67 UI styles
│   │   ├── colors.csv            # 96 color palettes
│   │   ├── typography.csv        # 57 font pairings
│   │   ├── products.csv          # 35+ product types
│   │   ├── landing.csv           # Landing page patterns
│   │   ├── ux-guidelines.csv     # 99 UX guidelines
│   │   ├── charts.csv            # 25 chart types
│   │   ├── icons.csv             # Icon recommendations
│   │   ├── components.csv        # 25 component patterns (NEW)
│   │   ├── animations.csv        # 20 animation presets (NEW)
│   │   ├── ui-reasoning.csv      # Reasoning rules
│   │   └── stacks/               # 13 tech stack guidelines
│   ├── scripts/                  # Python scripts
│   │   ├── core.py               # BM25 engine + synonyms + fuzzy
│   │   ├── search.py             # CLI search interface
│   │   ├── design_system.py      # Design system generator
│   │   ├── export.py             # Tailwind/CSS/Tokens export (NEW)
│   │   └── review.py             # Code review mode (NEW)
│   └── mcp/                      # MCP Server (NEW)
│       └── server.py
├── web/                          # Web UI preview (NEW)
│   └── index.html
├── scripts/                      # Build tools
│   ├── build.py                  # Sync to all editors
│   └── validate.py               # CSV validation
├── tests/                        # Test suite (NEW)
│   └── test_search.py
├── .claude/skills/               # Claude Code integration
├── .cursor/skills/               # Cursor integration
├── .github/prompts/              # GitHub Copilot integration
├── .windsurf/skills/             # Windsurf integration
├── .roo/skills/                  # Roo integration
├── version.txt                   # Version number
├── CHANGELOG.md                  # Release notes
└── README.md                     # This file
```

## Search Domains

| Domain | Content | Example Query |
|--------|---------|---------------|
| `product` | 35+ product type recommendations | `"SaaS dashboard"`, `"e-commerce luxury"` |
| `style` | 67 UI styles with effects | `"glassmorphism dark"`, `"minimalism clean"` |
| `color` | 96 color palettes | `"fintech trust"`, `"beauty spa"` |
| `typography` | 57 font pairings | `"elegant serif"`, `"modern sans"` |
| `landing` | Landing page patterns | `"hero social-proof"`, `"conversion"` |
| `ux` | 99 UX guidelines | `"accessibility animation"` |
| `chart` | 25 chart types | `"trend comparison"`, `"funnel"` |
| `icons` | Icon recommendations | `"navigation menu"`, `"social media"` |
| `components` | 25 component patterns | `"modal form"`, `"navbar sidebar"` |
| `animations` | 20 animation presets | `"hover entrance"`, `"loading shimmer"` |
| `react` | React performance | `"suspense memo"`, `"rerender"` |
| `web` | Web interface guidelines | `"aria focus"`, `"semantic"` |

## Technology Stacks

| Stack | Focus |
|-------|-------|
| `html-tailwind` | Tailwind CSS utilities (DEFAULT) |
| `react` | React hooks, state, performance |
| `nextjs` | Next.js SSR, routing, images |
| `vue` | Vue 3 Composition API, Pinia |
| `nuxtjs` | Nuxt 3, auto-imports |
| `nuxt-ui` | Nuxt UI components |
| `svelte` | Svelte 5 runes, SvelteKit |
| `astro` | Astro islands, content |
| `swiftui` | SwiftUI views, state |
| `react-native` | React Native components |
| `flutter` | Flutter widgets, state |
| `shadcn` | shadcn/ui components |
| `jetpack-compose` | Jetpack Compose |

## Export Formats

### Tailwind Config
```bash
python src/scripts/search.py "SaaS" --design-system --export tailwind
# Generates tailwind.config.js with colors, fonts, spacing, shadows
```

### CSS Variables
```bash
python src/scripts/search.py "SaaS" --design-system --export css
# Generates design-system.css with :root variables + dark mode
```

### Design Tokens (JSON)
```bash
python src/scripts/search.py "SaaS" --design-system --export tokens
# Generates design-tokens.json in Style Dictionary format
```

## MCP Server

Add to your MCP settings:

```json
{
    "mcpServers": {
        "ui-ux-pro-max": {
            "command": "python",
            "args": ["src/mcp/server.py"],
            "cwd": "/path/to/ui-ux-pro-max"
        }
    }
}
```

Available tools: `search`, `search_stack`, `design_system`, `export`, `review`, `detect_stack`

## Code Review

Analyze existing UI code for accessibility, UX, and design issues:

```bash
python src/scripts/search.py --review src/components/Button.tsx
python src/scripts/search.py --review src/pages/
```

Checks for:
- Emoji icons (should use SVG)
- Missing alt text
- Missing aria-labels
- No cursor-pointer on clickable elements
- Missing hover states
- No lazy loading on images
- Small text (< 14px)
- Hardcoded colors
- Fixed widths causing mobile overflow
- Animations without prefers-reduced-motion
- Light backgrounds without dark mode variants

## Development

```bash
# Validate all CSV data
python scripts/validate.py

# Run tests
python tests/test_search.py

# Sync src/ to all editor directories
python scripts/build.py

# Check what would change (dry run)
python scripts/build.py --check

# Clean and rebuild
python scripts/build.py --clean
```

## Multi-Language Support

Search in Thai, Chinese, or Japanese:

```bash
# Thai
python src/scripts/search.py "ทันสมัย หรู" --design-system

# Chinese
python src/scripts/search.py "简约 现代" --design-system

# Japanese
python src/scripts/search.py "モダン シンプル" --design-system
```

## Contributing

1. Edit data in `src/data/` (single source of truth)
2. Edit scripts in `src/scripts/`
3. Run `python scripts/validate.py` to check data integrity
4. Run `python tests/test_search.py` to verify search accuracy
5. Run `python scripts/build.py` to sync to all editor directories

## License

MIT
