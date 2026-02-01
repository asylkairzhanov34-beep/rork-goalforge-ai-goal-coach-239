import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Lock, Check } from 'lucide-react-native';
import { theme } from '@/constants/theme';

const BADGE_SIZE = 64;

interface Badge {
  id: string;
  name: string;
  description: string;
  image: string;
  glowColor: string;
  unlocked: boolean;
  day: number;
}

const LOCKED_BADGE_IMAGE = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/sk1r1nl3gips4j9givtp3';

const BADGES: Badge[] = [
  {
    id: 'day_1',
    name: 'First Step',
    description: 'Day 1',
    image: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/susjcyiqbtspos2xl4kxt',
    glowColor: '#00D9A5',
    unlocked: true,
    day: 1,
  },
  {
    id: 'day_7',
    name: 'Week Warrior',
    description: 'Day 7',
    image: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/lap1jdwknz936q0b5emjq',
    glowColor: '#8B5CF6',
    unlocked: true,
    day: 7,
  },
  {
    id: 'day_14',
    name: 'Dedicated',
    description: 'Day 14',
    image: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/peqetu1lxlxgdbwnu5sc7',
    glowColor: '#F59E0B',
    unlocked: false,
    day: 14,
  },
  {
    id: 'day_30',
    name: 'Champion',
    description: 'Day 30',
    image: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/ch2kqakvsk8ztagnm6y4c',
    glowColor: '#EC4899',
    unlocked: false,
    day: 30,
  },
  {
    id: 'day_60',
    name: 'Legend',
    description: 'Day 60',
    image: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/susjcyiqbtspos2xl4kxt',
    glowColor: '#FFD700',
    unlocked: false,
    day: 60,
  },
];

interface AchievementBadgesProps {
  onBadgePress?: (badge: Badge) => void;
  currentStreak?: number;
}

export const AchievementBadges: React.FC<AchievementBadgesProps> = ({ 
  onBadgePress,
  currentStreak = 0 
}) => {
  const pulseAnims = useRef(BADGES.map(() => new Animated.Value(1))).current;
  const glowAnims = useRef(BADGES.map(() => new Animated.Value(0.3))).current;

  useEffect(() => {
    BADGES.forEach((badge, index) => {
      if (badge.unlocked) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnims[index], {
              toValue: 1.05,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnims[index], {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
          ])
        ).start();

        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnims[index], {
              toValue: 0.6,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnims[index], {
              toValue: 0.3,
              duration: 1500,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    });
  }, [pulseAnims, glowAnims]);

  const handleBadgePress = (badge: Badge) => {
    console.log('[AchievementBadges] Badge pressed:', badge.name);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onBadgePress?.(badge);
  };

  const unlockedCount = BADGES.filter(b => b.unlocked).length;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(255,215,0,0.08)', 'rgba(255,215,0,0.02)', 'transparent']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.subtitle}>{unlockedCount}/{BADGES.length} unlocked</Text>
        </View>
        <View style={styles.streakBadge}>
          <Text style={styles.streakNumber}>{currentStreak}</Text>
          <Text style={styles.streakLabel}>day streak</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
      >
        {BADGES.map((badge, index) => {
          const isUnlocked = badge.unlocked;
          const isNext = !isUnlocked && (index === 0 || BADGES[index - 1].unlocked);

          return (
            <TouchableOpacity
              key={badge.id}
              onPress={() => handleBadgePress(badge)}
              activeOpacity={0.8}
              style={styles.badgeWrapper}
            >
              <View style={[
                styles.badgeCard,
                isUnlocked && styles.badgeCardUnlocked,
                isNext && styles.badgeCardNext,
              ]}>
                {isUnlocked && (
                  <Animated.View
                    style={[
                      styles.glowEffect,
                      {
                        backgroundColor: badge.glowColor,
                        opacity: glowAnims[index],
                      },
                    ]}
                  />
                )}
                
                <Animated.View
                  style={[
                    styles.badgeImageContainer,
                    isUnlocked && {
                      transform: [{ scale: pulseAnims[index] }],
                    },
                  ]}
                >
                  <Image
                    source={{ uri: isUnlocked ? badge.image : LOCKED_BADGE_IMAGE }}
                    style={[
                      styles.badgeImage,
                      !isUnlocked && styles.badgeImageLocked,
                    ]}
                    resizeMode="cover"
                  />
                  
                  {isUnlocked && (
                    <View style={[styles.checkBadge, { backgroundColor: badge.glowColor }]}>
                      <Check size={10} color="#000" strokeWidth={3} />
                    </View>
                  )}
                  
                  {!isUnlocked && (
                    <View style={styles.lockOverlay}>
                      <Lock size={16} color="rgba(255,255,255,0.6)" />
                    </View>
                  )}
                </Animated.View>

                <Text style={[
                  styles.dayText,
                  isUnlocked && styles.dayTextUnlocked,
                ]}>
                  Day {badge.day}
                </Text>
                
                <Text style={[
                  styles.badgeName,
                  isUnlocked && styles.badgeNameUnlocked,
                ]} numberOfLines={1}>
                  {badge.name}
                </Text>
              </View>

              {index < BADGES.length - 1 && (
                <View style={styles.connector}>
                  <View style={[
                    styles.connectorLine,
                    isUnlocked && BADGES[index + 1]?.unlocked && styles.connectorLineActive,
                  ]} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.15)',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  streakBadge: {
    backgroundColor: 'rgba(255,215,0,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.25)',
  },
  streakNumber: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: theme.colors.primary,
  },
  streakLabel: {
    fontSize: 10,
    color: 'rgba(255,215,0,0.7)',
    marginTop: -2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
  },
  badgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeCard: {
    width: 80,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  badgeCardUnlocked: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,215,0,0.2)',
  },
  badgeCardNext: {
    borderColor: 'rgba(255,255,255,0.15)',
    borderStyle: 'dashed' as const,
  },
  glowEffect: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    height: 40,
    borderRadius: 20,
    transform: [{ scaleX: 1.2 }],
  },
  badgeImageContainer: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  badgeImage: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
  },
  badgeImageLocked: {
    opacity: 0.7,
  },
  checkBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  lockOverlay: {
    position: 'absolute',
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 2,
  },
  dayTextUnlocked: {
    color: theme.colors.primary,
  },
  badgeName: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  badgeNameUnlocked: {
    color: '#FFFFFF',
  },
  connector: {
    width: 16,
    height: 2,
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  connectorLine: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 1,
  },
  connectorLineActive: {
    backgroundColor: theme.colors.primary,
  },
});

export default AchievementBadges;
