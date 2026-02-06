import React, { useEffect, useRef, useCallback } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { X, RefreshCw, Trophy } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { Reward } from '@/constants/rewards';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ORB_SIZE = SCREEN_WIDTH * 0.6;

interface RewardUnlockModalProps {
  visible: boolean;
  reward: Reward | null;
  onClose: () => void;
}

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  startX: number;
  startY: number;
  color: string;
}

const RewardUnlockModalInner: React.FC<RewardUnlockModalProps> = ({ visible, reward, onClose }) => {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const orbScale = useRef(new Animated.Value(0)).current;
  const orbOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(30)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslateY = useRef(new Animated.Value(20)).current;
  const glowPulse = useRef(new Animated.Value(0.4)).current;
  const orbFloat = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0)).current;
  const ringOpacity = useRef(new Animated.Value(0.8)).current;
  const ring2Scale = useRef(new Animated.Value(0)).current;
  const ring2Opacity = useRef(new Animated.Value(0.6)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;

  const particles = useRef<Particle[]>(
    Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2;
      const colors = ['#FFD700', '#FF6B6B', '#60A5FA', '#A78BFA', '#34D399', '#EC4899', '#22D3EE'];
      return {
        x: new Animated.Value(0),
        y: new Animated.Value(0),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(0),
        startX: Math.cos(angle) * (ORB_SIZE * 0.7),
        startY: Math.sin(angle) * (ORB_SIZE * 0.7),
        color: colors[i % colors.length],
      };
    })
  ).current;

  const glowLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const floatLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const playEntrance = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    backdropOpacity.setValue(0);
    orbScale.setValue(0);
    orbOpacity.setValue(0);
    titleOpacity.setValue(0);
    titleTranslateY.setValue(30);
    subtitleOpacity.setValue(0);
    buttonOpacity.setValue(0);
    buttonTranslateY.setValue(20);
    ringScale.setValue(0);
    ringOpacity.setValue(0.8);
    ring2Scale.setValue(0);
    ring2Opacity.setValue(0.6);
    badgeScale.setValue(0);
    particles.forEach(p => {
      p.x.setValue(0);
      p.y.setValue(0);
      p.opacity.setValue(0);
      p.scale.setValue(0);
    });

    Animated.timing(backdropOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.spring(orbScale, {
          toValue: 1,
          tension: 40,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(orbOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.sequence([
        Animated.delay(200),
        Animated.parallel([
          Animated.timing(ringScale, { toValue: 2.5, duration: 800, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0, duration: 800, useNativeDriver: true }),
        ]),
      ]).start();

      Animated.sequence([
        Animated.delay(400),
        Animated.parallel([
          Animated.timing(ring2Scale, { toValue: 3, duration: 900, useNativeDriver: true }),
          Animated.timing(ring2Opacity, { toValue: 0, duration: 900, useNativeDriver: true }),
        ]),
      ]).start();

      if (Platform.OS !== 'web') {
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 200);
      }
    }, 300);

    setTimeout(() => {
      particles.forEach((p, i) => {
        Animated.sequence([
          Animated.delay(i * 40),
          Animated.parallel([
            Animated.timing(p.x, { toValue: p.startX, duration: 600, useNativeDriver: true }),
            Animated.timing(p.y, { toValue: p.startY, duration: 600, useNativeDriver: true }),
            Animated.sequence([
              Animated.timing(p.opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
              Animated.delay(200),
              Animated.timing(p.opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]),
            Animated.sequence([
              Animated.timing(p.scale, { toValue: 1.5, duration: 300, useNativeDriver: true }),
              Animated.timing(p.scale, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]),
          ]),
        ]).start();
      });
    }, 600);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(titleTranslateY, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]).start();
    }, 700);

    setTimeout(() => {
      Animated.timing(subtitleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, 1000);

    setTimeout(() => {
      Animated.spring(badgeScale, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }).start();
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }, 1100);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(buttonOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(buttonTranslateY, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]).start();
    }, 1300);

    glowLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 0.8, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0.4, duration: 1500, useNativeDriver: true }),
      ])
    );
    glowLoopRef.current.start();

    floatLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(orbFloat, { toValue: -8, duration: 2000, useNativeDriver: true }),
        Animated.timing(orbFloat, { toValue: 8, duration: 2000, useNativeDriver: true }),
      ])
    );
    floatLoopRef.current.start();
  }, [backdropOpacity, orbScale, orbOpacity, titleOpacity, titleTranslateY, subtitleOpacity, buttonOpacity, buttonTranslateY, glowPulse, orbFloat, ringScale, ringOpacity, ring2Scale, ring2Opacity, badgeScale, particles]);

  useEffect(() => {
    if (visible && reward) {
      playEntrance();
    } else {
      glowLoopRef.current?.stop();
      floatLoopRef.current?.stop();
    }
    return () => {
      glowLoopRef.current?.stop();
      floatLoopRef.current?.stop();
    };
  }, [visible, reward, playEntrance]);

  const handleClose = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(orbScale, { toValue: 0.8, duration: 250, useNativeDriver: true }),
      Animated.timing(orbOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [backdropOpacity, orbScale, orbOpacity, onClose]);

  const handleReplay = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    playEntrance();
  }, [playEntrance]);

  if (!reward) return null;

  const glowColor = reward.color || '#FFD700';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <LinearGradient
          colors={[`${glowColor}15`, '#000000', '#000000', `${glowColor}08`]}
          locations={[0, 0.3, 0.7, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.7}>
          <X size={24} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>

        <View style={styles.content}>
          <Animated.View style={[styles.topLabels, { opacity: titleOpacity, transform: [{ translateY: titleTranslateY }] }]}>
            <Text style={styles.unlockLabel}>Reward Unlocked</Text>
            <Text style={[styles.rewardName, { textShadowColor: glowColor }]}>{reward.label.toUpperCase()}</Text>
          </Animated.View>

          <Animated.View style={[styles.descriptionWrap, { opacity: subtitleOpacity }]}>
            <Text style={styles.description}>{reward.achievement}</Text>
          </Animated.View>

          <View style={styles.orbArea}>
            <Animated.View style={[styles.glowRing, {
              opacity: ringOpacity,
              borderColor: glowColor,
              transform: [{ scale: ringScale }],
            }]} />
            <Animated.View style={[styles.glowRing, {
              opacity: ring2Opacity,
              borderColor: glowColor,
              transform: [{ scale: ring2Scale }],
            }]} />

            <Animated.View style={[styles.orbGlow, {
              opacity: glowPulse,
              backgroundColor: glowColor,
            }]} />

            {particles.map((p, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.particle,
                  {
                    backgroundColor: p.color,
                    opacity: p.opacity,
                    transform: [
                      { translateX: p.x },
                      { translateY: p.y },
                      { scale: p.scale },
                    ],
                  },
                ]}
              />
            ))}

            <Animated.View style={[styles.orbWrapper, {
              opacity: orbOpacity,
              transform: [
                { scale: orbScale },
                { translateY: orbFloat },
              ],
            }]}>
              <Video
                source={{ uri: reward.video }}
                style={styles.orbVideo}
                resizeMode={ResizeMode.COVER}
                shouldPlay
                isLooping
                isMuted
              />
            </Animated.View>
          </View>

          <Animated.View style={[styles.rarityBadge, {
            borderColor: `${glowColor}40`,
            transform: [{ scale: badgeScale }],
          }]}>
            <Trophy size={14} color={glowColor} />
            <Text style={[styles.rarityText, { color: glowColor }]}>{reward.rarity}</Text>
            <View style={[styles.rarityDot, { backgroundColor: glowColor }]} />
            <Text style={styles.ownedByText}>Owned by {reward.ownedBy}</Text>
          </Animated.View>

          <Animated.View style={[styles.buttonsArea, {
            opacity: buttonOpacity,
            transform: [{ translateY: buttonTranslateY }],
          }]}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: glowColor }]}
              onPress={handleClose}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Awesome!</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.replayButton} onPress={handleReplay} activeOpacity={0.7}>
              <RefreshCw size={16} color="rgba(255,255,255,0.5)" />
              <Text style={styles.replayText}>Replay</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
};

export const RewardUnlockModal = React.memo(RewardUnlockModalInner);
RewardUnlockModal.displayName = 'RewardUnlockModal';

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  topLabels: {
    alignItems: 'center',
    marginBottom: 8,
  },
  unlockLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  rewardName: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: 2,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  descriptionWrap: {
    marginBottom: 24,
  },
  description: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 22,
  },
  orbArea: {
    width: ORB_SIZE + 80,
    height: ORB_SIZE + 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  orbGlow: {
    position: 'absolute',
    width: ORB_SIZE + 60,
    height: ORB_SIZE + 60,
    borderRadius: (ORB_SIZE + 60) / 2,
  },
  glowRing: {
    position: 'absolute',
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    borderWidth: 2,
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  orbWrapper: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    overflow: 'hidden',
  },
  orbVideo: {
    width: ORB_SIZE,
    height: ORB_SIZE,
  },
  rarityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    gap: 8,
    marginBottom: 32,
  },
  rarityText: {
    fontSize: 14,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  rarityDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  ownedByText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
  buttonsArea: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  primaryButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#000',
    letterSpacing: 0.3,
  },
  replayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  replayText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500' as const,
  },
});
