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
    const { tip, body, category, hashedId } = req.body;
    if (!tip || !body || !category || !hashedId) {
      return res.status(400).json({ error: "tip, body, category, and hashedId are required" });
    }

    // Add insight to DB and attempt blockchain sync
    const insight = await addInsight(tip, body, category, hashedId);

    res.status(201).json({
      message: "Insight added",
      insight,  // return DB record with optional onChainId & synced
    });
  } catch (err) {
    console.error("Error adding insight:", err);
    res.status(500).json({ error: "Failed to add insight" });
  }
};

// POST /api/insight/:id/upvote
export const upvote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Insight ID required" });

    // Find the DB record to get the onChainId if available
    const insight = await upvoteInsight(id); // pass onChainId if you store it

    res.json({ message: "Insight upvoted", insight });
  } catch (err) {
    console.error("Error upvoting insight:", err);
    res.status(500).json({ error: "Failed to upvote insight" });
  }
};
