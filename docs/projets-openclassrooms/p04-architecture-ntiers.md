---
sidebar_position: 4
tags: [docker, conteneurisation, architecture-ntiers]
last_update:
  date: 2025-11-22
---

# Architecture n-tiers Docker

## Contexte

Déploiement d'une architecture n-tiers conteneurisée pour l'entreprise BeeSafe, comprenant un serveur web, une base de données et un serveur DNS.

## Objectifs

- Conteneuriser une application web LAMP
- Configurer un serveur DNS avec Bind9
- Mettre en place un reverse proxy
- Documenter l'architecture technique

## Technologies utilisées

- **Docker / Docker Compose** : conteneurisation
- **Apache/PHP** : serveur web
- **MySQL** : base de données
- **Bind9** : serveur DNS

## Architecture déployée

```
                    +-------------+
                    |   Client    |
                    +------+------+
                           |
                    +------v------+
                    |  DNS Bind9  |
                    +------+------+
                           |
                    +------v------+
                    |   Apache    |
                    |    + PHP    |
                    +------+------+
                           |
                    +------v------+
                    |    MySQL    |
                    +-------------+
```

## Livrables

<details>
<summary>Schéma d'architecture (PDF)</summary>

<iframe src="/assets/projets-oc/p04/schema_archi_ntiers.pdf" width="100%" height="600px" style={{border: 'none'}}></iframe>

</details>

<details>
<summary>Docker Compose</summary>

```yaml
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: apache_php
    ports:
      - "80:80"
    volumes:
      - ./web:/var/www/html
      - ./apache/beesafe.conf:/etc/apache2/sites-available/beesafe.conf
    depends_on:
      - db
      - dns
    networks:
      - backend
    restart: unless-stopped

  db:
    image: mysql:8.0
    container_name: mysql
    environment:
      MYSQL_ROOT_PASSWORD: rootclassroom
      MYSQL_DATABASE: beesafe_db
    volumes:
      - db_data:/var/lib/mysql
      - ./sql:/docker-entrypoint-initdb.d
    networks:
      - backend
    restart: unless-stopped

  dns:
    image: internetsystemsconsortium/bind9:9.18
    container_name: bind9
    ports:
      - "53:53/tcp"
      - "53:53/udp"
    volumes:
      - ./bind9/etc:/etc/bind
      - ./bind9/cache:/var/cache/bind
      - ./bind9/lib:/var/lib/bind
      - ./bind9/log:/var/log
    command: ["-g"]
    networks:
      - backend
    restart: unless-stopped

networks:
  backend:
    driver: bridge

volumes:
  db_data:
```

</details>

<details>
<summary>Dockerfile</summary>

```dockerfile
FROM php:8.0-apache

# Mise à jour et installation des dépendances
RUN apt-get update && apt-get install -y \
    libzip-dev \
    unzip \
    && docker-php-ext-install mysqli \
    && docker-php-ext-enable mysqli

# Activer le site beesafe.conf et désactiver le site par défaut 000-default.conf
RUN a2ensite beesafe.conf && \
    a2dissite 000-default.conf && \
    service apache2 reload

# Nettoyage des fichiers inutiles pour réduire la taille de l'image
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Commande pour garder Apache en fonctionnement
CMD ["apache2-foreground"]
```

</details>

## Compétences acquises

- Conteneurisation d'applications multi-tiers
- Configuration de serveurs DNS
- Orchestration avec Docker Compose
- Architecture applicative découplée
