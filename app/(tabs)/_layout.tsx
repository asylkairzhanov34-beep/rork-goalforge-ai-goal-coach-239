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
import { theme } from '@/constants/theme';

type TabIconComponent = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

interface AppleTabIconProps {
  icon: TabIconComponent;
  focused: boolean;
}

const BRAND = theme.colors.primary;
const BAR_HEIGHT = 56;
const BUBBLE_SIZE = 44;
const TAB_ROUTES = ['home', 'plan', 'progress', 'timer', 'profile'] as const;
const MAX_TAB_BAR_WIDTH = 520;

const AppleTabIcon = memo(function AppleTabIcon({ icon: Icon, focused }: AppleTabIconProps) {
  const scaleAnim = useRef(new Animated.Value(focused ? 1.05 : 1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: focused ? 1.05 : 1,
      tension: 300,
      friction: 15,
      useNativeDriver: true,
    }).start();
  }, [focused, scaleAnim]);

  return (
    <Animated.View
      style={[styles.iconFrame, { transform: [{ scale: scaleAnim }] }]}
      testID="apple-tab-icon"
    >
      <View style={styles.iconInner}>
        <Icon
          size={22}
          color={focused ? '#000000' : 'rgba(255,255,255,0.5)'}
          strokeWidth={focused ? 2.5 : 1.8}
        />
      </View>
    </Animated.View>
  );
});

interface TabBarBgProps {
  sideInset: number;
  bottomInset: number;
  bubbleX: Animated.Value;
}

const TabBarBg = memo(function TabBarBg({ sideInset, bottomInset, bubbleX }: TabBarBgProps) {
  const bubbleTop = (BAR_HEIGHT - BUBBLE_SIZE) / 2;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" testID="tab-bar-bg">
      <View
        style={[
          styles.barShape,
          {
            left: sideInset,
            right: sideInset,
            bottom: bottomInset,
            height: BAR_HEIGHT,
          },
        ]}
      >
        {Platform.OS === 'web' ? (
          <View style={styles.webBg} />
        ) : (
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject} />
        )}
        <View style={styles.barOverlay} />
      </View>

      <Animated.View
        style={[
          styles.bubble,
          {
            width: BUBBLE_SIZE,
            height: BUBBLE_SIZE,
            borderRadius: BUBBLE_SIZE / 2,
            left: sideInset,
            bottom: bottomInset + bubbleTop,
            transform: [{ translateX: bubbleX }],
          },
        ]}
        testID="tab-active-bubble"
      />
    </View>
  );
});

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const sideInset = useMemo(
    () => (width >= 768 ? Math.max((width - MAX_TAB_BAR_WIDTH) / 2, 30) : 20),
    [width]
  );

  const bottomInset = useMemo(() => Math.max(insets.bottom, 10), [insets.bottom]);
  const barTotalHeight = useMemo(() => BAR_HEIGHT + bottomInset, [bottomInset]);

  const barInnerWidth = useMemo(() => width - sideInset * 2, [sideInset, width]);
  const tabItemWidth = useMemo(
    () => Math.max(barInnerWidth / TAB_ROUTES.length, 48),
    [barInnerWidth]
  );

  const bubbleX = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);

  const bubbleOffset = useMemo(
    () => activeIndex * tabItemWidth + (tabItemWidth - BUBBLE_SIZE) / 2,
    [activeIndex, tabItemWidth]
  );

  useEffect(() => {
    Animated.spring(bubbleX, {
      toValue: bubbleOffset,
      tension: 280,
      friction: 22,
      useNativeDriver: true,
    }).start();
  }, [bubbleOffset, bubbleX]);

  const onTabPress = useCallback(
    (
      routeName: string,
      nextIndex: number,
      originalPress?: ((event: GestureResponderEvent) => void) | undefined
    ) =>
      (event: GestureResponderEvent) => {
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
          styles.tabBarContainer,
          {
            paddingHorizontal: sideInset,
            height: barTotalHeight,
            paddingBottom: 0,
          },
        ],
        tabBarBackground: () => (
          <TabBarBg sideInset={sideInset} bottomInset={bottomInset} bubbleX={bubbleX} />
        ),
        tabBarItemStyle: {
          height: BAR_HEIGHT,
          justifyContent: 'center' as const,
          alignItems: 'center' as const,
          paddingBottom: bottomInset,
          zIndex: 4,
        },
        tabBarButton: ({ accessibilityState, children, onLongPress, onPress, style, testID }) => {
          const routeName = testID?.replace('tab-', '') ?? '';
          const nextIndex = TAB_ROUTES.findIndex((r) => r === routeName);
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
  tabBarContainer: {
    position: 'absolute',
    borderTopWidth: 0,
    backgroundColor: 'transparent',
    elevation: 0,
    shadowColor: 'transparent',
    paddingTop: 0,
  },

  barShape: {
    position: 'absolute',
    borderRadius: BAR_HEIGHT / 2,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
      },
    }),
  },
  barOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,15,15,0.78)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: BAR_HEIGHT / 2,
  },
  webBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,15,15,0.92)',
    borderRadius: BAR_HEIGHT / 2,
  },
  bubble: {
    position: 'absolute',
    backgroundColor: BRAND,
    ...Platform.select({
      ios: {
        shadowColor: BRAND,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: `0 2px 14px rgba(255,215,0,0.45)`,
      },
    }),
  },
  iconFrame: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  iconInner: {
    transform: [{ translateY: Platform.OS === 'ios' ? 2.5 : 0 }],
  },
});
