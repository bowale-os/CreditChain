// api/index.ts  (for Vercel)
import express from "express";
import cors, { CorsOptions } from 'cors';
import insightRoutes from "../src/routes/insights"; // Adjust if needed

const app = express();

// ✅ Fixed: added commas + normalized domains (no trailing /)
const allowedOrigins = [
  "https://creditchain.vercel.app"
];

// CORS configuration with proper types
const corsOptions: CorsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    // Allow requests with no origin (like Postman, mobile apps, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Dynamic CORS setup
app.use(cors(corsOptions));

// JSON parser
app.use(express.json());

// Handle preflight
app.options('*', cors(corsOptions));

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
