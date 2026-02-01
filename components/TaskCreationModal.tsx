import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { X, Plus, Clock, Target, AlertCircle, Star, Lightbulb, Sparkles, Bot, CheckCircle, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DailyTask, SubTask } from '@/types/goal';
import { theme } from '@/constants/theme';
import { useGoalStore } from '@/hooks/use-goal-store';

interface AIGeneratedTask {
  title: string;
  description: string;
  estimatedTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  priority: 'high' | 'medium' | 'low';
  tips: string[];
  subtasks?: { title: string; estimatedTime: number; }[];
}

interface TaskCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (task: Omit<DailyTask, 'id' | 'goalId'>) => void;
  selectedDay: string;
  previousDayTasks?: DailyTask[];
}

const DIFFICULTY_OPTIONS = [
  { value: 'easy' as const, label: 'Easy', color: '#4ADE80' },
  { value: 'medium' as const, label: 'Medium', color: theme.colors.primary },
  { value: 'hard' as const, label: 'Hard', color: '#FF6B6B' },
];

const PRIORITY_OPTIONS = [
  { value: 'low' as const, label: 'Low', icon: Clock, color: theme.colors.textSecondary },
  { value: 'medium' as const, label: 'Medium', icon: Target, color: theme.colors.primary },
  { value: 'high' as const, label: 'High', icon: AlertCircle, color: '#FF6B6B' },
];

const SUGGESTED_TASKS = [
  {
    title: 'Morning Meditation',
    description: 'Start your day with a 10-minute meditation for mental clarity',
    estimatedTime: 10,
    difficulty: 'easy' as const,
    priority: 'medium' as const,
    tips: ['Find a quiet place', 'Use a meditation app', 'Focus on your breathing']
  },
  {
    title: 'Day Planning',
    description: 'Create a list of priority tasks for the day',
    estimatedTime: 15,
    difficulty: 'easy' as const,
    priority: 'high' as const,
    tips: ['Use the rule of 3 important tasks', 'Estimate time for each task', 'Leave buffer time']
  },
  {
    title: 'Physical Activity',
    description: 'Complete a workout routine or go for a walk',
    estimatedTime: 30,
    difficulty: 'medium' as const,
    priority: 'high' as const,
    tips: ['Start with a warm-up', 'Choose activity based on mood', "Don't forget water"]
  },
];

export function TaskCreationModal({ 
  visible, 
  onClose, 
  onSave, 
  selectedDay,
  previousDayTasks = []
}: TaskCreationModalProps) {
  const insets = useSafeAreaInsets();
  const { currentGoal, dailyTasks } = useGoalStore();
  
  const titleInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);
  const durationInputRef = useRef<TextInput>(null);
  const subtaskInputRef = useRef<TextInput>(null);
  const subtaskTimeInputRef = useRef<TextInput>(null);
  const tipInputRef = useRef<TextInput>(null);
  
  const [isCompletedMode, setIsCompletedMode] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('30');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [tips, setTips] = useState<string[]>([]);
  const [newTip, setNewTip] = useState('');
  const [subtasks, setSubtasks] = useState<Omit<SubTask, 'id'>[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [newSubtaskTime, setNewSubtaskTime] = useState('10');
  const [aiSuggestions, setAiSuggestions] = useState<AIGeneratedTask[]>([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setEstimatedTime('30');
    setDifficulty('medium');
    setPriority('medium');
    setTips([]);
    setNewTip('');
    setSubtasks([]);
    setNewSubtask('');
    setNewSubtaskTime('10');
    setIsCompletedMode(false);
  };

  const calculateComplexity = async (taskTitle: string, taskDesc: string): Promise<{ difficulty: 'easy' | 'medium' | 'hard', estimatedTime: number }> => {
    try {
      const prompt = `
        Analyze this completed task and estimate its difficulty and duration:
        Task: ${taskTitle}
        Description: ${taskDesc}
        Goal Context: ${currentGoal?.title || 'General'}
        
        Return ONLY JSON:
        {
          "difficulty": "easy" | "medium" | "hard",
          "estimatedTime": number (minutes)
        }
      `;

      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { 
              role: 'system', 
              content: 'You are an expert task analyzer. Estimate difficulty and time objectively. Return valid JSON only.' 
            },
            { role: 'user', content: prompt }
          ]
        })
      });

      const data = await response.json();
      let jsonString = data.completion.trim();
      
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/```\s*/, '').replace(/\s*```$/, '');
      }

      const result = JSON.parse(jsonString);
      return {
        difficulty: result.difficulty || 'medium',
        estimatedTime: result.estimatedTime || 30
      };
    } catch (error) {
      console.error('Error calculating complexity:', error);
      return { difficulty: 'medium', estimatedTime: 30 };
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    let finalDifficulty = difficulty;
    let finalTime = parseInt(estimatedTime) || 30;

    if (isCompletedMode) {
      setIsCalculating(true);
      const complexity = await calculateComplexity(title, description);
      finalDifficulty = complexity.difficulty;
      finalTime = complexity.estimatedTime;
      setIsCalculating(false);
    }

    const task: Omit<DailyTask, 'id' | 'goalId'> = {
      day: 0,
      date: new Date().toISOString(),
      title: title.trim(),
      description: description.trim(),
      duration: `${finalTime}m`,
      priority: isCompletedMode ? 'medium' : priority,
      difficulty: finalDifficulty,
      estimatedTime: finalTime,
      tips: isCompletedMode ? [] : tips,
      subtasks: subtasks.length > 0 ? subtasks.map((st, index) => ({
        ...st,
        id: `subtask_${Date.now()}_${index}`,
        completed: isCompletedMode ? true : st.completed,
      })) : undefined,
      completed: isCompletedMode,
      completedAt: isCompletedMode ? new Date().toISOString() : undefined,
    };

    onSave(task);
    resetForm();
    onClose();
  };

  const addTip = () => {
    if (newTip.trim()) {
      setTips([...tips, newTip.trim()]);
      setNewTip('');
    }
  };

  const removeTip = (index: number) => {
    setTips(tips.filter((_, i) => i !== index));
  };

  const addSubtask = () => {
    if (newSubtask.trim()) {
      setSubtasks([...subtasks, {
        title: newSubtask.trim(),
        completed: false,
        estimatedTime: parseInt(newSubtaskTime) || 10,
      }]);
      setNewSubtask('');
      setNewSubtaskTime('10');
    }
  };

  const removeSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const applySuggestedTask = (suggested: typeof SUGGESTED_TASKS[0]) => {
    if (!suggested?.title?.trim()) return;
    setTitle(suggested.title);
    setDescription(suggested.description);
    setEstimatedTime(suggested.estimatedTime.toString());
    setDifficulty(suggested.difficulty);
    setPriority(suggested.priority);
    setTips(suggested.tips);
  };

  const adaptFromPreviousDay = (previousTask: DailyTask) => {
    if (!previousTask?.title?.trim()) return;
    setTitle(previousTask.title);
    setDescription(`Adapted: ${previousTask.description}`);
    setEstimatedTime(previousTask.estimatedTime.toString());
    setDifficulty(previousTask.difficulty);
    setPriority(previousTask.priority);
    setTips(previousTask.tips || []);
    if (previousTask.subtasks) {
      setSubtasks(previousTask.subtasks.map(st => ({
        title: st.title,
        completed: false,
        estimatedTime: st.estimatedTime,
      })));
    }
  };

  const generateAITasks = async () => {
    if (!currentGoal?.title) return;
    
    setIsGeneratingAI(true);
    try {
      const recentTasks = dailyTasks ? dailyTasks
        .filter(t => t.goalId === currentGoal.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 7) : [];
      
      const recentCompleted = recentTasks.filter(t => t.completed);
      const recentContext = recentCompleted.length > 0 
        ? `\n\nPREVIOUS COMPLETED TASKS (for context):\n${recentCompleted.map((t, i) => `${i + 1}. ${t.title} - ${t.description}`).join('\n')}\n\nIMPORTANT: Create tasks that LOGICALLY CONTINUE these results and develop them.`
        : '';

      const isLanguageLearning = /english|language|learn.*word|vocabular/i.test(
        `${currentGoal.title} ${currentGoal.description} ${currentGoal.category}`
      );
      const isFitness = /fitness|training|workout|exercise|muscle|running|weight|kilogram/i.test(
        `${currentGoal.title} ${currentGoal.description} ${currentGoal.category}`
      );
      const isCooking = /cook|culinary|recipe|food|dish/i.test(
        `${currentGoal.title} ${currentGoal.description} ${currentGoal.category}`
      );
      const isReading = /read|book/i.test(
        `${currentGoal.title} ${currentGoal.description} ${currentGoal.category}`
      );
      const isProgramming = /programming|code|development|js|python|react|web|develop/i.test(
        `${currentGoal.title} ${currentGoal.description} ${currentGoal.category}`
      );

      let specificInstructions = '';
      
      if (isLanguageLearning) {
        specificInstructions = `
        IMPORTANT: For language learning provide SPECIFIC CONTENT:
        - Don't write "Learn new words", give 10-15 specific words with translation
        - Don't write "Practice grammar", give specific grammar rule with examples
        - Provide ready phrases and expressions to memorize
        - In description include the actual words/phrases to learn
        - In subtasks - specific words or phrases to practice`;
      } else if (isFitness) {
        specificInstructions = `
        IMPORTANT: For fitness provide SPECIFIC EXERCISES WITH NUMBERS:
        - Don't write "Do exercises", give exact list: "20 squats, 15 push-ups, 30 sec plank"
        - Specify number of reps, sets, rest time
        - Give technique tips
        - In subtasks - breakdown by exercises with specific numbers`;
      } else if (isCooking) {
        specificInstructions = `
        IMPORTANT: For cooking provide SPECIFIC RECIPES:
        - Specify the exact dish to prepare
        - Give ingredient list with quantities
        - Step-by-step instructions in subtasks
        - Time for each step`;
      } else if (isReading) {
        specificInstructions = `
        IMPORTANT: For reading provide SPECIFIC PLAN:
        - Specify exact number of pages/chapters
        - Give specific books if goal allows
        - Suggest specific reflection questions`;
      } else if (isProgramming) {
        specificInstructions = `
        IMPORTANT: For programming provide SPECIFIC TASKS:
        - Specify exact task: "Create Button component with props", not "Learn React"
        - Give specific concepts to study
        - In subtasks - specific code or functionality to implement`;
      } else {
        specificInstructions = `
        IMPORTANT: Make tasks as SPECIFIC as possible:
        - Instead of "Study topic" -> "Read chapter 3 and make 1-page summary"
        - Instead of "Work on project" -> "Create first 3 slides with title, content, and intro"
        - Give measurable results and specific actions`;
      }

      const prompt = `
        Create 2-3 specific interconnected tasks to achieve the goal:
        Goal: ${currentGoal.title}
        Goal Description: ${currentGoal.description}
        Category: ${currentGoal.category}
        Motivation: ${currentGoal.motivation}
        ${recentContext}
        ${specificInstructions}
        
        Create JSON array tasks with 2-3 tasks, each should contain:
        - title: specific task name (not general, but specific)
        - description: VERY detailed description with specific details - what exactly to do, which words to learn, which exercises to do, how many reps etc. (3-5 sentences)
        - estimatedTime: time in minutes (number from 15 to 90)
        - difficulty: difficulty (easy/medium/hard) - vary difficulty, don't make all tasks same difficulty
        - priority: priority (high/medium/low)
        - tips: array of 3-4 practical tips on how to complete better
        - subtasks: array of 2-4 subtasks with fields title (specific action) and estimatedTime
        
        CRITICALLY IMPORTANT:
        - Tasks must be INTERCONNECTED and form a UNIFIED STRUCTURE
        - Each next task should BUILD upon the previous one
        - If there are completed tasks - continue their logic, develop results
        - Create FLEXIBLE PLAN that adapts to user's progress
        - Tasks must be MAXIMALLY SPECIFIC - with numbers, lists, names
        - Practical and immediately actionable - user should know exactly what to do
        - Varied in difficulty (easy, medium, hard)
        - With measurable results
        
        Response format: { "tasks": [...] }
        Respond ONLY JSON without markdown and explanations.
      `;

      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { 
              role: 'system', 
              content: 'You are a task planning expert and personal trainer/teacher. Create MAXIMALLY SPECIFIC, practical tasks with detailed instructions. Respond only with valid JSON without markdown blocks and explanations. All texts in English.' 
            },
            { role: 'user', content: prompt }
          ]
        })
      });

      const data = await response.json();
      
      let jsonString = data.completion.trim();
      
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.replace(/```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/```\s*/, '').replace(/\s*```$/, '');
      }
      
      const startIndex = jsonString.indexOf('{');
      const lastIndex = jsonString.lastIndexOf('}');
      
      if (startIndex !== -1 && lastIndex !== -1) {
        jsonString = jsonString.substring(startIndex, lastIndex + 1);
        const aiData = JSON.parse(jsonString);
        
        if (aiData.tasks && Array.isArray(aiData.tasks)) {
          setAiSuggestions(aiData.tasks.slice(0, 4));
        }
      }
    } catch (error) {
      console.error('Error generating AI tasks:', error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const applyAITask = (aiTask: AIGeneratedTask) => {
    setTitle(aiTask.title);
    setDescription(aiTask.description);
    setEstimatedTime(aiTask.estimatedTime.toString());
    setDifficulty(aiTask.difficulty);
    setPriority(aiTask.priority);
    setTips(aiTask.tips || []);
    if (aiTask.subtasks) {
      setSubtasks(aiTask.subtasks.map(st => ({
        title: st.title,
        completed: false,
        estimatedTime: st.estimatedTime,
      })));
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <View style={styles.headerHandle} />
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>
                {isCompletedMode ? 'Log Result' : 'New Task'}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.modeToggleContainer}>
            <TouchableOpacity 
              style={[styles.modeButton, !isCompletedMode && styles.modeButtonActive]} 
              onPress={() => setIsCompletedMode(false)}
              activeOpacity={0.8}
            >
              <Target size={18} color={!isCompletedMode ? theme.colors.background : theme.colors.textSecondary} />
              <Text style={[styles.modeButtonText, !isCompletedMode && styles.modeButtonTextActive]}>
                Plan
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modeButton, isCompletedMode && styles.modeButtonActive]} 
              onPress={() => setIsCompletedMode(true)}
              activeOpacity={0.8}
            >
              <CheckCircle size={18} color={isCompletedMode ? theme.colors.background : theme.colors.textSecondary} />
              <Text style={[styles.modeButtonText, isCompletedMode && styles.modeButtonTextActive]}>
                Completed
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {!isCompletedMode && (
              <>
                {currentGoal && (
                  <View style={styles.section}>
                    <View style={styles.aiSectionHeader}>
                      <View style={styles.sectionTitleRow}>
                        <Sparkles size={18} color={theme.colors.primary} />
                        <Text style={styles.sectionTitle}>AI Suggestions</Text>
                      </View>
                      <TouchableOpacity 
                        style={[styles.generateAIButton, isGeneratingAI && styles.generateAIButtonDisabled]}
                        onPress={generateAITasks}
                        disabled={isGeneratingAI}
                        activeOpacity={0.8}
                      >
                        {isGeneratingAI ? (
                          <ActivityIndicator size="small" color={theme.colors.background} />
                        ) : (
                          <>
                            <Bot size={16} color={theme.colors.background} />
                            <Text style={styles.generateAIButtonText}>Generate</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                    
                    {aiSuggestions.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.suggestedContainer}>
                          {aiSuggestions.map((aiTask, index) => (
                            <TouchableOpacity
                              key={`ai_${index}`}
                              style={styles.aiSuggestedCard}
                              onPress={() => applyAITask(aiTask)}
                              activeOpacity={0.8}
                            >
                              <View style={styles.aiCardHeader}>
                                <View style={[styles.difficultyBadge, { backgroundColor: DIFFICULTY_OPTIONS.find(d => d.value === aiTask.difficulty)?.color + '20' }]}>
                                  <Text style={[styles.difficultyBadgeText, { color: DIFFICULTY_OPTIONS.find(d => d.value === aiTask.difficulty)?.color }]}>
                                    {aiTask.difficulty}
                                  </Text>
                                </View>
                              </View>
                              <Text style={styles.suggestedTitle} numberOfLines={2}>{aiTask.title}</Text>
                              <View style={styles.suggestedMeta}>
                                <Clock size={12} color={theme.colors.textSecondary} />
                                <Text style={styles.suggestedTime}>{aiTask.estimatedTime}m</Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>
                    )}
                  </View>
                )}

                {SUGGESTED_TASKS.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                      <Lightbulb size={18} color={theme.colors.primary} />
                      <Text style={styles.sectionTitle}>Quick Templates</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.suggestedContainer}>
                        {SUGGESTED_TASKS.map((suggested) => (
                          <TouchableOpacity
                            key={suggested.title}
                            style={styles.suggestedCard}
                            onPress={() => applySuggestedTask(suggested)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.suggestedTitle} numberOfLines={2}>{suggested.title}</Text>
                            <View style={styles.suggestedMeta}>
                              <Clock size={12} color={theme.colors.textSecondary} />
                              <Text style={styles.suggestedTime}>{suggested.estimatedTime}m</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {previousDayTasks.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                      <Star size={18} color={theme.colors.primary} />
                      <Text style={styles.sectionTitle}>From Yesterday</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.suggestedContainer}>
                        {previousDayTasks.slice(0, 3).map((task) => (
                          <TouchableOpacity
                            key={task.id}
                            style={styles.adaptedCard}
                            onPress={() => adaptFromPreviousDay(task)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.suggestedTitle} numberOfLines={2}>{task.title}</Text>
                            <View style={styles.suggestedMeta}>
                              <Clock size={12} color={theme.colors.textSecondary} />
                              <Text style={styles.suggestedTime}>{task.estimatedTime}m</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}
              </>
            )}

            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Target size={18} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>
                  {isCompletedMode ? 'What was done?' : 'Task Details'}
                </Text>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Title</Text>
                <TextInput
                  ref={titleInputRef}
                  style={styles.textInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder={isCompletedMode ? "E.g.: Read 20 pages" : "Task name..."}
                  placeholderTextColor={theme.colors.textLight}
                  returnKeyType="next"
                  onSubmitEditing={() => descriptionInputRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  ref={descriptionInputRef}
                  style={[styles.textInput, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder={isCompletedMode ? "Details for AI assessment..." : "What needs to be done..."}
                  placeholderTextColor={theme.colors.textLight}
                  multiline
                  numberOfLines={3}
                  returnKeyType={isCompletedMode ? "done" : "next"}
                  onSubmitEditing={() => !isCompletedMode && durationInputRef.current?.focus()}
                  blurOnSubmit={isCompletedMode}
                />
              </View>

              {!isCompletedMode && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Duration (minutes)</Text>
                  <TextInput
                    ref={durationInputRef}
                    style={styles.textInput}
                    value={estimatedTime}
                    onChangeText={setEstimatedTime}
                    placeholder="30"
                    placeholderTextColor={theme.colors.textLight}
                    keyboardType="numeric"
                    returnKeyType="done"
                  />
                </View>
              )}
            </View>

            {!isCompletedMode && (
              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <AlertCircle size={18} color={theme.colors.primary} />
                  <Text style={styles.sectionTitle}>Priority & Difficulty</Text>
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Priority</Text>
                  <View style={styles.optionsContainer}>
                    {PRIORITY_OPTIONS.map((option) => {
                      const IconComponent = option.icon;
                      const isSelected = priority === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.optionButton,
                            isSelected && styles.optionButtonSelected
                          ]}
                          onPress={() => setPriority(option.value)}
                          activeOpacity={0.8}
                        >
                          <IconComponent size={16} color={isSelected ? theme.colors.primary : option.color} />
                          <Text style={[
                            styles.optionText,
                            isSelected && styles.optionTextSelected
                          ]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Difficulty</Text>
                  <View style={styles.optionsContainer}>
                    {DIFFICULTY_OPTIONS.map((option) => {
                      const isSelected = difficulty === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.optionButton,
                            isSelected && styles.optionButtonSelected
                          ]}
                          onPress={() => setDifficulty(option.value)}
                          activeOpacity={0.8}
                        >
                          <View style={[styles.difficultyDot, { backgroundColor: option.color }]} />
                          <Text style={[
                            styles.optionText,
                            isSelected && styles.optionTextSelected
                          ]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            {!isCompletedMode && (
              <>
                <View style={styles.section}>
                  <View style={styles.sectionTitleRow}>
                    <CheckCircle size={18} color={theme.colors.primary} />
                    <Text style={styles.sectionTitle}>Subtasks</Text>
                  </View>
                  
                  <View style={styles.addItemContainer}>
                    <TextInput
                      ref={subtaskInputRef}
                      style={[styles.textInput, styles.addItemInput]}
                      value={newSubtask}
                      onChangeText={setNewSubtask}
                      placeholder="Add subtask..."
                      placeholderTextColor={theme.colors.textLight}
                      returnKeyType="next"
                      onSubmitEditing={() => subtaskTimeInputRef.current?.focus()}
                      blurOnSubmit={false}
                    />
                    <TextInput
                      ref={subtaskTimeInputRef}
                      style={[styles.textInput, styles.timeInput]}
                      value={newSubtaskTime}
                      onChangeText={setNewSubtaskTime}
                      placeholder="10"
                      placeholderTextColor={theme.colors.textLight}
                      keyboardType="numeric"
                      returnKeyType="done"
                      onSubmitEditing={addSubtask}
                    />
                    <TouchableOpacity 
                      style={[styles.addButton, !newSubtask.trim() && styles.addButtonDisabled]} 
                      onPress={addSubtask}
                      disabled={!newSubtask.trim()}
                      activeOpacity={0.8}
                    >
                      <Plus size={20} color={newSubtask.trim() ? theme.colors.background : theme.colors.textLight} />
                    </TouchableOpacity>
                  </View>

                  {subtasks.map((subtask, index) => (
                    <View key={`${subtask.title}_${index}`} style={styles.listItem}>
                      <View style={styles.listItemDot} />
                      <Text style={styles.listItemText}>{subtask.title}</Text>
                      <Text style={styles.listItemTime}>{subtask.estimatedTime}m</Text>
                      <TouchableOpacity 
                        onPress={() => removeSubtask(index)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <X size={16} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                <View style={styles.section}>
                  <View style={styles.sectionTitleRow}>
                    <Lightbulb size={18} color={theme.colors.primary} />
                    <Text style={styles.sectionTitle}>Tips</Text>
                  </View>
                  
                  <View style={styles.addItemContainer}>
                    <TextInput
                      ref={tipInputRef}
                      style={[styles.textInput, styles.addItemInput]}
                      value={newTip}
                      onChangeText={setNewTip}
                      placeholder="Add helpful tip..."
                      placeholderTextColor={theme.colors.textLight}
                      returnKeyType="done"
                      onSubmitEditing={addTip}
                    />
                    <TouchableOpacity 
                      style={[styles.addButton, !newTip.trim() && styles.addButtonDisabled]} 
                      onPress={addTip}
                      disabled={!newTip.trim()}
                      activeOpacity={0.8}
                    >
                      <Plus size={20} color={newTip.trim() ? theme.colors.background : theme.colors.textLight} />
                    </TouchableOpacity>
                  </View>

                  {tips.map((tip, index) => (
                    <View key={`${tip}_${index}`} style={styles.listItem}>
                      <Lightbulb size={14} color={theme.colors.primary} />
                      <Text style={[styles.listItemText, styles.tipText]}>{tip}</Text>
                      <TouchableOpacity 
                        onPress={() => removeTip(index)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <X size={16} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.saveButton, (!title.trim() || isCalculating) && styles.saveButtonDisabled]} 
              onPress={handleSave}
              disabled={!title.trim() || isCalculating}
              activeOpacity={0.8}
            >
              {isCalculating ? (
                <ActivityIndicator color={theme.colors.background} size="small" />
              ) : (
                <>
                  <Text style={styles.saveButtonText}>
                    {isCompletedMode ? 'Save & Evaluate' : 'Create Task'}
                  </Text>
                  <ChevronRight size={18} color={theme.colors.background} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerHandle: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: theme.spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeToggleContainer: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  modeButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    ...theme.shadows.gold,
  },
  modeButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  modeButtonTextActive: {
    color: theme.colors.background,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
  },
  aiSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  generateAIButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.xs,
    ...theme.shadows.gold,
  },
  generateAIButtonDisabled: {
    opacity: 0.6,
  },
  generateAIButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.background,
  },
  suggestedContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  suggestedCard: {
    width: 140,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  aiSuggestedCard: {
    width: 160,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.primary + '40',
    ...theme.shadows.gold,
  },
  aiCardHeader: {
    marginBottom: theme.spacing.sm,
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.xs,
  },
  difficultyBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.medium,
    textTransform: 'capitalize' as const,
  },
  adaptedCard: {
    width: 140,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  suggestedTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
  },
  suggestedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  suggestedTime: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: theme.spacing.md,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  optionButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  optionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  optionTextSelected: {
    color: theme.colors.primary,
  },
  difficultyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  addItemContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  addItemInput: {
    flex: 1,
  },
  timeInput: {
    width: 70,
    textAlign: 'center',
  },
  addButton: {
    width: 48,
    height: 48,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.gold,
  },
  addButtonDisabled: {
    backgroundColor: theme.colors.surface,
    shadowOpacity: 0,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  listItemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  listItemText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
  },
  tipText: {
    marginLeft: theme.spacing.xs,
  },
  listItemTime: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    gap: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  cancelButton: {
    height: 52,
    paddingHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  saveButton: {
    flex: 1,
    height: 52,
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    ...theme.shadows.gold,
  },
  saveButtonDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
  },
  saveButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.background,
  },
});
