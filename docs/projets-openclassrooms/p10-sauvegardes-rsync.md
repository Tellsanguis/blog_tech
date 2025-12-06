---
sidebar_position: 10
tags: [sauvegarde, rsync, bash, pra]
last_update:
  date: 2025-11-22
---

# Solution de sauvegarde robuste

## Contexte

Conception et mise en place d'une solution de sauvegarde complète pour une mairie : scripts Bash avec rsync supportant les modes FULL, incrémental et différentiel.

## Objectifs

- Développer des scripts de sauvegarde paramétrables
- Implémenter les trois modes de sauvegarde (FULL/INC/DIFF)
- Mettre en place la rotation et rétention des sauvegardes
- Créer des scripts de restauration
- Automatiser via cron

## Technologies utilisées

- **Bash** : scripting
- **Rsync** : synchronisation de fichiers
- **SSH** : transfert sécurisé distant
- **Cron** : planification des tâches

## Comparatif des types de sauvegarde

### Sauvegarde FULL (complète)

Copie intégrale de toutes les données à chaque exécution.

| Avantages | Inconvénients |
|-----------|---------------|
| Restauration simple et rapide (1 seul jeu) | Consomme beaucoup d'espace disque |
| Indépendante des sauvegardes précédentes | Temps d'exécution long |
| Fiabilité maximale | Bande passante importante si distant |

### Sauvegarde incrémentale (INC)

Copie uniquement les fichiers modifiés depuis la **dernière sauvegarde** (FULL ou INC).

| Avantages | Inconvénients |
|-----------|---------------|
| Très rapide à exécuter | Restauration complexe (FULL + toutes les INC) |
| Espace disque minimal | Dépendance à la chaîne complète |
| Faible bande passante | Si une INC est corrompue, les suivantes sont inutilisables |

### Sauvegarde différentielle (DIFF)

Copie uniquement les fichiers modifiés depuis le **dernier FULL**.

| Avantages | Inconvénients |
|-----------|---------------|
| Restauration simple (FULL + dernière DIFF) | Taille croissante au fil du temps |
| Plus rapide qu'un FULL | Plus lent qu'une INC |
| Moins de dépendances qu'une INC | Nécessite plus d'espace qu'une INC |

### Tableau comparatif

| Critère | FULL | INC | DIFF |
|---------|------|-----|------|
| Temps de sauvegarde | Long | Court | Moyen |
| Espace utilisé | Important | Minimal | Croissant |
| Temps de restauration | Court | Long | Moyen |
| Complexité restauration | Faible | Élevée | Moyenne |
| Tolérance aux pannes | Excellente | Faible | Bonne |

## Architecture des scripts

```
backup/
├── backup.sh           # Script principal
├── restore.sh          # Script de restauration
├── config/
│   └── backup.conf     # Configuration
├── logs/
│   └── backup_YYYYMMDD.log
└── data/
    ├── FULL_20250801/
    ├── INC_20250802/
    └── latest -> INC_20250802/
```

## Livrables

### Présentation

<details>
<summary>Support de présentation (PDF)</summary>

<iframe src="/assets/projets-oc/p10/Bene_Mael_1_support_presentation_082025.pdf" width="100%" height="600px" style={{border: 'none'}}></iframe>

</details>

### Scripts de sauvegarde

<details>
<summary>sauvegarde_inc.sh - Sauvegarde incrémentale</summary>

```bash
#!/bin/bash
# Auteur : BENE Maël
# Version : 1.2
# Description : Sauvegarde incrémentale avec rotation, lien latest, et gestion automatique des FULL via le nom du dossier

set -euo pipefail

# Vérifie les paramètres
if [ "$#" -lt 2 ]; then
    echo "Usage : $0 \"DOSSIER1 DOSSIER2 ...\" NOMBRE_JOURS_DE_RETENTION"
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
    echo "[$(date '+%F %T')] > DÉBUT DE LA SAUVEGARDE INCRÉMENTALE"
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
    echo "[$(date '+%F %T')] > Traitement du dossier : $dossier" >> "$CUMULATIVE_LOG"

    # Détection de la dernière FULL dans la période de rétention
    LAST_FULL=$(ssh "$DEST_USER@$DEST_HOST" "find '$DEST_BASE/$dossier' -maxdepth 1 -type d -name '*_FULL' -mtime -$RETENTION_JOURS 2>/dev/null" | sort -r | head -n 1)

    FORCE_FULL=0
    TYPE_SUFFIX=""

    if [ -z "$LAST_FULL" ]; then
        FORCE_FULL=1
        TYPE_SUFFIX="_FULL"
        echo "[$(date '+%F %T')] > Aucune FULL récente trouvée -> SAUVEGARDE DE TYPE : FULL" >> "$CUMULATIVE_LOG"
    else
        TYPE_SUFFIX="_INC"
        echo "[$(date '+%F %T')] > Sauvegarde de TYPE : INCRÉMENTALE (base : $LAST_FULL)" >> "$CUMULATIVE_LOG"
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

    echo "[$(date '+%F %T')] > Fin de la sauvegarde de $dossier" >> "$CUMULATIVE_LOG"

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
```

</details>

<details>
<summary>sauvegarde_dif.sh - Sauvegarde différentielle</summary>

```bash
#!/bin/bash
# Auteur : BENE Maël
# Version : 1.1
# Description : Sauvegarde différentielle avec temps d'exécution dans les logs

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
        echo "[$(date '+%F %T')] > Durée de la sauvegarde : ${duration} secondes" >> "$CUMULATIVE_LOG"
    fi
}
trap on_exit EXIT

# Log de début
{
    echo "====================================================="
    echo "[$(date '+%F %T')] > DÉBUT DE LA SAUVEGARDE DIFFÉRENTIELLE"
    echo "Dossier      : $DOSSIER"
    echo "Source       : $SOURCE_DIR"
    echo "Destination  : $DEST_USER@$DEST_HOST:$DEST_PATH"
    echo "Horodatage   : $DATE"
    echo "====================================================="
} >> "$CUMULATIVE_LOG"

# Préparation du dossier distant
echo "[$(date '+%F %T')] > Vérification du dossier distant..." >> "$CUMULATIVE_LOG"
ssh "$DEST_USER@$DEST_HOST" "mkdir -p '$DEST_PATH'" >> "$CUMULATIVE_LOG" 2>&1
echo "[$(date '+%F %T')] > Dossier distant prêt." >> "$CUMULATIVE_LOG"

# Mesure du temps
start=$(date +%s)
rsync_started=true

# Lancement de rsync
echo "[$(date '+%F %T')] > Lancement de rsync..." >> "$CUMULATIVE_LOG"
rsync -av --inplace --partial --append -e ssh "$SOURCE_DIR/" "$DEST_USER@$DEST_HOST:$DEST_PATH/" \
    >> "$CUMULATIVE_LOG" 2>&1

# Si rsync a terminé normalement, on continue le log
echo "[$(date '+%F %T')] SAUVEGARDE DIFFÉRENTIELLE TERMINÉE" >> "$CUMULATIVE_LOG"
echo >> "$CUMULATIVE_LOG"
```

</details>

### Scripts de restauration

<details>
<summary>restore_inc.sh - Restauration incrémentale</summary>

```bash
#!/bin/bash
# Auteur : BENE Maël
# Version : 1.1
# Description : Restauration interactive d'un dossier ou d'un fichier individuel (version améliorée avec journalisation)

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
        echo "[$START_DATE] > DÉBUT DE LA RESTAURATION INCRÉMENTALE"
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
            echo "> Restauration complète dans : $RESTORE_PATH"
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
            echo "> Restauration de '$FILE_TO_RESTORE' vers '$DEST_PATH'" >> "$LOG_FILE"
            rsync -av -e ssh "$DEST_USER@$DEST_HOST:$SELECTED_BACKUP/$FILE_TO_RESTORE" "$DEST_PATH/" >> "$LOG_FILE" 2>&1
            echo "Fichier restauré avec succès."
            break
            ;;
        *)
            echo "Choix invalide."
            ;;
    esac
done
```

</details>

<details>
<summary>restore_dif.sh - Restauration différentielle</summary>

```bash
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
    echo "[$START_DATE] > DÉBUT DE LA RESTAURATION DIFFÉRENTIELLE"
    echo "Dossier restauré : $DOSSIER"
    echo "Destination locale : $RESTORE_DIR"
    echo "Source distante : $DEST_USER@$DEST_HOST:$DEST_PATH"
    echo "====================================================="
} >> "$LOG_FILE"

# Restauration avec rsync (différentielle)
rsync -av -e ssh "$DEST_USER@$DEST_HOST:$DEST_PATH/" "$RESTORE_DIR/" >> "$LOG_FILE" 2>&1

{
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] > FIN DE LA RESTAURATION"
    echo
} >> "$LOG_FILE"
```

</details>

### Configuration cron

<details>
<summary>crontab - Planification des sauvegardes</summary>

```bash
# Sauvegarde différentielle de la VM qui force l'arrêt après 3h (donc à 4h du matin)
0 1 * * * timeout 3h /home/oclassroom/backup_script/backup/differentielle.sh

# Sauvegardes journalières avec 7 jours de rétention
0 4 * * * /home/oclassroom/backup_script/backup/incrementale.sh "FICHIERS" 7
0 5 * * * /home/oclassroom/backup_script/backup/incrementale.sh "MAILS" 7
0 6 * * * /home/oclassroom/backup_script/backup/incrementale.sh "RH" 7
30 6 * * * /home/oclassroom/backup_script/backup/incrementale.sh "TICKETS" 7

# Sauvegarde de SITE tous les 3 jours à 7h, avec 15 jours de rétention
0 7 */3 * * /home/oclassroom/backup_script/backup/incrementale.sh "SITE" 15
```

</details>

### Logs d'exécution

<details>
<summary>sauvegardes_inc.log - Logs des sauvegardes incrémentales</summary>

```log
=====================================================
[2025-08-12 12:00:00] > DÉBUT DE LA SAUVEGARDE INCRÉMENTALE
Dossiers sauvegardés : FICHIERS
Rétention prévue : 7 jour(s)
Horodatage de départ : 2025-08-12_12-00-00
=====================================================
-----------------------------------------------------
[2025-08-12 12:00:00] > Traitement du dossier : FICHIERS
[2025-08-12 12:00:00] > Aucune FULL récente trouvée -> SAUVEGARDE DE TYPE : FULL
sending incremental file list
./
doc1.txt
doc2.txt
fichier_2025-08-12_1.txt
fichier_2025-08-12_2.txt

sent 449 bytes  received 95 bytes  1.088,00 bytes/sec
total size is 94  speedup is 0,17
[2025-08-12 12:00:01] > Fin de la sauvegarde de FICHIERS
[2025-08-12 12:00:01] SAUVEGARDE JOURNALIÈRE TERMINÉE

=====================================================
[2025-08-13 12:00:00] > DÉBUT DE LA SAUVEGARDE INCRÉMENTALE
Dossiers sauvegardés : FICHIERS
Rétention prévue : 7 jour(s)
Horodatage de départ : 2025-08-13_12-00-00
=====================================================
-----------------------------------------------------
[2025-08-13 12:00:00] > Traitement du dossier : FICHIERS
[2025-08-13 12:00:00] > Sauvegarde de TYPE : INCRÉMENTALE (base : /home/backup-user/backup/FICHIERS/2025-08-12_12-00-00_FULL)
sending incremental file list
./
fichier_2025-08-13_1.txt
fichier_2025-08-13_2.txt

sent 361 bytes  received 57 bytes  836,00 bytes/sec
total size is 154  speedup is 0,37
[2025-08-13 12:00:01] > Fin de la sauvegarde de FICHIERS
[2025-08-13 12:00:01] SAUVEGARDE JOURNALIÈRE TERMINÉE

=====================================================
[2025-08-20 12:00:00] > DÉBUT DE LA SAUVEGARDE INCRÉMENTALE
Dossiers sauvegardés : FICHIERS
Rétention prévue : 7 jour(s)
Horodatage de départ : 2025-08-20_12-00-00
=====================================================
-----------------------------------------------------
[2025-08-20 12:00:00] > Traitement du dossier : FICHIERS
[2025-08-20 12:00:00] > Aucune FULL récente trouvée -> SAUVEGARDE DE TYPE : FULL
sending incremental file list
[...]
[2025-08-20 12:00:01] > Fin de la sauvegarde de FICHIERS
[2025-08-20 12:00:01] SAUVEGARDE JOURNALIÈRE TERMINÉE
```

</details>

<details>
<summary>sauvegardes_dif.log - Logs des sauvegardes différentielles</summary>

```log
=====================================================
[2025-08-12 17:26:10] > DÉBUT DE LA SAUVEGARDE DIFFÉRENTIELLE
Dossier      : MACHINES
Source       : /home/oclassroom/mairie/MACHINES
Destination  : backup-user@stockage:/home/backup-user/backup/MACHINES
Horodatage   : 2025-08-12_17-26-10
=====================================================
[2025-08-12 17:26:10] > Vérification du dossier distant...
[2025-08-12 17:26:10] > Dossier distant prêt.
[2025-08-12 17:26:10] > Lancement de rsync...
sending incremental file list
./
fichier_gros.test
rsync error: unexplained error (code 255) at rsync.c(716) [sender=3.2.7]
[2025-08-12 17:26:35] > Durée de la sauvegarde : 25 secondes

=====================================================
[2025-08-12 17:26:42] > DÉBUT DE LA SAUVEGARDE DIFFÉRENTIELLE
Dossier      : MACHINES
Source       : /home/oclassroom/mairie/MACHINES
Destination  : backup-user@stockage:/home/backup-user/backup/MACHINES
Horodatage   : 2025-08-12_17-26-42
=====================================================
[2025-08-12 17:26:42] > Vérification du dossier distant...
[2025-08-12 17:26:42] > Dossier distant prêt.
[2025-08-12 17:26:42] > Lancement de rsync...
sending incremental file list
./
fichier_gros.test

sent 668.597.769 bytes  received 38 bytes  148.577.290,44 bytes/sec
total size is 5.368.709.120  speedup is 8,03
[2025-08-12 17:26:46] SAUVEGARDE DIFFÉRENTIELLE TERMINÉE

[2025-08-12 17:26:46] > Durée de la sauvegarde : 4 secondes
```

</details>

<details>
<summary>restores_inc.log - Logs des restaurations incrémentales</summary>

```log
=====================================================
[2025-08-12 17:23:56] > DÉBUT DE LA RESTAURATION INCRÉMENTALE
Dossier restauré : FICHIERS
Type : Fichier spécifique
Horodatage de la sauvegarde : 2025-08-25_12-00-00_INC
=====================================================
> Restauration de 'doc1.txt' vers '/home/oclassroom/mairie/FICHIERS/.'
receiving incremental file list
doc1.txt

sent 43 bytes  received 139 bytes  121,33 bytes/sec
total size is 18  speedup is 0,10

=====================================================
[2025-08-12 17:24:13] > DÉBUT DE LA RESTAURATION INCRÉMENTALE
Dossier restauré : FICHIERS
Type : Dossier complet
Horodatage de la sauvegarde : 2025-08-25_12-00-00_INC
=====================================================
receiving incremental file list
./
doc2.txt
fichier_2025-08-12_1.txt
[...]
fichier_2025-08-25_2.txt

sent 578 bytes  received 2.750 bytes  6.656,00 bytes/sec
total size is 862  speedup is 0,26
```

</details>

<details>
<summary>restores_dif.log - Logs des restaurations différentielles</summary>

```log
=====================================================
[2025-08-12 17:29:42] > DÉBUT DE LA RESTAURATION DIFFÉRENTIELLE
Dossier restauré : MACHINES
Destination locale : /home/oclassroom/mairie/MACHINES
Source distante : backup-user@stockage:/home/backup-user/backup/MACHINES
=====================================================
receiving incremental file list
./
fichier_1Go.bin
fichier_gros.test

sent 65 bytes  received 6.444.024.019 bytes  186.783.306,78 bytes/sec
total size is 6.442.450.944  speedup is 1,00
[2025-08-12 17:30:16] > FIN DE LA RESTAURATION
```

</details>

## Compétences acquises

- Développement de scripts Bash avancés
- Maîtrise de rsync et ses options
- Conception de stratégies de sauvegarde (3-2-1)
- Gestion de la rétention et rotation
- Automatisation avec cron
- Documentation de procédures de restauration
