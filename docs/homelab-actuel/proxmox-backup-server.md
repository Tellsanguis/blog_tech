---
sidebar_position: 5
tags: [proxmox, backup, pbs, wireguard, vps, sécurité, homelab]
last_update:
  date: 2026-01-03
---

# Proxmox Backup Server - Instances locale et distante sécurisées

Proxmox Backup Server (PBS) est la solution de sauvegarde dédiée pour les environnements Proxmox VE. L'infrastructure du homelab utilise une architecture **3-2-1** avec deux instances PBS :

- **PBS local** : Sauvegarde primaire des VMs sur stockage NFS
- **PBS distant (VPS)** : Sauvegarde secondaire offsite pour la redondance

Cette architecture garantit la disponibilité des sauvegardes même en cas de sinistre majeur affectant le homelab.

## Architecture globale

### Principe de fonctionnement

```
┌─────────────────────────────────────────────────────────────────┐
│                         HOMELAB                                  │
│  ┌──────────────┐    Backup    ┌─────────────────┐             │
│  │ Proxmox VE   │──────────────▶│  PBS Local      │             │
│  │ (Hyperviseur)│  Toutes les   │  (192.168.100.40)│            │
│  │              │  6 heures     │                 │             │
│  └──────────────┘               │  Datastore:     │             │
│                                 │  nfs-storage    │             │
│                                 └────────┬────────┘             │
│                                          │                       │
│                                     Sync │ Pull                 │
│                                  (Dimanche 1h)                  │
└──────────────────────────────────────────┼──────────────────────┘
                                           │
                                   WireGuard Tunnel
                                  (10.200.0.0/24)
                                           │
┌──────────────────────────────────────────┼──────────────────────┐
│                          VPS                                     │
│                                  ┌───────▼─────────┐            │
│                                  │  PBS Distant    │            │
│                                  │  (TellPBS)      │            │
│                                  │                 │            │
│                                  │  Datastore:     │            │
│                                  │  remote-backup  │            │
│                                  │                 │            │
│                                  │  Rétention:     │            │
│                                  │  26 semaines    │            │
│                                  └─────────────────┘            │
└──────────────────────────────────────────────────────────────────┘
```

### Caractéristiques de sécurité

- **Chiffrement end-to-end** : Les sauvegardes sont chiffrées côté client (PVE) avant envoi au PBS
- **Tunnel WireGuard** : Toute communication inter-sites transite par un tunnel VPN chiffré
- **Principe du moindre privilège** : Le VPS peut uniquement accéder au port 8007 du PBS local pour tirer les sauvegardes
- **Protection contre compromission** : Le homelab ne peut pas accéder au PBS distant, empêchant un attaquant de modifier ou détruire les sauvegardes offsite
- **Pare-feu strict** : Seul le trafic nécessaire est autorisé sur le tunnel (port 8007 depuis VPS vers PBS local, ICMP bidirectionnel)

## Instance locale PBS

### Contexte

Le PBS local est la cible primaire des sauvegardes Proxmox VE. Il stocke les sauvegardes sur un datastore NFS monté, offrant capacité et performance adaptées à des sauvegardes fréquentes.

### Création des utilisateurs

Le PBS local nécessite deux utilisateurs distincts avec des permissions différentes :

![Création utilisateur backup](/img/homelab-actuel/pbs-instances/local_01_creation_user_backup.png)

**Utilisateur `backup@pbs`** :
- **User name** : `backup`
- **Realm** : `Proxmox Backup authentication server`
- **Rôle** : Utilisé par Proxmox VE pour écrire les sauvegardes

**Utilisateur `remote@pbs`** :
- **User name** : `remote`
- **Realm** : `Proxmox Backup authentication server`
- **Rôle** : Utilisé par le PBS distant pour lire les sauvegardes

### Attribution des permissions

![Permissions utilisateurs](/img/homelab-actuel/pbs-instances/local_02_permission_user_backup.png)

**Configuration des permissions** :

| Utilisateur  | Path                     | Rôle              | Usage                                      |
| ------------ | ------------------------ | ----------------- | ------------------------------------------ |
| `backup@pbs` | `/datastore/nfs-storage` | `DatastoreBackup` | Écriture des sauvegardes depuis Proxmox VE |
| `backup@pbs` | `/datastore/nfs-storage` | `DatastoreReader` | Lecture des sauvegardes                    |
| `remote@pbs` | `/datastore/nfs-storage` | `DatastoreReader` | Lecture des sauvegardes par le PBS distant |

Cette séparation des privilèges garantit que :
- Proxmox VE peut écrire ses sauvegardes (`DatastoreBackup`) et les lire (`DatastoreReader`)
- Le PBS distant peut uniquement lire (`DatastoreReader`), pas écrire, modifier ou supprimer

### Configuration Proxmox VE

#### Ajout du backend de stockage PBS

![Configuration stockage PVE - Général](/img/homelab-actuel/pbs-instances/local_03_pve_storage_backend_general.png)

**Paramètres** :
- **ID** : `PBS`
- **Server** : `192.168.100.40` (IP du PBS local)
- **Username** : `backup@pbs`
- **Datastore** : `nfs-storage`

Proxmox VE peut maintenant sauvegarder directement vers le PBS local.

#### Activation du chiffrement

![Configuration chiffrement](/img/homelab-actuel/pbs-instances/local_04_pve_storage_backend_encryption.png)

**Option choisie** : `Auto-generate a client encryption key`

**Importance critique** : Le chiffrement côté client garantit que :
- Les données sont chiffrées **avant** de quitter l'hyperviseur
- Le PBS local et distant ne peuvent pas déchiffrer les données sans la clé
- La clé de chiffrement reste uniquement sur Proxmox VE

Cette configuration est requise par la politique de sécurité du Sync Job distant (`Encrypted Only`).

#### Configuration du Backup Job

![Backup Job PVE](/img/homelab-actuel/pbs-instances/local_05_pve_backup_job.png)

**Paramètres** :
- **Storage** : `PBS`
- **Schedule** : `00/6:00` (toutes les 6 heures)
- **Mode** : `Snapshot`
- **Compression** : `ZSTD`

Les VMs sont sauvegardées automatiquement 4 fois par jour, garantissant un RPO (Recovery Point Objective) de 6 heures maximum.

### Notifications PVE

#### Configuration des cibles

![Cibles de notification](/img/homelab-actuel/pbs-instances/local_06_pve_notification_targets.png)

Proxmox VE envoie les notifications vers **Gotify** pour les notifications push mobiles.

#### Règle d'alerte backup

![Règle notification échec backup](/img/homelab-actuel/pbs-instances/local_07_pve_notification_backup_failure_rules.png)

**Matcher : Backup-Failures**

**Configuration** :
- **Match severity** : `error`
- **Match field** : `type=vzdump`

Une alerte est envoyée immédiatement en cas d'échec d'une tâche de sauvegarde vzdump.

![Types de notifications disponibles](/img/homelab-actuel/pbs-instances/local_08_notification_types_dropdown.png)

Proxmox offre des types de notifications pour divers événements système : mises à jour, réplication, fencing, etc.

## Instance distante PBS (VPS)

### Prérequis

Un VPS Debian 13 (Trixie) avec :
- Accès root SSH par clé publique uniquement
- Au moins 100 GB d'espace disque pour les sauvegardes
- IP publique fixe

### Installation de Proxmox Backup Server

#### Ajout du dépôt PBS

Créer le fichier `/etc/apt/sources.list.d/pbs-no-subscription.sources` :

```
Types: deb
URIs: http://download.proxmox.com/debian/pbs
Suites: trixie
Components: pbs-no-subscription
Signed-By: /etc/apt/trusted.gpg.d/proxmox-release-trixie.gpg
```

#### Installation

```bash
apt update
apt install proxmox-backup-server
```

#### Configuration initiale

```bash
# Changer le mot de passe root
passwd
```

À ce stade, PBS est accessible sur le port 8007 depuis n'importe quelle IP. Il faut sécuriser l'accès immédiatement.

### Sécurisation du VPS

#### Installation du pare-feu

```bash
apt install iptables-persistent -y
```

#### Configuration des règles iptables

```bash
# Nettoyage
iptables -F
iptables -X
iptables -Z

# Politique par défaut (DROP tout ce qui veut rentrer)
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Loopback (pour tunnel SSH :8007)
iptables -A INPUT -i lo -j ACCEPT

# Connexions établies
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Anti-bruteforce SSH
iptables -N SSH_CHECK
iptables -A INPUT -p tcp --dport 22 -j SSH_CHECK
iptables -A SSH_CHECK -m recent --set --name SSH
iptables -A SSH_CHECK -m recent --update --seconds 60 --hitcount 4 --name SSH -j DROP
iptables -A SSH_CHECK -j ACCEPT

# WireGuard
iptables -A INPUT -p udp --dport 51820 -j ACCEPT

# Trafic interne WireGuard (Accès PBS via 10.x.x.x)
iptables -A INPUT -i wg0 -j ACCEPT

# ICMP (ping et traceroute)
iptables -A INPUT -p icmp --icmp-type echo-request -j ACCEPT

# Sauvegarder
netfilter-persistent save
```

**Explications** :
- **SSH_CHECK** : Limite à 4 tentatives SSH par minute par IP
- **WireGuard port 51820** : Requis pour le tunnel VPN
- **wg0 accept** : Règle temporaire, sera verrouillée plus tard
- **Loopback** : Permet l'accès à PBS via tunnel SSH

Redémarrer le VPS pour valider la configuration :
```bash
reboot
```

### Accès via tunnel SSH

Maintenant que le port 8007 n'est plus exposé publiquement, l'accès se fait via tunnel SSH :

```bash
ssh -L 8007:localhost:8007 root@<IP_VPS>
```

L'interface PBS est accessible sur **https://localhost:8007**

![Dashboard PBS distant](/img/homelab-actuel/pbs-instances/vps_01_dashboard.png)

Le dashboard montre l'instance PBS nommée **TellPBS**, accessible via le tunnel SSH.

### Configuration WireGuard

WireGuard établit un tunnel VPN chiffré entre le PBS local et le VPS, permettant au VPS de tirer les sauvegardes de manière sécurisée.

#### Topologie réseau

- **Réseau WireGuard** : `10.200.0.0/24`
- **VPS (serveur)** : `10.200.0.1/24`
- **PBS homelab (client)** : `10.200.0.2/24`

Le VPS est le serveur WireGuard, le PBS local est le client qui initie la connexion.

#### Installation

Sur les deux nœuds :
```bash
apt update
apt install wireguard -y
```

#### Configuration sur le VPS

Génération des clés :
```bash
cd /etc/wireguard
umask 077
wg genkey | tee vps-private.key | wg pubkey > vps-public.key

echo "Private key VPS:"
cat vps-private.key
echo "Public key VPS:"
cat vps-public.key
```

Créer `/etc/wireguard/wg0.conf` :
```ini
[Interface]
Address = 10.200.0.1/24
PrivateKey = <CLE_PRIVEE_VPS>
ListenPort = 51820

[Peer]
PublicKey = <CLE_PUBLIQUE_PBS_LOCAL>
AllowedIPs = 10.200.0.2/32
PersistentKeepalive = 10
```

#### Configuration sur le PBS local

Génération des clés :
```bash
cd /etc/wireguard
umask 077
wg genkey | tee pbs-private.key | wg pubkey > pbs-public.key

echo "Private key PBS:"
cat pbs-private.key
echo "Public key PBS:"
cat pbs-public.key
```

Créer `/etc/wireguard/wg0.conf` :
```ini
[Interface]
Address = 10.200.0.2/24
PrivateKey = <CLE_PRIVEE_PBS_LOCAL>

[Peer]
PublicKey = <CLE_PUBLIQUE_VPS>
Endpoint = <IP_PUBLIQUE_VPS>:51820
AllowedIPs = 10.200.0.1/32
PersistentKeepalive = 10
```

#### Activation du tunnel

**Sur le VPS** :
```bash
systemctl enable wg-quick@wg0
systemctl start wg-quick@wg0
systemctl status wg-quick@wg0
wg show
```

**Sur le PBS local** :
```bash
systemctl enable wg-quick@wg0
systemctl start wg-quick@wg0
systemctl status wg-quick@wg0
wg show
```

#### Tests de connectivité

**Depuis le PBS local** :
```bash
ping 10.200.0.1
curl -k https://10.200.0.1:8007
```

**Résultat attendu** : Ping réussi (~97ms de latence), réponse HTTP du PBS distant.

**Depuis le VPS** :
```bash
ping 10.200.0.2
curl -k https://10.200.0.2:8007
```

**Résultat attendu** : Ping réussi, réponse HTTP du PBS local.

Si les deux tests fonctionnent, le tunnel WireGuard est opérationnel.

### Verrouillage du tunnel WireGuard

Par défaut, la règle `iptables -A INPUT -i wg0 -j ACCEPT` autorise tout le trafic sur le tunnel. Il faut appliquer le **principe du moindre privilège**.

#### Flux réseau nécessaires

C'est le PBS du VPS qui pull les sauvegardes, donc seul le trafic **initié par le VPS** est nécessaire :

- **VPS → PBS local** : Port 8007/TCP (pull des backups)
- **Bidirectionnel** : ICMP (ping/debug)
- **Bidirectionnel** : Connexions établies (réponses aux requêtes initiées)

Le PBS local ne doit **pas pouvoir accéder** au PBS distant : si le homelab est compromis, l'attaquant ne pourra pas modifier ou détruire les sauvegardes offsite.

#### Pare-feu sur le VPS

```bash
# Supprimer la règle générique wg0
iptables -D INPUT -i wg0 -j ACCEPT

# Connexions établies
iptables -A INPUT -i wg0 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# ICMP ping uniquement
iptables -A INPUT -i wg0 -s 10.200.0.2 -p icmp --icmp-type echo-request -j ACCEPT

# Bloquer tout le reste sur wg0
iptables -A INPUT -i wg0 -j DROP

# Sauvegarder
netfilter-persistent save
```

#### Pare-feu sur le PBS local (nftables)

Créer `/etc/nftables.conf` :
```nft
#!/usr/sbin/nft -f

flush ruleset

table inet filter {
    chain input {
        type filter hook input priority filter; policy drop;

        # Loopback
        iif lo accept

        # Connexions établies
        ct state established,related accept

        # Rejeter paquets invalides
        ct state invalid drop

        # Administration depuis homelab
        ip saddr { 192.168.100.0/24, 192.168.10.0/24 } tcp dport { 22, 8007 } accept

        # WireGuard : VPS peut accéder au port 8007
        iifname "wg0" ip saddr 10.200.0.1 tcp dport 8007 accept
        iifname "wg0" ip saddr 10.200.0.1 icmp type echo-request accept

        # Bloquer le reste sur wg0
        iifname "wg0" drop
    }

    chain forward {
        type filter hook forward priority filter; policy drop;
    }

    chain output {
        type filter hook output priority filter; policy accept;
    }
}
```

Appliquer la configuration :
```bash
systemctl enable nftables
systemctl start nftables
```

#### Validation de la sécurité

**Test depuis le VPS** (doit fonctionner) :
```bash
ping 10.200.0.2        # ✅ Succès
curl -k https://10.200.0.2:8007  # ✅ Succès
```

**Test depuis le PBS local** (doit échouer) :
```bash
ping 10.200.0.1        # ✅ Succès (ICMP autorisé)
curl -k https://10.200.0.1:8007  # ❌ Timeout (aucune réponse)
```

**Résultat attendu** : Le PBS local peut ping le VPS, mais **ne peut pas** accéder à l'interface web. C'est le comportement voulu : si le homelab est compromis, l'attaquant ne peut pas accéder au PBS distant.

### Configuration PBS distant

#### Création de l'utilisateur local

![Création utilisateur et permissions](/img/homelab-actuel/pbs-instances/vps_02_creation_user_permission.png)

**Configuration** :
- **Utilisateur** : `remote@pbs`
- **Chemin** : `/datastore/remote-backup`
- **Rôle** : `DatastoreBackup`

Cet utilisateur gérera les sauvegardes synchronisées depuis le homelab.

#### Création du Datastore

![Création datastore](/img/homelab-actuel/pbs-instances/vps_03_creation_datastore.png)

**Paramètres** :
- **Name** : `remote-backup`
- **Backing Path** : `/mnt/hdd`
- **GC Schedule** : `Mon 03:00` (Garbage Collection le lundi à 3h)
- **Prune Schedule** : `none` (géré par un Prune Job séparé)

Le datastore stocke les sauvegardes synchronisées.

#### Ajout du Remote

![Ajout remote homelab](/img/homelab-actuel/pbs-instances/vps_04_ajout_remote_homelab.png)

**Menu** : Configuration → Remote → Add

**Paramètres** :
- **Remote ID** : `homelab-pbs`
- **Host** : `10.200.0.2` (IP WireGuard du PBS local)
- **Auth ID** : `remote@pbs`
- **Password** : Mot de passe de `remote@pbs`
- **Fingerprint** : Fingerprint du certificat SSL du PBS local

Le Remote définit la source depuis laquelle tirer les sauvegardes. L'utilisateur `remote@pbs` a le rôle `DatastoreReader` sur le PBS local, suffisant pour lire les sauvegardes sans pouvoir les modifier.

#### Configuration du Sync Job

![Sync Job - Options](/img/homelab-actuel/pbs-instances/vps_05_creation_sync_job_options.png)

**Menu** : Configuration → Sync Jobs → Add

**Paramètres obligatoires** :
- **Local Datastore** : `remote-backup`
- **Local Namespace** : `Root`
- **Local Owner** : `remote@pbs`
- **Source Remote** : `homelab-pbs`
- **Source Datastore** : `nfs-storage`
- **Source Namespace** : `Root`
- **Sync Schedule** : `Sun 01:00` (dimanche à 1h du matin)
- **Remove Vanished** : ✅ Coché (supprime les backups supprimés sur la source)

![Sync Job - Sécurité](/img/homelab-actuel/pbs-instances/vps_06_creation_sync_job_security.png)

**Paramètres de sécurité (CRITIQUES)** :
- **Transfer Last** : `1` (ne transfère que la dernière sauvegarde par VM)
- **Encrypted Only** : ✅ Coché (refuse les sauvegardes non chiffrées)
- **Verified Only** : ✅ Coché (refuse les sauvegardes non vérifiées)
- **Re-sync Corrupt** : ✅ Coché (re-synchronise automatiquement si corruption détectée)

Ces paramètres garantissent que :
- Seules les sauvegardes chiffrées sont acceptées (pas de confiance envers le VPS pour la confidentialité)
- Seules les sauvegardes vérifiées sont acceptées (garantie d'intégrité)
- La synchronisation est limitée à la dernière sauvegarde (économie de bande passante)

#### Configuration du Prune Job

![Prune Job](/img/homelab-actuel/pbs-instances/vps_07_creation_prune_job.png)

**Menu** : Datastore → remote-backup → Prune & GC → Add

**Paramètres** :
- **Schedule** : `Mon 02:00` (lundi à 2h, après le sync du dimanche)
- **Keep Weekly** : `26` (garde 26 sauvegardes hebdomadaires ≈ 6 mois)
- **Namespace** : `/`

**Commentaire** : "Garde une backup par semaine sur les 6 derniers mois"

Le Garbage Collector nettoie automatiquement l'espace à `Mon 03:00`.

#### Configuration du Verify Job

![Verify Job](/img/homelab-actuel/pbs-instances/vps_08_creation_verify_job.png)

**Menu** : Datastore → remote-backup → Verify Jobs → Add

**Paramètres** :
- **Datastore** : `remote-backup`
- **Schedule** : `Tue 02:00` (tous les mardis à 2h)
- **Skip Verified** : ❌ Désactivé (vérifie toutes les sauvegardes à chaque fois)

Le Verify Job garantit l'intégrité des sauvegardes en recalculant les checksums.

### Configuration des notifications

#### Notification échec Sync

![Notification échec sync](/img/homelab-actuel/pbs-instances/vps_09_notification_echec_sync.png)

**Configuration** :
- **Match severity** : `error`
- **Match field** : `type=sync`

Alerte immédiate en cas d'échec de synchronisation.

#### Notification échec Verify

![Notification échec verify](/img/homelab-actuel/pbs-instances/vps_10_notification_echec_verify.png)

**Configuration** :
- **Match severity** : `error`
- **Match field** : `type=verify`

Alerte immédiate en cas d'échec de vérification (corruption de données).

### Test de la synchronisation

![Test Sync Job](/img/homelab-actuel/pbs-instances/vps_11_test_sync_job.png)

**Menu** : Configuration → Sync Jobs → Sélectionner le job → Run Now

Le premier sync prendra du temps (transfert complet), mais grâce à la **déduplication** de PBS, les prochaines synchronisations seront beaucoup plus rapides.

Le log indique une synchronisation réussie.

### Supervision Zabbix

![Configuration Zabbix](/img/homelab-actuel/pbs-instances/vps_12_configuration_zabbix.png)

Pour surveiller le PBS distant, un agent Zabbix est configuré en mode actif.

**Configuration de l'agent** (`/etc/zabbix/zabbix_agent2.conf`) :
```ini
Hostname=PBS-remote
ServerActive=141.253.114.252:10051
ListenIP=127.0.0.1
# Server= est commenté (désactivé)
```

**Configuration dans Zabbix** :
- **Host name** : `PBS-remote`
- **Template** : `Linux by Zabbix agent active`
- **IP** : `127.0.0.1`
- **Port** : `10050`

L'agent contacte le serveur Zabbix via le tunnel WireGuard et remonte les métriques système (CPU, RAM, disque, etc.).

## Flux de sauvegarde complet

### Timeline hebdomadaire

**Toutes les 6 heures** :
- Proxmox VE sauvegarde les VMs vers PBS local (chiffrement client)

**Dimanche 01:00** :
- PBS distant tire (pull) la dernière sauvegarde de chaque VM via WireGuard

**Lundi 02:00** :
- Prune Job supprime les anciennes sauvegardes (garde 26 semaines)

**Lundi 03:00** :
- Garbage Collector récupère l'espace disque libéré

**Mardi 02:00** :
- Verify Job vérifie l'intégrité de toutes les sauvegardes

### Chaîne de sécurité

1. **Chiffrement à la source** : La clé de chiffrement ne quitte jamais Proxmox VE
2. **Transit sécurisé** : WireGuard chiffre le tunnel entre PBS local et distant
3. **Lecture seule depuis le VPS** : Le VPS peut uniquement lire les sauvegardes, jamais les modifier à la source
4. **Principe du moindre privilège** : Seul le port 8007 du PBS local est accessible depuis le VPS
5. **Isolation réseau** : Le homelab ne peut pas accéder au PBS distant

## Avantages de cette architecture

### Résilience

- **Sauvegarde locale** : Restauration rapide des VMs (haute disponibilité)
- **Sauvegarde offsite** : Protection contre sinistre majeur (incendie, vol, inondation)
- **Rétention longue** : 6 mois d'historique sur le VPS

### Sécurité

- **Chiffrement end-to-end** : Aucune confiance envers le VPS pour la confidentialité
- **Protection contre compromission** : Le homelab ne peut pas accéder au PBS distant, empêchant la destruction des sauvegardes offsite
- **Accès en lecture seule** : Le VPS peut lire mais pas modifier les sauvegardes sources
- **Pare-feu strict** : Surface d'attaque minimale sur le tunnel WireGuard
- **Vérification automatique** : Détection précoce de la corruption

### Automatisation

- **Sauvegardes automatiques** : 4 fois par jour
- **Synchronisation hebdomadaire** : Bande passante économisée
- **Purge automatique** : Gestion de l'espace disque
- **Notifications** : Alertes en cas de problème

## Ressources

- [Documentation officielle Proxmox Backup Server](https://pbs.proxmox.com/docs/)
- [Proxmox VE Backup and Restore](https://pve.proxmox.com/wiki/Backup_and_Restore)
- [WireGuard Documentation](https://www.wireguard.com/quickstart/)
- [3-2-1 Backup Strategy](https://www.backblaze.com/blog/the-3-2-1-backup-strategy/)
