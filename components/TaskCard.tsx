import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Check, Clock, ChevronRight, Sparkles, Target } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { DailyTask } from '@/types/goal';
import { LinearGradient } from 'expo-linear-gradient';

interface TaskCardProps {
  task: DailyTask;
  onToggle: () => void;
  onStartTimer?: (taskId: string) => void;
  onPress?: () => void;
}

export function TaskCard({ task, onToggle, onStartTimer, onPress }: TaskCardProps) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleToggle = (e: any) => {
    e.stopPropagation();
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onToggle();
    });
  };

  const getDifficultyConfig = (priority: string) => {
    switch (priority) {
      case 'high':
        return { label: 'HARD', color: '#FF6B6B', bgColor: 'rgba(255, 107, 107, 0.15)' };
      case 'medium':
        return { label: 'MEDIUM', color: '#FFB800', bgColor: 'rgba(255, 184, 0, 0.15)' };
      case 'low':
      default:
        return { label: 'EASY', color: '#4ADE80', bgColor: 'rgba(74, 222, 128, 0.15)' };
    }
  };

  const difficulty = getDifficultyConfig(task.priority);

  return (
    <Animated.View
      style={[styles.container, { transform: [{ scale: scaleAnim }] }]}
      testID={`taskCard.${task.id}`}
    >
      <TouchableOpacity onPress={handlePress} activeOpacity={0.9} testID={`taskCard.${task.id}.open`}>
        <LinearGradient
          colors={task.completed 
            ? ['rgba(255, 184, 0, 0.3)', 'rgba(255, 184, 0, 0.1)'] 
            : ['rgba(255, 184, 0, 0.25)', 'rgba(255, 184, 0, 0.08)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBorder}
        >
          <View style={[styles.card, task.completed && styles.completedCard]}>
            <View style={styles.badgeRow}>
              <View style={styles.goalBadge}>
                <Sparkles size={12} color="#FFB800" />
                <Text style={styles.goalBadgeText}>GOAL TASK</Text>
              </View>
              <View style={styles.targetIcon}>
                <Target size={14} color="#FFB800" />
              </View>
            </View>

            <View style={styles.contentRow}>
              <TouchableOpacity onPress={handleToggle} style={styles.checkboxContainer} testID={`taskCard.${task.id}.toggle`}>
                <View style={[styles.checkbox, task.completed && styles.checkboxCompleted]}>
                  {task.completed && <Check size={14} color="#000" strokeWidth={3} />}
                </View>
              </TouchableOpacity>

              <View style={styles.content}>
                <Text style={[styles.title, task.completed && styles.completedText]} numberOfLines={2}>
                  {task.title}
                </Text>
                <Text style={[styles.description, task.completed && styles.completedDescription]} numberOfLines={2}>
                  {task.description}
                </Text>
                
                <TouchableOpacity style={styles.detailsLink}>
                  <Text style={styles.detailsText}>Details</Text>
                </TouchableOpacity>

                <View style={styles.metaRow}>
                  <View style={styles.priorityIndicator}>
                    <Target size={12} color={theme.colors.textSecondary} />
                    <Text style={styles.priorityText}>
                      {task.priority === 'high' ? 'High' : task.priority === 'medium' ? 'Medium' : 'Low'}
                    </Text>
                  </View>
                  <View style={styles.durationContainer}>
                    <Clock size={12} color={theme.colors.textSecondary} />
                    <Text style={styles.durationText}>{task.duration}</Text>
                  </View>
                  <View style={[styles.difficultyBadge, { backgroundColor: difficulty.bgColor }]}>
                    <Text style={[styles.difficultyText, { color: difficulty.color }]}>
                      {difficulty.label}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.arrowContainer}>
                <ChevronRight size={20} color={theme.colors.textSecondary} />
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  gradientBorder: {
    borderRadius: theme.borderRadius.xl,
    padding: 1.5,
  },
  card: {
    backgroundColor: 'rgba(30, 30, 25, 0.95)',
    borderRadius: theme.borderRadius.xl - 1,
    padding: theme.spacing.lg,
  },
  completedCard: {
    opacity: 0.7,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goalBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#FFB800',
    letterSpacing: 1.5,
  },
  targetIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxContainer: {
    marginRight: theme.spacing.md,
    paddingTop: 2,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2.5,
    borderColor: '#FFB800',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxCompleted: {
    backgroundColor: '#FFB800',
    borderColor: '#FFB800',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: 6,
    lineHeight: 22,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  description: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
  },
  completedDescription: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  detailsLink: {
    marginBottom: theme.spacing.md,
  },
  detailsText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFD600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  priorityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priorityText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  arrowContainer: {
    paddingLeft: theme.spacing.sm,
    justifyContent: 'center',
    alignSelf: 'center',
  },
});
