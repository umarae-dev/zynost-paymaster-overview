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
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PAYMASTER_DEPLOYER_PRIVATE_KEY ? [process.env.PAYMASTER_DEPLOYER_PRIVATE_KEY] : [],
    },
    bsc: {
      url: process.env.BSC_DEPLOY_RPC_URL || "https://bsc-rpc.publicnode.com",
      accounts: process.env.PAYMASTER_DEPLOYER_PRIVATE_KEY ? [process.env.PAYMASTER_DEPLOYER_PRIVATE_KEY] : [],
    },
    bscTestnet: {
      url: process.env.BSC_TESTNET_RPC_URL || "https://bsc-testnet-rpc.publicnode.com",
      accounts: process.env.BSC_TESTNET_DEPLOYER_PRIVATE_KEY
        ? [process.env.BSC_TESTNET_DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
};
