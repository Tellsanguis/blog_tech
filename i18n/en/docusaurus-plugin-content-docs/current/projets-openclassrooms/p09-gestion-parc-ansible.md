---
sidebar_position: 9
---

# P9 - Fleet Management with Ansible

## Context

Automation of IT fleet management for Barzini company: multi-OS deployment with Ansible, GLPI integration and AGDLP architecture implementation.

## Objectives

- Automate administration tasks with Ansible
- Manage a heterogeneous fleet (Windows/Linux)
- Integrate inventory with GLPI
- Implement an AGDLP permissions architecture

## Technologies Used

- **Ansible**: multi-OS automation
- **GLPI**: fleet management and inventory
- **Active Directory**: identity management (AGDLP)
- **PowerShell / Bash**: complementary scripts

## Playbook Examples

### Multi-OS Update
```yaml
- name: Linux Update
  hosts: linux
  become: yes
  tasks:
    - name: Update apt cache and upgrade
      apt:
        update_cache: yes
        upgrade: dist

- name: Windows Update
  hosts: windows
  tasks:
    - name: Install Windows updates
      win_updates:
        category_names:
          - SecurityUpdates
          - CriticalUpdates
```

### CIFS Share Mount
```yaml
- name: Mount Windows Share
  ansible.posix.mount:
    path: /mnt/share
    src: "//server/share"
    fstype: cifs
    opts: "credentials=/root/.smbcredentials,uid=1000"
    state: mounted
```

## Deliverables

<details>
<summary>Ansible Report (PDF)</summary>

<iframe src="/assets/projets-oc/p09/rapport_ansible.pdf" width="100%" height="600px" style={{border: 'none'}}></iframe>

</details>

<details>
<summary>Ansible Playbooks (ZIP)</summary>

Archive containing all Ansible playbooks for the project.

[Download Ansible playbooks](/assets/projets-oc/p09/ansible.zip)

</details>

<details>
<summary>Linux Share Mount Script (Bash)</summary>

```bash
#!/bin/bash

# ============================================================================
# Script     : mount_shares.sh
# Version    : 1.0
# Date       : 14/07/2025
# Author     : BENE Mael
# Description: Automatic mounting of personal and group CIFS shares
# ============================================================================

DOMAIN="BARZINI.INTERNAL"
SERVER="SRV-AD"
user="$(id -un)"
uid="$(id -u)"
gid="$(id -g)"
groups="$(id -Gn)"

# Fixed list of available group shares
share_names=("Admins" "Audio" "Commercial" "Direction" "Developpeurs" "Graphisme" "Responsables" "Tests")

# Personal share mount
home_share="//${SERVER}/${user}\$"
home_mount="${user_home}/Dossier_perso"

echo "Mounting personal folder: $home_share"
if [ ! -d "$home_mount" ]; then
    mkdir -p "$home_mount"
    chown "$uid:$gid" "$home_mount"
fi

if ! mountpoint -q "$home_mount"; then
    sudo mount -t cifs -o "sec=krb5,cruid=${user},uid=${uid},gid=${gid},nofail" "$home_share" "$home_mount" && \
        echo "Personal share mounted on $home_mount" || \
        echo "Failed to mount personal share"
else
    echo "Already mounted: $home_mount"
fi

# Group share mounting
for share in "${share_names[@]}"; do
    for grp in $groups; do
        clean_grp=$(echo "$grp" | tr '[:upper:]' '[:lower:]')
        clean_share=$(echo "$share" | tr '[:upper:]' '[:lower:]')
        if [[ "$clean_grp" == *"$clean_share"* ]]; then
            share_path="//${SERVER}/${share}"
            mount_point="${user_home}/${share}"

            echo "Attempting to mount $share_path"

            if [ ! -d "$mount_point" ]; then
                mkdir -p "$mount_point"
                chown "$uid:$gid" "$mount_point"
            fi

            if ! mountpoint -q "$mount_point"; then
                sudo mount -t cifs -o "sec=krb5,cruid=${user},uid=${uid},gid=${gid},nofail" "$share_path" "$mount_point" && \
                    echo "Share mounted: $mount_point" || \
                    echo "Failed to mount: $share_path"
            else
                echo "Already mounted: $mount_point"
            fi

            break
        fi
    done
done
```

</details>

<details>
<summary>Windows Share Mount Script (PowerShell)</summary>

```powershell
# ============================================================================
# Script     : MapDrives.ps1
# Version    : 1.1
# Date       : 29/07/2025
# Author     : BENE Mael
# Description: Automatic mounting of personal and group network shares
# ============================================================================

# Function to remove accents (normalization)
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

# Mapping table without accents in keys
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

# Get user and AD groups
$user = $env:USERNAME
$userGroupsRaw = ([System.Security.Principal.WindowsIdentity]::GetCurrent()).Groups | ForEach-Object {
    $_.Translate([System.Security.Principal.NTAccount]).Value.Split('\')[-1]
}

# Normalize group names
$userGroups = @()
foreach ($grp in $userGroupsRaw) {
    $grpNorm = Remove-Accents $grp
    $userGroups += $grpNorm
}

# Personal share mount
$homeShare = "\\SRV-AD\$user`$"
Write-Host "Attempting to mount: $homeShare"
net use * $homeShare /persistent:no
if ($LASTEXITCODE -eq 0) {
    Write-Host "Personal share mounted successfully."
} else {
    Write-Host "Failed to mount personal share."
}

# Group share mounting
foreach ($group in $userGroups) {
    if ($groupShareMap.ContainsKey($group)) {
        $shareName = $groupShareMap[$group]
        $sharePath = "\\SRV-AD\$shareName"
        Write-Host "Attempting to mount: $sharePath (via group $group)"
        net use * $sharePath /persistent:no
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Share $shareName mounted successfully."
        } else {
            Write-Host "Failed to mount $shareName."
        }
    }
}
```

</details>

## Skills Acquired

- Cross-platform automation with Ansible
- Centralized IT fleet management
- AGDLP permissions architecture
- Management tool integration (GLPI)
- Using Ansible Vault for secrets
