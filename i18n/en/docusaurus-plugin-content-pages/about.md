# About

Systems and network administrator specialized in **cross-platform automation** (Ansible/PowerShell/Bash), **virtualization & containerization** (Proxmox/Docker), and **Active Directory**. RNCP Level 6 certified by OpenClassrooms, with a first professional experience in an **industrial SME**: security audit, network segmentation, and deployment of a **GitOps** infrastructure. Production homelab for continuous R&D.

---

## Current Role: Systems and Network Administrator

Since April 2026, I've been working on the information system of an industrial SME (Imprimerie Corlet, Condé-en-Normandie), within a 6-person IT team:

- **Security audit** and complete IS mapping, with risk prioritization adapted to the constraints of continuous production.
- **Immediate hardening without production downtime**: Active Directory hardening (disabling NTLMv1, Protected Users), Wi-Fi isolation, software updates.
- **M365 administration**: Exchange Online and Entra ID, centralized SSO across all internal services.
- **Target architecture design**: VLAN segmentation, internal PKI, high-availability DNS, Git forge, centralized secrets management, secure remote access.
- **GitOps platform** of about ten services (rootless containers, pull-based Ansible deployment triggered by signed tags): documentation becomes a mandatory step before any production rollout. Automated VM patch management: snapshots, updates, rollback, healthchecks.
- **Lab-validated bastion**: ephemeral SSH certificates backed by Entra ID, session recording, restricted remote access.

Some aspects of this experience are documented in the [recent blog posts](/blog).

## The Beginnings

It all started as a simple hobby with the first **Minecraft servers** in 2013: custom game launcher, configuration file management, first scripts in Bash then Python around 2015.

In 2017, I created my first homelab with a **Raspberry Pi** that I used for various projects:
- Bluetooth, AirPlay, UPnP audio server
- Retro video game console
- WOL relay (to wake up my PC from outside my local network)
- VPN server
- DNS server / PiHole

## Discovering Self-Hosting

Initially, I was motivated by the desire to test and experiment: see if I could access my files or services remotely. Then came the practical aspect and the desire to keep my data on my own machines.

It was around **2020** that I discovered **Docker**. My first server was very simple: a few `docker run` commands with **Nginx Proxy Manager** and admin access via **WireGuard**.

Later, I deepened my knowledge:
- Transition to **Docker Compose** files
- Network concepts: subnets, VLANs, ACLs
- Transition from bare metal to **virtualization**

## Professional Reconversion

Before IT, I followed a path in **Literature**: bachelor's degree at the University of Caen, then contract French teacher in National Education for sophomore, junior STMG, and BTS classes.

In parallel, I worked as a civic service coordinator in health prevention at LMDE, and BAFA animator for several years.

After a period of travel and seasonal work, I decided to turn what had been a passionate hobby into my profession: making systems and network administration my career. In **November 2024**, I joined the **Systems, Networks and Security Administrator** training at **OpenClassrooms**.

## OpenClassrooms Training

This training, sanctioned by an **RNCP Level 6 certification** (equivalent to Bachelor's degree), allowed me to formalize and deepen my skills through **12 technical projects** covering the entire SysAdmin/DevOps spectrum:

- **ITSM Management**: GLPI ticketing, ITIL methodology
- **Network Architecture**: multi-VLAN LAN design, firewalls, addressing plans
- **Containerization**: deployment of n-tier architectures with Docker
- **Security**: Apache hardening, Fail2ban, SSL certificates, encrypted FTP
- **Windows Infrastructure**: site-to-site VPN, Active Directory, RODC, GPO
- **Cisco Networking**: VLAN, ACL, EtherChannel, NAT/PAT, IPv6
- **Monitoring**: Nagios, custom probes, syslog centralization
- **Automation**: cross-platform Ansible, GLPI integration
- **Backups**: Bash rsync scripts (FULL/INC/DIFF), DRP
- **Compliance**: application of ANSSI guidelines for healthcare IS
- **Offensive Security**: Active Directory audit, pentesting (nmap, Mimikatz, Kerberoasting)
- **Cloud**: AWS migration, technical architecture, cost estimation

I obtained my certification ahead of schedule on **November 6, 2025**, after less than a year of training.

Details of each project are available in the [OpenClassrooms Projects](/docs/projets-openclassrooms) section.

## The Homelab Today

The homelab remains my continuous R&D playground, alongside work:

- **Proxmox HA** cluster with 3 nodes, 40+ containerized services via Docker Compose. High availability proven in a real outage: automatic failover in under a minute, zero interruption.
- **100% automated** deployment via **Ansible**, public playbooks on [forgejo.tellserv.fr](https://forgejo.tellserv.fr/Tellsanguis/Homelab).
- **OPNsense** network segmented VLAN/VXLAN, **zero trust** principles, Traefik reverse proxy (automatic TLS).
- HA storage with **Linstor DRBD** + replicated **ZFS**, offsite Zabbix monitoring.

Currently learning: **Kubernetes** (K3s/Talos) and **OpenTofu**, targeting a future three-machine Proxmox cluster (two production machines and a witness for quorum). The old architecture remains deployed in parallel to ensure a smooth migration.
