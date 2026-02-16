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
import Svg, { Circle } from 'react-native-svg';
import { Check, Star } from 'lucide-react-native';
import { theme } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CIRCLE_SIZE = 200;
const STROKE_WIDTH = 8;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface AnalysisStep {
  label: string;
  duration: number;
}

const ANALYSIS_STEPS: AnalysisStep[] = [
  { label: 'Analyzing results', duration: 2800 },
  { label: 'Finding weak spots', duration: 3200 },
  { label: 'Building your report', duration: 3600 },
  { label: 'Creating custom plan', duration: 4000 },
];

const FAKE_REVIEWS = [
  {
    text: 'I love the app and the infinite habits! I\'m inviting some of my friends, it\'s an amazing app.',
    author: 'Ana K.',
    rating: 5,
  },
  {
    text: 'This app completely changed my daily routine. The personalized plans are incredibly accurate.',
    author: 'Michael R.',
    rating: 5,
  },
  {
    text: 'Best goal tracking app I\'ve ever used. The AI analysis is surprisingly helpful!',
    author: 'Sarah L.',
    rating: 5,
  },
  {
    text: 'Finally an app that actually understands what I need. Highly recommend to everyone.',
    author: 'David W.',
    rating: 5,
  },
];

interface GoalAnalysisLoaderProps {
  onComplete?: () => void;
}

export function GoalAnalysisLoader({ onComplete }: GoalAnalysisLoaderProps) {
  const [progress, setProgress] = useState<number>(0);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [currentReview, setCurrentReview] = useState<number>(0);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(20)).current;
  const circleScale = useRef(new Animated.Value(0.8)).current;
  const percentOpacity = useRef(new Animated.Value(0)).current;
  const stepsContainerOpacity = useRef(new Animated.Value(0)).current;
  const stepsContainerSlide = useRef(new Animated.Value(30)).current;
  const reviewOpacity = useRef(new Animated.Value(0)).current;
  const reviewSlide = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const stepAnims = useRef(
    ANALYSIS_STEPS.map(() => ({
      opacity: new Animated.Value(0.4),
      checkScale: new Animated.Value(0),
      checkOpacity: new Animated.Value(0),
      spinnerRotation: new Animated.Value(0),
    }))
  ).current;

  const reviewFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.parallel([
        Animated.timing(fadeIn, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(titleSlide, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(circleScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(percentOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(stepsContainerOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(stepsContainerSlide, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(reviewOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(reviewSlide, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeIn, titleSlide, circleScale, percentOpacity, stepsContainerOpacity, stepsContainerSlide, reviewOpacity, reviewSlide, pulseAnim, glowAnim]);

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
    const timeouts: NodeJS.Timeout[] = [];

    ANALYSIS_STEPS.forEach((step, index) => {
      const activateTimeout = setTimeout(() => {
        setActiveStep(index);
        Animated.timing(stepAnims[index].opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();

        const spinLoop = Animated.loop(
          Animated.timing(stepAnims[index].spinnerRotation, {
            toValue: 1,
            duration: 1000,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        );
        spinLoop.start();
      }, cumulativeTime);
      timeouts.push(activateTimeout);

      const completeTimeout = setTimeout(() => {
        stepAnims[index].spinnerRotation.stopAnimation();
        setCompletedSteps((prev) => new Set(prev).add(index));

        Animated.parallel([
          Animated.spring(stepAnims[index].checkScale, {
            toValue: 1,
            friction: 5,
            tension: 100,
            useNativeDriver: true,
          }),
          Animated.timing(stepAnims[index].checkOpacity, {
            toValue: 1,
            duration: 200,
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
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setCurrentReview((prev) => (prev + 1) % FAKE_REVIEWS.length);
        Animated.timing(reviewFade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      });
    }, 4000);

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
        <View style={styles.spinner}>
          <View style={styles.spinnerDot} />
        </View>
      </Animated.View>
    );
  }, [stepAnims]);

  const review = FAKE_REVIEWS[currentReview];

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.titleContainer,
          {
            opacity: fadeIn,
            transform: [{ translateY: titleSlide }],
          },
        ]}
      >
        <Text style={styles.title}>Creating analysis...</Text>
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
                outputRange: [0.1, 0.35],
              }),
            },
          ]}
        />
        <View style={styles.svgContainer}>
          <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
            <Circle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={RADIUS}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
            <Circle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={RADIUS}
              stroke="#FFFFFF"
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
            />
          </Svg>
          <Animated.View style={[styles.percentContainer, { opacity: percentOpacity }]}>
            <Text style={styles.percentText}>{progress}%</Text>
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
                { opacity: stepAnims[index].opacity },
                index < ANALYSIS_STEPS.length - 1 && styles.stepRowBorder,
              ]}
            >
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
                    <Check size={14} color="#000" strokeWidth={3} />
                  </Animated.View>
                ) : isActive ? (
                  renderSpinner(index)
                ) : null}
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
          <View style={styles.starsRow}>
            {Array.from({ length: review.rating }).map((_, i) => (
              <Star key={i} size={18} color="#FFD700" fill="#FFD700" />
            ))}
          </View>
          <Text style={styles.reviewText}>{review.text}</Text>
          <Text style={styles.reviewAuthor}>- {review.author}</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  titleContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  circleContainer: {
    width: CIRCLE_SIZE + 40,
    height: CIRCLE_SIZE + 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  glowRing: {
    position: 'absolute',
    width: CIRCLE_SIZE + 40,
    height: CIRCLE_SIZE + 40,
    borderRadius: (CIRCLE_SIZE + 40) / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.4)',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 4,
      },
      default: {},
    }),
  },
  svgContainer: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentText: {
    fontSize: 48,
    fontWeight: '300' as const,
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  stepsCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 4,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  stepRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  stepLabel: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: 'rgba(255, 255, 255, 0.35)',
    flex: 1,
  },
  stepLabelCompleted: {
    color: '#FFFFFF',
  },
  stepLabelActive: {
    color: 'rgba(255, 215, 0, 0.8)',
  },
  stepStatusContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#4ADE80',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderTopColor: 'rgba(255, 215, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  spinnerDot: {
    width: 0,
    height: 0,
  },
  reviewCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 20,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 3,
    marginBottom: 12,
  },
  reviewText: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 22,
    marginBottom: 12,
  },
  reviewAuthor: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: 'rgba(255, 255, 255, 0.4)',
  },
});
