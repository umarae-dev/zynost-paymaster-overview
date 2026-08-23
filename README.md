# Zynost Paymaster — ERC-4337 Gas Sponsorship on BNB Smart Chain

> **Open-source production-safe on-chain paymaster source and its production test suite, extracted from the live Zynost Pay stack without production secrets.**

Zynost Paymaster is the gas-sponsorship layer used for ERC-4337 gasless checkout flows. The contract can spend only its own EntryPoint gas deposit; it does not custody or transfer customer or merchant payment funds.

**Network focus:** BNB Smart Chain  
**Account abstraction:** ERC-4337 v0.6  
**Production-safe contract:** [`contracts/ZynostVerifyingPaymaster.sol`](contracts/ZynostVerifyingPaymaster.sol)  
**Production test suite:** [`test/ZynostVerifyingPaymaster.test.js`](test/ZynostVerifyingPaymaster.test.js)

## What is public

This repository publishes the actual production-safe on-chain component and its matching production tests:

- ERC-4337 `BasePaymaster` integration;
- backend-signed, time-bounded sponsorship authorization;
- authorization bound to chain, paymaster address, sender nonce, validity window and maximum sponsored cost;
- sender-scoped replay resistance;
- per-sender and global daily sponsorship caps enforced on-chain;
- emergency sponsorship pause;
- owner-controlled signer and cap administration;
- genuine EntryPoint-based Hardhat tests, not a hand-rolled mock;
- secret scanning guard and GitHub Actions CI.

The wider commercial backend, signer infrastructure, credentials, merchant/customer systems and operational policy remain private and are not required to compile or test this repository.

## Architecture

```text
Customer / Smart Account
          │
          │ UserOperation
          ▼
Off-chain eligibility + signing policy   [private operations]
          │
          │ scoped signed authorization
          ▼
ZynostVerifyingPaymaster                 [open source here]
          │
          ├─ signature verification
          ├─ sender nonce / replay state
          ├─ approved-cost bound
          ├─ per-sender daily cap
          ├─ global daily cap
          └─ emergency pause
          │
          ▼
ERC-4337 EntryPoint
          │
          ▼
BNB Smart Chain
```

## Security properties

The authorization hash binds the UserOperation to the current chain, this paymaster, sender-scoped nonce state, validity timestamps and an explicit maximum sponsored cost. Wrong-signer validation returns the ERC-4337 signature-failure result rather than granting sponsorship.

Even a correctly signed request remains subject to hard on-chain per-sender and global daily limits. Sponsorship can also be paused independently from user payment funds.

> **Non-custodial invariant:** this paymaster spends its own EntryPoint deposit for gas. It has no authority over customer or merchant payment balances.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run compile
npm test
npm run check:public
```

No production API key, signer key, deployer key or RPC credential is required for the local Hardhat test suite.

## Production tests included

The exact production test file covers:

- valid signed sponsorship;
- wrong-signer rejection;
- approved maximum-cost enforcement;
- per-sender daily cap;
- accumulated sender spend;
- global daily cap;
- emergency pause;
- owner-only administration;
- expired validity metadata;
- cross-sender replay rejection.

The tests deploy the real ERC-4337 EntryPoint implementation from the account-abstraction dependency and impersonate it on the local Hardhat chain for validation calls.

## Public / private boundary

### Public

- exact production-safe `ZynostVerifyingPaymaster.sol` source;
- exact production `ZynostVerifyingPaymaster.test.js` suite;
- Hardhat EntryPoint import helper;
- reproducible local configuration;
- CI and public-repository secret guard;
- architecture and security documentation.

### Not published

- production signer/deployer private keys;
- production `.env` files or private RPC credentials;
- backend eligibility, abuse-detection and rate-control implementation;
- merchant/customer data;
- operational recovery material and private deployment runbooks;
- unrelated production services.

See [`PUBLIC_PRIVATE_BOUNDARY.md`](PUBLIC_PRIVATE_BOUNDARY.md) and [`SECURITY.md`](SECURITY.md).

## Dependency compatibility

The production-safe source is kept on the dependency major lines it was built and tested with, including OpenZeppelin 4.x and ERC-4337 account-abstraction 0.6.x. Dependabot is configured not to automatically propose incompatible major-line migrations for those two dependencies.

## CI

GitHub Actions runs the public repository guard, dependency installation, Solidity compilation and the production Paymaster test suite on pushes and pull requests.

## License

`ZynostVerifyingPaymaster.sol` is GPL-3.0 as declared by its SPDX identifier. See [`LICENSE`](LICENSE).

## Security / audit position

This repository provides reproducible source and tests, but it does **not** claim that internal tests are equivalent to an independent third-party smart-contract audit. Do not publish private keys, seed phrases, credentials or user data in issues or pull requests.

## Status

**Production-safe Paymaster source is open source and independently runnable; production operational infrastructure remains separately operated and private.**
