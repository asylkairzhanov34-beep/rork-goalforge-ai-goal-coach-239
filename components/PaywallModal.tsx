import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Lock, Crown, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSubscription } from '@/hooks/use-subscription-store';

const FEATURES = [
  'Daily AI Coach — AI analyzes your day and selects optimal steps.',
  'Full Weekly/Monthly Plan — See your progress and schedule.',
  'Weekly AI Report — Accurate insights and recommendations.',
  'All Personalized Tips — Tasks tailored to your profile.',
  'Smart Tasks — AI generates tasks for your goals.',
];

export type PaywallVariant = 'trial' | 'blocking' | 'feature';

interface PaywallModalProps {
  visible: boolean;
  variant?: PaywallVariant;
  featureName?: string;
  onPrimaryAction: () => void;
  onSecondaryAction?: () => void;
  onRequestClose?: () => void;
  primaryLabel?: string;
  secondaryLabel?: string;
  loading?: boolean;
  testID?: string;
}

const CTA_SCALE = 0.96;

export default function PaywallModal({
  visible,
  variant = 'trial',
  featureName,
  onPrimaryAction,
  onSecondaryAction,
  onRequestClose,
  primaryLabel,
  secondaryLabel,
  loading = false,
  testID,
}: PaywallModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const ctaScale = useRef(new Animated.Value(1)).current;
  const { restorePurchases, isPurchasing } = useSubscription();

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 14,
          stiffness: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.92);
    }
  }, [fadeAnim, scaleAnim, visible]);

  const title = useMemo(() => {
    if (variant === 'blocking') {
      return 'Premium Required';
    }
    if (variant === 'feature') {
      return 'Premium Feature';
    }
    return 'Try GoalForge Premium';
  }, [variant]);

  const subtitle = useMemo(() => {
    if (variant === 'blocking') {
      return 'Subscribe to access GoalForge and all features.';
    }
    if (variant === 'feature') {
      return featureName
        ? `${featureName} is only available in GoalForge Premium.`
        : 'This feature is only available in GoalForge Premium.';
    }
    return 'Unlock all features, personalized reports, and priority speed.';
  }, [featureName, variant]);

  const handlePrimary = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    }
    onPrimaryAction();
  };

  const handleSecondary = () => {
    onSecondaryAction?.();
    onRequestClose?.();
  };

  const handleCTAIn = () => {
    Animated.spring(ctaScale, {
      toValue: CTA_SCALE,
      speed: 20,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
  };

  const handleCTAOut = () => {
    Animated.spring(ctaScale, {
      toValue: 1,
      damping: 10,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleRestore = async () => {
    const success = await restorePurchases();
    if (success) {
      Alert.alert('Restored', 'Your subscription is active.');
      onRequestClose?.();
    } else {
      Alert.alert('Not found', 'No active subscription was found.');
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={styles.overlay}>
        <LinearGradient
          colors={['rgba(78, 205, 196, 0.2)', 'rgba(0,0,0,0)']}
          style={styles.glow}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
        />
        <Animated.View
          style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
          testID={testID}
        >
          {variant !== 'blocking' && onRequestClose && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onRequestClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Close"
            >
              <X size={20} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          )}

          <View style={styles.iconWrapper}>
            <LinearGradient
              colors={['#4ECDC4', '#44A08D']}
              style={styles.iconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {variant === 'blocking' ? (
                <Lock size={32} color="#fff" />
              ) : (
                <Crown size={32} color="#fff" />
              )}
            </LinearGradient>
            <View style={styles.sparklesBadge}>
              <Sparkles size={14} color="#0f0f23" />
            </View>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.featureList}>
            {FEATURES.map((text) => (
              <View key={text} style={styles.featureCard}>
                <View style={styles.featureIcon}>
                  <Sparkles size={16} color="#4ECDC4" />
                </View>
                <Text style={styles.featureText}>{text}</Text>
              </View>
            ))}
          </View>

          <View style={styles.ctaZone}>
            <Animated.View style={{ transform: [{ scale: ctaScale }], width: '100%' }}>
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={handlePrimary}
                onPressIn={handleCTAIn}
                onPressOut={handleCTAOut}
                disabled={loading}
                accessibilityLabel={primaryLabel ?? 'Get Premium'}
                testID="paywall-primary-cta"
              >
                {loading ? (
                  <ActivityIndicator color="#0f0f23" />
                ) : (
                  <Text style={styles.ctaText}>
                    {primaryLabel || 'Get Premium'}
                  </Text>
                )}
              </TouchableOpacity>
            </Animated.View>

            {onSecondaryAction && (
              <TouchableOpacity
                onPress={handleSecondary}
                style={styles.secondaryButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel={secondaryLabel ?? 'Not Now'}
                testID="paywall-secondary-cta"
              >
                <Text style={styles.secondaryText}>{secondaryLabel || 'Not Now'}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleRestore}
              style={styles.restoreButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              disabled={isPurchasing}
              accessibilityLabel="Restore purchases"
              testID="paywall-restore-purchases"
            >
              <Text style={[styles.restoreText, isPurchasing && styles.restoreTextDisabled]}>
                {isPurchasing ? 'Restoring…' : 'Restore Purchases'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,15,35,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(78,205,196,0.2)',
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 6,
    zIndex: 10,
  },
  iconWrapper: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparklesBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4ECDC4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0f0f23',
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  featureList: {
    gap: 10,
    marginBottom: 24,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  featureIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(78,205,196,0.15)',
    marginRight: 10,
  },
  featureText: {
    flex: 1,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    lineHeight: 18,
  },
  ctaZone: {
    alignItems: 'center',
  },
  ctaButton: {
    height: 56,
    borderRadius: 28,
    paddingHorizontal: 24,
    backgroundColor: '#4ECDC4',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#0f0f23',
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 8,
  },
  secondaryText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  restoreButton: {
    marginTop: 12,
    padding: 4,
  },
  restoreText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textDecorationLine: 'underline',
  },
  restoreTextDisabled: {
    opacity: 0.7,
    textDecorationLine: 'none',
  },
});
