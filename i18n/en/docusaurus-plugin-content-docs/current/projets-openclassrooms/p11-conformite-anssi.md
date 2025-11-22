---
sidebar_position: 11
---

# ANSSI Compliance for Healthcare IS

## Context

Application of ANSSI (French National Cybersecurity Agency) recommendations for securing OpenPharma's information system: mapping, secure administration and evolution budget.

## Objectives

- Analyze and synthesize applicable ANSSI guidelines
- Produce the existing IS mapping
- Propose a compliant target architecture
- Establish a hardware and software budget
- Plan the compliance project

## Applied ANSSI Guidelines

- **Information System Mapping** (v1b, 2018)
- **Secure IS Administration** (v3.0)

## Proposed Technologies and Solutions

| Need | Solution | Justification |
|------|----------|---------------|
| Administration bastion | Teleport | Open source, built-in audit |
| SIEM | Wazuh | Detection, compliance, free |
| Firewall | FortiGate 60F | UTM, manufacturer support |
| Backup | Synology RS822+ | Rack NAS, snapshots, replication |

## Deliverables

<details>
<summary>View deliverables</summary>

- [IS Mapping](/assets/projets-oc/p11/BENE_Mael_1_cartographie_092025.pdf)
- [Project Plan](/assets/projets-oc/p11/BENE_Mael_2_plan_projet_092025.pdf)
- [User and Administrator Documentation](/assets/projets-oc/p11/BENE_Mael_3_documentation_092025.pdf)

</details>

## Skills Acquired

- ANSSI framework analysis and application
- Information system mapping
- Secure architecture design
- IT budget development
- Compliance project management
- Sector-specific constraints consideration (healthcare)
