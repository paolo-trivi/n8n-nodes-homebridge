#!/usr/bin/env python3
"""
generate_index.py - Genera un file INDEX.md navigabile per la cartella docs/.

Crea un indice gerarchico con link a tutti i file Markdown generati,
organizzato per directory. Produce anche un README.md nella root docs/
se non esiste.
"""

import argparse
import logging
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("index")


def build_tree(docs_dir: Path) -> dict:
    """Build a nested dict representing the directory structure."""
    tree: dict = {}
    md_files = sorted(docs_dir.rglob("*.md"))

    for md_file in md_files:
        # Skip special files
        if md_file.name.startswith(".") or md_file.name in ("INDEX.md",):
            continue
        # Skip assets directory
        rel = md_file.relative_to(docs_dir)
        if str(rel).startswith("assets"):
            continue

        parts = list(rel.parts)
        node = tree
        for part in parts[:-1]:
            node = node.setdefault(part, {})
        node[parts[-1]] = md_file

    return tree


def render_tree(tree: dict, docs_dir: Path, prefix: str = "", depth: int = 0) -> list[str]:
    """Render the tree as Markdown lines."""
    lines: list[str] = []
    indent = "  " * depth

    # Sort: directories first, then files
    dirs = sorted(k for k, v in tree.items() if isinstance(v, dict))
    files = sorted(k for k, v in tree.items() if isinstance(v, Path))

    for d in dirs:
        lines.append(f"{indent}- **{d}/**")
        lines.extend(render_tree(tree[d], docs_dir, prefix=f"{prefix}{d}/", depth=depth + 1))

    for f in files:
        path: Path = tree[f]
        rel = path.relative_to(docs_dir)
        name = path.stem.replace("_", " ").replace("-", " ").title()
        lines.append(f"{indent}- [{name}]({rel})")

    return lines


def generate_index(docs_dir: Path) -> None:
    tree = build_tree(docs_dir)

    if not tree:
        log.warning("No Markdown files found in %s", docs_dir)
        return

    lines = [
        "# Document Index",
        "",
        "> Auto-generated index of all documents synced from Google Drive.",
        "> Do not edit manually - this file is regenerated at each sync.",
        "",
    ]
    lines.extend(render_tree(tree, docs_dir))
    lines.append("")

    index_path = docs_dir / "INDEX.md"
    index_path.write_text("\n".join(lines), encoding="utf-8")
    log.info("Generated %s with %d entries", index_path, sum(1 for l in lines if l.strip().startswith("- [")))


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate docs index")
    parser.add_argument("--docs-dir", type=str, default="docs", help="Docs directory")
    args = parser.parse_args()

    generate_index(Path(args.docs_dir))


if __name__ == "__main__":
    main()
