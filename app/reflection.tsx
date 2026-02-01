import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { 
  BookOpen, 
  Send, 
  Sparkles, 
  Flame, 
  X, 
  Calendar,
  ChevronRight,
  CheckCircle,
  Clock
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/constants/theme';
import { GradientBackground } from '@/components/GradientBackground';
import { useJournal } from '@/hooks/use-journal-store';

const MOOD_OPTIONS = [
  { emoji: '😊', label: 'Great', value: 'great' },
  { emoji: '🙂', label: 'Good', value: 'good' },
  { emoji: '😐', label: 'Okay', value: 'okay' },
  { emoji: '😔', label: 'Low', value: 'low' },
  { emoji: '😤', label: 'Stressed', value: 'stressed' },
] as const;

type MoodValue = typeof MOOD_OPTIONS[number]['value'];

export default function ReflectionScreen() {
  const insets = useSafeAreaInsets();
  const { 
    getTodayPrompt, 
    getTodayEntry, 
    addEntry, 
    isGeneratingInsight, 
    getStreak,
    getRecentEntries 
  } = useJournal();
  
  const [text, setText] = useState('');
  const [selectedMood, setSelectedMood] = useState<MoodValue | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const successAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  
  const todayEntry = getTodayEntry();
  const todayPrompt = getTodayPrompt();
  const streak = getStreak();
  const recentEntries = getRecentEntries(5);

  useEffect(() => {
    if (todayEntry) {
      setText(todayEntry.content);
      if (todayEntry.mood) {
        setSelectedMood(todayEntry.mood as MoodValue);
      }
    }
  }, [todayEntry]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    
    Keyboard.dismiss();
    await addEntry(text.trim(), selectedMood || undefined);
    
    setShowSuccess(true);
    Animated.sequence([
      Animated.timing(successAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(successAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setShowSuccess(false));
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateStr === today.toISOString().split('T')[0]) {
      return 'Today';
    } else if (dateStr === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Daily Reflection</Text>
          <View style={styles.headerRight}>
            {streak > 0 && (
              <View style={styles.streakBadge}>
                <Flame size={16} color={theme.colors.primary} />
                <Text style={styles.streakText}>{streak}</Text>
              </View>
            )}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View 
            style={[
              styles.promptSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <View style={styles.promptCard}>
              <View style={styles.promptIconContainer}>
                <BookOpen size={28} color={theme.colors.primary} />
              </View>
              <Text style={styles.promptLabel}>Today's Prompt</Text>
              <Text style={styles.promptText}>{todayPrompt}</Text>
            </View>
          </Animated.View>

          <Animated.View 
            style={[
              styles.moodSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <Text style={styles.sectionTitle}>How are you feeling?</Text>
            <View style={styles.moodGrid}>
              {MOOD_OPTIONS.map((mood) => (
                <TouchableOpacity
                  key={mood.value}
                  style={[
                    styles.moodOption,
                    selectedMood === mood.value && styles.moodOptionSelected,
                  ]}
                  onPress={() => setSelectedMood(mood.value)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                  <Text style={[
                    styles.moodLabel,
                    selectedMood === mood.value && styles.moodLabelSelected,
                  ]}>{mood.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          <Animated.View 
            style={[
              styles.inputSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <Text style={styles.sectionTitle}>Your Reflection</Text>
            <View style={styles.inputCard}>
              <TextInput
                style={styles.input}
                placeholder="Take a moment to reflect on your day..."
                placeholderTextColor={theme.colors.textLight}
                value={text}
                onChangeText={setText}
                multiline
                textAlignVertical="top"
              />
            </View>
          </Animated.View>

          {todayEntry?.aiInsight && (
            <Animated.View 
              style={[
                styles.insightSection,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                }
              ]}
            >
              <View style={styles.insightCard}>
                <View style={styles.insightHeader}>
                  <View style={styles.insightIconContainer}>
                    <Sparkles size={18} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.insightLabel}>AI Insight</Text>
                </View>
                <Text style={styles.insightText}>{todayEntry.aiInsight}</Text>
              </View>
            </Animated.View>
          )}

          {recentEntries.length > 0 && (
            <Animated.View 
              style={[
                styles.historySection,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                }
              ]}
            >
              <Text style={styles.sectionTitle}>Recent Reflections</Text>
              {recentEntries.slice(0, 3).map((entry, index) => (
                <View key={entry.id} style={styles.historyItem}>
                  <View style={styles.historyHeader}>
                    <View style={styles.historyDateContainer}>
                      <Calendar size={14} color={theme.colors.textSecondary} />
                      <Text style={styles.historyDate}>{formatDate(entry.date)}</Text>
                    </View>
                    {entry.mood && (
                      <Text style={styles.historyMood}>
                        {MOOD_OPTIONS.find(m => m.value === entry.mood)?.emoji}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.historyContent} numberOfLines={2}>
                    {entry.content}
                  </Text>
                  {entry.aiInsight && (
                    <View style={styles.historyInsight}>
                      <Sparkles size={12} color={theme.colors.primary} />
                      <Text style={styles.historyInsightText} numberOfLines={1}>
                        {entry.aiInsight}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </Animated.View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!text.trim() || isGeneratingInsight) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!text.trim() || isGeneratingInsight}
            activeOpacity={0.8}
          >
            {isGeneratingInsight ? (
              <>
                <ActivityIndicator size="small" color="#000" />
                <Text style={styles.submitButtonText}>Generating insight...</Text>
              </>
            ) : (
              <>
                <Send size={20} color={text.trim() ? '#000' : theme.colors.textLight} />
                <Text style={[
                  styles.submitButtonText,
                  !text.trim() && styles.submitButtonTextDisabled,
                ]}>
                  {todayEntry ? 'Update Reflection' : 'Save Reflection'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {showSuccess && (
          <Animated.View 
            style={[
              styles.successOverlay,
              { 
                opacity: successAnim,
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
              }
            ]}
          >
            <View style={styles.successContent}>
              <View style={styles.successIconContainer}>
                <CheckCircle size={48} color={theme.colors.primary} />
              </View>
              <Text style={styles.successTitle}>Reflection Saved!</Text>
              <Text style={styles.successSubtitle}>
                Keep building your reflection habit
              </Text>
            </View>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  streakText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  promptSection: {
    marginBottom: 24,
  },
  promptCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
    ...theme.shadows.gold,
  },
  promptIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  promptLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  promptText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 26,
    fontStyle: 'italic',
  },
  moodSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
    marginBottom: 12,
  },
  moodGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodOption: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.lg,
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  moodOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  moodEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  moodLabelSelected: {
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.medium,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  input: {
    minHeight: 150,
    padding: 16,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    lineHeight: 24,
  },
  insightSection: {
    marginBottom: 24,
  },
  insightCard: {
    backgroundColor: theme.colors.primary + '10',
    borderRadius: theme.borderRadius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.primary + '20',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  insightIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
  },
  insightText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    lineHeight: 22,
  },
  historySection: {
    marginBottom: 24,
  },
  historyItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historyDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyDate: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  historyMood: {
    fontSize: 18,
  },
  historyContent: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    lineHeight: 20,
  },
  historyInsight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
    opacity: 0.7,
  },
  historyInsightText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    flex: 1,
  },
  bottomPadding: {
    height: 100,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xl,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  submitButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: '#000',
  },
  submitButtonTextDisabled: {
    color: theme.colors.textLight,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successContent: {
    alignItems: 'center',
  },
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
});
