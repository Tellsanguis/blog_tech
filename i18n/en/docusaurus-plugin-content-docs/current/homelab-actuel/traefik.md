---
sidebar_position: 4
---

# Traefik - Modern Reverse Proxy

Traefik is the reverse proxy at the heart of the homelab's Docker infrastructure. It handles routing of all HTTP/HTTPS requests to the appropriate containers, with automatic SSL certificate management and security integration via CrowdSec.

## Global Architecture

The infrastructure uses **two distinct Traefik instances**, each on its own network interface:

- **traefik-public** (192.168.1.2): Public services accessible from the Internet (*.tellserv.fr)
- **traefik-private** (192.168.1.3): Local services reserved for the internal network (*.local.tellserv.fr)

This separation provides:
- **Network isolation**: Private services are never exposed publicly
- **Enhanced security**: Differentiated security policies based on exposure
- **Simplified management**: Each instance has its own configuration and rules

### Network Prerequisites

The VM hosting Traefik has **two NICs (Network Interface Cards)**:
- **NIC 1** (192.168.1.2): Public interface for traefik-public
- **NIC 2** (192.168.1.3): Local interface for traefik-private

## Common Elements to Both Instances

### Image and Version

Both instances use the official **Traefik v3** image:

```yaml
image: traefik:v3
```

### Docker Network

Both instances connect to the external Docker network `traefik_network` which enables communication with all containers to be proxied:

```yaml
networks:
  - traefik_network
```

This network must be created beforehand with:

```bash
docker network create traefik_network
```

### SSL Certificate Management

Both instances use **Let's Encrypt** with the **Cloudflare** DNS challenge to automatically generate wildcard SSL certificates.

**DNS Challenge Advantages:**
- Wildcard certificates (*.tellserv.fr, *.local.tellserv.fr)
- No need for public HTTP exposure for validation
- Works even for internal services

**Common Configuration:**

```yaml
environment:
  - TZ=Europe/Paris
  - CF_DNS_API_TOKEN=${CF_DNS_API_TOKEN}
```

The Cloudflare API token must have the following permissions:
- Zone / DNS / Edit
- Zone / Zone / Read

### Docker Provider

Both instances use the Docker provider for automatic service discovery:

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro
```

Traefik monitors containers and automatically creates routes based on Docker labels.

### Dynamic Configuration

Each instance loads dynamic configuration files from a dedicated directory:

```yaml
volumes:
  - ./dynamic-public:/etc/traefik/dynamic:ro   # For traefik-public
  - ./dynamic-private:/etc/traefik/dynamic:ro  # For traefik-private
```

These files allow defining middlewares, routers, and services without restarting Traefik.

### Traefik Dashboard

Both instances expose their dashboard via a dedicated subdomain:
- **traefik-public**: `traefik-public.local.tellserv.fr`
- **traefik-private**: `traefik-private.local.tellserv.fr`

The dashboard allows real-time visualization of:
- Active routers and their rules
- Detected services
- Applied middlewares
- Backend health status

### Restart Policy

```yaml
restart: unless-stopped
```

Containers automatically restart unless manually stopped.

### Docker Host Access

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

This configuration allows Traefik containers to access the Docker host via the name `host.docker.internal`, useful for proxying services running directly on the host.

## traefik-public Instance

### Role and Usage

The **traefik-public** instance manages all services **accessible from the Internet**:
- Public web applications
- Exposed APIs
- Authenticated services accessible from outside

### Network Binding

```yaml
ports:
  - "192.168.1.2:80:80"
  - "192.168.1.2:443:443"
```

Traefik listens only on IP **192.168.1.2**, corresponding to the VM's first NIC.

### Entry Points

**Port 80 (HTTP)**:
```yaml
web:
  address: ":80"
  http:
    redirections:
      entryPoint:
        to: websecure
        scheme: https
```

Automatic HTTP to HTTPS redirection for all requests.

**Port 443 (HTTPS)**:
```yaml
websecure:
  address: ":443"
  http:
    middlewares:
      - crowdsec-bouncer@file
      - secheaders@file
      - ratelimit@file
  transport:
    respondingTimeouts:
      idleTimeout: 300s
```

Three middlewares applied by default to all public services:
1. **crowdsec-bouncer**: Blocking malicious IPs detected by CrowdSec
2. **secheaders**: HTTP security headers (HSTS, CSP, etc.)
3. **ratelimit**: Request rate limiting

### Public Middlewares

File: `dynamic-public/middlewares.yml`

**ratelimit**:
```yaml
ratelimit:
  rateLimit:
    average: 100
    burst: 50
    period: 1s
```
Allows an average of 100 requests/second with bursts up to 50 additional requests.

**secheaders**:
```yaml
secheaders:
  headers:
    stsSeconds: 31536000
    forceSTSHeader: true
```
Forces HSTS (HTTP Strict Transport Security) for 1 year, requiring browsers to always use HTTPS.

**evasive**:
```yaml
evasive:
  rateLimit:
    average: 3
    burst: 5
    period: 1s
```
Strict rate limiting for sensitive endpoints (3 req/s average, 5 burst).

### CrowdSec Integration

**CrowdSec** is a community-based intrusion detection and prevention system. Traefik-public integrates the **CrowdSec bouncer** to automatically block malicious IPs.

**CrowdSec Middleware** (applied to websecure):
```yaml
middlewares:
  - crowdsec-bouncer@file
```

The bouncer queries the local CrowdSec API to check if the source IP is banned. On match, the request is blocked with HTTP 403.

### SSL Certificates

Certificate storage:
```yaml
volumes:
  - ./letsencrypt-public:/letsencrypt
```

ACME configuration in `traefik-public.yml`:
```yaml
certificatesResolvers:
  cloudflare:
    acme:
      email: your-email@example.com
      storage: /letsencrypt/cloudflare_acme.json
      keyType: EC256
      dnsChallenge:
        provider: cloudflare
        resolvers:
          - "1.1.1.1:53"
          - "8.8.8.8:53"
```

Certificates are automatically renewed 30 days before expiration.

### Logging

```yaml
log:
  level: DEBUG
  filePath: "/var/log/traefik/traefik.log"
accessLog:
  filePath: "/var/log/traefik/access.log"
  format: json
```

Logs stored in `/var/log/traefik/` on the Docker host:
- **traefik.log**: Traefik system logs (startup, errors, reloads)
- **access.log**: Access logs in JSON format (HTTP requests)

### Docker Provider Configuration

```yaml
providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: traefik_network
```

- **exposedByDefault: false**: Containers are not automatically exposed, Traefik labels must be explicitly added
- **network: traefik_network**: Traefik will use this network to communicate with containers

### Docker Labels Example

To expose a service via traefik-public:

```yaml
services:
  myapp:
    image: myapp:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.myapp.rule=Host(`app.tellserv.fr`)"
      - "traefik.http.routers.myapp.entrypoints=websecure"
      - "traefik.http.routers.myapp.tls.certresolver=cloudflare"
      - "traefik.http.services.myapp.loadbalancer.server.port=80"
    networks:
      - traefik_network
```

## traefik-private Instance

### Role and Usage

The **traefik-private** instance manages all services **reserved for the local network**:
- Administration interfaces (Proxmox, Cockpit)
- Internal dashboards
- Monitoring services
- Development tools

### Network Binding

```yaml
ports:
  - "192.168.1.3:80:80"
  - "192.168.1.3:443:443"
```

Traefik listens only on IP **192.168.1.3**, corresponding to the VM's second NIC.

### Entry Points

**Port 80 (HTTP)**:
```yaml
weblocal:
  address: ":80"
  http:
    redirections:
      entryPoint:
        to: local
        scheme: https
```

Automatic HTTP to HTTPS redirection (to `local` entrypoint).

**Port 443 (HTTPS)**:
```yaml
local:
  address: ":443"
  http:
    middlewares:
      - localonly@file
```

A single middleware applied by default: **localonly** which restricts access to local IPs.

### Private Middlewares

File: `dynamic-private/middlewares.yml`

**localonly**:
```yaml
localonly:
  ipWhiteList:
    sourceRange:
      - "127.0.0.1/32"
      - "192.168.1.0/24"
      - "100.64.0.0/10"
      - "172.18.0.0/16"
```

Whitelist of allowed IPs:
- **127.0.0.1/32**: Localhost
- **192.168.1.0/24**: Main LAN network
- **100.64.0.0/10**: Tailscale network (VPN)
- **172.18.0.0/16**: Internal Docker network

Any request from an IP outside these ranges is rejected with HTTP 403.

**ratelimit**, **secheaders**, **evasive**:

Identical to traefik-public, available to be applied as needed to specific services.

### SSL Certificates

Certificate storage:
```yaml
volumes:
  - ./letsencrypt-private:/letsencrypt
```

ACME configuration in `traefik-private.yml`:
```yaml
certificatesResolvers:
  cloudflare:
    acme:
      email: your-email@example.com
      storage: /letsencrypt/cloudflare_acme.json
      keyType: EC256
      dnsChallenge:
        provider: cloudflare
```

Although services are local, they benefit from **valid SSL certificates** thanks to DNS challenge.

### Logging

```yaml
log:
  level: DEBUG
  filePath: "/var/log/traefik-local/traefik.log"
accessLog:
  filePath: "/var/log/traefik-local/access.log"
  format: json
```

Logs stored in `/var/log/traefik-local/` on the Docker host.

### Docker Provider Configuration

Identical to traefik-public:
```yaml
providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: traefik_network
```

### Exposed Services

Static configuration files in `dynamic-private/`:

**cockpit.yml**: Proxying Cockpit (system administration web interface)
**proxmox.yml**: Proxying Proxmox interface

These files define routers and services for applications not running in Docker.

### Docker Labels Example

To expose a service via traefik-private:

```yaml
services:
  monitoring:
    image: grafana/grafana:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.monitoring.rule=Host(`grafana.local.tellserv.fr`)"
      - "traefik.http.routers.monitoring.entrypoints=local"
      - "traefik.http.routers.monitoring.tls.certresolver=cloudflare"
      - "traefik.http.services.monitoring.loadbalancer.server.port=3000"
    networks:
      - traefik_network
```

## Security and Best Practices

### Public/Private Separation

- **Never expose** administration services via traefik-public
- **Always verify** the entrypoint used in Docker labels
- **Prefer** traefik-private for anything that doesn't need to be public

### Security Middlewares

- **CrowdSec**: Active only on traefik-public, blocks automated attacks
- **localonly**: Applied by default on traefik-private
- **ratelimit**: Basic anti-DDoS protection
- **secheaders**: Browser-side security enhancement

### Certificate Management

- **Automatic rotation**: Let's Encrypt renews certificates every 90 days
- **Backup**: Regularly backup `cloudflare_acme.json` files
- **Monitoring**: Check logs to detect renewal failures

### Logging and Monitoring

- **Accessible logs**: Mounted as volumes on the host for analysis
- **JSON format**: Facilitates parsing and integration with monitoring tools
- **DEBUG level**: Useful for troubleshooting, can be reduced in production

## Configuration Limitations

While functional and secure, this architecture has certain limitations to be aware of:

### Shared Docker Network

**Issue**: Both Traefik instances (public and private) use the **same Docker network** (`traefik_network`). This means all containers connected to this network can potentially communicate with each other, whether exposed publicly or locally.

**Impact**:
- A container exposed via traefik-public can technically access a container exposed via traefik-private
- Network isolation is incomplete, relying only on IP bindings (192.168.1.2 vs 192.168.1.3)

**Possible Improvement**:
- Create two distinct Docker networks: `traefik_public_network` and `traefik_private_network`
- Connect each Traefik instance only to its dedicated network
- Ensure complete network isolation at the Docker level

### Lack of VLAN Segmentation

**Issue**: Both VM NICs share the same physical network (192.168.1.0/24) without VLAN segmentation.

**Impact**:
- The NIC for traefik-private (192.168.1.3) technically has Internet access via the network gateway, when it doesn't need it
- No network isolation at L2/L3 level between public and private interfaces
- In case of compromise, an attacker could potentially pivot between both networks

**Possible Improvement**:
- **Public VLAN**: Place the traefik-public NIC (192.168.1.2) in a VLAN with Internet access
- **Private VLAN**: Place the traefik-private NIC (192.168.1.3) in an isolated VLAN without Internet access
- Configure strict firewall rules between VLANs
- This segmentation would significantly strengthen isolation and limit attack surface

### Docker Socket Access

**Issue**: Both Traefik instances have **direct and complete** access to the Docker socket (`/var/run/docker.sock`). The Docker socket is Docker's administration API, giving full control over the host.

**Security Impact**:
- A compromised Traefik container could control all host containers
- Possibility of privilege escalation (launching containers in privileged mode, mounting sensitive volumes, etc.)
- Read-only access (`ro`) limits damage, but still allows extracting sensitive information (environment variables, secrets, etc.)

**Possible Improvement**:
- Use a **Docker socket proxy** like [Tecnativa/docker-socket-proxy](https://github.com/Tecnativa/docker-socket-proxy)
- This proxy allows fine-grained filtering of allowed operations (e.g., only read containers and their labels)
- Reduce attack surface by limiting API access to endpoints strictly necessary for Traefik

Configuration example:
```yaml
docker-socket-proxy:
  image: tecnativa/docker-socket-proxy
  environment:
    CONTAINERS: 1  # Allow container reading
    NETWORKS: 1    # Allow network reading
    SERVICES: 0    # Deny access to Swarm services
    TASKS: 0       # Deny access to Swarm tasks
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock:ro
```

These improvements are not critical for a homelab but would be **strongly recommended in production environments**.

## Resources

- [Official Traefik v3 Documentation](https://doc.traefik.io/traefik/)
- [Docker Provider](https://doc.traefik.io/traefik/providers/docker/)
- [Middlewares](https://doc.traefik.io/traefik/middlewares/overview/)
- [Let's Encrypt](https://doc.traefik.io/traefik/https/acme/)
- [CrowdSec Bouncer](https://docs.crowdsec.net/u/bouncers/traefik/)
- [Docker Socket Proxy](https://github.com/Tecnativa/docker-socket-proxy)
