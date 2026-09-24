#!/usr/bin/env python3
"""Validate skill metadata, local dependencies, and explicit-only policies."""

import argparse
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

import yaml


NAME = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z")
LINK = re.compile(r"\[[^\]\n]*\]\(([^\s)]+)(?:\s+\"[^\"]*\")?\)")
FENCE = re.compile(r"^\s*(`{3,}|~{3,})")


def frontmatter(path):
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n") or "\n---\n" not in text[4:]:
        raise ValueError("missing YAML frontmatter")
    data = yaml.safe_load(text[4:].split("\n---\n", 1)[0])
    if not isinstance(data, dict):
        raise ValueError("frontmatter must be a mapping")
    return data


def prose(text):
    marker = None
    for line in text.splitlines():
        match = FENCE.match(line)
        if match:
            fence = match[1]
            if marker is None:
                marker = fence
            elif fence[0] == marker[0] and len(fence) >= len(marker):
                marker = None
            continue
        if marker is None:
            yield line


def local_links(path):
    for line in prose(path.read_text(encoding="utf-8")):
        for match in LINK.finditer(line):
            target = match[1].strip("<>")
            url = urlsplit(target)
            if url.scheme or url.netloc or not url.path:
                continue
            if target == "url":  # Literal placeholder in a reviewer output template.
                continue
            yield path.parent / unquote(url.path)


def skill_files(root):
    return sorted(p for p in root.rglob("SKILL.md") if ".artifacts" not in p.parts)


def validate(root):
    errors = []
    names = {}
    files = skill_files(root)
    if not files:
        return [f"{root}: no skills found"]
    for path in files:
        try:
            data = frontmatter(path)
            name = data.get("name")
            if not isinstance(name, str) or not NAME.fullmatch(name) or len(name) > 64:
                raise ValueError("invalid skill name")
            if name != path.parent.name:
                raise ValueError(f"directory must match name {name!r}")
            if name in names:
                raise ValueError(f"duplicate name {name!r}: {names[name]}")
            names[name] = path
            description = data.get("description")
            if not isinstance(description, str) or not description.strip() or len(description) > 1024:
                raise ValueError("description must contain 1–1024 characters")
            hidden = data.get("disable-model-invocation", False)
            if not isinstance(hidden, bool):
                raise ValueError("disable-model-invocation must be a boolean")
            if hidden and data.get("metadata", {}).get("opencode/autoinvoke") not in (False, "false"):
                raise ValueError("missing explicit-only OpenCode 2 metadata")
            # The new bundle promises pi and Codex policy parity. Older categories
            # retain their existing metadata until separately migrated.
            if hidden and path.relative_to(root).parts[0] in {"engineering", "engineering-principles"}:
                policy_path = path.parent / "agents/openai.yaml"
                metadata = yaml.safe_load(policy_path.read_text(encoding="utf-8"))
                if not isinstance(metadata, dict) or metadata.get("policy", {}).get("allow_implicit_invocation") is not False:
                    raise ValueError("missing explicit-only Codex policy")
        except (ValueError, OSError, yaml.YAMLError, AttributeError) as error:
            errors.append(f"{path}: {error}")
    for path in sorted(root.rglob("*.md")):
        if ".artifacts" in path.parts:
            continue
        for target in local_links(path):
            if not target.exists():
                errors.append(f"{path}: missing local dependency {target}")
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", type=Path, default=Path(__file__).resolve().parents[1] / "skills")
    args = parser.parse_args()
    errors = validate(args.root)
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"Validated {len(skill_files(args.root))} skills: metadata, local links, and explicit-only policies.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
