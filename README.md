# Zynost Paymaster — Gasless Checkout (ERC-4337)

An on-chain Paymaster and smart-account factory that lets Zynost Pay customers check out without holding native gas — the contract sponsors gas for verified, capped, non-custodial payment flows.

## What it does

- Implements the ERC-4337 Account Abstraction standard: a `VerifyingPaymaster` that sponsors a customer's transaction gas after checking an off-chain-signed approval, and a `SimpleAccountFactory` that deterministically derives a counterfactual smart-account address per customer (same factory + owner key + fixed salt → same address, every time, without deploying anything until first use).
- Sponsorship is bounded on-chain by per-sender and global daily caps, so compromise of the signing key alone can't drain the contract's deposit.
- Deployed against the canonical ERC-4337 v0.6 EntryPoint, so it's compatible with the standard bundler/EntryPoint infrastructure rather than a custom one.

## Stack

Solidity · Hardhat · OpenZeppelin · @account-abstraction/contracts

## Status

Deployed and integrated with Zynost Pay's checkout flow.

---

This repository is a public overview. Full contract source and deployment scripts are kept private pending independent audit, consistent with standard practice for smart contracts that sponsor real gas spend.
