import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

export function useFadeIn(delay: number = 0, duration: number = 350) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 14,
          bounciness: 4,
        }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [opacity, translateY, delay, duration]);

  return { opacity, transform: [{ translateY }] };
}

export function useStaggeredFadeIn(count: number, stagger: number = 60, baseDelay: number = 100) {
  const animations = useRef(
    Array.from({ length: count }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(16),
    }))
  ).current;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    animations.forEach((anim, index) => {
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(anim.translateY, {
            toValue: 0,
            useNativeDriver: true,
            speed: 14,
            bounciness: 4,
          }),
        ]).start();
      }, baseDelay + index * stagger);
      timers.push(timer);
    });
    return () => timers.forEach(clearTimeout);
  }, [animations, stagger, baseDelay]);

  return animations.map((anim) => ({
    opacity: anim.opacity,
    transform: [{ translateY: anim.translateY }],
  }));
}
