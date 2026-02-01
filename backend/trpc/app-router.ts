import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import { authRouter } from "./routes/auth";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  auth: authRouter,
});

export type AppRouter = typeof appRouter;
