# Revert expo-video/expo-audio migration back to expo-av

## What will be changed

All the changes from the previous migration (expo-av → expo-video + expo-audio) will be reverted. The app will go back to using **expo-av** for all video and audio playback.

### Changes:

1. - [x] **Remove expo-video and expo-audio packages**, add back **expo-av**
2. - [x] **Update app config** — remove expo-video and expo-audio plugins, add expo-av back
3. - [x] **Revert video intro screens** — both intro video screens will use expo-av's `Video` component instead of `expo-video`
4. - [x] **Revert meditation feed** — video playback and audio mode will use expo-av
5. - [x] **Revert timer screen** — lo-fi radio streaming will use expo-av's `Audio.Sound` instead of `expo-audio`
6. - [x] **Revert video splash screen** — will use expo-av's `Video` component
7. - [x] **Revert chat screen** — voice recording will use expo-av's `Audio.Recording` instead of `expo-audio`
8. - [x] **Revert MiniVideoPlayer component** — will use expo-av's `Video` component
9. - [x] **RewardOrb, VideoOrb, BreathingTimer, Profile** — these use MiniVideoPlayer, so they'll work automatically after MiniVideoPlayer is reverted

This restores the app to the exact state before the migration was applied.
