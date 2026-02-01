import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { X, CheckCircle, MessageSquare, Lightbulb, AlertTriangle } from 'lucide-react-native';
import { DailyTask, TaskFeedback } from '@/types/goal';
import * as Haptics from 'expo-haptics';

interface TaskFeedbackModalProps {
  visible: boolean;
  task: DailyTask | null;
  onClose: () => void;
  onSave: (taskId: string, feedback: TaskFeedback) => void;
  onSkip: () => void;
}

export function TaskFeedbackModal({
  visible,
  task,
  onClose,
  onSave,
  onSkip,
}: TaskFeedbackModalProps) {
  const [difficulties, setDifficulties] = useState('');
  const [personalContext, setPersonalContext] = useState('');
  const [suggestedChanges, setSuggestedChanges] = useState('');
  
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setDifficulties('');
      setPersonalContext('');
      setSuggestedChanges('');
      
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(checkAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]).start();
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
      checkAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim, checkAnim]);

  const handleSave = () => {
    if (!task) return;
    
    const feedback: TaskFeedback = {
      difficulties: difficulties.trim(),
      personalContext: personalContext.trim(),
      suggestedChanges: suggestedChanges.trim(),
      createdAt: new Date().toISOString(),
    };
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    onSave(task.id, feedback);
    onClose();
  };

  const handleSkip = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSkip();
    onClose();
  };

  if (!task) return null;

  const hasFeedback = difficulties.trim() || personalContext.trim() || suggestedChanges.trim();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        
        <Animated.View
          style={[
            styles.container,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.header}>
            <Animated.View
              style={[
                styles.successIcon,
                {
                  transform: [{ scale: checkAnim }],
                },
              ]}
            >
              <CheckCircle size={32} color="#4ADE80" />
            </Animated.View>
            
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Great job! 🎉</Text>
          <Text style={styles.taskName}>{task.title}</Text>
          <Text style={styles.subtitle}>
            Share your experience to help improve future plans
          </Text>

          <ScrollView 
            style={styles.form}
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.inputGroup}>
              <View style={styles.inputHeader}>
                <AlertTriangle size={18} color="#FF6B6B" />
                <Text style={styles.inputLabel}>What difficulties did you face?</Text>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="E.g.: not enough time, got distracted..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={difficulties}
                onChangeText={setDifficulties}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                testID="taskFeedback.difficulties"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputHeader}>
                <MessageSquare size={18} color="#60A5FA" />
                <Text style={styles.inputLabel}>Personal life context</Text>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="What affected task completion..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={personalContext}
                onChangeText={setPersonalContext}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                testID="taskFeedback.personalContext"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputHeader}>
                <Lightbulb size={18} color="#FFD600" />
                <Text style={styles.inputLabel}>How to improve the task?</Text>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Suggestions for changing the task in the future..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={suggestedChanges}
                onChangeText={setSuggestedChanges}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                testID="taskFeedback.suggestedChanges"
              />
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveButton,
                !hasFeedback && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!hasFeedback}
            >
              <Text style={[
                styles.saveButtonText,
                !hasFeedback && styles.saveButtonTextDisabled,
              ]}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  container: {
    width: '90%',
    maxWidth: 480,
    height: '85%',
    minHeight: 460,
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  taskName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFD600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  form: {
    flex: 1,
    marginBottom: 20,
  },
  formContent: {
    paddingBottom: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: '#FFFFFF',
    minHeight: 80,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.6)',
  },
  saveButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FFD600',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(255, 214, 0, 0.3)',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#000000',
  },
  saveButtonTextDisabled: {
    color: 'rgba(0,0,0,0.4)',
  },
});
