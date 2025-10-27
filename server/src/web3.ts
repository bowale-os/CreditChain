import Web3 from "web3";
import dotenv from "dotenv";
import type { AbiItem } from "web3-utils";
import contractABIJson from "../src/CreditChainABI.json";

dotenv.config();

// Explicitly cast as readonly AbiItem[]
const contractABI = contractABIJson as readonly AbiItem[];

const provider = new Web3.providers.HttpProvider(process.env.SEPOLIA_RPC_URL as string);
const web3 = new Web3(provider);

const contractAddress = process.env.CONTRACT_ADDRESS as string;
const contract = new web3.eth.Contract(contractABI as any , contractAddress);

// Type assertion for account
const account = web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY as string) as unknown as { address: string };

export { web3, contract, account };
