#!/usr/bin/env python3
"""Tests for scripts/convert.py"""

import json
import os
import shutil
import subprocess
import textwrap
from pathlib import Path

import pytest

# Add scripts to path so we can import convert
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from convert import (
    ConvertContext,
    copy_direct,
    copy_image,
    convert_all,
    convert_table,
    file_hash,
    load_manifest,
    save_manifest,
)

HAS_PANDOC = shutil.which("pandoc") is not None


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest.fixture
def tmp_dirs(tmp_path):
    """Create raw_data and docs directories for testing."""
    raw_dir = tmp_path / "raw_data"
    docs_dir = tmp_path / "docs"
    raw_dir.mkdir()
    docs_dir.mkdir()
    return raw_dir, docs_dir


@pytest.fixture
def ctx(tmp_dirs):
    """Create a ConvertContext for testing."""
    raw_dir, docs_dir = tmp_dirs
    return ConvertContext(raw_dir=raw_dir, docs_dir=docs_dir)


# ---------------------------------------------------------------------------
# file_hash
# ---------------------------------------------------------------------------
class TestFileHash:
    def test_deterministic(self, tmp_path):
        f = tmp_path / "test.txt"
        f.write_text("hello world")
        assert file_hash(f) == file_hash(f)

    def test_different_content_different_hash(self, tmp_path):
        f1 = tmp_path / "a.txt"
        f2 = tmp_path / "b.txt"
        f1.write_text("hello")
        f2.write_text("world")
        assert file_hash(f1) != file_hash(f2)

    def test_empty_file(self, tmp_path):
        f = tmp_path / "empty.txt"
        f.write_bytes(b"")
        h = file_hash(f)
        assert isinstance(h, str)
        assert len(h) == 64  # SHA-256 hex length


# ---------------------------------------------------------------------------
# Manifest
# ---------------------------------------------------------------------------
class TestManifest:
    def test_load_missing(self, tmp_path):
        assert load_manifest(tmp_path / "nonexistent.json") == {}

    def test_save_and_load(self, tmp_path):
        manifest_file = tmp_path / ".manifest.json"
        data = {"file1.docx": "abc123", "sub/file2.csv": "def456"}
        save_manifest(data, manifest_file)
        loaded = load_manifest(manifest_file)
        assert loaded == data

    def test_load_corrupt_json(self, tmp_path):
        manifest_file = tmp_path / ".manifest.json"
        manifest_file.write_text("{broken json")
        result = load_manifest(manifest_file)
        assert result == {}

    def test_load_non_dict_json(self, tmp_path):
        manifest_file = tmp_path / ".manifest.json"
        manifest_file.write_text('["a", "b"]')
        result = load_manifest(manifest_file)
        assert result == {}

    def test_atomic_write(self, tmp_path):
        """Verify save_manifest writes atomically (no .json.tmp left behind)."""
        manifest_file = tmp_path / ".manifest.json"
        save_manifest({"key": "value"}, manifest_file)
        assert manifest_file.exists()
        tmp_file = manifest_file.with_suffix(".json.tmp")
        assert not tmp_file.exists()

    def test_save_creates_parent_dirs(self, tmp_path):
        manifest_file = tmp_path / "deep" / "nested" / ".manifest.json"
        save_manifest({"k": "v"}, manifest_file)
        assert manifest_file.exists()


# ---------------------------------------------------------------------------
# ConvertContext
# ---------------------------------------------------------------------------
class TestConvertContext:
    def test_derived_paths(self, tmp_dirs):
        raw_dir, docs_dir = tmp_dirs
        ctx = ConvertContext(raw_dir=raw_dir, docs_dir=docs_dir)
        assert ctx.assets_dir == docs_dir / "assets"
        assert ctx.manifest_file == docs_dir / ".manifest.json"

    def test_relative_output(self, ctx, tmp_dirs):
        raw_dir, _ = tmp_dirs
        src = raw_dir / "subdir" / "report.docx"
        dst = ctx.relative_output(src)
        assert dst.name == "report.md"
        assert "subdir" in str(dst)

    def test_relative_asset_output(self, ctx, tmp_dirs):
        raw_dir, _ = tmp_dirs
        src = raw_dir / "images" / "photo.png"
        dst = ctx.relative_asset_output(src)
        assert dst.name == "photo.png"
        assert "assets" in str(dst)
        assert "images" in str(dst)


# ---------------------------------------------------------------------------
# copy_direct
# ---------------------------------------------------------------------------
class TestCopyDirect:
    def test_copy_txt(self, ctx, tmp_dirs):
        raw_dir, docs_dir = tmp_dirs
        src = raw_dir / "note.txt"
        src.write_text("Some plain text content")
        dst = ctx.relative_output(src)

        assert copy_direct(src, dst) is True
        assert dst.exists()
        assert dst.read_text() == "Some plain text content"

    def test_copy_md(self, ctx, tmp_dirs):
        raw_dir, _ = tmp_dirs
        src = raw_dir / "readme.md"
        src.write_text("# Title\n\nContent here")
        dst = ctx.relative_output(src)

        assert copy_direct(src, dst) is True
        assert dst.read_text() == "# Title\n\nContent here"

    def test_creates_parent_dirs(self, ctx, tmp_dirs):
        raw_dir, _ = tmp_dirs
        src = raw_dir / "deep" / "nested" / "file.txt"
        src.parent.mkdir(parents=True)
        src.write_text("deep content")
        dst = ctx.relative_output(src)

        assert copy_direct(src, dst) is True
        assert dst.exists()


# ---------------------------------------------------------------------------
# copy_image
# ---------------------------------------------------------------------------
class TestCopyImage:
    def test_copy_and_stub(self, ctx, tmp_dirs):
        raw_dir, _ = tmp_dirs
        src = raw_dir / "photo.png"
        src.write_bytes(b"\x89PNG\r\n\x1a\n")  # PNG header
        dst_asset = ctx.relative_asset_output(src)
        dst_md = ctx.relative_output(src)

        assert copy_image(src, dst_asset, dst_md) is True
        assert dst_asset.exists()
        assert dst_md.exists()

        md_content = dst_md.read_text()
        assert "photo.png" in md_content
        assert "![photo.png]" in md_content

    def test_relative_path_in_stub(self, ctx, tmp_dirs):
        raw_dir, _ = tmp_dirs
        src = raw_dir / "sub" / "img.jpg"
        src.parent.mkdir(parents=True)
        src.write_bytes(b"\xff\xd8\xff\xe0")  # JPEG header
        dst_asset = ctx.relative_asset_output(src)
        dst_md = ctx.relative_output(src)

        copy_image(src, dst_asset, dst_md)
        md_content = dst_md.read_text()
        # The relative path should point from docs/sub/ to docs/assets/sub/
        assert "assets" in md_content


# ---------------------------------------------------------------------------
# convert_table
# ---------------------------------------------------------------------------
class TestConvertTable:
    def test_csv(self, ctx, tmp_dirs):
        raw_dir, _ = tmp_dirs
        src = raw_dir / "data.csv"
        src.write_text("name,age,city\nAlice,30,Rome\nBob,25,Milan\n")
        dst = ctx.relative_output(src)

        assert convert_table(src, dst) is True
        content = dst.read_text()
        assert "Alice" in content
        assert "Bob" in content
        assert "| name" in content or "|name" in content  # markdown table

    def test_tsv(self, ctx, tmp_dirs):
        raw_dir, _ = tmp_dirs
        src = raw_dir / "data.tsv"
        src.write_text("col1\tcol2\nval1\tval2\n")
        dst = ctx.relative_output(src)

        assert convert_table(src, dst) is True
        content = dst.read_text()
        assert "val1" in content

    def test_empty_csv(self, ctx, tmp_dirs):
        raw_dir, _ = tmp_dirs
        src = raw_dir / "empty.csv"
        src.write_bytes(b"")
        dst = ctx.relative_output(src)

        assert convert_table(src, dst) is True
        content = dst.read_text()
        assert "Empty file" in content

    def test_csv_headers_only(self, ctx, tmp_dirs):
        raw_dir, _ = tmp_dirs
        src = raw_dir / "headers.csv"
        src.write_text("col1,col2,col3\n")
        dst = ctx.relative_output(src)

        assert convert_table(src, dst) is True
        assert dst.exists()

    def test_unsupported_extension_returns_false(self, ctx, tmp_dirs):
        raw_dir, _ = tmp_dirs
        src = raw_dir / "data.xyz"
        src.write_text("something")
        dst = ctx.relative_output(src)

        assert convert_table(src, dst) is False


# ---------------------------------------------------------------------------
# convert_all (integration)
# ---------------------------------------------------------------------------
class TestConvertAll:
    def test_empty_raw_dir(self, ctx):
        stats = convert_all(ctx)
        assert stats["converted"] == 0
        assert stats["failed"] == 0

    def test_nonexistent_raw_dir(self, tmp_path):
        ctx = ConvertContext(
            raw_dir=tmp_path / "doesnt_exist",
            docs_dir=tmp_path / "docs",
        )
        stats = convert_all(ctx)
        assert stats["converted"] == 0

    def test_converts_txt_and_csv(self, ctx, tmp_dirs):
        raw_dir, docs_dir = tmp_dirs
        # Create a .txt file
        (raw_dir / "notes.txt").write_text("hello world")
        # Create a .csv file
        (raw_dir / "data.csv").write_text("a,b\n1,2\n")

        stats = convert_all(ctx)
        assert stats["converted"] == 2
        assert stats["failed"] == 0
        assert (docs_dir / "notes.md").exists()
        assert (docs_dir / "data.md").exists()

    def test_skips_unsupported(self, ctx, tmp_dirs):
        raw_dir, _ = tmp_dirs
        (raw_dir / "binary.exe").write_bytes(b"\x00\x01\x02")

        stats = convert_all(ctx)
        assert stats["skipped"] == 1
        assert stats["converted"] == 0

    def test_incremental_build(self, ctx, tmp_dirs):
        raw_dir, docs_dir = tmp_dirs
        (raw_dir / "file.txt").write_text("content v1")

        # First run: converts
        stats1 = convert_all(ctx)
        assert stats1["converted"] == 1
        assert stats1["unchanged"] == 0

        # Second run: unchanged
        stats2 = convert_all(ctx)
        assert stats2["converted"] == 0
        assert stats2["unchanged"] == 1

        # Modify file: converts again
        (raw_dir / "file.txt").write_text("content v2")
        stats3 = convert_all(ctx)
        assert stats3["converted"] == 1
        assert stats3["unchanged"] == 0

    def test_force_reconverts(self, ctx, tmp_dirs):
        raw_dir, _ = tmp_dirs
        (raw_dir / "file.txt").write_text("content")

        convert_all(ctx)
        stats = convert_all(ctx, force=True)
        assert stats["converted"] == 1
        assert stats["unchanged"] == 0

    def test_stale_removal(self, ctx, tmp_dirs):
        raw_dir, docs_dir = tmp_dirs
        (raw_dir / "old.txt").write_text("old content")
        convert_all(ctx)
        assert (docs_dir / "old.md").exists()

        # Remove source file, re-run
        (raw_dir / "old.txt").unlink()
        stats = convert_all(ctx)
        assert stats["removed"] == 1
        assert not (docs_dir / "old.md").exists()

    def test_hidden_files_skipped(self, ctx, tmp_dirs):
        raw_dir, _ = tmp_dirs
        (raw_dir / ".hidden").write_text("secret")
        (raw_dir / "visible.txt").write_text("public")

        stats = convert_all(ctx)
        assert stats["converted"] == 1

    def test_nested_directories(self, ctx, tmp_dirs):
        raw_dir, docs_dir = tmp_dirs
        sub = raw_dir / "team" / "project"
        sub.mkdir(parents=True)
        (sub / "doc.txt").write_text("nested doc")

        stats = convert_all(ctx)
        assert stats["converted"] == 1
        assert (docs_dir / "team" / "project" / "doc.md").exists()

    def test_image_conversion(self, ctx, tmp_dirs):
        raw_dir, docs_dir = tmp_dirs
        (raw_dir / "logo.png").write_bytes(b"\x89PNG\r\n\x1a\n")

        stats = convert_all(ctx)
        assert stats["converted"] == 1
        assert (docs_dir / "assets" / "logo.png").exists()
        assert (docs_dir / "logo.md").exists()

    @pytest.mark.skipif(not HAS_PANDOC, reason="pandoc not installed")
    def test_docx_conversion(self, ctx, tmp_dirs):
        """Integration test with real pandoc - requires pandoc installed."""
        raw_dir, docs_dir = tmp_dirs
        # Create a minimal docx-like file that pandoc can read
        # (a real docx is a zip file, so let's test the pipeline handles failure)
        (raw_dir / "test.docx").write_bytes(b"not a real docx")

        stats = convert_all(ctx)
        # Pandoc will fail on invalid docx, which is expected
        assert stats["failed"] == 1

    def test_symlink_outside_raw_dir(self, ctx, tmp_dirs):
        """Symlinks pointing outside raw_dir should be skipped."""
        raw_dir, _ = tmp_dirs
        outside = tmp_dirs[1].parent / "outside_secret.txt"  # in tmp_path
        outside.write_text("sensitive data")

        link = raw_dir / "sneaky_link.txt"
        try:
            link.symlink_to(outside)
        except OSError:
            pytest.skip("Symlinks not supported on this platform")

        stats = convert_all(ctx)
        assert stats["converted"] == 0

    def test_manifest_survives_corruption(self, ctx, tmp_dirs):
        raw_dir, docs_dir = tmp_dirs
        (raw_dir / "file.txt").write_text("content")

        # First convert
        convert_all(ctx)

        # Corrupt manifest
        ctx.manifest_file.write_text("NOT JSON {{{")

        # Should recover and reconvert
        stats = convert_all(ctx)
        assert stats["converted"] == 1
        assert stats["failed"] == 0
