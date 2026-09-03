const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // 1. Deploy Mock NVDA stock token
  const MockStock = await ethers.getContractFactory("MockStockToken");
  const initialSupply = ethers.parseUnits("100000", 18);
  const mockNvda = await MockStock.deploy("Tokenized NVIDIA", "NVDA", 18, initialSupply);
  await mockNvda.waitForDeployment();
  const mockNvdaAddress = await mockNvda.getAddress();
  console.log("Mock NVDA deployed to:", mockNvdaAddress);

  // 2. Deploy StonkGift
  const StonkGift = await ethers.getContractFactory("StonkGift");
  const stonkGift = await StonkGift.deploy();
  await stonkGift.waitForDeployment();
  const stonkGiftAddress = await stonkGift.getAddress();
  console.log("StonkGift deployed to:", stonkGiftAddress);

  // 3. Whitelist Mock NVDA in StonkGift
  const whitelistTx = await stonkGift.setSupportedToken(mockNvdaAddress, true);
  await whitelistTx.wait();
  console.log("Whitelisted Mock NVDA in StonkGift");

  console.log("\n--- Deployment Summary ---");
  console.log(`StonkGift: ${stonkGiftAddress}`);
  console.log(`Mock NVDA: ${mockNvdaAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
