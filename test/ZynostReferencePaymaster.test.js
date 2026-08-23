const { expect } = require("chai");
const { ethers } = require("hardhat");

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

const PAYMASTER_AND_DATA_LENGTH = 20 + 64 + 32 + 65;

async function signApproval(paymaster, signer, userOp, validUntil, validAfter, maxSponsoredCost) {
  const placeholder = "0x" + "00".repeat(PAYMASTER_AND_DATA_LENGTH);
  const hash = await paymaster.getHash(
    { ...userOp, paymasterAndData: placeholder },
    validUntil,
    validAfter,
    maxSponsoredCost
  );
  return signer.signMessage(ethers.getBytes(hash));
}

function buildPaymasterAndData(address, validUntil, validAfter, maxSponsoredCost, signature) {
  const coder = ethers.AbiCoder.defaultAbiCoder();
  const timestamps = coder.encode(["uint48", "uint48"], [validUntil, validAfter]);
  const cost = coder.encode(["uint256"], [maxSponsoredCost]);
  return ethers.concat([address, timestamps, cost, signature]);
}

describe("ZynostReferencePaymaster", function () {
  let entryPoint;
  let paymaster;
  let owner;
  let verifyingSigner;
  let otherSigner;
  let sender;
  let entryPointSigner;

  const DAILY_CAP = ethers.parseEther("0.01");
  const GLOBAL_CAP = ethers.parseEther("1");

  beforeEach(async function () {
    [owner, verifyingSigner, otherSigner, sender] = await ethers.getSigners();

    const EntryPoint = await ethers.getContractFactory("EntryPoint");
    entryPoint = await EntryPoint.deploy();

    const Paymaster = await ethers.getContractFactory("ZynostReferencePaymaster");
    paymaster = await Paymaster.deploy(
      await entryPoint.getAddress(),
      verifyingSigner.address,
      DAILY_CAP,
      GLOBAL_CAP
    );
    await paymaster.deposit({ value: ethers.parseEther("5") });

    const entryPointAddress = await entryPoint.getAddress();
    await ethers.provider.send("hardhat_impersonateAccount", [entryPointAddress]);
    await owner.sendTransaction({ to: entryPointAddress, value: ethers.parseEther("1") });
    entryPointSigner = await ethers.getSigner(entryPointAddress);
  });

  async function validate(userOp, maxCost) {
    return paymaster
      .connect(entryPointSigner)
      .validatePaymasterUserOp.staticCall(userOp, ethers.ZeroHash, maxCost);
  }

  async function validateTx(userOp, maxCost) {
    return paymaster
      .connect(entryPointSigner)
      .validatePaymasterUserOp(userOp, ethers.ZeroHash, maxCost);
  }

  async function approvedOp(cost, opSender = sender.address, signer = verifyingSigner) {
    const validUntil = Math.floor(Date.now() / 1000) + 3600;
    const validAfter = 0;
    const partial = buildUserOp({ sender: opSender });
    const signature = await signApproval(paymaster, signer, partial, validUntil, validAfter, cost);
    const data = buildPaymasterAndData(
      await paymaster.getAddress(),
      validUntil,
      validAfter,
      cost,
      signature
    );
    return buildUserOp({ sender: opSender, paymasterAndData: data });
  }

  it("accepts a valid signed sponsorship within budget", async function () {
    const cost = ethers.parseEther("0.001");
    const op = await approvedOp(cost);
    const [, validationData] = await validate(op, cost);
    expect(BigInt(validationData) & 1n).to.equal(0n);
  });

  it("rejects an approval signed by an untrusted signer", async function () {
    const cost = ethers.parseEther("0.001");
    const op = await approvedOp(cost, sender.address, otherSigner);
    const [, validationData] = await validate(op, cost);
    expect(BigInt(validationData) & 1n).to.equal(1n);
  });

  it("rejects a cost above the signed maximum", async function () {
    const cost = ethers.parseEther("0.001");
    const op = await approvedOp(cost);
    await expect(validate(op, cost + 1n)).to.be.revertedWith(
      "ZynostPaymaster: cost exceeds approved max"
    );
  });

  it("enforces per-sender daily sponsorship caps", async function () {
    const cost = DAILY_CAP + 1n;
    const op = await approvedOp(cost);
    await expect(validate(op, cost)).to.be.revertedWith(
      "ZynostPaymaster: sender daily cap exceeded"
    );
  });

  it("accumulates spend toward a sender daily cap", async function () {
    const first = (DAILY_CAP * 6n) / 10n;
    const second = (DAILY_CAP * 5n) / 10n;

    await validateTx(await approvedOp(first), first);
    await expect(validate(await approvedOp(second), second)).to.be.revertedWith(
      "ZynostPaymaster: sender daily cap exceeded"
    );
  });

  it("enforces the global sponsorship cap", async function () {
    const Paymaster = await ethers.getContractFactory("ZynostReferencePaymaster");
    const tight = await Paymaster.deploy(
      await entryPoint.getAddress(),
      verifyingSigner.address,
      ethers.parseEther("10"),
      ethers.parseEther("0.001")
    );
    await tight.deposit({ value: ethers.parseEther("5") });

    const cost = ethers.parseEther("0.001") + 1n;
    const validUntil = Math.floor(Date.now() / 1000) + 3600;
    const partial = buildUserOp({ sender: sender.address });
    const signature = await signApproval(tight, verifyingSigner, partial, validUntil, 0, cost);
    const data = buildPaymasterAndData(await tight.getAddress(), validUntil, 0, cost, signature);
    const op = buildUserOp({ sender: sender.address, paymasterAndData: data });

    await expect(
      tight.connect(entryPointSigner).validatePaymasterUserOp.staticCall(op, ethers.ZeroHash, cost)
    ).to.be.revertedWith("ZynostPaymaster: global daily cap exceeded");
  });

  it("allows the owner to pause and blocks sponsorship while paused", async function () {
    await paymaster.connect(owner).setPaused(true);
    const cost = ethers.parseEther("0.001");
    const op = await approvedOp(cost);
    await expect(validate(op, cost)).to.be.revertedWith(
      "ZynostPaymaster: sponsorship paused"
    );
  });

  it("restricts administrative controls to the owner", async function () {
    await expect(paymaster.connect(otherSigner).setPaused(true)).to.be.reverted;
    await expect(paymaster.connect(otherSigner).setCaps(1, 1)).to.be.reverted;
    await expect(paymaster.connect(otherSigner).setVerifyingSigner(otherSigner.address)).to.be.reverted;
  });

  it("binds authorization to the sender", async function () {
    const cost = ethers.parseEther("0.001");
    const validUntil = Math.floor(Date.now() / 1000) + 3600;
    const partial = buildUserOp({ sender: sender.address });
    const signature = await signApproval(paymaster, verifyingSigner, partial, validUntil, 0, cost);
    const data = buildPaymasterAndData(await paymaster.getAddress(), validUntil, 0, cost, signature);
    const forged = buildUserOp({ sender: otherSigner.address, paymasterAndData: data });

    const [, validationData] = await validate(forged, cost);
    expect(BigInt(validationData) & 1n).to.equal(1n);
  });
});
