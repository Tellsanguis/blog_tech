---
slug: gitops-signature-ssh-zero-trust
title: "GitOps without Vault: reducing blast radius by verifying instead of storing"
authors: [tellserv]
tags: [gitops, ansible, security, zero-trust, secrets, sops]
date: 2026-08-27
---

Deploying a fleet of VMs with no central server pushing configuration, no secrets vault permanently exposed, and a simple question asked on every cycle: "was what I'm about to execute signed by someone authorized?" This post describes the *pull-based* GitOps architecture I built around that question, and why it mechanically shrinks the attack surface compared to a classic push model.

<p align="center">
  <img src="/img/blog/gitops-signature-ssh-zero-trust/pipeline-ansible-pull.svg" alt="Diagram of the ansible-pull pipeline: a VM fetches the Git repository, verifies the tag signature before any execution, runs the playbook only if verification passes, otherwise aborts without executing anything" width="720" />
</p>

<!--truncate-->

## Push vs pull: who holds the power to execute

In a classic push model (Ansible Tower, a CI that pushes to prod, Vault queried on the fly...), a central server holds credentials to connect to every machine and push configuration to it. Compromising that server means compromising the whole fleet at once: that's the very definition of a single trust point with a high blast radius.

In a pull model, each VM fetches its own configuration on a regular interval, and **nobody holds credentials to connect to the VMs** for deployment purposes. The security question changes nature: it's no longer "who can connect to the VM," but **"what does the VM agree to execute."**

## The gatekeeper: a signature check before any execution

The pipeline, run autonomously by each VM every 30 minutes via a systemd timer:

```bash
#!/usr/bin/env bash
set -euo pipefail

cd /opt/ansible-pull/ansible-forgejo
git fetch origin
git reset --hard origin/main

TAG=$(git tag --points-at HEAD --list 'deploy-*' | head -n1)
if [ -z "$TAG" ]; then
  logger -t ansible-pull "SECURITY: no deploy-* tag on HEAD, aborting"
  exit 1
fi

if ! git verify-tag "$TAG"; then
  logger -t ansible-pull "SECURITY: invalid signature on $TAG, aborting"
  exit 1
fi

ansible-galaxy collection install -r requirements.yml
SOPS_AGE_KEY_FILE=/etc/sops/age/deploy.txt ansible-playbook forgejo.yml
```

Four steps: clone/pull, look for a `deploy-*` tag **that points exactly at this commit**, `git verify-tag` against `allowed_signers`, and only then execute the playbook with secrets decrypted locally.

If the tag lookup or the verification fails, nothing runs. No degraded mode, no silent fallback: failure is the safe default. It's a **self-service** control: each VM enforces the trust policy itself, without depending on a central service being available at run time.

:::warning[An operational trap, not a security problem]
Forgejo always creates a distinct *merge commit* when merging a PR, even for an eligible fast-forward: its hash therefore differs from the last commit of the feature branch. The tag must be created **after** fetching that merge commit locally (`git fetch && git reset --hard origin/main`), never before. A tag placed on the feature branch before the merge points at a commit that's a parent of the merge commit: `ansible-pull` then finds no `deploy-*` tag on its HEAD and aborts, with a message that only goes to `syslog` (invisible in `journalctl -u ansible-pull-<repo>`) — you have to query `journalctl -t ansible-pull` to see it.
:::

## No Vault: SOPS + age, encrypted at rest, never in transit in the clear

I made the opposite choice from a central Vault: secrets live encrypted directly in the Git repository (`secrets.sops.yaml`, via [SOPS](https://github.com/getsops/sops) + [age](https://github.com/FiloSottile/age)), not in a separate secrets server:

```bash
SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt \
  sops inventory/group_vars/all/secrets.sops.yaml
```

Each VM holds its own private decryption key (`/etc/sops/age/deploy.txt`), generated locally at first bootstrap and **never transmitted in the clear over the network**. The `.sops.yaml` file at the repo root lists the public keys authorized to decrypt:

```yaml
creation_rules:
  - path_regex: secrets\.sops\.yaml$
    key_groups:
      - age:
          - age1qdev...          # dev key (control workstation)
          - age1qforgejo01...    # forgejo01 deployment key
          - age1qvaultwarden01...# vaultwarden01 deployment key
```

Direct consequence for the blast radius of a compromise: a VM's decryption key only decrypts the secrets it was explicitly listed for in `.sops.yaml`. Compromising one VM therefore doesn't grant access to the other nine's secrets, unlike a poorly scoped Vault token, which could potentially hand over the keys to the entire fleet if it's authorized too broadly.

And there's simply no Vault service to run, patch, monitor, and expose on the network: one less attack surface, one less HA mechanism to maintain, one less central point of failure.

## The real trust boundary: two domains to compromise, not one

The natural instinct is to reduce the threat model to a single question: who holds a signing key? That's incomplete. **There are actually two independent security domains**, and an attacker must compromise both to get anything at all:

**Application security**, on the Forgejo side: who has the right to push or merge code to `main`. Enforced by repository permissions, branch protections, mandatory PR review for the team. This is what keeps a malicious commit from reaching HEAD in the first place.

**Key-based security**, on the signing side: who can produce a valid signature on a `deploy-*` tag pointing exactly at that commit. Enforced by `allowed_signers`:

```text
# allowed_signers
admin@exemple.fr ssh-ed25519 AAAA...
@cert-authority *.exemple.internal cert-authority ssh-rsa AAAA...
```

These two domains deliberately don't overlap: Forgejo rights are managed in Forgejo (accounts, teams, branch protections), the list of authorized signers lives in a file versioned on each VM, independent of anything Forgejo knows or decides. Compromising either one alone gets you nothing:

- A compromised Forgejo account lets you push malicious code, potentially all the way to `main` if branch protections are misconfigured, but can't produce any valid signature on it: no VM will ever execute it.
- A compromised signing key with no push rights on the repo has nothing to sign: there's no malicious commit to use it on.

An attacker therefore needs **both** compromises at once, on two surfaces that have technically nothing in common (a web application with its accounts and sessions on one side, cryptographic material and an `allowed_signers` file on the other). That's a structural difference from a model where the only barrier would be "having write access to the repo": here, write access alone is never enough.

A notable refinement on the second domain: `allowed_signers` can list both individual static keys *and* a `cert-authority` entry pointing to an SSH CA that issues ephemeral certificates (see [the post on SSH certificates backed by Entra ID](/blog/ssh-certificats-ephemeres-entraid)). That lets nominal access, revocable in seconds by removing a group assignment on the identity provider side, coexist with a static-key fallback access reserved for the very first bootstrap of a new machine.

## What this model doesn't protect against

Being honest about the limits is what makes a post credible rather than a marketing post:

- **Branch protection already limits half the problem, not the other half.** On this fleet, pushing to Forgejo goes through a dedicated SSH key, stored in a personal Bitwarden vault and loaded into the workstation's SSH agent; signing the `deploy-*` tag, meanwhile, goes through the step-ca ephemeral certificate mechanism backed by Entra ID, reserved for the `ops` group (see [the post on ephemeral SSH certificates](/blog/ssh-certificats-ephemeres-entraid)). Two technically unrelated mechanisms. Merging to `main` already requires approval from a second `ops` member (branch protection), so a single compromised workstation isn't enough on its own to get malicious code through. What does remain a solitary act, though: the tag signature itself, once the commit has been legitimately merged. Nothing forces a second pair of eyes at that specific step. Compromising an `ops` member's workstation while their Bitwarden vault is unlocked and their `step ssh login` session is active is therefore enough to single-handedly tag any already-merged commit on `main`, including an old commit nobody would want redeployed.
- **The tag must point exactly at the right commit.** A procedural mistake (tagging before a merge, forgetting to re-tag a shared roles repo after a change: an un-retagged shared role silently blocks convergence for the *entire* fleet, not just one repo) breaks the chain without being a security problem in the strict sense, just a very real operational trap.
- **It doesn't replace an audit of the versioned content.** Signing guarantees *who* produced a commit, not that the commit is free of mistakes.

## Going further: the real window that's still open

Two obvious answers don't apply here, and it's worth saying so rather than presenting them as leads.

**Separation of duties is already in place.** Two-person review before merging to `main` has existed on this fleet for a long time, not just for this reason. The useful point isn't to recommend it, but to note precisely what it covers: the *merge*, not the *tag*. It's exactly that imbalance (one step with two reviewers, the other with one) that defines the window still open, described above.

**Shrinking the `ops` group makes no sense here.** The team is already three people. Trying to carve out an even more restricted "release" subgroup within a group of three would, at best, single out one or two people from the other one or two: not a serious security lever at this scale, just added complexity for an illusory gain.

**On the physical key, a check is warranted before jumping to conclusions.** The Bitwarden vault hosting the Forgejo key is actually better guarded than it first appears. Two settings change the calculation: session timeout is set to 1h with automatic lock on expiry, and the built-in SSH agent is configured to request explicit authorization in the Bitwarden app on **every** use of the key, not just when the vault unlocks. Concretely, malware on the workstation can't silently use the Forgejo key while the vault is open: every `git push` triggers a visible authorization request that the user has to approve by hand. That's functionally close to a "physical confirmation on every use" model, without dedicated hardware.

Which partly flips the initial finding: it's actually the step-ca certificate that, once issued behind a genuine Entra ID MFA challenge, then gets used **without** any confirmation prompt for its entire 10-hour window, unlike the Bitwarden key. MFA solidly protects the issuance of a new certificate, but nothing on the step-ca side matches the "always ask again" that Bitwarden already applies to signing toward Forgejo.

**The concrete lever: a second provisioner, backed by the admin Entra ID account, for signing only.** The team already has two identities per person: a day-to-day Entra ID account, and a separate admin account reserved for privileged actions, as a properly segmented AD model calls for. Today, only the day-to-day account is involved in the step-ca chain (`entraid-ops` provisioner, 10-hour certificate for SSH access to the VMs and unlocking Forgejo). Nothing stops adding a second provisioner, this time backed by the admin account, dedicated exclusively to issuing a signing certificate: a 5-minute window, just enough time to create and sign the `deploy-*` tag, then nothing.

The split of roles becomes clean: the day-to-day account is for working (daily SSH, Forgejo), the admin account only serves that precise moment of signing.

**Except the split alone forces nothing.** If the admin account already has an active browser session (Entra ID SSO), the OIDC flow triggered by `step ssh login --provisioner entraid-admin-sign` can very well silently reuse that session, with no reprompt or MFA: the 5-minute window then no longer protects much, it just bounds the duration of a certificate obtained with zero friction. OIDC's default behavior is to trust an already-open session, not ask again.

What actually forces reauthentication is a conditional access policy on the Entra ID side itself, not a step-ca setting: a sign-in frequency policy set to "every time," scoped to the application (the App Registration) used specifically by this provisioner, with browser session persistence disabled for that same application. Two practical consequences: this signing provisioner needs its **own App Registration** in Entra ID, distinct from the day-to-day `entraid-ops` provisioner's (otherwise the policy would apply to everything, including regular SSH), and the application must force reauthentication on the identity server side, where it can't be bypassed by a client that fails to request it.

With that piece in place, the cumulative effect holds: exposure window down from 10h to 5 minutes, and a compromised day-to-day work session (the overwhelming majority of a workstation's active time) that still has no access to signing at all, for lack of an active *and freshly reauthenticated* admin session at the same time. Without it, the second provisioner would have been mere cosmetic segmentation. Stated cost: no new hardware, one more App Registration and conditional access policy to maintain, and a discipline already half-acquired since the team already switches to its admin account for sensitive actions.

## The general lesson

"Zero trust" is often reduced to an extra layer of perimeter security. The more interesting idea here is architectural: instead of trusting a *channel* (a central server authorized to push to everyone), you trust a *proof each party can verify locally* (a signature), and you mechanically reduce the number of places where a single compromise grants access to the whole fleet.

It's not free: it shifts the complexity toward operational discipline (tagging correctly, at the right time, on the right commit) rather than toward yet another tool to maintain. A tradeoff I find largely preferable for a fleet of this size, but a tradeoff nonetheless, not a magic solution.
