#!/bin/bash

# ============================================================================
# Script     : mount_shares.sh
# Version    : 1.0
# Date       : 14/07/2025
# Auteur     : BENE Maël
# Description: Montage automatique des partages CIFS personnels et de groupe
# ============================================================================

DOMAIN="BARZINI.INTERNAL"
SERVER="SRV-AD"
user="$(id -un)"
uid="$(id -u)"
gid="$(id -g)"
groups="$(id -Gn)"

# Liste fixe des partages de groupe disponibles
share_names=("Admins" "Audio" "Commercial" "Direction" "Développeurs" "Graphisme" "Responsables" "Tests")

# Montage du partage personnel
home_share="//${SERVER}/${user}\$"
home_mount="${user_home}/Dossier_perso"

echo "Montage du dossier personnel : $home_share"
if [ ! -d "$home_mount" ]; then
    mkdir -p "$home_mount"
    chown "$uid:$gid" "$home_mount"
fi

if ! mountpoint -q "$home_mount"; then
    sudo mount -t cifs -o "sec=krb5,cruid=${user},uid=${uid},gid=${gid},nofail" "$home_share" "$home_mount" && \
        echo "Partage personnel monté sur $home_mount" || \
        echo "Échec du montage du partage personnel"
else
    echo "Déjà monté : $home_mount"
fi

# Montage des partages de groupe
for share in "${share_names[@]}"; do
    for grp in $groups; do
        clean_grp=$(echo "$grp" | tr '[:upper:]' '[:lower:]')
        clean_share=$(echo "$share" | tr '[:upper:]' '[:lower:]')
        if [[ "$clean_grp" == *"$clean_share"* ]]; then
            share_path="//${SERVER}/${share}"
            mount_point="${user_home}/${share}"

            echo "Tentative de montage de $share_path"

            if [ ! -d "$mount_point" ]; then
                mkdir -p "$mount_point"
                chown "$uid:$gid" "$mount_point"
            fi

            if ! mountpoint -q "$mount_point"; then
                sudo mount -t cifs -o "sec=krb5,cruid=${user},uid=${uid},gid=${gid},nofail" "$share_path" "$mount_point" && \
                    echo "Partage monté : $mount_point" || \
                    echo "Échec du montage : $share_path"
            else
                echo "Déjà monté : $mount_point"
            fi

            break
        fi
    done
done