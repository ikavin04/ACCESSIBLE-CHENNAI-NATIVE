/**
 * voiceUtils.js — Voice interface hook + command processing
 *
 * Production-level voice system for Accessible Chennai Native
 *
 * Architecture:
 *   VoiceService (singleton)  →  manages native speech engine
 *   CommandParser             →  structured command recognition
 *   useVoiceInterface (hook)  →  per-screen voice control
 *
 * Features:
 *   ✅ Native Android SpeechRecognizer (via expo-speech-recognition)
 *   ✅ Auto-restart continuous listening (continuous:false + restart loop)
 *   ✅ Debounce mechanism (300ms between commands)
 *   ✅ Watchdog safety net (4s interval)
 *   ✅ Emergency override (instant, no delay)
 *   ✅ AppState-aware (pause on background, resume on foreground)
 *   ✅ Non-blocking UI (async voice processing, no main thread work)
 *   ✅ Noise-tolerant (keyword matching with confidence threshold)
 *   ✅ TTS with auto mic resume
 *   ✅ Zero console logging during recognition
 *
 * Usage in screens (unchanged API):
 *   const {
 *     isListening,
 *     voiceFeedback,
 *     speak,
 *     setupSpeechRecognition,
 *     startListening,
 *     stopListening,
 *     submitVoiceCommand,
 *   } = useVoiceInterface();
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSpeechRecognitionEvent } from 'expo-speech-recognition';

// Import service & parser
import VoiceService from '../voice/VoiceService';
import { parseCommand as parseCommandFromParser, isEmergency } from '../voice/CommandParser';

// ══════════════════════════════════════════
// CONSTANTS (re-exported for backward compat)
// ══════════════════════════════════════════
export const VOICE_MODE_INTRO =
  'Voice mode active. Say Navigate, Alerts, Community, or Settings.';
export const VOICE_EMERGENCY =
  'Emergency mode activated. Calling your emergency contact now.';

export const VOICE_SPEEDS = {
  slow: 0.85,
  normal: 1.0,
  fast: 1.25,
};

export const getVoiceSpeed = async () => {
  try {
    const prefs = JSON.parse((await AsyncStorage.getItem('ac_prefs')) || '{}');
    return VOICE_SPEEDS[prefs.voiceSpeed || 'normal'];
  } catch {
    return VOICE_SPEEDS.normal;
  }
};

// ══════════════════════════════════════════
// MAIN HOOK — useVoiceInterface
// ══════════════════════════════════════════
export const useVoiceInterface = () => {
  const [isListening, setIsListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState('');
  const onCommandRef = useRef(null);
  const mountedRef = useRef(true);
  const micActiveRef = useRef(false);
  const generationRef = useRef(-1); // tracks which generation this hook owns

  // ── Bridge native events to VoiceService ──
  // useSpeechRecognitionEvent fires for ALL mounted hooks.
  // generationRef ensures only ONE hook forwards events at a time.

  const isOwner = () =>
    mountedRef.current && generationRef.current === VoiceService.generation;

  useSpeechRecognitionEvent('start', () => {
    if (!isOwner()) return;
    VoiceService.handleNativeStart();
  });

  useSpeechRecognitionEvent('result', (event) => {
    if (!isOwner()) return;
    VoiceService.handleNativeResult(event);
  });

  useSpeechRecognitionEvent('end', () => {
    if (!isOwner()) return;
    VoiceService.handleNativeEnd();
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (!isOwner()) return;
    VoiceService.handleNativeError(event);
  });

  // ── Subscribe to VoiceService events ──
  useEffect(() => {
    mountedRef.current = true;

    // Initialize service
    VoiceService.init();

    // State changes (isListening, feedback)
    const unsubState = VoiceService.on('stateChange', (update) => {
      if (!mountedRef.current) return;
      if (update.isListening !== undefined) setIsListening(update.isListening);
      if (update.feedback !== undefined) setVoiceFeedback(update.feedback);
    });

    // Final speech results → route to screen's command handler
    const unsubResult = VoiceService.on('result', (data) => {
      if (!mountedRef.current || !micActiveRef.current) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (onCommandRef.current) {
        onCommandRef.current(data.transcript);
      }
    });

    // Partial results — update feedback text but DON'T fire command handler.
    // The last partial is promoted to a final 'result' in handleNativeEnd(),
    // so commands will fire once (not twice) through the 'result' handler above.
    const unsubPartial = VoiceService.on('partialResult', (data) => {
      if (!mountedRef.current || !micActiveRef.current) return;
      // Only update visual feedback, don't process as command
    });

    return () => {
      mountedRef.current = false;
      micActiveRef.current = false;
      generationRef.current = -1; // release ownership on unmount
      unsubState();
      unsubResult();
      unsubPartial();
      VoiceService.stopListening();
    };
  }, []);

  // ── Public API (same interface as before — screens need zero changes) ──

  const setupSpeechRecognition = useCallback(async (onCommand) => {
    onCommandRef.current = onCommand;
    await VoiceService.requestPermission();
  }, []);

  const startListening = useCallback(() => {
    micActiveRef.current = true;
    const result = VoiceService.startListening();
    // Claim this generation so only OUR bridge events are forwarded
    generationRef.current = VoiceService.generation;
    return result;
  }, []);

  const stopListening = useCallback(() => {
    micActiveRef.current = false;
    generationRef.current = -1; // release ownership
    VoiceService.stopListening();
  }, []);

  const speak = useCallback(async (text, priority = false, slowSpeed = false) => {
    if (!mountedRef.current) return;
    return VoiceService.speak(text, priority, slowSpeed);
  }, []);

  const submitVoiceCommand = useCallback((text) => {
    if (!text || !text.trim()) return;
    const cmd = text.toLowerCase().trim();
    setVoiceFeedback(`Processing: "${cmd}"`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onCommandRef.current) onCommandRef.current(cmd);
  }, []);

  return {
    isListening,
    voiceFeedback,
    speak,
    setupSpeechRecognition,
    startListening,
    stopListening,
    submitVoiceCommand,
  };
};

// ══════════════════════════════════════════
// COMMAND PROCESSING (backward-compatible)
// ══════════════════════════════════════════

/**
 * Process voice command and determine action.
 * Uses CommandParser with confidence-based matching.
 * Handles natural language variations for accessibility-first interaction.
 *
 * EMERGENCY COMMANDS are ALWAYS checked first — zero delay.
 */
export const processVoiceCommand = (command) => {
  const cmd = command.toLowerCase().trim();

  // Use the new CommandParser
  const parsed = parseCommandFromParser(cmd);
  if (!parsed) return { action: 'unknown', command: cmd };

  // Map parsed result to legacy format expected by screens
  switch (parsed.action) {
    case 'emergency':
      return { action: 'emergency' };

    case 'navigate':
      return { action: 'navigate', destination: parsed.destination || 'Navigate' };

    case 'findAccessibleRoutes':
      return { action: 'findAccessibleRoutes' };

    case 'selectRoute':
      return { action: 'selectRoute', routeIndex: parsed.routeIndex };

    case 'confirm':
      return { action: 'confirm', value: parsed.value };

    case 'repeat':
      return { action: 'repeat' };

    case 'stop':
      return { action: 'stop' };

    case 'back':
      return { action: 'back' };

    case 'next':
      return { action: 'next' };

    case 'selectMode':
      return { action: 'selectMode', mode: parsed.mode };

    case 'changeVoiceSpeed':
      return { action: 'changeVoiceSpeed' };

    case 'setSpeed':
      return { action: 'setSpeed', speed: parsed.speed };

    case 'changeLanguage':
      return { action: 'changeLanguage' };

    case 'emergencyContacts':
      return { action: 'emergencyContacts' };

    case 'postUpdate':
      return { action: 'postUpdate' };

    case 'nearbyUpdates':
      return { action: 'nearbyUpdates' };

    case 'askHelp':
      return { action: 'askHelp' };

    case 'selectTransport':
      return { action: 'selectTransport', transport: parsed.transport };

    case 'clearAlerts':
      return { action: 'clearAlerts' };

    default:
      return { action: 'unknown', command: cmd };
  }
};

// ══════════════════════════════════════════
// VOICE ASSISTANT STATE MANAGER
// ══════════════════════════════════════════

export class VoiceAssistantState {
  constructor() {
    this.currentFlow = null;
    this.currentStep = 0;
    this.data = {};
    this.lastMessage = '';
  }

  startFlow(flowName) {
    this.currentFlow = flowName;
    this.currentStep = 0;
    this.data = {};
  }

  nextStep() {
    this.currentStep++;
  }

  setData(key, value) {
    this.data[key] = value;
  }

  getData(key) {
    return this.data[key];
  }

  reset() {
    this.currentFlow = null;
    this.currentStep = 0;
    this.data = {};
  }

  setLastMessage(message) {
    this.lastMessage = message;
  }

  getLastMessage() {
    return this.lastMessage;
  }
}

// ══════════════════════════════════════════
// NAVIGATION FLOW MESSAGES
// ══════════════════════════════════════════

export const getNavigateFlowMessage = (step, data = {}) => {
  const messages = {
    START_LOCATION: 'Tell me your starting location.',
    CONFIRM_START: `Starting location ${data.startLocation}. Confirm?`,
    START_CONFIRMED: 'Locked.',
    DESTINATION: 'Tell me your destination.',
    CONFIRM_DESTINATION: `Destination ${data.destination}. Confirm?`,
    DESTINATION_CONFIRMED: 'Locked.',
    CHOOSE_MODE: 'Walk or Public Transport?',
    FIND_ROUTES_PROMPT: 'Say Find Routes to continue.',
    FINDING_ROUTES: 'Finding routes. Please wait.',
    NO_ROUTES: 'No routes found. Try different locations.',
    ROUTES_FOUND: (routes) => {
      let message = `${routes.length} routes found. `;
      routes.forEach((route, idx) => {
        message += `Route ${idx + 1}: ${route.type}, ${route.estimatedTime} minutes. `;
      });
      message += 'Say Route 1, 2, or 3.';
      return message;
    },
    ROUTE_SELECTED: (routeNum) => `Route ${routeNum} selected. Confirm?`,
    CONFIRM_BOOKING: 'Confirm this route? Yes or No.',
    BOOKING_CONFIRMED: 'Route confirmed. Navigation starting.',
    BOOKING_CANCELLED: 'Cancelled.',
  };
  return messages[step] || '';
};

// ══════════════════════════════════════════
// VOICE COMMANDS BY LANGUAGE
// ══════════════════════════════════════════

export const getVoiceCommands = (language = 'en') => {
  const commands = {
    en: {
      navigation: {
        home: 'home',
        'navigate|map|route': 'navigate',
        alerts: 'alerts',
        community: 'community',
        settings: 'settings',
        'logout|exit': 'logout',
      },
      actions: {
        'click|select|ok|yes': 'click',
        'back|return': 'back',
        'next|continue': 'next',
        'save|done': 'save',
        'cancel|no|stop': 'cancel',
        'refresh|update': 'refresh',
        'help|commands': 'help',
        'repeat|again': 'repeat',
      },
      forms: {
        'from|start': 'from',
        'to|destination|go': 'to',
        'search|find': 'search',
        'clear|reset': 'clear',
        'current location|here|my location': 'current',
      },
      simple: {
        home: 'home',
        map: 'navigate',
        alerts: 'alerts',
        community: 'community',
        settings: 'settings',
        back: 'back',
        help: 'help',
        search: 'search',
        clear: 'clear',
        save: 'save',
        cancel: 'cancel',
      },
    },
    ta: {
      navigation: {
        '\u0BB5\u0BC0\u0B9F\u0BC1': 'home',
        '\u0BB5\u0BB4\u0BBF|\u0BAE\u0BC7\u0BAA\u0BCD': 'navigate',
        '\u0B85\u0BB2\u0BB0\u0BCD\u0B9F\u0BCD': 'alerts',
        '\u0B9A\u0BAE\u0BC2\u0B95\u0BAE\u0BCD': 'community',
        '\u0B9A\u0BC6\u0B9F\u0BCD\u0B9F\u0BBF\u0B99\u0BCD': 'settings',
        '\u0BB5\u0BC6\u0BB3\u0BBF\u0BAF\u0BC7\u0BB1\u0BC1': 'logout',
      },
      actions: {
        '\u0B9A\u0BB0\u0BBF|\u0B93\u0B95\u0BC7': 'click',
        '\u0BAA\u0BBF\u0BA9\u0BCD': 'back',
        '\u0B85\u0B9F\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1': 'next',
        '\u0B9A\u0BC7\u0BB5\u0BCD': 'save',
        '\u0B95\u0BC7\u0BA9\u0BCD\u0B9A\u0BB2\u0BCD': 'cancel',
        '\u0B85\u0BAA\u0BCD\u0B9F\u0BC7\u0B9F\u0BCD': 'refresh',
        '\u0BB9\u0BC6\u0BB2\u0BCD\u0BAA\u0BCD': 'help',
        '\u0BB0\u0BBF\u0BAA\u0BC0\u0B9F\u0BCD': 'repeat',
      },
      forms: {
        '\u0B83\u0BAA\u0BCD\u0BB0\u0BAE\u0BCD|\u0BB8\u0BCD\u0B9F\u0BBE\u0BB0\u0BCD\u0B9F\u0BCD': 'from',
        '\u0B9F\u0BC2|\u0B95\u0BCB': 'to',
        '\u0B9A\u0BB0\u0BCD\u0B9A\u0BCD': 'search',
        '\u0B95\u0BCD\u0BB3\u0BBF\u0BAF\u0BB0\u0BCD': 'clear',
        '\u0B95\u0BB0\u0BA3\u0BCD\u0B9F\u0BCD \u0BB2\u0BCA\u0B95\u0BC7\u0BB7\u0BA9\u0BCD': 'current',
      },
      simple: {
        '\u0BB5\u0BC0\u0B9F\u0BC1': 'home',
        '\u0BAE\u0BC7\u0BAA\u0BCD': 'navigate',
        '\u0B85\u0BB2\u0BB0\u0BCD\u0B9F\u0BCD': 'alerts',
        '\u0B9A\u0BAE\u0BC2\u0B95\u0BAE\u0BCD': 'community',
        '\u0B9A\u0BC6\u0B9F\u0BCD\u0B9F\u0BBF\u0B99\u0BCD': 'settings',
        '\u0BAA\u0BBF\u0BA9\u0BCD': 'back',
        '\u0BB9\u0BC6\u0BB2\u0BCD\u0BAA\u0BCD': 'help',
        '\u0B9A\u0BB0\u0BCD\u0B9A\u0BCD': 'search',
        '\u0B95\u0BCD\u0BB3\u0BBF\u0BAF\u0BB0\u0BCD': 'clear',
        '\u0B9A\u0BC7\u0BB5\u0BCD': 'save',
      },
    },
  };
  return commands[language] || commands.en;
};
