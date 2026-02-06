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
import { X, Sparkles, Crown, Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import type { Reward } from '@/constants/rewards';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ORB_SIZE = SCREEN_WIDTH * 0.52;

interface RewardUnlockModalProps {
  visible: boolean;
  reward: Reward | null;
  onClose: () => void;
}

interface FloatingParticle {
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  startX: number;
  startY: number;
  size: number;
}

const RewardUnlockModalInner: React.FC<RewardUnlockModalProps> = ({ visible, reward, onClose }) => {
  const [videoReady, setVideoReady] = useState(false);
  
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(50)).current;
  
  const orbScale = useRef(new Animated.Value(0.3)).current;
  const orbOpacity = useRef(new Animated.Value(0)).current;
  const orbGlowPulse = useRef(new Animated.Value(0.4)).current;
  const orbFloat = useRef(new Animated.Value(0)).current;
  
  const ringScale1 = useRef(new Animated.Value(0.5)).current;
  const ringOpacity1 = useRef(new Animated.Value(0)).current;
  const ringScale2 = useRef(new Animated.Value(0.5)).current;
  const ringOpacity2 = useRef(new Animated.Value(0)).current;
  const ringScale3 = useRef(new Animated.Value(0.5)).current;
  const ringOpacity3 = useRef(new Animated.Value(0)).current;
  
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(30)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;
  const descOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslateY = useRef(new Animated.Value(20)).current;
  
  const shimmerPosition = useRef(new Animated.Value(-1)).current;
  const crownRotate = useRef(new Animated.Value(0)).current;

  const floatingParticles = useRef<FloatingParticle[]>(
    Array.from({ length: 16 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
      startX: (Math.random() - 0.5) * SCREEN_WIDTH * 0.8,
      startY: (Math.random() - 0.5) * 300,
      size: 3 + Math.random() * 5,
    }))
  ).current;

  const loopRefs = useRef<Animated.CompositeAnimation[]>([]);

  const stopAllLoops = useCallback(() => {
    loopRefs.current.forEach(loop => loop?.stop());
    loopRefs.current = [];
  }, []);

  const playEntrance = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setVideoReady(false);
    
    backdropOpacity.setValue(0);
    contentOpacity.setValue(0);
    contentTranslateY.setValue(50);
    orbScale.setValue(0.3);
    orbOpacity.setValue(0);
    ringScale1.setValue(0.5);
    ringOpacity1.setValue(0);
    ringScale2.setValue(0.5);
    ringOpacity2.setValue(0);
    ringScale3.setValue(0.5);
    ringOpacity3.setValue(0);
    titleOpacity.setValue(0);
    titleTranslateY.setValue(30);
    badgeScale.setValue(0);
    descOpacity.setValue(0);
    buttonOpacity.setValue(0);
    buttonTranslateY.setValue(20);
    shimmerPosition.setValue(-1);
    crownRotate.setValue(0);
    floatingParticles.forEach(p => {
      p.x.setValue(0);
      p.y.setValue(0);
      p.opacity.setValue(0);
      p.scale.setValue(0);
    });

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(contentTranslateY, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.spring(orbScale, {
          toValue: 1,
          tension: 30,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.timing(orbOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();

      const playRingExplosion = (scale: Animated.Value, opacity: Animated.Value, delay: number) => {
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scale, { toValue: 2.8, duration: 1200, useNativeDriver: true }),
            Animated.sequence([
              Animated.timing(opacity, { toValue: 0.7, duration: 150, useNativeDriver: true }),
              Animated.timing(opacity, { toValue: 0, duration: 1050, useNativeDriver: true }),
            ]),
          ]),
        ]).start();
      };

      playRingExplosion(ringScale1, ringOpacity1, 0);
      playRingExplosion(ringScale2, ringOpacity2, 150);
      playRingExplosion(ringScale3, ringOpacity3, 300);

      if (Platform.OS !== 'web') {
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 80);
      }
    }, 200);

    setTimeout(() => {
      floatingParticles.forEach((p, i) => {
        Animated.sequence([
          Animated.delay(i * 50),
          Animated.parallel([
            Animated.timing(p.x, { toValue: p.startX, duration: 2000, useNativeDriver: true }),
            Animated.timing(p.y, { toValue: p.startY - 100, duration: 2000, useNativeDriver: true }),
            Animated.sequence([
              Animated.timing(p.opacity, { toValue: 0.8, duration: 400, useNativeDriver: true }),
              Animated.delay(1200),
              Animated.timing(p.opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
            ]),
            Animated.sequence([
              Animated.timing(p.scale, { toValue: 1.2, duration: 600, useNativeDriver: true }),
              Animated.timing(p.scale, { toValue: 0.5, duration: 1400, useNativeDriver: true }),
            ]),
          ]),
        ]).start();
      });
    }, 300);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(titleTranslateY, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]).start();
    }, 500);

    setTimeout(() => {
      Animated.spring(badgeScale, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }).start();
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }, 700);

    setTimeout(() => {
      Animated.timing(descOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, 900);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(buttonOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(buttonTranslateY, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]).start();
    }, 1100);

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(orbGlowPulse, { toValue: 0.8, duration: 1800, useNativeDriver: true }),
        Animated.timing(orbGlowPulse, { toValue: 0.4, duration: 1800, useNativeDriver: true }),
      ])
    );
    glowLoop.start();
    loopRefs.current.push(glowLoop);

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(orbFloat, { toValue: -8, duration: 2000, useNativeDriver: true }),
        Animated.timing(orbFloat, { toValue: 8, duration: 2000, useNativeDriver: true }),
      ])
    );
    floatLoop.start();
    loopRefs.current.push(floatLoop);

    const shimmerLoop = Animated.loop(
      Animated.timing(shimmerPosition, {
        toValue: 1,
        duration: 2500,
        useNativeDriver: true,
      })
    );
    shimmerLoop.start();
    loopRefs.current.push(shimmerLoop);

    const crownLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(crownRotate, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(crownRotate, { toValue: -1, duration: 3000, useNativeDriver: true }),
        Animated.timing(crownRotate, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    );
    crownLoop.start();
    loopRefs.current.push(crownLoop);
  }, [backdropOpacity, contentOpacity, contentTranslateY, orbScale, orbOpacity, orbGlowPulse, orbFloat, ringScale1, ringOpacity1, ringScale2, ringOpacity2, ringScale3, ringOpacity3, titleOpacity, titleTranslateY, badgeScale, descOpacity, buttonOpacity, buttonTranslateY, shimmerPosition, crownRotate, floatingParticles]);

  useEffect(() => {
    if (visible && reward) {
      playEntrance();
    } else {
      stopAllLoops();
    }
    return () => stopAllLoops();
  }, [visible, reward, playEntrance, stopAllLoops]);

  const handleClose = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    stopAllLoops();
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(contentTranslateY, { toValue: 30, duration: 250, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [backdropOpacity, contentOpacity, contentTranslateY, onClose, stopAllLoops]);

  if (!reward) return null;

  const glowColor = reward.color || '#FFD700';
  
  const shimmerTranslateX = shimmerPosition.interpolate({
    inputRange: [-1, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  const crownRotation = crownRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-8deg', '0deg', '8deg'],
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <LinearGradient
          colors={['#000', `${glowColor}06`, '#000']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        
        <View style={styles.starsField}>
          {[...Array(20)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.starDot,
                {
                  left: `${5 + (i % 5) * 20 + Math.random() * 10}%`,
                  top: `${10 + Math.floor(i / 5) * 20 + Math.random() * 10}%`,
                  opacity: 0.2 + Math.random() * 0.3,
                  width: 1 + Math.random() * 2,
                  height: 1 + Math.random() * 2,
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.7}>
          <BlurView intensity={30} tint="dark" style={styles.closeButtonBlur}>
            <X size={18} color="rgba(255,255,255,0.7)" />
          </BlurView>
        </TouchableOpacity>

        <Animated.View style={[
          styles.content,
          {
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslateY }],
          }
        ]}>
          <View style={styles.headerSection}>
            <Animated.View style={[styles.crownBadge, { transform: [{ rotate: crownRotation }] }]}>
              <LinearGradient
                colors={[`${glowColor}40`, `${glowColor}15`]}
                style={styles.crownBadgeGradient}
              />
              <Crown size={18} color={glowColor} fill={`${glowColor}40`} />
            </Animated.View>
            
            <Animated.View style={[styles.unlockLabel, { opacity: titleOpacity }]}>
              <Sparkles size={12} color={glowColor} />
              <Text style={[styles.unlockLabelText, { color: glowColor }]}>REWARD UNLOCKED</Text>
              <Sparkles size={12} color={glowColor} />
            </Animated.View>
          </View>

          <View style={styles.orbSection}>
            {floatingParticles.map((p, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.floatingParticle,
                  {
                    width: p.size,
                    height: p.size,
                    borderRadius: p.size / 2,
                    backgroundColor: glowColor,
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
              opacity: orbGlowPulse,
              backgroundColor: glowColor,
            }]} />

            <Animated.View style={[styles.orbContainer, {
              opacity: orbOpacity,
              transform: [
                { scale: orbScale },
                { translateY: orbFloat },
              ],
            }]}>
              <View style={[styles.orbBorder, { borderColor: `${glowColor}50` }]}>
                <View style={[styles.orbFallback, { backgroundColor: `${glowColor}15` }]}>
                  <Star size={40} color={glowColor} fill={`${glowColor}60`} />
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
              
              <View style={[styles.orbInnerGlow, { shadowColor: glowColor }]} />
            </Animated.View>
          </View>

          <View style={styles.infoSection}>
            <Animated.Text style={[
              styles.rewardName,
              { color: glowColor, opacity: titleOpacity, transform: [{ translateY: titleTranslateY }] }
            ]}>
              {reward.label}
            </Animated.Text>

            <Animated.View style={[styles.rarityBadge, { transform: [{ scale: badgeScale }] }]}>
              <LinearGradient
                colors={[`${glowColor}25`, `${glowColor}08`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.rarityGradient}
              />
              <View style={styles.rarityInner}>
                <View style={[styles.rarityDot, { backgroundColor: glowColor }]} />
                <Text style={[styles.rarityText, { color: glowColor }]}>{reward.rarity}</Text>
                <View style={styles.rarityDivider} />
                <Text style={styles.ownedText}>Owned by {reward.ownedBy}</Text>
              </View>
            </Animated.View>

            <Animated.Text style={[styles.achievementText, { opacity: descOpacity }]}>
              {reward.achievement}
            </Animated.Text>
          </View>

          <Animated.View style={[styles.buttonSection, {
            opacity: buttonOpacity,
            transform: [{ translateY: buttonTranslateY }],
          }]}>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleClose}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[glowColor, `${glowColor}DD`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.continueButtonGradient}
              />
              <Animated.View style={[styles.buttonShimmer, { transform: [{ translateX: shimmerTranslateX }] }]} />
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
            
            <Text style={styles.tapHint}>Tap to continue your journey</Text>
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
  starsField: {
    ...StyleSheet.absoluteFillObject,
  },
  starDot: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
  },
  closeButtonBlur: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  crownBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  crownBadgeGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 25,
  },
  unlockLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  unlockLabelText: {
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: 3,
  },
  orbSection: {
    width: ORB_SIZE + 120,
    height: ORB_SIZE + 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  floatingParticle: {
    position: 'absolute',
  },
  orbGlow: {
    position: 'absolute',
    width: ORB_SIZE + 70,
    height: ORB_SIZE + 70,
    borderRadius: (ORB_SIZE + 70) / 2,
  },
  glowRing: {
    position: 'absolute',
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    borderWidth: 2,
  },
  orbContainer: {
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
  orbInnerGlow: {
    position: 'absolute',
    width: ORB_SIZE - 20,
    height: ORB_SIZE - 20,
    borderRadius: (ORB_SIZE - 20) / 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
  },
  infoSection: {
    alignItems: 'center',
    marginBottom: 36,
  },
  rewardName: {
    fontSize: 34,
    fontWeight: '800' as const,
    letterSpacing: 1,
    marginBottom: 14,
    textAlign: 'center',
  },
  rarityBadge: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 14,
  },
  rarityGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  rarityInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
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
  rarityDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  ownedText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500' as const,
  },
  achievementText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 22,
  },
  buttonSection: {
    width: '100%',
    alignItems: 'center',
  },
  continueButton: {
    width: '100%',
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  continueButtonGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  buttonShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 120,
    backgroundColor: 'rgba(255,255,255,0.3)',
    transform: [{ skewX: '-20deg' }],
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#000',
    letterSpacing: 0.5,
  },
  tapHint: {
    marginTop: 14,
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '400' as const,
  },
});
