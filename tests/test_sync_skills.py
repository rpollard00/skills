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
    def __init__(self, directory, native_worktree=False):
        self.root = Path(directory)
        self.home = self.root / "home"
        self.home.mkdir()
        self.env = os.environ | {
            "HOME": str(self.home), "XDG_CONFIG_HOME": str(self.home / ".config"),
            "XDG_STATE_HOME": str(self.home / ".local/state"), "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_AUTHOR_NAME": "Fixture", "GIT_COMMITTER_NAME": "Fixture",
            "GIT_AUTHOR_EMAIL": "fixture@example.com", "GIT_COMMITTER_EMAIL": "fixture@example.com",
        }
        self.remote = self.root / "remote.git"
        self.seed = self.root / "seed"
        self.repo = self.root / "checkout"
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
        self.run(self.root, "git", "clone", str(self.remote), str(self.repo))
        if native_worktree:
            primary = self.repo
            self.run(primary, "git", "switch", "-c", "development")
            # Include whitespace to exercise NUL-delimited worktree ownership.
            self.repo = self.root / "installed worktree\nwith newline"
            self.run(primary, "git", "worktree", "add", str(self.repo), "main")
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

    def git_path(self, name):
        path = self.run(self.repo, "git", "rev-parse", "--git-path", name).stdout.strip()
        return self.repo / path

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
        self.run(self.repo, "git", "add", ".")
        self.run(self.repo, "git", "commit", "-m", "Local test")

    def state(self):
        revision = self.run(self.repo, "git", "rev-parse", "HEAD").stdout
        files = {str(p.relative_to(self.repo / "skills")): p.read_bytes()
                 for p in (self.repo / "skills").rglob("*") if p.is_file()}
        adapter = {str(p.relative_to(self.adapter)): p.read_bytes()
                   for p in self.adapter.rglob("*") if p.is_file()}
        return revision, files, adapter


class GitSyncTests(unittest.TestCase):
    native_worktree = False

    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.fixture = CheckoutFixture(self.directory.name, self.native_worktree)

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
        self.assert_skipped_unchanged("untracked")
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
        fixture = self.fixture
        fixture.local_commit()
        fixture.upstream()
        fixture.run(fixture.repo, "git", "fetch", "origin")
        merge = fixture.run(fixture.repo, "git", "merge", "--no-edit", "origin/main", check=False)
        self.assertNotEqual(merge.returncode, 0)
        self.assert_skipped_unchanged("local changes")

    def test_git_operation_with_clean_files_is_preserved(self):
        fixture = self.fixture
        fixture.upstream()
        for name in ("MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "rebase-merge", "rebase-apply",
                     "sequencer", "BISECT_START", "index.lock", "HEAD.lock"):
            with self.subTest(marker=name):
                path = fixture.git_path(name)
                if name in ("rebase-merge", "rebase-apply", "sequencer"):
                    path.mkdir()
                else:
                    path.write_text(fixture.state()[0].strip() + "\n")
                self.assert_skipped_unchanged("operation is in progress")
                if path.is_dir():
                    path.rmdir()
                else:
                    path.unlink()

    def test_staged_change_is_preserved(self):
        fixture = self.fixture
        fixture.upstream()
        (fixture.repo / "skills/sample/SKILL.md").write_text(fixture.skill + "Staged edit.\n")
        fixture.run(fixture.repo, "git", "add", "skills/sample/SKILL.md")
        before_index = fixture.run(fixture.repo, "git", "diff", "--cached").stdout
        self.assert_skipped_unchanged("local changes")
        self.assertEqual(fixture.run(fixture.repo, "git", "diff", "--cached").stdout, before_index)

    def test_detached_head_is_preserved(self):
        fixture = self.fixture
        fixture.upstream()
        fixture.run(fixture.repo, "git", "switch", "--detach")
        self.assert_skipped_unchanged("detached HEAD")

    def test_feature_and_experiment_branches_are_preserved_before_fetch(self):
        fixture = self.fixture
        fixture.upstream()
        remote_before = fixture.run(fixture.repo, "git", "rev-parse", "origin/main").stdout
        for branch in ("feature/new-skill", "experiment/git-first-workflows"):
            with self.subTest(branch=branch):
                fixture.run(fixture.repo, "git", "switch", "-c", branch, "--track", "origin/main")
                self.assert_skipped_unchanged("requires the main branch")
                self.assertEqual(fixture.run(fixture.repo, "git", "branch", "--show-current").stdout.strip(),
                                 branch)
                self.assertEqual(fixture.run(fixture.repo, "git", "rev-parse", "origin/main").stdout,
                                 remote_before)
                self.assertFalse(fixture.invocations.exists())
                self.assertFalse(fixture.pending.exists())

    def test_main_requires_origin_main_tracking(self):
        fixture = self.fixture
        fixture.upstream()
        fixture.run(fixture.repo, "git", "branch", "--unset-upstream")
        self.assert_skipped_unchanged("main must track origin/main")
        for remote, branch in (("fork", "refs/heads/main"), ("origin", "refs/heads/experiment")):
            with self.subTest(remote=remote, branch=branch):
                fixture.run(fixture.repo, "git", "config", "branch.main.remote", remote)
                fixture.run(fixture.repo, "git", "config", "branch.main.merge", branch)
                self.assert_skipped_unchanged("main must track origin/main")

    def test_main_with_multiple_merge_targets_is_preserved(self):
        fixture = self.fixture
        fixture.upstream()
        fixture.run(fixture.repo, "git", "config", "--add", "branch.main.merge", "refs/heads/experiment")
        self.assert_skipped_unchanged("main must track origin/main")

    def test_worktree_config_cannot_redirect_tracking(self):
        fixture = self.fixture
        fixture.upstream()
        fixture.run(fixture.repo, "git", "config", "extensions.worktreeConfig", "true")
        fixture.run(fixture.repo, "git", "config", "--worktree", "branch.main.remote", "fork")
        self.assert_skipped_unchanged("main must track origin/main")

    def test_main_shared_with_another_worktree_is_preserved(self):
        fixture = self.fixture
        fixture.upstream()
        other = fixture.root / "duplicate main worktree"
        fixture.run(fixture.repo, "git", "worktree", "add", "--force", str(other), "main")
        before_other = fixture.run(other, "git", "status", "--porcelain").stdout
        before_files = (other / "skills/sample/SKILL.md").read_bytes()
        self.assert_skipped_unchanged("shared with or owned by another Git worktree")
        self.assertEqual(fixture.run(other, "git", "status", "--porcelain").stdout, before_other)
        self.assertEqual((other / "skills/sample/SKILL.md").read_bytes(), before_files)
        self.assertFalse(fixture.pending.exists())

    def test_other_feature_worktree_is_unchanged_by_main_update(self):
        fixture = self.fixture
        other = fixture.root / "feature worktree"
        fixture.run(fixture.repo, "git", "worktree", "add", "-b", "experiment/parallel", str(other))
        (other / "skills/sample/SKILL.md").write_text("Uncommitted parallel work\n")
        before = fixture.run(other, "git", "rev-parse", "HEAD").stdout
        target = fixture.upstream()
        result = fixture.sync()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn(target, result.stdout)
        self.assertEqual(fixture.run(other, "git", "rev-parse", "HEAD").stdout, before)
        self.assertEqual((other / "skills/sample/SKILL.md").read_text(), "Uncommitted parallel work\n")

    def test_pending_retry_cannot_advance_an_experiment_branch(self):
        fixture = self.fixture
        fixture.upstream()
        (fixture.home / "fail-apply").touch()
        self.assertEqual(fixture.sync().returncode, 1)
        fixture.invocations.unlink()
        fixture.run(fixture.repo, "git", "switch", "-c", "experiment/preserve-pending")
        pending = fixture.pending.read_bytes()
        self.assert_skipped_unchanged("requires the main branch")
        self.assertEqual(fixture.pending.read_bytes(), pending)
        self.assertFalse(fixture.invocations.exists())

    def test_jj_metadata_is_preserved_without_invoking_jj(self):
        fixture = self.fixture
        fixture.upstream()
        metadata = fixture.repo / ".jj"
        metadata.mkdir()
        (metadata / "sentinel").write_text("Existing jj work\n")
        with fixture.git_path("info/exclude").open("a") as exclude:
            exclude.write("\n.jj/\n")
        self.assert_skipped_unchanged("jj-managed checkout requires a manual update")
        self.assertEqual((metadata / "sentinel").read_text(), "Existing jj work\n")
        self.assertFalse(fixture.invocations.exists())

    def test_fetch_preserves_existing_fetch_head(self):
        fixture = self.fixture
        fixture.run(fixture.repo, "git", "fetch", "origin")
        path = fixture.git_path("FETCH_HEAD")
        before = path.read_bytes()
        fixture.upstream()
        result = fixture.sync()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(path.read_bytes(), before)

    def test_ignored_file_collision_is_preserved(self):
        fixture = self.fixture
        with fixture.git_path("info/exclude").open("a") as exclude:
            exclude.write("\nlocal-notes.txt\n")
        local = fixture.repo / "local-notes.txt"
        local.write_text("Private local notes\n")
        (fixture.seed / "local-notes.txt").write_text("New upstream file\n")
        target = fixture.upstream()
        before = fixture.state()
        result = fixture.sync()
        self.assertEqual(result.returncode, 1)
        self.assertNotIn("Traceback", result.stderr)
        self.assertEqual(fixture.state(), before)
        self.assertEqual(local.read_text(), "Private local notes\n")
        self.assertNotIn("--apply", fixture.invocations.read_text())
        self.assertEqual(json.loads(fixture.pending.read_text())["target"], target)

    def test_dirty_submodule_is_preserved_even_when_config_hides_it(self):
        fixture = self.fixture
        fixture.run(fixture.repo, "git", "-c", "protocol.file.allow=always", "submodule", "add",
                    str(fixture.remote), "dependency")
        fixture.run(fixture.repo, "git", "commit", "-am", "Add dependency")
        fixture.run(fixture.repo, "git", "config", "submodule.dependency.ignore", "all")
        path = fixture.repo / "dependency/skills/sample/SKILL.md"
        path.write_text("Local dependency work\n")
        self.assertEqual(fixture.run(fixture.repo, "git", "status", "--porcelain").stdout, "")
        self.assert_skipped_unchanged("local changes")
        self.assertEqual(path.read_text(), "Local dependency work\n")


class GitWorktreeSyncTests(GitSyncTests):
    native_worktree = True

    def test_jj_in_primary_checkout_is_preserved(self):
        fixture = self.fixture
        fixture.upstream()
        metadata = fixture.root / "checkout/.jj"
        metadata.mkdir()
        (metadata / "sentinel").write_text("Shared jj state\n")
        self.assert_skipped_unchanged("jj-managed checkout requires a manual update")
        self.assertEqual((metadata / "sentinel").read_text(), "Shared jj state\n")
        self.assertFalse(fixture.invocations.exists())
