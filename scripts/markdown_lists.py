#!/usr/bin/env python3
"""Convert prose Markdown tables to lists; preserve fenced and indented examples."""

import argparse
import re
from pathlib import Path

FENCE = re.compile(r"^ {0,3}(`{3,}|~{3,})(.*)$")
SEPARATOR = re.compile(r":?-{3,}:?\Z")


def cells(line):
    text = line.strip()
    if "|" not in text:
        return None
    values, current = [], []
    code = 0
    i = 1 if text.startswith("|") else 0
    while i < len(text):
        char = text[i]
        if char == "\\" and i + 1 < len(text):
            current.extend(text[i:i + 2])
            i += 2
            continue
        if char == "`":
            end = i + 1
            while end < len(text) and text[end] == "`":
                end += 1
            width = end - i
            code = width if code == 0 else (0 if code == width else code)
            current.append(text[i:end])
            i = end
            continue
        if char == "|" and code == 0:
            values.append("".join(current).strip())
            current = []
        else:
            current.append(char)
        i += 1
    if current or not text.endswith("|"):
        values.append("".join(current).strip())
    return values


def to_lists(text):
    lines = text.splitlines(keepends=True)
    output = []
    marker = None
    i = 0
    while i < len(lines):
        line = lines[i]
        fence = FENCE.match(line)
        if fence:
            if marker is None:
                marker = fence[1]
            elif fence[1][0] == marker[0] and len(fence[1]) >= len(marker) and not fence[2].strip():
                marker = None
        if marker or fence or line.startswith(("    ", "\t")):
            output.append(line)
            i += 1
            continue
        headers = cells(line)
        separator = cells(lines[i + 1]) if i + 1 < len(lines) else None
        if not headers or not separator or len(headers) != len(separator) or not all(SEPARATOR.fullmatch(c) for c in separator):
            output.append(line)
            i += 1
            continue
        if i + 2 >= len(lines) or cells(lines[i + 2]) is None:
            # A header-only schema can be a literal fixture, not tabular data.
            output.extend(lines[i:i + 2])
            i += 2
            continue
        indent = line[:len(line) - len(line.lstrip())]
        i += 2
        while i < len(lines) and (row := cells(lines[i])) is not None:
            if len(row) != len(headers):
                raise ValueError(f"table row has {len(row)} cells, expected {len(headers)}: {lines[i].rstrip()}")
            if len(row) == 2:
                output.append(f"{indent}- {row[0]}: {row[1]}\n")
            else:
                output.append(f"{indent}- {row[0]}\n")
                output.extend(f"{indent}  - {header}: {value}\n" for header, value in zip(headers[1:], row[1:]))
            i += 1
        if i < len(lines) and lines[i].strip():
            output.append("\n")
    return "".join(output)


def markdown_files(repo):
    paths = list(repo.glob("*.md")) + list((repo / "docs").rglob("*.md")) + list((repo / "skills").rglob("*.md"))
    return sorted(p for p in paths if ".artifacts" not in p.parts)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="apply conversions; default checks without writing")
    args = parser.parse_args()
    changed = []
    # Compute every conversion before writing any file.
    for path in markdown_files(Path(__file__).resolve().parents[1]):
        before = path.read_text(encoding="utf-8")
        after = to_lists(before)
        if after != before:
            changed.append((path, after))
    for path, after in changed:
        print(path)
        if args.write:
            path.write_text(after, encoding="utf-8")
    print(f"{len(changed)} files {'converted' if args.write else 'need conversion'}.")
    return 0 if args.write or not changed else 1


if __name__ == "__main__":
    raise SystemExit(main())
