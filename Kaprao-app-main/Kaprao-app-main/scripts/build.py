#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
UI/UX Pro Max Build Script - Syncs src/ to all editor skill directories.
Single source of truth: src/data/ and src/scripts/

Usage:
    python scripts/build.py          # Sync all editors
    python scripts/build.py --check  # Dry run, check what would change
    python scripts/build.py --clean  # Remove all editor copies first
"""

import shutil
import sys
from pathlib import Path

# ============ CONFIGURATION ============
PROJECT_ROOT = Path(__file__).parent.parent
SRC_DIR = PROJECT_ROOT / "src"
SRC_DATA = SRC_DIR / "data"
SRC_SCRIPTS = SRC_DIR / "scripts"

# Editor target directories (relative to project root)
EDITOR_TARGETS = {
    ".claude": {
        "skill_dir": "skills/ui-ux-pro-max",
        "skill_file": "SKILL.md",
    },
    ".cursor": {
        "skill_dir": "skills/ui-ux-pro-max",
        "skill_file": "SKILL.md",
    },
    ".windsurf": {
        "skill_dir": "skills/ui-ux-pro-max",
        "skill_file": "SKILL.md",
    },
    ".roo": {
        "skill_dir": "skills/ui-ux-pro-max",
        "skill_file": "SKILL.md",
    },
    ".agent": {
        "skill_dir": "skills/ui-ux-pro-max",
        "skill_file": "SKILL.md",
    },
    ".codebuddy": {
        "skill_dir": "skills/ui-ux-pro-max",
        "skill_file": "SKILL.md",
    },
    ".codex": {
        "skill_dir": "skills/ui-ux-pro-max",
        "skill_file": "SKILL.md",
    },
    ".continue": {
        "skill_dir": "skills/ui-ux-pro-max",
        "skill_file": "SKILL.md",
    },
    ".gemini": {
        "skill_dir": "skills/ui-ux-pro-max",
        "skill_file": "SKILL.md",
    },
    ".kiro": {
        "skill_dir": "skills/ui-ux-pro-max",
        "skill_file": "SKILL.md",
    },
    ".opencode": {
        "skill_dir": "skills/ui-ux-pro-max",
        "skill_file": "SKILL.md",
    },
    ".qoder": {
        "skill_dir": "skills/ui-ux-pro-max",
        "skill_file": "SKILL.md",
    },
    ".trae": {
        "skill_dir": "skills/ui-ux-pro-max",
        "skill_file": "SKILL.md",
    },
    ".github": {
        "skill_dir": "prompts/ui-ux-pro-max",
        "skill_file": "PROMPT.md",
    },
}


def get_version():
    """Read version from version.txt"""
    version_file = PROJECT_ROOT / "version.txt"
    if version_file.exists():
        return version_file.read_text().strip()
    return "unknown"


def sync_directory(src: Path, dst: Path, dry_run: bool = False) -> list:
    """Sync source directory to destination, return list of actions."""
    actions = []
    
    if not src.exists():
        return [f"SKIP: Source not found: {src}"]
    
    # Create destination if needed
    if not dry_run:
        dst.mkdir(parents=True, exist_ok=True)
    
    # Copy all files from source
    for src_file in sorted(src.rglob("*")):
        if src_file.is_dir():
            continue
        if src_file.name.startswith('.') or '__pycache__' in str(src_file):
            continue
        
        rel_path = src_file.relative_to(src)
        dst_file = dst / rel_path
        
        # Check if file needs updating
        needs_update = True
        if dst_file.exists():
            src_content = src_file.read_bytes()
            dst_content = dst_file.read_bytes()
            if src_content == dst_content:
                needs_update = False
        
        if needs_update:
            if not dry_run:
                dst_file.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src_file, dst_file)
            actions.append(f"{'WOULD COPY' if dry_run else 'COPIED'}: {rel_path} -> {dst_file}")
        else:
            actions.append(f"UP-TO-DATE: {rel_path}")
    
    return actions


def build(dry_run: bool = False, clean: bool = False):
    """Main build function."""
    version = get_version()
    print(f"UI/UX Pro Max Build v{version}")
    print(f"Source: {SRC_DIR}")
    print(f"Mode: {'DRY RUN' if dry_run else 'CLEAN + SYNC' if clean else 'SYNC'}")
    print("=" * 60)
    
    if not SRC_DATA.exists():
        print(f"ERROR: Source data directory not found: {SRC_DATA}")
        sys.exit(1)
    
    if not SRC_SCRIPTS.exists():
        print(f"ERROR: Source scripts directory not found: {SRC_SCRIPTS}")
        sys.exit(1)
    
    total_copied = 0
    total_uptodate = 0
    
    for editor, config in EDITOR_TARGETS.items():
        editor_dir = PROJECT_ROOT / editor
        if not editor_dir.exists():
            print(f"\nSKIP: {editor} (directory not found)")
            continue
        
        skill_dir = editor_dir / config["skill_dir"]
        print(f"\n{'=' * 40}")
        print(f"Target: {editor}/{config['skill_dir']}")
        
        if clean and not dry_run:
            data_dir = skill_dir / "data"
            scripts_dir = skill_dir / "scripts"
            if data_dir.exists():
                shutil.rmtree(data_dir)
                print(f"  CLEANED: {data_dir}")
            if scripts_dir.exists():
                shutil.rmtree(scripts_dir)
                print(f"  CLEANED: {scripts_dir}")
        
        # Sync data
        data_actions = sync_directory(SRC_DATA, skill_dir / "data", dry_run)
        for action in data_actions:
            if "COPIED" in action or "WOULD COPY" in action:
                total_copied += 1
                print(f"  {action}")
            else:
                total_uptodate += 1
        
        # Sync scripts
        script_actions = sync_directory(SRC_SCRIPTS, skill_dir / "scripts", dry_run)
        for action in script_actions:
            if "COPIED" in action or "WOULD COPY" in action:
                total_copied += 1
                print(f"  {action}")
            else:
                total_uptodate += 1
    
    print(f"\n{'=' * 60}")
    print(f"Summary: {total_copied} files {'would be ' if dry_run else ''}copied, {total_uptodate} up-to-date")
    print(f"Version: {version}")


if __name__ == "__main__":
    dry_run = "--check" in sys.argv or "--dry-run" in sys.argv
    clean = "--clean" in sys.argv
    build(dry_run=dry_run, clean=clean)
