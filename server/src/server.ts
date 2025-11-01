// api/index.ts  (for Vercel)
import express from "express";
import cors from "cors";
import insightRoutes from "../src/routes/insights"; // Adjust if needed

const app = express();

// ✅ Fixed: added commas + normalized domains (no trailing /)
const frontend = [
  "https://creditchain.vercel.app"
];

// Dynamic CORS setup
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      // Check if the incoming origin is in the allowed list
      if (frontend.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// JSON parser
app.use(express.json());

// Optional logger
app.use((req, _, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Mount routes
app.use("/api/insights", insightRoutes);

// Health check
app.get("/", (_, res) => {
  res.json({ message: "Welcome to CreditChain API!" });
});

// 404
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found", path: req.originalUrl });
});

// Error handler
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Server error:", err);
    res.status(err.status || 500).json({
      error: err.message || "Internal Server Error",
    });
  }
);


// ✅ Instead: export the app for Vercel
export default app;
