import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, ActivityIndicator } from 'react-native';

export function AppLoadingScreen({ testID }: { testID?: string }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <View style={styles.container} testID={testID}>
      <Animated.View style={[styles.loaderWrap, { opacity: fadeAnim }]}>
        <ActivityIndicator size="small" color="rgba(255,215,0,0.5)" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loaderWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
