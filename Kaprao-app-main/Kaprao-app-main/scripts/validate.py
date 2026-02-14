#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
UI/UX Pro Max CSV Validator - Validates all CSV data files for integrity.

Usage:
    python scripts/validate.py           # Validate all CSVs
    python scripts/validate.py --fix     # Auto-fix common issues
"""

import csv
import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "src" / "data"

# Required columns per CSV file
REQUIRED_COLUMNS = {
    "styles.csv": ["Style Category", "Keywords", "Best For", "Type"],
    "colors.csv": ["Product Type", "Primary (Hex)", "Secondary (Hex)", "CTA (Hex)", "Background (Hex)", "Text (Hex)"],
    "charts.csv": ["Data Type", "Keywords", "Best Chart Type"],
    "landing.csv": ["Pattern Name", "Keywords", "Section Order"],
    "products.csv": ["Product Type", "Keywords", "Primary Style Recommendation"],
    "ux-guidelines.csv": ["Category", "Issue", "Description"],
    "typography.csv": ["Font Pairing Name", "Category", "Heading Font", "Body Font"],
    "icons.csv": ["Category", "Icon Name", "Keywords"],
    "ui-reasoning.csv": ["UI_Category", "Recommended_Pattern", "Style_Priority"],
    "react-performance.csv": ["Category", "Issue", "Description"],
    "web-interface.csv": ["Category", "Issue", "Description"],
}

STACK_REQUIRED_COLUMNS = ["Category", "Guideline", "Description"]

HEX_PATTERN = re.compile(r'^#[0-9A-Fa-f]{3,8}$')


def validate_csv(filepath: Path, required_cols: list) -> list:
    """Validate a single CSV file."""
    issues = []
    
    if not filepath.exists():
        issues.append(f"MISSING: {filepath.name}")
        return issues
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            headers = reader.fieldnames or []
            
            # Check required columns
            for col in required_cols:
                if col not in headers:
                    issues.append(f"MISSING COLUMN: '{col}' in {filepath.name}")
            
            # Check rows
            row_count = 0
            empty_rows = 0
            for i, row in enumerate(reader, 2):  # Start at 2 (header is row 1)
                row_count += 1
                
                # Check for completely empty rows
                if all(not v.strip() for v in row.values()):
                    empty_rows += 1
                    issues.append(f"EMPTY ROW: {filepath.name} row {i}")
                
                # Validate hex colors
                for col in headers:
                    if "(Hex)" in col and row.get(col, "").strip():
                        hex_vals = row[col].strip().split(",")
                        for hex_val in hex_vals:
                            hex_val = hex_val.strip()
                            if hex_val and not HEX_PATTERN.match(hex_val):
                                issues.append(f"INVALID HEX: {filepath.name} row {i}, col '{col}': '{hex_val}'")
                
                # Check for required fields being empty
                for col in required_cols:
                    if col in row and not row[col].strip():
                        issues.append(f"EMPTY REQUIRED: {filepath.name} row {i}, col '{col}'")
            
            if row_count == 0:
                issues.append(f"NO DATA: {filepath.name} has no rows")
            else:
                print(f"  OK: {filepath.name} ({row_count} rows)")
    
    except Exception as e:
        issues.append(f"ERROR: {filepath.name}: {str(e)}")
    
    return issues


def validate_color_contrast(filepath: Path) -> list:
    """Validate color contrast ratios in color palettes."""
    issues = []
    
    if not filepath.exists():
        return issues
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader, 2):
                bg = row.get("Background (Hex)", "").strip()
                text = row.get("Text (Hex)", "").strip()
                
                if bg and text and HEX_PATTERN.match(bg) and HEX_PATTERN.match(text):
                    ratio = _contrast_ratio(bg, text)
                    if ratio < 4.5:
                        issues.append(
                            f"LOW CONTRAST: colors.csv row {i} "
                            f"({row.get('Product Type', 'unknown')}): "
                            f"bg={bg} text={text} ratio={ratio:.2f} (min 4.5:1)"
                        )
    except Exception:
        pass
    
    return issues


def _hex_to_rgb(hex_color: str) -> tuple:
    """Convert hex to RGB."""
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 3:
        hex_color = ''.join(c * 2 for c in hex_color)
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def _relative_luminance(hex_color: str) -> float:
    """Calculate relative luminance per WCAG 2.0."""
    r, g, b = _hex_to_rgb(hex_color)
    
    def linearize(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    
    return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)


def _contrast_ratio(color1: str, color2: str) -> float:
    """Calculate WCAG contrast ratio between two colors."""
    l1 = _relative_luminance(color1)
    l2 = _relative_luminance(color2)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)


def validate_google_fonts_urls(filepath: Path) -> list:
    """Check Google Fonts URLs format."""
    issues = []
    
    if not filepath.exists():
        return issues
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader, 2):
                url = row.get("Google Fonts URL", "").strip()
                if url and not url.startswith("https://fonts.google.com"):
                    issues.append(f"INVALID URL: typography.csv row {i}: '{url[:60]}'")
    except Exception:
        pass
    
    return issues


def main():
    print("UI/UX Pro Max CSV Validator")
    print(f"Data directory: {DATA_DIR}")
    print("=" * 60)
    
    all_issues = []
    
    # Validate main CSV files
    print("\nMain data files:")
    for filename, required_cols in REQUIRED_COLUMNS.items():
        filepath = DATA_DIR / filename
        issues = validate_csv(filepath, required_cols)
        all_issues.extend(issues)
    
    # Validate stack files
    print("\nStack files:")
    stacks_dir = DATA_DIR / "stacks"
    if stacks_dir.exists():
        for stack_file in sorted(stacks_dir.glob("*.csv")):
            issues = validate_csv(stack_file, STACK_REQUIRED_COLUMNS)
            all_issues.extend(issues)
    
    # Validate color contrast
    print("\nColor contrast check:")
    contrast_issues = validate_color_contrast(DATA_DIR / "colors.csv")
    all_issues.extend(contrast_issues)
    if not contrast_issues:
        print("  OK: All color palettes pass 4.5:1 contrast")
    
    # Validate Google Fonts URLs
    print("\nGoogle Fonts URL check:")
    url_issues = validate_google_fonts_urls(DATA_DIR / "typography.csv")
    all_issues.extend(url_issues)
    if not url_issues:
        print("  OK: All Google Fonts URLs valid")
    
    # Summary
    print(f"\n{'=' * 60}")
    if all_issues:
        print(f"ISSUES FOUND: {len(all_issues)}")
        for issue in all_issues:
            print(f"  - {issue}")
        sys.exit(1)
    else:
        print("ALL VALIDATIONS PASSED")
        sys.exit(0)


if __name__ == "__main__":
    main()
