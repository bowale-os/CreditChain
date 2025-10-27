import { Request, Response } from "express";
import { getInsights, addInsight, upvoteInsight } from "../services/insightsServices";

// GET /api/insight
export const fetchInsights = async (req: Request, res: Response) => {
  try {
    const insights = await getInsights();
    res.json(insights);
  } catch (err) {
    console.error("Error fetching insights:", err);
    res.status(500).json({ error: "Failed to fetch insights" });
  }
};

// POST /api/insight
export const createInsight = async (req: Request, res: Response) => {
  try {
    const { tip, category, hashedId } = req.body;
    if (!tip || !category || !hashedId) {
      return res.status(400).json({ error: "tip, category, and hashedId are required" });
    }

    const tx = await addInsight(tip, category, hashedId);
    res.status(201).json({ message: "Insight added", txHash: tx.transactionHash });
  } catch (err) {
    console.error("Error adding insight:", err);
    res.status(500).json({ error: "Failed to add insight" });
  }
};

// POST /api/insight/:index/upvote
export const upvote = async (req: Request, res: Response) => {
  try {
    const { index } = req.params;
    const parsedIndex = parseInt(index, 10);
    if (isNaN(parsedIndex)) return res.status(400).json({ error: "Invalid index" });

    const tx = await upvoteInsight(parsedIndex);
    res.json({ message: "Insight upvoted", txHash: tx.transactionHash });
  } catch (err) {
    console.error("Error upvoting insight:", err);
    res.status(500).json({ error: "Failed to upvote insight" });
  }
};
