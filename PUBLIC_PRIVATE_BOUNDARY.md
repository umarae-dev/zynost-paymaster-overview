# Public / Private Boundary

This repository publishes the production-safe on-chain Zynost ERC-4337 Paymaster subsystem while excluding operational secrets and private commercial infrastructure.

## Public in this repository

- exact production-safe `contracts/ZynostVerifyingPaymaster.sol` source;
- exact production `test/ZynostVerifyingPaymaster.test.js` suite;
- exact production Hardhat helper that compiles a genuine ERC-4337 EntryPoint;
- exact production `SimpleAccountFactory` import shim and matching production tests;
- production-safe deploy, local-test, deposit and withdrawal scripts;
- signed, time-bounded and cost-capped sponsorship authorization mechanics;
- sender-bound replay protection;
- per-sender and global on-chain spending caps;
- emergency sponsorship pause;
- secret-free Hardhat network configuration and `.env.example` placeholders;
- public CI, dependency-maintenance policy and repository secret guard.

## Private / not copied from production

- production signer and deployer private keys;
- production `.env` files and private RPC credentials;
- backend eligibility, abuse-detection and rate-control implementation;
- merchant/customer data;
- private monitoring, recovery and operational runbooks;
- unrelated production services and UQX subsystem files.

The private components above are not required to compile or run the public Paymaster and account-factory test suites.

## Security principle

Security does not depend on hiding the Paymaster contract. Inspectable on-chain controls are public; credentials, signer material, user data and private operations remain outside source control.

The public repository history represents the public extraction and maintenance timeline and is not backdated to imitate earlier private development.
