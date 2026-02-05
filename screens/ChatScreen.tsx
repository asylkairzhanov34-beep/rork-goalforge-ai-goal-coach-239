import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Dimensions,
  Easing,
  Image,
} from 'react-native';
import { Video, ResizeMode, Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Send, MessageSquarePlus, Sparkles, X, TrendingUp, Zap, Lock, ClipboardList, Edit3, Plus, Mic, ImageIcon, Camera, XCircle } from 'lucide-react-native';
import { useChat } from '@/hooks/use-chat-store';
import { ChatMessage, ChatAttachment } from '@/types/chat';
import { theme } from '@/constants/theme';
import { InlineChatTaskForm } from '@/components/InlineChatTaskForm';
import { useGoalStore } from '@/hooks/use-goal-store';
import { DailyTask } from '@/types/goal';

import PremiumGate from '@/components/PremiumGate';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STT_API_URL = 'https://toolkit.rork.com/stt/transcribe/';

interface MessageBubbleProps {
  message: ChatMessage;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isFirstInGroup, isLastInGroup }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      })
    ]).start();
  }, [fadeAnim, translateY]);

  const getBubbleStyle = () => {
    if (message.isBot) {
      return {
        borderTopLeftRadius: isFirstInGroup ? 20 : 6,
        borderTopRightRadius: 20,
        borderBottomLeftRadius: isLastInGroup ? 20 : 6,
        borderBottomRightRadius: 20,
      };
    }
    return {
      borderTopLeftRadius: 20,
      borderTopRightRadius: isFirstInGroup ? 20 : 6,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: isLastInGroup ? 20 : 6,
    };
  };

  return (
    <Animated.View 
      style={[
        styles.messageRow, 
        { 
          opacity: fadeAnim, 
          transform: [{ translateY }],
          marginBottom: isLastInGroup ? 16 : 3,
        },
        message.isBot ? styles.botRow : styles.userRow
      ]}
    >
      {message.isBot && isLastInGroup && (
        <View style={styles.avatarWrapper}>
          <View style={styles.botAvatar}>
            <Sparkles size={14} color="#000" />
          </View>
        </View>
      )}
      {message.isBot && !isLastInGroup && <View style={styles.avatarPlaceholder} />}
      
      <View style={[
        styles.messageBubble,
        message.isBot ? styles.botBubble : styles.userBubble,
        getBubbleStyle()
      ]}>
        {message.attachments && message.attachments.length > 0 && (
          <View style={styles.messageAttachments}>
            {message.attachments.map((att, i) => (
              <Image
                key={i}
                source={{ uri: att.uri }}
                style={styles.messageImage}
                resizeMode="cover"
              />
            ))}
          </View>
        )}
        <Text style={[
          styles.messageText,
          message.isBot ? styles.botText : styles.userText
        ]}>
          {message.text}
        </Text>
      </View>
    </Animated.View>
  );
};

interface TaskPickerModalProps {
  visible: boolean;
  tasks: DailyTask[];
  onClose: () => void;
  onSelectTask: (task: DailyTask) => void;
}

const TaskPickerModal: React.FC<TaskPickerModalProps> = ({ visible, tasks, onClose, onSelectTask }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  if (!visible) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.taskPickerBackdrop, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>
      <Animated.View style={[styles.taskPickerContainer, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.taskPickerHandle} />
        <View style={styles.taskPickerHeader}>
          <Text style={styles.taskPickerTitle}>Select Task to Edit</Text>
          <TouchableOpacity onPress={onClose} style={styles.taskPickerClose}>
            <X size={20} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.taskPickerList} showsVerticalScrollIndicator={false}>
          {tasks.length === 0 ? (
            <View style={styles.taskPickerEmpty}>
              <Text style={styles.taskPickerEmptyText}>No tasks available</Text>
            </View>
          ) : (
            tasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={styles.taskPickerItem}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  onSelectTask(task);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.taskPickerItemLeft}>
                  <View style={[styles.taskPickerDot, { backgroundColor: getPriorityColor(task.priority || 'medium') }]} />
                  <View style={styles.taskPickerItemContent}>
                    <Text style={[styles.taskPickerItemTitle, task.completed && styles.taskPickerItemCompleted]} numberOfLines={1}>
                      {task.title}
                    </Text>
                    {task.description && (
                      <Text style={styles.taskPickerItemDesc} numberOfLines={1}>{task.description}</Text>
                    )}
                  </View>
                </View>
                <Edit3 size={16} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

interface AnimatedWelcomeProps {
  onSuggestionPress: (prompt: string) => void;
  onAnalyzeCompleted: () => void;
  onEditTask: () => void;
  onGenerateTask: () => void;
}

const AnimatedWelcome: React.FC<AnimatedWelcomeProps> = ({ onSuggestionPress, onAnalyzeCompleted, onEditTask, onGenerateTask }) => {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const cardsStagger = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(0))).current;
  const cardsSlide = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(20))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const staggerDelay = 100;
    cardsStagger.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: 400 + index * staggerDelay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      Animated.timing(cardsSlide[index], {
        toValue: 0,
        duration: 400,
        delay: 400 + index * staggerDelay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }, [fadeIn, slideUp, cardsStagger, cardsSlide]);

  const suggestions = [
    { key: 'generate', title: 'New Task', prompt: '', Icon: Plus, action: 'generate' },
    { key: 'review', title: 'Review', prompt: '', Icon: ClipboardList, action: 'analyze' },
    { key: 'edit', title: 'Edit task', prompt: '', Icon: Edit3, action: 'edit' },
    { key: 'analyze', title: 'Progress', prompt: 'Analyze my progress', Icon: TrendingUp, action: 'prompt' },
    { key: 'boost', title: 'Boost', prompt: 'How can I be more productive?', Icon: Zap, action: 'prompt' },
  ];

  return (
    <Animated.View 
      style={[
        styles.welcomeContainer,
        { opacity: fadeIn, transform: [{ translateY: slideUp }] }
      ]}
    >
      <View style={styles.videoSection}>
        <Video
          source={{ uri: 'https://res.cloudinary.com/dohdrsflw/video/upload/v1769862793/371759_3_yx4w13.mp4' }}
          style={styles.welcomeVideo}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          isLooping
          isMuted
        />
      </View>

      <Text style={styles.welcomeTitle}>GoalForge AI</Text>
      <Text style={styles.welcomeSubtitle}>
        I can help analyze your progress{"\n"}and give you productivity advice
      </Text>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.suggestionsContainer}
      >
        {suggestions.map(({ key, title, prompt, Icon, action }, index) => (
          <Animated.View
            key={key}
            style={[
              { 
                opacity: cardsStagger[index],
                transform: [{ translateY: cardsSlide[index] }]
              }
            ]}
          >
            <TouchableOpacity
              style={styles.suggestionChip}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                if (action === 'generate') {
                  onGenerateTask();
                } else if (action === 'analyze') {
                  onAnalyzeCompleted();
                } else if (action === 'edit') {
                  onEditTask();
                } else {
                  onSuggestionPress(prompt);
                }
              }}
              activeOpacity={0.8}
              testID={`chat-suggestion-${key}`}
            >
              <Icon size={14} color="#FFD600" />
              <Text style={styles.suggestionChipText}>{title}</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </ScrollView>
    </Animated.View>
  );
};

const ChatScreenContent: React.FC = () => {
  const { messages, sendMessage, clearChat, isLoading, error, showTaskForm, taskFormData, closeTaskForm, onTaskSaved, analyzeAndCreateTask, openTaskForEdit, openNewTaskForm } = useChat();
  const { dailyTasks, currentGoal } = useGoalStore();
  const router = useRouter();
  const [inputText, setInputText] = useState<string>('');
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const [isSending, setIsSending] = useState(false);
  const welcomeFadeOut = useRef(new Animated.Value(1)).current;
  const welcomeFadeIn = useRef(new Animated.Value(0)).current;
  const [showWelcome, setShowWelcome] = useState(messages.length === 0);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const prevMessagesLength = useRef(messages.length);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Image attachments state
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  const availableTasks = dailyTasks.filter(t => t.goalId === currentGoal?.id);

  useEffect(() => {
    if (messages.length > 0 && showWelcome) {
      Animated.timing(welcomeFadeOut, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setShowWelcome(false);
      });
    }
    
    if (messages.length === 0 && prevMessagesLength.current > 0) {
      welcomeFadeOut.setValue(0);
      welcomeFadeIn.setValue(0);
      setShowWelcome(true);
      
      Animated.parallel([
        Animated.timing(welcomeFadeOut, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(welcomeFadeIn, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
    
    prevMessagesLength.current = messages.length;
  }, [messages.length, showWelcome, welcomeFadeOut, welcomeFadeIn]);

  useEffect(() => {
    if (!error) return;
    console.log('[ChatScreen] Error banner shown:', error);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  }, [error]);

  const handleSend = useCallback(async () => {
    if (inputText.trim() || attachments.length > 0) {
      const text = inputText.trim() || (attachments.length > 0 ? 'Посмотри на это изображение' : '');
      const currentAttachments = [...attachments];
      setInputText('');
      setAttachments([]);
      setIsSending(true);
      try {
        if (currentAttachments.length > 0) {
          await sendMessage({ text, attachments: currentAttachments });
        } else {
          await sendMessage(text);
        }
      } catch (e) {
        console.error('[ChatScreen] sendMessage failed:', e);
      } finally {
        setIsSending(false);
      }
    }
  }, [inputText, attachments, sendMessage]);

  // Voice recording handlers
  const startRecording = useCallback(async () => {
    try {
      console.log('[ChatScreen] Starting voice recording...');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      
      if (Platform.OS === 'web') {
        // Web: use MediaRecorder API
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
          audioChunksRef.current = [];
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
          };
          
          mediaRecorderRef.current = mediaRecorder;
          mediaRecorder.start();
          setIsRecording(true);
          console.log('[ChatScreen] Web recording started');
        } catch (webError) {
          console.error('[ChatScreen] Web recording error:', webError);
          throw webError;
        }
      } else {
        // Mobile: use expo-av with new API
        console.log('[ChatScreen] Requesting audio permissions...');
        const permissionResponse = await Audio.requestPermissionsAsync();
        console.log('[ChatScreen] Permission response:', permissionResponse);
        
        if (permissionResponse.status !== 'granted') {
          console.error('[ChatScreen] Audio permission not granted');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
          return;
        }
        
        console.log('[ChatScreen] Setting audio mode...');
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        
        console.log('[ChatScreen] Creating recording...');
        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        
        setRecording(newRecording);
        setIsRecording(true);
        console.log('[ChatScreen] Mobile recording started');
      }
    } catch (error) {
      console.error('[ChatScreen] Failed to start recording:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setIsRecording(false);
      setRecording(null);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    try {
      console.log('[ChatScreen] Stopping voice recording...');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setIsRecording(false);
      setIsTranscribing(true);
      
      let audioBlob: Blob;
      let fileName: string;
      
      if (Platform.OS === 'web') {
        // Web: stop MediaRecorder
        const mediaRecorder = mediaRecorderRef.current;
        if (!mediaRecorder) {
          console.log('[ChatScreen] No web mediaRecorder found');
          setIsTranscribing(false);
          return;
        }
        
        await new Promise<void>((resolve) => {
          mediaRecorder.onstop = () => resolve();
          mediaRecorder.stop();
        });
        
        // Stop all tracks
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        
        audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        fileName = 'recording.webm';
        mediaRecorderRef.current = null;
        
        // Web: send blob to STT API
        const formData = new FormData();
        formData.append('audio', audioBlob, fileName);
        
        console.log('[ChatScreen] Sending web audio for transcription...');
        const response = await fetch(STT_API_URL, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[ChatScreen] STT API error:', response.status, errorText);
          throw new Error(`STT API error: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('[ChatScreen] Web transcription result:', result);
        
        if (result.text) {
          setInputText(prev => prev ? `${prev} ${result.text}` : result.text);
        }
      } else {
        // Mobile: stop expo-av recording
        if (!recording) {
          console.log('[ChatScreen] No mobile recording found');
          setIsTranscribing(false);
          return;
        }
        
        console.log('[ChatScreen] Stopping mobile recording...');
        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
        
        const uri = recording.getURI();
        console.log('[ChatScreen] Recording URI:', uri);
        
        if (!uri) {
          console.error('[ChatScreen] No recording URI');
          throw new Error('No recording URI');
        }
        
        const uriParts = uri.split('.');
        const fileType = uriParts[uriParts.length - 1] || 'm4a';
        
        // For mobile, send as file object
        const formData = new FormData();
        formData.append('audio', {
          uri,
          name: `recording.${fileType}`,
          type: fileType === 'm4a' ? 'audio/mp4' : `audio/${fileType}`,
        } as any);
        
        console.log('[ChatScreen] Sending mobile audio for transcription...');
        const response = await fetch(STT_API_URL, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[ChatScreen] STT API error:', response.status, errorText);
          throw new Error(`STT API error: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('[ChatScreen] Mobile transcription result:', result);
        
        if (result.text) {
          setInputText(prev => prev ? `${prev} ${result.text}` : result.text);
        }
        
        setRecording(null);
      }
    } catch (error) {
      console.error('[ChatScreen] Failed to stop recording:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setIsTranscribing(false);
      setRecording(null);
    }
  }, [recording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Image picker handlers
  const pickImage = useCallback(async () => {
    try {
      console.log('[ChatScreen] Opening image picker...');
      Haptics.selectionAsync().catch(() => {});
      setShowAttachmentMenu(false);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });
      
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const uri = asset.base64 
          ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
          : asset.uri;
        
        setAttachments(prev => [...prev, {
          type: 'image',
          uri,
          mimeType: asset.mimeType || 'image/jpeg',
        }]);
        console.log('[ChatScreen] Image added to attachments');
      }
    } catch (error) {
      console.error('[ChatScreen] Failed to pick image:', error);
    }
  }, []);

  const takePhoto = useCallback(async () => {
    try {
      console.log('[ChatScreen] Opening camera...');
      Haptics.selectionAsync().catch(() => {});
      setShowAttachmentMenu(false);
      
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        console.log('[ChatScreen] Camera permission denied');
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });
      
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const uri = asset.base64 
          ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
          : asset.uri;
        
        setAttachments(prev => [...prev, {
          type: 'image',
          uri,
          mimeType: asset.mimeType || 'image/jpeg',
        }]);
        console.log('[ChatScreen] Photo added to attachments');
      }
    } catch (error) {
      console.error('[ChatScreen] Failed to take photo:', error);
    }
  }, []);

  const removeAttachment = useCallback((index: number) => {
    Haptics.selectionAsync().catch(() => {});
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSuggestionPress = useCallback((prompt: string) => {
    setInputText(prompt);
  }, []);

  const handleAnalyzeCompleted = useCallback(async () => {
    console.log('[ChatScreen] Analyze completed tasks');
    setIsSending(true);
    try {
      await analyzeAndCreateTask();
    } catch (e) {
      console.error('[ChatScreen] analyzeAndCreateTask failed:', e);
    } finally {
      setIsSending(false);
    }
  }, [analyzeAndCreateTask]);

  const handleEditTask = useCallback(() => {
    console.log('[ChatScreen] Opening task picker');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setShowTaskPicker(true);
  }, []);

  const handleGenerateTask = useCallback(async () => {
    console.log('[ChatScreen] Generate new task');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setIsSending(true);
    try {
      await openNewTaskForm();
    } catch (e) {
      console.error('[ChatScreen] openNewTaskForm failed:', e);
    } finally {
      setIsSending(false);
    }
  }, [openNewTaskForm]);

  const handleSelectTaskToEdit = useCallback((task: DailyTask) => {
    console.log('[ChatScreen] Selected task to edit:', task.title);
    setShowTaskPicker(false);
    openTaskForEdit(task);
  }, [openTaskForEdit]);

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, [messages]);

  const getMessageGroups = () => {
    const groups: { message: ChatMessage; isFirstInGroup: boolean; isLastInGroup: boolean }[] = [];
    
    messages.forEach((message, index) => {
      const prevMessage = index > 0 ? messages[index - 1] : null;
      const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
      
      const isFirstInGroup = !prevMessage || prevMessage.isBot !== message.isBot;
      const isLastInGroup = !nextMessage || nextMessage.isBot !== message.isBot;
      
      groups.push({ message, isFirstInGroup, isLastInGroup });
    });
    
    return groups;
  };

  return (
      <View style={styles.container}>
        <SafeAreaView style={styles.headerContainer} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              testID="chat-close-button"
            >
              <X size={22} color={theme.colors.text} />
            </TouchableOpacity>
            
            <View style={styles.headerCenter}>
              <View style={styles.headerAvatarSmall}>
                <Sparkles size={16} color="#000" />
              </View>
              <View>
                <Text style={styles.headerTitle}>GoalForge</Text>
                <View style={styles.statusContainer}>
                  <View style={styles.statusDot} />
                  <Text style={styles.headerSubtitle}>Online</Text>
                </View>
              </View>
            </View>
            
            <TouchableOpacity 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                clearChat();
              }} 
              style={styles.clearButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              testID="chat-new-button"
            >
              <MessageSquarePlus size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <KeyboardAvoidingView 
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={styles.chatContainer}>
            {!!error && (
              <View style={styles.errorBanner} testID="chat-error-banner">
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}
            
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {showWelcome && (
                <Animated.View style={{ opacity: welcomeFadeOut }}>
                  <AnimatedWelcome 
                    onSuggestionPress={handleSuggestionPress}
                    onAnalyzeCompleted={handleAnalyzeCompleted}
                    onEditTask={handleEditTask}
                    onGenerateTask={handleGenerateTask}
                  />
                </Animated.View>
              )}
              
              {getMessageGroups().map(({ message, isFirstInGroup, isLastInGroup }, index) => (
                <MessageBubble 
                  key={message.id || index} 
                  message={message}
                  isFirstInGroup={isFirstInGroup}
                  isLastInGroup={isLastInGroup}
                />
              ))}
              
              {(isLoading || isSending) && (
                <View style={styles.typingRow}>
                  <View style={styles.avatarWrapper}>
                    <View style={styles.botAvatar}>
                      <Sparkles size={14} color="#000" />
                    </View>
                  </View>
                  <View style={styles.typingBubble}>
                    <View style={styles.typingDots}>
                      <Animated.View style={[styles.typingDot, { opacity: 0.4 }]} />
                      <Animated.View style={[styles.typingDot, { opacity: 0.7 }]} />
                      <Animated.View style={[styles.typingDot, { opacity: 1 }]} />
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
          
          <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            {/* Attachment Preview */}
            {attachments.length > 0 && (
              <View style={styles.attachmentPreviewContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {attachments.map((att, index) => (
                    <View key={index} style={styles.attachmentPreviewItem}>
                      <Image source={{ uri: att.uri }} style={styles.attachmentPreviewImage} />
                      <TouchableOpacity
                        style={styles.attachmentRemoveButton}
                        onPress={() => removeAttachment(index)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <XCircle size={18} color="#FF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
            
            {/* Attachment Menu */}
            {showAttachmentMenu && (
              <View style={styles.attachmentMenu}>
                <TouchableOpacity style={styles.attachmentMenuItem} onPress={pickImage}>
                  <ImageIcon size={20} color="#FFD600" />
                  <Text style={styles.attachmentMenuText}>Галерея</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.attachmentMenuItem} onPress={takePhoto}>
                  <Camera size={20} color="#FFD600" />
                  <Text style={styles.attachmentMenuText}>Камера</Text>
                </TouchableOpacity>
              </View>
            )}
            
            <View style={styles.inputWrapper}>
              {/* Attachment Button */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setShowAttachmentMenu(!showAttachmentMenu);
                }}
                style={styles.attachButton}
                activeOpacity={0.7}
              >
                <Plus size={20} color={showAttachmentMenu ? '#FFD600' : 'rgba(255,255,255,0.5)'} />
              </TouchableOpacity>
              
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder={isRecording ? 'Говорите...' : 'Напишите сообщение...'}
                placeholderTextColor="rgba(255,255,255,0.4)"
                multiline
                maxLength={1000}
                returnKeyType="default"
                editable={!isRecording}
              />
              
              {/* Voice Recording Button */}
              <TouchableOpacity
                onPress={toggleRecording}
                disabled={isTranscribing}
                style={[
                  styles.voiceButton,
                  isRecording && styles.voiceButtonActive,
                  isTranscribing && styles.voiceButtonDisabled,
                ]}
                activeOpacity={0.7}
              >
                {isTranscribing ? (
                  <ActivityIndicator size="small" color="#FFD600" />
                ) : (
                  <Mic size={18} color={isRecording ? '#000' : 'rgba(255,255,255,0.6)'} />
                )}
              </TouchableOpacity>
              
              {/* Send Button */}
              <TouchableOpacity
                onPress={handleSend}
                disabled={(!inputText.trim() && attachments.length === 0) || isSending}
                style={[
                  styles.sendButton,
                  ((!inputText.trim() && attachments.length === 0) || isSending) && styles.sendButtonDisabled
                ]}
                activeOpacity={0.7}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Send size={18} color="#000" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>

        <InlineChatTaskForm
          visible={showTaskForm}
          taskData={taskFormData}
          onClose={closeTaskForm}
          onSave={onTaskSaved}
        />

        <TaskPickerModal
          visible={showTaskPicker}
          tasks={availableTasks}
          onClose={() => setShowTaskPicker(false)}
          onSelectTask={handleSelectTaskToEdit}
        />
      </View>
  );
};

const ChatScreen: React.FC = () => {
  const router = useRouter();
  
  return (
    <PremiumGate
      feature="AI Chat Assistant"
      fallback={
        <View style={styles.gatedContainer}>
          <SafeAreaView style={styles.gatedSafeArea} edges={['top', 'bottom']}>
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={styles.gatedCloseButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={22} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
            
            <View style={styles.gatedContent}>
              <View style={styles.gatedIconContainer}>
                <View style={styles.gatedIconGlow} />
                <View style={styles.gatedIcon}>
                  <Lock size={32} color="#FFD600" />
                </View>
              </View>
              
              <Text style={styles.gatedTitle}>Premium Feature</Text>
              <Text style={styles.gatedSubtitle}>
                Get personalized advice and productivity tips from your AI coach
              </Text>
            </View>
          </SafeAreaView>
        </View>
      }
    >
      <ChatScreenContent />
    </PremiumGate>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerContainer: {
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFD600',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
    marginRight: 5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoid: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorBannerText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  botRow: {
    justifyContent: 'flex-start',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  avatarWrapper: {
    marginRight: 8,
  },
  avatarPlaceholder: {
    width: 28,
    marginRight: 8,
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFD600',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    maxWidth: SCREEN_WIDTH * 0.75,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  botBubble: {
    backgroundColor: '#1A1A1A',
  },
  userBubble: {
    backgroundColor: '#FFD600',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  botText: {
    color: '#FFFFFF',
  },
  userText: {
    color: '#000000',
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  videoSection: {
    width: SCREEN_WIDTH,
    marginBottom: 20,
    alignItems: 'center',
    marginLeft: -16,
  },
  welcomeVideo: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  suggestionChipText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  typingBubble: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopLeftRadius: 4,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD600',
  },
  inputContainer: {
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 48,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 8,
    paddingRight: 8,
  },
  sendButton: {
    backgroundColor: '#FFD600',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  gatedContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  gatedSafeArea: {
    flex: 1,
  },
  gatedCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  gatedContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  gatedIconContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  gatedIconGlow: {
    position: 'absolute',
    top: -15,
    left: -15,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFD600',
    opacity: 0.1,
  },
  gatedIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 214, 0, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 214, 0, 0.25)',
  },
  gatedTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  gatedSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
  },
  taskPickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  taskPickerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '70%',
    backgroundColor: '#0D0D0D',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
  },
  taskPickerHandle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  taskPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  taskPickerTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  taskPickerClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskPickerList: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  taskPickerEmpty: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  taskPickerEmptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
  taskPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  taskPickerItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  taskPickerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  taskPickerItemContent: {
    flex: 1,
  },
  taskPickerItemTitle: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  taskPickerItemCompleted: {
    textDecorationLine: 'line-through',
    color: 'rgba(255,255,255,0.4)',
  },
  taskPickerItemDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  messageAttachments: {
    marginBottom: 8,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 4,
  },
  attachmentPreviewContainer: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  attachmentPreviewItem: {
    position: 'relative',
    marginRight: 8,
  },
  attachmentPreviewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  attachmentRemoveButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#000',
    borderRadius: 10,
  },
  attachmentMenu: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  attachmentMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,214,0,0.1)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  attachmentMenuText: {
    color: '#FFD600',
    fontSize: 14,
    fontWeight: '500',
  },
  attachButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  voiceButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginRight: 6,
  },
  voiceButtonActive: {
    backgroundColor: '#FF4444',
  },
  voiceButtonDisabled: {
    opacity: 0.5,
  },
});

export default ChatScreen;
