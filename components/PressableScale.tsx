import React, { useRef, useCallback } from 'react';
import { Animated, Pressable, ViewStyle, StyleProp, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

interface PressableScaleProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  scaleValue?: number;
  haptic?: 'light' | 'medium' | 'heavy' | 'selection' | 'none';
  disabled?: boolean;
  testID?: string;
  activeOpacity?: number;
}

export const PressableScale = React.memo(function PressableScale({
  children,
  onPress,
  onLongPress,
  style,
  scaleValue = 0.97,
  haptic = 'light',
  disabled = false,
  testID,
  activeOpacity,
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: scaleValue,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }),
      ...(activeOpacity != null ? [
        Animated.timing(opacity, {
          toValue: activeOpacity,
          duration: 100,
          useNativeDriver: true,
        }),
      ] : []),
    ]).start();
  }, [scale, scaleValue, opacity, activeOpacity]);

  const handlePressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 40,
        bounciness: 6,
      }),
      ...(activeOpacity != null ? [
        Animated.timing(opacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ] : []),
    ]).start();
  }, [scale, opacity, activeOpacity]);

  const handlePress = useCallback(() => {
    if (disabled) return;
    if (haptic !== 'none') {
      if (haptic === 'selection') {
        Haptics.selectionAsync();
      } else {
        const style = haptic === 'light'
          ? Haptics.ImpactFeedbackStyle.Light
          : haptic === 'medium'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Heavy;
        Haptics.impactAsync(style);
      }
    }
    onPress?.();
  }, [disabled, haptic, onPress]);

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      onLongPress={onLongPress}
      disabled={disabled}
      testID={testID}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale }],
            opacity: activeOpacity != null ? opacity : 1,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
});
