import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { Asset } from 'expo-asset';
import { SoundId, getNormalizedVolume } from '@/constants/sounds';

const SOUNDS_CONFIG = [
  { 
    id: 'digital' as SoundId, 
    uri: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg',
    priority: true,
    volume: 1.0,
  },
  { 
    id: 'bell' as SoundId, 
    uri: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
    priority: true,
    volume: 0.7,
  },
  { 
    id: 'crystal' as SoundId, 
    uri: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
    priority: false,
    volume: 0.75,
  },
  { 
    id: 'triple' as SoundId, 
    uri: 'https://actions.google.com/sounds/v1/alarms/medium_bell_ringing_near.ogg',
    priority: false,
    volume: 0.85,
  },
];

const CONCURRENCY = 3;

interface SoundEntry {
  sound: AudioPlayer | null;
  loaded: boolean;
  error?: Error;
}

class SoundManagerClass {
  private sounds: Record<string, SoundEntry> = {};
  private loading: Set<string> = new Set();
  private configured: boolean = false;
  private currentPreviewSound: AudioPlayer | null = null;
  private currentTimerSound: AudioPlayer | null = null;

  async configure(): Promise<void> {
    if (this.configured) return;
    
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        interruptionMode: 'duckOthers',
        interruptionModeAndroid: 'duckOthers',
        shouldPlayInBackground: false,
      });
      this.configured = true;
      console.log('[SOUND MANAGER] Audio configured');
    } catch (error) {
      console.error('[SOUND MANAGER] Failed to configure audio:', error);
    }
  }

  private async downloadAsset(uri: string): Promise<string> {
    try {
      const asset = Asset.fromURI(uri);
      if (!asset.downloaded) {
        console.log(`[SOUND MANAGER] Downloading asset: ${uri.substring(0, 50)}...`);
        await asset.downloadAsync();
      }
      return asset.localUri || asset.uri;
    } catch (err) {
      console.warn(`[SOUND MANAGER] Asset download fallback for ${uri.substring(0, 50)}`);
      return uri;
    }
  }

  private async _loadSound(entry: typeof SOUNDS_CONFIG[0]): Promise<void> {
    const { id, uri } = entry;
    
    if (this.sounds[id]?.loaded) {
      console.log(`[SOUND MANAGER] ${id} already loaded, skipping`);
      return;
    }
    
    if (this.loading.has(id)) {
      console.log(`[SOUND MANAGER] ${id} already loading, skipping`);
      return;
    }

    this.loading.add(id);
    
    try {
      const localUri = await this.downloadAsset(uri);
      const normalizedVolume = getNormalizedVolume(id);
      
      const sound = createAudioPlayer({ uri: localUri });
      sound.volume = normalizedVolume;
      
      this.sounds[id] = { sound, loaded: true };
      console.log(`[SOUND LOADED] ${id} at volume ${normalizedVolume.toFixed(2)}`);
    } catch (error) {
      console.error(`[SOUND LOAD ERROR] ${id}:`, error);
      this.sounds[id] = { 
        sound: null,
        loaded: false, 
        error: error as Error 
      };
    } finally {
      this.loading.delete(id);
    }
  }

  async preloadAll(): Promise<void> {
    await this.configure();
    
    console.log('[SOUND MANAGER] Starting preload...');
    
    const priority = SOUNDS_CONFIG.filter(s => s.priority);
    const others = SOUNDS_CONFIG.filter(s => !s.priority);

    console.log(`[SOUND MANAGER] Loading ${priority.length} priority sounds first`);
    await Promise.all(priority.map(s => this._loadSound(s)));

    console.log(`[SOUND MANAGER] Loading ${others.length} remaining sounds with concurrency ${CONCURRENCY}`);
    const queue = [...others];
    const workers = Array(Math.min(CONCURRENCY, queue.length))
      .fill(null)
      .map(async () => {
        while (queue.length > 0) {
          const sound = queue.shift();
          if (sound) {
            await this._loadSound(sound);
          }
        }
      });
    
    await Promise.all(workers);

    console.log('[SOUND MANAGER] Preload complete');
  }

  private async _stopAndUnloadPreview(): Promise<void> {
    if (this.currentPreviewSound) {
      try {
        this.currentPreviewSound.pause();
      } catch {}
      try {
        this.currentPreviewSound.remove();
      } catch {}
      this.currentPreviewSound = null;
      console.log('[PREVIEW] Stopped and unloaded previous preview');
    }
  }

  private async _stopAndUnloadTimer(): Promise<void> {
    if (this.currentTimerSound) {
      try {
        this.currentTimerSound.pause();
      } catch {}
      try {
        this.currentTimerSound.remove();
      } catch {}
      this.currentTimerSound = null;
      console.log('[TIMER] Stopped and unloaded previous timer sound');
    }
  }

  async playPreview(id: SoundId, options: { volume?: number } = {}): Promise<void> {
    await this._stopAndUnloadPreview();

    try {
      const config = this.getSoundConfig(id);
      if (!config) {
        console.warn(`[PREVIEW] Sound config not found: ${id}`);
        return;
      }

      const localUri = await this.downloadAsset(config.uri);
      const normalizedVolume = getNormalizedVolume(id);
      const finalVolume = options.volume ?? normalizedVolume;

      const sound = createAudioPlayer({ uri: localUri });
      sound.volume = finalVolume;
      sound.loop = false;

      this.currentPreviewSound = sound;

      sound.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          this._stopAndUnloadPreview();
        }
      });
      
      sound.play();

      console.log(`[PREVIEW PLAY] ${id} at volume ${finalVolume.toFixed(2)}`);
    } catch (error) {
      console.error(`[PREVIEW ERROR] ${id}:`, error);
    }
  }

  async playTimerSound(id: SoundId, options: { volume?: number } = {}): Promise<void> {
    await this._stopAndUnloadPreview();
    await this._stopAndUnloadTimer();

    try {
      const config = this.getSoundConfig(id);
      if (!config) {
        console.warn(`[TIMER] Sound config not found: ${id}`);
        return;
      }

      const localUri = await this.downloadAsset(config.uri);
      const normalizedVolume = getNormalizedVolume(id);
      const finalVolume = options.volume ?? normalizedVolume;

      const sound = createAudioPlayer({ uri: localUri });
      sound.volume = finalVolume;
      sound.loop = false;

      this.currentTimerSound = sound;

      sound.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          this._stopAndUnloadTimer();
        }
      });
      
      sound.play();

      console.log(`[TIMER SOUND PLAYED] ${id} at volume ${finalVolume.toFixed(2)}`);
    } catch (error) {
      console.error(`[TIMER SOUND ERROR] ${id}:`, error);
    }
  }

  async stop(id: SoundId): Promise<void> {
    try {
      const entry = this.sounds[id];
      if (entry?.loaded && entry.sound) {
        entry.sound.pause();
        entry.sound.seekTo(0);
      }
    } catch (error) {
      console.error(`[STOP ERROR] ${id}:`, error);
    }
  }

  isLoaded(id: SoundId): boolean {
    return this.sounds[id]?.loaded ?? false;
  }

  areAllLoaded(): boolean {
    return SOUNDS_CONFIG.every(config => this.isLoaded(config.id));
  }

  getLoadedCount(): number {
    return SOUNDS_CONFIG.filter(config => this.isLoaded(config.id)).length;
  }

  getTotalCount(): number {
    return SOUNDS_CONFIG.length;
  }

  getSoundConfig(id: SoundId) {
    return SOUNDS_CONFIG.find(s => s.id === id);
  }

  async unloadAll(): Promise<void> {
    console.log('[SOUND MANAGER] Unloading all sounds...');
    
    await this._stopAndUnloadPreview();
    await this._stopAndUnloadTimer();
    
    const unloadPromises = Object.entries(this.sounds).map(async ([id, entry]) => {
      if (entry?.sound) {
        try {
          entry.sound.remove();
          console.log(`[SOUND UNLOADED] ${id}`);
        } catch (error) {
          console.error(`[UNLOAD ERROR] ${id}:`, error);
        }
      }
    });
    
    await Promise.all(unloadPromises);
    this.sounds = {};
    this.configured = false;
  }
}

export const SoundManager = new SoundManagerClass();
