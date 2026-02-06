import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { usePathname, router, useFocusEffect } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Animated, Dimensions, PanResponder, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Target, Wind, Sparkles, Calendar, Shield, Lock, Trophy, BookOpen, Leaf, ChevronRight } from 'lucide-react-native';
import { Image } from 'expo-image';

import { theme } from '@/constants/theme';
import { GradientBackground } from '@/components/GradientBackground';
import { LOCKED_ORB_VIDEO, getUnlockedRewards } from '@/constants/rewards';
import { BREATHING_TECHNIQUES } from '@/constants/breathing';


import { useGoalStore } from '@/hooks/use-goal-store';
import { useAuth } from '@/hooks/use-auth-store';
import { useFirstTimeSetup } from '@/hooks/use-first-time-setup';

import { useSubscriptionStatus } from '@/hooks/use-subscription-status';



import { useChallengeStore } from '@/hooks/use-challenge-store';
import { useProgress } from '@/hooks/use-progress';
import { useRewardUnlock } from '@/hooks/use-reward-unlock';
import SubscriptionOfferModal from '@/src/components/SubscriptionOfferModal';


export default function TodayScreen() {
  const store = useGoalStore();
  const { user } = useAuth();
  const { profile: setupProfile } = useFirstTimeSetup();

  const challengeStore = useChallengeStore();
  const progress = useProgress();
  const { shouldShowOffer, checking: subscriptionChecking, isPremium } = useSubscriptionStatus();
  const { markOfferSeen } = useRewardUnlock();

  useEffect(() => {
    if (isPremium && !subscriptionChecking) {
      markOfferSeen();
    }
  }, [isPremium, subscriptionChecking, markOfferSeen]);
  const [refreshing, setRefreshing] = useState(false);
  const [, setCurrentQuoteIndex] = useState(() => 
    Math.floor(Math.random() * getQuotes().length)
  );
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const buttonOpacity = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const buttonTranslateY = useRef(new Animated.Value(0)).current;
  const [activeRewardIndex, setActiveRewardIndex] = useState(0);
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  
  const activeIndexRef = useRef(activeRewardIndex);
  
  const videoRefs = useRef<{ [key: string]: Video | null }>({});
  const [isScreenFocused, setIsScreenFocused] = useState(true);

  const rewards = useMemo(() => {
    const streak = progress?.currentStreak ?? 0;
    const tasks = progress?.totalCompletedTasks ?? 0;
    const focusMin = progress?.focusTimeMinutes ?? 0;
    return getUnlockedRewards(streak, tasks, focusMin);
  }, [progress?.currentStreak, progress?.totalCompletedTasks, progress?.focusTimeMinutes]);


  
  const rewardsCount = rewards.length;
  
  const orbAnimations = useRef(
    Array.from({ length: rewards.length }, (_, i) => ({
      translateX: new Animated.Value(i === 0 ? 0 : SCREEN_WIDTH * 0.45),
      scale: new Animated.Value(i === 0 ? 1 : 0.5),
      opacity: new Animated.Value(i === 0 ? 1 : (i === 1 ? 0.25 : 0)),
    }))
  ).current;
  
  useEffect(() => {
    activeIndexRef.current = activeRewardIndex;
    
    rewards.forEach((_, index) => {
      const isActive = activeRewardIndex === index;
      const isNext = activeRewardIndex + 1 === index;
      const isPrev = activeRewardIndex - 1 === index;
      
      let targetTranslateX = 0;
      let targetScale = 0;
      let targetOpacity = 0;
      
      if (isActive) {
        targetTranslateX = 0;
        targetScale = 1;
        targetOpacity = 1;
      } else if (isPrev) {
        targetTranslateX = -SCREEN_WIDTH * 0.45;
        targetScale = 0.5;
        targetOpacity = 0.25;
      } else if (isNext) {
        targetTranslateX = SCREEN_WIDTH * 0.45;
        targetScale = 0.5;
        targetOpacity = 0.25;
      }
      
      Animated.parallel([
        Animated.spring(orbAnimations[index].translateX, {
          toValue: targetTranslateX,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.spring(orbAnimations[index].scale, {
          toValue: targetScale,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.timing(orbAnimations[index].opacity, {
          toValue: targetOpacity,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [activeRewardIndex, orbAnimations, rewards]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState;
        return Math.abs(dx) > 3 || (Math.abs(dx) > Math.abs(dy) * 0.5 && Math.abs(dx) > 2);
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderMove: () => {},
      onPanResponderRelease: (_, gestureState) => {
        const currentIdx = activeIndexRef.current;
        const { dx, vx } = gestureState;
        
        const isSwipeRight = dx > 10 || (dx > 5 && vx > 0.1);
        const isSwipeLeft = dx < -10 || (dx < -5 && vx < -0.1);
        
        if (isSwipeLeft && currentIdx < rewardsCount - 1) {
          setActiveRewardIndex(currentIdx + 1);
        } else if (isSwipeRight && currentIdx > 0) {
          setActiveRewardIndex(currentIdx - 1);
        }
      },
    })
  ).current;



  const isHomeActive = pathname === '/' || pathname === '/home';

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => {
        setIsScreenFocused(false);
      };
    }, [])
  );

  const setVideoRef = useCallback((id: string) => (ref: Video | null) => {
    videoRefs.current[id] = ref;
  }, []);

  useEffect(() => {
    if (isHomeActive) {
      Animated.parallel([
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(buttonScale, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.spring(buttonTranslateY, {
          toValue: 0,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(buttonOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 0.85,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(buttonTranslateY, {
          toValue: 20,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isHomeActive, buttonOpacity, buttonScale, buttonTranslateY]);

  useEffect(() => {
    const shimmerLoop = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    shimmerLoop.start();
    return () => shimmerLoop.stop();
  }, [shimmerAnim]);

  // Use real data from store and unified progress
  const profile = store?.profile || { name: 'User', currentStreak: 0 };
  const currentStreak = progress?.currentStreak ?? profile?.currentStreak ?? 0;
  const displayName = setupProfile?.nickname || user?.name || profile?.name || 'User';
  const currentGoal = store?.currentGoal;
  
  // Get active challenge tasks for today
  const activeChallenge = challengeStore?.getActiveChallenge?.();

  

  const challengeTodayTasks = React.useMemo(() => {
    if (!activeChallenge || !challengeStore) return [];
    const tasks = challengeStore.getTodayTasks(activeChallenge.id);
    return tasks.map(t => ({
      id: t.id,
      title: t.title,
      completed: t.completed,
      isChallenge: true,
    }));
  }, [activeChallenge, challengeStore]);
  
  // Combine goal tasks and challenge tasks
  const todayTasks = React.useMemo(() => {
    const goalTodayTasks = store?.getTodayTasks() || [];
    const combined = [
      ...goalTodayTasks.map(t => ({ id: t.id, title: t.title, completed: t.completed, isChallenge: false })),
      ...challengeTodayTasks,
    ];
    return combined;
  }, [store, challengeTodayTasks]);
  


  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Change quote on refresh
    setCurrentQuoteIndex(Math.floor(Math.random() * getQuotes().length));
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  // Calculate values that are used in multiple places
  const completedToday = todayTasks.filter(t => t.completed).length;
  const greeting = getGreeting();

  const focusTimeDisplay = progress?.focusTimeDisplay ?? '0m';

  const activeOrbColor = useMemo(() => {
    return rewards[activeRewardIndex]?.color || theme.colors.primary;
  }, [activeRewardIndex, rewards]);

  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 400],
  });

  const completedTasksCount = progress?.totalCompletedTasks ?? (store?.dailyTasks?.filter(t => t.completed).length || 0);

  // Show loading state only if store is not available at all
  if (!store) {
    return (
      <GradientBackground>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </View>
      </GradientBackground>
    );
  }

  if (!currentGoal) {
    return (
      <GradientBackground>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.emptyContainer}>
            <Target size={64} color={theme.colors.textLight} />
            <Text style={styles.emptyTitle}>No Active Goal</Text>
            <Text style={styles.emptyDescription}>
              Start your journey by setting a goal and let AI create a personalized plan
            </Text>
            <TouchableOpacity
              style={styles.createGoalButton}
              onPress={() => router.push('/goal-creation')}
              activeOpacity={0.9}
            >
              <View style={styles.createGoalButtonInner}>
                <Sparkles size={24} color="#000" style={{ marginRight: 8 }} />
                <Text style={styles.createGoalButtonText}>Create First Goal</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SubscriptionOfferModal
        visible={shouldShowOffer}
        loading={subscriptionChecking}
        onPrimary={() => {
          markOfferSeen();
          router.push('/subscription');
        }}
        onSkip={() => {
          markOfferSeen();
          router.push('/subscription');
        }}
        testID="subscription-offer"
      />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.headerWrapper}>
            <View style={styles.stickyHeader}>
              <View style={styles.headerText}>
                <Text style={styles.greeting}>{greeting},</Text>
                <Text style={styles.name}>{displayName}!</Text>
              </View>
            </View>
          </View>

          

          <View style={styles.orbContainer}>
            <View style={styles.orbTouchable} {...panResponder.panHandlers}>
              {rewards.map((item, index) => {
                const isActive = activeRewardIndex === index;
                const isNext = activeRewardIndex + 1 === index;
                const isPrev = activeRewardIndex - 1 === index;
                
                if (!isActive && !isNext && !isPrev) return null;
                
                return (
                  <Animated.View 
                    key={item.id} 
                    style={[
                      styles.orbWrapper,
                      {
                        transform: [
                          { translateX: orbAnimations[index].translateX },
                          { scale: orbAnimations[index].scale },
                        ],
                        opacity: orbAnimations[index].opacity,
                        zIndex: isActive ? 10 : 5,
                      },
                    ]}
                  >
                    <View style={styles.orbVideoWrapper}>
                      <Video
                        ref={setVideoRef(item.id)}
                        source={{ uri: item.unlocked ? item.video : LOCKED_ORB_VIDEO }}
                        style={styles.orbVideo}
                        resizeMode={ResizeMode.COVER}
                        shouldPlay={isScreenFocused}
                        isLooping
                        isMuted
                        onPlaybackStatusUpdate={undefined}
                      />
                    </View>
                    {!item.unlocked && (
                      <View style={styles.lockedOverlay}>
                        <Lock size={36} color="rgba(255,255,255,0.7)" />
                      </View>
                    )}
                  </Animated.View>
                );
              })}
            </View>
            {rewards[activeRewardIndex]?.unlocked && (
              <View style={styles.rarityBadge}>
                <Text style={styles.rarityText}>{rewards[activeRewardIndex]?.rarity}</Text>
                <Text style={styles.ownedByText}>Owned by {rewards[activeRewardIndex]?.ownedBy}</Text>
              </View>
            )}
            <Text style={styles.firstStepText}>{rewards[activeRewardIndex]?.label}</Text>
            <View style={styles.rewardDots}>
              {rewards.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.rewardDot,
                    activeRewardIndex === index && styles.rewardDotActive,
                  ]}
                />
              ))}
            </View>
            
            <View style={styles.orbStatsContainer}>
              <View style={styles.orbStatItem}>
                <Text style={styles.orbStatLabel}>COMPLETED</Text>
                <Text style={styles.orbStatValue}>{completedTasksCount}</Text>
              </View>
              <View style={styles.orbStatDivider} />
              <View style={styles.orbStatItem}>
                <Text style={styles.orbStatLabel}>FOCUS TIME</Text>
                <Text style={styles.orbStatValue}>{focusTimeDisplay}</Text>
              </View>
              <View style={styles.orbStatDivider} />
              <View style={styles.orbStatItem}>
                <Text style={styles.orbStatLabel}>DAYS STREAK</Text>
                <Text style={styles.orbStatValue}>{currentStreak}</Text>
              </View>
            </View>
            
            {rewards[activeRewardIndex]?.unlocked && (
              <View style={styles.achievementBadge}>
                <Trophy size={14} color={theme.colors.primary} />
                <Text style={styles.achievementText}>{rewards[activeRewardIndex]?.achievement}</Text>
              </View>
            )}
          </View>



          





          <TouchableOpacity 
            style={styles.coachCard}
            onPress={() => router.push('/chat')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['rgba(255, 215, 0, 0.08)', 'rgba(255, 215, 0, 0.02)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.coachGradient}
            />
            <View style={styles.coachContent}>
              <View style={styles.coachLeft}>
                <View style={styles.coachIconOuter}>
                  <View style={styles.coachIconInner}>
                    <Sparkles size={20} color={theme.colors.primary} />
                  </View>
                  <View style={styles.coachLiveIndicator} />
                </View>
                <View style={styles.coachTextContainer}>
                  <Text style={styles.coachTitle}>Personal Coach</Text>
                  <Text style={styles.coachSubtitle}>AI-powered guidance</Text>
                </View>
              </View>
              <View style={styles.coachArrowContainer}>
                <View style={styles.coachArrow} />
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.quickActionsSection}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={styles.quickActionItem}
                onPress={() => router.push('/breathing')}
                testID="quick-action-breathing"
                activeOpacity={0.8}
              >
                <View style={styles.quickActionIconWrap}>
                  <Wind size={22} color={theme.colors.primary} strokeWidth={1.5} />
                </View>
                <Text style={styles.quickActionText}>Breathe</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionItem}
                onPress={() => router.push('/manifestation')}
                testID="quick-action-manifestation"
                activeOpacity={0.8}
              >
                <View style={styles.quickActionIconWrap}>
                  <Sparkles size={22} color={theme.colors.primary} strokeWidth={1.5} />
                </View>
                <Text style={styles.quickActionText}>Manifest</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionItem}
                onPress={() => router.push('/timer')}
                testID="quick-action-focus"
                activeOpacity={0.8}
              >
                <View style={styles.quickActionIconWrap}>
                  <Shield size={22} color={theme.colors.primary} strokeWidth={1.5} />
                </View>
                <Text style={styles.quickActionText}>Focus</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionItem}
                onPress={() => router.push('/reflection')}
                testID="quick-action-journal"
                activeOpacity={0.8}
              >
                <View style={styles.quickActionIconWrap}>
                  <BookOpen size={22} color={theme.colors.primary} strokeWidth={1.5} />
                </View>
                <Text style={styles.quickActionText}>Reflect</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.meditationFeedCard}
            onPress={() => router.push('/meditation-feed')}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80' }}
              style={styles.meditationFeedImage}
              contentFit="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.meditationFeedGradient}
            />
            <View style={styles.meditationFeedContent}>
              <View style={styles.meditationFeedBadge}>
                <Leaf size={14} color="#4ADE80" />
                <Text style={styles.meditationFeedBadgeText}>Pre-Focus</Text>
              </View>
              <Text style={styles.meditationFeedTitle}>Mindful Moments</Text>
              <Text style={styles.meditationFeedSubtitle}>Calm your mind before deep work</Text>
              <View style={styles.meditationFeedButton}>
                <Text style={styles.meditationFeedButtonText}>Start</Text>
                <ChevronRight size={16} color="#000" />
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.forYouSection}>
            <Text style={styles.sectionTitle}>For You</Text>
            <Text style={styles.forYouSubtitle}>Breathing techniques to calm your mind</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.forYouScrollContent}
              style={styles.forYouScroll}
            >
              {BREATHING_TECHNIQUES.slice(0, 4).map((technique, index) => (
                  <TouchableOpacity
                    key={technique.id}
                    style={styles.forYouCard}
                    onPress={() => router.push({ pathname: '/breathing/[id]', params: { id: technique.id } })}
                    activeOpacity={0.85}
                  >
                    <View style={styles.forYouCardBorder}>
                      <Image
                        source={{ uri: technique.image }}
                        style={styles.forYouCardImage}
                        contentFit="cover"
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)']}
                        locations={[0, 0.4, 1]}
                        style={styles.forYouCardGradient}
                      />
                      <View style={styles.forYouCardTopBadge}>
                        <Text style={styles.forYouCardIcon}>{technique.icon}</Text>
                      </View>
                      <View style={styles.forYouCardContent}>
                        <Text style={styles.forYouCardTitle}>{technique.name}</Text>
                        <Text style={styles.forYouCardDescription} numberOfLines={2}>
                          {technique.benefits}
                        </Text>
                        <View style={styles.forYouCardFooter}>
                          <View style={styles.forYouCardDuration}>
                            <Wind size={10} color="rgba(255,215,0,0.8)" />
                            <Text style={styles.forYouCardDurationText}>
                              {technique.phases.reduce((acc, p) => acc + p.duration, 0) * technique.totalCycles}s
                            </Text>
                          </View>
                          <View style={styles.forYouCardButton}>
                            <Text style={styles.forYouCardButtonText}>Begin</Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.forYouCardGlow} />
                    </View>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>



          {completedToday === todayTasks.length && todayTasks.length > 0 && (
            <View style={styles.completionCard}>
              <Text style={styles.completionEmoji}>🎉</Text>
              <Text style={styles.completionTitle}>Day Completed!</Text>
              <Text style={styles.completionText}>
                Great work! You have completed all tasks for today.
              </Text>
            </View>
          )}
        </ScrollView>

        <Animated.View 
          style={[
            styles.floatingButtonContainer, 
            { bottom: insets.bottom + 90 },
            {
              opacity: buttonOpacity,
              transform: [
                { scale: buttonScale },
                { translateY: buttonTranslateY },
              ],
            },
          ]}
          pointerEvents={isHomeActive ? 'auto' : 'none'}
        >
          <TouchableOpacity 
            style={[
              styles.floatingPlanButton,
              { 
                shadowColor: activeOrbColor,
                borderColor: `${activeOrbColor}50`,
              }
            ]}
            onPress={() => router.push('/plan')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[`${activeOrbColor}35`, `${activeOrbColor}10`, `${activeOrbColor}05`, `${activeOrbColor}25`]}
              locations={[0, 0.3, 0.7, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.floatingButtonGradient}
            />
            <View style={[styles.floatingButtonBorder, { borderColor: `${activeOrbColor}30` }]} />
            <View style={styles.floatingButtonInner}>
              <Calendar size={20} color={activeOrbColor} style={styles.planButtonIcon} />
              <Text style={[styles.floatingPlanButtonText, { color: activeOrbColor }]}>Go to Plan</Text>
            </View>
            <Animated.View 
              style={[
                styles.shimmerOverlay,
                {
                  transform: [{ translateX: shimmerTranslateX }],
                  backgroundColor: activeOrbColor,
                }
              ]} 
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </GradientBackground>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function getQuotes() {
  return [
    'Today you are closer to your dream than yesterday',
    'Every step brings you closer to your goal',
    'Great things start with small steps',
    'Your dream is worth every effort',
    'Progress is more important than perfection',
    'Today is the perfect day to begin',
    'Your persistence is the key to success',
    'Dreams come true for those who take action',
    'Success is the sum of small efforts',
    'Believe in yourself and everything will work out',
    'Start with what is necessary, then do what is possible',
    'Your future is created by what you do today',
    'Do not wait for the perfect moment — create it',
    'Strength lies in consistency',
    'Every day is a new opportunity to become better',
    'Action is the fundamental key to success',
    'Dream, plan, act, achieve',
    'You are stronger than you think',
    'Focus on the process, not the result',
    'Small steps lead to big changes',
    'Your only limit is you',
    'Discipline is the bridge between goals and achievements',
    'Every effort brings you closer to your dream',
    'Be patient — everything comes at the right time',
    'Your energy flows where your attention goes'
  ];
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ORB_SIZE = SCREEN_WIDTH * 0.56;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 0,
    marginTop: 16,
    height: ORB_SIZE + 240,
    backgroundColor: 'transparent',
    marginHorizontal: -20,
    paddingVertical: 16,
    paddingBottom: 32,
    position: 'relative',
  },
  orbTouchable: {
    width: SCREEN_WIDTH,
    height: ORB_SIZE + 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  orbWrapper: {
    position: 'absolute',
    width: ORB_SIZE,
    height: ORB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbVideoWrapper: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    overflow: 'hidden',
  },
  orbVideo: {
    width: ORB_SIZE,
    height: ORB_SIZE,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: ORB_SIZE / 2,
  },
  rewardDots: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  rewardDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  rewardDotActive: {
    backgroundColor: '#fff',
    width: 18,
  },
  rarityBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
    alignItems: 'center',
  },
  rarityText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  ownedByText: {
    fontSize: 12,
    color: theme.colors.primary,
    marginTop: 2,
  },
  orbStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    gap: 0,
  },
  orbStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  orbStatLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  orbStatValue: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
  },
  orbStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  achievementText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: theme.colors.primary,
  },

  firstStepText: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.text,
    letterSpacing: 0.5,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 180,
  },
  headerWrapper: {
    position: 'relative',
    backgroundColor: 'transparent',
  },
  stickyHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.regular,
    letterSpacing: 0,
  },
  name: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.regular,
    color: theme.colors.text,
    letterSpacing: 0,
  },

  journalSection: {
    marginTop: 20,
    marginBottom: 20,
  },


  meditationFeedCard: {
    height: 180,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    position: 'relative',
  },
  meditationFeedImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  meditationFeedGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  meditationFeedContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  meditationFeedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 10,
    gap: 5,
  },
  meditationFeedBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#4ADE80',
  },
  meditationFeedTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 4,
  },
  meditationFeedSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 12,
  },
  meditationFeedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 4,
  },
  meditationFeedButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#000',
  },
  forYouSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  forYouSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 16,
    marginTop: -8,
  },
  forYouScroll: {
    marginHorizontal: -20,
  },
  forYouScrollContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  forYouCard: {
    width: 140,
    height: 195,
    borderRadius: 20,
    overflow: 'hidden',
  },
  forYouCardBorder: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    overflow: 'hidden',
    backgroundColor: '#0a0a0a',
    position: 'relative',
  },
  forYouCardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  forYouCardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  forYouCardTopBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  forYouCardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  forYouCardIcon: {
    fontSize: 14,
  },
  forYouCardTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  forYouCardDescription: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.65)',
    lineHeight: 14,
    marginBottom: 10,
    fontWeight: '400' as const,
  },
  forYouCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  forYouCardDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  forYouCardDurationText: {
    fontSize: 10,
    color: 'rgba(255, 215, 0, 0.8)',
    fontWeight: '500' as const,
  },
  forYouCardButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 12,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  forYouCardButtonText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#000',
    letterSpacing: 0.3,
  },
  forYouCardGlow: {
    position: 'absolute',
    bottom: -20,
    left: '50%',
    marginLeft: -40,
    width: 80,
    height: 40,
    backgroundColor: theme.colors.primary,
    opacity: 0.08,
    borderRadius: 40,
    transform: [{ scaleX: 2 }],
  },
  quickActionsSection: {
    marginTop: 0,
    marginBottom: 24,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  quickActionIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.2,
  },
  quickActionHint: {
    marginTop: 4,
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  addGoalIconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addGoalPlusBadge: {
    position: 'absolute',
    right: -6,
    top: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.regular,
    color: theme.colors.text,
    marginBottom: 14,
    letterSpacing: 0,
  },
  noTasksContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xxxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.medium,
  },
  noTasksText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  noTasksSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    opacity: 0.7,
  },
  completionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xxxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    ...theme.shadows.gold,
  },
  completionEmoji: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  completionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.regular,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    letterSpacing: 0,
  },
  completionText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    letterSpacing: 0,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xxxl,
    lineHeight: 26,
    fontWeight: theme.fontWeight.regular,
    letterSpacing: 0,
    paddingHorizontal: theme.spacing.lg,
  },
  createGoalButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 999,
    paddingHorizontal: theme.spacing.xxxl,
    paddingVertical: theme.spacing.xl,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  createGoalButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createGoalButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
  },

  floatingButtonContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 100,
  },
  floatingPlanButton: {
    borderRadius: 999,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
    backgroundColor: 'rgba(18, 18, 18, 0.95)',
    borderWidth: 1.5,
  },
  floatingButtonGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
  floatingButtonBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 1,
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 100,
    opacity: 0.15,
    transform: [{ skewX: '-20deg' }],
  },
  floatingButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    paddingHorizontal: 28,
  },
  planButtonIcon: {
    marginRight: theme.spacing.sm,
  },
  floatingPlanButtonText: {
    fontSize: 16,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
  },
  coachCard: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  coachGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  coachContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  coachLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  coachIconOuter: {
    position: 'relative',
    marginRight: 14,
  },
  coachIconInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.15)',
  },
  coachLiveIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4ADE80',
    borderWidth: 2,
    borderColor: 'rgba(18, 18, 18, 1)',
  },
  coachTextContainer: {
    flex: 1,
  },
  coachTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  coachSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '400' as const,
  },
  coachArrowContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachArrow: {
    width: 7,
    height: 7,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    transform: [{ rotate: '45deg' }],
    marginLeft: -2,
  },
});