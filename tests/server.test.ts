import { describe, it, expect } from "vitest";
import { authMiddleware } from "../src/server/middleware/auth.js";

describe("Server Auth Middleware", () => {
    it("should pass health endpoint without authentication", () => {
        let nextCalled = false;
        const req: any = { path: "/health", headers: {} };
        const res: any = {};
        const next = () => { nextCalled = true; };

        authMiddleware(req, res, next);
        expect(nextCalled).toBe(true);
    });

    it("should allow request in development if no API_SECRET set", () => {
        const originalSecret = process.env.API_SECRET;
        const originalNodeEnv = process.env.NODE_ENV;
        delete process.env.API_SECRET;
        delete process.env.JWT_SECRET;
        process.env.NODE_ENV = "development";

        let nextCalled = false;
        const req: any = { path: "/api/agents", headers: {} };
        const res: any = {};
        const next = () => { nextCalled = true; };

        authMiddleware(req, res, next);
        expect(nextCalled).toBe(true);

        process.env.API_SECRET = originalSecret;
        process.env.NODE_ENV = originalNodeEnv;
    });
});
