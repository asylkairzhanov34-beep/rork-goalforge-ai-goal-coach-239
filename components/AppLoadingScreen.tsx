import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';

export function AppLoadingScreen({ testID }: { testID?: string }) {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(logoScale, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    Animated.timing(textOpacity, {
      toValue: 1,
      duration: 800,
      delay: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    const shimmer = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    shimmer.start();

    return () => {
      pulse.stop();
      shimmer.stop();
    };
  }, [pulseAnim, logoScale, textOpacity, shimmerAnim]);

  const glowScale = pulseAnim.interpolate({
    inputRange: [0.4, 1],
    outputRange: [1, 1.3],
  });

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.backgroundLayer} />

      <Animated.View style={[styles.glowOuter, { transform: [{ scale: glowScale }], opacity: pulseAnim }]} />

      <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }] }]}>
        <View style={styles.iconCircle}>
          <Sparkles size={36} color="#000" strokeWidth={2.2} />
        </View>
      </Animated.View>

      <Animated.View style={[styles.textContainer, { opacity: textOpacity }]}>
        <Text style={styles.brandName}>GoalForge</Text>
        <Text style={styles.brandSuffix}>AI</Text>
      </Animated.View>

      <Animated.View style={[styles.subtitleContainer, { opacity: pulseAnim }]}>
        <View style={styles.dotRow}>
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotCenter]} />
          <View style={styles.dot} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  glowOuter: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 215, 0, 0.06)',
  },
  logoContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 10,
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  brandSuffix: {
    fontSize: 28,
    fontWeight: '600' as const,
    color: '#FFD700',
    letterSpacing: 1,
  },
  subtitleContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  dotRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFD700',
    opacity: 0.6,
  },
  dotCenter: {
    opacity: 1,
  },
});
