import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  Search, 
  Filter, 
  Flame, 
  Star, 
  Users, 
  Clock, 
  ChevronRight,
  Dumbbell,
  Rocket,
  Smartphone,
  BookOpen,
  Heart,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/constants/theme';
import { useChallengeStore } from '@/hooks/use-challenge-store';
import { CHALLENGE_CATEGORIES, DURATION_FILTERS, getPopularChallenges, getNewChallenges } from '@/constants/challenges';
import { ChallengeTemplate, ChallengeCategory } from '@/types/challenge';

const getCategoryIcon = (iconName: string, size: number, color: string) => {
  const icons: Record<string, React.ReactNode> = {
    'Dumbbell': <Dumbbell size={size} color={color} />,
    'Rocket': <Rocket size={size} color={color} />,
    'Smartphone': <Smartphone size={size} color={color} />,
    'BookOpen': <BookOpen size={size} color={color} />,
    'Heart': <Heart size={size} color={color} />,
    'Flame': <Flame size={size} color={color} />,
    'Leaf': <Zap size={size} color={color} />,
    'Activity': <Zap size={size} color={color} />,
    'PersonStanding': <Dumbbell size={size} color={color} />,
    'Sunrise': <Sparkles size={size} color={color} />,
    'Clock': <Clock size={size} color={color} />,
    'Target': <Trophy size={size} color={color} />,
    'Ban': <Smartphone size={size} color={color} />,
    'Code': <BookOpen size={size} color={color} />,
    'Languages': <BookOpen size={size} color={color} />,
  };
  return icons[iconName] || <Flame size={size} color={color} />;
};

const formatParticipants = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
  return count.toString();
};

interface ChallengeCardProps {
  challenge: ChallengeTemplate;
  onPress: () => void;
}

const ChallengeCard = React.memo(({ challenge, onPress }: ChallengeCardProps) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.challengeCard}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        {challenge.image ? (
          <ImageBackground
            source={{ uri: challenge.image }}
            style={styles.cardImage}
            imageStyle={styles.cardImageStyle}
          >
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
              locations={[0, 0.4, 1]}
              style={styles.imageOverlay}
            />
            <View style={styles.cardBadgesOverlay}>
              <View style={[styles.iconContainerSmall, { backgroundColor: challenge.color }]}>
                {getCategoryIcon(challenge.icon, 16, '#FFF')}
              </View>
              {challenge.isPopular && (
                <View style={[styles.badge, styles.popularBadge]}>
                  <Flame size={10} color="#FF6B6B" />
                  <Text style={styles.badgeText}>Popular</Text>
                </View>
              )}
              {challenge.isNew && (
                <View style={[styles.badge, styles.newBadge]}>
                  <Sparkles size={10} color="#4ECDC4" />
                  <Text style={[styles.badgeText, { color: '#4ECDC4' }]}>New</Text>
                </View>
              )}
            </View>
            <View style={styles.cardContentOverlay}>
              <Text style={styles.cardTitleOverlay}>{challenge.name}</Text>
              <Text style={styles.cardDescriptionOverlay} numberOfLines={2}>
                {challenge.shortDescription}
              </Text>
              <View style={styles.cardStats}>
                <View style={styles.statItem}>
                  <Clock size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.statTextLight}>{challenge.durationDays}d</Text>
                </View>
                <View style={styles.statItem}>
                  <Star size={14} color="#FFD700" />
                  <Text style={styles.statTextLight}>{challenge.rating}</Text>
                </View>
                <View style={styles.statItem}>
                  <Users size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.statTextLight}>{formatParticipants(challenge.participantsCount)}</Text>
                </View>
              </View>
              <View style={styles.cardFooter}>
                <View style={[
                  styles.difficultyBadge,
                  challenge.difficulty === 'beginner' && styles.beginnerBadge,
                  challenge.difficulty === 'intermediate' && styles.intermediateBadge,
                  challenge.difficulty === 'advanced' && styles.advancedBadge,
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
                <ChevronRight size={20} color="rgba(255,255,255,0.7)" />
              </View>
            </View>
          </ImageBackground>
        ) : (
          <>
            <LinearGradient
              colors={[challenge.color + '20', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            />
            
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: challenge.color + '30' }]}>
                {getCategoryIcon(challenge.icon, 24, challenge.color)}
              </View>
              
              <View style={styles.cardBadges}>
                {challenge.isPopular && (
                  <View style={[styles.badge, styles.popularBadge]}>
                    <Flame size={10} color="#FF6B6B" />
                    <Text style={styles.badgeText}>Popular</Text>
                  </View>
                )}
                {challenge.isNew && (
                  <View style={[styles.badge, styles.newBadge]}>
                    <Sparkles size={10} color="#4ECDC4" />
                    <Text style={[styles.badgeText, { color: '#4ECDC4' }]}>New</Text>
                  </View>
                )}
              </View>
            </View>

            <Text style={styles.cardTitle}>{challenge.name}</Text>
            <Text style={styles.cardDescription} numberOfLines={2}>
              {challenge.shortDescription}
            </Text>

            <View style={styles.cardStats}>
              <View style={styles.statItem}>
                <Clock size={14} color={theme.colors.textSecondary} />
                <Text style={styles.statText}>{challenge.durationDays} days</Text>
              </View>
              <View style={styles.statItem}>
                <Star size={14} color="#FFD700" />
                <Text style={styles.statText}>{challenge.rating}</Text>
              </View>
              <View style={styles.statItem}>
                <Users size={14} color={theme.colors.textSecondary} />
                <Text style={styles.statText}>{formatParticipants(challenge.participantsCount)}</Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <View style={[
                styles.difficultyBadge,
                challenge.difficulty === 'beginner' && styles.beginnerBadge,
                challenge.difficulty === 'intermediate' && styles.intermediateBadge,
                challenge.difficulty === 'advanced' && styles.advancedBadge,
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
              <ChevronRight size={20} color={theme.colors.textSecondary} />
            </View>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

ChallengeCard.displayName = 'ChallengeCard';

export default function ChallengesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { templates, getActiveChallenge } = useChallengeStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ChallengeCategory | 'all'>('all');
  const [selectedDuration, setSelectedDuration] = useState('all');

  const activeChallenge = getActiveChallenge();

  const filteredChallenges = useMemo(() => {
    return templates.filter(challenge => {
      const matchesSearch = challenge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        challenge.shortDescription.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || challenge.category === selectedCategory;
      
      let matchesDuration = true;
      if (selectedDuration === 'short') matchesDuration = challenge.durationDays <= 14;
      else if (selectedDuration === 'medium') matchesDuration = challenge.durationDays > 14 && challenge.durationDays <= 30;
      else if (selectedDuration === 'long') matchesDuration = challenge.durationDays > 30;
      
      return matchesSearch && matchesCategory && matchesDuration;
    });
  }, [templates, searchQuery, selectedCategory, selectedDuration]);

  const popularChallenges = useMemo(() => getPopularChallenges(), []);
  const newChallenges = useMemo(() => getNewChallenges(), []);

  const handleChallengePress = useCallback((challengeId: string) => {
    router.push(`/challenge-detail?id=${challengeId}` as any);
  }, [router]);

  const handleActiveChallengePress = useCallback(() => {
    if (activeChallenge) {
      router.push(`/challenge-active?id=${activeChallenge.id}` as any);
    }
  }, [activeChallenge, router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['#0A0A0A', '#000000']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Challenges</Text>
        <Text style={styles.headerSubtitle}>
          Transform your life with proven programs
        </Text>
      </View>

      {activeChallenge && (
        <TouchableOpacity 
          style={styles.activeChallengeCard}
          onPress={handleActiveChallengePress}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FFD700', '#FFA500']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.activeGradient}
          />
          <View style={styles.activeContent}>
            <View style={styles.activeIconWrap}>
              <Trophy size={24} color="#000" />
            </View>
            <View style={styles.activeInfo}>
              <Text style={styles.activeLabel}>Active Challenge</Text>
              <Text style={styles.activeName}>{activeChallenge.name}</Text>
              <Text style={styles.activeProgress}>
                Day {activeChallenge.currentDay} of {activeChallenge.totalDays}
              </Text>
            </View>
            <ChevronRight size={24} color="#000" />
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search challenges..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContent}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            selectedCategory === 'all' && styles.categoryChipActive
          ]}
          onPress={() => setSelectedCategory('all')}
        >
          <Filter size={16} color={selectedCategory === 'all' ? '#000' : theme.colors.textSecondary} />
          <Text style={[
            styles.categoryChipText,
            selectedCategory === 'all' && styles.categoryChipTextActive
          ]}>All</Text>
        </TouchableOpacity>
        
        {CHALLENGE_CATEGORIES.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              selectedCategory === category.id && styles.categoryChipActive,
              selectedCategory === category.id && { backgroundColor: category.color }
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            {getCategoryIcon(category.icon, 16, selectedCategory === category.id ? '#000' : category.color)}
            <Text style={[
              styles.categoryChipText,
              selectedCategory === category.id && styles.categoryChipTextActive
            ]}>{category.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.durationScroll}
        contentContainerStyle={styles.durationContent}
      >
        {DURATION_FILTERS.map(filter => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.durationChip,
              selectedDuration === filter.id && styles.durationChipActive
            ]}
            onPress={() => setSelectedDuration(filter.id)}
          >
            <Text style={[
              styles.durationChipText,
              selectedDuration === filter.id && styles.durationChipTextActive
            ]}>{filter.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.challengesList}
        contentContainerStyle={styles.challengesContent}
        showsVerticalScrollIndicator={false}
      >
        {searchQuery === '' && selectedCategory === 'all' && selectedDuration === 'all' && (
          <>
            {popularChallenges.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Flame size={20} color="#FF6B6B" />
                  <Text style={styles.sectionTitle}>Popular</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalList}
                >
                  {popularChallenges.slice(0, 5).map(challenge => (
                    <View key={challenge.id} style={styles.horizontalCardWrapper}>
                      <ChallengeCard
                        challenge={challenge}
                        onPress={() => handleChallengePress(challenge.id)}
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {newChallenges.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Sparkles size={20} color="#4ECDC4" />
                  <Text style={styles.sectionTitle}>New</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalList}
                >
                  {newChallenges.map(challenge => (
                    <View key={challenge.id} style={styles.horizontalCardWrapper}>
                      <ChallengeCard
                        challenge={challenge}
                        onPress={() => handleChallengePress(challenge.id)}
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Trophy size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>
              {searchQuery || selectedCategory !== 'all' || selectedDuration !== 'all' 
                ? `Results (${filteredChallenges.length})` 
                : 'All Challenges'}
            </Text>
          </View>
          
          {filteredChallenges.length === 0 ? (
            <View style={styles.emptyState}>
              <Search size={48} color={theme.colors.textSecondary} />
              <Text style={styles.emptyText}>No challenges found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {filteredChallenges.map(challenge => (
                <View key={challenge.id} style={styles.gridItem}>
                  <ChallengeCard
                    challenge={challenge}
                    onPress={() => handleChallengePress(challenge.id)}
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#FFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  activeChallengeCard: {
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  activeGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  activeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  activeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  activeLabel: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.6)',
    fontWeight: '600' as const,
  },
  activeName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#000',
  },
  activeProgress: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.7)',
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#FFF',
  },
  categoriesScroll: {
    maxHeight: 44,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryChipText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500' as const,
  },
  categoryChipTextActive: {
    color: '#000',
  },
  durationScroll: {
    maxHeight: 36,
    marginTop: 8,
  },
  durationContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  durationChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  durationChipActive: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.primary,
  },
  durationChipText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  durationChipTextActive: {
    color: theme.colors.primary,
  },
  challengesList: {
    flex: 1,
    marginTop: 16,
  },
  challengesContent: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  horizontalList: {
    gap: 12,
  },
  horizontalCardWrapper: {
    width: 280,
  },
  gridContainer: {
    gap: 12,
  },
  gridItem: {
    marginBottom: 4,
  },
  challengeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  cardImage: {
    minHeight: 200,
    justifyContent: 'space-between',
  },
  cardImageStyle: {
    borderRadius: 15,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 15,
  },
  cardBadgesOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  iconContainerSmall: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContentOverlay: {
    padding: 12,
    paddingTop: 0,
  },
  cardTitleOverlay: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardDescriptionOverlay: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
    marginBottom: 10,
  },
  statTextLight: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    padding: 16,
    paddingBottom: 0,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  popularBadge: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
  },
  newBadge: {
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#FF6B6B',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFF',
    marginBottom: 6,
    paddingHorizontal: 16,
  },
  cardDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  cardStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardFooterPadded: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  beginnerBadge: {
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
  },
  intermediateBadge: {
    backgroundColor: 'rgba(243, 156, 18, 0.15)',
  },
  advancedBadge: {
    backgroundColor: 'rgba(231, 76, 60, 0.15)',
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFF',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
});
