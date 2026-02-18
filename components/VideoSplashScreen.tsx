import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import type { Video as VideoType } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Sparkles } from 'lucide-react-native';

const SPLASH_VIDEO_URL = 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769364588/3d269dee0a4a0dfea5ce1519b94577fe_d96680d9-a4c1-43d4-8587-df295267d3e8_3_yfef1w.mp4';

interface VideoSplashScreenProps {
  onFinish: () => void;
}

const MAX_SPLASH_DURATION = 8000;
const BRANDED_FALLBACK_DURATION = 2200;

export function VideoSplashScreen({ onFinish }: VideoSplashScreenProps) {
  const { width, height } = useWindowDimensions();
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<VideoType>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1.05)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.3)).current;
  const hasFinished = useRef(false);

  useEffect(() => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: true,
    }).start();

    Animated.spring(logoScale, {
      toValue: 1,
      friction: 8,
      tension: 50,
      useNativeDriver: true,
    }).start();

    Animated.timing(logoOpacity, {
      toValue: 1,
      duration: 600,
      delay: 100,
      useNativeDriver: true,
    }).start();

    Animated.timing(textOpacity, {
      toValue: 1,
      duration: 700,
      delay: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 0.8,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0.3,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    glow.start();

    return () => {
      glow.stop();
    };
  }, [scaleAnim, logoScale, logoOpacity, textOpacity, glowPulse]);

  useEffect(() => {
    const safety = setTimeout(() => {
      console.warn('[VideoSplash] Max duration reached, forcing finish');
      handleFinish();
    }, MAX_SPLASH_DURATION);
    return () => clearTimeout(safety);
  }, []);

  const handleFinish = useCallback(() => {
    if (hasFinished.current) return;
    hasFinished.current = true;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 400,
      easing: Easing.out(Easing.ease),
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
    setTimeout(handleFinish, BRANDED_FALLBACK_DURATION);
  }, [handleFinish]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const timer = setTimeout(handleFinish, BRANDED_FALLBACK_DURATION);
      return () => clearTimeout(timer);
    }
  }, [handleFinish]);

  const glowScale = glowPulse.interpolate({
    inputRange: [0.3, 0.8],
    outputRange: [1, 1.4],
  });

  const renderBrandOverlay = () => (
    <View style={styles.brandOverlay} pointerEvents="none">
      <Animated.View style={[styles.glowCircle, { transform: [{ scale: glowScale }], opacity: glowPulse }]} />
      <Animated.View style={[styles.logoRow, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
        <View style={styles.iconBox}>
          <Sparkles size={28} color="#000" strokeWidth={2.2} />
        </View>
      </Animated.View>
      <Animated.View style={[styles.brandTextRow, { opacity: textOpacity }]}>
        <Text style={styles.brandName}>GoalForge</Text>
        <Text style={styles.brandAI}>AI</Text>
      </Animated.View>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {renderBrandOverlay()}
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
          style={{ width, height }}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping={false}
          isMuted={true}
          progressUpdateIntervalMillis={1000}
          onPlaybackStatusUpdate={handleVideoStatus}
          onError={(error: string) => handleVideoError(error)}
        />
      </Animated.View>
      {!videoLoaded && renderBrandOverlay()}
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
  brandOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  glowCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 215, 0, 0.07)',
  },
  logoRow: {
    marginBottom: 20,
  },
  iconBox: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  brandTextRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  brandName: {
    fontSize: 30,
    fontWeight: '800' as const,
    color: '#FFF',
    letterSpacing: -0.5,
  },
  brandAI: {
    fontSize: 26,
    fontWeight: '600' as const,
    color: '#FFD700',
    letterSpacing: 1,
  },
});
