import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import type { Video as VideoType } from 'expo-av';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const SPLASH_VIDEO_URL = 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769364588/3d269dee0a4a0dfea5ce1519b94577fe_d96680d9-a4c1-43d4-8587-df295267d3e8_3_yfef1w.mp4';

interface VideoSplashScreenProps {
  onFinish: () => void;
}

const SPLASH_SHOWN_KEY = 'video_splash_shown_session';
const MAX_SPLASH_DURATION = 8000;

export function VideoSplashScreen({ onFinish }: VideoSplashScreenProps) {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [shouldShow, setShouldShow] = useState<boolean | null>(null);
  const videoRef = useRef<VideoType>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1.05)).current;
  const hasFinished = useRef(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(SPLASH_SHOWN_KEY)
      .then((shown) => {
        if (!mounted) return;
        if (shown) {
          setShouldShow(false);
          requestAnimationFrame(() => onFinish());
        } else {
          AsyncStorage.setItem(SPLASH_SHOWN_KEY, 'true').catch(() => {});
          setShouldShow(true);
        }
      })
      .catch(() => {
        if (mounted) setShouldShow(true);
      });
    return () => { mounted = false; };
  }, [onFinish]);

  useEffect(() => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  useEffect(() => {
    if (shouldShow !== true) return;
    const safety = setTimeout(() => {
      console.warn('[VideoSplash] Max duration reached, forcing finish');
      handleFinish();
    }, MAX_SPLASH_DURATION);
    return () => clearTimeout(safety);
  }, [shouldShow]);

  const handleFinish = useCallback(() => {
    if (hasFinished.current) return;
    hasFinished.current = true;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onFinish();
    });
  }, [fadeAnim, onFinish]);

  const handleVideoStatus = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    
    if (!videoLoaded) {
      setVideoLoaded(true);
    }
    
    if (status.didJustFinish) {
      handleFinish();
    }
  }, [videoLoaded, handleFinish]);

  const handleVideoError = useCallback((error: string) => {
    console.error('[VideoSplash] Video error:', error);
    handleFinish();
  }, [handleFinish]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const timer = setTimeout(handleFinish, 600);
      return () => clearTimeout(timer);
    }
  }, [handleFinish]);

  if (shouldShow === null) {
    return <View style={styles.container} />;
  }

  if (!shouldShow) {
    return null;
  }

  if (Platform.OS === 'web') {
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.webFallback}>
          <Animated.View 
            style={[
              styles.webOrb,
              { transform: [{ scale: scaleAnim }] }
            ]} 
          />
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Animated.View 
        style={[
          styles.videoContainer,
          { transform: [{ scale: scaleAnim }] }
        ]}
      >
        <Video
          ref={videoRef}
          source={{ uri: SPLASH_VIDEO_URL }}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping={false}
          isMuted={true}
          progressUpdateIntervalMillis={1000}
          onPlaybackStatusUpdate={handleVideoStatus}
          onError={(error: string) => handleVideoError(error)}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 9999,
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: width,
    height: height,
  },
  webFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  webOrb: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
  },
});
