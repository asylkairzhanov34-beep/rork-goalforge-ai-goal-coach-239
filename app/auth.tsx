import React, { useCallback } from 'react';
import { router } from 'expo-router';
import AuthScreen from '@/screens/AuthScreen';

export default function Auth() {
  const handleAuthSuccess = useCallback(() => {
    console.log('[AuthRoute] Auth success -> go through / to apply post-auth gates');
    router.replace('/');
  }, []);

  return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
}
