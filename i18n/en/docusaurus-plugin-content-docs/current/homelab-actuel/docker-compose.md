---
sidebar_position: 3
tags: [docker, docker-compose, containerization, homelab]
last_update:
  date: 2025-11-25
---

# Docker and Docker Compose

## What is Docker?

Docker is a **containerization platform** that allows you to package applications and their dependencies into lightweight and isolated containers.

### Containers: revolution of modern infrastructure

A container is a standardized software unit that contains:
- The application itself
- All its dependencies (libraries, runtime, system tools)
- An isolated filesystem
- Environment variables and configuration

**Difference with virtual machines**:
- **Container**: Shares the host OS kernel, starts in seconds, very lightweight (~MB)
- **VM**: Emulates a complete OS, starts in minutes, heavier (~GB)

### Advantages of Docker

1. **Portability**: "Runs anywhere" - works identically in development, testing, and production
2. **Isolation**: Each container is isolated, avoiding dependency conflicts
3. **Lightweight**: Consumes fewer resources than a VM (no full virtualization)
4. **Speed**: Instant application startup
5. **Reproducibility**: Docker image = identical environment every time
6. **Ecosystem**: Docker Hub contains thousands of ready-to-use images

## Docker Compose: simplified orchestration

Docker Compose is an **orchestration tool** for defining and managing multi-container applications.

### Why Docker Compose?

Without Compose, deploying an application with multiple containers (app + database + cache + ...) requires long `docker run` commands that are difficult to maintain.

With Compose:
- **Declarative configuration**: Everything is defined in a `compose.yml` file
- **Grouped management**: Start/stop all services with one command
- **Automatic networks**: Containers communicate easily with each other
- **Persistent volumes**: Simple storage management
- **Environment variables**: Flexible configuration via `.env` files

### compose.yml file

A Compose file defines:
- **Services** (containers)
- **Networks** (communication between containers)
- **Volumes** (data persistence)
- **Environment variables** (configuration)

## Docker Compose stack examples

My Docker Compose stacks are available in the Ansible repository under `stacks/`. Here are some representative examples:

### Example 1: Traefik - Advanced Reverse Proxy

Traefik is the entry point for the entire infrastructure. This compose illustrates an advanced configuration with **two Traefik instances** (public and private):

```yaml
services:
  traefik-public:
    image: traefik:v3
    container_name: traefik-public
    restart: unless-stopped
    ports:
      - "192.168.1.2:80:80"
      - "192.168.1.2:443:443"
    extra_hosts:
      - "host.docker.internal:host-gateway"
    networks:
      - traefik_network
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik-public.yml:/etc/traefik/traefik.yml:ro
      - ./dynamic-public:/etc/traefik/dynamic:ro
      - ./letsencrypt-public:/letsencrypt
      - /var/log/traefik:/var/log/traefik
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.traefik-dashboard-public.rule=Host(`traefik-public.local.tellserv.fr`)"
      - "traefik.http.routers.traefik-dashboard-public.entrypoints=local"
      - "traefik.http.routers.traefik-dashboard-public.tls.certresolver=cloudflare-local"
      - "traefik.http.routers.traefik-dashboard-public.tls=true"
      - "traefik.http.routers.traefik-dashboard-public.service=api@internal"
      - "traefik.http.middlewares.crowdsec-bouncer.forwardauth.address=http://crowdsec-bouncer:8080/api/v1/forwardAuth"
    environment:
      - CF_DNS_API_TOKEN=${CF_DNS_API_TOKEN}
      - TZ=Europe/Paris

  traefik-private:
    image: traefik:v3
    container_name: traefik-private
    restart: unless-stopped
    ports:
      - "192.168.1.3:80:80"
      - "192.168.1.3:443:443"
    networks:
      - traefik_network
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik-private.yml:/etc/traefik/traefik.yml:ro
      - ./dynamic-private:/etc/traefik/dynamic:ro
      - ./letsencrypt-private:/letsencrypt
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.traefik-dashboard-local.rule=Host(`traefik-private.local.tellserv.fr`)"
    environment:
      - TZ=Europe/Paris
      - CF_DNS_API_TOKEN=${CF_DNS_API_TOKEN}

networks:
  traefik_network:
    external: true
```

**Key points**:
- **Two instances**: Separation of public (Internet) and private (local network only)
- **Docker socket**: Traefik automatically detects new containers via `/var/run/docker.sock`
- **Let's Encrypt certificates**: Automatic generation with DNS-01 challenge (Cloudflare)
- **Traefik labels**: Dynamic configuration via Docker labels
- **CrowdSec middleware**: Integration with CrowdSec to block malicious IPs
- **External network**: All services connect to the `traefik_network` network

### Example 2: Photoprism - Application with database

Photoprism illustrates a classic application stack (app + DB) with advanced configuration:

```yaml
services:
  photoprism:
    image: photoprism/photoprism:241021
    stop_grace_period: 10s
    depends_on:
      - mariadb
    restart: unless-stopped
    security_opt:
      - seccomp:unconfined
      - apparmor:unconfined
    working_dir: "/photoprism"
    volumes:
      - "/mnt/storage/photos:/photoprism/import"
      - "/mnt/storage/photoprism/originals:/photoprism/originals"
      - "/mnt/storage/photoprism/storage:/photoprism/storage"
    environment:
      - PHOTOPRISM_DATABASE_DRIVER=mysql
      - PHOTOPRISM_DATABASE_SERVER=mariadb:3306
      - PHOTOPRISM_DATABASE_NAME=photoprism
      - PHOTOPRISM_DATABASE_USER=${MARIADB_USER}
      - PHOTOPRISM_DATABASE_PASSWORD=${PHOTOPRISM_DATABASE_PASSWORD}
      - PHOTOPRISM_ADMIN_USER=${PHOTOPRISM_ADMIN_USER}
      - PHOTOPRISM_ADMIN_PASSWORD=${PHOTOPRISM_ADMIN_PASSWORD}
      - PHOTOPRISM_SITE_URL=https://photoprism.tellserv.fr/
      - PHOTOPRISM_HTTP_COMPRESSION=gzip
      - PHOTOPRISM_JPEG_QUALITY=85
    networks:
      - traefik_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.${COMPOSE_PROJECT_NAME}-local.rule=Host(`${COMPOSE_PROJECT_NAME}.local.tellserv.fr`)"
      - "traefik.http.routers.${COMPOSE_PROJECT_NAME}-local.entryPoints=local"
      - "traefik.http.routers.${COMPOSE_PROJECT_NAME}-local.tls=true"
      - "traefik.http.routers.${COMPOSE_PROJECT_NAME}-prod.rule=Host(`${COMPOSE_PROJECT_NAME}.tellserv.fr`)"
      - "traefik.http.routers.${COMPOSE_PROJECT_NAME}-prod.entryPoints=websecure"
      - "traefik.http.routers.${COMPOSE_PROJECT_NAME}-prod.tls.certResolver=cloudflare"
      - "traefik.http.services.${COMPOSE_PROJECT_NAME}.loadbalancer.server.port=2342"
      - "com.centurylinklabs.watchtower.enable=true"

  mariadb:
    image: mariadb:11
    restart: unless-stopped
    stop_grace_period: 5s
    command: >
      --innodb-buffer-pool-size=512M
      --transaction-isolation=READ-COMMITTED
      --character-set-server=utf8mb4
      --collation-server=utf8mb4_unicode_ci
      --max-connections=512
    volumes:
      - ./database:/var/lib/mysql
    environment:
      - MARIADB_DATABASE=photoprism
      - MARIADB_USER=${MARIADB_USER}
      - MARIADB_PASSWORD=${MARIADB_PASSWORD}
      - MARIADB_ROOT_PASSWORD=${MARIADB_ROOT_PASSWORD}
    networks:
      - traefik_network

networks:
  traefik_network:
    external: true
```

**Key points**:
- **Dependencies**: `depends_on` ensures MariaDB starts before Photoprism
- **Mounted volumes**: Access to MergerFS storage (`/mnt/storage`) for photos
- **Database**: MariaDB optimized for Photoprism (buffer pool, character set UTF-8)
- **Environment variables**: Secrets injected via `.env` file (not versioned)
- **Dual exposure**: Accessible locally (`.local.tellserv.fr`) and on the Internet (`.tellserv.fr`)
- **Watchtower**: Label to enable automatic updates
- **DB optimizations**: Adapted MariaDB configuration (buffer pool, connections, charset)

### Example 3: Mobilizon - Multi-container application with internal network

Mobilizon demonstrates the use of **multiple Docker networks** (external + internal):

```yaml
services:
  mobilizon:
    user: "1000:1000"
    restart: always
    image: docker.io/framasoft/mobilizon
    env_file: .env
    depends_on:
      - db
    volumes:
      - ./uploads:/var/lib/mobilizon/uploads
      - ./tzdata:/var/lib/mobilizon/tzdata
    networks:
      - traefik_network
      - mobilizon_internal
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.mobilizon-local.rule=Host(`mobilizon.local.tellserv.fr`)"
      - "traefik.http.routers.mobilizon-local.entryPoints=local"
      - "traefik.http.routers.mobilizon-prod.rule=Host(`mobilizon.tellserv.fr`)"
      - "traefik.http.routers.mobilizon-prod.entryPoints=websecure"
      - "traefik.http.routers.mobilizon-prod.tls.certResolver=cloudflare"
      - "traefik.http.services.mobilizon.loadbalancer.server.port=5005"

  db:
    image: docker.io/postgis/postgis:15-3.4
    restart: always
    env_file: .env
    volumes:
      - ./db:/var/lib/postgresql/data:z
    networks:
      - mobilizon_internal

networks:
  mobilizon_internal:
    ipam:
      driver: default
  traefik_network:
    external: true
```

**Key points**:
- **Two networks**:
  - `traefik_network` (external): Mobilizon communicates with Traefik
  - `mobilizon_internal` (internal): Private communication between Mobilizon and PostgreSQL
- **Security**: The database is not exposed on the Traefik network
- **PostgreSQL with PostGIS**: Geographic extension to manage geolocated events
- **User ID**: Execution with specific UID/GID to manage file permissions
- **Volume with SELinux**: Flag `:z` for SELinux compatibility

### Example 4: Vaultwarden - Secrets management

Vaultwarden (password manager) shows a security-focused configuration:

```yaml
services:
  vaultwarden:
    image: vaultwarden/server:1.32.7
    container_name: vaultwarden
    restart: unless-stopped
    environment:
      - TZ=Europe/Paris
      - ADMIN_TOKEN=${VAULTWARDEN_ADMIN_TOKEN}
      - SIGNUPS_ALLOWED=${SIGNUPS_ALLOWED}
      - SMTP_FROM=${SMTP_FROM}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_SECURITY=${SMTP_SECURITY}
      - SMTP_USERNAME=${SMTP_USERNAME}
      - SMTP_PASSWORD=${SMTP_PASSWORD}
      - EXPERIMENTAL_CLIENT_FEATURE_FLAGS=ssh-key-vault-item,ssh-agent
    volumes:
      - ./vw-data:/data
    networks:
      - traefik_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.vaultwarden-local.rule=Host(`vaultwarden.local.tellserv.fr`)"
      - "traefik.http.routers.vaultwarden-prod.rule=Host(`vaultwarden.tellserv.fr`)"
      - "traefik.http.routers.vaultwarden-prod.tls.certResolver=cloudflare"
      - "com.centurylinklabs.watchtower.enable=true"

networks:
  traefik_network:
    external: true
```

**Key points**:
- **Secrets via .env**: All passwords and tokens in environment variables
- **SMTP configuration**: Email sending for notifications and account recovery
- **Experimental features**: SSH key support in the vault
- **Data volume**: Vault persistence in `./vw-data`
- **Secure exposure**: HTTPS mandatory via Traefik with Let's Encrypt

## Patterns and best practices

### 1. External network `traefik_network`

All my services use a shared **external Docker network**:

```yaml
networks:
  traefik_network:
    external: true
```

Advantages:
- Traefik automatically detects new services
- Communication between services via their names (e.g. `http://vaultwarden`)
- Isolation by default (unconnected services cannot communicate)

### 2. Traefik labels for dynamic configuration

Instead of static configuration files, I use **Docker labels**:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.myapp.rule=Host(`myapp.tellserv.fr`)"
  - "traefik.http.routers.myapp.tls.certResolver=cloudflare"
```

Advantages:
- Configuration colocated with the service
- Deploying a new service = automatic addition to Traefik
- No manual Traefik reload

### 3. Environment variables with .env files

All secrets are extracted into `.env` files:

```env
VAULTWARDEN_ADMIN_TOKEN=supersecret123
MARIADB_PASSWORD=dbpassword456
CF_DNS_API_TOKEN=cloudflare_token_789
```

Advantages:
- No secrets in plain text in versioned Compose files
- `.env` files generated dynamically by Ansible (Jinja2 templates)
- Easy secret rotation

### 4. Dual exposure: local and production

Each service has two entries:
- **Local**: `service.local.tellserv.fr` (local network only)
- **Production**: `service.tellserv.fr` (accessible from the Internet)

```yaml
labels:
  - "traefik.http.routers.myapp-local.rule=Host(`myapp.local.tellserv.fr`)"
  - "traefik.http.routers.myapp-local.entryPoints=local"
  - "traefik.http.routers.myapp-prod.rule=Host(`myapp.tellserv.fr`)"
  - "traefik.http.routers.myapp-prod.entryPoints=websecure"
```

Advantages:
- Fast local access (no Internet latency)
- Remote access possible when needed
- Ability to restrict certain services to local only

### 5. Restart policies and graceful shutdown

Resilience configuration:

```yaml
restart: unless-stopped
stop_grace_period: 10s
```

- `unless-stopped`: Restarts automatically except if manually stopped
- `stop_grace_period`: Time to terminate cleanly before SIGKILL

### 6. Watchtower for update monitoring

Label to enable monitoring:

```yaml
labels:
  - "com.centurylinklabs.watchtower.enable=true"
```

**Important**: Watchtower is used **only for notifications** of new available image versions. Updates are performed **manually** to maintain control over changes.

In the [Future Homelab](../homelab-futur/index.md), automated update management will be implemented via Renovate Bot integrated directly with Forgejo.

## Managing stacks with Docker Compose

### Essential commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs for a service
docker compose logs -f service_name

# Restart a service
docker compose restart service_name

# Update images and redeploy
docker compose pull
docker compose up -d

# View container status
docker compose ps
```

### Deployment via Ansible

In my configuration, stacks are automatically deployed by Ansible:

1. Generation of `.env` files from templates
2. Synchronization of `stacks/` folders to `/opt/stacks/`
3. Execution of `docker compose up -d` for each stack

See the [Ansible Playbooks](./playbooks-ansible.md) page for more details.

## Advantages of Docker Compose for a homelab

### Simplicity

- Readable and maintainable YAML files
- No complex syntax like Kubernetes
- Gentle learning curve

### Performance

- Instant service startup
- Low overhead (no Kubernetes cluster)
- Ideal for modest machines

### Flexibility

- Easy to add/remove services
- Ability to quickly test new applications
- Configuration by environment (dev, staging, prod)

### Rich ecosystem

- Docker Hub: thousands of ready-to-use images
- LinuxServer.io: optimized and well-maintained images
- Active community: documentation and support

## Docker Compose limitations

Despite its advantages, Docker Compose has limitations for large-scale production use:

1. **No high availability**: Everything is on a single machine
2. **No horizontal scaling**: Impossible to distribute load across multiple servers
3. **No advanced orchestration**: No rolling updates, canary deployments, etc.
4. **Manual management**: Deployments via Ansible, no native GitOps

**Note**: Using `restart: unless-stopped` ensures automatic restart of containers after an unexpected stop, providing a basic form of resilience.

These limitations explain why I'm migrating to **Kubernetes (K3S)** for the future homelab. See the [Future Homelab](../homelab-futur/index.md) section.

## Why not Docker Swarm?

When considering the evolution of my infrastructure, **Docker Swarm** was evaluated as an alternative to Kubernetes for container orchestration.

### Docker Swarm: a tempting but outdated choice

**Advantages of Docker Swarm**:
- Natively integrated with Docker (no additional installation)
- Simpler configuration than Kubernetes
- Gentler learning curve
- Uses Docker Compose files directly (with some adaptations)
- Less resource-intensive than Kubernetes

**Why I didn't choose it**:

1. **Kubernetes is the industry standard**: The vast majority of companies use Kubernetes in production. Learning K8S provides skills directly transferable to the professional world.

2. **Ecosystem and community**: Kubernetes benefits from a much richer ecosystem (Helm, operators, numerous DevOps tools) and a much larger community.

3. **Advanced features**: Kubernetes offers capabilities that Docker Swarm doesn't have:
   - More advanced rolling updates and rollbacks
   - Fine-grained resource management (CPU/RAM limits, requests)
   - More elaborate network policies
   - Native GitOps support (ArgoCD, Flux)
   - Better integrated distributed storage (CSI drivers)

4. **Evolution and support**: Docker Inc. has clearly oriented its development toward Kubernetes rather than Swarm. Swarm is maintained, but no longer evolves much.

5. **Learning objective**: My goal being to acquire modern DevOps skills, mastering Kubernetes is a better long-term investment.

**Conclusion**: Although Docker Swarm is simpler and sufficient for many homelabs, I preferred to invest directly in learning Kubernetes, which has become the essential standard for container orchestration.
