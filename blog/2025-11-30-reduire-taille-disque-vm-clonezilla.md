---
slug: reduire-taille-disque-vm-clonezilla
title: Réduire la taille du disque d'une VM avec Clonezilla
authors: [tellserv]
tags: [proxmox, clonezilla, virtualization, storage, linstor, drbd, disk-management]
image: /img/blog/2025-11-30-reduire-disque-vm/clonezilla-logo.svg
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<p align="center">
  <img src="/img/blog/2025-11-30-reduire-disque-vm/clonezilla-logo.svg" alt="Clonezilla Logo" width="300" />
</p>

Comment migrer une VM vers un disque plus petit en préservant toutes les données avec Clonezilla, afin d'optimiser l'utilisation du stockage Linstor DRBD dans un cluster Proxmox.

<!--truncate-->

:::danger SAUVEGARDE OBLIGATOIRE
**Avant toute manipulation, créez une sauvegarde complète de votre VM** via Proxmox Backup Server ou `vzdump`. Cette opération manipule directement les disques et toute erreur peut entraîner une perte de données.

📚 Un article détaillé sur Proxmox Backup Server arrive prochainement.
:::

## Contexte

Ma VM Ubuntu de production du [Homelab actuel](/docs/homelab-actuel) dispose d'un disque de **400 Go** sur le stockage Linstor DRBD. Ce disque surdimensionné vient d'une époque où cet OS tournait directement en bare-metal, avant sa virtualisation.

### Problématique

Après avoir réduit la partition système à **130 Go** (laissant 270 Go d'espace libre non alloué), je souhaite :
1. Créer un nouveau disque de **135 Go** (130 Go de données + 5 Go de marge)
2. Migrer l'OS et les données vers ce disque plus petit
3. Libérer **265 Go** sur le stockage Linstor DRBD

### Objectif final

Réorganiser le stockage des hôtes Proxmox :
- **300 Go** : Linstor DRBD (stockage répliqué hautement disponible)
- **200 Go** : local-lvm (stockage local non répliqué)

## Prérequis

### Outils nécessaires

- **Proxmox VE** : Hyperviseur de virtualisation
- **Clonezilla Live ISO** : Outil de clonage de disques ([télécharger](https://clonezilla.org/downloads.php))
- **Linstor DRBD** : Stockage distribué (voir [article sur le stockage distribué Proxmox](/blog/stockage-distribue-proxmox-ha))

### État initial de la VM

Avant de commencer, vérifiez l'état actuel :

```bash
sudo fdisk -l /dev/sda
```

**Sortie attendue** :
- Disque `/dev/sda` : **400 GiB**
- Partition système (`/dev/sda3`) : **~120 GiB** utilisés
- Espace libre : **~270 GiB** non alloué

:::tip Réduire la partition au préalable
Si vous n'avez pas encore réduit votre partition, utilisez `gparted` ou `resize2fs` pour réduire le système de fichiers **avant** de commencer cette procédure. Laissez environ 5 Go de marge par rapport à l'espace utilisé.
:::

## Étape 1 : Créer le nouveau disque dans Proxmox

Dans l'interface web Proxmox, accédez à la configuration de votre VM :

1. Sélectionnez votre VM
2. Onglet **Hardware**
3. Cliquez sur **Add** → **Hard Disk**

**Configuration du nouveau disque** :
- **Storage** : `linstor_storage` (ou votre pool Linstor DRBD)
- **Disk size** : `135 GiB`
- **Bus/Device** : `SCSI` (scsi1)

![Configuration matérielle de la VM avec les deux disques](/img/blog/2025-11-30-reduire-disque-vm/vm-hardware-config.png)

:::info
Le nouveau disque apparaîtra comme `/dev/sdb` dans la VM. Le disque original `/dev/sda` reste en place pour le moment.
:::

## Étape 2 : Monter l'ISO Clonezilla

Toujours dans l'interface Proxmox :

1. Sélectionnez l'onglet **Hardware**
2. Double-cliquez sur **CD/DVD Drive**
3. **Storage** : `local` (ou votre stockage d'ISOs)
4. **ISO image** : Sélectionnez `clonezilla-live-3.3.0-33-amd64.iso`

**Configurer l'ordre de boot** :
1. Onglet **Options** → **Boot Order**
2. Activez **CD-ROM** et placez-le en **première position**
3. Cliquez sur **OK**

Démarrez la VM via **Console** → **Start**.

## Étape 3 : Démarrer Clonezilla en mode KVM To RAM

:::warning Problème de neige sans KVM To RAM
Si vous ne choisissez **pas** l'option **KVM To RAM**, l'affichage Clonezilla affichera de la neige (artefacts graphiques) rendant l'interface inutilisable.

![Neige sur l'écran sans KVM To RAM](/img/blog/2025-11-30-reduire-disque-vm/neige.webp)
:::

### Sélection du mode de démarrage

Au boot de Clonezilla :

1. **Première option** : Sélectionnez **Clonezilla live (KVM To RAM, VGA 1024x768)**
2. Appuyez sur **Entrée**

### Configuration initiale de Clonezilla

Suivez l'assistant de configuration :

<Tabs>
<TabItem value="language" label="Langue">

```
Choose language: [fr_FR.UTF-8] Français
```

</TabItem>
<TabItem value="keymap" label="Clavier">

```
Configurer le clavier: [Garder]
```

(ou choisissez votre disposition clavier)

</TabItem>
<TabItem value="mode" label="Mode Clonezilla">

```
Démarrer Clonezilla: [device-device]
```

Sélectionnez **device-device** (cloner disque vers disque)

</TabItem>
</Tabs>

## Étape 4 : Cloner le disque avec les options Expert

### Sélection du mode Expert

```
Mode: [Expert mode]
```

Choisissez **Expert mode** pour accéder aux options avancées nécessaires.

### Choix du type d'opération

```
Mode Expert: [disk_to_local_disk]
```

Sélectionnez **disk_to_local_disk** (cloner disque local vers disque local).

### Sélection des disques

1. **Disque source** : `/dev/sda` (400 GiB - ancien disque)
2. **Disque destination** : `/dev/sdb` (135 GiB - nouveau disque)

:::danger Vérifiez bien les disques
**Attention** : Sélectionner le mauvais disque effacera définitivement vos données ! Vérifiez la taille des disques avant de valider.
:::

### Options avancées cruciales

Clonezilla propose plusieurs options avancées. **Sélectionnez impérativement** :

#### Option 1 : `-k0` (Créer la table de partition proportionnellement)

```
-k, --create-partition-table
[×] -k0 Create partition table in target disk proportionally
```

**Explication** : Cette option recrée la table de partition en conservant les **tailles originales** des partitions (et non en les redimensionnant proportionnellement au nouveau disque).

#### Option 2 : `-icds` (Skip checking destination disk size)

```
-icds, --skip-check-dest-size
[×] -icds Skip checking destination disk size before creating partition table
```

**Explication** : Par défaut, Clonezilla refuse de cloner vers un disque **plus petit** que le disque source. Cette option désactive cette vérification.

:::tip Pourquoi ça fonctionne ?
Même si le disque de destination (135 Go) est plus petit que le disque source (400 Go), les **partitions utilisées** ne font que 130 Go. Clonezilla clone uniquement les partitions, pas l'espace vide non alloué.

L'option `-k0` garantit que les partitions conservent leur taille originale (130 Go) au lieu d'être redimensionnées proportionnellement au nouveau disque.
:::

### Lancer le clonage

1. Validez toutes les options
2. Clonezilla affiche un **résumé** des paramètres
3. Confirmez avec **`y`** puis **Entrée**
4. Confirmez une seconde fois pour démarrer le clonage

![Clonage en cours avec Clonezilla](/img/blog/2025-11-30-reduire-disque-vm/clonezilla-progress.png)

**Durée estimée** : Entre 10 et 30 minutes selon la quantité de données et la vitesse du stockage Linstor DRBD.

## Étape 5 : Configurer le boot sur le nouveau disque

Une fois le clonage terminé :

1. **Éteignez la VM** via Proxmox
2. Retournez dans **Hardware** → **Options** → **Boot Order**
3. **Désactivez** le CD-ROM (ou retirez l'ISO)
4. Assurez-vous que **scsi1** (nouveau disque 135 Go) est en **première position**
5. **Démarrez la VM**

### Vérification du boot

La VM devrait démarrer normalement sur le nouveau disque. Connectez-vous et vérifiez :

```bash
sudo fdisk -l
```

![Résultat final : nouveau disque de 135 GiB actif](/img/blog/2025-11-30-reduire-disque-vm/fdisk-final-result.webp)

**Vérifications** :
- `/dev/sdb` (nouveau disque) : **135 GiB** ✅
- `/dev/sda` (ancien disque) : **400 GiB** (toujours présent)
- Partitions identiques sur les deux disques

### Test de stabilité

Testez votre VM pendant **24-48 heures** :
- Vérifiez que tous les services démarrent correctement
- Testez les applications critiques
- Surveillez les logs système (`journalctl -xe`)

## Étape 6 : Supprimer l'ancien disque

:::warning Attendez avant de supprimer
Ne supprimez l'ancien disque qu'après avoir **validé le bon fonctionnement** de la VM pendant au moins 24 heures. En cas de problème, vous pourrez revenir en arrière.
:::

Une fois la VM stabilisée :

1. **Éteignez la VM**
2. Dans Proxmox : **Hardware** → Sélectionnez **Hard Disk (scsi0)** (400 GiB)
3. Cliquez sur **Remove**
4. Confirmez la suppression

**Résultat** : 265 Go libérés sur le stockage Linstor DRBD ! 🎉

## Mon cas d'usage : Réorganisation du stockage Proxmox

Dans mon cas, cette opération m'a permis de libérer 265 Go sur le stockage Linstor DRBD. Avec cet espace récupéré, je peux maintenant repartitionner mes disques physiques sur les hôtes Proxmox pour optimiser l'utilisation du stockage :

### Avant

```
/dev/sda : 500 GiB
└── linstor_storage : 500 GiB (stockage répliqué)
```

### Après

```
/dev/sda : 500 GiB
├── linstor_storage : 300 GiB (stockage répliqué HA)
└── local-lvm : 200 GiB (stockage local non répliqué)
```

Cette réorganisation me permet de mieux utiliser les ressources :
- **Stockage répliqué** (Linstor DRBD - 300 Go) : Pour les VMs critiques nécessitant la haute disponibilité
- **Stockage local** (local-lvm - 200 Go) : Principalement pour mes VMs Kubernetes qui gèrent elles-mêmes le stockage distribué via Longhorn, ainsi que quelques VMs/LXC de test

## Conclusion

Clonezilla permet de migrer efficacement une VM vers un disque plus petit, à condition de :
1. **Réduire les partitions au préalable** pour laisser de l'espace libre
2. Utiliser le mode **KVM To RAM** pour éviter les problèmes d'affichage
3. Activer les options `-k0` et `-icds` en mode Expert

Cette technique m'a permis de libérer **265 Go** sur mon stockage Linstor DRBD, optimisant ainsi l'utilisation des ressources du cluster Proxmox et permettant une réorganisation plus flexible du stockage.

## Ressources

- [Documentation officielle Clonezilla](https://clonezilla.org/clonezilla-live-doc.php)
- [Proxmox VE Documentation - Storage](https://pve.proxmox.com/wiki/Storage)
- [Article : Stockage distribué avec Linstor DRBD sur Proxmox](/blog/stockage-distribue-proxmox-ha)
- [Documentation : Homelab actuel avec Docker Compose](/docs/homelab-actuel)
