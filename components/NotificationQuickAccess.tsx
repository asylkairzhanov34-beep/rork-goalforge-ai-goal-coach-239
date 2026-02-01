import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bell, BellOff } from 'lucide-react-native';
import { router } from 'expo-router';
import { useNotifications } from '@/hooks/use-notifications';
import { theme } from '@/constants/theme';

export function NotificationQuickAccess() {
  const { permission } = useNotifications();

  const handlePress = () => {
    router.push('/notifications');
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.iconContainer}>
        {permission.granted ? (
          <Bell size={20} color={theme.colors.primary} />
        ) : (
          <BellOff size={20} color={theme.colors.textSecondary} />
        )}
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>
          {permission.granted ? 'Notifications enabled' : 'Enable notifications'}
        </Text>
        <Text style={styles.subtitle}>
          {permission.granted 
            ? 'Manage reminders'
            : 'Get helpful reminders'
          }
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.small,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});