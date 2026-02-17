# Drive-GitHub Sync

Pipeline automatica che sincronizza i file da un Google Shared Drive, li converte in Markdown e li pubblica in questo repository per una consultazione facile direttamente su GitHub.

## Come funziona

```
Google Shared Drive
        |
        | rclone sync (scheduled / manuale)
        v
   raw_data/          <-- file originali (.docx, .pdf, .xlsx, ...)
        |
        | convert.py  (pandoc + pandas + marker/pdftotext)
        v
     docs/            <-- file .md navigabili su GitHub
        |
        | generate_index.py
        v
   docs/INDEX.md      <-- indice navigabile
```

## Formati supportati

| Formato | Strumento | Note |
|---------|-----------|------|
| `.docx` | Pandoc | Converte anche immagini embedded |
| `.xlsx` | Pandas | Ogni foglio diventa una tabella MD |
| `.csv` / `.tsv` | Pandas | Tabella MD |
| `.ods` | Pandas + odfpy | OpenDocument Spreadsheet |
| `.pptx` | Pandoc | Slide come sezioni MD |
| `.pdf` | marker-pdf / Pandoc / pdftotext | 3 strategie con fallback |
| `.html` | Pandoc | HTML to Markdown |
| `.rtf` | Pandoc | Rich Text Format |
| `.odt` / `.odp` | Pandoc | OpenDocument Text/Presentation |
| `.md` / `.txt` | Copia diretta | Nessuna conversione |
| Immagini | Copia in `docs/assets/` | PNG, JPG, GIF, SVG, WebP |

## Setup rapido

### 1. Prerequisiti

```bash
# Pandoc (conversione documenti)
sudo apt-get install pandoc poppler-utils   # Linux
brew install pandoc poppler                  # macOS

# Python 3.12+
pip install -r requirements.txt

# Rclone (sync con Google Drive)
curl -fsSL https://rclone.org/install.sh | sudo bash
```

### 2. Configurare l'accesso al Google Drive

Esegui lo script guidato:

```bash
./scripts/setup_rclone.sh
```

Hai due opzioni:
- **Service Account** (consigliato per CI/CD): crea una SA in Google Cloud Console, scarica il JSON, condividi il Shared Drive con l'email della SA
- **OAuth interattivo** (per uso locale): segui il wizard di rclone

### 3. Uso locale

```bash
# Sync completo: scarica dal Drive + converti + genera indice
DRIVE_PATH="Shared drives/MioTeam/Documenti" ./scripts/sync_local.sh

# Solo conversione (se hai gia' i file in raw_data/)
./scripts/sync_local.sh --skip-sync

# Riconverti tutto ignorando la cache
./scripts/sync_local.sh --force
```

### 4. Configurare la GitHub Action

La pipeline gira automaticamente ogni notte. Devi configurare i **secrets** del repository:

| Secret | Descrizione |
|--------|-------------|
| `RCLONE_SA_JSON` | Contenuto completo del file JSON della Service Account |
| `TEAM_DRIVE_ID` | ID del Team Drive (dalla URL del Shared Drive) |

E la **variabile** del repository:

| Variable | Descrizione |
|----------|-------------|
| `DRIVE_PATH` | Percorso nel Drive, es. `Shared drives/MioTeam/Documenti` |

Per impostare:

```bash
# Secrets
gh secret set RCLONE_SA_JSON < path/to/service-account.json
gh secret set TEAM_DRIVE_ID --body "0ABcDefGhIjKlMnOp"

# Variable
gh variable set DRIVE_PATH --body "Shared drives/MioTeam/Documenti"
```

Puoi anche avviare la sync manualmente da GitHub: **Actions > Drive to GitHub Sync > Run workflow**.

## Struttura del repository

```
.
├── .github/workflows/
│   └── sync_and_convert.yml    # GitHub Action (schedule + manual)
├── scripts/
│   ├── convert.py              # Engine di conversione
│   ├── generate_index.py       # Generatore dell'indice
│   ├── setup_rclone.sh         # Setup guidato rclone
│   └── sync_local.sh           # Script per sync locale
├── raw_data/                   # File originali (non committati, .gitignore)
├── docs/                       # Output Markdown (committato)
│   ├── INDEX.md                # Indice navigabile auto-generato
│   ├── assets/                 # Immagini estratte dai documenti
│   └── ...                     # File .md convertiti
├── requirements.txt            # Dipendenze Python
└── README.md
```

## Build incrementale

Lo script usa un file `.manifest.json` con gli hash SHA-256 dei file sorgente. Se un file non e' cambiato dall'ultimo sync, non viene riconvertito. Usa `--force` per riconvertire tutto.

I file rimossi dal Drive vengono automaticamente rimossi anche da `docs/`.

## Creare la Service Account Google

1. Vai su [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un progetto (o usane uno esistente)
3. Abilita la **Google Drive API**
4. Vai su **IAM & Admin > Service Accounts**
5. Crea una nuova Service Account
6. Crea una chiave JSON e scaricala
7. Vai sul tuo Google Shared Drive > **Gestisci membri**
8. Aggiungi l'email della Service Account (es. `sync-bot@progetto.iam.gserviceaccount.com`) come **Visualizzatore**

## Note tecniche

- **PDF complessi**: layout multi-colonna o scansioni OCR possono produrre risultati imprecisi. Per OCR, considera di aggiungere `tesseract` al workflow.
- **Google Sheets nativi**: rclone li esporta automaticamente come `.xlsx` (configurabile con `--drive-export-formats`).
- **Google Docs nativi**: rclone li esporta come `.docx`.
- **Rate limits**: con `--transfers 8` e `--checkers 16` il sync e' parallelizzato ma rispetta i limiti dell'API Drive.
- **Timeout**: il workflow ha un timeout di 30 minuti. Per Drive molto grandi, potrebbe servire aumentarlo.
