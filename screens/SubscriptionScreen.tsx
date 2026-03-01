import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  X, 
  Crown,
  Zap,
  Brain,
  Target,
  TrendingUp,
  Shield,
  Star,
  Check,
  ChevronRight,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSubscription } from '@/hooks/use-subscription-store';

interface SubscriptionScreenProps {
  skipButton?: boolean;
}

const FEATURES = [
  { icon: Brain, title: 'AI Coach', description: 'Personal daily guidance', color: '#C084FC' },
  { icon: Target, title: 'Smart Goals', description: 'AI-powered task generation', color: '#60A5FA' },
  { icon: TrendingUp, title: 'Analytics', description: 'Deep progress insights', color: '#34D399' },
  { icon: Zap, title: 'Priority Speed', description: 'Faster AI responses', color: '#FBBF24' },
  { icon: Shield, title: 'All Features', description: 'Full premium access', color: '#F87171' },
  { icon: Star, title: 'Future Updates', description: 'Always get the latest', color: '#38BDF8' },
];

export default function SubscriptionScreen({ skipButton = false }: SubscriptionScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    packages,
    isPurchasing,
    purchasePackage,
    restorePurchases,
    isPremium,
    isInitialized,
    error,
    reloadOfferings,
  } = useSubscription();

  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const crownScale = useRef(new Animated.Value(0.3)).current;
  const crownRotate = useRef(new Animated.Value(0)).current;
  const featureAnims = useRef(FEATURES.map(() => new Animated.Value(0))).current;
  const ctaGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(crownScale, {
        toValue: 1,
        friction: 5,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(crownRotate, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(crownRotate, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    const stagger = FEATURES.map((_, i) =>
      Animated.timing(featureAnims[i], {
        toValue: 1,
        duration: 350,
        delay: 200 + i * 80,
        useNativeDriver: true,
      })
    );
    Animated.stagger(80, stagger).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(ctaGlow, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(ctaGlow, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (packages.length > 0 && !selectedPackage) {
      const yearly = packages.find(p => 
        p.identifier.includes('annual') || 
        p.identifier.includes('year') ||
        p.product.identifier.includes('year')
      );
      setSelectedPackage(yearly?.identifier || packages[0].identifier);
    }
  }, [packages, selectedPackage]);

  const selectedPackageData = useMemo(
    () => packages.find((p) => p.identifier === selectedPackage) ?? null,
    [packages, selectedPackage]
  );

  const handlePurchase = useCallback(async () => {
    if (!selectedPackage) {
      Alert.alert('Select Plan', 'Please select a subscription plan');
      return;
    }

    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    console.log('[SubscriptionScreen] Starting purchase for:', selectedPackage);
    const success = await purchasePackage(selectedPackage);

    if (success) {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      Alert.alert('Welcome to Premium!', 'Your subscription is now active.', [
        { text: 'Continue', onPress: () => router.back() }
      ]);
    }
  }, [selectedPackage, purchasePackage, router]);

  const handleRestore = useCallback(async () => {
    const success = await restorePurchases();
    if (success) {
      Alert.alert('Restored!', 'Your subscription has been restored.', [
        { text: 'Continue', onPress: () => router.back() }
      ]);
    } else {
      Alert.alert('No Purchases Found', 'We couldn\'t find any previous purchases to restore.');
    }
  }, [restorePurchases, router]);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const crownRotateInterp = crownRotate.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-4deg', '4deg', '-4deg'],
  });

  const ctaGlowOpacity = ctaGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  if (isPremium) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0C0C1A', '#121228', '#0A0A18']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.bgOrbOne} />
        <View style={styles.bgOrbTwo} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <X size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          <View style={styles.premiumActiveContainer}>
            <View style={styles.premiumCrownWrap}>
              <LinearGradient
                colors={['rgba(255,215,0,0.2)', 'rgba(255,215,0,0.05)', 'transparent']}
                style={styles.premiumCrownGlow}
              />
              <Crown size={56} color="#FFD700" />
            </View>
            <Text style={styles.premiumTitle}>Premium Active</Text>
            <Text style={styles.premiumSubtitle}>
              You have full access to all premium features
            </Text>
            
            <TouchableOpacity 
              style={styles.manageBtn}
              onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}
              activeOpacity={0.8}
            >
              <Text style={styles.manageBtnText}>Manage Subscription</Text>
              <ChevronRight size={16} color="#FFD700" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0C0C1A', '#121228', '#0A0A18']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.bgOrbOne} />
      <View style={styles.bgOrbTwo} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <X size={20} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            style={[
              styles.heroSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <Animated.View style={[
              styles.crownContainer,
              {
                transform: [
                  { scale: crownScale },
                  { rotate: crownRotateInterp },
                ],
              }
            ]}>
              <LinearGradient
                colors={['rgba(255,215,0,0.15)', 'rgba(255,215,0,0.03)', 'transparent']}
                style={styles.crownGlow}
              />
              <View style={styles.crownInner}>
                <Crown size={40} color="#FFD700" />
              </View>
            </Animated.View>

            <Text style={styles.heroLabel}>GOALCOACH PRO</Text>
            <Text style={styles.heroTitle}>Elevate Your{'\n'}Performance</Text>
            <Text style={styles.heroSubtitle}>
              Unlock AI-powered coaching designed to transform your daily habits
            </Text>
          </Animated.View>

          <Animated.View style={[styles.featuresSection, { opacity: fadeAnim }]}>
            <View style={styles.featuresGrid}>
              {FEATURES.map((feature, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.featureCard,
                    {
                      opacity: featureAnims[index],
                      transform: [{
                        translateY: featureAnims[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      }],
                    }
                  ]}
                >
                  <View style={[styles.featureIconWrap, { backgroundColor: `${feature.color}15` }]}>
                    <feature.icon size={18} color={feature.color} />
                  </View>
                  <Text style={styles.featureCardTitle}>{feature.title}</Text>
                  <Text style={styles.featureCardDesc}>{feature.description}</Text>
                </Animated.View>
              ))}
            </View>
          </Animated.View>

          {isInitialized && packages.length > 0 ? (
            <Animated.View 
              style={[
                styles.packagesSection,
                { opacity: fadeAnim }
              ]}
            >
              <Text style={styles.packagesLabel}>Choose Your Plan</Text>
              {packages.map((pkg) => {
                const isSelected = selectedPackage === pkg.identifier;
                const isYearly = pkg.identifier.includes('annual') || pkg.identifier.includes('year');
                
                return (
                  <TouchableOpacity
                    key={pkg.identifier}
                    style={[
                      styles.packageCard,
                      isSelected && styles.packageCardSelected,
                      isYearly && isSelected && styles.packageCardYearlySelected,
                    ]}
                    onPress={() => {
                      setSelectedPackage(pkg.identifier);
                      if (Platform.OS !== 'web') {
                        Haptics.selectionAsync().catch(() => {});
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    {isYearly && (
                      <LinearGradient
                        colors={['#FFD700', '#F59E0B']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.saveBadge}
                      >
                        <Text style={styles.saveBadgeText}>SAVE 60%</Text>
                      </LinearGradient>
                    )}
                    
                    <View style={styles.packageRow}>
                      <View style={[
                        styles.radioCircle,
                        isSelected && styles.radioCircleSelected,
                      ]}>
                        {isSelected && (
                          <View style={styles.radioFill}>
                            <Check size={12} color="#0C0C1A" strokeWidth={3} />
                          </View>
                        )}
                      </View>
                      <View style={styles.packageInfo}>
                        <Text style={[
                          styles.packageTitle,
                          isSelected && styles.packageTitleSelected,
                        ]}>
                          {pkg.product.title}
                        </Text>
                        <Text style={styles.packageSubtitle}>{pkg.product.description}</Text>
                      </View>
                      <View style={styles.packagePriceWrap}>
                        <Text style={[
                          styles.packagePrice,
                          isSelected && styles.packagePriceSelected,
                        ]}>
                          {pkg.product.priceString}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </Animated.View>
          ) : (
            <View style={styles.loadingSection}>
              {!error ? (
                <>
                  <ActivityIndicator size="large" color="#FFD700" />
                  <Text style={styles.loadingText}>
                    {isInitialized ? 'Loading plans...' : 'Connecting to store...'}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity 
                    style={styles.retryButton}
                    onPress={reloadOfferings}
                  >
                    <Text style={styles.retryButtonText}>Try Again</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          <View style={{ height: 180 }} />
        </ScrollView>

        <LinearGradient
          colors={['transparent', '#0C0C1A', '#0C0C1A']}
          style={[styles.ctaGradient, { paddingBottom: Math.max(insets.bottom, 20) }]}
          pointerEvents="box-none"
        >
          <View style={styles.ctaInner} pointerEvents="auto">
            <TouchableOpacity
              style={[
                styles.ctaButton,
                (isPurchasing || packages.length === 0) && styles.ctaButtonDisabled,
              ]}
              onPress={handlePurchase}
              disabled={isPurchasing || packages.length === 0}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#FFD700', '#F59E0B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradientInner}
              >
                {isPurchasing ? (
                  <ActivityIndicator color="#0C0C1A" />
                ) : (
                  <>
                    <Text style={styles.ctaText}>
                      {selectedPackageData
                        ? `Subscribe — ${selectedPackageData.product.priceString}`
                        : 'Start Premium'}
                    </Text>
                    <Animated.View style={{ opacity: ctaGlowOpacity }}>
                      <Crown size={18} color="#0C0C1A" />
                    </Animated.View>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.autoRenewText}>
              Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period. You can manage or cancel anytime in Settings.
            </Text>

            <View style={styles.linksRow}>
              <TouchableOpacity onPress={handleRestore}>
                <Text style={styles.linkText}>Restore Purchases</Text>
              </TouchableOpacity>
              <Text style={styles.linkDot}>·</Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://www.notion.so/TERMS-OF-USE-2c54e106d5d080f1b7bdce1028935488?source=copy_link')}>
                <Text style={styles.linkText}>Terms</Text>
              </TouchableOpacity>
              <Text style={styles.linkDot}>·</Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://www.notion.so/PRIVACY-POLICY-AND-COOKIES-2b44e106d5d0807aaff8e5765d4b8539?source=copy_link')}>
                <Text style={styles.linkText}>Privacy</Text>
              </TouchableOpacity>
              <Text style={styles.linkDot}>·</Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}>
                <Text style={styles.linkText}>EULA</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C1A',
  },
  bgOrbOne: {
    position: 'absolute',
    top: -80,
    left: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255,215,0,0.04)',
  },
  bgOrbTwo: {
    position: 'absolute',
    bottom: 100,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(139,92,246,0.04)',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 52,
  },
  headerSpacer: {
    width: 36,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 28,
  },
  crownContainer: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  crownGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 44,
  },
  crownInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255,215,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.15)',
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#FFD700',
    letterSpacing: 3,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  featuresSection: {
    marginBottom: 28,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  featureCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featureCardTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 3,
  },
  featureCardDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 16,
  },
  packagesSection: {
    gap: 10,
  },
  packagesLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    marginBottom: 4,
  },
  packageCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
    overflow: 'hidden',
  },
  packageCardSelected: {
    backgroundColor: 'rgba(255,215,0,0.04)',
    borderColor: 'rgba(255,215,0,0.3)',
  },
  packageCardYearlySelected: {
    backgroundColor: 'rgba(255,215,0,0.06)',
    borderColor: 'rgba(255,215,0,0.4)',
  },
  saveBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
  },
  saveBadgeText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: '#0C0C1A',
    letterSpacing: 0.5,
  },
  packageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  radioCircleSelected: {
    borderColor: '#FFD700',
    backgroundColor: '#FFD700',
  },
  radioFill: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  packageInfo: {
    flex: 1,
  },
  packageTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 2,
  },
  packageTitleSelected: {
    color: '#FFD700',
  },
  packageSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
  packagePriceWrap: {
    alignItems: 'flex-end',
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: 'rgba(255,255,255,0.7)',
  },
  packagePriceSelected: {
    color: '#FFD700',
  },
  loadingSection: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
  },
  errorText: {
    fontSize: 14,
    color: '#F87171',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFD700',
  },
  ctaGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 32,
  },
  ctaInner: {
    paddingHorizontal: 20,
  },
  ctaButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaGradientInner: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaButtonDisabled: {
    opacity: 0.4,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#0C0C1A',
    letterSpacing: 0.3,
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  linkText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
  },
  linkDot: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.2)',
  },
  autoRenewText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  premiumActiveContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  premiumCrownWrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  premiumCrownGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 60,
  },
  premiumTitle: {
    fontSize: 30,
    fontWeight: '700' as const,
    color: '#FFD700',
    marginBottom: 12,
  },
  premiumSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 36,
    lineHeight: 22,
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  manageBtnText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFD700',
  },
});
