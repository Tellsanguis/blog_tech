---
sidebar_position: 3
title: Tunnels GREtap pour VLANs
tags: [openwrt, gretap, vlan, reseau, tunnels]
---

# Tunnels GREtap pour VLANs à travers le mesh

Ce guide explique comment étendre des VLANs à travers le backhaul WiFi mesh en utilisant des tunnels GREtap.

## Prérequis

- Backhaul WiFi mesh configuré selon le [guide précédent](./backhaul-wifi-mesh.md)
- Les deux routeurs doivent pouvoir communiquer via l'interface mesh
- Accès à l'interface LuCI sur les deux routeurs

## Pourquoi GREtap plutôt que BATMAN-adv ?

Pour un réseau mesh composé de **seulement deux routeurs**, GREtap est préférable à BATMAN-adv pour plusieurs raisons :

### Avantages de GREtap dans ce scénario

1. **Point-à-point suffisant** : Avec deux routeurs, un tunnel point-à-point simple est suffisant. BATMAN-adv est conçu pour des topologies mesh complexes avec de nombreux nœuds et chemins redondants.

2. **Moins d'overhead** : GREtap a un overhead de protocole plus faible que BATMAN-adv. Avec seulement deux nœuds, les fonctionnalités avancées de routage mesh de BATMAN ne sont pas nécessaires.

3. **Simplicité de configuration** : GREtap est plus simple à configurer et à déboguer. Pas besoin de gérer les tables de routage mesh, les métriques de chemin, ou les algorithmes de sélection de route.

4. **Prévisibilité** : Le trafic emprunte toujours le même chemin (le tunnel direct). Pas de changements dynamiques de route.

5. **Support natif** : GREtap est largement supporté et documenté dans OpenWRT sans nécessiter de modules kernel additionnels complexes.

:::info BATMAN-adv : quand l'utiliser ?
BATMAN-adv devient intéressant quand vous avez :
- 3 nœuds mesh ou plus
- Plusieurs chemins possibles entre nœuds
- Besoin de redondance et de basculement automatique
- Topologie mesh dynamique avec nœuds mobiles
:::

## Installation des packages requis

Installez le package nécessaire sur **les deux routeurs** :

```bash
opkg update
opkg install luci-proto-gre
```

Ou via l'interface LuCI : **System → Software**, recherchez et installez `luci-proto-gre`.

## Configuration du tunnel GREtap

### Étape 1 : Créer l'interface GREtap

Sur **les deux routeurs**, créez une nouvelle interface GREtap :

1. Accédez à **Network → Interfaces → Add new interface**
2. Configurez les paramètres de base

**Paramètres de base** :
- **Name** : nom court (exemple : `gr`)
- **Protocol** : GRETAP (Ethernet over GRE)

:::danger Limitation de longueur des noms d'interface
OpenWRT créé automatiquement l'interface avec le préfixe `gretap-`. Par exemple, si vous nommez votre interface `trunk`, OpenWRT créera `gretap-trunk`.

**Problème** : Pour faire passer des VLANs, la notation sera `gretap-trunk.100`, ce qui fait **16 caractères** et dépasse la limite !

**Exemple problématique** :
- Interface nommée `trunk` → Device créé : `gretap-trunk` (13 caractères)
- VLAN 100 → `gretap-trunk.100` (16 caractères) ❌ **TROP LONG**

**Solution** : Utilisez un nom **très court** comme `gr`, `t`, ou `g`.
- Interface nommée `gr` → Device créé : `gretap-gr` (9 caractères)
- VLAN 100 → `gretap-gr.100` (13 caractères) ✅ **OK**

:::

:::info Origine de cette limitation
Les noms d'interface réseau sous Linux sont stockés dans une structure qui utilise un tableau de 16 octets. Ce tableau inclut le terminateur nul `\0`, donc la longueur maximale d'un nom d'interface réseau est de **15 caractères** (16 - 1 = 15).
:::

**Paramètres du tunnel (General Settings)** :
- **Remote IPv4 address or FQDN** : IP de l'autre routeur sur l'interface mesh
- **Local IPv4 address** : IP de ce routeur sur l'interface mesh

![Configuration interface GREtap](/img/openwrt/interface-gretap.png)

**Options avancées (Advanced Settings)** :

Il est important de configurer les options avancées correctement :

- ⬜ **Use TTL on tunnel interface** : laisser décoché
- ⬜ **Use PMTU discovery** : laisser décoché (équivalent à **Don't fragment**)
- ⬜ **Default gateway** : DÉCOCHER cette option (important !)
- **Bind interface** : sélectionner l'interface mesh (par exemple `lan`)

![Configuration paramètres avancés GREtap](/img/openwrt/interface_gretap_parametresavance.png)

:::tip Pourquoi décocher ces options ?
- **PMTU discovery / Don't fragment** : Le trafic WiFi mesh peut nécessiter de la fragmentation. Autoriser la fragmentation évite les pertes de paquets.
- **Default gateway** : Le tunnel GREtap ne doit pas devenir la passerelle par défaut du routeur.
:::

## Extension des VLANs à travers le tunnel

### Principe

Pour faire passer un VLAN à travers le tunnel GREtap, il faut créer un **bridge device** qui contient :
- Le port physique ou l'interface VLAN locale
- Le port GREtap VLAN correspondant

La notation utilisée pour un port GREtap VLAN est : `@<nom_device_gretap>.<numero_vlan>`

**Exemple** : Pour le VLAN 100 avec un tunnel nommé `gr` (device : `gretap-gr`) → `@gretap-gr.100`

### Configuration sur le routeur principal

#### Étape 1 : Créer le bridge device pour le VLAN

1. Accédez à **Network → Interfaces → Devices → Add device configuration**
2. Créez un **Bridge device** :

**Configuration du bridge** :
- **Device type** : Bridge device
- **Device name** : `br-lab` (ou nom descriptif pour votre VLAN)
- **Bridge ports** : Ajouter les ports suivants :
  - Le port physique ou VLAN local (exemple : `lan3` pour un port physique)
  - Le port GREtap VLAN : `@gretap-gr.100` (adapter selon votre device et numéro VLAN)

![Bridge device avec port GREtap](/img/openwrt/bridge_device_lab_avec_port_gretap.png)

#### Étape 2 : Créer l'interface réseau pour le VLAN

1. **Network → Interfaces → Add new interface**
2. Configurez l'interface :

**Paramètres (General Settings)** :
- **Name** : `LAB` (ou nom descriptif)
- **Protocol** : Static address
- **Device** : Sélectionner le bridge créé précédemment (`br-lab`)
- **IPv4 address** : L'adresse IP de ce routeur sur le VLAN (exemple : `192.168.100.1`)
- **IPv4 netmask** : Le masque du VLAN (exemple : `255.255.255.0`)

![Interface VLAN avec bridge en device](/img/openwrt/interface_vlan_lab_avec_bridge_en_device.png)

**Serveur DHCP (DHCP Server)** :

Configurez le serveur DHCP pour ce VLAN afin de distribuer des IPs aux clients :

![Configuration DHCP du VLAN](/img/openwrt/interface_vlan_lab_dhcp_sur_routeur_maitre.png)

**Firewall Settings** :

Assignez l'interface à une zone firewall appropriée (exemple : `homelab_zone` ou créer une nouvelle zone) :

![Configuration firewall zone](/img/openwrt/interface_vlan_lab_firewallzone.png)

:::tip Static DHCP Leases
Une fois que le Dumb AP récupère une IP via DHCP sur ce VLAN, vous pouvez configurer un **static DHCP lease** pour lui assigner une IP fixe.

Exemple : mettre le Dumb AP à l'IP `.2` sur chaque VLAN pour une configuration cohérente (exemple : `192.168.100.2`).
:::

Répétez cette configuration pour chaque VLAN à étendre à travers le tunnel.

### Configuration sur le Dumb AP

Sur le second routeur (Dumb AP), les interfaces VLAN doivent être configurées en **DHCP client** pour récupérer automatiquement une IP sur chaque VLAN.

1. **Network → Interfaces → Add new interface**
2. Configurez l'interface :
   - **Name** : `vlan100` (ou nom descriptif)
   - **Protocol** : DHCP client
   - **Device** : `@gretap-gr.100` (le port GREtap VLAN)

Le Dumb AP récupérera automatiquement une adresse IP du serveur DHCP du routeur principal sur ce VLAN.

### Exemple de configuration multi-VLAN

**Configuration typique** :
- VLAN 10 (Management) → `@gretap-gr.10`
- VLAN 100 (Homelab) → `@gretap-gr.100`
- VLAN 200 (IoT) → `@gretap-gr.200`

Chaque VLAN traverse le tunnel GREtap de manière transparente et isolée.

## Vérification et tests

### Tests de connectivité

Depuis le Dumb AP, testez la connectivité sur chaque VLAN :

```bash
# Ping vers la passerelle du VLAN 100
ping -I vlan100 192.168.100.1

# Vérifier l'obtention d'une IP via DHCP
ip addr show dev gretap-gr.100
```

Depuis le routeur principal, vérifiez que le Dumb AP apparaît dans les baux DHCP :

- **Network → Interfaces → LAB → DHCP Server → Active DHCP Leases**

## Conclusion

Avec GREtap, vous pouvez étendre efficacement vos VLANs à travers un backhaul WiFi mesh entre deux routeurs OpenWRT. Cette solution offre un bon compromis entre simplicité, performance et fonctionnalité pour des topologies point-à-point.

Pour des réseaux mesh plus complexes avec 3 nœuds ou plus, considérez l'utilisation de BATMAN-adv qui offre des fonctionnalités de routage mesh plus avancées.
