# Security Policy

Zynost Paymaster is part of a live crypto-payment infrastructure stack. This public repository documents the architecture and security model while deliberately excluding credentials, signing material and production-sensitive implementation details.

## Reporting a vulnerability

Please do **not** publish exploit details, private keys, credentials, wallet recovery material or a working proof-of-concept against production systems in a public GitHub issue.

For a suspected security issue, contact the Zynost team privately through the official contact channel listed on the Zynost website and include:

- affected component;
- clear reproduction steps;
- expected vs. observed behavior;
- potential impact;
- relevant transaction hash or public chain data when applicable;
- a minimal proof-of-concept that does not put user funds at risk.

## Scope

Security review priorities include:

- ERC-4337 sponsorship authorization;
- replay resistance;
- spending caps and accounting;
- signer authorization;
- smart-account interaction;
- separation between gas sponsorship and merchant/customer funds;
- abuse resistance and denial-of-service conditions.

## Out of scope for public disclosure

Do not request or attempt to obtain:

- production private keys;
- seed phrases;
- signing secrets;
- database credentials;
- internal infrastructure credentials;
- private merchant or customer data.

## Public repository boundary

Code or documentation published here must never include production secrets. Any future open-source hackathon/developer component will use sanitized configuration and reproducible non-production deployment instructions.
