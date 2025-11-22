---
sidebar_position: 12
---

# P12 - Active Directory Security Audit

## Context

Offensive security audit of a clinic's Windows domain and Active Directory: penetration testing, vulnerability identification and remediation plan.

## Objectives

- Perform a complete AD security audit
- Identify exploitable vulnerabilities
- Demonstrate risks through proof of concepts
- Propose a corrective action plan aligned with ANSSI/NIST

## Methodology

1. **Reconnaissance**: domain enumeration
2. **Exploitation**: controlled penetration tests
3. **Post-exploitation**: privilege escalation
4. **Report**: vulnerabilities and remediations

## Tools Used

| Tool | Usage |
|------|-------|
| **nmap** | Network and service scanning |
| **enum4linux** | SMB/AD enumeration |
| **Kerberoasting** | Kerberos ticket extraction |
| **Mimikatz** | Credential extraction |
| **BloodHound** | AD attack path analysis |

## Identified Vulnerabilities (Examples)

| Vulnerability | Criticality | Risk |
|---------------|-------------|------|
| Accounts with SPN and weak password | Critical | Kerberoasting -> privileged access |
| NTLM enabled | High | Pass-the-Hash |
| Unconstrained delegation | High | Identity impersonation |
| Cleartext passwords (GPP) | Critical | Immediate compromise |

## Deliverables

<details>
<summary>Pentest Report (PDF)</summary>

Detailed document of penetration tests performed and identified vulnerabilities.

<iframe src="/assets/projets-oc/p12/BENE_Mael_1_rapport_pentest_102025.pdf" width="100%" height="600px" style={{border: 'none'}}></iframe>

</details>

<details>
<summary>Corrective Action Plan (PDF)</summary>

Remediation plan with action prioritization according to criticality level.

<iframe src="/assets/projets-oc/p12/BENE_Mael_2_plan_action_102025.pdf" width="100%" height="600px" style={{border: 'none'}}></iframe>

</details>

<details>
<summary>Presentation (PDF)</summary>

Presentation slides for stakeholder reporting.

<iframe src="/assets/projets-oc/p12/BENE_Mael_3_restitution_102025.pdf" width="100%" height="600px" style={{border: 'none'}}></iframe>

</details>

## Skills Acquired

- Security audit methodology
- Pentesting tools usage
- Active Directory vulnerability analysis
- Audit report writing
- Remediation plan development
- Results presentation to stakeholders
