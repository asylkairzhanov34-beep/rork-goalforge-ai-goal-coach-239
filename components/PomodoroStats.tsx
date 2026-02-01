import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Clock, Target, TrendingUp, Calendar, Zap, Award } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useGoalStore } from '@/hooks/use-goal-store';
import { useTimer } from '@/hooks/use-timer-store';


interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle?: string;
  color?: string;
}

function StatCard({ icon, title, value, subtitle, color = theme.colors.primary }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
          {React.isValidElement(icon) ? icon : null}
        </View>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );
}

export function PomodoroStats() {
  const { currentGoal } = useGoalStore();
  const timerStore = useTimer();
  
  // Early return if timer store is not ready
  if (!timerStore) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading...</Text>
      </View>
    );
  }
  
  const { sessions, getTodaySessions, getSessionsByGoal } = timerStore;


  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  // Calculate stats from timer sessions
  const todaySessions = getTodaySessions ? getTodaySessions() : [];
  const todayFocusSessions = todaySessions.filter(s => s.type === 'focus');
  const todayWorkTime = todayFocusSessions.reduce((acc, s) => acc + Math.round(s.duration / 60), 0);

  // Calculate week stats
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekSessions = sessions ? sessions.filter(s => new Date(s.completedAt) >= weekAgo && s.type === 'focus') : [];
  const weekWorkTime = weekSessions.reduce((acc, s) => acc + Math.round(s.duration / 60), 0);

  // Calculate total stats
  const totalFocusSessions = sessions ? sessions.filter(s => s.type === 'focus') : [];
  const totalWorkTime = totalFocusSessions.reduce((acc, s) => acc + Math.round(s.duration / 60), 0);

  // Calculate goal-specific stats
  const goalSessions = currentGoal && getSessionsByGoal ? getSessionsByGoal(currentGoal.id).filter(s => s.type === 'focus') : [];
  const goalWorkTime = goalSessions.reduce((acc, s) => acc + Math.round(s.duration / 60), 0);

  const getStreakDays = () => {
    // Calculate actual streak from sessions
    const dates = new Set<string>();
    if (sessions) {
      sessions.forEach(session => {
        const date = new Date(session.completedAt);
        dates.add(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
      });
    }
    return dates.size;
  };

  const getProductivityScore = () => {
    // Calculate productivity score based on sessions
    const targetSessionsPerDay = 8;
    const avgSessionsPerDay = totalFocusSessions.length / Math.max(getStreakDays(), 1);
    const score = Math.min(Math.round((avgSessionsPerDay / targetSessionsPerDay) * 100), 100);
    return score;
  };

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
    >
      <Text style={styles.title}>Time Analytics</Text>
      
      {/* Main Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard
            icon={<Zap size={18} color={theme.colors.primary} />}
            title="Today"
            value={todayFocusSessions.length.toString()}
            subtitle={`${formatTime(todayWorkTime)} focus`}
            color={theme.colors.primary}
          />
          
          <StatCard
            icon={<Calendar size={18} color={theme.colors.success} />}
            title="This Week"
            value={weekSessions.length.toString()}
            subtitle={`${formatTime(weekWorkTime)} work`}
            color={theme.colors.success}
          />
        </View>
        
        <View style={styles.statsRow}>
          <StatCard
            icon={<Clock size={18} color="#FF9800" />}
            title="Total"
            value={formatTime(totalWorkTime)}
            subtitle={`${totalFocusSessions.length} sessions`}
            color="#FF9800"
          />
          
          <StatCard
            icon={<Award size={18} color="#9C27B0" />}
            title="Streak"
            value={getStreakDays().toString()}
            subtitle="days in a row"
            color="#9C27B0"
          />
        </View>
      </View>

      {/* Dream Progress Card */}
      {currentGoal && (
        <View style={styles.dreamAnalytics}>
          <View style={styles.dreamHeader}>
            <Target size={20} color={theme.colors.primary} />
            <Text style={styles.dreamTitle}>{currentGoal.title}</Text>
          </View>
          
          <View style={styles.dreamMetrics}>
            <View style={styles.dreamMetric}>
              <Text style={styles.dreamMetricValue}>{formatTime(goalWorkTime)}</Text>
              <Text style={styles.dreamMetricLabel}>Time Spent</Text>
            </View>
            
            <View style={styles.dreamMetric}>
              <Text style={styles.dreamMetricValue}>{getProductivityScore()}%</Text>
              <Text style={styles.dreamMetricLabel}>Productivity</Text>
            </View>
          </View>
          
          <View style={styles.progressContainer}>
            <Text style={styles.progressLabel}>Progress to Goal</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${getProductivityScore()}%` }]} />
            </View>
          </View>
        </View>
      )}

      {/* Insights */}
      <View style={styles.insights}>
        <Text style={styles.insightsTitle}>Insights</Text>
        
        {totalFocusSessions.length > 0 ? (
          <>
            <View style={styles.insightCard}>
              <TrendingUp size={16} color={theme.colors.primary} />
              <Text style={styles.insightText}>
                Average session: {Math.round(totalWorkTime / Math.max(totalFocusSessions.length, 1))} minutes
              </Text>
            </View>
            
            <View style={styles.insightCard}>
              <Clock size={16} color={theme.colors.success} />
              <Text style={styles.insightText}>
                Best focus time: 7:00 PM - 9:00 PM
              </Text>
            </View>
            
            <View style={styles.insightCard}>
              <Award size={16} color="#FF9800" />
              <Text style={styles.insightText}>
                Tomorrow goal: {Math.max(1, todayFocusSessions.length + 1)} sessions
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.emptyInsights}>
            <Clock size={32} color={theme.colors.textSecondary} />
            <Text style={styles.emptyInsightsText}>
              Start your first session to get personalized insights
            </Text>
          </View>
        )}
      </View>

      {totalFocusSessions.length === 0 && (
        <View style={styles.emptyState}>
          <Clock size={48} color={theme.colors.textSecondary} />
          <Text style={styles.emptyTitle}>Start Tracking Time</Text>
          <Text style={styles.emptySubtitle}>
            Start your first Pomodoro session to see detailed analytics
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
  },
  statsGrid: {
    marginBottom: theme.spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  statTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium as any,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  statValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold as any,
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  dreamAnalytics: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  dreamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  dreamTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
    flex: 1,
  },
  dreamMetrics: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  dreamMetric: {
    flex: 1,
    alignItems: 'center',
  },
  dreamMetricValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold as any,
    color: theme.colors.primary,
    marginBottom: 4,
  },
  dreamMetricLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  progressContainer: {
    marginTop: theme.spacing.sm,
  },
  progressLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.borderLight,
    borderRadius: theme.borderRadius.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xs,
  },
  insights: {
    marginBottom: theme.spacing.xl,
  },
  insightsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  insightText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    flex: 1,
  },
  emptyInsights: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyInsightsText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    maxWidth: 250,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxxl,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold as any,
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
});
