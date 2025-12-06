---
sidebar_position: 8
tags: [nagios, supervision, monitoring, syslog]
last_update:
  date: 2025-11-22
---

# Supervision avec Nagios

## Contexte

Mise en place d'une solution de supervision pour MediaSanté : déploiement de Nagios avec sondes personnalisées et centralisation des logs avec Rsyslog.

## Objectifs

- Installer et configurer Nagios Core
- Créer des sondes de supervision personnalisées
- Centraliser les logs avec Rsyslog
- Définir des indicateurs SLA et produire des rapports

## Technologies utilisées

- **Nagios Core** : supervision d'infrastructure
- **NRPE** : exécution de sondes distantes
- **Rsyslog** : centralisation des logs
- **SNMP** : supervision réseau

## Sondes configurées

| Service | Seuil Warning | Seuil Critical | Action opérateur |
|---------|---------------|----------------|------------------|
| CPU | > 80% | > 95% | Identifier processus consommateurs |
| RAM | > 85% | > 95% | Vérifier fuites mémoire |
| Disque | > 80% | > 90% | Nettoyage ou extension |
| HTTP | latence > 2s | indisponible | Redémarrage service |
| MySQL | connexions > 80% | > 95% | Analyse requêtes |

## Livrables

<details>
<summary>Configuration Nagios (capture)</summary>

![Configuration Nagios](/assets/projets-oc/p08/BENE_Mael_1_config_nagios_062025.png)

</details>

<details>
<summary>Configuration Rsyslog (archive)</summary>

Archive contenant les fichiers de configuration Rsyslog pour la centralisation des logs.

[Télécharger l'archive de configuration Rsyslog](/assets/projets-oc/p08/BENE_Mael_2_config_Rsyslog_062025.tar.gz)

</details>

<details>
<summary>Indicateurs SLA (PDF)</summary>

<iframe src="/assets/projets-oc/p08/BENE_Mael_3_indicateurs_062025.pdf" width="100%" height="600px" style={{border: 'none'}}></iframe>

</details>

<details>
<summary>Documentation des sondes (PDF)</summary>

<iframe src="/assets/projets-oc/p08/BENE_Mael_4_documentation_062025.pdf" width="100%" height="600px" style={{border: 'none'}}></iframe>

</details>

## Compétences acquises

- Déploiement d'une solution de supervision
- Création de sondes personnalisées
- Centralisation et analyse de logs
- Définition d'indicateurs de performance (KPI/SLA)
- Production de rapports de disponibilité
