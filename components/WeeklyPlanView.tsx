import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Dimensions, Animated, Easing, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Clock, Target, CheckCircle, Plus, ChevronRight, Lock, Flame, Check } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { DailyTask, SubTask, TaskFeedback } from '@/types/goal';

import { TaskDetailModal } from './TaskDetailModal';
import { TaskFeedbackModal } from './TaskFeedbackModal';

interface WeeklyPlanViewProps {
  weeklyTasks: { [dayOfWeek: string]: DailyTask[] };
  onTaskToggle: (taskId: string) => void;
  onTaskFeedback?: (taskId: string, feedback: TaskFeedback) => void;
  onAddTask: (day: string) => void;
  selectedDay?: string;
  onDaySelect: (day: string) => void;
  availableDays?: string[];
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday', short: 'MON' },
  { key: 'tuesday', label: 'Tuesday', short: 'TUE' },
  { key: 'wednesday', label: 'Wednesday', short: 'WED' },
  { key: 'thursday', label: 'Thursday', short: 'THU' },
  { key: 'friday', label: 'Friday', short: 'FRI' },
  { key: 'saturday', label: 'Saturday', short: 'SAT' },
  { key: 'sunday', label: 'Sunday', short: 'SUN' },
];

const getDifficultyColor = (difficulty: 'easy' | 'medium' | 'hard') => {
  switch (difficulty) {
    case 'easy': return '#4ADE80';
    case 'medium': return '#FFD600';
    case 'hard': return '#FF6B6B';
    default: return '#FFD600';
  }
};

const CHALLENGE_GRADIENT_THEMES = [
  { primary: '#8B5CF6', secondary: '#6366F1', border: 'rgba(139, 92, 246, 0.5)', glow: 'rgba(139, 92, 246, 0.3)' },
  { primary: '#06B6D4', secondary: '#0891B2', border: 'rgba(6, 182, 212, 0.5)', glow: 'rgba(6, 182, 212, 0.3)' },
  { primary: '#F97316', secondary: '#EA580C', border: 'rgba(249, 115, 22, 0.5)', glow: 'rgba(249, 115, 22, 0.3)' },
  { primary: '#10B981', secondary: '#059669', border: 'rgba(16, 185, 129, 0.5)', glow: 'rgba(16, 185, 129, 0.3)' },
  { primary: '#EC4899', secondary: '#DB2777', border: 'rgba(236, 72, 153, 0.5)', glow: 'rgba(236, 72, 153, 0.3)' },
  { primary: '#3B82F6', secondary: '#2563EB', border: 'rgba(59, 130, 246, 0.5)', glow: 'rgba(59, 130, 246, 0.3)' },
  { primary: '#EAB308', secondary: '#CA8A04', border: 'rgba(234, 179, 8, 0.5)', glow: 'rgba(234, 179, 8, 0.3)' },
  { primary: '#EF4444', secondary: '#DC2626', border: 'rgba(239, 68, 68, 0.5)', glow: 'rgba(239, 68, 68, 0.3)' },
  { primary: '#14B8A6', secondary: '#0D9488', border: 'rgba(20, 184, 166, 0.5)', glow: 'rgba(20, 184, 166, 0.3)' },
  { primary: '#A855F7', secondary: '#9333EA', border: 'rgba(168, 85, 247, 0.5)', glow: 'rgba(168, 85, 247, 0.3)' },
];

const getChallengeTheme = (challengeName: string | undefined, taskTitle: string) => {
  const str = challengeName || taskTitle || '';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  const index = Math.abs(hash) % CHALLENGE_GRADIENT_THEMES.length;
  return CHALLENGE_GRADIENT_THEMES[index];
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_BUTTON_SIZE = 56;
const DAY_BUTTON_GAP = 8;

type WeekDayMeta = {
  key: string;
  date: Date;
  dayNumber: string;
  isToday: boolean;
};

function startOfDay(d: Date) {
  const nd = new Date(d);
  nd.setHours(0, 0, 0, 0);
  return nd;
}

function getWeekStartMonday(today: Date) {
  const d = startOfDay(today);
  const jsDay = d.getDay();
  const mondayIndex = 1;
  const diff = (jsDay + 7 - mondayIndex) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

function buildWeekMeta(today: Date): WeekDayMeta[] {
  const start = getWeekStartMonday(today);
  const todayKey = startOfDay(today).getTime();

  return DAYS_OF_WEEK.map((day, idx) => {
    const date = new Date(start);
    date.setDate(start.getDate() + idx);
    const isToday = startOfDay(date).getTime() === todayKey;

    return {
      key: day.key,
      date,
      dayNumber: String(date.getDate()),
      isToday,
    };
  });
}

export function WeeklyPlanView({
  weeklyTasks,
  onTaskToggle,
  onTaskFeedback,
  onAddTask,
  selectedDay = 'monday',
  onDaySelect,
  availableDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
}: WeeklyPlanViewProps) {
  useEffect(() => {
    console.log('[WeeklyPlanView] Render', {
      selectedDay,
      availableDays,
      weekKeys: Object.keys(weeklyTasks ?? {}),
    });
  }, [availableDays, selectedDay, weeklyTasks]);
  const [expandedTasks] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<DailyTask | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [feedbackTask, setFeedbackTask] = useState<DailyTask | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const weekMeta = useMemo<WeekDayMeta[]>(() => buildWeekMeta(new Date()), []);

  const taskAnimsRef = useRef<Record<string, {
    cardScale: Animated.Value;
    glow: Animated.Value;
    checkScale: Animated.Value;
    checkOpacity: Animated.Value;
  }>>({});

  const getTaskAnims = useCallback((taskId: string) => {
    const existing = taskAnimsRef.current[taskId];
    if (existing) return existing;

    const created = {
      cardScale: new Animated.Value(1),
      glow: new Animated.Value(0),
      checkScale: new Animated.Value(1),
      checkOpacity: new Animated.Value(1),
    };

    taskAnimsRef.current[taskId] = created;
    return created;
  }, []);

  useEffect(() => {
    const currentDayIndex = DAYS_OF_WEEK.findIndex((day) => day.key === selectedDay);
    if (currentDayIndex !== -1 && scrollViewRef.current) {
      const itemWidth = 48 + DAY_BUTTON_GAP;
      const scrollPosition = (currentDayIndex * itemWidth) - (SCREEN_WIDTH / 2) + (24) + 20;
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ x: Math.max(0, scrollPosition), animated: false });
      }, 100);
    }
  }, [selectedDay]);

  

  const getCurrentDayTasks = () => {
    const tasks = weeklyTasks[selectedDay] || [];
    // Sort: main goal tasks first, then challenge tasks
    return [...tasks].sort((a, b) => {
      const aIsChallenge = a.isChallengeTask === true;
      const bIsChallenge = b.isChallengeTask === true;
      if (aIsChallenge && !bIsChallenge) return 1;
      if (!aIsChallenge && bIsChallenge) return -1;
      return 0;
    });
  };

  const getDayProgress = (dayKey: string) => {
    const tasks = weeklyTasks[dayKey] || [];
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(task => task.completed).length;
    return (completed / tasks.length) * 100;
  };

  const getTotalEstimatedTime = (tasks: DailyTask[]) => {
    return tasks.reduce((total, task) => total + task.estimatedTime, 0);
  };

  const renderSubTasks = (subtasks: SubTask[], taskId: string) => {
    if (!subtasks || subtasks.length === 0) return null;

    return (
      <View style={styles.subtasksContainer}>
        {subtasks.map((subtask) => (
          <TouchableOpacity 
            key={subtask.id} 
            style={styles.subtaskItem}
            onPress={() => {/* Handle subtask toggle */}}
          >
            <View style={[styles.subtaskCheckbox, subtask.completed && styles.subtaskCheckboxCompleted]}>
              {subtask.completed && <CheckCircle size={12} color="#4ADE80" />}
            </View>
            <Text style={[styles.subtaskText, subtask.completed && styles.subtaskTextCompleted]}>
              {subtask.title}
            </Text>
            <Text style={styles.subtaskTime}>{subtask.estimatedTime}м</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const handleTaskPress = (task: DailyTask) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
  };

  const animateTaskToggle = useCallback(
    (task: DailyTask) => {
      const anims = getTaskAnims(task.id);
      const isCompleting = !task.completed;

      console.log('[WeeklyPlanView] Task toggle animation', {
        taskId: task.id,
        isCompleting,
      });

      anims.cardScale.stopAnimation();
      anims.glow.stopAnimation();
      anims.checkScale.stopAnimation();
      anims.checkOpacity.stopAnimation();

      if (isCompleting) {
        Animated.parallel([
          Animated.sequence([
            Animated.timing(anims.cardScale, {
              toValue: 0.985,
              duration: 90,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.spring(anims.cardScale, {
              toValue: 1,
              friction: 6,
              tension: 140,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(anims.glow, {
              toValue: 1,
              duration: 220,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(anims.glow, {
              toValue: 0,
              duration: 550,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(anims.checkScale, {
              toValue: 0.6,
              duration: 60,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.spring(anims.checkScale, {
              toValue: 1.08,
              friction: 5,
              tension: 160,
              useNativeDriver: true,
            }),
            Animated.spring(anims.checkScale, {
              toValue: 1,
              friction: 7,
              tension: 120,
              useNativeDriver: true,
            }),
          ]),
        ]).start();

        setTimeout(() => {
          onTaskToggle(task.id);
          setFeedbackTask(task);
          setShowFeedbackModal(true);
        }, 110);

        return;
      }

      Animated.sequence([
        Animated.timing(anims.cardScale, {
          toValue: 0.99,
          duration: 80,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(anims.cardScale, {
          toValue: 1,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();

      onTaskToggle(task.id);
    },
    [getTaskAnims, onTaskToggle],
  );

  const renderTaskCard = (task: DailyTask) => {
    const isExpanded = expandedTasks.has(task.id);
    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    const anims = getTaskAnims(task.id);
    const isChallengeTask = task.isChallengeTask === true;

    const glowOpacity = anims.glow.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    const challengeTheme = isChallengeTask ? getChallengeTheme(task.challengeName, task.title) : null;
    const backgroundImage = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/tipdit1tsyrunqcm8lzmm';
    
    const borderColor = isChallengeTask && challengeTheme ? challengeTheme.border : 'rgba(80, 80, 80, 0.5)';
    const glowColor = isChallengeTask && challengeTheme ? challengeTheme.glow : 'rgba(255, 214, 0, 0.25)';
    const cardShadowColor = isChallengeTask && challengeTheme ? challengeTheme.primary : '#FFD600';

    const renderCardContent = () => (
      <View style={[styles.taskCardOverlay, isChallengeTask && styles.taskCardChallengeOverlay, task.completed && styles.taskCardCompleted]}>
        <Animated.View pointerEvents="none" style={[styles.taskGlowOverlay, { opacity: glowOpacity, backgroundColor: glowColor }]} />
        
        <View style={styles.taskBadgeRow}>
          {isChallengeTask ? (
            <View style={[styles.goalBadge, { backgroundColor: challengeTheme ? challengeTheme.primary + '25' : 'rgba(255, 107, 107, 0.12)' }]}>
              <Flame size={12} color={challengeTheme ? challengeTheme.primary : '#FF6B6B'} />
              <Text style={[styles.goalBadgeText, { color: challengeTheme ? challengeTheme.primary : '#FF6B6B' }]}>
                CHALLENGE
              </Text>
            </View>
          ) : (
            <View style={[styles.goalBadge, styles.mainGoalBadgeStyle]}>
              <Target size={12} color="rgba(255,255,255,0.6)" />
              <Text style={[styles.goalBadgeText, styles.mainGoalBadgeText]}>
                MAIN GOAL
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity 
          style={styles.taskHeader}
          onPress={() => handleTaskPress(task)}
          activeOpacity={0.92}
          testID={`plan.task.${task.id}.open`}
        >
          <TouchableOpacity 
            style={[
              styles.taskCheckbox, 
              task.completed && styles.taskCheckboxCompleted,
              !task.completed && (isChallengeTask ? { borderColor: challengeTheme?.primary || '#FF6B6B', borderWidth: 2.5 } : styles.goalTaskCheckbox),
            ]}
            onPress={(e) => {
              e.stopPropagation();
              animateTaskToggle(task);
            }}
            activeOpacity={0.9}
            testID={`plan.task.${task.id}.toggle`}
          >
            <Animated.View style={{ transform: [{ scale: anims.checkScale }], opacity: anims.checkOpacity }}>
              {task.completed && <Check size={16} color="#000" strokeWidth={3} />}
            </Animated.View>
          </TouchableOpacity>
          
          <View style={styles.taskContent}>
            <View style={styles.taskTitleRow}>
              <Text style={[
                styles.taskTitle, 
                task.completed && styles.taskTitleCompleted,
              ]}>
                {task.title}
              </Text>
              <ChevronRight size={18} color="rgba(255,255,255,0.4)" />
            </View>
            
            <Text style={styles.taskDescription} numberOfLines={2}>
              {task.description}
            </Text>
            
            <View style={styles.taskMeta}>
              <View style={[
                styles.metaTagBadge,
                isChallengeTask ? { backgroundColor: (challengeTheme?.primary || '#FF6B6B') + '30' } : styles.goalMetaTagBadge
              ]}>
                <Text style={[
                  styles.metaTagText,
                  isChallengeTask ? { color: challengeTheme?.primary || '#FF6B6B' } : styles.goalMetaTagText
                ]}>
                  {isChallengeTask ? 'CHALLENGE' : 'GOAL'}
                </Text>
              </View>
              
              <View style={styles.metaTagBadge}>
                <Clock size={12} color="rgba(255,255,255,0.7)" />
                <Text style={styles.metaTagText}>{task.estimatedTime}m</Text>
              </View>
              
              <View style={[
                styles.metaTagBadge,
                { backgroundColor: getDifficultyColor(task.difficulty) + '30' }
              ]}>
                <Text style={[
                  styles.metaTagText,
                  { color: getDifficultyColor(task.difficulty) }
                ]}>
                  {task.difficulty.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
        
        {isExpanded && hasSubtasks && renderSubTasks(task.subtasks!, task.id)}
        
        {task.tips && task.tips.length > 0 && isExpanded && (
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>💡 Tips:</Text>
            {task.tips.map((tip, index) => (
              <Text key={index} style={styles.tipText}>• {tip}</Text>
            ))}
          </View>
        )}
      </View>
    );

    return (
      <Animated.View 
        key={task.id} 
        style={[
          { transform: [{ scale: anims.cardScale }] },
        ]}
      >
        <View style={[
          styles.taskCardWrapper,
          { 
            borderColor: borderColor,
            shadowColor: cardShadowColor,
          }
        ]}>
          {isChallengeTask && challengeTheme ? (
            <LinearGradient
              colors={[challengeTheme.primary + '35', challengeTheme.secondary + '20', 'rgba(20,20,20,0.95)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.taskCardImageBg}
            >
              {renderCardContent()}
            </LinearGradient>
          ) : (
            <ImageBackground
              source={{ uri: backgroundImage }}
              style={styles.taskCardImageBg}
              imageStyle={styles.taskCardImageStyle}
              resizeMode="cover"
            >
              {renderCardContent()}
            </ImageBackground>
          )}
              </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Week Navigation */}
      <ScrollView 
        ref={scrollViewRef}
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.weekNavigation}
        contentContainerStyle={styles.weekNavigationContent}
      >
        {DAYS_OF_WEEK.map((day) => {
          const progress = getDayProgress(day.key);
          const isSelected = selectedDay === day.key;
          const tasksCount = (weeklyTasks[day.key] || []).length;
          const isAvailable = availableDays.includes(day.key);
          const completedCount = (weeklyTasks[day.key] || []).filter((t) => t.completed).length;
          const meta = weekMeta.find((m) => m.key === day.key);
          const isToday = meta?.isToday ?? false;

          const progressAngle = (progress / 100) * 360;
          
          return (
            <View key={day.key} style={styles.dayWrapper}>
              <Text
                style={[
                  styles.dayShort,
                  isSelected && styles.dayShortSelected,
                  isToday && !isSelected && styles.dayShortToday,
                  !isAvailable && styles.dayShortDisabled,
                ]}
              >
                {day.short}
              </Text>
              
              <TouchableOpacity
                style={[
                  styles.dayButton,
                  isSelected && styles.dayButtonSelected,
                  isToday && !isSelected && styles.dayButtonToday,
                  !isAvailable && styles.dayButtonDisabled,
                ]}
                onPress={() => isAvailable && onDaySelect(day.key)}
                disabled={!isAvailable}
                activeOpacity={0.85}
                testID={`plan.day.${day.key}`}
              >
                {isAvailable && tasksCount > 0 && (
                  <View style={styles.progressRingContainer}>
                    <View style={[
                      styles.progressRingBg,
                      isSelected && styles.progressRingBgSelected
                    ]} />
                    <View 
                      style={[
                        styles.progressRingFill,
                        { 
                          borderTopColor: progress > 0 ? (isSelected ? '#000' : '#4ADE80') : 'transparent',
                          borderRightColor: progress > 25 ? (isSelected ? '#000' : '#4ADE80') : 'transparent',
                          borderBottomColor: progress > 50 ? (isSelected ? '#000' : '#4ADE80') : 'transparent',
                          borderLeftColor: progress > 75 ? (isSelected ? '#000' : '#4ADE80') : 'transparent',
                          transform: [{ rotate: `${progressAngle - 90}deg` }]
                        }
                      ]} 
                    />
                    {progress === 100 && (
                      <View style={[
                        styles.completedRing,
                        isSelected && styles.completedRingSelected
                      ]} />
                    )}
                  </View>
                )}
                
                <Text
                  style={[
                    styles.dayNumber,
                    isSelected && styles.dayNumberSelected,
                    !isAvailable && styles.dayNumberDisabled,
                  ]}
                >
                  {meta?.dayNumber ?? ''}
                </Text>
                
                {!isAvailable && (
                  <View style={styles.lockOverlay}>
                    <Lock size={12} color="rgba(255,255,255,0.4)" />
                  </View>
                )}
              </TouchableOpacity>
              
              {isAvailable && tasksCount > 0 && (
                <View style={styles.taskIndicator}>
                  <View style={[
                    styles.taskDot,
                    completedCount === tasksCount && styles.taskDotComplete,
                    isSelected && styles.taskDotSelected
                  ]} />
                  {tasksCount > 1 && (
                    <Text style={[
                      styles.taskCountSmall,
                      isSelected && styles.taskCountSmallSelected
                    ]}>
                      {completedCount}/{tasksCount}
                    </Text>
                  )}
                </View>
              )}
              
              {isToday && (
                <View style={[
                  styles.todayIndicator,
                  isSelected && styles.todayIndicatorSelected
                ]} />
              )}
            </View>
          );
        })}
      </ScrollView>
      
      {/* Selected Day Content */}
      <ScrollView style={styles.dayContent} showsVerticalScrollIndicator={false}>
        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>
            {DAYS_OF_WEEK.find(d => d.key === selectedDay)?.label}
          </Text>
          
          <View style={styles.dayStats}>
            <View style={styles.dayStatItem}>
              <Target size={16} color="#FFFFFF" />
              <Text style={styles.dayStatText}>
                {getCurrentDayTasks().filter(t => t.completed).length}/{getCurrentDayTasks().length} tasks
              </Text>
            </View>
            
            <View style={styles.dayStatItem}>
              <Clock size={16} color="#FFFFFF" />
              <Text style={styles.dayStatText}>
                {getTotalEstimatedTime(getCurrentDayTasks())}м
              </Text>
            </View>
          </View>
        </View>
        
        {/* Add Task Button - только для доступных дней */}
        {availableDays.includes(selectedDay) && (
          <TouchableOpacity 
            style={styles.addTaskButton}
            onPress={() => onAddTask(selectedDay)}
          >
            <Plus size={20} color="#000000" />
            <Text style={styles.addTaskButtonText}>Add Task</Text>
          </TouchableOpacity>
        )}
        
        {/* Tasks List */}
        <View style={styles.tasksContainer}>
          {!availableDays.includes(selectedDay) ? (
            <View style={styles.emptyState}>
              <Text style={styles.lockedDayIcon}>🔒</Text>
              <Text style={styles.emptyTitle}>Day unavailable</Text>
              <Text style={styles.emptySubtitle}>Only today is available</Text>
            </View>
          ) : getCurrentDayTasks().length > 0 ? (
            getCurrentDayTasks().map(renderTaskCard)
          ) : (
            <View style={styles.emptyState}>
              <Calendar size={48} color="rgba(255,255,255,0.5)" />
              <Text style={styles.emptyTitle}>No tasks for this day</Text>
            </View>
          )}
        </View>
      </ScrollView>
      
      <TaskDetailModal
        visible={showTaskDetail}
        task={selectedTask}
        onClose={() => {
          setShowTaskDetail(false);
          setSelectedTask(null);
        }}
      />
      
      <TaskFeedbackModal
        visible={showFeedbackModal}
        task={feedbackTask}
        onClose={() => {
          setShowFeedbackModal(false);
          setFeedbackTask(null);
        }}
        onSave={(taskId, feedback) => {
          if (onTaskFeedback) {
            onTaskFeedback(taskId, feedback);
          }
        }}
        onSkip={() => {
          console.log('[WeeklyPlanView] Feedback skipped');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  weekNavigation: {
    maxHeight: 110,
    marginBottom: 20,
  },
  weekNavigationContent: {
    paddingHorizontal: 4,
    gap: 6,
    alignItems: 'flex-start',
  },
  dayWrapper: {
    alignItems: 'center',
    width: 48,
  },
  dayButton: {
    width: DAY_BUTTON_SIZE,
    height: DAY_BUTTON_SIZE,
    borderRadius: DAY_BUTTON_SIZE / 2,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayButtonToday: {
    backgroundColor: '#252525',
  },
  dayButtonSelected: {
    backgroundColor: theme.colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
  },
  dayShort: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  dayShortSelected: {
    color: theme.colors.primary,
    fontWeight: '700' as const,
  },
  dayShortToday: {
    color: 'rgba(255,255,255,0.7)',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  dayNumberSelected: {
    color: '#000000',
  },
  dayNumberDisabled: {
    color: 'rgba(255,255,255,0.25)',
  },
  progressRingContainer: {
    position: 'absolute',
    width: DAY_BUTTON_SIZE,
    height: DAY_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingBg: {
    position: 'absolute',
    width: DAY_BUTTON_SIZE - 4,
    height: DAY_BUTTON_SIZE - 4,
    borderRadius: (DAY_BUTTON_SIZE - 4) / 2,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  progressRingBgSelected: {
    borderColor: 'rgba(0,0,0,0.15)',
  },
  progressRingFill: {
    position: 'absolute',
    width: DAY_BUTTON_SIZE - 4,
    height: DAY_BUTTON_SIZE - 4,
    borderRadius: (DAY_BUTTON_SIZE - 4) / 2,
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
  completedRing: {
    position: 'absolute',
    width: DAY_BUTTON_SIZE - 4,
    height: DAY_BUTTON_SIZE - 4,
    borderRadius: (DAY_BUTTON_SIZE - 4) / 2,
    borderWidth: 2.5,
    borderColor: '#4ADE80',
  },
  completedRingSelected: {
    borderColor: 'rgba(0,0,0,0.5)',
  },
  taskIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 3,
  },
  taskDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  taskDotComplete: {
    backgroundColor: '#4ADE80',
  },
  taskDotSelected: {
    backgroundColor: theme.colors.primary,
  },
  taskCountSmall: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.45)',
  },
  taskCountSmallSelected: {
    color: theme.colors.primary,
  },
  todayIndicator: {
    position: 'absolute',
    bottom: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
  },
  todayIndicatorSelected: {
    backgroundColor: '#000',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: DAY_BUTTON_SIZE / 2,
  },
  dayContent: {
    flex: 1,
  },
  dayHeader: {
    marginBottom: 18,
  },
  dayTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  dayStats: {
    flexDirection: 'row',
    gap: 20,
  },
  dayStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dayStatText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.62)',
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    height: 56,
    borderRadius: 999,
    marginTop: 12,
    marginBottom: 18,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.22,
        shadowRadius: 18,
      },
      android: {
        elevation: 10,
      },
      default: {},
    }),
  },
  addTaskButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#000000',
    marginLeft: 8,
  },
  tasksContainer: {
    gap: 14,
    paddingBottom: 40,
  },
  taskCardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 6,
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
  },
  taskCardImageBg: {
    width: '100%',
  },
  taskCardImageStyle: {
    borderRadius: 18,
  },
  taskCardOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  taskCardChallengeOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  challengeTaskCard: {
    borderColor: 'rgba(255, 107, 107, 0.3)',
    borderWidth: 1.5,
    backgroundColor: 'rgba(255, 107, 107, 0.05)',
  },
  challengeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  challengeBannerText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#FF6B6B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  challengeTaskCheckbox: {
    borderColor: '#FF6B6B',
    borderWidth: 2.5,
  },

  metaTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  metaTagText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  challengeMetaTagBadge: {
    backgroundColor: 'rgba(255, 80, 80, 0.25)',
  },
  challengeMetaTagText: {
    color: '#FF8888',
  },
  goalMetaTagBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  goalMetaTagText: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  taskGlowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 215, 0, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.25)',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  taskCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    marginTop: 2,
  },
  taskCheckboxCompleted: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  taskContent: {
    flex: 1,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    flex: 1,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: 'rgba(255,255,255,0.5)',
  },
  adaptedBadge: {
    marginLeft: 8,
  },
  taskDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 10,
    lineHeight: 20,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  taskMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskMetaText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'capitalize',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '600' as const,
    textTransform: 'uppercase',
  },
  expandButton: {
    padding: 4,
    marginLeft: 8,
  },
  expandIcon: {
    transform: [{ rotate: '0deg' }],
  },
  expandIconRotated: {
    transform: [{ rotate: '90deg' }],
  },
  subtasksContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingLeft: 40,
  },
  subtaskCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  subtaskCheckboxCompleted: {
    backgroundColor: '#4ADE80',
    borderColor: '#4ADE80',
  },
  subtaskText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  subtaskTextCompleted: {
    textDecorationLine: 'line-through',
    color: 'rgba(255,255,255,0.4)',
  },
  subtaskTime: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  tipsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.primary,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
    marginBottom: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 36,
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 8,
    textAlign: 'center',
  },

  dayButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#141414',
  },
  dayShortDisabled: {
    color: 'rgba(255,255,255,0.25)',
  },
  lockedDayIcon: {
    fontSize: 44,
    marginBottom: 14,
  },

  taskCardCompleted: {
    opacity: 0.7,
  },
  taskBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  goalBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
  },
  mainGoalBadgeStyle: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  mainGoalBadgeText: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  challengeBadgeStyle: {
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
  },
  challengeBadgeText: {
    color: '#FF6B6B',
  },
  goalTaskCheckbox: {
    borderColor: theme.colors.primary,
    borderWidth: 2.5,
  },
  goalTaskTitle: {
    color: '#FFFFFF',
  },

});