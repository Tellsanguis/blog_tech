---
sidebar_position: 4
---

# P4 - Docker N-tier Architecture

## Context

Deployment of a containerized n-tier architecture for BeeSafe company, including a web server, database and DNS server.

## Objectives

- Containerize a LAMP web application
- Configure a DNS server with Bind9
- Set up a reverse proxy
- Document the technical architecture

## Technologies Used

- **Docker / Docker Compose**: containerization
- **Apache/PHP**: web server
- **MySQL**: database
- **Bind9**: DNS server

## Deployed Architecture

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

## Deliverables

<details>
<summary>Architecture Diagram (PDF)</summary>

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

# Update and install dependencies
RUN apt-get update && apt-get install -y \
    libzip-dev \
    unzip \
    && docker-php-ext-install mysqli \
    && docker-php-ext-enable mysqli

# Enable beesafe.conf site and disable default 000-default.conf site
RUN a2ensite beesafe.conf && \
    a2dissite 000-default.conf && \
    service apache2 reload

# Clean unnecessary files to reduce image size
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Command to keep Apache running
CMD ["apache2-foreground"]
```

</details>

## Skills Acquired

- Multi-tier application containerization
- DNS server configuration
- Orchestration with Docker Compose
- Decoupled application architecture
