# Public / Private Boundary

This repository publishes the production-safe on-chain Zynost ERC-4337 Paymaster component and its matching production test suite while excluding operational secrets and private commercial infrastructure.

## Public in this repository

- exact production-safe `contracts/ZynostVerifyingPaymaster.sol` source;
- exact production `test/ZynostVerifyingPaymaster.test.js` suite;
- the production Hardhat helper that compiles a genuine ERC-4337 EntryPoint for tests;
- signed, time-bounded and cost-capped sponsorship authorization mechanics;
- sender-bound replay protection;
- per-sender and global on-chain spending caps;
- emergency sponsorship pause;
- local/BSC-testnet configuration containing no real credential;
- public CI, secret guard, architecture and security documentation.

## Private / not copied from production

- production signer and deployer private keys;
- production `.env` files and private RPC credentials;
- backend eligibility, abuse-detection and rate-control implementation;
- private operational thresholds/configuration beyond what is inherently visible on-chain;
- deployment/recovery runbooks and monitoring infrastructure;
- merchant/customer data and unrelated production services.

These private components are not required to compile or run the public Paymaster test suite.

## Security principle

Security does not depend on hiding the Paymaster contract. The inspectable on-chain controls are public; credentials, signer material, user data and private operations remain outside source control.

The public repository history represents the public extraction/maintenance timeline and is not backdated to imitate earlier private production development.
