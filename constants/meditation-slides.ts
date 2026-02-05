export interface MeditationSlide {
  id: string;
  videoUrl: string;
  title: string;
  subtitle: string;
  duration: number; // seconds
  color: string;
}

export const MEDITATION_SLIDES: MeditationSlide[] = [
  {
    id: '1',
    videoUrl: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1770256925/1_dtxbqj.mp4',
    title: 'Find Your Center',
    subtitle: 'Let the mountains ground you',
    duration: 8,
    color: '#4A90A4',
  },
  {
    id: '2',
    videoUrl: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1770256921/2_wqb08l.mp4',
    title: 'Flow Like Water',
    subtitle: 'Release all tension',
    duration: 10,
    color: '#2E7D9A',
  },
  {
    id: '3',
    videoUrl: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1770256925/3_wabwnn.mp4',
    title: 'Embrace Stillness',
    subtitle: 'The forest whispers peace',
    duration: 9,
    color: '#3D6B4F',
  },
  {
    id: '4',
    videoUrl: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1770256929/4_bfxu2r.mp4',
    title: 'Infinite Calm',
    subtitle: 'Waves of tranquility',
    duration: 11,
    color: '#5BA3C6',
  },
  {
    id: '5',
    videoUrl: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1770256924/5_tg2gxq.mp4',
    title: 'Ready to Focus',
    subtitle: 'Your mind is clear',
    duration: 10,
    color: '#E8A87C',
  },
];
