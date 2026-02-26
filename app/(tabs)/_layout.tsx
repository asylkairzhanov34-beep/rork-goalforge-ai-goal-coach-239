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
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" testID="apple-tab-bar-background">
      <View
        style={[
          styles.backgroundWrap,
          {
            left: sideInset,
            right: sideInset,
            bottom: bottomInset,
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
            left: sideInset + 6,
            bottom: bottomInset + 8,
            transform: [{ translateX: bubbleX }],
          },
        ]}
        testID="apple-tab-active-bubble"
      >
        {Platform.OS === 'web' ? (
          <View style={styles.bubbleWebFallback} />
        ) : (
          <BlurView intensity={65} tint="light" style={styles.blurView} />
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

  const bottomInset = useMemo<number>(() => Math.max(insets.bottom, 10), [insets.bottom]);
  const barHeight = useMemo<number>(() => 72 + bottomInset, [bottomInset]);

  const tabItemWidth = useMemo<number>(() => {
    const availableWidth = width - sideInset * 2;
    return Math.max(availableWidth / TAB_ROUTES.length, 56);
  }, [sideInset, width]);

  const bubbleWidth = useMemo<number>(() => Math.max(tabItemWidth - 12, 52), [tabItemWidth]);

  const bubbleX = useRef<Animated.Value>(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState<number>(0);

  useEffect(() => {
    Animated.spring(bubbleX, {
      toValue: activeIndex * tabItemWidth,
      tension: 180,
      friction: 18,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, bubbleX, tabItemWidth]);

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
            bubbleWidth={bubbleWidth}
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
    paddingTop: 8,
  },
  tabBarItem: {
    height: 62,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 4,
  },
  backgroundWrap: {
    position: 'absolute',
    height: 72,
    borderRadius: 38,
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
    backgroundColor: 'rgba(8, 10, 16, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 38,
  },
  webBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 10, 16, 0.92)',
    borderRadius: 38,
  },
  activeBubble: {
    position: 'absolute',
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    backgroundColor: 'rgba(246, 211, 0, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: '#F6D300',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.24,
        shadowRadius: 14,
      },
      android: {
        elevation: 7,
      },
      web: {
        boxShadow: '0 8px 18px rgba(246, 211, 0, 0.25)',
      },
    }),
  },
  bubbleWebFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  bubbleTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(246, 211, 0, 0.46)',
  },
  iconFrame: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
});