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
    working_commit: str | None = None
    branch: str | None = None


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


def jj(root, *args):
    return command(root, "jj", "--no-pager", "--color=never", *args).stdout.strip()


def jj_revisions(root, expression):
    return jj(root, "log", "--no-graph", "-r", expression,
              "-T", 'commit_id ++ "\\n"').splitlines()


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
    if (root / ".jj").exists():
        jj(root, "status")
        current = jj_revisions(root, "@")[0]
        if jj_revisions(root, "@ & conflicts()"):
            raise Skip("jj working copy has conflicts")
        if command(root, "git", "ls-files", "--others", "--exclude-standard").stdout:
            raise Skip("checkout has untracked files")
        workspaces = jj(root, "workspace", "list", "-T", 'target.commit_id() ++ "\\n"').splitlines()
        if workspaces.count(current) != 1:
            raise Skip("jj working commit is shared with another workspace")
        if jj(root, "log", "--no-graph", "-r", "@", "-T", "immutable") == "true":
            return CleanBaseline(installation, current, current)
        parents = jj_revisions(root, "@-")
        empty = jj(root, "log", "--no-graph", "-r", "@", "-T", "empty") == "true"
        description = jj(root, "log", "--no-graph", "-r", "@", "-T", "description")
        if (not empty or description or len(parents) != 1
                or jj_revisions(root, "@ & bookmarks()") or jj_revisions(root, "@+")):
            raise Skip("jj working commit contains local work or intent")
        return CleanBaseline(installation, parents[0], current)
    if command(root, "git", "status", "--porcelain", "--untracked-files=all").stdout:
        raise Skip("checkout has local changes or untracked files")
    for name in ("MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "rebase-merge", "rebase-apply"):
        path = command(root, "git", "rev-parse", "--git-path", name).stdout.strip()
        if (root / path).exists():
            raise Skip("Git operation is in progress")
    branch = command(root, "git", "symbolic-ref", "--quiet", "HEAD", check=False)
    if branch.returncode:
        raise Skip("Git checkout has a detached HEAD")
    revision = command(root, "git", "rev-parse", "HEAD").stdout.strip()
    return CleanBaseline(installation, revision, branch=branch.stdout.strip())


def compare_ancestry(root, local, remote):
    if local == remote:
        return Relation.EQUAL
    if (root / ".jj").exists():
        local_ancestor = bool(jj_revisions(root, f"{local} & ::{remote}"))
        remote_ancestor = bool(jj_revisions(root, f"{remote} & ::{local}"))
    else:
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
    if baseline.working_commit:
        if baseline.working_commit == baseline.revision:
            jj(root, "new", target)
        else:
            jj_revisions(root, baseline.working_commit)
            jj(root, "rebase", "-r", baseline.working_commit, "-o", target)
    else:
        command(root, "git", "-c", "merge.autoStash=false", "merge", "--ff-only", target)


def sync_installed_skills(root, home, pending_path):
    installation = installed_checkout(root, home)
    baseline = clean_baseline(installation)
    pending = PendingApply.read(pending_path)
    if pending and (pending.checkout != str(root)
                    or baseline.revision not in (pending.before, pending.target)):
        raise Skip("pending apply belongs to a different checkout or baseline")
    preflight(root)
    if (root / ".jj").exists():
        jj(root, "--config", "git.abandon-unreachable-commits=false", "git", "fetch",
           "--remote", "origin", "--branch", "main")
        targets = jj_revisions(root, "main@origin")
        if len(targets) != 1:
            raise SyncError("origin/main does not resolve to one commit")
        target = targets[0]
        if baseline.working_commit == baseline.revision:
            fetched_baseline = clean_baseline(installation)
            if fetched_baseline.revision == baseline.revision:
                baseline = fetched_baseline
    else:
        command(root, "git", "fetch", "--no-tags", "origin",
                "+refs/heads/main:refs/remotes/origin/main")
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
