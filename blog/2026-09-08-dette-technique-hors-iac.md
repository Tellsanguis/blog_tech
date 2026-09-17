---
slug: dette-technique-hors-iac
title: "Ce que l'infra-as-code ne couvre pas : les machines configurées à la main"
authors: [tellserv]
tags: [ansible, infrastructure-as-code, dette-technique, retour-experience]
date: 2026-09-08
---

Tout un parc de VMs versionné, avec [un pipeline qui vérifie des signatures](/blog/gitops-signature-ssh-zero-trust) et se redéploie tout seul toutes les 30 minutes. Et puis deux ou trois machines, en dehors de ce système, dont l'état ne vit que sur elles-mêmes. Ce post parle d'un cas que j'observe régulièrement, et rarement documenté honnêtement : la dette technique qui s'accumule sur les exceptions au système qu'on a soi-même construit.

<!--truncate-->

## Comment on en arrive là

Ce n'est jamais une décision d'architecture délibérée. C'est une VM de dev montée dans l'urgence pour débloquer un test, un compte de service et des sudoers posés à la main un jour pour tenir un délai, un dépôt Ansible créé en avance d'une machine qui a ensuite évolué plus vite que le dépôt censé la décrire. Chaque exception individuelle est raisonnable sur le moment. Le problème, c'est leur accumulation silencieuse : personne ne décide un jour "on sort cette machine de l'infra-as-code", ça arrive petit à petit, sans jamais être acté nulle part.

## Le risque concret n'est pas "ça casse tout de suite"

Une machine hors infra-as-code fonctionne très bien, jusqu'au jour où quelqu'un, de bonne foi, rejoue le dépôt Ansible censé la décrire en pensant qu'il est à jour.

Un cas que j'ai rencontré : un dépôt de rôle Ansible qui ne déclarait que quatre volumes là où la VM réelle en montait huit, avec des composants entiers absents du dépôt (clé de chiffrement, configuration de CA, binaires additionnels) mais présents et fonctionnels sur la machine. Rejouer ce dépôt en l'état n'aurait pas fait "rien" : ça aurait démonté des points de montage actifs sur un service en production.

Le danger d'une dérive non documentée n'est donc pas l'absence de gestion de configuration en soi. C'est la **confiance résiduelle** que tout le monde continue d'accorder au dépôt, alors qu'il ne décrit plus la réalité. Un dépôt qu'on sait périmé est gérable : on sait qu'il faut vérifier avant d'agir. Un dépôt qu'on croit à jour et qui ne l'est pas, c'est un piège qui attend son tour.

## Ce qui aide, en pratique

**Documenter l'écart avant de le corriger.** J'écris noir sur blanc ce qui a été fait à la main, avec la date et la raison : ça coûte cinq minutes et évite à quelqu'un (moi inclus, six mois plus tard) de le redécouvrir en pleine investigation d'incident. C'est la différence entre une dette connue et gérée, et un piège invisible.

**Ne jamais rejouer un dépôt suspecté de dérive sans réconciliation préalable.** Avant d'exécuter, je compare l'état réel de la machine (montages, fichiers de configuration, versions installées) avec ce que le dépôt déclare. Si l'écart est significatif, le dépôt doit être mis à jour pour refléter la réalité *avant* d'être exécuté, jamais l'inverse.

**Accepter qu'une remédiation complète n'est pas toujours la priorité immédiate.** Documenter l'écart et le signal de risque ("ne pas exécuter ce dépôt en l'état") est une action à faible coût qui doit précéder, dans le temps, la réconciliation complète, laquelle peut légitimement attendre son tour dans les priorités quand rien ne presse par ailleurs.

## La leçon générale

Un système d'infra-as-code n'est fiable qu'à la hauteur de son exhaustivité perçue. Le risque ne vient pas des machines qu'on sait explicitement hors du système : celles-là, on les traite avec la prudence qu'elles méritent. Il vient de celles qu'on a oublié de compter comme telles, et pour lesquelles la confiance dans le dépôt reste, à tort, intacte.

La bonne discipline n'est pas d'exiger que 100 % du parc soit toujours parfaitement à jour dans le dépôt : sur un parc réel, avec des urgences réelles, ce n'est pas toujours tenable. C'est de savoir en permanence, sans ambiguïté, laquelle de ces deux catégories chaque machine appartient : "le dépôt la décrit fidèlement" ou "à vérifier avant toute exécution". Le pire état n'est pas la dérive elle-même, c'est de ne plus savoir laquelle des deux on a sous les yeux.
