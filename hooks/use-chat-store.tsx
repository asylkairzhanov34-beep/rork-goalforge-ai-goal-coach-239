import createContextHook from '@nkzw/create-context-hook';
import { useGoalStore } from '@/hooks/use-goal-store';
import { useProgress } from '@/hooks/use-progress';
import { ChatMessage } from '@/types/chat';

import { useMemo, useCallback, useState, useRef } from 'react';

// OpenAI API ключ
const OPENAI_API_KEY = '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';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
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

export const [ChatProvider, useChat] = createContextHook(() => {
  const goalStore = useGoalStore();
  const progress = useProgress();
  const [messages, setMessages] = useState<OpenAIMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskFormData, setTaskFormData] = useState<GeneratedTaskData | null>(null);
  const taskCreationState = useRef<TaskCreationState>({
    isActive: false,
    stage: null,
    collectedInfo: {},
  });

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

  const generateTaskFromAI = useCallback(async (userRequest: string): Promise<GeneratedTaskData | null> => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const prompt = `User wants to add a task. Their request: "${userRequest}"

Generate a task based on this request. Return ONLY valid JSON (no markdown, no explanation):
{
  "title": "Short task title (max 50 chars)",
  "description": "Detailed description of what to do (1-2 sentences)",
  "duration": "estimated time (e.g. '30 minutes', '1 hour')",
  "priority": "high" or "medium" or "low",
  "difficulty": "easy" or "medium" or "hard",
  "estimatedTime": number in minutes,
  "tips": ["helpful tip 1", "helpful tip 2"],
  "date": "${todayStr}"
}

Respond in the same language as user's request.`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You generate task data as JSON. Return ONLY valid JSON, no other text.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.5,
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        console.error('[Chat] Task generation API error:', response.status);
        return null;
      }

      const data = await response.json();
      let content = data.choices?.[0]?.message?.content || '';
      
      content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const startIdx = content.indexOf('{');
      const endIdx = content.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        content = content.substring(startIdx, endIdx + 1);
      }
      
      const taskData = JSON.parse(content) as GeneratedTaskData;
      console.log('[Chat] Generated task data:', taskData);
      return taskData;
    } catch (error) {
      console.error('[Chat] Task generation error:', error);
      return null;
    }
  }, []);

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
      return '🚫 Отменено. Если захотите добавить задачу - просто скажите!';
    }

    if (state.stage === 'asking_title') {
      state.collectedInfo.title = userText;
      state.stage = 'asking_details';
      return `📝 Отлично! Задача: "${userText}"

Теперь расскажите подробнее:
• Сколько времени займёт? (например: 30 минут, 1 час)
• Какой приоритет? (высокий/средний/низкий)
• Есть ли дополнительные детали?

Или просто напишите "готово" и я создам задачу с настройками по умолчанию.`;
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
      
      const title = state.collectedInfo.title || 'Новая задача';
      const priority = state.collectedInfo.priority || 'medium';
      const duration = state.collectedInfo.duration || '30 минут';
      const priorityEmoji = priority === 'high' ? '🔴' : priority === 'low' ? '🟢' : '🟡';
      
      return `✨ Создаю задачу:

📌 **${title}**
${priorityEmoji} Приоритет: ${priority === 'high' ? 'Высокий' : priority === 'low' ? 'Низкий' : 'Средний'}
⏱️ Время: ${duration}
${state.collectedInfo.description ? `📝 ${state.collectedInfo.description}` : ''}

Всё верно? Напишите "да" для подтверждения или "нет" для отмены.`;
    }

    if (state.stage === 'confirming') {
      if (detectConfirmation(userText)) {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        const fullRequest = `Название: ${state.collectedInfo.title}. ${state.collectedInfo.description || ''} Приоритет: ${state.collectedInfo.priority || 'medium'}. Время: ${state.collectedInfo.duration || '30 минут'}`;
        
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
          
          return `✅ Отлично! Открываю форму добавления задачи...`;
        } else {
          const fallbackTaskData: GeneratedTaskData = {
            title: state.collectedInfo.title || 'Новая задача',
            description: state.collectedInfo.description || '',
            duration: state.collectedInfo.duration || '30 минут',
            priority: state.collectedInfo.priority || 'medium',
            difficulty: 'medium',
            estimatedTime: 30,
            tips: ['Сфокусируйтесь на главном', 'Делайте перерывы'],
            date: todayStr,
          };
          
          pendingTaskData = fallbackTaskData;
          taskCreationState.current = { isActive: false, stage: null, collectedInfo: {} };
          
          setTimeout(() => {
            setTaskFormData(fallbackTaskData);
            setShowTaskForm(true);
          }, 800);
          
          return `✅ Создаю задачу! Открываю форму...`;
        }
      } else {
        taskCreationState.current = { isActive: false, stage: null, collectedInfo: {} };
        return '🚫 Отменено. Если захотите добавить задачу - просто скажите!';
      }
    }

    return null;
  }, [generateTaskFromAI, detectConfirmation, detectCancellation]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isProcessing) return;

    const trimmed = text.trim();
    console.log('[Chat] Sending message:', trimmed.substring(0, 50));

    setChatError(null);
    setIsProcessing(true);

    const userMessage: OpenAIMessage = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMessage]);

    try {
      if (taskCreationState.current.isActive) {
        console.log('[Chat] Processing task creation conversation, stage:', taskCreationState.current.stage);
        const response = await processTaskCreationConversation(trimmed);
        if (response) {
          setMessages(prev => [...prev, { role: 'assistant', content: response }]);
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
        
        const askMessage = `🎯 Отлично! Давайте создадим задачу.

Что нужно сделать? Опишите задачу в нескольких словах.`;
        
        setMessages(prev => [...prev, { role: 'assistant', content: askMessage }]);
        return;
      }

      const systemPrompt = buildSystemPrompt();
      const recentMessages = messages.slice(-10);
      
      const messagesToSend: OpenAIMessage[] = [
        { role: 'system', content: systemPrompt },
        ...recentMessages,
        userMessage,
      ];

      console.log('[Chat] Calling OpenAI API...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: messagesToSend,
          temperature: 0.7,
          max_tokens: 500,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Chat] API Error:', response.status, errorText);
        
        if (response.status === 401) {
          throw new Error('Invalid API key');
        } else if (response.status === 429) {
          throw new Error('Too many requests. Please wait a moment.');
        } else if (response.status === 503) {
          throw new Error('Service temporarily unavailable');
        } else {
          throw new Error(`API error: ${response.status}`);
        }
      }

      const data = await response.json();
      const assistantContent = data.choices?.[0]?.message?.content;

      if (!assistantContent) {
        throw new Error('Empty response from API');
      }

      console.log('[Chat] Response received successfully');
      setMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);

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
  }, []);

  const closeTaskForm = useCallback(() => {
    setShowTaskForm(false);
    setTaskFormData(null);
  }, []);

  const onTaskSaved = useCallback(() => {
    setShowTaskForm(false);
    setTaskFormData(null);
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: '✅ Задача успешно добавлена в ваш план! Можете посмотреть её во вкладке Plan.' 
    }]);
  }, []);

  const analyzeAndCreateTask = useCallback(async () => {
    console.log('[Chat] Analyzing completed tasks');
    setIsProcessing(true);
    
    const tasks = goalStore.dailyTasks || [];
    const completedTasks = tasks.filter(t => t.completed);
    const pendingTasks = tasks.filter(t => !t.completed);
    
    const analysisMessage = `📊 Анализирую ваши выполненные задачи...

✅ Выполнено: ${completedTasks.length} задач
⏳ В процессе: ${pendingTasks.length} задач`;
    
    setMessages(prev => [...prev, { role: 'assistant', content: analysisMessage }]);
    
    try {
      const completedList = completedTasks.slice(-10).map(t => `- ${t.title}`).join('\n');
      const pendingList = pendingTasks.slice(0, 5).map(t => `- ${t.title}`).join('\n');
      
      const prompt = `User completed these tasks:
${completedList || 'No completed tasks yet'}

Pending tasks:
${pendingList || 'No pending tasks'}

Based on their progress, suggest ONE new task that would help them continue their momentum. Return ONLY valid JSON:
{
  "title": "Task title (max 50 chars)",
  "description": "Why this task is recommended based on their progress",
  "duration": "estimated time",
  "priority": "high" or "medium" or "low",
  "difficulty": "easy" or "medium" or "hard",
  "estimatedTime": number in minutes,
  "tips": ["tip 1", "tip 2"],
  "date": "${new Date().toISOString().split('T')[0]}"
}

Respond in Russian.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You analyze user progress and suggest tasks. Return ONLY valid JSON.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 400,
        }),
      });

      if (!response.ok) {
        throw new Error('API error');
      }

      const data = await response.json();
      let content = data.choices?.[0]?.message?.content || '';
      
      content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const startIdx = content.indexOf('{');
      const endIdx = content.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        content = content.substring(startIdx, endIdx + 1);
      }
      
      const taskData = JSON.parse(content) as GeneratedTaskData;
      console.log('[Chat] Generated task from analysis:', taskData);
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `💡 На основе вашего прогресса рекомендую:\n\n📌 **${taskData.title}**\n${taskData.description}\n\nОткрываю форму для добавления...` 
      }]);
      
      setTimeout(() => {
        setTaskFormData(taskData);
        setShowTaskForm(true);
      }, 1000);
      
    } catch (error) {
      console.error('[Chat] Analysis error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '❌ Не удалось проанализировать задачи. Попробуйте ещё раз.' 
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
      content: `✏️ Редактирование задачи: **${task.title}**\n\nВы можете изменить параметры или перегенерировать задачу.` 
    }]);
    
    setTaskFormData(taskData);
    setShowTaskForm(true);
  }, []);

  const openNewTaskForm = useCallback(async () => {
    console.log('[Chat] Opening new task form with AI generation');
    setIsProcessing(true);
    
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: '✨ Генерирую новую задачу на основе вашей цели...' 
    }]);
    
    try {
      const currentGoal = goalStore.currentGoal;
      const tasks = goalStore.dailyTasks || [];
      const completedTasks = tasks.filter(t => t.completed);
      const existingTitles = tasks.map(t => t.title.toLowerCase());
      
      const prompt = `User's goal: "${currentGoal?.title || 'Improve productivity'}"
Completed tasks: ${completedTasks.length}
Existing tasks (avoid duplicates): ${existingTitles.slice(0, 5).join(', ')}

Generate a NEW unique task that helps achieve this goal. Return ONLY valid JSON:
{
  "title": "Task title (max 50 chars, must be different from existing)",
  "description": "Detailed description",
  "duration": "estimated time",
  "priority": "high" or "medium" or "low",
  "difficulty": "easy" or "medium" or "hard",
  "estimatedTime": number in minutes,
  "tips": ["tip 1", "tip 2"],
  "date": "${new Date().toISOString().split('T')[0]}"
}

Respond in Russian.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You generate creative, actionable tasks. Return ONLY valid JSON.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.8,
          max_tokens: 400,
        }),
      });

      if (!response.ok) {
        throw new Error('API error');
      }

      const data = await response.json();
      let content = data.choices?.[0]?.message?.content || '';
      
      content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const startIdx = content.indexOf('{');
      const endIdx = content.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        content = content.substring(startIdx, endIdx + 1);
      }
      
      const taskData = JSON.parse(content) as GeneratedTaskData;
      console.log('[Chat] Generated new task:', taskData);
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `🎯 Предлагаю новую задачу:\n\n📌 **${taskData.title}**\n${taskData.description}\n\nОткрываю форму для настройки...` 
      }]);
      
      setTimeout(() => {
        setTaskFormData(taskData);
        setShowTaskForm(true);
      }, 800);
      
    } catch (error) {
      console.error('[Chat] New task generation error:', error);
      
      const fallbackTask: GeneratedTaskData = {
        title: 'Новая задача',
        description: 'Опишите, что нужно сделать',
        duration: '30 минут',
        priority: 'medium',
        difficulty: 'medium',
        estimatedTime: 30,
        tips: ['Начните с малого', 'Сфокусируйтесь на главном'],
        date: new Date().toISOString().split('T')[0],
      };
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '📝 Открываю форму для создания задачи...' 
      }]);
      
      setTimeout(() => {
        setTaskFormData(fallbackTask);
        setShowTaskForm(true);
      }, 500);
    } finally {
      setIsProcessing(false);
    }
  }, [goalStore.currentGoal, goalStore.dailyTasks]);

  // Преобразование в UI формат
  const uiMessages: ChatMessage[] = useMemo(() => {
    return messages
      .filter(m => m.role !== 'system')
      .map((m, idx) => ({
        id: `msg-${idx}-${m.role}`,
        text: m.content,
        isBot: m.role === 'assistant',
        timestamp: new Date(),
      }));
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
