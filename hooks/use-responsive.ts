import { useWindowDimensions } from 'react-native';
import { useMemo } from 'react';

export interface ResponsiveLayout {
  width: number;
  height: number;
  isTablet: boolean;
  contentMaxWidth: number;
  contentPadding: number;
  orbSize: number;
  orbSwipeOffset: number;
  gridColumns: number;
  profileOrbGridItemWidth: number;
  timerSize: number;
  challengeCardWidth: number;
  horizontalCardWidth: number;
}

export function useResponsive(): ResponsiveLayout {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isTablet = width >= 768;
    const contentMaxWidth = isTablet ? 600 : width;
    const contentPadding = isTablet ? Math.max((width - contentMaxWidth) / 2, 20) : 20;

    const effectiveWidth = Math.min(width, contentMaxWidth);

    const orbSize = isTablet
      ? Math.min(effectiveWidth * 0.45, 280)
      : effectiveWidth * 0.56;

    const orbSwipeOffset = isTablet
      ? Math.min(effectiveWidth * 0.35, 200)
      : effectiveWidth * 0.45;

    const gridColumns = isTablet ? 4 : 3;
    const gridGap = 12;
    const gridPadding = 32;
    const profileOrbGridItemWidth = isTablet
      ? (contentMaxWidth - gridPadding - gridGap * (gridColumns - 1)) / gridColumns
      : (width - 40 - gridPadding - gridGap * 2) / 3;

    const timerSize = isTablet
      ? Math.min(effectiveWidth * 0.55, 300)
      : Math.min(effectiveWidth * 0.7, 280);

    const challengeCardWidth = isTablet ? 300 : 280;
    const horizontalCardWidth = isTablet ? 300 : 260;

    return {
      width,
      height,
      isTablet,
      contentMaxWidth,
      contentPadding,
      orbSize,
      orbSwipeOffset,
      gridColumns,
      profileOrbGridItemWidth,
      timerSize,
      challengeCardWidth,
      horizontalCardWidth,
    };
  }, [width, height]);
}
