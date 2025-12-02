---
slug: ssh-freeze-mtu-mss-clamping
title: Freeze de session SSH, MTU et MSS clamping
authors: [tellserv]
tags: [openwrt, gretap, ssh, mtu, networking]
image: /img/blog/2025-12-02-ssh-freeze-mtu/freeze_session_ssh.png
---

<p align="center">
  <img src="/img/blog/2025-12-02-ssh-freeze-mtu/freeze_session_ssh.png" alt="Session SSH gelée" width="600" />
</p>

Après avoir déployé des tunnels GREtap pour étendre mes VLANs à travers mon mesh WiFi OpenWRT, j'ai rencontré un problème frustrant : mes sessions SSH se figeaient aléatoirement et nécessitaient un redémarrage complet. La cause ? Un problème classique de MTU et de fragmentation. Voici comment le MSS clamping a résolu le problème.

<!--truncate-->

## Le symptôme : sessions SSH qui gèlent

Le problème était particulièrement gênant lors de l'administration à distance :

- Les sessions SSH fonctionnaient normalement pendant quelques minutes
- Puis soudainement, la session se figeait complètement
- Aucun retour, aucune erreur, juste un terminal figé
- Impossible de taper quoi que ce soit, même Ctrl+C ne fonctionnait pas
- Seule solution : fermer le terminal et rouvrir une nouvelle connexion

![Session SSH gelée](/img/blog/2025-12-02-ssh-freeze-mtu/freeze_session_ssh.png)

*Les sessions SSH se figeaient sans message d'erreur.*

Ce comportement était intermittent mais systématique : toutes les sessions finissaient par geler après un certain temps d'utilisation.

## Comprendre le MTU et son impact

### Qu'est-ce que le MTU ?

Le **MTU (Maximum Transmission Unit)** représente la taille maximale d'un paquet réseau qui peut être transmis sans fragmentation. Sur Ethernet classique, le MTU standard est de **1500 octets**.

### Le problème avec les tunnels

Les protocoles de tunneling comme GREtap ajoutent des en-têtes supplémentaires à chaque paquet :

- **En-tête GRE** : 4 octets (protocole de tunnel)
- **En-tête IP externe** : 20 octets (pour le routage du tunnel)
- **En-tête Ethernet interne** : 14 octets (pour le trafic transporté)

**Total de l'overhead GREtap** : environ **38 octets**

Cela signifie que pour un paquet de **1500 octets** à transmettre :
- Taille réelle après encapsulation : **1538 octets**
- Dépassement du MTU Ethernet : **38 octets** de trop

### Le WiFi mesh aggrave le problème

Sur un backhaul WiFi mesh, le problème est encore plus marqué :

- Le WiFi mesh ajoute ses propres en-têtes
- La fragmentation WiFi est moins efficace que sur Ethernet filaire
- Les paquets trop grands peuvent être silencieusement abandonnés
- Résultat : connexions qui se figent sans message d'erreur

## Le diagnostic : problème de MTU confirmé

En utilisant `ping` avec l'option **Don't Fragment** (DF), on peut tester la taille maximale de paquet acceptée.

Sur l'interface GREtap configurée avec un MTU par défaut de **1280 octets** :

```bash
# Test avec un paquet de 1253 octets
ping -M do -s 1253 192.168.100.2
# Résultat : FAILED (100% packet loss, "message too long, mtu=1280")

# Test avec un paquet de 1252 octets
ping -M do -s 1252 192.168.100.2
# Résultat : SUCCESS (0% packet loss)
```

![Problème de MTU détecté](/img/blog/2025-12-02-ssh-freeze-mtu/probleme_de_mtu.png)

*Tests de ping montrant l'échec à 1253 octets et le succès à 1252 octets avec un MTU de 1280.*

Le test révèle que le MTU par défaut de **1280 octets** est trop restrictif. Les paquets légèrement plus grands sont fragmentés ou abandonnés, causant les freezes SSH.

## La solution : MSS clamping

### Qu'est-ce que le MSS clamping ?

Le **MSS (Maximum Segment Size)** est la taille maximale de données TCP dans un segment. Le **MSS clamping** est une technique qui modifie les paquets TCP SYN (établissement de connexion) pour annoncer une MSS plus petite.

Cela force les deux extrémités de la connexion à :
- Négocier une taille de segment TCP plus petite
- Éviter la fragmentation en amont
- Créer des paquets qui passent sans problème dans le tunnel

### Configuration dans OpenWRT

La configuration du MSS clamping se fait dans les paramètres avancés du firewall OpenWRT :

1. Accédez à **Network → Firewall**
2. Ouvrez l'onglet **Advanced Settings**
3. Activez **MSS clamping** pour les zones concernées

![Activation du MSS clamping](/img/blog/2025-12-02-ssh-freeze-mtu/activer_mss_clamping.png)

**Explication de l'option** :

- **MSS clamping** : Active le recalcul automatique du MSS basé sur le MTU de l'interface
- OpenWRT calculera automatiquement : `MSS = MTU - 40` (en-têtes TCP/IP)

## Tests de validation

Après avoir activé le MSS clamping et ajusté le MTU, j'ai effectué des tests pour confirmer que le problème est résolu.

### Tests avec hping3 et tcpdump

Pour valider le bon fonctionnement du MSS clamping, j'ai utilisé **hping3** pour envoyer des paquets TCP SYN et **tcpdump** pour capturer et vérifier que le MSS est bien modifié :

```bash
# Envoi de paquets TCP SYN avec hping3
hping3 -S -p 80 192.168.100.2

# Capture avec tcpdump pour vérifier le MSS clamping
tcpdump -i gretap-gr -nn 'tcp[tcpflags] & tcp-syn != 0'
```

![Tests fonctionnels validés](/img/blog/2025-12-02-ssh-freeze-mtu/test_fonctionnel.png)

*Capture tcpdump montrant le MSS clamping en action : les paquets avec MSS 1500 sont automatiquement modifiés pour utiliser MSS 1240.*

Les tests confirment que le MSS clamping fonctionne correctement et que les sessions SSH ne gèlent plus, même avec des transferts de données importants.

## Configuration manuelle du MTU

En complément du MSS clamping, j'ai aussi ajusté manuellement le MTU sur l'interface GREtap :

**Sur les deux routeurs** :

1. **Network → Interfaces → [Interface GREtap]**
2. **Advanced Settings** :
   - **Override MTU** : `1450` ou `1400`

Pourquoi ne pas utiliser le MTU théorique optimal de 1462 ?
- MTU WiFi mesh : 1500 octets
- Overhead GREtap : 38 octets
- MTU théorique optimal : 1500 - 38 = **1462 octets**

Cependant, j'ai choisi un MTU de **1450 ou 1400** pour avoir une **marge de sécurité**, notamment pour assurer la stabilité du mesh WiFi qui peut ajouter des en-têtes supplémentaires variables.

## Comprendre le MSS clamping en détail

Le MSS clamping fonctionne en modifiant les paquets **TCP SYN** lors de l'établissement de connexion :

1. **Client** envoie SYN avec MSS=1460 (valeur par défaut Ethernet)
2. **Routeur avec MSS clamping** intercepte le paquet
3. **Routeur** recalcule : MSS optimal = MTU interface - 40 = 1462 - 40 = **1422**
4. **Routeur** modifie le paquet SYN pour annoncer MSS=1422
5. **Serveur** répond avec MSS=1422 ou moins
6. **Résultat** : toute la connexion TCP utilisera des segments de maximum 1422 octets

Avec un MSS de 1422 octets :
- Taille du segment TCP : 1422 octets
- + En-tête TCP : 20 octets
- + En-tête IP : 20 octets
- **= Paquet IP total : 1462 octets**

Ce paquet de 1462 octets :
- Entre dans le tunnel GREtap
- + Overhead GREtap : 38 octets
- **= Paquet final : 1500 octets**

Le paquet final de 1500 octets passe parfaitement dans le MTU Ethernet de 1500 octets. Aucune fragmentation nécessaire.

## Conclusion

Le MSS clamping est une solution élégante pour résoudre les problèmes de MTU sur les tunnels :

- **Transparent** : fonctionne automatiquement sans configuration des clients
- **Efficace** : évite complètement la fragmentation
- **Performant** : aucun impact négatif sur les performances
- **Standard** : supporté par tous les routeurs et pare-feux modernes

Si vous déployez des tunnels GREtap (ou tout autre type de tunnel) sur votre infrastructure réseau, pensez à :
1. Calculer le MTU optimal en soustrayant l'overhead du protocole
2. Configurer le MTU manuellement sur les interfaces tunnel
3. Activer le MSS clamping dans votre firewall

Pour plus de détails sur la configuration complète des tunnels GREtap avec OpenWRT, consultez l'article complet : [Tunnels GREtap pour VLANs](/docs/openwrt/gretap-vlan).

Les sessions SSH sont maintenant stables, même sous charge. Plus aucun freeze. Mission accomplie.
