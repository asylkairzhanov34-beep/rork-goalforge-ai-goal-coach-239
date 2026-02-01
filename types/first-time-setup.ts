export interface FirstTimeProfile {
  nickname: string;
  birthdate?: Date;
  avatar?: string;
  primaryGoal?: 'focus' | 'discipline' | 'calm' | 'ambition';
  productivityTime?: 'morning' | 'afternoon' | 'evening' | 'unknown';
  isCompleted: boolean;
}

export type FirstTimeProfileSerialized = Omit<FirstTimeProfile, 'birthdate'> & {
  birthdate?: string;
};

export interface FirstTimeSetupState {
  profile: FirstTimeProfile | null;
  currentStep: number;
  isLoading: boolean;
}

export type PrimaryGoalOption = {
  id: 'focus' | 'discipline' | 'calm' | 'ambition';
  icon: string;
  title: string;
  description: string;
};

export type ProductivityTimeOption = {
  id: 'morning' | 'afternoon' | 'evening';
  icon: string;
  title: string;
  time: string;
};
