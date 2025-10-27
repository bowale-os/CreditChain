const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("Wallet address:", signer.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});