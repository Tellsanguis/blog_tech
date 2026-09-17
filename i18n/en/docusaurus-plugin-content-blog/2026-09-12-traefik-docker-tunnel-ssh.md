---
slug: traefik-docker-tunnel-ssh
title: "Never expose the Docker socket: Traefik up front, an SSH tunnel for all access"
authors: [tellserv]
tags: [docker, traefik, ssh, networking, security, rootless, socket-proxy]
date: 2026-09-12
---

The Docker socket grants de facto root access to whatever machine exposes it. This post describes the pattern I set up to let a reverse proxy discover the containers on a remote Docker host without ever exposing that socket on the network: a point-to-point SSH tunnel, paired with a proxy that filters the API itself.

<p align="center">
  <img src="/img/blog/traefik-docker-tunnel-ssh/tunnel-ssh-socket-proxy.svg" alt="Diagram: incoming traffic reaches Traefik in the DMZ zone, crosses a restricted SSH tunnel to a filtering socket-proxy in the backend zone, the only thing allowed to talk to the Docker socket" width="720" />
</p>

<!--truncate-->

## Why the Docker socket is a network problem, not just a permissions problem

Access to the Docker socket (`/var/run/docker.sock`) lets you launch a container with any mount you want, including the host's root filesystem, read-write. It's root access in disguise. Exposing it on the network, even behind TLS authentication, expands an attack surface that has no reason to exist: the only legitimate consumer here is the reverse proxy, which just needs to discover active containers to route traffic to them, not create any, not mount anything on them.

## The architecture: two hosts, one role each, a tunnel between them

I split the role across two hosts:

- An **"edge" host**, running the reverse proxy (Traefik) and receiving all incoming traffic on 80/443.
- A **"backend" host**, running the application containers on rootless Docker, and never listening directly on the network for the Docker API.

The link between the two is an SSH tunnel I set up via a dedicated service account, forwarding a local port on the edge (`127.0.0.1:2375`) to the remote Docker socket.

```bash
# On the edge side, set up by the traefikd service account
autossh -M 0 -N \
  -L 127.0.0.1:2375:/var/run/docker.sock \
  -o ServerAliveInterval=15 -o ServerAliveCountMax=3 \
  proxy@docker01.exemple.internal
```

Traefik, configured with `Network=host` on its Podman Quadlet unit, can then talk to the backend's Docker API as if it were local: with not a single byte crossing the network in the clear, and no Docker port ever opened toward the outside of the backend.

```ini
# traefik.container (Podman Quadlet, excerpt)
[Container]
Network=host
Environment=DOCKER_HOST=tcp://127.0.0.1:2375
```

## A second barrier: filtering the API itself

I added a second barrier because even through the tunnel, the full Docker API remains far broader than what a reverse proxy needs: it needs to list containers and networks, not create volumes or launch new containers. A socket-proxy sits between the tunnel and the real socket, and only allows the endpoints strictly necessary for service discovery:

```yaml
services:
  socket-proxy:
    image: tecnativa/docker-socket-proxy:v0.5.0
    environment:
      CONTAINERS: 1
      NETWORKS: 1
      SERVICES: 0
      TASKS: 0
      POST: 0        # no writes, read-only
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - socket-proxy
```

`POST: 0` forbids any write operation on the API: the proxy only lets reads through. Defense in depth: even a full compromise of the reverse proxy upstream wouldn't grant write access to Docker on the backend side, only a read-only view of existing containers and networks.

## Rootless on both sides

Both hosts run Docker/Podman **rootless**: the daemons run under dedicated service accounts (non-root UIDs), not under root. That limits what a container escape can reach even in the event of a full compromise of an application container: the attacker inherits the service account's rights, not root on the host.

```bash
$ ps -o user,pid,cmd -C dockerd
USER       PID  CMD
dockeruser 4821 /usr/bin/dockerd-rootless.sh
```

## The service account carrying the tunnel has exactly one right

I restricted the account that sets up the SSH tunnel to a locked-down `authorized_keys` entry, unable to do anything other than open that one specific tunnel:

```text
# authorized_keys for the proxy account on docker01
restrict,permitopen="127.0.0.1:2375" ssh-ed25519 AAAA... traefikd@traefik01
```

`restrict` disables everything (command execution, agent forwarding, PTY allocation, X11 forwarding) and `permitopen` limits the one allowed forward to the Docker socket, nothing else. It can neither run a remote command, nor open a shell, nor forward to any other port. Same principle as the socket-proxy, applied at the SSH level rather than the HTTP level: two independent layers filtering the same edge → backend relationship, each at its own level.

:::tip[Don't mix up two similarly named accounts]
Two distinct accounts coexist on the edge host: `traefikd` (the service account, dedicated UID, handling both the SSH tunnel and the Traefik Quadlets) and a pre-existing local `traefik` account (UID 1000) with no relation to the service whatsoever. Mixing them up while debugging wastes precious time chasing a permissions problem on the wrong side.
:::

## What makes this pattern applicable elsewhere

This is the point I take away the most from setting this up, and the idea goes beyond Docker: whenever a service needs to talk to a sensitive API on another machine, the question to ask is: *does it need direct network access, or does a restricted tunnel suffice?* An SSH tunnel with tight `authorized_keys` permissions, combined with an application-level filtering proxy, gives you two independent layers of control, and neither one needs to expose anything publicly for the reverse proxy to do its job.
