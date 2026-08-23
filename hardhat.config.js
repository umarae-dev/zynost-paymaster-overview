require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ quiet: true });

/** @type {import('hardhat/config').HardhatUserConfig} */
module.exports = {
  solidity: {
    version: "0.8.23",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {},
    bscTestnet: {
      url: process.env.BSC_TESTNET_RPC_URL || "https://bsc-testnet-rpc.publicnode.com",
      accounts: process.env.BSC_TESTNET_DEPLOYER_PRIVATE_KEY
        ? [process.env.BSC_TESTNET_DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
};
