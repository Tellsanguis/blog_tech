---
sidebar_position: 9
tags: [ansible, automatisation, glpi, cross-platform]
last_update:
  date: 2025-11-22
---

# Gestion de parc avec Ansible

## Contexte

Automatisation de la gestion du parc informatique de l'entreprise Barzini : déploiement multi-OS avec Ansible, intégration GLPI et mise en place d'une architecture AGDLP.

## Objectifs

- Automatiser les tâches d'administration avec Ansible
- Gérer un parc hétérogène (Windows/Linux)
- Intégrer l'inventaire avec GLPI
- Implémenter une architecture de permissions AGDLP

## Technologies utilisées

- **Ansible** : automatisation multi-OS
- **GLPI** : gestion de parc et inventaire
- **Active Directory** : gestion des identités (AGDLP)
- **PowerShell / Bash** : scripts complémentaires

## Exemples de playbooks

### Mise à jour multi-OS
```yaml
- name: Mise à jour Linux
  hosts: linux
  become: yes
  tasks:
    - name: Update apt cache and upgrade
      apt:
        update_cache: yes
        upgrade: dist

- name: Mise à jour Windows
  hosts: windows
  tasks:
    - name: Install Windows updates
      win_updates:
        category_names:
          - SecurityUpdates
          - CriticalUpdates
```

### Montage partage CIFS
```yaml
- name: Monter partage Windows
  ansible.posix.mount:
    path: /mnt/share
    src: "//server/share"
    fstype: cifs
    opts: "credentials=/root/.smbcredentials,uid=1000"
    state: mounted
```

## Livrables

<details>
<summary>Rapport Ansible (PDF)</summary>

<iframe src="/assets/projets-oc/p09/rapport_ansible.pdf" width="100%" height="600px" style={{border: 'none'}}></iframe>

</details>

<details>
<summary>Playbooks Ansible (ZIP)</summary>

Archive contenant l'ensemble des playbooks Ansible du projet.

[Télécharger les playbooks Ansible](/assets/projets-oc/p09/ansible.zip)

</details>

<details>
<summary>Script de montage partages Linux (Bash)</summary>

```bash
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
share_names=("Admins" "Audio" "Commercial" "Direction" "Developpeurs" "Graphisme" "Responsables" "Tests")

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
```

</details>

<details>
<summary>Script de montage partages Windows (PowerShell)</summary>

```powershell
# ============================================================================
# Script     : MapDrives.ps1
# Version    : 1.1
# Date       : 29/07/2025
# Auteur     : BENE Maël
# Description: Montage automatique des partages réseau personnels et de groupe
# ============================================================================

# Fonction pour supprimer les accents (normalisation)
function Remove-Accents($text) {
    $normalized = [System.Text.NormalizationForm]::FormD
    $string = [System.String]::new($text).Normalize($normalized)
    $sb = New-Object System.Text.StringBuilder
    foreach ($c in $string.ToCharArray()) {
        if (-not [Globalization.CharUnicodeInfo]::GetUnicodeCategory($c).ToString().StartsWith("NonSpacingMark")) {
            [void]$sb.Append($c)
        }
    }
    return $sb.ToString().Normalize([System.Text.NormalizationForm]::FormC)
}

# Table de correspondance sans accents dans les clés
$groupShareMap = @{
    "G_Admins"       = "Admins"
    "G_Audio"        = "Audio"
    "G_Commercial"   = "Commercial"
    "G_Direction"    = "Direction"
    "G_Developpeurs" = "Developpeurs"
    "G_Graphisme"    = "Graphisme"
    "G_Responsables" = "Responsables"
    "G_Testeurs"     = "Tests"
}

# Récupération de l'utilisateur et des groupes AD
$user = $env:USERNAME
$userGroupsRaw = ([System.Security.Principal.WindowsIdentity]::GetCurrent()).Groups | ForEach-Object {
    $_.Translate([System.Security.Principal.NTAccount]).Value.Split('\')[-1]
}

# Normalisation des noms de groupes
$userGroups = @()
foreach ($grp in $userGroupsRaw) {
    $grpNorm = Remove-Accents $grp
    $userGroups += $grpNorm
}

# Montage du partage personnel
$homeShare = "\\SRV-AD\$user`$"
Write-Host "Tentative de montage : $homeShare"
net use * $homeShare /persistent:no
if ($LASTEXITCODE -eq 0) {
    Write-Host "Partage personnel monté avec succès."
} else {
    Write-Host "Échec du montage du partage personnel."
}

# Montage des partages de groupe
foreach ($group in $userGroups) {
    if ($groupShareMap.ContainsKey($group)) {
        $shareName = $groupShareMap[$group]
        $sharePath = "\\SRV-AD\$shareName"
        Write-Host "Tentative de montage : $sharePath (via groupe $group)"
        net use * $sharePath /persistent:no
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Partage $shareName monté avec succès."
        } else {
            Write-Host "Échec du montage de $shareName."
        }
    }
}
```

</details>

## Compétences acquises

- Automatisation cross-platform avec Ansible
- Gestion centralisée de parc informatique
- Architecture de permissions AGDLP
- Intégration d'outils de gestion (GLPI)
- Utilisation d'Ansible Vault pour les secrets
