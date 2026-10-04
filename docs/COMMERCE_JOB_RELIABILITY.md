# PrismBay Commerce Job Reliability

This module defines a deterministic retry, delay, idempotency and dead-letter contract for commerce background work.

## Provenance

The design is inspired by queue semantics from [BullMQ](https://github.com/taskforcesh/bullmq), which is MIT licensed. PrismBay does not vendor BullMQ source code in this module and does not provision Redis. The implementation is original PrismBay code intended to fit the existing cloud-only repository controls.

## Safety boundary

Transient read or message-delivery work can be retried when the outcome is known to have failed. Operations with uncertain external side effects are different. Supplier orders, payments and external publications must not be automatically retried when the first attempt has an unknown outcome. They enter `dead_letter` for manual reconciliation.

Authorization, quota, validation and other known non-transient failures also fail closed without repeated attempts.

## Idempotency

Every logical job receives a stable SHA-256 idempotency key derived from job class, operation and resource reference. The included in-memory adapter rejects duplicate logical jobs and is intended for deterministic tests and zero-cost workers. A future persistent adapter must preserve the same semantics.

## Infrastructure

This foundation does not add Redis, a paid queue service, supplier ordering, live publishing, payment retries or a second fulfillment pipeline. It is a compatibility contract for the existing PrismBay workflows and later durable adapters.
