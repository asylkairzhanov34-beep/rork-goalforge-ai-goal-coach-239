import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { 
  ArrowLeft,
  Trophy,
  Flame,
  Calendar,
  CheckCircle,

  AlertTriangle,
  RefreshCw,
  Trash2,
  ChevronRight,
  Sparkles,
  Clock,
  Target,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/theme';
import { useChallengeStore } from '@/hooks/use-challenge-store';
import { getChallengeById } from '@/constants/challenges';
import { ChallengeDay } from '@/types/challenge';

export default function ChallengeActiveScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { 
    activeChallenges, 
    toggleTaskCompletion, 
    completeDay,
    failChallenge, 
    restartChallenge,
    deleteChallenge,
    getCurrentDayNumber,
    getChallengeProgress,
  } = useChallengeStore();

  const challenge = useMemo(() => {
    return activeChallenges.find(c => c.id === id);
  }, [activeChallenges, id]);

  const template = useMemo(() => {
    if (!challenge) return null;
    return getChallengeById(challenge.templateId);
  }, [challenge]);

  const currentDayNumber = useMemo(() => {
    if (!challenge) return 1;
    return getCurrentDayNumber(challenge.id);
  }, [challenge, getCurrentDayNumber]);

  const progress = useMemo(() => {
    if (!challenge) return 0;
    return getChallengeProgress(challenge.id);
  }, [challenge, getChallengeProgress]);

  const todayDay = useMemo((): ChallengeDay | undefined => {
    if (!challenge) return undefined;
    return challenge.days.find(d => d.day === currentDayNumber);
  }, [challenge, currentDayNumber]);

  const displayDay = useMemo((): ChallengeDay | undefined => {
    if (!challenge) return undefined;
    return todayDay;
  }, [challenge, todayDay]);

  const handleTaskToggle = useCallback(async (taskId: string) => {
    if (!challenge || !displayDay) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleTaskCompletion(challenge.id, displayDay.day, taskId);
  }, [challenge, displayDay, toggleTaskCompletion]);

  const handleCompleteDay = useCallback(async () => {
    if (!challenge || !displayDay) return;
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await completeDay(challenge.id, displayDay.day);
  }, [challenge, displayDay, completeDay]);

  const handleFailChallenge = useCallback(() => {
    if (!challenge || !template) return;
    
    if (template.failOnMiss) {
      Alert.alert(
        'Fail Challenge',
        'This challenge requires starting over from Day 1 if you miss any task. Do you want to restart?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Restart', 
            style: 'destructive',
            onPress: async () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              await restartChallenge(challenge.id);
            }
          },
        ]
      );
    } else {
      Alert.alert(
        'Mark as Failed',
        'Are you sure you want to mark this challenge as failed?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Fail', 
            style: 'destructive',
            onPress: async () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              await failChallenge(challenge.id);
              router.back();
            }
          },
        ]
      );
    }
  }, [challenge, template, failChallenge, restartChallenge, router]);

  const handleDeleteChallenge = useCallback(() => {
    if (!challenge) return;
    
    Alert.alert(
      'Delete Challenge',
      'Are you sure you want to delete this challenge? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            await deleteChallenge(challenge.id);
            router.back();
          }
        },
      ]
    );
  }, [challenge, deleteChallenge, router]);

  if (!challenge || !template) {
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

  const allTasksCompleted = displayDay?.tasks.every(t => t.completed) ?? false;
  const completedTasksCount = displayDay?.tasks.filter(t => t.completed).length ?? 0;
  const totalTasksCount = displayDay?.tasks.length ?? 0;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <LinearGradient
        colors={[template.color + '30', 'transparent']}
        style={styles.headerGradient}
      />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity 
          style={styles.backIconButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#FFF" />
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          {template.failOnMiss && (
            <TouchableOpacity 
              style={styles.headerActionButton}
              onPress={handleFailChallenge}
            >
              <RefreshCw size={20} color="#E74C3C" />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.headerActionButton}
            onPress={handleDeleteChallenge}
          >
            <Trash2 size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <Text style={styles.challengeName}>{challenge.name}</Text>
          
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: template.color + '20' }]}>
              <Calendar size={20} color={template.color} />
              <Text style={[styles.statValue, { color: template.color }]}>
                Day {currentDayNumber}
              </Text>
              <Text style={styles.statLabel}>of {challenge.totalDays}</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: '#FF6B6B20' }]}>
              <Flame size={20} color="#FF6B6B" />
              <Text style={[styles.statValue, { color: '#FF6B6B' }]}>
                {challenge.streak}
              </Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: '#4ECDC420' }]}>
              <Target size={20} color="#4ECDC4" />
              <Text style={[styles.statValue, { color: '#4ECDC4' }]}>
                {Math.round(progress)}%
              </Text>
              <Text style={styles.statLabel}>Progress</Text>
            </View>
          </View>

          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBg}>
              <LinearGradient
                colors={[template.color, template.color + 'CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${progress}%` }]}
              />
            </View>
            <Text style={styles.progressText}>
              {challenge.days.filter(d => d.completed).length} / {challenge.totalDays} days completed
            </Text>
          </View>
        </View>

        <View style={styles.tasksSection}>
          <View style={styles.tasksSectionHeader}>
            <Text style={styles.sectionTitle}>
              {"Today's Tasks"}
            </Text>
            <Text style={styles.tasksProgress}>
              {completedTasksCount}/{totalTasksCount}
            </Text>
          </View>

          {displayDay?.tasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={[
                styles.taskCard,
                task.completed && styles.taskCardCompleted,
              ]}
              onPress={() => handleTaskToggle(task.id)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.taskCheckbox,
                task.completed && styles.taskCheckboxCompleted,
                task.completed && { backgroundColor: template.color, borderColor: template.color },
              ]}>
                {task.completed && <CheckCircle size={16} color="#000" />}
              </View>
              
              <View style={styles.taskContent}>
                <Text style={[
                  styles.taskTitle,
                  task.completed && styles.taskTitleCompleted,
                ]}>
                  {task.title}
                </Text>
                <Text style={styles.taskDescription}>{task.description}</Text>
                <View style={styles.taskMeta}>
                  <Clock size={12} color={theme.colors.textSecondary} />
                  <Text style={styles.taskDuration}>{task.duration} min</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {allTasksCompleted && !displayDay?.completed && (
            <TouchableOpacity
              style={[styles.completeDayButton, { backgroundColor: template.color }]}
              onPress={handleCompleteDay}
            >
              <Trophy size={20} color="#000" />
              <Text style={styles.completeDayText}>Complete Day {displayDay?.day}</Text>
            </TouchableOpacity>
          )}

          {displayDay?.completed && (
            <View style={styles.dayCompletedBanner}>
              <Sparkles size={24} color={template.color} />
              <Text style={[styles.dayCompletedText, { color: template.color }]}>
                Day {displayDay.day} Completed!
              </Text>
            </View>
          )}
        </View>

        {challenge.status === 'completed' && (
          <View style={styles.completedBanner}>
            <LinearGradient
              colors={[template.color, template.color + 'CC']}
              style={styles.completedGradient}
            />
            <Trophy size={48} color="#000" />
            <Text style={styles.completedTitle}>Challenge Completed!</Text>
            <Text style={styles.completedSubtitle}>
              You finished {challenge.totalDays} days of {challenge.name}
            </Text>
          </View>
        )}

        {challenge.status === 'failed' && (
          <View style={styles.failedBanner}>
            <AlertTriangle size={48} color="#E74C3C" />
            <Text style={styles.failedTitle}>Challenge Failed</Text>
            <TouchableOpacity
              style={styles.restartButton}
              onPress={() => restartChallenge(challenge.id)}
            >
              <RefreshCw size={18} color="#FFF" />
              <Text style={styles.restartButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {template.failOnMiss && challenge.status === 'active' && (
          <TouchableOpacity
            style={styles.failButton}
            onPress={handleFailChallenge}
          >
            <AlertTriangle size={18} color="#E74C3C" />
            <Text style={styles.failButtonText}>I Missed a Task (Restart)</Text>
            <ChevronRight size={18} color="#E74C3C" />
          </TouchableOpacity>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
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
    height: 250,
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  heroSection: {
    marginBottom: 24,
  },
  challengeName: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#FFF',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  progressBarContainer: {
    marginBottom: 8,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFF',
    marginBottom: 12,
  },
  tasksSection: {
    marginBottom: 24,
  },
  tasksSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tasksProgress: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500' as const,
  },
  taskCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  taskCardCompleted: {
    opacity: 0.7,
  },
  taskCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  taskCheckboxCompleted: {
    borderWidth: 0,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
    marginBottom: 4,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: theme.colors.textSecondary,
  },
  taskDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskDuration: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  completeDayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
    gap: 10,
  },
  completeDayText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#000',
  },
  dayCompletedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 16,
    marginTop: 8,
  },
  dayCompletedText: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  completedBanner: {
    alignItems: 'center',
    paddingVertical: 32,
    borderRadius: 20,
    marginBottom: 24,
    overflow: 'hidden',
  },
  completedGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#000',
    marginTop: 16,
  },
  completedSubtitle: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.7)',
    marginTop: 8,
    textAlign: 'center',
  },
  failedBanner: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 20,
    marginBottom: 24,
  },
  failedTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#E74C3C',
    marginTop: 16,
    marginBottom: 20,
  },
  restartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E74C3C',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
  },
  restartButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  failButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    marginBottom: 16,
  },
  failButtonText: {
    fontSize: 15,
    color: '#E74C3C',
    fontWeight: '500' as const,
    flex: 1,
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
