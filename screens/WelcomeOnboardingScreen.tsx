import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Sparkles, Target, Brain, Flame, Zap, Star, Check, TrendingUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth-store';
import { HabitFormationCurve } from '@/components/HabitFormationCurve';

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  accentColor: string;
  bgGradient: [string, string, string];
  features?: string[];
  customComponent?: 'habitCurve';
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Become Your\nBest Self',
    subtitle: 'Transform your life with smart planning, daily habits, and AI-powered guidance',
    image: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=600&q=80',
    icon: Sparkles,
    accentColor: '#F59E0B',
    bgGradient: ['#0C0C0C', '#1C1410', '#0C0C0C'],
  },
  {
    id: '2',
    title: '',
    subtitle: '',
    image: '',
    icon: TrendingUp,
    accentColor: '#FFD700',
    bgGradient: ['#0C0C0C', '#0C0C0C', '#0C0C0C'],
    customComponent: 'habitCurve',
  },
  {
    id: '3',
    title: 'Achieve Goals\nEvery Day',
    subtitle: 'Break down big dreams into small steps and celebrate every victory along the way',
    image: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&q=80',
    icon: Target,
    accentColor: '#EF4444',
    bgGradient: ['#0C0C0C', '#1C1014', '#0C0C0C'],
  },
  {
    id: '4',
    title: 'AI-Powered\nPlanning',
    subtitle: 'Your personal assistant creates the perfect plan tailored to your unique goals',
    image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&q=80',
    icon: Brain,
    accentColor: '#10B981',
    bgGradient: ['#0C0C0C', '#101C18', '#0C0C0C'],
  },
  {
    id: '5',
    title: 'Focus &\nMindfulness',
    subtitle: 'Meditations, breathing exercises, and focus timers for peak productivity',
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80',
    icon: Flame,
    accentColor: '#8B5CF6',
    bgGradient: ['#0C0C0C', '#14101C', '#0C0C0C'],
  },
  {
    id: '6',
    title: 'Welcome to\nGoalCoach AI',
    subtitle: 'Your journey to success, health, and inner harmony starts now',
    image: 'https://images.unsplash.com/photo-1533227268428-f9ed0900fb3b?w=600&q=80',
    icon: Zap,
    accentColor: '#F59E0B',
    bgGradient: ['#0C0C0C', '#1C1410', '#0C0C0C'],
    features: ['Smart AI Planning', 'Daily Challenges', 'Focus Timer', 'Progress Tracking'],
  },
];

export function WelcomeOnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slideRef = useRef<Animated.FlatList<OnboardingSlide>>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { setWelcomeOnboardingCompleted } = useAuth();

  useEffect(() => {
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    floatAnimation.start();

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

    return () => {
      floatAnimation.stop();
      pulseAnimation.stop();
    };
  }, [floatAnim, pulseAnim]);

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
      router.replace('/auth');
    });
  }, [fadeAnim, setWelcomeOnboardingCompleted]);

  const handleNext = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.92,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();

    if (currentIndex < slides.length - 1) {
      slideRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      setCurrentIndex(currentIndex + 1);
    } else {
      handleComplete();
    }
  }, [currentIndex, buttonScale, handleComplete]);

  const handleSkip = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setWelcomeOnboardingCompleted(true);
    router.replace('/auth');
  }, [setWelcomeOnboardingCompleted]);

  const renderSlide = useCallback(({ item, index }: { item: OnboardingSlide; index: number }) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

    const imageScale = scrollX.interpolate({
      inputRange,
      outputRange: [0.86, 1, 0.86],
      extrapolate: 'clamp',
    });

    const imageOpacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.35, 1, 0.35],
      extrapolate: 'clamp',
    });

    const textTranslateY = scrollX.interpolate({
      inputRange,
      outputRange: [36, 0, 36],
      extrapolate: 'clamp',
    });

    const textOpacity = scrollX.interpolate({
      inputRange,
      outputRange: [0, 1, 0],
      extrapolate: 'clamp',
    });

    const IconComponent = item.icon;
    const isLastSlide = index === slides.length - 1;

    const floatTranslate = floatAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -10],
    });

    if (item.customComponent === 'habitCurve') {
      return (
        <View style={styles.slide} testID={`welcome-slide-${item.id}`}>
          <LinearGradient
            colors={item.bgGradient}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
          <View style={styles.habitCurveContainer}>
            <HabitFormationCurve />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.slide} testID={`welcome-slide-${item.id}`}>
        <LinearGradient
          colors={item.bgGradient}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        <View style={styles.slideContent}>
          <Animated.View
            style={[
              styles.imageContainer,
              {
                transform: [{ scale: imageScale }, { translateY: floatTranslate }],
                opacity: imageOpacity,
              },
            ]}
          >
            <View style={[styles.imageGlow, { backgroundColor: `${item.accentColor}12` }]} />
            <View style={[styles.imageOuterRing, { borderColor: `${item.accentColor}18` }]}>
              <View style={[styles.imageInnerRing, { borderColor: `${item.accentColor}2B` }]}>
                <Image source={{ uri: item.image }} style={styles.slideImage} resizeMode="cover" />
                <LinearGradient
                  colors={['transparent', `${item.bgGradient[1]}CC`, item.bgGradient[1]]}
                  style={styles.imageOverlay}
                  start={{ x: 0.5, y: 0.5 }}
                  end={{ x: 0.5, y: 1 }}
                />
              </View>
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.textContainer,
              {
                transform: [{ translateY: textTranslateY }],
                opacity: textOpacity,
              },
            ]}
          >
            <View style={[styles.textCard, { borderColor: `${item.accentColor}1F` }]}>
              <View style={styles.textCardHeader}>
                <Animated.View style={[styles.iconBadge, { transform: [{ scale: pulseAnim }] }]}>
                  <LinearGradient
                    colors={[item.accentColor, `${item.accentColor}CC`]}
                    style={styles.iconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <IconComponent size={20} color="#000" />
                  </LinearGradient>
                </Animated.View>

                <View style={styles.paginationInline} testID="welcome-pagination">
                  {slides.map((s, dotIndex) => {
                    const isActive = dotIndex === index;
                    return (
                      <View
                        key={s.id}
                        style={[
                          styles.dot,
                          {
                            width: isActive ? 34 : 8,
                            opacity: isActive ? 1 : 0.25,
                            backgroundColor: item.accentColor,
                          },
                        ]}
                      />
                    );
                  })}
                </View>
              </View>

              <Text style={styles.slideTitle}>{item.title}</Text>
              <Text style={styles.slideSubtitle}>{item.subtitle}</Text>

              {isLastSlide && item.features && (
                <View style={styles.featuresContainer}>
                  {item.features.map((feature, idx) => (
                    <View key={idx} style={styles.featureItem}>
                      <View style={[styles.featureIcon, { backgroundColor: `${item.accentColor}1F` }]}>
                        <Check size={14} color={item.accentColor} />
                      </View>
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </Animated.View>
        </View>
      </View>
    );
  }, [scrollX, floatAnim, pulseAnim]);

  const currentSlide = slides[currentIndex];
  const isLastSlide = currentIndex === slides.length - 1;

  const ctaGradientColors = useMemo<[string, string]>(() => {
    return [currentSlide.accentColor, `${currentSlide.accentColor}DD`];
  }, [currentSlide.accentColor]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={currentSlide.bgGradient}
        style={StyleSheet.absoluteFillObject}
      />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.logoContainer} testID="welcome-brand">
            <LinearGradient
              colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
              style={styles.logoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Target size={18} color="#000" />
            </LinearGradient>
            <Text style={styles.logoText}>GoalCoach AI</Text>
          </View>

          {!isLastSlide && (
            <TouchableOpacity
              onPress={handleSkip}
              style={styles.skipButton}
              activeOpacity={0.8}
              testID="welcome-skip"
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      <Animated.FlatList
        ref={slideRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
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

      <SafeAreaView style={styles.footer} edges={['bottom']}>
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            onPress={handleNext}
            activeOpacity={0.92}
            style={styles.buttonWrapper}
            testID="welcome-continue"
          >
            <LinearGradient
              colors={ctaGradientColors}
              style={styles.nextButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.nextButtonText}>{isLastSlide ? 'Get Started' : 'Continue'}</Text>
              {!isLastSlide && <ChevronRight size={20} color="#000" strokeWidth={2.5} />}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {isLastSlide && (
          <View style={styles.statsContainer} testID="welcome-stats">
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Star size={16} color={currentSlide.accentColor} fill={currentSlide.accentColor} />
              </View>
              <Text style={[styles.statNumber, { color: currentSlide.accentColor }]}>50K+</Text>
              <Text style={styles.statLabel}>Users</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Star size={16} color={currentSlide.accentColor} fill={currentSlide.accentColor} />
              </View>
              <Text style={[styles.statNumber, { color: currentSlide.accentColor }]}>4.9</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Target size={16} color={currentSlide.accentColor} />
              </View>
              <Text style={[styles.statNumber, { color: currentSlide.accentColor }]}>1M+</Text>
              <Text style={styles.statLabel}>Goals</Text>
            </View>
          </View>
        )}

        <Text style={styles.termsText} testID="welcome-terms">
          By continuing, you agree to our Terms of Service
        </Text>
      </SafeAreaView>
    </Animated.View>
  );
}

const FOOTER_MIN_HEIGHT = 156;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0C0C',
  },
  safeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoGradient: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFF',
    letterSpacing: 0.3,
  },
  skipButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  skipText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600' as const,
  },
  slide: {
    width,
    height,
  },
  habitCurveContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 100,
    paddingBottom: FOOTER_MIN_HEIGHT + 20,
  },
  slideContent: {
    flex: 1,
    paddingTop: 104,
    paddingBottom: FOOTER_MIN_HEIGHT,
  },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  imageGlow: {
    position: 'absolute',
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: width * 0.45,
  },
  imageOuterRing: {
    padding: 4,
    borderRadius: width * 0.42,
    borderWidth: 1,
  },
  imageInnerRing: {
    padding: 3,
    borderRadius: width * 0.4,
    borderWidth: 1,
    overflow: 'hidden',
  },
  slideImage: {
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: width * 0.375,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: width * 0.375,
  },
  textContainer: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    alignItems: 'center',
  },
  textCard: {
    width: '100%',
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
  },
  textCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  paginationInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconBadge: {
    marginBottom: 0,
  },
  iconGradient: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideTitle: {
    fontSize: 34,
    fontWeight: '800' as const,
    color: '#FFF',
    textAlign: 'left',
    lineHeight: 42,
    marginBottom: 10,
    letterSpacing: -0.6,
  },
  slideSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.70)',
    textAlign: 'left',
    lineHeight: 22,
  },
  featuresContainer: {
    marginTop: 18,
    width: '100%',
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  featureIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500' as const,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 12,
    minHeight: FOOTER_MIN_HEIGHT,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  buttonWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 36,
    borderRadius: 18,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#000',
    letterSpacing: 0.3,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statIconContainer: {
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800' as const,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  termsText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: 14,
  },
});

export default WelcomeOnboardingScreen;
