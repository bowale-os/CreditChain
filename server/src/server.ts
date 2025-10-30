// server.ts (or index.ts)
import express from "express";
import cors from "cors";
import insightRoutes from "../src/routes/insights"; // your router

const app = express();

// Dynamic CORS for production + dev
const allowedOrigins = [
  "https://creditchain.vercel.app/", 
  "creditchain-daniel-sobowales-projects.vercel.app/"
  "creditchain-danielsobowale67-2990-daniel-sobowales-projects.vercel.app/"
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// 1. CORS – allow your Next.js app
app.use(
  cors({
    origin: "http://localhost:5173", // Next.js dev server
    credentials: true,               // if you ever use cookies
  })
);

// 2. Parse JSON bodies
app.use(express.json());

// 3. Log every request (optional but super helpful)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 4. Mount your insights router
app.use("/api/insights", insightRoutes);

// 5. Health check
app.get("/", (req, res) => {
  res.json({ message: "Welcome to CreditChain API!" });
});

// 6. 404 handler (helps debug wrong URLs)
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found", path: req.originalUrl });
});

// 7. Global error handler
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

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`CORS enabled for: http://localhost:5173`);
});
