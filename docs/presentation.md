# Présentation

Administrateur systèmes et réseaux spécialisé en **automatisation cross-platform** (Ansible/PowerShell/Bash), **virtualisation & conteneurisation** (Proxmox/Docker) et **Active Directory**. Certifié RNCP niveau 6 par OpenClassrooms, compétences acquises via 12 projets techniques couvrant réseaux d'entreprise, supervision, sauvegardes/PRA et sécurité offensive. Homelab en production pour R&D continue.

---

## Les débuts

Tout a commencé comme un simple hobby avec les premières créations de **serveurs Minecraft** en 2013 : lanceur de jeu customisé, gestion de fichiers de configurations, premiers scripts en Bash puis en Python vers 2015.

En 2017, j'ai créé mon premier homelab avec un **Raspberry Pi** qui me servait pour divers projets :
- Serveur audio Bluetooth
- AirPlay
- UPnP
- Console de jeux vidéo rétro

## La découverte du self-hosting

Au départ, j'étais motivé par la volonté de tester et d'expérimenter : voir si je pouvais accéder à mes fichiers ou services à distance. Puis est venu l'aspect pratique et la volonté de conserver mes données sur mes propres machines.

C'est vers **2020** que j'ai découvert **Docker**. Mon premier serveur était très simple : quelques `docker run` avec **Nginx Proxy Manager** et un accès administration via **WireGuard**.

Par la suite, j'ai approfondi mes connaissances :
- Passage aux fichiers **Docker Compose**
- Notions réseau : subnets, VLANs, ACLs
- Transition du bare metal vers la **virtualisation**

Cela m'a permis d'aboutir à mon architecture actuelle : un serveur Ubuntu déployé sous **Proxmox**, automatisé via **Ansible** et des fichiers Docker Compose.

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

Le détail de chaque projet est disponible dans la section [Projets OpenClassrooms](/docs/category/projets-openclassrooms).

## Vers l'Infrastructure as Code et le DevOps

L'aspect **Infrastructure as Code** m'a immédiatement plu et m'a amené à m'intéresser à :
- La philosophie **DevOps**
- **Terraform** et sa contrepartie open source **OpenTofu**
- **Git** et les pipelines **CI/CD**
- **Kubernetes**
- Le stockage distribué et la haute disponibilité

Mon objectif actuel : un **cluster Proxmox** à trois machines (deux machines de prod et une witness pour le quorum), après avoir envisagé d'utiliser tous ces outils sur une seule machine pour des raisons de coût.

Cette architecture est actuellement en cours de réalisation sur mon [dépôt Homelab](https://forgejo.tellserv.fr/Tellsanguis/Homelab). L'ancienne architecture reste déployée en parallèle pour assurer une migration en douceur.
