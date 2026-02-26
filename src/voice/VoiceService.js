/**
 * VoiceService.js — Central native voice controller (singleton)
 *
 * Uses expo-speech-recognition for STT (wraps Android native SpeechRecognizer)
 * Uses expo-speech for TTS
 *
 * Architecture:
 *  - SINGLE-OWNER model: only ONE screen owns the mic at any time
 *  - EventEmitter pattern: hooks subscribe/unsubscribe
 *  - Auto-restart on recognition end (simulates continuous mode)
 *  - Watchdog: safety net restarts if engine dies
 *  - AppState-aware: pause on background, resume on foreground
 *  - Debounce: prevents rapid double-processing
 *  - TTS/STT mutual exclusion: mic always stops before TTS, resumes after
 *  - Generation counter: only the hook matching current generation
 *    forwards native events — prevents duplicate processing
 *
 * Android Note:
 *  continuous: true is NOT supported on Android ≤12.
 *  We use continuous: false + auto-restart for universal compatibility.
 */

import { AppState } from 'react-native';
import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ══════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════
const RESTART_DELAY = 120;        // ms after recognition ends before restart (idle)
const RESULT_RESTART_DELAY = 800; // ms after a final result (gives screen time to speak)
const ERROR_RESTART_DELAY = 500;  // ms after error before restart
const WATCHDOG_INTERVAL = 4000;   // ms safety net interval
const DEBOUNCE_MS = 300;          // ms between accepted commands
const MAX_SPEAK_TIMEOUT = 25000;  // ms max TTS duration
const AUDIO_SWITCH_DELAY = 150;   // ms for mic→speaker switch

const DEBUG_VOICE = true;
const vlog = (...args) => { if (DEBUG_VOICE) console.log('[VOICE]', ...args); };

const VOICE_SPEEDS = { slow: 0.85, normal: 1.0, fast: 1.25 };

// Recognition config optimized for commands in noisy environments
const RECOGNITION_CONFIG = {
  lang: 'en-IN',
  interimResults: true,
  maxAlternatives: 3,
  continuous: false,
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
    // Engine state
    this._isListening = false;
    this._isSpeaking = false;
    this._micActive = false;
    this._initialized = false;
    this._permissionGranted = false;
    this._startPending = false;

    // OWNERSHIP — only ONE screen at a time
    this._activeOwner = null;

    // Generation counter — incremented on each fresh startListening()
    // Only the hook matching this generation forwards native events
    this._generation = 0;

    // Timers
    this._restartTimer = null;
    this._watchdogTimer = null;
    this._lastCommandTime = 0;
    this._errorCount = 0;
    this._errorRestartPending = false;
    this._lastPartialTranscript = null;
    this._resultJustEmitted = false;
    this._speakGeneration = 0;  // TTS generation — stale callbacks are ignored

    // Event emitter
    this._emitter = new MiniEmitter();

    // App state
    this._appStateSub = null;
  }

  // ══════════════════════════════════════════
  // EVENTS
  // ══════════════════════════════════════════
  on(event, handler) {
    return this._emitter.on(event, handler);
  }

  // ══════════════════════════════════════════
  // INITIALIZATION
  // ══════════════════════════════════════════
  async init() {
    if (this._initialized) return true;
    try {
      this._appStateSub = AppState.addEventListener('change', this._handleAppState);
      this._initialized = true;
      return true;
    } catch (_) {
      return false;
    }
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

  // ══════════════════════════════════════════
  // OWNERSHIP GETTERS
  // ══════════════════════════════════════════
  get activeOwner() { return this._activeOwner; }
  get generation() { return this._generation; }

  // ══════════════════════════════════════════
  // LISTENING CONTROL
  // ══════════════════════════════════════════

  /**
   * Start listening.
   *
   * Ownership rules:
   *  - If same owner is already active: IDEMPOTENT (no-op, no new generation)
   *  - If different owner: force-stop previous, then start for new owner
   *  - Generation increments only on a FRESH start
   *
   * @param {string} owner - Screen name claiming the mic
   * @returns {Promise<boolean>}
   */
  async startListening(owner = 'unknown') {
    vlog('startListening() called by:', owner, '| current owner:', this._activeOwner);

    if (!this._initialized) await this.init();

    // Permission check
    if (!this._permissionGranted) {
      const granted = await this.requestPermission();
      if (!granted) {
        vlog('startListening() aborted — permission denied');
        return false;
      }
    }

    // IDEMPOTENT: if already listening for the SAME owner, skip
    if (this._micActive && this._activeOwner === owner && (this._isListening || this._startPending)) {
      vlog('startListening() — already active for', owner, '— no-op');
      return true;
    }

    // TAKEOVER: different owner holds the mic → force-stop them first
    if (this._micActive && this._activeOwner && this._activeOwner !== owner) {
      vlog('startListening() — taking ownership from', this._activeOwner, 'to', owner);
      await this._forceStop();
    }

    // Claim ownership and increment generation
    this._activeOwner = owner;
    this._generation++;
    vlog('startListening() — owner:', owner, 'generation:', this._generation);

    this._micActive = true;
    this._errorCount = 0;
    this._startWatchdog();
    return this._startEngine();
  }

  /**
   * Stop listening.
   * @param {string|null} owner - If provided, only stops if this owner is active.
   *                              If null/undefined, force-stops regardless.
   */
  async stopListening(owner = null) {
    if (owner && this._activeOwner && this._activeOwner !== owner) {
      vlog('stopListening() — ignored. Active:', this._activeOwner, 'Requested:', owner);
      return false;
    }
    vlog('stopListening() — owner:', owner || 'force', '| was:', this._activeOwner);
    return this._forceStop();
  }

  /** Internal: unconditionally stop everything */
  async _forceStop() {
    this._micActive = false;
    this._activeOwner = null;
    this._clearRestart();
    this._stopWatchdog();

    try { ExpoSpeechRecognitionModule.abort(); } catch (_) {}

    this._isListening = false;
    this._startPending = false;
    this._lastPartialTranscript = null;
    this._emitter.emit('stateChange', { isListening: false, feedback: '' });
    this._emitter.emit('end', {});
    return true;
  }

  async _startEngine() {
    // Hard lock: never start during TTS or when mic is off
    if (this._isSpeaking || !this._micActive) {
      vlog('_startEngine() skipped — speaking:', this._isSpeaking, 'micActive:', this._micActive);
      return false;
    }

    // Hard lock: prevent overlapping starts
    if (this._startPending || this._isListening) {
      vlog('_startEngine() skipped — already starting/listening');
      return true;
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
      // STRICT restart conditions: mic active + not speaking + has owner
      if (this._micActive && !this._isSpeaking && this._activeOwner) {
        this._startEngine();
      }
    }, delay);
  }

  _clearRestart() {
    if (this._restartTimer) {
      clearTimeout(this._restartTimer);
      this._restartTimer = null;
    }
    this._errorRestartPending = false;
  }

  // ══════════════════════════════════════════
  // WATCHDOG
  // ══════════════════════════════════════════
  _startWatchdog() {
    this._stopWatchdog();
    this._watchdogTimer = setInterval(() => {
      if (
        this._micActive &&
        !this._isSpeaking &&
        !this._isListening &&
        !this._startPending &&
        !this._restartTimer &&
        this._activeOwner       // owner must still be set
      ) {
        vlog('Watchdog: engine dead, owner:', this._activeOwner, '— restarting');
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
  // (Called only by the hook that owns the current generation)
  // ══════════════════════════════════════════

  handleNativeStart() {
    vlog('handleNativeStart()');
    this._isListening = true;
    this._startPending = false;
    this._errorCount = 0;
    this._errorRestartPending = false;
    this._lastPartialTranscript = null;
    this._emitter.emit('start', {});
    this._emitter.emit('stateChange', { isListening: true, feedback: 'Listening...' });
  }

  handleNativeResult(event) {
    if (!event.results || event.results.length === 0) return;

    const lastResult = event.results[event.results.length - 1];
    const transcript = (lastResult.transcript || '').trim();
    if (!transcript) return;

    const isFinal = event.isFinal === true || lastResult.isFinal === true;
    vlog('handleNativeResult()', { transcript, isFinal });

    this._errorCount = 0;

    if (isFinal) {
      const now = Date.now();
      if (now - this._lastCommandTime < DEBOUNCE_MS) {
        vlog('handleNativeResult() — debounced');
        return;
      }
      this._lastCommandTime = now;
      this._lastPartialTranscript = null;
      this._resultJustEmitted = true; // flag for handleNativeEnd to use longer delay

      const alternatives = event.results.map((r) => r.transcript).filter(Boolean);
      this._emitter.emit('stateChange', { feedback: `"${transcript}"` });
      this._emitter.emit('result', {
        transcript: transcript.toLowerCase().trim(),
        alternatives,
        owner: this._activeOwner,
      });
    } else {
      this._lastPartialTranscript = transcript.toLowerCase().trim();
      this._emitter.emit('stateChange', { feedback: `"${transcript}..."` });
      this._emitter.emit('partialResult', {
        transcript: transcript.toLowerCase().trim(),
      });
    }
  }

  handleNativeEnd() {
    vlog('handleNativeEnd() — speaking:', this._isSpeaking, 'micActive:', this._micActive, 'owner:', this._activeOwner);
    this._isListening = false;
    this._startPending = false;

    // Promote last partial to final (Android continuous:false workaround)
    if (this._lastPartialTranscript && !this._isSpeaking) {
      const now = Date.now();
      if (now - this._lastCommandTime >= DEBOUNCE_MS) {
        this._lastCommandTime = now;
        vlog('handleNativeEnd() — promoting partial to final:', this._lastPartialTranscript);
        this._emitter.emit('stateChange', { feedback: `"${this._lastPartialTranscript}"` });
        this._emitter.emit('result', {
          transcript: this._lastPartialTranscript,
          alternatives: [this._lastPartialTranscript],
          owner: this._activeOwner,
        });
      }
      this._lastPartialTranscript = null;
    }

    // Don't restart if TTS active, mic off, or no owner
    if (this._isSpeaking || !this._micActive || !this._activeOwner) {
      this._emitter.emit('stateChange', { isListening: false });
      return;
    }

    if (this._errorRestartPending) {
      vlog('handleNativeEnd() — error restart already pending, skipping');
      return;
    }

    if (!this._restartTimer) {
      // Use longer delay after a result so the screen has time to call speak()
      // Without this, the engine restarts in 120ms and steals audio focus from TTS
      const delay = this._resultJustEmitted ? RESULT_RESTART_DELAY : RESTART_DELAY;
      this._resultJustEmitted = false;
      vlog('handleNativeEnd() — scheduling auto-restart in', delay, 'ms');
      this._scheduleRestart(delay);
    }
  }

  handleNativeError(event) {
    const err = event.error || event.message || '';
    vlog('handleNativeError():', err);

    // "aborted" is EXPECTED during TTS
    if (err === 'aborted') {
      vlog('handleNativeError() — aborted (expected during TTS)');
      this._isListening = false;
      this._startPending = false;
      return;
    }

    this._errorCount = (this._errorCount || 0) + 1;

    // Fatal: permission denied
    if (err === 'not-allowed' || err === 'service-not-allowed') {
      vlog('FATAL: Permission denied');
      this._permissionGranted = false;
      this._micActive = false;
      this._isListening = false;
      this._activeOwner = null;
      this._emitter.emit('stateChange', {
        isListening: false,
        feedback: 'Microphone permission denied. Enable in Settings.',
      });
      this._emitter.emit('error', { error: err, fatal: true });
      return;
    }

    // Fatal: no mic hardware
    if (err === 'audio-capture') {
      vlog('FATAL: Audio capture failed');
      this._isListening = false;
      this._emitter.emit('stateChange', {
        isListening: false,
        feedback: 'Microphone not available. Use touch mode.',
      });
      this._emitter.emit('error', { error: err, fatal: true });
      return;
    }

    // Too many consecutive errors
    if (this._errorCount >= 8) {
      vlog('Too many errors (' + this._errorCount + '), stopping');
      this._isListening = false;
      this._emitter.emit('stateChange', {
        isListening: false,
        feedback: 'Speech recognition not working. Use touch/type mode.',
      });
      this._emitter.emit('error', { error: 'too-many-errors', fatal: true });
      return;
    }

    // Recoverable — restart ONLY if active owner exists
    if (this._micActive && !this._isSpeaking && this._activeOwner) {
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
      if (this._micActive && !this._isSpeaking && this._activeOwner) {
        this._scheduleRestart(400);
      }
    } else {
      this._clearRestart();
      try { ExpoSpeechRecognitionModule.abort(); } catch (_) {}
      this._isListening = false;
      this._startPending = false;
      this._emitter.emit('stateChange', { isListening: false });
    }
  };

  // ══════════════════════════════════════════
  // TTS (Text-to-Speech)
  // ══════════════════════════════════════════

  async speak(text, priority = false, slowSpeed = false) {
    if (!text) return;

    // Increment speak generation — any callbacks from previous speak() will be ignored
    const gen = ++this._speakGeneration;

    this._isSpeaking = true;
    this._emitter.emit('speaking', { isSpeaking: true });

    // Stop mic and ALL pending restarts before speaking
    this._clearRestart();
    this._errorRestartPending = false;
    this._startPending = false;
    this._errorCount = 0;
    try { ExpoSpeechRecognitionModule.abort(); } catch (_) {}
    this._isListening = false;
    this._emitter.emit('stateChange', { isListening: false });

    // Stop any ongoing speech (this fires onStopped of the PREVIOUS Speech.speak,
    // but the generation guard below prevents it from resetting _isSpeaking)
    Speech.stop();

    // Let audio system switch from mic to speaker
    await this._delay(AUDIO_SWITCH_DELAY);

    const rate = slowSpeed ? 0.85 : await this._getVoiceSpeed();

    return new Promise((resolve) => {
      let resolved = false;

      const done = () => {
        if (resolved) return;
        // CRITICAL: only the latest speak() generation may touch _isSpeaking.
        // Without this, Speech.stop() in a NEW speak() triggers the OLD
        // onStopped callback, which would set _isSpeaking=false and restart
        // the mic — interrupting the new TTS.
        if (gen !== this._speakGeneration) {
          vlog('speak done() — stale generation', gen, 'vs', this._speakGeneration, '— ignored');
          resolved = true;
          resolve();
          return;
        }
        resolved = true;
        this._isSpeaking = false;
        this._emitter.emit('speaking', { isSpeaking: false });

        // Resume mic ONLY if owner is still set
        if (this._micActive && this._activeOwner) {
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

      // Safety timeout
      setTimeout(() => {
        if (gen === this._speakGeneration && this._isSpeaking) {
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
    this._activeOwner = null;
    this._clearRestart();
    this._stopWatchdog();

    try { ExpoSpeechRecognitionModule.abort(); } catch (_) {}
    Speech.stop();

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
