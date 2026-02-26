/**
 * voiceUtils.js — Voice interface hook + command processing
 *
 * Architecture:
 *   VoiceService (singleton)  →  manages native speech engine
 *   CommandParser             →  structured command recognition
 *   useVoiceInterface (hook)  →  per-screen voice control with FOCUS awareness
 *
 * KEY FIX: Focus-gated ownership
 *   - Each hook declares its screen name
 *   - Only the FOCUSED screen can own the mic
 *   - When screen loses focus: mic ownership is released
 *   - Result events are ONLY forwarded to the owning screen's handler
 *   - useSpeechRecognitionEvent bridges are gated by generation + focus
 *
 * Usage in screens:
 *   const {
 *     isListening,
 *     voiceFeedback,
 *     speak,
 *     setupSpeechRecognition,
 *     startListening,
 *     stopListening,
 *     submitVoiceCommand,
 *   } = useVoiceInterface('ScreenName');
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { useIsFocused } from '@react-navigation/native';
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
  'Voice mode active. Say Menu anytime to hear available pages. Or say Navigate, Alerts, Community, or Settings.';
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
export const useVoiceInterface = (screenName = 'unknown') => {
  const [isListening, setIsListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState('');
  const onCommandRef = useRef(null);
  const mountedRef = useRef(true);
  const micActiveRef = useRef(false);        // whether THIS screen wants mic on
  const generationRef = useRef(-1);          // which generation this hook owns
  const screenNameRef = useRef(screenName);  // stable ref for screen name
  const isFocusedRef = useRef(true);         // tracks focus for non-hook contexts

  // Focus detection from React Navigation
  const isFocused = useIsFocused();

  // Keep focusRef in sync
  useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  // ── OWNERSHIP CHECK ──
  // This hook is the owner if:
  //   1. Component is mounted
  //   2. Screen is focused
  //   3. generationRef matches VoiceService's current generation
  const isOwner = () =>
    mountedRef.current &&
    isFocusedRef.current &&
    generationRef.current === VoiceService.generation;

  // ── Bridge native events to VoiceService ──
  // useSpeechRecognitionEvent fires for ALL mounted hooks.
  // Only the owner (focused + matching generation) forwards events.

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

  // ── FOCUS CHANGE: release/reclaim ownership ──
  useEffect(() => {
    if (!isFocused) {
      // Screen lost focus — release VoiceService ownership
      // but KEEP micActiveRef true so we reclaim on focus return
      if (micActiveRef.current) {
        console.log(`[VOICE-HOOK] ${screenNameRef.current} lost focus — releasing mic`);
        VoiceService.stopListening(screenNameRef.current);
        generationRef.current = -1;
        if (mountedRef.current) {
          setIsListening(false);
          setVoiceFeedback('');
        }
      }
    } else {
      // Screen gained focus — reclaim if we were previously listening
      if (micActiveRef.current && mountedRef.current) {
        console.log(`[VOICE-HOOK] ${screenNameRef.current} gained focus — reclaiming mic`);
        VoiceService.startListening(screenNameRef.current);
        generationRef.current = VoiceService.generation;
      }
    }
  }, [isFocused]);

  // ── Subscribe to VoiceService events ──
  useEffect(() => {
    mountedRef.current = true;

    VoiceService.init();

    // State changes (isListening, feedback) — only accept if we're the owner
    const unsubState = VoiceService.on('stateChange', (update) => {
      if (!mountedRef.current) return;
      // Only update UI if this hook's screen is the active owner
      if (VoiceService.activeOwner !== screenNameRef.current) return;
      if (update.isListening !== undefined) setIsListening(update.isListening);
      if (update.feedback !== undefined) setVoiceFeedback(update.feedback);
    });

    // Final speech results — route to screen's command handler
    // CRITICAL: only process if this screen is the active owner
    const unsubResult = VoiceService.on('result', (data) => {
      if (!mountedRef.current) return;
      if (VoiceService.activeOwner !== screenNameRef.current) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (onCommandRef.current) {
        onCommandRef.current(data.transcript);
      }
    });

    // Partial results — only update feedback for the owner
    const unsubPartial = VoiceService.on('partialResult', (data) => {
      if (!mountedRef.current) return;
      if (VoiceService.activeOwner !== screenNameRef.current) return;
    });

    return () => {
      mountedRef.current = false;
      // Release ownership on unmount
      if (micActiveRef.current) {
        VoiceService.stopListening(screenNameRef.current);
      }
      micActiveRef.current = false;
      generationRef.current = -1;
      unsubState();
      unsubResult();
      unsubPartial();
    };
  }, []);

  // ── Public API ──

  const setupSpeechRecognition = useCallback(async (onCommand) => {
    onCommandRef.current = onCommand;
    await VoiceService.requestPermission();
  }, []);

  const startListening = useCallback(() => {
    // GUARD: don't start if screen is not focused
    if (!isFocusedRef.current) {
      console.log(`[VOICE-HOOK] ${screenNameRef.current} — startListening() blocked: not focused`);
      return false;
    }
    micActiveRef.current = true;
    const result = VoiceService.startListening(screenNameRef.current);
    // Claim this generation
    generationRef.current = VoiceService.generation;
    return result;
  }, []);

  const stopListening = useCallback(() => {
    micActiveRef.current = false;
    generationRef.current = -1;
    VoiceService.stopListening(screenNameRef.current);
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

export const processVoiceCommand = (command) => {
  const cmd = command.toLowerCase().trim();

  const parsed = parseCommandFromParser(cmd);
  if (!parsed) return { action: 'unknown', command: cmd };

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
    case 'menu':
      return { action: 'menu' };
    default:
      return { action: 'unknown', command: cmd };
  }
};

// ══════════════════════════════════════════
// GLOBAL MENU PROMPT — reusable across all screens
// ══════════════════════════════════════════
export const MENU_PROMPT =
  'Menu. You can go to: Home, Navigate, Alerts, Community, or Settings. Say the page name to go there.';

/**
 * Handle the "menu" voice command from any screen.
 * Speaks the menu prompt, then waits for the next command
 * which normal screen command handling will pick up as a navigation action.
 *
 * @param {Function} speak - the speak function from useVoiceInterface
 * @param {object} navigation - React Navigation object
 * @param {string} currentScreen - name of the current screen (to avoid navigating to self)
 * @returns {boolean} true if the command was a menu-triggered navigation, false otherwise
 */
export async function handleMenuNavigation(speak, navigation, currentScreen, transcript) {
  const cmd = (transcript || '').toLowerCase().trim();
  const pageMap = {
    home: 'Home',
    navigate: 'Navigate',
    navigation: 'Navigate',
    map: 'Navigate',
    route: 'Navigate',
    alerts: 'Alerts',
    alert: 'Alerts',
    community: 'Community',
    settings: 'Settings',
    setting: 'Settings',
  };
  const dest = pageMap[cmd];
  if (!dest) return false;
  if (dest === currentScreen) {
    await speak(`You are already on the ${dest} page.`);
    return true;
  }
  await speak(`Opening ${dest} page.`);
  navigation.navigate(dest);
  return true;
}

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
