import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";

console.log('[tRPC Context] Module loaded');

export const createContext = async (opts: FetchCreateContextFnOptions) => {
  console.log('[tRPC Context] Creating context for request');
  
  const authHeader = opts.req.headers.get('authorization');
  let user: { id: string } | null = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token.startsWith('session_')) {
      const userId = token.replace('session_', '');
      user = { id: userId };
      console.log('[tRPC Context] User authenticated:', userId);
    }
  }
  
  return {
    req: opts.req,
    user,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    console.error('[tRPC] Error:', error.message);
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

const isAuthed = t.middleware(({ ctx, next }) => {
  console.log('[tRPC] Protected procedure - user:', ctx.user?.id || 'none');
  return next({
    ctx: {
      user: ctx.user || { id: 'anonymous' },
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);

console.log('[tRPC Context] Procedures exported');
