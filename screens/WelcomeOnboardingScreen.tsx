import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar,
  useWindowDimensions,
  ScrollView,
  Linking,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Check, Crown, Zap, Brain, Target, Shield, BarChart3, Star, ChevronLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/use-auth-store';

interface ResearchItem {
  institution: string;
  year: string;
  title: string;
  description: string;
  logoUrl?: string;
  color: string;
}

interface ReviewItem {
  name: string;
  rating: number;
  text: string;
  date: string;
  avatarUrl?: string;
  verified?: boolean;
}

interface OnboardingSlide {
  id: string;
  tag?: string;
  title: string;
  subtitle: string;
  image: string;
  features?: { icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>; text: string }[];
  stats?: { value: string; label: string }[];
  type: 'hero' | 'feature' | 'social' | 'research' | 'reviews' | 'paywall';
  research?: ResearchItem[];
  reviews?: ReviewItem[];
}

const RESEARCH_DATA: ResearchItem[] = [
  {
    institution: 'Harvard Health Publishing',
    year: '2016, 2022',
    title: 'Harvard Health: Forming & Breaking Habits',
    description: 'Harvard Health explains the habit loop (reminder\u2013routine\u2013reward) and recommends replacing cues and routines to change behavior.',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/2/29/Harvard_shield_wreath.svg/1200px-Harvard_shield_wreath.svg.png',
    color: '#A51C30',
  },
  {
    institution: 'Stanford Behavior Design Lab',
    year: '2019',
    title: 'Stanford: Fogg Behavior Model',
    description: 'Behavior happens when Motivation, Ability, and a Prompt converge (B=MAP)\u2014design tiny, easy actions tied to prompts.',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Stanford_Cardinal_logo.svg/1200px-Stanford_Cardinal_logo.svg.png',
    color: '#8C1515',
  },
  {
    institution: 'Yale Psychology',
    year: '2018',
    title: 'Yale: Science of Well-Being',
    description: 'Yale\u2019s most popular course teaches practical habits (gratitude, meditation, kindness) to improve well-being and stick with change.',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Yale_University_logo.svg/2560px-Yale_University_logo.svg.png',
    color: '#00356B',
  },
  {
    institution: 'James Clear',
    year: '2018',
    title: 'Atomic Habits: Four Laws',
    description: 'Make it Obvious, Attractive, Easy, and Satisfying\u2014the four laws for building good habits and breaking bad ones.',
    logoUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=100&q=80',
    color: '#E8A838',
  },
  {
    institution: 'European Journal of Social Psychology',
    year: '2009',
    title: 'Phillippa Lally: 66-Day Habit Formation',
    description: 'Research shows it takes an average of 66 days for a new behavior to become automatic\u2014not the commonly cited 21 days.',
    logoUrl: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=100&q=80',
    color: '#2E86AB',
  },
];

const REVIEWS_DATA: ReviewItem[] = [
  {
    name: 'Anastasia K.',
    rating: 5,
    text: 'This app completely changed how I approach my goals. The AI planning is incredibly smart and the daily structure keeps me accountable.',
    date: '2 days ago',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80',
    verified: true,
  },
  {
    name: 'Michael T.',
    rating: 5,
    text: 'Finally an app that doesn\u2019t just set goals but actually helps you achieve them. The breathing exercises are a game changer for focus.',
    date: '5 days ago',
    verified: true,
  },
  {
    name: 'Elena V.',
    rating: 5,
    text: 'I\u2019ve tried dozens of habit trackers. This is the only one that stuck. The personalized challenges feel like they were made just for me.',
    date: '1 week ago',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80',
    verified: true,
  },
  {
    name: 'David L.',
    rating: 4,
    text: 'Great app for building discipline. I love how it adapts to my schedule and energy levels throughout the day.',
    date: '1 week ago',
    verified: true,
  },
  {
    name: 'Sarah M.',
    rating: 5,
    text: 'The meditation and reflection features helped me discover patterns I never noticed. My productivity has increased so much!',
    date: '2 weeks ago',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80',
  },
  {
    name: 'Alex R.',
    rating: 5,
    text: 'Simple, beautiful, and effective. The streak system keeps me motivated every single day.',
    date: '2 weeks ago',
  },
];

const slides: OnboardingSlide[] = [
  {
    id: '1',
    tag: 'YOUR JOURNEY BEGINS',
    title: 'Become Your\nBest Self',
    subtitle: 'AI-powered planning, daily habits, and mindfulness \u2014 all in one place.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
    type: 'hero',
  },
  {
    id: '2',
    tag: 'SMART PLANNING',
    title: 'AI Creates\nYour Plan',
    subtitle: 'Tell us your goal \u2014 our AI builds a personalized daily action plan just for you.',
    image: 'https://images.unsplash.com/photo-1504805572947-34fad45aed93?w=800&q=80',
    features: [
      { icon: Brain, text: 'Personalized AI strategy' },
      { icon: Target, text: 'Clear daily actions' },
      { icon: BarChart3, text: 'Adaptive difficulty' },
    ],
    type: 'feature',
  },
  {
    id: '3',
    tag: 'DAILY DISCIPLINE',
    title: 'Build Habits\nThat Last',
    subtitle: 'Science-backed approach to forming lasting habits in just 66 days.',
    image: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80',
    features: [
      { icon: Zap, text: 'Focus & breathing tools' },
      { icon: Shield, text: 'Streak protection' },
      { icon: Crown, text: 'Achievement rewards' },
    ],
    type: 'feature',
  },
  {
    id: '4',
    tag: 'RESEARCH USED IN THE APP',
    title: 'Science-backed\nself-improvement',
    subtitle: 'Inspired by research from Harvard, Yale, Stanford, and leading habit scientists.',
    image: '',
    type: 'research',
    research: RESEARCH_DATA,
  },
  {
    id: '5',
    tag: 'REAL RESULTS',
    title: 'Loved by\nthousands',
    subtitle: 'See what our users say about their transformation.',
    image: '',
    type: 'reviews',
    reviews: REVIEWS_DATA,
    stats: [
      { value: '50K+', label: 'Active Users' },
      { value: '4.9', label: 'App Rating' },
      { value: '1M+', label: 'Goals Set' },
    ],
  },
  {
    id: '6',
    title: 'Start Your\nTransformation',
    subtitle: 'Unlock the full power of GoalForge AI and take control of your life today.',
    image: 'https://images.unsplash.com/photo-1492681290082-e932832941e6?w=800&q=80',
    features: [
      { icon: Brain, text: 'Unlimited AI planning' },
      { icon: Target, text: 'Personalized challenges' },
      { icon: Zap, text: 'Focus & meditation tools' },
      { icon: Crown, text: 'Premium achievements' },
      { icon: BarChart3, text: 'Advanced analytics' },
    ],
    type: 'paywall',
  },
];

function ResearchCard({ item, index }: { item: ResearchItem; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: index * 120,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        delay: index * 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateY, index]);

  return (
    <Animated.View
      style={[
        researchStyles.card,
        {
          opacity: fadeAnim,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={researchStyles.cardHeader}>
        {item.logoUrl ? (
          <View style={[researchStyles.logoWrap, { backgroundColor: item.color + '20' }]}>
            <Image source={{ uri: item.logoUrl }} style={researchStyles.logo} resizeMode="contain" />
          </View>
        ) : (
          <View style={[researchStyles.logoWrap, { backgroundColor: item.color + '20' }]}>
            <Brain size={18} color={item.color} />
          </View>
        )}
        <Text style={researchStyles.institution} numberOfLines={1}>
          {item.institution} ({item.year})
        </Text>
      </View>
      <Text style={researchStyles.cardTitle}>{item.title}</Text>
      <Text style={researchStyles.cardDescription}>{item.description}</Text>
    </Animated.View>
  );
}

function ReviewCard({ item, index }: { item: ReviewItem; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 450,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateY, index]);

  return (
    <Animated.View
      style={[
        reviewStyles.card,
        {
          opacity: fadeAnim,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={reviewStyles.cardTop}>
        <View style={reviewStyles.userRow}>
          {item.avatarUrl ? (
            <Image source={{ uri: item.avatarUrl }} style={reviewStyles.avatar} />
          ) : (
            <View style={reviewStyles.avatarPlaceholder}>
              <Text style={reviewStyles.avatarInitial}>
                {item.name.charAt(0)}
              </Text>
            </View>
          )}
          <View style={reviewStyles.userInfo}>
            <View style={reviewStyles.nameRow}>
              <Text style={reviewStyles.userName}>{item.name}</Text>
              {item.verified && (
                <View style={reviewStyles.verifiedBadge}>
                  <Check size={10} color="#000" strokeWidth={3} />
                </View>
              )}
            </View>
            <Text style={reviewStyles.date}>{item.date}</Text>
          </View>
        </View>
        <View style={reviewStyles.starsRow}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={13}
              color={i < item.rating ? '#FFD700' : 'rgba(255,255,255,0.15)'}
              fill={i < item.rating ? '#FFD700' : 'transparent'}
            />
          ))}
        </View>
      </View>
      <Text style={reviewStyles.reviewText}>{item.text}</Text>
    </Animated.View>
  );
}

export function WelcomeOnboardingScreen() {
  const { width, height } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slideRef = useRef<Animated.FlatList<OnboardingSlide>>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const { setWelcomeOnboardingCompleted } = useAuth();

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
  }, []);

  const handleComplete = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setWelcomeOnboardingCompleted(true);
      router.replace('/auth' as any);
    });
  }, [fadeAnim, setWelcomeOnboardingCompleted]);

  const handleNext = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.94,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 70,
        useNativeDriver: true,
      }),
    ]).start();

    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      slideRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      handleComplete();
    }
  }, [currentIndex, buttonScale, handleComplete]);

  const handleBack = useCallback(() => {
    if (currentIndex > 0) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const prevIndex = currentIndex - 1;
      slideRef.current?.scrollToIndex({ index: prevIndex, animated: true });
      setCurrentIndex(prevIndex);
    }
  }, [currentIndex]);

  const handleSkip = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setWelcomeOnboardingCompleted(true);
    router.replace('/auth' as any);
  }, [setWelcomeOnboardingCompleted]);

  const renderSlide = useCallback(({ item, index }: { item: OnboardingSlide; index: number }) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

    const contentTranslateY = scrollX.interpolate({
      inputRange,
      outputRange: [60, 0, 60],
      extrapolate: 'clamp',
    });

    const contentOpacity = scrollX.interpolate({
      inputRange,
      outputRange: [0, 1, 0],
      extrapolate: 'clamp',
    });

    if (item.type === 'research') {
      return (
        <View style={[styles.slide, { width, height }]} testID={`welcome-slide-${item.id}`}>
          <View style={researchStyles.bg} />

          <Animated.View
            style={[
              researchStyles.content,
              {
                transform: [{ translateY: contentTranslateY }],
                opacity: contentOpacity,
              },
            ]}
          >
            <SafeAreaView edges={['top']} style={researchStyles.safeTop}>
              <View style={researchStyles.headerSpacer} />

              {item.tag && (
                <View style={researchStyles.tagRow}>
                  <View style={researchStyles.tagDot} />
                  <Text style={researchStyles.tagText}>{item.tag}</Text>
                </View>
              )}

              <Text style={researchStyles.title}>{item.title}</Text>
              <Text style={researchStyles.subtitle}>{item.subtitle}</Text>

              <ScrollView
                style={researchStyles.scrollArea}
                contentContainerStyle={researchStyles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {item.research?.map((r, idx) => (
                  <ResearchCard key={idx} item={r} index={idx} />
                ))}
                <View style={{ height: 200 }} />
              </ScrollView>
            </SafeAreaView>
          </Animated.View>
        </View>
      );
    }

    if (item.type === 'reviews') {
      return (
        <View style={[styles.slide, { width, height }]} testID={`welcome-slide-${item.id}`}>
          <View style={reviewStyles.bg} />

          <Animated.View
            style={[
              reviewStyles.content,
              {
                transform: [{ translateY: contentTranslateY }],
                opacity: contentOpacity,
              },
            ]}
          >
            <SafeAreaView edges={['top']} style={reviewStyles.safeTop}>
              <View style={reviewStyles.headerSpacer} />

              {item.tag && (
                <View style={researchStyles.tagRow}>
                  <View style={[researchStyles.tagDot, { backgroundColor: '#FFD700' }]} />
                  <Text style={researchStyles.tagText}>{item.tag}</Text>
                </View>
              )}

              <Text style={reviewStyles.title}>{item.title}</Text>
              <Text style={reviewStyles.subtitle}>{item.subtitle}</Text>

              {item.stats && (
                <View style={reviewStyles.statsRow}>
                  {item.stats.map((stat, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <View style={reviewStyles.statDivider} />}
                      <View style={reviewStyles.statCell}>
                        <Text style={reviewStyles.statValue}>{stat.value}</Text>
                        <Text style={reviewStyles.statLabel}>{stat.label}</Text>
                      </View>
                    </React.Fragment>
                  ))}
                </View>
              )}

              <ScrollView
                style={reviewStyles.scrollArea}
                contentContainerStyle={reviewStyles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {item.reviews?.map((r, idx) => (
                  <ReviewCard key={idx} item={r} index={idx} />
                ))}
                <View style={{ height: 200 }} />
              </ScrollView>
            </SafeAreaView>
          </Animated.View>
        </View>
      );
    }

    const imageOpacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.3, 1, 0.3],
      extrapolate: 'clamp',
    });

    const isPaywall = item.type === 'paywall';

    return (
      <View style={[styles.slide, { width, height }]} testID={`welcome-slide-${item.id}`}>
        <Animated.View style={[styles.imageBackground, { opacity: imageOpacity }]}>
          <Image
            source={{ uri: item.image }}
            style={styles.bgImage}
            resizeMode="cover"
          />
        </Animated.View>

        <LinearGradient
          colors={[
            'rgba(0,0,0,0.15)',
            'rgba(0,0,0,0.3)',
            'rgba(0,0,0,0.75)',
            'rgba(0,0,0,0.92)',
            '#000000',
          ]}
          locations={[0, 0.25, 0.5, 0.7, 0.88]}
          style={styles.imageGradient}
        />

        <Animated.View
          style={[
            styles.slideContent,
            {
              transform: [{ translateY: contentTranslateY }],
              opacity: contentOpacity,
            },
          ]}
        >
          {item.tag && (
            <View style={styles.tagContainer}>
              <Text style={styles.tagText}>{item.tag}</Text>
            </View>
          )}

          <Text style={[styles.slideTitle, isPaywall && styles.slideTitlePaywall]}>
            {item.title}
          </Text>

          <Text style={styles.slideSubtitle}>{item.subtitle}</Text>

          {item.features && (
            <View style={[styles.featuresBlock, isPaywall && styles.featuresBlockPaywall]}>
              {item.features.map((feature, idx) => {
                const IconComp = feature.icon;
                return (
                  <View key={idx} style={styles.featureRow}>
                    <View style={[styles.featureIconWrap, isPaywall && styles.featureIconWrapPaywall]}>
                      {isPaywall ? (
                        <Check size={14} color="#FFD700" strokeWidth={3} />
                      ) : (
                        <IconComp size={15} color="rgba(255,255,255,0.9)" strokeWidth={1.8} />
                      )}
                    </View>
                    <Text style={styles.featureLabel}>{feature.text}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {item.stats && item.type === 'social' && (
            <View style={styles.statsRow}>
              {item.stats.map((stat, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <View style={styles.statDivider} />}
                  <View style={styles.statCell}>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          )}
        </Animated.View>
      </View>
    );
  }, [scrollX, width, height]);

  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Animated.FlatList
        ref={slideRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        scrollEnabled={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) => {
          const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(newIndex);
        }}
        bounces={false}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />

      <SafeAreaView style={styles.topOverlay} edges={['top']} pointerEvents="box-none">
        <View style={styles.header}>
          {currentIndex > 0 ? (
            <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
              <ChevronLeft size={22} color="rgba(255,255,255,0.7)" strokeWidth={2} />
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtn} />
          )}

          <View style={styles.progressBarContainer}>
            {slides.map((_, idx) => {
              const segmentWidth = scrollX.interpolate({
                inputRange: [(idx - 1) * width, idx * width, (idx + 1) * width],
                outputRange: [0, 1, 1],
                extrapolate: 'clamp',
              });
              return (
                <View key={idx} style={styles.progressSegmentBg}>
                  <Animated.View
                    style={[
                      styles.progressSegmentFill,
                      {
                        transform: [{ scaleX: segmentWidth }],
                      },
                    ]}
                  />
                </View>
              );
            })}
          </View>

          {!isLastSlide ? (
            <TouchableOpacity
              onPress={handleSkip}
              style={styles.skipBtn}
              activeOpacity={0.7}
              testID="welcome-skip"
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.skipBtn} />
          )}
        </View>
      </SafeAreaView>

      <SafeAreaView style={styles.bottomOverlay} edges={['bottom']} pointerEvents="box-none">
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)', 'rgba(0,0,0,0.98)']}
          style={styles.bottomGradient}
        />
        <View style={styles.footerContent}>
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              onPress={handleNext}
              activeOpacity={0.9}
              style={styles.ctaWrapper}
              testID="welcome-continue"
            >
              <LinearGradient
                colors={isLastSlide ? ['#FFD700', '#DAA520'] : ['#FFFFFF', '#F0F0F0']}
                style={styles.ctaButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={[styles.ctaText, isLastSlide && styles.ctaTextGold]}>
                  {isLastSlide ? 'Get Started' : 'Continue'}
                </Text>
                {!isLastSlide && (
                  <ChevronRight size={18} color="#000" strokeWidth={2.5} />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {isLastSlide && (
            <TouchableOpacity onPress={handleComplete} activeOpacity={0.7} style={styles.restoreBtn}>
              <Text style={styles.restoreText}>Restore purchase</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.termsText}>
            {isLastSlide
              ? '3-day free trial, then $4.99/week. Cancel anytime.'
              : <Text>By continuing, you agree to our{' '}
                  <Text style={{ textDecorationLine: 'underline' }} onPress={() => Linking.openURL('https://www.notion.so/TERMS-OF-USE-2c54e106d5d080f1b7bdce1028935488?source=copy_link')}>
                    Terms of Use
                  </Text>
                </Text>}
          </Text>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const researchStyles = StyleSheet.create({
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
  },
  safeTop: {
    flex: 1,
  },
  headerSpacer: {
    height: 56,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    marginBottom: 12,
  },
  tagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  title: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#FFF',
    lineHeight: 40,
    letterSpacing: -0.6,
    paddingHorizontal: 28,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 22,
    paddingHorizontal: 28,
    marginBottom: 24,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 12,
    paddingTop: 4,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  logoWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: 22,
    height: 22,
  },
  institution: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500' as const,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFF',
    marginBottom: 6,
    lineHeight: 22,
  },
  cardDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 20,
  },
});

const reviewStyles = StyleSheet.create({
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
  },
  safeTop: {
    flex: 1,
  },
  headerSpacer: {
    height: 56,
  },
  title: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#FFF',
    lineHeight: 40,
    letterSpacing: -0.6,
    paddingHorizontal: 28,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 22,
    paddingHorizontal: 28,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,215,0,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.1)',
    marginBottom: 20,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: '#FFD700',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '500' as const,
    marginTop: 3,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 10,
    paddingTop: 4,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,215,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFD700',
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
  },
  date: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 2,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  reviewText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 19,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  slide: {
  },
  imageBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  bgImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  slideContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    paddingBottom: 180,
  },
  tagContainer: {
    alignSelf: 'flex-start',
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(255,215,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#FFD700',
    letterSpacing: 1.5,
  },
  slideTitle: {
    fontSize: 38,
    fontWeight: '800' as const,
    color: '#FFF',
    lineHeight: 46,
    letterSpacing: -0.8,
    marginBottom: 14,
  },
  slideTitlePaywall: {
    fontSize: 36,
  },
  slideSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 24,
    letterSpacing: 0.1,
  },
  featuresBlock: {
    marginTop: 24,
    gap: 14,
  },
  featuresBlockPaywall: {
    marginTop: 20,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  featureIconWrapPaywall: {
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderColor: 'rgba(255,215,0,0.15)',
  },
  featureLabel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500' as const,
    letterSpacing: 0.1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
    paddingVertical: 20,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: '#FFD700',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500' as const,
    marginTop: 4,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    height: 3,
  },
  progressSegmentBg: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  progressSegmentFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 1.5,
    transformOrigin: 'left center',
  },
  skipBtn: {
    width: 50,
    alignItems: 'flex-end',
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500' as const,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 180,
  },
  footerContent: {
    paddingHorizontal: 28,
    paddingBottom: 8,
  },
  ctaWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    borderRadius: 16,
    gap: 6,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#000',
    letterSpacing: 0.2,
  },
  ctaTextGold: {
    color: '#000',
  },
  restoreBtn: {
    alignSelf: 'center',
    marginTop: 14,
    paddingVertical: 4,
  },
  restoreText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '500' as const,
  },
  termsText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16,
  },
});

export default WelcomeOnboardingScreen;
