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

### Physical/Virtual Infrastructure
- Dedicated servers or VMs
- Secure local network
- Storage and backups

### Tech Stack
- **OS**: Linux (Debian/Ubuntu)
- **Containerization**: Docker & Docker Compose
- **Automation**: Ansible playbooks
- **Reverse proxy**: Traefik or Nginx
- **Monitoring**: Prometheus, Grafana

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
- Reproducible and versioned with Git

## Limitations

- Limited scalability
- No native high availability
- Manual orchestration for certain tasks

These limitations motivate the evolution towards Kubernetes (see "Future Homelab" section).

## Articles

import DocCardList from '@theme/DocCardList';

<DocCardList />
