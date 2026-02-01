import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import type { Video as VideoType } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

const VIDEO_URL = 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769273122/0124_3_bdocck.mp4';

export default function VideoIntroScreen() {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoFinished, setVideoFinished] = useState(false);
  
  const videoRef = useRef<VideoType>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const lastVibrationTime = useRef(0);
  const videoDuration = useRef(0);

  const triggerProgressiveVibration = useCallback((progress: number, isPlaying: boolean) => {
    if (Platform.OS === 'web') return;
    if (!isPlaying) return;
    
    const now = Date.now();
    
    let interval: number;
    let style: Haptics.ImpactFeedbackStyle;
    
    if (progress >= 0.95) {
      interval = 40;
      style = Haptics.ImpactFeedbackStyle.Heavy;
    } else if (progress >= 0.9) {
      interval = 50;
      style = Haptics.ImpactFeedbackStyle.Heavy;
    } else if (progress >= 0.85) {
      interval = 60;
      style = Haptics.ImpactFeedbackStyle.Heavy;
    } else if (progress >= 0.8) {
      interval = 80;
      style = Haptics.ImpactFeedbackStyle.Heavy;
    } else if (progress >= 0.7) {
      interval = 100;
      style = Haptics.ImpactFeedbackStyle.Medium;
    } else if (progress >= 0.6) {
      interval = 120;
      style = Haptics.ImpactFeedbackStyle.Medium;
    } else if (progress >= 0.5) {
      interval = 140;
      style = Haptics.ImpactFeedbackStyle.Medium;
    } else if (progress >= 0.4) {
      interval = 160;
      style = Haptics.ImpactFeedbackStyle.Light;
    } else if (progress >= 0.3) {
      interval = 180;
      style = Haptics.ImpactFeedbackStyle.Light;
    } else if (progress >= 0.2) {
      interval = 200;
      style = Haptics.ImpactFeedbackStyle.Light;
    } else if (progress >= 0.1) {
      interval = 220;
      style = Haptics.ImpactFeedbackStyle.Light;
    } else {
      interval = 250;
      style = Haptics.ImpactFeedbackStyle.Light;
    }
    
    if (now - lastVibrationTime.current >= interval) {
      Haptics.impactAsync(style);
      lastVibrationTime.current = now;
    }
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleVideoLoad = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      if (!videoLoaded) {
        setVideoLoaded(true);
        console.log('[VideoIntro] Video loaded successfully');
      }
      
      if (status.durationMillis && status.durationMillis > 0) {
        videoDuration.current = status.durationMillis;
      }
      
      if (status.isPlaying && videoDuration.current > 0 && status.positionMillis && !videoFinished) {
        const progress = status.positionMillis / videoDuration.current;
        triggerProgressiveVibration(progress, status.isPlaying);
      }
      
      if (status.didJustFinish && !videoFinished) {
        setVideoFinished(true);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        console.log('[VideoIntro] Video ended, vibration stopped');
      }
    }
  }, [videoLoaded, videoFinished, triggerProgressiveVibration]);

  const handleVideoError = useCallback((error: string) => {
    console.error('[VideoIntro] Video error:', error);
    setVideoError(true);
  }, []);

  const handleContinue = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      router.replace('/welcome-onboarding');
    });
  }, [buttonScale, fadeAnim]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.videoWrapper}>
        {!videoLoaded && !videoError && (
          <View style={styles.videoLoader}>
            <ActivityIndicator size="large" color="#F59E0B" />
            <Text style={styles.videoLoadingText}>Загрузка...</Text>
          </View>
        )}
        {videoError || Platform.OS === 'web' ? (
          <View style={styles.videoErrorContainer}>
            <Sparkles size={64} color="#F59E0B" />
            <Text style={styles.videoErrorTitle}>GoalCoach AI</Text>
            <Text style={styles.videoErrorText}>Добро пожаловать!</Text>
          </View>
        ) : (
          <Video
            ref={videoRef}
            source={{ uri: VIDEO_URL }}
            style={[styles.video, !videoLoaded && styles.videoHidden]}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            isLooping={false}
            isMuted={false}
            onPlaybackStatusUpdate={handleVideoLoad}
            onError={(error: string) => handleVideoError(error)}
          />
        )}
      </View>

      <SafeAreaView style={styles.footer} edges={['bottom']}>
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']}
          style={styles.footerGradient}
        />
        <View style={styles.footerContent}>
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              onPress={handleContinue}
              activeOpacity={0.92}
              style={styles.buttonWrapper}
              testID="video-intro-continue"
            >
              <LinearGradient
                colors={['#F59E0B', '#F59E0BDD']}
                style={styles.continueButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.continueButtonText}>Continue</Text>
                <ChevronRight size={20} color="#000" strokeWidth={2.5} />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
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
  videoWrapper: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: width,
    height: height,
  },
  videoHidden: {
    opacity: 0,
  },
  videoLoader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  videoLoadingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500' as const,
  },
  videoErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  videoErrorTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#FFF',
    marginTop: 8,
  },
  videoErrorText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  footerGradient: {
    ...StyleSheet.absoluteFillObject,
    height: 180,
    top: -80,
  },
  footerContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  buttonWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 36,
    borderRadius: 18,
    gap: 8,
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#000',
    letterSpacing: 0.3,
  },
});
