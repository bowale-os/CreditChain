import { Router } from "express";
import { fetchInsights, createInsight, upvote, searchInsights } from "../controllers/insightsController";

const router = Router();

router.get("/", fetchInsights);           // GET /api/insight
router.post("/", createInsight);          // POST /api/insight
router.post("/:id/upvote", upvote);   // (prisma id)  POST /api/insight/:index/upvote
router.get('/:category', searchInsights);  //search insights by category

export default router;
