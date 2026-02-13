import createContextHook from '@nkzw/create-context-hook';
import { useGoalStore } from '@/hooks/use-goal-store';
import { useProgress } from '@/hooks/use-progress';
import { useAuth } from '@/hooks/use-auth-store';
import { ChatMessage, ChatAttachment } from '@/types/chat';
import { safeStorageSet } from '@/utils/storage-helper';
import { getUserChatHistory, saveUserChatHistory } from '@/lib/firebase';
import { createRorkTool, useRorkAgent } from '@rork-ai/toolkit-sdk';
import * as z from 'zod/v4';

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

const getChatStorageKey = (userId: string) => `chat_history_v2_${userId}`;

export const [ChatProvider, useChat] = createContextHook(() => {
  const { user } = useAuth();
  const goalStore = useGoalStore();
  const progress = useProgress();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskFormData, setTaskFormData] = useState<GeneratedTaskData | null>(null);
  const taskFormQueue = useRef<GeneratedTaskData | null>(null);

  const userId = user?.id || 'default';
  const isRealUser = !!user?.id && !user.id.startsWith('dev_guest_');
  const chatStorageKey = getChatStorageKey(userId);

  const goalStoreRef = useRef(goalStore);
  goalStoreRef.current = goalStore;
  const progressRef = useRef(progress);
  progressRef.current = progress;

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

  const createTaskSchema = z.object({
    title: z.string().describe('Short task title, max 60 chars'),
    description: z.string().describe('Task description').optional(),
    duration: z.string().describe('Duration string like "30 minutes" or "1 hour"').optional(),
    priority: z.enum(['high', 'medium', 'low']).describe('Task priority').optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).describe('Task difficulty').optional(),
    estimatedTime: z.number().describe('Estimated time in minutes').optional(),
    tips: z.array(z.string()).describe('1-2 helpful tips').optional(),
  });

  const filterSchema = z.object({
    filter: z.enum(['all', 'today', 'completed', 'pending']).describe('Filter tasks').optional(),
  });

  const taskIdSchema = z.object({
    taskId: z.string().describe('The task ID').optional(),
    taskTitle: z.string().describe('Task title to search for if ID is unknown').optional(),
  });

  const emptySchema = z.object({});

  const openFormSchema = z.object({
    title: z.string().describe('Task title'),
    description: z.string().describe('Task description').optional(),
    duration: z.string().describe('Duration string').optional(),
    priority: z.enum(['high', 'medium', 'low']).optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    estimatedTime: z.number().describe('Time in minutes').optional(),
    tips: z.array(z.string()).optional(),
  });

  const { messages: agentMessages, error: agentError, sendMessage: agentSendMessage, setMessages: setAgentMessages, status: agentStatus } = useRorkAgent({
    tools: {
      createTask: createRorkTool({
        description: 'Create a new task for the user. Use this when the user asks to add, create, generate, or schedule a task. Fill in sensible defaults for any missing fields.',
        zodSchema: createTaskSchema,
        execute(input) {
          console.log('[Chat Tool] createTask called:', input);
          const today = new Date();
          const store = goalStoreRef.current;
          const tasks = store.dailyTasks || [];
          const nextDay = tasks.length > 0
            ? Math.max(...tasks.filter(t => t.goalId === store.currentGoal?.id).map(t => t.day)) + 1
            : 1;

          const newTaskData = {
            day: nextDay,
            date: today.toISOString(),
            title: input.title,
            description: input.description || 'Task created via AI assistant',
            duration: input.duration || '30 minutes',
            priority: input.priority || 'medium' as const,
            difficulty: input.difficulty || 'medium' as const,
            estimatedTime: input.estimatedTime || 30,
            tips: input.tips || ['Stay focused on the goal', 'Break it into smaller steps if needed'],
          };

          store.addTask(newTaskData).then(() => {
            console.log('[Chat Tool] Task created successfully:', input.title);
          }).catch((err: unknown) => {
            console.error('[Chat Tool] Failed to create task:', err);
          });

          return `Task "${input.title}" has been created and added to the plan.`;
        },
      }),

      listTasks: createRorkTool({
        description: 'List current tasks. Use when user asks to see their tasks, review progress, or analyze what they have.',
        zodSchema: filterSchema,
        execute(input) {
          console.log('[Chat Tool] listTasks called:', input);
          const store = goalStoreRef.current;
          const tasks = store.dailyTasks || [];
          const goalTasks = tasks.filter(t => t.goalId === store.currentGoal?.id);
          const today = new Date().toISOString().split('T')[0];

          let filtered = goalTasks;
          const filterType = input.filter || 'all';

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
        },
      }),

      completeTask: createRorkTool({
        description: 'Mark a task as completed. Use when user says they finished or completed a task.',
        zodSchema: taskIdSchema,
        execute(input) {
          console.log('[Chat Tool] completeTask called:', input);
          const store = goalStoreRef.current;
          const tasks = store.dailyTasks || [];

          let task = input.taskId ? tasks.find(t => t.id === input.taskId) : undefined;

          if (!task && input.taskTitle) {
            const lowerTitle = input.taskTitle.toLowerCase();
            task = tasks.find(t => t.title.toLowerCase().includes(lowerTitle));
          }

          if (!task) {
            return 'Task not found. Please check the task name or list your tasks first.';
          }

          if (task.completed) {
            return `Task "${task.title}" is already completed!`;
          }

          store.toggleTaskCompletion(task.id);
          return `Task "${task.title}" marked as completed! Great job! 🎉`;
        },
      }),

      deleteTask: createRorkTool({
        description: 'Delete a task. Use when user wants to remove a task.',
        zodSchema: taskIdSchema,
        execute(input) {
          console.log('[Chat Tool] deleteTask called:', input);
          const store = goalStoreRef.current;
          const tasks = store.dailyTasks || [];

          let task = input.taskId ? tasks.find(t => t.id === input.taskId) : undefined;

          if (!task && input.taskTitle) {
            const lowerTitle = input.taskTitle.toLowerCase();
            task = tasks.find(t => t.title.toLowerCase().includes(lowerTitle));
          }

          if (!task) {
            return 'Task not found. Please check the task name.';
          }

          store.deleteTask(task.id);
          return `Task "${task.title}" has been deleted.`;
        },
      }),

      analyzeProgress: createRorkTool({
        description: 'Analyze user progress and provide insights. Use when user asks about their progress, stats, or performance.',
        zodSchema: emptySchema,
        execute() {
          console.log('[Chat Tool] analyzeProgress called');
          const store = goalStoreRef.current;
          const prog = progressRef.current;
          const tasks = store.dailyTasks || [];
          const goalTasks = tasks.filter(t => t.goalId === store.currentGoal?.id);
          const completed = goalTasks.filter(t => t.completed).length;
          const pending = goalTasks.filter(t => !t.completed).length;
          const today = new Date().toISOString().split('T')[0];
          const todayTasks = goalTasks.filter(t => t.date?.startsWith(today));
          const todayCompleted = todayTasks.filter(t => t.completed).length;

          const completionRate = goalTasks.length > 0 ? Math.round((completed / goalTasks.length) * 100) : 0;

          return `Progress Report:\n- Goal: ${store.currentGoal?.title || 'No active goal'}\n- Total tasks: ${goalTasks.length} (${completed} done, ${pending} remaining)\n- Completion rate: ${completionRate}%\n- Today: ${todayCompleted}/${todayTasks.length} tasks done\n- Streak: ${prog?.currentStreak ?? 0} days (best: ${prog?.bestStreak ?? 0})\n- Focus time: ${prog?.focusTimeDisplay ?? '0m'}`;
        },
      }),

      openTaskForm: createRorkTool({
        description: 'Open the task creation form with pre-filled data for the user to review and customize before saving. Use this when you want to give the user a chance to edit the task details before adding it.',
        zodSchema: openFormSchema,
        execute(input) {
          console.log('[Chat Tool] openTaskForm called:', input);
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
        },
      }),
    },
  });

  useEffect(() => {
    if (taskFormQueue.current) {
      const data = taskFormQueue.current;
      taskFormQueue.current = null;
      setTimeout(() => {
        setTaskFormData(data);
        setShowTaskForm(true);
      }, 500);
    }
  }, [agentMessages]);

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

    const systemContext = getSystemPrompt();
    const contextPrefix = agentMessages.length === 0
      ? `[System context — do NOT repeat this to the user]\n${systemContext}\n[End system context]\n\nUser message: `
      : '';
    const enrichedText = `${contextPrefix}${text.trim()}`;

    try {
      if (attachments && attachments.length > 0) {
        const files = attachments.map(att => ({
          type: 'file' as const,
          mediaType: att.mimeType,
          url: att.uri,
        }));
        agentSendMessage({ text: enrichedText, files });
      } else {
        agentSendMessage(enrichedText);
      }
      console.log('[Chat] Message sent successfully');
    } catch (error: unknown) {
      console.error('[Chat] Error sending message:', error);
    }
  }, [agentSendMessage, getSystemPrompt, agentMessages.length]);

  const clearChat = useCallback(() => {
    setAgentMessages([]);
    safeStorageSet(chatStorageKey, []).catch(() => {});
    if (isRealUser) {
      saveUserChatHistory(userId, []).catch(() => {});
    }
  }, [setAgentMessages, chatStorageKey, isRealUser, userId]);

  const closeTaskForm = useCallback(() => {
    setShowTaskForm(false);
    setTaskFormData(null);
  }, []);

  const onTaskSaved = useCallback(() => {
    setShowTaskForm(false);
    setTaskFormData(null);
  }, []);

  const analyzeAndCreateTask = useCallback(async () => {
    console.log('[Chat] Analyzing completed tasks via agent');
    try {
      const ctx = getSystemPrompt();
      agentSendMessage(`[System context]\n${ctx}[End]\n\nAnalyze my completed tasks and suggest a new task based on my progress. Use the analyzeProgress and createTask tools.`);
    } catch (error) {
      console.error('[Chat] Analysis error:', error);
    }
  }, [agentSendMessage, getSystemPrompt]);

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
    console.log('[Chat] Generating new task via agent');
    try {
      const ctx = getSystemPrompt();
      agentSendMessage(`[System context]\n${ctx}[End]\n\nGenerate a new task for me based on my current goal. Create it directly using the createTask tool.`);
    } catch (error) {
      console.error('[Chat] New task generation error:', error);
    }
  }, [agentSendMessage, getSystemPrompt]);

  const uiMessages: ChatMessage[] = useMemo(() => {
    const result: ChatMessage[] = [];

    for (const m of agentMessages) {
      if (m.role === 'system') continue;

      const isBot = m.role === 'assistant';
      const parts = m.parts || [];

      let textContent = '';
      const toolOutputs: string[] = [];

      for (const part of parts) {
        if (part.type === 'text' && part.text) {
          textContent += part.text;
        } else if (part.type === 'tool') {
          if (part.state === 'output-available' && part.output) {
            const outputStr = typeof part.output === 'string' ? part.output : JSON.stringify(part.output);
            if (part.toolName === 'listTasks' || part.toolName === 'analyzeProgress') {
              toolOutputs.push(outputStr);
            }
          }
        }
      }

      if (textContent.trim()) {
        result.push({
          id: `${m.id}-text`,
          text: textContent.trim(),
          isBot,
          timestamp: new Date(),
        });
      }

      for (let i = 0; i < toolOutputs.length; i++) {
        result.push({
          id: `${m.id}-tool-${i}`,
          text: toolOutputs[i],
          isBot: true,
          timestamp: new Date(),
        });
      }

      if (!textContent.trim() && toolOutputs.length === 0 && !isBot) {
        const rawParts = parts.filter(p => p.type === 'text');
        const fallbackText = rawParts.map(p => (p as any).text || '').join('');
        if (fallbackText.trim()) {
          result.push({
            id: m.id,
            text: fallbackText.trim(),
            isBot,
            timestamp: new Date(),
          });
        }
      }
    }

    return result;
  }, [agentMessages]);

  const isLoading = useMemo(() => {
    return agentStatus === 'submitted' || agentStatus === 'streaming';
  }, [agentStatus]);

  return useMemo(() => ({
    messages: uiMessages,
    isLoading,
    error: agentError?.message || null,
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
  }), [uiMessages, isLoading, agentError, sendMessage, clearChat, showTaskForm, taskFormData, closeTaskForm, onTaskSaved, analyzeAndCreateTask, openTaskForEdit, openNewTaskForm, goalStore.profile, goalStore.currentGoal, progress?.currentStreak, progress?.focusTimeDisplay]);
});
