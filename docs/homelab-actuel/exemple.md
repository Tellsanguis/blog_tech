---
sidebar_position: 2
---

# Exemple

Ceci est une page d'exemple dans la catégorie Homelab actuel.

## Description

Cette page démontre comment documenter un service ou une configuration du homelab actuel.

## Configuration Docker Compose

Exemple de configuration d'un service :

```yaml
version: '3.8'

services:
  exemple-service:
    image: nginx:latest
    container_name: exemple
    ports:
      - "8080:80"
    volumes:
      - ./config:/etc/nginx/conf.d
    restart: unless-stopped
```

## Playbook Ansible

Exemple de déploiement avec Ansible :

```yaml
---
- name: Déployer le service exemple
  hosts: homelab
  become: yes

  tasks:
    - name: Copier le fichier docker-compose
      copy:
        src: docker-compose.yml
        dest: /opt/exemple/docker-compose.yml

    - name: Démarrer le service
      command: docker-compose up -d
      args:
        chdir: /opt/exemple
```

## Maintenance

Points importants pour la maintenance :

- Sauvegardes régulières
- Mises à jour de l'image Docker
- Surveillance des logs
- Tests de restauration
