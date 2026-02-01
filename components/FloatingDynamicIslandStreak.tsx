import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import { Flame, Trophy, X, Sun, Moon } from 'lucide-react-native';
import { useGoalStore } from '@/hooks/use-goal-store';
import * as Haptics from 'expo-haptics';
import { useTimer } from '@/hooks/use-timer-store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COMPACT_WIDTH = 160;
const EXPANDED_WIDTH = Math.min(SCREEN_WIDTH - 32, 340);

interface FloatingDynamicIslandStreakProps {
  visible?: boolean;
  onDismiss?: () => void;
}

export function FloatingDynamicIslandStreak({ visible: externalVisible, onDismiss }: FloatingDynamicIslandStreakProps) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { profile } = useGoalStore();
  const timerStore = useTimer();
  const isTimerRunning = timerStore?.isRunning ?? false;
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [internalVisible, setInternalVisible] = useState(false);
  const [lastShownStreak, setLastShownStreak] = useState<number | null>(null);
  
  const widthAnim = useRef(new Animated.Value(COMPACT_WIDTH)).current;
  const heightAnim = useRef(new Animated.Value(48)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const flameAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const celebrationAnim = useRef(new Animated.Value(0)).current;

  const currentStreak = profile?.currentStreak ?? 0;
  const bestStreak = profile?.bestStreak ?? 0;

  const isControlledExternally = externalVisible !== undefined;
  const shouldShow = isControlledExternally ? externalVisible : internalVisible;

  useEffect(() => {
    if (!isControlledExternally && currentStreak > 0 && lastShownStreak !== null && currentStreak > lastShownStreak) {
      console.log('[FloatingStreak] Streak increased!', { from: lastShownStreak, to: currentStreak });
      setInternalVisible(true);
      
      setTimeout(() => {
        setInternalVisible(false);
      }, 5000);
    }
    
    if (lastShownStreak === null && currentStreak > 0) {
      setLastShownStreak(currentStreak);
    } else if (currentStreak !== lastShownStreak) {
      setLastShownStreak(currentStreak);
    }
  }, [currentStreak, lastShownStreak, isControlledExternally]);

  useEffect(() => {
    if (shouldShow) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      Animated.parallel([
        Animated.spring(opacityAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 6,
        }),
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(celebrationAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: false,
          }),
          Animated.timing(celebrationAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      setIsExpanded(false);
    }
  }, [shouldShow, opacityAnim, scaleAnim, celebrationAnim]);

  useEffect(() => {
    const flame = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(flameAnim, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.8,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(flameAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    flame.start();
    return () => flame.stop();
  }, [flameAnim, glowAnim]);

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2500,
        useNativeDriver: true,
      })
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerAnim]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(widthAnim, {
        toValue: isExpanded ? EXPANDED_WIDTH : COMPACT_WIDTH,
        useNativeDriver: false,
        tension: 50,
        friction: 10,
      }),
      Animated.spring(heightAnim, {
        toValue: isExpanded ? 160 : 48,
        useNativeDriver: false,
        tension: 50,
        friction: 10,
      }),
    ]).start();
  }, [isExpanded, widthAnim, heightAnim]);

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsExpanded(!isExpanded);
  };

  const handleDismiss = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setInternalVisible(false);
    onDismiss?.();
  };

  const getFlameColor = () => {
    if (currentStreak === 0) return '#666666';
    if (currentStreak < 3) return '#FF8C00';
    if (currentStreak < 7) return '#FF6B00';
    if (currentStreak < 14) return '#FF4500';
    if (currentStreak < 30) return '#FF2400';
    return '#FFD700';
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning!';
    if (hour < 17) return 'Good afternoon!';
    return 'Good evening!';
  };

  const getStreakMessage = () => {
    if (currentStreak === 1) return "First day! Let's go!";
    if (currentStreak === 3) return "3 days strong!";
    if (currentStreak === 7) return "One week fire!";
    if (currentStreak === 14) return "Two weeks unstoppable!";
    if (currentStreak === 21) return "Habit is forming!";
    if (currentStreak === 30) return "One month legend!";
    if (currentStreak >= 50) return "Absolutely legendary!";
    return `Keep it going!`;
  };

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, 350],
  });

  const celebrationScale = celebrationAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.05, 1],
  });

  if (!shouldShow || pathname === '/timer-fullscreen' || isTimerRunning) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 8,
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
      pointerEvents="box-none"
    >
      <Animated.View
        style={[
          styles.island,
          {
            width: widthAnim,
            height: heightAnim,
            transform: [{ scale: celebrationScale }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.shimmer,
            {
              transform: [{ translateX: shimmerTranslate }, { skewX: '-20deg' }],
            },
          ]}
        />

        <TouchableOpacity
          activeOpacity={0.95}
          onPress={handlePress}
          style={styles.touchArea}
        >
          {!isExpanded ? (
            <View style={styles.compactContent}>
              <View style={styles.flameContainer}>
                <Animated.View
                  style={[
                    styles.flameGlow,
                    {
                      opacity: glowAnim,
                      backgroundColor: getFlameColor(),
                    },
                  ]}
                />
                <Animated.View style={{ transform: [{ scale: flameAnim }] }}>
                  <Flame
                    size={22}
                    color={getFlameColor()}
                    fill={currentStreak > 0 ? getFlameColor() : 'transparent'}
                  />
                </Animated.View>
              </View>
              <Text style={[styles.compactStreak, { color: getFlameColor() }]}>
                {currentStreak}
              </Text>
              <Text style={styles.compactLabel}>DAYS</Text>
            </View>
          ) : (
            <View style={styles.expandedContent}>
              <View style={styles.expandedHeader}>
                <View style={styles.headerLeft}>
                  {new Date().getHours() < 18 ? (
                    <Sun size={16} color="#FFD700" />
                  ) : (
                    <Moon size={16} color="#E8E8E8" />
                  )}
                  <Text style={styles.greetingText}>
                    {getGreeting()}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
                  <X size={16} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              </View>

              <View style={styles.mainSection}>
                <View style={styles.bigFlameContainer}>
                  <Animated.View
                    style={[
                      styles.bigFlameGlow,
                      {
                        opacity: glowAnim,
                        backgroundColor: getFlameColor(),
                      },
                    ]}
                  />
                  <Animated.View style={{ transform: [{ scale: flameAnim }] }}>
                    <Flame
                      size={48}
                      color={getFlameColor()}
                      fill={currentStreak > 0 ? getFlameColor() : 'transparent'}
                    />
                  </Animated.View>
                </View>

                <View style={styles.statsSection}>
                  <View style={styles.streakRow}>
                    <Text style={[styles.bigStreak, { color: getFlameColor() }]}>
                      {currentStreak}
                    </Text>
                    <Text style={styles.daysLabel}>day{currentStreak !== 1 ? 's' : ''}</Text>
                  </View>
                  <Text style={styles.streakMessage}>{getStreakMessage()}</Text>
                </View>
              </View>

              <View style={styles.expandedFooter}>
                <View style={styles.footerStat}>
                  <Trophy size={14} color="#FFD700" />
                  <Text style={styles.footerLabel}>Best: {bestStreak}</Text>
                </View>
                <View style={styles.progressIndicator}>
                  {[...Array(7)].map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.progressDot,
                        i < (currentStreak % 7 || 7) && {
                          backgroundColor: getFlameColor(),
                          shadowColor: getFlameColor(),
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.8,
                          shadowRadius: 4,
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9998,
    elevation: 9998,
  },
  island: {
    backgroundColor: '#1C1C1E',
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 100,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  touchArea: {
    flex: 1,
    justifyContent: 'center',
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  flameContainer: {
    position: 'relative',
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flameGlow: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    opacity: 0.3,
  },
  compactStreak: {
    fontSize: 22,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  compactLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.5,
  },
  expandedContent: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  greetingText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.3,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  bigFlameContainer: {
    position: 'relative',
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigFlameGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    opacity: 0.3,
  },
  statsSection: {
    alignItems: 'flex-start',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  daysLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  bigStreak: {
    fontSize: 48,
    fontWeight: '800' as const,
    letterSpacing: -2,
    lineHeight: 52,
  },
  streakMessage: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: -4,
  },
  expandedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  progressIndicator: {
    flexDirection: 'row',
    gap: 4,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
});
