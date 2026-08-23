// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// Re-exports eth-infinitism's own reference SimpleAccountFactory (paired
// with EntryPoint v0.6, same audited family as ZynostVerifyingPaymaster) so
// Hardhat compiles it and it's deployable via scripts/deploy_account_factory.js.
// Deliberately NOT a custom account contract - a smart account holding real
// customer funds is exactly the kind of thing that should be the canonical,
// widely-used reference implementation, not something bespoke.
import "@account-abstraction/contracts/samples/SimpleAccountFactory.sol";
