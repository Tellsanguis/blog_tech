---
slug: traefik-docker-tunnel-ssh
title: "Ne jamais exposer le socket Docker : Traefik en frontal, un tunnel SSH pour tout accès"
authors: [tellserv]
tags: [docker, traefik, ssh, réseau, sécurité, rootless, socket-proxy]
date: 2026-09-12
---

Le socket Docker donne un accès root de facto à la machine qui l'expose. Ce post décrit le pattern que j'ai mis en place pour permettre à un reverse proxy de découvrir les containers d'un hôte Docker distant sans jamais exposer ce socket sur le réseau : un tunnel SSH point à point, doublé d'un proxy qui filtre l'API elle-même.

<p align="center">
  <img src="/img/blog/traefik-docker-tunnel-ssh/tunnel-ssh-socket-proxy.svg" alt="Schéma : le trafic entrant atteint Traefik en zone DMZ, traverse un tunnel SSH restreint vers un socket-proxy filtrant en zone backend, seul habilité à dialoguer avec le socket Docker" width="720" />
</p>

<!--truncate-->

## Pourquoi le socket Docker est un problème réseau, pas juste un problème de permissions

Un accès au socket Docker (`/var/run/docker.sock`) permet de lancer un container avec n'importe quel montage, y compris le système de fichiers racine de l'hôte, en lecture-écriture. C'est un accès root déguisé. L'exposer sur le réseau, même derrière de l'authentification TLS, agrandit une surface d'attaque qui n'a aucune raison de l'être : le seul consommateur légitime, ici, c'est le reverse proxy, qui a juste besoin de découvrir les containers actifs pour router le trafic vers eux, pas d'en créer, pas d'y monter quoi que ce soit.

## L'architecture : deux hôtes, un rôle chacun, un tunnel entre les deux

J'ai séparé le rôle en deux hôtes :

- **Un hôte "edge"**, qui fait tourner le reverse proxy (Traefik) et reçoit tout le trafic entrant en 80/443.
- **Un hôte "backend"**, qui fait tourner les containers applicatifs en Docker rootless, et qui n'écoute jamais directement sur le réseau pour l'API Docker.

Le lien entre les deux, c'est un tunnel SSH que je monte via un compte de service dédié, qui redirige un port local de l'edge (`127.0.0.1:2375`) vers le socket Docker distant.

```bash
# Côté edge, monté par le compte de service traefikd
autossh -M 0 -N \
  -L 127.0.0.1:2375:/var/run/docker.sock \
  -o ServerAliveInterval=15 -o ServerAliveCountMax=3 \
  proxy@docker01.exemple.internal
```

Traefik, configuré avec `Network=host` sur son unit Podman Quadlet, peut alors dialoguer avec l'API Docker du backend comme si elle était locale : sans qu'un seul octet ne transite en clair sur le réseau, et sans qu'aucun port Docker ne soit jamais ouvert vers l'extérieur du backend.

```ini
# traefik.container (Podman Quadlet, extrait)
[Container]
Network=host
Environment=DOCKER_HOST=tcp://127.0.0.1:2375
```

## Une deuxième barrière : filtrer l'API elle-même

J'ai ajouté une deuxième barrière parce que même via le tunnel, l'API Docker complète reste bien plus large que ce dont un reverse proxy a besoin : il lui faut lister containers et réseaux, pas créer des volumes ou lancer de nouveaux containers. Un socket-proxy s'intercale entre le tunnel et le vrai socket, et n'autorise que les endpoints strictement nécessaires à la découverte de services :

```yaml
services:
  socket-proxy:
    image: tecnativa/docker-socket-proxy:v0.5.0
    environment:
      CONTAINERS: 1
      NETWORKS: 1
      SERVICES: 0
      TASKS: 0
      POST: 0        # aucune écriture, lecture seule
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - socket-proxy
```

`POST: 0` interdit toute opération d'écriture sur l'API : le proxy ne laisse passer que des lectures. Défense en profondeur : même une compromission complète du reverse proxy en amont ne donnerait pas un accès Docker en écriture côté backend, seulement une vue en lecture sur les containers et réseaux existants.

## Rootless des deux côtés

Les deux hôtes tournent en Docker/Podman **rootless** : les daemons s'exécutent sous des comptes de service dédiés (UID non-root), pas sous root. Ça limite ce qu'une évasion de container peut atteindre même en cas de compromission complète d'un container applicatif : l'attaquant hérite des droits du compte de service, pas de root sur l'hôte.

```bash
$ ps -o user,pid,cmd -C dockerd
USER       PID  CMD
dockeruser 4821 /usr/bin/dockerd-rootless.sh
```

## Le compte de service qui porte le tunnel n'a qu'un seul droit

J'ai limité le compte qui monte le tunnel SSH à un accès `authorized_keys` restreint, qui ne peut rien faire d'autre qu'ouvrir ce tunnel précis :

```text
# authorized_keys du compte proxy sur docker01
restrict,permitopen="127.0.0.1:2375" ssh-ed25519 AAAA... traefikd@traefik01
```

`restrict` désactive tout (exécution de commande, agent forwarding, allocation de PTY, redirection X11) et `permitopen` limite le seul forward autorisé au socket Docker, rien d'autre. Il ne peut ni exécuter de commande à distance, ni ouvrir un shell, ni forwarder vers un autre port. C'est le même principe que le socket-proxy, appliqué au niveau SSH plutôt qu'au niveau HTTP : deux couches indépendantes qui filtrent la même relation edge → backend, chacune à son niveau.

:::tip[Ne pas confondre deux comptes qui se ressemblent]
Sur l'hôte edge cohabitent deux comptes distincts : `traefikd` (le compte de service, UID dédié, qui gère à la fois le tunnel SSH et les Quadlets Traefik) et un compte local `traefik` préexistant (UID 1000) sans aucun rapport avec le service. Les confondre en debug fait perdre un temps précieux à chercher un problème de permissions du mauvais côté.
:::

## Ce qui rend ce pattern applicable ailleurs

C'est le point que je retiens le plus de cette mise en place, et l'idée dépasse Docker : chaque fois qu'un service a besoin de dialoguer avec une API sensible sur une autre machine, la question à se poser est : *a-t-il besoin d'un accès réseau direct, ou un tunnel restreint suffit-il ?* Un tunnel SSH avec des permissions `authorized_keys` serrées, combiné à un proxy filtrant côté applicatif, donne deux couches indépendantes de contrôle, et aucune des deux n'a besoin d'exposer quoi que ce soit publiquement pour que le reverse proxy fasse son travail.
