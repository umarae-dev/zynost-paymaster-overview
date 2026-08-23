# Zynost Paymaster — Open ERC-4337 Gas Sponsorship on BNB Smart Chain

> **A runnable public reference implementation of Zynost's non-custodial gas-sponsorship architecture for ERC-4337 checkout flows.**

Zynost Paymaster is the gas-sponsorship layer behind **Zynost Pay**, a non-custodial crypto payment gateway. The production system solves a common crypto checkout failure: a customer has the payment token but not enough native gas to finish the transaction.

This repository now contains **real runnable source code**, tests and local/BSC-testnet configuration for the reusable on-chain sponsorship mechanism. It is no longer documentation-only.

**Network focus:** BNB Smart Chain (BSC)  
**Account abstraction:** ERC-4337 v0.6  
**Public contract:** [`contracts/ZynostReferencePaymaster.sol`](contracts/ZynostReferencePaymaster.sol)  
**Tests:** [`test/ZynostReferencePaymaster.test.js`](test/ZynostReferencePaymaster.test.js)  
**Related product:** [Zynost Pay](https://github.com/umarae-dev/zynost-pay-overview)

---

## What is open source here

The public implementation demonstrates the core reusable sponsorship model:

- ERC-4337 `BasePaymaster` integration;
- off-chain signed sponsorship authorization;
- authorization bound to chain, paymaster, sender state, validity window and maximum sponsored cost;
- replay resistance through sender-scoped nonce state;
- independent on-chain per-sender daily spending caps;
- independent on-chain global daily spending caps;
- emergency sponsorship pause;
- owner-controlled signer/cap administration;
- adversarial tests for the core authorization and budget invariants.

The public code is designed to be independently compiled and tested without access to Zynost production infrastructure.

---

## Architecture

```text
Customer Wallet
      │
      │ signs intent
      ▼
ERC-4337 Smart Account
      │
      │ UserOperation
      ▼
Off-chain Sponsorship Policy
      │
      │ scoped + time-bounded authorization
      ▼
Zynost Reference Paymaster
      │
      ├─ signature verification
      ├─ sender replay state
      ├─ cost-bound approval
      ├─ per-sender cap
      ├─ global cap
      └─ emergency pause
      │
      ▼
BNB Smart Chain
```

The paymaster sponsors **gas only**. It does not custody customer or merchant payment funds.

---

## Why this matters for BNB Chain

BNB Chain is attractive for payment flows because transactions are fast and inexpensive, but checkout can still fail when a user holds a stablecoin without native BNB for gas.

ERC-4337 lets an application sponsor eligible operations without taking custody of the user's payment. The sponsor can apply policy before signing, while the paymaster independently enforces hard on-chain limits.

That separation is important: bypassing an application-side rate limiter is not enough to obtain unlimited sponsorship.

---

## Security model

### 1. Signed, scoped authorization

The authorization hash binds the UserOperation context to:

- the current chain;
- the paymaster address;
- sender-scoped replay state;
- a validity window;
- an explicit maximum sponsored cost.

A generic reusable "free gas" signature is never sufficient.

### 2. On-chain budget enforcement

Even a correctly signed request must remain within contract-level per-sender and global daily caps.

### 3. Replay resistance

Sender nonce state is included in the signed hash so an authorization envelope cannot simply be replayed indefinitely.

### 4. Emergency control

Sponsorship can be paused independently from user funds. Pausing affects the paymaster's gas budget, not customer or merchant assets.

### 5. Non-custodial invariant

> **The paymaster can spend its own EntryPoint deposit. It cannot spend a customer's payment funds.**

---

## Run locally

Requirements:

- Node.js 20+
- npm

```bash
npm install
npm run compile
npm test
```

The default Hardhat network requires no API key, wallet or production credential.

### Optional BSC Testnet configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Then supply a **testnet-only** RPC URL and testnet deployer key if you want to deploy your own reference instance. Never reuse a production signing/deployer key.

---

## Tests

The public suite covers:

- valid signed sponsorship;
- wrong-signer rejection;
- maximum approved-cost enforcement;
- per-sender spending limits;
- global sponsorship limits;
- paused sponsorship;
- sender-bound authorization / cross-sender replay rejection.

These tests are adapted from the production development test strategy, while production credentials and operational policy remain outside this repository.

---

## Public / private boundary

Zynost is an operating commercial ecosystem. This repository intentionally separates reusable open-source technology from production operations.

### Public

- reference Solidity paymaster;
- ERC-4337 sponsorship mechanics;
- deterministic authorization format;
- on-chain safety controls;
- tests;
- local/BSC-testnet configuration;
- architecture and threat model.

### Private production components

- signing keys and credentials;
- production signer infrastructure;
- abuse-detection/rate-control implementation;
- internal operational thresholds;
- merchant/customer operational systems;
- deployment runbooks and private infrastructure configuration.

The private components are **not required to compile, test or evaluate the public implementation**.

See [`PUBLIC_PRIVATE_BOUNDARY.md`](PUBLIC_PRIVATE_BOUNDARY.md) and [`SECURITY.md`](SECURITY.md).

---

## Relationship to Zynost production

The public contract is a sanitized reference edition derived from architectural patterns used in the production Zynost Pay gasless checkout system. It is intentionally named `ZynostReferencePaymaster` so reviewers can distinguish public reusable code from live production deployment code and configuration.

No production private key, signing secret, customer data or production credential belongs in this repository.

---

## Broader Zynost ecosystem

- **Zynost Intelligence** — multi-source crypto decision intelligence;
- **Zynost Pay** — non-custodial merchant payments;
- **Zynost Paymaster** — ERC-4337 gas sponsorship on BNB Smart Chain;
- **UQX** — BNB-native ecosystem/community and wallet layer.

The broader direction is to connect intelligence, self-custody and transaction execution while keeping user authorization and custody boundaries explicit.

---

## Technology

- Solidity 0.8.23
- Hardhat
- OpenZeppelin
- ERC-4337 / eth-infinitism account-abstraction v0.6
- BNB Smart Chain

---

## License

The reference Solidity implementation is released under **GPL-3.0**, matching its SPDX identifier and avoiding conflicting package-level licensing metadata.

---

## Status

**Public reference implementation available. Production infrastructure remains separately operated and privately configured.**

Security hardening and independent review remain ongoing priorities; this repository does not claim an external audit.