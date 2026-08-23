const { expect } = require("chai");
const { ethers } = require("hardhat");

// Sanity tests for eth-infinitism's own reference SimpleAccountFactory
// (unmodified, same audited family as ZynostVerifyingPaymaster) - confirms
// it wires up correctly with OUR EntryPoint before we deploy it for real.
//
// IMPORTANT ethers v6 gotcha: every Contract instance already has its OWN
// built-in `getAddress()` (returns the contract's own address, part of
// ethers' Addressable interface) - this collides by name with this
// contract's on-chain `getAddress(address,uint256)` view function. Calling
// `factory.getAddress(owner, salt)` silently resolves to ethers' method
// instead of the Solidity one and just returns the factory's own address
// regardless of arguments (a real bug caught here, not a hypothetical) -
// `factory.getFunction("getAddress(address,uint256)")` disambiguates it.
describe("SimpleAccountFactory", function () {
  async function freshFactory() {
    const EntryPoint = await ethers.getContractFactory("EntryPoint");
    const entryPoint = await EntryPoint.deploy();
    const Factory = await ethers.getContractFactory("SimpleAccountFactory");
    const factory = await Factory.deploy(await entryPoint.getAddress());
    const getCounterfactualAddress = factory.getFunction("getAddress(address,uint256)");
    return { factory, getCounterfactualAddress };
  }

  it("getAddress is self-consistent across repeated calls", async function () {
    const { getCounterfactualAddress } = await freshFactory();
    const [, owner] = await ethers.getSigners();

    const addr1 = await getCounterfactualAddress(owner.address, 123);
    const addr2 = await getCounterfactualAddress(owner.address, 123);

    expect(addr1).to.equal(addr2);
  });

  it("createAccount deploys real code at the address getAddress predicted", async function () {
    const { factory, getCounterfactualAddress } = await freshFactory();
    const [, owner] = await ethers.getSigners();
    const salt = 999;

    const predicted = await getCounterfactualAddress(owner.address, salt);
    await (await factory.createAccount(owner.address, salt)).wait();

    const code = await ethers.provider.getCode(predicted);
    expect(code.length).to.be.greaterThan(2); // more than just "0x"
  });

  it("createAccount is idempotent - a second call on an existing account does not revert", async function () {
    const { factory } = await freshFactory();
    const [, owner] = await ethers.getSigners();
    const salt = 7;

    await (await factory.createAccount(owner.address, salt)).wait();
    await expect(factory.createAccount(owner.address, salt)).to.not.be.reverted;
  });

  it("the deployed account's on-chain owner matches what was requested", async function () {
    const { factory, getCounterfactualAddress } = await freshFactory();
    const [, owner] = await ethers.getSigners();
    const salt = 1;

    await (await factory.createAccount(owner.address, salt)).wait();
    const addr = await getCounterfactualAddress(owner.address, salt);
    const account = await ethers.getContractAt("SimpleAccount", addr);

    expect(await account.owner()).to.equal(owner.address);
  });

  it("two different owners produce two different account addresses for the same salt", async function () {
    const { getCounterfactualAddress } = await freshFactory();
    const [, ownerA, ownerB] = await ethers.getSigners();

    const addrA = await getCounterfactualAddress(ownerA.address, 0);
    const addrB = await getCounterfactualAddress(ownerB.address, 0);

    expect(addrA).to.not.equal(addrB);
  });

  it("the SAME owner with a different salt also produces a different address", async function () {
    const { getCounterfactualAddress } = await freshFactory();
    const [, owner] = await ethers.getSigners();

    const addrSalt0 = await getCounterfactualAddress(owner.address, 0);
    const addrSalt1 = await getCounterfactualAddress(owner.address, 1);

    expect(addrSalt0).to.not.equal(addrSalt1);
  });
});
