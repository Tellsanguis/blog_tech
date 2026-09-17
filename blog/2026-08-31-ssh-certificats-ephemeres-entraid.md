---
slug: ssh-certificats-ephemeres-entraid
title: "SSH sans clés statiques : des certificats de 10h adossés à Entra ID"
authors: [tellserv]
tags: [ssh, pki, oidc, zero-trust, sécurité, step-ca]
date: 2026-08-31
---

Remplacer les clés SSH statiques d'une équipe d'admins par des certificats éphémères, émis à la demande via une authentification OIDC (Entra ID + MFA), valables 10 heures. Ce post décrit l'architecture mise en place sur un parc d'une dizaine de VMs, et surtout les deux ou trois surprises qu'on ne trouve pas dans la doc tant qu'on ne l'a pas vraiment mise en prod.

<p align="center">
  <img src="/img/blog/ssh-certificats-ephemeres-entraid/flux-certificat-ssh.svg" alt="Schéma du flux : un admin s'authentifie via OIDC auprès d'Entra ID, step-ca signe un certificat SSH éphémère à partir des claims du jeton, présenté ensuite à la VM cible" width="720" />
</p>

<!--truncate-->

## Pourquoi abandonner les clés statiques

Une clé SSH classique, une fois distribuée sur un parc de machines, ne "sait" rien de qui l'utilise ni depuis quand. La révoquer signifie repasser sur chaque VM une par une. Elle n'expire jamais d'elle-même, et rien ne relie son usage à une identité vérifiée au moment de la connexion : si elle fuite, elle reste valable jusqu'à ce que quelqu'un s'en aperçoive.

L'objectif : que chaque connexion SSH soit adossée à une preuve d'identité fraîche (MFA compris), avec une fenêtre de validité courte qui rend une fuite de credential largement moins dangereuse.

## L'architecture : step-ca comme CA SSH, OIDC en frontal

Le principe repose sur [step-ca](https://smallstep.com/docs/step-ca/), qui fait office d'autorité de certification SSH interne. Pour se connecter, un admin s'authentifie via un *provisioner* OIDC adossé à Entra ID (avec MFA), et reçoit en échange un certificat SSH signé, valable 10 heures.

```bash
export SSH_AUTH_SOCK=~/.ssh/step-agent.sock
step ssh login admin@exemple.fr --provisioner entraid-ops
ssh-add -l   # doit lister une clé ECDSA-CERT
```

Le certificat émis porte des **principals** (les identités que le certificat autorise à endosser), et chaque VM du parc n'accepte que les principals attendus, via `AuthorizedPrincipalsFile /etc/ssh/auth_principals/%u`.

Deux verrous d'appartenance à un groupe, cumulatifs, conditionnent l'émission :
- l'affectation du compte dans un groupe Entra ID,
- le champ `groups` configuré côté provisioner step-ca.

Il faut passer les deux pour obtenir un certificat : un seul des deux ne suffit pas.

Le point qui fait vraiment la différence avec une clé statique : **le principal inscrit dans le certificat vient d'un claim du jeton OIDC** (l'adresse email vérifiée par Entra ID), pas d'un argument que l'utilisateur tape en ligne de commande. Concrètement :

```bash
step ssh certificate admin@exemple.fr id_ecdsa --provisioner entraid-ops
```

On peut bien taper `mbene@` sur la ligne de commande, mais le certificat émis porte le KeyID renvoyé par Entra ID, typiquement `Admin@exemple.fr`, avec sa casse d'origine. On ne peut donc pas se fabriquer un principal arbitraire en tapant simplement autre chose : c'est le fournisseur d'identité qui décide, pas le client.

:::tip[Un détail de casse qui a son importance]
Depuis une évolution récente, les templates SSH (`ops.tpl`, `build.tpl`) émettent un **second** principal en plus de celui du KeyID brut : `{{ toJson (lower .KeyID) }}`, soit l'adresse en minuscules (fonction `lower` de sprig, disponible depuis step-ca 0.30.2). Sans ça, un admin tapant son adresse en minuscules pouvait se retrouver avec un certificat dont le principal ne correspondait à rien côté `AuthorizedPrincipalsFile`, faute de correspondance exacte de casse. Ce second principal n'ouvre par ailleurs aucun accès VM supplémentaire : ces fichiers ne listent que `ops` et le compte de service, jamais l'adresse elle-même.
:::

## Une clé statique reste utile, une seule fois

Le premier run d'une VM neuve pose un problème d'œuf et de poule : la VM ne fait pas encore confiance à la CA, donc aucun certificat n'est utilisable pour s'y connecter. La clé statique reste le seul mécanisme possible pour ce bootstrap initial :

```bash
ansible-playbook site.yml -u ops --private-key ~/.ssh/ops --limit nouvelle-vm.exemple.internal
```

Une fois ce premier run passé, `ansible-pull` prend le relais et bascule tout sur le certificat : la clé statique redevient inutile jusqu'à la prochaine VM neuve. C'est un cas où garder un mécanisme "legacy" en circulation, mais volontairement cantonné à une seule étape bien identifiée, est le bon compromis plutôt que de forcer un chicken-and-egg impossible à résoudre autrement.

## La vraie surprise : un commit signé par certificat ne déclenche jamais le badge "Vérifié"

C'est le point le plus contre-intuitif de toute la migration, et celui que j'ai heureusement testé avant d'activer une protection de branche : sans ça, il aurait pu casser un pipeline entier.

Les forges Git (testé sur Forgejo) vérifient les signatures SSH en comparant contre des **clés publiques enregistrées** sur le compte, pas contre une autorité de certification. Un commit signé par un certificat SSH parfaitement valide, émis par une CA de confiance, ne matche donc jamais une clé publique connue de la forge : le badge reste gris, même si la signature est cryptographiquement valide et vérifiable en ligne de commande.

```bash
$ git verify-commit HEAD
Good "git" signature for admin@exemple.fr with ECDSA key SHA256:xxxx
```

La ligne de commande confirme une signature parfaitement valide. L'interface web, elle, n'affichera jamais de cadenas vert pour ce commit.

Rien dans le binaire ni dans la documentation de la forge (j'ai vérifié sur la v15) ne permet de déclarer une CA comme racine de confiance pour la vérification de signature côté interface : `ParseObjectWithSSHSignature` ne compare qu'à des clés publiques enregistrées, en excluant explicitement les principals.

:::danger[Corollaire opérationnel]
**Ne jamais activer "exiger des commits signés" en protection de branche** pour une équipe qui signe par certificat plutôt que par clé statique. La protection bloquerait des commits pourtant légitimement signés et parfaitement vérifiables en ligne de commande, juste parce que l'interface web ne sait pas les reconnaître.
:::

La vérification de sécurité réelle (celle qui compte, côté pipeline de déploiement) reste faite en ligne de commande avec `git verify-commit` / `git verify-tag`, qui fonctionne très bien avec les certificats via une entrée `cert-authority` dans `allowed_signers` :

```text
# /etc/ansible/pull/allowed_signers
admin@exemple.fr ssh-ed25519 AAAA...   # clé fixe personnelle
@cert-authority *.exemple.internal cert-authority ssh-rsa AAAA...   # CA step-ca
```

N'importe quel membre du groupe `ops` peut ainsi signer un tag `deploy-*` avec son certificat éphémère du jour, sans qu'une clé statique individuelle soit nécessaire dans ce fichier (voir [le post sur le pipeline GitOps signé](/blog/gitops-signature-ssh-zero-trust) pour le détail de ce que cette vérification protège, et de ce qu'elle ne protège pas).

## L'expiration ne casse pas rétroactivement une signature

Autre détail qui vaut d'être su avant de paniquer en debug : **git vérifie la validité d'un certificat au moment où l'objet a été signé, pas par rapport à l'heure courante.** Un tag signé avec un certificat encore valide reste vérifiable des mois après l'expiration de ce certificat.

En revanche, signer *après* expiration échoue immédiatement :

```bash
$ git tag -s deploy-2026-09-09-fix -m "deploy fix"
error: gpg.ssh.allowedSignersFile needs to be configured...
sign_and_send_pubkey: signing failed: agent refused operation
```

Le réflexe que j'ai fini par adopter en cas d'erreur de signature inattendue est simple : rafraîchir le certificat (`step ssh login`) avant de chercher plus loin. Neuf fois sur dix, ce n'est pas une régression de configuration : c'est juste un certificat de 10h qui a fini par expirer pendant qu'on regardait ailleurs.

## Un compte de service, sudo minimal

Au-delà des comptes nominatifs, un compte de service (`svc-update`) dispose de son propre provisioner JWK dédié, avec des certificats bien plus courts (30 minutes) et un sudo strictement limité :

```text
svc-update ALL=(root) NOPASSWD: /usr/bin/dnf -y upgrade, \
                                 /usr/bin/apt-get update, \
                                 /usr/bin/apt-get -y dist-upgrade, \
                                 /usr/sbin/reboot
```

Le principe reste le même que pour les comptes humains : une identité, un scope explicite, une fenêtre de validité courte, juste avec un sudoers taillé au strict nécessaire plutôt qu'un accès `ops` complet.

## Ce qui a été délibérément laissé de côté

Toute migration a ses angles non couverts au jour où j'écris ce post :

- **Les certificats d'hôte SSH** (authentifier le serveur au client, pas seulement l'inverse) ne sont pas encore en place.
- **La comparaison entre les identifiants du fournisseur d'identité et les adresses vérifiées côté forge Git**, pour chaque compte de l'équipe, reste à faire de façon systématique plutôt qu'au cas par cas.

Une architecture zero-trust bien conçue reste un chantier continu, pas un état fini un beau jour.

## Ce que je retiens

Le point le plus utile de cette migration n'est pas l'architecture OIDC → step-ca en elle-même (relativement bien documentée par ailleurs) mais les frictions qu'aucune doc ne mentionne : un badge d'interface qui ne suivra jamais un modèle de confiance basé sur une CA, une casse de KeyID capable de casser silencieusement un accès, une expiration de certificat qui n'invalide rien rétroactivement. Ce sont exactement le genre de détails qui, non testés avant d'activer une protection stricte, se transforment en incident de production plutôt qu'en ligne de documentation.
