---
slug: monitoring-externe-zabbix
title: "Monitoring depuis l'extérieur avec Zabbix"
authors: [tellserv]
tags: [zabbix, monitoring, proxmox, vps, homelab, sécurité]
date: 2025-12-26
---

Comment j'ai mis en place un système de monitoring externe avec Zabbix pour être alerté même si mon cluster Proxmox tombe complètement, en utilisant un proxy local, un serveur VPS distant et une connexion chiffrée PSK.

<!--truncate-->

## Le paradoxe du monitoring : surveiller ce qui vous surveille

Quand on construit un homelab, on installe rapidement un système de monitoring. C'est essentiel : ça permet de garder un œil sur l'utilisation CPU, la RAM, l'espace disque, et d'être alerté avant qu'un service ne plante.

J'utilisais **Beszel** jusqu'à maintenant. Un outil simple, léger, efficace. Parfait pour un homelab. Tout roule.

Sauf qu'il y a un problème.

**Si mon cluster Proxmox tombe, Beszel tombe avec lui.**

Et donc, mes notifications tombent aussi. Je ne serai jamais averti que mes services sont en panne, puisque le système censé me prévenir est lui-même hors service.

### Les scénarios problématiques

Voici quelques scénarios où mon monitoring actuel devient inutile :

- **Panne électrique** : Plus de cluster → Plus de monitoring → Pas d'alerte
- **Crash du nœud principal** : Celui qui héberge Beszel → Silence radio
- **Problème réseau** : Le switch meurt → Impossible de communiquer avec le monitoring
- **Corruption du stockage** : Le Linstor DRBD qui héberge les VMs devient inaccessible → Plus rien ne fonctionne

Dans tous ces cas, je ne suis **jamais notifié**. Je découvre le problème des heures (ou des jours) plus tard, quand j'essaie d'accéder à un service.

Pour un homelab perso, c'est ennuyeux. Pour une infrastructure critique, c'est inacceptable.

## La solution : une approche complémentaire

Plutôt que de remplacer Beszel, j'ai décidé de mettre en place une **architecture complémentaire** :

- **Beszel reste en place** pour le monitoring en temps réel des VMs et LXCs au quotidien. C'est simple, léger, et parfait pour surveiller l'utilisation des ressources en direct.

- **Zabbix vient en complément** pour le monitoring global du cluster Proxmox, l'historique sur le long terme, et surtout les **alertes critiques** (comme la chute complète du cluster).

Cette approche combine le meilleur des deux mondes : la simplicité de Beszel pour le quotidien, et la résilience de Zabbix pour les situations critiques.

### Architecture offsite avec monitoring distribué

Pour résoudre le problème de résilience, j'ai besoin d'une architecture qui respecte trois contraintes :

### 1. Le serveur de monitoring doit être **ailleurs**

Si mon cluster tombe, le serveur de monitoring doit rester opérationnel. La solution : l'héberger sur un **VPS**, complètement indépendant de mon homelab.

Même si toute mon infrastructure domestique tombe, le serveur VPS continue de tourner et peut m'envoyer une alerte.

### 2. Pas de port ouvert sur le homelab

Je ne veux **pas** ouvrir de port en entrée sur mon réseau local. Cela augmente la surface d'attaque et les risques de sécurité.

Je veux une architecture où :
- Le serveur central (VPS) écoute sur un port
- Un **proxy local** (dans mon homelab) collecte les données et les **pousse** vers le serveur
- La connexion est **initiée depuis l'intérieur** (pas d'ouverture de port NAT)

C'est le proxy qui contacte le serveur, pas l'inverse. Comme ça, pas besoin de VPN ni de redirection de ports.

### 3. Communication chiffrée

Les métriques de monitoring peuvent révéler des informations sensibles :
- Combien de serveurs j'ai
- Quels services tournent
- Quand je suis absent (pas d'activité)

Je veux que la communication entre le proxy et le serveur soit **chiffrée de bout en bout**, avec une **Pre-Shared Key (PSK)** pour éviter toute interception ou usurpation d'identité.

## Zabbix : la solution qui coche toutes les cases

Après avoir évalué plusieurs solutions (Prometheus + Grafana, Netdata, InfluxDB + Telegraf), j'ai choisi **Zabbix** pour plusieurs raisons :

- **Architecture proxy native** : Zabbix a été conçu dès le départ pour gérer des proxies qui collectent localement et envoient au serveur central
- **Mode actif/passif** : Le proxy peut pousser (actif) ou être interrogé (passif)
- **Chiffrement PSK intégré** : Pas besoin d'ajouter un tunnel VPN ou un reverse proxy
- **Template Proxmox VE** : Support natif de l'API REST de Proxmox
- **Interface complète** : Dashboards, alertes, notifications, graphiques... tout est inclus
- **Solution mature** : Utilisée en entreprise depuis des années, documentation abondante

### L'architecture finale

Voici à quoi ressemble mon setup :

![Architecture complète du monitoring Zabbix distribué](/img/blog/2025-12-26-monitoring-externe-zabbix/architecture-diagram.png)

### Le flux de données

1. **Le Zabbix Proxy** (LXC sur le cluster) collecte les données :
   - Il interroge l'API REST de Proxmox pour récupérer les métriques du cluster
   - Il se monitore lui-même via l'agent local (CPU, RAM, disque)
   - Il peut aussi collecter les données d'autres agents Zabbix sur le réseau

2. **Le Proxy pousse les données** vers le serveur VPS :
   - Connexion HTTPS sortante (pas de port ouvert en entrée)
   - Chiffrement TLS avec Pre-Shared Key (PSK)
   - Mode "Active" : le proxy contacte le serveur, pas l'inverse

3. **Le Zabbix Server** (VPS) :
   - Reçoit et stocke les métriques dans PostgreSQL
   - Déclenche les alertes si un seuil est franchi
   - Expose l'interface web via Cloudflare Tunnel

## Mise en place : du VPS au monitoring complet

### Étape 1 : Zabbix Server sur le VPS

J'ai déployé Zabbix via Docker Compose sur mon VPS. Voici le fichier `compose.yaml` :

```yaml
services:
  zabbix-db:
    image: postgres:16-alpine
    container_name: zabbix-db
    restart: always
    volumes:
      - ./zbx_db_data:/var/lib/postgresql/data
    env_file: .env
    networks:
      - zabbix-tier

  zabbix-server:
    image: zabbix/zabbix-server-pgsql:7.0-alpine-latest
    container_name: zabbix-server
    restart: always
    depends_on:
      - zabbix-db
    env_file: .env
    ports:
      - "10051:10051"
    networks:
      - zabbix-tier
      - public-tier

  zabbix-web:
    image: zabbix/zabbix-web-nginx-pgsql:7.0-alpine-latest
    container_name: zabbix-web
    restart: always
    depends_on:
      - zabbix-db
      - zabbix-server
    env_file: .env
    networks:
      - zabbix-tier
      - public-tier

  tunnel:
    image: cloudflare/cloudflared:latest
    container_name: cloudflare-tunnel
    restart: always
    command: tunnel run
    env_file: .env
    networks:
      - public-tier

networks:
  zabbix-tier:
    internal: true
  public-tier:
    driver: bridge
```

Et le fichier `.env` correspondant :

```bash
# --- Configuration Base de données ---
POSTGRES_USER=zabbix
POSTGRES_PASSWORD=REPLACEME
POSTGRES_DB=zabbix

# --- Configuration Zabbix Server ---
DB_SERVER_HOST=zabbix-db
ZBX_POSTGRES_USER=zabbix
ZBX_POSTGRES_PASSWORD=REPLACEME

# --- Configuration Zabbix Web ---
ZBX_DBHOST=zabbix-db
ZBX_SERVER_HOST=zabbix-server
PHP_TZ=Europe/Paris

# Clé Cloudflare
TUNNEL_TOKEN="REPLACEME"
```

:::tip[Génération d'un mot de passe fort]
Pour générer un mot de passe fort et sécurisé pour votre base de données PostgreSQL, vous pouvez utiliser la commande OpenSSL suivante :

```bash
openssl rand -base64 32
```

Cette commande génère une chaîne aléatoire de 32 octets encodée en base64, ce qui produit un mot de passe de ~44 caractères extrêmement robuste. Remplacez ensuite les valeurs `REPLACEME` dans le fichier `.env` par ce mot de passe généré.
:::

**Points importants** :
- Le réseau `zabbix-tier` est **internal** : la base de données n'est pas accessible depuis l'extérieur
- Le serveur Zabbix expose le port **10051** pour recevoir les données des proxies
- L'interface web est accessible uniquement via **Cloudflare Tunnel** (pas d'IP publique exposée)

**Déploiement** :

```bash
docker compose up -d
```

Après quelques secondes, l'interface Zabbix est accessible. Connexion par défaut : `Admin` / `zabbix` (à changer immédiatement !).

### Étape 2 : Zabbix Proxy dans un LXC

J'ai créé un conteneur LXC Debian 13 sur le cluster Proxmox pour héberger le proxy.

**Configuration du LXC** :
- CPU : 1 vCore
- RAM : 512 MB
- Disque : 4 GB
- IP statique

**Installation complète** :

```bash
# Mise à jour
apt update && apt upgrade -y

# Ajout du dépôt Zabbix 7.4
wget https://repo.zabbix.com/zabbix/7.4/debian/pool/main/z/zabbix-release/zabbix-release_7.4-1+debian13_all.deb
dpkg -i zabbix-release_7.4-1+debian13_all.deb
apt update

# Installation du proxy et de l'agent
apt install zabbix-proxy-sqlite3 zabbix-agent2 -y

# Création de la base SQLite
mkdir -p /var/lib/zabbix
chown zabbix:zabbix /var/lib/zabbix
zcat -f /usr/share/zabbix-proxy-sqlite3/schema.sql.gz | sqlite3 /var/lib/zabbix/zabbix_proxy.db
chown zabbix:zabbix /var/lib/zabbix/zabbix_proxy.db
chmod 660 /var/lib/zabbix/zabbix_proxy.db

# Génération de la clé PSK
openssl rand -hex 32 | tee /etc/zabbix/zabbix_proxy.psk
chown zabbix:zabbix /etc/zabbix/zabbix_proxy.psk
chmod 600 /etc/zabbix/zabbix_proxy.psk

# Créer le répertoire de logs
mkdir -p /var/log/zabbix-proxy
chown zabbix:zabbix /var/log/zabbix-proxy
```

**Configuration du proxy** (`/etc/zabbix/zabbix_proxy.conf`) :

Les paramètres essentiels :

```ini
# Adresse du serveur Zabbix VPS
Server=<IP_DE_VOTRE_VPS>
ServerPort=10051

# Nom du proxy (doit correspondre à la config serveur)
Hostname=Proxy-Homelab

# Base de données SQLite
DBName=/var/lib/zabbix/zabbix_proxy.db
DBUser=zabbix

# Fichiers
LogFile=/var/log/zabbix-proxy/zabbix_proxy.log
PidFile=/run/zabbix/zabbix_proxy.pid

# Optimisations LXC
ProxyBufferMode=hybrid
ProxyMemoryBufferSize=16M

# Sécurité PSK
TLSConnect=psk
TLSPSKIdentity=PSK-PROXY-HOME
TLSPSKFile=/etc/zabbix/zabbix_proxy.psk
```

**Configuration de l'agent** (`/etc/zabbix/zabbix_agent2.conf`) :

```ini
# Le proxy est en local
Server=127.0.0.1
ServerActive=127.0.0.1
Hostname=Proxy-Homelab

# Fichiers
PidFile=/run/zabbix/zabbix_agent2.pid
LogFile=/var/log/zabbix/zabbix_agent2.log
ControlSocket=/run/zabbix/agent.sock
```

**Démarrage** :

```bash
systemctl enable zabbix-proxy zabbix-agent2
systemctl start zabbix-proxy zabbix-agent2
```

### Étape 3 : Déclaration du proxy sur le serveur

Dans l'interface Zabbix, je vais dans **Administration → Proxies** → **Create proxy**.

**Configuration** :
- **Proxy name** : `Proxy-Homelab` (identique au `Hostname` du fichier de config)
- **Proxy mode** : `Active` (le proxy contacte le serveur)
- **Proxy address** : laisser vide

![Configuration de base du proxy Zabbix](/img/blog/2025-12-26-monitoring-externe-zabbix/zabbix-proxy/connect_proxy_to_vps.png)

**Onglet Chiffrement** :
- **Connexion au proxy** : sélectionner `PSK`
- **Connexions du proxy** : cocher `PSK`
- **PSK identity** : `PSK-PROXY-HOME`
- **PSK** : copier le contenu de `/etc/zabbix/zabbix_proxy.psk` depuis le LXC

![Configuration du chiffrement PSK pour le proxy](/img/blog/2025-12-26-monitoring-externe-zabbix/zabbix-proxy/connect_proxy_to_vps_encryption.png)

Après quelques secondes, le proxy apparaît comme **connecté**. La magie opère !

### Étape 4 : Monitoring du proxy lui-même

Le proxy est connecté, mais il n'est pas encore monitoré. Je crée un nouvel hôte dans Zabbix :

**Configuration → Hosts → Create host** :
- **Host name** : `Proxy-Homelab`
- **Groups** : `Linux servers`
- **Monitored by proxy** : `Proxy-Homelab`
- **Interface** : Agent → DNS `127.0.0.1` port `10050`
- **Templates** : lier `Linux by Zabbix agent`

![Création d'un hôte pour monitorer le proxy lui-même](/img/blog/2025-12-26-monitoring-externe-zabbix/zabbix-proxy/host_creation.png)

Quelques minutes plus tard, les premières métriques arrivent : CPU, RAM, disque, réseau... Le proxy se monitore lui-même !

### Étape 5 : Monitoring du cluster Proxmox

La dernière étape : monitorer Proxmox via son API REST.

#### Création de l'utilisateur et du token dans Proxmox

**Datacenter → Permissions → Users → Add** :
- **User name** : `zabbix-monitor@pam`
- **Expire** : `never`
- **Enabled** : coché

![Création de l'utilisateur Zabbix dans Proxmox](/img/blog/2025-12-26-monitoring-externe-zabbix/proxmox/user_creation.png)

**Datacenter → Permissions → API Tokens → Add** :
- **User** : `zabbix-monitor@pam`
- **Token ID** : `zabbix`
- **Privilege Separation** : coché
- **Expire** : `never`

**Copier le Token Secret** (il ne sera plus affiché après).

![Création du token API pour Zabbix](/img/blog/2025-12-26-monitoring-externe-zabbix/proxmox/api_token.png)

#### Attribution des permissions

**Datacenter → Permissions → Add → User permission** :

Deux entrées à créer :

| Path | User/API Token | Role | Propagate |
|------|---------------|------|-----------|
| `/` | `zabbix-monitor@pam` | `PVEAuditor` | ✓ |
| `/` | `zabbix-monitor@pam!zabbix` | `PVEAuditor` | ✓ |

Le rôle **PVEAuditor** permet la lecture seule de toutes les métriques, sans aucun droit de modification.

![Attribution des permissions à l'utilisateur](/img/blog/2025-12-26-monitoring-externe-zabbix/proxmox/user_permission.png)

![Vue d'ensemble des permissions pour l'utilisateur et le token API](/img/blog/2025-12-26-monitoring-externe-zabbix/proxmox/permissions_for_user_and_api.png)

#### Ajout de l'hôte Proxmox dans Zabbix

**Configuration → Hosts → Create host** :
- **Host name** : `Proxmox-Cluster`
- **Groups** : `Hypervisors`
- **Monitored by proxy** : `Proxy-Homelab`
- **Templates** : lier `Proxmox VE by HTTP`

![Utilisation du template Proxmox VE dans Zabbix](/img/blog/2025-12-26-monitoring-externe-zabbix/proxmox/vps_zabbix_use_proxmox_model_to_monitor.png)

**Onglet Macros** :

| Macro | Valeur |
|-------|--------|
| `{$PVE.URL.HOST}` | `192.168.100.10` (IP de votre nœud Proxmox) |
| `{$PVE.TOKEN.ID}` | `zabbix-monitor@pam!zabbix` |
| `{$PVE.TOKEN.SECRET}` | Le token secret copié précédemment |

![Configuration des macros pour l'authentification Proxmox](/img/blog/2025-12-26-monitoring-externe-zabbix/proxmox/vps_zabbix_macros_to_change_proxmox_model.png)

**Quelques minutes plus tard** : toutes les métriques Proxmox arrivent ! CPU, RAM, stockage, nombre de VMs, nombre de LXCs, état du cluster...

## Résultat : un monitoring qui survit à tout

J'ai maintenant une infrastructure de monitoring résiliente :

- **Le serveur Zabbix tourne sur un VPS** : même si tout mon homelab brûle, le monitoring reste actif
- **Le proxy local collecte les données** : il interroge Proxmox, se monitore lui-même, et pousse tout au serveur
- **Connexion chiffrée PSK** : impossible d'intercepter ou d'usurper les communications
- **Pas de port ouvert** : le proxy initie la connexion sortante, aucune ouverture NAT nécessaire
- **Accessible via Cloudflare Tunnel** : pas d'IP publique exposée, accès sécurisé à l'interface web

### Les avantages concrets

**Résilience** :
- Si le cluster tombe → Le serveur VPS m'alerte immédiatement
- Si le VPS tombe → Le proxy continue de collecter et renvoie les données dès le retour du serveur
- Si le réseau homelab tombe → Le serveur VPS détecte l'absence de données et m'alerte

**Sécurité** :
- Pas de port ouvert en entrée sur le homelab
- Chiffrement TLS/PSK de bout en bout
- Accès en lecture seule à l'API Proxmox (PVEAuditor)
- Interface web accessible uniquement via Cloudflare Tunnel

**Simplicité** :
- Installation Docker Compose pour le serveur (3 commandes)
- Installation LXC légère pour le proxy
- Template Proxmox prêt à l'emploi dans Zabbix
- Pas de VPN ni de configuration réseau complexe

## Prochaines étapes

Maintenant que le monitoring est en place, je peux :

- Configurer des **alertes personnalisées** (CPU > 80%, RAM > 90%, etc.)
- Mettre en place des **notifications** (Discord, Gotify...)
- Ajouter d'autres **agents Zabbix** sur mes VMs et LXCs
- Créer des **dashboards personnalisés** pour avoir une vue d'ensemble
- Monitorer d'autres services (bases de données, serveurs web, etc.)

Si mon cluster tombe en panne, je reçois maintenant une notification immédiate au lieu de découvrir le problème plusieurs heures plus tard.

## Conclusion

Avec cette architecture complémentaire, je bénéficie maintenant du meilleur des deux mondes :

- **Beszel** pour le monitoring quotidien, simple et efficace, avec une vue en temps réel sur mes VMs et LXCs
- **Zabbix** pour le monitoring global du cluster, l'historique sur le long terme, et les alertes critiques qui fonctionnent même si tout mon homelab tombe

Cette approche me permet de garder la simplicité de Beszel au quotidien tout en ayant la résilience d'un monitoring offsite pour les situations critiques.

![Dashboard Zabbix avec vue d'ensemble du monitoring](/img/blog/2025-12-26-monitoring-externe-zabbix/zabbix_dashboard.png)

Si vous avez un homelab, mettre en place un monitoring offsite peut être une bonne solution pour détecter rapidement les problèmes, même en cas de panne complète de votre infrastructure locale.
