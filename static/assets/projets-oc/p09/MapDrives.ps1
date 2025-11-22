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