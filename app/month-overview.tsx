import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock,
  Plus,
  Sparkles,
  X,
} from 'lucide-react-native';
import PremiumGate from '@/components/PremiumGate';
import { theme } from '@/constants/theme';
import { useGoalStore } from '@/hooks/use-goal-store';
import { DailyTask } from '@/types/goal';
import { getLocalDateKey, getTaskLocalDateKey, safeDateFromAny, type LocalDateKey } from '@/utils/date';

interface MonthDay {
  date: Date;
  dayNumber: number;
  tasks: DailyTask[];
  isToday: boolean;
  isPast: boolean;
}

interface DayTasksModalProps {
  visible: boolean;
  day: MonthDay | null;
  onClose: () => void;
  onToggleTask: (taskId: string) => void;
  onAddTask: (task: Omit<DailyTask, 'id' | 'goalId' | 'completed' | 'completedAt'>) => void;
}

function formatMonthTitle(date: Date) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
}

function formatDayLabel(date: Date) {
  const label = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date);
  return label;
}

function formatModalTitle(date: Date) {
  const label = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(date);
  return `Tasks for ${label}`;
}

function priorityLabel(priority: DailyTask['priority']) {
  if (priority === 'high') return 'High';
  if (priority === 'medium') return 'Medium';
  return 'Low';
}

function getProgressColor(tasks: DailyTask[]) {
  if (tasks.length === 0) return theme.colors.textMuted;

  const completedTasks = tasks.filter((t) => t.completed).length;
  const completionRate = completedTasks / tasks.length;

  if (completionRate === 1) return theme.colors.success;
  if (completionRate > 0) return theme.colors.primary;
  return theme.colors.error;
}

function DayTasksModal({ visible, day, onClose, onToggleTask, onAddTask }: DayTasksModalProps) {
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskDescription, setNewTaskDescription] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  const handleAddTask = useCallback(() => {
    if (!newTaskTitle.trim() || !day) return;

    const newTask: Omit<DailyTask, 'id' | 'goalId' | 'completed' | 'completedAt'> = {
      day: day.dayNumber,
      date: day.date.toISOString(),
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim(),
      duration: '30 min',
      priority: 'medium',
      tips: [],
      difficulty: 'medium',
      estimatedTime: 30,
    };

    onAddTask(newTask);
    setNewTaskTitle('');
    setNewTaskDescription('');
    setShowAddForm(false);
  }, [day, newTaskDescription, newTaskTitle, onAddTask]);

  const headerSubtitle = useMemo(() => {
    if (!day) return '';
    if (day.tasks.length === 0) return 'No tasks yet';
    return `${day.tasks.filter((t) => t.completed).length}/${day.tasks.length} completed`;
  }, [day]);

  if (!day) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={modalStyles.container} testID="monthOverview.dayModal">
        <View style={modalStyles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={modalStyles.closeButton}
            testID="monthOverview.dayModal.close"
          >
            <X size={22} color={theme.colors.text} />
          </TouchableOpacity>

          <View style={modalStyles.headerContent}>
            <Text style={modalStyles.title} testID="monthOverview.dayModal.title">
              {formatModalTitle(day.date)}
            </Text>
            <Text style={modalStyles.subtitle} testID="monthOverview.dayModal.subtitle">
              {headerSubtitle}
            </Text>
          </View>
        </View>

        <ScrollView style={modalStyles.content} showsVerticalScrollIndicator={false}>
          {day.tasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={modalStyles.taskItem}
              onPress={() => onToggleTask(task.id)}
              activeOpacity={0.75}
              testID={`monthOverview.task.${task.id}`}
            >
              <View style={modalStyles.taskContent}>
                <View
                  style={[modalStyles.checkbox, task.completed && modalStyles.checkboxCompleted]}
                >
                  {task.completed && <Check size={14} color={theme.colors.surfaceDark} />}
                </View>

                <View style={modalStyles.taskInfo}>
                  <Text
                    style={[modalStyles.taskTitle, task.completed && modalStyles.taskTitleCompleted]}
                  >
                    {task.title}
                  </Text>

                  {!!task.description && (
                    <Text style={modalStyles.taskDescription}>{task.description}</Text>
                  )}

                  <View style={modalStyles.taskMeta}>
                    <View style={modalStyles.metaPill}>
                      <Clock size={12} color={theme.colors.textSecondary} />
                      <Text style={modalStyles.metaText}>{task.duration}</Text>
                    </View>

                    <View
                      style={[
                        modalStyles.priorityBadge,
                        modalStyles[
                          `priority${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}` as keyof typeof modalStyles
                        ],
                      ]}
                    >
                      <Text style={modalStyles.priorityText}>{priorityLabel(task.priority)}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {day.tasks.length === 0 && !showAddForm && (
            <View style={modalStyles.emptyState} testID="monthOverview.dayModal.empty">
              <View style={modalStyles.emptyIcon}>
                <Sparkles size={18} color={theme.colors.primary} />
              </View>
              <Text style={modalStyles.emptyTitle}>Plan a lighter day</Text>
              <Text style={modalStyles.emptyText}>
                Add one small task and build momentum.
              </Text>
            </View>
          )}

          {showAddForm && (
            <View style={modalStyles.addForm} testID="monthOverview.dayModal.addForm">
              <TextInput
                style={modalStyles.input}
                placeholder="Task title"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
                autoFocus
                testID="monthOverview.dayModal.input.title"
              />
              <TextInput
                style={[modalStyles.input, modalStyles.textArea]}
                placeholder="Description (optional)"
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={newTaskDescription}
                onChangeText={setNewTaskDescription}
                multiline
                numberOfLines={3}
                testID="monthOverview.dayModal.input.description"
              />

              <View style={modalStyles.formButtons}>
                <TouchableOpacity
                  style={modalStyles.cancelButton}
                  onPress={() => {
                    setShowAddForm(false);
                    setNewTaskTitle('');
                    setNewTaskDescription('');
                  }}
                  testID="monthOverview.dayModal.cancel"
                >
                  <Text style={modalStyles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    modalStyles.saveButton,
                    !newTaskTitle.trim() && modalStyles.saveButtonDisabled,
                  ]}
                  onPress={handleAddTask}
                  disabled={!newTaskTitle.trim()}
                  testID="monthOverview.dayModal.add"
                >
                  <Text style={modalStyles.saveButtonText}>Add task</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={modalStyles.footer}>
          <TouchableOpacity
            style={modalStyles.addButton}
            onPress={() => setShowAddForm(true)}
            testID="monthOverview.dayModal.showAdd"
          >
            <Plus size={18} color={theme.colors.surfaceDark} />
            <Text style={modalStyles.addButtonText}>Add a task</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function MonthOverviewScreen() {
  const store = useGoalStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [selectedDay, setSelectedDay] = useState<MonthDay | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  const safeAreaSpacing = useMemo(
    () => ({
      paddingTop: insets.top,
      paddingBottom: Math.max(insets.bottom, 16),
    }),
    [insets.bottom, insets.top]
  );

  const monthWindowStart = useMemo(() => new Date(), []);

  const monthDays = useMemo(() => {
    const today = new Date();
    const days: MonthDay[] = [];

    const tasks = store?.dailyTasks ?? [];
    const tasksByKey = new Map<LocalDateKey, DailyTask[]>();

    tasks.forEach((task) => {
      const key = getTaskLocalDateKey(task.date);
      if (!key) return;
      const existing = tasksByKey.get(key) ?? [];
      existing.push(task);
      tasksByKey.set(key, existing);
    });

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const key = getLocalDateKey(date);

      const tasksForDay = tasksByKey.get(key) ?? [];

      days.push({
        date,
        dayNumber: date.getDate(),
        tasks: tasksForDay,
        isToday: i === 0,
        isPast: false,
      });
    }

    return days;
  }, [store?.dailyTasks]);



  const handleDayPress = useCallback((day: MonthDay) => {
    setSelectedDay(day);
    setModalVisible(true);
  }, []);

  const handleToggleTask = useCallback(
    (taskId: string) => {
      store?.toggleTaskCompletion(taskId);
    },
    [store]
  );

  const handleAddTask = useCallback(
    (taskData: Omit<DailyTask, 'id' | 'goalId' | 'completed' | 'completedAt'>) => {
      const dateObj = safeDateFromAny(taskData.date) ?? new Date();
      const normalized = { ...taskData, date: dateObj.toISOString() };
      store?.addTask(normalized);
    },
    [store]
  );

  const onBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/plan');
  }, [router]);

  const premiumDescription = 'See your next 30 days at a glance — and stay consistent.';

  if (!store || !store.isReady) {
    return (
      <View style={styles.container} testID="monthOverview.loading">
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </View>
    );
  }

  return (
    <PremiumGate
      feature="Month Overview"
      fallback={
        <View style={styles.gatedPlaceholder} testID="monthOverview.gated">
          <Text style={styles.gatedTitle}>GoalForge Premium only</Text>
          <Text style={styles.gatedMessage}>{premiumDescription}</Text>
        </View>
      }
    >
      <View style={[styles.container, safeAreaSpacing]} testID="monthOverview.screen">
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            testID="monthOverview.back"
          >
            <ArrowLeft size={22} color={theme.colors.text} />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.title} testID="monthOverview.title">
              Month overview
            </Text>
            <Text style={styles.subtitle} testID="monthOverview.subtitle">
              {formatMonthTitle(monthWindowStart)}
            </Text>
          </View>

          <View style={styles.headerPill} testID="monthOverview.headerPill">
            <CalendarDays size={16} color={theme.colors.primary} />
            <Text style={styles.headerPillText}>30 days</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          testID="monthOverview.scroll"
        >
          <View style={styles.legend} testID="monthOverview.legend">
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.success }]} />
              <Text style={styles.legendText}>All done</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
              <Text style={styles.legendText}>In progress</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.textMuted }]} />
              <Text style={styles.legendText}>No tasks</Text>
            </View>
          </View>

          <View style={styles.daysListContainer} testID="monthOverview.list">
            {monthDays.map((day) => {
              const progressColor = getProgressColor(day.tasks);

              return (
                <TouchableOpacity
                  key={day.date.toISOString()}
                  style={[styles.dayListItem, day.isToday && styles.todayListItem]}
                  activeOpacity={0.78}
                  onPress={() => handleDayPress(day)}
                  testID={`monthOverview.day.${day.date.toISOString()}`}
                >
                  <View style={styles.dayListContent}>
                    <View style={styles.dayListLeft}>
                      <View style={[styles.dayIndicator, { backgroundColor: progressColor }]} />

                      <View style={styles.dayInfo}>
                        <View style={styles.dayTitleRow}>
                          <Text
                            style={[styles.dayListDate, day.isToday && styles.todayListDate]}
                            numberOfLines={1}
                          >
                            {formatDayLabel(day.date)}
                          </Text>
                          {day.isToday && (
                            <View style={styles.todayBadge}>
                              <Text style={styles.todayBadgeText}>Today</Text>
                            </View>
                          )}
                        </View>
                        {/* Progress info removed as requested */}
                      </View>
                    </View>

                    <View style={styles.dayListRight}>
                      <Text style={styles.dayListNumber}>{day.dayNumber}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.backToWeekButton}
            onPress={onBack}
            testID="monthOverview.backToPlan"
          >
            <Clock size={18} color={theme.colors.surfaceDark} />
            <Text style={styles.backToWeekText}>Back to plan</Text>
          </TouchableOpacity>
        </ScrollView>

        <DayTasksModal
          visible={modalVisible}
          day={selectedDay}
          onClose={() => {
            setModalVisible(false);
            setSelectedDay(null);
          }}
          onToggleTask={handleToggleTask}
          onAddTask={handleAddTask}
        />
      </View>
    </PremiumGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backButton: {
    padding: 10,
    marginLeft: -10,
    marginRight: 10,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surfaceGlass,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  headerPillText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: theme.fontWeight.semibold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  hero: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: theme.spacing.lg,
    ...theme.shadows.medium,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroChip: {
    backgroundColor: theme.colors.surfaceGlass,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroChipText: {
    fontSize: 12,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  heroRate: {
    fontSize: 28,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  heroBar: {
    marginTop: theme.spacing.md,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  heroBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  heroStatsRow: {
    marginTop: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStat: {
    flex: 1,
  },
  heroStatValue: {
    fontSize: 18,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  heroStatLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  heroDivider: {
    width: 1,
    height: 34,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: theme.spacing.md,
  },
  legend: {
    marginTop: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceGlass,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
  },
  daysListContainer: {
    marginTop: theme.spacing.lg,
  },
  dayListItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...theme.shadows.small,
  },
  todayListItem: {
    borderColor: theme.colors.glassBorder,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  },
  dayListContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  dayListLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  dayIndicator: {
    width: 4,
    height: 54,
    borderRadius: 3,
    marginRight: 14,
  },
  dayInfo: {
    flex: 1,
    minWidth: 0,
  },
  dayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dayListDate: {
    flex: 1,
    fontSize: 15,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    textTransform: 'capitalize',
  },
  todayListDate: {
    color: theme.colors.primary,
  },
  todayBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  todayBadgeText: {
    color: theme.colors.surfaceDark,
    fontSize: 11,
    fontWeight: theme.fontWeight.bold,
  },
  dayListTasks: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  progressTrack: {
    marginTop: 10,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  dayListRight: {
    alignItems: 'flex-end',
    marginLeft: 14,
  },
  dayListNumber: {
    fontSize: 18,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.text,
    minWidth: 26,
    textAlign: 'center',
  },
  backToWeekButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    height: 54,
    borderRadius: theme.borderRadius.sm,
    gap: 10,
    marginTop: theme.spacing.lg,
    ...theme.shadows.gold,
  },
  backToWeekText: {
    fontSize: 15,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.surfaceDark,
  },
  gatedPlaceholder: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  gatedTitle: {
    fontSize: 20,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  gatedMessage: {
    fontSize: 15,
    fontWeight: theme.fontWeight.medium,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
});

const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  closeButton: {
    padding: 10,
    marginLeft: -10,
    marginRight: 10,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: theme.fontWeight.medium,
    color: 'rgba(255,255,255,0.65)',
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  taskItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...theme.shadows.small,
  },
  taskContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxCompleted: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: 'rgba(255,255,255,0.55)',
  },
  taskDescription: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: theme.fontWeight.medium,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 19,
  },
  taskMeta: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  metaText: {
    fontSize: 12,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  priorityHigh: {
    backgroundColor: 'rgba(255, 69, 0, 0.18)',
  },
  priorityMedium: {
    backgroundColor: 'rgba(255, 215, 0, 0.16)',
  },
  priorityLow: {
    backgroundColor: 'rgba(76, 175, 80, 0.16)',
  },
  priorityText: {
    fontSize: 12,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  emptyState: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.surfaceGlass,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  emptyIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: theme.fontWeight.medium,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 19,
  },
  addForm: {
    marginTop: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: theme.borderRadius.sm,
    padding: 12,
    fontSize: 15,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  textArea: {
    height: 86,
    textAlignVertical: 'top',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: theme.borderRadius.sm,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  saveButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
    padding: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(255, 215, 0, 0.25)',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.surfaceDark,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    height: 50,
    borderRadius: theme.borderRadius.sm,
    gap: 10,
    ...theme.shadows.gold,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.surfaceDark,
  },
});
