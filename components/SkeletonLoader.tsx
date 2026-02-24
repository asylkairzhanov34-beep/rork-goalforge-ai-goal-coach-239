import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, StyleProp, Easing } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

const SkeletonBlock = React.memo(function SkeletonBlock({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1200,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1200,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.08, 0.18],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#fff',
          opacity,
        },
        style,
      ]}
    />
  );
});

export function HomeScreenSkeleton() {
  return (
    <View style={skeletonStyles.container}>
      <View style={skeletonStyles.header}>
        <SkeletonBlock width={120} height={16} borderRadius={6} />
        <SkeletonBlock width={180} height={28} borderRadius={8} style={{ marginTop: 6 }} />
      </View>

      <View style={skeletonStyles.orbArea}>
        <SkeletonBlock width={180} height={180} borderRadius={90} />
      </View>

      <View style={skeletonStyles.statsRow}>
        <SkeletonBlock width="30%" height={48} borderRadius={12} />
        <SkeletonBlock width="30%" height={48} borderRadius={12} />
        <SkeletonBlock width="30%" height={48} borderRadius={12} />
      </View>

      <SkeletonBlock height={72} borderRadius={16} style={{ marginTop: 20 }} />

      <View style={skeletonStyles.quickActions}>
        <SkeletonBlock width="30%" height={80} borderRadius={16} />
        <SkeletonBlock width="30%" height={80} borderRadius={16} />
        <SkeletonBlock width="30%" height={80} borderRadius={16} />
      </View>

      <SkeletonBlock height={180} borderRadius={24} style={{ marginTop: 20 }} />
    </View>
  );
}

export function ProgressScreenSkeleton() {
  return (
    <View style={skeletonStyles.container}>
      <View style={skeletonStyles.header}>
        <SkeletonBlock width={60} height={16} borderRadius={6} />
        <SkeletonBlock width={120} height={28} borderRadius={8} style={{ marginTop: 6 }} />
      </View>

      <SkeletonBlock height={44} borderRadius={14} style={{ marginTop: 12 }} />

      <View style={skeletonStyles.progressCenter}>
        <SkeletonBlock width={120} height={120} borderRadius={60} />
        <SkeletonBlock width={140} height={14} borderRadius={6} style={{ marginTop: 16 }} />
        <SkeletonBlock width={180} height={16} borderRadius={6} style={{ marginTop: 8 }} />
      </View>

      <View style={skeletonStyles.statsRow}>
        <SkeletonBlock width="30%" height={90} borderRadius={16} />
        <SkeletonBlock width="30%" height={90} borderRadius={16} />
        <SkeletonBlock width="30%" height={90} borderRadius={16} />
      </View>

      <SkeletonBlock height={200} borderRadius={20} style={{ marginTop: 20 }} />
    </View>
  );
}

export function PlanScreenSkeleton() {
  return (
    <View style={[skeletonStyles.container, { backgroundColor: '#000' }]}>
      <View style={skeletonStyles.header}>
        <SkeletonBlock width={80} height={32} borderRadius={8} />
      </View>

      <SkeletonBlock height={48} borderRadius={16} style={{ marginTop: 12 }} />

      <View style={skeletonStyles.dayRow}>
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonBlock key={i} width={42} height={64} borderRadius={14} />
        ))}
      </View>

      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonBlock key={i} height={80} borderRadius={16} style={{ marginTop: 10 }} />
      ))}
    </View>
  );
}

export function ProfileScreenSkeleton() {
  return (
    <View style={skeletonStyles.container}>
      <View style={skeletonStyles.header}>
        <SkeletonBlock width={60} height={16} borderRadius={6} />
        <SkeletonBlock width={100} height={28} borderRadius={8} style={{ marginTop: 6 }} />
      </View>

      <View style={skeletonStyles.profileRow}>
        <SkeletonBlock width={72} height={72} borderRadius={36} />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <SkeletonBlock width={140} height={20} borderRadius={6} />
          <SkeletonBlock width={100} height={14} borderRadius={6} style={{ marginTop: 8 }} />
        </View>
      </View>

      <View style={skeletonStyles.statsRow}>
        <SkeletonBlock width="30%" height={80} borderRadius={16} />
        <SkeletonBlock width="30%" height={80} borderRadius={16} />
        <SkeletonBlock width="30%" height={80} borderRadius={16} />
      </View>

      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonBlock key={i} height={60} borderRadius={14} style={{ marginTop: 8 }} />
      ))}
    </View>
  );
}

export function TimerScreenSkeleton() {
  return (
    <View style={[skeletonStyles.container, { backgroundColor: '#000' }]}>
      <View style={[skeletonStyles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <SkeletonBlock width={80} height={32} borderRadius={8} />
        <SkeletonBlock width={40} height={40} borderRadius={20} />
      </View>

      <View style={skeletonStyles.timerCenter}>
        <SkeletonBlock width={220} height={220} borderRadius={110} />
      </View>

      <View style={[skeletonStyles.statsRow, { marginTop: 32 }]}>
        <SkeletonBlock width="45%" height={48} borderRadius={12} />
        <SkeletonBlock width="45%" height={48} borderRadius={12} />
      </View>
    </View>
  );
}

export { SkeletonBlock };

const skeletonStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  orbArea: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 10,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  progressCenter: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  timerCenter: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
});
