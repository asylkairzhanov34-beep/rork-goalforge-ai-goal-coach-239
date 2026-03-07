import React, { useRef, useEffect } from 'react';
import { Video, ResizeMode } from 'expo-av';
import { Platform, View, type ViewStyle } from 'react-native';

interface MiniVideoPlayerProps {
  uri: string;
  style?: ViewStyle;
  shouldPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  contentFit?: 'contain' | 'cover' | 'fill';
}

function MiniVideoPlayerInner({ uri, style, shouldPlay = true, loop = true, muted = true, contentFit = 'cover' }: MiniVideoPlayerProps) {
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    if (videoRef.current) {
      if (shouldPlay) {
        videoRef.current.playAsync().catch(() => {});
      } else {
        videoRef.current.pauseAsync().catch(() => {});
      }
    }
  }, [shouldPlay]);

  const resizeMode = contentFit === 'cover' ? ResizeMode.COVER : contentFit === 'contain' ? ResizeMode.CONTAIN : ResizeMode.STRETCH;

  if (Platform.OS === 'web') {
    return <View style={[style, { backgroundColor: '#0A0A14' }]} />;
  }

  return (
    <Video
      ref={videoRef}
      source={{ uri }}
      style={style}
      resizeMode={resizeMode}
      shouldPlay={shouldPlay}
      isLooping={loop}
      isMuted={muted}
      useNativeControls={false}
    />
  );
}

export const MiniVideoPlayer = React.memo(MiniVideoPlayerInner);
export default MiniVideoPlayer;
