---
sidebar_position: 2
title: Backhaul WiFi Mesh avec 802.11s
---

# Backhaul WiFi Mesh avec 802.11s

Ce guide explique comment créer un backhaul WiFi entre deux routeurs sous OpenWRT en utilisant le protocole 802.11s (mesh point).

## Objectif

Créer un lien WiFi mesh entre deux routeurs OpenWRT pour étendre le réseau sans câble Ethernet. Le second routeur sera configuré en "Dumb AP" et communiquera avec le routeur principal via un backhaul mesh sécurisé.

## Prérequis

- Deux routeurs avec OpenWRT installé
- Accès SSH ou interface web LuCI sur les deux routeurs
- Un routeur principal configuré (avec DHCP et firewall actifs)

## Étape 1 : Configuration du second routeur en Dumb AP

Le second routeur doit être transformé en "Dumb AP" (Access Point basique sans services réseau). Il existe un script automatique pour cette configuration, mais nous allons détailler la méthode manuelle via l'interface LuCI.

### Script automatique (optionnel)

Pour une configuration automatique, vous pouvez utiliser le script de **OneMarcFifty** disponible sur [GitHub - onemarcfifty/openwrt-mesh](https://github.com/onemarcfifty/openwrt-mesh).

### Configuration manuelle via LuCI

Il faut **désactiver** les services suivants sur le second routeur :

1. **Firewall** : **System → Startup** → Désactiver `firewall`
2. **DNS** : **Network → DHCP and DNS** → Décocher "DNS server"
3. **Serveur DHCP** : **Network → Interfaces → LAN → DHCP Server** → Cocher "Ignore interface"

Ces services ne sont pas nécessaires car le routeur principal gère la sécurité, le DNS et la distribution d'adresses IP.

### Configuration de l'interface LAN

Configurez l'interface LAN du second routeur pour qu'elle soit sur le **même subnet** que le routeur principal :

1. Accédez à **Network → Interfaces → LAN**
2. Configurez les paramètres suivants :
   - **Protocol** : DHCP client (recommandé) ou Static address
   - Si Static : **IPv4 address** : `.2` sur le subnet (exemple : si le routeur principal est en `192.168.1.1`, mettre `192.168.1.2`)

![Configuration DHCP de l'interface br-lan](/img/openwrt/interface_br-lan_dhcp.png)

:::tip Sauvegarde de configuration
Avant de modifier l'interface LAN, notez l'IP actuelle ou configurez une interface de secours pour pouvoir accéder au routeur en cas de problème.

![Interface de sauvegarde](/img/openwrt/sauvetage_interface.png)
:::

## Étape 2 : Configuration du réseau mesh 802.11s

Le protocole 802.11s permet de créer un réseau mesh WiFi natif. Les deux routeurs utiliseront ce protocole pour établir le backhaul.

### Paramètres du mesh

Les deux routeurs doivent avoir **exactement les mêmes paramètres** suivants :

1. **Mode WiFi** : Mesh Point
2. **Mesh ID** : identifiant unique pour votre mesh (même valeur sur les deux routeurs)
3. **Interface réseau** : créer une interface dédiée au mesh (exemple : `mesh0`)
4. **Sécurité** : WPA3-SAE (Personal) recommandé
5. **Mot de passe** : mot de passe fort et aléatoire

### Génération d'un mot de passe sécurisé

Utilisez cette commande pour générer un mot de passe fort aléatoire :

```bash
openssl rand -base64 32
```

Ou depuis OpenWRT :

```bash
dd if=/dev/urandom bs=1 count=32 2>/dev/null | base64
```

### Configuration via LuCI

1. Accédez à **Network → Wireless**
2. Sélectionnez l'interface WiFi à utiliser pour le mesh (généralement radio0 ou radio1)
3. Configurez les paramètres suivants :

![Configuration du backhaul WiFi mesh](/img/openwrt/config_backhaul_wifi.png)

**Paramètres essentiels** :
- **Mode** : Mesh Point (802.11s)
- **Mesh ID** : votre identifiant mesh (identique sur les deux routeurs)
- **Network** : créer ou sélectionner une interface réseau dédiée au mesh
- **Encryption** : WPA3-SAE
- **Key** : le mot de passe généré précédemment

:::warning Synchronisation des paramètres
Les deux routeurs doivent avoir **exactement** le même Mesh ID et le même mot de passe, sinon ils ne pourront pas établir la connexion mesh.
:::

### Interface réseau pour le mesh

Créez une interface réseau dédiée pour le mesh :
1. **Network → Interfaces → Add new interface**
2. **Name** : `mesh0` (ou tout autre nom descriptif)
3. **Protocol** : Static address ou DHCP client
4. **Device** : sélectionner le device mesh créé (généralement `mesh0`)

Cette interface servira de base pour le tunnel GREtap dans la partie suivante.

## Vérification

Après configuration, vérifiez que :
1. Le second routeur obtient une IP sur le même subnet que le routeur principal
2. Les deux routeurs peuvent se pinguer mutuellement
3. L'interface mesh est active et connectée (vérifiable dans **Network → Wireless**)
4. Le backhaul mesh est établi et stable

## Prochaine étape

Une fois le backhaul mesh configuré, vous pouvez passer à la [configuration GREtap pour étendre les VLANs](./gretap-vlan.md) à travers ce lien mesh.
