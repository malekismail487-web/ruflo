import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { authMiddleware } from "./middleware/auth.js";
import { agentsRouter } from "./routes/agents.js";

dotenv.config();

const app: Express = express();
const PORT = process.env.API_PORT || 3000;

// Standard Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request Logging Middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Health Check Endpoint (Public)
app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
        nemotronConfigured: Boolean(process.env.NVIDIA_API_KEY)
    });
});

// Apply Authentication Middleware to API Routes
app.use("/api", authMiddleware);

// Route Modules
app.use("/api/agents", agentsRouter);

// Global Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled API Error:", err.stack || err.message);
    res.status(500).json({
        error: "Internal Server Error",
        message: process.env.NODE_ENV === "development" ? err.message : undefined
    });
});

// Server Lifecycle & Graceful Shutdown
const server = app.listen(PORT, () => {
    console.log(`🚀 Standalone Enterprise API Server running on port ${PORT}`);
    console.log(`  └─ Health Check: http://localhost:${PORT}/health`);
    console.log(`  └─ Agents API:   http://localhost:${PORT}/api/agents`);
});

const gracefulShutdown = (signal: string) => {
    console.log(`\nReceived ${signal}. Closing HTTP server...`);
    server.close(() => {
        console.log("HTTP server closed cleanly. Exiting process.");
        process.exit(0);
    });

    setTimeout(() => {
        console.error("Forced termination due to hanging connections.");
        process.exit(1);
    }, 5000).unref();
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
