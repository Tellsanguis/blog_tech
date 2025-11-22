---
sidebar_position: 7
---

# P7 - Cisco Equipment Configuration

## Context

Complete configuration of a Cisco network infrastructure: VLANs, ACLs, link aggregation, NAT/PAT and IPv6 addressing.

## Objectives

- Configure VLANs and inter-VLAN routing
- Implement ACLs for traffic filtering
- Configure link aggregation (EtherChannel)
- Implement NAT/PAT for Internet access
- Deploy dual-stack IPv6 addressing

## Technologies Used

- **Cisco IOS**: equipment operating system
- **VLAN / Trunk**: network segmentation
- **ACL**: Access Control Lists
- **EtherChannel (LACP)**: link aggregation
- **NAT/PAT**: address translation
- **IPv6**: next-generation addressing
- **Packet Tracer**: network simulation

## Configuration Example - ACL

```cisco
ip access-list extended VLAN10_TO_SERVERS
 permit tcp 10.0.10.0 0.0.0.255 host 10.0.20.10 eq 80
 permit tcp 10.0.10.0 0.0.0.255 host 10.0.20.10 eq 443
 permit icmp 10.0.10.0 0.0.0.255 10.0.20.0 0.0.0.255
 deny ip any any log
```

## Deliverables

<details>
<summary>Configuration Documentation (PDF)</summary>

<iframe src="/assets/projets-oc/p07/bene_mael_1_config_equipements_052025.pdf" width="100%" height="600px" style={{border: 'none'}}></iframe>

</details>

<details>
<summary>Packet Tracer Lab</summary>

Cisco Packet Tracer network simulation file (.pkt).

[Download Packet Tracer lab](/assets/projets-oc/p07/bene_mael_2_maquette_packet_tracer_052025.pkt)

</details>

<details>
<summary>Recommendations (PDF)</summary>

<iframe src="/assets/projets-oc/p07/bene_mael_3_preconisations_052025.pdf" width="100%" height="600px" style={{border: 'none'}}></iframe>

</details>

## Skills Acquired

- Advanced Cisco equipment configuration
- VLAN design and implementation
- ACL writing and application
- Link aggregation configuration
- NAT/PAT and IPv6 mastery
