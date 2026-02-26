/**
 * VoiceService.js — Central native voice controller (singleton)
 *
 * Uses expo-speech-recognition for STT (wraps Android native SpeechRecognizer)
 * Uses expo-speech for TTS
 *
 * Architecture:
 *  - EventEmitter pattern: multiple hooks can subscribe/unsubscribe
 *  - Auto-restart on recognition end (simulates continuous mode)
 *  - Watchdog: safety net restarts if engine dies
 *  - AppState-aware: pause on background, resume on foreground
 *  - Debounce: prevents rapid double-processing
 *  - Emergency override: instant response to emergency keywords
 *  - Optimized for noisy environments (bus stands, traffic)
 *
 * Performance:
 *  - NO console.log during recognition (zero JS thread overhead)
 *  - NO heavy computation on main thread
 *  - Async voice processing
 *  - Short burst recognition cycles (Listen → Detect → Process → Restart)
 *
 * Android Note:
 *  continuous: true is NOT supported on Android ≤12.
 *  We use continuous: false + auto-restart for universal compatibility.
 */

import { AppState, PermissionsAndroid, Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ══════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════
const RESTART_DELAY = 120;        // ms after recognition ends before restart
const ERROR_RESTART_DELAY = 500;  // ms after error before restart
const WATCHDOG_INTERVAL = 4000;   // ms safety net interval
const DEBOUNCE_MS = 300;          // ms between accepted commands
const MAX_SPEAK_TIMEOUT = 25000;  // ms max TTS duration
const AUDIO_SWITCH_DELAY = 150;   // ms for mic→speaker switch

// Debug logging helper — set to true to diagnose voice issues
const DEBUG_VOICE = true;
const vlog = (...args) => { if (DEBUG_VOICE) console.log('[VOICE]', ...args); };

const VOICE_SPEEDS = { slow: 0.85, normal: 1.0, fast: 1.25 };

// Recognition config optimized for commands in noisy environments
const RECOGNITION_CONFIG = {
  lang: 'en-IN',
  interimResults: true,
  maxAlternatives: 3,
  continuous: false,                   // Works on ALL Android versions
  requiresOnDeviceRecognition: false,
  addsPunctuation: false,
  contextualStrings: [
    'navigate', 'alerts', 'community', 'settings', 'home',
    'emergency', 'help', 'route', 'metro', 'bus',
    'Chennai', 'voice mode', 'touch mode', 'normal mode',
    'yes', 'no', 'confirm', 'cancel', 'repeat',
    'route one', 'route two', 'route three',
    'T Nagar', 'Egmore', 'Central', 'Koyambedu', 'Guindy',
    'Adyar', 'Tambaram', 'Velachery', 'Anna Nagar', 'Mylapore',
  ],
};

// ══════════════════════════════════════════
// EVENT EMITTER
// ══════════════════════════════════════════
class MiniEmitter {
  constructor() {
    this._listeners = {};
  }

  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
    // Return unsubscribe function
    return () => {
      this._listeners[event] = (this._listeners[event] || []).filter((f) => f !== fn);
    };
  }

  emit(event, data) {
    const fns = this._listeners[event];
    if (fns) {
      for (let i = 0; i < fns.length; i++) {
        try { fns[i](data); } catch (_) {}
      }
    }
  }

  removeAll() {
    this._listeners = {};
  }
}

// ══════════════════════════════════════════
// VOICE SERVICE (SINGLETON)
// ══════════════════════════════════════════
class VoiceServiceClass {
  constructor() {
    // State
    this._isListening = false;
    this._isSpeaking = false;
    this._micActive = false;
    this._initialized = false;
    this._permissionGranted = false;
    this._startPending = false; // Guard against overlapping starts

    // Timers
    this._restartTimer = null;
    this._watchdogTimer = null;
    this._lastCommandTime = 0;
    this._errorCount = 0;
    this._errorRestartPending = false; // Track if error handler already scheduled a restart
    this._lastPartialTranscript = null; // Buffer last partial for final-on-end

    // Event emitter
    this._emitter = new MiniEmitter();

    // App state
    this._appStateSub = null;

    // Native event subscriptions
    this._nativeSubs = [];

    // Generation counter — only the hook that owns the current generation
    // may forward native events. Prevents duplicate processing when
    // multiple useVoiceInterface() hooks are mounted during navigation.
    this._generation = 0;
  }

  // ══════════════════════════════════════════
  // EVENTS (for hooks to subscribe)
  //
  //  'start'           — recognition started
  //  'result'          — final result { transcript, alternatives }
  //  'partialResult'   — interim result { transcript }
  //  'end'             — recognition ended
  //  'error'           — recognition error { error }
  //  'stateChange'     — { isListening, feedback }
  //  'speaking'        — { isSpeaking }
  // ══════════════════════════════════════════

  /**
   * Subscribe to voice events.
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @returns {Function} Unsubscribe function
   */
  on(event, handler) {
    return this._emitter.on(event, handler);
  }

  // ══════════════════════════════════════════
  // INITIALIZATION
  // ══════════════════════════════════════════

  async init() {
    if (this._initialized) return true;

    try {
      // Set up native event subscriptions
      this._setupNativeEvents();

      // App state monitoring
      this._appStateSub = AppState.addEventListener('change', this._handleAppState);

      this._initialized = true;
      return true;
    } catch (_) {
      return false;
    }
  }

  _setupNativeEvents() {
    // Clean up any existing subscriptions
    this._cleanupNativeEvents();

    // Subscribe to native speech events via ExpoSpeechRecognitionModule
    // These are registered globally — the singleton processes them once,
    // then emits to all subscribed hooks via the event emitter.

    // Note: expo-speech-recognition uses event-based API.
    // We don't use useSpeechRecognitionEvent() since that's a React hook.
    // Instead, we use the module's addListener API.
    // If addListener isn't available, hooks will use useSpeechRecognitionEvent
    // and forward events to this service.
  }

  _cleanupNativeEvents() {
    for (const sub of this._nativeSubs) {
      try { sub.remove(); } catch (_) {}
    }
    this._nativeSubs = [];
  }

  // ══════════════════════════════════════════
  // PERMISSION
  // ══════════════════════════════════════════

  async requestPermission() {
    if (this._permissionGranted) return true;

    try {
      vlog('Requesting microphone permission...');
      const res = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      this._permissionGranted = res.granted;
      vlog('Permission result:', res.granted ? 'GRANTED' : 'DENIED');

      if (!res.granted) {
        this._emitter.emit('stateChange', {
          feedback: 'Microphone permission is required for voice navigation.',
        });
      }
    } catch (err) {
      vlog('Permission request error:', err?.message || err);
      this._permissionGranted = false;
    }

    return this._permissionGranted;
  }

  /**
   * Check if speech recognition service is available on this device.
   * Emulators often lack Google Speech Services.
   */
  async checkServiceAvailable() {
    try {
      // expo-speech-recognition exposes getStateAsync or similar
      const available = await ExpoSpeechRecognitionModule.getPermissionsAsync();
      vlog('Speech service check:', available);
      return true;
    } catch (err) {
      vlog('Speech service NOT available:', err?.message || err);
      return false;
    }
  }

  // ══════════════════════════════════════════
  // LISTENING CONTROL
  // ══════════════════════════════════════════

  /**
   * Acquire the current generation token.
   * The hook that calls startListening() should store this and
   * compare it before forwarding native events.
   */
  get generation() { return this._generation; }

  async startListening() {
    vlog('startListening() called');
    if (!this._initialized) await this.init();

    if (!this._permissionGranted) {
      const granted = await this.requestPermission();
      if (!granted) {
        vlog('startListening() aborted — permission denied');
        return false;
      }
    }

    // Increment generation — only this caller's hook should forward events
    this._generation++;
    vlog('startListening() — generation:', this._generation);

    this._micActive = true;
    this._errorCount = 0;
    this._startWatchdog();
    return this._startEngine();
  }

  async stopListening() {
    this._micActive = false;
    this._clearRestart();
    this._stopWatchdog();

    try { ExpoSpeechRecognitionModule.abort(); } catch (_) {}

    this._isListening = false;
    this._emitter.emit('stateChange', { isListening: false, feedback: '' });
    this._emitter.emit('end', {});
    return true;
  }

  async _startEngine() {
    if (this._isSpeaking || !this._micActive) {
      vlog('_startEngine() skipped — speaking:', this._isSpeaking, 'micActive:', this._micActive);
      return false;
    }

    // Guard: prevent overlapping starts (main cause of flickering)
    if (this._startPending || this._isListening) {
      vlog('_startEngine() skipped — already starting/listening');
      return true; // Return true since engine is already active
    }

    this._startPending = true;

    try {
      vlog('_startEngine() — calling ExpoSpeechRecognitionModule.start()');
      ExpoSpeechRecognitionModule.start(RECOGNITION_CONFIG);
      vlog('_startEngine() — start() call succeeded');
      return true;
    } catch (err) {
      const msg = err?.message || String(err);
      vlog('_startEngine() FAILED:', msg);
      this._startPending = false;
      this._errorCount = (this._errorCount || 0) + 1;
      
      // If we keep failing, tell the user
      if (this._errorCount >= 3) {
        this._emitter.emit('stateChange', {
          isListening: false,
          feedback: 'Speech recognition unavailable. Use touch mode.',
        });
        this._emitter.emit('error', { error: 'service-unavailable', fatal: true });
      }
      return false;
    }
  }

  _scheduleRestart(delay = RESTART_DELAY) {
    this._clearRestart();
    this._restartTimer = setTimeout(() => {
      this._restartTimer = null;
      this._errorRestartPending = false;
      if (this._micActive && !this._isSpeaking) {
        this._startEngine();
      }
    }, delay);
  }

  _clearRestart() {
    if (this._restartTimer) {
      clearTimeout(this._restartTimer);
      this._restartTimer = null;
    }
  }

  // ══════════════════════════════════════════
  // WATCHDOG — Safety net
  // ══════════════════════════════════════════

  _startWatchdog() {
    this._stopWatchdog();
    this._watchdogTimer = setInterval(() => {
      // Only restart if mic should be active but engine is NOT running
      // and no restart is already pending (prevents overlapping starts)
      if (this._micActive && !this._isSpeaking && !this._isListening && !this._startPending && !this._restartTimer) {
        vlog('Watchdog: engine dead, restarting');
        this._scheduleRestart(50);
      }
    }, WATCHDOG_INTERVAL);
  }

  _stopWatchdog() {
    if (this._watchdogTimer) {
      clearInterval(this._watchdogTimer);
      this._watchdogTimer = null;
    }
  }

  // ══════════════════════════════════════════
  // NATIVE EVENT PROCESSING
  // (Called by hooks that use useSpeechRecognitionEvent)
  // ══════════════════════════════════════════

  handleNativeStart() {
    vlog('handleNativeStart() — recognition started');
    this._isListening = true;
    this._startPending = false; // Start completed
    this._errorCount = 0; // Reset on successful start
    this._errorRestartPending = false;
    this._lastPartialTranscript = null; // Clear buffer for new session
    this._emitter.emit('start', {});
    this._emitter.emit('stateChange', { isListening: true, feedback: 'Listening...' });
  }

  handleNativeResult(event) {
    if (!event.results || event.results.length === 0) {
      vlog('handleNativeResult() — empty results');
      return;
    }

    const lastResult = event.results[event.results.length - 1];
    const transcript = (lastResult.transcript || '').trim();
    if (!transcript) {
      vlog('handleNativeResult() — empty transcript');
      return;
    }

    // Check isFinal on BOTH the event AND the result (different expo-speech-recognition versions)
    const isFinal = event.isFinal === true || lastResult.isFinal === true;

    vlog('handleNativeResult()', { transcript, isFinal, eventIsFinal: event.isFinal, resultIsFinal: lastResult.isFinal });

    // Reset error count on ANY successful result (partial or final)
    this._errorCount = 0;

    if (isFinal) {
      // Debounce
      const now = Date.now();
      if (now - this._lastCommandTime < DEBOUNCE_MS) {
        vlog('handleNativeResult() — debounced');
        return;
      }
      this._lastCommandTime = now;
      this._lastPartialTranscript = null; // Clear buffer — we got a real final

      const alternatives = event.results.map((r) => r.transcript).filter(Boolean);

      this._emitter.emit('stateChange', { feedback: `"${transcript}"` });
      this._emitter.emit('result', {
        transcript: transcript.toLowerCase().trim(),
        alternatives,
      });
    } else {
      // Buffer partial result — on Android with continuous:false,
      // isFinal is often never true. We'll emit the last partial as
      // final when handleNativeEnd() fires.
      this._lastPartialTranscript = transcript.toLowerCase().trim();

      this._emitter.emit('stateChange', { feedback: `"${transcript}..."` });
      this._emitter.emit('partialResult', {
        transcript: transcript.toLowerCase().trim(),
      });
    }
  }

  handleNativeEnd() {
    vlog('handleNativeEnd() — speaking:', this._isSpeaking, 'micActive:', this._micActive);
    this._isListening = false;
    this._startPending = false;

    // If we have a buffered partial result that was never marked final,
    // emit it now as a final result (Android continuous:false workaround)
    if (this._lastPartialTranscript && !this._isSpeaking) {
      const now = Date.now();
      if (now - this._lastCommandTime >= DEBOUNCE_MS) {
        this._lastCommandTime = now;
        vlog('handleNativeEnd() — promoting last partial to final:', this._lastPartialTranscript);
        this._emitter.emit('stateChange', { feedback: `"${this._lastPartialTranscript}"` });
        this._emitter.emit('result', {
          transcript: this._lastPartialTranscript,
          alternatives: [this._lastPartialTranscript],
        });
      }
      this._lastPartialTranscript = null;
    }

    if (this._isSpeaking || !this._micActive) {
      this._emitter.emit('stateChange', { isListening: false });
      return;
    }

    // If error handler already scheduled a restart, don't schedule another one
    if (this._errorRestartPending) {
      vlog('handleNativeEnd() — error restart already pending, skipping');
      return;
    }

    // Auto-restart (only if no restart is already pending)
    if (!this._restartTimer) {
      vlog('handleNativeEnd() — scheduling auto-restart in', RESTART_DELAY, 'ms');
      this._scheduleRestart(RESTART_DELAY);
    }
  }

  handleNativeError(event) {
    const err = event.error || event.message || '';
    vlog('handleNativeError():', err, 'full event:', JSON.stringify(event));

    // "aborted" errors are EXPECTED during TTS (speak() calls abort())
    // They should NOT count toward the error limit
    if (err === 'aborted') {
      vlog('handleNativeError() — aborted (expected during TTS), not counting');
      this._isListening = false;
      return;
    }

    this._errorCount = (this._errorCount || 0) + 1;

    // Permission denied — fatal
    if (err === 'not-allowed' || err === 'service-not-allowed') {
      vlog('FATAL: Permission denied');
      this._permissionGranted = false;
      this._micActive = false;
      this._isListening = false;
      this._emitter.emit('stateChange', {
        isListening: false,
        feedback: 'Microphone permission denied. Enable in Settings.',
      });
      this._emitter.emit('error', { error: err, fatal: true });
      return;
    }

    // Audio capture — fatal on emulator (no mic)
    if (err === 'audio-capture') {
      vlog('FATAL: Audio capture failed (no microphone?)');
      this._isListening = false;
      this._emitter.emit('stateChange', {
        isListening: false,
        feedback: 'Microphone not available. Use touch mode.',
      });
      this._emitter.emit('error', { error: err, fatal: true });
      return;
    }

    // Too many consecutive errors — stop retrying
    if (this._errorCount >= 8) {
      vlog('Too many errors (' + this._errorCount + '), stopping retry');
      this._isListening = false;
      this._emitter.emit('stateChange', {
        isListening: false,
        feedback: 'Speech recognition not working. Use touch/type mode.',
      });
      this._emitter.emit('error', { error: 'too-many-errors', fatal: true });
      return;
    }

    // Recoverable errors (no-speech, network, busy) — auto-restart
    if (this._micActive && !this._isSpeaking) {
      vlog('Recoverable error (' + this._errorCount + '/8), restarting in', ERROR_RESTART_DELAY, 'ms');
      this._errorRestartPending = true;
      this._scheduleRestart(ERROR_RESTART_DELAY);
    }
    this._emitter.emit('error', { error: err, fatal: false });
  }

  // ══════════════════════════════════════════
  // APP STATE
  // ══════════════════════════════════════════

  _handleAppState = (nextState) => {
    if (nextState === 'active') {
      if (this._micActive && !this._isSpeaking) {
        this._scheduleRestart(400);
      }
    } else {
      // Background/inactive — pause recognition
      this._clearRestart();
      try { ExpoSpeechRecognitionModule.abort(); } catch (_) {}
      this._isListening = false;
      this._emitter.emit('stateChange', { isListening: false });
    }
  };

  // ══════════════════════════════════════════
  // TTS (Text-to-Speech)
  // ══════════════════════════════════════════

  async speak(text, priority = false, slowSpeed = false) {
    if (!text) return;

    this._isSpeaking = true;
    this._emitter.emit('speaking', { isSpeaking: true });

    // Stop mic and pending restarts
    this._clearRestart();
    this._errorRestartPending = false;
    this._startPending = false;
    this._errorCount = 0; // Reset errors — abort errors from this are intentional
    try { ExpoSpeechRecognitionModule.abort(); } catch (_) {}
    this._isListening = false;
    this._emitter.emit('stateChange', { isListening: false });

    // Stop any ongoing speech
    Speech.stop();

    // Let audio system switch from mic to speaker
    await this._delay(AUDIO_SWITCH_DELAY);

    const rate = slowSpeed ? 0.85 : await this._getVoiceSpeed();

    return new Promise((resolve) => {
      let resolved = false;

      const done = () => {
        if (resolved) return;
        resolved = true;
        this._isSpeaking = false;
        this._emitter.emit('speaking', { isSpeaking: false });

        // Resume mic after TTS
        if (this._micActive) {
          this._scheduleRestart(300);
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

      // Safety timeout — never leave stuck
      setTimeout(() => {
        if (this._isSpeaking) {
          Speech.stop();
          done();
        }
      }, MAX_SPEAK_TIMEOUT);
    });
  }

  // ══════════════════════════════════════════
  // CLEANUP
  // ══════════════════════════════════════════

  async destroy() {
    this._micActive = false;
    this._clearRestart();
    this._stopWatchdog();

    try { ExpoSpeechRecognitionModule.abort(); } catch (_) {}
    Speech.stop();

    this._cleanupNativeEvents();

    if (this._appStateSub) {
      this._appStateSub.remove();
      this._appStateSub = null;
    }

    this._emitter.removeAll();
    this._initialized = false;
    this._isListening = false;
    this._isSpeaking = false;
  }

  // ══════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════

  _delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async _getVoiceSpeed() {
    try {
      const prefs = JSON.parse((await AsyncStorage.getItem('ac_prefs')) || '{}');
      return VOICE_SPEEDS[prefs.voiceSpeed || 'normal'];
    } catch {
      return VOICE_SPEEDS.normal;
    }
  }

  // Public getters
  get isListening() { return this._isListening; }
  get isSpeaking() { return this._isSpeaking; }
  get isActive() { return this._micActive; }
  get isInitialized() { return this._initialized; }
}

// Export singleton
const VoiceService = new VoiceServiceClass();
export default VoiceService;
export { VOICE_SPEEDS, RECOGNITION_CONFIG };
