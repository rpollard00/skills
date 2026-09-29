import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "scripts"))
from link_skills import InstallError, apply, plan
from markdown_lists import markdown_files, to_lists
from validate_skills import local_links, named_skill_dependencies, validate


def make_skill(root, name="sample", *, category="", hidden=False):
    directory = root / category / name
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "SKILL.md").write_text(
        f"---\nname: {name}\ndescription: A fixture skill.\n"
        + ('disable-model-invocation: true\nmetadata:\n  opencode/autoinvoke: "false"\n' if hidden else "")
        + "---\n\n# Fixture\n",
        encoding="utf-8",
    )
    return directory


class ValidationTests(unittest.TestCase):
    def test_repository(self):
        root = REPO / "skills"
        self.assertEqual(validate(root), [])
        self.assertEqual(set(root.rglob("SKILL.md")), set(root.glob("*/SKILL.md")))

    def test_missing_dependency_is_reported(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            skill = make_skill(root)
            with (skill / "SKILL.md").open("a") as f:
                f.write("Read [the procedure](references/missing.md).\n")
            errors = validate(root)
            self.assertEqual(len(errors), 1)
            self.assertIn("missing local dependency", errors[0])
            (skill / "references").mkdir()
            (skill / "references/missing.md").write_text("# Procedure\n")
            self.assertEqual(validate(root), [])

    def test_duplicate_names(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            make_skill(root)
            make_skill(root, category="another")
            self.assertTrue(any("duplicate name" in e for e in validate(root)))

    def test_invalid_metadata(self):
        cases = [
            "# No frontmatter\n",
            "---\nname: []\ndescription: Test\n---\n",
            "---\nname: sample\ndescription: []\n---\n",
            '---\nname: sample\ndescription: Test\ndisable-model-invocation: "true"\n---\n',
            "---\nname: sample\ndescription: [\n---\n",
        ]
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            skill = make_skill(root)
            for text in cases:
                with self.subTest(text=text):
                    (skill / "SKILL.md").write_text(text)
                    self.assertTrue(validate(root))

    def test_explicit_only_requires_codex_policy(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            skill = make_skill(root, hidden=True)
            self.assertTrue(validate(root))
            (skill / "agents").mkdir()
            metadata = skill / "agents/openai.yaml"
            metadata.write_text("policy:\n  allow_implicit_invocation: true\n")
            self.assertTrue(validate(root))
            metadata.write_text("policy:\n  allow_implicit_invocation: false\n")
            self.assertEqual(validate(root), [])

    def test_mako_reaches_all_selected_skills(self):
        root = REPO / "skills"
        skills = {p.parent.name: p for p in root.glob("*/SKILL.md")}
        pending = [skills["mako"]]
        seen = set()
        while pending:
            path = pending.pop().resolve()
            if path in seen or not path.is_file() or path.suffix != ".md":
                continue
            seen.add(path)
            pending.extend(local_links(path))
            pending.extend(named_skill_dependencies(path, skills))
        selected = set(root.glob("*/SKILL.md"))
        self.assertEqual({p.resolve() for p in selected} - seen, set())
        self.assertEqual(len(list(root.glob("principle-*/SKILL.md"))), 23)

    def test_ui_design_extraction_wiring(self):
        root = REPO / "skills"
        skills = {p.parent.name: p for p in root.glob("*/SKILL.md")}
        self.assertEqual(len(skills), 53)
        shared = skills["ui-design"]
        for caller in (skills["mako"], root / "mako/playbooks/feature.md", skills["refine-ui"]):
            with self.subTest(caller=caller):
                self.assertIn(shared, named_skill_dependencies(caller, skills))
        for name in ("DESIGN-DISCIPLINE", "DESIGN-SYSTEM", "BROWSER-OBSERVATION", "VISUAL-MOCKUPS", "PDF-REFERENCE"):
            reference = root / f"ui-design/references/{name}.md"
            self.assertIn(reference, local_links(shared))
            self.assertFalse((root / f"refine-ui/references/{name}.md").exists())
        self.assertTrue((root / "ui-design/scripts/extract-pdf-reference.sh").is_file())
        self.assertFalse((root / "refine-ui/scripts/extract-pdf-reference.sh").exists())
        for name in ("DELEGATION", "HTML-REPORT"):
            self.assertTrue((root / f"refine-ui/references/{name}.md").is_file())
        pdf_reference = (root / "ui-design/references/PDF-REFERENCE.md").read_text()
        self.assertIn("refine-ui/.artifacts/pdf/", pdf_reference)
        self.assertIn("UI_DESIGN_ARTIFACTS_DIR", pdf_reference)
        self.assertIn("REFINE_UI_ARTIFACTS_DIR", pdf_reference)

    def test_named_dependencies_use_inventory_and_ignore_fenced_examples(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            skill = make_skill(root)
            reference = skill / "references/guide.md"
            reference.parent.mkdir()
            reference.write_text("Read `sample`. Not a skill: `value`.\n```\n`hidden`\n```\n")
            skills = {"sample": skill / "SKILL.md", "hidden": root / "hidden/SKILL.md"}
            self.assertEqual(list(named_skill_dependencies(reference, skills)), [skill / "SKILL.md"])


class InstallerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.repo = self.root / "checkout"
        self.source = make_skill(self.repo / "skills")
        self.home = self.root / "home"
        self.dest = self.home / ".pi/agent/skills"

    def test_plan_is_read_only_then_apply_is_idempotent(self):
        args = plan(self.repo, self.home, self.dest, False)
        self.assertFalse(self.home.exists())
        apply(*args)
        link = self.dest / "reese"
        self.assertEqual(link.resolve(), self.repo / "skills")
        self.assertTrue((link / "sample/SKILL.md").is_file())
        apply(*plan(self.repo, self.home, self.dest, False))
        self.assertEqual(list(self.dest.iterdir()), [link])

    def test_owned_flat_migration_requires_explicit_flag(self):
        old = self.home / ".agents/skills/sample"
        old.parent.mkdir(parents=True)
        old.symlink_to(self.source)
        with self.assertRaises(InstallError):
            plan(self.repo, self.home, self.dest, False)
        args = plan(self.repo, self.home, self.dest, True)
        self.assertTrue(old.is_symlink())
        self.assertFalse(self.dest.exists())
        apply(*args)
        self.assertFalse(old.is_symlink())
        self.assertTrue(self.source.is_dir())

    def test_pre_flattening_links_require_explicit_migration(self):
        old_categories = {
            "sample": "engineering", "principle-prove-it-works": "engineering-principles",
            "refine-ui": "design", "jj": "version-control", "writing": "writing",
            "simple-technical-english": "writing", "unslop": "writing",
        }
        for name, category in old_categories.items():
            with self.subTest(name=name):
                source = make_skill(self.repo / "skills", name=name)
                old = self.home / ".agents/skills" / name
                old.parent.mkdir(parents=True, exist_ok=True)
                target = self.repo / "skills" / category / name
                old.symlink_to(target)
                self.assertFalse(old.exists())
                with self.assertRaises(InstallError):
                    plan(self.repo, self.home, self.dest, False)
                args = plan(self.repo, self.home, self.dest, True)
                self.assertIn((old, target), args[2])
                self.assertTrue(old.is_symlink())
                apply(*args)
                self.assertFalse(old.is_symlink())
                self.assertTrue(source.is_dir())

    def test_foreign_dangling_skill_link_is_not_migrated(self):
        old = self.home / ".agents/skills/sample"
        old.parent.mkdir(parents=True)
        target = self.root / "foreign/skills/engineering/sample"
        old.symlink_to(target)
        args = plan(self.repo, self.home, self.dest, True)
        self.assertEqual(args[2], [])
        apply(*args)
        self.assertEqual(os.readlink(old), str(target))

    def test_foreign_copy_blocks_before_mutation(self):
        foreign = make_skill(self.home / ".agents/skills", category="collection")
        with self.assertRaises(InstallError):
            plan(self.repo, self.home, self.dest, True)
        self.assertTrue(foreign.is_dir())
        self.assertFalse(self.dest.exists())

    def test_pi_standalone_markdown_collision_is_preserved(self):
        self.dest.mkdir(parents=True)
        foreign = self.dest / "sample.md"
        foreign.write_text("---\nname: sample\ndescription: A standalone skill.\n---\n")
        with self.assertRaises(InstallError):
            plan(self.repo, self.home, self.dest, True)
        self.assertTrue(foreign.is_file())
        self.assertFalse((self.dest / "reese").exists())

    def test_foreign_bundle_and_broken_link_are_preserved(self):
        self.dest.mkdir(parents=True)
        target = self.dest / "reese"
        target.symlink_to(self.root / "absent")
        with self.assertRaises(InstallError):
            plan(self.repo, self.home, self.dest, True)
        self.assertEqual(os.readlink(target), str(self.root / "absent"))

    def test_destination_inside_repo_is_rejected(self):
        with self.assertRaises(InstallError):
            plan(self.repo, self.home, self.repo / "nested", True)

    def test_shared_destination_preserves_skill_links(self):
        dest = self.home / ".agents/skills"
        apply(*plan(self.repo, self.home, dest, False))
        self.assertEqual((dest / "reese/sample/SKILL.md").resolve(), self.source / "SKILL.md")

    def test_same_bundle_in_another_native_root_is_not_a_foreign_collision(self):
        apply(*plan(self.repo, self.home, self.dest, False))
        shared = self.home / ".agents/skills"
        apply(*plan(self.repo, self.home, shared, False))
        self.assertEqual((shared / "reese").resolve(), (self.dest / "reese").resolve())

    def test_unrelated_installation_is_preserved(self):
        other = make_skill(self.home / ".agents/skills", name="unrelated", category="collection")
        apply(*plan(self.repo, self.home, self.dest, False))
        self.assertTrue((other / "SKILL.md").is_file())

    def test_apply_refuses_changed_flat_link(self):
        old = self.home / ".agents/skills/sample"
        old.parent.mkdir(parents=True)
        old.symlink_to(self.source)
        args = plan(self.repo, self.home, self.dest, True)
        old.unlink()
        foreign = self.root / "foreign"
        foreign.mkdir()
        old.symlink_to(foreign)
        with self.assertRaises(InstallError):
            apply(*args)
        self.assertEqual(old.resolve(), foreign)

    def test_cli_apply_and_rerun_preserve_actual_bundle(self):
        env = {**os.environ, "HOME": str(self.home)}
        for _ in range(2):
            result = subprocess.run([str(REPO / "scripts/link-skills.sh"), "--apply"], env=env,
                                    text=True, capture_output=True, timeout=15)
            self.assertEqual(result.returncode, 0, result.stderr)
        link = self.home / ".agents/skills/reese"
        self.assertEqual(link.resolve(), REPO / "skills")
        self.assertEqual(validate(link), [])

    def test_claude_gets_per_skill_links_and_rerun_is_a_noop(self):
        claude = self.home / ".claude/skills"
        args = plan(self.repo, self.home, self.dest, False, claude)
        self.assertEqual(args[3], [(claude / "sample", self.source.resolve())])
        apply(*args)
        self.assertEqual((claude / "sample").resolve(), self.source.resolve())
        self.assertEqual(plan(self.repo, self.home, self.dest, False, claude)[3], [])

    def test_claude_foreign_copy_blocks_before_mutation(self):
        claude = self.home / ".claude/skills"
        make_skill(claude)
        with self.assertRaises(InstallError):
            plan(self.repo, self.home, self.dest, True, claude)
        self.assertFalse(self.dest.exists())

    def test_claude_foreign_dangling_link_blocks(self):
        claude = self.home / ".claude/skills"
        claude.mkdir(parents=True)
        (claude / "sample").symlink_to(self.root / "absent")
        with self.assertRaises(InstallError):
            plan(self.repo, self.home, self.dest, True, claude)

    def test_claude_relinks_previous_layout_only_with_migrate(self):
        claude = self.home / ".claude/skills"
        claude.mkdir(parents=True)
        (claude / "sample").symlink_to(self.repo / "skills/engineering/sample")
        with self.assertRaises(InstallError):
            plan(self.repo, self.home, self.dest, False, claude)
        apply(*plan(self.repo, self.home, self.dest, True, claude))
        self.assertEqual((claude / "sample").resolve(), self.source.resolve())

    def test_cli_links_claude_and_no_claude_skips_it(self):
        env = {**os.environ, "HOME": str(self.home)}
        subprocess.run([str(REPO / "scripts/link-skills.sh"), "--apply", "--no-claude"], env=env,
                       check=True, capture_output=True, timeout=15)
        self.assertFalse((self.home / ".claude").exists())
        subprocess.run([str(REPO / "scripts/link-skills.sh"), "--apply"], env=env,
                       check=True, capture_output=True, timeout=15)
        self.assertEqual((self.home / ".claude/skills/mako/SKILL.md").resolve(), REPO / "skills/mako/SKILL.md")

    def test_cli_preview_does_not_create_destination(self):
        result = subprocess.run(
            [str(REPO / "scripts/link-skills.sh")],
            env={**os.environ, "HOME": str(self.home)},
            text=True, capture_output=True, timeout=15,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Preview only", result.stdout)
        self.assertFalse(self.home.exists())


class MarkdownListTests(unittest.TestCase):
    def test_two_columns_and_idempotence(self):
        source = "| Term | Meaning |\n| :--- | ---: |\n| [name](path) | **meaning** |\n"
        expected = "- [name](path): **meaning**\n"
        self.assertEqual(to_lists(source), expected)
        self.assertEqual(to_lists(expected), expected)

    def test_multiple_columns_keep_field_names(self):
        source = "Name | Input | Output\n--- | --- | ---\nExample | one | two\n"
        self.assertEqual(to_lists(source), "- Example\n  - Input: one\n  - Output: two\n")

    def test_escaped_and_code_pipes(self):
        source = "| Input | Output |\n| --- | --- |\n| a\\|b | `x | y` |\n"
        self.assertEqual(to_lists(source), "- a\\|b: `x | y`\n")

    def test_fences_indented_examples_and_header_only_fixtures_are_preserved(self):
        table = "| Name | Value |\n| --- | --- |\n| x | y |\n"
        fixtures = [
            "```markdown\n" + table + "```\n",
            "~~~~markdown\n" + table + "~~~\n" + table + "~~~~\n",
            "````markdown\n```\n" + table + "```\n````\n",
            "".join("    " + line for line in table.splitlines(keepends=True)),
            "| Name | Value |\n| --- | --- |\n",
        ]
        for fixture in fixtures:
            with self.subTest(fixture=fixture):
                self.assertEqual(to_lists(fixture), fixture)
        self.assertEqual(to_lists(fixtures[0] + table), fixtures[0] + "- x: y\n")

    def test_malformed_table_fails_instead_of_dropping_cells(self):
        with self.assertRaises(ValueError):
            to_lists("| Name | Value |\n| --- | --- |\n| x | y | z |\n")

    def test_repository_markdown_and_links(self):
        for path in markdown_files(REPO):
            with self.subTest(path=path):
                content = path.read_text()
                self.assertEqual(to_lists(content), content)
                for target in local_links(path):
                    self.assertTrue(target.exists(), target)


@unittest.skipUnless(all(shutil.which(command) for command in ("pdfinfo", "pdftotext", "pdftoppm")), "Poppler is not installed")
class PdfReferenceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.helper = REPO / "skills/ui-design/scripts/extract-pdf-reference.sh"
        self.pdf = self.root / "synthetic.pdf"
        stream = b"BT /F1 12 Tf 20 100 Td (Synthetic UI reference fixture) Tj ET\n"
        objects = [
            b"<< /Type /Catalog /Pages 2 0 R >>",
            b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
            f"<< /Length {len(stream)} >>\nstream\n".encode() + stream + b"endstream",
        ]
        data = b"%PDF-1.4\n"
        offsets = [0]
        for number, obj in enumerate(objects, 1):
            offsets.append(len(data))
            data += f"{number} 0 obj\n".encode() + obj + b"\nendobj\n"
        xref = len(data)
        data += f"xref\n0 {len(offsets)}\n0000000000 65535 f \n".encode()
        data += b"".join(f"{offset:010d} 00000 n \n".encode() for offset in offsets[1:])
        data += f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
        self.pdf.write_bytes(data)
        self.env = {key: value for key, value in os.environ.items()
                    if key not in ("UI_DESIGN_ARTIFACTS_DIR", "REFINE_UI_ARTIFACTS_DIR")}

    def run_helper(self, *args, env=None):
        result = subprocess.run([str(self.helper), *args, str(self.pdf)],
                                env=env or self.env, text=True, capture_output=True, timeout=15)
        self.assertEqual(result.returncode, 0, result.stderr)
        return dict(line.split("=", 1) for line in result.stdout.splitlines())

    def test_extract_render_reuse_and_clean_synthetic_reference(self):
        output = self.root / "cache"
        args = ("--output-dir", str(output), "--render-all", "--dpi", "72")
        result = self.run_helper(*args)
        cache = Path(result["artifact_dir"])
        self.assertEqual(result["page_count"], "1")
        text = (cache / "reference.md").read_text()
        self.assertIn("## Page 1", text)
        self.assertIn("Synthetic UI reference fixture", text)
        image = cache / "pages/page-001.png"
        self.assertEqual(image.read_bytes()[:8], b"\x89PNG\r\n\x1a\n")
        before = {p.relative_to(cache): (p.read_bytes(), p.stat().st_mtime_ns)
                  for p in cache.rglob("*") if p.is_file()}
        self.run_helper(*args)
        after = {p.relative_to(cache): (p.read_bytes(), p.stat().st_mtime_ns)
                 for p in cache.rglob("*") if p.is_file()}
        self.assertEqual(before, after)
        self.assertFalse(list(cache.glob("*.pdf")))
        self.run_helper("--output-dir", str(output), "--clean")
        self.assertFalse(cache.exists())
        self.assertTrue(self.pdf.exists())

    def test_cache_override_precedence_and_legacy_fallback(self):
        legacy = self.root / "legacy"
        shared = self.root / "shared"
        explicit = self.root / "explicit"
        env = {**self.env, "REFINE_UI_ARTIFACTS_DIR": str(legacy)}
        result = self.run_helper(env=env)
        self.assertEqual(Path(result["artifact_dir"]).parent, legacy)
        env["UI_DESIGN_ARTIFACTS_DIR"] = str(shared)
        result = self.run_helper(env=env)
        self.assertEqual(Path(result["artifact_dir"]).parent, shared)
        result = self.run_helper("--output-dir", str(explicit), env=env)
        self.assertEqual(Path(result["artifact_dir"]).parent, explicit)


class DecisionLogTests(unittest.TestCase):
    def test_append_sanitizes_cells_and_preserves_prior_rows(self):
        helper = REPO / "skills/show-me-your-work/scripts/log.sh"
        with tempfile.TemporaryDirectory() as temp:
            log = Path(temp) / "nested/decisions.tsv"
            subprocess.run([str(helper), str(log), "frame", "=bad\tvalue", "why\nnext", "@artifact", "open"], check=True)
            first = log.read_text()
            subprocess.run([str(helper), str(log), "proof", "run", "because", "result.txt", "passed"], check=True)
            self.assertTrue(log.read_text().startswith(first))
            rows = [row.split("\t") for row in log.read_text().splitlines()]
            self.assertEqual(len(rows), 3)
            self.assertEqual([len(row) for row in rows], [6, 6, 6])
            self.assertEqual(rows[1][2:], ["'=bad value", "why next", "'@artifact", "open"])
            self.assertEqual(rows[2][1:], ["proof", "run", "because", "result.txt", "passed"])


if __name__ == "__main__":
    unittest.main()
