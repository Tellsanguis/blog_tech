---
sidebar_position: 3
---

# Docker and Docker Compose

:::info
Full English translation coming soon.
:::

Docker is a **containerization platform** that allows packaging applications and their dependencies into lightweight and isolated containers.

## What is Docker?

A container is a standardized software unit that contains:
- The application itself
- All its dependencies (libraries, runtime, system tools)
- An isolated filesystem
- Environment variables and configuration

**Difference with virtual machines**:
- **Container**: Shares the host OS kernel, starts in seconds, very lightweight (~MB)
- **VM**: Emulates a complete OS, starts in minutes, heavier (~GB)

## Docker Compose: Simplified orchestration

Docker Compose is an **orchestration tool** for defining and managing multi-container applications.

### Why Docker Compose?

- **Declarative configuration**: Everything defined in a `compose.yml` file
- **Grouped management**: Start/stop all services with one command
- **Automatic networks**: Containers communicate easily between them
- **Persistent volumes**: Simple storage management
- **Environment variables**: Flexible configuration via `.env` files

## Configuration examples

My Docker Compose stacks are available in the Ansible repository under `stacks/`. Key examples include:
- **Traefik**: Advanced reverse proxy with two instances (public and private)
- **Photoprism**: Application with database (app + DB)
- **Mobilizon**: Multi-container application with multiple networks
- **Vaultwarden**: Security-focused configuration

## Patterns and best practices

1. **External network `traefik_network`**: All services share a common Docker network
2. **Traefik labels**: Dynamic configuration via Docker labels
3. **Environment variables with .env files**: Secrets extracted from Compose files
4. **Dual exposure**: local and production access for each service
5. **Restart policies**: `unless-stopped` for resilience
6. **Watchtower for monitoring**: Watchtower is used **only for notifications** of available image updates. Updates are performed **manually** to maintain control over changes. In the [Future Homelab](../homelab-futur/index.md), automated update management will be implemented via Renovate Bot integrated directly with Forgejo.

## Benefits for a homelab

- **Simplicity**: Readable and maintainable YAML files
- **Performance**: Instant service startup, low overhead
- **Flexibility**: Easy to add/remove services
- **Rich ecosystem**: Docker Hub with thousands of ready-to-use images

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

:::note
Detailed English translation of this page is in progress.
:::
