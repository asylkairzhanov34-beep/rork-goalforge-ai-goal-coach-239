import React, { memo } from 'react';
import { Tabs } from 'expo-router';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Home, Target, Timer, TrendingUp, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

type TabIconComponent = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

interface TabIconProps {
  icon: TabIconComponent;
  focused: boolean;
}

const TabIcon = memo(function TabIcon({ icon: Icon, focused }: TabIconProps) {
  return (
    <View style={styles.iconFrame}>
      {focused ? <View style={styles.activeCircle} /> : null}
      <Icon
        size={32}
        color={focused ? '#F6D300' : '#F5F6F8'}
        strokeWidth={focused ? 2.6 : 2.2}
      />
    </View>
  );
});

const MAX_TAB_BAR_WIDTH = 560;

function TabBarBackground() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const horizontalMargin = width >= 768 ? Math.max((width - MAX_TAB_BAR_WIDTH) / 2, 32) : 18;

  return (
    <View
      style={[
        styles.backgroundWrap,
        {
          left: horizontalMargin,
          right: horizontalMargin,
          bottom: Math.max(insets.bottom, 12),
        },
      ]}
      testID="tab-bar-background"
    >
      {Platform.OS === 'web' ? (
        <View style={styles.webBackground} />
      ) : (
        <BlurView intensity={34} tint="dark" style={styles.blurView} />
      )}
      <View style={styles.overlay} />
    </View>
  );
}

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const horizontalPadding = width >= 768 ? Math.max((width - MAX_TAB_BAR_WIDTH) / 2 + 10, 38) : 24;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: [
          styles.tabBar,
          {
            paddingHorizontal: horizontalPadding,
            height: 70 + Math.max(insets.bottom, 12),
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ],
        tabBarBackground: () => <TabBarBackground />,
        tabBarButton: ({
          accessibilityState,
          children,
          onLongPress,
          onPress,
          style,
          testID,
        }) => (
          <Pressable
            accessibilityState={accessibilityState}
            onLongPress={onLongPress}
            onPress={(event) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPress?.(event);
            }}
            style={style}
            testID={testID}
          >
            {children}
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon={Home} focused={focused} />,
          tabBarButtonTestID: 'tab-home',
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon={Target} focused={focused} />,
          tabBarButtonTestID: 'tab-plan',
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon={TrendingUp} focused={focused} />,
          tabBarButtonTestID: 'tab-progress',
        }}
      />
      <Tabs.Screen
        name="timer"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon={Timer} focused={focused} />,
          tabBarButtonTestID: 'tab-timer',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon={User} focused={focused} />,
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
  backgroundWrap: {
    position: 'absolute',
    height: 70,
    borderRadius: 36,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.45,
        shadowRadius: 22,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 10px 28px rgba(0, 0, 0, 0.5)',
      },
    }),
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 10, 14, 0.84)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 36,
  },
  webBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 10, 14, 0.96)',
    borderRadius: 36,
  },
  iconFrame: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCircle: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(246, 211, 0, 0.32)',
  },
});
