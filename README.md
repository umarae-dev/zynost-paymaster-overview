# Zynost Paymaster — Gasless Checkout on BNB Smart Chain

> **ERC-4337 gas sponsorship for non-custodial crypto payments — without giving the paymaster control of customer or merchant funds.**

Zynost Paymaster is the gas-sponsorship layer behind **Zynost Pay**, a non-custodial crypto payment gateway. It solves one of the most common checkout failures in crypto: a customer has the token required for payment, but does not have enough native gas token to complete the transaction.

Instead of asking the merchant to custody funds or asking the customer to manually acquire gas first, Zynost Pay can sponsor an eligible ERC-4337 UserOperation through a policy-controlled paymaster.

**Network focus:** BNB Smart Chain (BSC)  
**Account abstraction:** ERC-4337 v0.6  
**Production use:** Gasless checkout through Zynost Pay  
**Related product:** [Zynost Pay](https://github.com/umarae-dev/zynost-pay-overview)

---

## Why this matters for BNB Chain

BNB Chain is attractive for payment flows because transactions are fast and inexpensive, but users can still fail at the final step if they hold stablecoins without native gas.

Zynost Paymaster turns that UX failure into an infrastructure problem the application can solve safely:

```text
Customer Wallet
      │
      │ signs intent
      ▼
ERC-4337 Smart Account
      │
      │ UserOperation
      ▼
Zynost Sponsorship Policy
      │
      │ scoped + time-bounded approval
      ▼
Zynost Paymaster
      │
      │ sponsors eligible gas
      ▼
BNB Smart Chain
      │
      ▼
Merchant receives payment directly
```

The paymaster sponsors **gas only**. It does not become a custodian of the payment.

---

## Core security model

Gas sponsorship is deliberately split across independent layers rather than trusting one backend check.

### 1. Off-chain policy gate

Before an operation is approved, the application applies eligibility, abuse-prevention, rate-limit and failure controls. Requests that should never reach the chain are rejected early.

### 2. Signed, scoped authorization

Approved operations receive a cryptographic authorization bound to the specific UserOperation context, validity window and maximum sponsored cost. A generic "free gas" signature is never issued.

### 3. Independent on-chain enforcement

The paymaster verifies authorization again on-chain and applies contract-level limits. This means bypassing an application-side rate limiter is not enough to obtain unlimited sponsorship.

### 4. Replay resistance

Approvals are tied to operation-specific state so they cannot simply be reused for another sender or indefinitely replayed.

### 5. Emergency controls

Sponsorship can be paused independently from user funds. The emergency control affects the paymaster's own gas budget; it does not freeze customer or merchant assets.

---

## Non-custodial invariant

The most important design property is simple:

> **The paymaster can spend its own gas deposit. It cannot spend the merchant's payment funds.**

Zynost Pay's payment architecture is intentionally separate from the sponsorship balance. Customer payments are routed to merchant-controlled addresses while the paymaster's operational balance exists only to cover eligible network fees.

This reduces the blast radius of a paymaster failure: even a sponsorship outage should not turn into custody of merchant balances.

---

## Smart accounts

Gasless checkout uses ERC-4337 smart accounts rather than a custodial wallet controlled by Zynost.

The architecture is based on the standard Account Abstraction ecosystem and uses established reference components rather than inventing a custom wallet standard for the cryptographic primitives.

Benefits include:

- deterministic smart-account addressing;
- compatibility with ERC-4337 bundler infrastructure;
- application-sponsored gas without transferring custody;
- policy controls around what the sponsor is willing to pay for;
- a path toward richer account permissions and AI-assisted wallet safety features.

---

## Threat model

The system is designed around the assumption that public payment infrastructure will be probed and abused.

| Threat | Primary defense |
|---|---|
| Unlimited gas-drain requests | Signed authorization + on-chain spending limits |
| Replayed sponsorship approval | Operation-bound authorization + replay state |
| Invalid or untrusted signer | On-chain signature verification |
| Cost escalation after approval | Maximum sponsored-cost binding |
| Automated request flooding | Off-chain rate controls + on-chain hard limits |
| Emergency operational issue | Independent sponsorship pause |
| Paymaster compromise affecting merchant funds | Separation of gas balance from payment custody |

No security design is presented as "unhackable". The objective is defense in depth, strict blast-radius control and auditable invariants.

---

## Testing philosophy

The private production implementation is tested against adversarial cases including:

- valid sponsorship within budget;
- wrong-signer rejection;
- approved-cost overflow rejection;
- per-sender spending limits;
- global sponsorship limits;
- accumulated spending across multiple operations;
- paused sponsorship;
- owner-only administrative controls;
- expired authorization handling;
- cross-sender replay attempts.

The public repository intentionally documents the security properties without publishing production secrets or operational credentials.

---

## Production vs. public repository boundary

This repository is a **public technical overview**, not a dump of the live production environment.

### Public here

- architecture and trust model;
- BNB Smart Chain integration model;
- security invariants;
- threat model;
- testing philosophy;
- public product relationships and documentation.

### Kept private

- production deployment credentials;
- signing keys and secrets;
- backend abuse-detection implementation;
- operational runbooks;
- private infrastructure configuration;
- unaudited production contract/deployment source where publishing it would increase operational risk.

**No private key, seed phrase, signing secret or production credential should ever be committed to this repository.**

---

## Open-source / hackathon track

Zynost is preparing a **separate, safely scoped open-source BNB component** for developer and hackathon use. The goal is to make the submitted component fully inspectable and reproducible without turning the entire commercial production stack into public attack surface.

The open-source track will use non-production configuration and reproducible local/testnet deployment so developers can inspect the mechanism without requiring access to Zynost's production secrets.

This repository will link to that component once it is ready.

---

## Broader Zynost ecosystem

Zynost Paymaster is one infrastructure layer inside a larger crypto product ecosystem:

- **Zynost Intelligence** — multi-agent crypto decision intelligence;
- **Zynost Wallet** — self-custody wallet infrastructure;
- **Zynost Pay** — non-custodial merchant payments;
- **Zynost Paymaster** — ERC-4337 gas sponsorship on BNB Smart Chain;
- **UQX** — BNB-native ecosystem and community layer.

The long-term direction is to connect intelligence, wallet safety and transaction execution while preserving self-custody.

---

## Technology

- Solidity
- Hardhat
- OpenZeppelin
- ERC-4337 Account Abstraction
- eth-infinitism reference contracts
- BNB Smart Chain

---

## Status

**Active development / production infrastructure.**

The production paymaster is used by Zynost Pay's gasless checkout flow on BNB Smart Chain. Security hardening and independent review remain ongoing priorities before broader public release of production-sensitive source.

For security-related reports, see [`SECURITY.md`](SECURITY.md).
