// Withdraws BNB from the Paymaster's own EntryPoint deposit back out to any
// address you choose. Only the contract's owner (the deployer wallet whose
// key is in .env) can do this - matches BasePaymaster's onlyOwner withdrawTo().
//
// Usage: set WITHDRAW_AMOUNT_ETH and WITHDRAW_TO_ADDRESS in .env, then run:
//   npx hardhat run scripts/withdraw.js --network bsc
const hre = require("hardhat");

const PAYMASTER_ADDRESS = "0x5a7593436ddd1211ce68958aedfb3864ef3f2848";

async function main() {
  const amount = hre.ethers.parseEther(process.env.WITHDRAW_AMOUNT_ETH || "0");
  const to = process.env.WITHDRAW_TO_ADDRESS;
  if (amount <= 0n) throw new Error("Set WITHDRAW_AMOUNT_ETH in .env to a positive BNB amount.");
  if (!to) throw new Error("Set WITHDRAW_TO_ADDRESS in .env to the address that should receive the BNB.");

  const paymaster = await hre.ethers.getContractAt("ZynostVerifyingPaymaster", PAYMASTER_ADDRESS);

  const before = await paymaster.getDeposit();
  console.log("Deposit before withdrawal:", hre.ethers.formatEther(before), "BNB");

  const tx = await paymaster.withdrawTo(to, amount);
  const receipt = await tx.wait();
  console.log("Withdraw tx hash:", receipt.hash);

  const after = await paymaster.getDeposit();
  console.log(`Withdrew ${hre.ethers.formatEther(amount)} BNB to ${to}`);
  console.log("Deposit remaining:", hre.ethers.formatEther(after), "BNB");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
