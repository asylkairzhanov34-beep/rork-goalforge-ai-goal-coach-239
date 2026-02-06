import React, { useEffect, useRef, useCallback, useState } from 'react';
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
import { X, Sparkles, Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import type { Reward } from '@/constants/rewards';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ORB_SIZE = SCREEN_WIDTH * 0.55;

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
  rotation: Animated.Value;
  startX: number;
  startY: number;
  color: string;
  size: number;
}

const RewardUnlockModalInner: React.FC<RewardUnlockModalProps> = ({ visible, reward, onClose }) => {
  const [videoReady, setVideoReady] = useState(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(0.8)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const orbScale = useRef(new Animated.Value(0)).current;
  const orbOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(40)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslateY = useRef(new Animated.Value(30)).current;
  const glowPulse = useRef(new Animated.Value(0.3)).current;
  const orbFloat = useRef(new Animated.Value(0)).current;
  const shimmerPosition = useRef(new Animated.Value(-1)).current;
  
  const ringScale1 = useRef(new Animated.Value(0.8)).current;
  const ringOpacity1 = useRef(new Animated.Value(0)).current;
  const ringScale2 = useRef(new Animated.Value(0.8)).current;
  const ringOpacity2 = useRef(new Animated.Value(0)).current;
  const ringScale3 = useRef(new Animated.Value(0.8)).current;
  const ringOpacity3 = useRef(new Animated.Value(0)).current;

  const starsOpacity = useRef(new Animated.Value(0)).current;

  const particles = useRef<Particle[]>(
    Array.from({ length: 20 }, (_, i) => {
      const angle = (i / 20) * Math.PI * 2;
      const distance = ORB_SIZE * 0.6 + Math.random() * 40;
      const colors = ['#FFD700', '#FFF', '#FF6B6B', '#60A5FA', '#A78BFA', '#34D399', '#EC4899'];
      return {
        x: new Animated.Value(0),
        y: new Animated.Value(0),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(0),
        rotation: new Animated.Value(0),
        startX: Math.cos(angle) * distance,
        startY: Math.sin(angle) * distance,
        color: colors[i % colors.length],
        size: 4 + Math.random() * 6,
      };
    })
  ).current;

  const glowLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const floatLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const shimmerLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const playEntrance = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setVideoReady(false);
    backdropOpacity.setValue(0);
    contentScale.setValue(0.8);
    contentOpacity.setValue(0);
    orbScale.setValue(0);
    orbOpacity.setValue(0);
    titleOpacity.setValue(0);
    titleTranslateY.setValue(40);
    subtitleOpacity.setValue(0);
    badgeScale.setValue(0);
    buttonOpacity.setValue(0);
    buttonTranslateY.setValue(30);
    ringScale1.setValue(0.8);
    ringOpacity1.setValue(0);
    ringScale2.setValue(0.8);
    ringOpacity2.setValue(0);
    ringScale3.setValue(0.8);
    ringOpacity3.setValue(0);
    starsOpacity.setValue(0);
    particles.forEach(p => {
      p.x.setValue(0);
      p.y.setValue(0);
      p.opacity.setValue(0);
      p.scale.setValue(0);
      p.rotation.setValue(0);
    });

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(contentScale, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.spring(orbScale, {
          toValue: 1,
          tension: 35,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.timing(orbOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();

      // Ring explosions
      const playRing = (scale: Animated.Value, opacity: Animated.Value, delay: number) => {
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scale, { toValue: 2.5, duration: 1000, useNativeDriver: true }),
            Animated.sequence([
              Animated.timing(opacity, { toValue: 0.6, duration: 200, useNativeDriver: true }),
              Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
            ]),
          ]),
        ]).start();
      };

      playRing(ringScale1, ringOpacity1, 0);
      playRing(ringScale2, ringOpacity2, 200);
      playRing(ringScale3, ringOpacity3, 400);

      if (Platform.OS !== 'web') {
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 100);
      }
    }, 200);

    setTimeout(() => {
      particles.forEach((p, i) => {
        Animated.sequence([
          Animated.delay(i * 30),
          Animated.parallel([
            Animated.timing(p.x, { toValue: p.startX, duration: 800, useNativeDriver: true }),
            Animated.timing(p.y, { toValue: p.startY, duration: 800, useNativeDriver: true }),
            Animated.timing(p.rotation, { toValue: 360, duration: 800, useNativeDriver: true }),
            Animated.sequence([
              Animated.timing(p.opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
              Animated.delay(400),
              Animated.timing(p.opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]),
            Animated.sequence([
              Animated.timing(p.scale, { toValue: 1.5, duration: 400, useNativeDriver: true }),
              Animated.timing(p.scale, { toValue: 0, duration: 400, useNativeDriver: true }),
            ]),
          ]),
        ]).start();
      });

      Animated.timing(starsOpacity, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, 400);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(titleTranslateY, { toValue: 0, tension: 40, friction: 7, useNativeDriver: true }),
      ]).start();
    }, 600);

    setTimeout(() => {
      Animated.timing(subtitleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }, 900);

    setTimeout(() => {
      Animated.spring(badgeScale, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }).start();
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }, 1100);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(buttonOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(buttonTranslateY, { toValue: 0, tension: 40, friction: 7, useNativeDriver: true }),
      ]).start();
    }, 1300);

    glowLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 0.7, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0.3, duration: 2000, useNativeDriver: true }),
      ])
    );
    glowLoopRef.current.start();

    floatLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(orbFloat, { toValue: -10, duration: 2500, useNativeDriver: true }),
        Animated.timing(orbFloat, { toValue: 10, duration: 2500, useNativeDriver: true }),
      ])
    );
    floatLoopRef.current.start();

    shimmerLoopRef.current = Animated.loop(
      Animated.timing(shimmerPosition, {
        toValue: 1,
        duration: 2500,
        useNativeDriver: true,
      })
    );
    shimmerLoopRef.current.start();
  }, [backdropOpacity, contentScale, contentOpacity, orbScale, orbOpacity, titleOpacity, titleTranslateY, subtitleOpacity, badgeScale, buttonOpacity, buttonTranslateY, glowPulse, orbFloat, shimmerPosition, ringScale1, ringOpacity1, ringScale2, ringOpacity2, ringScale3, ringOpacity3, starsOpacity, particles]);

  useEffect(() => {
    if (visible && reward) {
      playEntrance();
    } else {
      glowLoopRef.current?.stop();
      floatLoopRef.current?.stop();
      shimmerLoopRef.current?.stop();
    }
    return () => {
      glowLoopRef.current?.stop();
      floatLoopRef.current?.stop();
      shimmerLoopRef.current?.stop();
    };
  }, [visible, reward, playEntrance]);

  const handleClose = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(contentScale, { toValue: 0.9, duration: 250, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [backdropOpacity, contentScale, contentOpacity, onClose]);

  if (!reward) return null;

  const glowColor = reward.color || '#FFD700';

  const shimmerTranslateX = shimmerPosition.interpolate({
    inputRange: [-1, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <LinearGradient
          colors={['#000', `${glowColor}08`, '#000']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        
        <Animated.View style={[styles.starsContainer, { opacity: starsOpacity }]}>
          {[...Array(12)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.starDot,
                {
                  left: `${10 + (i % 4) * 25}%`,
                  top: `${15 + Math.floor(i / 4) * 30}%`,
                  opacity: 0.3 + Math.random() * 0.4,
                  width: 2 + Math.random() * 2,
                  height: 2 + Math.random() * 2,
                },
              ]}
            />
          ))}
        </Animated.View>

        <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.7}>
          <BlurView intensity={40} tint="dark" style={styles.closeButtonBlur}>
            <X size={20} color="rgba(255,255,255,0.8)" />
          </BlurView>
        </TouchableOpacity>

        <Animated.View style={[
          styles.content,
          {
            opacity: contentOpacity,
            transform: [{ scale: contentScale }],
          }
        ]}>
          <View style={styles.topSection}>
            <Animated.View style={[styles.unlockBadge, { opacity: titleOpacity }]}>
              <Sparkles size={14} color={glowColor} />
              <Text style={styles.unlockBadgeText}>REWARD UNLOCKED</Text>
            </Animated.View>
          </View>

          <View style={styles.orbSection}>
            <Animated.View style={[styles.glowRing, {
              opacity: ringOpacity1,
              borderColor: glowColor,
              transform: [{ scale: ringScale1 }],
            }]} />
            <Animated.View style={[styles.glowRing, {
              opacity: ringOpacity2,
              borderColor: glowColor,
              transform: [{ scale: ringScale2 }],
            }]} />
            <Animated.View style={[styles.glowRing, {
              opacity: ringOpacity3,
              borderColor: glowColor,
              transform: [{ scale: ringScale3 }],
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
                    width: p.size,
                    height: p.size,
                    borderRadius: p.size / 2,
                    backgroundColor: p.color,
                    opacity: p.opacity,
                    transform: [
                      { translateX: p.x },
                      { translateY: p.y },
                      { scale: p.scale },
                      { rotate: p.rotation.interpolate({
                        inputRange: [0, 360],
                        outputRange: ['0deg', '360deg'],
                      })},
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
              <View style={[styles.orbBorder, { borderColor: `${glowColor}40` }]}>
                <View style={[styles.orbFallback, { backgroundColor: `${glowColor}20` }]}>
                  <Star size={48} color={glowColor} fill={glowColor} />
                </View>
                <Video
                  source={{ uri: reward.video }}
                  style={[styles.orbVideo, !videoReady && styles.orbVideoHidden]}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay
                  isLooping
                  isMuted
                  onReadyForDisplay={() => setVideoReady(true)}
                />
              </View>
            </Animated.View>
          </View>

          <View style={styles.infoSection}>
            <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleTranslateY }] }}>
              <Text style={[styles.rewardName, { color: glowColor }]}>{reward.label}</Text>
            </Animated.View>

            <Animated.View style={[styles.rarityContainer, { transform: [{ scale: badgeScale }] }]}>
              <LinearGradient
                colors={[`${glowColor}20`, `${glowColor}08`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.rarityGradient}
              />
              <View style={styles.rarityContent}>
                <View style={[styles.rarityDot, { backgroundColor: glowColor }]} />
                <Text style={[styles.rarityText, { color: glowColor }]}>{reward.rarity}</Text>
                <View style={styles.raritySeparator} />
                <Text style={styles.ownedByText}>Owned by {reward.ownedBy}</Text>
              </View>
            </Animated.View>

            <Animated.View style={{ opacity: subtitleOpacity }}>
              <Text style={styles.achievementText}>{reward.achievement}</Text>
            </Animated.View>
          </View>

          <Animated.View style={[styles.buttonSection, {
            opacity: buttonOpacity,
            transform: [{ translateY: buttonTranslateY }],
          }]}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleClose}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[glowColor, `${glowColor}CC`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButtonGradient}
              />
              <Animated.View style={[styles.buttonShimmer, { transform: [{ translateX: shimmerTranslateX }] }]} />
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export const RewardUnlockModal = React.memo(RewardUnlockModalInner);
RewardUnlockModal.displayName = 'RewardUnlockModal';

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.97)',
  },
  starsContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  starDot: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  closeButtonBlur: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  topSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  unlockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  unlockBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
  },
  orbSection: {
    width: ORB_SIZE + 100,
    height: ORB_SIZE + 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  orbGlow: {
    position: 'absolute',
    width: ORB_SIZE + 80,
    height: ORB_SIZE + 80,
    borderRadius: (ORB_SIZE + 80) / 2,
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
  },
  orbWrapper: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbBorder: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    borderWidth: 3,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbFallback: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: ORB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbVideo: {
    width: ORB_SIZE - 6,
    height: ORB_SIZE - 6,
    borderRadius: (ORB_SIZE - 6) / 2,
  },
  orbVideoHidden: {
    position: 'absolute',
    opacity: 0,
  },
  infoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  rewardName: {
    fontSize: 36,
    fontWeight: '800' as const,
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
  },
  rarityContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  rarityGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  rarityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  rarityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  rarityText: {
    fontSize: 14,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  raritySeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  ownedByText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500' as const,
  },
  achievementText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  buttonSection: {
    width: '100%',
    paddingHorizontal: 20,
  },
  primaryButton: {
    width: '100%',
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  primaryButtonGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  buttonShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: 'rgba(255,255,255,0.25)',
    transform: [{ skewX: '-20deg' }],
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#000',
    letterSpacing: 0.5,
  },
});
