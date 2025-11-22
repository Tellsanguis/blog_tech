<#
.DESCRIPTION
    Script pour définir les heures de connexion de 6h à 20h tous les jours de la semaine
.NOTES
    Date de création : 17/03/2025
.AUTEUR
    BENE Maël
.VERSION
    1.0
#>

# Récupération récursive des utilisateurs (inclut les membres des sous-groupes)
$users = Get-ADGroupMember -Identity OpenBank -Recursive | Select-Object -ExpandProperty SamAccountName

# Création du tableau de 21 octets (168 heures dans une semaine)
$LogonHours = New-Object byte[] 21

# Dimanche = index 0, Lundi = index 1, ..., Samedi = index 6
# Définition des heures de connexion (6h à 20h) pour tous les jours de la semaine

for ($day = 0; $day -le 6; $day++) {  # Dimanche (0) à Samedi (6)
    for ($hour = 5; $hour -lt 19; $hour++) {  # De 6h à 20h
        $byteIndex = [math]::Floor(($day * 24 + $hour) / 8)
        $bitIndex = ($day * 24 + $hour) % 8
        $LogonHours[$byteIndex] = $LogonHours[$byteIndex] -bor (1 -shl $bitIndex)
    }
}

# Appliquer la restriction à l'utilisateur
foreach ($user in $users)
{
    Set-ADUser -Identity $user -Replace @{logonHours=$LogonHours}
}