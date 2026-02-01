import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal, Animated, Dimensions } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Settings, Bell, ChevronRight, Info, LogOut, MessageCircle, RotateCcw, Sparkles, Edit3, X, Wrench, Lock, Crown, Target, Clock, Flame, Trophy, Shield } from 'lucide-react-native';
import Constants from 'expo-constants';
import { theme } from '@/constants/theme';
import { GradientBackground } from '@/components/GradientBackground';

import { useGoalStore } from '@/hooks/use-goal-store';
import { useAuth } from '@/hooks/use-auth-store';
import { useFirstTimeSetup } from '@/hooks/use-first-time-setup';
import { useSubscription } from '@/hooks/use-subscription-store';

Dimensions.get('window');

export default function ProfileScreen() {
  const store = useGoalStore();
  const { user, logout, deleteAccount } = useAuth();
  const { profile: setupProfile, updateProfile: updateSetupProfile } = useFirstTimeSetup();
  const { isPremium } = useSubscription();
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const insets = useSafeAreaInsets();
  const contentTopPadding = theme.spacing.lg;

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    glowLoop.start();

    return () => {
      pulseLoop.stop();
      glowLoop.stop();
    };
  }, [pulseAnim, glowAnim]);

  const AVATAR_VIDEO = 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769956429/0126_6_eud89t.mp4';
  const GRAY_ORB_VIDEO = 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769449334/0125_1__5_xxgjfb.mp4';
  
  const earnedOrbs = [
    { id: '1', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769956429/0126_6_eud89t.mp4', label: 'First Step', unlocked: true },
    { id: '2', video: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769956418/0126_8_xka62k.mp4', label: 'Day 3', unlocked: true },
    { id: '3', video: GRAY_ORB_VIDEO, label: 'Week', unlocked: false },
    { id: '4', video: GRAY_ORB_VIDEO, label: '7 Days', unlocked: false },
    { id: '5', video: GRAY_ORB_VIDEO, label: 'Focus', unlocked: false },
    { id: '6', video: GRAY_ORB_VIDEO, label: '14 Days', unlocked: false },
  ];

  
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

  const pomodoroStats = store?.getPomodoroStats?.() || { totalWorkTime: 0, todayWorkTime: 0 };
  const totalFocusMinutes = Math.floor((pomodoroStats.totalWorkTime || 0) / 60);
  const totalFocusHours = Math.floor(totalFocusMinutes / 60);
  const remainingMinutes = totalFocusMinutes % 60;
  const focusTimeDisplay = totalFocusHours > 0 
    ? `${totalFocusHours}h ${remainingMinutes}m` 
    : `${totalFocusMinutes}m`;

  const completedTasksCount = store?.dailyTasks?.filter(t => t.completed).length || 0;

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
    {
      icon: MessageCircle,
      title: 'AI Coach',
      subtitle: 'Chat with your personal assistant',
      onPress: () => router.push('/chat'),
      gradient: ['rgba(139, 92, 246, 0.15)', 'rgba(139, 92, 246, 0.05)'],
      iconColor: '#8B5CF6',
    },
    ...(currentGoal ? [{
      icon: RotateCcw,
      title: 'Reset Goal',
      subtitle: 'Start fresh with a new goal',
      onPress: handleResetGoal,
      gradient: ['rgba(249, 115, 22, 0.15)', 'rgba(249, 115, 22, 0.05)'],
      iconColor: '#F97316',
    }] : []),
    {
      icon: Bell,
      title: 'Notifications',
      subtitle: 'Manage your reminders',
      onPress: () => router.push('/notifications'),
      gradient: ['rgba(34, 197, 94, 0.15)', 'rgba(34, 197, 94, 0.05)'],
      iconColor: '#22C55E',
    },
    {
      icon: Settings,
      title: 'Settings',
      subtitle: 'App preferences & options',
      onPress: () => router.push('/settings'),
      gradient: ['rgba(99, 102, 241, 0.15)', 'rgba(99, 102, 241, 0.05)'],
      iconColor: '#6366F1',
    },
    {
      icon: Info,
      title: 'About',
      subtitle: 'Version 1.0',
      onPress: () => Alert.alert('GoalCoach AI', 'Your personal AI coach for achieving goals\n\nVersion 1.0'),
      gradient: ['rgba(156, 163, 175, 0.15)', 'rgba(156, 163, 175, 0.05)'],
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

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  return (
    <GradientBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: contentTopPadding }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.avatarSection}>
              <Animated.View style={[styles.avatarGlow, { opacity: glowOpacity }]} />
              <Animated.View style={[styles.avatarContainer, { transform: [{ scale: pulseAnim }] }]}>
                <Video
                  source={{ uri: AVATAR_VIDEO }}
                  style={styles.avatarVideo}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay
                  isLooping
                  isMuted
                />
                <View style={styles.avatarBorder} />
              </Animated.View>
              {isPremium && (
                <View style={styles.premiumBadge}>
                  <Crown size={12} color="#000" />
                </View>
              )}
            </View>
            
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{setupProfile?.nickname || user?.name || user?.email || profile.name}</Text>
              <TouchableOpacity 
                style={styles.editNameButton}
                onPress={handleEditNickname}
                activeOpacity={0.7}
              >
                <Edit3 size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.memberSince}>
              Member since {new Date(profile.joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>

            {!isPremium && (
              <TouchableOpacity
                style={styles.upgradeBanner}
                onPress={() => router.push('/subscription')}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 215, 0, 0.05)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.upgradeBannerGradient}
                />
                <View style={styles.upgradeBannerContent}>
                  <View style={styles.upgradeBannerLeft}>
                    <View style={styles.upgradeIconWrapper}>
                      <Sparkles size={18} color={theme.colors.primary} />
                    </View>
                    <View>
                      <Text style={styles.upgradeBannerTitle}>Upgrade to Premium</Text>
                      <Text style={styles.upgradeBannerSubtitle}>Unlock all features</Text>
                    </View>
                  </View>
                  <View style={styles.upgradeArrow}>
                    <ChevronRight size={20} color={theme.colors.primary} />
                  </View>
                </View>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.statsSection}>
            <View style={styles.statCard}>
              <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(255, 215, 0, 0.1)' }]}>
                <Target size={18} color={theme.colors.primary} />
              </View>
              <Text style={styles.statValue}>{completedTasksCount}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                <Clock size={18} color="#8B5CF6" />
              </View>
              <Text style={styles.statValue}>{focusTimeDisplay}</Text>
              <Text style={styles.statLabel}>Focus Time</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(249, 115, 22, 0.1)' }]}>
                <Flame size={18} color="#F97316" />
              </View>
              <Text style={styles.statValue}>{profile.currentStreak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
          </View>

          <View style={styles.achievementsSection}>
            <View style={styles.sectionHeader}>
              <Trophy size={18} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Achievements</Text>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.orbsRow}
            >
              {earnedOrbs.map((orb) => (
                <View key={orb.id} style={styles.miniOrbContainer}>
                  <View style={[styles.miniOrbWrapper, !orb.unlocked && styles.miniOrbLocked]}>
                    <Video
                      source={{ uri: orb.video }}
                      style={styles.miniOrbVideo}
                      resizeMode={ResizeMode.COVER}
                      shouldPlay
                      isLooping
                      isMuted
                    />
                    {!orb.unlocked && (
                      <View style={styles.miniOrbLockedOverlay}>
                        <Lock size={14} color="rgba(255,255,255,0.6)" />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.miniOrbLabel, !orb.unlocked && styles.miniOrbLabelLocked]}>
                    {orb.label}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>

          <View style={styles.menuSection}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={item.onPress}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={item.gradient as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.menuItemGradient}
                />
                <View style={[styles.menuIcon, { backgroundColor: `${item.iconColor}15` }]}>
                  <item.icon size={20} color={item.iconColor} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.dangerZone}>
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <View style={styles.dangerIcon}>
                <LogOut size={18} color="#EF4444" />
              </View>
              <Text style={styles.dangerButtonText}>Sign Out</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.dangerButton, styles.deleteButton]}
              onPress={handleDeleteAccount}
              activeOpacity={0.8}
            >
              <View style={[styles.dangerIcon, styles.deleteIcon]}>
                <Shield size={18} color="#991B1B" />
              </View>
              <Text style={[styles.dangerButtonText, styles.deleteButtonText]}>Delete Account</Text>
            </TouchableOpacity>
          </View>

          {(__DEV__ || Constants?.appOwnership === 'expo' || Constants?.executionEnvironment === 'storeClient') && (
            <TouchableOpacity
              style={styles.devEntry}
              onPress={() => router.push('/dev-subscription-tools')}
              activeOpacity={0.8}
              testID="dev-subscription-entry"
            >
              <Wrench size={16} color="#FFD700" />
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
                  <X size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
              
              <TextInput
                style={styles.nicknameInput}
                value={newNickname}
                onChangeText={setNewNickname}
                placeholder="Enter nickname"
                placeholderTextColor={theme.colors.textLight}
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

const AVATAR_SIZE = 100;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  avatarSection: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarGlow: {
    position: 'absolute',
    top: -15,
    left: -15,
    right: -15,
    bottom: -15,
    borderRadius: (AVATAR_SIZE + 30) / 2,
    backgroundColor: theme.colors.primary,
  },
  avatarContainer: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
  },
  avatarVideo: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  avatarBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  premiumBadge: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: theme.colors.background,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  userName: {
    fontSize: 26,
    fontWeight: '600' as const,
    color: theme.colors.text,
    letterSpacing: 0.3,
  },
  editNameButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  memberSince: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  upgradeBanner: {
    width: '100%',
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  upgradeBannerGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  upgradeBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  upgradeBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  upgradeIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeBannerTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.primary,
  },
  upgradeBannerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 1,
  },
  upgradeArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsSection: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 8,
  },
  achievementsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  orbsRow: {
    flexDirection: 'row',
    gap: 14,
    paddingRight: 20,
  },
  miniOrbContainer: {
    alignItems: 'center',
  },
  miniOrbWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  miniOrbLocked: {
    borderColor: 'rgba(255,255,255,0.1)',
    opacity: 0.5,
  },
  miniOrbVideo: {
    width: 52,
    height: 52,
  },
  miniOrbLockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniOrbLabel: {
    fontSize: 11,
    color: theme.colors.text,
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '500' as const,
  },
  miniOrbLabelLocked: {
    color: theme.colors.textSecondary,
  },
  menuSection: {
    gap: 10,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
  },
  menuItemGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  dangerZone: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  dangerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  deleteButton: {
    backgroundColor: 'rgba(153, 27, 27, 0.08)',
    borderColor: 'rgba(153, 27, 27, 0.2)',
  },
  dangerIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: {
    backgroundColor: 'rgba(153, 27, 27, 0.15)',
  },
  dangerButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#EF4444',
  },
  deleteButtonText: {
    color: '#991B1B',
  },
  devEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  },
  devEntryText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: theme.colors.primary,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  nicknameInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#000',
  },
});
