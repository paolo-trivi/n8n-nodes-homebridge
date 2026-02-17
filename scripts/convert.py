#!/usr/bin/env python3
"""
convert.py - Converte i file scaricati dal Google Drive in Markdown.

Tipi supportati:
  .docx  -> Markdown (via Pandoc)
  .xlsx   -> Markdown table (via Pandas)
  .csv    -> Markdown table (via Pandas)
  .pptx   -> Markdown (via Pandoc)
  .pdf    -> Markdown (via marker-pdf, fallback Pandoc plain text)
  .md     -> Copia diretta
  .txt    -> Copia diretta
  .html   -> Markdown (via Pandoc)
  .rtf    -> Markdown (via Pandoc)
  .odt    -> Markdown (via Pandoc)
  .odp    -> Markdown (via Pandoc)
  .ods    -> Markdown table (via Pandas)
  .tsv    -> Markdown table (via Pandas)

Immagini (.png, .jpg, .jpeg, .gif, .svg, .webp) vengono copiate in docs/assets/
e un file .md stub viene generato con il link all'immagine.

File non supportati vengono ignorati con un warning.
"""

import argparse
import hashlib
import json
import logging
import os
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
PANDOC_TYPES = {
    ".docx": "markdown",
    ".pptx": "markdown",
    ".html": "markdown",
    ".rtf": "markdown",
    ".odt": "markdown",
    ".odp": "markdown",
}

TABLE_TYPES = {".xlsx", ".csv", ".ods", ".tsv"}

COPY_TYPES = {".md", ".txt"}

IMAGE_TYPES = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"}

PDF_TYPE = ".pdf"

ALL_SUPPORTED = (
    set(PANDOC_TYPES.keys()) | TABLE_TYPES | COPY_TYPES | IMAGE_TYPES | {PDF_TYPE}
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("convert")


@dataclass
class ConvertContext:
    """Holds directory paths for the current conversion run."""
    raw_dir: Path
    docs_dir: Path
    assets_dir: Path = field(init=False)
    manifest_file: Path = field(init=False)

    def __post_init__(self) -> None:
        self.assets_dir = self.docs_dir / "assets"
        self.manifest_file = self.docs_dir / ".manifest.json"

    def relative_output(self, src: Path) -> Path:
        """Map raw_data/sub/dir/file.docx -> docs/sub/dir/file.md"""
        rel = src.relative_to(self.raw_dir)
        return self.docs_dir / rel.with_suffix(".md")

    def relative_asset_output(self, src: Path) -> Path:
        """Map raw_data/sub/dir/img.png -> docs/assets/sub/dir/img.png"""
        rel = src.relative_to(self.raw_dir)
        return self.assets_dir / rel


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def file_hash(path: Path) -> str:
    """SHA-256 hash of a file (used for incremental builds)."""
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def load_manifest(manifest_file: Path) -> dict:
    if not manifest_file.exists():
        return {}
    try:
        with open(manifest_file) as fh:
            data = json.load(fh)
            if not isinstance(data, dict):
                log.warning("Manifest is not a dict, resetting.")
                return {}
            return data
    except (json.JSONDecodeError, OSError) as exc:
        log.warning("Corrupt manifest, resetting: %s", exc)
        return {}


def save_manifest(manifest: dict, manifest_file: Path) -> None:
    """Atomic write: write to temp file then rename to prevent corruption."""
    manifest_file.parent.mkdir(parents=True, exist_ok=True)
    tmp_file = manifest_file.with_suffix(".json.tmp")
    with open(tmp_file, "w") as fh:
        json.dump(manifest, fh, indent=2, sort_keys=True)
    tmp_file.replace(manifest_file)


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def run_cmd(cmd: list[str], desc: str) -> subprocess.CompletedProcess:
    log.debug("Running: %s", " ".join(cmd))
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        log.error("%s failed: %s", desc, result.stderr.strip())
    return result


# ---------------------------------------------------------------------------
# Converters
# ---------------------------------------------------------------------------
def convert_pandoc(src: Path, dst: Path, to_format: str, ctx: ConvertContext) -> bool:
    """Convert via Pandoc."""
    ensure_parent(dst)
    media_dir = ctx.assets_dir / src.relative_to(ctx.raw_dir).parent / (src.stem + "_media")
    cmd = [
        "pandoc", str(src),
        "-t", to_format,
        "-o", str(dst),
        "--wrap=none",
        f"--extract-media={media_dir}",
    ]
    result = run_cmd(cmd, f"Pandoc {src.name}")
    if result.returncode != 0:
        cmd_simple = [
            "pandoc", str(src), "-t", to_format, "-o", str(dst), "--wrap=none"
        ]
        result = run_cmd(cmd_simple, f"Pandoc (no media) {src.name}")
    return result.returncode == 0


def convert_table(src: Path, dst: Path) -> bool:
    """Convert spreadsheet/CSV to Markdown table via Pandas."""
    import pandas as pd

    ensure_parent(dst)
    ext = src.suffix.lower()

    try:
        if src.stat().st_size == 0:
            log.warning("Empty file, creating stub: %s", src.name)
            with open(dst, "w", encoding="utf-8") as fh:
                fh.write(f"# {src.stem}\n\n*Empty file*\n")
            return True

        if ext == ".csv":
            df = pd.read_csv(src)
        elif ext == ".tsv":
            df = pd.read_csv(src, sep="\t")
        elif ext in (".xlsx", ".ods"):
            sheets = pd.read_excel(src, sheet_name=None, engine=None)
            parts = []
            for sheet_name, sheet_df in sheets.items():
                parts.append(f"## {sheet_name}\n\n{sheet_df.to_markdown(index=False)}")
            with open(dst, "w", encoding="utf-8") as fh:
                fh.write(f"# {src.stem}\n\n" + "\n\n---\n\n".join(parts) + "\n")
            return True
        else:
            return False

        with open(dst, "w", encoding="utf-8") as fh:
            fh.write(f"# {src.stem}\n\n{df.to_markdown(index=False)}\n")
        return True

    except Exception as exc:
        log.error("Table conversion failed for %s: %s", src.name, exc)
        return False


def convert_pdf(src: Path, dst: Path, ctx: ConvertContext) -> bool:
    """Convert PDF: try marker-pdf first, then Pandoc plain text fallback."""
    ensure_parent(dst)

    # Strategy 1: marker (high quality, preserves structure)
    if shutil.which("marker_single"):
        tmp_out = dst.parent / f".{src.stem}_marker_tmp"
        tmp_out.mkdir(parents=True, exist_ok=True)
        try:
            result = run_cmd(
                ["marker_single", str(src), str(tmp_out)],
                f"marker {src.name}",
            )
            if result.returncode == 0:
                md_files = list(tmp_out.rglob("*.md"))
                if md_files:
                    shutil.move(str(md_files[0]), str(dst))
                    for img in tmp_out.rglob("*"):
                        if img.suffix.lower() in IMAGE_TYPES and img.is_file():
                            img_dst = ctx.assets_dir / src.relative_to(ctx.raw_dir).parent / img.name
                            img_dst.parent.mkdir(parents=True, exist_ok=True)
                            shutil.move(str(img), str(img_dst))
                    return True
        finally:
            shutil.rmtree(tmp_out, ignore_errors=True)

    # Strategy 2: Pandoc plain text extraction
    result = run_cmd(
        ["pandoc", str(src), "-t", "markdown", "-o", str(dst), "--wrap=none"],
        f"Pandoc PDF {src.name}",
    )
    if result.returncode == 0:
        return True

    # Strategy 3: pdftotext (poppler)
    if shutil.which("pdftotext"):
        txt_path = dst.with_suffix(".txt")
        result = run_cmd(
            ["pdftotext", "-layout", str(src), str(txt_path)],
            f"pdftotext {src.name}",
        )
        if result.returncode == 0 and txt_path.exists():
            content = txt_path.read_text(encoding="utf-8", errors="replace")
            with open(dst, "w", encoding="utf-8") as fh:
                fh.write(f"# {src.stem}\n\n```\n{content}\n```\n")
            txt_path.unlink(missing_ok=True)
            return True

    log.error("All PDF conversion strategies failed for %s", src.name)
    return False


def copy_direct(src: Path, dst: Path) -> bool:
    """Copy text files directly."""
    ensure_parent(dst)
    shutil.copy2(src, dst)
    return True


def copy_image(src: Path, dst_asset: Path, dst_md: Path) -> bool:
    """Copy image to assets/ and create a stub .md with the image link."""
    ensure_parent(dst_asset)
    ensure_parent(dst_md)
    shutil.copy2(src, dst_asset)

    try:
        rel = os.path.relpath(dst_asset, dst_md.parent)
    except ValueError:
        rel = str(dst_asset)

    with open(dst_md, "w", encoding="utf-8") as fh:
        fh.write(f"# {src.stem}\n\n![{src.name}]({rel})\n")
    return True


# ---------------------------------------------------------------------------
# Main conversion loop
# ---------------------------------------------------------------------------
def convert_all(ctx: ConvertContext, force: bool = False) -> dict:
    """Walk raw_data/ and convert everything. Returns stats dict."""
    manifest = load_manifest(ctx.manifest_file) if not force else {}
    new_manifest: dict[str, str] = {}
    stats = {"converted": 0, "skipped": 0, "failed": 0, "unchanged": 0, "removed": 0}

    if not ctx.raw_dir.exists():
        log.warning("Source directory '%s' does not exist. Nothing to convert.", ctx.raw_dir)
        return stats

    ctx.docs_dir.mkdir(parents=True, exist_ok=True)
    ctx.assets_dir.mkdir(parents=True, exist_ok=True)

    source_files: list[Path] = []
    raw_dir_resolved = ctx.raw_dir.resolve()
    for path in sorted(ctx.raw_dir.rglob("*")):
        if not path.is_file() or path.name.startswith("."):
            continue
        # Guard against symlinks escaping the raw_dir
        if not path.resolve().is_relative_to(raw_dir_resolved):
            log.warning("Skipping symlink outside raw_dir: %s", path)
            continue
        source_files.append(path)

    log.info("Found %d files in %s", len(source_files), ctx.raw_dir)

    for src in source_files:
        ext = src.suffix.lower()
        src_key = str(src.relative_to(ctx.raw_dir))

        # Check if file changed (incremental build)
        current_hash = file_hash(src)
        if not force and manifest.get(src_key) == current_hash:
            dst = ctx.relative_output(src)
            if dst.exists():
                new_manifest[src_key] = current_hash
                stats["unchanged"] += 1
                log.debug("Unchanged: %s", src_key)
                continue

        ok = False

        if ext in PANDOC_TYPES:
            dst = ctx.relative_output(src)
            ok = convert_pandoc(src, dst, PANDOC_TYPES[ext], ctx)

        elif ext in TABLE_TYPES:
            dst = ctx.relative_output(src)
            ok = convert_table(src, dst)

        elif ext == PDF_TYPE:
            dst = ctx.relative_output(src)
            ok = convert_pdf(src, dst, ctx)

        elif ext in COPY_TYPES:
            dst = ctx.relative_output(src)
            ok = copy_direct(src, dst)

        elif ext in IMAGE_TYPES:
            dst_asset = ctx.relative_asset_output(src)
            dst_md = ctx.relative_output(src)
            ok = copy_image(src, dst_asset, dst_md)

        else:
            log.warning("Unsupported file type '%s': %s", ext, src_key)
            stats["skipped"] += 1
            continue

        if ok:
            new_manifest[src_key] = current_hash
            stats["converted"] += 1
            log.info("Converted: %s", src_key)
        else:
            stats["failed"] += 1
            log.error("Failed: %s", src_key)

    # Cleanup: remove docs for files no longer in raw_data
    old_keys = set(manifest.keys()) - set(new_manifest.keys())
    for old_key in old_keys:
        old_src = ctx.raw_dir / old_key
        old_dst = ctx.relative_output(old_src)
        if old_dst.exists():
            old_dst.unlink()
            log.info("Removed stale: %s", old_dst)
            stats["removed"] += 1

    save_manifest(new_manifest, ctx.manifest_file)

    log.info(
        "Done: %d converted, %d unchanged, %d skipped, %d failed, %d removed",
        stats["converted"],
        stats["unchanged"],
        stats["skipped"],
        stats["failed"],
        stats["removed"],
    )
    return stats


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert Drive files from raw_data/ to Markdown in docs/"
    )
    parser.add_argument(
        "--force", action="store_true", help="Force reconversion of all files"
    )
    parser.add_argument(
        "--raw-dir", type=str, default="raw_data", help="Source directory"
    )
    parser.add_argument(
        "--docs-dir", type=str, default="docs", help="Output directory"
    )
    parser.add_argument("--verbose", "-v", action="store_true", help="Debug logging")
    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    if not shutil.which("pandoc"):
        log.error("pandoc is not installed. Install it: https://pandoc.org/installing.html")
        sys.exit(1)

    ctx = ConvertContext(
        raw_dir=Path(args.raw_dir),
        docs_dir=Path(args.docs_dir),
    )

    stats = convert_all(ctx, force=args.force)

    if stats["failed"] > 0:
        log.warning("Some files failed to convert. Check logs above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
