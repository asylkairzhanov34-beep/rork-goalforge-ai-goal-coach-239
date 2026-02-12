import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Check, Crown, Zap, Brain, Target, Shield, BarChart3 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/use-auth-store';

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  tag?: string;
  title: string;
  subtitle: string;
  image: string;
  features?: { icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>; text: string }[];
  stats?: { value: string; label: string }[];
  type: 'hero' | 'feature' | 'social' | 'paywall';
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    tag: 'YOUR JOURNEY BEGINS',
    title: 'Become Your\nBest Self',
    subtitle: 'AI-powered planning, daily habits, and mindfulness — all in one place.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
    type: 'hero',
  },
  {
    id: '2',
    tag: 'SMART PLANNING',
    title: 'AI Creates\nYour Plan',
    subtitle: 'Tell us your goal — our AI builds a personalized daily action plan just for you.',
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
    tag: 'TRUSTED BY THOUSANDS',
    title: 'Join 50,000+\nAchievers',
    subtitle: 'People who commit to their goals see real results within the first week.',
    image: 'https://images.unsplash.com/photo-1533227268428-f9ed0900fb3b?w=800&q=80',
    stats: [
      { value: '50K+', label: 'Active Users' },
      { value: '4.9', label: 'App Rating' },
      { value: '1M+', label: 'Goals Set' },
    ],
    type: 'social',
  },
  {
    id: '5',
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

export function WelcomeOnboardingScreen() {
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
      router.replace('/auth');
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

  const handleSkip = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setWelcomeOnboardingCompleted(true);
    router.replace('/auth');
  }, [setWelcomeOnboardingCompleted]);

  const renderSlide = useCallback(({ item, index }: { item: OnboardingSlide; index: number }) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

    const imageOpacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.3, 1, 0.3],
      extrapolate: 'clamp',
    });

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

    const isPaywall = item.type === 'paywall';

    return (
      <View style={styles.slide} testID={`welcome-slide-${item.id}`}>
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

          {item.stats && (
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
  }, [scrollX]);

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
          <View style={styles.paginationRow}>
            {slides.map((_, idx) => {
              const dotWidth = scrollX.interpolate({
                inputRange: [(idx - 1) * width, idx * width, (idx + 1) * width],
                outputRange: [6, 24, 6],
                extrapolate: 'clamp',
              });
              const dotOpacity = scrollX.interpolate({
                inputRange: [(idx - 1) * width, idx * width, (idx + 1) * width],
                outputRange: [0.25, 1, 0.25],
                extrapolate: 'clamp',
              });
              return (
                <Animated.View
                  key={idx}
                  style={[
                    styles.dot,
                    {
                      width: dotWidth,
                      opacity: dotOpacity,
                    },
                  ]}
                />
              );
            })}
          </View>

          {!isLastSlide && (
            <TouchableOpacity
              onPress={handleSkip}
              style={styles.skipBtn}
              activeOpacity={0.7}
              testID="welcome-skip"
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      <SafeAreaView style={styles.bottomOverlay} edges={['bottom']} pointerEvents="box-none">
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
              : 'By continuing, you agree to our Terms of Service'}
          </Text>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  slide: {
    width,
    height,
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
    paddingHorizontal: 28,
    paddingTop: 10,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFF',
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
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
