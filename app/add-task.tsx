import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Sparkles,
  Clock,
  Flag,
  Zap,
  Calendar,
  Lightbulb,
  Check,
} from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useGoalStore } from '@/hooks/use-goal-store';
import { getPendingTaskData, clearPendingTaskData } from '@/hooks/use-chat-store';

type Priority = 'high' | 'medium' | 'low';
type Difficulty = 'easy' | 'medium' | 'hard';

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'high', label: 'High', color: '#EF4444' },
  { value: 'medium', label: 'Medium', color: '#F59E0B' },
  { value: 'low', label: 'Low', color: '#10B981' },
];

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

export default function AddTaskScreen() {
  const { addTask, currentGoal, dailyTasks } = useGoalStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('30 minutes');
  const [priority, setPriority] = useState<Priority>('medium');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [estimatedTime, setEstimatedTime] = useState(30);
  const [tips, setTips] = useState<string[]>(['Stay focused', 'Take breaks when needed']);
  const [isFromAI, setIsFromAI] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pendingData = getPendingTaskData();
    if (pendingData) {
      console.log('[AddTask] Loading pending task data:', pendingData);
      setTitle(pendingData.title);
      setDescription(pendingData.description);
      setDuration(pendingData.duration);
      setPriority(pendingData.priority);
      setDifficulty(pendingData.difficulty);
      setEstimatedTime(pendingData.estimatedTime);
      setTips(pendingData.tips);
      setIsFromAI(true);
      clearPendingTaskData();
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [fadeAnim, slideAnim, pulseAnim]);

  const handleSave = async () => {
    if (!title.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    try {
      const today = new Date();
      const nextDay = dailyTasks.length > 0 
        ? Math.max(...dailyTasks.filter(t => t.goalId === currentGoal?.id).map(t => t.day)) + 1 
        : 1;

      await addTask({
        day: nextDay,
        date: today.toISOString(),
        title: title.trim(),
        description: description.trim() || 'Task created via AI assistant',
        duration,
        priority,
        tips,
        difficulty,
        estimatedTime,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/plan');
      }
    } catch (error) {
      console.error('[AddTask] Error saving task:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    clearPendingTaskData();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/home');
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
              activeOpacity={0.8}
            >
              <ArrowLeft size={22} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {isFromAI ? 'Review Task' : 'Add Task'}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          {isFromAI && (
            <View style={styles.aiBadge}>
              <LinearGradient
                colors={['rgba(255, 215, 0, 0.15)', 'rgba(255, 215, 0, 0.05)']}
                style={styles.aiBadgeGradient}
              />
              <Sparkles size={16} color={theme.colors.primary} />
              <Text style={styles.aiBadgeText}>Generated by AI</Text>
            </View>
          )}

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Task Title</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="What do you want to accomplish?"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  maxLength={100}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Add details about this task..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  maxLength={500}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <View style={styles.labelRow}>
                    <Clock size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.label}>Duration</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={duration}
                    onChangeText={setDuration}
                    placeholder="e.g. 30 minutes"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <View style={styles.labelRow}>
                    <Calendar size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.label}>Est. Time (min)</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={String(estimatedTime)}
                    onChangeText={(v) => setEstimatedTime(parseInt(v) || 0)}
                    placeholder="30"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Flag size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.label}>Priority</Text>
                </View>
                <View style={styles.optionsRow}>
                  {PRIORITY_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.optionButton,
                        priority === option.value && styles.optionButtonActive,
                        priority === option.value && { borderColor: option.color },
                      ]}
                      onPress={() => {
                        setPriority(option.value);
                        Haptics.selectionAsync().catch(() => {});
                      }}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.priorityDot,
                          { backgroundColor: option.color },
                        ]}
                      />
                      <Text
                        style={[
                          styles.optionText,
                          priority === option.value && styles.optionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Zap size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.label}>Difficulty</Text>
                </View>
                <View style={styles.optionsRow}>
                  {DIFFICULTY_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.optionButton,
                        difficulty === option.value && styles.optionButtonActive,
                      ]}
                      onPress={() => {
                        setDifficulty(option.value);
                        Haptics.selectionAsync().catch(() => {});
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          difficulty === option.value && styles.optionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {tips.length > 0 && (
                <View style={styles.tipsSection}>
                  <View style={styles.labelRow}>
                    <Lightbulb size={14} color={theme.colors.primary} />
                    <Text style={[styles.label, { color: theme.colors.primary }]}>
                      Tips
                    </Text>
                  </View>
                  <View style={styles.tipsList}>
                    {tips.map((tip, index) => (
                      <View key={index} style={styles.tipItem}>
                        <View style={styles.tipBullet} />
                        <Text style={styles.tipText}>{tip}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </Animated.View>
          </ScrollView>

          <View style={styles.footer}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (!title.trim() || isSaving) && styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={!title.trim() || isSaving}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#FFD600', '#FFAA00']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.saveButtonGradient}
                >
                  <Check size={20} color="#000" />
                  <Text style={styles.saveButtonText}>
                    {isSaving ? 'Saving...' : 'Save Task'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  headerSpacer: {
    width: 44,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  aiBadgeGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  aiBadgeText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: theme.colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  row: {
    flexDirection: 'row',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  optionButtonActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderColor: theme.colors.primary,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: theme.colors.textSecondary,
  },
  optionTextActive: {
    color: theme.colors.text,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tipsSection: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  tipsList: {
    gap: 10,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    marginTop: 6,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FFD600',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#000',
  },
});
