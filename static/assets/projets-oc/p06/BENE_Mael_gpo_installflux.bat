@echo off
REM Vérification de l'utilisateur
if "%username%"=="agarcia" (
    echo Installation de flux-setup.exe pour %username%
    winget install -e --id flux.flux --silent --accept-package-agreements --accept-source-agreements
) else (
    echo Installation non applicable pour cet utilisateur.
    exit /b
)