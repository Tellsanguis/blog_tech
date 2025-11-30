---
sidebar_position: 4
---

# Traefik - Reverse Proxy moderne

Traefik est le reverse proxy au cœur de l'infrastructure Docker du homelab. Il gère le routage de toutes les requêtes HTTP/HTTPS vers les conteneurs appropriés, avec gestion automatique des certificats SSL et intégration de la sécurité via CrowdSec.

## Architecture globale

L'infrastructure utilise **deux instances Traefik distinctes**, chacune sur sa propre interface réseau :

- **traefik-public** (192.168.1.2) : Services publics accessibles sur Internet (*.tellserv.fr)
- **traefik-private** (192.168.1.3) : Services locaux réservés au réseau interne (*.local.tellserv.fr)

Cette séparation permet :
- **Isolation réseau** : Les services privés ne sont jamais exposés publiquement
- **Sécurité renforcée** : Politiques de sécurité différenciées selon l'exposition
- **Gestion simplifiée** : Chaque instance a sa propre configuration et ses propres règles

### Prérequis réseau

La VM hébergeant Traefik dispose de **deux NICs (Network Interface Cards)** :
- **NIC 1** (192.168.1.2) : Interface publique pour traefik-public
- **NIC 2** (192.168.1.3) : Interface locale pour traefik-private

## Éléments communs aux deux instances

### Image et version

Les deux instances utilisent l'image officielle **Traefik v3** :

```yaml
image: traefik:v3
```

### Réseau Docker

Les deux instances se connectent au réseau Docker externe `traefik_network` qui permet la communication avec tous les conteneurs à proxifier :

```yaml
networks:
  - traefik_network
```

Ce réseau doit être créé au préalable avec :

```bash
docker network create traefik_network
```

### Gestion des certificats SSL

Les deux instances utilisent **Let's Encrypt** avec le challenge DNS **Cloudflare** pour générer automatiquement des certificats SSL wildcard.

**Avantages du challenge DNS :**
- Certificats wildcard (*.tellserv.fr, *.local.tellserv.fr)
- Pas besoin d'exposition HTTP publique pour la validation
- Fonctionne même pour les services internes

**Configuration commune :**

```yaml
environment:
  - TZ=Europe/Paris
  - CF_DNS_API_TOKEN=${CF_DNS_API_TOKEN}
```

Le token API Cloudflare doit avoir les permissions :
- Zone / DNS / Edit
- Zone / Zone / Read

### Provider Docker

Les deux instances utilisent le provider Docker pour la découverte automatique des services :

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro
```

Traefik surveille les conteneurs et crée automatiquement les routes basées sur les labels Docker.

### Configuration dynamique

Chaque instance charge des fichiers de configuration dynamique depuis un répertoire dédié :

```yaml
volumes:
  - ./dynamic-public:/etc/traefik/dynamic:ro   # Pour traefik-public
  - ./dynamic-private:/etc/traefik/dynamic:ro  # Pour traefik-private
```

Ces fichiers permettent de définir des middlewares, des routers et des services sans redémarrer Traefik.

### Dashboard Traefik

Les deux instances exposent leur dashboard via un sous-domaine dédié :
- **traefik-public** : `traefik-public.local.tellserv.fr`
- **traefik-private** : `traefik-private.local.tellserv.fr`

Le dashboard permet de visualiser en temps réel :
- Les routers actifs et leurs règles
- Les services détectés
- Les middlewares appliqués
- L'état de santé des backends

### Politique de redémarrage

```yaml
restart: unless-stopped
```

Les conteneurs redémarrent automatiquement sauf s'ils ont été arrêtés manuellement.

### Accès à l'hôte Docker

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

Cette configuration permet aux conteneurs Traefik d'accéder à l'hôte Docker via le nom `host.docker.internal`, utile pour proxifier des services tournant directement sur l'hôte.

## Instance traefik-public

### Rôle et utilisation

L'instance **traefik-public** gère tous les services **accessibles depuis Internet** :
- Applications web publiques
- APIs exposées
- Services authentifiés mais accessibles de l'extérieur

### Binding réseau

```yaml
ports:
  - "192.168.1.2:80:80"
  - "192.168.1.2:443:443"
```

Traefik écoute uniquement sur l'IP **192.168.1.2**, correspondant à la première NIC de la VM.

### Entry points

**Port 80 (HTTP)** :
```yaml
web:
  address: ":80"
  http:
    redirections:
      entryPoint:
        to: websecure
        scheme: https
```

Redirection automatique de HTTP vers HTTPS pour toutes les requêtes.

**Port 443 (HTTPS)** :
```yaml
websecure:
  address: ":443"
  http:
    middlewares:
      - crowdsec-bouncer@file
      - secheaders@file
      - ratelimit@file
  transport:
    respondingTimeouts:
      idleTimeout: 300s
```

Trois middlewares appliqués par défaut sur tous les services publics :
1. **crowdsec-bouncer** : Blocage des IPs malveillantes détectées par CrowdSec
2. **secheaders** : Headers de sécurité HTTP (HSTS, CSP, etc.)
3. **ratelimit** : Limitation du nombre de requêtes

### Middlewares publics

Fichier : `dynamic-public/middlewares.yml`

**ratelimit** :
```yaml
ratelimit:
  rateLimit:
    average: 100
    burst: 50
    period: 1s
```
Autorise en moyenne 100 requêtes/seconde avec des pics jusqu'à 50 requêtes supplémentaires.

**secheaders** :
```yaml
secheaders:
  headers:
    stsSeconds: 31536000
    forceSTSHeader: true
```
Force HSTS (HTTP Strict Transport Security) pendant 1 an, obligeant les navigateurs à toujours utiliser HTTPS.

**evasive** :
```yaml
evasive:
  rateLimit:
    average: 3
    burst: 5
    period: 1s
```
Rate limiting strict pour les endpoints sensibles (3 req/s en moyenne, 5 en burst).

### Intégration CrowdSec

**CrowdSec** est un système de détection et prévention d'intrusions communautaire. Traefik-public intègre le **bouncer CrowdSec** pour bloquer automatiquement les IPs malveillantes.

**Middleware CrowdSec** (appliqué sur websecure) :
```yaml
middlewares:
  - crowdsec-bouncer@file
```

Le bouncer interroge l'API CrowdSec locale pour vérifier si l'IP source est bannie. En cas de match, la requête est bloquée avec un code HTTP 403.

### Certificats SSL

Stockage des certificats :
```yaml
volumes:
  - ./letsencrypt-public:/letsencrypt
```

Configuration ACME dans `traefik-public.yml` :
```yaml
certificatesResolvers:
  cloudflare:
    acme:
      email: your-email@example.com
      storage: /letsencrypt/cloudflare_acme.json
      keyType: EC256
      dnsChallenge:
        provider: cloudflare
        resolvers:
          - "1.1.1.1:53"
          - "8.8.8.8:53"
```

Les certificats sont automatiquement renouvelés 30 jours avant expiration.

### Logging

```yaml
log:
  level: DEBUG
  filePath: "/var/log/traefik/traefik.log"
accessLog:
  filePath: "/var/log/traefik/access.log"
  format: json
```

Logs stockés dans `/var/log/traefik/` sur l'hôte Docker :
- **traefik.log** : Logs système de Traefik (démarrage, erreurs, recharges)
- **access.log** : Logs d'accès au format JSON (requêtes HTTP)

### Configuration provider Docker

```yaml
providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: traefik_network
```

- **exposedByDefault: false** : Les conteneurs ne sont pas automatiquement exposés, il faut explicitement ajouter des labels Traefik
- **network: traefik_network** : Traefik utilisera ce réseau pour communiquer avec les conteneurs

### Exemple de labels Docker

Pour exposer un service via traefik-public :

```yaml
services:
  myapp:
    image: myapp:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.myapp.rule=Host(`app.tellserv.fr`)"
      - "traefik.http.routers.myapp.entrypoints=websecure"
      - "traefik.http.routers.myapp.tls.certresolver=cloudflare"
      - "traefik.http.services.myapp.loadbalancer.server.port=80"
    networks:
      - traefik_network
```

## Instance traefik-private

### Rôle et utilisation

L'instance **traefik-private** gère tous les services **réservés au réseau local** :
- Interfaces d'administration (Proxmox, Cockpit)
- Dashboards internes
- Services de monitoring
- Outils de développement

### Binding réseau

```yaml
ports:
  - "192.168.1.3:80:80"
  - "192.168.1.3:443:443"
```

Traefik écoute uniquement sur l'IP **192.168.1.3**, correspondant à la seconde NIC de la VM.

### Entry points

**Port 80 (HTTP)** :
```yaml
weblocal:
  address: ":80"
  http:
    redirections:
      entryPoint:
        to: local
        scheme: https
```

Redirection automatique de HTTP vers HTTPS (entrypoint `local`).

**Port 443 (HTTPS)** :
```yaml
local:
  address: ":443"
  http:
    middlewares:
      - localonly@file
```

Un seul middleware appliqué par défaut : **localonly** qui restreint l'accès aux IPs locales.

### Middlewares privés

Fichier : `dynamic-private/middlewares.yml`

**localonly** :
```yaml
localonly:
  ipWhiteList:
    sourceRange:
      - "127.0.0.1/32"
      - "192.168.1.0/24"
      - "100.64.0.0/10"
      - "172.18.0.0/16"
```

Liste blanche d'IPs autorisées :
- **127.0.0.1/32** : Localhost
- **192.168.1.0/24** : Réseau LAN principal
- **100.64.0.0/10** : Réseau Tailscale (VPN)
- **172.18.0.0/16** : Réseau Docker interne

Toute requête provenant d'une IP hors de ces plages est rejetée avec un code HTTP 403.

**ratelimit**, **secheaders**, **evasive** :

Identiques à traefik-public, disponibles pour être appliqués au besoin sur des services spécifiques.

### Certificats SSL

Stockage des certificats :
```yaml
volumes:
  - ./letsencrypt-private:/letsencrypt
```

Configuration ACME dans `traefik-private.yml` :
```yaml
certificatesResolvers:
  cloudflare:
    acme:
      email: your-email@example.com
      storage: /letsencrypt/cloudflare_acme.json
      keyType: EC256
      dnsChallenge:
        provider: cloudflare
```

Bien que les services soient locaux, ils bénéficient de **certificats SSL valides** grâce au challenge DNS.

### Logging

```yaml
log:
  level: DEBUG
  filePath: "/var/log/traefik-local/traefik.log"
accessLog:
  filePath: "/var/log/traefik-local/access.log"
  format: json
```

Logs stockés dans `/var/log/traefik-local/` sur l'hôte Docker.

### Configuration provider Docker

Identique à traefik-public :
```yaml
providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: traefik_network
```

### Services exposés

Fichiers de configuration statiques dans `dynamic-private/` :

**cockpit.yml** : Proxification de Cockpit (interface web d'administration système)
**proxmox.yml** : Proxification de l'interface Proxmox

Ces fichiers définissent des routers et services pour des applications ne tournant pas dans Docker.

### Exemple de labels Docker

Pour exposer un service via traefik-private :

```yaml
services:
  monitoring:
    image: grafana/grafana:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.monitoring.rule=Host(`grafana.local.tellserv.fr`)"
      - "traefik.http.routers.monitoring.entrypoints=local"
      - "traefik.http.routers.monitoring.tls.certresolver=cloudflare"
      - "traefik.http.services.monitoring.loadbalancer.server.port=3000"
    networks:
      - traefik_network
```

## Sécurité et bonnes pratiques

### Séparation public/privé

- **Ne jamais exposer** de services d'administration via traefik-public
- **Toujours vérifier** l'entrypoint utilisé dans les labels Docker
- **Privilégier** traefik-private pour tout ce qui n'a pas besoin d'être public

### Middlewares de sécurité

- **CrowdSec** : Actif uniquement sur traefik-public, bloque les attaques automatisées
- **localonly** : Appliqué par défaut sur traefik-private
- **ratelimit** : Protection anti-DDoS basique
- **secheaders** : Renforcement de la sécurité côté navigateur

### Gestion des certificats

- **Rotation automatique** : Let's Encrypt renouvelle les certificats tous les 90 jours
- **Backup** : Sauvegarder régulièrement les fichiers `cloudflare_acme.json`
- **Monitoring** : Vérifier les logs pour détecter les échecs de renouvellement

### Logging et monitoring

- **Logs accessibles** : Montés en volumes sur l'hôte pour analyse
- **Format JSON** : Facilite le parsing et l'intégration avec des outils de monitoring
- **Niveau DEBUG** : Utile pour le troubleshooting, peut être réduit en production

## Limites de cette configuration

Bien que fonctionnelle et sécurisée, cette architecture présente certaines limites à connaître :

### Réseau Docker partagé

**Problème** : Les deux instances Traefik (public et private) utilisent le **même réseau Docker** (`traefik_network`). Cela signifie que tous les conteneurs connectés à ce réseau peuvent potentiellement communiquer entre eux, qu'ils soient exposés publiquement ou localement.

**Impact** :
- Un conteneur exposé via traefik-public peut techniquement accéder à un conteneur exposé via traefik-private
- Le cloisonnement réseau n'est pas complet, il repose uniquement sur les IP bindings (192.168.1.2 vs 192.168.1.3)

**Amélioration possible** :
- Créer deux réseaux Docker distincts : `traefik_public_network` et `traefik_private_network`
- Connecter chaque instance Traefik uniquement à son réseau dédié
- Garantir une isolation réseau complète au niveau Docker

### Absence de segmentation VLAN

**Problème** : Les deux NICs de la VM partagent le même réseau physique (192.168.1.0/24) sans segmentation VLAN.

**Impact** :
- Le NIC pour traefik-private (192.168.1.3) a techniquement accès à Internet via la passerelle réseau, alors qu'il n'en a pas besoin
- Pas de cloisonnement réseau au niveau L2/L3 entre les interfaces publique et privée
- En cas de compromission, un attaquant pourrait potentiellement pivoter entre les deux réseaux

**Amélioration possible** :
- **VLAN public** : Placer le NIC de traefik-public (192.168.1.2) dans un VLAN avec accès Internet
- **VLAN privé** : Placer le NIC de traefik-private (192.168.1.3) dans un VLAN isolé, sans accès Internet
- Configurer des règles de firewall strictes entre les VLANs
- Cette segmentation renforcerait considérablement le cloisonnement et limiterait la surface d'attaque

### Accès au socket Docker

**Problème** : Les deux instances Traefik ont un accès **direct et complet** au socket Docker (`/var/run/docker.sock`). Le socket Docker est l'API d'administration de Docker, donnant un contrôle total sur l'hôte.

**Impact sécurité** :
- Un conteneur Traefik compromis pourrait contrôler tous les conteneurs de l'hôte
- Possibilité d'élévation de privilèges (lancer un conteneur en mode privileged, monter des volumes sensibles, etc.)
- Accès en lecture seule (`ro`) limite les dégâts, mais permet toujours d'extraire des informations sensibles (variables d'environnement, secrets, etc.)

**Amélioration possible** :
- Utiliser un **proxy au socket Docker** comme [Tecnativa/docker-socket-proxy](https://github.com/Tecnativa/docker-socket-proxy)
- Ce proxy permet de filtrer finement les opérations autorisées (ex: seulement lire les conteneurs et leurs labels)
- Réduire la surface d'attaque en limitant l'accès API aux endpoints strictement nécessaires à Traefik

Exemple de configuration :
```yaml
docker-socket-proxy:
  image: tecnativa/docker-socket-proxy
  environment:
    CONTAINERS: 1  # Autoriser lecture des conteneurs
    NETWORKS: 1    # Autoriser lecture des réseaux
    SERVICES: 0    # Interdire accès aux services Swarm
    TASKS: 0       # Interdire accès aux tâches Swarm
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock:ro
```

Ces améliorations ne sont pas critiques pour un homelab, mais seraient **fortement recommandées en environnement de production**.

## Ressources

- [Documentation officielle Traefik v3](https://doc.traefik.io/traefik/)
- [Provider Docker](https://doc.traefik.io/traefik/providers/docker/)
- [Middlewares](https://doc.traefik.io/traefik/middlewares/overview/)
- [Let's Encrypt](https://doc.traefik.io/traefik/https/acme/)
- [CrowdSec Bouncer](https://docs.crowdsec.net/u/bouncers/traefik/)
- [Docker Socket Proxy](https://github.com/Tecnativa/docker-socket-proxy)
