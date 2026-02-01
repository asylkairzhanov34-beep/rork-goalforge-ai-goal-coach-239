import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform, useWindowDimensions, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Home, Target, Timer, TrendingUp, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';


function TabBarIcon({ icon: Icon, focused }: { icon: any; focused: boolean }) {
  return (
    <View style={styles.iconContainer}>
      <View style={[
        styles.iconWrapper,
        focused && styles.activeIconWrapper
      ]}>
        <Icon 
          size={26} 
          color={focused ? '#FFD600' : '#FFFFFF'}
          strokeWidth={focused ? 2.5 : 2}
        />
        {focused && (
          <View style={styles.glowEffect} />
        )}
      </View>
    </View>
  );
}

function TabBarBackground() {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[
      styles.tabBarBackgroundContainer,
      {
        left: screenWidth * 0.04,
        right: screenWidth * 0.04,
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
            paddingHorizontal: screenWidth * 0.08,
            bottom: 0,
            height: 80 + Math.max(insets.bottom, 20),
            paddingBottom: Math.max(insets.bottom, 20),
          }
        ],
        tabBarBackground: () => <TabBarBackground />,
        tabBarButton: ({ onPress, children, style, accessibilityState, testID }) => (
          <Pressable
            style={style}
            accessibilityState={accessibilityState}
            testID={testID}
            onPress={(e) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPress?.(e);
            }}
          >
            {children}
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon={Home} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon={Target} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon={TrendingUp} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="timer"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon={Timer} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon={User} focused={focused} />
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
  activeIconWrapper: {
    backgroundColor: 'rgba(255, 214, 0, 0.1)',
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

