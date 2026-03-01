import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { Lock, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MiniVideoPlayer } from '@/components/MiniVideoPlayer';

interface RewardOrbProps {
  videoUri: string;
  size: number;
  isActive: boolean;
  isUnlocked: boolean;
  isScreenFocused: boolean;
  color?: string;
}

const RewardOrbInner: React.FC<RewardOrbProps> = ({
  videoUri,
  size,
  isActive,
  isUnlocked,
  isScreenFocused,
  color = '#FFD700',
}) => {
  const [showFallback, setShowFallback] = useState(Platform.OS === 'web');
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const shouldPlay = isActive && isScreenFocused;

  useEffect(() => {
    if (Platform.OS === 'web') {
      setShowFallback(true);
    }
  }, []);

  useEffect(() => {
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    if (showFallback) {
      glow.start();
      rotate.start();
    }

    return () => {
      glow.stop();
      rotate.stop();
    };
  }, [showFallback, glowAnim, rotateAnim]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    if (!showFallback) {
      pulse.start();
    } else {
      pulse.stop();
    }
    return () => pulse.stop();
  }, [showFallback, pulseAnim]);

  const borderRadius = size / 2;

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const renderFallbackOrb = () => (
    <View style={[styles.fallback, { width: size, height: size, borderRadius }]}>
      <LinearGradient
        colors={[
          `${color}15`,
          `${color}08`,
          'rgba(10,10,20,0.95)',
        ]}
        style={[styles.fallbackGradient, { borderRadius }]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <Animated.View
        style={[
          styles.fallbackRing,
          {
            width: size * 0.85,
            height: size * 0.85,
            borderRadius: size * 0.425,
            borderColor: `${color}30`,
            transform: [{ rotate: spin }],
          }
        ]}
      />

      <Animated.View
        style={[
          styles.fallbackRing,
          {
            width: size * 0.65,
            height: size * 0.65,
            borderRadius: size * 0.325,
            borderColor: `${color}20`,
            transform: [{ rotate: spin }, { scaleX: -1 }],
          }
        ]}
      />

      <Animated.View
        style={[
          styles.fallbackGlowCenter,
          {
            width: size * 0.4,
            height: size * 0.4,
            borderRadius: size * 0.2,
            backgroundColor: color,
            opacity: glowAnim,
          }
        ]}
      />

      <View style={styles.fallbackIcon}>
        <Sparkles size={size * 0.18} color={color} strokeWidth={1.5} />
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius }]}>
      {!showFallback && (
        <MiniVideoPlayer
          uri={videoUri}
          style={{ width: size, height: size }}
          contentFit="cover"
          shouldPlay={shouldPlay}
          loop
          muted
        />
      )}

      {showFallback && renderFallbackOrb()}

      {!isUnlocked && (
        <View style={[styles.lockedOverlay, { borderRadius }]}>
          <Lock size={36} color="rgba(255,255,255,0.7)" />
        </View>
      )}
    </View>
  );
};

export const RewardOrb = React.memo(RewardOrbInner);

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallback: {
    backgroundColor: '#0a0a14',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fallbackGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  fallbackRing: {
    position: 'absolute',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  fallbackGlowCenter: {
    position: 'absolute',
  },
  fallbackIcon: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default RewardOrb;
