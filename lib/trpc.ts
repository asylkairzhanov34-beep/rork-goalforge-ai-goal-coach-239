import { createTRPCReact } from "@trpc/react-query";
import { createTRPCClient, httpLink, TRPCClientError } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

console.log('[tRPC] Module initializing...');

export const trpc = createTRPCReact<AppRouter>();

function getBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  
  console.log('[tRPC] EXPO_PUBLIC_RORK_API_BASE_URL:', url ? 'SET' : 'NOT SET');
  
  if (!url) {
    console.error('[tRPC] CRITICAL: No backend URL configured!');
    console.error('[tRPC] Please enable backend in Rork project settings');
    return '';
  }
  
  const cleanUrl = url.replace(/\/$/, '');
  console.log('[tRPC] Base URL:', cleanUrl);
  return cleanUrl;
}

function createLink(url: string) {
  console.log('[tRPC] Creating HTTP link:', url);
  
  return httpLink({
    url,
    transformer: superjson,
    headers() {
      return {
        'Content-Type': 'application/json',
        'x-trpc-source': 'expo-app',
      };
    },
    fetch: async (input, init) => {
      const requestUrl = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);
      console.log('[tRPC] Fetching:', requestUrl);
      
      try {
        const response = await fetch(input, {
          ...init,
          headers: {
            ...init?.headers,
            'Content-Type': 'application/json',
          },
        });
        
        console.log('[tRPC] Response status:', response.status);
        console.log('[tRPC] Response content-type:', response.headers.get('content-type'));
        
        if (!response.ok) {
          const text = await response.text();
          console.error('[tRPC] Error response:', text.substring(0, 200));
          throw new Error(`HTTP ${response.status}: ${text.substring(0, 100)}`);
        }
        
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const text = await response.text();
          console.error('[tRPC] Non-JSON response:', text.substring(0, 200));
          throw new Error(`Invalid content-type: ${contentType}`);
        }
        
        return response;
      } catch (error) {
        console.error('[tRPC] Fetch error:', error);
        throw error;
      }
    },
  });
}

const baseUrl = getBaseUrl();
const trpcUrl = baseUrl ? `${baseUrl}/api/trpc` : '/api/trpc';

console.log('[tRPC] Full URL:', trpcUrl);

export const trpcReactClient = trpc.createClient({
  links: [createLink(trpcUrl)],
});

export const trpcClient = createTRPCClient<AppRouter>({
  links: [createLink(trpcUrl)],
});

export function isTRPCError(error: unknown): error is TRPCClientError<AppRouter> {
  return error instanceof TRPCClientError;
}

export function getTRPCErrorMessage(error: unknown): string {
  if (isTRPCError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Неизвестная ошибка';
}

console.log('[tRPC] Module initialized');
