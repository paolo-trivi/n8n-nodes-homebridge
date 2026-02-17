#!/usr/bin/env bash
# ==============================================================================
# sync_local.sh - Esegue sync + conversione in locale (senza GitHub Actions)
#
# Uso:
#   ./scripts/sync_local.sh                      # Sync + convert
#   ./scripts/sync_local.sh --skip-sync           # Solo conversione
#   ./scripts/sync_local.sh --force               # Riconverti tutto
#   DRIVE_PATH="Shared drives/X/Y" ./scripts/sync_local.sh
# ==============================================================================

set -euo pipefail

REMOTE_NAME="${RCLONE_REMOTE_NAME:-gdrive}"
DRIVE_PATH="${DRIVE_PATH:-Shared drives/TeamDocs}"
RAW_DIR="${RAW_DIR:-raw_data}"
DOCS_DIR="${DOCS_DIR:-docs}"
SKIP_SYNC=false
FORCE=""

# Parse args
while [[ $# -gt 0 ]]; do
    case "$1" in
        --skip-sync) SKIP_SYNC=true; shift ;;
        --force) FORCE="--force"; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

echo "=== Drive to GitHub Sync (local) ==="
echo ""

# 1. Sync (copy, not sync - safer against partial failures)
if [[ "$SKIP_SYNC" == "false" ]]; then
    # Check prerequisites
    if ! command -v rclone &> /dev/null; then
        echo "ERROR: rclone is not installed. Run: ./scripts/setup_rclone.sh"
        exit 1
    fi
    if ! command -v pandoc &> /dev/null; then
        echo "ERROR: pandoc is not installed."
        exit 1
    fi

    echo "[1/4] Copying from ${REMOTE_NAME}:${DRIVE_PATH} ..."
    mkdir -p "${RAW_DIR}"
    rclone copy \
        "${REMOTE_NAME}:${DRIVE_PATH}" \
        "${RAW_DIR}/" \
        --drive-acknowledge-abuse \
        --drive-export-formats docx,xlsx,pptx,csv \
        --transfers 8 \
        --checkers 16 \
        --retries 3 \
        --stats-one-line \
        --stats 5s \
        -v

    FILE_COUNT=$(find "${RAW_DIR}" -type f | wc -l)
    echo "Copy completed: ${FILE_COUNT} files."

    if [[ "${FILE_COUNT}" -eq 0 ]]; then
        echo "WARNING: No files found. Check DRIVE_PATH and rclone config."
    fi

    echo ""
    echo "[2/4] Detecting deleted files..."
    # Compare remote vs local to find files deleted from Drive
    REMOTE_LIST=$(mktemp)
    LOCAL_LIST=$(mktemp)
    trap 'rm -f "${REMOTE_LIST}" "${LOCAL_LIST}"' EXIT

    rclone lsf "${REMOTE_NAME}:${DRIVE_PATH}" \
        --recursive \
        --drive-export-formats docx,xlsx,pptx,csv \
        2>/dev/null | sort > "${REMOTE_LIST}" || true

    find "${RAW_DIR}" -type f -not -name '.*' -printf '%P\n' | sort > "${LOCAL_LIST}"

    DELETED=$(comm -23 "${LOCAL_LIST}" "${REMOTE_LIST}")
    if [[ -n "${DELETED}" ]]; then
        echo "Files removed from Drive:"
        while IFS= read -r file; do
            if [[ -n "${file}" ]]; then
                rm -f "${RAW_DIR}/${file}"
                echo "  Removed: ${file}"
            fi
        done <<< "${DELETED}"
    else
        echo "No files deleted from Drive."
    fi
else
    echo "[1/4] Sync skipped (--skip-sync)."
    echo "[2/4] Delete detection skipped (--skip-sync)."
fi

echo ""

# 3. Convert
echo "[3/4] Converting files..."
python3 scripts/convert.py \
    --raw-dir "${RAW_DIR}" \
    --docs-dir "${DOCS_DIR}" \
    ${FORCE} \
    -v

echo ""

# 4. Index
echo "[4/4] Generating index..."
python3 scripts/generate_index.py --docs-dir "${DOCS_DIR}"

echo ""
echo "=== Done! ==="
echo "Markdown files in ${DOCS_DIR}/:"
find "${DOCS_DIR}" -name '*.md' -not -name 'INDEX.md' | sort
echo ""
echo "Total: $(find "${DOCS_DIR}" -name '*.md' -not -name 'INDEX.md' | wc -l) files"
