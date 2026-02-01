import { BreathingTechnique } from '@/types/breathing';

export const BREATHING_TECHNIQUES: BreathingTechnique[] = [
  {
    id: 'box-breathing',
    name: 'Box Breathing',
    description: 'Square breathing for stress reduction and improved focus',
    benefits: 'Reduces stress, improves focus — perfect before a task',
    icon: '⬜',
    color: '#4F46E5',
    image: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=400&h=300&fit=crop',
    timerBackground: 'https://r2-pub.rork.com/attachments/kzwn3g2t62apdsufw8z0g',
    totalCycles: 5,
    phases: [
      {
        name: 'Inhale',
        duration: 4,
        instruction: 'Breathe in through your nose',
        type: 'inhale'
      },
      {
        name: 'Hold',
        duration: 4,
        instruction: 'Hold your breath',
        type: 'hold'
      },
      {
        name: 'Exhale',
        duration: 4,
        instruction: 'Breathe out through your mouth',
        type: 'exhale'
      },
      {
        name: 'Pause',
        duration: 4,
        instruction: 'Hold your breath',
        type: 'pause'
      }
    ]
  },
  {
    id: '4-7-8-breathing',
    name: '4-7-8 Breathing',
    description: '4-7-8 breathing for quick relaxation',
    benefits: 'Quickly calms the nervous system, helps with anxiety and insomnia',
    icon: '🌙',
    color: '#7C3AED',
    image: 'https://r2-pub.rork.com/generated-images/5a81de34-e2ee-425a-8050-d05b191f01a8.png',
    totalCycles: 4,
    phases: [
      {
        name: 'Inhale',
        duration: 4,
        instruction: 'Breathe in through your nose',
        type: 'inhale'
      },
      {
        name: 'Hold',
        duration: 7,
        instruction: 'Hold your breath',
        type: 'hold'
      },
      {
        name: 'Exhale',
        duration: 8,
        instruction: 'Breathe out through your mouth with a whoosh',
        type: 'exhale'
      }
    ]
  },
  {
    id: 'diaphragmatic-breathing',
    name: 'Diaphragmatic Breathing',
    description: 'Deep belly breathing for better oxygenation',
    benefits: 'Improves oxygenation, reduces tension — for productivity',
    icon: '🫁',
    color: '#059669',
    image: 'https://r2-pub.rork.com/generated-images/68137b5a-71ad-464e-bd42-ed72a2b7065f.png',
    totalCycles: 10,
    phases: [
      {
        name: 'Inhale',
        duration: 6,
        instruction: 'Breathe deeply into your belly through your nose',
        type: 'inhale'
      },
      {
        name: 'Exhale',
        duration: 6,
        instruction: 'Slowly breathe out through your mouth',
        type: 'exhale'
      }
    ]
  },
  {
    id: 'alternate-nostril',
    name: 'Alternate Nostril',
    description: 'Breathing through alternating nostrils for balance',
    benefits: 'Balances the brain, increases concentration — for focus on complex tasks',
    icon: '👃',
    color: '#DC2626',
    image: 'https://r2-pub.rork.com/generated-images/2ccee4da-75d5-4273-90ec-29e942beeddf.png',
    totalCycles: 8,
    phases: [
      {
        name: 'Inhale Left',
        duration: 4,
        instruction: 'Close right nostril, inhale through left',
        type: 'inhale'
      },
      {
        name: 'Exhale Right',
        duration: 4,
        instruction: 'Close left nostril, exhale through right',
        type: 'exhale'
      },
      {
        name: 'Inhale Right',
        duration: 4,
        instruction: 'Inhale through right nostril',
        type: 'inhale'
      },
      {
        name: 'Exhale Left',
        duration: 4,
        instruction: 'Close right nostril, exhale through left',
        type: 'exhale'
      }
    ]
  },
  {
    id: 'pursed-lip',
    name: 'Pursed Lip Breathing',
    description: 'Slow breathing for panic relief',
    benefits: 'Slows breathing, relieves panic — for quick breaks',
    icon: '💋',
    color: '#EA580C',
    image: 'https://r2-pub.rork.com/generated-images/5492f87f-2d3c-468f-ab91-a4976dcbcbc5.png',
    totalCycles: 6,
    phases: [
      {
        name: 'Inhale',
        duration: 2,
        instruction: 'Breathe in through your nose',
        type: 'inhale'
      },
      {
        name: 'Exhale',
        duration: 4,
        instruction: 'Breathe out through pursed lips (like blowing a candle)',
        type: 'exhale'
      }
    ]
  },
  {
    id: 'calm-wave',
    name: 'Calm Wave',
    description: 'Gentle rhythmic breathing like ocean waves',
    benefits: 'Deep relaxation, reduces anxiety — ideal for winding down',
    icon: '🌊',
    color: '#0EA5E9',
    image: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=400&h=300&fit=crop',
    timerVideo: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769951742/0126_4_l4xx78.mp4',
    totalCycles: 6,
    phases: [
      {
        name: 'Inhale',
        duration: 5,
        instruction: 'Breathe in slowly like a wave rising',
        type: 'inhale'
      },
      {
        name: 'Hold',
        duration: 2,
        instruction: 'Pause at the peak',
        type: 'hold'
      },
      {
        name: 'Exhale',
        duration: 5,
        instruction: 'Release slowly like a wave receding',
        type: 'exhale'
      }
    ]
  },
  {
    id: 'energy-boost',
    name: 'Energy Boost',
    description: 'Invigorating breathing to increase energy and alertness',
    benefits: 'Boosts energy, improves alertness — great for morning or mid-day',
    icon: '⚡',
    color: '#F97316',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
    timerVideo: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769951786/0126_5_u9xcey.mp4',
    totalCycles: 5,
    phases: [
      {
        name: 'Quick Inhale',
        duration: 2,
        instruction: 'Sharp breath in through your nose',
        type: 'inhale'
      },
      {
        name: 'Quick Exhale',
        duration: 2,
        instruction: 'Forceful breath out through your mouth',
        type: 'exhale'
      },
      {
        name: 'Deep Inhale',
        duration: 4,
        instruction: 'Deep breath in filling your lungs',
        type: 'inhale'
      },
      {
        name: 'Hold',
        duration: 3,
        instruction: 'Hold and feel the energy',
        type: 'hold'
      },
      {
        name: 'Release',
        duration: 4,
        instruction: 'Slowly release all tension',
        type: 'exhale'
      }
    ]
  }
];