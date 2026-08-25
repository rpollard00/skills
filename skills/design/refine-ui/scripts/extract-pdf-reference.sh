#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  extract-pdf-reference.sh [options] <reference.pdf>

Create a private searchable text index and optionally render selected pages.
The source PDF is never copied.

Options:
  --pages <N|N-M>     Render one page or an inclusive page range as PNG.
  --dpi <number>      Render resolution for page images (default: 144).
  --output-dir <dir>  Override the artifact root directory.
  --force             Replace this PDF's existing derived artifacts.
  --clean             Remove this PDF's derived artifacts and exit.
  -h, --help          Show this help.

Default artifact root:
  <skill-directory>/.artifacts/pdf

Environment override:
  REFINE_UI_ARTIFACTS_DIR
EOF
}

fail() {
  echo "error: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "required command not found: $1"
}

hash_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum -- "$1" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 -- "$1" | awk '{print $1}'
  else
    fail "required SHA-256 command not found (sha256sum or shasum)"
  fi
}

sanitize_name() {
  local value="$1"
  value="${value%.*}"
  value="$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g')"
  [[ -n "$value" ]] || value="reference"
  printf '%s\n' "$value"
}

PAGES=""
DPI=144
OUTPUT_ROOT=""
FORCE=false
CLEAN=false
PDF=""

while (($#)); do
  case "$1" in
    --pages)
      (($# >= 2)) || fail "--pages requires a value"
      PAGES="$2"
      shift 2
      ;;
    --dpi)
      (($# >= 2)) || fail "--dpi requires a value"
      DPI="$2"
      shift 2
      ;;
    --output-dir)
      (($# >= 2)) || fail "--output-dir requires a value"
      OUTPUT_ROOT="$2"
      shift 2
      ;;
    --force)
      FORCE=true
      shift
      ;;
    --clean)
      CLEAN=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      while (($#)); do
        [[ -z "$PDF" ]] || fail "expected one PDF path"
        PDF="$1"
        shift
      done
      ;;
    -*)
      fail "unknown option: $1"
      ;;
    *)
      [[ -z "$PDF" ]] || fail "expected one PDF path"
      PDF="$1"
      shift
      ;;
  esac
done

[[ -n "$PDF" ]] || {
  usage >&2
  exit 2
}
[[ -f "$PDF" ]] || fail "PDF not found: $PDF"
[[ "$PDF" == *.pdf || "$PDF" == *.PDF ]] || fail "input must have a .pdf extension"
PDF="$(cd "$(dirname "$PDF")" && pwd -P)/$(basename "$PDF")"
[[ "$DPI" =~ ^[1-9][0-9]*$ ]] || fail "--dpi must be a positive integer"
((DPI <= 1200)) || fail "--dpi must be 1200 or less"
[[ "$FORCE" == false || "$CLEAN" == false ]] || fail "--force and --clean cannot be combined"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd -P)"
OUTPUT_ROOT="${OUTPUT_ROOT:-${REFINE_UI_ARTIFACTS_DIR:-$SKILL_DIR/.artifacts/pdf}}"

require_command awk
require_command sed
require_command pdfinfo

SOURCE_HASH="$(hash_file "$PDF")"
SHORT_HASH="${SOURCE_HASH:0:12}"
SOURCE_NAME="$(basename "$PDF")"
SAFE_NAME="$(sanitize_name "$SOURCE_NAME")"
ARTIFACT_DIR="$OUTPUT_ROOT/$SAFE_NAME-$SHORT_HASH"

if [[ "$CLEAN" == true ]]; then
  if [[ -d "$ARTIFACT_DIR" ]]; then
    rm -rf -- "$ARTIFACT_DIR"
    echo "removed=$ARTIFACT_DIR"
  else
    echo "removed="
    echo "artifact_dir=$ARTIFACT_DIR"
  fi
  exit 0
fi

require_command pdftotext
if [[ -n "$PAGES" ]]; then
  require_command pdftoppm
fi

if [[ "$FORCE" == true && -d "$ARTIFACT_DIR" ]]; then
  rm -rf -- "$ARTIFACT_DIR"
fi

umask 077
mkdir -p -- "$ARTIFACT_DIR"
OUTPUT_ROOT="$(cd "$OUTPUT_ROOT" && pwd -P)"
ARTIFACT_DIR="$OUTPUT_ROOT/$SAFE_NAME-$SHORT_HASH"

PAGE_COUNT="$(pdfinfo "$PDF" | awk -F: '$1 == "Pages" { gsub(/[[:space:]]/, "", $2); print $2; exit }')"
[[ "$PAGE_COUNT" =~ ^[1-9][0-9]*$ ]] || fail "could not determine PDF page count"

TMP_DIR="$(mktemp -d "$ARTIFACT_DIR/.extract-XXXXXX")"
WRITE_MANIFEST=false
cleanup() {
  rm -rf -- "$TMP_DIR"
}
trap cleanup EXIT INT TERM

if [[ ! -s "$ARTIFACT_DIR/metadata.txt" ]]; then
  pdfinfo "$PDF" > "$TMP_DIR/metadata.txt"
  mv -- "$TMP_DIR/metadata.txt" "$ARTIFACT_DIR/metadata.txt"
  WRITE_MANIFEST=true
fi

if [[ ! -s "$ARTIFACT_DIR/reference.txt" ]]; then
  pdftotext -layout "$PDF" "$TMP_DIR/reference.txt"
  [[ -s "$TMP_DIR/reference.txt" ]] || fail "text extraction produced an empty index"
  mv -- "$TMP_DIR/reference.txt" "$ARTIFACT_DIR/reference.txt"
  WRITE_MANIFEST=true
fi

RENDERED_RANGE=""
if [[ -n "$PAGES" ]]; then
  if [[ "$PAGES" =~ ^([1-9][0-9]*)$ ]]; then
    FIRST_PAGE="${BASH_REMATCH[1]}"
    LAST_PAGE="$FIRST_PAGE"
  elif [[ "$PAGES" =~ ^([1-9][0-9]*)-([1-9][0-9]*)$ ]]; then
    FIRST_PAGE="${BASH_REMATCH[1]}"
    LAST_PAGE="${BASH_REMATCH[2]}"
  else
    fail "--pages must be N or N-M"
  fi

  ((FIRST_PAGE <= LAST_PAGE)) || fail "page range must be ascending"
  ((LAST_PAGE <= PAGE_COUNT)) || fail "page range ends after page $PAGE_COUNT"

  mkdir -p -- "$ARTIFACT_DIR/pages"
  pdftoppm -f "$FIRST_PAGE" -l "$LAST_PAGE" -png -r "$DPI" \
    "$PDF" "$TMP_DIR/page" >/dev/null 2>&1

  shopt -s nullglob
  rendered=("$TMP_DIR"/page-*.png)
  ((${#rendered[@]} > 0)) || fail "page rendering produced no images"
  mv -- "${rendered[@]}" "$ARTIFACT_DIR/pages/"
  shopt -u nullglob
  RENDERED_RANGE="$FIRST_PAGE-$LAST_PAGE"
  WRITE_MANIFEST=true
fi

if [[ ! -s "$ARTIFACT_DIR/manifest.txt" ]]; then
  WRITE_MANIFEST=true
fi

if [[ "$WRITE_MANIFEST" == true ]]; then
  RENDERED_FILES=""
  if [[ -d "$ARTIFACT_DIR/pages" ]]; then
    rendered_names=()
    while IFS= read -r -d '' rendered_file; do
      rendered_names+=("$(basename "$rendered_file")")
    done < <(find "$ARTIFACT_DIR/pages" -maxdepth 1 -type f -name 'page-*.png' -print0)
    if ((${#rendered_names[@]} > 0)); then
      RENDERED_FILES="$(IFS=,; printf '%s' "${rendered_names[*]}")"
    fi
  fi

  CREATED_AT="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  cat > "$TMP_DIR/manifest.txt" <<EOF
source_filename=$SOURCE_NAME
source_sha256=$SOURCE_HASH
page_count=$PAGE_COUNT
text_index=reference.txt
rendered_pages=$RENDERED_FILES
render_dpi=$DPI
prepared_at=$CREATED_AT
EOF
  mv -- "$TMP_DIR/manifest.txt" "$ARTIFACT_DIR/manifest.txt"
fi

printf 'artifact_dir=%s\n' "$ARTIFACT_DIR"
printf 'text_index=%s\n' "$ARTIFACT_DIR/reference.txt"
printf 'metadata=%s\n' "$ARTIFACT_DIR/metadata.txt"
printf 'manifest=%s\n' "$ARTIFACT_DIR/manifest.txt"
printf 'page_count=%s\n' "$PAGE_COUNT"
if [[ -n "$RENDERED_RANGE" ]]; then
  printf 'pages_dir=%s\n' "$ARTIFACT_DIR/pages"
  printf 'rendered_pages=%s\n' "$RENDERED_RANGE"
fi
