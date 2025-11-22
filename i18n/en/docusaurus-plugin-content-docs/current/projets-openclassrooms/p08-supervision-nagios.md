---
sidebar_position: 8
---

# P8 - Monitoring with Nagios

## Context

Implementation of a monitoring solution for MediaSante: Nagios deployment with custom probes and log centralization with Rsyslog.

## Objectives

- Install and configure Nagios Core
- Create custom monitoring probes
- Centralize logs with Rsyslog
- Define SLA indicators and produce reports

## Technologies Used

- **Nagios Core**: infrastructure monitoring
- **NRPE**: remote probe execution
- **Rsyslog**: log centralization
- **SNMP**: network monitoring

## Configured Probes

| Service | Warning Threshold | Critical Threshold | Operator Action |
|---------|-------------------|-------------------|-----------------|
| CPU | > 80% | > 95% | Identify consuming processes |
| RAM | > 85% | > 95% | Check memory leaks |
| Disk | > 80% | > 90% | Cleanup or extension |
| HTTP | latency > 2s | unavailable | Service restart |
| MySQL | connections > 80% | > 95% | Query analysis |

## Deliverables

<details>
<summary>Nagios Configuration (screenshot)</summary>

![Nagios Configuration](/assets/projets-oc/p08/BENE_Mael_1_config_nagios_062025.png)

</details>

<details>
<summary>Rsyslog Configuration (archive)</summary>

Archive containing Rsyslog configuration files for log centralization.

[Download Rsyslog configuration archive](/assets/projets-oc/p08/BENE_Mael_2_config_Rsyslog_062025.tar.gz)

</details>

<details>
<summary>SLA Indicators (PDF)</summary>

<iframe src="/assets/projets-oc/p08/BENE_Mael_3_indicateurs_062025.pdf" width="100%" height="600px" style={{border: 'none'}}></iframe>

</details>

<details>
<summary>Probes Documentation (PDF)</summary>

<iframe src="/assets/projets-oc/p08/BENE_Mael_4_documentation_062025.pdf" width="100%" height="600px" style={{border: 'none'}}></iframe>

</details>

## Skills Acquired

- Monitoring solution deployment
- Custom probe creation
- Log centralization and analysis
- Performance indicator definition (KPI/SLA)
- Availability report production
