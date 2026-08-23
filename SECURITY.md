# Security Policy

Zynost Paymaster is part of a live crypto-payment infrastructure stack. This repository publishes the production-safe on-chain Paymaster source and production test suite while deliberately excluding credentials, signing material, user data and private operational systems.

## Reporting a vulnerability

Do **not** publish exploit details, private keys, credentials, wallet recovery material or a working proof-of-concept against production systems in a public GitHub issue.

For a suspected security issue, contact the Zynost team privately through the official contact channel listed on the Zynost website. Useful reports include the affected component, reproduction steps, expected vs. observed behavior, impact, relevant public transaction data and a minimal proof-of-concept that does not put user funds at risk.

## Review priorities

- ERC-4337 sponsorship authorization and signature validation;
- replay resistance and sender nonce state;
- approved-cost, per-sender and global cap enforcement;
- signer/owner authorization;
- EntryPoint interaction;
- separation between sponsored gas and merchant/customer payment funds;
- malformed `paymasterAndData`, validity windows and denial-of-service conditions.

## Secrets and sensitive data

Never commit or disclose:

- production signer/deployer private keys or seed phrases;
- production `.env` contents;
- private RPC/API/database credentials;
- operational recovery secrets;
- merchant/customer private data.

Public contract addresses, source code and transaction hashes are not secrets.

## Audit position

The included production tests and CI are engineering evidence, not a substitute for an independent third-party smart-contract audit. This repository does not claim the contract is unhackable or independently audited unless a specific published audit is linked later.
