#!/usr/bin/env bash
# ==============================================================================
# setup_rclone.sh - Configura rclone per accedere a un Google Shared Drive
#
# Uso:
#   ./scripts/setup_rclone.sh
#
# Prerequisiti:
#   - rclone installato (https://rclone.org/install/)
#   - Un file JSON di Service Account Google (o credenziali OAuth)
# ==============================================================================

set -euo pipefail

REMOTE_NAME="${RCLONE_REMOTE_NAME:-gdrive}"

echo "============================================"
echo "  Rclone Setup per Google Shared Drive"
echo "============================================"
echo ""

# Check rclone
if ! command -v rclone &> /dev/null; then
    echo "rclone non trovato. Installazione in corso..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl -fsSL https://rclone.org/install.sh | sudo bash
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install rclone
    else
        echo "Installa rclone manualmente: https://rclone.org/install/"
        exit 1
    fi
fi

echo "rclone version: $(rclone --version | head -1)"
echo ""

# Scegli metodo di autenticazione
echo "Metodo di autenticazione:"
echo "  1) Service Account (consigliato per CI/CD)"
echo "  2) OAuth interattivo (per uso locale)"
read -rp "Scelta [1/2]: " AUTH_METHOD

if [[ "$AUTH_METHOD" == "1" ]]; then
    read -rp "Percorso del file JSON della Service Account: " SA_PATH
    if [[ ! -f "$SA_PATH" ]]; then
        echo "File non trovato: $SA_PATH"
        exit 1
    fi

    read -rp "Team Drive ID (opzionale, premi Enter per saltare): " TEAM_DRIVE_ID

    # Scrivi config
    mkdir -p ~/.config/rclone
    cat >> ~/.config/rclone/rclone.conf << EOF

[${REMOTE_NAME}]
type = drive
scope = drive.readonly
service_account_file = $(realpath "$SA_PATH")
EOF

    if [[ -n "$TEAM_DRIVE_ID" ]]; then
        echo "team_drive = ${TEAM_DRIVE_ID}" >> ~/.config/rclone/rclone.conf
    fi

    echo ""
    echo "Configurazione scritta. Verifica:"
    rclone listremotes

elif [[ "$AUTH_METHOD" == "2" ]]; then
    echo ""
    echo "Avvio configurazione interattiva rclone..."
    echo "Segui le istruzioni per configurare un remote 'drive' di tipo Google Drive."
    echo ""
    rclone config
fi

# Test connessione
echo ""
echo "Test di connessione..."
if rclone lsd "${REMOTE_NAME}:" --max-depth 1 2>/dev/null; then
    echo ""
    echo "Connessione riuscita! Cartelle trovate nel Drive."
    echo ""
    echo "Per sincronizzare, usa:"
    echo "  rclone sync ${REMOTE_NAME}:'Shared drives/NomeDrive/Percorso' raw_data/"
else
    echo ""
    echo "ATTENZIONE: Connessione fallita."
    echo "Verifica le credenziali e che la Service Account abbia accesso al Drive."
fi
