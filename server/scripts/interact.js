// scripts/interact.js
const hre = require("hardhat");

async function main() {
  const contractAddress = "0x123...abc"; // Replace with deployed address
  const creditChain = await hre.ethers.getContractAt("CreditChain", contractAddress);
  await creditChain.addInsight("Use strong passwords", "Security", "hash123");
  console.log("Insight added");
  const insights = await creditChain.getInsights();
  console.log("Insights:", insights);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});