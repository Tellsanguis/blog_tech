---
sidebar_position: 7
---

# Configuration d'équipements Cisco

## Contexte

Configuration complète d'une infrastructure réseau Cisco : VLANs, ACLs, agrégation de liens, NAT/PAT et adressage IPv6.

## Objectifs

- Configurer des VLANs et le routage inter-VLAN
- Mettre en place des ACLs pour le filtrage du trafic
- Configurer l'agrégation de liens (EtherChannel)
- Implémenter NAT/PAT pour l'accès Internet
- Déployer l'adressage IPv6 en dual-stack

## Technologies utilisées

- **Cisco IOS** : système d'exploitation des équipements
- **VLAN / Trunk** : segmentation réseau
- **ACL** : listes de contrôle d'accès
- **EtherChannel (LACP)** : agrégation de liens
- **NAT/PAT** : translation d'adresses
- **IPv6** : adressage nouvelle génération
- **Packet Tracer** : simulation réseau

## Configuration exemple - ACL

```cisco
ip access-list extended VLAN10_TO_SERVERS
 permit tcp 10.0.10.0 0.0.0.255 host 10.0.20.10 eq 80
 permit tcp 10.0.10.0 0.0.0.255 host 10.0.20.10 eq 443
 permit icmp 10.0.10.0 0.0.0.255 10.0.20.0 0.0.0.255
 deny ip any any log
```

## Livrables

<details>
<summary>Documentation configuration (PDF)</summary>

<iframe src="/assets/projets-oc/p07/bene_mael_1_config_equipements_052025.pdf" width="100%" height="600px" style={{border: 'none'}}></iframe>

</details>

<details>
<summary>Maquette Packet Tracer</summary>

Fichier de simulation réseau Cisco Packet Tracer (.pkt).

[Télécharger la maquette Packet Tracer](/assets/projets-oc/p07/bene_mael_2_maquette_packet_tracer_052025.pkt)

</details>

<details>
<summary>Préconisations (PDF)</summary>

<iframe src="/assets/projets-oc/p07/bene_mael_3_preconisations_052025.pdf" width="100%" height="600px" style={{border: 'none'}}></iframe>

</details>

## Compétences acquises

- Configuration avancée d'équipements Cisco
- Conception et implémentation de VLANs
- Rédaction et application d'ACLs
- Configuration de l'agrégation de liens
- Maîtrise du NAT/PAT et de l'IPv6
