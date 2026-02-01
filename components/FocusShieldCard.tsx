import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import {
  Shield,
  ShieldCheck,
  Clock,
  Instagram,
  Play,
  Square,
  Settings,
  X,
  Check,
  AlertTriangle,
} from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useFocusShield } from '@/hooks/use-focus-shield-store';
import * as Haptics from 'expo-haptics';

const INTERVAL_OPTIONS = [
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
];

const APP_OPTIONS = [
  { id: 'instagram', name: 'Instagram Reels', icon: Instagram },
  { id: 'tiktok', name: 'TikTok', icon: Play },
  { id: 'youtube', name: 'YouTube Shorts', icon: Play },
];

export function FocusShieldCard() {
  const {
    settings,
    isActive,
    currentSession,
    startSession,
    endSession,
    updateSettings,
    toggleApp,
    getTodayStats,
    getRandomMessage,
  } = useFocusShield();

  const [showSettings, setShowSettings] = useState(false);
  const [currentMessage, setCurrentMessage] = useState(getRandomMessage());
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const todayStats = getTodayStats();

  useEffect(() => {
    if (isActive) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }).start();

      return () => {
        pulseAnimation.stop();
      };
    } else {
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [isActive, pulseAnim, glowAnim]);

  useEffect(() => {
    if (isActive && currentSession) {
      const interval = setInterval(() => {
        const start = new Date(currentSession.startTime).getTime();
        const now = Date.now();
        setElapsedTime(Math.floor((now - start) / 1000));
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setElapsedTime(0);
    }
  }, [isActive, currentSession]);

  useEffect(() => {
    if (isActive) {
      const messageInterval = setInterval(() => {
        setCurrentMessage(getRandomMessage());
      }, 60000);

      return () => clearInterval(messageInterval);
    }
  }, [isActive, getRandomMessage]);

  const handleToggle = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (isActive) {
      endSession();
    } else {
      startSession();
      setCurrentMessage(getRandomMessage());
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMinutes = (minutes: number) => {
    if (minutes >= 60) {
      const hrs = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
    }
    return `${minutes}m`;
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.15],
  });

  return (
    <>
      <TouchableOpacity
        style={[styles.card, isActive && styles.cardActive]}
        onPress={handleToggle}
        onLongPress={() => setShowSettings(true)}
        activeOpacity={0.85}
        testID="focus-shield-card"
      >
        <Animated.View
          style={[
            styles.glowEffect,
            {
              opacity: glowOpacity,
            },
          ]}
        />

        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Animated.View
              style={[
                styles.iconContainer,
                isActive && styles.iconContainerActive,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              {isActive ? (
                <ShieldCheck size={24} color={theme.colors.success} />
              ) : (
                <Shield size={24} color={theme.colors.primary} />
              )}
            </Animated.View>
            <View style={styles.titleContent}>
              <Text style={styles.title}>Focus Shield</Text>
              <Text style={styles.subtitle}>
                {isActive ? 'Protection active' : 'Smart social media reminders'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setShowSettings(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Settings size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {isActive && (
          <View style={styles.activeContent}>
            <View style={styles.timerRow}>
              <Clock size={16} color={theme.colors.primary} />
              <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
            </View>
            <Text style={styles.motivationText}>{currentMessage}</Text>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatMinutes(todayStats.focusTime)}</Text>
            <Text style={styles.statLabel}>Focus today</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{todayStats.sessionsCount}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {settings.reminderInterval}m
            </Text>
            <Text style={styles.statLabel}>Interval</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <View
            style={[
              styles.actionButton,
              isActive ? styles.actionButtonStop : styles.actionButtonStart,
            ]}
          >
            {isActive ? (
              <>
                <Square size={16} color="#fff" style={styles.actionIcon} />
                <Text style={styles.actionButtonText}>End Session</Text>
              </>
            ) : (
              <>
                <Play size={16} color="#000" style={styles.actionIcon} />
                <Text style={[styles.actionButtonText, styles.actionButtonTextStart]}>
                  Start Focus
                </Text>
              </>
            )}
          </View>
        </View>

        <Text style={styles.hint}>Long press for settings</Text>
      </TouchableOpacity>

      <Modal
        visible={showSettings}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Focus Shield Settings</Text>
              <TouchableOpacity
                onPress={() => setShowSettings(false)}
                style={styles.closeButton}
              >
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.settingSection}>
                <Text style={styles.settingTitle}>Reminder Interval</Text>
                <Text style={styles.settingDescription}>
                  How often you will receive focus reminders
                </Text>
                <View style={styles.intervalOptions}>
                  {INTERVAL_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.intervalOption,
                        settings.reminderInterval === option.value &&
                          styles.intervalOptionActive,
                      ]}
                      onPress={() => updateSettings({ reminderInterval: option.value })}
                    >
                      <Text
                        style={[
                          styles.intervalOptionText,
                          settings.reminderInterval === option.value &&
                            styles.intervalOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.settingSection}>
                <Text style={styles.settingTitle}>Monitored Apps</Text>
                <Text style={styles.settingDescription}>
                  Select apps you want reminders for
                </Text>
                <View style={styles.appOptions}>
                  {APP_OPTIONS.map((app) => {
                    const isSelected = settings.blockedApps.includes(app.id);
                    const IconComponent = app.icon;
                    return (
                      <TouchableOpacity
                        key={app.id}
                        style={[
                          styles.appOption,
                          isSelected && styles.appOptionActive,
                        ]}
                        onPress={() => toggleApp(app.id)}
                      >
                        <IconComponent
                          size={20}
                          color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.appOptionText,
                            isSelected && styles.appOptionTextActive,
                          ]}
                        >
                          {app.name}
                        </Text>
                        {isSelected && (
                          <Check size={16} color={theme.colors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.infoBox}>
                <AlertTriangle size={20} color={theme.colors.warning} />
                <Text style={styles.infoText}>
                  Focus Shield sends periodic reminders to help you stay aware of time spent on social media. 
                  It works best when you commit to checking your goals before opening distracting apps.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    ...theme.shadows.medium,
  },
  cardActive: {
    borderColor: theme.colors.success + '50',
  },
  glowEffect: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    bottom: -50,
    backgroundColor: theme.colors.success,
    borderRadius: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconContainerActive: {
    backgroundColor: theme.colors.success + '15',
  },
  titleContent: {
    flex: 1,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  settingsButton: {
    padding: 8,
  },
  activeContent: {
    backgroundColor: theme.colors.success + '10',
    borderRadius: theme.borderRadius.lg,
    padding: 12,
    marginBottom: 12,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timerText: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginLeft: 8,
  },
  motivationText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: theme.colors.border,
  },
  actionRow: {
    marginBottom: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: theme.borderRadius.lg,
  },
  actionButtonStart: {
    backgroundColor: theme.colors.primary,
  },
  actionButtonStop: {
    backgroundColor: theme.colors.error,
  },
  actionIcon: {
    marginRight: 8,
  },
  actionButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: '#fff',
  },
  actionButtonTextStart: {
    color: '#000',
  },
  hint: {
    fontSize: 11,
    color: theme.colors.textLight,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  settingSection: {
    marginBottom: 24,
  },
  settingTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  intervalOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  intervalOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  intervalOptionActive: {
    backgroundColor: theme.colors.primary + '15',
    borderColor: theme.colors.primary,
  },
  intervalOptionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  intervalOptionTextActive: {
    color: theme.colors.primary,
  },
  appOptions: {
    gap: 8,
  },
  appOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  appOptionActive: {
    backgroundColor: theme.colors.primary + '10',
    borderColor: theme.colors.primary + '40',
  },
  appOptionText: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginLeft: 12,
  },
  appOptionTextActive: {
    color: theme.colors.text,
    fontWeight: theme.fontWeight.medium,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.warning + '10',
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    marginBottom: 40,
  },
  infoText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginLeft: 12,
    lineHeight: 20,
  },
});
