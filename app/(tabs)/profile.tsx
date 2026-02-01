import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { User, Settings, Bell, ChevronRight, Info, LogOut, MessageCircle, RotateCcw, Sparkles, Edit3, X, Wrench, Lock } from 'lucide-react-native';
import Constants from 'expo-constants';
import { theme } from '@/constants/theme';
import { GradientBackground } from '@/components/GradientBackground';

import { useGoalStore } from '@/hooks/use-goal-store';
import { useAuth } from '@/hooks/use-auth-store';
import { useFirstTimeSetup } from '@/hooks/use-first-time-setup';
import { useSubscription } from '@/hooks/use-subscription-store';




export default function ProfileScreen() {
  const store = useGoalStore();
  const { user, logout, deleteAccount } = useAuth();
  const { profile: setupProfile, updateProfile: updateSetupProfile } = useFirstTimeSetup();
  const { isPremium } = useSubscription();
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const insets = useSafeAreaInsets();
  const contentTopPadding = theme.spacing.lg;

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
    ...(!isPremium ? [{
      icon: Sparkles,
      title: 'Get Premium',
      subtitle: 'Unlimited access to all features',
      onPress: () => router.push('/subscription'),
      isPremium: true,
    }] : [{
      icon: Sparkles,
      title: 'Premium Active',
      subtitle: 'Thank you for your support!',
      onPress: () => router.push('/subscription'),
      isPremium: true,
    }]),
    {
      icon: MessageCircle,
      title: 'Assistant',
      subtitle: 'Chat with AI coach',
      onPress: () => router.push('/chat'),
    },
    ...(currentGoal ? [{
      icon: RotateCcw,
      title: 'Reset Goal',
      subtitle: 'Delete current goal and progress',
      onPress: handleResetGoal,
    }] : []),
    {
      icon: Bell,
      title: 'Notifications',
      subtitle: 'Reminder settings',
      onPress: () => router.push('/notifications'),
    },
    {
      icon: Settings,
      title: 'Settings',
      subtitle: 'App preferences',
      onPress: () => router.push('/settings'),
    },
    {
      icon: Info,
      title: 'About',
      subtitle: 'Version 1.0',
      onPress: () => Alert.alert('GoalCoach AI', 'Your personal AI coach for achieving goals\n\nVersion 1.0'),
    },
    {
      icon: LogOut,
      title: 'Delete Account',
      subtitle: 'Permanently delete data',
      onPress: () => handleDeleteAccount(),
      color: '#EF4444',
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
              
              // Reset goal data first
              if (resetGoal) {
                try {
                  await resetGoal();
                  console.log('[Profile] Goal data reset');
                } catch (e) {
                  console.log('[Profile] No goal to reset or error:', e);
                }
              }
              
              // Delete Firebase account
              const deleted = await deleteAccount();
              console.log('[Profile] Account deletion result:', deleted);
              
              if (!deleted) {
                // If Firebase deletion failed, still logout
                await logout();
              }
              
              // Navigate to auth screen immediately so user can log in again
              // Use setTimeout to ensure state updates are processed
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
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: contentTopPadding }]}
          showsVerticalScrollIndicator={false}

        >
          <View style={styles.header}>
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <User size={40} color={theme.colors.primary} />
              </View>
              <View style={styles.nameContainer}>
                <Text style={styles.name}>{setupProfile?.nickname || user?.name || user?.email || profile.name}</Text>
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={handleEditNickname}
                  activeOpacity={0.7}
                >
                  <Edit3 size={18} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.memberSince}>
                Member since {new Date(profile.joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
            </View>
          </View>

          <View style={styles.orbsSection}>
            <Text style={styles.orbsSectionTitle}>Achievements</Text>
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




          <View style={styles.menu}>
            {menuItems.map((item, index) => {
              const isPremiumItem = 'isPremium' in item && item.isPremium;
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.menuItem,
                    isPremiumItem && !isPremium && styles.premiumMenuItem,
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.menuIcon,
                    isPremiumItem && !isPremium && styles.premiumMenuIcon,
                  ]}>
                    <item.icon size={24} color={isPremiumItem && !isPremium ? '#FFD700' : (item as any).color || theme.colors.primary} />
                  </View>
                  <View style={styles.menuContent}>
                    <Text style={[
                      styles.menuTitle,
                      isPremiumItem && !isPremium && styles.premiumMenuTitle,
                      (item as any).color ? { color: (item as any).color } : {}
                    ]}>{item.title}</Text>
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  </View>
                  <ChevronRight size={20} color={theme.colors.textLight} />
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.logoutMenuItem}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={styles.logoutIcon}>
              <LogOut size={24} color="#EF4444" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.logoutTitle}>Sign Out</Text>
              <Text style={styles.menuSubtitle}>End session</Text>
            </View>
            <ChevronRight size={20} color={theme.colors.textLight} />
          </TouchableOpacity>

          {(__DEV__ || Constants?.appOwnership === 'expo' || Constants?.executionEnvironment === 'storeClient') && (
            <TouchableOpacity
              style={styles.devEntry}
              onPress={() => router.push('/dev-subscription-tools')}
              activeOpacity={0.8}
              testID="dev-subscription-entry"
            >
              <View style={{ marginRight: 8 }}>
                <Wrench size={20} color="#FFD700" />
              </View>
              <Text style={styles.devEntryText}>🛠 Developer Tools</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 120,
  },
  header: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  profileCard: {
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.gold,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  name: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  editButton: {
    padding: theme.spacing.xs,
    backgroundColor: theme.colors.primary + '20',
    borderRadius: theme.borderRadius.md,
  },
  memberSince: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },

  orbsSection: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  orbsSectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  orbsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingRight: theme.spacing.md,
  },
  miniOrbContainer: {
    alignItems: 'center',
  },
  miniOrbWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  miniOrbLocked: {
    borderColor: 'rgba(255,255,255,0.2)',
    opacity: 0.6,
  },
  miniOrbVideo: {
    width: 50,
    height: 50,
  },
  miniOrbLockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniOrbLabel: {
    fontSize: 10,
    color: theme.colors.text,
    marginTop: 4,
    textAlign: 'center',
  },
  miniOrbLabelLocked: {
    color: theme.colors.textSecondary,
  },
  goalInfoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.primary + '20',
    ...theme.shadows.medium,
  },
  goalInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  goalInfoTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  goalInfoDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },

  menu: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.medium,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
  },
  menuSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  logoutMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    ...theme.shadows.medium,
  },
  logoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  logoutTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: '#EF4444',
  },
  devEntry: {
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.5)',
    backgroundColor: 'rgba(255,215,0,0.1)',
    ...theme.shadows.medium,
  },
  devEntryText: {
    color: '#FFD700',
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
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
  premiumMenuItem: {
    borderWidth: 2,
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  },
  premiumMenuIcon: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
  premiumMenuTitle: {
    color: '#FFD700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.large,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  nicknameInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  modalButton: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
  },
  saveButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.background,
  },
});
