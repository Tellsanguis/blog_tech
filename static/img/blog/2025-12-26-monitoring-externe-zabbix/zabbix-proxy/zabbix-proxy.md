# Guide d'installation : Zabbix Proxy 7.4 avec SQLite3 sur LXC

Ce guide décrit l'installation et la configuration d'un Zabbix Proxy 7.4 avec SQLite3 dans un conteneur LXC, permettant de superviser un réseau local (homelab) et de transmettre les données à un serveur Zabbix distant via une connexion sécurisée PSK.

## Architecture

```
Internet
    │
    ├─ VPS (Serveur Zabbix) - <IP_SERVEUR>:10051
    │      ↕ (connexion TLS/PSK chiffrée)
    └─ LXC Homelab (Proxy Zabbix) - Proxy-Homelab
           │
           └─ Zabbix Agent 2 (127.0.0.1:10050)
```

Le proxy collecte les données de votre réseau local et les transmet de manière sécurisée au serveur distant.

---

## Prérequis

- Conteneur LXC sous Debian 13 (ou compatible)
- Accès root au conteneur
- Serveur Zabbix 7.x accessible via Internet
- Ports requis :
  - **10051** : Communication proxy → serveur (sortant)
  - **10050** : Communication agent → proxy (local)

---

## Installation

### 1. Mise à jour du système

```bash
apt update && apt upgrade -y
```

### 2. Installation du dépôt Zabbix 7.4

```bash
wget https://repo.zabbix.com/zabbix/7.4/debian/pool/main/z/zabbix-release/zabbix-release_7.4-1+debian13_all.deb
dpkg -i zabbix-release_7.4-1+debian13_all.deb
apt update
```

### 3. Installation des paquets Zabbix

```bash
apt install zabbix-proxy-sqlite3 zabbix-agent2 -y
```

**Pourquoi SQLite3 ?**
- Léger et adapté aux conteneurs LXC
- Pas besoin de serveur MySQL/PostgreSQL
- Suffisant pour un proxy gérant quelques dizaines d'hôtes

---

## Configuration de la base de données

### 1. Création du répertoire et initialisation

```bash
# Créer le répertoire de la base
mkdir -p /var/lib/zabbix
chown zabbix:zabbix /var/lib/zabbix

# Injecter le schéma SQLite
zcat -f /usr/share/zabbix-proxy-sqlite3/schema.sql.gz | sqlite3 /var/lib/zabbix/zabbix_proxy.db

# Appliquer les permissions
chown zabbix:zabbix /var/lib/zabbix/zabbix_proxy.db
chmod 660 /var/lib/zabbix/zabbix_proxy.db
```

### 2. Vérification

```bash
ls -lh /var/lib/zabbix/zabbix_proxy.db
```

Vous devriez voir un fichier d'environ 6-8 MB appartenant à `zabbix:zabbix`.

---

## Sécurisation : Génération de la clé PSK

La clé PSK (Pre-Shared Key) permet de chiffrer la communication entre le proxy et le serveur Zabbix.

```bash
# Générer une clé hexadécimale de 32 octets
openssl rand -hex 32 | tee /etc/zabbix/zabbix_proxy.psk

# Appliquer les permissions
chown zabbix:zabbix /etc/zabbix/zabbix_proxy.psk
chmod 600 /etc/zabbix/zabbix_proxy.psk
```

**Important :** Notez le contenu de cette clé, vous en aurez besoin lors de la configuration du proxy sur le serveur Zabbix.

```bash
cat /etc/zabbix/zabbix_proxy.psk
```

---

## Configuration du Proxy

### 1. Création du répertoire de logs

```bash
mkdir -p /var/log/zabbix-proxy
chown zabbix:zabbix /var/log/zabbix-proxy
```

### 2. Configuration principale

Éditez le fichier `/etc/zabbix/zabbix_proxy.conf` :

```bash
nano /etc/zabbix/zabbix_proxy.conf
```

#### Paramètres essentiels à configurer

```ini
############ CONNEXION AU SERVEUR #################

# Adresse IP ou DNS du serveur Zabbix
Server=<VOTRE_SERVEUR_ZABBIX>

# Port du serveur (par défaut 10051)
ServerPort=10051

# Nom unique du proxy (doit correspondre au nom configuré sur le serveur)
Hostname=Proxy-Homelab

############ FICHIERS SYSTÈME #################

# Fichier de logs
LogFile=/var/log/zabbix-proxy/zabbix_proxy.log

# Fichier PID
PidFile=/run/zabbix/zabbix_proxy.pid

############ BASE DE DONNÉES #################

# Chemin vers la base SQLite
DBName=/var/lib/zabbix/zabbix_proxy.db

# Utilisateur (ignoré pour SQLite, mais requis)
DBUser=zabbix

############ OPTIMISATIONS POUR LXC #################

# Mode hybride : mémoire puis disque si nécessaire
ProxyBufferMode=hybrid

# Taille du buffer mémoire (16 MB recommandé pour LXC)
ProxyMemoryBufferSize=16M

############ PERFORMANCE #################

# Timeout des requêtes (en secondes)
Timeout=4

# Log les requêtes lentes (> 3 secondes)
LogSlowQueries=3000

############ OUTILS RÉSEAU #################

# Chemins vers fping/fping6
FpingLocation=/usr/bin/fping
Fping6Location=/usr/bin/fping6

############ STATISTIQUES #################

# Autoriser les statistiques internes depuis localhost
StatsAllowedIP=127.0.0.1

############ FICHIERS ADDITIONNELS #################

# Inclure les configurations additionnelles
Include=/etc/zabbix/zabbix_proxy.conf.d/*.conf

############ SÉCURITÉ TLS/PSK #################

# Connexion au serveur via PSK
TLSConnect=psk

# Identifiant PSK (personnalisable)
TLSPSKIdentity=PSK-PROXY-HOME

# Fichier contenant la clé PSK
TLSPSKFile=/etc/zabbix/zabbix_proxy.psk
```

#### Explications des paramètres clés

| Paramètre | Description |
|-----------|-------------|
| `Server` | Adresse de votre serveur Zabbix (IP ou DNS) |
| `Hostname` | Nom unique du proxy (utilisé pour l'identification) |
| `ProxyBufferMode=hybrid` | Utilise la RAM par défaut, bascule sur disque si plein |
| `ProxyMemoryBufferSize=16M` | Buffer mémoire adapté pour un LXC |
| `TLSConnect=psk` | Active le chiffrement PSK (recommandé) |
| `TLSPSKIdentity` | Identifiant de la clé (à définir aussi sur le serveur) |
| `TLSPSKFile` | Chemin vers le fichier contenant la clé |

---

## Configuration de l'Agent Zabbix

L'agent Zabbix surveille le proxy lui-même (métriques CPU, RAM, disque, etc.).

Éditez `/etc/zabbix/zabbix_agent2.conf` :

```bash
nano /etc/zabbix/zabbix_agent2.conf
```

### Paramètres essentiels

```ini
############ FICHIERS SYSTÈME #################

PidFile=/run/zabbix/zabbix_agent2.pid
LogFile=/var/log/zabbix/zabbix_agent2.log

# Désactiver la rotation automatique (géré par logrotate)
LogFileSize=0

############ CONNEXION AU PROXY LOCAL #################

# Le proxy est en local sur le même conteneur
Server=127.0.0.1
ServerActive=127.0.0.1

# Nom d'hôte (identique au proxy pour simplifier)
Hostname=Proxy-Homelab

############ SOCKET DE CONTRÔLE #################

ControlSocket=/run/zabbix/agent.sock

############ FICHIERS ADDITIONNELS #################

Include=/etc/zabbix/zabbix_agent2.d/*.conf
Include=./zabbix_agent2.d/plugins.d/*.conf
```

**Points importants :**
- `Server` et `ServerActive` pointent vers `127.0.0.1` car l'agent communique avec le proxy local
- Pas de configuration TLS/PSK nécessaire pour l'agent (communication locale)

---

## Activation et démarrage des services

```bash
# Activer le démarrage automatique
systemctl enable zabbix-proxy
systemctl enable zabbix-agent2

# Démarrer les services
systemctl restart zabbix-proxy
systemctl restart zabbix-agent2

# Vérifier les statuts
systemctl status zabbix-proxy
systemctl status zabbix-agent2
```

---

## Vérification et logs

### Consulter les logs en temps réel

```bash
# Logs du proxy
tail -f /var/log/zabbix-proxy/zabbix_proxy.log

# Logs de l'agent
tail -f /var/log/zabbix/zabbix_agent2.log
```

### Vérifier la connexion au serveur

Dans les logs du proxy, vous devriez voir :

```
sending configuration data to server at "203.0.113.10": datalen 123
```

Si vous voyez des erreurs TLS/PSK, vérifiez :
- La clé PSK est identique sur le proxy et le serveur
- L'identifiant PSK correspond
- Le firewall autorise le port 10051

### Commandes de diagnostic utiles

```bash
# Vérifier les processus Zabbix
ps aux | grep zabbix

# Vérifier les ports en écoute
ss -tlnp | grep zabbix

# Logs système
journalctl -xeu zabbix-proxy --no-pager | tail -50
journalctl -xeu zabbix-agent2 --no-pager | tail -50

# Vérifier la config
grep -E "^(Server|Hostname|DBName|LogFile|TLSConnect)" /etc/zabbix/zabbix_proxy.conf
```

---

## Configuration côté serveur Zabbix

Sur l'interface web de votre serveur Zabbix :

### 1. Créer le proxy

1. Aller dans **Administration → Proxies**
2. Cliquer sur **Create proxy**
3. Configurer :
   - **Proxy name** : `Proxy-Homelab` (identique au `Hostname` du fichier de config)
   - **Proxy mode** : `Active`
   - **Proxy address** : Laisser vide (le proxy contacte le serveur)
   - **Encryption** :
     - Cocher **PSK**
     - **PSK identity** : `PSK-PROXY-HOME`
     - **PSK** : Copier le contenu de `/etc/zabbix/zabbix_proxy.psk`

4. Cliquer sur **Add**

### 2. Assigner les hôtes au proxy

Pour chaque hôte de votre réseau local :

1. Aller dans **Configuration → Hosts**
2. Sélectionner l'hôte
3. Dans l'onglet **Host**, section **Monitored by proxy** :
   - Sélectionner `Proxy-Homelab`
4. Cliquer sur **Update**

---

## Résolution de problèmes

### Le proxy ne se connecte pas au serveur

**Symptôme :** Logs montrent `cannot connect to [[203.0.113.10]:10051]`

**Solutions :**
1. Vérifier la connectivité réseau :
   ```bash
   ping <IP_SERVEUR>
   telnet <IP_SERVEUR> 10051
   ```
2. Vérifier le firewall du serveur (port 10051 ouvert)
3. Vérifier le paramètre `Server=` dans le fichier de config

### Erreur TLS/PSK

**Symptôme :** `invalid PSK identity` ou `TLS handshake failed`

**Solutions :**
1. Vérifier que la clé PSK est identique :
   ```bash
   cat /etc/zabbix/zabbix_proxy.psk
   ```
2. Vérifier le `TLSPSKIdentity` (sensible à la casse)
3. Sur le serveur, vérifier la configuration du proxy (PSK identity et clé)

### Base de données verrouillée

**Symptôme :** `database is locked`

**Solutions :**
1. Vérifier les permissions :
   ```bash
   ls -l /var/lib/zabbix/zabbix_proxy.db
   ```
2. Redémarrer le proxy :
   ```bash
   systemctl restart zabbix-proxy
   ```

### Proxy visible mais "unavailable"

**Symptôme :** Le proxy apparaît dans l'interface mais reste grisé

**Causes possibles :**
- Le proxy ne peut pas envoyer de données (problème réseau)
- Configuration PSK incorrecte
- Nom du proxy ne correspond pas

**Solution :** Consulter les logs des deux côtés (proxy et serveur)

---

## Optimisations pour homelab

### Ajuster la fréquence de synchronisation

Pour réduire la bande passante, augmentez l'intervalle de configuration :

```ini
# Dans /etc/zabbix/zabbix_proxy.conf
ProxyConfigFrequency=600  # 10 minutes au lieu de 10 secondes
DataSenderFrequency=5     # Envoie les données toutes les 5 secondes
```

### Limiter la rétention locale

Pour économiser l'espace disque :

```ini
ProxyOfflineBuffer=2  # Garde 2 heures de données en cas de déconnexion
```

### Ajuster les pollers

Si vous avez peu d'hôtes (< 10), réduisez les processus :

```ini
StartPollers=3
StartPingers=1
StartDiscoverers=1
```

---

## Sauvegarde et maintenance

### Sauvegarder la configuration

```bash
# Sauvegarder les fichiers de config et la clé PSK
tar -czf /root/zabbix-proxy-backup-$(date +%Y%m%d).tar.gz \
  /etc/zabbix/zabbix_proxy.conf \
  /etc/zabbix/zabbix_agent2.conf \
  /etc/zabbix/zabbix_proxy.psk
```

### Sauvegarder la base de données

```bash
# Copie de la base SQLite
cp /var/lib/zabbix/zabbix_proxy.db /root/zabbix_proxy.db.backup
```

### Rotation des logs

Créez `/etc/logrotate.d/zabbix-proxy` :

```
/var/log/zabbix-proxy/zabbix_proxy.log {
    weekly
    rotate 4
    compress
    delaycompress
    missingok
    notifempty
    create 0640 zabbix zabbix
    postrotate
        systemctl reload zabbix-proxy > /dev/null 2>&1 || true
    endscript
}
```

---

## Conclusion

Vous disposez maintenant d'un proxy Zabbix fonctionnel, sécurisé par TLS/PSK, et optimisé pour tourner dans un conteneur LXC. Cette architecture permet de superviser votre réseau local tout en centralisant les données sur un serveur distant.

**Avantages de cette configuration :**
- ✅ Communication chiffrée (PSK)
- ✅ Léger (SQLite + LXC)
- ✅ Résilient (buffer hybride)
- ✅ Facile à maintenir

**Prochaines étapes suggérées :**
- Configurer les templates et items pour vos hôtes
- Mettre en place des triggers et alertes
- Ajouter des graphiques personnalisés
- Configurer les notifications (email, Telegram, etc.)

---

## Références

- [Documentation officielle Zabbix Proxy](https://www.zabbix.com/documentation/current/en/manual/distributed_monitoring/proxies)
- [Zabbix 7.4 Release Notes](https://www.zabbix.com/rn/rn7.4.0)
- [Configuration de l'encryption PSK](https://www.zabbix.com/documentation/current/en/manual/encryption/using_pre_shared_keys)
