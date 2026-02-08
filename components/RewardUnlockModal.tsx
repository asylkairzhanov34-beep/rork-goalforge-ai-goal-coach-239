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
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { BlurView } from 'expo-blur';
import { Gift, Sparkles, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { type Reward } from '@/constants/rewards';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ORB_SIZE = SCREEN_WIDTH * 0.55;

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
  const sparkleRotateAnim = useRef(new Animated.Value(0)).current;
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

      const sparkleLoop = Animated.loop(
        Animated.timing(sparkleRotateAnim, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        })
      );
      sparkleLoop.start();

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
        sparkleLoop.stop();
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

  const sparkleRotation = sparkleRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

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
            <X size={20} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <Animated.View
            style={[
              styles.sparkleContainer,
              { transform: [{ rotate: sparkleRotation }] },
            ]}
          >
            {[...Array(8)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.sparkle,
                  {
                    transform: [
                      { rotate: `${i * 45}deg` },
                      { translateY: -ORB_SIZE * 0.7 },
                    ],
                  },
                ]}
              >
                <Sparkles size={16} color={rewardColor} style={{ opacity: 0.6 }} />
              </View>
            ))}
          </Animated.View>

          <View style={styles.headerBadge}>
            <Gift size={14} color={rewardColor} />
            <Text style={[styles.headerBadgeText, { color: rewardColor }]}>NEW REWARD</Text>
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
            <Animated.View
              style={[
                styles.orbGlow,
                {
                  backgroundColor: rewardColor,
                  opacity: Animated.multiply(orbGlowAnim, new Animated.Value(0.4)),
                },
              ]}
            />
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
          </Animated.View>

          <Animated.View
            style={[
              styles.textContainer,
              {
                opacity: opacityAnim,
                transform: [{ translateY: textSlideAnim }],
              },
            ]}
          >
            <View style={styles.rarityBadge}>
              <Text style={[styles.rarityText, { color: rewardColor }]}>{reward.rarity}</Text>
            </View>
            <Text style={styles.rewardLabel}>{reward.label}</Text>
            <Text style={styles.achievementText}>{reward.achievement}</Text>
            <Text style={styles.ownedText}>Owned by {reward.ownedBy} of users</Text>
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
              <LinearGradient
                colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
              <View style={[styles.claimButtonBorder, { borderColor: `${rewardColor}50` }]} />
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
    backgroundColor: 'rgba(20, 20, 22, 0.95)',
    borderRadius: 32,
    paddingTop: 48,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.5,
        shadowRadius: 30,
      },
      android: {
        elevation: 25,
      },
    }),
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  sparkleContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.15,
    width: ORB_SIZE * 1.8,
    height: ORB_SIZE * 1.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkle: {
    position: 'absolute',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
  },
  orbContainer: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  orbGlow: {
    position: 'absolute',
    width: ORB_SIZE * 1.3,
    height: ORB_SIZE * 1.3,
    borderRadius: ORB_SIZE * 0.65,
  },
  orbVideoWrapper: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    overflow: 'hidden',
  },
  orbVideo: {
    width: ORB_SIZE,
    height: ORB_SIZE,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  rarityBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  rarityText: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  rewardLabel: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  achievementText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  ownedText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
  buttonContainer: {
    width: '100%',
  },
  claimButton: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  claimButtonBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1.5,
  },
  claimButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

export default RewardUnlockModal;
