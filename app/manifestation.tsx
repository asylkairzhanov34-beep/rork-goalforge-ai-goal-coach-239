import React from 'react';
import { ManifestationSession } from '@/components/ManifestationSession';
import { router } from 'expo-router';

export default function ManifestationScreen() {
  const handleComplete = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/home');
    }
  };

  return <ManifestationSession onComplete={handleComplete} />;
}