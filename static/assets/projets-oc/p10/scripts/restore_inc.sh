#!/bin/bash
# Auteur : BENE Maël
# Version : 1.1
# Description : Restauration interactive d’un dossier ou d’un fichier individuel (version améliorée avec journalisation)

set -euo pipefail

# Configuration
DEST_USER="backup-user"
DEST_HOST="stockage"
DEST_BASE="/home/$DEST_USER/backup"
BASE_RESTORE_DIR="/home/oclassroom/mairie"
LOG_FILE="/home/oclassroom/backup-logs/restores_inc.log"

# Fonction de log
log_header() {
    local type="$1"  # "Dossier complet" ou "Fichier spécifique"
    {
        echo "====================================================="
        echo "[$START_DATE] ➤ DÉBUT DE LA RESTAURATION INCRÉMENTALE"
        echo "Dossier restauré : $DOSSIER"
        echo "Type : $type"
        echo "Horodatage de la sauvegarde : $BACKUP_TIMESTAMP"
        echo "====================================================="
    } >> "$LOG_FILE"
}

# Liste des dossiers disponibles (hors MACHINES)
DIR_LIST=$(ssh "$DEST_USER@$DEST_HOST" "ls -1 $DEST_BASE" | grep -v '^MACHINES$')
if [ -z "$DIR_LIST" ]; then
    echo "Aucun dossier de sauvegarde trouvé."
    exit 1
fi

echo "Dossiers disponibles à la restauration :"
DIR_ARRAY=()
i=1
while read -r line; do
    echo " $i) $line"
    DIR_ARRAY+=("$line")
    ((i++))
done <<< "$DIR_LIST"

read -rp "Numéro du dossier à restaurer : " DIR_NUM
DOSSIER="${DIR_ARRAY[$((DIR_NUM - 1))]}"

# Liste des sauvegardes disponibles
BACKUP_LIST=$(ssh "$DEST_USER@$DEST_HOST" "ls -1dt $DEST_BASE/$DOSSIER/20*_* 2>/dev/null")

if [ -z "$BACKUP_LIST" ]; then
    echo "Aucune sauvegarde trouvée pour $DOSSIER."
    exit 1
fi

echo "Sauvegardes disponibles pour '$DOSSIER' :"
BACKUP_ARRAY=()
i=1
while read -r line; do
    SHORT=$(echo "$line" | sed "s|$DEST_BASE/||")
    echo " $i) $SHORT"
    BACKUP_ARRAY+=("$line")
    ((i++))
done <<< "$BACKUP_LIST"

read -rp "Numéro de la sauvegarde à restaurer (Entrée = latest) : " BACKUP_NUM
if [ -z "$BACKUP_NUM" ]; then
    SELECTED_BACKUP=$(ssh "$DEST_USER@$DEST_HOST" "readlink -f '$DEST_BASE/$DOSSIER/latest'" || true)
    if [ -z "$SELECTED_BACKUP" ]; then
        echo "Aucun lien 'latest' trouvé pour ce dossier."
        exit 1
    fi
else
    SELECTED_BACKUP="${BACKUP_ARRAY[$((BACKUP_NUM - 1))]}"
fi

echo "Sauvegarde sélectionnée : $(echo "$SELECTED_BACKUP" | sed "s|$DEST_BASE/||")"

# Horodatage pour les logs
START_DATE=$(date '+%Y-%m-%d %H:%M:%S')
BACKUP_TIMESTAMP=$(basename "$SELECTED_BACKUP")

# Choix entre restauration complète ou fichier spécifique
echo "Que voulez-vous restaurer ?"
select CHOIX in "Dossier complet" "Fichier spécifique"; do
    case $REPLY in
        1)
            RESTORE_PATH="$BASE_RESTORE_DIR/$DOSSIER"
            echo "➤ Restauration complète dans : $RESTORE_PATH"
            mkdir -p "$RESTORE_PATH"
            log_header "Dossier complet"
            rsync -av -e ssh "$DEST_USER@$DEST_HOST:$SELECTED_BACKUP/" "$RESTORE_PATH/" >> "$LOG_FILE" 2>&1
            echo "Dossier restauré avec succès."
            break
            ;;
        2)
            echo "Liste des fichiers disponibles :"
            FILE_LIST=$(ssh "$DEST_USER@$DEST_HOST" "cd '$SELECTED_BACKUP' && find . -type f" | sed 's|^\./||')
            if [ -z "$FILE_LIST" ]; then
                echo "Aucun fichier trouvé dans la sauvegarde."
                exit 1
            fi

            FILE_ARRAY=()
            i=1
            while read -r file; do
                echo " $i) $file"
                FILE_ARRAY+=("$file")
                ((i++))
            done <<< "$FILE_LIST"

            read -rp "Numéro du fichier à restaurer : " FILE_NUM
            FILE_TO_RESTORE="${FILE_ARRAY[$((FILE_NUM - 1))]}"
            DEST_PATH="$BASE_RESTORE_DIR/$DOSSIER/$(dirname "$FILE_TO_RESTORE")"
            mkdir -p "$DEST_PATH"
            log_header "Fichier spécifique"
            echo "➤ Restauration de '$FILE_TO_RESTORE' vers '$DEST_PATH'" >> "$LOG_FILE"
            rsync -av -e ssh "$DEST_USER@$DEST_HOST:$SELECTED_BACKUP/$FILE_TO_RESTORE" "$DEST_PATH/" >> "$LOG_FILE" 2>&1
            echo "Fichier restauré avec succès."
            break
            ;;
        *)
            echo "Choix invalide."
            ;;
    esac
done
