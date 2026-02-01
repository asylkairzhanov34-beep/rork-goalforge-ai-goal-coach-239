import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Crown, ShieldCheck, Sparkles } from 'lucide-react-native';

const BENEFITS = [
  'Full AI coaching and daily optimization',
  'Smart task generation and weekly reports',
  'All premium features for 24 hours',
];

type SubscriptionOfferModalProps = {
  visible: boolean;
  loading?: boolean;
  onPrimary: () => void | Promise<void>;
  onSkip: () => void | Promise<void>;
  testID?: string;
};

const CTA_PRESS_SCALE = 0.96;

function SubscriptionOfferModal({
  visible,
  loading = false,
  onPrimary,
  onSkip,
  testID,
}: SubscriptionOfferModalProps) {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.94)).current;
  const ctaScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, damping: 15, stiffness: 180, useNativeDriver: true }),
      ]).start();
    } else {
      fade.setValue(0);
      scale.setValue(0.94);
    }
  }, [fade, scale, visible]);

  const vibrate = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    }
  };

  const handleStart = async () => {
    await vibrate();
    await onPrimary();
  };

  const handleSkip = async () => {
    await onSkip();
  };

  const pressIn = () => {
    Animated.spring(ctaScale, {
      toValue: CTA_PRESS_SCALE,
      speed: 20,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
  };

  const pressOut = () => {
    Animated.spring(ctaScale, {
      toValue: 1,
      damping: 12,
      stiffness: 220,
      useNativeDriver: true,
    }).start();
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent>
      <View style={styles.overlay} testID={testID}>
        <LinearGradient
          colors={["rgba(255,215,0,0.18)", 'rgba(0,0,0,0.9)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
        />
        <Animated.View style={[styles.card, { opacity: fade, transform: [{ scale }] }]}> 
          <View style={styles.iconWrapper}>
            <LinearGradient
              colors={['#FFD700', '#FFB300']}
              style={styles.iconBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Crown size={36} color="#000" />
            </LinearGradient>
            <View style={styles.badgeOverlay}>
              <ShieldCheck size={18} color="#000" />
            </View>
          </View>
          <Text style={styles.title}>Start Your Journey with Premium</Text>
          <Text style={styles.subtitle}>
            Unlock full potential with AI Coach, Smart Plans, and Analytics. 
            Join the elite achievers today.
          </Text>

          <View style={styles.benefits}>
            {BENEFITS.map(benefit => (
              <View key={benefit} style={styles.benefitRow}>
                <View style={styles.dot}>
                  <Sparkles size={14} color="#FFD700" />
                </View>
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>

          <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleStart}
              onPressIn={pressIn}
              onPressOut={pressOut}
              disabled={loading}
              activeOpacity={0.9}
              accessibilityLabel="Start 1-day free trial"
            >
              {loading ? <ActivityIndicator color="#000" /> : (
                <>
                  <Text style={styles.primaryLabel}>Start 24h Free Trial</Text>
                  <Text style={styles.primaryCaption}>Experiene Premium Risk-Free</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleSkip}
            accessibilityLabel="Skip (trial still applies)"
          >
            <Text style={styles.secondaryLabel}>Continue with Limited Access</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 32,
    padding: 28,
    backgroundColor: 'rgba(12,12,12,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    gap: 16,
  },
  iconWrapper: {
    alignItems: 'center',
    marginBottom: 8,
  },
  iconBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOpacity: 0.35,
    shadowRadius: 24,
  },
  badgeOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 24,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    lineHeight: 22,
  },
  benefits: {
    gap: 12,
    marginTop: 8,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 12,
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,215,0,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: '#FFD700',
    borderRadius: 40,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#FFD700',
    shadowOpacity: 0.35,
    shadowRadius: 22,
  },
  primaryLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },
  primaryCaption: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(0,0,0,0.7)',
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  secondaryLabel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textDecorationLine: 'underline',
  },
});

export default SubscriptionOfferModal;
