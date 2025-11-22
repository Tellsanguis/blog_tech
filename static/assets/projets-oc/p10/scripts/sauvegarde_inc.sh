#!/bin/bash
# Auteur : BENE Maël
# Version : 1.2
# Description : Sauvegarde incrémentale avec rotation, lien latest, et gestion automatique des FULL via le nom du dossier

set -euo pipefail

# Vérifie les paramètres
if [ "$#" -lt 2 ]; then
    echo "Usage : $0 \"DOSSIER1 DOSSIER2 ...\" NOMBRE_JOURS_DE_RÉTENTION"
    exit 1
fi

# Paramètres
DOSSIERS="$1"
RETENTION_JOURS="$2"

# Configuration
SOURCE_DIR="$HOME/mairie"
DEST_USER="backup-user"
DEST_HOST="stockage"
DEST_BASE="/home/$DEST_USER/backup"
LOG_DIR="$HOME/backup-logs"
DATE="$(date '+%Y-%m-%d_%H-%M-%S')"
CUMULATIVE_LOG="$LOG_DIR/sauvegardes_inc.log"

mkdir -p "$LOG_DIR"

# En-tête log
{
    echo "====================================================="
    echo "[$(date '+%F %T')] ➤ DÉBUT DE LA SAUVEGARDE INCRÉMENTALE"
    echo "Dossiers sauvegardés : $DOSSIERS"
    echo "Rétention prévue : $RETENTION_JOURS jour(s)"
    echo "Horodatage de départ : $DATE"
    echo "====================================================="
} >> "$CUMULATIVE_LOG"

# Vérification de la connexion SSH
if ! ssh -q "$DEST_USER@$DEST_HOST" exit; then
    echo "Erreur : impossible de se connecter à $DEST_USER@$DEST_HOST"
    exit 2
fi

for dossier in $DOSSIERS; do
    echo "-----------------------------------------------------" >> "$CUMULATIVE_LOG"
    echo "[$(date '+%F %T')] ➤ Traitement du dossier : $dossier" >> "$CUMULATIVE_LOG"

    # Détection de la dernière FULL dans la période de rétention
    LAST_FULL=$(ssh "$DEST_USER@$DEST_HOST" "find '$DEST_BASE/$dossier' -maxdepth 1 -type d -name '*_FULL' -mtime -$RETENTION_JOURS 2>/dev/null" | sort -r | head -n 1)

    FORCE_FULL=0
    TYPE_SUFFIX=""

    if [ -z "$LAST_FULL" ]; then
        FORCE_FULL=1
        TYPE_SUFFIX="_FULL"
        echo "[$(date '+%F %T')] ➤ Aucune FULL récente trouvée → SAUVEGARDE DE TYPE : FULL" >> "$CUMULATIVE_LOG"
    else
        TYPE_SUFFIX="_INC"
        echo "[$(date '+%F %T')] ➤ Sauvegarde de TYPE : INCRÉMENTALE (base : $LAST_FULL)" >> "$CUMULATIVE_LOG"
    fi

    BACKUP_ID="${DATE}${TYPE_SUFFIX}"
    DEST_PATH="$DEST_BASE/$dossier/$BACKUP_ID"

    # Créer le dossier de destination
    ssh "$DEST_USER@$DEST_HOST" "mkdir -p '$DEST_PATH'" >> "$CUMULATIVE_LOG" 2>&1

    # rsync avec ou sans link-dest
    if [ "$FORCE_FULL" -eq 1 ]; then
        rsync -av --delete -e ssh "$SOURCE_DIR/$dossier/" "$DEST_USER@$DEST_HOST:$DEST_PATH/" \
            >> "$CUMULATIVE_LOG" 2>&1
    else
        rsync -av --delete --link-dest="$LAST_FULL" -e ssh "$SOURCE_DIR/$dossier/" "$DEST_USER@$DEST_HOST:$DEST_PATH/" \
            >> "$CUMULATIVE_LOG" 2>&1
    fi

    echo "[$(date '+%F %T')] ➤ Fin de la sauvegarde de $dossier" >> "$CUMULATIVE_LOG"

    # Mettre à jour le lien symbolique latest
    ssh "$DEST_USER@$DEST_HOST" bash -c "'
        cd \"$DEST_BASE/$dossier\"
        ln -sfn \"$BACKUP_ID\" latest
    '" >> "$CUMULATIVE_LOG" 2>&1

    # Rotation : conserver les $RETENTION_JOURS plus récentes (tous types confondus)
    ssh "$DEST_USER@$DEST_HOST" bash -c "'
        cd \"$DEST_BASE/$dossier\"
        ls -1dt 20* | tail -n +$((RETENTION_JOURS + 1)) | xargs -r rm -rf
    '" >> "$CUMULATIVE_LOG" 2>&1
done

echo "[$(date '+%F %T')] SAUVEGARDE JOURNALIÈRE TERMINÉE" >> "$CUMULATIVE_LOG"
echo >> "$CUMULATIVE_LOG"
