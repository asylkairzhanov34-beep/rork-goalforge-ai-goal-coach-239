import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Check, RefreshCw, CreditCard } from 'lucide-react-native';
import { useSubscription } from '@/hooks/use-subscription-store';

const CONFETTI_COLORS = ['#4ECDC4', '#44A08D', '#667eea', '#764ba2', '#f093fb', '#f5576c'];
const CONFETTI_PIECES = 12;

export default function PurchaseSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ planName?: string }>();
  const { 
    restorePurchases, 
    refreshStatus,
    status,
    packages,
    purchasePackage,
    isPurchasing,
  } = useSubscription();
  const [isRestoring, setIsRestoring] = useState(false);
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

  const planName = params.planName || 'Premium';

  const handleContinue = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.selectionAsync().catch(() => undefined);
    }
    router.replace('/(tabs)/home');
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      await restorePurchases();
    } finally {
      setIsRestoring(false);
    }
  };

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    try {
      await refreshStatus();
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      Alert.alert('Status Refreshed', `Current status: ${status.toUpperCase()}`);
    } catch {
      Alert.alert('Error', 'Failed to refresh status.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTestPurchase = async () => {
    if (packages.length === 0) {
      Alert.alert('No Packages', 'No subscription packages available.');
      return;
    }

    const packageOptions = packages.map((pkg) => ({
      text: `${pkg.product.title} - ${pkg.product.priceString}`,
      onPress: async () => {
        console.log('[PurchaseSuccess] Testing purchase for:', pkg.identifier);
        const result = await purchasePackage(pkg.identifier);
        if (result) {
          Alert.alert('Purchase Complete', 'Successfully purchased subscription!');
        }
      }
    }));

    Alert.alert(
      'Test Purchase',
      'Select a package to test:',
      [{ text: 'Cancel', style: 'cancel' }, ...packageOptions]
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <LinearGradient colors={['rgba(78,205,196,0.2)', 'rgba(0,0,0,0)']} style={styles.backgroundGlow} />
      <View style={styles.container}>
        <Animated.View style={[styles.heroIcon, { transform: [{ scale: heroScale }] }]} testID="purchase-success-hero">
          <Check size={40} color="#0f0f23" />
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

        <Text style={styles.title}>Premium Activated!</Text>
        <Text style={styles.subtitle}>Thank you for subscribing. Enjoy all premium features.</Text>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Plan</Text>
            <Text style={styles.detailValue}>{planName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <Text style={[styles.detailValue, styles.activeStatus]}>Active</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleContinue}
          activeOpacity={0.9}
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
            <ActivityIndicator size="small" color="#4ECDC4" />
          ) : (
            <Text style={styles.restoreText}>Restore Purchases</Text>
          )}
        </TouchableOpacity>

        {__DEV__ && (
          <View style={styles.devSection}>
            <Text style={styles.devSectionTitle}>Developer Tools</Text>
            
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>Status: {status.toUpperCase()}</Text>
            </View>

            <TouchableOpacity
              style={styles.devButton}
              onPress={handleRefreshStatus}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <ActivityIndicator size="small" color="#4ECDC4" />
              ) : (
                <>
                  <RefreshCw size={16} color="#4ECDC4" />
                  <Text style={styles.devButtonText}>Refresh Status</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.devButton}
              onPress={handleTestPurchase}
              disabled={isPurchasing}
            >
              {isPurchasing ? (
                <ActivityIndicator size="small" color="#4ECDC4" />
              ) : (
                <>
                  <CreditCard size={16} color="#4ECDC4" />
                  <Text style={styles.devButtonText}>Test Purchase</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0f0f23',
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
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4ECDC4',
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
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 20,
  },
  detailsCard: {
    width: '100%',
    borderRadius: 16,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(78,205,196,0.2)',
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  activeStatus: {
    color: '#4ECDC4',
  },
  primaryButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4ECDC4',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  primaryText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#0f0f23',
  },
  restoreButton: {
    paddingVertical: 10,
  },
  restoreText: {
    color: '#4ECDC4',
    fontSize: 15,
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
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
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
    fontWeight: '600' as const,
  },
  devButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  devButtonText: {
    color: '#4ECDC4',
    fontSize: 14,
    fontWeight: '500' as const,
  },
});
