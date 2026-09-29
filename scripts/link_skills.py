#!/usr/bin/env python3
"""Preview or install the skill bundle for pi, Codex, OpenCode 2, and Claude Code."""

import argparse
import os
import sys
from pathlib import Path

from yaml import YAMLError

from validate_skills import frontmatter, skill_files, validate


class InstallError(Exception):
    pass


def installed_skills(root, ignored):
    pending = [root]
    visited = set()
    while pending:
        path = pending.pop()
        if path in ignored:
            continue
        if path.is_file() and path.parent == root and path.suffix == ".md":
            yield path
            continue
        if not path.is_dir():
            continue
        resolved = path.resolve()
        if resolved in visited:
            continue
        visited.add(resolved)
        entry = path / "SKILL.md"
        if entry.is_file():
            yield entry
            continue
        pending.extend(p for p in path.iterdir() if not p.name.startswith(".") and p.name != "node_modules")


def previous_source(repo, name):
    """Recognize this checkout's pre-flattening targets, including dangling links."""
    category = {
        "refine-ui": "design", "jj": "version-control",
        "writing": "writing", "simple-technical-english": "writing", "unslop": "writing",
    }.get(name, "engineering-principles" if name.startswith("principle-") else "engineering")
    return repo / "skills" / category / name


def plan(repo, home, destination, migrate, claude=None):
    repo = repo.resolve()
    source = repo / "skills"
    errors = validate(source)
    if errors:
        raise InstallError("\n".join(errors))
    if destination.resolve().is_relative_to(repo):
        raise InstallError(f"destination resolves inside this repository: {destination}")
    if os.path.lexists(destination) and not destination.is_dir():
        raise InstallError(f"destination is not a directory: {destination}")
    bundle = destination / "reese"
    if os.path.lexists(bundle) and not (bundle.is_symlink() and bundle.resolve() == source):
        raise InstallError(f"refusing to replace existing path: {bundle}")

    sources = {frontmatter(p)["name"]: p.parent.resolve() for p in skill_files(source)}
    roots = {destination, home / ".pi/agent/skills", home / ".agents/skills", home / ".codex/skills",
             home / ".config/opencode/skills"}
    legacy_roots = roots | ({home / ".claude/skills"} if claude is None else set())
    removals = []
    claude_links = []
    if claude is not None:
        # Claude Code does not scan nested directories, so each skill gets its own link.
        if claude.resolve().is_relative_to(repo):
            raise InstallError(f"Claude destination resolves inside this repository: {claude}")
        if os.path.lexists(claude) and not claude.is_dir():
            raise InstallError(f"Claude destination is not a directory: {claude}")
    for root in sorted(legacy_roots):
        for name, directory in sources.items():
            candidate = root / name
            if candidate.is_symlink():
                target = candidate.resolve()
                if target in {directory, previous_source(repo, name)}:
                    removals.append((candidate, target))
    claude_ok = set()
    dangling = []
    if claude is not None:
        for name, directory in sources.items():
            link = claude / name
            if link.is_symlink() and link.resolve() == directory:
                claude_ok.add(link)
                continue
            if link.is_symlink() and link.resolve() == previous_source(repo, name):
                removals.append((link, link.resolve()))
            elif os.path.lexists(link) and not link.exists():
                dangling.append(f"{name}: {link}")
                continue
            elif os.path.lexists(link):
                continue
            claude_links.append((link, directory))
    if removals and not migrate:
        paths = "\n".join(str(p) for p, _ in removals)
        raise InstallError(f"repo-owned flat links require --migrate-owned-flat:\n{paths}")

    ignored = {p for p, _ in removals} | claude_ok
    for root in roots:
        installed_bundle = root / "reese"
        if installed_bundle.is_symlink() and installed_bundle.resolve() == source:
            ignored.add(installed_bundle)
    collisions = list(dangling)
    scanned = sorted(roots | ({claude} if claude is not None else set()))
    for root in scanned:
        for entry in installed_skills(root, ignored):
            try:
                name = frontmatter(entry).get("name")
            except (ValueError, YAMLError) as error:
                if entry.name != "SKILL.md":
                    continue
                raise InstallError(f"cannot inspect {entry}: {error}") from error
            if not isinstance(name, str) or not name:
                name = entry.parent.name if entry.name == "SKILL.md" else entry.stem
            if name in sources:
                collisions.append(f"{name}: {entry}")
    if collisions:
        raise InstallError("existing skills collide; no copies or foreign links will be replaced:\n" + "\n".join(collisions))
    return source, bundle, removals, claude_links


def apply(source, bundle, removals, claude_links=()):
    # Create the bundle before removing old aliases. A failed creation preserves
    # the old installation. Never overwrite a path created after preflight.
    bundle.parent.mkdir(parents=True, exist_ok=True)
    if not os.path.lexists(bundle):
        bundle.symlink_to(source, target_is_directory=True)
    elif not (bundle.is_symlink() and bundle.resolve() == source):
        raise InstallError(f"bundle changed after preflight: {bundle}")
    for path, expected in removals:
        if not path.is_symlink() or path.resolve() != expected:
            raise InstallError(f"flat link changed after preflight; left untouched: {path}")
        path.unlink()
    for link, target in claude_links:
        if os.path.lexists(link):
            raise InstallError(f"Claude link changed after preflight; left untouched: {link}")
        link.parent.mkdir(parents=True, exist_ok=True)
        link.symlink_to(target, target_is_directory=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--destination", type=Path, help="skill discovery directory; default: ~/.agents/skills")
    parser.add_argument("--apply", action="store_true", help="perform the printed changes; default is preview only")
    parser.add_argument("--migrate-owned-flat", action="store_true", help="remove only flat symlinks pointing to this checkout's skills")
    parser.add_argument("--claude-destination", type=Path, help="Claude Code skills directory; default: ~/.claude/skills")
    parser.add_argument("--no-claude", action="store_true", help="skip per-skill links for Claude Code")
    args = parser.parse_args()
    home = Path.home()
    destination = (args.destination or home / ".agents/skills").expanduser().absolute()
    claude = None if args.no_claude else (args.claude_destination or home / ".claude/skills").expanduser().absolute()
    repo = Path(__file__).resolve().parents[1]
    try:
        source, bundle, removals, claude_links = plan(repo, home, destination, args.migrate_owned_flat, claude)
        print(f"Bundle: {bundle} -> {source}")
        for path, expected in removals:
            print(f"Remove owned flat link: {path} -> {expected}")
        for link, target in claude_links:
            print(f"Claude link: {link} -> {target}")
        if args.apply:
            apply(source, bundle, removals, claude_links)
            print("Installed. Reload your harness. No harness configuration files were changed.")
        else:
            print("Preview only. Add --apply to install. Project-local and custom skill paths are not audited.")
        return 0
    except (InstallError, OSError, ValueError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
