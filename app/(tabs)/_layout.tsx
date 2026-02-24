import React, { useEffect, useRef, useCallback } from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform, useWindowDimensions, Pressable, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Home, Target, Timer, TrendingUp, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

const AnimatedTabBarIcon = React.memo(function AnimatedTabBarIcon({ icon: Icon, focused }: { icon: any; focused: boolean }) {
  const scale = useRef(new Animated.Value(focused ? 1 : 0.92)).current;
  const glowOpacity = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const bgOpacity = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focused ? 1 : 0.92,
        useNativeDriver: true,
        speed: 28,
        bounciness: focused ? 12 : 4,
      }),
      Animated.timing(glowOpacity, {
        toValue: focused ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(bgOpacity, {
        toValue: focused ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused, scale, glowOpacity, bgOpacity]);

  return (
    <View style={styles.iconContainer}>
      <Animated.View style={[
        styles.iconWrapper,
        {
          transform: [{ scale }],
        },
      ]}>
        <Animated.View style={[styles.activeIconBg, { opacity: bgOpacity }]} />
        <Icon
          size={26}
          color={focused ? '#FFD600' : '#FFFFFF'}
          strokeWidth={focused ? 2.5 : 2}
        />
        <Animated.View style={[styles.glowEffect, { opacity: glowOpacity }]} />
      </Animated.View>
    </View>
  );
});

const MAX_TAB_BAR_WIDTH = 500;

function TabBarBackground() {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTablet = screenWidth >= 768;
  
  const horizontalMargin = isTablet
    ? Math.max((screenWidth - MAX_TAB_BAR_WIDTH) / 2, screenWidth * 0.04)
    : screenWidth * 0.04;
  
  return (
    <View style={[
      styles.tabBarBackgroundContainer,
      {
        left: horizontalMargin,
        right: horizontalMargin,
        bottom: Math.max(insets.bottom, 20),
      }
    ]}>
      {Platform.OS === 'web' ? (
        <View style={styles.tabBarBackgroundWeb} />
      ) : (
        <BlurView
          intensity={80}
          tint="dark"
          style={styles.blurView}
        />
      )}
      <View style={styles.tabBarOverlay} />
    </View>
  );
}

export default function TabLayout() {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTablet = screenWidth >= 768;
  
  const tabHorizontalPadding = isTablet
    ? Math.max((screenWidth - MAX_TAB_BAR_WIDTH) / 2 + 16, screenWidth * 0.08)
    : screenWidth * 0.08;
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FFD600',
        tabBarInactiveTintColor: '#FFFFFF',
        tabBarShowLabel: false,
        tabBarStyle: [
          styles.tabBar,
          {
            paddingHorizontal: tabHorizontalPadding,
            bottom: 0,
            height: 80 + Math.max(insets.bottom, 20),
            paddingBottom: Math.max(insets.bottom, 20),
          }
        ],
        tabBarBackground: () => <TabBarBackground />,
        tabBarButton: ({ onPress, children, style, accessibilityState, testID }) => {
          const pressScale = useRef(new Animated.Value(1)).current;
          const handlePressIn = useCallback(() => {
            Animated.spring(pressScale, {
              toValue: 0.88,
              useNativeDriver: true,
              speed: 50,
              bounciness: 4,
            }).start();
          }, [pressScale]);
          const handlePressOut = useCallback(() => {
            Animated.spring(pressScale, {
              toValue: 1,
              useNativeDriver: true,
              speed: 30,
              bounciness: 8,
            }).start();
          }, [pressScale]);
          return (
            <Pressable
              style={style}
              accessibilityState={accessibilityState}
              testID={testID}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              onPress={(e) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPress?.(e);
              }}
            >
              <Animated.View style={{ transform: [{ scale: pressScale }], flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const }}>
                {children}
              </Animated.View>
            </Pressable>
          );
        },
      }}
    >

      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => (
            <AnimatedTabBarIcon icon={Home} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          tabBarIcon: ({ focused }) => (
            <AnimatedTabBarIcon icon={Target} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          tabBarIcon: ({ focused }) => (
            <AnimatedTabBarIcon icon={TrendingUp} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="timer"
        options={{
          tabBarIcon: ({ focused }) => (
            <AnimatedTabBarIcon icon={Timer} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <AnimatedTabBarIcon icon={User} focused={focused} />
          ),
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
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    paddingTop: 20,
    elevation: 0,
    shadowColor: 'transparent',
  },
  tabBarBackgroundContainer: {
    position: 'absolute',
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 28,
      },
      android: {
        elevation: 16,
      },
      web: {
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      },
    }) as any,
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
  },
  tabBarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30, 30, 30, 0.5)',
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  tabBarBackgroundWeb: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30, 30, 30, 0.75)',
    backdropFilter: 'blur(20px)',
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  } as any,
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 12,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    position: 'relative',
  },
  activeIconBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 214, 0, 0.1)',
    borderRadius: 24,
  },
  glowEffect: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFD600',
    opacity: 0.15,
    ...Platform.select({
      ios: {
        shadowColor: '#FFD600',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: {
        elevation: 0,
      },
      web: {
        boxShadow: '0 0 16px rgba(255, 214, 0, 0.4)',
      },
    }) as any,
  },
});

