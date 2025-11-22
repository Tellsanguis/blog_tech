---
sidebar_position: 12
---

# Audit de sécurité Active Directory

## Contexte

Audit de sécurité offensive du domaine Windows et de l'Active Directory d'une clinique : tests d'intrusion, identification des vulnérabilités et plan de remédiation.

## Objectifs

- Réaliser un audit de sécurité complet de l'AD
- Identifier les vulnérabilités exploitables
- Démontrer les risques par des preuves de concept
- Proposer un plan d'actions correctives aligné ANSSI/NIST

## Méthodologie

1. **Reconnaissance** : énumération du domaine
2. **Exploitation** : tests d'intrusion contrôlés
3. **Post-exploitation** : élévation de privilèges
4. **Rapport** : vulnérabilités et remédiations

## Outils utilisés

| Outil | Utilisation |
|-------|-------------|
| **nmap** | Scan réseau et services |
| **enum4linux** | Énumération SMB/AD |
| **Kerberoasting** | Extraction de tickets Kerberos |
| **Mimikatz** | Extraction de credentials |
| **BloodHound** | Analyse des chemins d'attaque AD |

## Vulnérabilités identifiées (exemples)

| Vulnérabilité | Criticité | Risque |
|---------------|-----------|--------|
| Comptes avec SPN et mot de passe faible | Critique | Kerberoasting -> accès privilégié |
| NTLM activé | Élevée | Pass-the-Hash |
| Délégation non contrainte | Élevée | Usurpation d'identité |
| Mots de passe en clair (GPP) | Critique | Compromission immédiate |

## Livrables

<details>
<summary>Rapport de pentest (PDF)</summary>

Document détaillé des tests d'intrusion réalisés et des vulnérabilités identifiées.

<iframe src="/assets/projets-oc/p12/BENE_Mael_1_rapport_pentest_102025.pdf" width="100%" height="600px" style={{border: 'none'}}></iframe>

</details>

<details>
<summary>Plan d'actions correctives (PDF)</summary>

Plan de remédiation avec priorisation des actions selon le niveau de criticité.

<iframe src="/assets/projets-oc/p12/BENE_Mael_2_plan_action_102025.pdf" width="100%" height="600px" style={{border: 'none'}}></iframe>

</details>

<details>
<summary>Présentation de restitution (PDF)</summary>

Support de présentation pour la restitution aux parties prenantes.

<iframe src="/assets/projets-oc/p12/BENE_Mael_3_restitution_102025.pdf" width="100%" height="600px" style={{border: 'none'}}></iframe>

</details>

## Compétences acquises

- Méthodologie d'audit de sécurité
- Utilisation d'outils de pentesting
- Analyse de vulnérabilités Active Directory
- Rédaction de rapports d'audit
- Élaboration de plans de remédiation
- Restitution des résultats aux parties prenantes
