import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  Modal,
  TouchableOpacity,
  Animated,
  Easing,
  AccessibilityInfo
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, X, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/constants/theme';
import { Button } from '@/components/Button';
import { useGoalStore } from '@/hooks/use-goal-store';
import { Goal, DailyTask } from '@/types/goal';


const questions = [
  "What specific goal do you want to achieve?",
  "Why is this goal important to you?",
  "What obstacles might you face?",
  "What resources or support do you have?",
  "How much time per day can you dedicate?",
  "What would success look like for you?",
];

const questionHints = [
  "E.g.: Learn Spanish to B2 level, Run a marathon, Launch my own business...",
  "E.g.: Career growth, Personal development, Health improvement...",
  "E.g.: Lack of time, Procrastination, Limited budget...",
  "E.g.: Online courses, Mentor, Books, Community support...",
  "E.g.: 30 minutes, 1 hour, 2 hours in the evening...",
  "E.g.: Fluent conversations, Finish the race, First paying customer...",
];


const LOADING_MESSAGES = [
  { text: 'Analyzing your goal...', emoji: '🎯' },
  { text: 'Building your strategy...', emoji: '📋' },
  { text: 'Optimizing for results...', emoji: '⚡' },
  { text: 'Creating daily tasks...', emoji: '✨' },
  { text: 'Personalizing your plan...', emoji: '🚀' },
  { text: 'Almost ready...', emoji: '🎉' },
];

export function GoalCreationModal() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<string[]>(Array(questions.length).fill(''));
  const [currentAnswer, setCurrentAnswer] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState<number>(0);
  const [showDetailsEditor, setShowDetailsEditor] = useState<boolean>(false);
  const [detailsDraft, setDetailsDraft] = useState<string>('');
  
  const { createGoal } = useGoalStore();

  const opacityAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const loadingOpacity = useRef(new Animated.Value(1)).current;
  const loadingScale = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  

  const animateTransition = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: -10,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
      translateYAnim.setValue(10);
      
      setTimeout(() => {
         Animated.parallel([
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.spring(translateYAnim, {
            toValue: 0,
            friction: 7,
            tension: 40,
            useNativeDriver: true,
          }),
        ]).start(() => {
           AccessibilityInfo.announceForAccessibility(`Question ${currentQuestion + 1}: ${questions[currentQuestion]}`);
        });
      }, 50);
    });
  };

  const handleNext = () => {
    if (currentAnswer.trim()) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.96, duration: 60, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.0, duration: 60, useNativeDriver: true }),
      ]).start();

      const nextAction = () => {
        const newAnswers = [...answers];
        newAnswers[currentQuestion] = currentAnswer;
        setAnswers(newAnswers);
        
        if (currentQuestion < questions.length - 1) {
          setCurrentQuestion(currentQuestion + 1);
          setCurrentAnswer(answers[currentQuestion + 1] || '');
        } else {
          generatePlan(newAnswers);
        }
      };

      if (currentQuestion < questions.length - 1) {
        animateTransition(nextAction);
      } else {
        nextAction();
      }
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      animateTransition(() => {
        setCurrentQuestion(currentQuestion - 1);
        setCurrentAnswer(answers[currentQuestion - 1]);
      });
    }
  };

  

  const generatePlan = async (finalAnswers: string[]) => {
    setIsGenerating(true);
    setLoadingMessageIndex(0);
    
    try {
      const prompt = `
        Create a detailed goal achievement plan in English:
        Goal: ${finalAnswers[0]}
        Motivation: ${finalAnswers[1]}
        Obstacles: ${finalAnswers[2]}
        Resources: ${finalAnswers[3]}
        Time per day: ${finalAnswers[4]}
        Success criteria: ${finalAnswers[5]}
        
        Create JSON with:
        1. goal object with fields: title, description, category, motivation
        2. dailyPlans array - 7-day starter plan where each day contains 2-3 INTERCONNECTED tasks
        
        CRITICALLY IMPORTANT:
        - Each day should contain EXACTLY 2-3 tasks of varying difficulty
        - Tasks within a day should be LOGICALLY CONNECTED and complement each other
        - Tasks should form a UNIFIED STRUCTURE where each subsequent task builds on the previous one
        - Progress should be gradual - from simple to complex over 7 days
        
        Structure of dailyPlans:
        [
          {
            "dayNumber": 1,
            "dailyTheme": "Day theme (e.g.: Basics and planning)",
            "tasks": [
              {
                "title": "Task name",
                "description": "Detailed description (2-3 sentences)",
                "duration": "time (e.g. 20 minutes)",
                "priority": "high/medium/low",
                "difficulty": "easy/medium/hard",
                "estimatedTime": number in minutes,
                "connectionToNext": "How this task connects to the next",
                "tips": ["tip 1", "tip 2"],
                "subtasks": [
                  { "title": "Specific subtask", "estimatedTime": 5, "completed": false }
                ]
              }
            ]
          }
        ]
        
        Examples of task connectivity within a day:
        - Language learning day: 1) Learn 10 new words → 2) Create 5 sentences with these words → 3) Listen to dialogue with these words
        - Fitness day: 1) 10 min warm-up → 2) Main workout → 3) Stretching and analysis
        - Business day: 1) Research market → 2) Analyze competitors → 3) Create action plan
        
        Difficulty distribution within a day:
        - 1 easy task (easy) - preparation/warm-up
        - 1 medium task (medium) - main work  
        - 1 hard task (hard) - application/reinforcement (optional)
        
        Generate EXACTLY 7 days.
        Format: { "goal": {...}, "dailyPlans": [...] }
      `;

      const toolkitBaseUrl = (process.env.EXPO_PUBLIC_TOOLKIT_URL || 'https://toolkit.rork.com').replace(/\/$/, '');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);

      const response = await fetch(`${toolkitBaseUrl}/text/llm/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are an expert goal achievement coach. Create VERY DETAILED, practical plans. In subtasks ALWAYS specify concrete actions with numbers (number of repetitions, specific exercises, specific words to learn). DO NOT use generic formulations. Respond only with valid JSON without additional text. All texts in English.' },
            { role: 'user', content: prompt }
          ]
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      const rawText = await response.text();
      console.log('[GoalCreationModal] Raw AI response status:', response.status);

      if (!response.ok) {
        throw new Error(`AI request failed (${response.status})`);
      }

      const data = JSON.parse(rawText) as { completion?: string };
      
      const completion = data.completion ?? '';
      if (!completion.trim()) {
        throw new Error('AI returned an empty response');
      }

      let jsonString = completion.trim();
      
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/```\s*/, '').replace(/\s*```$/, '');
      }
      
      const startIndex = jsonString.indexOf('{');
      const lastIndex = jsonString.lastIndexOf('}');
      
      if (startIndex === -1 || lastIndex === -1) {
        throw new Error('No valid JSON found in response');
      }
      
      jsonString = jsonString.substring(startIndex, lastIndex + 1);
      
      jsonString = jsonString.replace(/\/\/[^\n]*\n/g, '\n');
      jsonString = jsonString.replace(/\/\*[\s\S]*?\*\//g, '');
      jsonString = jsonString.replace(/,\s*([}\]])/g, '$1');
      
      const planData = JSON.parse(jsonString);
      
      if (!planData.goal || (!planData.dailyPlans && !planData.tasks)) {
        throw new Error('Invalid plan structure received from AI');
      }
      
      const startDate = new Date();

      const goal: Omit<Goal, 'id' | 'createdAt' | 'isActive' | 'completedTasksCount' | 'totalTasksCount'> = {
        title: planData.goal?.title || finalAnswers[0],
        description: planData.goal?.description || `Personal plan to achieve: ${finalAnswers[0]}`,
        category: planData.goal?.category || 'Personal Development',
        motivation: planData.goal?.motivation || finalAnswers[1],
        obstacles: [finalAnswers[2]],
        resources: [finalAnswers[3]],
        startDate: startDate.toISOString(),
        planType: 'free',
      };

      const tasks: Omit<DailyTask, 'id' | 'goalId' | 'completed' | 'completedAt'>[] = [];
      
      const dailyPlans = planData.dailyPlans || planData.tasks;
      
      if (Array.isArray(dailyPlans)) {
        dailyPlans.forEach((dayPlan: any, dayIndex: number) => {
          const dayDate = new Date();
          dayDate.setDate(dayDate.getDate() + dayIndex);
          
          const dayTasks = dayPlan?.tasks || [dayPlan];
          
          dayTasks.forEach((task: any, taskIndex: number) => {
            const subtasks = Array.isArray(task?.subtasks) ? task.subtasks.map((st: any, stIndex: number) => ({
              id: `subtask_${Date.now()}_${dayIndex}_${taskIndex}_${stIndex}`,
              title: st?.title || `Subtask ${stIndex + 1}`,
              completed: false,
              estimatedTime: st?.estimatedTime || 10,
            })) : undefined;
            
            tasks.push({
              day: dayIndex + 1,
              date: dayDate.toISOString(),
              title: task?.title || `Task ${dayIndex + 1}.${taskIndex + 1}`,
              description: task?.description || 'Work on your goal today',
              duration: task?.duration || finalAnswers[4] || '30 minutes',
              priority: (task?.priority as 'high' | 'medium' | 'low') || 'medium',
              tips: Array.isArray(task?.tips) ? task.tips : ['Stay focused', 'Take breaks when needed'],
              difficulty: (task?.difficulty as 'easy' | 'medium' | 'hard') || 'medium',
              estimatedTime: task?.estimatedTime || 30,
              subtasks,
            });
          });
        });
      }

      await createGoal(goal, tasks);
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/home');
      }
    } catch (error) {
      console.error('Error generating plan:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      const AlertModule = await import('react-native');
      AlertModule.Alert.alert(
        'Failed to create goal',
        `Please try again.\n\nError: ${errorMessage}`,
        [{ text: 'OK' }]
      );
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    const totalSteps = questions.length;
    const currentStep = currentQuestion + 1;
    Animated.timing(progressAnim, {
      toValue: (currentStep / totalSteps) * 100,
      duration: 240,
      useNativeDriver: false,
    }).start();
  }, [currentQuestion, progressAnim]);

  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        Animated.sequence([
          Animated.parallel([
            Animated.timing(loadingOpacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(loadingScale, {
              toValue: 0.9,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(loadingOpacity, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start(() => {
          setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
          Animated.parallel([
            Animated.timing(loadingOpacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.spring(loadingScale, {
              toValue: 1,
              friction: 8,
              tension: 40,
              useNativeDriver: true,
            }),
          ]).start();
        });
      }, 2500);

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      return () => {
        clearInterval(interval);
        pulseAnim.stopAnimation();
      };
    }
  }, [isGenerating, loadingOpacity, loadingScale, pulseAnim]);

  

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={0}
        >
          <View style={styles.header}>
          <TouchableOpacity
            testID="goalCreation_back"
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/home');
              }
            }}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <ArrowLeft size={22} color={theme.colors.text} />
          </TouchableOpacity>

          <View style={styles.headerProgressWrap}>
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {currentQuestion + 1}/{questions.length}
            </Text>
          </View>
        </View>

        {isGenerating ? (
          <View style={styles.loadingContainer}>
            <Animated.View
              style={[
                styles.loadingIconContainer,
                {
                  transform: [
                    { scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={['#FFD600', '#FF9500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.loadingIconGradient}
              >
                <Sparkles size={40} color="#000" />
              </LinearGradient>
            </Animated.View>
            
            <Animated.View
              style={[
                styles.loadingMessageContainer,
                {
                  opacity: loadingOpacity,
                  transform: [{ scale: loadingScale }],
                },
              ]}
            >
              <Text style={styles.loadingEmoji}>
                {LOADING_MESSAGES[loadingMessageIndex].emoji}
              </Text>
              <Text style={styles.loadingText}>
                {LOADING_MESSAGES[loadingMessageIndex].text}
              </Text>
            </Animated.View>
            
            <View style={styles.loadingProgressContainer}>
              <View style={styles.loadingProgressBar}>
                <Animated.View
                  style={[
                    styles.loadingProgressFill,
                    {
                      width: pulseAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['30%', '70%'],
                      }),
                    },
                  ]}
                />
              </View>
              <Text style={styles.loadingSubtext}>Building your starter plan</Text>
            </View>
          </View>
        ) : (
          <ScrollView 
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View style={{ 
              opacity: opacityAnim, 
              transform: [{ translateY: translateYAnim }],
              width: '100%'
            }}>
              <View style={styles.questionContainer}>
                <Text style={styles.question}>{questions[currentQuestion]}</Text>
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  ref={inputRef}
                  testID="goalCreation_answerInput"
                  style={styles.input}
                  placeholder={questionHints[currentQuestion]}
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={currentAnswer}
                  onChangeText={setCurrentAnswer}
                  multiline
                  autoCorrect
                  autoCapitalize="sentences"
                  returnKeyType={currentQuestion === questions.length - 1 ? 'done' : 'next'}
                  blurOnSubmit={false}
                  onKeyPress={(e) => {
                    if (Platform.OS === 'web') {
                      const native = e.nativeEvent as unknown as { key?: string; shiftKey?: boolean };
                      if (native?.key === 'Enter' && !native?.shiftKey) {
                        if (currentAnswer.trim()) {
                          handleNext();
                        }
                      }
                      return;
                    }

                    const native = e.nativeEvent as unknown as { key?: string };
                    if (native?.key === 'Enter') {
                      if (currentAnswer.trim()) {
                        handleNext();
                      }
                    }
                  }}
                  onSubmitEditing={() => {
                    if (currentAnswer.trim()) {
                      handleNext();
                    }
                  }}
                />
              </View>
            </Animated.View>

            <View style={styles.footer}>
              <View style={styles.buttonRow}>
                {currentQuestion > 0 && (
                  <Button
                    title="Back"
                    onPress={handleBack}
                    variant="outline"
                    style={styles.footerBackButton}
                  />
                )}
                <Animated.View style={[
                  styles.nextButtonWrapper, 
                  { transform: [{ scale: scaleAnim }] },
                  currentQuestion === 0 && { flex: 1 }
                ]}>
                  <Button
                    title={currentQuestion === questions.length - 1 ? "Create Goal" : "Next"}
                    onPress={handleNext}
                    variant="premium"
                    disabled={!currentAnswer.trim()}
                    style={styles.nextButton}
                  />
                </Animated.View>
              </View>
            </View>
          </ScrollView>
        )}

        <Modal
          visible={showDetailsEditor}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.detailsContainer} edges={['top', 'bottom']}>
            <View style={styles.detailsHeader}>
              <TouchableOpacity
                testID="goalCreation_detailsClose"
                onPress={() => setShowDetailsEditor(false)}
                style={styles.detailsHeaderButton}
                activeOpacity={0.8}
              >
                <X size={20} color={theme.colors.text} />
              </TouchableOpacity>

              <Text style={styles.detailsHeaderTitle}>Details</Text>

              <TouchableOpacity
                testID="goalCreation_detailsSave"
                onPress={() => {
                  setCurrentAnswer(detailsDraft);
                  setShowDetailsEditor(false);
                }}
                style={[styles.detailsHeaderButton, styles.detailsSaveButton]}
                activeOpacity={0.8}
              >
                <Text style={styles.detailsSaveText}>Save</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.detailsBody}>
              <Text style={styles.detailsHint}>{questions[currentQuestion]}</Text>
              <TextInput
                testID="goalCreation_detailsInput"
                style={styles.detailsInput}
                value={detailsDraft}
                onChangeText={setDetailsDraft}
                placeholder="Write a longer answer…"
                placeholderTextColor={theme.colors.textLight}
                multiline
                textAlignVertical="top"
                autoCapitalize="sentences"
                autoCorrect
                returnKeyType="done"
              />
            </View>
          </SafeAreaView>
        </Modal>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerProgressWrap: {
    flex: 1,
    paddingRight: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 999,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 6,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
  },
  questionContainer: {
    marginBottom: theme.spacing.xl,
  },
  question: {
    fontSize: 40,
    fontWeight: '800' as const,
    color: theme.colors.text,
    lineHeight: 46,
    letterSpacing: -0.5,
  },
  inputContainer: {
    marginBottom: theme.spacing.xl,
    paddingTop: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.18)',
  },
  input: {
    minHeight: 56,
    maxHeight: 140,
    paddingHorizontal: 0,
    paddingVertical: 0,
    fontSize: 20,
    fontWeight: '600' as const,
    color: theme.colors.text,
    backgroundColor: 'transparent',
    borderWidth: 0,
    textAlignVertical: 'top',
  },
  nextButtonWrapper: {
    flex: 2,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: theme.spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  footerBackButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  loadingIconContainer: {
    marginBottom: 32,
  },
  loadingIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMessageContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  loadingEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 22,
    fontWeight: '600' as const,
    color: theme.colors.text,
    textAlign: 'center',
  },
  loadingProgressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  loadingProgressBar: {
    width: '80%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  loadingProgressFill: {
    height: '100%',
    backgroundColor: '#FFD600',
    borderRadius: 3,
  },
  loadingSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },

  detailsContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailsHeaderTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  detailsHeaderButton: {
    minWidth: 44,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
  },
  detailsSaveButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    borderColor: 'rgba(255, 215, 0, 0.22)',
  },
  detailsSaveText: {
    fontSize: 13,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
  },
  detailsBody: {
    flex: 1,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  detailsHint: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  detailsInput: {
    flex: 1,
    borderRadius: 18,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    backgroundColor: '#0F1213',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.08)',
  },
  
});
