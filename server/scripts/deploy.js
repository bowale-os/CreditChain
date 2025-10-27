const hre = require("hardhat");

async function main() {
  const CreditChain = await hre.ethers.getContractFactory("CreditChain");
  const creditChain = await CreditChain.deploy();

  // ✅ Wait until the contract is actually deployed
  await creditChain.waitForDeployment();

  console.log("CreditChain deployed to:", await creditChain.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
