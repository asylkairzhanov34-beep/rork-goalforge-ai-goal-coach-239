import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Animated, Easing } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Lock } from 'lucide-react-native';


interface RewardOrbProps {
  videoUri: string;
  size: number;
  isActive: boolean;
  isUnlocked: boolean;
  isScreenFocused: boolean;
}

const RewardOrbInner: React.FC<RewardOrbProps> = ({
  videoUri,
  size,
  isActive,
  isUnlocked,
  isScreenFocused,
}) => {
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<Video | null>(null);
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  const retryCount = useRef(0);
  const maxRetries = 2;

  const shouldPlay = isActive && isScreenFocused && !videoError;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    if (!videoLoaded && !videoError) {
      pulse.start();
    } else {
      pulse.stop();
    }
    return () => pulse.stop();
  }, [videoLoaded, videoError, pulseAnim]);

  useEffect(() => {
    if (!isActive && videoRef.current) {
      videoRef.current.pauseAsync().catch(() => {});
    }
    if (isActive && videoRef.current && videoLoaded && !videoError) {
      videoRef.current.playAsync().catch(() => {});
    }
  }, [isActive, videoLoaded, videoError]);

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      if (!videoLoaded) {
        console.log('[RewardOrb] Video loaded successfully');
        setVideoLoaded(true);
        setVideoError(false);
      }
    }
    if (!status.isLoaded && status.error) {
      console.warn('[RewardOrb] Playback error:', status.error);
      if (retryCount.current < maxRetries) {
        retryCount.current += 1;
        console.log('[RewardOrb] Retrying...', retryCount.current);
        setTimeout(() => {
          setVideoError(false);
          setVideoLoaded(false);
        }, 1500 * retryCount.current);
      } else {
        setVideoError(true);
      }
    }
  }, [videoLoaded]);

  const handleError = useCallback((error: string) => {
    console.warn('[RewardOrb] Video error:', error);
    if (retryCount.current < maxRetries) {
      retryCount.current += 1;
      setTimeout(() => {
        setVideoError(false);
        setVideoLoaded(false);
      }, 1500 * retryCount.current);
    } else {
      setVideoError(true);
    }
  }, []);

  useEffect(() => {
    retryCount.current = 0;
    setVideoError(false);
    setVideoLoaded(false);
  }, [videoUri]);

  const borderRadius = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius }]}>  
      {!videoError ? (
        <Video
          ref={videoRef}
          source={{ uri: videoUri }}
          style={[styles.video, { width: size, height: size }]}
          resizeMode={ResizeMode.COVER}
          shouldPlay={shouldPlay}
          isLooping
          isMuted
          progressUpdateIntervalMillis={10000}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          onError={handleError}
        />
      ) : (
        <View style={[styles.fallback, { width: size, height: size, borderRadius }]}>
          <View style={styles.fallbackGlow} />
        </View>
      )}

      {!videoLoaded && !videoError && (
        <Animated.View style={[styles.loadingOverlay, { width: size, height: size, borderRadius, opacity: pulseAnim }]}>
          <ActivityIndicator size="small" color="rgba(255,215,0,0.6)" />
        </Animated.View>
      )}

      {!isUnlocked && (
        <View style={[styles.lockedOverlay, { borderRadius }]}>
          <Lock size={36} color="rgba(255,255,255,0.7)" />
        </View>
      )}
    </View>
  );
};

export const RewardOrb = React.memo(RewardOrbInner);

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    position: 'absolute',
  },
  fallback: {
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fallbackGlow: {
    width: '60%',
    height: '60%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,215,0,0.08)',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,20,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default RewardOrb;
