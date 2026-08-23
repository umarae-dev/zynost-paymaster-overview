# Zynost Paymaster — ERC-4337 Gas Sponsorship on BNB Smart Chain

> **Open-source production-safe on-chain Paymaster subsystem extracted from the live Zynost Pay stack without production secrets.**

Zynost Paymaster is the ERC-4337 gas-sponsorship layer used for gasless checkout flows. The Paymaster can spend only its own EntryPoint gas deposit; it does not custody or transfer customer or merchant payment funds.

**Network focus:** BNB Smart Chain  
**Account abstraction:** ERC-4337 v0.6  
**Production Paymaster:** [`contracts/ZynostVerifyingPaymaster.sol`](contracts/ZynostVerifyingPaymaster.sol)  
**Production Paymaster tests:** [`test/ZynostVerifyingPaymaster.test.js`](test/ZynostVerifyingPaymaster.test.js)

## Public production-safe subsystem

This repository now includes the complete safe-to-publish Paymaster-side subset from production:

- exact production-safe `ZynostVerifyingPaymaster.sol`;
- exact production Paymaster test suite;
- genuine EntryPoint Hardhat compile helper;
- production `SimpleAccountFactory` import shim;
- production `SimpleAccountFactory` tests;
- production Paymaster deploy script;
- production account-factory deploy script;
- production local real-EntryPoint deployment script;
- production EntryPoint-deposit and withdrawal maintenance scripts;
- secret-free Hardhat network configuration;
- `.env.example` containing placeholders only;
- public-repository secret guard;
- GitHub Actions CI and Dependabot major-version guards.

Unrelated UQX contracts and scripts are intentionally not duplicated here because they have their own public repository.

## Architecture

```text
Customer / Smart Account
          │
          │ UserOperation
          ▼
Off-chain eligibility + signing policy     [private operations]
          │
          │ scoped signed authorization
          ▼
ZynostVerifyingPaymaster                    [open source here]
          │
          ├─ signature verification
          ├─ sender nonce / replay state
          ├─ approved-cost bound
          ├─ per-sender daily cap
          ├─ global daily cap
          └─ emergency pause
          │
          ▼
ERC-4337 EntryPoint v0.6
          │
          ├─ canonical SimpleAccountFactory support
          ▼
BNB Smart Chain
```

## Security properties

The authorization hash binds the UserOperation to the current chain, this Paymaster, sender-scoped nonce state, validity timestamps and an explicit maximum sponsored cost. Wrong-signer validation returns the ERC-4337 signature-failure result rather than granting sponsorship.

Even a correctly signed request remains subject to hard on-chain per-sender and global daily limits. Sponsorship can also be paused independently from user payment funds.

> **Non-custodial invariant:** this Paymaster spends its own EntryPoint deposit for gas. It has no authority over customer or merchant payment balances.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run compile
npm test
npm run check:public
```

`npm test` runs both the production Paymaster suite and the production SimpleAccountFactory suite. No production API key, signer key, deployer key or RPC credential is required for local Hardhat tests.

## Production tests covered

### Paymaster

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

### SimpleAccountFactory

- deterministic counterfactual addresses;
- real code deployment at the predicted address;
- idempotent account creation;
- owner correctness;
- owner and salt address separation.

The tests deploy the genuine ERC-4337 EntryPoint implementation from the account-abstraction dependency rather than using a hand-rolled EntryPoint mock.

## Deployment and maintenance scripts

Production-safe scripts are under `scripts/`:

- `deploy.js` — deploy and initially fund `ZynostVerifyingPaymaster`;
- `deploy_account_factory.js` — deploy canonical `SimpleAccountFactory` for EntryPoint v0.6;
- `deploy_local_for_testing.js` — deploy a genuine local EntryPoint + Paymaster for integration checks;
- `deposit_only.js` — add BNB to the deployed Paymaster's EntryPoint deposit;
- `withdraw.js` — owner-only withdrawal from the Paymaster's own EntryPoint deposit.

Real private keys are never included. See `.env.example` for the variable names only.

## Public / private boundary

Public source includes the complete safe Paymaster-side contract/test/deployment subset. Production signer/deployer keys, real `.env` files, private RPC credentials, backend eligibility and abuse-control implementation, merchant/customer data, monitoring/recovery infrastructure and unrelated production services remain private.

See [`PUBLIC_PRIVATE_BOUNDARY.md`](PUBLIC_PRIVATE_BOUNDARY.md) and [`SECURITY.md`](SECURITY.md).

## Dependency compatibility

The public source stays on the dependency major lines used by this production subsystem: OpenZeppelin 4.x and ERC-4337 account-abstraction 0.6.x. Dependabot is configured not to automatically propose incompatible major-line migrations for those dependencies.

## CI

GitHub Actions runs the public repository guard, dependency installation, Solidity compilation and both production test suites on pushes and pull requests.

## License

`ZynostVerifyingPaymaster.sol` is GPL-3.0 as declared by its SPDX identifier. See [`LICENSE`](LICENSE).

## Audit position

This repository provides reproducible source and tests, but it does **not** claim that internal tests are equivalent to an independent third-party smart-contract audit.
