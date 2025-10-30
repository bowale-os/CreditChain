// src/web3/index.ts
import Web3 from "web3";
import dotenv from "dotenv";
import type { AbiItem } from "web3-utils";
import contractABIJson from "../src/CreditChainABI.json";

dotenv.config();

// -------------------------------------------------------------------
// 1. Validate env vars early
// -------------------------------------------------------------------
const required = [
  "SEPOLIA_RPC_URL",
  "CONTRACT_ADDRESS",
  "PRIVATE_KEY",
] as const;

for (const key of required) {
  if (!process.env[key]) {
    console.error(`[WEB3] MISSING ENV: ${key}`);
    process.exit(1);
  }
}

// -------------------------------------------------------------------
// 2. Create provider + web3
// -------------------------------------------------------------------
console.log("[WEB3] Connecting to RPC:", process.env.SEPOLIA_RPC_URL);
const provider = new Web3.providers.HttpProvider(process.env.SEPOLIA_RPC_URL!);
const web3 = new Web3(provider);

// -------------------------------------------------------------------
// 3. Test RPC connection
// -------------------------------------------------------------------
(async () => {
  try {
    const netId = await web3.eth.net.getId();
    const isListening = await web3.eth.net.isListening();
    console.log(`[WEB3] RPC OK – network ID: ${netId}, listening: ${isListening}`);
  } catch (e: any) {
    console.error("[WEB3] RPC FAILED:", e.message);
    process.exit(1);
  }
})();

// -------------------------------------------------------------------
// 4. Load contract ABI
// -------------------------------------------------------------------
const contractABI = contractABIJson.abi as readonly AbiItem[];
if (!contractABI.length) {
  console.error("[WEB3] ABI is empty!");
  process.exit(1);
}
console.log(`[WEB3] ABI loaded – ${contractABI.length} items`);

// -------------------------------------------------------------------
// 5. Deployed contract address
// -------------------------------------------------------------------
const contractAddress = process.env.CONTRACT_ADDRESS!;
console.log("[WEB3] Contract address:", contractAddress);

// Validate address format
if (!Web3.utils.isAddress(contractAddress)) {
  console.error("[WEB3] INVALID CONTRACT ADDRESS:", contractAddress);
  process.exit(1);
}

const contract = new web3.eth.Contract(contractABI as any, contractAddress);

// -------------------------------------------------------------------
// 6. Load private key + account
// -------------------------------------------------------------------
const privateKey = process.env.PRIVATE_KEY!;
if (!privateKey.startsWith("0x")) {
  console.warn("[WEB3] PRIVATE_KEY missing 0x prefix – adding it");
}

const wallet = web3.eth.accounts.wallet.add(privateKey);
const account = wallet[0]; // wallet.add returns the account object

console.log("[WEB3] Account loaded:", account.address);

// -------------------------------------------------------------------
// 7. Verify account has ETH (Sepolia)
// -------------------------------------------------------------------
(async () => {
  try {
    const balance = await web3.eth.getBalance(account.address);
    const eth = web3.utils.fromWei(balance, "ether");
    console.log(`[WEB3] Balance: ${eth} ETH`);

    if (parseFloat(eth) < 0.01) {
      console.warn("[WEB3] LOW BALANCE – you may run out of gas!");
    }
  } catch (e: any) {
    console.error("[WEB3] BALANCE CHECK FAILED:", e.message);
  }
})();

// -------------------------------------------------------------------
// 8. Export
// -------------------------------------------------------------------
export { web3, contract, account };