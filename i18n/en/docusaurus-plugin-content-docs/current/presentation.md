# About Me

Systems and network administrator specializing in **cross-platform automation** (Ansible/PowerShell/Bash), **virtualization & containerization** (Proxmox/Docker), and **Active Directory**. RNCP Level 6 certified through OpenClassrooms, with skills acquired through 12 technical projects covering enterprise networking, monitoring, backup/disaster recovery, and offensive security. Running a production homelab for continuous R&D.

---

## The Beginning

It all started as a simple hobby with my first **Minecraft servers** back in 2013: custom game launchers, configuration file management, and my first Bash scripts, followed by Python around 2015.

In 2017, I built my first homelab with a **Raspberry Pi** that I used for various projects:
- Bluetooth audio server, AirPlay, UPnP
- Retro gaming console
- WOL relay (to wake my PC outside my local network)
- VPN server
- DNS server / PiHole

## Discovering Self-Hosting

Initially, I was motivated by the desire to test and experiment: seeing if I could access my files or services remotely. Then came the practical aspect and the desire to keep my data on my own machines.

It was around **2020** that I discovered **Docker**. My first server was very simple: a few `docker run` commands with **Nginx Proxy Manager** and admin access via **WireGuard**.

Over time, I deepened my knowledge:
- Transitioning to **Docker Compose** files
- Networking concepts: subnets, VLANs, ACLs
- Moving from bare metal to **virtualization**

This led me to my current architecture: an Ubuntu server deployed under **Proxmox**, automated with **Ansible** and Docker Compose files.

## Career Change

Before IT, I pursued a path in **Literature**: a degree from the University of Caen, then working as a contract French teacher in the National Education system for sophomore, STMG junior, and vocational degree classes.

In parallel, I worked as a civic service coordinator in health prevention at LMDE, and as a BAFA-certified youth worker for several years.

After a period of travel and seasonal work, I decided to turn what had been a passionate hobby into my profession: making systems and network administration my career. In **November 2024**, I enrolled in the **Systems, Network, and Security Administrator** program at **OpenClassrooms**.

## The OpenClassrooms Program

This program, leading to an **RNCP Level 6 certification** (equivalent to a Bachelor's/Master's degree), allowed me to formalize and deepen my skills through **12 technical projects** covering the full SysAdmin/DevOps spectrum:

- **ITSM Management**: GLPI ticketing, ITIL methodology
- **Network Architecture**: multi-VLAN LAN design, firewalls, IP addressing plans
- **Containerization**: deploying n-tier architectures with Docker
- **Security Hardening**: Apache hardening, Fail2ban, SSL certificates, encrypted FTP
- **Windows Infrastructure**: site-to-site VPN, Active Directory, RODC, GPO
- **Cisco Networking**: VLAN, ACL, EtherChannel, NAT/PAT, IPv6
- **Monitoring**: Nagios, custom probes, syslog centralization
- **Automation**: cross-platform Ansible, GLPI integration
- **Backups**: Bash rsync scripts (FULL/INC/DIFF), disaster recovery planning
- **Compliance**: applying ANSSI guidelines for healthcare IT systems
- **Offensive Security**: Active Directory auditing, pentesting (nmap, Mimikatz, Kerberoasting)
- **Cloud**: AWS migration, technical architecture, cost estimation

I obtained my certification ahead of schedule on **November 6, 2025**, after less than a year of training.

Details for each project are available in the [OpenClassrooms Projects](/docs/projets-openclassrooms) section.

## Toward Infrastructure as Code and DevOps

The **Infrastructure as Code** aspect immediately appealed to me and led me to explore:
- The **DevOps** philosophy
- **Terraform** and its open-source counterpart **OpenTofu**
- **Git** and **CI/CD** pipelines
- **Kubernetes**
- Distributed storage and high availability

My current goal: a **three-node Proxmox cluster** (two production machines and one witness for quorum), after initially considering running all these tools on a single machine for cost reasons.

This architecture is currently being implemented in my [Homelab repository](https://forgejo.tellserv.fr/Tellsanguis/Homelab). The previous architecture remains deployed in parallel to ensure a smooth migration.
