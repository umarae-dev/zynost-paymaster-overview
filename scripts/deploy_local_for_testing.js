// Deploys a REAL EntryPoint (not the production canonical address, which
// has no code on a fresh local chain) plus ZynostVerifyingPaymaster to the
// local Hardhat node, for cross-checking the Python backend's signing logic
// against the actual compiled contract - not a mock.
const hre = require("hardhat");

async function main() {
  const [deployer, verifyingSigner] = await hre.ethers.getSigners();

  const EntryPoint = await hre.ethers.getContractFactory("EntryPoint");
  const entryPoint = await EntryPoint.deploy();
  await entryPoint.waitForDeployment();

  const Paymaster = await hre.ethers.getContractFactory("ZynostVerifyingPaymaster");
  const paymaster = await Paymaster.deploy(
    await entryPoint.getAddress(),
    verifyingSigner.address,
    hre.ethers.parseEther("1"),
    hre.ethers.parseEther("10"),
  );
  await paymaster.waitForDeployment();

  await (await paymaster.deposit({ value: hre.ethers.parseEther("2") })).wait();

  console.log(JSON.stringify({
    entryPointAddress: await entryPoint.getAddress(),
    paymasterAddress: await paymaster.getAddress(),
    verifyingSignerAddress: verifyingSigner.address,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
  }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
