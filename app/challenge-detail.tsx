import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { 
  ArrowLeft,
  Clock, 
  Star, 
  Users, 
  CheckCircle,
  AlertTriangle,
  Zap,
  Trophy,
  Flame,
  Dumbbell,
  Rocket,
  Smartphone,
  BookOpen,
  Heart,
  Sparkles,
  Brain,
  Target,
  Shield,
  Lightbulb,
  Scale,
  Smile,
  Eye,
  Globe,
  Briefcase,
  Home,
  Moon,
  Focus,
  TrendingUp,
  Leaf,
  Activity,
  Sunrise,
  Ban,
  Code2,
  User,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/constants/theme';
import { getChallengeById } from '@/constants/challenges';
import { useChallengeStore } from '@/hooks/use-challenge-store';

const getIcon = (iconName: string, size: number, color: string) => {
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
    'Target': <Target size={size} color={color} />,
    'Ban': <Ban size={size} color={color} />,
    'Code': <Code2 size={size} color={color} />,
    'Languages': <Globe size={size} color={color} />,
    'Brain': <Brain size={size} color={color} />,
    'TrendingUp': <TrendingUp size={size} color={color} />,
    'Zap': <Zap size={size} color={color} />,
    'Shield': <Shield size={size} color={color} />,
    'Lightbulb': <Lightbulb size={size} color={color} />,
    'Scale': <Scale size={size} color={color} />,
    'Smile': <Smile size={size} color={color} />,
    'Eye': <Eye size={size} color={color} />,
    'Users': <Users size={size} color={color} />,
    'Globe': <Globe size={size} color={color} />,
    'Briefcase': <Briefcase size={size} color={color} />,
    'Home': <Home size={size} color={color} />,
    'Moon': <Moon size={size} color={color} />,
    'Focus': <Focus size={size} color={color} />,
    'Trophy': <Trophy size={size} color={color} />,
    'Sparkles': <Sparkles size={size} color={color} />,
  };
  return icons[iconName] || <Zap size={size} color={color} />;
};

const formatParticipants = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
  return count.toString();
};

export default function ChallengeDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getActiveChallenge } = useChallengeStore();

  const challenge = useMemo(() => getChallengeById(id || ''), [id]);
  const activeChallenge = getActiveChallenge();
  const hasActiveChallenge = activeChallenge !== null;

  if (!challenge) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Challenge not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleStartChallenge = () => {
    router.push(`/challenge-customize?id=${challenge.id}` as any);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[challenge.color + '40', 'transparent']}
          style={styles.headerGradient}
        />

        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity 
            style={styles.backIconButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.heroSection}>
          <View style={[styles.iconLarge, { backgroundColor: challenge.color + '30' }]}>
            {getIcon(challenge.icon, 48, challenge.color)}
          </View>
          
          <Text style={styles.title}>{challenge.name}</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statBadge}>
              <Clock size={16} color={theme.colors.textSecondary} />
              <Text style={styles.statBadgeText}>{challenge.durationDays} days</Text>
            </View>
            <View style={styles.statBadge}>
              <Star size={16} color="#FFD700" />
              <Text style={styles.statBadgeText}>{challenge.rating}</Text>
            </View>
            <View style={styles.statBadge}>
              <Users size={16} color={theme.colors.textSecondary} />
              <Text style={styles.statBadgeText}>{formatParticipants(challenge.participantsCount)}</Text>
            </View>
          </View>

          <View style={[
            styles.difficultyChip,
            challenge.difficulty === 'beginner' && { backgroundColor: 'rgba(78, 205, 196, 0.2)' },
            challenge.difficulty === 'intermediate' && { backgroundColor: 'rgba(243, 156, 18, 0.2)' },
            challenge.difficulty === 'advanced' && { backgroundColor: 'rgba(231, 76, 60, 0.2)' },
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
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{challenge.fullDescription}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rules</Text>
          {challenge.rules.map((rule) => (
            <View key={rule.id} style={styles.ruleItem}>
              <View style={[
                styles.ruleIcon,
                rule.isStrict ? styles.ruleIconStrict : styles.ruleIconNormal
              ]}>
                {rule.isStrict ? (
                  <AlertTriangle size={16} color="#E74C3C" />
                ) : (
                  <CheckCircle size={16} color="#4ECDC4" />
                )}
              </View>
              <View style={styles.ruleContent}>
                <Text style={styles.ruleText}>{rule.text}</Text>
                {rule.isStrict && (
                  <Text style={styles.strictLabel}>Strict rule</Text>
                )}
              </View>
            </View>
          ))}
          
          {challenge.failOnMiss && (
            <View style={styles.warningBox}>
              <AlertTriangle size={20} color="#E74C3C" />
              <Text style={styles.warningText}>
                Missing any task means starting over from Day 1
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Benefits</Text>
          <View style={styles.benefitsGrid}>
            {challenge.benefits.map((benefit) => (
              <View key={benefit.id} style={styles.benefitCard}>
                <View style={[styles.benefitIcon, { backgroundColor: challenge.color + '20' }]}>
                  {getIcon(benefit.icon, 24, challenge.color)}
                </View>
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitDescription}>{benefit.description}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Tasks</Text>
          {challenge.dailyTasks.map((task, index) => (
            <View key={index} style={styles.taskItem}>
              <View style={styles.taskNumber}>
                <Text style={styles.taskNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.taskText}>{task}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Example Day</Text>
          <View style={styles.timelineContainer}>
            {challenge.exampleDay.map((item, index) => (
              <View key={index} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                {index < challenge.exampleDay.length - 1 && (
                  <View style={styles.timelineLine} />
                )}
                <View style={styles.timelineContent}>
                  {item.time && (
                    <Text style={styles.timelineTime}>{item.time}</Text>
                  )}
                  <Text style={styles.timelineActivity}>{item.activity}</Text>
                  <Text style={styles.timelineDuration}>{item.duration}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.tagsSection}>
          {challenge.tags.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <LinearGradient
          colors={['transparent', '#000']}
          style={styles.bottomGradient}
        />
        <TouchableOpacity
          style={[
            styles.startButton,
            hasActiveChallenge && styles.startButtonDisabled
          ]}
          onPress={handleStartChallenge}
          disabled={hasActiveChallenge}
        >
          <LinearGradient
            colors={hasActiveChallenge ? ['#444', '#333'] : [challenge.color, challenge.color + 'CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.startButtonGradient}
          />
          <Trophy size={20} color={hasActiveChallenge ? '#888' : '#000'} />
          <Text style={[
            styles.startButtonText,
            hasActiveChallenge && styles.startButtonTextDisabled
          ]}>
            {hasActiveChallenge ? 'Finish Current Challenge First' : 'Start Challenge'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  iconLarge: {
    width: 96,
    height: 96,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  statBadgeText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500' as const,
  },
  difficultyChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  difficultyText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFF',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  ruleItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  ruleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ruleIconStrict: {
    backgroundColor: 'rgba(231, 76, 60, 0.15)',
  },
  ruleIconNormal: {
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
  },
  ruleContent: {
    flex: 1,
  },
  ruleText: {
    fontSize: 15,
    color: '#FFF',
    lineHeight: 22,
  },
  strictLabel: {
    fontSize: 12,
    color: '#E74C3C',
    marginTop: 4,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#E74C3C',
    lineHeight: 20,
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  benefitCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFF',
    marginBottom: 6,
  },
  benefitDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  taskNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taskNumberText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.primary,
  },
  taskText: {
    flex: 1,
    fontSize: 15,
    color: '#FFF',
  },
  timelineContainer: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    position: 'relative',
    paddingBottom: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
    marginTop: 4,
  },
  timelineLine: {
    position: 'absolute',
    left: 5,
    top: 16,
    bottom: 0,
    width: 2,
    backgroundColor: theme.colors.border,
  },
  timelineContent: {
    marginLeft: 16,
    flex: 1,
  },
  timelineTime: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  timelineActivity: {
    fontSize: 15,
    color: '#FFF',
    marginBottom: 2,
  },
  timelineDuration: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  tagsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 8,
  },
  tag: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tagText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  bottomGradient: {
    position: 'absolute',
    top: -40,
    left: 0,
    right: 0,
    bottom: 0,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    gap: 10,
  },
  startButtonDisabled: {
    opacity: 0.7,
  },
  startButtonGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  startButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#000',
  },
  startButtonTextDisabled: {
    color: '#888',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#FFF',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#000',
  },
});
