import createContextHook from '@nkzw/create-context-hook';
import { useGoalStore } from '@/hooks/use-goal-store';
import { useProgress } from '@/hooks/use-progress';
import { useAuth } from '@/hooks/use-auth-store';
import { ChatMessage, ChatAttachment } from '@/types/chat';
import { safeStorageSet } from '@/utils/storage-helper';
import { getUserChatHistory, saveUserChatHistory } from '@/lib/firebase';
import {
  callOpenAI,
  extractTextFromResponse,
  extractFunctionCalls,
  OpenAIFunctionTool,
  InputItem,
  FunctionCallOutput,
  FunctionCallItem,
  OpenAIResponse,
} from '@/lib/openai';

import { useMemo, useCallback, useState, useRef, useEffect } from 'react';

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

let lastFailedMessage: string | null = null;
export const getLastFailedMessage = () => lastFailedMessage;
export const clearLastFailedMessage = () => { lastFailedMessage = null; };

const getChatStorageKey = (userId: string) => `chat_history_v2_${userId}`;

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

const TOOLS: OpenAIFunctionTool[] = [
  {
    type: 'function',
    name: 'createTask',
    description: 'Create a new task for the user. Use this when the user asks to add, create, generate, or schedule a task. Fill in sensible defaults for any missing fields.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short task title, max 60 chars' },
        description: { type: 'string', description: 'Task description' },
        duration: { type: 'string', description: 'Duration string like "30 minutes" or "1 hour"' },
        priority: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Task priority' },
        difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'], description: 'Task difficulty' },
        estimatedTime: { type: 'number', description: 'Estimated time in minutes' },
        tips: { type: 'array', items: { type: 'string' }, description: '1-2 helpful tips' },
      },
      required: ['title'],
    },
  },
  {
    type: 'function',
    name: 'listTasks',
    description: 'List current tasks. Use when user asks to see their tasks, review progress, or analyze what they have.',
    parameters: {
      type: 'object',
      properties: {
        filter: { type: 'string', enum: ['all', 'today', 'completed', 'pending'], description: 'Which tasks to show' },
      },
    },
  },
  {
    type: 'function',
    name: 'completeTask',
    description: 'Mark a task as completed. Use when user says they finished or completed a task.',
    parameters: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'The task ID' },
        taskTitle: { type: 'string', description: 'Task title to search for if ID is unknown' },
      },
    },
  },
  {
    type: 'function',
    name: 'deleteTask',
    description: 'Delete a task. Use when user wants to remove a task.',
    parameters: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'The task ID' },
        taskTitle: { type: 'string', description: 'Task title to search for if ID is unknown' },
      },
    },
  },
  {
    type: 'function',
    name: 'analyzeProgress',
    description: 'Analyze user progress and provide insights. Use when user asks about their progress, stats, performance, or wants a review of tasks.',
    parameters: {
      type: 'object',
      properties: {
        includeRecommendation: { type: 'boolean', description: 'Whether to include a recommendation for next task' },
      },
    },
  },
  {
    type: 'function',
    name: 'openTaskForm',
    description: 'Open the task creation form with pre-filled data for the user to review and customize before saving.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title' },
        description: { type: 'string', description: 'Task description' },
        duration: { type: 'string', description: 'Duration string' },
        priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
        estimatedTime: { type: 'number', description: 'Time in minutes' },
        tips: { type: 'array', items: { type: 'string' } },
      },
      required: ['title'],
    },
  },
];

export const [ChatProvider, useChat] = createContextHook(() => {
  const { user } = useAuth();
  const goalStore = useGoalStore();
  const progress = useProgress();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskFormData, setTaskFormData] = useState<GeneratedTaskData | null>(null);

  const userId = user?.id || 'default';
  const isRealUser = !!user?.id && !user.id.startsWith('dev_guest_');
  const chatStorageKey = getChatStorageKey(userId);

  const goalStoreRef = useRef(goalStore);
  goalStoreRef.current = goalStore;
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const conversationHistory = useRef<ConversationMessage[]>([]);
  const lastResponseId = useRef<string | null>(null);
  const taskFormQueue = useRef<GeneratedTaskData | null>(null);

  const getSystemPrompt = useCallback(() => {
    const tasks = goalStore.dailyTasks || [];
    const currentGoal = goalStore.currentGoal;
    const today = new Date().toISOString().split('T')[0];

    const todayTasks = tasks.filter(t => t.date?.startsWith(today));
    const completedToday = todayTasks.filter(t => t.completed).length;

    const currentStreak = progress?.currentStreak ?? 0;
    const bestStreak = progress?.bestStreak ?? 0;
    const totalCompletedTasks = progress?.totalCompletedTasks ?? tasks.filter(t => t.completed).length;
    const focusTimeDisplay = progress?.focusTimeDisplay ?? '0m';

    let prompt = `You are GoalForge AI — a friendly, concise productivity coach. Today: ${today}.\n\n`;
    prompt += `RULES:\n`;
    prompt += `- You have FULL access to the user's tasks via tools. Use them proactively.\n`;
    prompt += `- When user asks to create/add/generate a task, use the createTask tool immediately. Do NOT ask follow-up questions unless the request is truly ambiguous.\n`;
    prompt += `- When user asks to see tasks, use listTasks tool.\n`;
    prompt += `- When user asks to complete a task, use completeTask tool.\n`;
    prompt += `- When user asks to delete a task, use deleteTask tool.\n`;
    prompt += `- Be concise (2-4 sentences). Use a friendly, encouraging tone.\n`;
    prompt += `- IMPORTANT: Always respond in the SAME language as the user's message.\n`;
    prompt += `- When creating a task, pick sensible defaults for any missing fields.\n\n`;

    if (currentGoal) {
      prompt += `User's goal: "${currentGoal.title}"\n`;
      if (currentGoal.endDate) {
        prompt += `Deadline: ${currentGoal.endDate}\n`;
      }
    }

    prompt += `\nStats: ${totalCompletedTasks} tasks completed, Focus: ${focusTimeDisplay}`;
    if (currentStreak > 0) {
      prompt += `, ${currentStreak}-day streak (best: ${bestStreak})`;
    }
    prompt += `\n`;

    if (todayTasks.length > 0) {
      prompt += `\nToday (${completedToday}/${todayTasks.length} done):\n`;
      todayTasks.slice(0, 8).forEach((t) => {
        prompt += `${t.completed ? '✓' : '○'} ${t.title} [id:${t.id}]\n`;
      });
      if (todayTasks.length > 8) {
        prompt += `... +${todayTasks.length - 8} more\n`;
      }
    } else {
      prompt += `\nNo tasks for today.\n`;
    }

    return prompt;
  }, [goalStore.dailyTasks, goalStore.currentGoal, progress?.currentStreak, progress?.bestStreak, progress?.totalCompletedTasks, progress?.focusTimeDisplay]);

  const executeTool = useCallback((toolName: string, argsStr: string): string => {
    try {
      const input = JSON.parse(argsStr);
      console.log('[Chat Tool]', toolName, 'called with:', input);
      const store = goalStoreRef.current;
      const prog = progressRef.current;

      switch (toolName) {
        case 'createTask': {
          const tasks = store.dailyTasks || [];
          const goalTasks = tasks.filter(t => t.goalId === store.currentGoal?.id);
          const nextDay = goalTasks.length > 0
            ? Math.max(...goalTasks.map(t => t.day)) + 1
            : 1;

          const newTaskData = {
            day: nextDay,
            date: new Date().toISOString(),
            title: input.title,
            description: input.description || 'Task created via AI assistant',
            duration: input.duration || '30 minutes',
            priority: (input.priority || 'medium') as 'high' | 'medium' | 'low',
            difficulty: (input.difficulty || 'medium') as 'easy' | 'medium' | 'hard',
            estimatedTime: input.estimatedTime || 30,
            tips: input.tips || ['Stay focused on the goal', 'Break it into smaller steps if needed'],
          };

          store.addTask(newTaskData).then(() => {
            console.log('[Chat Tool] Task created successfully:', input.title);
          }).catch((err: unknown) => {
            console.error('[Chat Tool] Failed to create task:', err);
          });

          return `Task "${input.title}" has been created and added to the plan.`;
        }

        case 'listTasks': {
          const tasks = store.dailyTasks || [];
          const goalTasks = tasks.filter(t => t.goalId === store.currentGoal?.id);
          const today = new Date().toISOString().split('T')[0];
          const filterType = input?.filter || 'all';

          let filtered = goalTasks;
          if (filterType === 'today') {
            filtered = goalTasks.filter(t => t.date?.startsWith(today));
          } else if (filterType === 'completed') {
            filtered = goalTasks.filter(t => t.completed);
          } else if (filterType === 'pending') {
            filtered = goalTasks.filter(t => !t.completed);
          }

          if (filtered.length === 0) {
            return `No ${filterType === 'all' ? '' : filterType + ' '}tasks found.`;
          }

          const list = filtered.slice(0, 15).map(t => {
            const status = t.completed ? '✅' : '⬜';
            const prio = t.priority === 'high' ? '🔴' : t.priority === 'low' ? '🟢' : '🟡';
            return `${status} ${prio} ${t.title} (${t.duration || '?'}) [id:${t.id}]`;
          }).join('\n');

          const completedCount = filtered.filter(t => t.completed).length;
          return `Found ${filtered.length} tasks (${completedCount} completed):\n${list}${filtered.length > 15 ? `\n... +${filtered.length - 15} more` : ''}`;
        }

        case 'completeTask': {
          const tasks = store.dailyTasks || [];
          let task = input?.taskId ? tasks.find(t => t.id === input.taskId) : undefined;

          if (!task && input?.taskTitle) {
            const lowerTitle = input.taskTitle.toLowerCase();
            task = tasks.find(t => t.title.toLowerCase().includes(lowerTitle));
          }

          if (!task) return 'Task not found. Please check the task name or list your tasks first.';
          if (task.completed) return `Task "${task.title}" is already completed!`;

          store.toggleTaskCompletion(task.id);
          return `Task "${task.title}" marked as completed! Great job! 🎉`;
        }

        case 'deleteTask': {
          const tasks = store.dailyTasks || [];
          let task = input?.taskId ? tasks.find(t => t.id === input.taskId) : undefined;

          if (!task && input?.taskTitle) {
            const lowerTitle = input.taskTitle.toLowerCase();
            task = tasks.find(t => t.title.toLowerCase().includes(lowerTitle));
          }

          if (!task) return 'Task not found. Please check the task name.';
          store.deleteTask(task.id);
          return `Task "${task.title}" has been deleted.`;
        }

        case 'analyzeProgress': {
          const tasks = store.dailyTasks || [];
          const goalTasks = tasks.filter(t => t.goalId === store.currentGoal?.id);
          const completed = goalTasks.filter(t => t.completed).length;
          const pending = goalTasks.filter(t => !t.completed).length;
          const today = new Date().toISOString().split('T')[0];
          const todayTasks = goalTasks.filter(t => t.date?.startsWith(today));
          const todayCompleted = todayTasks.filter(t => t.completed).length;

          const completionRate = goalTasks.length > 0 ? Math.round((completed / goalTasks.length) * 100) : 0;

          let report = `Progress Report:\n- Goal: ${store.currentGoal?.title || 'No active goal'}\n- Total tasks: ${goalTasks.length} (${completed} done, ${pending} remaining)\n- Completion rate: ${completionRate}%\n- Today: ${todayCompleted}/${todayTasks.length} tasks done\n- Streak: ${prog?.currentStreak ?? 0} days (best: ${prog?.bestStreak ?? 0})\n- Focus time: ${prog?.focusTimeDisplay ?? '0m'}`;

          if (pending > 0) {
            const nextPending = goalTasks.filter(t => !t.completed).slice(0, 3);
            report += `\n\nNext pending tasks:`;
            nextPending.forEach(t => {
              const prio = t.priority === 'high' ? '🔴' : t.priority === 'low' ? '🟢' : '🟡';
              report += `\n  ${prio} ${t.title}`;
            });
          }

          if (completed > 0) {
            const recentCompleted = goalTasks.filter(t => t.completed).slice(-3);
            report += `\n\nRecently completed:`;
            recentCompleted.forEach(t => {
              report += `\n  ✅ ${t.title}`;
            });
          }

          return report;
        }

        case 'openTaskForm': {
          const todayStr = new Date().toISOString().split('T')[0];
          const formData: GeneratedTaskData = {
            title: input.title,
            description: input.description || '',
            duration: input.duration || '30 minutes',
            priority: input.priority || 'medium',
            difficulty: input.difficulty || 'medium',
            estimatedTime: input.estimatedTime || 30,
            tips: input.tips || ['Stay focused', 'Break it into smaller steps'],
            date: todayStr,
          };

          taskFormQueue.current = formData;
          return `Opening task form for "${input.title}"...`;
        }

        default:
          return `Unknown tool: ${toolName}`;
      }
    } catch (err) {
      console.error('[Chat Tool] Error executing', toolName, ':', err);
      return `Error executing ${toolName}: ${err instanceof Error ? err.message : 'Unknown error'}`;
    }
  }, []);

  const processResponse = useCallback(async (response: OpenAIResponse): Promise<string> => {
    lastResponseId.current = response.id;

    const functionCalls = extractFunctionCalls(response);

    if (functionCalls.length > 0) {
      console.log('[Chat] Processing', functionCalls.length, 'function calls');

      const toolOutputs: FunctionCallOutput[] = functionCalls.map((fc: FunctionCallItem) => {
        const result = executeTool(fc.name, fc.arguments);
        console.log('[Chat] Tool', fc.name, 'result:', result.substring(0, 100));
        return {
          type: 'function_call_output' as const,
          call_id: fc.call_id,
          output: result,
        };
      });

      try {
        const followUpResponse = await callOpenAI({
          input: toolOutputs as InputItem[],
          tools: TOOLS,
          instructions: getSystemPrompt(),
          previousResponseId: response.id,
        });

        return processResponse(followUpResponse);
      } catch (err) {
        console.error('[Chat] Follow-up call failed:', err);
        const toolTexts = toolOutputs.map(o => o.output).join('\n');
        return toolTexts || 'Action completed.';
      }
    }

    const text = extractTextFromResponse(response);
    return text || 'Done.';
  }, [executeTool, getSystemPrompt]);

  useEffect(() => {
    if (taskFormQueue.current) {
      const data = taskFormQueue.current;
      taskFormQueue.current = null;
      setTimeout(() => {
        setTaskFormData(data);
        setShowTaskForm(true);
      }, 500);
    }
  }, [messages]);

  useEffect(() => {
    if (!isRealUser) return;
    getUserChatHistory(userId).then(() => {
      console.log('[Chat] Chat history check done for:', userId);
    }).catch((err) => {
      console.warn('[Chat] Firebase chat load failed:', err);
    });
  }, [userId, isRealUser]);

  const sendMessage = useCallback(async (input: string | MessageWithAttachments) => {
    const text = typeof input === 'string' ? input : input.text;
    const attachments = typeof input === 'string' ? undefined : input.attachments;

    if (!text.trim()) return;

    console.log('[Chat] Sending message:', text.substring(0, 50), 'with', attachments?.length || 0, 'attachments');

    lastFailedMessage = text.trim();
    setError(null);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text: text.trim(),
      isBot: false,
      timestamp: new Date(),
      attachments,
    };
    setMessages(prev => [...prev, userMessage]);

    conversationHistory.current.push({ role: 'user', content: text.trim() });

    setIsLoading(true);

    try {
      let inputPayload: InputItem[];

      if (attachments && attachments.length > 0) {
        const contentParts: { type: string; text?: string; image_url?: { url: string } }[] = [
          { type: 'text', text: text.trim() },
        ];
        for (const att of attachments) {
          contentParts.push({
            type: 'image_url',
            image_url: { url: att.uri },
          });
        }
        inputPayload = [{ role: 'user', content: contentParts }];
      } else {
        inputPayload = [{ role: 'user', content: text.trim() }];
      }

      const requestParams: {
        input: InputItem[];
        tools: OpenAIFunctionTool[];
        instructions: string;
        previousResponseId?: string;
      } = {
        input: inputPayload,
        tools: TOOLS,
        instructions: getSystemPrompt(),
      };

      if (lastResponseId.current) {
        requestParams.previousResponseId = lastResponseId.current;
      }

      const response = await callOpenAI(requestParams);
      const botText = await processResponse(response);

      conversationHistory.current.push({ role: 'assistant', content: botText });

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        text: botText,
        isBot: true,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMessage]);

      lastFailedMessage = null;
      console.log('[Chat] Message sent successfully');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get response';
      console.error('[Chat] Error:', errorMsg);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [getSystemPrompt, processResponse]);

  const clearChat = useCallback(() => {
    setMessages([]);
    conversationHistory.current = [];
    lastResponseId.current = null;
    setError(null);
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
  }, []);

  const analyzeAndCreateTask = useCallback(async () => {
    console.log('[Chat] Analyzing tasks via OpenAI');
    await sendMessage('Review my tasks and progress. Use the analyzeProgress tool to get my stats, then give me a brief summary with actionable advice.');
  }, [sendMessage]);

  const openTaskForEdit = useCallback((task: any) => {
    console.log('[Chat] Opening task for edit:', task.title);
    const editData: GeneratedTaskData = {
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
    setTaskFormData(editData);
    setShowTaskForm(true);
  }, []);

  const openNewTaskForm = useCallback(async () => {
    console.log('[Chat] Generating new task via OpenAI');
    await sendMessage('Suggest and create a new task for me based on my current goal and progress. Use the createTask tool to add it directly.');
  }, [sendMessage]);

  const retryLastMessage = useCallback(() => {
    const msg = lastFailedMessage;
    if (msg) {
      console.log('[Chat] Retrying last message:', msg.substring(0, 50));
      lastFailedMessage = null;
      setMessages(prev => {
        const filtered = [...prev];
        if (filtered.length > 0 && !filtered[filtered.length - 1].isBot) {
          filtered.pop();
        }
        return filtered;
      });
      conversationHistory.current.pop();
      sendMessage(msg);
    }
  }, [sendMessage]);

  return useMemo(() => ({
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
    showTaskForm,
    taskFormData,
    closeTaskForm,
    onTaskSaved,
    analyzeAndCreateTask,
    openTaskForEdit,
    openNewTaskForm,
    retryLastMessage,
    userContext: {
      profile: goalStore.profile,
      currentGoal: goalStore.currentGoal,
      currentStreak: progress?.currentStreak ?? 0,
      focusTimeDisplay: progress?.focusTimeDisplay ?? '0m',
    }
  }), [messages, isLoading, error, sendMessage, clearChat, showTaskForm, taskFormData, closeTaskForm, onTaskSaved, analyzeAndCreateTask, openTaskForEdit, openNewTaskForm, retryLastMessage, goalStore.profile, goalStore.currentGoal, progress?.currentStreak, progress?.focusTimeDisplay]);
});
