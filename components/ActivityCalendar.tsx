import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { ChevronLeft, ChevronRight, Flame, Calendar, CheckCircle2, X, BookOpen, Clock, Sparkles, ListTodo } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { getLocalDateKey, type LocalDateKey } from '@/utils/date';
import { DailyTask } from '@/types/goal';
import { JournalEntry } from '@/types/journal';

interface ActivityCalendarProps {
  completedDates: LocalDateKey[];
  currentStreak: number;
  tasks?: DailyTask[];
  journalEntries?: JournalEntry[];
}

interface DayData {
  date: Date | null;
  level: number;
  isToday: boolean;
  dayNum: number;
  isPast: boolean;
  dateKey: LocalDateKey | null;
}

interface SelectedDayInfo {
  date: Date;
  dateKey: LocalDateKey;
  tasks: DailyTask[];
  journalEntry: JournalEntry | null;
}

export function ActivityCalendar({ completedDates, currentStreak, tasks = [], journalEntries = [] }: ActivityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<SelectedDayInfo | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  const tasksByDate = useMemo(() => {
    const map = new Map<LocalDateKey, DailyTask[]>();
    tasks.forEach((task) => {
      if (!task.date) return;
      const taskDate = new Date(task.date);
      const dateKey = getLocalDateKey(taskDate);
      const existing = map.get(dateKey) || [];
      existing.push(task);
      map.set(dateKey, existing);
    });
    return map;
  }, [tasks]);

  const journalByDate = useMemo(() => {
    const map = new Map<string, JournalEntry>();
    journalEntries.forEach((entry) => {
      map.set(entry.date, entry);
    });
    return map;
  }, [journalEntries]);

  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let startDayOfWeek = firstDay.getDay();
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    
    const days: DayData[] = [];
    
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ date: null, level: -1, isToday: false, dayNum: 0, isPast: false, dateKey: null });
    }
    
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      const dateStr = getLocalDateKey(date);
      const completedCount = completedDates.filter((d) => d === dateStr).length;
      
      let level = 0;
      if (completedCount >= 3) level = 4;
      else if (completedCount === 2) level = 3;
      else if (completedCount === 1) level = 2;
      else if (completedCount > 0) level = 1;
      
      const isToday = date.getTime() === today.getTime();
      const isFuture = date > today;
      const isPast = date < today;
      
      days.push({
        date,
        level: isFuture ? -2 : level,
        isToday,
        dayNum: day,
        isPast,
        dateKey: dateStr,
      });
    }
    
    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let i = 0; i < remainingDays; i++) {
        days.push({ date: null, level: -1, isToday: false, dayNum: 0, isPast: false, dateKey: null });
      }
    }
    
    const weeks: typeof days[] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    
    return weeks;
  }, [currentMonth, completedDates]);
  
  const monthStats = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const monthStart = getLocalDateKey(new Date(year, month, 1));
    const monthEnd = getLocalDateKey(new Date(year, month + 1, 0));
    
    const monthCompletedDates = completedDates.filter((d) => d >= monthStart && d <= monthEnd);
    const uniqueDays = new Set(monthCompletedDates);
    
    return {
      totalTasks: monthCompletedDates.length,
      activeDays: uniqueDays.size,
    };
  }, [currentMonth, completedDates]);
  
  const goToPrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  
  const goToNextMonth = () => {
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    const today = new Date();
    if (next <= new Date(today.getFullYear(), today.getMonth() + 1, 1)) {
      setCurrentMonth(next);
    }
  };
  
  const isCurrentMonth = () => {
    const today = new Date();
    return currentMonth.getMonth() === today.getMonth() && 
           currentMonth.getFullYear() === today.getFullYear();
  };

  const handleDayPress = (day: DayData) => {
    if (!day.date || !day.dateKey || day.level === -2) return;
    
    const dayTasks = tasksByDate.get(day.dateKey) || [];
    const journalEntry = journalByDate.get(day.dateKey) || null;
    
    if (dayTasks.length === 0 && !journalEntry) return;
    
    setSelectedDay({
      date: day.date,
      dateKey: day.dateKey,
      tasks: dayTasks,
      journalEntry,
    });
    setModalVisible(true);
  };

  const hasContent = (dateKey: LocalDateKey | null) => {
    if (!dateKey) return false;
    const hasTasks = (tasksByDate.get(dateKey)?.length || 0) > 0;
    const hasJournal = journalByDate.has(dateKey);
    return hasTasks || hasJournal;
  };
  
  const getLevelStyle = (level: number, isToday: boolean) => {
    const baseStyle: any = {};
    
    if (level === -1) {
      return { backgroundColor: 'transparent' };
    }
    
    if (level === -2) {
      return { backgroundColor: theme.colors.surfaceElevated, opacity: 0.3 };
    }
    
    switch (level) {
      case 0:
        baseStyle.backgroundColor = theme.colors.surfaceElevated;
        baseStyle.borderWidth = 1;
        baseStyle.borderColor = theme.colors.border;
        break;
      case 1:
        baseStyle.backgroundColor = '#3D3200';
        break;
      case 2:
        baseStyle.backgroundColor = '#6B5700';
        break;
      case 3:
        baseStyle.backgroundColor = '#9A7D00';
        break;
      case 4:
        baseStyle.backgroundColor = theme.colors.primary;
        break;
    }
    
    if (isToday) {
      baseStyle.borderWidth = 2;
      baseStyle.borderColor = theme.colors.primary;
    }
    
    return baseStyle;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Calendar size={20} color={theme.colors.primary} />
          <Text style={styles.title}>Activity</Text>
        </View>
        <View style={styles.streakBadge}>
          <Flame size={16} color={theme.colors.warning} />
          <Text style={styles.streakText}>{currentStreak}</Text>
        </View>
      </View>
      
      <View style={styles.monthNavigation}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
          <ChevronLeft size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </Text>
        <TouchableOpacity 
          onPress={goToNextMonth} 
          style={[styles.navButton, isCurrentMonth() && styles.navButtonDisabled]}
          disabled={isCurrentMonth()}
        >
          <ChevronRight size={20} color={isCurrentMonth() ? theme.colors.textLight : theme.colors.text} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.calendarGrid}>
        <View style={styles.dayNamesRow}>
          {dayNames.map((name, index) => (
            <View key={index} style={styles.dayNameCell}>
              <Text style={[
                styles.dayName,
                (index === 5 || index === 6) && styles.weekendDayName
              ]}>{name}</Text>
            </View>
          ))}
        </View>
        
        {calendarData.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((day, dayIndex) => (
              <View key={dayIndex} style={styles.dayCellWrapper}>
                {day.date ? (
                  <TouchableOpacity 
                    style={[
                      styles.dayCell,
                      getLevelStyle(day.level, day.isToday),
                      hasContent(day.dateKey) && day.level !== -2 && styles.dayCellClickable,
                    ]}
                    onPress={() => handleDayPress(day)}
                    disabled={day.level === -2 || !hasContent(day.dateKey)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.dayNumber,
                      day.isToday && styles.todayNumber,
                      day.level >= 3 && styles.highLevelNumber,
                      day.level === -2 && styles.futureNumber,
                    ]}>
                      {day.dayNum}
                    </Text>
                    {day.level > 0 && day.level !== -2 && (
                      <View style={styles.completedIndicator}>
                        <CheckCircle2 size={10} color={day.level >= 3 ? '#000' : theme.colors.primary} />
                      </View>
                    )}
                    {hasContent(day.dateKey) && day.level !== -2 && (
                      <View style={styles.hasContentDot} />
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.emptyCell} />
                )}
              </View>
            ))}
          </View>
        ))}
      </View>

      <Text style={styles.tapHint}>Tap on a day to view details</Text>
      
      <View style={styles.legend}>
        <Text style={styles.legendLabel}>Intensity:</Text>
        <View style={styles.legendItems}>
          <View style={[styles.legendSquare, { backgroundColor: theme.colors.surfaceElevated, borderWidth: 1, borderColor: theme.colors.border }]} />
          <View style={[styles.legendSquare, { backgroundColor: '#3D3200' }]} />
          <View style={[styles.legendSquare, { backgroundColor: '#6B5700' }]} />
          <View style={[styles.legendSquare, { backgroundColor: '#9A7D00' }]} />
          <View style={[styles.legendSquare, { backgroundColor: theme.colors.primary }]} />
        </View>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={styles.statIconWrapper}>
            <CheckCircle2 size={18} color={theme.colors.success} />
          </View>
          <Text style={styles.statValue}>{monthStats.totalTasks}</Text>
          <Text style={styles.statLabel}>tasks this month</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statCard}>
          <View style={styles.statIconWrapper}>
            <Calendar size={18} color={theme.colors.primary} />
          </View>
          <Text style={styles.statValue}>{monthStats.activeDays}</Text>
          <Text style={styles.statLabel}>active days</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statCard}>
          <View style={styles.statIconWrapper}>
            <Flame size={18} color={theme.colors.warning} />
          </View>
          <Text style={styles.statValue}>{currentStreak}</Text>
          <Text style={styles.statLabel}>days in a row</Text>
        </View>
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={modalStyles.closeButton}
            >
              <X size={22} color={theme.colors.text} />
            </TouchableOpacity>
            <View style={modalStyles.headerContent}>
              <Text style={modalStyles.title}>
                {selectedDay ? formatDate(selectedDay.date) : ''}
              </Text>
              <Text style={modalStyles.subtitle}>
                {selectedDay?.tasks.filter(t => t.completed).length || 0} of {selectedDay?.tasks.length || 0} tasks completed
              </Text>
            </View>
          </View>

          <ScrollView style={modalStyles.content} showsVerticalScrollIndicator={false}>
            {selectedDay?.tasks && selectedDay.tasks.length > 0 && (
              <View style={modalStyles.section}>
                <View style={modalStyles.sectionHeader}>
                  <ListTodo size={18} color={theme.colors.primary} />
                  <Text style={modalStyles.sectionTitle}>Tasks</Text>
                </View>
                
                {selectedDay.tasks.map((task) => (
                  <View key={task.id} style={modalStyles.taskItem}>
                    <View style={[
                      modalStyles.taskCheckbox,
                      task.completed && modalStyles.taskCheckboxCompleted
                    ]}>
                      {task.completed && <CheckCircle2 size={14} color={theme.colors.background} />}
                    </View>
                    <View style={modalStyles.taskInfo}>
                      <Text style={[
                        modalStyles.taskTitle,
                        task.completed && modalStyles.taskTitleCompleted
                      ]}>
                        {task.title}
                      </Text>
                      {task.description && (
                        <Text style={modalStyles.taskDescription} numberOfLines={2}>
                          {task.description}
                        </Text>
                      )}
                      <View style={modalStyles.taskMeta}>
                        <View style={modalStyles.metaPill}>
                          <Clock size={12} color={theme.colors.textSecondary} />
                          <Text style={modalStyles.metaText}>{task.duration}</Text>
                        </View>
                        {task.isChallengeTask && (
                          <View style={[modalStyles.metaPill, modalStyles.challengePill]}>
                            <Text style={modalStyles.challengeText}>Challenge</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {selectedDay?.journalEntry && (
              <View style={modalStyles.section}>
                <View style={modalStyles.sectionHeader}>
                  <BookOpen size={18} color={theme.colors.primary} />
                  <Text style={modalStyles.sectionTitle}>Daily Reflection</Text>
                </View>
                
                <View style={modalStyles.journalCard}>
                  <Text style={modalStyles.journalPrompt}>
                    {selectedDay.journalEntry.prompt}
                  </Text>
                  <Text style={modalStyles.journalContent}>
                    {selectedDay.journalEntry.content}
                  </Text>
                  
                  {selectedDay.journalEntry.aiInsight && (
                    <View style={modalStyles.insightContainer}>
                      <View style={modalStyles.insightHeader}>
                        <Sparkles size={14} color={theme.colors.primary} />
                        <Text style={modalStyles.insightLabel}>AI Insight</Text>
                      </View>
                      <Text style={modalStyles.insightText}>
                        {selectedDay.journalEntry.aiInsight}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {(!selectedDay?.tasks || selectedDay.tasks.length === 0) && !selectedDay?.journalEntry && (
              <View style={modalStyles.emptyState}>
                <Calendar size={48} color={theme.colors.textMuted} />
                <Text style={modalStyles.emptyTitle}>No activity</Text>
                <Text style={modalStyles.emptyText}>
                  No tasks or reflections recorded for this day.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 165, 0, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 0, 0.3)',
  },
  streakText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.warning,
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  monthTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  calendarGrid: {
    marginBottom: 8,
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayNameCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayName: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  weekendDayName: {
    color: theme.colors.textLight,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dayCellWrapper: {
    flex: 1,
    aspectRatio: 1,
    padding: 2,
  },
  dayCell: {
    flex: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dayCellClickable: {
    opacity: 1,
  },
  emptyCell: {
    flex: 1,
  },
  dayNumber: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
  },
  todayNumber: {
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  highLevelNumber: {
    color: '#000',
    fontWeight: theme.fontWeight.bold,
  },
  futureNumber: {
    color: theme.colors.textLight,
  },
  completedIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  hasContentDot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.colors.primary,
  },
  tapHint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginBottom: 16,
  },
  legendLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  legendItems: {
    flexDirection: 'row',
    gap: 4,
  },
  legendSquare: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: 8,
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  taskItem: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  taskCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taskCheckboxCompleted: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: theme.colors.textSecondary,
  },
  taskDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  metaText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  challengePill: {
    backgroundColor: 'rgba(255, 165, 0, 0.15)',
  },
  challengeText: {
    fontSize: 11,
    color: theme.colors.warning,
    fontWeight: theme.fontWeight.medium,
  },
  journalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  journalPrompt: {
    fontSize: 13,
    fontStyle: 'italic',
    color: theme.colors.textSecondary,
    marginBottom: 10,
  },
  journalContent: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 22,
  },
  insightContainer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  insightLabel: {
    fontSize: 12,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  insightText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
