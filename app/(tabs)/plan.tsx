import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Animated, TextInput, ImageBackground } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Calendar, Sparkles, Trophy, ListTodo, Search, Clock, Star, Users, ChevronRight, Flame, Dumbbell, Rocket, Smartphone, BookOpen, Heart, Zap, Leaf, Activity, User, Sunrise, Ban, Code2, Globe, TrendingUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGoalStore } from '@/hooks/use-goal-store';
import { useSmartTaskGenerator } from '@/hooks/use-smart-task-generator';
import { useChallengeStore } from '@/hooks/use-challenge-store';
import { WeeklyPlanView } from '@/components/WeeklyPlanView';
import { TaskCreationModal } from '@/components/TaskCreationModal';
import { DailyTask } from '@/types/goal';
import { ChallengeTemplate, ChallengeTask } from '@/types/challenge';
import { CHALLENGE_CATEGORIES, getPopularChallenges } from '@/constants/challenges';
import { theme } from '@/constants/theme';

const getCurrentDayKey = () => {
  const today = new Date();
  const dayIndex = today.getDay();
  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return dayKeys[dayIndex];
};

const getAvailableDays = () => {
  return [getCurrentDayKey()];
};

const getCategoryIcon = (iconName: string, size: number, color: string) => {
  const icons: Record<string, React.ReactNode> = {
    'Dumbbell': <Dumbbell size={size} color={color} />,
    'Rocket': <Rocket size={size} color={color} />,
    'Smartphone': <Smartphone size={size} color={color} />,
    'BookOpen': <BookOpen size={size} color={color} />,
    'Heart': <Heart size={size} color={color} />,
    'Flame': <Flame size={size} color={color} />,
    'Leaf': <Leaf size={size} color={color} />,
    'Activity': <Activity size={size} color={color} />,
    'PersonStanding': <User size={size} color={color} />,
    'Sunrise': <Sunrise size={size} color={color} />,
    'Clock': <Clock size={size} color={color} />,
    'Target': <Trophy size={size} color={color} />,
    'Ban': <Ban size={size} color={color} />,
    'Code': <Code2 size={size} color={color} />,
    'Languages': <Globe size={size} color={color} />,
    'TrendingUp': <TrendingUp size={size} color={color} />,
    'Zap': <Zap size={size} color={color} />,
    'Sparkles': <Sparkles size={size} color={color} />,
  };
  return icons[iconName] || <Flame size={size} color={color} />;
};

const formatParticipants = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
  return count.toString();
};

interface ChallengeCardProps {
  challenge: ChallengeTemplate;
  onPress: () => void;
}

const ChallengeCard = React.memo(({ challenge, onPress }: ChallengeCardProps) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.challengeCard}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        {challenge.image ? (
          <ImageBackground
            source={{ uri: challenge.image }}
            style={styles.cardImage}
            imageStyle={styles.cardImageStyle}
          >
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
              locations={[0, 0.4, 1]}
              style={styles.imageOverlay}
            />
            <View style={styles.cardBadgesOverlay}>
              <View style={[styles.iconContainerSmall, { backgroundColor: challenge.color }]}>
                {getCategoryIcon(challenge.icon, 14, '#FFF')}
              </View>
              {challenge.isPopular && (
                <View style={styles.popularBadge}>
                  <Flame size={10} color="#FF6B6B" />
                  <Text style={styles.badgeText}>Popular</Text>
                </View>
              )}
              {challenge.isNew && (
                <View style={styles.newBadge}>
                  <Sparkles size={10} color="#4ECDC4" />
                  <Text style={[styles.badgeText, { color: '#4ECDC4' }]}>New</Text>
                </View>
              )}
            </View>
            <View style={styles.cardContentOverlay}>
              <Text style={styles.cardTitleOverlay}>{challenge.name}</Text>
              <Text style={styles.cardDescriptionOverlay} numberOfLines={2}>
                {challenge.shortDescription}
              </Text>
              <View style={styles.cardStats}>
                <View style={styles.statItem}>
                  <Clock size={12} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.statTextLight}>{challenge.durationDays}d</Text>
                </View>
                <View style={styles.statItem}>
                  <Star size={12} color="#FFD700" />
                  <Text style={styles.statTextLight}>{challenge.rating}</Text>
                </View>
                <View style={styles.statItem}>
                  <Users size={12} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.statTextLight}>{formatParticipants(challenge.participantsCount)}</Text>
                </View>
              </View>
              <View style={styles.cardFooter}>
                <View style={[
                  styles.difficultyBadge,
                  challenge.difficulty === 'beginner' && styles.beginnerBadge,
                  challenge.difficulty === 'intermediate' && styles.intermediateBadge,
                  challenge.difficulty === 'advanced' && styles.advancedBadge,
                ]}>
                  <Text style={[
                    styles.difficultyText,
                    challenge.difficulty === 'beginner' && { color: '#4ECDC4' },
                    challenge.difficulty === 'intermediate' && { color: '#F39C12' },
                    challenge.difficulty === 'advanced' && { color: '#E74C3C' },
                  ]}>
                    {challenge.difficulty.charAt(0).toUpperCase() + challenge.difficulty.slice(1)}
                  </Text>
                </View>
                <ChevronRight size={18} color="rgba(255,255,255,0.7)" />
              </View>
            </View>
          </ImageBackground>
        ) : (
          <>
            <LinearGradient
              colors={[challenge.color + '20', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            />
            
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: challenge.color + '30' }]}>
                {getCategoryIcon(challenge.icon, 22, challenge.color)}
              </View>
              
              {challenge.isPopular && (
                <View style={styles.popularBadge}>
                  <Flame size={10} color="#FF6B6B" />
                  <Text style={styles.badgeText}>Popular</Text>
                </View>
              )}
            </View>

            <Text style={styles.cardTitle}>{challenge.name}</Text>
            <Text style={styles.cardDescription} numberOfLines={2}>
              {challenge.shortDescription}
            </Text>

            <View style={styles.cardStats}>
              <View style={styles.statItem}>
                <Clock size={12} color={theme.colors.textSecondary} />
                <Text style={styles.statText}>{challenge.durationDays}d</Text>
              </View>
              <View style={styles.statItem}>
                <Star size={12} color="#FFD700" />
                <Text style={styles.statText}>{challenge.rating}</Text>
              </View>
              <View style={styles.statItem}>
                <Users size={12} color={theme.colors.textSecondary} />
                <Text style={styles.statText}>{formatParticipants(challenge.participantsCount)}</Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <View style={[
                styles.difficultyBadge,
                challenge.difficulty === 'beginner' && styles.beginnerBadge,
                challenge.difficulty === 'intermediate' && styles.intermediateBadge,
                challenge.difficulty === 'advanced' && styles.advancedBadge,
              ]}>
                <Text style={[
                  styles.difficultyText,
                  challenge.difficulty === 'beginner' && { color: '#4ECDC4' },
                  challenge.difficulty === 'intermediate' && { color: '#F39C12' },
                  challenge.difficulty === 'advanced' && { color: '#E74C3C' },
                ]}>
                  {challenge.difficulty.charAt(0).toUpperCase() + challenge.difficulty.slice(1)}
                </Text>
              </View>
              <ChevronRight size={18} color={theme.colors.textSecondary} />
            </View>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

ChallengeCard.displayName = 'ChallengeCard';

export default function PlanScreen() {
  const store = useGoalStore();
  const challengeStore = useChallengeStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState(getCurrentDayKey());
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [availableDays] = useState<string[]>(getAvailableDays());
  const [refreshing, setRefreshing] = useState(false);
  const [hasAutoGenerated, setHasAutoGenerated] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'challenges'>('tasks');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const pulseAnim = useState(new Animated.Value(1))[0];

  const { 
    analytics, 
    isGenerating,
    isGeneratingInBackground,
    generateSmartTasks, 
    shouldAutoGenerate
  } = useSmartTaskGenerator();

  const activeChallenge = challengeStore.getActiveChallenge();

  const currentDayNumber = useMemo(() => {
    return activeChallenge ? challengeStore.getCurrentDayNumber(activeChallenge.id) : 0;
  }, [activeChallenge, challengeStore]);

  const weeklyTasks = useMemo(() => {
    const challengeTodayTasks = activeChallenge ? challengeStore.getTodayTasks(activeChallenge.id) : [];
    if (!store?.dailyTasks) {
      return {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
      };
    }

    const tasksByDay: { [key: string]: DailyTask[] } = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    };

    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    store.dailyTasks.forEach((task) => {
      const taskDate = new Date(task.date);
      taskDate.setHours(0, 0, 0, 0);
      
      if (taskDate.getTime() === today.getTime()) {
        const dayOfWeek = taskDate.getDay();
        const dayKey = dayKeys[dayOfWeek];
        tasksByDay[dayKey].push({
          ...task,
          difficulty: task.difficulty || 'medium',
          estimatedTime: task.estimatedTime || 30,
        });
      }
    });

    if (activeChallenge && challengeTodayTasks.length > 0) {
      const todayDayKey = dayKeys[today.getDay()];
      const challengeTasksAsDailyTasks: DailyTask[] = challengeTodayTasks.map((ct: ChallengeTask) => ({
        id: ct.id,
        goalId: `challenge_${activeChallenge.id}`,
        day: currentDayNumber,
        date: new Date().toISOString(),
        title: ct.title,
        description: ct.description,
        duration: `${ct.duration}m`,
        priority: 'high' as const,
        difficulty: 'medium' as const,
        estimatedTime: ct.duration,
        completed: ct.completed,
        completedAt: ct.completedAt,
        tips: [],
        subtasks: [],
        isChallengeTask: true,
        challengeId: activeChallenge.id,
        challengeName: activeChallenge.name,
      }));
      tasksByDay[todayDayKey] = [...challengeTasksAsDailyTasks, ...tasksByDay[todayDayKey]];
    }

    return tasksByDay;
  }, [store?.dailyTasks, activeChallenge, challengeStore, currentDayNumber]);

  const todayTasksCount = useMemo(() => {
    const currentDay = getCurrentDayKey();
    return weeklyTasks[currentDay]?.length || 0;
  }, [weeklyTasks]);

  const filteredChallenges = useMemo(() => {
    return challengeStore.templates.filter(challenge => {
      const matchesSearch = challenge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        challenge.shortDescription.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || challenge.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [challengeStore.templates, searchQuery, selectedCategory]);

  const popularChallenges = useMemo(() => getPopularChallenges(), []);

  const addTaskToStore = useCallback(async (task: any) => {
    if (!store) return;
    await store.addTask({
      day: 0,
      date: new Date().toISOString(),
      title: task.title,
      description: task.description,
      duration: `${task.estimatedTime}m`,
      priority: task.priority,
      difficulty: task.difficulty,
      estimatedTime: task.estimatedTime,
      tips: task.tips || [],
      subtasks: task.subtasks?.map((st: any, idx: number) => ({
        id: `subtask_${Date.now()}_${idx}`,
        title: st.title,
        completed: false,
        estimatedTime: st.estimatedTime,
      })),
      completed: false,
    });
  }, [store]);

  const autoGenerateTasks = useCallback(async () => {
    if (!store?.currentGoal || hasAutoGenerated || isGenerating) return;
    
    if (shouldAutoGenerate() && todayTasksCount === 0) {
      console.log('[PlanScreen] Auto-generating tasks for today');
      setHasAutoGenerated(true);
      
      let firstTaskAdded = false;
      const generatedTasks = await generateSmartTasks(async (firstTask) => {
        console.log('[PlanScreen] First task ready, adding immediately');
        await addTaskToStore(firstTask);
        firstTaskAdded = true;
      });
      
      if (generatedTasks.length > 0) {
        const tasksToAdd = firstTaskAdded ? generatedTasks.slice(1) : generatedTasks;
        for (const task of tasksToAdd) {
          await addTaskToStore(task);
        }
        console.log('[PlanScreen] Auto-generated', generatedTasks.length, 'tasks');
      }
    }
  }, [store, hasAutoGenerated, isGenerating, shouldAutoGenerate, todayTasksCount, generateSmartTasks, addTaskToStore]);

  useEffect(() => {
    if (store?.isReady && store?.currentGoal && !hasAutoGenerated) {
      const timer = setTimeout(() => {
        autoGenerateTasks();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [store?.isReady, store?.currentGoal, hasAutoGenerated, autoGenerateTasks]);

  useEffect(() => {
    if (isGenerating) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isGenerating, pulseAnim]);

  const handleManualGenerate = async () => {
    if (isGenerating || !store?.currentGoal) return;
    
    let firstTaskAdded = false;
    const generatedTasks = await generateSmartTasks(async (firstTask) => {
      console.log('[PlanScreen] First task ready (manual), adding immediately');
      await addTaskToStore(firstTask);
      firstTaskAdded = true;
    });
    
    if (generatedTasks.length > 0) {
      const tasksToAdd = firstTaskAdded ? generatedTasks.slice(1) : generatedTasks;
      for (const task of tasksToAdd) {
        await addTaskToStore(task);
      }
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (todayTasksCount === 0 && store?.currentGoal && !isGenerating) {
      let firstTaskAdded = false;
      const generatedTasks = await generateSmartTasks(async (firstTask) => {
        await addTaskToStore(firstTask);
        firstTaskAdded = true;
        setRefreshing(false);
      });
      if (generatedTasks.length > 0) {
        const tasksToAdd = firstTaskAdded ? generatedTasks.slice(1) : generatedTasks;
        for (const task of tasksToAdd) {
          await addTaskToStore(task);
        }
      }
    }
    setRefreshing(false);
  }, [todayTasksCount, store, isGenerating, generateSmartTasks, addTaskToStore]);

  const handleChallengePress = useCallback((challengeId: string) => {
    router.push(`/challenge-detail?id=${challengeId}` as any);
  }, [router]);

  const handleActiveChallengePress = useCallback(() => {
    if (activeChallenge) {
      router.push(`/challenge-active?id=${activeChallenge.id}` as any);
    }
  }, [activeChallenge, router]);

  if (!store || !store.isReady) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD600" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const getPreviousDayTasks = (currentDay: string) => {
    if (!currentDay?.trim()) return [];
    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const currentIndex = dayKeys.indexOf(currentDay);
    const previousIndex = currentIndex === 0 ? 6 : currentIndex - 1;
    const previousDay = dayKeys[previousIndex];
    return weeklyTasks[previousDay] || [];
  };

  const handleAddTask = (day: string) => {
    if (!day?.trim()) return;
    setSelectedDay(day);
    setShowTaskModal(true);
  };

  const handleSaveTask = (taskData: Omit<DailyTask, 'id' | 'goalId'>) => {
    if (!taskData?.title?.trim()) return;
    console.log('Saving task for', selectedDay, ':', taskData);
    store.addTask(taskData);
  };

  const renderTasksView = () => (
    <>
      {isGenerating && (
        <Animated.View style={[styles.generatingCard, { transform: [{ scale: pulseAnim }] }]}>
          <ActivityIndicator size="small" color="#FFD600" />
          <Text style={styles.generatingText}>Creating your smart plan...</Text>
        </Animated.View>
      )}

      {isGeneratingInBackground && !isGenerating && (
        <View style={styles.backgroundGeneratingCard}>
          <ActivityIndicator size="small" color="rgba(255,214,0,0.7)" />
          <Text style={styles.backgroundGeneratingText}>Adding more tasks...</Text>
        </View>
      )}

      {todayTasksCount === 0 && !isGenerating && store.currentGoal && (
        <TouchableOpacity 
          style={styles.generateButton}
          onPress={handleManualGenerate}
          activeOpacity={0.8}
        >
          <Sparkles size={20} color="#000000" />
          <Text style={styles.generateButtonText}>Generate Smart Tasks</Text>
        </TouchableOpacity>
      )}

      {activeChallenge && (
        <TouchableOpacity 
          style={styles.activeChallengeCard}
          onPress={handleActiveChallengePress}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FFD700', '#FFA500']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.activeGradient}
          />
          <View style={styles.activeContent}>
            <View style={styles.activeIconWrap}>
              <Trophy size={20} color="#000" />
            </View>
            <View style={styles.activeInfo}>
              <Text style={styles.activeLabel}>Active Challenge</Text>
              <Text style={styles.activeName}>{activeChallenge.name}</Text>
              <Text style={styles.activeProgress}>
                Day {activeChallenge.currentDay} of {activeChallenge.totalDays}
              </Text>
            </View>
            <ChevronRight size={20} color="#000" />
          </View>
        </TouchableOpacity>
      )}

      <WeeklyPlanView
        weeklyTasks={weeklyTasks}
        onTaskToggle={(taskId: string) => {
          const allTasks = Object.values(weeklyTasks).flat();
          const task = allTasks.find(t => t.id === taskId);
          if (task?.isChallengeTask && task.challengeId) {
            console.log('[PlanScreen] Toggling challenge task:', taskId, 'day:', currentDayNumber);
            challengeStore.toggleTaskCompletion(task.challengeId, currentDayNumber, taskId);
          } else {
            store.toggleTaskCompletion(taskId);
          }
        }}
        onTaskFeedback={store.saveTaskFeedback}
        onAddTask={handleAddTask}
        selectedDay={selectedDay}
        onDaySelect={setSelectedDay}
        availableDays={availableDays}
      />
    </>
  );

  const renderChallengesView = () => (
    <>
      {activeChallenge && (
        <TouchableOpacity 
          style={styles.activeChallengeCard}
          onPress={handleActiveChallengePress}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FFD700', '#FFA500']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.activeGradient}
          />
          <View style={styles.activeContent}>
            <View style={styles.activeIconWrap}>
              <Trophy size={20} color="#000" />
            </View>
            <View style={styles.activeInfo}>
              <Text style={styles.activeLabel}>Active Challenge</Text>
              <Text style={styles.activeName}>{activeChallenge.name}</Text>
              <Text style={styles.activeProgress}>
                Day {activeChallenge.currentDay} of {activeChallenge.totalDays}
              </Text>
            </View>
            <ChevronRight size={20} color="#000" />
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={18} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search challenges..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContent}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            selectedCategory === 'all' && styles.categoryChipActive
          ]}
          onPress={() => setSelectedCategory('all')}
        >
          <Text style={[
            styles.categoryChipText,
            selectedCategory === 'all' && styles.categoryChipTextActive
          ]}>All</Text>
        </TouchableOpacity>
        
        {CHALLENGE_CATEGORIES.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              selectedCategory === category.id && styles.categoryChipActive,
              selectedCategory === category.id && { backgroundColor: category.color }
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            {getCategoryIcon(category.icon, 14, selectedCategory === category.id ? '#000' : category.color)}
            <Text style={[
              styles.categoryChipText,
              selectedCategory === category.id && styles.categoryChipTextActive
            ]}>{category.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {searchQuery === '' && selectedCategory === 'all' && popularChallenges.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Flame size={18} color="#FF6B6B" />
            <Text style={styles.sectionTitle}>Popular Challenges</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {popularChallenges.slice(0, 5).map(challenge => (
              <View key={challenge.id} style={styles.horizontalCardWrapper}>
                <ChallengeCard
                  challenge={challenge}
                  onPress={() => handleChallengePress(challenge.id)}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Trophy size={18} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>
            {searchQuery || selectedCategory !== 'all' 
              ? `Results (${filteredChallenges.length})` 
              : 'All Challenges'}
          </Text>
        </View>
        
        {filteredChallenges.length === 0 ? (
          <View style={styles.emptyState}>
            <Search size={40} color={theme.colors.textSecondary} />
            <Text style={styles.emptyText}>No challenges found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your search</Text>
          </View>
        ) : (
          <View style={styles.challengesGrid}>
            {filteredChallenges.map(challenge => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                onPress={() => handleChallengePress(challenge.id)}
              />
            ))}
          </View>
        )}
      </View>
    </>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#FFD600"
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <View>
              <Text style={styles.title}>Plan</Text>
              {analytics && activeTab === 'tasks' && (
                <Text style={styles.subtitle}>
                  {analytics.completionRate.toFixed(0)}% completion rate
                </Text>
              )}
            </View>
            <TouchableOpacity 
              style={styles.monthButton}
              onPress={() => router.push('/month-overview')}
            >
              <Calendar size={18} color="#000000" />
              <Text style={styles.monthButtonText}>Month</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'tasks' && styles.tabButtonActive]}
            onPress={() => setActiveTab('tasks')}
            activeOpacity={0.7}
          >
            <ListTodo size={18} color={activeTab === 'tasks' ? '#000' : '#FFF'} />
            <Text style={[styles.tabButtonText, activeTab === 'tasks' && styles.tabButtonTextActive]}>
              Tasks
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'challenges' && styles.tabButtonActive]}
            onPress={() => setActiveTab('challenges')}
            activeOpacity={0.7}
          >
            <Trophy size={18} color={activeTab === 'challenges' ? '#000' : '#FFF'} />
            <Text style={[styles.tabButtonText, activeTab === 'challenges' && styles.tabButtonTextActive]}>
              Challenges
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'tasks' ? renderTasksView() : renderChallengesView()}
      </ScrollView>
      
      <TaskCreationModal
        visible={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onSave={handleSaveTask}
        selectedDay={selectedDay}
        previousDayTasks={getPreviousDayTasks(selectedDay)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  header: {
    marginTop: 16,
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  monthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD600',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
    flexShrink: 0,
    minWidth: 80,
    justifyContent: 'center',
  },
  monthButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#000000',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  tabButtonActive: {
    backgroundColor: '#FFD600',
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  tabButtonTextActive: {
    color: '#000000',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
  },
  generatingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FFD600',
  },
  generatingText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#FFD600',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD600',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#000000',
  },
  backgroundGeneratingCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: 'rgba(26,26,26,0.8)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  backgroundGeneratingText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: 'rgba(255,214,0,0.7)',
  },
  activeChallengeCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  activeGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  activeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  activeIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  activeLabel: {
    fontSize: 11,
    color: 'rgba(0,0,0,0.6)',
    fontWeight: '600' as const,
  },
  activeName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#000',
  },
  activeProgress: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.7)',
    marginTop: 2,
  },
  searchContainer: {
    marginBottom: 10,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#FFF',
  },
  categoriesScroll: {
    maxHeight: 40,
    marginBottom: 12,
  },
  categoriesContent: {
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: '#FFD600',
    borderColor: '#FFD600',
  },
  categoryChipText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500' as const,
  },
  categoryChipTextActive: {
    color: '#000',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  horizontalList: {
    gap: 12,
    paddingRight: 20,
  },
  horizontalCardWrapper: {
    width: 260,
  },
  challengesGrid: {
    gap: 10,
  },
  challengeCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  cardImage: {
    minHeight: 180,
    justifyContent: 'space-between',
  },
  cardImageStyle: {
    borderRadius: 15,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 15,
  },
  cardBadgesOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  iconContainerSmall: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContentOverlay: {
    padding: 12,
    paddingTop: 0,
  },
  cardTitleOverlay: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardDescriptionOverlay: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 16,
    marginBottom: 8,
  },
  statTextLight: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  newBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
    gap: 4,
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  cardPadding: {
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#FF6B6B',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFF',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  cardStats: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  beginnerBadge: {
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
  },
  intermediateBadge: {
    backgroundColor: 'rgba(243, 156, 18, 0.15)',
  },
  advancedBadge: {
    backgroundColor: 'rgba(231, 76, 60, 0.15)',
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
});
