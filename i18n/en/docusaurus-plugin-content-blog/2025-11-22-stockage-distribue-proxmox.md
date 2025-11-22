---
slug: stockage-distribue-proxmox-ha
title: "Choosing a Distributed Storage Technology for a Proxmox HA Cluster"
authors: [tellserv]
tags: [proxmox, storage, ha, linstor, drbd, ceph, zfs, homelab]
---

# Choosing a Distributed Storage Technology for a Proxmox HA Cluster

When setting up my high-availability Proxmox cluster, choosing the right distributed storage technology turned out to be a crucial decision. This article presents my analysis approach and the final choice of Linstor DRBD.

<!--truncate-->

## The Problem

To set up a high-availability (HA) Proxmox cluster, shared storage between nodes is required. This shared storage enables:

- **Live migration** of VMs/LXC containers between nodes without service interruption
- **Automatic failover**: if a node fails, VMs can restart on another node
- **Data consistency** across all cluster nodes

The central question is: which distributed storage technology should I choose to meet these needs while respecting my homelab's hardware constraints?

## Hardware Constraints

My Proxmox cluster consists of three nodes with the following specifications:

### Production Nodes (x2)

| Component | Node 1 | Node 2 |
|-----------|--------|--------|
| CPU | Ryzen 7 5800U | Intel i7 8700T |
| RAM | 32 GB | 32 GB |
| Proxmox Storage | 128 GB SSD | 128 GB SSD |
| VM/LXC Storage | 512 GB SSD | 512 GB SSD |

### Witness Node

A lightweight third node whose sole purpose is to ensure cluster **quorum**. It doesn't participate in production data storage but prevents split-brain situations during network partitions.

### Network Infrastructure

**1 Gbps Switch** - This is a significant constraint that will heavily influence the technology choice.

## Solutions Considered

### Native Proxmox Solutions

#### Ceph

Ceph is the distributed storage solution most promoted by Proxmox. It's directly integrated into the management interface.

**Advantages:**
- Native integration in Proxmox (installation and management via web interface, which greatly simplifies deployment)
- Synchronous object/block/file replication
- Horizontal scalability
- Self-healing and automatic rebalancing

**Disadvantages:**
- **High resource consumption**: significant CPU and RAM for MON, MGR, and OSD processes
- **3 nodes minimum, but [5 recommended](https://ceph.io/en/news/blog/2019/part-3-rhcs-bluestore-performance-scalability-3-vs-5-nodes/)** for optimal performance (near-linear scalability thanks to Ceph's scale-out architecture)
- **Requires 10 Gbps network** for acceptable performance
- High operational complexity despite Proxmox's simplification efforts

In the context of my homelab with only 3 nodes (including 1 witness) and a 1 Gbps switch, Ceph would be undersized and its performance would be severely degraded.

#### Native ZFS Replication

Proxmox integrates ZFS and offers a snapshot-based replication mechanism.

**Advantages:**
- Native to Proxmox, no additional installation required
- Moderate RAM consumption (1 GB per TB of storage recommended)
- Works perfectly on a 1 Gbps network
- Proven ZFS reliability (checksums, self-healing)

**Disadvantages:**
- **Asynchronous replication** via incremental snapshots
- **RPO (Recovery Point Objective) = interval between snapshots**: in case of failure, data modified since the last snapshot is lost
- **No live migration**: VMs must be stopped to migrate
- HA possible but with potential data loss

This solution is therefore unsuitable for an HA cluster requiring live migration and near-zero RPO.

### Third-Party Solution: Linstor DRBD

LINSTOR is a distributed storage solution developed by LINBIT, based on DRBD (Distributed Replicated Block Device). An official plugin exists for Proxmox.

**Advantages:**
- **Block-level synchronous replication**: each write is confirmed only when replicated to the nodes
- **Low resource consumption**: minimal CPU/RAM overhead compared to Ceph
- **Fully operational with just 3 nodes**: 2 data nodes + 1 witness (diskless) architecture
- **Works on a 1 Gbps network** (optimal at 10 Gbps but viable at 1 Gbps)
- Official Proxmox plugin available
- Simple active/passive architecture, easy to understand and maintain

**Disadvantages:**
- Requires external plugin installation
- Less comprehensive documentation than Ceph
- Smaller community

## Why Linstor DRBD?

Given my homelab's constraints, Linstor DRBD seemed to be the most suitable choice:

### Infrastructure Fit

| Criterion | Ceph | ZFS Replication | Linstor DRBD |
|-----------|------|-----------------|--------------|
| Minimum nodes | 3 ([5 optimal](https://ceph.io/en/news/blog/2019/part-3-rhcs-bluestore-performance-scalability-3-vs-5-nodes/)) | 2 | 3 (2 + witness) |
| Recommended network | 10 Gbps | 1 Gbps | 1 Gbps (optimal 10 Gbps) |
| Replication type | Synchronous | Asynchronous | Synchronous |
| Live migration | Yes | No | Yes |
| RPO | ~0 | Snapshot interval | ~0 |
| Resource consumption | High | Moderate | Low |
| Proxmox integration | Native | Native | Plugin |

### The Witness Node's Role

With Linstor DRBD, the witness node plays an essential role:

- It participates in **quorum** without storing data (diskless mode)
- It enables **split-brain detection** and arbitration
- It **consumes virtually no resources** on this lightweight node

This architecture perfectly matches my configuration: 2 production nodes with SSD storage, and 1 minimal witness node for quorum.

### Performance on 1 Gbps Network

Unlike Ceph, which struggles significantly on a 1 Gbps network (communications between OSD, MON, and MGR quickly saturate bandwidth), DRBD is designed to be efficient even on more modest networks:

- Point-to-point replication between concerned nodes
- No complex distributed consensus protocol
- Minimal network overhead

## Solution Limitations

Despite its advantages, Linstor DRBD has certain limitations to be aware of:

### Active/Passive Architecture

Unlike Ceph, which allows simultaneous writes on multiple nodes, DRBD operates in active/passive mode:
- At any given time, only one node holds the write "lock" on a volume
- Migrations require transferring this lock

This doesn't impact live migration in Proxmox but may limit certain advanced use cases.

### Limited Scalability

DRBD is optimized for small to medium-sized clusters (2-4 data nodes). For larger infrastructures, Ceph becomes more relevant despite its complexity.

### Plugin Maintenance

The Proxmox plugin for Linstor is not maintained by Proxmox directly but by LINBIT. Compatibility must be monitored during major Proxmox updates.

## Conclusion

Given my specific constraints:
- 3 nodes (2 production + 1 witness)
- 1 Gbps switch
- Need for live migration and HA with near-zero RPO

**Linstor DRBD seems to be the most suitable solution for my context**, offering what I consider the best trade-off between features, performance, and resource consumption for my infrastructure. This is the solution I chose and deployed on my cluster.

This choice isn't universal: for an infrastructure with a 10 Gbps network and more nodes, Ceph could be a better candidate. Similarly, for use cases where live migration isn't critical and a few minutes of RPO is acceptable, native ZFS replication remains a perfectly viable and simpler option to implement.

### Side Note: My Ceph Experimentation

Before deploying Linstor DRBD, I experimented with Ceph for learning purposes. Here are the key concepts of its architecture:

- **MON (Monitor)**: maintains the cluster map (CRUSH map, OSD state). Requires an odd number (3 minimum recommended) for quorum
- **MGR (Manager)**: collects metrics, exposes the REST API and dashboard. Operates in active/standby mode
- **OSD (Object Storage Daemon)**: one daemon per disk, handles actual data storage and replication

On my test cluster, I deployed MON, MGR, and OSD on both production nodes, and **only a MON on the witness node**. Why? The witness has no dedicated data storage (no OSD possible), but it can participate in monitor quorum. With 3 MONs (2 on prod nodes + 1 on witness), the cluster can tolerate the loss of one monitor while maintaining quorum.

This experimentation helped me understand Ceph's architecture, but confirmed that its requirements (10 Gbps network, CPU/RAM resources) exceeded my current infrastructure's capabilities.
