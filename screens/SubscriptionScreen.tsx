import React, { useState, useRef, useEffect } from 'react';
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
import Constants from 'expo-constants';
import { 
  X, 
  Check, 
  Sparkles, 
  Bot, 
  Calendar, 
  FileText, 
  CheckSquare, 
  History, 
  Trophy, 
  MessageCircle, 
  Zap, 
  Timer, 
  Infinity,
  CreditCard,
  Bug
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSubscription } from '@/hooks/use-subscription-store';

interface SubscriptionScreenProps {
  skipButton?: boolean;
}

const isProductionBuild = () => {
  // Returns false for: dev builds, TestFlight, Expo Go
  // Returns true only for: production release from App Store
  if (__DEV__) return false;
  
  // TestFlight detection
  const isTestFlight = Constants.appOwnership === 'expo' || 
                       Constants.manifest?.releaseChannel === undefined ||
                       Constants.isDevice === false;
  
  return !isTestFlight;
};

const FEATURE_LIST = [
  { title: 'Daily AI Coach', subtitle: 'AI analyzes your day and suggests optimal steps', icon: Bot },
  { title: 'Full Weekly/Monthly Plan', subtitle: 'See the big picture of progress and schedule', icon: Calendar },
  { title: 'Weekly AI Report', subtitle: 'Precise insights and recommendations', icon: FileText },
  { title: 'All Personal Tips', subtitle: 'Tasks tailored to your profile', icon: Sparkles },
  { title: 'Smart Tasks', subtitle: 'AI generates tasks for your goal', icon: CheckSquare },
  { title: '7-90 Days History', subtitle: 'Analytics and trends', icon: History },
  { title: 'Levels and Rewards', subtitle: 'Motivation growth and achievements', icon: Trophy },
  { title: 'AI Chat Assistant', subtitle: 'Quick answers and support', icon: MessageCircle },
  { title: 'Priority Speed', subtitle: 'Features work faster', icon: Zap },
  { title: 'Smart Pomodoro Timer with Analytics', subtitle: 'Detailed focus statistics', icon: Timer },
  { title: 'All Future Features', subtitle: 'Access to all updates', icon: Infinity },
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
    customerInfo,
    isInitialized,
  } = useSubscription();

  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const fadeAnims = useRef(FEATURE_LIST.map(() => new Animated.Value(0))).current;
  const translateYAnims = useRef(FEATURE_LIST.map(() => new Animated.Value(-10))).current;

  useEffect(() => {
    if (packages.length > 0 && !selectedPackage) {
      // Prefer yearly package if available, otherwise first
      const yearly = packages.find(p => p.product.identifier.includes('year') || p.product.identifier.includes('annual'));
      setSelectedPackage(yearly ? yearly.identifier : packages[0].identifier);
    }
  }, [packages, selectedPackage]);

  useEffect(() => {
    const animations = FEATURE_LIST.map((_, index) => {
      return Animated.parallel([
        Animated.timing(fadeAnims[index], {
          toValue: 1,
          duration: 220,
          delay: index * 80,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnims[index], {
          toValue: 0,
          duration: 220,
          delay: index * 80,
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.stagger(50, animations).start();
  }, [fadeAnims, translateYAnims]);

  const handlePurchase = async () => {
    if (!selectedPackage) {
      Alert.alert('Error', 'Please select a subscription plan');
      return;
    }
    
    console.log('[SubscriptionScreen] 🛒 Starting purchase...');
    console.log('[SubscriptionScreen] Selected package:', selectedPackage);
    console.log('[SubscriptionScreen] Available packages:', packages.length);
    
    const success = await purchasePackage(selectedPackage);
    
    if (success) {
      console.log('[SubscriptionScreen] ✅ Purchase completed successfully');
      Alert.alert('Success!', 'Subscription activated', [{ text: 'OK', onPress: () => router.back() }]);
    } else {
      console.error('[SubscriptionScreen] ❌ Purchase failed or was cancelled');
    }
  };

  const handleRestore = async () => {
    const success = await restorePurchases();
    if (success) {
      Alert.alert('Success!', 'Subscription restored', [{ text: 'OK', onPress: () => router.back() }]);
    } else {
      Alert.alert('Info', 'No active subscriptions found');
    }
  };

  if (isPremium) {
    return (
      <View style={styles.container}>
        <View style={styles.background}>
          <LinearGradient
            colors={['rgba(255, 215, 0, 0.1)', 'rgba(0,0,0,0)']}
            style={styles.glowEffect}
          />
        </View>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <View style={styles.headerLeft} />
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => router.back()}
            >
              <X size={24} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>

          <View style={styles.successContainer}>
            <View style={styles.successIconWrapper}>
              <LinearGradient
                colors={['#FFD700', '#FFB300']}
                style={styles.successIconBadge}
              >
                <Check size={48} color="#000" />
              </LinearGradient>
            </View>
            
            <Text style={styles.heroTitle}>You&apos;re already with us!</Text>
            <Text style={styles.heroSubtitle}>
              Your Premium subscription is active. Enjoy full access to all GoalForge features.
            </Text>

            <View style={styles.activePlanCard}>
              <View style={styles.planRow}>
                <CreditCard size={20} color="#FFD700" />
                <Text style={styles.planLabel}>Subscription Status</Text>
              </View>
              <Text style={styles.planValue}>Active</Text>
              
              {customerInfo?.entitlements.active.premium?.productIdentifier && (
                 <Text style={styles.planId}>
                   {customerInfo.entitlements.active.premium.productIdentifier}
                 </Text>
              )}
            </View>

            <TouchableOpacity style={styles.manageButton} onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}>
              <Text style={styles.manageButtonText}>Manage Subscription</Text>
            </TouchableOpacity>

          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background */}
      <View style={styles.background}>
        <LinearGradient
          colors={['rgba(255, 215, 0, 0.15)', 'rgba(0,0,0,0)']}
          style={styles.glowEffect}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.6 }}
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
           {/* Placeholder for Logo if needed, or just empty space as requested "small logo left" - we use text or icon */}
           <View style={styles.headerLeft}>
             <Sparkles size={24} color="#FFD700" />
           </View>
           <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
           >
             <X size={24} color="rgba(255,255,255,0.8)" />
           </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 180 }]} // Extra padding for sticky CTA
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Block */}
          <View style={styles.heroBlock}>
            <Text style={styles.heroTitle}>Unlock the Full Potential of GoalForge</Text>
            <Text style={styles.heroSubtitle}>
              Invest in your productivity and future
            </Text>
          </View>

          {/* Feature List */}
          <View style={styles.featureList}>
            {FEATURE_LIST.map((feature, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.featureCard,
                  {
                    opacity: fadeAnims[index],
                    transform: [{ translateY: translateYAnims[index] }],
                  },
                ]}
              >
                <View style={styles.featureIconContainer}>
                  <feature.icon size={24} color="#FFD700" />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
                </View>
              </Animated.View>
            ))}
          </View>

          {/* Plan Selector (Simplified) */}
           {packages.length > 0 ? (
            <View style={styles.packagesContainer}>
              {packages.map((pkg) => {
                const isSelected = selectedPackage === pkg.identifier;
                return (
                  <TouchableOpacity
                    key={pkg.identifier}
                    style={[
                      styles.packageCard,
                      isSelected && styles.packageCardSelected
                    ]}
                    onPress={() => setSelectedPackage(pkg.identifier)}
                    activeOpacity={0.9}
                  >
                    <View style={styles.packageHeader}>
                       <Text style={[styles.packageTitle, isSelected && styles.packageTitleSelected]}>
                        {pkg.product.title}
                       </Text>
                       {isSelected && <View style={styles.checkCircle}><Check size={12} color="#000" /></View>}
                    </View>
                    <Text style={[styles.packagePrice, isSelected && styles.packagePriceSelected]}>
                      {pkg.product.priceString}
                    </Text>
                    <Text style={styles.packageDescription}>
                      {pkg.product.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              
              {/* Debug info for TestFlight */}
              {!isProductionBuild() && (
                <View style={styles.debugInfoCard}>
                  <Text style={styles.debugInfoTitle}>Debug Info (TestFlight)</Text>
                  <Text style={styles.debugInfoText}>Platform: {Platform.OS}</Text>
                  <Text style={styles.debugInfoText}>Packages: {packages.length}</Text>
                  <Text style={styles.debugInfoText}>Selected: {selectedPackage || 'none'}</Text>
                  <Text style={styles.debugInfoText}>Is Initialized: {isInitialized ? 'Yes' : 'No'}</Text>
                  <Text style={styles.debugInfoText}>appOwnership: {Constants?.appOwnership || 'unknown'}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.loadingPackagesContainer}>
              <ActivityIndicator size="large" color="#FFD700" />
              <Text style={styles.loadingText}>
                {isInitialized ? 'Loading subscription plans...' : 'Initializing...'}
              </Text>
              {!isProductionBuild() && (
                <TouchableOpacity 
                  style={styles.debugLinkButton}
                  onPress={() => router.push('/dev-subscription-tools')}
                >
                  <Bug size={16} color="#FF6B6B" />
                  <Text style={styles.debugLinkText}>Open Debug Tools</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>

        {/* Sticky CTA Zone */}
        <View style={[styles.ctaZone, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <TouchableOpacity
            style={[
              styles.ctaButton,
              (isPurchasing || packages.length === 0) && styles.ctaButtonDisabled
            ]}
            onPress={handlePurchase}
            disabled={isPurchasing || packages.length === 0}
            activeOpacity={0.98}
          >
             {isPurchasing ? (
               <ActivityIndicator color="#000" />
             ) : (
               <Text style={styles.ctaText}>Try Premium</Text>
             )}
          </TouchableOpacity>
          
          <View style={styles.policyLinks}>
            <TouchableOpacity onPress={handleRestore} testID="subscription-restore">
              <Text style={styles.policyText}>Restore</Text>
            </TouchableOpacity>
            <Text style={styles.policyDivider}>•</Text>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}
              testID="subscription-terms-eula"
            >
              <Text style={styles.policyText}>Terms of Use (EULA)</Text>
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
    backgroundColor: '#000000',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  glowEffect: {
    width: '100%',
    height: '60%',
    opacity: 0.6,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  headerLeft: {
    width: 32,
    height: 32,
    justifyContent: 'center',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  heroBlock: {
    marginTop: 16,
    marginBottom: 32,
    alignItems: 'center',
  },
  heroTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 32, // 28-32px
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 34, // 1.06 * 32
    maxWidth: 320,
    marginBottom: 12,
  },
  heroSubtitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.62)',
    textAlign: 'center',
  },
  featureList: {
    gap: 12,
    marginBottom: 32,
  },
  featureCard: {
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 22,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.12)',
  },
  featureIconContainer: {
    width: 24,
    marginRight: 18, // Padding 18px
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  featureSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.62)',
  },
  packagesContainer: {
    gap: 12,
    marginBottom: 24,
  },
  packageCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  packageCardSelected: {
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderColor: '#FFD700',
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  packageTitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  packageTitleSelected: {
    color: '#FFD700',
    fontWeight: '600',
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
  },
  packagePrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  packagePriceSelected: {
    color: '#FFD700',
  },
  packageDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  ctaZone: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000000', // Opaque background for sticky area
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  ctaButton: {
    height: 64,
    borderRadius: 40,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 12,
  },
  ctaButtonDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  policyLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  policyText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  successIconWrapper: {
    marginBottom: 32,
    shadowColor: '#FFD700',
    shadowOpacity: 0.4,
    shadowRadius: 30,
  },
  successIconBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePlanCard: {
    marginTop: 40,
    width: '100%',
    padding: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  planLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  planValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  planId: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  manageButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  manageButtonText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
  },
  devZone: {
    marginTop: 48,
    alignItems: 'center',
  },
  sandboxButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  sandboxButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  policyDivider: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 4,
  },
  loadingPackagesContainer: {
    marginTop: 32,
    marginBottom: 32,
    alignItems: 'center',
    gap: 16,
    padding: 24,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.15)',
  },
  loadingText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  debugLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  debugLinkText: {
    fontSize: 13,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  debugCard: {
    marginTop: 32,
    padding: 16,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    alignItems: 'center',
    gap: 12,
  },
  debugText: {
    fontSize: 13,
    color: '#FF6B6B',
    textAlign: 'center',
    lineHeight: 20,
  },
  debugButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderRadius: 8,
  },
  debugButtonText: {
    fontSize: 13,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  debugInfoCard: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(0, 200, 100, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 200, 100, 0.3)',
  },
  debugInfoTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00C864',
    marginBottom: 8,
  },
  debugInfoText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
