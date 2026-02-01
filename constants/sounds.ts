import { Volume2, Bell, Music, Zap, AudioWaveform, Radio, Disc3, Sparkles } from 'lucide-react-native';

export type SoundId = 'chime1' | 'chime2' | 'chime3' | 'bell1' | 'bell2' | 'tone1' | 'tone2' | 'tone3';

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
  chime1: 1.0,
  chime2: 1.0,
  chime3: 1.0,
  bell1: 1.0,
  bell2: 1.0,
  tone1: 1.0,
  tone2: 1.0,
  tone3: 1.0,
};

export const SOUNDS_CONFIG: SoundConfig[] = [
  {
    id: 'chime1',
    label: 'Chime 1',
    description: 'Soft chime sound',
    icon: Music,
    uri: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769967705/sg_131201_gqh9uh.mp3',
    volume: Math.min(DEFAULT_VOLUME * VOLUME_ADJUSTMENTS.chime1, 1.0),
  },
  {
    id: 'chime2',
    label: 'Chime 2',
    description: 'Gentle chime',
    icon: Bell,
    uri: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769967705/sg_131202_ztlcao.mp3',
    volume: Math.min(DEFAULT_VOLUME * VOLUME_ADJUSTMENTS.chime2, 1.0),
  },
  {
    id: 'chime3',
    label: 'Chime 3',
    description: 'Crystal chime',
    icon: Sparkles,
    uri: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769967705/sg_131203_iylq22.mp3',
    volume: Math.min(DEFAULT_VOLUME * VOLUME_ADJUSTMENTS.chime3, 1.0),
  },
  {
    id: 'bell1',
    label: 'Bell 1',
    description: 'Soft bell sound',
    icon: Volume2,
    uri: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769967714/sg_131204_scaxw5.mp3',
    volume: Math.min(DEFAULT_VOLUME * VOLUME_ADJUSTMENTS.bell1, 1.0),
  },
  {
    id: 'bell2',
    label: 'Bell 2',
    description: 'Clear bell tone',
    icon: Zap,
    uri: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769967706/sg_131205_ch9myx.mp3',
    volume: Math.min(DEFAULT_VOLUME * VOLUME_ADJUSTMENTS.bell2, 1.0),
  },
  {
    id: 'tone1',
    label: 'Tone 1',
    description: 'Calm notification',
    icon: AudioWaveform,
    uri: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769967706/sg_131206_aglji8.mp3',
    volume: Math.min(DEFAULT_VOLUME * VOLUME_ADJUSTMENTS.tone1, 1.0),
  },
  {
    id: 'tone2',
    label: 'Tone 2',
    description: 'Meditation tone',
    icon: Radio,
    uri: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769967706/sg_131208_sqlpwo.mp3',
    volume: Math.min(DEFAULT_VOLUME * VOLUME_ADJUSTMENTS.tone2, 1.0),
  },
  {
    id: 'tone3',
    label: 'Tone 3',
    description: 'Zen notification',
    icon: Disc3,
    uri: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769967706/sg_131209_avomms.mp3',
    volume: Math.min(DEFAULT_VOLUME * VOLUME_ADJUSTMENTS.tone3, 1.0),
  },
];

export const DEFAULT_SOUND_ID: SoundId = 'chime1';

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
