---
slug: dette-technique-hors-iac
title: "What infrastructure-as-code doesn't cover: the machines configured by hand"
authors: [tellserv]
tags: [ansible, infrastructure-as-code, technical-debt, lessons-learned]
date: 2026-09-08
---

An entire fleet of VMs versioned, with [a pipeline that verifies signatures](/blog/gitops-signature-ssh-zero-trust) and redeploys itself every 30 minutes. And then two or three machines, outside that system, whose state only lives on themselves. This post is about a case I see regularly, and rarely documented honestly: the technical debt that piles up on the exceptions to the very system you built yourself.

<!--truncate-->

## How you end up there

It's never a deliberate architectural decision. It's a dev VM spun up in a hurry to unblock a test, a service account and sudoers set up by hand one day to hit a deadline, an Ansible repo created ahead of a machine that then evolved faster than the repo meant to describe it. Each individual exception is reasonable in the moment. The problem is their silent accumulation: nobody ever decides one day "we're taking this machine out of infrastructure-as-code," it happens little by little, never formally recorded anywhere.

## The real risk isn't "it breaks right away"

A machine outside infrastructure-as-code works just fine, until the day someone, in good faith, replays the Ansible repo meant to describe it, assuming it's up to date.

A case I ran into: an Ansible role repo that only declared four volumes where the real VM was mounting eight, with entire components missing from the repo (encryption key, CA configuration, additional binaries) but present and working on the machine. Replaying that repo as-is wouldn't have done "nothing": it would have unmounted active mount points on a production service.

The danger of undocumented drift isn't the absence of configuration management itself. It's the **residual trust** everyone keeps placing in the repo, even though it no longer describes reality. A repo you know is stale is manageable: you know to check before acting. A repo you believe is up to date and isn't is a trap waiting its turn.

## What actually helps

**Document the gap before fixing it.** I write down, in plain terms, what was done by hand, with the date and the reason: it costs five minutes and saves someone (myself included, six months later) from rediscovering it in the middle of an incident investigation. That's the difference between debt that's known and managed, and an invisible trap.

**Never replay a repo suspected of drift without prior reconciliation.** Before executing, I compare the machine's real state (mounts, config files, installed versions) against what the repo declares. If the gap is significant, the repo must be updated to reflect reality *before* being executed, never the other way around.

**Accept that full remediation isn't always the immediate priority.** Documenting the gap and the risk signal ("don't execute this repo as-is") is a low-cost action that must precede, in time, full reconciliation, which can legitimately wait its turn in the priority list when nothing else is urgent.

## The general lesson

An infrastructure-as-code system is only as reliable as how complete it's perceived to be. The risk doesn't come from the machines you know are explicitly outside the system: those, you handle with the caution they deserve. It comes from the ones you forgot to count as such, and for which trust in the repo wrongly remains intact.

The right discipline isn't demanding that 100% of the fleet always be perfectly up to date in the repo: on a real fleet, with real emergencies, that's not always sustainable. It's knowing, at all times, unambiguously, which of two categories each machine belongs to: "the repo faithfully describes it" or "check before any execution." The worst state isn't the drift itself, it's no longer knowing which of the two you're looking at.
