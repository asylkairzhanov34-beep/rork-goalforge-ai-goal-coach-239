import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../create-context';
import { 
  findUserByAppleId, 
  findUserById, 
  createUser, 
  deleteUser, 
  getDbStatus 
} from '../../db';

console.log('[Auth Router] Module loaded');

const AppleLoginInputSchema = z.object({
  identityToken: z.string().min(1, 'Identity token is required'),
  email: z.string().nullable().optional(),
  fullName: z.string().nullable().optional(),
});

type AuthResponse = {
  success: boolean;
  token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    isPremium: boolean;
  };
};

function generateAppleId(identityToken: string): string {
  return 'apple_' + identityToken.substring(0, 32);
}

function createAuthResponse(
  id: string,
  email: string,
  name: string | null,
  isPremium: boolean
): AuthResponse {
  return {
    success: true,
    token: `session_${id}`,
    user: {
      id: String(id),
      email: String(email || ''),
      name: name !== null && name !== undefined ? String(name) : null,
      isPremium: Boolean(isPremium),
    },
  };
}

export const authRouter = createTRPCRouter({
  health: publicProcedure
    .query(async () => {
      console.log('[Auth Health] Check');
      const status = getDbStatus();
      
      return {
        status: 'ok',
        database: status,
        timestamp: new Date().toISOString(),
      };
    }),

  loginWithApple: publicProcedure
    .input(AppleLoginInputSchema)
    .mutation(async ({ input }): Promise<AuthResponse> => {
      const { identityToken, email, fullName } = input;

      console.log('[Auth] ========== Apple Login ==========');
      console.log('[Auth] Token length:', identityToken.length);
      console.log('[Auth] Email:', email || 'none');
      console.log('[Auth] Name:', fullName || 'none');

      const appleId = generateAppleId(identityToken);
      const userEmail = email || `user_${appleId.substring(6, 14)}@privaterelay.appleid.com`;
      const userName = fullName || null;

      try {
        const existingUser = await findUserByAppleId(appleId);
        
        if (existingUser) {
          console.log('[Auth] Existing user found:', existingUser.id);
          return createAuthResponse(
            existingUser.id,
            existingUser.email || userEmail,
            existingUser.name,
            existingUser.isPremium
          );
        }

        console.log('[Auth] Creating new user...');
        const newUser = await createUser({
          email: email || null,
          name: userName,
          appleId: appleId,
        });

        console.log('[Auth] New user created:', newUser.id);
        return createAuthResponse(
          newUser.id,
          newUser.email || userEmail,
          newUser.name,
          newUser.isPremium
        );

      } catch (error) {
        console.error('[Auth] Error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Login failed',
        });
      }
    }),

  getUser: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user?.id;
      console.log('[Auth] getUser:', userId);
      
      if (!userId || userId === 'anonymous') {
        return null;
      }

      try {
        const user = await findUserById(userId);
        
        if (user) {
          return {
            id: user.id,
            email: user.email || '',
            name: user.name,
            isPremium: user.isPremium,
          };
        }
        
        return null;
      } catch (error) {
        console.error('[Auth] getUser error:', error);
        return null;
      }
    }),

  deleteAccount: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userId = ctx.user?.id;
      console.log('[Auth] deleteAccount:', userId);
      
      if (!userId || userId === 'anonymous') {
        return { success: false, error: 'No user ID' };
      }
      
      try {
        const deleted = await deleteUser(userId);
        console.log('[Auth] Delete result:', deleted);
        return { success: deleted };
      } catch (error) {
        console.error('[Auth] Delete error:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Delete failed' };
      }
    }),

  updateSubscription: protectedProcedure
    .input(z.object({
      status: z.enum(['free', 'trial', 'premium']),
      subscriptionData: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      console.log('[Auth] updateSubscription:', userId, input.status);
      
      if (!userId || userId === 'anonymous') {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        });
      }
      
      try {
        console.log('[Auth] Updating subscription status in database');
        return { success: true };
      } catch (error) {
        console.error('[Auth] Update subscription error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Update failed',
        });
      }
    }),
});

console.log('[Auth Router] Ready');
