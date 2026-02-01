import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Sparkles, TrendingUp, Calendar, Heart } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useManifestationStore } from '@/hooks/use-manifestation-store';

export function ManifestationStats() {
  const manifestationStore = useManifestationStore();
  
  if (!manifestationStore.isReady) {
    return null;
  }
  
  const stats = manifestationStore.getStats();
  const totalMinutes = Math.floor(stats.totalTime / 60);
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Sparkles size={24} color={theme.colors.primary} />
        <Text style={styles.title}>Manifestation Statistics</Text>
      </View>
      
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <Calendar size={20} color={theme.colors.primary} />
          </View>
          <Text style={styles.statValue}>{stats.totalSessions}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
        
        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <TrendingUp size={20} color={theme.colors.primary} />
          </View>
          <Text style={styles.statValue}>{stats.currentStreak}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
        
        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <Heart size={20} color={theme.colors.primary} />
          </View>
          <Text style={styles.statValue}>{totalMinutes}</Text>
          <Text style={styles.statLabel}>Minutes</Text>
        </View>
        
        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <Sparkles size={20} color={theme.colors.primary} />
          </View>
          <Text style={styles.statValue}>
            {stats.averageMoodImprovement > 0 ? `+${stats.averageMoodImprovement.toFixed(1)}` : '0'}
          </Text>
          <Text style={styles.statLabel}>Mood Improvement</Text>
        </View>
      </View>
      
      {stats.bestStreak > 0 && (
        <View style={styles.achievement}>
          <Text style={styles.achievementText}>
            🏆 Best Streak: {stats.bestStreak} {stats.bestStreak === 1 ? 'day' : 'days'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.primary + '20',
    ...theme.shadows.medium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
    marginLeft: theme.spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  statValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  achievement: {
    backgroundColor: theme.colors.primary + '10',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  achievementText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.fontWeight.medium,
  },
});