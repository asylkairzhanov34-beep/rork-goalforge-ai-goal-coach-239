import React from 'react';
import { ManifestationSession } from '@/components/ManifestationSession';
import { safeGoBack } from '@/utils/safe-navigation';

export default function ManifestationScreen() {
  const handleComplete = () => {
    safeGoBack('/(tabs)/home');
  };

  return <ManifestationSession onComplete={handleComplete} />;
}