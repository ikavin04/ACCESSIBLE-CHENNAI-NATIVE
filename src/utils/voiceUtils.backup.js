// Voice utilities for React Native — full speech recognition + TTS
// Uses expo-speech-recognition for STT
// Uses expo-speech for TTS
// Android: continuous=false (not supported on Android ≤12), simulates continuous
//          by auto-restarting after each result. No visible flicker.
import { useCallback, useRef, useState, useEffect } from 'react';
import { AppState } from 'react-native';
import * as Speech from 'expo-speech';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const VOICE_MODE_INTRO = 'Voice mode active. Say Navigate, Alerts, Community, or Settings.';
export const VOICE_EMERGENCY = 'Emergency mode activated. Calling your emergency contact now.';

export const VOICE_SPEEDS = {
  slow: 0.85,
  normal: 1.0,
  fast: 1.25,
};

export const getVoiceSpeed = async () => {
  try {
    const prefs = JSON.parse(await AsyncStorage.getItem('ac_prefs') || '{}');
    return VOICE_SPEEDS[prefs.voiceSpeed || 'normal'];
  } catch {
    return VOICE_SPEEDS.normal;
  }
};

export const useVoiceInterface = () => {
  const [isListening, setIsListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState('');
  const isSpeakingRef = useRef(false);
  const micActiveRef = useRef(false);
  const onCommandRef = useRef(null);
  const lastCommandTime = useRef(0);
  const watchdogRef = useRef(null);
  const permissionGrantedRef = useRef(false);
  const mountedRef = useRef(true);
  const restartTimerRef = useRef(null);
  const commandDebounceMs = 300;

  // ── Abort current session safely ──
  const abortSafely = useCallback(() => {
    try { ExpoSpeechRecognitionModule.abort(); } catch (_) {}
  }, []);

  // ── Start recognition (single-utterance, auto-restarts on end) ──
  const startEngine = useCallback(async () => {
    if (!mountedRef.current || isSpeakingRef.current || !micActiveRef.current) return;

    // Ensure permission
    if (!permissionGrantedRef.current) {
      try {
        const res = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!res.granted) {
          setVoiceFeedback('Microphone permission denied');
          return;
        }
        permissionGrantedRef.current = true;
      } catch (_) { return; }
    }

    try {
      ExpoSpeechRecognitionModule.start({
        lang: 'en-IN',
        interimResults: true,
        maxAlternatives: 3,
        continuous: false,                  // Works on ALL Android versions
        requiresOnDeviceRecognition: false,
        addsPunctuation: false,
        contextualStrings: [
          'navigate', 'alerts', 'community', 'settings', 'home',
          'emergency', 'help', 'route', 'metro', 'bus',
          'Chennai', 'voice mode', 'touch mode', 'normal mode',
          'yes', 'no', 'confirm', 'cancel', 'repeat',
          'route one', 'route two', 'route three',
        ],
      });
    } catch (_) {
      // Watchdog will retry
    }
  }, []);

  // ── Schedule restart without flicker ──
  const scheduleRestart = useCallback((ms = 100) => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = setTimeout(() => {
      restartTimerRef.current = null;
      if (micActiveRef.current && !isSpeakingRef.current && mountedRef.current) {
        startEngine();
      }
    }, ms);
  }, [startEngine]);

  // ── Watchdog: safety net, restarts if engine died ──
  const startWatchdog = useCallback(() => {
    if (watchdogRef.current) clearInterval(watchdogRef.current);
    watchdogRef.current = setInterval(() => {
      if (micActiveRef.current && !isSpeakingRef.current && mountedRef.current) {
        startEngine();
      }
    }, 4000);
  }, [startEngine]);

  const stopWatchdog = useCallback(() => {
    if (watchdogRef.current) { clearInterval(watchdogRef.current); watchdogRef.current = null; }
  }, []);

  // ══════════════════════════════════════════
  // EVENT LISTENERS
  // ══════════════════════════════════════════

  useSpeechRecognitionEvent('start', () => {
    if (!mountedRef.current) return;
    setIsListening(true);
    setVoiceFeedback('Listening...');
  });

  useSpeechRecognitionEvent('result', (event) => {
    if (!mountedRef.current || !event.results || event.results.length === 0) return;

    const lastResult = event.results[event.results.length - 1];
    const transcript = (lastResult.transcript || '').trim();
    if (!transcript) return;

    if (lastResult.isFinal) {
      const now = Date.now();
      if (now - lastCommandTime.current < commandDebounceMs) return;
      lastCommandTime.current = now;

      const cmd = transcript.toLowerCase();
      setVoiceFeedback(`"${transcript}"`);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (onCommandRef.current) onCommandRef.current(cmd);
    } else {
      // Live interim feedback
      setVoiceFeedback(`"${transcript}..."`);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    if (!mountedRef.current) return;
    // Don't set isListening=false if we're about to restart — prevents flicker
    if (isSpeakingRef.current || !micActiveRef.current) {
      setIsListening(false);
      return;
    }
    // Auto-restart: keeps mic alive (simulates continuous mode)
    scheduleRestart(100);
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (!mountedRef.current) return;
    if (isSpeakingRef.current) return; // Errors during TTS are expected

    const err = event.error || '';
    if (err === 'not-allowed' || err === 'service-not-allowed') {
      setVoiceFeedback('Microphone denied. Enable in Settings.');
      setIsListening(false);
      permissionGrantedRef.current = false;
      return;
    }
    if (err === 'audio-capture') {
      setVoiceFeedback('Microphone not available');
      setIsListening(false);
      return;
    }
    // no-speech / network / other — recoverable, restart silently
    if (micActiveRef.current) scheduleRestart(300);
  });

  // ── App foreground/background ──
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && micActiveRef.current && !isSpeakingRef.current) {
        scheduleRestart(400);
      } else if (state !== 'active') {
        abortSafely();
        setIsListening(false);
      }
    });
    return () => sub.remove();
  }, [scheduleRestart, abortSafely]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      micActiveRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      stopWatchdog();
      abortSafely();
      Speech.stop();
    };
  }, [stopWatchdog, abortSafely]);

  // ══════════════════════════════════════════
  // TTS — speak text then auto-resume mic
  // ══════════════════════════════════════════
  const speak = useCallback(async (text, priority = false, slowSpeed = false) => {
    if (!mountedRef.current) return;
    isSpeakingRef.current = true;

    // Kill pending restart & stop mic
    if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null; }
    abortSafely();
    setIsListening(false);
    Speech.stop();

    // Small delay so audio system can switch from mic to speaker
    await new Promise(r => setTimeout(r, 150));

    const rate = slowSpeed ? 0.85 : (await getVoiceSpeed());

    return new Promise((resolve) => {
      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        isSpeakingRef.current = false;
        if (micActiveRef.current && mountedRef.current) {
          scheduleRestart(300);
        }
        resolve();
      };

      Speech.speak(text, {
        language: 'en-IN',
        rate,
        pitch: 1.0,
        onDone: done,
        onError: done,
        onStopped: done,
      });

      // Safety: never leave stuck (max 25s)
      setTimeout(() => { if (isSpeakingRef.current) { Speech.stop(); done(); } }, 25000);
    });
  }, [scheduleRestart, abortSafely]);

  // ══════════════════════════════════════════
  // PUBLIC API
  // ══════════════════════════════════════════
  const setupSpeechRecognition = useCallback(async (onCommand) => {
    onCommandRef.current = onCommand;
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      permissionGrantedRef.current = result.granted;
      if (!result.granted) {
        setVoiceFeedback('Microphone permission denied. Please enable in Settings.');
      }
    } catch (_) {
      setVoiceFeedback('Could not request mic permission.');
    }
  }, []);

  const submitVoiceCommand = useCallback((text) => {
    if (!text || !text.trim()) return;
    const cmd = text.toLowerCase().trim();
    setVoiceFeedback(`Processing: "${cmd}"`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onCommandRef.current) onCommandRef.current(cmd);
  }, []);

  const startListening = useCallback(() => {
    micActiveRef.current = true;
    startWatchdog();
    startEngine();
  }, [startEngine, startWatchdog]);

  const stopListening = useCallback(() => {
    micActiveRef.current = false;
    if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null; }
    stopWatchdog();
    abortSafely();
    setIsListening(false);
    setVoiceFeedback('');
  }, [stopWatchdog, abortSafely]);

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

// ==================== VOICE COMMAND PROCESSING ====================

/**
 * Process voice command and determine action
 * Handles natural language variations for accessibility-first interaction
 */
export const processVoiceCommand = (command) => {
  const cmd = command.toLowerCase().trim();

  // EMERGENCY COMMANDS — Highest priority
  if (cmd.includes('emergency') || cmd.includes('help me') || cmd.includes('urgent')) {
    return { action: 'emergency' };
  }

  // Navigation section commands
  if (cmd.includes('navigate') || cmd.includes('navigation')) {
    return { action: 'navigate', destination: 'Navigate' };
  }
  if (cmd.includes('home')) {
    return { action: 'navigate', destination: 'Home' };
  }
  if (cmd.includes('alert')) {
    return { action: 'navigate', destination: 'Alerts' };
  }
  if (cmd.includes('community')) {
    return { action: 'navigate', destination: 'Community' };
  }
  if (cmd.includes('setting')) {
    return { action: 'navigate', destination: 'Settings' };
  }

  // Navigation flow commands
  if (cmd.includes('find accessible route') || cmd.includes('accessible route')) {
    return { action: 'findAccessibleRoutes' };
  }

  if (cmd.includes('route 1') || cmd.includes('route one') ||
      cmd.includes('first route') || cmd.includes('option 1')) {
    return { action: 'selectRoute', routeIndex: 0 };
  }
  if (cmd.includes('route 2') || cmd.includes('route two') ||
      cmd.includes('second route') || cmd.includes('option 2')) {
    return { action: 'selectRoute', routeIndex: 1 };
  }
  if (cmd.includes('route 3') || cmd.includes('route three') ||
      cmd.includes('third route') || cmd.includes('option 3')) {
    return { action: 'selectRoute', routeIndex: 2 };
  }

  // Confirmation commands
  if (cmd.includes('confirm') || cmd.includes('yes') || cmd.includes('correct') ||
      cmd.includes('okay') || cmd.includes('ok') || cmd.includes('sure')) {
    return { action: 'confirm', value: true };
  }
  if (cmd.includes('no') || cmd.includes('cancel') || cmd.includes('wrong') ||
      cmd.includes('incorrect')) {
    return { action: 'confirm', value: false };
  }

  // Repeat/Help commands
  if (cmd.includes('repeat') || cmd.includes('say again') || cmd.includes('again')) {
    return { action: 'repeat' };
  }

  // Settings commands
  if (cmd.includes('change voice speed') || cmd.includes('voice speed')) {
    return { action: 'changeVoiceSpeed' };
  }
  if (cmd.includes('slow')) {
    return { action: 'setSpeed', speed: 'slow' };
  }
  if (cmd.includes('normal')) {
    return { action: 'setSpeed', speed: 'normal' };
  }
  if (cmd.includes('fast')) {
    return { action: 'setSpeed', speed: 'fast' };
  }
  if (cmd.includes('change language')) {
    return { action: 'changeLanguage' };
  }
  if (cmd.includes('emergency contact')) {
    return { action: 'emergencyContacts' };
  }

  // Community commands
  if (cmd.includes('post update')) {
    return { action: 'postUpdate' };
  }
  if (cmd.includes('hear nearby update') || cmd.includes('nearby update')) {
    return { action: 'nearbyUpdates' };
  }
  if (cmd.includes('ask for help')) {
    return { action: 'askHelp' };
  }
  if (cmd.includes('next')) {
    return { action: 'next' };
  }

  // Alerts commands
  if (cmd.includes('clear alert')) {
    return { action: 'clearAlerts' };
  }

  // Unknown command
  return { action: 'unknown', command: cmd };
};

// ==================== VOICE ASSISTANT STATE MANAGER ====================

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

  nextStep() { this.currentStep++; }
  setData(key, value) { this.data[key] = value; }
  getData(key) { return this.data[key]; }
  reset() { this.currentFlow = null; this.currentStep = 0; this.data = {}; }
  setLastMessage(message) { this.lastMessage = message; }
  getLastMessage() { return this.lastMessage; }
}

// ==================== NAVIGATE FLOW MESSAGES ====================

export const getNavigateFlowMessage = (step, data = {}) => {
  const messages = {
    START_LOCATION: "Tell me your starting location.",
    CONFIRM_START: `Starting location ${data.startLocation}. Confirm?`,
    START_CONFIRMED: "Locked.",
    DESTINATION: "Tell me your destination.",
    CONFIRM_DESTINATION: `Destination ${data.destination}. Confirm?`,
    DESTINATION_CONFIRMED: "Locked.",
    CHOOSE_MODE: "Walk or Public Transport?",
    FIND_ROUTES_PROMPT: "Say Find Routes to continue.",
    FINDING_ROUTES: "Finding routes. Please wait.",
    NO_ROUTES: "No routes found. Try different locations.",
    ROUTES_FOUND: (routes) => {
      let message = `${routes.length} routes found. `;
      routes.forEach((route, idx) => {
        message += `Route ${idx + 1}: ${route.type}, ${route.estimatedTime} minutes. `;
      });
      message += `Say Route 1, 2, or 3.`;
      return message;
    },
    ROUTE_SELECTED: (routeNum) => `Route ${routeNum} selected. Confirm?`,
    CONFIRM_BOOKING: `Confirm this route? Yes or No.`,
    BOOKING_CONFIRMED: "Route confirmed. Navigation starting.",
    BOOKING_CANCELLED: "Cancelled."
  }; 
  return messages[step] || "";
};

// ==================== VOICE COMMANDS BY LANGUAGE ====================

export const getVoiceCommands = (language = 'en') => {
  const commands = {
    en: {
      navigation: {
        'home': 'home',
        'navigate|map|route': 'navigate',
        'alerts': 'alerts',
        'community': 'community',
        'settings': 'settings',
        'logout|exit': 'logout'
      },
      actions: {
        'click|select|ok|yes': 'click',
        'back|return': 'back',
        'next|continue': 'next',
        'save|done': 'save',
        'cancel|no|stop': 'cancel',
        'refresh|update': 'refresh',
        'help|commands': 'help',
        'repeat|again': 'repeat'
      },
      forms: {
        'from|start': 'from',
        'to|destination|go': 'to',
        'search|find': 'search',
        'clear|reset': 'clear',
        'current location|here|my location': 'current'
      },
      simple: {
        'home': 'home', 'map': 'navigate', 'alerts': 'alerts',
        'community': 'community', 'settings': 'settings',
        'back': 'back', 'help': 'help', 'search': 'search',
        'clear': 'clear', 'save': 'save', 'cancel': 'cancel'
      }
    },
    ta: {
      navigation: {
        'வீடு': 'home', 'வழி|மேப்': 'navigate',
        'அலர்ட்': 'alerts', 'சமூகம்': 'community',
        'செட்டிங்': 'settings', 'வெளியேறு': 'logout'
      },
      actions: {
        'சரி|ஓகே': 'click', 'பின்': 'back', 'அடுத்து': 'next',
        'சேவ்': 'save', 'கேன்சல்': 'cancel', 'அப்டேட்': 'refresh',
        'ஹெல்ப்': 'help', 'ரிபீட்': 'repeat'
      },
      forms: {
        'ஃப்ரம்|ஸ்டார்ட்': 'from', 'டூ|கோ': 'to',
        'சர்ச்': 'search', 'க்ளியர்': 'clear',
        'கரண்ட் லொகேஷன்': 'current'
      },
      simple: {
        'வீடு': 'home', 'மேப்': 'navigate', 'அலர்ட்': 'alerts',
        'சமூகம்': 'community', 'செட்டிங்': 'settings',
        'பின்': 'back', 'ஹெல்ப்': 'help', 'சர்ச்': 'search',
        'க்ளியர்': 'clear', 'சேவ்': 'save'
      }
    }
  };
  return commands[language] || commands.en;
};
