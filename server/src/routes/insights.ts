import { Router } from "express";
import { fetchInsights, createInsight, upvote } from "../controllers/insightsController";

const router = Router();

router.get("/", fetchInsights);           // GET /api/insight
router.post("/", createInsight);          // POST /api/insight
router.post("/:index/upvote", upvote);    // POST /api/insight/:index/upvote

export default router;
