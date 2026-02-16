import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, Component, ReactNode, useState, memo, useCallback, useRef } from "react";
import { StyleSheet, Text, View, LogBox, InteractionManager, TouchableOpacity } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { disableLogsInProduction } from '@/utils/performance';
import { GoalProvider } from '@/hooks/use-goal-store';
import { AuthProvider } from '@/hooks/use-auth-store';
import { TimerProvider } from '@/hooks/use-timer-store';
import { ChatProvider } from '@/hooks/use-chat-store';
import { ManifestationProvider } from '@/hooks/use-manifestation-store';
import { FirstTimeSetupProvider } from '@/hooks/use-first-time-setup';
import { SubscriptionProvider, useSubscription } from '@/hooks/use-subscription-store';
import { ChallengeProvider } from '@/hooks/use-challenge-store';
import { JournalProvider } from '@/hooks/use-journal-store';
import { FocusShieldProvider } from '@/hooks/use-focus-shield-store';
import { ProgressProvider } from '@/hooks/use-progress';
import { trpc, trpcReactClient } from '@/lib/trpc';
import { StreakCelebrationProvider, useStreakCelebration } from '@/hooks/use-streak-celebration';
import { RewardUnlockProvider, useRewardUnlock } from '@/hooks/use-reward-unlock';
import { RewardUnlockModal } from '@/components/RewardUnlockModal';
import { useAppBackgroundInit } from '@/hooks/use-app-background-init';
import { VideoSplashScreen } from '@/components/VideoSplashScreen';
import TrialExpiredModal from '@/components/TrialExpiredModal';
import { GlobalNotificationsGate } from '@/components/GlobalNotificationsGate';
import { useSmartNotifications } from '@/hooks/use-smart-notifications';

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error.message);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.title}>Something went wrong</Text>
          <Text style={errorStyles.message}>
            Please restart the application
          </Text>
          <TouchableOpacity
            style={errorStyles.retryButton}
            onPress={() => this.setState({ hasError: false, error: undefined })}
          >
            <Text style={errorStyles.retryText}>Try Again</Text>
          </TouchableOpacity>
          <Text style={errorStyles.errorDetail}>
            {this.state.error.message}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

disableLogsInProduction();

SplashScreen.preventAutoHideAsync().catch(err => {
  console.error('Failed to prevent auto hide splash:', err);
});

LogBox.ignoreLogs([
  'source.uri should not be an empty string',
  'Require cycle',
  'new NativeEventEmitter',
  'ViewPropTypes',
]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: 'always',
      refetchOnReconnect: false,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
});

export { queryClient };

const LazyFloatingStreak = React.lazy(() => 
  import('@/components/FloatingDynamicIslandStreak').then(m => ({ default: m.FloatingDynamicIslandStreak }))
);

function StreakCelebrationOverlay() {
  const { isVisible, hideCelebration } = useStreakCelebration();
  if (!isVisible) return null;
  return (
    <React.Suspense fallback={null}>
      <LazyFloatingStreak visible={isVisible} onDismiss={hideCelebration} />
    </React.Suspense>
  );
}

function RewardUnlockOverlay() {
  const { modalVisible, pendingReward, closeModal } = useRewardUnlock();
  if (!modalVisible) return null;
  return <RewardUnlockModal visible={modalVisible} reward={pendingReward} onClose={closeModal} />;
}

function TrialGate() {
  const { isTrialExpired, isPremium, isInitialized, status, refreshStatus, premiumEverConfirmed, restorePurchases: restore } = useSubscription();
  const router = useRouter();
  const [showDelayed, setShowDelayed] = useState(false);
  const checkCountRef = useRef(0);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (isPremium || premiumEverConfirmed || status === 'premium') {
      setShowDelayed(false);
      hasCheckedRef.current = false;
      checkCountRef.current = 0;
      return;
    }

    if (isInitialized && isTrialExpired && !hasCheckedRef.current) {
      hasCheckedRef.current = true;
      checkCountRef.current += 1;
      console.log('[TrialGate] Trial appears expired, doing verification #' + checkCountRef.current);
      refreshStatus().then(() => {
        setTimeout(() => {
          refreshStatus().then(() => {
            setTimeout(() => {
              setShowDelayed(true);
            }, 2000);
          }).catch(() => {
            setTimeout(() => setShowDelayed(true), 2000);
          });
        }, 2000);
      }).catch(() => {
        setTimeout(() => setShowDelayed(true), 3000);
      });
    }
  }, [isInitialized, isTrialExpired, isPremium, status, refreshStatus, premiumEverConfirmed]);

  const handleGetPremium = useCallback(() => {
    router.push('/subscription' as any);
  }, [router]);

  const handleRestore = useCallback(async (): Promise<boolean> => {
    try {
      const success = await restore();
      if (success) {
        setShowDelayed(false);
        hasCheckedRef.current = false;
      }
      return success;
    } catch {
      return false;
    }
  }, [restore]);

  if (!isInitialized || isPremium || premiumEverConfirmed || status === 'loading' || status === 'premium') return null;
  if (!isTrialExpired || !showDelayed) return null;

  return (
    <TrialExpiredModal
      visible={true}
      onGetPremium={handleGetPremium}
      onRestore={handleRestore}
      testID="trial-expired-modal"
    />
  );
}

function DeferredNotificationsGate() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 2000);
    return () => clearTimeout(timer);
  }, []);
  if (!ready) return null;
  return <GlobalNotificationsGate />;
}

function SmartNotificationsInit() {
  useSmartNotifications();
  return null;
}

function RootLayoutNav() {
  useAppBackgroundInit();

  return (
    <Stack 
      screenOptions={{ 
        headerBackTitle: "Back",
        animation: 'fade',
        animationDuration: 200,
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: false,
          animation: 'none'
        }} 
      />
      <Stack.Screen 
        name="(tabs)" 
        options={{ 
          headerShown: false,
          animation: 'fade'
        }} 
      />
      <Stack.Screen 
        name="onboarding" 
        options={{ 
          headerShown: false, 
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom'
        }} 
      />
      <Stack.Screen 
        name="goal-creation" 
        options={{ 
          headerShown: false, 
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom'
        }} 
      />
      <Stack.Screen 
        name="auth" 
        options={{ 
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'fade'
        }} 
      />
      <Stack.Screen 
        name="chat" 
        options={{ 
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom'
        }} 
      />
      <Stack.Screen 
        name="breathing" 
        options={{ 
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }} 
      />
      <Stack.Screen 
        name="breathing/[id]" 
        options={{ 
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }} 
      />
      <Stack.Screen 
        name="manifestation" 
        options={{ 
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }} 
      />
      <Stack.Screen 
        name="notifications" 
        options={{ 
          headerShown: true,
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }} 
      />
      <Stack.Screen 
        name="month-overview" 
        options={{ 
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }} 
      />
      <Stack.Screen 
        name="first-time-setup" 
        options={{ 
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'fade'
        }} 
      />
      <Stack.Screen 
        name="subscription" 
        options={{ 
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }} 
      />
      <Stack.Screen 
        name="subscription-success" 
        options={{ 
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'fade'
        }} 
      />
      <Stack.Screen 
        name="dev-subscription-tools" 
        options={{ 
          headerShown: true,
          title: 'Developer Tools',
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }} 
      />

      <Stack.Screen 
        name="settings" 
        options={{ 
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }} 
      />
      <Stack.Screen 
        name="challenge-detail" 
        options={{ 
          headerShown: false,
          presentation: 'card',
          animation: 'slide_from_right'
        }} 
      />
      <Stack.Screen 
        name="challenge-customize" 
        options={{ 
          headerShown: false,
          presentation: 'card',
          animation: 'slide_from_right'
        }} 
      />
      <Stack.Screen 
        name="challenge-active" 
        options={{ 
          headerShown: false,
          presentation: 'card',
          animation: 'slide_from_right'
        }} 
      />
      <Stack.Screen 
        name="video-intro" 
        options={{ 
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'fade'
        }} 
      />
      <Stack.Screen 
        name="video-intro-2" 
        options={{ 
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'fade'
        }} 
      />
      <Stack.Screen 
        name="welcome-onboarding" 
        options={{ 
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'fade'
        }} 
      />
      <Stack.Screen 
        name="reflection" 
        options={{ 
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }} 
      />
      <Stack.Screen 
        name="meditation-feed" 
        options={{ 
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'fade'
        }} 
      />
    </Stack>
  );
}

const MemoizedRootLayoutNav = memo(RootLayoutNav);

function DeferredProviders({ children }: { children: ReactNode }) {
  const [tier2Ready, setTier2Ready] = useState(false);

  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      setTier2Ready(true);
    });
    return () => handle.cancel();
  }, []);

  if (!tier2Ready) {
    return (
      <ChatProvider>
        <ManifestationProvider>
          <JournalProvider>
            <FocusShieldProvider>
              <RewardUnlockProvider>
                {children}
              </RewardUnlockProvider>
            </FocusShieldProvider>
          </JournalProvider>
        </ManifestationProvider>
      </ChatProvider>
    );
  }

  return (
    <ChatProvider>
      <ManifestationProvider>
        <JournalProvider>
          <FocusShieldProvider>
            <StreakCelebrationProvider>
              <RewardUnlockProvider>
                {children}
                <StreakCelebrationOverlay />
                <RewardUnlockOverlay />
              </RewardUnlockProvider>
            </StreakCelebrationProvider>
          </FocusShieldProvider>
        </JournalProvider>
      </ManifestationProvider>
    </ChatProvider>
  );
}

export default function RootLayout() {
  const [showVideoSplash, setShowVideoSplash] = useState(true);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const handleSplashFinish = useCallback(() => {
    setShowVideoSplash(false);
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.container}>
        {showVideoSplash && (
          <VideoSplashScreen onFinish={handleSplashFinish} />
        )}
        <QueryClientProvider client={queryClient}>
          <trpc.Provider client={trpcReactClient} queryClient={queryClient}>
            <SubscriptionProvider>
              <TrialGate />
              <DeferredNotificationsGate />
              <AuthProvider>
                <FirstTimeSetupProvider>
                  <GoalProvider>
                    <ChallengeProvider>
                      <TimerProvider>
                        <ProgressProvider>
                          <DeferredProviders>
                            <SmartNotificationsInit />
                            <MemoizedRootLayoutNav />
                          </DeferredProviders>
                        </ProgressProvider>
                      </TimerProvider>
                    </ChallengeProvider>
                  </GoalProvider>
                </FirstTimeSetupProvider>
              </AuthProvider>
            </SubscriptionProvider>
          </trpc.Provider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    color: '#000',
  },
  message: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginBottom: 20,
  },
  errorDetail: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#000',
  },
});