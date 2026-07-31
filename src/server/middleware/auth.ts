import { Request, Response, NextFunction } from "express";

/**
 * Enterprise Authentication Middleware
 * Validates Bearer token or x-api-key against system environment settings.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    // Skip auth check for public health endpoint
    if (req.path === "/health" || req.path === "/") {
        return next();
    }

    const expectedSecret = process.env.API_SECRET || process.env.JWT_SECRET;
    
    // If no secret is configured in environment, allow requests in local dev mode but issue warning
    if (!expectedSecret) {
        if (process.env.NODE_ENV === "production") {
            return res.status(500).json({
                error: "Security Configuration Error",
                message: "API_SECRET environment variable is required in production mode."
            });
        }
        return next();
    }

    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers["x-api-key"];

    let token = "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7).trim();
    } else if (typeof apiKeyHeader === "string") {
        token = apiKeyHeader.trim();
    }

    if (!token || token !== expectedSecret) {
        return res.status(401).json({
            error: "Unauthorized",
            message: "Invalid or missing API authentication credentials."
        });
    }

    next();
}
