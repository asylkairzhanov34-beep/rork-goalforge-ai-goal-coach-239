import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { User } from 'lucide-react-native';
import { theme } from '@/constants/theme';

interface Step1ProfileProps {
  onNext: (data: { nickname: string }) => void;
  initialData?: { nickname: string };
}

export default function Step1Profile({ onNext, initialData }: Step1ProfileProps) {
  const [nickname, setNickname] = useState<string>(initialData?.nickname || '');
  const [nicknameError, setNicknameError] = useState<string>('');
  const [fadeAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const validateNickname = (text: string): boolean => {
    if (text.length < 2) {
      setNicknameError('Minimum 2 characters');
      return false;
    }
    if (text.length > 20) {
      setNicknameError('Maximum 20 characters');
      return false;
    }
    setNicknameError('');
    return true;
  };

  const handleNicknameChange = (text: string) => {
    setNickname(text);
    if (text.length > 0) {
      validateNickname(text);
    } else {
      setNicknameError('');
    }
  };

  const handleNext = () => {
    if (!validateNickname(nickname)) {
      return;
    }

    onNext({ nickname });
  };



  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Hi! 👋</Text>
            <Text style={styles.subtitle}>What should we call you?</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <User size={48} color={theme.colors.primary} strokeWidth={1.5} />
              </View>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.label}>Nickname</Text>
              <TextInput
                style={[
                  styles.input,
                  nicknameError ? styles.inputError : {},
                  nickname.length > 0 && !nicknameError ? styles.inputSuccess : {}
                ]}
                value={nickname}
                onChangeText={handleNicknameChange}
                placeholder="Enter your name"
                placeholderTextColor={theme.colors.textLight}
                maxLength={20}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleNext}
                blurOnSubmit={true}
              />
              {nicknameError ? (
                <Text style={styles.errorText}>{nicknameError}</Text>
              ) : null}
            </View>


          </View>

          <TouchableOpacity
            style={[
              styles.button,
              (!nickname || nicknameError) && styles.buttonDisabled
            ]}
            onPress={handleNext}
            disabled={!nickname || !!nicknameError}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xxxl,
    paddingBottom: theme.spacing.xl,
  },
  content: {
    flex: 1,
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.regular,
  },
  card: {
    backgroundColor: '#0F1213',
    borderRadius: 24,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.06)',
    ...theme.shadows.medium,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.gold,
  },
  inputSection: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    fontWeight: theme.fontWeight.medium,
  },
  input: {
    height: 52,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  inputSuccess: {
    borderColor: theme.colors.primary,
  },
  errorText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },

  button: {
    marginTop: theme.spacing.xl,
    height: 56,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.gold,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.background,
  },
});
