#!/usr/bin/env python3
"""Tests for scripts/generate_index.py"""

from pathlib import Path

import pytest

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from generate_index import build_tree, generate_index, render_tree


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest.fixture
def docs_dir(tmp_path):
    d = tmp_path / "docs"
    d.mkdir()
    return d


def _create_md(docs_dir: Path, rel_path: str, content: str = "# Test\n") -> Path:
    """Helper to create a .md file in docs_dir."""
    p = docs_dir / rel_path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content)
    return p


# ---------------------------------------------------------------------------
# build_tree
# ---------------------------------------------------------------------------
class TestBuildTree:
    def test_empty_docs(self, docs_dir):
        tree = build_tree(docs_dir)
        assert tree == {}

    def test_flat_files(self, docs_dir):
        _create_md(docs_dir, "alpha.md")
        _create_md(docs_dir, "beta.md")
        tree = build_tree(docs_dir)
        assert "alpha.md" in tree
        assert "beta.md" in tree

    def test_nested_structure(self, docs_dir):
        _create_md(docs_dir, "team/report.md")
        _create_md(docs_dir, "team/notes.md")
        _create_md(docs_dir, "standalone.md")
        tree = build_tree(docs_dir)
        assert "team" in tree
        assert isinstance(tree["team"], dict)
        assert "report.md" in tree["team"]
        assert "standalone.md" in tree

    def test_skips_index_md(self, docs_dir):
        _create_md(docs_dir, "INDEX.md")
        _create_md(docs_dir, "real_doc.md")
        tree = build_tree(docs_dir)
        assert "INDEX.md" not in tree
        assert "real_doc.md" in tree

    def test_skips_hidden_files(self, docs_dir):
        _create_md(docs_dir, ".manifest.json", '{"key": "val"}')
        _create_md(docs_dir, "visible.md")
        tree = build_tree(docs_dir)
        assert ".manifest.json" not in tree

    def test_skips_assets_dir(self, docs_dir):
        _create_md(docs_dir, "assets/image_stub.md")
        _create_md(docs_dir, "real.md")
        tree = build_tree(docs_dir)
        assert "assets" not in tree

    def test_deeply_nested(self, docs_dir):
        _create_md(docs_dir, "a/b/c/deep.md")
        tree = build_tree(docs_dir)
        assert "a" in tree
        assert "b" in tree["a"]
        assert "c" in tree["a"]["b"]
        assert "deep.md" in tree["a"]["b"]["c"]


# ---------------------------------------------------------------------------
# render_tree
# ---------------------------------------------------------------------------
class TestRenderTree:
    def test_flat_render(self, docs_dir):
        _create_md(docs_dir, "doc.md")
        tree = build_tree(docs_dir)
        lines = render_tree(tree, docs_dir)
        assert len(lines) == 1
        assert "[Doc](doc.md)" in lines[0]

    def test_directory_rendered_bold(self, docs_dir):
        _create_md(docs_dir, "team/report.md")
        tree = build_tree(docs_dir)
        lines = render_tree(tree, docs_dir)
        dir_lines = [line for line in lines if "**team/**" in line]
        assert len(dir_lines) == 1

    def test_indentation_increases_with_depth(self, docs_dir):
        _create_md(docs_dir, "a/b/file.md")
        tree = build_tree(docs_dir)
        lines = render_tree(tree, docs_dir)
        # Level 0: "- **a/**"
        # Level 1: "  - **b/**"
        # Level 2: "    - [File](a/b/file.md)"
        deep_lines = [line for line in lines if "File" in line]
        assert deep_lines[0].startswith("    ")

    def test_name_formatting(self, docs_dir):
        _create_md(docs_dir, "my_fancy-doc.md")
        tree = build_tree(docs_dir)
        lines = render_tree(tree, docs_dir)
        # "my_fancy-doc" -> "My Fancy Doc"
        assert any("My Fancy Doc" in line for line in lines)


# ---------------------------------------------------------------------------
# generate_index (integration)
# ---------------------------------------------------------------------------
class TestGenerateIndex:
    def test_creates_index_md(self, docs_dir):
        _create_md(docs_dir, "guide.md")
        _create_md(docs_dir, "faq.md")
        generate_index(docs_dir)
        index = docs_dir / "INDEX.md"
        assert index.exists()
        content = index.read_text()
        assert "# Document Index" in content
        assert "Guide" in content
        assert "Faq" in content

    def test_empty_docs_no_index(self, docs_dir):
        generate_index(docs_dir)
        assert not (docs_dir / "INDEX.md").exists()

    def test_index_has_auto_generated_warning(self, docs_dir):
        _create_md(docs_dir, "doc.md")
        generate_index(docs_dir)
        content = (docs_dir / "INDEX.md").read_text()
        assert "Do not edit manually" in content

    def test_index_with_subdirs(self, docs_dir):
        _create_md(docs_dir, "team/standup.md")
        _create_md(docs_dir, "team/retro.md")
        _create_md(docs_dir, "onboarding.md")
        generate_index(docs_dir)
        content = (docs_dir / "INDEX.md").read_text()
        assert "**team/**" in content
        assert "Standup" in content
        assert "Retro" in content
        assert "Onboarding" in content

    def test_regeneration_overwrites(self, docs_dir):
        _create_md(docs_dir, "v1.md")
        generate_index(docs_dir)

        # Remove v1, add v2
        (docs_dir / "v1.md").unlink()
        _create_md(docs_dir, "v2.md")
        generate_index(docs_dir)

        content = (docs_dir / "INDEX.md").read_text()
        assert "V1" not in content
        assert "V2" in content
