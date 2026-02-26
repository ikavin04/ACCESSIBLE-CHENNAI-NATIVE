import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { usePreferences } from '../context/PreferencesContext';

// ==================== AI Response Generator ====================
const generateAIResponse = (userMessage, isVoiceMode) => {
  const message = userMessage.toLowerCase().trim();

  // Greeting patterns
  if (message.match(/^(hi|hello|hey|good morning|good afternoon|good evening|namaste)/)) {
    return {
      text: isVoiceMode
        ? 'Hello! I am your Accessible Chennai assistant. I can help you with accessible routes, bus and metro information, and navigation support. How can I help you today?'
        : 'Hello! 👋 I\'m your Accessible Chennai assistant. I can help you with:\n• Accessible route planning\n• Bus & Metro information\n• Navigation support\n• Community help\n\nHow can I assist you?',
      suggestions: ['Find accessible route', 'Bus information', 'Metro stations', 'Need help'],
    };
  }

  // Route/Navigation queries
  if (message.match(/route|direction|navigate|go to|how to reach|way to|path/)) {
    return {
      text: isVoiceMode
        ? 'I can help you plan an accessible route. Would you like a wheelchair-friendly route, or a general accessible route? Please tell me your starting point and destination.'
        : '🗺️ I can help you plan an accessible route!\n\nOptions:\n• Wheelchair-friendly routes\n• Step-free access routes\n• Voice-guided navigation\n\nPlease tell me your starting point and destination, or tap the Navigate button below.',
      suggestions: ['Wheelchair route', 'Voice navigation', 'Open Navigate page'],
      action: { type: 'navigate', screen: 'Navigate' },
    };
  }

  // Bus queries
  if (message.match(/bus|mtc|stop|bus stop|bus number|which bus/)) {
    return {
      text: isVoiceMode
        ? 'I can help you with bus information. Chennai has many accessible MTC buses with ramps and priority seating. Would you like to find accessible buses near you, or get information about a specific bus route?'
        : '🚌 MTC Bus Information\n\nChennai\'s accessible buses include:\n• Low-floor buses with ramps\n• Priority seating for disabled passengers\n• Audio announcements\n\nWould you like to:\n• Find accessible buses near you\n• Check a specific route\n• Find nearest bus stop',
      suggestions: ['Accessible buses near me', 'Bus route info', 'Nearest bus stop'],
    };
  }

  // Metro queries
  if (message.match(/metro|train|station|cmrl|chennai metro/)) {
    return {
      text: isVoiceMode
        ? 'Chennai Metro is fully accessible. All stations have lifts, ramps, tactile paths, and wheelchair spaces in trains. Which metro station would you like information about?'
        : '🚇 Chennai Metro Accessibility\n\nAll CMRL stations feature:\n• ♿ Lifts & Ramps\n• Tactile paths for visually impaired\n• Wheelchair spaces in trains\n• Audio-visual announcements\n• Accessible toilets\n\nWhich station do you need info about?',
      suggestions: ['Nearest metro station', 'Metro route planner', 'Station facilities'],
    };
  }

  // Wheelchair/Accessibility specific
  if (message.match(/wheelchair|ramp|lift|elevator|accessible|disability|disabled/)) {
    return {
      text: isVoiceMode
        ? 'I understand you need wheelchair-accessible options. Chennai has many accessible facilities including metro stations with lifts, low-floor buses, and accessible public spaces. What specific accessibility information do you need?'
        : '♿ Accessibility Support\n\nI can help you find:\n• Wheelchair-friendly routes\n• Locations with ramps & lifts\n• Accessible public transport\n• Accessible restrooms\n• Step-free paths\n\nWhat do you need help with?',
      suggestions: ['Wheelchair routes', 'Accessible stations', 'Ramp locations'],
    };
  }

  // Help/Emergency
  if (message.match(/help|emergency|support|assist|volunteer|staff/)) {
    return {
      text: isVoiceMode
        ? 'I\'m here to help you. If you need immediate assistance, you can connect with community volunteers or transit staff through our app. Would you like me to guide you to the help section?'
        : '🆘 Help & Support\n\nOptions available:\n• Connect with volunteers\n• Contact transit staff\n• Community support\n• Emergency guidance\n\nHow can I assist you?',
      suggestions: ['Connect volunteer', 'Transit staff', 'Community help'],
      action: { type: 'navigate', screen: 'Community' },
    };
  }

  // Community queries
  if (message.match(/community|connect|share|people|friends|volunteer/)) {
    return {
      text: isVoiceMode
        ? 'Our community feature connects you with other users, volunteers, and support staff. You can share experiences, get help, or offer assistance to others. Would you like to open the community page?'
        : '👥 Community Support\n\nOur community features:\n• Connect with volunteers\n• Share accessibility tips\n• Get peer support\n• Help other users\n\nWant to join the community?',
      suggestions: ['Open Community', 'Find volunteers', 'Share experience'],
      action: { type: 'navigate', screen: 'Community' },
    };
  }

  // Settings/Preferences
  if (message.match(/setting|preference|theme|mode|voice|language|change/)) {
    return {
      text: isVoiceMode
        ? 'You can customize your app experience in Settings. Options include voice mode, theme selection, language, and notification preferences. Would you like to go to Settings?'
        : '⚙️ App Settings\n\nYou can customize:\n• Voice/Normal mode\n• Light/Dark theme\n• Language preference\n• Notifications\n\nGo to Settings?',
      suggestions: ['Open Settings', 'Change theme', 'Voice mode'],
      action: { type: 'navigate', screen: 'Settings' },
    };
  }

  // App info/features
  if (message.match(/what can you do|features|about|tell me|app|how does/)) {
    return {
      text: isVoiceMode
        ? 'I am your Accessible Chennai assistant. I can help you plan accessible routes, find wheelchair-friendly transport, get real-time transit information, connect with community support, and navigate Chennai independently. Just tell me what you need!'
        : '🌟 What I Can Do\n\n• 🗺️ Plan accessible routes\n• 🚌 Find accessible buses\n• 🚇 Metro station info\n• ♿ Wheelchair-friendly paths\n• 👥 Community support\n• 🎙️ Voice assistance\n\nHow can I help you today?',
      suggestions: ['Plan a route', 'Find transport', 'Get help'],
    };
  }

  // Thank you
  if (message.match(/thank|thanks|ok|okay|great|perfect|good/)) {
    return {
      text: isVoiceMode
        ? 'You\'re welcome! I\'m always here to help. Is there anything else you need assistance with?'
        : 'You\'re welcome! 😊 Is there anything else I can help you with?',
      suggestions: ['Plan route', 'Find bus', 'More help', 'No, thanks'],
    };
  }

  // Goodbye
  if (message.match(/bye|goodbye|exit|close|done|finish/)) {
    return {
      text: isVoiceMode
        ? 'Goodbye! Have a safe journey. Remember, I\'m always here if you need help navigating Chennai.'
        : 'Goodbye! 👋 Have a safe journey. I\'m always here when you need help!',
      suggestions: [],
      shouldClose: true,
    };
  }

  // Default fallback
  return {
    text: isVoiceMode
      ? 'I\'m not sure I understood that. I can help you with accessible routes, bus and metro information, finding wheelchair-friendly places, or connecting with community support. Could you please tell me what you need?'
      : 'I\'m not sure I understood. 🤔\n\nI can help with:\n• Accessible route planning\n• Bus & Metro info\n• Wheelchair-friendly locations\n• Community support\n\nCould you please rephrase your question?',
    suggestions: ['Accessible routes', 'Bus info', 'Metro info', 'Help'],
  };
};

// ==================== AI ASSISTANT SCREEN ====================
export default function AIAssistantScreen({ navigation }) {
  const { preferences } = usePreferences();
  const isDark = preferences.theme === 'dark';
  const isVoiceMode = preferences.mode === 'voice';

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollViewRef = useRef(null);
  const typingDots = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  // Typing dots animation
  useEffect(() => {
    if (!isTyping) return;
    const animations = typingDots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, { toValue: -4, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      )
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, [isTyping]);

  // Welcome message on mount
  useEffect(() => {
    const welcomeMessage = isVoiceMode
      ? {
          type: 'bot',
          text: 'Hello! I am your Accessible Chennai assistant. I\'m here to help you navigate Chennai safely and independently. You can speak to me or type your question. How can I help you today?',
          suggestions: ['Find accessible route', 'Bus information', 'Metro stations', 'Need help'],
        }
      : {
          type: 'bot',
          text: 'Hello! 👋 I\'m your Accessible Chennai AI Assistant.\n\nI can help you with:\n• ♿ Accessible route planning\n• 🚌 Bus & Metro information\n• 🗺️ Navigation guidance\n• 👥 Community support\n\nHow can I assist you today?',
          suggestions: ['Plan accessible route', 'Find bus', 'Metro info', 'Get help'],
        };

    setMessages([welcomeMessage]);

    if (isVoiceMode) {
      speakText(welcomeMessage.text);
    }
  }, []);

  const speakText = useCallback((text) => {
    const cleanText = text.replace(/[•🗺️🚌🚇♿👥🎙️⚙️🆘👋😊🤔🌟♿️❄️🔌]/g, '').replace(/\n/g, '. ');
    Speech.stop();
    setIsSpeaking(true);
    Speech.speak(cleanText, {
      language: 'en-IN',
      rate: 0.85,
      pitch: 1.0,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, []);

  const stopSpeaking = useCallback(() => {
    Speech.stop();
    setIsSpeaking(false);
  }, []);

  const handleSendMessage = useCallback((voiceText = null) => {
    const messageText = voiceText || inputValue.trim();
    if (!messageText) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMessage = { type: 'user', text: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI thinking delay
    setTimeout(() => {
      const response = generateAIResponse(messageText, isVoiceMode);
      const botMessage = {
        type: 'bot',
        text: response.text,
        suggestions: response.suggestions,
        action: response.action,
      };

      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);

      if (isVoiceMode) {
        speakText(response.text);
      }

      if (response.shouldClose) {
        setTimeout(() => navigation.goBack(), 2000);
      }
    }, 800);
  }, [inputValue, isVoiceMode, speakText, navigation]);

  const handleSuggestionClick = useCallback((suggestion) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (suggestion === 'Open Navigate page' || suggestion === 'Plan accessible route' || suggestion === 'Plan a route') {
      navigation.navigate('Navigate');
    } else if (suggestion === 'Open Community' || suggestion === 'Connect volunteer') {
      navigation.navigate('Community');
    } else if (suggestion === 'Open Settings') {
      navigation.navigate('Settings');
    } else if (suggestion === 'No, thanks') {
      navigation.goBack();
    } else {
      handleSendMessage(suggestion);
    }
  }, [navigation, handleSendMessage]);

  // ─── RENDER ────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#1976d2' }]}>
        <View style={styles.headerLeft}>
          <View style={styles.botAvatar}>
            <Text style={styles.botAvatarText}>🤖</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Accessible Chennai AI</Text>
            <Text style={styles.headerSubtitle}>
              {isVoiceMode ? '🎙️ Voice Mode Active' : 'Your accessibility companion'}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {isSpeaking && (
            <TouchableOpacity style={styles.headerBtn} onPress={stopSpeaking}>
              <Text style={{ fontSize: 18 }}>🔇</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 18, color: '#fff' }}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg, index) => (
          <View key={index} style={{ marginBottom: 12 }}>
            {/* Message Bubble */}
            <View
              style={[
                msg.type === 'user' ? styles.userBubble : styles.botBubble,
                msg.type === 'bot' && { backgroundColor: isDark ? '#334155' : '#ffffff' },
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  msg.type === 'user'
                    ? styles.userMessageText
                    : { color: isDark ? '#f1f5f9' : '#1e293b' },
                ]}
              >
                {msg.text}
              </Text>
            </View>

            {/* Suggestion Chips */}
            {msg.type === 'bot' && msg.suggestions && msg.suggestions.length > 0 && (
              <View style={styles.suggestionsRow}>
                {msg.suggestions.map((suggestion, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.suggestionChip, {
                      backgroundColor: isDark ? '#1e293b' : '#e0f2fe',
                      borderColor: isDark ? '#3b82f6' : '#7dd3fc',
                    }]}
                    onPress={() => handleSuggestionClick(suggestion)}
                  >
                    <Text style={[styles.suggestionText, { color: isDark ? '#60a5fa' : '#0369a1' }]}>
                      {suggestion}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <View style={[styles.botBubble, { backgroundColor: isDark ? '#334155' : '#ffffff', flexDirection: 'row', paddingVertical: 14 }]}>
            {typingDots.map((dot, i) => (
              <Animated.View
                key={i}
                style={[styles.typingDot, { backgroundColor: '#94a3b8', transform: [{ translateY: dot }], marginRight: i < 2 ? 4 : 0 }]}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Input Area */}
      <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderTopColor: isDark ? '#334155' : '#e2e8f0' }]}>
        <TextInput
          style={[styles.textInput, {
            backgroundColor: isDark ? '#0f172a' : '#f8fafc',
            color: isDark ? '#f1f5f9' : '#1e293b',
            borderColor: isDark ? '#475569' : '#cbd5e1',
          }]}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder="Type your message..."
          placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
          onSubmitEditing={() => handleSendMessage()}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputValue.trim() && { opacity: 0.5 }]}
          onPress={() => handleSendMessage()}
          disabled={!inputValue.trim()}
        >
          <Text style={{ fontSize: 18, color: '#fff' }}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: 48,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  botAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  botAvatarText: { fontSize: 20 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  headerRight: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  messagesContainer: { flex: 1 },
  messagesContent: { padding: 16 },

  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#1976d2',
    padding: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  botBubble: {
    alignSelf: 'flex-start',
    padding: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    maxWidth: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  messageText: { fontSize: 14, lineHeight: 22 },
  userMessageText: { color: '#ffffff' },

  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginLeft: 4,
    gap: 6,
  },
  suggestionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  suggestionText: { fontSize: 13, fontWeight: '500' },

  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    gap: 8,
  },
  textInput: {
    flex: 1,
    padding: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1976d2',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
