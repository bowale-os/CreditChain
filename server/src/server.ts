import express from "express";
import insightRoutes from "../src/routes/insights"; // import the router

const app = express();

// Middleware to parse JSON
app.use(express.json());

// Mount the router at /api/insight
app.use("/api/insight", insightRoutes);

// Root route (optional)
app.get("/", (req, res) => res.send("Welcome to CreditChain API!"));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
