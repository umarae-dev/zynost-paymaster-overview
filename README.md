# Zynost Paymaster — Gasless Checkout

**The problem this solves:** a customer wants to pay with crypto, has the stablecoins to do it, but no native gas token sitting in their wallet — and that's exactly where most crypto checkouts quietly lose people. Zynost Paymaster is the on-chain contract system that lets [Zynost Pay](https://github.com/umarae-dev/zynost-pay-overview) sponsor that gas, safely, without becoming a blank check.

## How sponsorship actually gets approved

Nothing gets sponsored on a wallet's say-so alone. The flow is a real two-layer check:

1. **Off-chain, first.** A rate limiter and failure-based circuit breaker sit in front of the signing step — a handful of requests per minute per sender, with a cooldown if something starts failing repeatedly. This is the cheap, fast filter.
2. **A signed, scoped approval.** If a request clears that, the backend reads a hash directly from the deployed contract (not reimplemented client-side, so there's no way for the two to drift apart), signs it with a dedicated verifying-signer key, and hands back an approval that's valid for five minutes and capped at an exact maximum sponsored cost — not "sponsor whatever this costs," but "sponsor up to this much, for this specific operation, and no other."
3. **On-chain, independently.** The contract re-derives that same hash itself and recovers the signer from the signature — if it doesn't match, the operation fails validation cleanly (not a revert, a clean ERC-4337 rejection the bundler filters out during simulation). Even a syntactically valid signature still has to clear two more checks: the actual reported cost can't exceed what was approved, and both a per-sender and a global rolling 24-hour spend cap have to have room left. A nonce increments on every attempt, successful or not, so a rejected signature can't be replayed.

Two independent layers means a single point of failure — a leaked signer key, a bug in the rate limiter — doesn't turn into unlimited free gas. The on-chain caps are the actual backstop, not the off-chain rate limiter.

## Smart accounts, not custodial wallets

Every customer gets a smart-contract wallet address derived deterministically from their own wallet's public key and a fixed salt via CREATE2 — the same owner and salt always produce the same address, and nothing is actually deployed until the first transaction needs it. The factory itself is eth-infinitism's stock, audited `SimpleAccountFactory` — deliberately unmodified, so it inherits that project's own audit history rather than a bespoke implementation.

## Where it's actually running

Live on BSC mainnet — not a testnet demo. Built on the standard ERC-4337 v0.6 EntryPoint (the same one every serious Account Abstraction wallet and bundler already speaks), OpenZeppelin's audited access-control and signature-recovery libraries, and eth-infinitism's reference Paymaster/SimpleAccount implementations as the base rather than something written from scratch.

## Tested, not just deployed

A 16-case test suite covers the parts that actually matter for a contract that spends real gas on someone else's behalf: valid signed requests within budget succeed; wrong-signer signatures fail cleanly instead of reverting; a request that costs more than its approved maximum reverts; per-sender and global daily caps are enforced both for a single large request and for accumulated smaller ones across multiple senders; pausing blocks sponsorship even with an otherwise-valid signature; every owner-only function actually rejects non-owner callers; and a signature can't be replayed against a different sender than it was issued for.

## Stack

Solidity · Hardhat · OpenZeppelin · eth-infinitism's ERC-4337 reference contracts

## Status

Deployed on BSC mainnet, actively sponsoring gasless checkouts through Zynost Pay.

---

This repository is a public overview. Full contract source and deployment scripts are kept private pending independent audit, consistent with standard practice for contracts that sponsor real gas spend.
