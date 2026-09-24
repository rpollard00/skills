import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "scripts"))
from link_skills import InstallError, apply, plan
from validate_skills import local_links, validate


def make_skill(root, name="sample", *, category="engineering", hidden=False):
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
        self.assertEqual(validate(REPO / "skills"), [])

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
        pending = [root / "engineering/mako/SKILL.md"]
        seen = set()
        while pending:
            path = pending.pop().resolve()
            if path in seen or not path.is_file() or path.suffix != ".md":
                continue
            seen.add(path)
            pending.extend(local_links(path))
        selected = set(root.glob("engineering/*/SKILL.md")) | set(root.glob("engineering-principles/*/SKILL.md"))
        self.assertEqual({p.resolve() for p in selected} - seen, set())
        self.assertEqual(len(list(root.glob("engineering-principles/*/SKILL.md"))), 23)

    def test_import_inventory_and_protected_upstream_content(self):
        imports = json.loads((REPO / "docs/upstream-imports.json").read_text())["files"]
        records = {row["destination"]: row for row in imports}
        for row in imports:
            self.assertTrue((REPO / row["destination"]).is_file(), row)
        protected = [
            "skills/engineering/no-comments/references/comment-sicko.md",
            "skills/engineering/typescript-best-practices/SKILL.md",
            "skills/engineering/typescript-best-practices/references/patterns.md",
        ]
        for name in protected:
            content = (REPO / name).read_text()
            if name.endswith("typescript-best-practices/SKILL.md"):
                content = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", content)
                content = content.replace('\nmetadata:\n  opencode/autoinvoke: "false"', "")
            self.assertEqual(hashlib.sha256(content.encode()).hexdigest(), records[name]["sha256"], name)
        for path in (REPO / "skills/engineering").glob("*/SKILL.md"):
            self.assertTrue((path.parent / "LICENSE").is_file(), path)


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
        self.assertTrue((link / "engineering/sample/SKILL.md").is_file())
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

    def test_shared_destination_preserves_category_links(self):
        dest = self.home / ".agents/skills"
        apply(*plan(self.repo, self.home, dest, False))
        self.assertEqual((dest / "reese/engineering/sample/SKILL.md").resolve(), self.source / "SKILL.md")

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

    def test_cli_preview_does_not_create_destination(self):
        result = subprocess.run(
            [str(REPO / "scripts/link-skills.sh")],
            env={**os.environ, "HOME": str(self.home)},
            text=True, capture_output=True, timeout=15,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Preview only", result.stdout)
        self.assertFalse(self.home.exists())


class DecisionLogTests(unittest.TestCase):
    def test_append_sanitizes_cells_and_preserves_prior_rows(self):
        helper = REPO / "skills/engineering/show-me-your-work/scripts/log.sh"
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
