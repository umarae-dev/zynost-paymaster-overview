# Public / Private Boundary

This repository contains a public, reusable reference implementation of Zynost's ERC-4337 gas-sponsorship architecture.

## Public in this repository

- ERC-4337 reference paymaster contract
- signed and time-bounded sponsorship authorization
- sender-bound replay protection
- explicit maximum sponsored-cost binding
- per-sender and global on-chain spending caps
- emergency sponsorship pause
- local Hardhat configuration
- BSC testnet configuration
- adversarial tests
- non-production environment template
- architecture and security documentation

## Private in the production system

The commercial production stack additionally contains components that are intentionally not published here, including:

- production signing keys and credentials
- production signer infrastructure
- abuse-detection and eligibility implementation
- production rate-limit thresholds and operational policies
- private infrastructure configuration
- deployment runbooks
- internal monitoring and incident-response systems
- merchant/customer production data

These private components are not required to compile, test, inspect, or evaluate the public reference paymaster.

## Security principle

Security does not depend on hiding the public contract. Secrets and operational controls remain private, while the reusable on-chain mechanism is made inspectable and testable.

## Hackathon / developer use

The public implementation is intended to be independently reproducible with local Hardhat or non-production BSC testnet configuration. It should not be assumed to represent every parameter, threshold, policy, or operational control used by Zynost in production.
