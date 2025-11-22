#!/bin/bash
# Auteur : BENE Maël
# Version : 1.1
# Description : Restauration manuelle de sauvegarde différentielle (VMs) avec journalisation cumulative

set -euo pipefail

# Configuration
DOSSIER="MACHINES"
DEST_USER="backup-user"
DEST_HOST="stockage"
DEST_PATH="/home/$DEST_USER/backup/$DOSSIER"
RESTORE_DIR="$HOME/mairie/$DOSSIER"
LOG_FILE="$HOME/backup-logs/restores_dif.log"

mkdir -p "$HOME/backup-logs"
mkdir -p "$RESTORE_DIR"

START_DATE=$(date '+%Y-%m-%d %H:%M:%S')

{
    echo "====================================================="
    echo "[$START_DATE] ➤ DÉBUT DE LA RESTAURATION DIFFÉRENTIELLE"
    echo "Dossier restauré : $DOSSIER"
    echo "Destination locale : $RESTORE_DIR"
    echo "Source distante : $DEST_USER@$DEST_HOST:$DEST_PATH"
    echo "====================================================="
} >> "$LOG_FILE"

# Restauration avec rsync (différentielle)
rsync -av -e ssh "$DEST_USER@$DEST_HOST:$DEST_PATH/" "$RESTORE_DIR/" >> "$LOG_FILE" 2>&1

{
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ➤ FIN DE LA RESTAURATION"
    echo
} >> "$LOG_FILE"
