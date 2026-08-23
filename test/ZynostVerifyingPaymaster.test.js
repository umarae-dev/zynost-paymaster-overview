const { expect } = require("chai");
const { ethers } = require("hardhat");

const DAY = 24 * 60 * 60;

// Builds a syntactically valid UserOperation object. Only `sender` and
// `paymasterAndData` actually matter for these tests (everything else is
// never inspected by _validatePaymasterUserOp), but every field must be
// present with the correct type or ethers' ABI encoder will reject the
// call outright.
function buildUserOp(overrides = {}) {
  return {
    sender: overrides.sender,
    nonce: 0,
    initCode: "0x",
    callData: "0x",
    callGasLimit: 100000,
    verificationGasLimit: 100000,
    preVerificationGas: 21000,
    maxFeePerGas: ethers.parseUnits("10", "gwei"),
    maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
    paymasterAndData: overrides.paymasterAndData || "0x",
    signature: "0x",
  };
}

// 20 (paymaster address) + 64 (validUntil/validAfter) + 32 (maxSponsoredCost)
// + 65 (ECDSA signature) = the exact final paymasterAndData length.
const PAYMASTER_AND_DATA_LENGTH = 20 + 64 + 32 + 65;

async function signApproval(paymaster, verifyingSigner, userOp, validUntil, validAfter, maxSponsoredCost) {
  // getHash()'s pack() excludes paymasterAndData's CONTENT, but the head
  // slot holding signature's own tail offset is still copied - and that
  // offset's VALUE shifts with paymasterAndData's LENGTH. So the userOp
  // passed in here must carry a placeholder paymasterAndData of the exact
  // same final length (content is irrelevant) that will actually be
  // submitted, or this hash won't match what the contract recomputes
  // during real validation.
  const dummyPaymasterAndData = "0x" + "00".repeat(PAYMASTER_AND_DATA_LENGTH);
  const hash = await paymaster.getHash({ ...userOp, paymasterAndData: dummyPaymasterAndData }, validUntil, validAfter, maxSponsoredCost);
  return verifyingSigner.signMessage(ethers.getBytes(hash));
}

function buildPaymasterAndData(paymasterAddress, validUntil, validAfter, maxSponsoredCost, signature) {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const timestamps = abiCoder.encode(["uint48", "uint48"], [validUntil, validAfter]);
  const cost = abiCoder.encode(["uint256"], [maxSponsoredCost]);
  return ethers.concat([paymasterAddress, timestamps, cost, signature]);
}

describe("ZynostVerifyingPaymaster", function () {
  let entryPoint, paymaster, owner, verifyingSigner, otherSigner, sender, entryPointImpersonated;
  const DAILY_CAP_PER_SENDER = ethers.parseEther("0.01");
  const GLOBAL_DAILY_CAP = ethers.parseEther("1");

  beforeEach(async function () {
    [owner, verifyingSigner, otherSigner, sender] = await ethers.getSigners();

    const EntryPoint = await ethers.getContractFactory("EntryPoint");
    entryPoint = await EntryPoint.deploy();

    const Paymaster = await ethers.getContractFactory("ZynostVerifyingPaymaster");
    paymaster = await Paymaster.deploy(
      await entryPoint.getAddress(), verifyingSigner.address, DAILY_CAP_PER_SENDER, GLOBAL_DAILY_CAP
    );

    // Fund the paymaster's EntryPoint deposit so it can actually sponsor.
    await paymaster.deposit({ value: ethers.parseEther("5") });

    // Only the EntryPoint may call validatePaymasterUserOp - impersonate it
    // and fund it with ETH so it can pay for the call's own gas, exactly
    // how a real deployment behaves (only EntryPoint.handleOps ever calls
    // this in production).
    const entryPointAddress = await entryPoint.getAddress();
    await ethers.provider.send("hardhat_impersonateAccount", [entryPointAddress]);
    await owner.sendTransaction({ to: entryPointAddress, value: ethers.parseEther("1") });
    entryPointImpersonated = await ethers.getSigner(entryPointAddress);
  });

  async function validate(userOp, maxCost) {
    return paymaster.connect(entryPointImpersonated).validatePaymasterUserOp.staticCall(userOp, ethers.ZeroHash, maxCost);
  }

  async function validateTx(userOp, maxCost) {
    return paymaster.connect(entryPointImpersonated).validatePaymasterUserOp(userOp, ethers.ZeroHash, maxCost);
  }

  it("accepts a validly-signed, in-budget sponsorship request", async function () {
    const paymasterAddress = await paymaster.getAddress();
    const validUntil = Math.floor(Date.now() / 1000) + 3600;
    const validAfter = 0;
    const maxSponsoredCost = ethers.parseEther("0.001");

    const partialOp = buildUserOp({ sender: sender.address });
    const signature = await signApproval(paymaster, verifyingSigner, partialOp, validUntil, validAfter, maxSponsoredCost);
    const paymasterAndData = buildPaymasterAndData(paymasterAddress, validUntil, validAfter, maxSponsoredCost, signature);
    const userOp = buildUserOp({ sender: sender.address, paymasterAndData });

    const [, validationData] = await validate(userOp, maxSponsoredCost);
    const sigFailed = BigInt(validationData) & 1n;
    expect(sigFailed).to.equal(0n);
  });

  it("rejects a request signed by someone other than the verifying signer", async function () {
    const paymasterAddress = await paymaster.getAddress();
    const validUntil = Math.floor(Date.now() / 1000) + 3600;
    const validAfter = 0;
    const maxSponsoredCost = ethers.parseEther("0.001");

    const partialOp = buildUserOp({ sender: sender.address });
    // Signed by an attacker/unrelated key, not the real verifyingSigner.
    const signature = await signApproval(paymaster, otherSigner, partialOp, validUntil, validAfter, maxSponsoredCost);
    const paymasterAndData = buildPaymasterAndData(paymasterAddress, validUntil, validAfter, maxSponsoredCost, signature);
    const userOp = buildUserOp({ sender: sender.address, paymasterAndData });

    const [, validationData] = await validate(userOp, maxSponsoredCost);
    const sigFailed = BigInt(validationData) & 1n;
    expect(sigFailed).to.equal(1n); // SIG_VALIDATION_FAILED, not a revert
  });

  it("reverts when the actual cost exceeds the explicitly-approved max", async function () {
    const paymasterAddress = await paymaster.getAddress();
    const validUntil = Math.floor(Date.now() / 1000) + 3600;
    const validAfter = 0;
    const maxSponsoredCost = ethers.parseEther("0.001");

    const partialOp = buildUserOp({ sender: sender.address });
    const signature = await signApproval(paymaster, verifyingSigner, partialOp, validUntil, validAfter, maxSponsoredCost);
    const paymasterAndData = buildPaymasterAndData(paymasterAddress, validUntil, validAfter, maxSponsoredCost, signature);
    const userOp = buildUserOp({ sender: sender.address, paymasterAndData });

    // Bundler claims a higher actual cost than what was signed off on.
    await expect(validate(userOp, maxSponsoredCost + 1n)).to.be.revertedWith("ZynostPaymaster: cost exceeds approved max");
  });

  it("enforces the on-chain per-sender daily cap even with a valid signature", async function () {
    const paymasterAddress = await paymaster.getAddress();
    const validUntil = Math.floor(Date.now() / 1000) + 3600;
    const validAfter = 0;
    // Ask for more than the sender's entire daily cap in one shot.
    const maxSponsoredCost = DAILY_CAP_PER_SENDER + 1n;

    const partialOp = buildUserOp({ sender: sender.address });
    const signature = await signApproval(paymaster, verifyingSigner, partialOp, validUntil, validAfter, maxSponsoredCost);
    const paymasterAndData = buildPaymasterAndData(paymasterAddress, validUntil, validAfter, maxSponsoredCost, signature);
    const userOp = buildUserOp({ sender: sender.address, paymasterAndData });

    await expect(validate(userOp, maxSponsoredCost)).to.be.revertedWith("ZynostPaymaster: sender daily cap exceeded");
  });

  it("accumulates spend across multiple approved ops toward the same sender's daily cap", async function () {
    const paymasterAddress = await paymaster.getAddress();
    const validUntil = Math.floor(Date.now() / 1000) + 3600;
    const validAfter = 0;
    const firstCost = (DAILY_CAP_PER_SENDER * 6n) / 10n; // 60% of cap
    const secondCost = (DAILY_CAP_PER_SENDER * 5n) / 10n; // another 50% -> 110% total, must fail

    // First op: nonce 0, should succeed and consume real state (a static
    // call alone wouldn't persist it - use the real tx here).
    let partialOp = buildUserOp({ sender: sender.address });
    let signature = await signApproval(paymaster, verifyingSigner, partialOp, validUntil, validAfter, firstCost);
    let paymasterAndData = buildPaymasterAndData(paymasterAddress, validUntil, validAfter, firstCost, signature);
    let userOp = buildUserOp({ sender: sender.address, paymasterAndData });
    await validateTx(userOp, firstCost);

    // Second op: paymaster's internal senderNonce has now advanced to 1,
    // so it must be re-signed against the NEW nonce (getHash reads current
    // senderNonce), matching how a real backend would always sign fresh.
    partialOp = buildUserOp({ sender: sender.address });
    signature = await signApproval(paymaster, verifyingSigner, partialOp, validUntil, validAfter, secondCost);
    paymasterAndData = buildPaymasterAndData(paymasterAddress, validUntil, validAfter, secondCost, signature);
    userOp = buildUserOp({ sender: sender.address, paymasterAndData });

    await expect(validate(userOp, secondCost)).to.be.revertedWith("ZynostPaymaster: sender daily cap exceeded");
  });

  it("enforces the global daily cap across different senders", async function () {
    const Paymaster = await ethers.getContractFactory("ZynostVerifyingPaymaster");
    const tightGlobalPaymaster = await Paymaster.deploy(
      await entryPoint.getAddress(), verifyingSigner.address, ethers.parseEther("10"), ethers.parseEther("0.001")
    );
    await tightGlobalPaymaster.deposit({ value: ethers.parseEther("5") });
    const paymasterAddress = await tightGlobalPaymaster.getAddress();

    const validUntil = Math.floor(Date.now() / 1000) + 3600;
    const validAfter = 0;
    const cost = ethers.parseEther("0.001") + 1n; // 1 wei over the tiny global cap

    const partialOp = buildUserOp({ sender: sender.address });
    const signature = await signApproval(tightGlobalPaymaster, verifyingSigner, partialOp, validUntil, validAfter, cost);
    const paymasterAndData = buildPaymasterAndData(paymasterAddress, validUntil, validAfter, cost, signature);
    const userOp = buildUserOp({ sender: sender.address, paymasterAndData });

    await expect(
      tightGlobalPaymaster.connect(entryPointImpersonated).validatePaymasterUserOp.staticCall(userOp, ethers.ZeroHash, cost)
    ).to.be.revertedWith("ZynostPaymaster: global daily cap exceeded");
  });

  it("rejects sponsorship entirely once paused, regardless of a valid signature", async function () {
    const paymasterAddress = await paymaster.getAddress();
    const validUntil = Math.floor(Date.now() / 1000) + 3600;
    const validAfter = 0;
    const maxSponsoredCost = ethers.parseEther("0.001");

    await paymaster.connect(owner).setPaused(true);

    const partialOp = buildUserOp({ sender: sender.address });
    const signature = await signApproval(paymaster, verifyingSigner, partialOp, validUntil, validAfter, maxSponsoredCost);
    const paymasterAndData = buildPaymasterAndData(paymasterAddress, validUntil, validAfter, maxSponsoredCost, signature);
    const userOp = buildUserOp({ sender: sender.address, paymasterAndData });

    await expect(validate(userOp, maxSponsoredCost)).to.be.revertedWith("ZynostPaymaster: sponsorship paused");
  });

  it("only the owner may pause, change caps, or change the verifying signer", async function () {
    await expect(paymaster.connect(otherSigner).setPaused(true)).to.be.reverted;
    await expect(paymaster.connect(otherSigner).setCaps(1, 1)).to.be.reverted;
    await expect(paymaster.connect(otherSigner).setVerifyingSigner(otherSigner.address)).to.be.reverted;

    await expect(paymaster.connect(owner).setPaused(true)).to.not.be.reverted;
    await expect(paymaster.connect(owner).setCaps(123, 456)).to.not.be.reverted;
    await expect(paymaster.connect(owner).setVerifyingSigner(otherSigner.address)).to.not.be.reverted;
  });

  it("rejects a stale (expired) approval", async function () {
    const paymasterAddress = await paymaster.getAddress();
    const validUntil = Math.floor(Date.now() / 1000) - 10; // already expired
    const validAfter = 0;
    const maxSponsoredCost = ethers.parseEther("0.001");

    const partialOp = buildUserOp({ sender: sender.address });
    const signature = await signApproval(paymaster, verifyingSigner, partialOp, validUntil, validAfter, maxSponsoredCost);
    const paymasterAndData = buildPaymasterAndData(paymasterAddress, validUntil, validAfter, maxSponsoredCost, signature);
    const userOp = buildUserOp({ sender: sender.address, paymasterAndData });

    // The paymaster itself doesn't reject on expiry directly - it packs
    // validUntil/validAfter into validationData for the EntryPoint to
    // enforce (standard ERC-4337 division of responsibility). Confirm the
    // packed value actually carries the expired timestamp so the
    // EntryPoint WILL reject it.
    const [, validationData] = await validate(userOp, maxSponsoredCost);
    const packedValidUntil = (BigInt(validationData) >> 160n) & ((1n << 48n) - 1n);
    expect(packedValidUntil).to.equal(BigInt(validUntil));
  });

  it("a signature cannot be replayed for a different sender", async function () {
    const paymasterAddress = await paymaster.getAddress();
    const validUntil = Math.floor(Date.now() / 1000) + 3600;
    const validAfter = 0;
    const maxSponsoredCost = ethers.parseEther("0.001");

    // Sign for `sender`, then try to use that exact signature for a
    // different sender address.
    const partialOp = buildUserOp({ sender: sender.address });
    const signature = await signApproval(paymaster, verifyingSigner, partialOp, validUntil, validAfter, maxSponsoredCost);
    const paymasterAndData = buildPaymasterAndData(paymasterAddress, validUntil, validAfter, maxSponsoredCost, signature);
    const forgedUserOp = buildUserOp({ sender: otherSigner.address, paymasterAndData });

    const [, validationData] = await validate(forgedUserOp, maxSponsoredCost);
    const sigFailed = BigInt(validationData) & 1n;
    expect(sigFailed).to.equal(1n);
  });
});
