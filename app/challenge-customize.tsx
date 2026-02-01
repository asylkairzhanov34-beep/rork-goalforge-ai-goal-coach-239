import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { 
  ArrowLeft,
  Clock, 
  Dumbbell,
  Sun,
  Moon,
  Sparkles,
  AlertCircle,
  ChevronRight,
  Check,
  Zap,
  User,
  Heart,
  Coffee,
  Briefcase,
  Trophy,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/constants/theme';
import { getChallengeById } from '@/constants/challenges';
import { useChallengeStore } from '@/hooks/use-challenge-store';
import { ChallengeCustomization, ChallengeDifficulty } from '@/types/challenge';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55+'];

const FITNESS_LEVELS: { id: ChallengeDifficulty; label: string; description: string; icon: React.ReactNode }[] = [
  { id: 'beginner', label: 'Beginner', description: 'New to fitness or returning after a long break', icon: <Zap size={24} color="#4ECDC4" /> },
  { id: 'intermediate', label: 'Intermediate', description: 'Regular exercise 2-3 times per week', icon: <Dumbbell size={24} color="#F39C12" /> },
  { id: 'advanced', label: 'Advanced', description: 'Consistent training 4+ times per week', icon: <Trophy size={24} color="#E74C3C" /> },
];

const TIME_OPTIONS = [30, 45, 60, 90, 120];

const PREFERRED_TIMES: { id: 'morning' | 'afternoon' | 'evening' | 'flexible'; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'morning', label: 'Morning', icon: <Sun size={24} color="#F39C12" />, description: '5:00 - 11:00' },
  { id: 'afternoon', label: 'Afternoon', icon: <Coffee size={24} color="#E67E22" />, description: '11:00 - 17:00' },
  { id: 'evening', label: 'Evening', icon: <Moon size={24} color="#9B59B6" />, description: '17:00 - 22:00' },
  { id: 'flexible', label: 'Flexible', icon: <Clock size={24} color="#3498DB" />, description: 'Anytime' },
];

const WORK_SCHEDULES: { id: 'flexible' | 'fixed_morning' | 'fixed_afternoon' | 'shift_work'; label: string; description: string }[] = [
  { id: 'flexible', label: 'Flexible / Remote', description: 'I set my own schedule' },
  { id: 'fixed_morning', label: 'Morning Shift', description: '8:00 - 17:00' },
  { id: 'fixed_afternoon', label: 'Afternoon Shift', description: '14:00 - 22:00' },
  { id: 'shift_work', label: 'Shift Work', description: 'Rotating schedule' },
];

const COMMON_RESTRICTIONS = [
  'Back problems',
  'Knee issues',
  'Heart condition',
  'Pregnancy',
  'Recent surgery',
  'Joint pain',
  'Asthma',
  'Diabetes',
];

const MOTIVATION_OPTIONS = [
  'Build discipline',
  'Transform my body',
  'Mental toughness',
  'More energy',
  'Better sleep',
  'Stress relief',
  'Confidence boost',
  'Health improvement',
];

export default function ChallengeCustomizeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { startChallenge } = useChallengeStore();

  const challenge = useMemo(() => getChallengeById(id || ''), [id]);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const [age, setAge] = useState<string>('');
  const [fitnessLevel, setFitnessLevel] = useState<ChallengeDifficulty | null>(null);
  const [availableTime, setAvailableTime] = useState(60);
  const [preferredTime, setPreferredTime] = useState<'morning' | 'afternoon' | 'evening' | 'flexible' | null>(null);
  const [workSchedule, setWorkSchedule] = useState<'flexible' | 'fixed_morning' | 'fixed_afternoon' | 'shift_work' | null>(null);
  const [healthRestrictions, setHealthRestrictions] = useState<string[]>([]);
  const [motivation, setMotivation] = useState<string[]>([]);
  const [previousExperience, setPreviousExperience] = useState<boolean | null>(null);

  const isFitnessChallenge = challenge?.category === 'fitness';

  const steps = useMemo(() => {
    const baseSteps = [
      { 
        title: 'About You', 
        subtitle: 'Let\'s personalize your challenge',
        required: true,
      },
      { 
        title: 'Experience Level', 
        subtitle: 'What\'s your current fitness level?',
        required: true,
      },
      { 
        title: 'Daily Schedule', 
        subtitle: 'When can you dedicate time?',
        required: true,
      },
      { 
        title: 'Available Time', 
        subtitle: 'How much time per day?',
        required: true,
      },
    ];

    if (isFitnessChallenge) {
      baseSteps.push({
        title: 'Health Check',
        subtitle: 'Any limitations we should know?',
        required: false,
      });
    }

    baseSteps.push({
      title: 'Your Motivation',
      subtitle: 'What drives you to start?',
      required: true,
    });

    return baseSteps;
  }, [isFitnessChallenge]);

  if (!challenge) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Challenge not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const toggleRestriction = (restriction: string) => {
    setHealthRestrictions(prev => 
      prev.includes(restriction)
        ? prev.filter(r => r !== restriction)
        : [...prev, restriction]
    );
  };

  const toggleMotivation = (item: string) => {
    setMotivation(prev => 
      prev.includes(item)
        ? prev.filter(m => m !== item)
        : [...prev, item]
    );
  };

  const animateTransition = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    
    setTimeout(callback, 150);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      animateTransition(() => {
        setCurrentStep(prev => prev + 1);
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      });
    } else {
      handleStartChallenge();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      animateTransition(() => {
        setCurrentStep(prev => prev - 1);
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      });
    } else {
      router.back();
    }
  };

  const handleStartChallenge = async () => {
    setIsLoading(true);
    try {
      const customization: ChallengeCustomization = {
        fitnessLevel: fitnessLevel || 'intermediate',
        availableTimeMinutes: availableTime,
        preferredTime: preferredTime || 'flexible',
        healthRestrictions,
        goals: motivation.length > 0 ? motivation : ['Build discipline'],
        age,
        workSchedule: workSchedule || undefined,
        previousChallengeExperience: previousExperience || undefined,
      };

      console.log('[ChallengeCustomize] Starting challenge with:', customization);
      
      await startChallenge(challenge.id, customization);
      
      router.replace('/(tabs)/plan' as any);
    } catch (error) {
      console.error('[ChallengeCustomize] Error starting challenge:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return age !== '' && previousExperience !== null;
      case 1:
        return fitnessLevel !== null;
      case 2:
        return preferredTime !== null && workSchedule !== null;
      case 3:
        return true;
      case 4:
        if (isFitnessChallenge) return true;
        return motivation.length > 0;
      case 5:
        return motivation.length > 0;
      default:
        return true;
    }
  };

  const renderStep0 = () => (
    <View style={styles.stepContent}>
      <View style={styles.questionSection}>
        <View style={styles.questionHeader}>
          <User size={20} color={challenge.color} />
          <Text style={styles.questionTitle}>Your Age Range</Text>
        </View>
        <View style={styles.ageGrid}>
          {AGE_RANGES.map((ageRange) => (
            <TouchableOpacity
              key={ageRange}
              style={[
                styles.ageChip,
                age === ageRange && styles.ageChipSelected,
                age === ageRange && { backgroundColor: challenge.color, borderColor: challenge.color }
              ]}
              onPress={() => setAge(ageRange)}
            >
              <Text style={[
                styles.ageChipText,
                age === ageRange && styles.ageChipTextSelected
              ]}>{ageRange}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.questionSection}>
        <View style={styles.questionHeader}>
          <Trophy size={20} color={challenge.color} />
          <Text style={styles.questionTitle}>Have you done similar challenges before?</Text>
        </View>
        <View style={styles.experienceRow}>
          <TouchableOpacity
            style={[
              styles.experienceCard,
              previousExperience === true && styles.experienceCardSelected,
              previousExperience === true && { borderColor: challenge.color }
            ]}
            onPress={() => setPreviousExperience(true)}
          >
            <Check size={24} color={previousExperience === true ? challenge.color : theme.colors.textSecondary} />
            <Text style={[
              styles.experienceText,
              previousExperience === true && { color: challenge.color }
            ]}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.experienceCard,
              previousExperience === false && styles.experienceCardSelected,
              previousExperience === false && { borderColor: challenge.color }
            ]}
            onPress={() => setPreviousExperience(false)}
          >
            <Zap size={24} color={previousExperience === false ? challenge.color : theme.colors.textSecondary} />
            <Text style={[
              styles.experienceText,
              previousExperience === false && { color: challenge.color }
            ]}>First time</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      {FITNESS_LEVELS.map((level) => (
        <TouchableOpacity
          key={level.id}
          style={[
            styles.levelCard,
            fitnessLevel === level.id && styles.levelCardSelected,
            fitnessLevel === level.id && { borderColor: challenge.color }
          ]}
          onPress={() => setFitnessLevel(level.id)}
        >
          <View style={styles.levelHeader}>
            <View style={[
              styles.levelIcon,
              { backgroundColor: fitnessLevel === level.id ? challenge.color + '30' : theme.colors.surface }
            ]}>
              {level.icon}
            </View>
            {fitnessLevel === level.id && (
              <View style={[styles.checkIcon, { backgroundColor: challenge.color }]}>
                <Check size={16} color="#000" />
              </View>
            )}
          </View>
          <Text style={[
            styles.levelTitle,
            fitnessLevel === level.id && { color: '#FFF' }
          ]}>{level.label}</Text>
          <Text style={styles.levelDescription}>{level.description}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <View style={styles.questionSection}>
        <View style={styles.questionHeader}>
          <Clock size={20} color={challenge.color} />
          <Text style={styles.questionTitle}>Preferred Time</Text>
        </View>
        <View style={styles.timeGrid}>
          {PREFERRED_TIMES.map((time) => (
            <TouchableOpacity
              key={time.id}
              style={[
                styles.timeCard,
                preferredTime === time.id && styles.timeCardSelected,
                preferredTime === time.id && { borderColor: challenge.color }
              ]}
              onPress={() => setPreferredTime(time.id)}
            >
              <View style={[
                styles.timeIcon,
                preferredTime === time.id && { backgroundColor: challenge.color + '30' }
              ]}>
                {time.icon}
              </View>
              <Text style={[
                styles.timeLabel,
                preferredTime === time.id && { color: '#FFF' }
              ]}>{time.label}</Text>
              <Text style={styles.timeDesc}>{time.description}</Text>
              {preferredTime === time.id && (
                <View style={[styles.checkIconSmall, { backgroundColor: challenge.color }]}>
                  <Check size={12} color="#000" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.questionSection}>
        <View style={styles.questionHeader}>
          <Briefcase size={20} color={challenge.color} />
          <Text style={styles.questionTitle}>Work Schedule</Text>
        </View>
        <View style={styles.scheduleList}>
          {WORK_SCHEDULES.map((schedule) => (
            <TouchableOpacity
              key={schedule.id}
              style={[
                styles.scheduleCard,
                workSchedule === schedule.id && styles.scheduleCardSelected,
                workSchedule === schedule.id && { borderColor: challenge.color }
              ]}
              onPress={() => setWorkSchedule(schedule.id)}
            >
              <View style={styles.scheduleContent}>
                <Text style={[
                  styles.scheduleLabel,
                  workSchedule === schedule.id && { color: '#FFF' }
                ]}>{schedule.label}</Text>
                <Text style={styles.scheduleDesc}>{schedule.description}</Text>
              </View>
              {workSchedule === schedule.id && (
                <View style={[styles.checkIconSmall, { backgroundColor: challenge.color }]}>
                  <Check size={12} color="#000" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <View style={styles.timeSlider}>
        {TIME_OPTIONS.map((time) => (
          <TouchableOpacity
            key={time}
            style={[
              styles.timeOption,
              availableTime === time && styles.timeOptionSelected,
              availableTime === time && { backgroundColor: challenge.color }
            ]}
            onPress={() => setAvailableTime(time)}
          >
            <Text style={[
              styles.timeText,
              availableTime === time && styles.timeTextSelected
            ]}>{time}</Text>
            <Text style={[
              styles.timeMinLabel,
              availableTime === time && styles.timeMinLabelSelected
            ]}>min</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={[styles.timeInfo, { backgroundColor: challenge.color + '15' }]}>
        <Clock size={20} color={challenge.color} />
        <Text style={[styles.timeInfoText, { color: challenge.color }]}>
          You will spend about {availableTime} minutes daily on this challenge
        </Text>
      </View>
    </View>
  );

  const renderHealthStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.restrictionsGrid}>
        {COMMON_RESTRICTIONS.map((restriction) => (
          <TouchableOpacity
            key={restriction}
            style={[
              styles.restrictionChip,
              healthRestrictions.includes(restriction) && styles.restrictionChipSelected,
            ]}
            onPress={() => toggleRestriction(restriction)}
          >
            <Text style={[
              styles.restrictionText,
              healthRestrictions.includes(restriction) && { color: '#E74C3C' }
            ]}>{restriction}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {healthRestrictions.length > 0 && (
        <View style={styles.selectedRestrictions}>
          <AlertCircle size={16} color="#E74C3C" />
          <Text style={styles.selectedRestrictionsText}>
            AI will adapt tasks for: {healthRestrictions.join(', ')}
          </Text>
        </View>
      )}

      {healthRestrictions.length === 0 && (
        <View style={[styles.noRestrictionsCard, { backgroundColor: challenge.color + '15' }]}>
          <Heart size={20} color={challenge.color} />
          <Text style={[styles.noRestrictionsText, { color: challenge.color }]}>
            No restrictions? Great! You will get the full challenge experience.
          </Text>
        </View>
      )}
    </View>
  );

  const renderMotivationStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.motivationGrid}>
        {MOTIVATION_OPTIONS.map((item) => (
          <TouchableOpacity
            key={item}
            style={[
              styles.motivationChip,
              motivation.includes(item) && styles.motivationChipSelected,
              motivation.includes(item) && { borderColor: challenge.color, backgroundColor: challenge.color + '20' }
            ]}
            onPress={() => toggleMotivation(item)}
          >
            {motivation.includes(item) && (
              <Check size={14} color={challenge.color} />
            )}
            <Text style={[
              styles.motivationText,
              motivation.includes(item) && { color: challenge.color }
            ]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {motivation.length > 0 && (
        <View style={[styles.motivationInfo, { backgroundColor: challenge.color + '15' }]}>
          <Sparkles size={20} color={challenge.color} />
          <Text style={[styles.motivationInfoText, { color: challenge.color }]}>
            AI will personalize your plan to help you: {motivation.join(', ').toLowerCase()}
          </Text>
        </View>
      )}
    </View>
  );

  const renderStepContent = () => {
    const healthStepIndex = isFitnessChallenge ? 4 : -1;
    const motivationStepIndex = isFitnessChallenge ? 5 : 4;

    if (currentStep === 0) return renderStep0();
    if (currentStep === 1) return renderStep1();
    if (currentStep === 2) return renderStep2();
    if (currentStep === 3) return renderStep3();
    if (currentStep === healthStepIndex) return renderHealthStep();
    if (currentStep === motivationStepIndex || currentStep === 4) return renderMotivationStep();
    
    return null;
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen options={{ headerShown: false }} />
      
      <LinearGradient
        colors={[challenge.color + '20', 'transparent']}
        style={styles.headerGradient}
      />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity 
          style={styles.backIconButton}
          onPress={handleBack}
        >
          <ArrowLeft size={24} color="#FFF" />
        </TouchableOpacity>
        
        <View style={styles.progressContainer}>
          {steps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index <= currentStep && { backgroundColor: challenge.color },
              ]}
            />
          ))}
        </View>
        
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.titleContainer}>
            <View style={[styles.stepIndicator, { backgroundColor: challenge.color + '20' }]}>
              <Text style={[styles.stepNumber, { color: challenge.color }]}>{currentStep + 1}</Text>
            </View>
            <Text style={styles.challengeName}>{challenge.name}</Text>
            <Text style={styles.stepTitle}>{steps[currentStep].title}</Text>
            <Text style={styles.stepSubtitle}>{steps[currentStep].subtitle}</Text>
          </View>

          {renderStepContent()}
        </Animated.View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            !canProceed() && styles.nextButtonDisabled
          ]}
          onPress={handleNext}
          disabled={!canProceed() || isLoading}
        >
          <LinearGradient
            colors={canProceed() ? [challenge.color, challenge.color + 'CC'] : ['#444', '#333']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.nextButtonGradient}
          />
          {isLoading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Text style={styles.nextButtonText}>
                {currentStep === steps.length - 1 ? 'Start Challenge' : 'Continue'}
              </Text>
              <ChevronRight size={20} color="#000" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  stepIndicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  challengeName: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600' as const,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  stepContent: {
    gap: 16,
  },
  questionSection: {
    marginBottom: 8,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  questionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  ageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ageChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ageChipSelected: {},
  ageChipText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
  },
  ageChipTextSelected: {
    color: '#000',
  },
  experienceRow: {
    flexDirection: 'row',
    gap: 12,
  },
  experienceCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
    gap: 10,
  },
  experienceCardSelected: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  experienceText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
  },
  levelCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  levelCardSelected: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  levelDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  timeCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
    position: 'relative',
  },
  timeCardSelected: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  timeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginBottom: 10,
  },
  timeLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  timeDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  checkIconSmall: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleList: {
    gap: 10,
  },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  scheduleCardSelected: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  scheduleContent: {
    flex: 1,
  },
  scheduleLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  scheduleDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  timeSlider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  timeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timeOptionSelected: {
    borderColor: 'transparent',
  },
  timeText: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: theme.colors.textSecondary,
  },
  timeTextSelected: {
    color: '#000',
  },
  timeMinLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  timeMinLabelSelected: {
    color: 'rgba(0,0,0,0.6)',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginTop: 8,
  },
  timeInfoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  restrictionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  restrictionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  restrictionChipSelected: {
    borderColor: '#E74C3C',
    backgroundColor: 'rgba(231, 76, 60, 0.15)',
  },
  restrictionText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  selectedRestrictions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 8,
  },
  selectedRestrictionsText: {
    flex: 1,
    fontSize: 14,
    color: '#E74C3C',
    lineHeight: 20,
  },
  noRestrictionsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 8,
  },
  noRestrictionsText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  motivationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  motivationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  motivationChipSelected: {},
  motivationText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  motivationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 16,
  },
  motivationInfoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: '#000',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    gap: 8,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#000',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#FFF',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#000',
  },
});
