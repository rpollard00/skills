#!/usr/bin/env python3
import fcntl
import json
import os
import re
import subprocess
import sys
from dataclasses import asdict, dataclass
from enum import Enum
from pathlib import Path


class SyncError(Exception):
    pass


class Skip(Exception):
    pass


@dataclass(frozen=True)
class InstalledCheckout:
    root: Path
    bundle: Path


@dataclass(frozen=True)
class CleanBaseline:
    installation: InstalledCheckout
    revision: str
    branch: str


class Relation(Enum):
    EQUAL = "equal"
    BEHIND = "behind"
    AHEAD = "ahead"
    DIVERGED = "diverged"


@dataclass(frozen=True)
class PendingApply:
    checkout: str
    before: str
    target: str

    @classmethod
    def read(cls, path):
        if not path.exists():
            return None
        try:
            data = json.loads(path.read_text())
            pending = cls(**data)
            if not isinstance(pending.checkout, str) or not Path(pending.checkout).is_absolute():
                raise ValueError("invalid checkout")
            if not all(isinstance(value, str) and re.fullmatch(r"(?:[0-9a-f]{40}|[0-9a-f]{64})", value)
                       for value in (pending.before, pending.target)):
                raise ValueError("invalid revision")
            return pending
        except (TypeError, ValueError) as error:
            raise SyncError(f"invalid pending apply record: {path}") from error

    def write(self, path):
        temporary = path.with_suffix(".tmp")
        temporary.write_text(json.dumps(asdict(self)) + "\n")
        temporary.replace(path)


def command(root, *args, check=True):
    environment = os.environ.copy()
    environment["GIT_TERMINAL_PROMPT"] = "0"
    environment["GIT_SSH_COMMAND"] = environment.get("GIT_SSH_COMMAND", "ssh") + " -oBatchMode=yes -oConnectTimeout=15"
    try:
        result = subprocess.run(args, cwd=root, env=environment, text=True,
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise SyncError(f"{args[0]} failed: {error}") from error
    if check and result.returncode:
        detail = result.stderr.strip() or result.stdout.strip()
        raise SyncError(f"{' '.join(args)} failed: {detail}")
    return result


def installed_checkout(root, home):
    bundle = home / ".agents/skills/reese"
    if not bundle.is_symlink():
        raise Skip("installed bundle does not point to this checkout")
    try:
        source = bundle.resolve(strict=True)
    except FileNotFoundError as error:
        raise Skip("installed bundle is missing") from error
    except (RuntimeError, OSError) as error:
        raise SyncError(f"cannot resolve installed bundle: {error}") from error
    if source != root / "skills":
        raise Skip("installed bundle does not point to this checkout")
    if not bundle.is_dir():
        raise Skip("installed bundle is missing")
    return InstalledCheckout(root, bundle)


def clean_baseline(installation):
    root = installation.root
    legacy_reason = "jj-managed checkout requires a manual update; automatic sync uses native Git"
    if os.path.lexists(root / ".jj"):
        raise Skip(legacy_reason)
    common = command(root, "git", "rev-parse", "--git-common-dir").stdout.strip()
    common = (root / common).resolve()
    if os.path.lexists(common.parent / ".jj"):
        raise Skip(legacy_reason)
    if command(root, "git", "status", "--porcelain", "--untracked-files=all",
               "--ignore-submodules=none").stdout:
        raise Skip("checkout has local changes or untracked files")
    for name in ("MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "rebase-merge", "rebase-apply",
                 "sequencer", "BISECT_START", "index.lock", "HEAD.lock"):
        path = command(root, "git", "rev-parse", "--git-path", name).stdout.strip()
        if (root / path).exists():
            raise Skip("Git operation is in progress")
    branch = command(root, "git", "symbolic-ref", "--quiet", "HEAD", check=False)
    if branch.returncode:
        raise Skip("Git checkout has a detached HEAD")
    branch = branch.stdout.strip()
    if branch != "refs/heads/main":
        raise Skip("automatic sync requires the main branch; preserving feature or experiment branch")
    remote = command(root, "git", "config", "--get-all", "branch.main.remote", check=False)
    merge = command(root, "git", "config", "--get-all", "branch.main.merge", check=False)
    if (remote.returncode or merge.returncode
            or remote.stdout.strip() != "origin" or merge.stdout.strip() != "refs/heads/main"):
        raise Skip("main must track origin/main for automatic sync")
    # --git-path and worktree's porcelain output also work when .git is a file.
    # Refuse even a forced duplicate checkout of main: advancing its shared ref
    # would leave the other worktree's files and index at the previous revision.
    worktrees = command(root, "git", "worktree", "list", "--porcelain", "-z").stdout
    owners = []
    for record in worktrees.split("\0\0"):
        fields = record.split("\0")
        if "branch " + branch in fields:
            owners.extend(Path(field.removeprefix("worktree ")).resolve()
                          for field in fields if field.startswith("worktree "))
    if owners != [root.resolve()]:
        raise Skip("main branch is shared with or owned by another Git worktree")
    revision = command(root, "git", "rev-parse", "HEAD").stdout.strip()
    return CleanBaseline(installation, revision, branch)


def compare_ancestry(root, local, remote):
    if local == remote:
        return Relation.EQUAL

    def ancestor(first, second):
        result = command(root, "git", "merge-base", "--is-ancestor", first, second, check=False)
        if result.returncode not in (0, 1):
            raise SyncError(result.stderr.strip())
        return result.returncode == 0

    local_ancestor = ancestor(local, remote)
    remote_ancestor = ancestor(remote, local)
    if local_ancestor:
        return Relation.BEHIND
    if remote_ancestor:
        return Relation.AHEAD
    return Relation.DIVERGED


def preflight(root):
    result = command(root, str(root / "scripts/link-skills.sh"), check=False)
    if result.returncode:
        raise Skip("installer preflight refused: " + (result.stderr.strip() or result.stdout.strip()))


def advance_baseline(baseline, target):
    root = baseline.installation.root
    command(root, "git", "-c", "merge.autoStash=false", "merge", "--ff-only",
            "--no-overwrite-ignore", target)


def sync_installed_skills(root, home, pending_path):
    installation = installed_checkout(root, home)
    baseline = clean_baseline(installation)
    pending = PendingApply.read(pending_path)
    if pending and (pending.checkout != str(root)
                    or baseline.revision not in (pending.before, pending.target)):
        raise Skip("pending apply belongs to a different checkout or baseline")
    preflight(root)
    command(root, "git", "fetch", "--no-tags", "--no-recurse-submodules", "--no-write-fetch-head",
            "origin", "+refs/heads/main:refs/remotes/origin/main")
    target = command(root, "git", "rev-parse", "refs/remotes/origin/main^{commit}").stdout.strip()
    relation = compare_ancestry(root, baseline.revision, target)
    if pending:
        if compare_ancestry(root, pending.target, target) not in (Relation.EQUAL, Relation.BEHIND):
            raise Skip("pending target is ahead of or diverged from origin/main")
        target = pending.target
        relation = compare_ancestry(root, baseline.revision, target)
    if relation != Relation.BEHIND and not (pending and relation == Relation.EQUAL):
        raise Skip(f"installed checkout is {relation.value} with origin/main")
    if installed_checkout(root, home) != installation or clean_baseline(installation) != baseline:
        raise Skip("installed checkout changed during comparison")
    preflight(root)
    if installed_checkout(root, home) != installation or clean_baseline(installation) != baseline:
        raise Skip("installed checkout changed during preflight")
    if not pending:
        pending = PendingApply(str(root), baseline.revision, target)
        pending.write(pending_path)
    if relation == Relation.BEHIND:
        advance_baseline(baseline, target)
    current = clean_baseline(installed_checkout(root, home))
    if current.revision != target:
        raise SyncError("checkout changed after advancement; apply remains pending")
    try:
        command(root, str(root / "scripts/link-skills.sh"), "--apply")
    except SyncError as error:
        raise SyncError(f"source advanced to {target}; adapter apply remains pending: {error}") from error
    pending_path.unlink()
    print(f"Applied installed skills at {target}.")


def main():
    root = Path(__file__).resolve().parents[1]
    home = Path.home()
    state = Path(os.environ.get("XDG_STATE_HOME", str(home / ".local/state"))) / "reese-skills-sync"
    try:
        state.mkdir(parents=True, exist_ok=True, mode=0o700)
        with (state / "lock").open("a") as lock:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                raise Skip("another skills sync is active")
            sync_installed_skills(root, home, state / "pending.json")
        return 0
    except Skip as error:
        print(f"Skipped: {error}.")
        return 0
    except (SyncError, OSError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
