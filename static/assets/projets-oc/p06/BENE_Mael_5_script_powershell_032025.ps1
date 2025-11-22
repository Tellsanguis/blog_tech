<#
.DESCRIPTION
    Script pour copier les données du disque D vers G:\Mon Drive\projet6
.NOTES
    Date de création : 17/03/2025
.AUTEUR
    BENE Maël
.VERSION
    1.1
#>

# Chemins source et destination
$SourcePath = "D:\"
$DestinationPath = "G:\Mon Drive\projet6"

# Copie des fichiers avec Robocopy
Write-Host "Copie des données en cours de $SourcePath vers $DestinationPath..." -ForegroundColor Cyan

try {
    Robocopy.exe "$SourcePath" "$DestinationPath" /E /COPY:DAT /R:2 /W:5 /MT:8 /XD "System Volume Information" "$RECYCLE.BIN" "Recovery"  #Ajout d'exceptions pour les fichiers systèmes
    
    # Affichage détaillé du résultat
    switch ($LASTEXITCODE) {
        0 { Write-Host "Aucun fichier copié - Tous les fichiers étaient déjà synchronisés." -ForegroundColor Green }
        1 { Write-Host "Fichiers copiés avec succès." -ForegroundColor Green }
        2 { Write-Host "Fichiers supplémentaires détectés." -ForegroundColor Yellow }
        4 { Write-Host "Fichiers mal assortis détectés." -ForegroundColor Yellow }
        8 { Write-Host "Erreurs de copie détectées." -ForegroundColor Red }
        16 { Write-Host "Erreur grave dans la copie." -ForegroundColor Red }
        default { Write-Host "Code de sortie Robocopy: $LASTEXITCODE" -ForegroundColor Magenta }
    }
    
} catch {
    Write-Host "Erreur lors de l'exécution de Robocopy: $_" -ForegroundColor Red
}

Write-Host "Opération terminée." -ForegroundColor Cyan