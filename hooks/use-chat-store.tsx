import createContextHook from '@nkzw/create-context-hook';
import { useGoalStore } from '@/hooks/use-goal-store';
import { useProgress } from '@/hooks/use-progress';
import { useAuth } from '@/hooks/use-auth-store';
import { ChatMessage, ChatAttachment } from '@/types/chat';
import { safeStorageGet, safeStorageSet } from '@/utils/storage-helper';
import { getUserChatHistory, saveUserChatHistory } from '@/lib/firebase';
import { generateText } from '@rork-ai/toolkit-sdk';

import { useMemo, useCallback, useState, useRef, useEffect } from 'react';

type OpenAIContentPart = 
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | OpenAIContentPart[];
}

export interface MessageWithAttachments {
  text: string;
  attachments?: ChatAttachment[];
}

export interface GeneratedTaskData {
  title: string;
  description: string;
  duration: string;
  priority: 'high' | 'medium' | 'low';
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number;
  tips: string[];
  date: string;
  existingTaskId?: string;
}

let pendingTaskData: GeneratedTaskData | null = null;

export const getPendingTaskData = () => pendingTaskData;
export const clearPendingTaskData = () => { pendingTaskData = null; };

interface TaskCreationState {
  isActive: boolean;
  stage: 'asking_title' | 'asking_details' | 'confirming' | null;
  collectedInfo: {
    title?: string;
    description?: string;
    duration?: string;
    priority?: 'high' | 'medium' | 'low';
    date?: string;
  };
}

const getChatStorageKey = (userId: string) => `chat_history_${userId}`;

export const [ChatProvider, useChat] = createContextHook(() => {
  const { user } = useAuth();
  const goalStore = useGoalStore();
  const progress = useProgress();
  const [messages, setMessages] = useState<OpenAIMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskFormData, setTaskFormData] = useState<GeneratedTaskData | null>(null);
  const [chatLoaded, setChatLoaded] = useState(false);
  const taskCreationState = useRef<TaskCreationState>({
    isActive: false,
    stage: null,
    collectedInfo: {},
  });

  const userId = user?.id || 'default';
  const isRealUser = !!user?.id && !user.id.startsWith('dev_guest_');
  const chatStorageKey = getChatStorageKey(userId);

  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        console.log('[Chat] Loading chat history for user:', userId);

        if (isRealUser) {
          try {
            const firebaseMessages = await getUserChatHistory(userId);
            if (firebaseMessages && firebaseMessages.length > 0) {
              console.log('[Chat] Loaded from Firebase:', firebaseMessages.length);
              setMessages(firebaseMessages);
              await safeStorageSet(chatStorageKey, firebaseMessages);
              setChatLoaded(true);
              return;
            }
          } catch (error) {
            console.warn('[Chat] Firebase chat load failed:', error);
          }
        }

        const stored = await safeStorageGet<OpenAIMessage[]>(chatStorageKey, []);
        if (stored.length > 0) {
          console.log('[Chat] Loaded from local:', stored.length);
          setMessages(stored);

          if (isRealUser) {
            saveUserChatHistory(userId, stored).catch(e =>
              console.warn('[Chat] Background chat sync failed:', e)
            );
          }
        }
      } catch (error) {
        console.warn('[Chat] Error loading chat history:', error);
      } finally {
        setChatLoaded(true);
      }
    };

    loadChatHistory();
  }, [userId]);

  const persistMessages = useCallback((newMessages: OpenAIMessage[]) => {
    const toSave = newMessages.filter(m => m.role !== 'system').slice(-50);
    safeStorageSet(chatStorageKey, toSave).catch(e =>
      console.warn('[Chat] Local chat save failed:', e)
    );
    if (isRealUser) {
      saveUserChatHistory(userId, toSave).catch(e =>
        console.warn('[Chat] Firebase chat save failed:', e)
      );
    }
  }, [chatStorageKey, isRealUser, userId]);

  const detectTaskCreationIntent = useCallback((text: string): boolean => {
    const lowerText = text.toLowerCase();
    const taskKeywords = [
      'add task', 'create task', 'new task', 'добавь задачу', 'создай задачу',
      'добавить задачу', 'создать задачу', 'новая задача', 'запланируй',
      'schedule', 'plan task', 'add to plan', 'добавь в план', 'remind me to',
      'напомни мне', 'нужно сделать', 'need to do', 'want to do', 'хочу сделать',
      'задача', 'task'
    ];
    return taskKeywords.some(keyword => lowerText.includes(keyword));
  }, []);

  const detectConfirmation = useCallback((text: string): boolean => {
    const lowerText = text.toLowerCase();
    const confirmWords = ['да', 'yes', 'ок', 'ok', 'окей', 'okay', 'давай', 'go', 'sure', 'конечно', 'добавь', 'создай', 'подтверждаю', 'confirm', 'добавить', 'сохранить', 'save'];
    return confirmWords.some(word => lowerText.includes(word));
  }, []);

  const detectCancellation = useCallback((text: string): boolean => {
    const lowerText = text.toLowerCase();
    const cancelWords = ['нет', 'no', 'отмена', 'cancel', 'стоп', 'stop', 'не надо', 'отменить', 'назад', 'back'];
    return cancelWords.some(word => lowerText.includes(word));
  }, []);

  const parseTaskJSON = useCallback((text: string): GeneratedTaskData | null => {
    try {
      let content = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const startIdx = content.indexOf('{');
      const endIdx = content.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        content = content.substring(startIdx, endIdx + 1);
      }
      return JSON.parse(content) as GeneratedTaskData;
    } catch {
      console.error('[Chat] Failed to parse task JSON from:', text.substring(0, 100));
      return null;
    }
  }, []);

  const generateTaskFromAI = useCallback(async (userRequest: string): Promise<GeneratedTaskData | null> => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    try {
      const result = await generateText({
        messages: [
          { role: 'user', content: `Generate a task based on this request: "${userRequest}". Today's date is ${todayStr}. Respond in the same language as the request. Return ONLY valid JSON with these fields: title (string, max 50 chars), description (string), duration (string like "30 minutes"), priority ("high"|"medium"|"low"), difficulty ("easy"|"medium"|"hard"), estimatedTime (number in minutes), tips (array of 2 strings), date ("${todayStr}").` }
        ],
      });
      console.log('[Chat] Generated task text:', result);
      return parseTaskJSON(result);
    } catch (error) {
      console.error('[Chat] Task generation error:', error);
      return null;
    }
  }, [parseTaskJSON]);

  const buildSystemPrompt = useCallback(() => {
    const tasks = goalStore.dailyTasks || [];
    const currentGoal = goalStore.currentGoal;
    const today = new Date().toISOString().split('T')[0];
    
    const todayTasks = tasks.filter(t => t.date?.startsWith(today));
    const completedToday = todayTasks.filter(t => t.completed).length;
    
    const currentStreak = progress?.currentStreak ?? 0;
    const bestStreak = progress?.bestStreak ?? 0;
    const totalCompletedTasks = progress?.totalCompletedTasks ?? tasks.filter(t => t.completed).length;
    const focusTimeDisplay = progress?.focusTimeDisplay ?? '0m';
    
    let prompt = `You are GoalForge AI - a friendly productivity coach with FULL task management access. Today: ${today}.\n\n`;
    prompt += `CAPABILITIES:\n`;
    prompt += `- You CAN create, manage, and organize tasks for the user\n`;
    prompt += `- When user asks to add a task, confirm you're creating it and describe what you're adding\n`;
    prompt += `- Provide motivation, advice, and analyze progress\n`;
    prompt += `- Be concise and helpful (2-4 sentences max)\n`;
    prompt += `- Use a friendly, encouraging tone\n`;
    prompt += `- IMPORTANT: Respond in the same language as the user\n\n`;
    
    if (currentGoal) {
      prompt += `User's goal: "${currentGoal.title}"\n`;
      if (currentGoal.endDate) {
        prompt += `Deadline: ${currentGoal.endDate}\n`;
      }
    }
    
    prompt += `\nStats: ${totalCompletedTasks} tasks completed, Focus time: ${focusTimeDisplay}`;
    if (currentStreak > 0) {
      prompt += `, ${currentStreak} day streak (best: ${bestStreak})`;
    }
    prompt += `\n`;
    
    if (todayTasks.length > 0) {
      prompt += `\nToday (${completedToday}/${todayTasks.length} completed):\n`;
      todayTasks.slice(0, 5).forEach((t) => {
        prompt += `${t.completed ? '✓' : '○'} ${t.title}\n`;
      });
      if (todayTasks.length > 5) {
        prompt += `... and ${todayTasks.length - 5} more tasks\n`;
      }
    } else {
      prompt += `\nNo tasks for today.\n`;
    }
    
    return prompt;
  }, [goalStore.dailyTasks, goalStore.currentGoal, progress?.currentStreak, progress?.bestStreak, progress?.totalCompletedTasks, progress?.focusTimeDisplay]);

  const processTaskCreationConversation = useCallback(async (userText: string): Promise<string | null> => {
    const state = taskCreationState.current;
    const lowerText = userText.toLowerCase();
    
    if (detectCancellation(userText)) {
      taskCreationState.current = { isActive: false, stage: null, collectedInfo: {} };
      return '🚫 Cancelled. Let me know if you want to add a task later!';
    }

    if (state.stage === 'asking_title') {
      state.collectedInfo.title = userText;
      state.stage = 'asking_details';
      return `📝 Great! Task: "${userText}"

Now tell me more:
• How long will it take? (e.g., 30 minutes, 1 hour)
• What's the priority? (high/medium/low)
• Any additional details?

Or just type "done" and I'll create the task with default settings.`;
    }

    if (state.stage === 'asking_details') {
      const readyWords = ['готово', 'done', 'ready', 'создай', 'добавь', 'ок', 'ok', 'давай'];
      const isReady = readyWords.some(w => lowerText.includes(w));
      
      if (!isReady) {
        state.collectedInfo.description = userText;
        
        if (lowerText.includes('высок') || lowerText.includes('high') || lowerText.includes('важн') || lowerText.includes('срочн')) {
          state.collectedInfo.priority = 'high';
        } else if (lowerText.includes('низк') || lowerText.includes('low') || lowerText.includes('не срочн')) {
          state.collectedInfo.priority = 'low';
        }
        
        const timeMatch = userText.match(/(\d+)\s*(мин|час|hour|min)/i);
        if (timeMatch) {
          state.collectedInfo.duration = timeMatch[0];
        }
      }
      
      state.stage = 'confirming';
      
      const title = state.collectedInfo.title || 'New task';
      const priority = state.collectedInfo.priority || 'medium';
      const duration = state.collectedInfo.duration || '30 minutes';
      const priorityEmoji = priority === 'high' ? '🔴' : priority === 'low' ? '🟢' : '🟡';
      
      return `✨ Creating task:

📌 **${title}**
${priorityEmoji} Priority: ${priority === 'high' ? 'High' : priority === 'low' ? 'Low' : 'Medium'}
⏱️ Duration: ${duration}
${state.collectedInfo.description ? `📝 ${state.collectedInfo.description}` : ''}

Look good? Type "yes" to confirm or "no" to cancel.`;
    }

    if (state.stage === 'confirming') {
      if (detectConfirmation(userText)) {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        const fullRequest = `Title: ${state.collectedInfo.title}. ${state.collectedInfo.description || ''} Priority: ${state.collectedInfo.priority || 'medium'}. Duration: ${state.collectedInfo.duration || '30 minutes'}`;
        
        const taskData = await generateTaskFromAI(fullRequest);
        
        if (taskData) {
          if (state.collectedInfo.title) {
            taskData.title = state.collectedInfo.title;
          }
          if (state.collectedInfo.priority) {
            taskData.priority = state.collectedInfo.priority;
          }
          
          pendingTaskData = taskData;
          taskCreationState.current = { isActive: false, stage: null, collectedInfo: {} };
          
          setTimeout(() => {
            setTaskFormData(taskData);
            setShowTaskForm(true);
          }, 800);
          
          return `✅ Great! Opening the task form...`;
        } else {
          const fallbackTaskData: GeneratedTaskData = {
            title: state.collectedInfo.title || 'New task',
            description: state.collectedInfo.description || '',
            duration: state.collectedInfo.duration || '30 minutes',
            priority: state.collectedInfo.priority || 'medium',
            difficulty: 'medium',
            estimatedTime: 30,
            tips: ['Stay focused on the main goal', 'Take breaks when needed'],
            date: todayStr,
          };
          
          pendingTaskData = fallbackTaskData;
          taskCreationState.current = { isActive: false, stage: null, collectedInfo: {} };
          
          setTimeout(() => {
            setTaskFormData(fallbackTaskData);
            setShowTaskForm(true);
          }, 800);
          
          return `✅ Creating task! Opening form...`;
        }
      } else {
        taskCreationState.current = { isActive: false, stage: null, collectedInfo: {} };
        return '🚫 Cancelled. Let me know if you want to add a task later!';
      }
    }

    return null;
  }, [generateTaskFromAI, detectConfirmation, detectCancellation]);

  const sendMessage = useCallback(async (input: string | MessageWithAttachments) => {
    const text = typeof input === 'string' ? input : input.text;
    const attachments = typeof input === 'string' ? undefined : input.attachments;
    
    if (!text.trim() || isProcessing) return;

    const trimmed = text.trim();
    console.log('[Chat] Sending message:', trimmed.substring(0, 50), 'with', attachments?.length || 0, 'attachments');

    setChatError(null);
    setIsProcessing(true);

    // Build content with images if present
    let userContent: string | OpenAIContentPart[];
    if (attachments && attachments.length > 0) {
      userContent = [
        { type: 'text', text: trimmed },
        ...attachments.map(att => ({
          type: 'image_url' as const,
          image_url: { url: att.uri.startsWith('data:') ? att.uri : `data:${att.mimeType};base64,${att.uri}` }
        }))
      ];
    } else {
      userContent = trimmed;
    }

    const userMessage: OpenAIMessage = { role: 'user', content: userContent };
    setMessages(prev => [...prev, { ...userMessage, _attachments: attachments }] as any);

    try {
      if (taskCreationState.current.isActive) {
        console.log('[Chat] Processing task creation conversation, stage:', taskCreationState.current.stage);
        const response = await processTaskCreationConversation(trimmed);
        if (response) {
          setMessages(prev => {
            const updated = [...prev, { role: 'assistant' as const, content: response }];
            persistMessages(updated);
            return updated;
          });
          return;
        }
      }

      const isTaskCreation = detectTaskCreationIntent(trimmed);
      
      if (isTaskCreation) {
        console.log('[Chat] Task creation intent detected, starting conversation');
        
        taskCreationState.current = {
          isActive: true,
          stage: 'asking_title',
          collectedInfo: {},
        };
        
        const askMessage = `🎯 Great! Let's create a task.

What needs to be done? Describe the task in a few words.`;
        
        setMessages(prev => {
          const updated = [...prev, { role: 'assistant' as const, content: askMessage }];
          persistMessages(updated);
          return updated;
        });
        return;
      }

      const systemPrompt = buildSystemPrompt();
      const recentMessages = messages.slice(-10);

      const chatMessages: { role: 'user' | 'assistant'; content: string }[] = [
        { role: 'user', content: `[System context: ${systemPrompt}]` },
        ...recentMessages
          .filter(m => m.role !== 'system')
          .map(m => ({
            role: m.role as 'user' | 'assistant',
            content: typeof m.content === 'string' ? m.content : (m.content.find(c => c.type === 'text') as any)?.text || '',
          })),
        { role: 'user', content: typeof userMessage.content === 'string' ? userMessage.content : (userMessage.content.find(c => c.type === 'text') as any)?.text || '' },
      ];

      console.log('[Chat] Calling AI toolkit...');

      const assistantContent = await generateText({ messages: chatMessages });

      if (!assistantContent) {
        throw new Error('Empty response from AI');
      }

      console.log('[Chat] Response received successfully');
      setMessages(prev => {
        const updated = [...prev, { role: 'assistant' as const, content: assistantContent }];
        persistMessages(updated);
        return updated;
      });

    } catch (error: any) {
      console.error('[Chat] Error:', error);
      setMessages(prev => prev.slice(0, -1));
      
      if (error.name === 'AbortError') {
        setChatError('Request timed out. Please try again.');
      } else {
        setChatError(error.message || 'Failed to send message');
      }
    } finally {
      setIsProcessing(false);
    }
  }, [messages, isProcessing, buildSystemPrompt, detectTaskCreationIntent, processTaskCreationConversation]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setChatError(null);
    taskCreationState.current = { isActive: false, stage: null, collectedInfo: {} };
    safeStorageSet(chatStorageKey, []).catch(() => {});
    if (isRealUser) {
      saveUserChatHistory(userId, []).catch(() => {});
    }
  }, [chatStorageKey, isRealUser, userId]);

  const closeTaskForm = useCallback(() => {
    setShowTaskForm(false);
    setTaskFormData(null);
  }, []);

  const onTaskSaved = useCallback(() => {
    setShowTaskForm(false);
    setTaskFormData(null);
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: '✅ Task successfully added to your plan! You can view it in the Plan tab.' 
    }]);
  }, []);

  const analyzeAndCreateTask = useCallback(async () => {
    console.log('[Chat] Analyzing completed tasks');
    setIsProcessing(true);
    
    const tasks = goalStore.dailyTasks || [];
    const completedTasks = tasks.filter(t => t.completed);
    const pendingTasks = tasks.filter(t => !t.completed);
    
    const analysisMessage = `📊 Analyzing your completed tasks...

✅ Completed: ${completedTasks.length} tasks
⏳ In progress: ${pendingTasks.length} tasks`;
    
    setMessages(prev => [...prev, { role: 'assistant', content: analysisMessage }]);
    
    try {
      const completedList = completedTasks.slice(-10).map(t => `- ${t.title}`).join('\n');
      const pendingList = pendingTasks.slice(0, 5).map(t => `- ${t.title}`).join('\n');
      
      const prompt = `User completed these tasks:
${completedList || 'No completed tasks yet'}

Pending tasks:
${pendingList || 'No pending tasks'}

Today's date: ${new Date().toISOString().split('T')[0]}

Based on their progress, suggest ONE new task that would help them continue their momentum. Respond in English.`;

      const analysisResult = await generateText({
        messages: [{ role: 'user', content: prompt + '\n\nReturn ONLY valid JSON with these fields: title (string, max 50 chars), description (string), duration (string), priority ("high"|"medium"|"low"), difficulty ("easy"|"medium"|"hard"), estimatedTime (number in minutes), tips (array of 2 strings), date (YYYY-MM-DD string).' }],
      });
      const taskData = parseTaskJSON(analysisResult);
      if (!taskData) throw new Error('Failed to parse task data');
      console.log('[Chat] Generated task from analysis:', taskData);
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `💡 Based on your progress, I recommend:\n\n📌 **${taskData.title}**\n${taskData.description}\n\nOpening the form...` 
      }]);
      
      setTimeout(() => {
        setTaskFormData(taskData);
        setShowTaskForm(true);
      }, 1000);
      
    } catch (error) {
      console.error('[Chat] Analysis error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '❌ Failed to analyze tasks. Please try again.' 
      }]);
    } finally {
      setIsProcessing(false);
    }
  }, [goalStore.dailyTasks]);

  const openTaskForEdit = useCallback((task: any) => {
    console.log('[Chat] Opening task for edit:', task.title);
    
    const taskData: GeneratedTaskData = {
      title: task.title,
      description: task.description || '',
      duration: task.duration || '30 minutes',
      priority: task.priority || 'medium',
      difficulty: task.difficulty || 'medium',
      estimatedTime: task.estimatedTime || 30,
      tips: task.tips || ['Stay focused'],
      date: task.date ? new Date(task.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      existingTaskId: task.id,
    };
    
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: `✏️ Editing task: **${task.title}**\n\nYou can modify the parameters or regenerate the task.` 
    }]);
    
    setTaskFormData(taskData);
    setShowTaskForm(true);
  }, []);

  const openNewTaskForm = useCallback(async () => {
    console.log('[Chat] Opening new task form with AI generation');
    setIsProcessing(true);
    
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: '✨ Generating a new task based on your goal...' 
    }]);
    
    try {
      const currentGoal = goalStore.currentGoal;
      const tasks = goalStore.dailyTasks || [];
      const completedTasks = tasks.filter(t => t.completed);
      const existingTitles = tasks.map(t => t.title.toLowerCase());
      
      const prompt = `User's goal: "${currentGoal?.title || 'Improve productivity'}"
Completed tasks: ${completedTasks.length}
Existing tasks (avoid duplicates): ${existingTitles.slice(0, 5).join(', ')}
Today's date: ${new Date().toISOString().split('T')[0]}

Generate a NEW unique task that helps achieve this goal. Respond in English.`;

      const newTaskResult = await generateText({
        messages: [{ role: 'user', content: prompt + '\n\nReturn ONLY valid JSON with these fields: title (string, max 50 chars), description (string), duration (string), priority ("high"|"medium"|"low"), difficulty ("easy"|"medium"|"hard"), estimatedTime (number in minutes), tips (array of 2 strings), date (YYYY-MM-DD string).' }],
      });
      const taskData = parseTaskJSON(newTaskResult);
      if (!taskData) throw new Error('Failed to parse task data');
      console.log('[Chat] Generated new task:', taskData);
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `🎯 Here's a new task suggestion:\n\n📌 **${taskData.title}**\n${taskData.description}\n\nOpening the form for customization...` 
      }]);
      
      setTimeout(() => {
        setTaskFormData(taskData);
        setShowTaskForm(true);
      }, 800);
      
    } catch (error) {
      console.error('[Chat] New task generation error:', error);
      
      const fallbackTask: GeneratedTaskData = {
        title: 'New task',
        description: 'Describe what needs to be done',
        duration: '30 minutes',
        priority: 'medium',
        difficulty: 'medium',
        estimatedTime: 30,
        tips: ['Start small', 'Stay focused on the main goal'],
        date: new Date().toISOString().split('T')[0],
      };
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '📝 Opening the task creation form...' 
      }]);
      
      setTimeout(() => {
        setTaskFormData(fallbackTask);
        setShowTaskForm(true);
      }, 500);
    } finally {
      setIsProcessing(false);
    }
  }, [goalStore.currentGoal, goalStore.dailyTasks]);

  // Convert to UI format
  const uiMessages: ChatMessage[] = useMemo(() => {
    return messages
      .filter(m => m.role !== 'system')
      .map((m, idx) => {
        const msgAny = m as any;
        const textContent = typeof m.content === 'string' 
          ? m.content 
          : m.content.find(c => c.type === 'text')?.text || '';
        return {
          id: `msg-${idx}-${m.role}`,
          text: textContent,
          isBot: m.role === 'assistant',
          timestamp: new Date(),
          attachments: msgAny._attachments,
        };
      });
  }, [messages]);

  return useMemo(() => ({
    messages: uiMessages,
    isLoading: isProcessing,
    error: chatError,
    sendMessage,
    clearChat,
    showTaskForm,
    taskFormData,
    closeTaskForm,
    onTaskSaved,
    analyzeAndCreateTask,
    openTaskForEdit,
    openNewTaskForm,
    userContext: {
      profile: goalStore.profile,
      currentGoal: goalStore.currentGoal,
      currentStreak: progress?.currentStreak ?? 0,
      focusTimeDisplay: progress?.focusTimeDisplay ?? '0m',
    }
  }), [uiMessages, isProcessing, chatError, sendMessage, clearChat, showTaskForm, taskFormData, closeTaskForm, onTaskSaved, analyzeAndCreateTask, openTaskForEdit, openNewTaskForm, goalStore.profile, goalStore.currentGoal, progress?.currentStreak, progress?.focusTimeDisplay]);
});
