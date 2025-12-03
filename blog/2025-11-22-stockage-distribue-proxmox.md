---
slug: stockage-distribue-proxmox-ha
title: "Choisir sa technologie de stockage distribué pour un cluster Proxmox HA"
authors: [tellserv]
tags: [proxmox, haute-disponibilite, linstor, drbd, ceph, zfs, stockage, cluster, homelab]
---

# Choisir sa technologie de stockage distribué pour un cluster Proxmox HA

Dans le cadre de la mise en place de mon cluster Proxmox haute disponibilité, le choix de la technologie de stockage distribué s'est avéré être une décision cruciale. Cet article présente ma démarche d'analyse et le choix final de Linstor DRBD.

<!--truncate-->

## La problématique

Pour mettre en place un cluster Proxmox en haute disponibilité (HA), il est nécessaire de disposer d'un stockage partagé entre les nœuds. Ce stockage partagé permet :

- La **live migration** des VM/LXC entre les nœuds sans interruption de service
- Le **failover automatique** : en cas de panne d'un nœud, les VM peuvent redémarrer sur un autre nœud
- La **cohérence des données** entre les différents nœuds du cluster

La question centrale est donc : quelle technologie de stockage distribué choisir pour répondre à ces besoins tout en respectant les contraintes matérielles de mon homelab ?

## Les contraintes matérielles

Mon cluster Proxmox est composé de trois nœuds avec les caractéristiques suivantes :

### Nœuds de production (x2)

| Composant | Nœud 1 | Nœud 2 |
|-----------|---------|---------|
| CPU | Ryzen 7 5800U | Intel i7 8700T |
| RAM | 32 Go | 32 Go |
| Stockage Proxmox | SSD 128 Go | SSD 128 Go |
| Stockage VM/LXC | SSD 512 Go | SSD 512 Go |

### Nœud témoin (witness)

Un troisième nœud léger dont le rôle est uniquement d'assurer le **quorum** du cluster. Il ne participe pas au stockage des données de production mais permet d'éviter les situations de split-brain en cas de partition réseau.

### Infrastructure réseau

**Switch 1 Gbps** - C'est une contrainte importante qui va influencer fortement le choix de la technologie.

## Les différentes solutions envisagées

### Solutions natives Proxmox

#### Ceph

Ceph est la solution de stockage distribué la plus mise en avant par Proxmox. Elle est directement intégrée à l'interface de gestion.

**Avantages :**
- Intégration native dans Proxmox (installation et gestion via l'interface web, ce qui simplifie grandement sa mise en place)
- Réplication synchrone objet/bloc/fichiers
- Scalabilité horizontale
- Self-healing et rebalancing automatique

**Inconvénients :**
- **Consommation importante de ressources** : CPU et RAM significatifs pour les processus MON, MGR et OSD
- **3 nœuds minimum, mais [5 recommandés](https://ceph.io/en/news/blog/2019/part-3-rhcs-bluestore-performance-scalability-3-vs-5-nodes/)** pour des performances optimales (scalabilité quasi-linéaire grâce à l'architecture scale-out de Ceph)
- **Nécessite un réseau 10 Gbps** pour des performances acceptables
- Complexité opérationnelle élevée malgré la simplification apportée par Proxmox

Dans le contexte de mon homelab avec seulement 3 nœuds (dont 1 témoin) et un switch 1 Gbps, Ceph serait sous-dimensionné et ses performances seraient fortement dégradées.

#### Réplication ZFS native

Proxmox intègre ZFS et propose un mécanisme de réplication basé sur les snapshots.

**Avantages :**
- Natif dans Proxmox, aucune installation supplémentaire
- Consommation RAM modérée (1 Go par To de stockage recommandé)
- Fonctionne parfaitement sur un réseau 1 Gbps
- Fiabilité éprouvée de ZFS (checksums, self-healing)

**Inconvénients :**
- **Réplication asynchrone** par snapshots incrémentaux
- **RPO (Recovery Point Objective) = intervalle entre les snapshots** : en cas de panne, les données modifiées depuis le dernier snapshot sont perdues
- **Pas de live migration** : les VM doivent être arrêtées pour migrer
- HA possible mais avec perte de données potentielle

Cette solution est donc inadaptée pour un cluster HA nécessitant de la live migration et un RPO proche de zéro.

### Solution tierce : Linstor DRBD

LINSTOR est une solution de stockage distribué développée par LINBIT, basée sur DRBD (Distributed Replicated Block Device). Un plugin officiel existe pour Proxmox.

**Avantages :**
- **Réplication synchrone au niveau bloc** : chaque écriture est confirmée uniquement lorsqu'elle est répliquée sur les nœuds
- **Faible consommation de ressources** : overhead CPU/RAM minimal comparé à Ceph
- **Parfaitement opérationnel dès 3 nœuds** : architecture 2 nœuds de données + 1 témoin (diskless)
- **Fonctionne sur un réseau 1 Gbps** (optimal à 10 Gbps mais viable à 1 Gbps)
- Plugin Proxmox officiel disponible
- Architecture active/passive simple à comprendre et à maintenir

**Inconvénients :**
- Nécessite l'installation d'un plugin externe
- Documentation moins fournie que Ceph
- Communauté plus restreinte

## Pourquoi Linstor DRBD ?

Au regard des contraintes de mon homelab, Linstor DRBD m'a semblé être le choix le plus adapté :

### Adéquation avec l'infrastructure

| Critère | Ceph | ZFS Réplication | Linstor DRBD |
|---------|------|-----------------|--------------|
| Nombre de nœuds minimum | 3 ([5 optimal](https://ceph.io/en/news/blog/2019/part-3-rhcs-bluestore-performance-scalability-3-vs-5-nodes/)) | 2 | 3 (2 + témoin) |
| Réseau recommandé | 10 Gbps | 1 Gbps | 1 Gbps (optimal 10 Gbps) |
| Type de réplication | Synchrone | Asynchrone | Synchrone |
| Live migration | Oui | Non | Oui |
| RPO | ~0 | Intervalle snapshots | ~0 |
| Consommation ressources | Élevée | Modérée | Faible |
| Intégration Proxmox | Native | Native | Plugin |

### Le rôle du nœud témoin

Avec Linstor DRBD, le nœud témoin (witness) joue un rôle essentiel :

- Il participe au **quorum** sans stocker de données (mode diskless)
- Il permet de **détecter les situations de split-brain** et d'arbitrer
- Il **ne consomme quasiment pas de ressources** sur ce nœud léger

Cette architecture correspond parfaitement à ma configuration : 2 nœuds de production avec du stockage SSD, et 1 nœud témoin minimal pour le quorum.

### Performance sur réseau 1 Gbps

Contrairement à Ceph qui souffre énormément sur un réseau 1 Gbps (les communications entre OSD, MON et MGR saturent rapidement la bande passante), DRBD est conçu pour être efficace même sur des réseaux plus modestes :

- La réplication est point-à-point entre les nœuds concernés
- Pas de protocole de consensus distribué complexe
- Overhead réseau minimal

## Les limites de la solution

Malgré ses avantages, Linstor DRBD présente certaines limites à connaître :

### Architecture active/passive

Contrairement à Ceph qui permet des écritures simultanées sur plusieurs nœuds, DRBD fonctionne en mode actif/passif :
- À un instant T, un seul nœud possède le "verrou" d'écriture sur un volume
- Les migrations nécessitent un transfert de ce verrou

Cela n'impacte pas la live migration dans Proxmox mais peut limiter certains cas d'usage avancés.

### Scalabilité limitée

DRBD est optimisé pour des clusters de petite à moyenne taille (2-4 nœuds de données). Pour des infrastructures plus importantes, Ceph devient plus pertinent malgré sa complexité.

### Maintenance du plugin

Le plugin Proxmox pour Linstor n'est pas maintenu par Proxmox directement mais par LINBIT. Il faut donc surveiller la compatibilité lors des mises à jour majeures de Proxmox.

## Conclusion

Face à mes contraintes spécifiques :
- 3 nœuds (2 production + 1 témoin)
- Switch 1 Gbps
- Besoin de live migration et de HA avec RPO proche de zéro

**Linstor DRBD me semble être la solution la plus adaptée à mon contexte**, offrant selon moi le meilleur compromis entre fonctionnalités, performances et consommation de ressources pour mon infrastructure. C'est cette solution que j'ai retenue et mise en place sur mon cluster.

Ce choix n'est pas universel : pour une infrastructure disposant d'un réseau 10 Gbps et de davantage de nœuds, Ceph pourrait être un meilleur candidat. De même, pour des besoins où la live migration n'est pas critique et où un RPO de quelques minutes est acceptable, la réplication ZFS native reste une option parfaitement viable et plus simple à mettre en œuvre.

### Aparté : mon expérimentation de Ceph

Avant de déployer Linstor DRBD, j'ai expérimenté Ceph à des fins d'apprentissage. Voici les concepts clés de son architecture :

- **MON (Monitor)** : maintient la carte du cluster (CRUSH map, état des OSD). Nécessite un nombre impair (3 minimum recommandé) pour le quorum
- **MGR (Manager)** : collecte les métriques, expose l'API REST et le dashboard. Fonctionne en actif/standby
- **OSD (Object Storage Daemon)** : un démon par disque, gère le stockage effectif des données et leur réplication

Sur mon cluster de test, j'ai déployé MON, MGR et OSD sur les deux nœuds de production, et **uniquement un MON sur le nœud witness**. Pourquoi ? Le witness n'a pas de stockage dédié aux données (pas d'OSD possible), mais il peut participer au quorum des moniteurs. Avec 3 MON (2 sur les nœuds prod + 1 sur le witness), le cluster peut tolérer la perte d'un moniteur tout en conservant le quorum.

Cette expérimentation m'a permis de comprendre l'architecture Ceph, mais a confirmé que ses exigences (réseau 10 Gbps, ressources CPU/RAM) dépassaient les capacités de mon infrastructure actuelle.
