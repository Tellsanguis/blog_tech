---
sidebar_position: 10
---

# Robust Backup Solution

## Context

Design and implementation of a complete backup solution for a city hall: Bash scripts with rsync supporting FULL, incremental and differential modes.

## Objectives

- Develop parameterizable backup scripts
- Implement the three backup modes (FULL/INC/DIFF)
- Set up backup rotation and retention
- Create restoration scripts
- Automate via cron

## Technologies Used

- **Bash**: scripting
- **Rsync**: file synchronization
- **SSH**: secure remote transfer
- **Cron**: task scheduling

## Backup Types Comparison

### FULL Backup (Complete)

Complete copy of all data at each execution.

| Advantages | Disadvantages |
|------------|---------------|
| Simple and fast restoration (single set) | Consumes a lot of disk space |
| Independent of previous backups | Long execution time |
| Maximum reliability | High bandwidth if remote |

### Incremental Backup (INC)

Copies only files modified since the **last backup** (FULL or INC).

| Advantages | Disadvantages |
|------------|---------------|
| Very fast to execute | Complex restoration (FULL + all INCs) |
| Minimal disk space | Dependency on complete chain |
| Low bandwidth | If one INC is corrupted, following ones are unusable |

### Differential Backup (DIFF)

Copies only files modified since the **last FULL**.

| Advantages | Disadvantages |
|------------|---------------|
| Simple restoration (FULL + last DIFF) | Size grows over time |
| Faster than FULL | Slower than INC |
| Fewer dependencies than INC | Requires more space than INC |

### Comparison Table

| Criteria | FULL | INC | DIFF |
|----------|------|-----|------|
| Backup time | Long | Short | Medium |
| Space used | Large | Minimal | Growing |
| Restoration time | Short | Long | Medium |
| Restoration complexity | Low | High | Medium |
| Fault tolerance | Excellent | Low | Good |

## Script Architecture

```
backup/
├── backup.sh           # Main script
├── restore.sh          # Restoration script
├── config/
│   └── backup.conf     # Configuration
├── logs/
│   └── backup_YYYYMMDD.log
└── data/
    ├── FULL_20250801/
    ├── INC_20250802/
    └── latest -> INC_20250802/
```

## Deliverables

### Presentation

<details>
<summary>Presentation Slides (PDF)</summary>

<iframe src="/assets/projets-oc/p10/Bene_Mael_1_support_presentation_082025.pdf" width="100%" height="600px" style={{border: 'none'}}></iframe>

</details>

### Backup Scripts

<details>
<summary>sauvegarde_inc.sh - Incremental Backup</summary>

```bash
#!/bin/bash
# Author: BENE Mael
# Version: 1.2
# Description: Incremental backup with rotation, latest link, and automatic FULL management via folder name

set -euo pipefail

# Check parameters
if [ "$#" -lt 2 ]; then
    echo "Usage: $0 \"FOLDER1 FOLDER2 ...\" RETENTION_DAYS"
    exit 1
fi

# Parameters
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

# Log header
{
    echo "====================================================="
    echo "[$(date '+%F %T')] > START INCREMENTAL BACKUP"
    echo "Backed up folders: $DOSSIERS"
    echo "Planned retention: $RETENTION_JOURS day(s)"
    echo "Start timestamp: $DATE"
    echo "====================================================="
} >> "$CUMULATIVE_LOG"

# SSH connection check
if ! ssh -q "$DEST_USER@$DEST_HOST" exit; then
    echo "Error: unable to connect to $DEST_USER@$DEST_HOST"
    exit 2
fi

for dossier in $DOSSIERS; do
    echo "-----------------------------------------------------" >> "$CUMULATIVE_LOG"
    echo "[$(date '+%F %T')] > Processing folder: $dossier" >> "$CUMULATIVE_LOG"

    # Detect last FULL within retention period
    LAST_FULL=$(ssh "$DEST_USER@$DEST_HOST" "find '$DEST_BASE/$dossier' -maxdepth 1 -type d -name '*_FULL' -mtime -$RETENTION_JOURS 2>/dev/null" | sort -r | head -n 1)

    FORCE_FULL=0
    TYPE_SUFFIX=""

    if [ -z "$LAST_FULL" ]; then
        FORCE_FULL=1
        TYPE_SUFFIX="_FULL"
        echo "[$(date '+%F %T')] > No recent FULL found -> BACKUP TYPE: FULL" >> "$CUMULATIVE_LOG"
    else
        TYPE_SUFFIX="_INC"
        echo "[$(date '+%F %T')] > Backup TYPE: INCREMENTAL (base: $LAST_FULL)" >> "$CUMULATIVE_LOG"
    fi

    BACKUP_ID="${DATE}${TYPE_SUFFIX}"
    DEST_PATH="$DEST_BASE/$dossier/$BACKUP_ID"

    # Create destination folder
    ssh "$DEST_USER@$DEST_HOST" "mkdir -p '$DEST_PATH'" >> "$CUMULATIVE_LOG" 2>&1

    # rsync with or without link-dest
    if [ "$FORCE_FULL" -eq 1 ]; then
        rsync -av --delete -e ssh "$SOURCE_DIR/$dossier/" "$DEST_USER@$DEST_HOST:$DEST_PATH/" \
            >> "$CUMULATIVE_LOG" 2>&1
    else
        rsync -av --delete --link-dest="$LAST_FULL" -e ssh "$SOURCE_DIR/$dossier/" "$DEST_USER@$DEST_HOST:$DEST_PATH/" \
            >> "$CUMULATIVE_LOG" 2>&1
    fi

    echo "[$(date '+%F %T')] > End of backup for $dossier" >> "$CUMULATIVE_LOG"

    # Update latest symbolic link
    ssh "$DEST_USER@$DEST_HOST" bash -c "'
        cd \"$DEST_BASE/$dossier\"
        ln -sfn \"$BACKUP_ID\" latest
    '" >> "$CUMULATIVE_LOG" 2>&1

    # Rotation: keep $RETENTION_JOURS most recent (all types)
    ssh "$DEST_USER@$DEST_HOST" bash -c "'
        cd \"$DEST_BASE/$dossier\"
        ls -1dt 20* | tail -n +$((RETENTION_JOURS + 1)) | xargs -r rm -rf
    '" >> "$CUMULATIVE_LOG" 2>&1
done

echo "[$(date '+%F %T')] DAILY BACKUP COMPLETED" >> "$CUMULATIVE_LOG"
echo >> "$CUMULATIVE_LOG"
```

</details>

<details>
<summary>sauvegarde_dif.sh - Differential Backup</summary>

```bash
#!/bin/bash
# Author: BENE Mael
# Version: 1.1
# Description: Differential backup with execution time in logs

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

# Function executed even on crash or interruption
on_exit() {
    if $rsync_started; then
        local end=$(date +%s)
        local duration=$((end - start))
        echo "[$(date '+%F %T')] > Backup duration: ${duration} seconds" >> "$CUMULATIVE_LOG"
    fi
}
trap on_exit EXIT

# Start log
{
    echo "====================================================="
    echo "[$(date '+%F %T')] > START DIFFERENTIAL BACKUP"
    echo "Folder       : $DOSSIER"
    echo "Source       : $SOURCE_DIR"
    echo "Destination  : $DEST_USER@$DEST_HOST:$DEST_PATH"
    echo "Timestamp    : $DATE"
    echo "====================================================="
} >> "$CUMULATIVE_LOG"

# Prepare remote folder
echo "[$(date '+%F %T')] > Checking remote folder..." >> "$CUMULATIVE_LOG"
ssh "$DEST_USER@$DEST_HOST" "mkdir -p '$DEST_PATH'" >> "$CUMULATIVE_LOG" 2>&1
echo "[$(date '+%F %T')] > Remote folder ready." >> "$CUMULATIVE_LOG"

# Time measurement
start=$(date +%s)
rsync_started=true

# Launch rsync
echo "[$(date '+%F %T')] > Launching rsync..." >> "$CUMULATIVE_LOG"
rsync -av --inplace --partial --append -e ssh "$SOURCE_DIR/" "$DEST_USER@$DEST_HOST:$DEST_PATH/" \
    >> "$CUMULATIVE_LOG" 2>&1

# If rsync finished normally, continue logging
echo "[$(date '+%F %T')] DIFFERENTIAL BACKUP COMPLETED" >> "$CUMULATIVE_LOG"
echo >> "$CUMULATIVE_LOG"
```

</details>

### Restoration Scripts

<details>
<summary>restore_inc.sh - Incremental Restoration</summary>

```bash
#!/bin/bash
# Author: BENE Mael
# Version: 1.1
# Description: Interactive restoration of a folder or individual file (improved version with logging)

set -euo pipefail

# Configuration
DEST_USER="backup-user"
DEST_HOST="stockage"
DEST_BASE="/home/$DEST_USER/backup"
BASE_RESTORE_DIR="/home/oclassroom/mairie"
LOG_FILE="/home/oclassroom/backup-logs/restores_inc.log"

# Log function
log_header() {
    local type="$1"  # "Complete folder" or "Specific file"
    {
        echo "====================================================="
        echo "[$START_DATE] > START INCREMENTAL RESTORATION"
        echo "Restored folder: $DOSSIER"
        echo "Type: $type"
        echo "Backup timestamp: $BACKUP_TIMESTAMP"
        echo "====================================================="
    } >> "$LOG_FILE"
}

# List available folders (excluding MACHINES)
DIR_LIST=$(ssh "$DEST_USER@$DEST_HOST" "ls -1 $DEST_BASE" | grep -v '^MACHINES$')
if [ -z "$DIR_LIST" ]; then
    echo "No backup folder found."
    exit 1
fi

echo "Folders available for restoration:"
DIR_ARRAY=()
i=1
while read -r line; do
    echo " $i) $line"
    DIR_ARRAY+=("$line")
    ((i++))
done <<< "$DIR_LIST"

read -rp "Folder number to restore: " DIR_NUM
DOSSIER="${DIR_ARRAY[$((DIR_NUM - 1))]}"

# List available backups
BACKUP_LIST=$(ssh "$DEST_USER@$DEST_HOST" "ls -1dt $DEST_BASE/$DOSSIER/20*_* 2>/dev/null")

if [ -z "$BACKUP_LIST" ]; then
    echo "No backup found for $DOSSIER."
    exit 1
fi

echo "Available backups for '$DOSSIER':"
BACKUP_ARRAY=()
i=1
while read -r line; do
    SHORT=$(echo "$line" | sed "s|$DEST_BASE/||")
    echo " $i) $SHORT"
    BACKUP_ARRAY+=("$line")
    ((i++))
done <<< "$BACKUP_LIST"

read -rp "Backup number to restore (Enter = latest): " BACKUP_NUM
if [ -z "$BACKUP_NUM" ]; then
    SELECTED_BACKUP=$(ssh "$DEST_USER@$DEST_HOST" "readlink -f '$DEST_BASE/$DOSSIER/latest'" || true)
    if [ -z "$SELECTED_BACKUP" ]; then
        echo "No 'latest' link found for this folder."
        exit 1
    fi
else
    SELECTED_BACKUP="${BACKUP_ARRAY[$((BACKUP_NUM - 1))]}"
fi

echo "Selected backup: $(echo "$SELECTED_BACKUP" | sed "s|$DEST_BASE/||")"

# Timestamp for logs
START_DATE=$(date '+%Y-%m-%d %H:%M:%S')
BACKUP_TIMESTAMP=$(basename "$SELECTED_BACKUP")

# Choose between complete restoration or specific file
echo "What do you want to restore?"
select CHOIX in "Complete folder" "Specific file"; do
    case $REPLY in
        1)
            RESTORE_PATH="$BASE_RESTORE_DIR/$DOSSIER"
            echo "> Complete restoration to: $RESTORE_PATH"
            mkdir -p "$RESTORE_PATH"
            log_header "Complete folder"
            rsync -av -e ssh "$DEST_USER@$DEST_HOST:$SELECTED_BACKUP/" "$RESTORE_PATH/" >> "$LOG_FILE" 2>&1
            echo "Folder restored successfully."
            break
            ;;
        2)
            echo "List of available files:"
            FILE_LIST=$(ssh "$DEST_USER@$DEST_HOST" "cd '$SELECTED_BACKUP' && find . -type f" | sed 's|^\./||')
            if [ -z "$FILE_LIST" ]; then
                echo "No file found in backup."
                exit 1
            fi

            FILE_ARRAY=()
            i=1
            while read -r file; do
                echo " $i) $file"
                FILE_ARRAY+=("$file")
                ((i++))
            done <<< "$FILE_LIST"

            read -rp "File number to restore: " FILE_NUM
            FILE_TO_RESTORE="${FILE_ARRAY[$((FILE_NUM - 1))]}"
            DEST_PATH="$BASE_RESTORE_DIR/$DOSSIER/$(dirname "$FILE_TO_RESTORE")"
            mkdir -p "$DEST_PATH"
            log_header "Specific file"
            echo "> Restoring '$FILE_TO_RESTORE' to '$DEST_PATH'" >> "$LOG_FILE"
            rsync -av -e ssh "$DEST_USER@$DEST_HOST:$SELECTED_BACKUP/$FILE_TO_RESTORE" "$DEST_PATH/" >> "$LOG_FILE" 2>&1
            echo "File restored successfully."
            break
            ;;
        *)
            echo "Invalid choice."
            ;;
    esac
done
```

</details>

<details>
<summary>restore_dif.sh - Differential Restoration</summary>

```bash
#!/bin/bash
# Author: BENE Mael
# Version: 1.1
# Description: Manual differential backup restoration (VMs) with cumulative logging

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
    echo "[$START_DATE] > START DIFFERENTIAL RESTORATION"
    echo "Restored folder: $DOSSIER"
    echo "Local destination: $RESTORE_DIR"
    echo "Remote source: $DEST_USER@$DEST_HOST:$DEST_PATH"
    echo "====================================================="
} >> "$LOG_FILE"

# Restoration with rsync (differential)
rsync -av -e ssh "$DEST_USER@$DEST_HOST:$DEST_PATH/" "$RESTORE_DIR/" >> "$LOG_FILE" 2>&1

{
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] > END OF RESTORATION"
    echo
} >> "$LOG_FILE"
```

</details>

### Cron Configuration

<details>
<summary>crontab - Backup Scheduling</summary>

```bash
# Differential backup of VM that forces stop after 3h (so at 4am)
0 1 * * * timeout 3h /home/oclassroom/backup_script/backup/differentielle.sh

# Daily backups with 7 days retention
0 4 * * * /home/oclassroom/backup_script/backup/incrementale.sh "FICHIERS" 7
0 5 * * * /home/oclassroom/backup_script/backup/incrementale.sh "MAILS" 7
0 6 * * * /home/oclassroom/backup_script/backup/incrementale.sh "RH" 7
30 6 * * * /home/oclassroom/backup_script/backup/incrementale.sh "TICKETS" 7

# SITE backup every 3 days at 7am, with 15 days retention
0 7 */3 * * /home/oclassroom/backup_script/backup/incrementale.sh "SITE" 15
```

</details>

### Execution Logs

<details>
<summary>sauvegardes_inc.log - Incremental Backup Logs</summary>

```log
=====================================================
[2025-08-12 12:00:00] > START INCREMENTAL BACKUP
Backed up folders: FICHIERS
Planned retention: 7 day(s)
Start timestamp: 2025-08-12_12-00-00
=====================================================
-----------------------------------------------------
[2025-08-12 12:00:00] > Processing folder: FICHIERS
[2025-08-12 12:00:00] > No recent FULL found -> BACKUP TYPE: FULL
sending incremental file list
./
doc1.txt
doc2.txt
fichier_2025-08-12_1.txt
fichier_2025-08-12_2.txt

sent 449 bytes  received 95 bytes  1.088,00 bytes/sec
total size is 94  speedup is 0,17
[2025-08-12 12:00:01] > End of backup for FICHIERS
[2025-08-12 12:00:01] DAILY BACKUP COMPLETED

=====================================================
[2025-08-13 12:00:00] > START INCREMENTAL BACKUP
Backed up folders: FICHIERS
Planned retention: 7 day(s)
Start timestamp: 2025-08-13_12-00-00
=====================================================
-----------------------------------------------------
[2025-08-13 12:00:00] > Processing folder: FICHIERS
[2025-08-13 12:00:00] > Backup TYPE: INCREMENTAL (base: /home/backup-user/backup/FICHIERS/2025-08-12_12-00-00_FULL)
sending incremental file list
./
fichier_2025-08-13_1.txt
fichier_2025-08-13_2.txt

sent 361 bytes  received 57 bytes  836,00 bytes/sec
total size is 154  speedup is 0,37
[2025-08-13 12:00:01] > End of backup for FICHIERS
[2025-08-13 12:00:01] DAILY BACKUP COMPLETED

=====================================================
[2025-08-20 12:00:00] > START INCREMENTAL BACKUP
Backed up folders: FICHIERS
Planned retention: 7 day(s)
Start timestamp: 2025-08-20_12-00-00
=====================================================
-----------------------------------------------------
[2025-08-20 12:00:00] > Processing folder: FICHIERS
[2025-08-20 12:00:00] > No recent FULL found -> BACKUP TYPE: FULL
sending incremental file list
[...]
[2025-08-20 12:00:01] > End of backup for FICHIERS
[2025-08-20 12:00:01] DAILY BACKUP COMPLETED
```

</details>

<details>
<summary>sauvegardes_dif.log - Differential Backup Logs</summary>

```log
=====================================================
[2025-08-12 17:26:10] > START DIFFERENTIAL BACKUP
Folder       : MACHINES
Source       : /home/oclassroom/mairie/MACHINES
Destination  : backup-user@stockage:/home/backup-user/backup/MACHINES
Timestamp    : 2025-08-12_17-26-10
=====================================================
[2025-08-12 17:26:10] > Checking remote folder...
[2025-08-12 17:26:10] > Remote folder ready.
[2025-08-12 17:26:10] > Launching rsync...
sending incremental file list
./
fichier_gros.test
rsync error: unexplained error (code 255) at rsync.c(716) [sender=3.2.7]
[2025-08-12 17:26:35] > Backup duration: 25 seconds

=====================================================
[2025-08-12 17:26:42] > START DIFFERENTIAL BACKUP
Folder       : MACHINES
Source       : /home/oclassroom/mairie/MACHINES
Destination  : backup-user@stockage:/home/backup-user/backup/MACHINES
Timestamp    : 2025-08-12_17-26-42
=====================================================
[2025-08-12 17:26:42] > Checking remote folder...
[2025-08-12 17:26:42] > Remote folder ready.
[2025-08-12 17:26:42] > Launching rsync...
sending incremental file list
./
fichier_gros.test

sent 668.597.769 bytes  received 38 bytes  148.577.290,44 bytes/sec
total size is 5.368.709.120  speedup is 8,03
[2025-08-12 17:26:46] DIFFERENTIAL BACKUP COMPLETED

[2025-08-12 17:26:46] > Backup duration: 4 seconds
```

</details>

<details>
<summary>restores_inc.log - Incremental Restoration Logs</summary>

```log
=====================================================
[2025-08-12 17:23:56] > START INCREMENTAL RESTORATION
Restored folder: FICHIERS
Type: Specific file
Backup timestamp: 2025-08-25_12-00-00_INC
=====================================================
> Restoring 'doc1.txt' to '/home/oclassroom/mairie/FICHIERS/.'
receiving incremental file list
doc1.txt

sent 43 bytes  received 139 bytes  121,33 bytes/sec
total size is 18  speedup is 0,10

=====================================================
[2025-08-12 17:24:13] > START INCREMENTAL RESTORATION
Restored folder: FICHIERS
Type: Complete folder
Backup timestamp: 2025-08-25_12-00-00_INC
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
<summary>restores_dif.log - Differential Restoration Logs</summary>

```log
=====================================================
[2025-08-12 17:29:42] > START DIFFERENTIAL RESTORATION
Restored folder: MACHINES
Local destination: /home/oclassroom/mairie/MACHINES
Remote source: backup-user@stockage:/home/backup-user/backup/MACHINES
=====================================================
receiving incremental file list
./
fichier_1Go.bin
fichier_gros.test

sent 65 bytes  received 6.444.024.019 bytes  186.783.306,78 bytes/sec
total size is 6.442.450.944  speedup is 1,00
[2025-08-12 17:30:16] > END OF RESTORATION
```

</details>

## Skills Acquired

- Advanced Bash script development
- Mastery of rsync and its options
- Backup strategy design (3-2-1)
- Retention and rotation management
- Automation with cron
- Restoration procedure documentation
