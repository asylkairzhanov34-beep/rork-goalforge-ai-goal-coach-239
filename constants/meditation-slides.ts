export interface MeditationSlide {
  id: string;
  imageUrl: string;
  title: string;
  subtitle: string;
  duration: number; // seconds
  color: string;
}

export const MEDITATION_SLIDES: MeditationSlide[] = [
  {
    id: '1',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1080&q=80',
    title: 'Find Your Center',
    subtitle: 'Let the mountains ground you',
    duration: 8,
    color: '#4A90A4',
  },
  {
    id: '2',
    imageUrl: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1080&q=80',
    title: 'Flow Like Water',
    subtitle: 'Release all tension',
    duration: 8,
    color: '#2E7D9A',
  },
  {
    id: '3',
    imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1080&q=80',
    title: 'Embrace Stillness',
    subtitle: 'The forest whispers peace',
    duration: 8,
    color: '#3D6B4F',
  },
  {
    id: '4',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1080&q=80',
    title: 'Infinite Calm',
    subtitle: 'Waves of tranquility',
    duration: 8,
    color: '#5BA3C6',
  },
  {
    id: '5',
    imageUrl: 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=1080&q=80',
    title: 'Ready to Focus',
    subtitle: 'Your mind is clear',
    duration: 6,
    color: '#E8A87C',
  },
];
