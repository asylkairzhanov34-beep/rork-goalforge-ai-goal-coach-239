import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Platform,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Check, Star, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CIRCLE_SIZE = Math.min(SCREEN_WIDTH * 0.42, 180);
const STROKE_WIDTH = 6;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface AnalysisStep {
  label: string;
  icon: string;
  duration: number;
}

const ANALYSIS_STEPS: AnalysisStep[] = [
  { label: 'Analyzing results', icon: '🔍', duration: 2800 },
  { label: 'Finding weak spots', icon: '🎯', duration: 3200 },
  { label: 'Building your report', icon: '📊', duration: 3600 },
  { label: 'Creating custom plan', icon: '✨', duration: 4000 },
];

const FAKE_REVIEWS = [
  {
    text: "This app completely changed my daily routine. The personalized plans are incredibly accurate and easy to follow.",
    author: 'Michael R.',
    rating: 5,
    hasAvatar: true,
  },
  {
    text: "I love the app and the infinite habits! I'm inviting some of my friends, it's an amazing app.",
    author: 'Ana K.',
    rating: 5,
    hasAvatar: false,
  },
  {
    text: "Best goal tracking app I've ever used. The AI analysis is surprisingly helpful!",
    author: 'Sarah L.',
    rating: 5,
    hasAvatar: true,
  },
  {
    text: 'Finally an app that actually understands what I need. Highly recommend to everyone.',
    author: 'David W.',
    rating: 5,
    hasAvatar: false,
  },
];

interface GoalAnalysisLoaderProps {
  onComplete?: () => void;
}

const triggerHaptic = () => {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
};

export function GoalAnalysisLoader({ onComplete }: GoalAnalysisLoaderProps) {
  const [progress, setProgress] = useState<number>(0);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [currentReview, setCurrentReview] = useState<number>(0);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(20)).current;
  const circleScale = useRef(new Animated.Value(0.85)).current;
  const percentOpacity = useRef(new Animated.Value(0)).current;
  const stepsContainerOpacity = useRef(new Animated.Value(0)).current;
  const stepsContainerSlide = useRef(new Animated.Value(24)).current;
  const reviewOpacity = useRef(new Animated.Value(0)).current;
  const reviewSlide = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

  const stepAnims = useRef(
    ANALYSIS_STEPS.map(() => ({
      opacity: new Animated.Value(0.3),
      checkScale: new Animated.Value(0),
      checkOpacity: new Animated.Value(0),
      spinnerRotation: new Animated.Value(0),
      rowSlide: new Animated.Value(8),
    }))
  ).current;

  const reviewFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.parallel([
        Animated.timing(fadeIn, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(titleSlide, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.spring(circleScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(percentOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(stepsContainerOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(stepsContainerSlide, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(reviewOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(reviewSlide, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeIn, titleSlide, circleScale, percentOpacity, stepsContainerOpacity, stepsContainerSlide, reviewOpacity, reviewSlide, pulseAnim, glowAnim, subtitleOpacity]);

  useEffect(() => {
    const totalDuration = 13600;
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(elapsed / totalDuration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setProgress(Math.round(eased * 100));

      if (p >= 1) {
        clearInterval(interval);
        onComplete?.();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [onComplete]);

  useEffect(() => {
    let cumulativeTime = 0;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    ANALYSIS_STEPS.forEach((step, index) => {
      const activateTimeout = setTimeout(() => {
        setActiveStep(index);
        Animated.parallel([
          Animated.timing(stepAnims[index].opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(stepAnims[index].rowSlide, {
            toValue: 0,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();

        Animated.loop(
          Animated.timing(stepAnims[index].spinnerRotation, {
            toValue: 1,
            duration: 900,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        ).start();
      }, cumulativeTime);
      timeouts.push(activateTimeout);

      const completeTimeout = setTimeout(() => {
        stepAnims[index].spinnerRotation.stopAnimation();
        setCompletedSteps((prev) => new Set(prev).add(index));

        triggerHaptic();

        Animated.parallel([
          Animated.spring(stepAnims[index].checkScale, {
            toValue: 1,
            friction: 4,
            tension: 120,
            useNativeDriver: true,
          }),
          Animated.timing(stepAnims[index].checkOpacity, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }),
        ]).start();
      }, cumulativeTime + step.duration);
      timeouts.push(completeTimeout);

      cumulativeTime += step.duration;
    });

    return () => timeouts.forEach(clearTimeout);
  }, [stepAnims]);

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(reviewFade, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setCurrentReview((prev) => (prev + 1) % FAKE_REVIEWS.length);
        Animated.timing(reviewFade, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }).start();
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [reviewFade]);

  const strokeDashoffset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;

  const renderSpinner = useCallback((index: number) => {
    const spin = stepAnims[index].spinnerRotation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <Animated.View style={[styles.spinnerContainer, { transform: [{ rotate: spin }] }]}>
        <View style={styles.spinner} />
      </Animated.View>
    );
  }, [stepAnims]);

  const review = FAKE_REVIEWS[currentReview];

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.headerSection,
          {
            opacity: fadeIn,
            transform: [{ translateY: titleSlide }],
          },
        ]}
      >
        <View style={styles.titleRow}>
          <Sparkles size={20} color={theme.colors.primary} />
          <Text style={styles.title}>Creating analysis</Text>
        </View>
        <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
          Personalizing your goal plan
        </Animated.Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.circleContainer,
          {
            transform: [{ scale: Animated.multiply(circleScale, pulseAnim) }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.glowRing,
            {
              opacity: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.15, 0.45],
              }),
            },
          ]}
        />
        <View style={styles.innerGlow} />
        <View style={styles.svgContainer}>
          <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
            <Defs>
              <LinearGradient id="progressGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#FFD700" stopOpacity="1" />
                <Stop offset="1" stopColor="#FFA500" stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Circle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={RADIUS}
              stroke="rgba(255, 215, 0, 0.08)"
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
            <Circle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={RADIUS}
              stroke="url(#progressGrad)"
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
            />
          </Svg>
          <Animated.View style={[styles.percentContainer, { opacity: percentOpacity }]}>
            <Text style={styles.percentText}>{progress}</Text>
            <Text style={styles.percentSign}>%</Text>
          </Animated.View>
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.stepsCard,
          {
            opacity: stepsContainerOpacity,
            transform: [{ translateY: stepsContainerSlide }],
          },
        ]}
      >
        {ANALYSIS_STEPS.map((step, index) => {
          const isCompleted = completedSteps.has(index);
          const isActive = activeStep === index && !isCompleted;

          return (
            <Animated.View
              key={index}
              style={[
                styles.stepRow,
                {
                  opacity: stepAnims[index].opacity,
                  transform: [{ translateX: stepAnims[index].rowSlide }],
                },
                index < ANALYSIS_STEPS.length - 1 && styles.stepRowBorder,
              ]}
            >
              <Text style={styles.stepIcon}>{step.icon}</Text>
              <Text
                style={[
                  styles.stepLabel,
                  isCompleted && styles.stepLabelCompleted,
                  isActive && styles.stepLabelActive,
                ]}
              >
                {step.label}
              </Text>
              <View style={styles.stepStatusContainer}>
                {isCompleted ? (
                  <Animated.View
                    style={[
                      styles.checkCircle,
                      {
                        transform: [{ scale: stepAnims[index].checkScale }],
                        opacity: stepAnims[index].checkOpacity,
                      },
                    ]}
                  >
                    <Check size={12} color="#000" strokeWidth={3} />
                  </Animated.View>
                ) : isActive ? (
                  renderSpinner(index)
                ) : (
                  <View style={styles.emptyCircle} />
                )}
              </View>
            </Animated.View>
          );
        })}
      </Animated.View>

      <Animated.View
        style={[
          styles.reviewCard,
          {
            opacity: reviewOpacity,
            transform: [{ translateY: reviewSlide }],
          },
        ]}
      >
        <Animated.View style={{ opacity: reviewFade }}>
          <View style={styles.reviewHeader}>
            <View style={styles.starsRow}>
              {Array.from({ length: review.rating }).map((_, i) => (
                <Star key={i} size={14} color="#FFD700" fill="#FFD700" />
              ))}
            </View>
          </View>
          <Text style={styles.reviewText} numberOfLines={3}>{review.text}</Text>
          <Text style={styles.reviewAuthor}>{review.author}</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: SCREEN_HEIGHT < 700 ? 16 : 28,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: SCREEN_HEIGHT < 700 ? 16 : 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: 'rgba(255, 215, 0, 0.6)',
    letterSpacing: 0.3,
  },
  circleContainer: {
    width: CIRCLE_SIZE + 36,
    height: CIRCLE_SIZE + 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SCREEN_HEIGHT < 700 ? 20 : 28,
  },
  glowRing: {
    position: 'absolute',
    width: CIRCLE_SIZE + 36,
    height: CIRCLE_SIZE + 36,
    borderRadius: (CIRCLE_SIZE + 36) / 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
  },
  innerGlow: {
    position: 'absolute',
    width: CIRCLE_SIZE - 20,
    height: CIRCLE_SIZE - 20,
    borderRadius: (CIRCLE_SIZE - 20) / 2,
    backgroundColor: 'rgba(255, 215, 0, 0.03)',
  },
  svgContainer: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  percentText: {
    fontSize: 42,
    fontWeight: '200' as const,
    color: '#FFFFFF',
    letterSpacing: -2,
  },
  percentSign: {
    fontSize: 20,
    fontWeight: '300' as const,
    color: 'rgba(255, 215, 0, 0.7)',
    marginLeft: 2,
  },
  stepsCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 215, 0, 0.04)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
    paddingVertical: 2,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  stepRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 215, 0, 0.08)',
  },
  stepIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  stepLabel: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: 'rgba(255, 255, 255, 0.28)',
    flex: 1,
  },
  stepLabelCompleted: {
    color: '#FFFFFF',
  },
  stepLabelActive: {
    color: 'rgba(255, 215, 0, 0.9)',
  },
  stepStatusContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      default: {},
    }),
  },
  emptyCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  spinnerContainer: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.15)',
    borderTopColor: '#FFD700',
  },
  reviewCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 215, 0, 0.04)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
    padding: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewText: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 20,
    marginBottom: 10,
  },
  reviewAuthor: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(255, 215, 0, 0.5)',
  },
});
