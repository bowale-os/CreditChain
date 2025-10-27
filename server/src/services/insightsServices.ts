// src/services/insightServices.ts
import { contract, account } from "../web3";

export interface Insight {
  tip: string;
  category: string;
  hashedId: string;
  timestamp: number;
  upvotes: number;
}

export const getInsights = async (): Promise<Insight[]> => {
  return await (contract.methods.getInsights as any)().call();
};

export const addInsight = async (tip: string, category: string, hashedId: string) => {
  return await (contract.methods.addInsight(tip, category, hashedId) as any).send({
    from: account.address,
    gas: 300000,
  });
};

export const upvoteInsight = async (index: number) => {
  return await (contract.methods.upvoteInsight(index) as any).send({
    from: account.address,
    gas: 200000,
  });
};
