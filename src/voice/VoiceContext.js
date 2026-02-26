/**
 * VoiceContext.js — Global voice state handler
 *
 * Provides voice state to ALL screens via React Context.
 * Wraps VoiceService singleton with React state management.
 *
 * Usage:
 *   // In App.js:
 *   <VoiceProvider>
 *     <AppNavigator />
 *   </VoiceProvider>
 *
 *   // In any screen:
 *   const { isListening, voiceFeedback, isGlobalSpeaking } = useVoiceState();
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import VoiceService from './VoiceService';

// ══════════════════════════════════════════
// CONTEXT
// ══════════════════════════════════════════
const VoiceStateContext = createContext({
  isListening: false,
  voiceFeedback: '',
  isGlobalSpeaking: false,
});

/**
 * Read-only access to global voice state.
 * For voice control (start/stop/speak), use useVoiceInterface() from voiceUtils.js.
 */
export function useVoiceState() {
  return useContext(VoiceStateContext);
}

// ══════════════════════════════════════════
// PROVIDER
// ══════════════════════════════════════════
export function VoiceProvider({ children }) {
  const [isListening, setIsListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState('');
  const [isGlobalSpeaking, setIsGlobalSpeaking] = useState(false);

  useEffect(() => {
    // Initialize VoiceService on app start
    VoiceService.init();

    // Subscribe to global state changes
    const unsubState = VoiceService.on('stateChange', (update) => {
      if (update.isListening !== undefined) setIsListening(update.isListening);
      if (update.feedback !== undefined) setVoiceFeedback(update.feedback);
    });

    const unsubSpeaking = VoiceService.on('speaking', (update) => {
      if (update.isSpeaking !== undefined) setIsGlobalSpeaking(update.isSpeaking);
    });

    return () => {
      unsubState();
      unsubSpeaking();
    };
  }, []);

  return (
    <VoiceStateContext.Provider
      value={{
        isListening,
        voiceFeedback,
        isGlobalSpeaking,
      }}
    >
      {children}
    </VoiceStateContext.Provider>
  );
}
