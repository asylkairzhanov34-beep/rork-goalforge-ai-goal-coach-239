import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, Vibration } from 'react-native';
import { BreathingTechnique, BreathingSession, BreathingPhase } from '@/types/breathing';
import { BREATHING_TECHNIQUES } from '@/constants/breathing';

export function useBreathingTimer() {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTechnique, setCurrentTechnique] = useState<BreathingTechnique | null>(null);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [phaseTimeLeft, setPhaseTimeLeft] = useState(0);
  const [totalTimeElapsed, setTotalTimeElapsed] = useState(0);
  const [sessions, setSessions] = useState<BreathingSession[]>([]);
  const [currentSession, setCurrentSession] = useState<BreathingSession | null>(null);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  
  // Use refs to avoid stale closures in setInterval
  const currentTechniqueRef = useRef<BreathingTechnique | null>(null);
  const currentCycleRef = useRef(0);
  const currentPhaseIndexRef = useRef(0);
  const currentSessionRef = useRef<BreathingSession | null>(null);

  const currentPhase: BreathingPhase | null = currentTechnique?.phases?.[currentPhaseIndex] ?? null;

  const startSession = useCallback((technique: BreathingTechnique) => {
    if (!technique || !technique.id || !technique.phases || technique.phases.length === 0) {
      console.log('[BreathingTimer] Invalid technique:', technique);
      return;
    }
    
    const firstPhase = technique.phases[0];
    if (!firstPhase || typeof firstPhase.duration !== 'number') {
      console.log('[BreathingTimer] Invalid first phase:', firstPhase);
      return;
    }
    
    const session: BreathingSession = {
      id: Date.now().toString(),
      techniqueId: technique.id,
      startTime: new Date(),
      completedCycles: 0,
      totalCycles: technique.totalCycles,
      completed: false
    };

    // Update refs first
    currentTechniqueRef.current = technique;
    currentCycleRef.current = 0;
    currentPhaseIndexRef.current = 0;
    currentSessionRef.current = session;
    
    // Then update state
    setCurrentSession(session);
    setCurrentTechnique(technique);
    setCurrentCycle(0);
    setCurrentPhaseIndex(0);
    setPhaseTimeLeft(firstPhase.duration);
    setTotalTimeElapsed(0);
    setSessionCompleted(false);
    setIsActive(true);
    setIsPaused(false);
    startTimeRef.current = new Date();
    
    console.log('[BreathingTimer] Session started:', technique.name);
  }, []);

  const pauseSession = useCallback(() => {
    setIsPaused(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    console.log('[BreathingTimer] Session paused');
  }, []);

  const resumeSession = useCallback(() => {
    setIsPaused(false);
    startTimeRef.current = new Date();
    console.log('[BreathingTimer] Session resumed');
  }, []);

  const stopSession = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    const session = currentSessionRef.current;
    const cycle = currentCycleRef.current;
    
    if (session) {
      const updatedSession = {
        ...session,
        endTime: new Date(),
        completedCycles: cycle,
        completed: false
      };
      setSessions(prev => [...prev, updatedSession]);
    }

    // Clear refs
    currentTechniqueRef.current = null;
    currentCycleRef.current = 0;
    currentPhaseIndexRef.current = 0;
    currentSessionRef.current = null;
    
    // Clear state
    setIsActive(false);
    setIsPaused(false);
    setCurrentSession(null);
    setCurrentTechnique(null);
    setCurrentCycle(0);
    setCurrentPhaseIndex(0);
    setPhaseTimeLeft(0);
    setTotalTimeElapsed(0);
    setSessionCompleted(false);
    
    console.log('[BreathingTimer] Session stopped');
  }, []);

  const completeSession = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    const session = currentSessionRef.current;
    const technique = currentTechniqueRef.current;
    
    if (session) {
      const completedSession = {
        ...session,
        endTime: new Date(),
        completedCycles: technique?.totalCycles || 0,
        completed: true
      };
      setSessions(prev => [...prev, completedSession]);
    }

    // Clear refs
    currentTechniqueRef.current = null;
    currentCycleRef.current = 0;
    currentPhaseIndexRef.current = 0;
    currentSessionRef.current = null;
    
    // Clear state
    setIsActive(false);
    setIsPaused(false);
    setCurrentSession(null);
    setCurrentTechnique(null);
    setCurrentCycle(0);
    setCurrentPhaseIndex(0);
    setPhaseTimeLeft(0);
    setTotalTimeElapsed(0);
    setSessionCompleted(false);
    
    console.log('[BreathingTimer] Session completed!');
  }, []);

  // Sync refs with state
  useEffect(() => {
    currentCycleRef.current = currentCycle;
  }, [currentCycle]);
  
  useEffect(() => {
    currentPhaseIndexRef.current = currentPhaseIndex;
  }, [currentPhaseIndex]);

  // Handle session completion
  useEffect(() => {
    if (sessionCompleted) {
      completeSession();
    }
  }, [sessionCompleted, completeSession]);

  // Timer effect
  useEffect(() => {
    if (isActive && !isPaused && currentTechnique) {
      console.log('[BreathingTimer] Starting timer interval');
      
      intervalRef.current = setInterval(() => {
        setPhaseTimeLeft(prev => {
          const technique = currentTechniqueRef.current;
          if (!technique || !technique.phases || technique.phases.length === 0) {
            console.log('[BreathingTimer] No technique in interval, stopping');
            return prev;
          }
          
          if (prev <= 1) {
            const phaseIdx = currentPhaseIndexRef.current;
            const cycle = currentCycleRef.current;
            const phase = technique.phases[phaseIdx];
            
            // Vibrate on exhale phases
            if (phase?.type === 'exhale' && Platform.OS !== 'web') {
              try {
                Vibration.vibrate(200);
              } catch (e) {
                console.log('[BreathingTimer] Vibration error:', e);
              }
            }

            // Move to next phase
            const nextPhaseIndex = phaseIdx + 1;
            
            if (nextPhaseIndex >= technique.phases.length) {
              // Cycle completed
              const nextCycle = cycle + 1;
              
              if (nextCycle >= technique.totalCycles) {
                // Session completed - trigger via state to avoid closure issues
                console.log('[BreathingTimer] All cycles completed, triggering completion');
                setSessionCompleted(true);
                return 0;
              } else {
                // Start next cycle
                console.log('[BreathingTimer] Cycle', nextCycle, 'starting');
                currentCycleRef.current = nextCycle;
                currentPhaseIndexRef.current = 0;
                setCurrentCycle(nextCycle);
                setCurrentPhaseIndex(0);
                const firstPhase = technique.phases[0];
                return firstPhase?.duration ?? 4;
              }
            } else {
              // Move to next phase in current cycle
              const nextPhase = technique.phases[nextPhaseIndex];
              console.log('[BreathingTimer] Moving to phase', nextPhaseIndex, nextPhase?.name);
              currentPhaseIndexRef.current = nextPhaseIndex;
              setCurrentPhaseIndex(nextPhaseIndex);
              return nextPhase?.duration ?? 4;
            }
          }
          return prev - 1;
        });
        
        setTotalTimeElapsed(prev => prev + 1);
      }, 1000);

      return () => {
        if (intervalRef.current) {
          console.log('[BreathingTimer] Clearing timer interval');
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
  }, [isActive, isPaused, currentTechnique]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const getTechnique = (id: string) => {
    return BREATHING_TECHNIQUES.find(t => t.id === id) || null;
  };

  const getTodaySessions = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return sessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === today.getTime();
    });
  };

  const getProgress = () => {
    if (!currentTechnique || !currentPhase) return 0;
    
    const totalPhaseTime = currentPhase.duration;
    const timeElapsed = totalPhaseTime - phaseTimeLeft;
    return timeElapsed / totalPhaseTime;
  };

  const getOverallProgress = () => {
    if (!currentTechnique) return 0;
    
    const totalPhases = currentTechnique.totalCycles * currentTechnique.phases.length;
    const completedPhases = currentCycle * currentTechnique.phases.length + currentPhaseIndex;
    const currentPhaseProgress = getProgress();
    
    return (completedPhases + currentPhaseProgress) / totalPhases;
  };

  return {
    // State
    isActive,
    isPaused,
    currentTechnique,
    currentCycle,
    currentPhase,
    phaseTimeLeft,
    totalTimeElapsed,
    sessions,
    currentSession,
    
    // Actions
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    
    // Helpers
    getTechnique,
    getTodaySessions,
    getProgress,
    getOverallProgress,
    
    // Constants
    techniques: BREATHING_TECHNIQUES
  };
}