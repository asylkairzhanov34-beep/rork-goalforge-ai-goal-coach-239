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
import { router, usePathname } from 'expo-router';
import { Play, Pause, Flame, Timer, ChevronUp } from 'lucide-react-native';
import { useTimer } from '@/hooks/use-timer-store';
import { useGoalStore } from '@/hooks/use-goal-store';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COMPACT_WIDTH = 180;
const EXPANDED_WIDTH = Math.min(SCREEN_WIDTH - 32, 360);

export function DynamicIslandTimer() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const timerStore = useTimer();
  const { profile } = useGoalStore();
  
  const [isExpanded, setIsExpanded] = useState(false);
  
  const widthAnim = useRef(new Animated.Value(COMPACT_WIDTH)).current;
  const heightAnim = useRef(new Animated.Value(44)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const flameAnim = useRef(new Animated.Value(1)).current;

  const isRunning = timerStore?.isRunning ?? false;
  const isPaused = timerStore?.isPaused ?? false;
  const currentTime = timerStore?.currentTime ?? 0;
  const totalTime = timerStore?.totalTime ?? 1500;
  const mode = timerStore?.mode ?? 'focus';
  
  const currentStreak = profile?.currentStreak ?? 0;

  const shouldShow = isRunning && pathname !== '/timer-fullscreen';

  useEffect(() => {
    if (shouldShow) {
      Animated.spring(opacityAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      setIsExpanded(false);
    }
  }, [shouldShow, opacityAnim]);

  useEffect(() => {
    if (isRunning && !isPaused) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isRunning, isPaused, pulseAnim]);

  useEffect(() => {
    const flame = Animated.loop(
      Animated.sequence([
        Animated.timing(flameAnim, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(flameAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    flame.start();
    return () => flame.stop();
  }, [flameAnim]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(widthAnim, {
        toValue: isExpanded ? EXPANDED_WIDTH : COMPACT_WIDTH,
        useNativeDriver: false,
        tension: 50,
        friction: 10,
      }),
      Animated.spring(heightAnim, {
        toValue: isExpanded ? 140 : 44,
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

  const handleOpenFullscreen = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsExpanded(false);
    router.push('/timer-fullscreen');
  };

  const handleTogglePause = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    if (isPaused) {
      timerStore?.resumeTimer?.();
    } else {
      timerStore?.pauseTimer?.();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getModeColor = () => {
    if (mode === 'focus') return theme.colors.primary;
    if (mode === 'shortBreak') return '#10B981';
    return '#6366F1';
  };

  const getModeText = () => {
    if (mode === 'focus') return 'Focus';
    if (mode === 'shortBreak') return 'Break';
    return 'Long Break';
  };

  const getFlameColor = () => {
    if (currentStreak === 0) return '#666666';
    if (currentStreak < 3) return '#FF8C00';
    if (currentStreak < 7) return '#FF6B00';
    if (currentStreak < 14) return '#FF4500';
    return '#FFD700';
  };

  const progress = totalTime > 0 ? (1 - currentTime / totalTime) * 100 : 0;

  if (!shouldShow) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 8,
          opacity: opacityAnim,
          transform: [{ scale: pulseAnim }],
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
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={handlePress}
          onLongPress={handleOpenFullscreen}
          style={styles.touchArea}
        >
          {!isExpanded ? (
            <View style={styles.compactContent}>
              <View style={[styles.modeIndicator, { backgroundColor: getModeColor() }]} />
              <Text style={styles.compactTime}>{formatTime(currentTime)}</Text>
              <View style={styles.compactRight}>
                {isPaused ? (
                  <View style={styles.pausedIndicator}>
                    <Pause size={12} color="#fff" fill="#fff" />
                  </View>
                ) : (
                  <View style={[styles.progressRing, { borderColor: getModeColor() }]}>
                    <Text style={styles.progressText}>{Math.round(progress)}%</Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.expandedContent}>
              <View style={styles.expandedHeader}>
                <View style={styles.modeSection}>
                  <Timer size={16} color={getModeColor()} />
                  <Text style={[styles.modeText, { color: getModeColor() }]}>
                    {getModeText()}
                  </Text>
                </View>
                <TouchableOpacity onPress={handlePress} style={styles.collapseButton}>
                  <ChevronUp size={18} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              </View>

              <View style={styles.timerSection}>
                <Text style={styles.expandedTime}>{formatTime(currentTime)}</Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progress}%`, backgroundColor: getModeColor() },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.expandedFooter}>
                <View style={styles.streakSection}>
                  <Animated.View style={{ transform: [{ scale: flameAnim }] }}>
                    <Flame
                      size={18}
                      color={getFlameColor()}
                      fill={currentStreak > 0 ? getFlameColor() : 'transparent'}
                    />
                  </Animated.View>
                  <Text style={[styles.streakText, { color: getFlameColor() }]}>
                    {currentStreak} day streak
                  </Text>
                </View>

                <View style={styles.controlsSection}>
                  <TouchableOpacity
                    style={[styles.controlButton, { backgroundColor: getModeColor() + '30' }]}
                    onPress={handleTogglePause}
                  >
                    {isPaused ? (
                      <Play size={16} color={getModeColor()} fill={getModeColor()} />
                    ) : (
                      <Pause size={16} color={getModeColor()} fill={getModeColor()} />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.openButton}
                    onPress={handleOpenFullscreen}
                  >
                    <Text style={styles.openButtonText}>Open</Text>
                  </TouchableOpacity>
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
    zIndex: 9999,
    elevation: 9999,
  },
  island: {
    backgroundColor: '#1C1C1E',
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 20,
  },
  touchArea: {
    flex: 1,
    justifyContent: 'center',
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  modeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compactTime: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    flex: 1,
  },
  compactRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pausedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 107, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRing: {
    width: 32,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  progressText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#FFFFFF',
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
  modeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeText: {
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
  collapseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerSection: {
    alignItems: 'center',
    gap: 8,
  },
  expandedTime: {
    fontSize: 36,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: -2,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  expandedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  controlsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  openButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
