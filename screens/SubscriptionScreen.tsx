import React, { useState, useEffect, useRef } from 'react';
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
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  X, 
  Sparkles,
  Crown,
  Zap,
  Brain,
  Target,
  TrendingUp,
  Shield,
  Star,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSubscription } from '@/hooks/use-subscription-store';



interface SubscriptionScreenProps {
  skipButton?: boolean;
}

const FEATURES = [
  { icon: Brain, title: 'AI Coach', description: 'Personal daily guidance' },
  { icon: Target, title: 'Smart Goals', description: 'AI-powered task generation' },
  { icon: TrendingUp, title: 'Analytics', description: 'Deep progress insights' },
  { icon: Zap, title: 'Priority Speed', description: 'Faster AI responses' },
  { icon: Shield, title: 'All Features', description: 'Full premium access' },
  { icon: Star, title: 'Future Updates', description: 'Always get the latest' },
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
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
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

  const handlePurchase = async () => {
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
  };

  const handleRestore = async () => {
    const success = await restorePurchases();
    if (success) {
      Alert.alert('Restored!', 'Your subscription has been restored.', [
        { text: 'Continue', onPress: () => router.back() }
      ]);
    } else {
      Alert.alert('No Purchases Found', 'We couldn\'t find any previous purchases to restore.');
    }
  };

  const handleClose = () => {
    router.back();
  };

  if (isPremium) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#1a1a2e', '#16213e', '#0f0f23']}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.premiumActiveContainer}>
            <View style={styles.premiumBadge}>
              <Crown size={48} color="#FFD700" />
            </View>
            <Text style={styles.premiumTitle}>Premium Active</Text>
            <Text style={styles.premiumSubtitle}>
              You have full access to all features
            </Text>
            
            <TouchableOpacity 
              style={styles.manageBtn}
              onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}
            >
              <Text style={styles.manageBtnText}>Manage Subscription</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f0f23']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <X size={24} color="rgba(255,255,255,0.7)" />
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
            <View style={styles.iconBadge}>
              <Sparkles size={32} color="#FFD700" />
            </View>
            <Text style={styles.heroTitle}>Unlock Your Full Potential</Text>
            <Text style={styles.heroSubtitle}>
              Get AI-powered coaching and premium features
            </Text>
          </Animated.View>

          <Animated.View 
            style={[
              styles.featuresGrid,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              }
            ]}
          >
            {FEATURES.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <feature.icon size={20} color="#4ECDC4" />
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDesc}>{feature.description}</Text>
                </View>
              </View>
            ))}
          </Animated.View>

          {isInitialized && packages.length > 0 ? (
            <Animated.View 
              style={[
                styles.packagesSection,
                { opacity: fadeAnim }
              ]}
            >
              {packages.map((pkg) => {
                const isSelected = selectedPackage === pkg.identifier;
                const isYearly = pkg.identifier.includes('annual') || pkg.identifier.includes('year');
                
                return (
                  <TouchableOpacity
                    key={pkg.identifier}
                    style={[
                      styles.packageCard,
                      isSelected && styles.packageCardSelected,
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
                      <View style={styles.bestValueBadge}>
                        <Text style={styles.bestValueText}>BEST VALUE</Text>
                      </View>
                    )}
                    
                    <View style={styles.packageContent}>
                      <View style={styles.packageLeft}>
                        <View style={[
                          styles.radioOuter,
                          isSelected && styles.radioOuterSelected
                        ]}>
                          {isSelected && <View style={styles.radioInner} />}
                        </View>
                        <View>
                          <Text style={[
                            styles.packageName,
                            isSelected && styles.packageNameSelected
                          ]}>
                            {pkg.product.title}
                          </Text>
                          <Text style={styles.packageDesc}>{pkg.product.description}</Text>
                        </View>
                      </View>
                      <Text style={[
                        styles.packagePrice,
                        isSelected && styles.packagePriceSelected
                      ]}>
                        {pkg.product.priceString}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </Animated.View>
          ) : (
            <View style={styles.loadingSection}>
              {!error ? (
                <>
                  <ActivityIndicator size="large" color="#4ECDC4" />
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

          <View style={{ height: 160 }} />
        </ScrollView>

        <View style={[styles.ctaSection, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <TouchableOpacity
            style={[
              styles.ctaButton,
              (isPurchasing || packages.length === 0) && styles.ctaButtonDisabled,
            ]}
            onPress={handlePurchase}
            disabled={isPurchasing || packages.length === 0}
            activeOpacity={0.9}
          >
            {isPurchasing ? (
              <ActivityIndicator color="#0f0f23" />
            ) : (
              <Text style={styles.ctaText}>Continue</Text>
            )}
          </TouchableOpacity>

          <View style={styles.linksRow}>
            <TouchableOpacity onPress={handleRestore}>
              <Text style={styles.linkText}>Restore Purchases</Text>
            </TouchableOpacity>
            <Text style={styles.linkDivider}>•</Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}>
              <Text style={styles.linkText}>Terms</Text>
            </TouchableOpacity>
            <Text style={styles.linkDivider}>•</Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://www.apple.com/legal/privacy/')}>
              <Text style={styles.linkText}>Privacy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 56,
  },
  headerSpacer: {
    width: 40,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 32,
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresGrid: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  packagesSection: {
    gap: 12,
  },
  packageCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    overflow: 'hidden',
  },
  packageCardSelected: {
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderColor: '#4ECDC4',
  },
  bestValueBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FFD700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
  },
  bestValueText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#0f0f23',
  },
  packageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  packageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  radioOuterSelected: {
    borderColor: '#4ECDC4',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ECDC4',
  },
  packageName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 2,
  },
  packageNameSelected: {
    color: '#4ECDC4',
  },
  packageDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
  },
  packagePriceSelected: {
    color: '#4ECDC4',
  },
  loadingSection: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
  },
  errorText: {
    fontSize: 14,
    color: '#FF6B6B',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(78, 205, 196, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4ECDC4',
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#4ECDC4',
  },
  ctaSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0f0f23',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  ctaButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4ECDC4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  ctaButtonDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#0f0f23',
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  linkText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  linkDivider: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
  },
  premiumActiveContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  premiumBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  premiumTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#FFD700',
    marginBottom: 12,
  },
  premiumSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 32,
  },
  manageBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  manageBtnText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFD700',
  },
});
