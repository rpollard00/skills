#!/usr/bin/env bash
set -euo pipefail

# Maintainer helper: link every skill in this repository into local Agent
# Skills directories. Pass explicit destination directories as arguments to
# override the defaults.

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if (($#)); then
  DESTS=("$@")
else
  DESTS=("$HOME/.agents/skills" "$HOME/.claude/skills")
fi

declare -a NAMES=()
declare -a SOURCES=()

read_skill_name() {
  awk '
    NR == 1 && $0 == "---" { frontmatter = 1; next }
    frontmatter && $0 == "---" { exit }
    frontmatter && $1 == "name:" {
      sub(/^name:[[:space:]]*/, "")
      gsub(/^['\''"]|['\''"]$/, "")
      print
      exit
    }
  ' "$1"
}

while IFS= read -r -d '' skill_md; do
  source_dir="$(dirname "$skill_md")"
  name="$(read_skill_name "$skill_md")"

  if [[ -z "$name" ]]; then
    echo "error: missing skill name in $skill_md" >&2
    exit 1
  fi

  if [[ ! "$name" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
    echo "error: invalid skill name '$name' in $skill_md" >&2
    exit 1
  fi

  if [[ "$(basename "$source_dir")" != "$name" ]]; then
    echo "error: skill directory must match name '$name': $source_dir" >&2
    exit 1
  fi

  for i in "${!NAMES[@]}"; do
    if [[ "${NAMES[$i]}" == "$name" ]]; then
      echo "error: duplicate skill name '$name' in $source_dir and ${SOURCES[$i]}" >&2
      exit 1
    fi
  done

  NAMES+=("$name")
  SOURCES+=("$source_dir")
done < <(find "$REPO/skills" -type f -name SKILL.md -not -path '*/deprecated/*' -print0)

if ((${#NAMES[@]} == 0)); then
  echo "error: no skills found under $REPO/skills" >&2
  exit 1
fi

# Preflight every destination before creating any link. Existing links owned by
# this repository are safe; every other collision requires manual resolution.
for dest in "${DESTS[@]}"; do
  if [[ -e "$dest" && ! -d "$dest" ]]; then
    echo "error: destination is not a directory: $dest" >&2
    exit 1
  fi

  if [[ -L "$dest" ]]; then
    resolved_dest="$(readlink -f "$dest" || true)"
    if [[ -z "$resolved_dest" ]]; then
      echo "error: destination is a broken symlink: $dest" >&2
      exit 1
    fi
    case "$resolved_dest" in
      "$REPO"|"$REPO"/*)
        echo "error: destination $dest resolves inside this repository" >&2
        exit 1
        ;;
    esac
  fi

  for i in "${!NAMES[@]}"; do
    target="$dest/${NAMES[$i]}"
    source_dir="${SOURCES[$i]}"

    if [[ -L "$target" ]]; then
      resolved_target="$(readlink -f "$target" || true)"
      if [[ "$resolved_target" != "$source_dir" ]]; then
        echo "error: refusing to replace symlink $target -> $(readlink "$target")" >&2
        exit 1
      fi
    elif [[ -e "$target" ]]; then
      echo "error: refusing to replace existing path $target" >&2
      exit 1
    fi
  done
done

for dest in "${DESTS[@]}"; do
  mkdir -p "$dest"

  for i in "${!NAMES[@]}"; do
    target="$dest/${NAMES[$i]}"
    source_dir="${SOURCES[$i]}"

    if [[ -L "$target" ]]; then
      echo "already linked: $target -> $source_dir"
    else
      ln -s "$source_dir" "$target"
      echo "linked: $target -> $source_dir"
    fi
  done
done
