import { router } from 'expo-router';

export function safeGoBack(fallbackRoute: string = '/(tabs)/home') {
  try {
    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
      return;
    }
  } catch {
    console.log('[safeGoBack] canGoBack not supported, using fallback');
  }
  router.replace(fallbackRoute as any);
}
