import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Animated,

} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import type { Video as VideoType } from 'expo-av';

const LOAD_TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 3000;
const MAX_RETRIES = 2;

interface VideoOrbProps {
  uri: string;
  size: number;
  color?: string;
  shouldPlay?: boolean;
  showBorder?: boolean;
  borderColor?: string;
}

function VideoOrbInner({
  uri,
  size,
  color = '#FFD700',
  shouldPlay = true,
  showBorder = false,
  borderColor,
}: VideoOrbProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [videoKey, setVideoKey] = useState(0);
  const videoRef = useRef<VideoType>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.7, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 1800, useNativeDriver: true }),
      ])
    );
    const shimmer = Animated.loop(
      Animated.timing(shimmerAnim, { toValue: 1, duration: 2400, useNativeDriver: true })
    );
    pulse.start();
    shimmer.start();
    return () => { pulse.stop(); shimmer.stop(); };
  }, [pulseAnim, shimmerAnim]);

  const startTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (!loaded) {
        console.log('[VideoOrb] Timeout loading:', uri.slice(-30));
        if (retryCount < MAX_RETRIES) {
          console.log('[VideoOrb] Retrying...', retryCount + 1);
          setRetryCount(prev => prev + 1);
          setVideoKey(prev => prev + 1);
        } else {
          setErrored(true);
        }
      }
    }, LOAD_TIMEOUT_MS);
  }, [loaded, retryCount, uri]);

  useEffect(() => {
    if (!loaded && !errored && shouldPlay) {
      startTimeout();
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [loaded, errored, shouldPlay, startTimeout, videoKey]);

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
    setRetryCount(0);
    setVideoKey(prev => prev + 1);
  }, [uri]);

  const handleLoad = useCallback(() => {
    console.log('[VideoOrb] Loaded:', uri.slice(-30));
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setLoaded(true);
    Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start();
  }, [uri, fadeAnim]);

  const handleError = useCallback((error: string) => {
    console.log('[VideoOrb] Error:', uri.slice(-30), error);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (retryCount < MAX_RETRIES) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setVideoKey(prev => prev + 1);
      }, RETRY_DELAY_MS);
    } else {
      setErrored(true);
    }
  }, [uri, retryCount]);

  useEffect(() => {
    if (!shouldPlay && videoRef.current) {
      videoRef.current.pauseAsync().catch(() => {});
    }
    if (shouldPlay && loaded && videoRef.current) {
      videoRef.current.playAsync().catch(() => {});
    }
  }, [shouldPlay, loaded]);

  const borderStyle = showBorder
    ? { borderWidth: 2, borderColor: borderColor || `${color}25` }
    : undefined;

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-size, size],
  });

  return (
    <View style={[
      { width: size, height: size, borderRadius: size / 2, overflow: 'hidden' },
      borderStyle,
    ]}>
      {!errored && (
        <Video
          key={videoKey}
          ref={videoRef}
          source={{ uri }}
          style={{ width: size, height: size }}
          resizeMode={ResizeMode.COVER}
          shouldPlay={shouldPlay}
          isLooping
          isMuted
          onLoad={handleLoad}
          onError={(e: string) => handleError(e)}
        />
      )}

      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: errored ? 1 : fadeAnim,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0A0A0A',
            borderRadius: size / 2,
          },
        ]}
      >
        <Animated.View
          style={{
            width: size * 0.7,
            height: size * 0.7,
            borderRadius: size * 0.35,
            backgroundColor: color,
            opacity: pulseAnim,
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: size * 0.45,
            height: size * 0.45,
            borderRadius: size * 0.225,
            backgroundColor: 'rgba(255,255,255,0.06)',
          }}
        />
        <Animated.View
          style={{
            position: 'absolute',
            width: size * 0.3,
            height: size * 1.2,
            backgroundColor: 'rgba(255,255,255,0.04)',
            transform: [
              { translateX: shimmerTranslate },
              { rotate: '25deg' },
            ],
          }}
        />
      </Animated.View>
    </View>
  );
}

export const VideoOrb = React.memo(VideoOrbInner);
export default VideoOrb;
