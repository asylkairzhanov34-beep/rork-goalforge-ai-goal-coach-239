import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';

import { Video, ResizeMode } from 'expo-av';
import { BlurView } from 'expo-blur';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { type Reward } from '@/constants/rewards';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ORB_SIZE = SCREEN_WIDTH * 0.5;

interface RewardUnlockModalProps {
  visible: boolean;
  reward: Reward | null;
  onClose: () => void;
}

export function RewardUnlockModal({ visible, reward, onClose }: RewardUnlockModalProps) {
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

  const rewardColor = reward.color || '#FFD700';

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
          {Platform.OS === 'ios' ? (
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.9)' }]} />
          )}
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

          <Text style={styles.headerText}>Reward Unlocked</Text>
          <Text style={styles.rewardTitle}>{reward.label.toUpperCase()}</Text>
          <Text style={styles.achievementText}>{reward.achievement}</Text>

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
            <Animated.View
              style={[
                styles.orbGlow,
                {
                  backgroundColor: rewardColor,
                  opacity: Animated.multiply(orbGlowAnim, new Animated.Value(0.5)),
                },
              ]}
            />
            <View style={[styles.orbRing, { shadowColor: rewardColor }]}>
              <View style={styles.orbVideoWrapper}>
                <Video
                  source={{ uri: reward.video }}
                  style={styles.orbVideo}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay
                  isLooping
                  isMuted
                />
              </View>
            </View>
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
    width: SCREEN_WIDTH - 48,
    maxWidth: 380,
    backgroundColor: 'rgba(28, 28, 30, 0.98)',
    borderRadius: 24,
    paddingTop: 56,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.6,
        shadowRadius: 40,
      },
      android: {
        elevation: 25,
      },
    }),
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  rewardTitle: {
    fontSize: 32,
    fontWeight: '800' as const,
    letterSpacing: 2,
    marginBottom: 8,
    color: '#FFFFFF',
  },
  achievementText: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 32,
  },
  orbContainer: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  orbGlow: {
    position: 'absolute',
    width: ORB_SIZE * 1.4,
    height: ORB_SIZE * 1.4,
    borderRadius: ORB_SIZE * 0.7,
  },
  orbRing: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    padding: 3,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
      },
    }),
  },
  orbVideoWrapper: {
    width: '100%',
    height: '100%',
    borderRadius: ORB_SIZE / 2,
    overflow: 'hidden',
  },
  orbVideo: {
    width: '100%',
    height: '100%',
  },
  buttonContainer: {
    width: '100%',
  },
  claimButton: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  claimButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});

export default RewardUnlockModal;
