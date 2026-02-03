import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import analyticsRouter from "./routes/analytics";
import authRouter from "./routes/auth";
import adminRouter from "./routes/admin";
import alertsRouter from "./routes/alerts";
import reportsRouter from "./routes/reports";

// CORS configuration
const allowedOrigins = [
  'https://elitefinder-app.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND
].filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin: true, // Permite qualquer origem (reflete a origem da requisição)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Auth routes
  app.use("/api/auth", authRouter);

  // Analytics routes
  app.use("/api/analytics", analyticsRouter);

  // Admin routes
  app.use("/api/admin", adminRouter);

  // Alerts routes
  app.use("/api/alerts", alertsRouter);

  // Reports routes
  app.use("/api/reports", reportsRouter);

  return app;
}

// Force deploy trigger
