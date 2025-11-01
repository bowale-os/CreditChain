// src/services/insightServices.ts
import { PrismaClient, Insight } from '@prisma/client';
import { contract, account } from '../web3';

const prisma = new PrismaClient();


/* -------------------------------------------------
   1. getInsights – fetch from Postgres
------------------------------------------------- */
export const getInsights = async (): Promise<Insight[]> => {
  console.log('getInsights() – fetching all insights');
  try {
    const insights = await prisma.insight.findMany({
      orderBy: { createdAt: 'desc' },
    });
    console.log(`getInsights() – SUCCESS – ${insights.length} rows`);
    return insights;
  } catch (err: any) {
    console.error('getInsights() – FAILED:', err.message);
    throw err;
  }
};

/* -------------------------------------------------
   2. addInsight – DB → blockchain
------------------------------------------------- */
export const addInsight = async (
  tip: string,
  body: string | undefined,
  category: string,
  hashedId: string
): Promise<Insight> => {

  const safeBody = body?.trim() || '';  // ← removes undefined + extra spaces

  console.log('addInsight() – START');
  console.log('   payload →', { tip, body, category, hashedId });

  // ---- DB SAVE ----
  let localInsight: Insight;
  try {
    localInsight = await prisma.insight.create({
      data: {
        tip,
        body: safeBody,
        category,
        hashedId,
        createdAt: new Date(),
        upvotes: 0,
        synced: false,
      },
    });
    console.log('addInsight() – DB SAVE OK → id:', localInsight.id);
  } catch (err: any) {
    console.error('addInsight() – DB SAVE FAILED:', err.message);
    throw err;
  }

  // ---- BLOCKCHAIN SYNC ----
  try {
    console.log('addInsight() – CALLING contract.addInsight()');
    console.log('   from:', account.address);
    console.log('   contract:', contract.options.address);

    const tx = await (contract.methods.addInsight(
      tip,
      body ?? '',
      category,
      hashedId
    ) as any).send({
      from: account.address,
      gas: 500_000,
      gasPrice: '20', // gwei (string)
    });

    console.log('addInsight() – TX SUCCESS → hash:', tx.transactionHash);

    // ---- EVENT PARSING ----
    const event = tx?.events?.InsightAdded;
    if (!event) {
      console.warn('addInsight() – NO InsightAdded EVENT');
      return localInsight;
    }

    const onChainIndex = Number(event.returnValues.id);
    console.log('addInsight() – EVENT → onChainIndex:', onChainIndex);

    // ---- MARK SYNCED ----
    const updated = await prisma.insight.update({
      where: { id: localInsight.id },
      data: { synced: true, onChainIndex },
    });
    console.log('addInsight() – SYNC COMPLETE → id:', updated.id);
    return updated;
  } catch (err: any) {
    console.error('addInsight() – BLOCKCHAIN FAILED');
    console.error('   message:', err.message);
    console.error('   code:', err.code);
    console.error('   reason:', err.reason ?? 'N/A');
    console.error('   data:', err.data ?? 'N/A');
    // fallback – return local copy
    return localInsight;
  }
};

/* -------------------------------------------------
   3. upvoteInsight – DB + blockchain
------------------------------------------------- */
export const upvoteInsight = async (
  id: string,
  onChainIndex?: number | null
): Promise<Insight> => {
  console.log('upvoteInsight() – START → local id:', id);

  // ---- resolve on‑chain index if missing ----
  if (onChainIndex === null) {
    const rec = await prisma.insight.findUnique({ where: { id } });
    onChainIndex = rec?.onChainIndex ?? null;
    console.log('upvoteInsight() – resolved onChainIndex:', onChainIndex);
  }

  // ---- DB upvote ----
  let local: Insight;
  try {
    local = await prisma.insight.update({
      where: { id },
      data: { upvotes: { increment: 1 } },
    });
    console.log('upvoteInsight() – DB UPVOTE OK → upvotes:', local.upvotes);
  } catch (err: any) {
    console.error('upvoteInsight() – DB UPVOTE FAILED:', err.message);
    throw err;
  }

  // ---- BLOCKCHAIN upvote (if we have index) ----
  if (onChainIndex !== null && onChainIndex !== undefined) {
    try {
      console.log('upvoteInsight() – CALLING contract.upvoteInsight(', onChainIndex, ')');
      await (contract.methods.upvoteInsight(onChainIndex) as any).send({
        from: account.address,
        gas: 200_000,
      });
      console.log('upvoteInsight() – BLOCKCHAIN UPVOTE SUCCESS');
    } catch (err: any) {
      console.error('upvoteInsight() – BLOCKCHAIN UPVOTE FAILED:', err.message);
    }
  } else {
    console.warn('upvoteInsight() – NO onChainIndex → skipping blockchain call');
  }

  return local;
};

/* -------------------------------------------------
   4. searchByCategory
------------------------------------------------- */
export const searchByCategory = async (category: string): Promise<Insight[]> => {
  console.log('searchByCategory() – category:', category);
  try {
    const results = await prisma.insight.findMany({
      where: { category: { equals: category, mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
    });
    console.log(`searchByCategory() – SUCCESS – ${results.length} rows`);
    return results;
  } catch (err: any) {
    console.error('searchByCategory() – FAILED:', err.message);
    throw err;
  }
};