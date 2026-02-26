import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Image,
  Dimensions,
  TextInput,
  Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { usePreferences } from '../context/PreferencesContext';
import { useVoiceInterface } from '../utils/voiceUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_SIZE = Math.min((SCREEN_WIDTH - 72) / 2, 170);

export default function ModeSelectionScreen({ navigation }) {
  const { preferences, theme, getText, updatePreferences } = usePreferences();
  const {
    isListening,
    voiceFeedback,
    speak,
    setupSpeechRecognition,
    startListening,
    stopListening,
  } = useVoiceInterface('ModeSelection');

  const [selectedMode, setSelectedMode] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [spokenText, setSpokenText] = useState('');
  const [hasSpoken, setHasSpoken] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const [typeInput, setTypeInput] = useState('');
  const [showTypeInput, setShowTypeInput] = useState(false);
  const hasRedirectedRef = useRef(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleTouch = useRef(new Animated.Value(1)).current;
  const scaleVoice = useRef(new Animated.Value(1)).current;
  const pulseDot = useRef(new Animated.Value(1)).current;

  // Pulse animation for the listening dot
  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseDot, { toValue: 1.3, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseDot, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseDot.setValue(1);
    }
  }, [isListening]);

  // Fade in on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // Process voice command
  const processVoiceCommand = useCallback(
    (transcript) => {
      if (isProcessing || hasRedirectedRef.current) return null;
      const lower = transcript.toLowerCase().trim();

      if (
        lower.includes('voice') ||
        lower.includes('குரல்') ||
        lower.includes('speak') ||
        lower.includes('vocal')
      ) {
        return 'voice';
      }
      if (
        lower.includes('normal') ||
        lower.includes('touch') ||
        lower.includes('click') ||
        lower.includes('சாதாரண') ||
        lower.includes('தொடு') ||
        lower.includes('standard')
      ) {
        return 'normal';
      }
      return null;
    },
    [isProcessing]
  );

  // Initial setup – welcome & start listening
  useEffect(() => {
    const init = async () => {
      console.log('[MODE] ModeSelectionScreen init started');
      // Check if user should be on this page
      const userData = JSON.parse((await AsyncStorage.getItem('ac_user')) || '{}');
      if (!userData || !userData.user_id) {
        navigation.replace('Login');
        return;
      }

      // Always show mode selection — let user choose each time

      // Setup speech recognition with command handler
      await setupSpeechRecognition((command) => {
        console.log('[MODE] Voice command received:', command);
        if (hasRedirectedRef.current) return;
        setSpokenText(command);
        const detected = processVoiceCommand(command);
        if (detected) {
          console.log('[MODE] Mode detected:', detected);
          handleModeSelect(detected, command);
        }
      });

      // Welcome message first, then start listening after speech finishes
      if (!hasSpoken) {
        console.log('[MODE] Speaking welcome message');
        await speak(
          'Welcome to Accessible Chennai. Please say Voice Mode or Normal Mode to continue.'
        );
        setHasSpoken(true);
      }

      // Now start listening (mic will stay on continuously)
      console.log('[MODE] Starting voice listening');
      startListening();
      // Voice engine starts asynchronously — we don't check return value
      // since the native start event fires later. Show type input as
      // an always-available fallback, not as an error indicator.
      setTimeout(() => {
        if (!hasRedirectedRef.current) {
          setShowTypeInput(true);
        }
      }, 3000);
    };

    const timer = setTimeout(init, 500);
    return () => {
      clearTimeout(timer);
      stopListening();
    };
  }, []);

  // Handle mode selection – immediate redirect (matches web exactly)
  const handleModeSelect = async (mode, spokenTranscript = '') => {
    if (hasRedirectedRef.current && selectedMode) return;
    hasRedirectedRef.current = true;
    setSelectedMode(mode);
    setIsProcessing(true);

    // Stop listening immediately
    stopListening();

    if (spokenTranscript) setSpokenText(spokenTranscript);

    // Animate card
    const anim = mode === 'voice' ? scaleVoice : scaleTouch;
    Animated.sequence([
      Animated.timing(anim, { toValue: 1.05, duration: 150, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Quick feedback
    const feedbackMsg =
      mode === 'voice'
        ? getText('voiceModeSelected')
        : getText('normalModeSelected');
    setFeedbackMessage(feedbackMsg);

    // Speak confirmation
    speak(mode === 'voice' ? 'Voice Mode activated' : 'Normal Mode activated');

    setIsSaving(true);

    try {
      // Update preferences & persist locally (also syncs to server via PreferencesContext)
      await updatePreferences({ mode });
      await AsyncStorage.setItem('mode_selected', 'true');

      // Navigate immediately after local save (300ms for card animation to show)
      setTimeout(() => {
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      }, 300);
    } catch (error) {
      console.error('Failed to save mode preference:', error);
      setFeedbackMessage(getText('errorSavingPreferences'));
      setIsSaving(false);
      setIsProcessing(false);
      hasRedirectedRef.current = false;
    }
  };

  // Manual voice activation button
  const handleVoiceActivation = () => {
    if (isListening) {
      stopListening();
      setFeedbackMessage('Voice recognition paused');
    } else {
      setFeedbackMessage('Starting voice recognition...');
      speak('Please say Voice Mode or Normal Mode').then(() => {
        startListening();
      });
    }
  };

  // Type-to-command handler (fallback for emulators / no mic)
  const handleTypeSubmit = () => {
    if (!typeInput.trim()) return;
    Keyboard.dismiss();
    const text = typeInput.trim();
    setTypeInput('');
    setSpokenText(text);
    const detected = processVoiceCommand(text);
    if (detected) {
      handleModeSelect(detected, text);
    } else {
      setFeedbackMessage(`"${text}" not recognized. Type "voice" or "normal".`);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bgPrimary,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    innerCard: {
      width: '90%',
      maxWidth: 500,
      backgroundColor: theme.bgSecondary,
      borderRadius: 16,
      padding: 32,
      alignItems: 'center',
      ...theme.shadow,
    },
    logo: {
      width: 120,
      height: 120,
      borderRadius: 60,
      marginBottom: 16,
      borderWidth: 3,
      borderColor: theme.accentColor,
    },
    logoFallback: {
      width: 120,
      height: 120,
      borderRadius: 60,
      marginBottom: 16,
      borderWidth: 3,
      borderColor: theme.accentColor,
      backgroundColor: theme.accentColor,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoText: {
      fontSize: 16,
      color: '#fff',
      fontWeight: 'bold',
      textAlign: 'center',
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.textPrimary,
      textAlign: 'center',
      marginBottom: 8,
    },
    // Voice status indicator
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      backgroundColor: isListening
        ? 'rgba(76,175,80,0.1)'
        : 'rgba(0,0,0,0.05)',
      borderWidth: isListening ? 1 : 0,
      borderColor: '#4CAF50',
      marginBottom: 20,
    },
    statusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: isListening ? '#4CAF50' : '#ccc',
      marginRight: 8,
    },
    statusLabel: {
      fontSize: 14,
      color: isListening ? '#4CAF50' : theme.textSecondary,
      fontWeight: '500',
    },
    // Mode cards
    cardsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 20,
      width: '100%',
      marginBottom: 16,
    },
    card: {
      width: CARD_SIZE,
      padding: 20,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
    },
    cardLabel: {
      marginTop: 12,
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    // Voice activation button
    voiceBtn: {
      marginTop: 16,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 50,
      borderWidth: 2,
      borderColor: theme.accentColor,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    voiceBtnText: {
      fontSize: 15,
      fontWeight: '500',
    },
    // Spoken text box
    spokenBox: {
      marginTop: 16,
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderRadius: 12,
      width: '100%',
      minHeight: 60,
      alignItems: 'center',
      justifyContent: 'center',
    },
    spokenTextActive: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.accentColor,
    },
    spokenTextIdle: {
      fontSize: 15,
      fontStyle: 'italic',
      color: theme.textSecondary,
    },
    // Feedback
    feedbackBox: {
      marginTop: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      width: '100%',
      alignItems: 'center',
    },
    feedbackText: {
      fontSize: 14,
      textAlign: 'center',
    },
    // Saving spinner
    savingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      padding: 10,
      marginTop: 8,
    },
    savingText: {
      color: theme.textPrimary,
      fontWeight: '500',
    },
    // Type-to-command fallback
    typeInputRow: {
      marginTop: 12,
      paddingHorizontal: 4,
    },
    typeLabel: {
      fontSize: 13,
      marginBottom: 6,
      textAlign: 'center',
    },
    typeInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    typeInput: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 15,
    },
    typeSendBtn: {
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    typeSendText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 15,
    },
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.innerCard}>
        {/* Logo */}
        <View style={styles.logoFallback}>
          <Text style={styles.logoText}>Accessible{'\n'}Chennai</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{getText('selectMode')}</Text>

        {/* Voice Recognition Status Indicator */}
        <View style={styles.statusRow}>
          <Animated.View
            style={[styles.statusDot, { transform: [{ scale: pulseDot }] }]}
          />
          <Text style={styles.statusLabel}>
            {isListening ? '🎤 Listening — say "Voice" or "Normal"' : 'Tap mic button to start'}
          </Text>
        </View>

        {/* Mode Cards */}
        <View style={styles.cardsRow}>
          {/* Touch/Click Mode */}
          <Animated.View style={{ transform: [{ scale: scaleTouch }] }}>
            <TouchableOpacity
              style={[
                styles.card,
                {
                  backgroundColor:
                    selectedMode === 'normal'
                      ? theme.accentColor
                      : theme.bgSecondary,
                  borderColor:
                    selectedMode === 'normal'
                      ? theme.accentColor
                      : theme.borderColor,
                },
              ]}
              onPress={() => handleModeSelect('normal')}
              disabled={isProcessing}
              accessibilityRole="button"
              accessibilityLabel="Touch Click mode"
            >
              <Text style={{ fontSize: 48 }}>👆</Text>
              <Text
                style={[
                  styles.cardLabel,
                  {
                    color:
                      selectedMode === 'normal' ? '#fff' : theme.textPrimary,
                  },
                ]}
              >
                Touch/Click
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Voice Mode */}
          <Animated.View style={{ transform: [{ scale: scaleVoice }] }}>
            <TouchableOpacity
              style={[
                styles.card,
                {
                  backgroundColor:
                    selectedMode === 'voice'
                      ? theme.accentColor
                      : theme.bgSecondary,
                  borderColor:
                    selectedMode === 'voice'
                      ? theme.accentColor
                      : theme.borderColor,
                },
              ]}
              onPress={() => handleModeSelect('voice')}
              disabled={isProcessing}
              accessibilityRole="button"
              accessibilityLabel="Voice mode"
            >
              <Text style={{ fontSize: 48 }}>🎤</Text>
              <Text
                style={[
                  styles.cardLabel,
                  {
                    color:
                      selectedMode === 'voice' ? '#fff' : theme.textPrimary,
                  },
                ]}
              >
                Voice Mode
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Voice Activation Button */}
        <TouchableOpacity
          style={[
            styles.voiceBtn,
            {
              backgroundColor: isListening ? theme.accentColor : 'transparent',
              opacity: isProcessing ? 0.6 : 1,
            },
          ]}
          onPress={handleVoiceActivation}
          disabled={isProcessing}
        >
          <Text style={{ fontSize: 20 }}>🎙️</Text>
          <Text
            style={[
              styles.voiceBtnText,
              { color: isListening ? '#fff' : theme.accentColor },
            ]}
          >
            {getText('activateVoice')}
          </Text>
        </TouchableOpacity>

        {/* Real-time Spoken Text Display */}
        <View
          style={[
            styles.spokenBox,
            {
              backgroundColor: (spokenText || voiceFeedback)
                ? `${theme.accentColor}15`
                : 'rgba(0,0,0,0.03)',
              borderWidth: (spokenText || voiceFeedback) ? 2 : 0,
              borderColor: theme.accentColor,
            },
          ]}
        >
          <Text style={(spokenText || voiceFeedback) ? styles.spokenTextActive : styles.spokenTextIdle}>
            {spokenText || voiceFeedback || (isListening ? getText('listening') : 'Tap mic to start')}
          </Text>
        </View>

        {/* Feedback Message */}
        {feedbackMessage ? (
          <View
            style={[
              styles.feedbackBox,
              {
                backgroundColor: isProcessing
                  ? 'rgba(76,175,80,0.1)'
                  : 'rgba(0,0,0,0.05)',
              },
            ]}
          >
            <Text
              style={[
                styles.feedbackText,
                { color: isProcessing ? '#4CAF50' : theme.textSecondary },
              ]}
            >
              {feedbackMessage}
            </Text>
          </View>
        ) : null}

        {/* Type-to-command fallback (for emulators / no mic) */}
        {(showTypeInput || voiceError) && (
          <View style={styles.typeInputRow}>
            <Text style={[styles.typeLabel, { color: theme.textSecondary }]}>
              {voiceError
                ? '⚠️ Voice unavailable — type your choice:'
                : 'Or type your command:'}
            </Text>
            <View style={styles.typeInputWrap}>
              <TextInput
                style={[
                  styles.typeInput,
                  {
                    color: theme.textPrimary,
                    borderColor: theme.borderColor,
                    backgroundColor: theme.bgSecondary,
                  },
                ]}
                placeholder='Type "voice" or "normal"'
                placeholderTextColor={theme.textSecondary}
                value={typeInput}
                onChangeText={setTypeInput}
                onSubmitEditing={handleTypeSubmit}
                returnKeyType="go"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.typeSendBtn, { backgroundColor: theme.accentColor }]}
                onPress={handleTypeSubmit}
              >
                <Text style={styles.typeSendText}>Go</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Loading Indicator during save */}
        {isSaving && (
          <View style={styles.savingRow}>
            <ActivityIndicator size="small" color={theme.accentColor} />
            <Text style={styles.savingText}>Redirecting...</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}
