import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, Component, ReactNode, useState } from "react";
import { StyleSheet, Text, View, LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { clearCorruptedStorage } from '@/utils/storage-helper';
import { GoalProvider } from '@/hooks/use-goal-store';
import { AuthProvider } from '@/hooks/use-auth-store';
import { TimerProvider } from '@/hooks/use-timer-store';
import { ChatProvider } from '@/hooks/use-chat-store';
import { ManifestationProvider } from '@/hooks/use-manifestation-store';
import { FirstTimeSetupProvider } from '@/hooks/use-first-time-setup';
import { SubscriptionProvider } from '@/hooks/use-subscription-store';
import { ChallengeProvider } from '@/hooks/use-challenge-store';
import { JournalProvider } from '@/hooks/use-journal-store';
import { FocusShieldProvider } from '@/hooks/use-focus-shield-store';
import { trpc, trpcReactClient } from '@/lib/trpc';

import { GlobalNotificationsGate } from '@/components/GlobalNotificationsGate';
import { DynamicIslandTimer } from '@/components/DynamicIslandTimer';
import { FloatingDynamicIslandStreak } from '@/components/FloatingDynamicIslandStreak';
import { StreakCelebrationProvider, useStreakCelebration } from '@/hooks/use-streak-celebration';
import { useAppBackgroundInit } from '@/hooks/use-app-background-init';
import { VideoSplashScreen } from '@/components/VideoSplashScreen';

// Error Boundary to catch inspector and other development errors
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error info:', errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.title}>Что-то пошло не так</Text>
          <Text style={errorStyles.message}>
            Перезапустите приложение
          </Text>
          <Text style={errorStyles.errorDetail}>
            {this.state.error.message}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

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
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

function StreakCelebrationOverlay() {
  const { isVisible, hideCelebration } = useStreakCelebration();
  return <FloatingDynamicIslandStreak visible={isVisible} onDismiss={hideCelebration} />;
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
        name="timer-fullscreen" 
        options={{ 
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'fade'
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

export default function RootLayout() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [showVideoSplash, setShowVideoSplash] = useState(true);



  useEffect(() => {
    const prepareApp = async () => {
      try {
        console.log('[RootLayout] Starting hydration');
        await clearCorruptedStorage();
        console.log('[RootLayout] Storage check complete');
      } catch (error) {
        console.error('[RootLayout] Preparation error:', error);
      } finally {
        requestAnimationFrame(() => {
          setIsHydrated(true);
          SplashScreen.hideAsync().catch(err => {
            console.error('[RootLayout] Failed to hide splash:', err);
          });
        });
      }
    };

    prepareApp();
  }, []);

  if (!isHydrated) {
    return null;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.container}>
        {showVideoSplash && (
          <VideoSplashScreen onFinish={() => setShowVideoSplash(false)} />
        )}
        <trpc.Provider client={trpcReactClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <SubscriptionProvider>
              {/* <GlobalSubscriptionGate /> */}
              <GlobalNotificationsGate />
              <AuthProvider>
                <FirstTimeSetupProvider>
                  <GoalProvider>
                    <ChallengeProvider>
                      <TimerProvider>
                        <ChatProvider>
                          <ManifestationProvider>
                              <JournalProvider>
                                <FocusShieldProvider>
                                  <StreakCelebrationProvider>
                                    <RootLayoutNav />
                                    <DynamicIslandTimer />
                                    <StreakCelebrationOverlay />
                                  </StreakCelebrationProvider>
                                </FocusShieldProvider>
                              </JournalProvider>
                            </ManifestationProvider>
                        </ChatProvider>
                      </TimerProvider>
                    </ChallengeProvider>
                  </GoalProvider>
                </FirstTimeSetupProvider>
              </AuthProvider>
            </SubscriptionProvider>
          </QueryClientProvider>
        </trpc.Provider>
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
});