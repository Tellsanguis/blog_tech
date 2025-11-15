---
sidebar_position: 2
---

# Example

This is an example page in the Current Homelab category.

## Description

This page demonstrates how to document a service or configuration of the current homelab.

## Docker Compose Configuration

Example service configuration:

```yaml
version: '3.8'

services:
  example-service:
    image: nginx:latest
    container_name: example
    ports:
      - "8080:80"
    volumes:
      - ./config:/etc/nginx/conf.d
    restart: unless-stopped
```

## Ansible Playbook

Deployment example with Ansible:

```yaml
---
- name: Deploy example service
  hosts: homelab
  become: yes

  tasks:
    - name: Copy docker-compose file
      copy:
        src: docker-compose.yml
        dest: /opt/example/docker-compose.yml

    - name: Start the service
      command: docker-compose up -d
      args:
        chdir: /opt/example
```

## Maintenance

Important maintenance points:

- Regular backups
- Docker image updates
- Log monitoring
- Restore testing
