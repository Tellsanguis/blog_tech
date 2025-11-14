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

### Infrastructure physique/virtuelle
- Serveurs dédiés ou VM
- Réseau local sécurisé
- Stockage et sauvegardes

### Stack technique
- **OS** : Linux (Debian/Ubuntu)
- **Conteneurisation** : Docker & Docker Compose
- **Automatisation** : Ansible playbooks
- **Reverse proxy** : Traefik ou Nginx
- **Monitoring** : Prometheus, Grafana

## Services déployés

La documentation détaille :
- Configuration des services
- Playbooks Ansible utilisés
- Docker Compose files
- Gestion des secrets et sécurité
- Sauvegardes et disaster recovery

## Avantages de cette approche

Simple à mettre en place et maintenir
Ansible permet une automatisation complète
Docker Compose facilite la gestion des services
Reproductible et versionné avec Git

## Limitations

Scalabilité limitée
Pas de haute disponibilité native
Orchestration manuelle pour certaines tâches

Ces limitations motivent l'évolution vers Kubernetes (voir section "Futur Homelab").
