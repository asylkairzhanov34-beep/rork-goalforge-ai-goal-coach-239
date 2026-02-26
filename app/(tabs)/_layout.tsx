import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Tabs } from 'expo-router';
import {
  Animated,
  GestureResponderEvent,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Home, Target, Timer, TrendingUp, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

type TabIconComponent = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

interface AppleTabIconProps {
  icon: TabIconComponent;
  focused: boolean;
}

interface AppleTabBarBackgroundProps {
  sideInset: number;
  bottomInset: number;
  bubbleX: Animated.Value;
  bubbleWidth: number;
}

const BAR_INNER_HEIGHT = 64;

const TAB_ROUTES = ['home', 'plan', 'progress', 'timer', 'profile'] as const;
const MAX_TAB_BAR_WIDTH = 560;

const AppleTabIcon = memo(function AppleTabIcon({ icon: Icon, focused }: AppleTabIconProps) {
  const scaleAnim = useRef<Animated.Value>(new Animated.Value(focused ? 1 : 0.9)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: focused ? 1 : 0.9,
      tension: 220,
      friction: 17,
      useNativeDriver: true,
    }).start();
  }, [focused, scaleAnim]);

  return (
    <Animated.View style={[styles.iconFrame, { transform: [{ scale: scaleAnim }] }]} testID="apple-tab-icon">
      <Icon
        size={27}
        color={focused ? '#FFFFFF' : 'rgba(255,255,255,0.68)'}
        strokeWidth={focused ? 2.7 : 2.35}
      />
    </Animated.View>
  );
});

const AppleTabBarBackground = memo(function AppleTabBarBackground({
  sideInset,
  bottomInset,
  bubbleX,
  bubbleWidth,
}: AppleTabBarBackgroundProps) {
  const bubbleVerticalOffset = (BAR_INNER_HEIGHT - bubbleWidth) / 2;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" testID="apple-tab-bar-background">
      <View
        style={[
          styles.backgroundWrap,
          {
            left: sideInset,
            right: sideInset,
            bottom: bottomInset,
            height: BAR_INNER_HEIGHT,
          },
        ]}
      >
        {Platform.OS === 'web' ? (
          <View style={styles.webBackground} />
        ) : (
          <BlurView intensity={34} tint="dark" style={styles.blurView} />
        )}
        <View style={styles.overlay} />
      </View>

      <Animated.View
        style={[
          styles.activeBubble,
          {
            width: bubbleWidth,
            height: bubbleWidth,
            borderRadius: bubbleWidth / 2,
            left: sideInset,
            bottom: bottomInset + bubbleVerticalOffset,
            transform: [{ translateX: bubbleX }],
          },
        ]}
        testID="apple-tab-active-bubble"
      >
        {Platform.OS === 'web' ? (
          <View style={styles.bubbleWebFallback} />
        ) : (
          <BlurView intensity={50} tint="light" style={styles.blurView} />
        )}
        <View style={styles.bubbleTint} />
      </Animated.View>
    </View>
  );
});

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const sideInset = useMemo<number>(
    () => (width >= 768 ? Math.max((width - MAX_TAB_BAR_WIDTH) / 2, 30) : 16),
    [width]
  );

  const bottomInset = useMemo<number>(() => Math.max(insets.bottom, 8), [insets.bottom]);
  const barHeight = useMemo<number>(() => BAR_INNER_HEIGHT + bottomInset, [bottomInset]);

  const barInnerWidth = useMemo<number>(() => width - sideInset * 2, [sideInset, width]);
  const tabItemWidth = useMemo<number>(() => {
    return Math.max(barInnerWidth / TAB_ROUTES.length, 56);
  }, [barInnerWidth]);

  const bubbleSize = 52;

  const bubbleX = useRef<Animated.Value>(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const bubbleOffset = useMemo<number>(() => {
    return activeIndex * tabItemWidth + (tabItemWidth - bubbleSize) / 2;
  }, [activeIndex, tabItemWidth]);

  useEffect(() => {
    Animated.spring(bubbleX, {
      toValue: bubbleOffset,
      tension: 200,
      friction: 20,
      useNativeDriver: true,
    }).start();
  }, [bubbleOffset, bubbleX]);

  const onTabPress = useCallback(
    (routeName: string, nextIndex: number, originalPress?: ((event: GestureResponderEvent) => void) | undefined) =>
      (event: GestureResponderEvent) => {
        console.log('[AppleTabBar] tab press', { routeName, nextIndex });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveIndex(nextIndex >= 0 ? nextIndex : 0);
        originalPress?.(event);
      },
    []
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: [
          styles.tabBar,
          {
            paddingHorizontal: sideInset,
            height: barHeight,
            paddingBottom: bottomInset,
          },
        ],
        tabBarBackground: () => (
          <AppleTabBarBackground
            sideInset={sideInset}
            bottomInset={bottomInset}
            bubbleX={bubbleX}
            bubbleWidth={bubbleSize}
          />
        ),
        tabBarItemStyle: styles.tabBarItem,
        tabBarButton: ({
          accessibilityState,
          children,
          onLongPress,
          onPress,
          style,
          testID,
        }) => {
          const routeName = testID?.replace('tab-', '') ?? '';
          const nextIndex = TAB_ROUTES.findIndex((route) => route === routeName);

          return (
            <Pressable
              accessibilityState={accessibilityState}
              onLongPress={onLongPress}
              onPress={onTabPress(routeName, nextIndex, onPress)}
              style={style}
              testID={testID}
            >
              {children}
            </Pressable>
          );
        },
      }}
      screenListeners={{
        state: (event: any) => {
          const nextIndex = event?.data?.state?.index ?? 0;
          setActiveIndex(nextIndex);
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => <AppleTabIcon icon={Home} focused={focused} />,
          tabBarButtonTestID: 'tab-home',
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          tabBarIcon: ({ focused }) => <AppleTabIcon icon={Target} focused={focused} />,
          tabBarButtonTestID: 'tab-plan',
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          tabBarIcon: ({ focused }) => <AppleTabIcon icon={TrendingUp} focused={focused} />,
          tabBarButtonTestID: 'tab-progress',
        }}
      />
      <Tabs.Screen
        name="timer"
        options={{
          tabBarIcon: ({ focused }) => <AppleTabIcon icon={Timer} focused={focused} />,
          tabBarButtonTestID: 'tab-timer',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <AppleTabIcon icon={User} focused={focused} />,
          tabBarButtonTestID: 'tab-profile',
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    borderTopWidth: 0,
    backgroundColor: 'transparent',
    elevation: 0,
    shadowColor: 'transparent',
    paddingTop: 0,
  },
  tabBarItem: {
    height: BAR_INNER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 4,
  },
  backgroundWrap: {
    position: 'absolute',
    borderRadius: 34,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.45,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0 12px 34px rgba(0, 0, 0, 0.55)',
      },
    }),
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 12, 14, 0.82)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 34,
  },
  webBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 12, 14, 0.95)',
    borderRadius: 34,
  },
  activeBubble: {
    position: 'absolute',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(180, 160, 0, 0.35)',
    backgroundColor: 'rgba(80, 70, 0, 0.85)',
    ...Platform.select({
      ios: {
        shadowColor: '#8B7A00',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 2px 10px rgba(139, 122, 0, 0.35)',
      },
    }),
  },
  bubbleWebFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(100, 90, 0, 0.6)',
  },
  bubbleTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(120, 105, 0, 0.5)',
  },
  iconFrame: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
});