// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// Not used directly by ZynostVerifyingPaymaster (which only needs the
// IEntryPoint interface) - this file's sole purpose is to make Hardhat
// compile the real EntryPoint implementation too, so tests can deploy a
// genuine EntryPoint rather than a hand-rolled mock.
import "@account-abstraction/contracts/core/EntryPoint.sol";
