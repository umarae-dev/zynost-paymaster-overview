// Deploys eth-infinitism's reference SimpleAccountFactory, paired with the
// same EntryPoint v0.6 ZynostVerifyingPaymaster already uses. This is what
// lets Zynost Pay's checkout compute a counterfactual "smart account"
// address for any customer wallet, so their payment can be settled via a
// gasless UserOperation once funds arrive there.
const hre = require("hardhat");

const ENTRYPOINT_V06_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

async function main() {
  const Factory = await hre.ethers.getContractFactory("SimpleAccountFactory");
  const factory = await Factory.deploy(ENTRYPOINT_V06_ADDRESS);
  await factory.waitForDeployment();
  const address = await factory.getAddress();

  console.log("SimpleAccountFactory deployed at:", address);
  console.log("ACCOUNT_FACTORY_ADDRESS =", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
