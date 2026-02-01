import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { Brain, Target, Heart, Zap } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { PrimaryGoalOption } from '@/types/first-time-setup';

interface Step2GoalProps {
  onNext: (goal: 'focus' | 'discipline' | 'calm' | 'ambition') => void;
  onSkip: () => void;
  initialGoal?: 'focus' | 'discipline' | 'calm' | 'ambition';
}

export default function Step2Goal({ onNext, onSkip, initialGoal }: Step2GoalProps) {
  const [selectedGoal, setSelectedGoal] = useState<'focus' | 'discipline' | 'calm' | 'ambition' | null>(
    initialGoal || null
  );
  const [fadeAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const goals: PrimaryGoalOption[] = [
    {
      id: 'focus',
      icon: 'brain',
      title: 'Focus & Productivity',
      description: 'Learn to concentrate and manage your attention',
    },
    {
      id: 'discipline',
      icon: 'target',
      title: 'Self-Discipline',
      description: 'Build willpower and achieve your goals',
    },
    {
      id: 'calm',
      icon: 'heart',
      title: 'Calm & Control',
      description: 'Manage emotions and find inner balance',
    },
    {
      id: 'ambition',
      icon: 'zap',
      title: 'Ambition',
      description: 'Set ambitious goals and pursue them confidently',
    },
  ];

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'brain':
        return Brain;
      case 'target':
        return Target;
      case 'heart':
        return Heart;
      case 'zap':
        return Zap;
      default:
        return Brain;
    }
  };

  const handleSelect = (goalId: 'focus' | 'discipline' | 'calm' | 'ambition') => {
    setSelectedGoal(goalId);
  };

  const handleNext = () => {
    if (selectedGoal) {
      onNext(selectedGoal);
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>What do you want to improve?</Text>
            <Text style={styles.subtitle}>Choose your main focus area to start</Text>
          </View>

          <View style={styles.goalsContainer}>
            {goals.map((goal) => {
              const IconComponent = getIcon(goal.icon);
              const isSelected = selectedGoal === goal.id;
              
              return (
                <TouchableOpacity
                  key={goal.id}
                  style={[
                    styles.goalCard,
                    isSelected && styles.goalCardActive,
                  ]}
                  onPress={() => handleSelect(goal.id)}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.iconContainer,
                    isSelected && styles.iconContainerActive
                  ]}>
                    <IconComponent 
                      size={28} 
                      color={isSelected ? theme.colors.background : theme.colors.primary}
                      strokeWidth={1.5}
                    />
                  </View>
                  <View style={styles.goalContent}>
                    <Text style={[
                      styles.goalTitle,
                      isSelected && styles.goalTitleActive
                    ]}>
                      {goal.title}
                    </Text>
                    <Text style={styles.goalDescription}>
                      {goal.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.button,
              !selectedGoal && styles.buttonDisabled
            ]}
            onPress={handleNext}
            disabled={!selectedGoal}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xxxl,
    paddingBottom: theme.spacing.xl,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing.md,
  },
  footer: {
    paddingTop: theme.spacing.md,
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.regular,
  },
  goalsContainer: {
    gap: theme.spacing.md,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1213',
    borderRadius: 16,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.06)',
    minHeight: 64,
  },
  goalCardActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    borderColor: theme.colors.primary,
    ...theme.shadows.gold,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  iconContainerActive: {
    backgroundColor: theme.colors.primary,
  },
  goalContent: {
    flex: 1,
  },
  goalTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: 2,
  },
  goalTitleActive: {
    color: theme.colors.primary,
  },
  goalDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  button: {
    marginTop: theme.spacing.md,
    height: 56,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.gold,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.background,
  },
  skipButton: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  skipButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textLight,
    fontWeight: theme.fontWeight.medium,
  },
});
