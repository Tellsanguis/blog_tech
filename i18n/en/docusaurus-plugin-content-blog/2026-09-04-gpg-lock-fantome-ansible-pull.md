---
slug: gpg-lock-fantome-ansible-pull
title: "The GPG lock that should never have existed"
authors: [tellserv]
tags: [ansible, gitops, linux, gpg, debug, systemd]
date: 2026-09-04
---

A fleet of about ten VMs that deploy themselves via `ansible-pull` every 30 minutes. Every so often, one of them stops converging, stuck on a `gpg: waiting for lock` or `SQL library used incorrectly` error. The cause: a task importing a GPG key that nothing used anymore, somewhere in a shared role run by every VM.

<p align="center">
  <img src="/img/blog/gpg-lock-fantome-ansible-pull/chemin-mort-chemin-reel.svg" alt="Diagram showing two paths in the pipeline: a dead path that imports a GPG key and ends in an orphaned lock, and the real path that verifies an SSH signature and runs the playbook" width="720" />
</p>

<!--truncate-->

## The symptom: convergence stopping without warning

The deployment pattern is *pull-based*: each VM clones the repo, verifies a signature, applies the playbook, every 30 minutes, with no human intervention (see [the post on the signed GitOps pipeline](/blog/gitops-signature-ssh-zero-trust) for the full architecture).

Reliable, until the day I noticed a VM on the fleet had stopped converging. The run failed with a more or less cryptic GPG error:

```text
gpg: waiting for lock '/root/.gnupg/public-keys.d/pubring.db.lock'...
gpg: keydb: locking failed: File exists
gpg: error reading key: File exists
```

I restarted the timer: no effect, the error came back on the next run. No gradual degradation, no prior symptom: the run was passing, then all of a sudden it wasn't.

## The real verification mechanism never used GPG

Digging in, I found that the pipeline's actual security check had never relied on GPG. It's `git verify-commit` / `git verify-tag`, backed by SSH keys listed in `allowed_signers` on each VM. GPG plays no part anywhere in the deployment's trust chain.

And yet, a task in the shared role (the common roles collection, `ansible_pull` role) was importing a signing GPG key on every run, so every 30 minutes, across the fleet's ten VMs:

```yaml
# ansible_pull role, deprecated task
- name: Import Forgejo GPG signing key
  ansible.builtin.command:
    cmd: "gpg --homedir /root/.gnupg --import {{ ansible_pull_forgejo_gpg_key }}"
  changed_when: false
```

A task that served no functional purpose whatsoever, but still ran, silently, ever since the role was first set up.

## Why it eventually broke

Every `gpg --import` takes out a lock (dotlock) for the duration of the operation. At roughly 480 invocations a day fleet-wide (10 VMs × 48 runs/day), it only takes one run getting interrupted mid-flight (timeout, VM reboot, OOM) to leave an orphaned lock behind, blocking every subsequent run on that same VM.

Two variants encountered, which don't diagnose the same way:

**Dead lock.** The PID holding it no longer exists.

```bash
$ ps -p $(cat /root/.gnupg/public-keys.d/pubring.db.lock 2>/dev/null)
PID TTY STAT TIME COMMAND
# nothing: the process no longer exists
$ rm -f /root/.gnupg/public-keys.d/pubring.db.lock
```

**Live lock.** A `keyboxd` process (the daemon managing the modern GPG keyring) had been stuck for days and legitimately held the lock. Deleting the lock file alone isn't enough: `keyboxd` recreates it immediately. It has to be killed cleanly first:

```bash
$ ps -p $(cat /root/.gnupg/public-keys.d/pubring.db.lock)
PID TTY STAT TIME COMMAND
2841 ?  Sl   0:00 /usr/libexec/keyboxd
$ gpgconf --homedir /root/.gnupg --kill keyboxd
$ rm -f /root/.gnupg/public-keys.d/pubring.db.lock
```

:::warning[Don't mix up the two cases]
On two VMs on the fleet encountered during this incident, the "holder" PID of the lock was a very much alive `keyboxd`, not a dead orphan. Deleting the file directly without killing it first gives the impression it worked (the next run goes through), but the lock comes back as soon as `keyboxd` writes to it again, five minutes later. Always check `ps -p <pid>` before concluding a lock is dead.
:::

## The real fix: delete, don't patch

Once I'd established that nothing in the verification chain depended on this key, my response wasn't to add automatic lock cleanup at timer startup, nor a retry, nor a dedicated monitoring alert. I removed the task, and the variable driving it, from the shared role:

```diff
- - name: Import Forgejo GPG signing key
-   ansible.builtin.command:
-     cmd: "gpg --homedir /root/.gnupg --import {{ ansible_pull_forgejo_gpg_key }}"
-   changed_when: false
```

Zero remaining GPG invocations in the pipeline, so this class of bug can no longer occur through this path. I merged and tagged the fix (`deploy-2026-08-03-fix-gpg-lock`) like any other change to the repo: the same signature verification pipeline that protects everything else.

## Two unrelated bugs, found in passing

While sweeping the whole fleet to confirm the fix held, I turned up two pre-existing issues, neither related to GPG:

**A VM with a drifted hostname.** The OS hostname was `ca.admin.exemple.internal` (the service's TLS certificate SAN) instead of `ca.srv.exemple.internal` (the SSH hostname expected by the inventory). Consequence: `--limit "$(hostname -f)"` no longer matched any host on the Ansible side, and the run failed silently without ever touching the GPG role. The `hostname_fqdn` role was actually correct: it was the VM's real state that had drifted, fixed via `hostnamectl set-hostname` + `/etc/hosts`.

**An expired API token on another VM**, also unrelated: `ansible-pull` was failing on Git authentication before ever reaching the GPG role.

Neither would have been found without this systematic sweep triggered by an otherwise minor bug. An audit prompted by a small problem sometimes ends up exposing more subtle problems that had been sitting there for a while.

## What I take away from this

This wasn't a logic bug, it was dead code paying rent in availability. The kind of task added one day "just to be safe," never removed, that keeps running silently long after its reason for existing has disappeared.

The signal to watch for: a pipeline step failing intermittently, with no apparent link to whatever you just changed, deserves to be questioned first on *whether it still serves any purpose* before you try to make it more robust. Adding a retry or automatic cleanup would have masked the symptom without ever removing the cause.

Practical corollary for a pull-managed fleet: periodically audit shared roles to spot tasks that no longer have a consumer, particularly ones touching shared resources with locking (lock files, sockets, caches). Those are the ones that, without ever breaking anything directly, end up accumulating this kind of silent debt.
