import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Flame, Check, Gem } from 'lucide-react-native';
import { theme } from '@/constants/theme';

interface DynamicIslandStreakProps {
  currentStreak: number;
  weekProgress: boolean[];
  onPress?: () => void;
}

export function DynamicIslandStreak({ currentStreak, weekProgress, onPress }: DynamicIslandStreakProps) {
  const flameScale = useRef(new Animated.Value(1)).current;
  const flameGlow = useRef(new Animated.Value(0.3)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(flameScale, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(flameGlow, {
            toValue: 0.8,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(flameScale, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(flameGlow, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );

    pulseAnimation.start();
    shimmerAnimation.start();

    return () => {
      pulseAnimation.stop();
      shimmerAnimation.stop();
    };
  }, [flameScale, flameGlow, shimmerAnim]);

  const getMotivationalText = () => {
    if (currentStreak === 0) return "Start your journey today!";
    if (currentStreak === 1) return "Great start! Keep going!";
    if (currentStreak < 7) return "Building momentum!";
    if (currentStreak < 14) return "You're on fire!";
    if (currentStreak < 30) return "Unstoppable!";
    return "Legendary streak!";
  };

  const getFlameColor = () => {
    if (currentStreak === 0) return '#666666';
    if (currentStreak < 3) return '#FF8C00';
    if (currentStreak < 7) return '#FF6B00';
    if (currentStreak < 14) return '#FF4500';
    return '#FFD700';
  };

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 300],
  });

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={onPress}
      style={styles.container}
    >
      <View style={styles.islandContainer}>
        <Animated.View 
          style={[
            styles.shimmer,
            {
              transform: [{ translateX: shimmerTranslate }],
            }
          ]} 
        />
        
        <View style={styles.contentWrapper}>
          <View style={styles.leftContent}>
            <Text style={styles.title}>
              {currentStreak > 0 ? 'STREAK GROWING' : 'START YOUR STREAK'}
            </Text>
            <Text style={styles.subtitle}>{getMotivationalText()}</Text>
            
            <View style={styles.weekProgress}>
              {weekProgress.map((completed, index) => (
                <View key={index} style={styles.dayIndicator}>
                  {completed ? (
                    <View style={styles.dayCompleted}>
                      <Check size={10} color="#000" strokeWidth={3} />
                    </View>
                  ) : index < weekProgress.filter(Boolean).length ? (
                    <View style={styles.dayGem}>
                      <Gem size={14} color={theme.colors.primary} />
                    </View>
                  ) : (
                    <View style={styles.dayEmpty} />
                  )}
                </View>
              ))}
            </View>
          </View>

          <View style={styles.rightContent}>
            <View style={styles.flameContainer}>
              <Animated.View 
                style={[
                  styles.flameGlow,
                  {
                    opacity: flameGlow,
                    backgroundColor: getFlameColor(),
                  }
                ]} 
              />
              <Animated.View 
                style={[
                  styles.flameWrapper,
                  { transform: [{ scale: flameScale }] }
                ]}
              >
                <Flame 
                  size={32} 
                  color={getFlameColor()} 
                  fill={currentStreak > 0 ? getFlameColor() : 'transparent'} 
                />
              </Animated.View>
            </View>
            <Text style={[styles.streakNumber, { color: getFlameColor() }]}>
              {currentStreak}
            </Text>
            <Text style={styles.streakLabel}>DAY STREAK</Text>
          </View>
        </View>

        <View style={styles.islandEdgeLeft} />
        <View style={styles.islandEdgeRight} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 16,
  },
  islandContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 44,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 360,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    transform: [{ skewX: '-20deg' }],
  },
  contentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContent: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 10,
  },
  weekProgress: {
    flexDirection: 'row',
    gap: 6,
  },
  dayIndicator: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCompleted: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  dayGem: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayEmpty: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
  },
  rightContent: {
    alignItems: 'center',
    minWidth: 70,
  },
  flameContainer: {
    position: 'relative',
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flameGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.3,
  },
  flameWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakNumber: {
    fontSize: 28,
    fontWeight: '800' as const,
    marginTop: -4,
  },
  streakLabel: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.5,
    marginTop: -2,
  },
  islandEdgeLeft: {
    position: 'absolute',
    left: -2,
    top: '50%',
    width: 4,
    height: 20,
    backgroundColor: '#2C2C2E',
    borderRadius: 2,
    transform: [{ translateY: -10 }],
  },
  islandEdgeRight: {
    position: 'absolute',
    right: -2,
    top: '50%',
    width: 4,
    height: 20,
    backgroundColor: '#2C2C2E',
    borderRadius: 2,
    transform: [{ translateY: -10 }],
  },
});
