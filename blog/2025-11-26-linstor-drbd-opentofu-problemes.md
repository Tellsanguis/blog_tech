---
slug: linstor-drbd-opentofu-problemes
title: "Déploiement avec OpenTofu sur LINSTOR DRBD : le début des problèmes"
authors: [tellserv]
tags: [homelab, proxmox, linstor, drbd, opentofu, terraform, iac, gitops, kubernetes]
date: 2025-11-26
---

Après avoir [choisi LINSTOR DRBD comme solution de stockage distribué](/blog/stockage-distribue-proxmox-ha) pour mon cluster Proxmox HA, il était temps de passer à l'automatisation du déploiement avec OpenTofu (fork open-source de Terraform). Spoiler : ça ne s'est pas passé comme prévu.

<!--truncate-->

## Rappel du contexte

Dans mon [article précédent sur le choix d'une technologie de stockage distribué](/blog/stockage-distribue-proxmox-ha), j'avais opté pour LINSTOR DRBD plutôt que Ceph pour plusieurs raisons :

- **Performance supérieure** : LINSTOR DRBD utilise la réplication synchrone au niveau bloc via DRBD, offrant de meilleures performances que Ceph sur un réseau 1 Gbps
- **Simplicité d'architecture** : Pas besoin de monitors, managers et OSDs comme avec Ceph
- **Consommation de ressources** : Plus léger en RAM et CPU

Mon infrastructure se compose de :
- **3 nœuds Proxmox** : acemagician (192.168.100.10), elitedesk (192.168.100.20), thinkpad (192.168.100.30)
- **Configuration LINSTOR** : thinkpad = contrôleur, acemagician/elitedesk = satellites
- **Pools de stockage** : `linstor_storage` (répliqué DRBD), `local-lvm` (stockage local)

## Le problème : LINSTOR ne peut pas provisionner dynamiquement les VM

Quand j'ai tenté de déployer mes VMs K3s avec OpenTofu en utilisant le provider Proxmox, j'ai rencontré une erreur systématique :

```bash
Error: error creating VM: error cloning vm: 500 Internal Server Error:
unable to create VM 1000 - lvcreate 'linstor_storage/vm-1000-disk-0' error:
Exited with error code 1: Resource definition 'vm-1000-disk-0' not found.
```

Ma configuration OpenTofu était pourtant classique :

```hcl
resource "proxmox_vm_qemu" "k3s_server_1" {
  name        = "k3s-server-1"
  target_node = "acemagician"
  clone       = "ubuntu-2404-cloudinit"
  vmid        = 1000

  disk {
    storage  = "linstor_storage"
    size     = "100G"
  }
}
```

### Pourquoi ça échoue ?

LINSTOR utilise un modèle d'objets hiérarchique strict :

1. **Resource Definition** : Template pour une ressource de stockage
2. **Volume Definition** : Taille et propriétés du volume
3. **Resource** : Instance réelle du stockage sur un nœud

Le workflow normal de LINSTOR nécessite de créer ces objets manuellement :

```bash
linstor resource-definition create mydata
linstor volume-definition create mydata 100G
linstor resource create node1 mydata --storage-pool linstor_storage
linstor resource create node2 mydata --storage-pool linstor_storage
```

**Le problème** : Quand Proxmox tente de cloner une VM vers LINSTOR :
1. Proxmox appelle `lvcreate` pour créer le nouveau disque
2. Le plugin LINSTOR cherche la resource definition `vm-XXX-disk-0`
3. **La resource definition n'existe pas** (Proxmox assume une création dynamique)
4. L'opération échoue

LINSTOR ne peut pas créer dynamiquement des resource definitions pendant les opérations de clonage Proxmox. C'est une limitation fondamentale de l'architecture.

### Tentatives de contournement

J'ai essayé plusieurs approches :

#### 1. Clone complet explicite

```hcl
resource "proxmox_vm_qemu" "k3s_server_2" {
  name        = "k3s-server-2"
  target_node = "elitedesk"
  clone       = "ubuntu-2404-cloudinit"
  vmid        = 1001
  full_clone  = true  # Clone complet explicite

  disk {
    storage  = "linstor_storage"
    size     = "100G"
  }
}
```

**Résultat** : Même erreur - "Resource definition not found"

#### 2. Linked clone

```hcl
full_clone = false  # Tenter un linked clone
```

**Résultat** :
```
Error: 400 Bad Request:
Parameter verification failed. (400)
storage: linked clone feature is not supported for 'linstor_storage'
```

C'est logique : DRBD ne supporte pas les snapshots, nécessaires pour les linked clones.

## Les solutions envisagées

Face à ce problème, j'hésite entre plusieurs options :

### Option 1 : Script de pré-création des resource definitions

Créer un script bash ou Python qui s'exécute avant OpenTofu pour pré-créer les resource definitions :

```python
#!/usr/bin/env python3
import subprocess
import json

def create_linstor_resource(vm_id, size_gb, nodes):
    """Crée une resource definition LINSTOR pour une VM"""
    resource_name = f"vm-{vm_id}-disk-0"

    # Créer la resource definition
    subprocess.run([
        "linstor", "resource-definition", "create", resource_name
    ], check=True)

    # Créer la volume definition
    subprocess.run([
        "linstor", "volume-definition", "create",
        resource_name, f"{size_gb}G"
    ], check=True)

    # Créer la resource sur chaque nœud
    for node in nodes:
        subprocess.run([
            "linstor", "resource", "create",
            node, resource_name,
            "--storage-pool", "linstor_storage"
        ], check=True)

# Créer les resources pour les VMs K3s
vms = [
    {"id": 1000, "size": 100, "nodes": ["acemagician", "elitedesk"]},
    {"id": 1001, "size": 100, "nodes": ["elitedesk", "thinkpad"]},
    {"id": 1002, "size": 20, "nodes": ["thinkpad", "acemagician"]},
]

for vm in vms:
    create_linstor_resource(vm["id"], vm["size"], vm["nodes"])
```

**Avantages** :
- Garde l'utilisation de LINSTOR DRBD
- Permet l'automatisation via CI/CD
- Maintient les performances supérieures de DRBD
- Conserve le stockage distribué pour les VM

**Inconvénients** :
- Complexité supplémentaire dans le pipeline
- Risque de désynchronisation entre script et configuration OpenTofu
- Nécessite une gestion rigoureuse des VMIDs et de leur attribution

### Option 2 : Création manuelle des resource definitions

Créer manuellement les resources LINSTOR avant chaque déploiement :

```bash
# Pour k3s-server-1 (VMID 1000)
linstor resource-definition create vm-1000-disk-0
linstor volume-definition create vm-1000-disk-0 100G
linstor resource create acemagician vm-1000-disk-0 --storage-pool linstor_storage
linstor resource create elitedesk vm-1000-disk-0 --storage-pool linstor_storage
```

**Avantages** :
- Solution simple et directe
- Contrôle total sur les resources LINSTOR

**Inconvénients** :
- **Perte de l'Infrastructure as Code** : Dérive de configuration garantie
- **Perte du GitOps** : Pas de traçabilité dans git
- **Non automatisable** : Intervention manuelle à chaque déploiement
- **Non scalable** : Impossible pour des déploiements fréquents

Cette option va complètement à l'encontre de mes objectifs d'automatisation. **Cette solution est à écarter.**

### Option 3 : Partitionner les NVMe (stockage local + LINSTOR)

Partitionner les disques NVMe de chaque nœud en deux parties :
- Une partition pour le stockage local LVM (`local-lvm`)
- Une partition pour le pool LINSTOR DRBD (`linstor_storage`)

Ensuite, utiliser `local-lvm` pour les disques de VM (provisionnement simple) et `linstor_storage` pour d'autres usages nécessitant de la réplication.

**Note importante pour mon cas d'usage Kubernetes** : L'utilisation de `local-lvm` (sans réplication au niveau Proxmox) est viable pour un cluster Kubernetes car **c'est Kubernetes qui gère la haute disponibilité**, pas Proxmox. Avec etcd distribué sur 3 nœuds et le control plane répliqué, la perte d'une VM n'impacte pas le cluster - Kubernetes continue de fonctionner avec les nœuds restants. Les VM deviennent "cattle" (remplaçables via Infrastructure as Code) tandis que les vraies données "pets" (précieuses) vivraient dans des solutions de stockage au niveau applicatif.

**Avantages** :
- Provisionnement des VM simple et rapide sur `local-lvm`
- Conservation de LINSTOR DRBD pour les besoins de stockage distribué
- Utilisation optimale du matériel disponible
- Performances maximales pour les VM (accès local direct)
- **HA assurée au bon niveau** : Kubernetes, pas Proxmox

**Inconvénients** :
- **Complexité de mise en place** : Repartitionnement des disques nécessaire
- **Risque de perte de données** : Opération invasive sur les disques existants
- **Planification de capacité** : Besoin de déterminer la taille de chaque partition à l'avance
- **Moins de flexibilité** : Tailles de partitions fixes, difficiles à modifier
- **Pas de HA au niveau Proxmox** : Les VM ne bénéficient plus de la réplication (acceptable si HA au niveau Kubernetes)

### Option 4 : Migrer vers Ceph avec upgrade réseau

Abandonner LINSTOR DRBD et migrer vers Ceph, en upgrading le réseau à 5 Gbps (ou 10 Gbps si budget permet) :

**Avantages** :
- Support natif du provisionnement dynamique dans Proxmox
- Intégration parfaite avec OpenTofu/Terraform
- Écosystème mature et bien documenté
- Snapshots et clones supportés nativement
- Performances acceptables avec un NIC 5 Gbps

**Inconvénients** :
- **Coût matériel** : Achat de cartes réseau 5 Gbps (ou 10 Gbps) pour les 3 nœuds
- **Complexité accrue** : Monitors, Managers, OSDs à gérer
- **Consommation de ressources** : Plus gourmand en RAM et CPU que LINSTOR
- **Migration complète** : Reconstruction du stockage existant
- **Performances toujours inférieures** : Même avec 5 Gbps, overhead plus important que DRBD

## Ma réflexion actuelle

Je suis actuellement tiraillé entre ces options :

**Option 1 (Script)** me séduit car elle conserve LINSTOR et automatise tout. Avec des VMIDs fixes (1000, 1001, 1002), le script serait relativement simple à maintenir. Il suffit de s'assurer que le script s'exécute avant OpenTofu dans le pipeline CI/CD.

**Option 3 (Partitionnement)** est techniquement intéressante mais très invasive. Le repartitionnement des NVMe en production est risqué, et je perds la haute disponibilité au niveau Proxmox pour les VM elles-mêmes. Cependant, dans mon contexte Kubernetes, ce n'est pas forcément un problème puisque la HA est gérée au niveau du cluster K3s, pas au niveau des VM individuelles. Si une VM tombe, Kubernetes continue de fonctionner avec les autres nœuds.

**Option 4 (Ceph + upgrade réseau)** résout tous les problèmes techniques mais implique un investissement matériel. Un switch 5 Gbps + 3 cartes réseau représente un budget non négligeable pour un homelab. Par contre, ça ouvre la porte à d'autres possibilités futures.

## Ce que je retiens

### LINSTOR ≠ Stockage généraliste pour Proxmox

LINSTOR excelle pour certains cas d'usage, mais le provisionnement dynamique de VM via clonage Proxmox n'en fait pas partie. La documentation LINSTOR est d'ailleurs très axée sur les `resource-group` et le stockage applicatif, pas sur l'intégration Proxmox.

### La limitation est architecturale, pas un bug

Ce n'est pas un problème de configuration ou une erreur de ma part : LINSTOR est conçu avec un modèle de gestion explicite des ressources. Le provisionnement dynamique à la volée n'est tout simplement pas dans sa philosophie.

### La HA peut être déléguée à une couche supérieure

Pour un cluster Kubernetes, la perte de HA au niveau Proxmox (VM sur stockage local) n'est pas nécessairement problématique. Kubernetes est conçu pour gérer la défaillance de nœuds - c'est même son rôle principal. Avec etcd distribué et un control plane répliqué, le cluster survit à la perte d'un ou plusieurs nœuds.

### Chaque solution a son coût

- **Script** → Complexité logicielle
- **Partitionnement** → Complexité opérationnelle et perte de HA au niveau Proxmox
- **Ceph** → Complexité système et coût matériel

Il n'y a pas de solution miracle. Je dois choisir quel type de complexité je suis prêt à accepter.

## Prochaines étapes

Je vais probablement tester **l'Option 1** (script de pré-création) en premier, car elle me permet de :
1. Garder LINSTOR DRBD et ses performances
2. Automatiser complètement le déploiement
3. Éviter un investissement matériel immédiat
4. Apprendre à mieux gérer LINSTOR programmatiquement

Si cette approche s'avère trop complexe ou fragile, je reconsidérerai soit **l'Option 3** (partitionnement, acceptable dans un contexte Kubernetes), soit **l'Option 4** (Ceph + upgrade réseau), qui est la solution la plus "standard" et documentée dans l'écosystème Proxmox.

Je documenterai ma décision finale et sa mise en œuvre dans un prochain article.

---

:::info Mise à jour : Solution finale retenue

Après avoir testé l'Option 1 avec un [script Python de gestion des ressources LINSTOR](https://forgejo.tellserv.fr/Tellsanguis/blog_tech/src/branch/main/manage_linstor_resources.py), j'ai constaté que cette approche, bien que fonctionnelle, ajoutait une complexité trop importante et des risques de désynchronisation pour une utilisation en production.

**La décision finale** : Partitionner les disques NVMe de chaque nœud Proxmox selon la stratégie suivante :

- **300 Go alloués à LINSTOR DRBD** (`linstor_storage`) pour :
  - Les VMs et LXC nécessitant la haute disponibilité au niveau Proxmox
  - Le conteneur LXC hébergeant le serveur NFS (voir [projet zfs-sync-nfs-ha](https://forgejo.tellserv.fr/Tellsanguis/zfs-sync-nfs-ha))
  - Tout stockage distribué géré par Proxmox HA

- **200 Go alloués à local-lvm** (`local-lvm`) pour :
  - Les VMs du cluster K3S qui n'ont **pas besoin** de HA au niveau Proxmox
  - La haute disponibilité étant assurée par le cluster Kubernetes lui-même
  - Provisionnement simple et rapide via OpenTofu

Cette architecture permet d'utiliser le bon outil au bon endroit : LINSTOR DRBD pour ce qui nécessite vraiment de la réplication synchrone au niveau infrastructure, et du stockage local performant pour les workloads où la HA est gérée par la couche applicative (Kubernetes).

Un article détaillé sur cette mise en œuvre et le conteneur NFS HA suivra prochainement.

:::

---

**Références** :
- [Choisir sa technologie de stockage distribué pour un cluster Proxmox HA](/blog/stockage-distribue-proxmox-ha)
- [LINSTOR User Guide](https://linbit.com/drbd-user-guide/)
- [Proxmox Storage Plugin Documentation](https://pve.proxmox.com/wiki/Storage)
- [Telmate Proxmox Terraform Provider](https://github.com/Telmate/terraform-provider-proxmox)
