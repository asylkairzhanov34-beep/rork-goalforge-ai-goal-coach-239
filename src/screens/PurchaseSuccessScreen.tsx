import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Check, RefreshCw, XCircle, CreditCard } from 'lucide-react-native';
import { useSubscription } from '@/hooks/use-subscription-store';

const CONFETTI_COLORS = ['#FFD700', '#FFB300', '#FF8C00', '#FFE066', '#FFC93C', '#F9A826'];
const CONFETTI_PIECES = 12;

const formatDate = (iso?: string) => {
  if (!iso) {
    return '—';
  }
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return '—';
  }
};

export default function PurchaseSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ planName?: string; nextBillingDate?: string; trialStatus?: string }>();
  const { 
    restorePurchases, 
    isRestoring, 
    cancelSubscriptionForDev, 
    forceRefreshFromServer,
    status,
    packages,
    purchasePackage,
    isPurchasing,
  } = useSubscription();
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const heroScale = useRef(new Animated.Value(0.85)).current;
  const confetti = useRef([...Array(CONFETTI_PIECES)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const confettiAnimations = confetti.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 780,
        delay: index * 45,
        useNativeDriver: true,
      }),
    );

    Animated.parallel([
      Animated.spring(heroScale, {
        toValue: 1,
        damping: 12,
        stiffness: 200,
        useNativeDriver: true,
      }),
      Animated.stagger(45, confettiAnimations),
    ]).start();
  }, [confetti, heroScale]);

  const planName = params.planName || 'GoalForge Premium';
  const trialStatus = params.trialStatus || 'Пробный период активирован';
  const nextBilling = formatDate(params.nextBillingDate);

  const handleContinue = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.selectionAsync().catch(() => undefined);
    }
    router.replace('/(tabs)/home');
  };

  const handleRestore = async () => {
    await restorePurchases();
  };

  const handleCancelSubscription = async () => {
    if (Platform.OS === 'ios') {
      Alert.alert(
        'Cancel Sandbox Subscription',
        'To cancel a Sandbox subscription in TestFlight:\n\n' +
        '1. Go to Settings → Apple ID\n' +
        '2. Tap "Subscriptions"\n' +
        '3. Find your app and cancel\n\n' +
        'Or tap "Clear Local State" to reset the app state for testing.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Settings', 
            onPress: () => Linking.openURL('App-Prefs:root=STORE').catch(() => {
              Linking.openURL('app-settings:').catch(() => {});
            })
          },
          {
            text: 'Clear Local State',
            style: 'destructive',
            onPress: async () => {
              setIsCancelling(true);
              try {
                await cancelSubscriptionForDev();
                if (Platform.OS !== 'web') {
                  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                }
                Alert.alert('Done', 'Local subscription state cleared. Tap "Refresh Status" to sync with Apple.');
              } finally {
                setIsCancelling(false);
              }
            }
          },
        ]
      );
    } else {
      setIsCancelling(true);
      try {
        await cancelSubscriptionForDev();
        if (Platform.OS !== 'web') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
        router.replace('/subscription');
      } finally {
        setIsCancelling(false);
      }
    }
  };

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    try {
      const result = await forceRefreshFromServer();
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(
          result ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
        ).catch(() => {});
      }
      Alert.alert(
        'Status Refreshed',
        `Current status: ${status.toUpperCase()}\n\nSynced with RevenueCat server.`
      );
    } catch {
      Alert.alert('Error', 'Failed to refresh status. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTestPurchase = async () => {
    if (packages.length === 0) {
      Alert.alert('No Packages', 'No subscription packages available.');
      return;
    }

    const packageOptions = packages.map((pkg, index) => ({
      text: `${pkg.product.title} - ${pkg.product.priceString}`,
      onPress: async () => {
        console.log('[PurchaseSuccess] Testing purchase for:', pkg.identifier);
        const result = await purchasePackage(pkg.identifier);
        if (result) {
          Alert.alert('Purchase Complete', `Successfully purchased: ${result.planName}`);
        }
      }
    }));

    Alert.alert(
      'Test Purchase (Sandbox)',
      'Select a package to test the Apple purchase flow:',
      [
        { text: 'Cancel', style: 'cancel' },
        ...packageOptions
      ]
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <LinearGradient colors={['rgba(255,215,0,0.2)', 'rgba(0,0,0,0)']} style={styles.backgroundGlow} />
      <View style={styles.container}>
        <Animated.View style={[styles.heroIcon, { transform: [{ scale: heroScale }] }]} testID="purchase-success-hero">
          <Check size={40} color="#000" />
        </Animated.View>
        <View style={styles.confettiContainer} pointerEvents="none">
          {confetti.map((anim, index) => {
            const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 60 + index * 2] });
            const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['-15deg', '20deg'] });
            const opacity = anim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] });
            const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
            const offset = index * 6;
            return (
              <Animated.View
                key={`confetti-${index}`}
                style={[
                  styles.confettiPiece,
                  {
                    backgroundColor: color,
                    left: `${10 + offset}%`,
                    transform: [{ translateY }, { rotate }],
                    opacity,
                  },
                ]}
              />
            );
          })}
        </View>

        <Text style={styles.title}>Premium activated</Text>
        <Text style={styles.subtitle}>Thank you — your Premium subscription is active.</Text>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>План</Text>
            <Text style={styles.detailValue}>{planName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Пробный период</Text>
            <Text style={styles.detailValue}>{trialStatus}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Следующее списание</Text>
            <Text style={styles.detailValue}>{nextBilling}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleContinue}
          activeOpacity={0.9}
          accessibilityLabel="Продолжить"
          testID="purchase-success-continue"
        >
          <Text style={styles.primaryText}>Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={isRestoring}
          testID="purchase-success-restore"
        >
          {isRestoring ? (
            <ActivityIndicator size="small" color="#FFD700" />
          ) : (
            <Text style={styles.restoreText}>Restore purchases</Text>
          )}
        </TouchableOpacity>

        <View style={styles.devSection}>
          <Text style={styles.devSectionTitle}>🛠 Developer Tools (TestFlight)</Text>
          
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>Status: {status.toUpperCase()}</Text>
          </View>

          <TouchableOpacity
            style={styles.devButton}
            onPress={handleRefreshStatus}
            disabled={isRefreshing}
            testID="purchase-success-refresh"
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#4ECDC4" />
            ) : (
              <>
                <RefreshCw size={16} color="#4ECDC4" />
                <Text style={styles.devButtonText}>Refresh Status from Server</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.devButton}
            onPress={handleTestPurchase}
            disabled={isPurchasing}
            testID="purchase-success-test-purchase"
          >
            {isPurchasing ? (
              <ActivityIndicator size="small" color="#FFD700" />
            ) : (
              <>
                <CreditCard size={16} color="#FFD700" />
                <Text style={[styles.devButtonText, { color: '#FFD700' }]}>Test Sandbox Purchase</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.devButton, styles.cancelDevButton]}
            onPress={handleCancelSubscription}
            disabled={isCancelling}
            testID="purchase-success-cancel"
          >
            {isCancelling ? (
              <ActivityIndicator size="small" color="#FF6B6B" />
            ) : (
              <>
                <XCircle size={16} color="#FF6B6B" />
                <Text style={[styles.devButtonText, { color: '#FF6B6B' }]}>Cancel / Clear State</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.devHint}>
            Sandbox purchases use Apple test environment.{"\n"}
            The Apple purchase dialog should appear when testing.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    gap: 20,
  },
  heroIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    marginTop: 40,
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  confettiPiece: {
    position: 'absolute',
    width: 6,
    height: 16,
    borderRadius: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 20,
  },
  detailsCard: {
    width: '100%',
    borderRadius: 20,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.12)',
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    width: '100%',
    height: 58,
    borderRadius: 24,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  primaryText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  restoreButton: {
    paddingVertical: 10,
  },
  restoreText: {
    color: '#FFD700',
    fontSize: 15,
    textDecorationLine: 'underline',
  },
  devSection: {
    width: '100%',
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  devSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 4,
  },
  statusBadge: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(78,205,196,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(78,205,196,0.3)',
  },
  statusBadgeText: {
    color: '#4ECDC4',
    fontSize: 13,
    fontWeight: '600',
  },
  devButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cancelDevButton: {
    borderColor: 'rgba(255,107,107,0.2)',
    backgroundColor: 'rgba(255,107,107,0.05)',
  },
  devButtonText: {
    color: '#4ECDC4',
    fontSize: 14,
    fontWeight: '500',
  },
  devHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
});
