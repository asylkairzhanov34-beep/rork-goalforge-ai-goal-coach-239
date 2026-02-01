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
import { Crown } from 'lucide-react-native';

interface FirstOpenSubscriptionModalProps {
  visible: boolean;
  onStartTrial: () => void | Promise<void>;
  onSkip: () => void | Promise<void>;
  loading?: boolean;
  testID?: string;
}

const CTA_SCALE = 0.96;

export default function FirstOpenSubscriptionModal({
  visible,
  onStartTrial,
  onSkip,
  loading = false,
  testID,
}: FirstOpenSubscriptionModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.94)).current;
  const ctaScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 16,
          stiffness: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.94);
    }
  }, [fadeAnim, scaleAnim, visible]);

  const handleStart = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    }
    await onStartTrial();
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
      damping: 12,
      stiffness: 220,
      useNativeDriver: true,
    }).start();
  };

  const handleSkip = async () => {
    await onSkip();
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <LinearGradient
          colors={["rgba(255,215,0,0.15)", 'rgba(0,0,0,0.9)']}
          style={styles.backgroundGradient}
        />
        <Animated.View
          style={[styles.card, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
          testID={testID}
        >
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#FFD700', '#FFB300']}
              style={styles.iconBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Crown color="#000" size={32} />
            </LinearGradient>
          </View>
          <Text style={styles.title}>Unlock the Full Potential of GoalForge</Text>
          <Text style={styles.subtitle}>
            Get full access to AI plans, coach and analytics — 1 day free.
          </Text>

          <View style={styles.benefitsBlock}>
            <View style={styles.benefitRow}>
              <View style={styles.dot} />
              <Text style={styles.benefitText}>AI weekly and daily plan</Text>
            </View>
            <View style={styles.benefitRow}>
              <View style={styles.dot} />
              <Text style={styles.benefitText}>Pomodoro analytics and smart tasks</Text>
            </View>
            <View style={styles.benefitRow}>
              <View style={styles.dot} />
              <Text style={styles.benefitText}>Priority speed and all future features</Text>
            </View>
          </View>

          <Animated.View style={[styles.ctaWrapper, { transform: [{ scale: ctaScale }] }]}
          >
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleStart}
              onPressIn={handleCTAIn}
              onPressOut={handleCTAOut}
              disabled={loading}
              accessibilityLabel="Start 1-day free trial"
              testID="first-offer-start-trial"
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.primaryLabel}>Start 1-day free trial</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleSkip}
            accessibilityLabel="Skip offer"
            testID="first-offer-skip"
          >
            <Text style={styles.secondaryLabel}>Skip</Text>
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
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 28,
    padding: 28,
    backgroundColor: 'rgba(18,18,18,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.18)',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOpacity: 0.4,
    shadowRadius: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  benefitsBlock: {
    gap: 12,
    marginBottom: 28,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD700',
    marginRight: 12,
  },
  benefitText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  ctaWrapper: {
    marginBottom: 18,
  },
  primaryButton: {
    height: 60,
    borderRadius: 40,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOpacity: 0.35,
    shadowRadius: 24,
  },
  primaryLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },
  secondaryButton: {
    alignItems: 'center',
  },
  secondaryLabel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
  },
});
