import { Volume2, Bell, Music, Zap } from 'lucide-react-native';

export type SoundId = 'triple' | 'bell' | 'crystal' | 'digital';

export interface SoundConfig {
  id: SoundId;
  label: string;
  description: string;
  icon: typeof Volume2;
  uri: string;
  volume: number;
}

export const DEFAULT_VOLUME = 0.9 as const;

export const VOLUME_ADJUSTMENTS: Record<SoundId, number> = {
  triple: 0.95,
  bell: 1.15,
  crystal: 1.05,
  digital: 0.95,
};

export const SOUNDS_CONFIG: SoundConfig[] = [
  {
    id: 'bell',
    label: 'Soft Bell',
    description: 'Gentle bell sound',
    icon: Music,
    uri: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
    volume: Math.min(DEFAULT_VOLUME * VOLUME_ADJUSTMENTS.bell, 1.0),
  },
  {
    id: 'crystal',
    label: 'Crystal Tone',
    description: 'Clear crystal sound',
    icon: Zap,
    uri: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
    volume: Math.min(DEFAULT_VOLUME * VOLUME_ADJUSTMENTS.crystal, 1.0),
  },
  {
    id: 'digital',
    label: 'Digital Signal',
    description: 'Modern alert tone',
    icon: Volume2,
    uri: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg',
    volume: Math.min(DEFAULT_VOLUME * VOLUME_ADJUSTMENTS.digital, 1.0),
  },
  {
    id: 'triple',
    label: 'Triple Chime',
    description: 'Three soft chimes',
    icon: Bell,
    uri: 'https://actions.google.com/sounds/v1/alarms/medium_bell_ringing_near.ogg',
    volume: Math.min(DEFAULT_VOLUME * VOLUME_ADJUSTMENTS.triple, 1.0),
  },
];

export const DEFAULT_SOUND_ID: SoundId = 'bell';

export function getSoundById(id: SoundId): SoundConfig | undefined {
  return SOUNDS_CONFIG.find(sound => sound.id === id);
}

export function getSoundUri(id: SoundId): string {
  const sound = getSoundById(id);
  return sound?.uri || SOUNDS_CONFIG[0].uri;
}

export function getSoundVolume(id: SoundId): number {
  const sound = getSoundById(id);
  return sound?.volume || DEFAULT_VOLUME;
}

export function getNormalizedVolume(id: SoundId): number {
  const adjustment = VOLUME_ADJUSTMENTS[id] || 1.0;
  return Math.min(DEFAULT_VOLUME * adjustment, 1.0);
}
