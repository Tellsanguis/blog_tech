---
sidebar_position: 2
---

# Daily Request Management

## Context

Implementation of a request and incident management system following ITIL best practices, using the GLPI tool.

## Objectives

- Configure and use GLPI for ticket management
- Apply ITIL methodology for incident and request handling
- Set up automated IT inventory
- Create processing procedures and flowcharts

## Technologies Used

- **GLPI**: asset management and ticketing
- **GLPI Agent**: automated inventory
- **ITIL**: IT service management methodology

## Deliverables

<details>
<summary>GLPI Database Export (SQL)</summary>

The SQL file is large (complete GLPI database export). Here is an excerpt of its structure:

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
  -- ... other columns
  PRIMARY KEY (`id`),
  UNIQUE KEY `deviceid` (`deviceid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

[Download complete SQL file](/assets/projets-oc/p02/bene_mael_1_export_122024.sql)

</details>

<details>
<summary>GLPI Agent Presentation (PDF)</summary>

<iframe src="/assets/projets-oc/p02/bene_mael_3_agent_GLPI_122024.pdf" width="100%" height="600px" style={{border: 'none'}}></iframe>

</details>

<details>
<summary>Flowcharts - Request Processing Workflows (PDF)</summary>

<iframe src="/assets/projets-oc/p02/bene_mael_4_logigramme_122024.pdf" width="100%" height="600px" style={{border: 'none'}}></iframe>

</details>

## Skills Acquired

- ITSM tool configuration
- Application of ITIL processes (incident, request, problem management)
- Technical procedure documentation
- Automated inventory implementation
