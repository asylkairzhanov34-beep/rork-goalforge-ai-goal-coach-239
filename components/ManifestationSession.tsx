import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Play, Pause, RotateCcw, Heart, Sparkles, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/theme';
import { GradientBackground } from '@/components/GradientBackground';
import { useManifestationStore } from '@/hooks/use-manifestation-store';
import { useGoalStore } from '@/hooks/use-goal-store';

const { width } = Dimensions.get('window');

interface ManifestationSessionProps {
  onComplete: () => void;
}

export function ManifestationSession({ onComplete }: ManifestationSessionProps) {
  const insets = useSafeAreaInsets();
  const manifestationStore = useManifestationStore();
  const goalStore = useGoalStore();
  
  const [currentStep, setCurrentStep] = useState<'start' | 'affirmations' | 'gratitude' | 'reflection' | 'complete'>('start');
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [moodBefore, setMoodBefore] = useState<number | null>(null);
  const [moodAfter, setMoodAfter] = useState<number | null>(null);
  const [reflection, setReflection] = useState('');
  
  // Animations
  const pulseAnim = useMemo(() => new Animated.Value(1), []);
  const fadeAnim = useMemo(() => new Animated.Value(0), []);
  const progressAnim = useMemo(() => new Animated.Value(0), []);
  const sparkleAnim = useMemo(() => new Animated.Value(0), []);
  
  // Generate phrases based on current goal
  const affirmations = useMemo(() => {
    if (!goalStore.currentGoal) return [];
    return manifestationStore.generateAffirmations(
      goalStore.currentGoal.title,
      goalStore.currentGoal.description
    );
  }, [goalStore.currentGoal, manifestationStore]);
  
  const gratitudes = useMemo(() => {
    if (!goalStore.currentGoal) return [];
    return manifestationStore.generateGratitudes(goalStore.currentGoal.title);
  }, [goalStore.currentGoal, manifestationStore]);
  
  const currentPhrases = currentStep === 'affirmations' ? affirmations : gratitudes;
  const totalPhrases = affirmations.length + gratitudes.length;
  const currentProgress = currentStep === 'affirmations' 
    ? (currentPhraseIndex / totalPhrases) * 100
    : ((affirmations.length + currentPhraseIndex) / totalPhrases) * 100;

  // Pulse animation for the center circle
  const startPulseAnimation = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // Fade in animation for phrases
  const animatePhrase = useCallback(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Progress animation
  const animateProgress = useCallback(() => {
    Animated.timing(progressAnim, {
      toValue: currentProgress / 100,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progressAnim, currentProgress]);

  // Sparkle animation for completion
  const animateSparkles = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [sparkleAnim]);

  useEffect(() => {
    if (currentStep === 'affirmations' || currentStep === 'gratitude') {
      animatePhrase();
      animateProgress();
      startPulseAnimation();
    }
  }, [currentStep, currentPhraseIndex, animatePhrase, animateProgress, startPulseAnimation]);

  useEffect(() => {
    if (currentStep === 'complete') {
      animateSparkles();
    }
  }, [currentStep, animateSparkles]);

  const hapticFeedback = useCallback(() => {
    if (Platform.OS !== 'web' && manifestationStore.settings.enableHapticFeedback) {
      Haptics.selectionAsync();
    }
  }, [manifestationStore.settings.enableHapticFeedback]);

  const startSession = useCallback(() => {
    setSessionStartTime(new Date());
    setCurrentStep('affirmations');
    setCurrentPhraseIndex(0);
    hapticFeedback();
  }, [hapticFeedback]);

  const nextPhrase = useCallback(() => {
    hapticFeedback();
    
    if (currentStep === 'affirmations') {
      if (currentPhraseIndex < affirmations.length - 1) {
        setCurrentPhraseIndex(currentPhraseIndex + 1);
      } else {
        setCurrentStep('gratitude');
        setCurrentPhraseIndex(0);
      }
    } else if (currentStep === 'gratitude') {
      if (currentPhraseIndex < gratitudes.length - 1) {
        setCurrentPhraseIndex(currentPhraseIndex + 1);
      } else {
        setCurrentStep('reflection');
      }
    }
  }, [currentStep, currentPhraseIndex, affirmations.length, gratitudes.length, hapticFeedback]);

  const completeSession = useCallback(() => {
    if (!sessionStartTime || !goalStore.currentGoal) return;
    
    const duration = Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000);
    
    manifestationStore.addSession({
      goalId: goalStore.currentGoal.id,
      type: 'affirmation',
      phrases: [...affirmations, ...gratitudes],
      duration,
      moodBefore: moodBefore || undefined,
      moodAfter: moodAfter || undefined,
      reflection: reflection || undefined,
    });
    
    setCurrentStep('complete');
    hapticFeedback();
    
    setTimeout(() => {
      onComplete();
    }, 3000);
  }, [
    sessionStartTime,
    goalStore.currentGoal,
    manifestationStore,
    affirmations,
    gratitudes,
    moodBefore,
    moodAfter,
    reflection,
    hapticFeedback,
    onComplete,
  ]);

  const renderMoodSelector = (mood: number | null, setMood: (mood: number) => void, title: string) => (
    <View style={styles.moodContainer}>
      <Text style={styles.moodTitle}>{title}</Text>
      <View style={styles.moodButtons}>
        {[1, 2, 3, 4, 5].map((value) => (
          <TouchableOpacity
            key={value}
            style={[
              styles.moodButton,
              mood === value && styles.moodButtonSelected,
            ]}
            onPress={() => {
              setMood(value);
              hapticFeedback();
            }}
          >
            <Text style={[
              styles.moodButtonText,
              mood === value && styles.moodButtonTextSelected,
            ]}>
              {value}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStartScreen = () => (
    <View style={styles.centerContent}>
      <Animated.View style={[styles.centerCircle, { transform: [{ scale: pulseAnim }] }]}>
        <Sparkles size={48} color={theme.colors.primary} />
      </Animated.View>
      
      <Text style={styles.title}>Guided Manifestation</Text>
      <Text style={styles.subtitle}>
        3-minute session of success visualization and gratitude
      </Text>
      
      {renderMoodSelector(moodBefore, setMoodBefore, 'How are you feeling right now?')}
      
      <TouchableOpacity
        style={styles.startButton}
        onPress={startSession}
        disabled={!moodBefore}
      >
        <Play size={24} color={theme.colors.background} />
        <Text style={styles.startButtonText}>Start Session</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSessionScreen = () => (
    <View style={styles.centerContent}>
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <Animated.View 
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {currentStep === 'affirmations' ? 'Success Visualization' : 'Gratitudes'}
        </Text>
      </View>

      <Animated.View style={[styles.centerCircle, { transform: [{ scale: pulseAnim }] }]}>
        {currentStep === 'affirmations' ? (
          <Sparkles size={48} color={theme.colors.primary} />
        ) : (
          <Heart size={48} color={theme.colors.primary} />
        )}
      </Animated.View>

      <Animated.View style={[styles.phraseContainer, { opacity: fadeAnim }]}>
        <Text style={styles.phrase}>
          {currentPhrases[currentPhraseIndex]}
        </Text>
      </Animated.View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setCurrentPhraseIndex(Math.max(0, currentPhraseIndex - 1))}
          disabled={currentPhraseIndex === 0 && currentStep === 'affirmations'}
        >
          <RotateCcw size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={nextPhrase}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.instruction}>
        Repeat the phrase aloud or mentally
      </Text>
    </View>
  );

  const renderReflectionScreen = () => (
    <View style={styles.centerContent}>
      <Text style={styles.title}>How are you feeling?</Text>
      
      {renderMoodSelector(moodAfter, setMoodAfter, 'How do you feel now?')}
      
      <TouchableOpacity
        style={styles.completeButton}
        onPress={completeSession}
        disabled={!moodAfter}
      >
        <Text style={styles.completeButtonText}>Complete Session</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCompleteScreen = () => (
    <View style={styles.centerContent}>
      <Animated.View style={[styles.centerCircle, { transform: [{ scale: sparkleAnim }] }]}>
        <Sparkles size={64} color={theme.colors.primary} />
      </Animated.View>
      
      <Text style={styles.completeTitle}>Session Complete! ✨</Text>
      <Text style={styles.completeSubtitle}>
        Great work! Your energy is directed towards your goal.
      </Text>
      
      {moodBefore && moodAfter && (
        <View style={styles.moodImprovement}>
          <Text style={styles.moodImprovementText}>
            Mood: +{moodAfter - moodBefore}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <GradientBackground style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/home');
            }
          }}
        >
          <X size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {currentStep === 'start' && renderStartScreen()}
        {(currentStep === 'affirmations' || currentStep === 'gratitude') && renderSessionScreen()}
        {currentStep === 'reflection' && renderReflectionScreen()}
        {currentStep === 'complete' && renderCompleteScreen()}
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    justifyContent: 'space-between',
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: theme.spacing.sm,
    marginBottom: 0,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginTop: -theme.spacing.xl,
  },
  centerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xxxl,
    ...theme.shadows.gold,
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.regular,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  subtitle: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xxxl,
    lineHeight: 24,
  },
  moodContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxxl,
  },
  moodTitle: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  moodButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  moodButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodButtonSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  moodButtonText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  moodButtonTextSelected: {
    color: theme.colors.background,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xxxl,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.md,
    ...theme.shadows.gold,
  },
  startButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.background,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxxl,
    width: '100%',
  },
  progressBackground: {
    width: '80%',
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  phraseContainer: {
    marginBottom: theme.spacing.xxxl,
    paddingHorizontal: theme.spacing.lg,
  },
  phrase: {
    fontSize: theme.fontSize.xl,
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 32,
    fontStyle: 'italic',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xxxl,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
    ...theme.shadows.gold,
  },
  nextButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.background,
  },
  instruction: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textLight,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  completeButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xxxl,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
    ...theme.shadows.gold,
  },
  completeButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.background,
  },
  completeTitle: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.regular,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  completeSubtitle: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing.xl,
  },
  moodImprovement: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  moodImprovementText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.medium,
  },
});