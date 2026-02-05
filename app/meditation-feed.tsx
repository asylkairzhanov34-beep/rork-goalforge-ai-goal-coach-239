import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import type { Video as VideoType } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { X, ChevronDown, Play, Pause } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { MEDITATION_SLIDES, MeditationSlide } from '@/constants/meditation-slides';
import { theme } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SlideItemProps {
  item: MeditationSlide;
  index: number;
  isActive: boolean;
  onComplete: () => void;
  isLastSlide: boolean;
}

function SlideItem({ item, index, isActive, onComplete, isLastSlide }: SlideItemProps) {
  const [timeLeft, setTimeLeft] = useState(item.duration);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<VideoType>(null);

  useEffect(() => {
    if (isActive) {
      setTimeLeft(item.duration);
      setIsComplete(false);
      setIsPaused(false);
      progressAnim.setValue(0);
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.timing(progressAnim, {
        toValue: 1,
        duration: item.duration * 1000,
        useNativeDriver: false,
      }).start();

      if (videoRef.current) {
        videoRef.current.playAsync();
      }
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.95);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (videoRef.current) {
        videoRef.current.pauseAsync();
        videoRef.current.setPositionAsync(0);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive, item.duration, fadeAnim, progressAnim, scaleAnim]);

  useEffect(() => {
    if (isActive && !isPaused && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            setIsComplete(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive, isPaused, timeLeft]);

  const togglePause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsPaused(!isPaused);
    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.playAsync();
      } else {
        videoRef.current.pauseAsync();
      }
    }
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onComplete();
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.slideContainer}>
      <Video
        ref={videoRef}
        source={{ uri: item.videoUrl }}
        style={styles.slideVideo}
        resizeMode={ResizeMode.COVER}
        isLooping
        isMuted
        shouldPlay={isActive && !isPaused}
      />
      
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'transparent', 'transparent', 'rgba(0,0,0,0.7)']}
        locations={[0, 0.3, 0.6, 1]}
        style={styles.gradient}
      />

      <Animated.View 
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.topIndicator}>
          <View style={styles.progressBarContainer}>
            {MEDITATION_SLIDES.map((_, i) => (
              <View key={i} style={styles.progressBarBackground}>
                {i < index && <View style={[styles.progressBarFill, { width: '100%' }]} />}
                {i === index && (
                  <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
                )}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.centerContent}>
          <TouchableOpacity 
            style={styles.pauseButton} 
            onPress={togglePause}
            activeOpacity={0.8}
          >
            <View style={styles.pauseButtonInner}>
              {isPaused ? (
                <Play size={32} color="#fff" fill="#fff" />
              ) : (
                <Pause size={32} color="#fff" fill="#fff" />
              )}
            </View>
          </TouchableOpacity>

          {!isComplete && (
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>{timeLeft}s</Text>
            </View>
          )}
        </View>

        <View style={styles.bottomContent}>
          <Text style={styles.slideTitle}>{item.title}</Text>
          <Text style={styles.slideSubtitle}>{item.subtitle}</Text>

          {isComplete ? (
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[theme.colors.primary, '#E5C100']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.continueButtonGradient}
              >
                <Text style={styles.continueButtonText}>
                  {isLastSlide ? 'Start Focus' : 'Continue'}
                </Text>
                <ChevronDown size={20} color="#000" style={styles.continueIcon} />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={styles.waitContainer}>
              <View style={styles.waitButton}>
                <Text style={styles.waitText}>Wait for {timeLeft}s</Text>
              </View>
            </View>
          )}

          {!isLastSlide && isComplete && (
            <Text style={styles.swipeHint}>Swipe up for next</Text>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

export default function MeditationFeedScreen() {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index;
      if (newIndex !== null && newIndex !== undefined) {
        setActiveIndex(newIndex);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }, []);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handleSlideComplete = useCallback((index: number) => {
    console.log('[MeditationFeed] Slide completed:', index);
    
    if (index === MEDITATION_SLIDES.length - 1) {
      setTimeout(() => {
        router.replace('/timer');
      }, 300);
    } else {
      flatListRef.current?.scrollToIndex({
        index: index + 1,
        animated: true,
      });
    }
  }, []);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.back();
  };

  const renderItem = useCallback(({ item, index }: { item: MeditationSlide; index: number }) => (
    <SlideItem
      item={item}
      index={index}
      isActive={activeIndex === index}
      onComplete={() => handleSlideComplete(index)}
      isLastSlide={index === MEDITATION_SLIDES.length - 1}
    />
  ), [activeIndex, handleSlideComplete]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: SCREEN_HEIGHT,
    offset: SCREEN_HEIGHT * index,
    index,
  }), []);

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'fade',
        }} 
      />
      <StatusBar barStyle="light-content" />

      <FlatList
        ref={flatListRef}
        data={MEDITATION_SLIDES}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        horizontal={false}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getItemLayout}
        decelerationRate="fast"
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        bounces={false}
      />

      <TouchableOpacity
        style={[styles.closeButton, { top: insets.top + 16 }]}
        onPress={handleClose}
        activeOpacity={0.8}
      >
        <View style={styles.closeButtonInner}>
          <X size={24} color="#fff" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  slideContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'relative',
  },
  slideVideo: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topIndicator: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 16,
  },
  progressBarContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  progressBarBackground: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseButton: {
    marginBottom: 20,
  },
  pauseButtonInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  timerContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  timerText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
    letterSpacing: 1,
  },
  bottomContent: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
    alignItems: 'center',
  },
  slideTitle: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  slideSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '400' as const,
  },
  continueButton: {
    width: '100%',
    maxWidth: 280,
    borderRadius: 30,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  continueButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#000',
    letterSpacing: 0.5,
  },
  continueIcon: {
    marginLeft: 8,
    transform: [{ rotate: '-90deg' }],
  },
  waitContainer: {
    width: '100%',
    maxWidth: 280,
  },
  waitButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  waitText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  swipeHint: {
    marginTop: 16,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  closeButton: {
    position: 'absolute',
    left: 16,
    zIndex: 100,
  },
  closeButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
});
