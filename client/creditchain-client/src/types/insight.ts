// types/insight.ts
export interface Insight {
  id: string;
  tip: string;
  body: string | null;        // ← Prisma allows null
  category: string;
  hashedId: string;
  createdAt: Date;
  upvotes: number;
  onChainIndex: number | null; // ← MATCH PRISMA
  synced: boolean;
}