---
slug: linstor-drbd-opentofu-problemes
title: "Deploying with OpenTofu on LINSTOR DRBD: the beginning of problems"
authors: [tellserv]
tags: [homelab, proxmox, linstor, drbd, opentofu, terraform, iac, gitops, kubernetes]
date: 2025-11-26
---

After [choosing LINSTOR DRBD as the distributed storage solution](/blog/stockage-distribue-proxmox-ha) for my Proxmox HA cluster, it was time to move on to deployment automation with OpenTofu (open-source fork of Terraform). Spoiler: it didn't go as planned.

<!--truncate-->

## Context Recap

In my [previous article about choosing a distributed storage technology](/blog/stockage-distribue-proxmox-ha), I opted for LINSTOR DRBD over Ceph for several reasons:

- **Superior performance**: LINSTOR DRBD uses synchronous block-level replication via DRBD, offering better performance than Ceph on a 1 Gbps network
- **Simpler architecture**: No need for monitors, managers, and OSDs like with Ceph
- **Resource consumption**: Lighter on RAM and CPU

My infrastructure consists of:
- **3 Proxmox nodes**: acemagician (192.168.100.10), elitedesk (192.168.100.20), thinkpad (192.168.100.30)
- **LINSTOR configuration**: thinkpad = controller, acemagician/elitedesk = satellites
- **Storage pools**: `linstor_storage` (DRBD-replicated), `local-lvm` (local storage)

## The Problem: LINSTOR Cannot Dynamically Provision VMs

When I attempted to deploy my K3s VMs with OpenTofu using the Proxmox provider, I encountered a systematic error:

```bash
Error: error creating VM: error cloning vm: 500 Internal Server Error:
unable to create VM 1000 - lvcreate 'linstor_storage/vm-1000-disk-0' error:
Exited with error code 1: Resource definition 'vm-1000-disk-0' not found.
```

My OpenTofu configuration was standard:

```hcl
resource "proxmox_vm_qemu" "k3s_server_1" {
  name        = "k3s-server-1"
  target_node = "acemagician"
  clone       = "ubuntu-2404-cloudinit"
  vmid        = 1000

  disk {
    storage  = "linstor_storage"
    size     = "100G"
  }
}
```

### Why Does It Fail?

LINSTOR uses a strict hierarchical object model:

1. **Resource Definition**: Template for a storage resource
2. **Volume Definition**: Volume size and properties
3. **Resource**: Actual storage instance on a node

The normal LINSTOR workflow requires manually creating these objects:

```bash
linstor resource-definition create mydata
linstor volume-definition create mydata 100G
linstor resource create node1 mydata --storage-pool linstor_storage
linstor resource create node2 mydata --storage-pool linstor_storage
```

**The problem**: When Proxmox attempts to clone a VM to LINSTOR:
1. Proxmox calls `lvcreate` to create the new disk
2. The LINSTOR plugin searches for the resource definition `vm-XXX-disk-0`
3. **The resource definition doesn't exist** (Proxmox assumes dynamic creation)
4. The operation fails

LINSTOR cannot dynamically create resource definitions during Proxmox clone operations. This is a fundamental architectural limitation.

### Workaround Attempts

I tried several approaches:

#### 1. Explicit Full Clone

```hcl
resource "proxmox_vm_qemu" "k3s_server_2" {
  name        = "k3s-server-2"
  target_node = "elitedesk"
  clone       = "ubuntu-2404-cloudinit"
  vmid        = 1001
  full_clone  = true  # Explicit full clone

  disk {
    storage  = "linstor_storage"
    size     = "100G"
  }
}
```

**Result**: Same error - "Resource definition not found"

#### 2. Linked Clone

```hcl
full_clone = false  # Attempt a linked clone
```

**Result**:
```
Error: 400 Bad Request:
Parameter verification failed. (400)
storage: linked clone feature is not supported for 'linstor_storage'
```

This makes sense: DRBD doesn't support snapshots, which are required for linked clones.

## Considered Solutions

Faced with this problem, I'm torn between several options:

### Option 1: Pre-creation Script for Resource Definitions

Create a bash or Python script that runs before OpenTofu to pre-create the resource definitions:

```python
#!/usr/bin/env python3
import subprocess
import json

def create_linstor_resource(vm_id, size_gb, nodes):
    """Creates a LINSTOR resource definition for a VM"""
    resource_name = f"vm-{vm_id}-disk-0"

    # Create the resource definition
    subprocess.run([
        "linstor", "resource-definition", "create", resource_name
    ], check=True)

    # Create the volume definition
    subprocess.run([
        "linstor", "volume-definition", "create",
        resource_name, f"{size_gb}G"
    ], check=True)

    # Create the resource on each node
    for node in nodes:
        subprocess.run([
            "linstor", "resource", "create",
            node, resource_name,
            "--storage-pool", "linstor_storage"
        ], check=True)

# Create resources for K3s VMs
vms = [
    {"id": 1000, "size": 100, "nodes": ["acemagician", "elitedesk"]},
    {"id": 1001, "size": 100, "nodes": ["elitedesk", "thinkpad"]},
    {"id": 1002, "size": 20, "nodes": ["thinkpad", "acemagician"]},
]

for vm in vms:
    create_linstor_resource(vm["id"], vm["size"], vm["nodes"])
```

**Advantages**:
- Keeps LINSTOR DRBD usage
- Allows automation via CI/CD
- Maintains DRBD's superior performance
- Preserves distributed storage for VMs

**Disadvantages**:
- Additional complexity in the pipeline
- Risk of desynchronization between script and OpenTofu configuration
- Requires rigorous management of VMIDs and their allocation

### Option 2: Manual Creation of Resource Definitions

Manually create LINSTOR resources before each deployment:

```bash
# For k3s-server-1 (VMID 1000)
linstor resource-definition create vm-1000-disk-0
linstor volume-definition create vm-1000-disk-0 100G
linstor resource create acemagician vm-1000-disk-0 --storage-pool linstor_storage
linstor resource create elitedesk vm-1000-disk-0 --storage-pool linstor_storage
```

**Advantages**:
- Simple and straightforward solution
- Full control over LINSTOR resources

**Disadvantages**:
- **Loss of Infrastructure as Code**: Configuration drift guaranteed
- **Loss of GitOps**: No traceability in git
- **Not automatable**: Manual intervention for each deployment
- **Not scalable**: Impossible for frequent deployments

This option completely contradicts my automation goals. **This solution should be ruled out.**

### Option 3: Partition NVMe Drives (Local Storage + LINSTOR)

Partition the NVMe drives on each node into two parts:
- One partition for local LVM storage (`local-lvm`)
- One partition for the LINSTOR DRBD pool (`linstor_storage`)

Then use `local-lvm` for VM disks (simple provisioning) and `linstor_storage` for other needs requiring replication.

**Important note for my Kubernetes use case**: Using `local-lvm` (without Proxmox-level replication) is viable for a Kubernetes cluster because **Kubernetes handles high availability**, not Proxmox. With etcd distributed across 3 nodes and a replicated control plane, the loss of a VM doesn't impact the cluster - Kubernetes continues to function with the remaining nodes. VMs become "cattle" (replaceable via Infrastructure as Code) while real "pets" data (precious) would reside in application-level storage solutions.

**Advantages**:
- Simple and fast VM provisioning on `local-lvm`
- Preservation of LINSTOR DRBD for distributed storage needs
- Optimal use of available hardware
- Maximum performance for VMs (direct local access)
- **HA ensured at the right level**: Kubernetes, not Proxmox

**Disadvantages**:
- **Setup complexity**: Disk repartitioning required
- **Risk of data loss**: Invasive operation on existing disks
- **Capacity planning**: Need to determine partition size in advance
- **Less flexibility**: Fixed partition sizes, difficult to modify
- **No HA at Proxmox level**: VMs no longer benefit from replication (acceptable if HA at Kubernetes level)

### Option 4: Migrate to Ceph with Network Upgrade

Abandon LINSTOR DRBD and migrate to Ceph, upgrading the network to 5 Gbps (or 10 Gbps if budget allows):

**Advantages**:
- Native support for dynamic provisioning in Proxmox
- Perfect integration with OpenTofu/Terraform
- Mature and well-documented ecosystem
- Snapshots and clones natively supported
- Acceptable performance with a 5 Gbps NIC

**Disadvantages**:
- **Hardware cost**: Purchase of 5 Gbps (or 10 Gbps) network cards for the 3 nodes
- **Increased complexity**: Monitors, Managers, OSDs to manage
- **Resource consumption**: More demanding on RAM and CPU than LINSTOR
- **Complete migration**: Reconstruction of existing storage
- **Still inferior performance**: Even with 5 Gbps, greater overhead than DRBD

## My Current Thinking

I'm currently torn between these options:

**Option 1 (Script)** appeals to me because it preserves LINSTOR and automates everything. With fixed VMIDs (1000, 1001, 1002), the script would be relatively simple to maintain. Just need to ensure the script runs before OpenTofu in the CI/CD pipeline.

**Option 3 (Partitioning)** is technically interesting but very invasive. Repartitioning NVMe drives in production is risky, and I lose high availability at the Proxmox level for the VMs themselves. However, in my Kubernetes context, this isn't necessarily a problem since HA is managed at the K3s cluster level, not at the individual VM level. If a VM goes down, Kubernetes continues to function with the other nodes.

**Option 4 (Ceph + network upgrade)** solves all technical problems but involves a hardware investment. A 5 Gbps switch + 3 network cards represents a significant budget for a homelab. On the other hand, it opens the door to other future possibilities.

## Key Takeaways

### LINSTOR ≠ General-purpose Storage for Proxmox

LINSTOR excels for certain use cases, but dynamic VM provisioning via Proxmox cloning is not one of them. LINSTOR documentation is heavily focused on `resource-group` and application storage, not Proxmox integration.

### The Limitation Is Architectural, Not a Bug

This isn't a configuration problem or my mistake: LINSTOR is designed with an explicit resource management model. On-the-fly dynamic provisioning simply isn't in its philosophy.

### HA Can Be Delegated to a Higher Layer

For a Kubernetes cluster, losing HA at the Proxmox level (VMs on local storage) isn't necessarily problematic. Kubernetes is designed to handle node failures - that's actually its main role. With distributed etcd and a replicated control plane, the cluster survives the loss of one or more nodes.

### Each Solution Has Its Cost

- **Script** → Software complexity
- **Partitioning** → Operational complexity and loss of HA at Proxmox level
- **Ceph** → System complexity and hardware cost

There's no silver bullet. I must choose which type of complexity I'm willing to accept.

## Next Steps

I'll probably test **Option 1** (pre-creation script) first, as it allows me to:
1. Keep LINSTOR DRBD and its performance
2. Fully automate deployment
3. Avoid immediate hardware investment
4. Learn to better manage LINSTOR programmatically

If this approach proves too complex or fragile, I'll reconsider either **Option 3** (partitioning, acceptable in a Kubernetes context), or **Option 4** (Ceph + network upgrade), which is the most "standard" and documented solution in the Proxmox ecosystem.

I'll document my final decision and its implementation in a future article.

---

**References**:
- [Choosing a Distributed Storage Technology for a Proxmox HA Cluster](/blog/stockage-distribue-proxmox-ha)
- [LINSTOR User Guide](https://linbit.com/drbd-user-guide/)
- [Proxmox Storage Plugin Documentation](https://pve.proxmox.com/wiki/Storage)
- [Telmate Proxmox Terraform Provider](https://github.com/Telmate/terraform-provider-proxmox)
