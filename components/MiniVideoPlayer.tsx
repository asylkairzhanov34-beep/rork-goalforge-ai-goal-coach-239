import React, { useEffect } from 'react';
import { useVideoPlayer, VideoView } from 'expo-video';
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
  const player = useVideoPlayer(uri, (p) => {
    p.loop = loop;
    p.muted = muted;
    if (shouldPlay) p.play();
  });

  useEffect(() => {
    if (shouldPlay) {
      player.play();
    } else {
      player.pause();
    }
  }, [shouldPlay, player]);

  if (Platform.OS === 'web') {
    return <View style={[style, { backgroundColor: '#0A0A14' }]} />;
  }

  return (
    <VideoView
      player={player}
      style={style}
      contentFit={contentFit}
      nativeControls={false}
    />
  );
}

export const MiniVideoPlayer = React.memo(MiniVideoPlayerInner);
export default MiniVideoPlayer;
