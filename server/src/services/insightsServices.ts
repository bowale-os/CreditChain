// src/services/insightServices.ts
import { PrismaClient } from '@prisma/client';
import Web3 from 'web3';
import { contract, account } from "../web3";

const prisma = new PrismaClient();

export interface Insight {
  id?: string;             // local DB id
  tip: string;
  body: string | null;
  category: string;
  hashedId: string;
  createdAt: Date;
  upvotes: number;
  synced?: boolean;        // whether it has been synced to blockchain
  onChainIndex?: number;      // index on blockchain
}

/**
 * Fetch insights from Postgres.
 * Use this as the primary source for your UI for speed.
 */
export const getInsights = async (): Promise<Insight[]> => {
  return await prisma.insight.findMany({
    orderBy: { createdAt: "desc" },
  });
};

/**
 * Add an insight to Postgres, then sync to blockchain.
 */
export const addInsight = async (
  tip: string,
  body: string | undefined,
  category: string,
  hashedId: string
) => {
  // Step 1: Save locally
  const localInsight = await prisma.insight.create({
    data: { 
      tip, 
      body, 
      category, 
      hashedId, 
      createdAt: new Date(), 
      upvotes: 0, 
      synced: false 
    },
  });

  // Step 2: Try to sync to blockchain
  try {
    const tx = await (contract.methods.addInsight(
      tip,
      body,
      category,
      hashedId
    ) as any).send({
      from: account.address,
      gas: 300000,
    });

    // read emitted event to get blockchain index
    const onChainId =
      tx?.events?.InsightAdded?.returnValues?.id !== undefined
        ? Number(tx.events.InsightAdded.returnValues.id)
        : null;

    // Step 3: Update local DB with sync info
    const updated = await prisma.insight.update({
      where: { id: localInsight.id },
      data: { synced: true, onChainId },
    });

    return updated;
  } catch (err) {
    console.error("Blockchain sync failed:", err);
    return localInsight; // still return local copy
  }
};

/**
 * Upvote an insight both in DB and blockchain.
 */
export const upvoteInsight = async (id: string, onChainId?: number) => {
  //find onchainid if not provided
  if (onChainId === undefined) {
    const existing = await prisma.insight.findUnique({ where: { id } });
    onChainId = existing?.onChainId;
  }

  // Step 1: Update local DB
  const local = await prisma.insight.update({
    where: { id },
    data: { upvotes: { increment: 1 } },
  });

  // Step 2: Update on-chain if we have an onChainId
  if (onChainId !== undefined && onChainId !== null) {
    try {
      await (contract.methods.upvoteInsight(onChainId) as any).send({
        from: account.address,
        gas: 200000,
      });
    } catch (err) {
      console.error("Blockchain upvote failed:", err);
    }
  }

  return local;
};


export const searchByCategory = async (category: string): Promise<Insight[]> => {
    return await prisma.insight.findMany({
        where: { category: { equals: category, mode: 'insensitive' } },
        orderBy: { createdAt: 'desc' },
    });
};