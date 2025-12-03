---
sidebar_position: 6
tags: [vpn, active-directory, windows-server, rodc, gpo]
---

# Raccordement d'un site distant

## Contexte

Intégration d'un site distant au système d'information existant via VPN site-à-site, avec déploiement d'un contrôleur de domaine en lecture seule (RODC) et application de stratégies de groupe.

## Objectifs

- Configurer un VPN IPsec site-à-site avec pfSense
- Déployer un RODC (Read-Only Domain Controller)
- Étendre l'Active Directory au site distant
- Appliquer des GPO adaptées au contexte distant
- Mettre en place des sauvegardes automatisées

## Technologies utilisées

- **pfSense** : firewall et VPN IPsec
- **Windows Server** : AD DS, RODC
- **Active Directory** : gestion centralisée des identités
- **GPO** : stratégies de groupe
- **PowerShell** : scripts de sauvegarde (Robocopy)
- **VMware** : virtualisation

## Architecture

```
    Site Principal                    Site Distant
   +-------------+                  +-------------+
   |     DC      |                  |    RODC     |
   |  (AD DS)    |                  |  (Lecture   |
   +------+------+                  |   seule)    |
          |                         +------+------+
   +------v------+    VPN IPsec    +------v------+
   |   pfSense   |<--------------->|   pfSense   |
   +-------------+                  +-------------+
```

## Livrables

<details>
<summary>Script GPO horaires de travail (PowerShell)</summary>

```powershell
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
```

</details>

<details>
<summary>Capture GPO horaires de travail</summary>

![GPO horaires de travail](/assets/projets-oc/p06/BENE_Mael_gpo_horairesdetravail.png)

</details>

<details>
<summary>Script GPO installation Flux (Batch)</summary>

```batch
@echo off
REM Vérification de l'utilisateur
if "%username%"=="agarcia" (
    echo Installation de flux-setup.exe pour %username%
    winget install -e --id flux.flux --silent --accept-package-agreements --accept-source-agreements
) else (
    echo Installation non applicable pour cet utilisateur.
    exit /b
)
```

</details>

<details>
<summary>Capture GPO installation Flux</summary>

![GPO installation Flux](/assets/projets-oc/p06/BENE_Mael_gpo_installflux.png)

</details>

<details>
<summary>Capture GPO restriction disque amovible</summary>

![GPO restriction disque amovible](/assets/projets-oc/p06/BENE_Mael_gpo_restrictiondisqueamovible.png)

</details>

<details>
<summary>Configuration VPN pfSense Nantes (XML)</summary>

```xml
<ipsec>
	<client></client>
	<phase1>
		<ikeid>1</ikeid>
		<iketype>ikev2</iketype>
		<interface>opt1</interface>
		<remote-gateway>194.0.0.1</remote-gateway>
		<protocol>inet</protocol>
		<myid_type>address</myid_type>
		<myid_data>194.0.0.2</myid_data>
		<peerid_type>address</peerid_type>
		<peerid_data>194.0.0.1</peerid_data>
		<encryption>
			<item>
				<encryption-algorithm>
					<name>aes</name>
					<keylen>256</keylen>
				</encryption-algorithm>
				<hash-algorithm>sha256</hash-algorithm>
				<prf-algorithm>sha256</prf-algorithm>
				<dhgroup>14</dhgroup>
			</item>
		</encryption>
		<lifetime>28800</lifetime>
		<pre-shared-key>bc4b31bbe6ac6eba857a44b8941ed31389cdb6c678635384b676ae34</pre-shared-key>
		<authentication_method>pre_shared_key</authentication_method>
		<descr><![CDATA[Tunnel vers Paris]]></descr>
		<nat_traversal>on</nat_traversal>
		<mobike>off</mobike>
		<dpd_delay>10</dpd_delay>
		<dpd_maxfail>5</dpd_maxfail>
	</phase1>
	<phase2>
		<ikeid>1</ikeid>
		<uniqid>67cf001195fba</uniqid>
		<mode>tunnel</mode>
		<reqid>1</reqid>
		<localid>
			<type>network</type>
			<address>10.0.2.0</address>
			<netbits>24</netbits>
		</localid>
		<remoteid>
			<type>network</type>
			<address>10.0.1.0</address>
			<netbits>24</netbits>
		</remoteid>
		<protocol>esp</protocol>
		<encryption-algorithm-option>
			<name>aes</name>
			<keylen>256</keylen>
		</encryption-algorithm-option>
		<hash-algorithm-option>hmac_sha256</hash-algorithm-option>
		<pfsgroup>14</pfsgroup>
		<lifetime>3600</lifetime>
		<pinghost>10.0.1.1</pinghost>
		<keepalive>disabled</keepalive>
		<descr><![CDATA[Trafic LAN Paris-Nantes]]></descr>
	</phase2>
</ipsec>
```

</details>

<details>
<summary>Configuration VPN pfSense Paris (XML)</summary>

```xml
<ipsec>
	<client></client>
	<phase1>
		<ikeid>1</ikeid>
		<iketype>ikev2</iketype>
		<interface>opt1</interface>
		<remote-gateway>194.0.0.2</remote-gateway>
		<protocol>inet</protocol>
		<myid_type>address</myid_type>
		<myid_data>194.0.0.1</myid_data>
		<peerid_type>address</peerid_type>
		<peerid_data>194.0.0.2</peerid_data>
		<encryption>
			<item>
				<encryption-algorithm>
					<name>aes</name>
					<keylen>256</keylen>
				</encryption-algorithm>
				<hash-algorithm>sha256</hash-algorithm>
				<prf-algorithm>sha256</prf-algorithm>
				<dhgroup>14</dhgroup>
			</item>
		</encryption>
		<lifetime>28800</lifetime>
		<pre-shared-key>bc4b31bbe6ac6eba857a44b8941ed31389cdb6c678635384b676ae34</pre-shared-key>
		<authentication_method>pre_shared_key</authentication_method>
		<descr><![CDATA[Tunnel vers Nantes]]></descr>
		<nat_traversal>on</nat_traversal>
		<mobike>off</mobike>
		<dpd_delay>10</dpd_delay>
		<dpd_maxfail>5</dpd_maxfail>
	</phase1>
	<phase2>
		<ikeid>1</ikeid>
		<uniqid>67ceff22aa6e4</uniqid>
		<mode>tunnel</mode>
		<reqid>1</reqid>
		<localid>
			<type>network</type>
			<address>10.0.1.0</address>
			<netbits>24</netbits>
		</localid>
		<remoteid>
			<type>network</type>
			<address>10.0.2.0</address>
			<netbits>24</netbits>
		</remoteid>
		<protocol>esp</protocol>
		<encryption-algorithm-option>
			<name>aes</name>
			<keylen>256</keylen>
		</encryption-algorithm-option>
		<hash-algorithm-option>hmac_sha256</hash-algorithm-option>
		<pfsgroup>14</pfsgroup>
		<lifetime>3600</lifetime>
		<pinghost>10.0.2.1</pinghost>
		<keepalive>disabled</keepalive>
		<descr><![CDATA[Trafic LAN Paris-Nantes]]></descr>
	</phase2>
</ipsec>
```

</details>

<details>
<summary>Script PowerShell de sauvegarde (Robocopy)</summary>

```powershell
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
    Robocopy.exe "$SourcePath" "$DestinationPath" /E /COPY:DAT /R:2 /W:5 /MT:8 /XD "System Volume Information" "$RECYCLE.BIN" "Recovery"  # Ajout d'exceptions pour les fichiers systèmes

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
```

</details>

## Compétences acquises

- Configuration de tunnels VPN IPsec site-à-site
- Déploiement et gestion de RODC
- Extension d'infrastructure Active Directory
- Conception de GPO pour sites distants
- Automatisation de sauvegardes avec PowerShell
