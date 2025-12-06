---
sidebar_position: 2
tags: [itsm, itil, glpi, gestion-parc]
last_update:
  date: 2025-11-22
---

# Gestion des demandes au quotidien

## Contexte

Mise en place d'un système de gestion des demandes et incidents informatiques selon les bonnes pratiques ITIL, avec l'outil GLPI.

## Objectifs

- Configurer et utiliser GLPI pour la gestion des tickets
- Appliquer la méthodologie ITIL pour le traitement des incidents et demandes
- Mettre en place un inventaire automatisé du parc informatique
- Créer des procédures et logigrammes de traitement

## Technologies utilisées

- **GLPI** : gestion de parc et ticketing
- **Agent GLPI** : inventaire automatisé
- **ITIL** : méthodologie de gestion des services IT

## Livrables

<details>
<summary>Export base GLPI (SQL)</summary>

Le fichier SQL est volumineux (export complet de la base GLPI). Voici un extrait de sa structure :

```sql
-- MariaDB dump 10.19  Distrib 10.11.6-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: glpi
-- ------------------------------------------------------
-- Server version	10.11.6-MariaDB-0+deb12u1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- Table structure for table `glpi_agents`
CREATE TABLE `glpi_agents` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `deviceid` varchar(255) NOT NULL,
  `entities_id` int(10) unsigned NOT NULL DEFAULT 0,
  `name` varchar(255) DEFAULT NULL,
  `agenttypes_id` int(10) unsigned NOT NULL,
  `last_contact` timestamp NULL DEFAULT NULL,
  `version` varchar(255) DEFAULT NULL,
  -- ... autres colonnes
  PRIMARY KEY (`id`),
  UNIQUE KEY `deviceid` (`deviceid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

[Télécharger le fichier SQL complet](/assets/projets-oc/p02/bene_mael_1_export_122024.sql)

</details>

<details>
<summary>Présentation de l'agent GLPI (PDF)</summary>

<iframe src="/assets/projets-oc/p02/bene_mael_3_agent_GLPI_122024.pdf" width="100%" height="600px" style={{border: 'none'}}></iframe>

</details>

<details>
<summary>Logigrammes - Processus de traitement des demandes (PDF)</summary>

<iframe src="/assets/projets-oc/p02/bene_mael_4_logigramme_122024.pdf" width="100%" height="600px" style={{border: 'none'}}></iframe>

</details>

## Compétences acquises

- Configuration d'un outil ITSM
- Application des processus ITIL (gestion des incidents, des demandes, des problèmes)
- Rédaction de procédures techniques
- Mise en place d'un inventaire automatisé
