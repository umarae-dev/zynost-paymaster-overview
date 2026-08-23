// Follow-up: the deploy transaction itself succeeded on-chain (confirmed
// via eth_getTransactionReceipt), but the script crashed right after due
// to an ethers.js v6 / QuickNode response-format mismatch before it could
// run the deposit() call - this just does that one remaining step against
// the already-deployed contract.
const hre = require("hardhat");

const PAYMASTER_ADDRESS = "0x5a7593436ddd1211ce68958aedfb3864ef3f2848";

async function main() {
  const initialDeposit = hre.ethers.parseEther(process.env.PAYMASTER_INITIAL_DEPOSIT_ETH || "0.005");
  const paymaster = await hre.ethers.getContractAt("ZynostVerifyingPaymaster", PAYMASTER_ADDRESS);

  const depositTx = await paymaster.deposit({ value: initialDeposit });
  const receipt = await depositTx.wait();
  console.log("Deposit tx hash:", receipt.hash);
  console.log(`Funded EntryPoint deposit with ${hre.ethers.formatEther(initialDeposit)} BNB`);

  const currentDeposit = await paymaster.getDeposit();
  console.log("Contract's current EntryPoint deposit:", hre.ethers.formatEther(currentDeposit), "BNB");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
