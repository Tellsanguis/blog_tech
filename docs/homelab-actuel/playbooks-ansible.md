---
sidebar_position: 2
tags: [ansible, automatisation, iac, homelab]
last_update:
  date: 2025-12-03
---

# Playbooks Ansible

## Qu'est-ce qu'Ansible ?

Ansible est un **outil d'automatisation informatique open-source** développé par Red Hat. Il permet de gérer la configuration, le déploiement et l'orchestration d'infrastructures de manière déclarative et reproductible.

### Pourquoi Ansible ?

Ansible présente plusieurs avantages majeurs :

- **Agentless** : Pas besoin d'installer un agent sur les machines cibles, fonctionne via SSH
- **Déclaratif** : On décrit l'état désiré, Ansible s'occupe de le réaliser
- **Idempotent** : Exécuter plusieurs fois le même playbook produit le même résultat
- **Lisible** : Syntaxe YAML simple et claire, accessible même aux débutants
- **Extensible** : Large bibliothèque de modules pour gérer tous types de systèmes

### Pourquoi maîtriser Ansible aujourd'hui ?

Ansible est devenu un **standard de l'industrie** pour l'automatisation des infrastructures :

1. **DevOps et SRE** : Compétence essentielle pour les rôles DevOps, SRE et administrateur système moderne
2. **Infrastructure as Code** : Permet de versionner et documenter l'infrastructure comme du code
3. **Gain de temps** : Automatise les tâches répétitives et réduit les erreurs humaines
4. **Scalabilité** : Gère facilement des dizaines ou centaines de serveurs
5. **Intégration CI/CD** : S'intègre parfaitement dans les pipelines d'intégration continue

## Structure de mes playbooks

Mon infrastructure Ansible est disponible sur Forgejo :
- **Dépôt en ligne** : [https://forgejo.tellserv.fr/Tellsanguis/Infra_ansible_dockercompose](https://forgejo.tellserv.fr/Tellsanguis/Infra_ansible_dockercompose)

### Architecture du projet

```
infra-ansible/
├── playbook.yml              # Playbook principal
├── inventory/
│   └── hosts.yml            # Inventaire des serveurs
├── roles/                   # Rôles Ansible
│   ├── common/             # Configuration de base
│   ├── docker/             # Installation Docker
│   ├── cockpit/            # Interface web Cockpit
│   └── services/           # Déploiement des services
├── stacks/                  # Docker Compose files
│   ├── traefik/
│   ├── vaultwarden/
│   ├── photoprism/
│   └── ...
├── templates/               # Templates Jinja2
│   └── env/                # Templates .env
└── vars/                    # Variables
    └── secrets.yml         # Secrets chiffrés (Ansible Vault)
```

## Playbook principal

Le playbook principal (`playbook.yml`) orchestre le provisionnement complet du homelab :

```yaml
- name: Provision Homelab
  hosts: homeserver
  become: true

  vars:
    cloudflare_dns: "1.1.1.1"

  vars_files:
    - vars/secrets.yml

  roles:
    - common
    - cockpit
    - docker
    - services
```

### Rôles Ansible

#### 1. Rôle `common` - Configuration de base

Le rôle `common` configure les éléments fondamentaux du système :

**Paquets installés** :
- Utilitaires système : `git`, `curl`, `htop`
- Firewall : `firewalld`
- Stockage : `mergerfs` pour unifier les disques
- DNS local : `dnsmasq`

**Configuration DNS locale** :
- Désactivation de `systemd-resolved`
- Configuration de `dnsmasq` pour résoudre `*.local.tellserv.fr` localement
- Redirection des autres requêtes vers Cloudflare DNS (1.1.1.1)
- Écoute sur le port 53 (UDP et TCP) pour les clients locaux et Tailscale

**Configuration Firewall** :
- Ouverture SSH (22/tcp)
- Ouverture HTTP/HTTPS (80/tcp, 443/tcp)
- Ouverture DNS (53/udp, 53/tcp)

**Stockage MergerFS** :
- Création du point de montage `/mnt/storage`
- Permet d'unifier plusieurs disques en un seul système de fichiers

#### 2. Rôle `docker` - Installation Docker

Le rôle `docker` installe et configure Docker selon les bonnes pratiques officielles :

**Installation** :
- Ajout du dépôt officiel Docker
- Installation de Docker Engine, CLI et plugins (Compose, Buildx)
- Configuration du service Docker (démarrage automatique)

**Configuration Traefik** :
- Création du réseau Docker `traefik_network` (partagé entre tous les services)
- Création des répertoires pour les logs Traefik (`/var/log/traefik`)
- Création des répertoires pour les certificats Let's Encrypt (`/etc/letsencrypt/traefik`)

**Gestion des utilisateurs** :
- Ajout de l'utilisateur Ansible au groupe `docker` pour exécuter les commandes sans `sudo`

#### 3. Rôle `cockpit` - Interface web d'administration

Le rôle `cockpit` installe Cockpit, une interface web moderne pour administrer le serveur Linux :

- Installation du paquet `cockpit`
- Activation et démarrage du service
- Accessible via le navigateur pour surveiller le serveur (CPU, RAM, disques, services, etc.)

#### 4. Rôle `services` - Déploiement des stacks Docker

Le rôle `services` est le plus complexe. Il gère le déploiement de tous les services Docker Compose :

**Génération des fichiers .env** :
- Utilise des templates Jinja2 pour générer les fichiers `.env`
- Les secrets sont stockés dans `vars/secrets.yml` (chiffré avec Ansible Vault)
- Génère les `.env` en local avant la synchronisation

**Synchronisation des stacks** :
- Copie l'ensemble du dossier `stacks/` vers le serveur (`/opt/stacks/`)
- Préserve les permissions des fichiers

**Déploiement automatique** :
- Recherche tous les fichiers `compose.yml` dans `/opt/stacks/`
- Arrête les conteneurs existants (`docker compose down`)
- Met à jour les images Docker (`docker compose pull`)
- Déploie chaque stack avec `docker compose up -d --build`

**Déploiement sélectif avec tags** :
- Permet de déployer un seul service avec `--tags <service_name>`
- Exemple : `ansible-playbook playbook.yml --tags traefik`
- Disponible pour tous les services (traefik, vaultwarden, photoprism, etc.)

## Gestion des secrets

Les secrets sensibles (mots de passe, tokens API, etc.) sont **chiffrés avec Ansible Vault** :

```bash
# Éditer les secrets
ansible-vault edit vars/secrets.yml

# Exécuter le playbook avec les secrets
ansible-playbook playbook.yml --ask-vault-pass
```

Cette approche garantit que les secrets ne sont jamais stockés en clair dans Git.

## Exécution du playbook

### Déploiement complet

```bash
# Déployer l'infrastructure complète
ansible-playbook playbook.yml --ask-vault-pass
```

### Déploiement avec tags

```bash
# Déployer seulement la configuration de base
ansible-playbook playbook.yml --tags common

# Déployer seulement Docker
ansible-playbook playbook.yml --tags docker

# Mettre à jour les images et redéployer les services
ansible-playbook playbook.yml --tags deploy,pull

# Déployer un seul service
ansible-playbook playbook.yml --tags traefik
```

### Génération des fichiers .env uniquement

```bash
# Regénérer les .env sans déployer
ansible-playbook playbook.yml --tags env,secrets
```

## Avantages de cette approche

### Reproductibilité

En exécutant le playbook sur un nouveau serveur Ubuntu, l'infrastructure complète est recréée à l'identique :
- Tous les paquets installés
- Toutes les configurations appliquées
- Tous les services déployés

### Documentation vivante

Le code Ansible **documente l'infrastructure** :
- Chaque tâche décrit une action précise
- Les rôles structurent logiquement l'infrastructure
- Les commentaires expliquent les choix techniques

### Maintenance simplifiée

Modifier l'infrastructure devient simple :
- Mise à jour d'un service : modifier le `compose.yml` et relancer Ansible
- Ajout d'un service : créer un nouveau dossier dans `stacks/` et ajouter le template `.env`
- Changement de configuration : modifier le rôle et redéployer

### Sécurité

- Les secrets sont chiffrés avec Ansible Vault
- Les fichiers `.env` sont générés à la volée et jamais versionnés
- Les configurations sont revues et testées avant déploiement

## Limitations actuelles

Malgré ses nombreux avantages, cette approche présente des limitations :

1. **Versionnement tardif** : Le dépôt Git [Infra_ansible_dockercompose](https://forgejo.tellserv.fr/Tellsanguis/Infra_ansible_dockercompose) a été créé **après coup** pour présenter le travail. Dans la pratique initiale, Git, les tests automatisés et la CI/CD n'étaient pas utilisés, faute de connaissances à l'époque.
2. **Pas de tests automatisés** : Pas de validation automatique des playbooks (Molecule, tests d'intégration)
3. **Infrastructure monomachine** : Ansible est conçu pour gérer plusieurs serveurs, mais je ne gère qu'un seul serveur
4. **Pas d'intégration CI/CD** : Les déploiements sont manuels, pas de pipeline automatisé

Ces limitations seront adressées dans le [Futur Homelab](../homelab-futur/index.md) avec l'adoption de Kubernetes et GitOps.
