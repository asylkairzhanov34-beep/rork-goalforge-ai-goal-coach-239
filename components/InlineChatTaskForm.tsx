import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  X,
  Clock,
  Flag,
  Zap,
  Calendar,
  Lightbulb,
  Check,
  Sparkles,
} from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useGoalStore } from '@/hooks/use-goal-store';
import { GeneratedTaskData } from '@/hooks/use-chat-store';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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

interface InlineChatTaskFormProps {
  visible: boolean;
  taskData: GeneratedTaskData | null;
  onClose: () => void;
  onSave: () => void;
}

export const InlineChatTaskForm: React.FC<InlineChatTaskFormProps> = ({
  visible,
  taskData,
  onClose,
  onSave,
}) => {
  const { addTask, currentGoal, dailyTasks } = useGoalStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('30 minutes');
  const [priority, setPriority] = useState<Priority>('medium');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [estimatedTime, setEstimatedTime] = useState(30);
  const [tips, setTips] = useState<string[]>(['Stay focused', 'Take breaks when needed']);
  const [isSaving, setIsSaving] = useState(false);

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      if (taskData) {
        setTitle(taskData.title);
        setDescription(taskData.description);
        setDuration(taskData.duration);
        setPriority(taskData.priority);
        setDifficulty(taskData.difficulty);
        setEstimatedTime(taskData.estimatedTime);
        setTips(taskData.tips);
      }

      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 300,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, taskData, slideAnim, backdropAnim]);

  const resetForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setDuration('30 minutes');
    setPriority('medium');
    setDifficulty('medium');
    setEstimatedTime(30);
    setTips(['Stay focused', 'Take breaks when needed']);
  }, []);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onClose();
    setTimeout(resetForm, 350);
  }, [onClose, resetForm]);

  const handleSave = useCallback(async () => {
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
      onSave();
      setTimeout(resetForm, 350);
    } catch (error) {
      console.error('[InlineChatTaskForm] Error saving task:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setIsSaving(false);
    }
  }, [title, description, duration, priority, tips, difficulty, estimatedTime, addTask, currentGoal, dailyTasks, onSave, resetForm]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.backdrop,
          { opacity: backdropAnim },
        ]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
          activeOpacity={1}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.formContainer,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.aiIcon}>
                <Sparkles size={16} color={theme.colors.primary} />
              </View>
              <Text style={styles.headerTitle}>Add Task</Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              activeOpacity={0.8}
            >
              <X size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
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
                  <Clock size={12} color={theme.colors.textSecondary} />
                  <Text style={styles.label}>Duration</Text>
                </View>
                <TextInput
                  style={styles.inputSmall}
                  value={duration}
                  onChangeText={setDuration}
                  placeholder="e.g. 30 min"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <View style={styles.labelRow}>
                  <Calendar size={12} color={theme.colors.textSecondary} />
                  <Text style={styles.label}>Time (min)</Text>
                </View>
                <TextInput
                  style={styles.inputSmall}
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
                <Flag size={12} color={theme.colors.textSecondary} />
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
                <Zap size={12} color={theme.colors.textSecondary} />
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
                  <Lightbulb size={12} color={theme.colors.primary} />
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
          </ScrollView>

          <View style={styles.footer}>
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
                <Check size={18} color="#000" />
                <Text style={styles.saveButtonText}>
                  {isSaving ? 'Saving...' : 'Add to Plan'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  formContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SCREEN_HEIGHT * 0.85,
    backgroundColor: '#0D0D0D',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  keyboardView: {
    flex: 1,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aiIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inputSmall: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  optionButtonActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderColor: theme.colors.primary,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: theme.colors.textSecondary,
  },
  optionTextActive: {
    color: theme.colors.text,
  },
  priorityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  tipsSection: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  tipsList: {
    gap: 8,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tipBullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    marginTop: 5,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  saveButton: {
    borderRadius: 14,
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
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#000',
  },
});

export default InlineChatTaskForm;
