import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal, Dimensions, LayoutAnimation } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Settings, Bell, ChevronRight, Info, LogOut, MessageCircle, RotateCcw, Edit3, X, Wrench, Lock, Crown, Target, Clock, Flame, Trophy, Zap } from 'lucide-react-native';

import Constants from 'expo-constants';
import { theme } from '@/constants/theme';
import { GradientBackground } from '@/components/GradientBackground';

import { useGoalStore } from '@/hooks/use-goal-store';
import { useAuth } from '@/hooks/use-auth-store';
import { useFirstTimeSetup } from '@/hooks/use-first-time-setup';
import { useSubscription } from '@/hooks/use-subscription-store';
import { useProgress } from '@/hooks/use-progress';
import { LOCKED_ORB_VIDEO, getUnlockedRewards, getRewardsByCategory } from '@/constants/rewards';
import type { RewardCategory } from '@/constants/rewards';

export default function ProfileScreen() {
  const store = useGoalStore();
  const { user, logout, deleteAccount } = useAuth();
  const { profile: setupProfile, updateProfile: updateSetupProfile } = useFirstTimeSetup();
  const { isPremium } = useSubscription();
  const progress = useProgress();
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const insets = useSafeAreaInsets();

  const AVATAR_VIDEO = 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769956429/0126_6_eud89t.mp4';
  const [activeCategory, setActiveCategory] = useState<RewardCategory>('streak');
  const [milestonesExpanded, setMilestonesExpanded] = useState(false);

  const streakVal = progress?.currentStreak ?? store?.profile?.currentStreak ?? 0;
  const tasksVal = progress?.totalCompletedTasks ?? (store?.dailyTasks?.filter(t => t.completed).length || 0);
  const focusVal = progress?.focusTimeMinutes ?? 0;

  const allRewards = useMemo(() => {
    return getUnlockedRewards(streakVal, tasksVal, focusVal);
  }, [streakVal, tasksVal, focusVal]);

  const unlockedCount = allRewards.filter(r => r.unlocked).length;
  const totalCount = allRewards.length;

  const categoryRewards = useMemo(() => ({
    streak: getRewardsByCategory(allRewards, 'streak'),
    tasks: getRewardsByCategory(allRewards, 'tasks'),
    focus: getRewardsByCategory(allRewards, 'focus'),
  }), [allRewards]);

  const currentCategoryRewards = categoryRewards[activeCategory];

  
  if (!store || !store.isReady) {
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
  
  const { profile, currentGoal, resetGoal } = store;

  const focusTimeDisplay = progress?.focusTimeDisplay ?? '0m';
  const completedTasksCount = progress?.totalCompletedTasks ?? (store?.dailyTasks?.filter(t => t.completed).length || 0);
  const currentStreak = progress?.currentStreak ?? profile.currentStreak;

  const handleResetGoal = () => {
    Alert.alert(
      'Reset Goal',
      'Are you sure you want to reset your current goal? All progress and tasks will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: async () => {
            try {
              await resetGoal();
              Alert.alert('Done', 'Goal successfully reset');
            } catch {
              Alert.alert('Error', 'Failed to reset goal');
            }
          }
        },
      ]
    );
  };

  const menuItems = [
    ...(isPremium ? [{
      icon: Crown,
      title: 'Premium Active',
      subtitle: 'Thank you for your support!',
      onPress: () => router.push('/subscription'),
      iconColor: theme.colors.primary,
    }] : [{
      icon: Crown,
      title: 'Get Premium',
      subtitle: 'Unlock all features',
      onPress: () => router.push('/subscription'),
      iconColor: theme.colors.primary,
    }]),
    {
      icon: MessageCircle,
      title: 'AI Coach',
      subtitle: 'Chat with your personal assistant',
      onPress: () => router.push('/chat'),
      iconColor: '#8B5CF6',
    },
    ...(currentGoal ? [{
      icon: RotateCcw,
      title: 'Reset Goal',
      subtitle: 'Start fresh with a new goal',
      onPress: handleResetGoal,
      iconColor: '#F97316',
    }] : []),
    {
      icon: Bell,
      title: 'Notifications',
      subtitle: 'Manage your reminders',
      onPress: () => router.push('/notifications'),
      iconColor: '#22C55E',
    },
    {
      icon: Settings,
      title: 'Settings',
      subtitle: 'App preferences & options',
      onPress: () => router.push('/settings'),
      iconColor: '#6366F1',
    },
    {
      icon: Info,
      title: 'About',
      subtitle: 'Version 1.0',
      onPress: () => Alert.alert('GoalCoach AI', 'Your personal AI coach for achieving goals\n\nVersion 1.0'),
      iconColor: '#9CA3AF',
    },
  ];

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure? This action is irreversible. All your data, including subscription and progress, will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              console.log('[Profile] Starting account deletion...');
              
              if (resetGoal) {
                try {
                  await resetGoal();
                  console.log('[Profile] Goal data reset');
                } catch (e) {
                  console.log('[Profile] No goal to reset or error:', e);
                }
              }
              
              const deleted = await deleteAccount();
              console.log('[Profile] Account deletion result:', deleted);
              
              if (!deleted) {
                await logout();
              }
              
              setTimeout(() => {
                router.replace('/auth');
              }, 100);
              
              Alert.alert('Success', 'Account deleted. Please sign in again.');
            } catch (error) {
              console.error('[Profile] Delete account error:', error);
              const errorMessage = error instanceof Error ? error.message : 'Failed to delete account';
              Alert.alert('Error', errorMessage);
            }
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/auth');
            } catch {
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        },
      ]
    );
  };

  const handleEditNickname = () => {
    setNewNickname(setupProfile?.nickname || user?.name || '');
    setIsEditingNickname(true);
  };

  const handleSaveNickname = async () => {
    if (!newNickname.trim()) {
      Alert.alert('Error', 'Nickname cannot be empty');
      return;
    }

    try {
      await updateSetupProfile({ nickname: newNickname.trim() });
      setIsEditingNickname(false);
      Alert.alert('Success', 'Nickname updated');
    } catch {
      Alert.alert('Error', 'Failed to update nickname');
    }
  };

  return (
    <GradientBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Your</Text>
          <Text style={styles.title}>Profile</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Video
                source={{ uri: AVATAR_VIDEO }}
                style={styles.avatarVideo}
                resizeMode={ResizeMode.COVER}
                shouldPlay
                isLooping
                isMuted
              />
              {isPremium && (
                <View style={styles.premiumBadge}>
                  <Crown size={10} color="#000" />
                </View>
              )}
            </View>
            
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{setupProfile?.nickname || user?.name || user?.email || profile.name}</Text>
                <TouchableOpacity 
                  style={styles.editNameButton}
                  onPress={handleEditNickname}
                  activeOpacity={0.7}
                >
                  <Edit3 size={14} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              </View>
              <Text style={styles.memberSince}>
                Member since {new Date(profile.joinedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </Text>
              {!isPremium && (
                <TouchableOpacity
                  style={styles.upgradeButton}
                  onPress={() => router.push('/subscription')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
                  <ChevronRight size={14} color={theme.colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.statsSection}>
            <View style={styles.statCard}>
              <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(255, 215, 0, 0.1)' }]}>
                <Target size={16} color={theme.colors.primary} />
              </View>
              <Text style={styles.statValue}>{completedTasksCount}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                <Clock size={16} color="#8B5CF6" />
              </View>
              <Text style={styles.statValue}>{focusTimeDisplay}</Text>
              <Text style={styles.statLabel}>Focus Time</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(249, 115, 22, 0.1)' }]}>
                <Flame size={16} color="#F97316" />
              </View>
              <Text style={styles.statValue}>{currentStreak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.milestonesSection}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setMilestonesExpanded(!milestonesExpanded);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.milestonesHeader}>
              <View style={styles.milestonesHeaderLeft}>
                <Trophy size={16} color={theme.colors.primary} />
                <Text style={styles.milestonesTitle}>Milestones</Text>
              </View>
              <View style={styles.milestonesHeaderRight}>
                <Text style={styles.milestonesCount}>{unlockedCount}/{totalCount}</Text>
                <View style={[styles.expandArrow, milestonesExpanded && styles.expandArrowUp]}>
                  <Text style={styles.expandArrowText}>›</Text>
                </View>
              </View>
            </View>

            <View style={styles.milestoneProgressBar}>
              <View style={[styles.milestoneProgressFill, { width: `${(unlockedCount / totalCount) * 100}%` }]} />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.compactOrbsScroll} contentContainerStyle={styles.compactOrbsRow}>
              {allRewards.filter(r => r.unlocked).map((reward) => (
                <View key={reward.id} style={[styles.compactOrbWrap, { borderColor: `${reward.color}60`, shadowColor: reward.color }]}>
                  <Video
                    source={{ uri: reward.video }}
                    style={styles.compactOrbVideo}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay
                    isLooping
                    isMuted
                  />
                </View>
              ))}
              {allRewards.filter(r => !r.unlocked).slice(0, 3).map((reward) => (
                <View key={reward.id} style={styles.compactOrbWrap}>
                  <Video
                    source={{ uri: LOCKED_ORB_VIDEO }}
                    style={styles.compactOrbVideo}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay
                    isLooping
                    isMuted
                  />
                  <View style={styles.compactLockedOverlay}>
                    <Lock size={10} color="rgba(255,255,255,0.5)" />
                  </View>
                </View>
              ))}
              {allRewards.filter(r => r.unlocked).length === 0 && allRewards.filter(r => !r.unlocked).length === 0 && (
                <View style={styles.compactOrbWrap}>
                  <Video
                    source={{ uri: LOCKED_ORB_VIDEO }}
                    style={styles.compactOrbVideo}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay
                    isLooping
                    isMuted
                  />
                  <View style={styles.compactLockedOverlay}>
                    <Lock size={10} color="rgba(255,255,255,0.5)" />
                  </View>
                </View>
              )}
            </ScrollView>
          </TouchableOpacity>

          {milestonesExpanded && (
            <View style={styles.milestonesExpandedSection}>
              <View style={styles.categoryTabs}>
                {([['streak', Flame, 'Streak'], ['tasks', Target, 'Tasks'], ['focus', Zap, 'Focus']] as const).map(([cat, Icon, label]) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryTab, activeCategory === cat && styles.categoryTabActive]}
                    onPress={() => setActiveCategory(cat)}
                    activeOpacity={0.7}
                  >
                    <Icon size={14} color={activeCategory === cat ? theme.colors.primary : 'rgba(255,255,255,0.4)'} />
                    <Text style={[styles.categoryTabText, activeCategory === cat && styles.categoryTabTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.orbsGrid}>
                {currentCategoryRewards.map((reward) => (
                  <View key={reward.id} style={styles.orbGridItem}>
                    <View style={[styles.orbGridWrapper, reward.unlocked && { borderColor: `${reward.color}50`, shadowColor: reward.color, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }]}>
                      <Video
                        source={{ uri: reward.unlocked ? reward.video : LOCKED_ORB_VIDEO }}
                        style={styles.orbGridVideo}
                        resizeMode={ResizeMode.COVER}
                        shouldPlay
                        isLooping
                        isMuted
                      />
                      {!reward.unlocked && (
                        <View style={styles.orbGridLockedOverlay}>
                          <Lock size={14} color="rgba(255,255,255,0.5)" />
                        </View>
                      )}
                      {reward.unlocked && (
                        <View style={[styles.orbGridCheckmark, { backgroundColor: reward.color }]}>
                          <Text style={styles.orbGridCheckText}>✓</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.orbGridLabel, reward.unlocked && { color: '#fff' }]} numberOfLines={1}>
                      {reward.label}
                    </Text>
                    <Text style={[styles.orbGridReq, reward.unlocked && { color: reward.color }]}>
                      {reward.unlocked ? reward.achievement : reward.unlockHint}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.menuSection}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIcon, { backgroundColor: `${item.iconColor}15` }]}>
                  <item.icon size={18} color={item.iconColor} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <ChevronRight size={16} color="rgba(255,255,255,0.2)" />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.dangerZone}>
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <LogOut size={16} color="#EF4444" />
              <Text style={styles.dangerButtonText}>Sign Out</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.dangerButton, styles.deleteButton]}
              onPress={handleDeleteAccount}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteButtonText}>Delete Account</Text>
            </TouchableOpacity>
          </View>

          {(__DEV__ || Constants?.appOwnership === 'expo' || Constants?.executionEnvironment === 'storeClient') && (
            <TouchableOpacity
              style={styles.devEntry}
              onPress={() => router.push('/dev-subscription-tools')}
              activeOpacity={0.7}
              testID="dev-subscription-entry"
            >
              <Wrench size={14} color="rgba(255,255,255,0.4)" />
              <Text style={styles.devEntryText}>Developer Tools</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <Modal
          visible={isEditingNickname}
          transparent
          animationType="fade"
          onRequestClose={() => setIsEditingNickname(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Change Nickname</Text>
                <TouchableOpacity onPress={() => setIsEditingNickname(false)}>
                  <X size={22} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              </View>
              
              <TextInput
                style={styles.nicknameInput}
                value={newNickname}
                onChangeText={setNewNickname}
                placeholder="Enter nickname"
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoFocus
                maxLength={30}
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setIsEditingNickname(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSaveNickname}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </GradientBackground>
  );
}

const AVATAR_SIZE = 72;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '400' as const,
  },
  title: {
    fontSize: 32,
    fontWeight: '400' as const,
    color: '#fff',
    letterSpacing: 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  avatarVideo: {
    width: AVATAR_SIZE - 4,
    height: AVATAR_SIZE - 4,
  },
  premiumBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#fff',
  },
  editNameButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberSince: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 4,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 4,
  },
  upgradeButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: theme.colors.primary,
  },
  statsSection: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  statIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  milestonesSection: {
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.08)',
  },
  milestonesExpandedSection: {
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  milestonesHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expandArrow: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '90deg' }],
  },
  expandArrowUp: {
    transform: [{ rotate: '-90deg' }],
  },
  expandArrowText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.4)',
    marginTop: -2,
  },
  compactOrbsScroll: {
    marginTop: 8,
    marginHorizontal: -4,
  },
  compactOrbsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 4,
  },
  compactOrbWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  compactOrbVideo: {
    width: 33,
    height: 33,
  },
  compactLockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestonesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  milestonesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  milestonesTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
  },
  milestonesCount: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '500' as const,
  },
  milestoneProgressBar: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  milestoneProgressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  categoryTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  categoryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  categoryTabActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  categoryTabTextActive: {
    color: theme.colors.primary,
  },
  orbsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'flex-start',
  },
  orbGridItem: {
    width: (Dimensions.get('window').width - 40 - 32 - 24) / 3,
    alignItems: 'center',
  },
  orbGridWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 6,
  },
  orbGridVideo: {
    width: 69,
    height: 69,
  },
  orbGridLockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbGridCheckmark: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#121212',
  },
  orbGridCheckText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#000',
  },
  orbGridLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
  },
  orbGridReq: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.25)',
    marginTop: 2,
    textAlign: 'center',
  },
  menuSection: {
    gap: 8,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#fff',
  },
  menuSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  dangerZone: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  dangerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  dangerButtonText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#EF4444',
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  devEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  devEntryText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
  },
  nicknameInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#000',
  },
});
