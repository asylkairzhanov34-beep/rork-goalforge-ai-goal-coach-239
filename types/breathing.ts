export type BreathingTechnique = {
  id: string;
  name: string;
  description: string;
  benefits: string;
  icon: string;
  phases: BreathingPhase[];
  totalCycles: number;
  color: string;
  image?: string;
  timerBackground?: string;
};

export type BreathingPhase = {
  name: string;
  duration: number; // in seconds
  instruction: string;
  type: 'inhale' | 'hold' | 'exhale' | 'pause';
};

export type BreathingSession = {
  id: string;
  techniqueId: string;
  startTime: Date;
  endTime?: Date;
  completedCycles: number;
  totalCycles: number;
  completed: boolean;
};