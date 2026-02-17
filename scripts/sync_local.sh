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

# 1. Sync
if [[ "$SKIP_SYNC" == "false" ]]; then
    echo "[1/3] Syncing from ${REMOTE_NAME}:${DRIVE_PATH} ..."
    mkdir -p "${RAW_DIR}"
    rclone sync \
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
    echo "Sync completed: $(find "${RAW_DIR}" -type f | wc -l) files."
else
    echo "[1/3] Sync skipped (--skip-sync)."
fi

echo ""

# 2. Convert
echo "[2/3] Converting files..."
python3 scripts/convert.py \
    --raw-dir "${RAW_DIR}" \
    --docs-dir "${DOCS_DIR}" \
    ${FORCE} \
    -v

echo ""

# 3. Index
echo "[3/3] Generating index..."
python3 scripts/generate_index.py --docs-dir "${DOCS_DIR}"

echo ""
echo "=== Done! ==="
echo "Markdown files in ${DOCS_DIR}/:"
find "${DOCS_DIR}" -name '*.md' -not -name '.manifest.json' | sort
echo ""
echo "Total: $(find "${DOCS_DIR}" -name '*.md' -not -name '.manifest.json' | wc -l) files"
