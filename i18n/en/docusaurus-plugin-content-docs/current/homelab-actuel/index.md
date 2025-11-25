---
sidebar_position: 1
---

# Current Homelab - Docker Compose & Ansible

Documentation of my current homelab infrastructure, based on Docker Compose and Ansible.

## Overview

My current homelab uses a simple and effective approach:
- **Docker Compose**: Container orchestration
- **Ansible**: Configuration and deployment automation
- **Self-hosted services**: Forgejo, monitoring, various applications

## Architecture

### Infrastructure Diagram

The diagram illustrates the complete architecture of my current homelab, including:
- Network infrastructure with the main server
- Deployed Docker services
- Traefik configuration for the reverse proxy (public and private instances)
- Connections between different components
- Local DNS configuration with dnsmasq

<details>
<summary>Current homelab architecture diagram (PDF - click to display)</summary>

<iframe src="/img/diagrams/homelab-actuel-infra.pdf" width="100%" height="600px" style={{border: 'none'}}></iframe>

</details>

### Physical/Virtual Infrastructure
- Ubuntu Server dedicated server
- Secure local network with local DNS (dnsmasq)
- Unified storage with MergerFS
- Firewall with firewalld

### Tech Stack
- **OS**: Linux (Ubuntu Server)
- **Containerization**: Docker & Docker Compose
- **Automation**: Ansible playbooks
- **Reverse proxy**: Traefik v3 (public and private instances)
- **Security**: CrowdSec, TLS with Let's Encrypt
- **Monitoring**: Beszel, Uptime Kuma
- **Local DNS**: dnsmasq for resolving *.local.tellserv.fr

## Deployed Services

The documentation details:
- Service configuration
- Ansible playbooks used
- Docker Compose files
- Secrets and security management
- Backups and disaster recovery

## Advantages of This Approach

- Simple to set up and maintain
- Ansible enables complete automation
- Docker Compose facilitates service management
- Ideal for progressive automation learning

## Limitations

This infrastructure has several important limitations that motivate the evolution toward a new approach (see "Future Homelab" section).

### Initial Absence of Git Versioning

One of the main limitations of this initial approach was the **absence of infrastructure versioning with Git**. At this stage of my journey, I had not yet mastered the DevOps philosophy and infrastructure code management best practices.

**Consequences of this limitation:**
- No history of configuration changes
- Difficult to roll back in case of problems
- No traceability of modifications
- Complex collaboration
- Absence of code review process
- Risk of divergence between documentation and reality

This gap was an **important lesson** that led me to:
1. Progressively correct this infrastructure by versioning Ansible playbooks and Docker Compose files
2. Adopt Git and DevOps practices for all my future projects
3. Integrate the "Infrastructure as Code" philosophy from the design phase

**Important note**: The Git repository [Infra_ansible_dockercompose](https://forgejo.tellserv.fr/Tellsanguis/Infra_ansible_dockercompose) was created **after the fact** to present the work done. In the initial practice, Git, automated tests, and CI/CD were not used due to lack of knowledge at the time.

Git versioning is now in place for this infrastructure, but the architecture itself remains limited (see below).

### Technical Architecture Limitations

- **Limited scalability**: Single-machine infrastructure without load distribution capability
- **No high availability**: Single point of failure (SPOF)
- **Manual orchestration**: Some tasks still require manual intervention
- **Initially absent CI/CD**: Manual deployments via Ansible (no automation on Git push)
- **Limited testing**: No automatic validation of changes before deployment

These limitations motivate the evolution toward Kubernetes (K3S) and a complete Infrastructure as Code approach with CI/CD (see [Future Homelab](../homelab-futur/index.md) section).
