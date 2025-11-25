---
sidebar_position: 2
---

# First Version: Single-Machine "HA" Homelab (Initial Project)

:::info
Full English translation coming soon.
:::

## Introduction

**Important note**: This page describes the **initial project** I had planned to experiment with Kubernetes. This project **evolved** into a different final decision: a 3-node Proxmox cluster (see [3-Node Proxmox Cluster](./cluster-3-noeuds-proxmox.md)).

The initial idea was to create a **transitional step** toward a complete distributed infrastructure, experimenting with Kubernetes (K3S), Infrastructure as Code (OpenTofu/Terraform), Git, and CI/CD pipelines, while remaining on a single physical machine.

## Objectives

### Practical Learning

This single-machine infrastructure allows acquiring hands-on experience with:
- **Kubernetes (K3S)**: Installation, configuration, and management
- **Infrastructure as Code**: OpenTofu/Terraform for declarative infrastructure
- **GitOps and CI/CD**: Automated deployments with Forgejo Actions
- **Observability**: Prometheus, Grafana, Loki stack

## Network Architecture

![Future homelab network diagram](/img/diagrams/homelab-futur-network.png)

[📥 Download PDF](/img/diagrams/homelab-futur-network.pdf)

## What Can Be Learned

This single-machine infrastructure allows acquiring essential skills:
- Kubernetes deployments and management
- DevOps practices (IaC, GitOps, CI/CD)
- Monitoring and logging
- Automation with Ansible and OpenTofu

## Limitations of This Approach

### 1. No Real High Availability (HA)

**Main limitation**: With a single machine, there is **no redundancy**:
- Single point of failure (SPOF)
- Maintenance requires downtime
- No automatic failover

### 2. Distributed Storage Impossible to Test

**Critical limitation**: Distributed storage (Ceph, Linstor DRBD, Longhorn with replication) requires **at least 3 nodes**:
- **Ceph**: Requires 3 nodes minimum (ideally 5+) for quorum and replication
- **Linstor DRBD**: Needs multiple nodes for synchronous data replication
- **Longhorn** (replication): Cannot replicate data to other nodes

### 3. Limited Scalability

- Cannot add worker nodes to increase capacity
- Hardware limitations of single machine
- No experience with horizontal auto-scaling

### 4. Simplified Network

- All pods on the same physical machine
- Negligible network latency
- No multi-node CNI complexity

### 5. No Realistic Failure Simulation

- Cannot simulate node failure
- No automatic failover testing
- No disaster recovery validation

## Why Start with Single Machine?

Despite limitations, this approach has **significant advantages**:

### 1. Cost and Simplicity

- Reduced investment (no need to buy 3-5 servers immediately)
- Lower power consumption
- Simplified maintenance

### 2. Progressive Learning Curve

- Manageable complexity
- Simplified debugging
- Less costly mistakes

### 3. Architecture Validation

- Test which services work well on K8S
- Optimize resource configurations
- Identify incompatibilities before scaling

### 4. Preparation for Evolution

This version serves as a **foundation** for the complete cluster:
- Reusable IaC code
- Tested and validated Kubernetes manifests
- Operational CI/CD pipelines

## Evolution Toward Real Cluster

Once stabilized, evolution toward multi-node cluster becomes natural:

**Minimum for functional HA cluster**:
- 3 nodes (1 control plane + 2 workers, or 3 mixed nodes)
- Gigabit network switch
- Distributed storage (Ceph ideally requires 5 nodes)

**Migration strategy**:
1. Add second node to existing cluster
2. Test pod distribution between nodes
3. Add third node to enable HA
4. Deploy Ceph or Linstor for distributed storage
5. Migrate critical workloads with replication

## Conclusion

This single-machine "HA" version is an **essential pedagogical step** before deploying a real Kubernetes cluster:

**Positive points**:
- Learn Kubernetes without multi-node complexity
- Validate architecture and configurations
- Reduced cost and simplified maintenance
- Solid foundation to evolve toward complete cluster

**Assumed limitations**:
- No real high availability
- Distributed storage impossible to test (Ceph, Linstor)
- Limited scalability
- No realistic failure simulation

This approach allows **methodical progression** toward a complete cloud-native infrastructure while mastering each step of the process.

:::note
Detailed English translation of this page is in progress.
:::
