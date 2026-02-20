import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Platform,
  useWindowDimensions,
} from 'react-native';

import { VideoOrb } from '@/components/VideoOrb';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { type Reward } from '@/constants/rewards';

interface RewardUnlockModalProps {
  visible: boolean;
  reward: Reward | null;
  onClose: () => void;
}

export function RewardUnlockModal({ visible, reward, onClose }: RewardUnlockModalProps) {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const isTablet = SCREEN_WIDTH >= 768;
  const UNLOCK_ORB_SIZE = Math.round(isTablet ? Math.min(SCREEN_WIDTH * 0.45, 360) : SCREEN_WIDTH * 0.75);

  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const orbScaleAnim = useRef(new Animated.Value(0.3)).current;
  const orbGlowAnim = useRef(new Animated.Value(0)).current;
  const textSlideAnim = useRef(new Animated.Value(30)).current;
  const buttonSlideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible && reward) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      scaleAnim.setValue(0.5);
      opacityAnim.setValue(0);
      orbScaleAnim.setValue(0.3);
      orbGlowAnim.setValue(0);
      textSlideAnim.setValue(30);
      buttonSlideAnim.setValue(50);

      Animated.sequence([
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.spring(orbScaleAnim, {
            toValue: 1,
            tension: 40,
            friction: 6,
            useNativeDriver: true,
          }),
          Animated.timing(orbGlowAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(textSlideAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(buttonSlideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();

      return () => {
        pulseLoop.stop();
      };
    }
  }, [visible, reward]);

  const handleClose = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  if (!reward) return null;



  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: opacityAnim },
          ]}
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000000' }]} />
        </Animated.View>

        <Animated.View
          style={[
            styles.container,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.7}>
            <View style={styles.closeButtonInner}>
              <X size={18} color="rgba(255,255,255,0.7)" />
            </View>
          </TouchableOpacity>

          <View style={styles.headerSection}>
            <Text style={styles.headerText}>Reward Unlocked</Text>
            <Text style={styles.rewardTitle}>{reward.label.toUpperCase()}</Text>
            <Text style={styles.achievementText}>{reward.achievement}</Text>
          </View>

          <Animated.View
            style={[
              styles.orbContainer,
              {
                transform: [
                  { scale: Animated.multiply(orbScaleAnim, pulseAnim) },
                ],
              },
            ]}
          >
            <VideoOrb
              uri={reward.video}
              size={UNLOCK_ORB_SIZE}
              color={reward.color}
              shouldPlay={visible}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.buttonContainer,
              {
                opacity: opacityAnim,
                transform: [{ translateY: buttonSlideAnim }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.claimButton}
              onPress={handleClose}
              activeOpacity={0.9}
            >
              <Text style={styles.claimButtonText}>Claim Reward</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: 100,
    paddingBottom: 50,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    marginBottom: 16,
  },
  rewardTitle: {
    fontSize: 34,
    fontWeight: '700' as const,
    letterSpacing: 4,
    marginBottom: 10,
    color: '#FFFFFF',
    textAlign: 'center' as const,
  },
  achievementText: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center' as const,
  },
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },

  buttonContainer: {
    width: '100%',
    paddingHorizontal: 24,
  },
  claimButton: {
    height: 56,
    borderRadius: 28,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  claimButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.3,
  },
});

export default RewardUnlockModal;
