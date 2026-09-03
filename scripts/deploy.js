const { ethers, network } = require("hardhat");

const COINBASE_STOCKS = [
  { name: "AAPLc (Apple)", address: "0xb200000000000000000000C2e324d24d7eEcd1fb" },
  { name: "GOOGLc (Google)", address: "0xb2000000000000000000002D0BA3164cc74f58B7" },
  { name: "METAc (Meta)", address: "0xb2000000000000000000008bC8786B856E61707C" },
  { name: "NVDAc (Nvidia)", address: "0xb20000000000000000000078ee7ce2fE4908108C" },
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying StonkGift with account:", deployer.address);
  console.log("Target Network:", network.name);

  // Deploy StonkGift
  const StonkGift = await ethers.getContractFactory("StonkGift");
  const stonkGift = await StonkGift.deploy();
  await stonkGift.waitForDeployment();
  const stonkGiftAddress = await stonkGift.getAddress();
  console.log("StonkGift deployed to:", stonkGiftAddress);

  // Whitelist official Coinbase tokenized stocks
  console.log("\nWhitelisting official Coinbase tokenized stocks on Base...");
  for (const stock of COINBASE_STOCKS) {
    const tx = await stonkGift.setSupportedToken(stock.address, true);
    await tx.wait();
    console.log(`✓ Whitelisted ${stock.name}: ${stock.address}`);
  }

  console.log("\n--- Deployment Complete ---");
  console.log(`StonkGift Address: ${stonkGiftAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
