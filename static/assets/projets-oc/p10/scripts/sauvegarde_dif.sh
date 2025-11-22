#!/bin/bash
# Auteur : BENE Maël
# Version : 1.1
# Description : Sauvegarde différentielle avec temps d'execution dans les logs

#!/bin/bash
set -euo pipefail

# Configuration
DOSSIER="MACHINES"
SOURCE_DIR="$HOME/mairie/$DOSSIER"
DEST_USER="backup-user"
DEST_HOST="stockage"
DEST_PATH="/home/$DEST_USER/backup/$DOSSIER"
LOG_DIR="$HOME/backup-logs"
DATE="$(date '+%Y-%m-%d_%H-%M-%S')"
CUMULATIVE_LOG="$LOG_DIR/sauvegardes_dif.log"

mkdir -p "$LOG_DIR"

start=0
rsync_started=false

# Fonction exécutée même en cas de plantage ou d'interruption
on_exit() {
    if $rsync_started; then
        local end=$(date +%s)
        local duration=$((end - start))
        echo "[$(date '+%F %T')] ➤ Durée de la sauvegarde : ${duration} secondes" >> "$CUMULATIVE_LOG"
    fi
}
trap on_exit EXIT

# Log de début
{
    echo "====================================================="
    echo "[$(date '+%F %T')] ➤ DÉBUT DE LA SAUVEGARDE DIFFÉRENTIELLE"
    echo "Dossier      : $DOSSIER"
    echo "Source       : $SOURCE_DIR"
    echo "Destination  : $DEST_USER@$DEST_HOST:$DEST_PATH"
    echo "Horodatage   : $DATE"
    echo "====================================================="
} >> "$CUMULATIVE_LOG"

# Préparation du dossier distant
echo "[$(date '+%F %T')] ➤ Vérification du dossier distant..." >> "$CUMULATIVE_LOG"
ssh "$DEST_USER@$DEST_HOST" "mkdir -p '$DEST_PATH'" >> "$CUMULATIVE_LOG" 2>&1
echo "[$(date '+%F %T')] ➤ Dossier distant prêt." >> "$CUMULATIVE_LOG"

# Mesure du temps
start=$(date +%s)
rsync_started=true

# Lancement de rsync
echo "[$(date '+%F %T')] ➤ Lancement de rsync..." >> "$CUMULATIVE_LOG"
rsync -av --inplace --partial --append -e ssh "$SOURCE_DIR/" "$DEST_USER@$DEST_HOST:$DEST_PATH/" \
    >> "$CUMULATIVE_LOG" 2>&1

# Si rsync a terminé normalement, on continue le log
echo "[$(date '+%F %T')] SAUVEGARDE DIFFÉRENTIELLE TERMINÉE" >> "$CUMULATIVE_LOG"
echo >> "$CUMULATIVE_LOG"
