import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

export function AppLoadingScreen({ testID }: { testID?: string }) {
  const pulseAnim = useRef<Animated.Value>(new Animated.Value(0.3)).current;
  const rotateAnim = useRef<Animated.Value>(new Animated.Value(0)).current;
  const scaleAnim = useRef<Animated.Value>(new Animated.Value(0.8)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.back(1.35)),
      useNativeDriver: true,
    }).start();

    pulse.start();
    rotate.start();

    return () => {
      pulse.stop();
      rotate.stop();
    };
  }, [pulseAnim, rotateAnim, scaleAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.background} />

      <Animated.View style={[styles.loaderContainer, { transform: [{ scale: scaleAnim }] }]}>
        <Animated.View style={[styles.outerRing, { transform: [{ rotate: spin }], opacity: pulseAnim }]} />
        <Animated.View style={[styles.middleRing, { opacity: pulseAnim }]} />
        <View style={styles.innerCircle}>
          <Animated.View style={[styles.innerGlow, { opacity: pulseAnim }]} />
        </View>
      </Animated.View>

      <Animated.View style={[styles.textRow, { opacity: pulseAnim }]}>
        <Text style={styles.loadingText}>Loading</Text>
        <View style={styles.dotsContainer}>
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotMiddle]} />
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
    backgroundColor: theme.colors.background,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.background,
  },
  loaderContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  middleRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  innerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  innerGlow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    opacity: 0.3,
  },
  textRow: {
    marginTop: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
    letterSpacing: 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 6,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
  },
  dotMiddle: {
    opacity: 0.55,
  },
});
