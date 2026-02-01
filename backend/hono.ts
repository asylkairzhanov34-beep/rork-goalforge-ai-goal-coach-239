import { Hono } from "hono";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { getDbStatus } from "./db";

console.log('[Hono] ========== Server Starting ==========');

const app = new Hono();

app.use("*", cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'x-trpc-source'],
  credentials: true,
}));

app.onError((err, c) => {
  console.error('[Hono] Global error handler:', err);
  
  return c.json({
    error: {
      message: err instanceof Error ? err.message : 'Internal Server Error',
      code: 'INTERNAL_SERVER_ERROR',
    },
  }, 500);
});

app.get("/", (c) => {
  console.log('[Hono] Root endpoint hit');
  return c.json({
    status: "ok",
    message: "API is running",
    version: "2.0",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (c) => {
  console.log('[Hono] Health check');
  const dbStatus = getDbStatus();
  
  return c.json({
    status: "ok",
    message: "API is healthy",
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/debug", (c) => {
  console.log('[Hono] Debug endpoint');
  return c.json({
    status: "ok",
    trpc: "ready",
    routes: ["auth.health", "auth.loginWithApple", "auth.getUser", "auth.deleteAccount"],
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/ping", (c) => {
  return c.json({ pong: true, ts: Date.now() });
});

app.all("/api/trpc/*", async (c) => {
  const startTime = Date.now();
  console.log('[Hono] tRPC request:', c.req.method, c.req.path);

  try {
    const response = await fetchRequestHandler({
      endpoint: "/api/trpc",
      req: c.req.raw,
      router: appRouter,
      createContext,
      onError: ({ error, path }) => {
        console.error(`[tRPC] Error on ${path}:`, error.message);
      },
    });

    const duration = Date.now() - startTime;
    console.log(`[Hono] tRPC completed in ${duration}ms`);
    
    return response;
  } catch (error) {
    console.error('[Hono] tRPC handler error:', error);
    
    return c.json({
      error: {
        message: error instanceof Error ? error.message : 'tRPC error',
        json: {
          message: error instanceof Error ? error.message : 'tRPC error',
          code: -32603,
          data: {
            code: 'INTERNAL_SERVER_ERROR',
            httpStatus: 500,
          },
        },
      },
    }, 500);
  }
});

app.all("/api/trpc", (c) => {
  console.log('[Hono] tRPC root without procedure');
  return c.json({
    error: {
      message: 'Missing procedure path',
      code: 'BAD_REQUEST',
    },
  }, 400);
});

app.all("*", (c) => {
  console.log('[Hono] 404:', c.req.method, c.req.path);
  
  return c.json({
    error: {
      message: `Not found: ${c.req.path}`,
      code: 'NOT_FOUND',
      availableRoutes: [
        'GET /',
        'GET /health',
        'GET /api/debug',
        'GET /api/ping',
        'ALL /api/trpc/*',
      ],
    },
  }, 404);
});

console.log('[Hono] ========== Server Ready ==========');

export default app;
