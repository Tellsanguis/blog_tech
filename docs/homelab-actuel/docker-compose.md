---
sidebar_position: 3
---

# Docker et Docker Compose

## Qu'est-ce que Docker ?

Docker est une **plateforme de conteneurisation** qui permet d'empaqueter des applications et leurs dépendances dans des conteneurs légers et isolés.

### Les conteneurs : révolution de l'infrastructure moderne

Un conteneur est une unité logicielle standardisée qui contient :
- L'application elle-même
- Toutes ses dépendances (bibliothèques, runtime, outils système)
- Un système de fichiers isolé
- Des variables d'environnement et configuration

**Différence avec les machines virtuelles** :
- **Conteneur** : Partage le noyau de l'OS hôte, démarre en quelques secondes, très léger (~Mo)
- **VM** : Émule un OS complet, démarre en minutes, plus lourd (~Go)

### Avantages de Docker

1. **Portabilité** : "Runs anywhere" - fonctionne identiquement en développement, test et production
2. **Isolation** : Chaque conteneur est isolé, évitant les conflits de dépendances
3. **Légèreté** : Consomme moins de ressources qu'une VM (pas de virtualisation complète)
4. **Rapidité** : Démarrage instantané des applications
5. **Reproductibilité** : Image Docker = environnement identique à chaque fois
6. **Écosystème** : Docker Hub contient des milliers d'images prêtes à l'emploi

## Docker Compose : orchestration simplifiée

Docker Compose est un **outil d'orchestration** pour définir et gérer des applications multi-conteneurs.

### Pourquoi Docker Compose ?

Sans Compose, déployer une application avec plusieurs conteneurs (app + base de données + cache + ...) nécessite de longues commandes `docker run` difficiles à maintenir.

Avec Compose :
- **Configuration déclarative** : Tout est défini dans un fichier `compose.yml`
- **Gestion groupée** : Démarrer/arrêter tous les services en une commande
- **Réseaux automatiques** : Les conteneurs communiquent facilement entre eux
- **Volumes persistants** : Gestion simple du stockage
- **Variables d'environnement** : Configuration flexible via fichiers `.env`

### Fichier compose.yml

Un fichier Compose définit :
- Les **services** (conteneurs)
- Les **réseaux** (communication entre conteneurs)
- Les **volumes** (persistance des données)
- Les **variables d'environnement** (configuration)

## Exemples de stacks Docker Compose

Mes stacks Docker Compose sont disponibles dans le dépôt Ansible sous `stacks/`. Voici quelques exemples représentatifs :

### Exemple 1 : Traefik - Reverse Proxy avancé

Traefik est le point d'entrée de toute l'infrastructure. Ce compose illustre une configuration avancée avec **deux instances Traefik** (publique et privée) :

```yaml
services:
  traefik-public:
    image: traefik:v3
    container_name: traefik-public
    restart: unless-stopped
    ports:
      - "192.168.1.2:80:80"
      - "192.168.1.2:443:443"
    extra_hosts:
      - "host.docker.internal:host-gateway"
    networks:
      - traefik_network
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik-public.yml:/etc/traefik/traefik.yml:ro
      - ./dynamic-public:/etc/traefik/dynamic:ro
      - ./letsencrypt-public:/letsencrypt
      - /var/log/traefik:/var/log/traefik
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.traefik-dashboard-public.rule=Host(`traefik-public.local.tellserv.fr`)"
      - "traefik.http.routers.traefik-dashboard-public.entrypoints=local"
      - "traefik.http.routers.traefik-dashboard-public.tls.certresolver=cloudflare-local"
      - "traefik.http.routers.traefik-dashboard-public.tls=true"
      - "traefik.http.routers.traefik-dashboard-public.service=api@internal"
      - "traefik.http.middlewares.crowdsec-bouncer.forwardauth.address=http://crowdsec-bouncer:8080/api/v1/forwardAuth"
    environment:
      - CF_DNS_API_TOKEN=${CF_DNS_API_TOKEN}
      - TZ=Europe/Paris

  traefik-private:
    image: traefik:v3
    container_name: traefik-private
    restart: unless-stopped
    ports:
      - "192.168.1.3:80:80"
      - "192.168.1.3:443:443"
    networks:
      - traefik_network
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik-private.yml:/etc/traefik/traefik.yml:ro
      - ./dynamic-private:/etc/traefik/dynamic:ro
      - ./letsencrypt-private:/letsencrypt
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.traefik-dashboard-local.rule=Host(`traefik-private.local.tellserv.fr`)"
    environment:
      - TZ=Europe/Paris
      - CF_DNS_API_TOKEN=${CF_DNS_API_TOKEN}

networks:
  traefik_network:
    external: true
```

**Points clés** :
- **Deux instances** : Séparation publique (Internet) et privée (réseau local uniquement)
- **Socket Docker** : Traefik détecte automatiquement les nouveaux conteneurs via `/var/run/docker.sock`
- **Certificats Let's Encrypt** : Génération automatique avec DNS-01 challenge (Cloudflare)
- **Labels Traefik** : Configuration dynamique via labels Docker
- **Middleware CrowdSec** : Intégration avec CrowdSec pour bloquer les IPs malveillantes
- **Réseau externe** : Tous les services se connectent au réseau `traefik_network`

### Exemple 2 : Photoprism - Application avec base de données

Photoprism illustre une stack applicative classique (app + DB) avec configuration avancée :

```yaml
services:
  photoprism:
    image: photoprism/photoprism:241021
    stop_grace_period: 10s
    depends_on:
      - mariadb
    restart: unless-stopped
    security_opt:
      - seccomp:unconfined
      - apparmor:unconfined
    working_dir: "/photoprism"
    volumes:
      - "/mnt/storage/photos:/photoprism/import"
      - "/mnt/storage/photoprism/originals:/photoprism/originals"
      - "/mnt/storage/photoprism/storage:/photoprism/storage"
    environment:
      - PHOTOPRISM_DATABASE_DRIVER=mysql
      - PHOTOPRISM_DATABASE_SERVER=mariadb:3306
      - PHOTOPRISM_DATABASE_NAME=photoprism
      - PHOTOPRISM_DATABASE_USER=${MARIADB_USER}
      - PHOTOPRISM_DATABASE_PASSWORD=${PHOTOPRISM_DATABASE_PASSWORD}
      - PHOTOPRISM_ADMIN_USER=${PHOTOPRISM_ADMIN_USER}
      - PHOTOPRISM_ADMIN_PASSWORD=${PHOTOPRISM_ADMIN_PASSWORD}
      - PHOTOPRISM_SITE_URL=https://photoprism.tellserv.fr/
      - PHOTOPRISM_HTTP_COMPRESSION=gzip
      - PHOTOPRISM_JPEG_QUALITY=85
    networks:
      - traefik_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.${COMPOSE_PROJECT_NAME}-local.rule=Host(`${COMPOSE_PROJECT_NAME}.local.tellserv.fr`)"
      - "traefik.http.routers.${COMPOSE_PROJECT_NAME}-local.entryPoints=local"
      - "traefik.http.routers.${COMPOSE_PROJECT_NAME}-local.tls=true"
      - "traefik.http.routers.${COMPOSE_PROJECT_NAME}-prod.rule=Host(`${COMPOSE_PROJECT_NAME}.tellserv.fr`)"
      - "traefik.http.routers.${COMPOSE_PROJECT_NAME}-prod.entryPoints=websecure"
      - "traefik.http.routers.${COMPOSE_PROJECT_NAME}-prod.tls.certResolver=cloudflare"
      - "traefik.http.services.${COMPOSE_PROJECT_NAME}.loadbalancer.server.port=2342"
      - "com.centurylinklabs.watchtower.enable=true"

  mariadb:
    image: mariadb:11
    restart: unless-stopped
    stop_grace_period: 5s
    command: >
      --innodb-buffer-pool-size=512M
      --transaction-isolation=READ-COMMITTED
      --character-set-server=utf8mb4
      --collation-server=utf8mb4_unicode_ci
      --max-connections=512
    volumes:
      - ./database:/var/lib/mysql
    environment:
      - MARIADB_DATABASE=photoprism
      - MARIADB_USER=${MARIADB_USER}
      - MARIADB_PASSWORD=${MARIADB_PASSWORD}
      - MARIADB_ROOT_PASSWORD=${MARIADB_ROOT_PASSWORD}
    networks:
      - traefik_network

networks:
  traefik_network:
    external: true
```

**Points clés** :
- **Dépendances** : `depends_on` garantit que MariaDB démarre avant Photoprism
- **Volumes montés** : Accès au stockage MergerFS (`/mnt/storage`) pour les photos
- **Base de données** : MariaDB optimisée pour Photoprism (buffer pool, character set UTF-8)
- **Variables d'environnement** : Secrets injectés via fichier `.env` (non versionné)
- **Double exposition** : Accessible en local (`.local.tellserv.fr`) et sur Internet (`.tellserv.fr`)
- **Watchtower** : Label pour activer les mises à jour automatiques
- **Optimisations DB** : Configuration MariaDB adaptée (buffer pool, connexions, charset)

### Exemple 3 : Mobilizon - Application multi-conteneurs avec réseau interne

Mobilizon démontre l'utilisation de **réseaux Docker multiples** (externe + interne) :

```yaml
services:
  mobilizon:
    user: "1000:1000"
    restart: always
    image: docker.io/framasoft/mobilizon
    env_file: .env
    depends_on:
      - db
    volumes:
      - ./uploads:/var/lib/mobilizon/uploads
      - ./tzdata:/var/lib/mobilizon/tzdata
    networks:
      - traefik_network
      - mobilizon_internal
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.mobilizon-local.rule=Host(`mobilizon.local.tellserv.fr`)"
      - "traefik.http.routers.mobilizon-local.entryPoints=local"
      - "traefik.http.routers.mobilizon-prod.rule=Host(`mobilizon.tellserv.fr`)"
      - "traefik.http.routers.mobilizon-prod.entryPoints=websecure"
      - "traefik.http.routers.mobilizon-prod.tls.certResolver=cloudflare"
      - "traefik.http.services.mobilizon.loadbalancer.server.port=5005"

  db:
    image: docker.io/postgis/postgis:15-3.4
    restart: always
    env_file: .env
    volumes:
      - ./db:/var/lib/postgresql/data:z
    networks:
      - mobilizon_internal

networks:
  mobilizon_internal:
    ipam:
      driver: default
  traefik_network:
    external: true
```

**Points clés** :
- **Deux réseaux** :
  - `traefik_network` (externe) : Mobilizon communique avec Traefik
  - `mobilizon_internal` (interne) : Communication privée entre Mobilizon et PostgreSQL
- **Sécurité** : La base de données n'est pas exposée sur le réseau Traefik
- **PostgreSQL avec PostGIS** : Extension géographique pour gérer les événements géolocalisés
- **User ID** : Exécution avec UID/GID spécifique pour gérer les permissions fichiers
- **Volume avec SELinux** : Flag `:z` pour la compatibilité SELinux

### Exemple 4 : Vaultwarden - Gestion des secrets

Vaultwarden (gestionnaire de mots de passe) montre une configuration axée sécurité :

```yaml
services:
  vaultwarden:
    image: vaultwarden/server:1.32.7
    container_name: vaultwarden
    restart: unless-stopped
    environment:
      - TZ=Europe/Paris
      - ADMIN_TOKEN=${VAULTWARDEN_ADMIN_TOKEN}
      - SIGNUPS_ALLOWED=${SIGNUPS_ALLOWED}
      - SMTP_FROM=${SMTP_FROM}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_SECURITY=${SMTP_SECURITY}
      - SMTP_USERNAME=${SMTP_USERNAME}
      - SMTP_PASSWORD=${SMTP_PASSWORD}
      - EXPERIMENTAL_CLIENT_FEATURE_FLAGS=ssh-key-vault-item,ssh-agent
    volumes:
      - ./vw-data:/data
    networks:
      - traefik_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.vaultwarden-local.rule=Host(`vaultwarden.local.tellserv.fr`)"
      - "traefik.http.routers.vaultwarden-prod.rule=Host(`vaultwarden.tellserv.fr`)"
      - "traefik.http.routers.vaultwarden-prod.tls.certResolver=cloudflare"
      - "com.centurylinklabs.watchtower.enable=true"

networks:
  traefik_network:
    external: true
```

**Points clés** :
- **Secrets via .env** : Tous les mots de passe et tokens dans des variables d'environnement
- **Configuration SMTP** : Envoi d'emails pour les notifications et récupération de compte
- **Features expérimentales** : Support des clés SSH dans le coffre-fort
- **Volume de données** : Persistance du coffre-fort dans `./vw-data`
- **Exposition sécurisée** : HTTPS obligatoire via Traefik avec Let's Encrypt

## Patterns et bonnes pratiques

### 1. Réseau externe `traefik_network`

Tous mes services utilisent un **réseau Docker externe** partagé :

```yaml
networks:
  traefik_network:
    external: true
```

Avantages :
- Traefik détecte automatiquement les nouveaux services
- Communication entre services via leurs noms (ex: `http://vaultwarden`)
- Isolation par défaut (services non connectés ne peuvent pas communiquer)

### 2. Labels Traefik pour la configuration dynamique

Au lieu de fichiers de configuration statiques, j'utilise des **labels Docker** :

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.myapp.rule=Host(`myapp.tellserv.fr`)"
  - "traefik.http.routers.myapp.tls.certResolver=cloudflare"
```

Avantages :
- Configuration colocalisée avec le service
- Déploiement d'un nouveau service = ajout automatique dans Traefik
- Pas de rechargement manuel de Traefik

### 3. Variables d'environnement avec fichiers .env

Tous les secrets sont extraits dans des fichiers `.env` :

```env
VAULTWARDEN_ADMIN_TOKEN=supersecret123
MARIADB_PASSWORD=dbpassword456
CF_DNS_API_TOKEN=cloudflare_token_789
```

Avantages :
- Aucun secret en clair dans les fichiers Compose versionnés
- Fichiers `.env` générés dynamiquement par Ansible (templates Jinja2)
- Rotation facile des secrets

### 4. Double exposition : local et production

Chaque service a deux entrées :
- **Local** : `service.local.tellserv.fr` (réseau local uniquement)
- **Production** : `service.tellserv.fr` (accessible depuis Internet)

```yaml
labels:
  - "traefik.http.routers.myapp-local.rule=Host(`myapp.local.tellserv.fr`)"
  - "traefik.http.routers.myapp-local.entryPoints=local"
  - "traefik.http.routers.myapp-prod.rule=Host(`myapp.tellserv.fr`)"
  - "traefik.http.routers.myapp-prod.entryPoints=websecure"
```

Avantages :
- Accès rapide en local (pas de latence Internet)
- Accès à distance possible quand nécessaire
- Possibilité de restreindre certains services au local uniquement

### 5. Restart policies et graceful shutdown

Configuration de la résilience :

```yaml
restart: unless-stopped
stop_grace_period: 10s
```

- `unless-stopped` : Redémarre automatiquement sauf si arrêt manuel
- `stop_grace_period` : Temps pour terminer proprement avant SIGKILL

### 6. Watchtower pour le monitoring des mises à jour

Label pour activer le monitoring :

```yaml
labels:
  - "com.centurylinklabs.watchtower.enable=true"
```

**Important** : Watchtower est utilisé **uniquement pour notifier** des nouvelles versions d'images disponibles. Les mises à jour sont effectuées **manuellement** pour garder le contrôle sur les changements.

Dans le [Futur Homelab](../homelab-futur/index.md), la gestion automatisée des mises à jour sera implémentée via Renovate Bot directement intégré à Forgejo.

## Gestion des stacks avec Docker Compose

### Commandes essentielles

```bash
# Démarrer tous les services
docker compose up -d

# Arrêter tous les services
docker compose down

# Voir les logs d'un service
docker compose logs -f service_name

# Redémarrer un service
docker compose restart service_name

# Mettre à jour les images et redéployer
docker compose pull
docker compose up -d

# Voir l'état des conteneurs
docker compose ps
```

### Déploiement via Ansible

Dans ma configuration, les stacks sont déployées automatiquement par Ansible :

1. Génération des fichiers `.env` depuis les templates
2. Synchronisation des dossiers `stacks/` vers `/opt/stacks/`
3. Exécution de `docker compose up -d` pour chaque stack

Voir la page [Playbooks Ansible](./playbooks-ansible.md) pour plus de détails.

## Avantages de Docker Compose pour un homelab

### Simplicité

- Fichiers YAML lisibles et maintenables
- Pas de syntaxe complexe comme Kubernetes
- Courbe d'apprentissage douce

### Performance

- Démarrage instantané des services
- Faible overhead (pas de cluster Kubernetes)
- Idéal pour des machines modestes

### Flexibilité

- Facile d'ajouter/retirer des services
- Possibilité de tester rapidement de nouvelles applications
- Configuration par environnement (dev, staging, prod)

### Écosystème riche

- Docker Hub : des milliers d'images prêtes à l'emploi
- LinuxServer.io : images optimisées et bien maintenues
- Communauté active : documentation et support

## Limitations de Docker Compose

Malgré ses avantages, Docker Compose a des limitations pour un usage production à grande échelle :

1. **Pas de haute disponibilité** : Tout est sur une seule machine
2. **Pas de scaling horizontal** : Impossible de répartir la charge sur plusieurs serveurs
3. **Pas d'orchestration avancée** : Pas de rolling updates, canary deployments, etc.
4. **Gestion manuelle** : Déploiements via Ansible, pas de GitOps natif

**Note** : L'utilisation de `restart: unless-stopped` assure le redémarrage automatique des conteneurs après un arrêt inattendu, offrant une forme basique de résilience.

Ces limitations expliquent pourquoi je migre vers **Kubernetes (K3S)** pour le futur homelab. Voir la section [Futur Homelab](../homelab-futur/index.md).

## Pourquoi pas Docker Swarm ?

Lors de la réflexion sur l'évolution de mon infrastructure, **Docker Swarm** a été considéré comme une alternative à Kubernetes pour l'orchestration de conteneurs.

### Docker Swarm : un choix tentant mais dépassé

**Avantages de Docker Swarm** :
- Intégré nativement à Docker (pas d'installation supplémentaire)
- Configuration plus simple que Kubernetes
- Courbe d'apprentissage plus douce
- Utilise directement les fichiers Docker Compose (avec quelques adaptations)
- Moins gourmand en ressources que Kubernetes

**Pourquoi je ne l'ai pas choisi** :

1. **Kubernetes est le standard de l'industrie** : La grande majorité des entreprises utilisent Kubernetes en production. Apprendre K8S offre des compétences directement transférables au monde professionnel.

2. **Écosystème et communauté** : Kubernetes bénéficie d'un écosystème beaucoup plus riche (Helm, operators, nombreux outils DevOps) et d'une communauté bien plus large.

3. **Fonctionnalités avancées** : Kubernetes offre des capacités que Docker Swarm ne possède pas :
   - Rolling updates et rollbacks plus avancés
   - Gestion fine des ressources (CPU/RAM limits, requests)
   - Politiques réseau (Network Policies) plus élaborées
   - Support natif du GitOps (ArgoCD, Flux)
   - Stockage distribué mieux intégré (CSI drivers)

4. **Évolution et support** : Docker Inc. a clairement orienté son développement vers Kubernetes plutôt que Swarm. Swarm est maintenu, mais n'évolue plus beaucoup.

5. **Objectif d'apprentissage** : Mon but étant d'acquérir des compétences DevOps modernes, maîtriser Kubernetes est un meilleur investissement à long terme.

**Conclusion** : Bien que Docker Swarm soit plus simple et suffisant pour de nombreux homelabs, j'ai préféré investir directement dans l'apprentissage de Kubernetes, qui est devenu le standard incontournable de l'orchestration de conteneurs.
