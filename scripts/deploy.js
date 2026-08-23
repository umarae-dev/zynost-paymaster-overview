// Deploys ZynostVerifyingPaymaster to whichever network Hardhat is pointed
// at (e.g. `npx hardhat run scripts/deploy.js --network sepolia`), funds
// its EntryPoint deposit with an initial gas float, and prints everything
// needed to fill in zynost-gateway-backend's PAYMASTER_* settings.
//
// Required env vars (see hardhat.config.js): SEPOLIA_RPC_URL,
// PAYMASTER_DEPLOYER_PRIVATE_KEY (funds the deployment + initial deposit -
// NOT the same key as the verifying signer). PAYMASTER_VERIFYING_SIGNER_ADDRESS
// is the public address whose PRIVATE key goes into the backend's
// PAYMASTER_VERIFYING_SIGNER_PRIVATE_KEY setting - this script never needs
// or touches that private key itself.
const hre = require("hardhat");

const ENTRYPOINT_V06_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

async function main() {
  const verifyingSigner = process.env.PAYMASTER_VERIFYING_SIGNER_ADDRESS;
  if (!verifyingSigner) {
    throw new Error("Set PAYMASTER_VERIFYING_SIGNER_ADDRESS before deploying.");
  }

  const dailyCapPerSender = hre.ethers.parseEther(process.env.PAYMASTER_DAILY_CAP_PER_SENDER_ETH || "0.02");
  const globalDailyCap = hre.ethers.parseEther(process.env.PAYMASTER_GLOBAL_DAILY_CAP_ETH || "2");
  const initialDeposit = hre.ethers.parseEther(process.env.PAYMASTER_INITIAL_DEPOSIT_ETH || "0.1");

  const Paymaster = await hre.ethers.getContractFactory("ZynostVerifyingPaymaster");
  const paymaster = await Paymaster.deploy(ENTRYPOINT_V06_ADDRESS, verifyingSigner, dailyCapPerSender, globalDailyCap);
  await paymaster.waitForDeployment();
  const address = await paymaster.getAddress();

  console.log("ZynostVerifyingPaymaster deployed at:", address);

  const depositTx = await paymaster.deposit({ value: initialDeposit });
  await depositTx.wait();
  console.log(`Funded EntryPoint deposit with ${hre.ethers.formatEther(initialDeposit)} ETH`);

  console.log("\n--- Fill these into zynost-gateway-backend's environment ---");
  console.log("PAYMASTER_CONTRACT_ADDRESS =", address);
  console.log("PAYMASTER_ENTRYPOINT_ADDRESS =", ENTRYPOINT_V06_ADDRESS);
  console.log("PAYMASTER_CHAIN_ID =", (await hre.ethers.provider.getNetwork()).chainId.toString());
  console.log("(PAYMASTER_VERIFYING_SIGNER_PRIVATE_KEY = the private key for", verifyingSigner, "- keep this only in the backend's secrets, never commit it)");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
