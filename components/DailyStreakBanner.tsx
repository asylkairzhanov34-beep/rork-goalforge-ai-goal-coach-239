import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Flame, Lock, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { REWARDS, getRewardProgress, type Reward } from '@/constants/rewards';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DailyStreakBannerProps {
  currentStreak: number;
  weekProgress: boolean[];
  totalCompletedTasks: number;
  focusTimeMinutes: number;
  visible: boolean;
  onDismiss: () => void;
}

export const DailyStreakBanner: React.FC<DailyStreakBannerProps> = ({
  currentStreak,
  weekProgress,
  totalCompletedTasks,
  focusTimeMinutes,
  visible,
  onDismiss,
}) => {
  const slideAnim = useRef(new Animated.Value(-200)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const flameScale = useRef(new Animated.Value(1)).current;
  const flameGlow = useRef(new Animated.Value(0.3)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const checkScaleAnims = useRef(weekProgress.map(() => new Animated.Value(0))).current;

  const nextReward: Reward | null = useMemo(() => {
    for (const reward of REWARDS) {
      const req = reward.requirement;
      const unlocked =
        currentStreak >= req.streakDays &&
        totalCompletedTasks >= req.completedTasks &&
        focusTimeMinutes >= req.focusMinutes;
      if (!unlocked) return reward;
    }
    return null;
  }, [currentStreak, totalCompletedTasks, focusTimeMinutes]);

  const rewardProgress = useMemo(() => {
    if (!nextReward) return null;
    return getRewardProgress(nextReward, currentStreak, totalCompletedTasks, focusTimeMinutes);
  }, [nextReward, currentStreak, totalCompletedTasks, focusTimeMinutes]);

  const overallProgress = rewardProgress?.overallProgress ?? 100;

  useEffect(() => {
    if (visible) {
      Animated.stagger(50, [
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: 0,
            tension: 60,
            friction: 12,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      const completedDays = weekProgress.filter(Boolean).length;
      checkScaleAnims.forEach((anim, i) => {
        if (i < completedDays) {
          Animated.spring(anim, {
            toValue: 1,
            tension: 80,
            friction: 8,
            delay: 300 + i * 120,
            useNativeDriver: true,
          }).start();
        }
      });

      Animated.timing(progressAnim, {
        toValue: overallProgress / 100,
        duration: 1200,
        delay: 500,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -200,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, opacityAnim, progressAnim, overallProgress, weekProgress, checkScaleAnims]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(flameScale, {
            toValue: 1.15,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(flameGlow, {
            toValue: 0.7,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(flameScale, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(flameGlow, {
            toValue: 0.3,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [flameScale, flameGlow]);

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerAnim]);

  const handleDismiss = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onDismiss();
  };

  const getStreakTitle = () => {
    if (currentStreak === 0) return 'START YOUR STREAK';
    if (currentStreak === 1) return 'STREAK STARTED';
    if (currentStreak < 7) return 'STREAK GROWING';
    if (currentStreak < 14) return 'ON FIRE';
    if (currentStreak < 30) return 'UNSTOPPABLE';
    return 'LEGENDARY';
  };

  const getStreakSubtitle = () => {
    if (currentStreak === 0) return 'Complete today\'s tasks to begin!';
    if (currentStreak === 1) return 'First day of winning!';
    if (currentStreak < 3) return 'Another day of winning!';
    if (currentStreak < 7) return 'Building momentum!';
    if (currentStreak < 14) return 'You\'re crushing it!';
    if (currentStreak < 30) return 'Nothing can stop you!';
    return 'Absolutely legendary!';
  };

  const getFlameColor = () => {
    if (currentStreak === 0) return '#666';
    if (currentStreak < 3) return '#FF8C00';
    if (currentStreak < 7) return '#FF6B00';
    if (currentStreak < 14) return '#FF4500';
    if (currentStreak < 30) return '#FFD700';
    return '#FFD700';
  };

  const getProgressBarColors = (): [string, string, ...string[]] => {
    if (currentStreak < 3) return ['#FF6B6B', '#FF8C00'];
    if (currentStreak < 7) return ['#FF8C00', '#FFD700'];
    if (currentStreak < 14) return ['#FFD700', '#4ADE80'];
    return ['#4ADE80', '#22D3EE'];
  };

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  if (!visible) return null;

  const flameColor = getFlameColor();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.card}>
        <View style={styles.cardBackground}>
          <LinearGradient
            colors={['rgba(28, 28, 30, 0.95)', 'rgba(20, 20, 22, 0.98)']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.glassBorder} />
        </View>

        <Animated.View
          style={[
            styles.shimmer,
            { transform: [{ translateX: shimmerTranslate }, { skewX: '-20deg' }] },
          ]}
        />

        <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss} activeOpacity={0.7}>
          <X size={14} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.topRow}>
            <View style={styles.leftSection}>
              <Text style={styles.title}>{getStreakTitle()}</Text>
              <Text style={styles.subtitle}>{getStreakSubtitle()}</Text>

              <View style={styles.weekDots}>
                {weekProgress.map((completed, i) => {
                  const isCurrent = i === weekProgress.filter(Boolean).length;
                  return (
                    <View key={i} style={styles.dayDotWrapper}>
                      {completed ? (
                        <Animated.View
                          style={[
                            styles.dayCompleted,
                            {
                              transform: [{ scale: checkScaleAnims[i] }],
                              backgroundColor:
                                i === weekProgress.filter(Boolean).length - 1
                                  ? flameColor
                                  : 'rgba(255,255,255,0.9)',
                            },
                          ]}
                        >
                          <Check
                            size={10}
                            color={
                              i === weekProgress.filter(Boolean).length - 1 ? '#000' : '#000'
                            }
                            strokeWidth={3}
                          />
                        </Animated.View>
                      ) : (
                        <View
                          style={[
                            styles.dayEmpty,
                            isCurrent && styles.dayCurrentEmpty,
                          ]}
                        />
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.rightSection}>
              <View style={styles.flameContainer}>
                <Animated.View
                  style={[
                    styles.flameGlow,
                    {
                      opacity: flameGlow,
                      backgroundColor: flameColor,
                    },
                  ]}
                />
                <Animated.View style={{ transform: [{ scale: flameScale }] }}>
                  <Flame
                    size={28}
                    color={flameColor}
                    fill={currentStreak > 0 ? flameColor : 'transparent'}
                  />
                </Animated.View>
              </View>
              <Text style={[styles.streakNumber, { color: flameColor }]}>
                {currentStreak}
              </Text>
              <Text style={styles.streakLabel}>DAY STREAK</Text>
            </View>
          </View>

          {nextReward && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <View style={styles.progressLabelRow}>
                  <Lock size={11} color="rgba(255,255,255,0.4)" />
                  <Text style={styles.progressLabel}>Next reward</Text>
                </View>
                <Text style={styles.progressPercent}>
                  {Math.round(overallProgress)}%
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFillWrapper, { width: progressWidth }]}>
                  <LinearGradient
                    colors={getProgressBarColors()}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.progressFill}
                  />
                </Animated.View>
              </View>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    paddingHorizontal: 0,
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  cardBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    overflow: 'hidden',
  },
  glassBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 80,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  dismissButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  content: {
    padding: 18,
    paddingRight: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leftSection: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 14,
  },
  weekDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dayDotWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCompleted: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 0 6px rgba(255, 215, 0, 0.4)',
      },
    }) as any,
  },
  dayEmpty: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderStyle: 'dashed' as const,
  },
  dayCurrentEmpty: {
    borderColor: 'rgba(255, 215, 0, 0.4)',
    borderStyle: 'dashed' as const,
  },
  rightSection: {
    alignItems: 'center',
    minWidth: 64,
    paddingTop: 2,
  },
  flameContainer: {
    position: 'relative',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flameGlow: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  streakNumber: {
    fontSize: 26,
    fontWeight: '800' as const,
    marginTop: -2,
    letterSpacing: -1,
  },
  streakLabel: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 1,
    marginTop: -2,
  },
  progressSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 0.3,
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
  },
  progressFillWrapper: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    flex: 1,
    borderRadius: 3,
  },
});

export default DailyStreakBanner;
