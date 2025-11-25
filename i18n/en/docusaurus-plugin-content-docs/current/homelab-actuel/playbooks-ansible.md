---
sidebar_position: 2
---

# Ansible Playbooks

:::info
Full English translation coming soon.
:::

Ansible is an open-source IT automation tool that enables configuration management, deployment, and infrastructure orchestration. In a homelab context, Ansible has become essential for maintaining reproducible and documented infrastructure.

## What is Ansible?

Ansible is an **Infrastructure as Code (IaC)** tool that allows you to:
- **Automate** repetitive system administration tasks
- **Standardize** configurations across multiple machines
- **Document** infrastructure in executable format (code is documentation)
- **Reproduce** identical environments easily
- **Version** infrastructure with Git

## Project structure

My Ansible infrastructure is available:
- **Online repository**: [https://forgejo.tellserv.fr/Tellsanguis/Infra_ansible_dockercompose](https://forgejo.tellserv.fr/Tellsanguis/Infra_ansible_dockercompose)

## Ansible roles

The infrastructure uses several roles:
- **common**: Base system configuration, dnsmasq, firewalld, MergerFS
- **cockpit**: Web admin interface
- **docker**: Docker Engine installation and configuration
- **services**: Docker stack deployment

## Secrets management

Secrets are encrypted with Ansible Vault and injected via Jinja2 templates into `.env` files.

## Benefits of this approach

1. **Reproducibility**: Infrastructure can be recreated identically in minutes
2. **Living documentation**: Ansible code documents the infrastructure precisely
3. **Complete automation**: No need to SSH for deployment or updates
4. **Security**: Secrets are encrypted and never committed in plain text

## Current Limitations

Despite its many advantages, this approach has limitations:

1. **Late versioning**: The Git repository [Infra_ansible_dockercompose](https://forgejo.tellserv.fr/Tellsanguis/Infra_ansible_dockercompose) was created **after the fact** to present the work. In the initial practice, Git, automated tests, and CI/CD were not used due to lack of knowledge at the time.
2. **No automated tests**: No automatic playbook validation (Molecule, integration tests)
3. **Single-machine infrastructure**: Ansible is designed to manage multiple servers, but I only manage one
4. **No CI/CD integration**: Deployments are manual, no automated pipeline

These limitations will be addressed in the [Future Homelab](../homelab-futur/index.md) with the adoption of Kubernetes and GitOps.

:::note
Detailed English translation of this page is in progress.
:::
