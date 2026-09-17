# Présentation

Administrateur systèmes et réseaux spécialisé en **automatisation cross-platform** (Ansible/PowerShell/Bash), **virtualisation & conteneurisation** (Proxmox/Docker) et **Active Directory**. Certifié RNCP niveau 6 par OpenClassrooms, avec une première expérience en **PME industrielle** : audit de sécurité, segmentation réseau et déploiement d'une infrastructure **GitOps**. Homelab en production pour R&D continue.

---

## Expérience actuelle : Administrateur Systèmes et Réseaux

Depuis avril 2026, j'interviens sur le système d'information d'une PME industrielle (Imprimerie Corlet, Condé-en-Normandie), au sein d'une équipe informatique de 6 personnes :

- **Audit de sécurité** et cartographie complète du SI, avec priorisation des risques adaptée aux contraintes d'une production en continu.
- **Sécurisation immédiate sans arrêt de production** : durcissement Active Directory (désactivation NTLMv1, Protected Users), isolation du Wi-Fi, mises à jour logicielles.
- **Administration M365** : Exchange Online et Entra ID, SSO centralisé de tous les services internes.
- **Conception d'une architecture cible** : segmentation VLAN, PKI interne, DNS haute disponibilité, forge Git, gestion centralisée des secrets, prise en main à distance sécurisée.
- **Plateforme GitOps** d'une dizaine de services (conteneurs rootless, déploiement Ansible en pull déclenché par tags signés) : la documentation devient une étape obligatoire avant toute mise en production. Patch management automatisé des VMs : snapshots, mises à jour, rollback, healthchecks.
- **Bastion validé en lab** : certificats SSH éphémères adossés à Entra ID, enregistrement des sessions, accès distant restreint.

Certains points de mon expérience ont été documentés dans les [articles récents du blog](/blog).

## Les débuts

Tout a commencé comme un simple hobby avec les premières créations de **serveurs Minecraft** en 2013 : lanceur de jeu customisé, gestion de fichiers de configurations, premiers scripts en Bash puis en Python vers 2015.

En 2017, j'ai créé mon premier homelab avec un **Raspberry Pi** qui me servait pour divers projets :
- Serveur audio Bluetooth, AirPlay, UPnP
- Console de jeux vidéo rétro
- Relais WOL (pour réveiller mon PC hors de mon réseau local)
- Serveur VPN
- Serveur DNS / PiHole

## La découverte du self-hosting

Au départ, j'étais motivé par la volonté de tester et d'expérimenter : voir si je pouvais accéder à mes fichiers ou services à distance. Puis est venu l'aspect pratique et la volonté de conserver mes données sur mes propres machines.

C'est vers **2020** que j'ai découvert **Docker**. Mon premier serveur était très simple : quelques `docker run` avec **Nginx Proxy Manager** et un accès administration via **WireGuard**.

Par la suite, j'ai approfondi mes connaissances :
- Passage aux fichiers **Docker Compose**
- Notions réseau : subnets, VLANs, ACLs
- Transition du bare metal vers la **virtualisation**

## La reconversion professionnelle

Avant l'informatique, j'ai suivi un parcours en **Lettres** : licence à l'Université de Caen, puis professeur de français contractuel dans l'Éducation Nationale pour des classes de seconde, première STMG et BTS.

En parallèle, j'ai travaillé comme coordinateur de service civique en prévention santé à la LMDE, et animateur BAFA pendant plusieurs années.

Après une période de voyages et de travail saisonnier, j'ai décidé de concrétiser ce qui était jusque-là un hobby passionné : faire de l'administration systèmes et réseaux mon métier. En **novembre 2024**, j'ai intégré la formation **Administrateur Systèmes, Réseaux et Sécurité** chez **OpenClassrooms**.

## La formation OpenClassrooms

Cette formation, sanctionnée par une **certification RNCP niveau 6** (équivalent Bac+3/4), m'a permis de formaliser et d'approfondir mes compétences à travers **12 projets techniques** couvrant l'ensemble du spectre SysAdmin/DevOps :

- **Gestion ITSM** : ticketing GLPI, méthodologie ITIL
- **Architecture réseau** : conception LAN multi-VLAN, firewalls, plans d'adressage
- **Conteneurisation** : déploiement d'architectures n-tiers avec Docker
- **Sécurisation** : durcissement Apache, Fail2ban, certificats SSL, FTP chiffré
- **Infrastructure Windows** : VPN site-à-site, Active Directory, RODC, GPO
- **Réseau Cisco** : VLAN, ACL, EtherChannel, NAT/PAT, IPv6
- **Supervision** : Nagios, sondes personnalisées, centralisation syslog
- **Automatisation** : Ansible cross-platform, intégration GLPI
- **Sauvegardes** : scripts Bash rsync (FULL/INC/DIFF), PRA
- **Conformité** : application des guides ANSSI pour SI de santé
- **Sécurité offensive** : audit Active Directory, pentesting (nmap, Mimikatz, Kerberoasting)
- **Cloud** : migration AWS, architecture technique, estimation des coûts

J'ai obtenu ma certification par anticipation le **6 novembre 2025**, après moins d'un an de formation.

Le détail de chaque projet est disponible dans la section [Projets OpenClassrooms](/docs/projets-openclassrooms).

## Le homelab aujourd'hui

Le homelab reste mon terrain de R&D continue, en parallèle du travail :

- Cluster **Proxmox HA** à 3 nœuds, 40+ services conteneurisés via Docker Compose. Haute disponibilité éprouvée en panne réelle : bascule automatique en moins d'une minute, zéro interruption.
- Déploiement **100 % automatisé** via **Ansible**, playbooks publics sur [forgejo.tellserv.fr](https://forgejo.tellserv.fr/Tellsanguis/Homelab).
- Réseau **OPNsense** segmenté VLAN/VXLAN, principes **zero trust**, reverse proxy Traefik (TLS automatique).
- Stockage HA **Linstor DRBD** + **ZFS** répliqué, supervision offsite Zabbix.

En cours d'apprentissage : **Kubernetes** (K3s/Talos) et **OpenTofu**, sur un futur cluster Proxmox à trois machines (deux machines de prod et une witness pour le quorum). L'ancienne architecture reste déployée en parallèle pour assurer une migration en douceur.
