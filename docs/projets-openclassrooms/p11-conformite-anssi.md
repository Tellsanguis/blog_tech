---
sidebar_position: 11
---

# Conformité ANSSI pour SI de santé

## Contexte

Application des recommandations ANSSI pour la sécurisation du système d'information d'OpenPharma : cartographie, administration sécurisée et budget d'évolution.

## Objectifs

- Analyser et synthétiser les guides ANSSI applicables
- Réaliser la cartographie du SI existant
- Proposer une architecture cible conforme
- Établir un budget matériel et logiciel
- Planifier le projet de mise en conformité

## Guides ANSSI appliqués

- **Cartographie du système d'information** (v1b, 2018)
- **Administration sécurisée des SI** (v3.0)

## Technologies et solutions proposées

| Besoin | Solution | Justification |
|--------|----------|---------------|
| Bastion d'administration | Teleport | Open source, audit intégré |
| SIEM | Wazuh | Détection, conformité, gratuit |
| Firewall | FortiGate 60F | UTM, support constructeur |
| Sauvegarde | Synology RS822+ | NAS rack, snapshots, réplication |

## Livrables

<details>
<summary>Cartographie du SI (PDF)</summary>

<iframe src="/assets/projets-oc/p11/BENE_Mael_1_cartographie_092025.pdf" width="100%" height="600px" style={{border: 'none'}}></iframe>

</details>

<details>
<summary>Plan projet (PDF)</summary>

<iframe src="/assets/projets-oc/p11/BENE_Mael_2_plan_projet_092025.pdf" width="100%" height="600px" style={{border: 'none'}}></iframe>

</details>

<details>
<summary>Documentation utilisateurs et administrateurs (PDF)</summary>

<iframe src="/assets/projets-oc/p11/BENE_Mael_3_documentation_092025.pdf" width="100%" height="600px" style={{border: 'none'}}></iframe>

</details>

## Compétences acquises

- Analyse et application des référentiels ANSSI
- Cartographie de systèmes d'information
- Conception d'architectures sécurisées
- Élaboration de budgets IT
- Gestion de projet de mise en conformité
- Prise en compte des contraintes sectorielles (santé)
