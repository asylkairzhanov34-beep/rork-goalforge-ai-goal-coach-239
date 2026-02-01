import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { theme } from '@/constants/theme';

interface Step4WelcomeProps {
  nickname: string;
  onComplete: () => void;
}

export default function Step4Welcome({ nickname, onComplete }: Step4WelcomeProps) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.5));
  const [textAnim] = useState(new Animated.Value(0));
  const [particles] = useState(() => 
    Array.from({ length: 25 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(1),
    }))
  );

  useEffect(() => {
    const sequence = Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(200),
      Animated.parallel([
        ...particles.map((particle, index) => {
          const angle = (index / particles.length) * Math.PI * 2;
          const distance = 100 + Math.random() * 50;
          const xOffset = Math.cos(angle) * distance;
          const yOffset = Math.sin(angle) * distance;

          return Animated.parallel([
            Animated.timing(particle.x, {
              toValue: xOffset,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(particle.y, {
              toValue: yOffset,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(particle.opacity, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
          ]);
        }),
        Animated.timing(textAnim, {
          toValue: 1,
          duration: 500,
          delay: 100,
          useNativeDriver: true,
        }),
      ]),
    ]);

    sequence.start(() => {
      setTimeout(() => {
        onComplete();
      }, 800);
    });
  }, [fadeAnim, scaleAnim, textAnim, particles, onComplete]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Animated.View
            style={[
              styles.logo,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Sparkles size={72} color={theme.colors.primary} strokeWidth={1.5} />
          </Animated.View>

          {particles.map((particle, index) => (
            <Animated.View
              key={index}
              style={[
                styles.particle,
                {
                  opacity: particle.opacity,
                  transform: [
                    { translateX: particle.x },
                    { translateY: particle.y },
                  ],
                },
              ]}
            />
          ))}
        </View>

        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: textAnim,
              transform: [
                {
                  translateY: textAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.welcomeText}>Welcome,</Text>
          <Text style={styles.nicknameText}>{nickname}!</Text>
          <Text style={styles.subtitleText}>Your journey begins</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  logoContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xxl,
    position: 'relative',
  },
  logo: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    ...theme.shadows.premium,
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    top: '50%',
    left: '50%',
    marginLeft: -3,
    marginTop: -3,
  },
  textContainer: {
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: theme.fontSize.xl,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  nicknameText: {
    fontSize: theme.fontSize.display,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.bold,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.regular,
    textAlign: 'center',
  },
});
