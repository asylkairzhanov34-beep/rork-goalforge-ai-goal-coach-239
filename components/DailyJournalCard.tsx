import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { BookOpen, Send, Sparkles, Flame, ChevronDown, ChevronUp } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useJournal } from '@/hooks/use-journal-store';

export function DailyJournalCard() {
  const { getTodayPrompt, getTodayEntry, addEntry, isGeneratingInsight, getStreak } = useJournal();
  const [isExpanded, setIsExpanded] = useState(false);
  const [text, setText] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  
  const expandAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  const todayEntry = getTodayEntry();
  const todayPrompt = getTodayPrompt();
  const streak = getStreak();

  useEffect(() => {
    if (todayEntry) {
      setText(todayEntry.content);
    }
  }, [todayEntry]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const toggleExpand = () => {
    const toValue = isExpanded ? 0 : 1;
    setIsExpanded(!isExpanded);
    Animated.spring(expandAnim, {
      toValue,
      useNativeDriver: false,
      friction: 8,
    }).start();
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;
    
    Keyboard.dismiss();
    await addEntry(text.trim());
    
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

  const inputHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 120],
  });

  const inputOpacity = expandAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.header} 
        onPress={toggleExpand}
        activeOpacity={0.8}
      >
        <View style={styles.headerLeft}>
          <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
            <BookOpen size={22} color={theme.colors.primary} />
          </Animated.View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Daily Reflection</Text>
            <Text style={styles.prompt} numberOfLines={1}>
              {todayPrompt}
            </Text>
          </View>
        </View>
        
        <View style={styles.headerRight}>
          {streak > 0 && (
            <View style={styles.streakBadge}>
              <Flame size={12} color={theme.colors.primary} />
              <Text style={styles.streakText}>{streak}</Text>
            </View>
          )}
          {isExpanded ? (
            <ChevronUp size={20} color={theme.colors.textSecondary} />
          ) : (
            <ChevronDown size={20} color={theme.colors.textSecondary} />
          )}
        </View>
      </TouchableOpacity>

      <Animated.View style={[styles.expandedContent, { height: inputHeight, opacity: inputOpacity }]}>
        <TextInput
          style={styles.input}
          placeholder="Share your thoughts..."
          placeholderTextColor={theme.colors.textLight}
          value={text}
          onChangeText={setText}
          multiline
          textAlignVertical="top"
        />
        <TouchableOpacity 
          style={[styles.submitButton, !text.trim() && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!text.trim() || isGeneratingInsight}
        >
          {isGeneratingInsight ? (
            <ActivityIndicator size="small" color={theme.colors.background} />
          ) : (
            <Send size={18} color={text.trim() ? theme.colors.background : theme.colors.textLight} />
          )}
        </TouchableOpacity>
      </Animated.View>

      {todayEntry?.aiInsight && !isExpanded && (
        <View style={styles.insightContainer}>
          <View style={styles.insightHeader}>
            <Sparkles size={14} color={theme.colors.primary} />
            <Text style={styles.insightLabel}>AI Insight</Text>
          </View>
          <Text style={styles.insightText}>{todayEntry.aiInsight}</Text>
        </View>
      )}

      {showSuccess && (
        <Animated.View style={[styles.successOverlay, { opacity: successAnim }]}>
          <Sparkles size={20} color={theme.colors.primary} />
          <Text style={styles.successText}>Reflection saved!</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.primary + '25',
    overflow: 'hidden',
    ...theme.shadows.gold,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
    marginBottom: 2,
  },
  prompt: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  streakText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
  },
  expandedContent: {
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    paddingRight: 50,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    lineHeight: 22,
  },
  submitButton: {
    position: 'absolute',
    right: 24,
    bottom: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  insightContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  insightLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  insightText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    lineHeight: 20,
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.surface + 'F5',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  successText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.primary,
  },
});
