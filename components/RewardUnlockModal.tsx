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
import { X, Sparkles, Crown, Star, Trophy, Gem } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import type { Reward } from '@/constants/rewards';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ORB_SIZE = SCREEN_WIDTH * 0.48;

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
  rotation: Animated.Value;
  startX: number;
  startY: number;
  size: number;
  type: 'dot' | 'sparkle' | 'ring';
}

const RARITY_CONFIG: Record<string, { icon: typeof Crown; gradient: string[]; label: string }> = {
  Common: { icon: Star, gradient: ['#A0A0A0', '#707070'], label: 'COMMON' },
  Rare: { icon: Gem, gradient: ['#60A5FA', '#3B82F6'], label: 'RARE' },
  Epic: { icon: Trophy, gradient: ['#A78BFA', '#7C3AED'], label: 'EPIC' },
  Legendary: { icon: Crown, gradient: ['#FBBF24', '#F59E0B'], label: 'LEGENDARY' },
  Mythic: { icon: Crown, gradient: ['#F472B6', '#EC4899'], label: 'MYTHIC' },
  Eternal: { icon: Crown, gradient: ['#14B8A6', '#0D9488'], label: 'ETERNAL' },
};

const RewardUnlockModalInner: React.FC<RewardUnlockModalProps> = ({ visible, reward, onClose }) => {
  const [videoReady, setVideoReady] = useState(false);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(60)).current;

  const orbScale = useRef(new Animated.Value(0.1)).current;
  const orbOpacity = useRef(new Animated.Value(0)).current;
  const orbGlowPulse = useRef(new Animated.Value(0.2)).current;
  const orbFloat = useRef(new Animated.Value(0)).current;
  const orbRotate = useRef(new Animated.Value(0)).current;

  const ringScale1 = useRef(new Animated.Value(0.5)).current;
  const ringOpacity1 = useRef(new Animated.Value(0)).current;
  const ringScale2 = useRef(new Animated.Value(0.5)).current;
  const ringOpacity2 = useRef(new Animated.Value(0)).current;
  const ringScale3 = useRef(new Animated.Value(0.5)).current;
  const ringOpacity3 = useRef(new Animated.Value(0)).current;

  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(30)).current;
  const titleScale = useRef(new Animated.Value(0.8)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;
  const descOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslateY = useRef(new Animated.Value(30)).current;

  const shimmerPosition = useRef(new Animated.Value(-1)).current;
  const crownRotate = useRef(new Animated.Value(0)).current;
  const crownScale = useRef(new Animated.Value(0)).current;

  const lineGlow1 = useRef(new Animated.Value(0)).current;
  const lineGlow2 = useRef(new Animated.Value(0)).current;

  const rarityBarWidth = useRef(new Animated.Value(0)).current;

  const floatingParticles = useRef<FloatingParticle[]>(
    Array.from({ length: 24 }, (_, i) => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
      rotation: new Animated.Value(0),
      startX: (Math.random() - 0.5) * SCREEN_WIDTH,
      startY: (Math.random() - 0.5) * SCREEN_HEIGHT * 0.5,
      size: 2 + Math.random() * 6,
      type: i < 8 ? 'sparkle' : i < 16 ? 'dot' : 'ring' as const,
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
    contentTranslateY.setValue(60);
    orbScale.setValue(0.1);
    orbOpacity.setValue(0);
    orbRotate.setValue(0);
    ringScale1.setValue(0.5);
    ringOpacity1.setValue(0);
    ringScale2.setValue(0.5);
    ringOpacity2.setValue(0);
    ringScale3.setValue(0.5);
    ringOpacity3.setValue(0);
    titleOpacity.setValue(0);
    titleTranslateY.setValue(30);
    titleScale.setValue(0.8);
    badgeScale.setValue(0);
    descOpacity.setValue(0);
    buttonOpacity.setValue(0);
    buttonTranslateY.setValue(30);
    shimmerPosition.setValue(-1);
    crownRotate.setValue(0);
    crownScale.setValue(0);
    lineGlow1.setValue(0);
    lineGlow2.setValue(0);
    rarityBarWidth.setValue(0);
    floatingParticles.forEach(p => {
      p.x.setValue(0);
      p.y.setValue(0);
      p.opacity.setValue(0);
      p.scale.setValue(0);
      p.rotation.setValue(0);
    });

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(contentTranslateY, {
        toValue: 0,
        tension: 35,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.spring(orbScale, {
          toValue: 1,
          tension: 25,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.timing(orbOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }

      const playRingExplosion = (scale: Animated.Value, opacity: Animated.Value, delay: number) => {
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scale, { toValue: 3.2, duration: 1400, useNativeDriver: true }),
            Animated.sequence([
              Animated.timing(opacity, { toValue: 0.8, duration: 120, useNativeDriver: true }),
              Animated.timing(opacity, { toValue: 0, duration: 1280, useNativeDriver: true }),
            ]),
          ]),
        ]).start();
      };

      playRingExplosion(ringScale1, ringOpacity1, 0);
      playRingExplosion(ringScale2, ringOpacity2, 120);
      playRingExplosion(ringScale3, ringOpacity3, 240);
    }, 250);

    setTimeout(() => {
      floatingParticles.forEach((p, i) => {
        const delay = i * 40;
        const duration = 2500 + Math.random() * 1000;
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(p.x, { toValue: p.startX, duration, useNativeDriver: true }),
            Animated.timing(p.y, { toValue: p.startY - 80 - Math.random() * 80, duration, useNativeDriver: true }),
            Animated.sequence([
              Animated.timing(p.opacity, { toValue: 0.9, duration: 300, useNativeDriver: true }),
              Animated.delay(duration * 0.5),
              Animated.timing(p.opacity, { toValue: 0, duration: duration * 0.3, useNativeDriver: true }),
            ]),
            Animated.sequence([
              Animated.spring(p.scale, { toValue: 1.5, tension: 40, friction: 5, useNativeDriver: true }),
              Animated.timing(p.scale, { toValue: 0.3, duration: duration * 0.6, useNativeDriver: true }),
            ]),
            Animated.timing(p.rotation, { toValue: Math.random() * 4, duration, useNativeDriver: true }),
          ]),
        ]).start();
      });
    }, 350);

    setTimeout(() => {
      Animated.parallel([
        Animated.spring(crownScale, { toValue: 1, tension: 50, friction: 5, useNativeDriver: true }),
      ]).start();
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }, 400);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(lineGlow1, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(lineGlow2, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]).start();
    }, 500);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(titleTranslateY, { toValue: 0, tension: 40, friction: 7, useNativeDriver: true }),
        Animated.spring(titleScale, { toValue: 1, tension: 40, friction: 7, useNativeDriver: true }),
      ]).start();
    }, 600);

    setTimeout(() => {
      Animated.spring(badgeScale, { toValue: 1, tension: 60, friction: 5, useNativeDriver: true }).start();
      Animated.timing(rarityBarWidth, { toValue: 1, duration: 800, useNativeDriver: false }).start();
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }, 800);

    setTimeout(() => {
      Animated.timing(descOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }, 1000);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(buttonOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(buttonTranslateY, { toValue: 0, tension: 40, friction: 7, useNativeDriver: true }),
      ]).start();
    }, 1200);

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(orbGlowPulse, { toValue: 0.7, duration: 2200, useNativeDriver: true }),
        Animated.timing(orbGlowPulse, { toValue: 0.25, duration: 2200, useNativeDriver: true }),
      ])
    );
    glowLoop.start();
    loopRefs.current.push(glowLoop);

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(orbFloat, { toValue: -10, duration: 2500, useNativeDriver: true }),
        Animated.timing(orbFloat, { toValue: 10, duration: 2500, useNativeDriver: true }),
      ])
    );
    floatLoop.start();
    loopRefs.current.push(floatLoop);

    const rotateLoop = Animated.loop(
      Animated.timing(orbRotate, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    );
    rotateLoop.start();
    loopRefs.current.push(rotateLoop);

    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerPosition, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.delay(1000),
        Animated.timing(shimmerPosition, {
          toValue: -1,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    shimmerLoop.start();
    loopRefs.current.push(shimmerLoop);

    const crownLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(crownRotate, { toValue: 1, duration: 4000, useNativeDriver: true }),
        Animated.timing(crownRotate, { toValue: -1, duration: 4000, useNativeDriver: true }),
        Animated.timing(crownRotate, { toValue: 0, duration: 4000, useNativeDriver: true }),
      ])
    );
    crownLoop.start();
    loopRefs.current.push(crownLoop);

    const lineLoop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(lineGlow1, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
        Animated.timing(lineGlow1, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    );
    lineLoop1.start();
    loopRefs.current.push(lineLoop1);

    const lineLoop2 = Animated.loop(
      Animated.sequence([
        Animated.timing(lineGlow2, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(lineGlow2, { toValue: 0.3, duration: 1800, useNativeDriver: true }),
      ])
    );
    lineLoop2.start();
    loopRefs.current.push(lineLoop2);
  }, [backdropOpacity, contentOpacity, contentTranslateY, orbScale, orbOpacity, orbGlowPulse, orbFloat, orbRotate, ringScale1, ringOpacity1, ringScale2, ringOpacity2, ringScale3, ringOpacity3, titleOpacity, titleTranslateY, titleScale, badgeScale, descOpacity, buttonOpacity, buttonTranslateY, shimmerPosition, crownRotate, crownScale, lineGlow1, lineGlow2, rarityBarWidth, floatingParticles]);

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
      Animated.timing(backdropOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(orbScale, { toValue: 1.3, duration: 300, useNativeDriver: true }),
      Animated.timing(orbOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [backdropOpacity, contentOpacity, orbScale, orbOpacity, onClose, stopAllLoops]);

  if (!reward) return null;

  const glowColor = reward.color || '#FFD700';
  const rarityConfig = RARITY_CONFIG[reward.rarity] || RARITY_CONFIG.Common;
  const RarityIcon = rarityConfig.icon;

  const shimmerTranslateX = shimmerPosition.interpolate({
    inputRange: [-1, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  const crownRotation = crownRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-10deg', '0deg', '10deg'],
  });

  const orbRotation = orbRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <LinearGradient
          colors={['#000', `${glowColor}08`, '#000', `${glowColor}04`, '#000']}
          locations={[0, 0.3, 0.5, 0.7, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.starsField}>
          {[...Array(30)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.starDot,
                {
                  left: `${3 + (i % 6) * 16 + Math.random() * 8}%`,
                  top: `${5 + Math.floor(i / 6) * 18 + Math.random() * 8}%`,
                  opacity: 0.15 + Math.random() * 0.35,
                  width: 1 + Math.random() * 2.5,
                  height: 1 + Math.random() * 2.5,
                },
              ]}
            />
          ))}
        </View>

        <Animated.View style={[styles.lineGlowLeft, { opacity: lineGlow1, backgroundColor: glowColor }]} />
        <Animated.View style={[styles.lineGlowRight, { opacity: lineGlow2, backgroundColor: glowColor }]} />

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
            <Animated.View style={[
              styles.crownContainer,
              {
                transform: [
                  { rotate: crownRotation },
                  { scale: crownScale },
                ],
              }
            ]}>
              <LinearGradient
                colors={[`${glowColor}50`, `${glowColor}10`]}
                style={styles.crownGradient}
              />
              <View style={[styles.crownInnerGlow, { shadowColor: glowColor }]} />
              <Crown size={22} color={glowColor} fill={`${glowColor}60`} />
            </Animated.View>

            <Animated.View style={[styles.unlockLabel, { opacity: titleOpacity }]}>
              <View style={[styles.unlockLine, { backgroundColor: `${glowColor}40` }]} />
              <Sparkles size={11} color={glowColor} />
              <Text style={[styles.unlockLabelText, { color: glowColor }]}>REWARD UNLOCKED</Text>
              <Sparkles size={11} color={glowColor} />
              <View style={[styles.unlockLine, { backgroundColor: `${glowColor}40` }]} />
            </Animated.View>
          </View>

          <View style={styles.orbSection}>
            {floatingParticles.map((p, i) => {
              const rotationInterp = p.rotation.interpolate({
                inputRange: [0, 4],
                outputRange: ['0deg', '720deg'],
              });
              return (
                <Animated.View
                  key={i}
                  style={[
                    styles.floatingParticle,
                    {
                      width: p.size,
                      height: p.size,
                      borderRadius: p.type === 'ring' ? p.size / 2 : p.size / 2,
                      backgroundColor: p.type === 'ring' ? 'transparent' : glowColor,
                      borderWidth: p.type === 'ring' ? 1 : 0,
                      borderColor: p.type === 'ring' ? glowColor : 'transparent',
                      opacity: p.opacity,
                      transform: [
                        { translateX: p.x },
                        { translateY: p.y },
                        { scale: p.scale },
                        { rotate: rotationInterp },
                      ],
                    },
                  ]}
                />
              );
            })}

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
              borderColor: `${glowColor}80`,
              transform: [{ scale: ringScale3 }],
            }]} />

            <Animated.View style={[styles.orbOuterGlow, {
              opacity: orbGlowPulse,
              backgroundColor: glowColor,
            }]} />

            <Animated.View style={[styles.orbMidGlow, {
              opacity: orbGlowPulse,
              shadowColor: glowColor,
            }]} />

            <Animated.View style={[styles.orbContainer, {
              opacity: orbOpacity,
              transform: [
                { scale: orbScale },
                { translateY: orbFloat },
              ],
            }]}>
              <Animated.View style={[styles.orbRotateRing, {
                borderColor: `${glowColor}30`,
                transform: [{ rotate: orbRotation }],
              }]}>
                <View style={[styles.orbRotateDot, { backgroundColor: glowColor }]} />
              </Animated.View>

              <View style={[styles.orbBorder, { borderColor: `${glowColor}60` }]}>
                <View style={[styles.orbFallback, { backgroundColor: `${glowColor}15` }]}>
                  <Star size={44} color={glowColor} fill={`${glowColor}60`} />
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

              <View style={[styles.orbInnerShadow, { shadowColor: glowColor }]} />
            </Animated.View>
          </View>

          <View style={styles.infoSection}>
            <Animated.Text style={[
              styles.rewardName,
              {
                color: glowColor,
                opacity: titleOpacity,
                transform: [
                  { translateY: titleTranslateY },
                  { scale: titleScale },
                ],
              }
            ]}>
              {reward.label}
            </Animated.Text>

            <Animated.View style={[styles.rarityBadge, { transform: [{ scale: badgeScale }] }]}>
              <LinearGradient
                colors={[`${glowColor}20`, `${glowColor}05`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.rarityGradient}
              />
              <View style={[styles.rarityBorder, { borderColor: `${glowColor}30` }]} />
              <View style={styles.rarityInner}>
                <RarityIcon size={14} color={glowColor} />
                <Text style={[styles.rarityText, { color: glowColor }]}>{rarityConfig.label}</Text>
                <View style={[styles.rarityDot, { backgroundColor: `${glowColor}50` }]} />
                <Text style={styles.ownedText}>{reward.ownedBy} of users</Text>
              </View>
            </Animated.View>

            <Animated.Text style={[styles.achievementText, { opacity: descOpacity }]}>
              {`\u201C${reward.achievement}\u201D`}
            </Animated.Text>
          </View>

          <Animated.View style={[styles.buttonSection, {
            opacity: buttonOpacity,
            transform: [{ translateY: buttonTranslateY }],
          }]}>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleClose}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[glowColor, `${glowColor}CC`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.continueButtonGradient}
              />
              <Animated.View style={[styles.buttonShimmer, { transform: [{ translateX: shimmerTranslateX }] }]} />
              <Text style={styles.continueButtonText}>Claim Reward</Text>
            </TouchableOpacity>

            <Text style={styles.tapHint}>Your collection has been updated</Text>
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
    backgroundColor: 'rgba(0,0,0,0.98)',
  },
  starsField: {
    ...StyleSheet.absoluteFillObject,
  },
  starDot: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  lineGlowLeft: {
    position: 'absolute',
    left: 0,
    top: '38%',
    width: SCREEN_WIDTH * 0.3,
    height: 1,
    opacity: 0.3,
  },
  lineGlowRight: {
    position: 'absolute',
    right: 0,
    top: '38%',
    width: SCREEN_WIDTH * 0.3,
    height: 1,
    opacity: 0.3,
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
    marginBottom: 12,
  },
  crownContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  crownGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
  },
  crownInnerGlow: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
  },
  unlockLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  unlockLine: {
    width: 24,
    height: 1,
  },
  unlockLabelText: {
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 4,
  },
  orbSection: {
    width: ORB_SIZE + 140,
    height: ORB_SIZE + 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  floatingParticle: {
    position: 'absolute',
  },
  orbOuterGlow: {
    position: 'absolute',
    width: ORB_SIZE + 90,
    height: ORB_SIZE + 90,
    borderRadius: (ORB_SIZE + 90) / 2,
  },
  orbMidGlow: {
    position: 'absolute',
    width: ORB_SIZE + 50,
    height: ORB_SIZE + 50,
    borderRadius: (ORB_SIZE + 50) / 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 20,
  },
  glowRing: {
    position: 'absolute',
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    borderWidth: 2,
  },
  orbContainer: {
    width: ORB_SIZE + 20,
    height: ORB_SIZE + 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbRotateRing: {
    position: 'absolute',
    width: ORB_SIZE + 16,
    height: ORB_SIZE + 16,
    borderRadius: (ORB_SIZE + 16) / 2,
    borderWidth: 1.5,
    borderStyle: 'dashed' as const,
  },
  orbRotateDot: {
    position: 'absolute',
    top: -4,
    left: '50%',
    marginLeft: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  orbBorder: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    borderWidth: 2.5,
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
    width: ORB_SIZE - 5,
    height: ORB_SIZE - 5,
    borderRadius: (ORB_SIZE - 5) / 2,
  },
  orbVideoHidden: {
    position: 'absolute',
    opacity: 0,
  },
  orbInnerShadow: {
    position: 'absolute',
    width: ORB_SIZE - 20,
    height: ORB_SIZE - 20,
    borderRadius: (ORB_SIZE - 20) / 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 35,
  },
  infoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  rewardName: {
    fontSize: 36,
    fontWeight: '800' as const,
    letterSpacing: 1.5,
    marginBottom: 16,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  rarityBadge: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
  },
  rarityGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  rarityBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 1,
  },
  rarityInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  rarityDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  rarityText: {
    fontSize: 13,
    fontWeight: '800' as const,
    letterSpacing: 1.5,
  },
  ownedText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500' as const,
  },
  achievementText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  buttonSection: {
    width: '100%',
    alignItems: 'center',
  },
  continueButton: {
    width: '100%',
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 20,
  },
  continueButtonGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  buttonShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 140,
    backgroundColor: 'rgba(255,255,255,0.25)',
    transform: [{ skewX: '-20deg' }],
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#000',
    letterSpacing: 0.8,
  },
  tapHint: {
    marginTop: 16,
    fontSize: 13,
    color: 'rgba(255,255,255,0.25)',
    fontWeight: '400' as const,
    letterSpacing: 0.3,
  },
});
