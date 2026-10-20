import fcntl
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


REPO = Path(__file__).resolve().parents[1]


class CheckoutFixture:
    def __init__(self, directory, use_jj=False):
        self.root = Path(directory)
        self.home = self.root / "home"
        self.home.mkdir()
        self.env = os.environ | {
            "HOME": str(self.home), "XDG_CONFIG_HOME": str(self.home / ".config"),
            "XDG_STATE_HOME": str(self.home / ".local/state"), "GIT_CONFIG_NOSYSTEM": "1",
            "JJ_CONFIG": str(self.home / "jj.toml"),
            "GIT_AUTHOR_NAME": "Fixture", "GIT_COMMITTER_NAME": "Fixture",
            "GIT_AUTHOR_EMAIL": "fixture@example.com", "GIT_COMMITTER_EMAIL": "fixture@example.com",
        }
        (self.home / "jj.toml").write_text('[user]\nname = "Fixture"\nemail = "fixture@example.com"\n')
        self.remote = self.root / "remote.git"
        self.seed = self.root / "seed"
        self.repo = self.root / "checkout"
        self.use_jj = use_jj
        self.run(self.root, "git", "init", "--bare", str(self.remote))
        self.run(self.root, "git", "init", "-b", "main", str(self.seed))
        (self.seed / "scripts").mkdir()
        for name in ("link_skills.py", "validate_skills.py", "sync_skills.py"):
            shutil.copy2(REPO / "scripts" / name, self.seed / "scripts" / name)
        wrapper = self.seed / "scripts/link-skills.sh"
        wrapper.write_text(
            '#!/usr/bin/env bash\nset -eu\n'
            'printf "%s\\n" "${1:-preview}" >> "$HOME/invocations"\n'
            'if [[ "${1:-}" == --apply && -e "$HOME/fail-apply" ]]; then exit 23; fi\n'
            'exec python3 "$(dirname "$0")/link_skills.py" "$@"\n')
        wrapper.chmod(0o755)
        (self.seed / "skills/sample").mkdir(parents=True)
        self.skill = "---\nname: sample\ndescription: Fixture skill.\n---\n\n# Original\n"
        (self.seed / "skills/sample/SKILL.md").write_text(self.skill)
        (self.seed / ".gitignore").write_text("__pycache__/\n")
        self.run(self.seed, "git", "add", ".")
        self.run(self.seed, "git", "commit", "-m", "Initial skills")
        self.run(self.seed, "git", "remote", "add", "origin", str(self.remote))
        self.run(self.seed, "git", "push", "-u", "origin", "main")
        self.run(self.remote, "git", "symbolic-ref", "HEAD", "refs/heads/main")
        if use_jj:
            self.run(self.root, "jj", "git", "clone", str(self.remote), str(self.repo))
        else:
            self.run(self.root, "git", "clone", str(self.remote), str(self.repo))
        self.run(self.repo, str(self.repo / "scripts/link-skills.sh"), "--apply")
        self.invocations.unlink()
        executable = self.home / ".local/bin/sync-reese-skills"
        executable.parent.mkdir(parents=True)
        executable.symlink_to(self.repo / "scripts/sync_skills.py")
        self.executable = executable

    def run(self, cwd, *args, check=True):
        result = subprocess.run(args, cwd=cwd, env=self.env, text=True,
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
        if check and result.returncode:
            raise AssertionError(f"{args}: {result.stdout}\n{result.stderr}")
        return result

    @property
    def invocations(self):
        return self.home / "invocations"

    @property
    def pending(self):
        return self.home / ".local/state/reese-skills-sync/pending.json"

    @property
    def adapter(self):
        return self.home / ".claude/skills/.reese-adapter"

    def sync(self):
        return self.run(self.root, sys.executable, str(self.executable), check=False)

    def upstream(self):
        path = self.seed / "skills/sample/SKILL.md"
        path.write_text(path.read_text() + "\nRemote update.\n")
        self.run(self.seed, "git", "add", ".")
        self.run(self.seed, "git", "commit", "-m", "Update skills")
        self.run(self.seed, "git", "push")
        return self.run(self.seed, "git", "rev-parse", "HEAD").stdout.strip()

    def local_commit(self):
        path = self.repo / "skills/sample/SKILL.md"
        path.write_text(path.read_text() + "\nLocal testing.\n")
        if self.use_jj:
            self.run(self.repo, "jj", "commit", "-m", "Local test")
        else:
            self.run(self.repo, "git", "add", ".")
            self.run(self.repo, "git", "commit", "-m", "Local test")

    def state(self):
        if self.use_jj:
            revision = self.run(self.repo, "jj", "log", "--no-graph", "-r", "@", "-T", "commit_id").stdout
        else:
            revision = self.run(self.repo, "git", "rev-parse", "HEAD").stdout
        files = {str(p.relative_to(self.repo / "skills")): p.read_bytes()
                 for p in (self.repo / "skills").rglob("*") if p.is_file()}
        adapter = {str(p.relative_to(self.adapter)): p.read_bytes()
                   for p in self.adapter.rglob("*") if p.is_file()}
        return revision, files, adapter


class GitSyncTests(unittest.TestCase):
    use_jj = False

    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.fixture = CheckoutFixture(self.directory.name, self.use_jj)

    def assert_skipped_unchanged(self, reason):
        fixture = self.fixture
        before = fixture.state()
        result = fixture.sync()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn(reason, result.stdout)
        self.assertEqual(fixture.state(), before)
        calls = fixture.invocations.read_text() if fixture.invocations.exists() else ""
        self.assertNotIn("--apply", calls)

    def test_behind_advances_and_applies_real_linker(self):
        fixture = self.fixture
        target = fixture.upstream()
        result = fixture.sync()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn(target, result.stdout)
        self.assertIn("--apply", fixture.invocations.read_text())
        self.assertEqual((fixture.adapter / "skills/sample/SKILL.md").read_bytes(),
                         (fixture.repo / "skills/sample/SKILL.md").read_bytes())
        self.assertFalse(fixture.pending.exists())
        if self.use_jj:
            parent = fixture.run(fixture.repo, "jj", "log", "--no-graph", "-r", "@-", "-T", "commit_id").stdout
            self.assertEqual(parent, target)
        else:
            self.assertEqual(fixture.state()[0].strip(), target)

    def test_equal_does_not_apply(self):
        self.assert_skipped_unchanged("equal")

    def test_ahead_does_not_apply(self):
        self.fixture.local_commit()
        self.assert_skipped_unchanged("ahead")

    def test_diverged_does_not_apply(self):
        self.fixture.local_commit()
        self.fixture.upstream()
        self.assert_skipped_unchanged("diverged")

    def test_dirty_does_not_apply(self):
        self.fixture.upstream()
        (self.fixture.repo / "skills/sample/SKILL.md").write_text(self.fixture.skill + "Local edit.\n")
        self.assert_skipped_unchanged("local")

    def test_untracked_does_not_apply(self):
        self.fixture.upstream()
        (self.fixture.repo / "private.txt").write_text("local experiment")
        self.assert_skipped_unchanged("local" if self.use_jj else "untracked")
        self.assertEqual((self.fixture.repo / "private.txt").read_text(), "local experiment")

    def test_modified_adapter_prevents_advancement(self):
        self.fixture.upstream()
        (self.fixture.adapter / "skills/sample/SKILL.md").write_text("Local Claude copy")
        self.assert_skipped_unchanged("installer preflight refused")

    def test_replaced_bundle_prevents_advancement(self):
        fixture = self.fixture
        fixture.upstream()
        foreign = fixture.root / "foreign"
        foreign.mkdir()
        (foreign / "sentinel").write_text("preserve")
        bundle = fixture.home / ".agents/skills/reese"
        bundle.unlink()
        bundle.symlink_to(foreign)
        self.assert_skipped_unchanged("does not point")
        self.assertEqual((foreign / "sentinel").read_text(), "preserve")

    def test_failed_fetch_preserves_checkout_and_has_no_traceback(self):
        fixture = self.fixture
        if self.use_jj:
            fixture.run(fixture.repo, "jj", "git", "remote", "set-url", "origin", str(fixture.root / "missing.git"))
        else:
            fixture.run(fixture.repo, "git", "remote", "set-url", "origin", str(fixture.root / "missing.git"))
        before = fixture.state()
        result = fixture.sync()
        self.assertEqual(result.returncode, 1)
        self.assertNotIn("Traceback", result.stderr)
        self.assertEqual(fixture.state(), before)
        self.assertFalse(fixture.pending.exists())

    def test_failed_apply_retries_at_equality(self):
        fixture = self.fixture
        target = fixture.upstream()
        failure = fixture.home / "fail-apply"
        failure.touch()
        before_adapter = fixture.state()[2]
        result = fixture.sync()
        self.assertEqual(result.returncode, 1)
        self.assertIn("apply remains pending", result.stderr)
        self.assertEqual(json.loads(fixture.pending.read_text())["target"], target)
        self.assertEqual(fixture.state()[2], before_adapter)
        failure.unlink()
        result = fixture.sync()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(fixture.pending.exists())
        self.assertIn("Remote update", (fixture.adapter / "skills/sample/SKILL.md").read_text())

    def test_pending_retry_refuses_changed_baseline(self):
        fixture = self.fixture
        fixture.upstream()
        (fixture.home / "fail-apply").touch()
        self.assertEqual(fixture.sync().returncode, 1)
        fixture.invocations.unlink()
        fixture.local_commit()
        before_pending = fixture.pending.read_bytes()
        self.assert_skipped_unchanged("different checkout or baseline")
        self.assertEqual(fixture.pending.read_bytes(), before_pending)

    def test_pending_before_advancement_retries_recorded_target(self):
        fixture = self.fixture
        before = fixture.run(fixture.seed, "git", "rev-parse", "HEAD").stdout.strip()
        target = fixture.upstream()
        fixture.pending.parent.mkdir(parents=True)
        fixture.pending.write_text(json.dumps({"checkout": str(fixture.repo),
                                              "before": before, "target": target}))
        result = fixture.sync()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn(target, result.stdout)
        self.assertFalse(fixture.pending.exists())
        self.assertIn("Remote update", (fixture.adapter / "skills/sample/SKILL.md").read_text())

    def test_pending_target_ahead_of_rewound_remote_is_preserved(self):
        fixture = self.fixture
        before = fixture.run(fixture.seed, "git", "rev-parse", "HEAD").stdout.strip()
        fixture.upstream()
        (fixture.home / "fail-apply").touch()
        self.assertEqual(fixture.sync().returncode, 1)
        fixture.run(fixture.seed, "git", "push", "--force", "origin", f"{before}:main")
        pending = fixture.pending.read_bytes()
        fixture.invocations.unlink()
        self.assert_skipped_unchanged("pending target is ahead of or diverged")
        self.assertEqual(fixture.pending.read_bytes(), pending)

    def test_nonblocking_lock_prevents_overlap(self):
        fixture = self.fixture
        fixture.upstream()
        fixture.pending.parent.mkdir(parents=True)
        with (fixture.pending.parent / "lock").open("a") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            self.assert_skipped_unchanged("another skills sync is active")
        self.assertFalse(fixture.pending.exists())

    def test_invalid_pending_record_fails_cleanly(self):
        fixture = self.fixture
        fixture.pending.parent.mkdir(parents=True)
        fixture.pending.write_text('{"checkout": "wrong"}')
        before = fixture.state()
        result = fixture.sync()
        self.assertEqual(result.returncode, 1)
        self.assertIn("invalid pending", result.stderr)
        self.assertNotIn("Traceback", result.stderr)
        self.assertEqual(fixture.state(), before)

    def test_missing_bundle_prevents_advancement(self):
        fixture = self.fixture
        fixture.upstream()
        (fixture.home / ".agents/skills/reese").unlink()
        self.assert_skipped_unchanged("does not point")

    def test_bundle_symlink_loop_fails_without_traceback(self):
        fixture = self.fixture
        bundle = fixture.home / ".agents/skills/reese"
        bundle.unlink()
        bundle.symlink_to(bundle)
        before = fixture.state()
        result = fixture.sync()
        self.assertEqual(result.returncode, 1)
        self.assertIn("cannot resolve installed bundle", result.stderr)
        self.assertNotIn("Traceback", result.stderr)
        self.assertEqual(fixture.state(), before)

    def test_git_merge_conflict_is_preserved(self):
        if self.use_jj:
            self.skipTest("jj conflicts have a separate fixture")
        fixture = self.fixture
        fixture.local_commit()
        fixture.upstream()
        fixture.run(fixture.repo, "git", "fetch", "origin")
        merge = fixture.run(fixture.repo, "git", "merge", "--no-edit", "origin/main", check=False)
        self.assertNotEqual(merge.returncode, 0)
        self.assert_skipped_unchanged("local changes")

    def test_git_operation_with_clean_files_is_preserved(self):
        if self.use_jj:
            self.skipTest("Git operation marker")
        fixture = self.fixture
        fixture.upstream()
        revision = fixture.state()[0].strip()
        (fixture.repo / ".git/CHERRY_PICK_HEAD").write_text(revision + "\n")
        self.assert_skipped_unchanged("operation is in progress")


@unittest.skipUnless(shutil.which("jj"), "jj is required for real jj integration")
class JjSyncTests(GitSyncTests):
    use_jj = True

    def test_immutable_remote_revision_advances_with_new_working_child(self):
        fixture = self.fixture
        fixture.run(fixture.repo, "jj", "--ignore-immutable", "edit", "main@origin")
        target = fixture.upstream()
        result = fixture.sync()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn(target, result.stdout)
        parent = fixture.run(fixture.repo, "jj", "log", "--no-graph", "-r", "@-", "-T", "commit_id").stdout
        self.assertEqual(parent, target)
        self.assertEqual((fixture.adapter / "skills/sample/SKILL.md").read_bytes(),
                         (fixture.repo / "skills/sample/SKILL.md").read_bytes())

    def test_untracked_file_excluded_from_snapshot_is_preserved(self):
        fixture = self.fixture
        fixture.upstream()
        fixture.run(fixture.repo, "jj", "config", "set", "--repo", "snapshot.auto-track", "none()")
        (fixture.repo / "private.txt").write_text("untracked experiment")
        self.assert_skipped_unchanged("untracked")

    def test_described_empty_commit_is_preserved(self):
        fixture = self.fixture
        fixture.upstream()
        fixture.run(fixture.repo, "jj", "describe", "-m", "Planned work")
        self.assert_skipped_unchanged("local work or intent")

    def test_bookmarked_empty_commit_is_preserved(self):
        fixture = self.fixture
        fixture.upstream()
        fixture.run(fixture.repo, "jj", "bookmark", "create", "experiment", "-r", "@")
        self.assert_skipped_unchanged("local work or intent")

    def test_working_commit_with_child_is_preserved(self):
        fixture = self.fixture
        fixture.upstream()
        current = fixture.state()[0]
        fixture.run(fixture.repo, "jj", "new")
        fixture.run(fixture.repo, "jj", "describe", "-m", "Child experiment")
        fixture.run(fixture.repo, "jj", "edit", current)
        self.assert_skipped_unchanged("local work or intent")

    def test_shared_working_commit_is_preserved(self):
        fixture = self.fixture
        fixture.upstream()
        current = fixture.state()[0]
        other = fixture.root / "other-workspace"
        fixture.run(fixture.repo, "jj", "workspace", "add", "--no-colocate", str(other))
        fixture.run(other, "jj", "edit", current)
        self.assert_skipped_unchanged("shared with another workspace")

    def test_merge_working_commit_is_preserved(self):
        fixture = self.fixture
        fixture.local_commit()
        local = fixture.run(fixture.repo, "jj", "log", "--no-graph", "-r", "@-", "-T", "commit_id").stdout
        fixture.upstream()
        fixture.run(fixture.repo, "jj", "git", "fetch", "--remote", "origin")
        fixture.run(fixture.repo, "jj", "new", local, "main@origin")
        self.assert_skipped_unchanged("conflicts")
