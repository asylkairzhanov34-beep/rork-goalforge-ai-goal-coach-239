import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Target, RotateCcw } from 'lucide-react-native';
import { GoalCreationModal } from '@/screens/GoalCreationModal';
import { useGoalStore } from '@/hooks/use-goal-store';
import { theme } from '@/constants/theme';

export default function GoalCreationScreen() {
  const { currentGoal } = useGoalStore();



  if (currentGoal) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.blockedContainer}>
          <Target size={64} color={theme.colors.primary} />
          <Text style={styles.blockedTitle}>Active Goal Exists</Text>
          <Text style={styles.blockedDescription}>
            You can only have one active goal at a time. To create a new goal, please reset your current goal from the Profile tab.
          </Text>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.replace('/(tabs)/profile')}
            activeOpacity={0.7}
          >
            <RotateCcw size={20} color={theme.colors.background} style={{ marginRight: 8 }} />
            <Text style={styles.profileButtonText}>Go to Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/home');
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <GoalCreationModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  blockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  blockedTitle: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  blockedDescription: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xxxl,
    lineHeight: 26,
  },
  profileButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.xxxl,
    paddingVertical: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: theme.spacing.md,
  },
  profileButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.background,
  },
  backButton: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  backButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
