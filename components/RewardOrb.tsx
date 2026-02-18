import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Animated, Easing } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Lock, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';


interface RewardOrbProps {
  videoUri: string;
  size: number;
  isActive: boolean;
  isUnlocked: boolean;
  isScreenFocused: boolean;
  color?: string;
}

const LOAD_TIMEOUT = 15000;

const RewardOrbInner: React.FC<RewardOrbProps> = ({
  videoUri,
  size,
  isActive,
  isUnlocked,
  isScreenFocused,
  color = '#FFD700',
}) => {
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const videoRef = useRef<Video | null>(null);
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const retryCount = useRef(0);
  const maxRetries = 1;
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shouldPlay = isActive && isScreenFocused && !videoError && !showFallback;

  useEffect(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    
    if (!videoLoaded && !videoError && !showFallback) {
      loadTimeoutRef.current = setTimeout(() => {
        console.log('[RewardOrb] Load timeout, showing fallback');
        setShowFallback(true);
      }, LOAD_TIMEOUT);
    }
    
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [videoLoaded, videoError, showFallback, videoUri]);

  useEffect(() => {
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    
    if (showFallback || videoError) {
      glow.start();
      rotate.start();
    }
    
    return () => {
      glow.stop();
      rotate.stop();
    };
  }, [showFallback, videoError, glowAnim, rotateAnim]);

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
    if (!videoLoaded && !videoError && !showFallback) {
      pulse.start();
    } else {
      pulse.stop();
    }
    return () => pulse.stop();
  }, [videoLoaded, videoError, showFallback, pulseAnim]);

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
    setShowFallback(false);
  }, [videoUri]);

  const borderRadius = size / 2;
  const showVideo = !videoError && !showFallback;
  const showBeautifulFallback = videoError || showFallback;
  
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const renderFallbackOrb = () => (
    <View style={[styles.fallback, { width: size, height: size, borderRadius }]}>
      <LinearGradient
        colors={[
          `${color}15`,
          `${color}08`,
          'rgba(10,10,20,0.95)',
        ]}
        style={[styles.fallbackGradient, { borderRadius }]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      
      <Animated.View 
        style={[
          styles.fallbackRing,
          { 
            width: size * 0.85,
            height: size * 0.85,
            borderRadius: size * 0.425,
            borderColor: `${color}30`,
            transform: [{ rotate: spin }],
          }
        ]}
      />
      
      <Animated.View 
        style={[
          styles.fallbackRing,
          { 
            width: size * 0.65,
            height: size * 0.65,
            borderRadius: size * 0.325,
            borderColor: `${color}20`,
            transform: [{ rotate: spin }, { scaleX: -1 }],
          }
        ]}
      />
      
      <Animated.View 
        style={[
          styles.fallbackGlowCenter,
          {
            width: size * 0.4,
            height: size * 0.4,
            borderRadius: size * 0.2,
            backgroundColor: color,
            opacity: glowAnim,
          }
        ]}
      />
      
      <View style={styles.fallbackIcon}>
        <Sparkles size={size * 0.18} color={color} strokeWidth={1.5} />
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius }]}>  
      {showVideo && (
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
      )}
      
      {showBeautifulFallback && renderFallbackOrb()}

      {!videoLoaded && !videoError && !showFallback && (
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
    backgroundColor: '#0a0a14',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fallbackGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  fallbackRing: {
    position: 'absolute',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  fallbackGlowCenter: {
    position: 'absolute',
  },
  fallbackIcon: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
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
