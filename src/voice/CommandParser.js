/**
 * CommandParser.js — Intent mapping and command recognition
 * For Accessible Chennai Native voice interface
 *
 * Keyword-based matching with confidence thresholds
 * Optimized for noisy environments (bus stands, traffic)
 * Emergency commands always have highest priority
 */

// Minimum confidence to accept a command (0-1)
export const CONFIDENCE_THRESHOLD = 0.45;

// ══════════════════════════════════════════
// COMMAND DEFINITIONS
// ══════════════════════════════════════════
const COMMANDS = {
  // === EMERGENCY — Highest priority, always checked FIRST ===
  emergency: {
    keywords: ['emergency', 'help', 'help me', 'urgent', 'danger', 'accident', 'sos'],
    weight: 10,
    action: 'emergency',
  },

  // === PAGE NAVIGATION ===
  navigate: {
    keywords: ['navigate', 'navigation', 'map', 'route', 'direction', 'directions', 'go to'],
    weight: 5,
    action: 'navigate',
    destination: 'Navigate',
  },
  home: {
    keywords: ['home', 'main', 'dashboard'],
    weight: 4,
    action: 'navigate',
    destination: 'Home',
  },
  alerts: {
    keywords: ['alert', 'alerts', 'notification', 'notifications', 'warning'],
    weight: 4,
    action: 'navigate',
    destination: 'Alerts',
  },
  community: {
    keywords: ['community', 'social', 'people', 'connect', 'forum'],
    weight: 4,
    action: 'navigate',
    destination: 'Community',
  },
  settings: {
    keywords: ['setting', 'settings', 'preferences', 'config', 'configure', 'option'],
    weight: 4,
    action: 'navigate',
    destination: 'Settings',
  },

  // === GLOBAL MENU — available from any screen ===
  menu: {
    keywords: ['menu', 'main menu', 'open menu', 'show menu', 'pages', 'where can i go'],
    weight: 6,
    action: 'menu',
  },

  // === ROUTE SELECTION ===
  findRoutes: {
    keywords: ['find accessible route', 'accessible route', 'find route', 'search route'],
    weight: 5,
    action: 'findAccessibleRoutes',
  },
  routeOne: {
    keywords: ['route 1', 'route one', 'first route', 'option 1', 'option one'],
    weight: 6,
    action: 'selectRoute',
    routeIndex: 0,
  },
  routeTwo: {
    keywords: ['route 2', 'route two', 'second route', 'option 2', 'option two'],
    weight: 6,
    action: 'selectRoute',
    routeIndex: 1,
  },
  routeThree: {
    keywords: ['route 3', 'route three', 'third route', 'option 3', 'option three'],
    weight: 6,
    action: 'selectRoute',
    routeIndex: 2,
  },

  // === CONFIRMATION ===
  confirm: {
    keywords: ['yes', 'confirm', 'correct', 'okay', 'ok', 'sure', 'right', 'yeah'],
    weight: 3,
    action: 'confirm',
    value: true,
  },
  deny: {
    keywords: ['no', 'cancel', 'wrong', 'incorrect', 'nope', 'negative'],
    weight: 3,
    action: 'confirm',
    value: false,
  },

  // === UTILITY ===
  repeat: {
    keywords: ['repeat', 'say again', 'again', 'what', 'pardon'],
    weight: 3,
    action: 'repeat',
  },
  stop: {
    keywords: ['stop', 'stop navigation', 'stop listening', 'quit', 'exit'],
    weight: 4,
    action: 'stop',
  },
  back: {
    keywords: ['back', 'go back', 'return', 'previous'],
    weight: 3,
    action: 'back',
  },
  next: {
    keywords: ['next', 'continue', 'forward', 'skip'],
    weight: 3,
    action: 'next',
  },

  // === MODE SELECTION ===
  voiceMode: {
    keywords: ['voice', 'voice mode', 'speak', 'vocal'],
    weight: 4,
    action: 'selectMode',
    mode: 'voice',
  },
  normalMode: {
    keywords: ['normal', 'touch', 'click', 'standard', 'tap'],
    weight: 4,
    action: 'selectMode',
    mode: 'normal',
  },

  // === SETTINGS COMMANDS ===
  voiceSpeed: {
    keywords: ['change voice speed', 'voice speed', 'speed'],
    weight: 3,
    action: 'changeVoiceSpeed',
  },
  speedSlow: {
    keywords: ['slow', 'slower'],
    weight: 2,
    action: 'setSpeed',
    speed: 'slow',
  },
  speedNormal: {
    keywords: ['normal speed'],
    weight: 3,
    action: 'setSpeed',
    speed: 'normal',
  },
  speedFast: {
    keywords: ['fast', 'faster', 'quick'],
    weight: 2,
    action: 'setSpeed',
    speed: 'fast',
  },
  changeLanguage: {
    keywords: ['change language', 'language', 'tamil', 'english'],
    weight: 3,
    action: 'changeLanguage',
  },
  emergencyContacts: {
    keywords: ['emergency contact', 'emergency number'],
    weight: 3,
    action: 'emergencyContacts',
  },

  // === COMMUNITY COMMANDS ===
  postUpdate: {
    keywords: ['post update', 'post', 'share update'],
    weight: 3,
    action: 'postUpdate',
  },
  nearbyUpdates: {
    keywords: ['hear nearby update', 'nearby update', 'nearby', 'updates near'],
    weight: 3,
    action: 'nearbyUpdates',
  },
  askHelp: {
    keywords: ['ask for help', 'request help', 'need help'],
    weight: 3,
    action: 'askHelp',
  },

  // === TRANSPORT MODE ===
  metro: {
    keywords: ['metro', 'train', 'rail', 'subway'],
    weight: 3,
    action: 'selectTransport',
    transport: 'metro',
  },
  bus: {
    keywords: ['bus', 'mtc', 'public transport'],
    weight: 3,
    action: 'selectTransport',
    transport: 'bus',
  },
  walk: {
    keywords: ['walk', 'walking', 'foot', 'pedestrian'],
    weight: 3,
    action: 'selectTransport',
    transport: 'walk',
  },

  // === ALERTS COMMANDS ===
  clearAlerts: {
    keywords: ['clear alert', 'clear alerts', 'dismiss', 'clear all'],
    weight: 3,
    action: 'clearAlerts',
  },
};

// ══════════════════════════════════════════
// CONFIDENCE CALCULATION
// ══════════════════════════════════════════

/**
 * Calculate match confidence for a transcript against keyword set
 * Handles partial matches, word-level matching, and noise tolerance
 * @param {string} transcript - User's spoken text
 * @param {string[]} keywords - Keywords to match against
 * @returns {number} 0-1 confidence score
 */
function calculateConfidence(transcript, keywords) {
  const lower = transcript.toLowerCase().trim();
  if (!lower) return 0;

  let bestScore = 0;

  for (const keyword of keywords) {
    const kwLower = keyword.toLowerCase();

    // Exact match → 100%
    if (lower === kwLower) return 1.0;

    // Full keyword appears in transcript → 70-90%
    if (lower.includes(kwLower)) {
      const lengthRatio = kwLower.length / Math.max(lower.length, 1);
      bestScore = Math.max(bestScore, Math.max(lengthRatio, 0.7));
      continue;
    }

    // Word-level matching (for noisy environments)
    const kwWords = kwLower.split(/\s+/);
    const transWords = lower.split(/\s+/);
    let matched = 0;

    for (const kw of kwWords) {
      if (transWords.some((tw) => tw === kw || tw.includes(kw) || kw.includes(tw))) {
        matched++;
      }
    }

    if (kwWords.length > 0) {
      const wordScore = matched / kwWords.length;
      bestScore = Math.max(bestScore, wordScore * 0.6);
    }
  }

  return bestScore;
}

// ══════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════

/**
 * Parse a voice transcript into a structured command
 * Emergency commands are ALWAYS checked first (highest priority)
 *
 * @param {string} transcript - Raw speech transcript
 * @returns {{ action: string, confidence: number, [key]: any }}
 */
export function parseCommand(transcript) {
  if (!transcript || !transcript.trim()) return null;

  // EMERGENCY CHECK — Always first, no confidence threshold
  if (isEmergency(transcript)) {
    return { action: 'emergency', confidence: 1.0, name: 'emergency' };
  }

  let bestMatch = null;
  let bestScore = 0;

  for (const [name, cmd] of Object.entries(COMMANDS)) {
    if (name === 'emergency') continue; // Already checked

    const confidence = calculateConfidence(transcript, cmd.keywords);
    const weightedScore = confidence * cmd.weight;

    if (confidence >= CONFIDENCE_THRESHOLD && weightedScore > bestScore) {
      bestScore = weightedScore;
      bestMatch = {
        name,
        confidence,
        action: cmd.action,
        ...(cmd.destination && { destination: cmd.destination }),
        ...(cmd.routeIndex !== undefined && { routeIndex: cmd.routeIndex }),
        ...(cmd.value !== undefined && { value: cmd.value }),
        ...(cmd.mode && { mode: cmd.mode }),
        ...(cmd.speed && { speed: cmd.speed }),
        ...(cmd.transport && { transport: cmd.transport }),
      };
    }
  }

  if (!bestMatch) {
    return {
      action: 'unknown',
      confidence: 0,
      command: transcript.toLowerCase().trim(),
    };
  }

  return bestMatch;
}

/**
 * Instant emergency detection — no confidence threshold
 * @param {string} transcript
 * @returns {boolean}
 */
export function isEmergency(transcript) {
  if (!transcript) return false;
  const lower = transcript.toLowerCase();
  return ['emergency', 'help me', 'sos', 'danger', 'urgent', 'accident'].some((kw) =>
    lower.includes(kw)
  );
}

/**
 * Extract location name from voice transcript
 * Strips command prefixes to isolate the location
 * @param {string} transcript
 * @returns {string|null}
 */
export function extractLocation(transcript) {
  if (!transcript) return null;
  const cleaned = transcript
    .replace(/^(go to|navigate to|from|to|set|start at|destination|take me to)\s*/i, '')
    .trim();
  return cleaned || null;
}

export { COMMANDS };
