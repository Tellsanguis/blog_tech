---
sidebar_position: 1
---

# Homelab actuel - Docker Compose & Ansible

Documentation de mon infrastructure homelab actuelle, basée sur Docker Compose et Ansible.

## Vue d'ensemble

Mon homelab actuel utilise une approche simple et efficace :
- **Docker Compose** : Orchestration des conteneurs
- **Ansible** : Automatisation de la configuration et du déploiement
- **Services auto-hébergés** : Forgejo, monitoring, applications diverses

## Architecture

### Schéma d'infrastructure

Le diagramme illustre l'architecture complète de mon homelab actuel, incluant :
- L'infrastructure réseau avec le serveur principal
- Les services Docker déployés
- La configuration Traefik pour le reverse proxy (instances publique et privée)
- Les connexions entre les différents composants
- La configuration DNS locale avec dnsmasq

![Schéma d'architecture du homelab actuel](/img/diagrams/homelab-actuel-infra.png)

### Infrastructure physique/virtuelle
- Serveur dédié Ubuntu Server
- Réseau local sécurisé avec DNS local (dnsmasq)
- Stockage unifié avec MergerFS
- Firewall avec firewalld

### Stack technique
- **OS** : Linux (Ubuntu Server)
- **Conteneurisation** : Docker & Docker Compose
- **Automatisation** : Ansible playbooks
- **Reverse proxy** : Traefik v3 (instances publique et privée)
- **Sécurité** : CrowdSec, TLS avec Let's Encrypt
- **Monitoring** : Beszel, Uptime Kuma
- **DNS local** : dnsmasq pour la résolution *.local.tellserv.fr

## Services déployés

La documentation détaille :
- Configuration des services
- Playbooks Ansible utilisés
- Docker Compose files
- Gestion des secrets et sécurité
- Sauvegardes et disaster recovery

## Avantages de cette approche

- Simple à mettre en place et maintenir
- Ansible permet une automatisation complète
- Docker Compose facilite la gestion des services
- Idéal pour un apprentissage progressif de l'automatisation

## Limitations

Cette infrastructure présente plusieurs limitations importantes qui motivent l'évolution vers une nouvelle approche (voir section "Futur Homelab").

### Absence initiale de versionnement Git

L'une des principales limitations de cette approche initiale était l'**absence de versionnement de l'infrastructure avec Git**. À ce stade de mon parcours, je ne maîtrisais pas encore la philosophie DevOps et les bonnes pratiques de gestion du code d'infrastructure.

**Conséquences de cette limitation :**
- Pas d'historique des changements de configuration
- Difficile de revenir en arrière en cas de problème
- Pas de traçabilité des modifications
- Collaboration complexe
- Absence de processus de revue de code (code review)
- Risque de divergence entre documentation et réalité

Cette lacune a été une **leçon importante** qui m'a poussé à :
1. Corriger progressivement cette infrastructure en versionnant les playbooks Ansible et Docker Compose
2. Adopter Git et les pratiques DevOps pour tous mes projets futurs
3. Intégrer la philosophie "Infrastructure as Code" dès la conception

**Note importante** : Le dépôt Git [Infra_ansible_dockercompose](https://forgejo.tellserv.fr/Tellsanguis/Infra_ansible_dockercompose) a été créé **après coup** pour présenter le travail réalisé. Dans la pratique initiale, Git, les tests automatisés et la CI/CD n'étaient pas utilisés, faute de connaissances à l'époque.

Le versionnement Git est maintenant en place pour cette infrastructure, mais l'architecture elle-même reste limitée (voir ci-dessous).

### Limitations techniques de l'architecture

- **Scalabilité limitée** : Infrastructure monomachine sans possibilité de distribution de charge
- **Pas de haute disponibilité** : Point unique de défaillance (SPOF)
- **Orchestration manuelle** : Certaines tâches nécessitent encore une intervention manuelle
- **CI/CD absent initialement** : Déploiements manuels via Ansible (pas d'automatisation sur push Git)
- **Tests limités** : Pas de validation automatique des changements avant déploiement

Ces limitations motivent l'évolution vers Kubernetes (K3S) et une approche Infrastructure as Code complète avec CI/CD (voir section [Futur Homelab](../homelab-futur/index.md)).
