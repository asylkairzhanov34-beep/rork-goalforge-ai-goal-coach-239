import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch,
  Alert,
  Linking,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { 
  ChevronLeft,
  Bell,
  Volume2,
  Vibrate,
  Shield,
  FileText,
  HelpCircle,
  Star,
  Mail,
  ChevronRight,
  Clock,
  Target,
  RefreshCw,
  LogOut,
  Trash2,
  CreditCard,
  Crown,
  ExternalLink
} from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { GradientBackground } from '@/components/GradientBackground';
import { useFirstTimeSetup } from '@/hooks/use-first-time-setup';
import { useGoalStore } from '@/hooks/use-goal-store';
import { useAuth } from '@/hooks/use-auth-store';
import { useSubscription } from '@/hooks/use-subscription-store';

interface SettingItemProps {
  icon: React.ComponentType<any>;
  title: string;
  subtitle?: string;
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  onPress?: () => void;
  showArrow?: boolean;
  iconColor?: string;
}

function SettingItem({ 
  icon: Icon, 
  title, 
  subtitle, 
  value, 
  onValueChange, 
  onPress,
  showArrow,
  iconColor
}: SettingItemProps) {
  const isToggle = value !== undefined && onValueChange !== undefined;

  return (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      activeOpacity={isToggle ? 1 : 0.7}
      disabled={isToggle && !onPress}
    >
      <View style={[styles.settingIcon, iconColor && { backgroundColor: iconColor + '20' }]}>
        <Icon size={22} color={iconColor || theme.colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {isToggle && (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ 
            false: theme.colors.border, 
            true: theme.colors.primary + '60' 
          }}
          thumbColor={value ? theme.colors.primary : theme.colors.textLight}
          ios_backgroundColor={theme.colors.border}
        />
      )}
      {showArrow && (
        <ChevronRight size={20} color={theme.colors.textLight} />
      )}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { updateProfile } = useFirstTimeSetup();
  const store = useGoalStore();
  const { deleteAccount, logout, user } = useAuth();
  const subscription = useSubscription();
  
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [autoStartTimer, setAutoStartTimer] = useState(false);
  const [dailyReminder, setDailyReminder] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);

  const handleBack = () => {
    router.back();
  };

  const handleOpenNotifications = () => {
    router.push('/notifications');
  };

  const handleResetOnboarding = () => {
    Alert.alert(
      'Reset Setup',
      'Are you sure you want to redo the setup? Your data will be saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          onPress: async () => {
            try {
              await updateProfile({ isCompleted: false });
              router.replace('/first-time-setup');
            } catch {
              Alert.alert('Error', 'Failed to reset setup');
            }
          }
        },
      ]
    );
  };

  const handleResetGoal = () => {
    if (!store?.currentGoal) {
      Alert.alert('No Goal', 'You have no active goal to reset');
      return;
    }

    Alert.alert(
      'Reset Goal',
      'Are you sure you want to reset your current goal? All progress will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: async () => {
            try {
              await store.resetGoal();
              Alert.alert('Done', 'Goal successfully reset');
            } catch {
              Alert.alert('Error', 'Failed to reset goal');
            }
          }
        },
      ]
    );
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:goalforge.dev1@gmail.com?subject=GoalCoach Support');
  };

  const handleRateApp = () => {
    const storeUrl = Platform.select({
      ios: 'https://apps.apple.com/app/goalcoach/id123456789',
      android: 'https://play.google.com/store/apps/details?id=com.goalcoach.app',
      default: 'https://goalcoach.app'
    });
    
    Alert.alert(
      'Rate App',
      'Your review will help us improve!',
      [
        { text: 'Later', style: 'cancel' },
        { 
          text: 'Rate', 
          onPress: () => Linking.openURL(storeUrl)
        },
      ]
    );
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://www.notion.so/PRIVACY-POLICY-AND-COOKIES-2b44e106d5d0807aaff8e5765d4b8539?source=copy_link');
  };

  const handleTermsOfService = () => {
    Linking.openURL('https://www.notion.so/Terms-of-Use-2c54e106d5d080f1b7bdce1028935488');
  };

  const handleManageSubscription = () => {
    const storeUrl = Platform.select({
      ios: 'https://apps.apple.com/account/subscriptions',
      android: 'https://play.google.com/store/account/subscriptions',
      default: 'https://apps.apple.com/account/subscriptions'
    });
    Linking.openURL(storeUrl);
  };

  const handleCancelSubscription = () => {
    if (subscription?.status === 'premium') {
      Alert.alert(
        'Cancel Subscription',
        'To cancel your subscription, you need to do it through the App Store or Google Play Store. Would you like to open subscription settings?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Settings', 
            onPress: handleManageSubscription
          },
        ]
      );
    } else {
      Alert.alert('No Active Subscription', 'You don\'t have an active subscription to cancel.');
    }
  };

  const handleOpenDevTools = () => {
    router.push('/dev-subscription-tools');
  };

  const handleRestorePurchases = async () => {
    try {
      const restored = await subscription?.restorePurchases();
      if (restored) {
        Alert.alert('Success', 'Your purchases have been restored!');
      } else {
        Alert.alert('No Purchases Found', 'No previous purchases were found to restore.');
      }
    } catch {
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    }
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


  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is irreversible! All your data, including progress, goals, and subscription will be deleted permanently.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmation',
              'Are you sure you want to delete your account? This action cannot be undone.',
              [
                { text: 'No, keep it', style: 'cancel' },
                { 
                  text: 'Yes, delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const success = await deleteAccount();
                      if (success) {
                        Alert.alert('Done', 'Account deleted', [
                          { text: 'OK', onPress: () => router.replace('/auth') }
                        ]);
                      } else {
                        Alert.alert('Error', 'Failed to delete account. Please try again later.');
                      }
                    } catch (error) {
                      const message = error instanceof Error ? error.message : 'Unknown error';
                      Alert.alert('Error', message);
                    }
                  }
                },
              ]
            );
          }
        },
      ]
    );
  };

  return (
    <GradientBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <ChevronLeft size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SectionHeader title="Sound & Notifications" />
          <View style={styles.section}>
            <SettingItem
              icon={Volume2}
              title="Sound Effects"
              subtitle="Sounds in timer and app"
              value={soundEnabled}
              onValueChange={setSoundEnabled}
            />
            <SettingItem
              icon={Vibrate}
              title="Vibration"
              subtitle="Haptic feedback"
              value={vibrationEnabled}
              onValueChange={setVibrationEnabled}
            />
            <SettingItem
              icon={Bell}
              title="Notifications"
              subtitle="Reminder settings"
              onPress={handleOpenNotifications}
              showArrow
            />
          </View>

          <SectionHeader title="Timer" />
          <View style={styles.section}>
            <SettingItem
              icon={Clock}
              title="Auto Start"
              subtitle="Automatically start next session"
              value={autoStartTimer}
              onValueChange={setAutoStartTimer}
            />
            <SettingItem
              icon={Bell}
              title="Daily Reminder"
              subtitle="Remind about focus sessions"
              value={dailyReminder}
              onValueChange={setDailyReminder}
            />
          </View>

          <SectionHeader title="Reports" />
          <View style={styles.section}>
            <SettingItem
              icon={FileText}
              title="Weekly Report"
              subtitle="Receive summary every week"
              value={weeklyReport}
              onValueChange={setWeeklyReport}
            />
          </View>

          <SectionHeader title="Subscription" />
          <View style={styles.section}>
            <SettingItem
              icon={Crown}
              title="Subscription Status"
              subtitle={subscription?.isPremium ? 'Premium Active' : 'Free Plan'}
              onPress={() => router.push('/subscription')}
              showArrow
              iconColor="#F59E0B"
            />
            {subscription?.status === 'premium' && (
              <SettingItem
                icon={CreditCard}
                title="Manage Subscription"
                subtitle="View or cancel in App Store/Play Store"
                onPress={handleManageSubscription}
                showArrow
                iconColor="#3B82F6"
              />
            )}
            <SettingItem
              icon={RefreshCw}
              title="Restore Purchases"
              subtitle="Restore previous subscriptions"
              onPress={handleRestorePurchases}
              showArrow
              iconColor="#10B981"
            />
            {subscription?.isPremium && (
              <SettingItem
                icon={ExternalLink}
                title="Cancel Subscription"
                subtitle="Opens store settings"
                onPress={handleCancelSubscription}
                showArrow
                iconColor="#EF4444"
              />
            )}
            {__DEV__ && (
              <SettingItem
                icon={Shield}
                title="Developer Tools"
                subtitle="Debug subscription state"
                onPress={handleOpenDevTools}
                showArrow
                iconColor="#8B5CF6"
              />
            )}
          </View>

          <SectionHeader title="Data" />
          <View style={styles.section}>
            <SettingItem
              icon={RefreshCw}
              title="Redo Setup"
              subtitle="Update profile and biorhythm"
              onPress={handleResetOnboarding}
              showArrow
              iconColor="#3B82F6"
            />
            {store?.currentGoal && (
              <SettingItem
                icon={Target}
                title="Reset Goal"
                subtitle="Delete current goal and progress"
                onPress={handleResetGoal}
                showArrow
                iconColor="#EF4444"
              />
            )}
          </View>

          <SectionHeader title="Help & Support" />
          <View style={styles.section}>
            <SettingItem
              icon={Mail}
              title="Contact Support"
              subtitle="Ask a question or report an issue"
              onPress={handleContactSupport}
              showArrow
              iconColor="#10B981"
            />
            <SettingItem
              icon={Star}
              title="Rate App"
              subtitle="Share your opinion in the store"
              onPress={handleRateApp}
              showArrow
              iconColor="#F59E0B"
            />
            <SettingItem
              icon={HelpCircle}
              title="FAQ"
              subtitle="Frequently asked questions"
              onPress={() => Alert.alert('FAQ', 'This section will be available soon')}
              showArrow
              iconColor="#8B5CF6"
            />
          </View>

          {user && (
            <>
              <SectionHeader title="Account" />
              <View style={styles.section}>
                <SettingItem
                  icon={LogOut}
                  title="Sign Out"
                  subtitle={user.email}
                  onPress={handleLogout}
                  showArrow
                  iconColor="#F59E0B"
                />
                <SettingItem
                  icon={Trash2}
                  title="Delete Account"
                  subtitle="Delete all data permanently"
                  onPress={handleDeleteAccount}
                  showArrow
                  iconColor="#EF4444"
                />
              </View>
            </>
          )}

          <SectionHeader title="Legal Information" />
          <View style={styles.section}>
            <SettingItem
              icon={Shield}
              title="Privacy Policy"
              onPress={handlePrivacyPolicy}
              showArrow
              iconColor="#6366F1"
            />
            <SettingItem
              icon={FileText}
              title="Terms of Use"
              onPress={handleTermsOfService}
              showArrow
              iconColor="#6366F1"
            />
          </View>

          <View style={styles.appInfo}>
            <Text style={styles.appName}>GoalCoach AI</Text>
            <Text style={styles.appVersion}>Version 1.0</Text>
            <Text style={styles.appCopyright}>© 2024 GoalCoach. All rights reserved.</Text>
          </View>
        </ScrollView>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 100,
  },
  sectionHeader: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.medium,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
  },
  settingSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.xl,
  },
  appName: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  appVersion: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  appCopyright: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textLight,
  },
});