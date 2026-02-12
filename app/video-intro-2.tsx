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

const { width: INIT_WIDTH, height: INIT_HEIGHT } = Dimensions.get('window');

const VIDEO_URL = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/k1zzetp7zbzgwvqznsmbm';

export default function VideoIntro2Screen() {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoFinished, setVideoFinished] = useState(false);

  const videoRef = useRef<VideoType>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

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
        console.log('[VideoIntro2] Video loaded successfully');
      }

      if (status.didJustFinish && !videoFinished) {
        setVideoFinished(true);
        console.log('[VideoIntro2] Video ended');
      }
    }
  }, [videoLoaded, videoFinished]);

  const handleVideoError = useCallback((error: string) => {
    console.error('[VideoIntro2] Video error:', error);
    setVideoError(true);
  }, []);

  const handleContinue = useCallback(() => {
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
            <Text style={styles.videoLoadingText}>Loading...</Text>
          </View>
        )}
        {videoError || Platform.OS === 'web' ? (
          <View style={styles.videoErrorContainer}>
            <Sparkles size={64} color="#F59E0B" />
            <Text style={styles.videoErrorTitle}>GoalForge AI</Text>
            <Text style={styles.videoErrorText}>Welcome!</Text>
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
            progressUpdateIntervalMillis={500}
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
              style={[styles.buttonWrapper, !videoFinished && !videoError && Platform.OS !== 'web' && styles.buttonDisabled]}
              disabled={!videoFinished && !videoError && Platform.OS !== 'web'}
              testID="video-intro-2-continue"
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
    width: INIT_WIDTH,
    height: INIT_HEIGHT,
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
  buttonDisabled: {
    opacity: 0.4,
  },
});
