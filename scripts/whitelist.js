const { ethers } = require("hardhat");

const STONKGIFT_ADDRESS = "0xb804AAaA4702C9Fd31D1Adc04925d45B69537736";

const COINBASE_STOCKS = [
  { name: "NVDAc (Nvidia)", address: "0xb20000000000000000000078ee7ce2fE4908108C" },
  { name: "AAPLc (Apple)", address: "0xb200000000000000000000C2e324d24d7eEcd1fb" },
  { name: "GOOGLc (Google)", address: "0xb2000000000000000000002D0BA3164cc74f58B7" },
  { name: "METAc (Meta)", address: "0xb2000000000000000000008bC8786B856E61707C" },
];

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Running whitelist script with caller:", signer.address);

  const StonkGift = await ethers.getContractFactory("contracts/StonkGift.sol:StonkGift");
  const stonkGift = StonkGift.attach(STONKGIFT_ADDRESS);

  const owner = await stonkGift.owner();
  console.log("StonkGift Contract:", STONKGIFT_ADDRESS);
  console.log("StonkGift Owner:", owner);

  if (signer.address.toLowerCase() !== owner.toLowerCase()) {
    console.error(`\nError: Caller ${signer.address} is NOT the contract owner (${owner})!`);
    console.error("Please configure the private key of the owner account in your .env file.");
    process.exit(1);
  }

  console.log("\nWhitelisting Coinbase tokenized stocks on Base Mainnet...");
  for (const stock of COINBASE_STOCKS) {
    const isSupported = await stonkGift.supportedTokens(stock.address);
    if (isSupported) {
      console.log(`- ${stock.name} is already whitelisted.`);
    } else {
      console.log(`Setting supported token for ${stock.name} (${stock.address})...`);
      const tx = await stonkGift.setSupportedToken(stock.address, true);
      console.log(`Tx sent: ${tx.hash}. Waiting confirmation...`);
      await tx.wait();
      console.log(`✓ Successfully whitelisted ${stock.name}!`);
    }
  }

  console.log("\nAll 4 Coinbase tokenized stocks are now active on StonkGift!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
