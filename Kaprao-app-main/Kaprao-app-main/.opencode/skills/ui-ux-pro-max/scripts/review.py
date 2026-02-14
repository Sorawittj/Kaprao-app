#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
UI/UX Pro Max Review v2.0 - Analyze existing UI code for design issues,
accessibility problems, and improvement suggestions.
"""

import re
from pathlib import Path
from core import search


# ============ REVIEW RULES ============
REVIEW_RULES = [
    # Accessibility
    {
        "id": "a11y-emoji-icon",
        "severity": "HIGH",
        "category": "Accessibility",
        "pattern": r'[🏠🔍📧📱💡🎨🔒✅❌⚡🚀💰📊🎯🔥💎🌟⭐🎉🎊📌📎🔗💬📝✏️🗑️📁📂🔔🔕👤👥🛒🛍️💳🏷️📦🔄⬆️⬇️⬅️➡️▶️◀️⏩⏪⏫⏬🔀🔁🔂▪️▫️◾◽🔲🔳⬛⬜🟥🟧🟨🟩🟦🟪🟫]',
        "message": "Emoji used as icon — replace with SVG icon (Heroicons/Lucide)",
        "fix": "Use <svg> or icon component from Heroicons, Lucide, or similar library"
    },
    {
        "id": "a11y-alt-text",
        "severity": "HIGH",
        "category": "Accessibility",
        "pattern": r'<img[^>]*(?!alt=)[^>]*>',
        "message": "Image missing alt attribute",
        "fix": "Add descriptive alt text: <img alt=\"Description\" ...>"
    },
    {
        "id": "a11y-button-type",
        "severity": "MEDIUM",
        "category": "Accessibility",
        "pattern": r'<button(?![^>]*type=)[^>]*>',
        "message": "Button missing type attribute",
        "fix": "Add type=\"button\" or type=\"submit\" to prevent form submission issues"
    },
    {
        "id": "a11y-aria-label",
        "severity": "HIGH",
        "category": "Accessibility",
        "pattern": r'<(?:button|a)[^>]*>[\s]*<(?:svg|img|i|span class="icon)[^>]*>[\s]*</(?:button|a)>',
        "message": "Icon-only button/link missing aria-label",
        "fix": "Add aria-label=\"Description\" to icon-only interactive elements"
    },
    
    # Interaction
    {
        "id": "ux-cursor-pointer",
        "severity": "MEDIUM",
        "category": "Interaction",
        "pattern": r'(?:onClick|@click|on:click|onPress)[^}]*(?!cursor-pointer|cursor:pointer)',
        "message": "Clickable element may be missing cursor-pointer",
        "fix": "Add cursor-pointer class or cursor: pointer style to all clickable elements"
    },
    {
        "id": "ux-no-hover",
        "severity": "MEDIUM",
        "category": "Interaction",
        "pattern": r'<button[^>]*class="[^"]*"[^>]*>(?!.*hover:)',
        "message": "Button may be missing hover state",
        "fix": "Add hover: classes for visual feedback (e.g., hover:bg-primary/90)"
    },
    
    # Performance
    {
        "id": "perf-no-lazy",
        "severity": "MEDIUM",
        "category": "Performance",
        "pattern": r'<img[^>]*(?!loading=)[^>]*src=',
        "message": "Image missing lazy loading",
        "fix": "Add loading=\"lazy\" for below-fold images"
    },
    {
        "id": "perf-inline-style",
        "severity": "LOW",
        "category": "Performance",
        "pattern": r'style=\{?\{[^}]*width|style=\{?\{[^}]*height|style=\{?\{[^}]*margin|style=\{?\{[^}]*padding',
        "message": "Inline styles for layout — consider using CSS classes",
        "fix": "Use Tailwind classes or CSS modules instead of inline styles for layout"
    },
    
    # Typography
    {
        "id": "typo-small-text",
        "severity": "MEDIUM",
        "category": "Typography",
        "pattern": r'(?:font-size:\s*(?:1[0-3]|[0-9])px|text-\[(?:1[0-3]|[0-9])px\]|text-xs)',
        "message": "Text may be too small for readability (< 14px)",
        "fix": "Minimum 14px for body text, 16px recommended for mobile"
    },
    
    # Color & Contrast
    {
        "id": "color-hardcoded",
        "severity": "LOW",
        "category": "Color",
        "pattern": r'(?:color|background|border-color):\s*#[0-9a-fA-F]{3,8}',
        "message": "Hardcoded color value — consider using CSS variables or design tokens",
        "fix": "Use var(--color-primary) or Tailwind color classes for consistency"
    },
    
    # Responsive
    {
        "id": "resp-fixed-width",
        "severity": "MEDIUM",
        "category": "Responsive",
        "pattern": r'(?:width:\s*(?:[5-9]\d{2}|[1-9]\d{3,})px|w-\[(?:[5-9]\d{2}|[1-9]\d{3,})px\])',
        "message": "Fixed width > 500px may cause horizontal scroll on mobile",
        "fix": "Use max-width, percentage, or responsive classes instead"
    },
    
    # Animation
    {
        "id": "anim-no-reduced-motion",
        "severity": "HIGH",
        "category": "Animation",
        "pattern": r'(?:animation:|@keyframes|transition:)(?!.*prefers-reduced-motion)',
        "message": "Animation without prefers-reduced-motion check",
        "fix": "Add @media (prefers-reduced-motion: reduce) to disable animations"
    },
    
    # Dark Mode
    {
        "id": "dark-no-support",
        "severity": "LOW",
        "category": "Dark Mode",
        "pattern": r'(?:bg-white|bg-gray-50|bg-gray-100)(?!.*dark:)',
        "message": "Light background without dark mode variant",
        "fix": "Add dark: variant (e.g., bg-white dark:bg-gray-900)"
    },
]


def review_code(file_or_dir: str) -> str:
    """Review UI code for design issues."""
    path = Path(file_or_dir)
    
    if not path.exists():
        return f"Error: Path not found: {file_or_dir}"
    
    if path.is_file():
        return _review_file(path)
    elif path.is_dir():
        return _review_directory(path)
    
    return f"Error: Invalid path: {file_or_dir}"


def _review_file(filepath: Path) -> str:
    """Review a single file."""
    # Only review UI-related files
    valid_extensions = {'.html', '.htm', '.jsx', '.tsx', '.vue', '.svelte', '.css', '.scss', '.less'}
    if filepath.suffix.lower() not in valid_extensions:
        return f"Skipped: {filepath} (not a UI file)"
    
    try:
        content = filepath.read_text(encoding='utf-8')
    except (IOError, UnicodeDecodeError):
        return f"Error: Could not read {filepath}"
    
    issues = []
    lines = content.split('\n')
    
    for rule in REVIEW_RULES:
        for i, line in enumerate(lines, 1):
            if re.search(rule["pattern"], line):
                issues.append({
                    "line": i,
                    "rule": rule["id"],
                    "severity": rule["severity"],
                    "category": rule["category"],
                    "message": rule["message"],
                    "fix": rule["fix"],
                    "code": line.strip()[:100]
                })
    
    # Get context-aware suggestions
    suggestions = _get_context_suggestions(content, filepath)
    
    return _format_review(filepath, issues, suggestions)


def _review_directory(dirpath: Path) -> str:
    """Review all UI files in a directory."""
    results = []
    ui_extensions = {'.html', '.htm', '.jsx', '.tsx', '.vue', '.svelte', '.css', '.scss'}
    
    files = sorted(dirpath.rglob('*'))
    ui_files = [f for f in files if f.suffix.lower() in ui_extensions and 'node_modules' not in str(f)]
    
    if not ui_files:
        return f"No UI files found in {dirpath}"
    
    total_issues = 0
    for filepath in ui_files[:20]:  # Limit to 20 files
        result = _review_file(filepath)
        if "issues found" in result:
            results.append(result)
            # Count issues
            for line in result.split('\n'):
                if line.strip().startswith(('HIGH:', 'MEDIUM:', 'LOW:')):
                    total_issues += 1
    
    header = f"## UI/UX Pro Max Review Report\n"
    header += f"**Directory:** {dirpath}\n"
    header += f"**Files scanned:** {len(ui_files)}\n"
    header += f"**Total issues:** {total_issues}\n\n"
    
    return header + "\n---\n\n".join(results)


def _get_context_suggestions(content: str, filepath: Path) -> list:
    """Get context-aware suggestions based on file content."""
    suggestions = []
    content_lower = content.lower()
    
    # Detect component type and suggest improvements
    if 'navbar' in content_lower or 'nav' in content_lower:
        suggestions.append("Navigation: Ensure mobile hamburger menu, skip-to-content link, and aria-current for active page")
    
    if 'form' in content_lower or '<input' in content_lower:
        suggestions.append("Form: Add proper labels, error messages near inputs, and disable submit during async operations")
    
    if 'modal' in content_lower or 'dialog' in content_lower:
        suggestions.append("Modal: Trap focus inside modal, close on Escape key, and restore focus on close")
    
    if 'table' in content_lower or '<th' in content_lower:
        suggestions.append("Table: Add scope attributes to headers, consider responsive card layout for mobile")
    
    if 'chart' in content_lower or 'graph' in content_lower:
        suggestions.append("Chart: Provide text alternative for data, use patterns in addition to colors for accessibility")
    
    if 'hero' in content_lower:
        suggestions.append("Hero: Ensure CTA is above fold, use WebP images with srcset, add preload for hero image")
    
    if 'card' in content_lower:
        suggestions.append("Card: Add hover lift effect (translateY(-2px)), ensure entire card is clickable if it links somewhere")
    
    # Check for missing patterns
    if '<img' in content and 'srcset' not in content_lower:
        suggestions.append("Images: Add srcset for responsive images and WebP format for better performance")
    
    if 'transition' not in content_lower and ('hover' in content_lower or 'click' in content_lower):
        suggestions.append("Transitions: Add smooth transitions (150-300ms) for hover and state changes")
    
    return suggestions


def _format_review(filepath: Path, issues: list, suggestions: list) -> str:
    """Format review results."""
    output = []
    output.append(f"### {filepath}")
    output.append(f"**{len(issues)} issues found**\n")
    
    if not issues and not suggestions:
        output.append("No issues found.")
        return "\n".join(output)
    
    # Group by severity
    high = [i for i in issues if i["severity"] == "HIGH"]
    medium = [i for i in issues if i["severity"] == "MEDIUM"]
    low = [i for i in issues if i["severity"] == "LOW"]
    
    for severity, group in [("HIGH", high), ("MEDIUM", medium), ("LOW", low)]:
        if group:
            output.append(f"**{severity}:**")
            for issue in group:
                output.append(f"  - Line {issue['line']}: {issue['message']}")
                output.append(f"    Fix: {issue['fix']}")
                output.append(f"    Code: `{issue['code']}`")
            output.append("")
    
    if suggestions:
        output.append("**Suggestions:**")
        for s in suggestions:
            output.append(f"  - {s}")
    
    return "\n".join(output)
